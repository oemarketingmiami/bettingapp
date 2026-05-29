"""OE Picks forecasting service (FastAPI).

The numbers layer from INSTRUCTIONS.md §6. Turns Elo ratings into calibrated
win probabilities and turns (model prob + market odds) into a vetted edge.

Run locally:   uvicorn app.main:app --reload --port 8000
The app reaches this via MODEL_SERVICE_URL.
"""
from __future__ import annotations

from fastapi import FastAPI

from . import elo, odds, edge as edge_mod
from .calibration import default_calibrator
from .config import settings
from .schemas import (
    EdgeRequest,
    EdgeResponse,
    EloUpdateRequest,
    EloUpdateResponse,
    OutcomeOut,
    PredictRequest,
    PredictResponse,
)

app = FastAPI(title="OE Picks — Model Service", version=settings.model_version)


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "model_version": settings.model_version,
        "calibrated": default_calibrator.is_fitted,
    }


@app.post("/v1/predict", response_model=PredictResponse)
def predict(req: PredictRequest) -> PredictResponse:
    """Elo -> calibrated home/away win probabilities."""
    ha = 0.0 if req.neutral else settings.home_advantage
    raw_home = elo.expected_score(req.home_rating, req.away_rating, ha)

    home = default_calibrator.calibrate(raw_home)
    away = default_calibrator.calibrate(1.0 - raw_home)
    # Renormalize so the two sides sum to 1 after independent calibration.
    total = home + away
    home, away = home / total, away / total

    return PredictResponse(
        home_team=req.home_team,
        away_team=req.away_team,
        home_win_prob=home,
        away_win_prob=away,
        calibrated=default_calibrator.is_fitted,
        model_version=settings.model_version,
    )


@app.post("/v1/edge", response_model=EdgeResponse)
def compute_edge(req: EdgeRequest) -> EdgeResponse:
    """De-vig the full market, then edge = model_prob - no_vig_prob per side."""
    decimals = [
        o.decimal_odds if o.decimal_odds is not None
        else odds.american_to_decimal(o.american_odds)
        for o in req.outcomes
    ]
    implied = [odds.decimal_to_implied(d) for d in decimals]
    fair = odds.remove_vig(implied)

    outcomes = []
    for o, dec, imp, no_vig in zip(req.outcomes, decimals, implied, fair):
        e = edge_mod.edge(o.model_prob, no_vig)
        outcomes.append(
            OutcomeOut(
                label=o.label,
                model_prob=o.model_prob,
                decimal_odds=dec,
                implied_prob=imp,
                no_vig_prob=no_vig,
                edge=e,
                ev_per_unit=edge_mod.expected_value(o.model_prob, dec),
                recommend=e > settings.min_edge,
            )
        )

    return EdgeResponse(outcomes=outcomes, market_hold=sum(implied) - 1.0)


@app.post("/v1/elo/update", response_model=EloUpdateResponse)
def elo_update(req: EloUpdateRequest) -> EloUpdateResponse:
    """Post-game rating update (call from settle-results). Stateless: returns the
    new ratings; persist them in Supabase."""
    ha = 0.0 if req.neutral else settings.home_advantage
    new_home, new_away = elo.update(
        req.home_rating, req.away_rating, req.home_score, req.away_score,
        k=settings.elo_k, home_advantage=ha,
    )
    return EloUpdateResponse(home_rating_new=new_home, away_rating_new=new_away)
