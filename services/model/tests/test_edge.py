import pytest
from fastapi.testclient import TestClient

from app import edge as edge_mod
from app.main import app

client = TestClient(app)


def test_edge_positive_when_model_beats_fair():
    assert edge_mod.edge(0.60, 0.52) == pytest.approx(0.08)


def test_ev_breakeven_at_fair_price():
    # decimal 2.0 fair coin: EV = 0 at p=0.5
    assert edge_mod.expected_value(0.5, 2.0) == pytest.approx(0.0)


def test_ev_positive_with_edge():
    assert edge_mod.expected_value(0.6, 2.0) == pytest.approx(0.2)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_predict_endpoint():
    r = client.post("/v1/predict", json={
        "home_team": "BOS", "away_team": "LAL",
        "home_rating": 1600, "away_rating": 1500, "neutral": False,
    })
    assert r.status_code == 200
    body = r.json()
    assert body["home_win_prob"] > body["away_win_prob"]
    assert body["home_win_prob"] + body["away_win_prob"] == pytest.approx(1.0)


def test_edge_endpoint_flags_value_side():
    # Model loves BOS (70%) but market only fairly prices ~50% -> recommend BOS.
    r = client.post("/v1/edge", json={"outcomes": [
        {"label": "BOS", "model_prob": 0.70, "american_odds": -110},
        {"label": "LAL", "model_prob": 0.30, "american_odds": -110},
    ]})
    assert r.status_code == 200
    body = r.json()
    bos = next(o for o in body["outcomes"] if o["label"] == "BOS")
    lal = next(o for o in body["outcomes"] if o["label"] == "LAL")
    assert bos["no_vig_prob"] == pytest.approx(0.5, abs=1e-3)
    assert bos["edge"] > 0 and bos["recommend"] is True
    assert lal["edge"] < 0 and lal["recommend"] is False
    assert body["market_hold"] > 0


def test_edge_endpoint_requires_a_price():
    r = client.post("/v1/edge", json={"outcomes": [{"label": "X", "model_prob": 0.5}]})
    assert r.status_code == 422
