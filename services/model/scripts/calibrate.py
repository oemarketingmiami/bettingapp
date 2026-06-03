"""Backtest Elo over historical NBA seasons and fit a calibration map.

Replays games chronologically through the SAME Elo used in production (app.elo),
records predicted home-win prob vs actual outcome, fits isotonic regression so the
model's probabilities match real frequencies, reports Brier/log-loss before vs
after, and saves app/calibration_data.json (loaded by app/calibration.py).

Run:  (cd services/model && BALLDONTLIE_API_KEY=... .venv/Scripts/python.exe scripts/calibrate.py)
Free balldontlie tier covers past seasons' game results.
"""
import json
import os
import sys
import time
from pathlib import Path

import httpx
import numpy as np
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import brier_score_loss, log_loss

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.elo import expected_score, update  # noqa: E402
from app.config import settings  # noqa: E402

SEASONS = [2022, 2023, 2024]
BURN_IN_SEASON = 2022  # warm ratings on this season, don't use it for fitting
OUT = Path(__file__).resolve().parents[1] / "app" / "calibration_data.json"


def fetch_games(season: int, key: str):
    games, cursor = [], None
    with httpx.Client(timeout=30) as client:
        while True:
            params = {"seasons[]": season, "per_page": 100}
            if cursor is not None:
                params["cursor"] = cursor
            r = client.get("https://api.balldontlie.io/v1/games", params=params, headers={"Authorization": key})
            if r.status_code == 429:
                time.sleep(10); continue
            r.raise_for_status()
            j = r.json()
            for g in j.get("data", []):
                if g.get("status") != "Final":
                    continue
                games.append({
                    "date": g["date"], "season": g["season"],
                    "home": g["home_team"]["full_name"], "away": g["visitor_team"]["full_name"],
                    "hs": g["home_team_score"], "vs": g["visitor_team_score"],
                })
            cursor = j.get("meta", {}).get("next_cursor")
            if not cursor:
                break
            time.sleep(0.25)
    return games


def main():
    key = os.environ.get("BALLDONTLIE_API_KEY")
    if not key:
        raise SystemExit("set BALLDONTLIE_API_KEY")

    all_games = []
    for s in SEASONS:
        gs = fetch_games(s, key)
        print(f"season {s}: {len(gs)} final games")
        all_games += gs
    all_games.sort(key=lambda g: g["date"])

    ratings: dict[str, float] = {}
    probs, actuals = [], []
    for g in all_games:
        h = ratings.get(g["home"], settings.elo_base)
        a = ratings.get(g["away"], settings.elo_base)
        p = expected_score(h, a, settings.home_advantage)
        if g["season"] != BURN_IN_SEASON:
            probs.append(p)
            actuals.append(1 if g["hs"] > g["vs"] else 0)
        nh, na = update(h, a, g["hs"], g["vs"], k=settings.elo_k, home_advantage=settings.home_advantage)
        ratings[g["home"]], ratings[g["away"]] = nh, na

    probs = np.array(probs, dtype=float)
    actuals = np.array(actuals, dtype=float)
    print(f"\ncalibration set: {len(probs)} games")

    iso = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0).fit(probs, actuals)
    cal = iso.predict(probs)

    before_brier = brier_score_loss(actuals, probs)
    after_brier = brier_score_loss(actuals, cal)
    before_ll = log_loss(actuals, np.clip(probs, 1e-6, 1 - 1e-6))
    after_ll = log_loss(actuals, np.clip(cal, 1e-6, 1 - 1e-6))
    print(f"Brier   before={before_brier:.4f}  after={after_brier:.4f}  (lower is better)")
    print(f"LogLoss before={before_ll:.4f}  after={after_ll:.4f}")

    payload = {
        "method": "isotonic",
        "x": [round(float(v), 6) for v in iso.X_thresholds_],
        "y": [round(float(v), 6) for v in iso.y_thresholds_],
        "meta": {
            "seasons": SEASONS, "burn_in_season": BURN_IN_SEASON, "n": int(len(probs)),
            "brier_before": round(before_brier, 4), "brier_after": round(after_brier, 4),
            "logloss_before": round(before_ll, 4), "logloss_after": round(after_ll, 4),
        },
    }
    OUT.write_text(json.dumps(payload, indent=2))
    print(f"\nsaved {OUT}")


if __name__ == "__main__":
    main()
