"""Request/response contracts. This is the interface the Next.js / Edge Function
side codes against via MODEL_SERVICE_URL — keep it stable."""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field, model_validator


# ---- /v1/predict ----------------------------------------------------------

class PredictRequest(BaseModel):
    home_team: str
    away_team: str
    home_rating: float = Field(..., description="Current Elo rating for the home team")
    away_rating: float = Field(..., description="Current Elo rating for the away team")
    neutral: bool = Field(False, description="True for a neutral-site game (no home edge)")


class PredictResponse(BaseModel):
    home_team: str
    away_team: str
    home_win_prob: float
    away_win_prob: float
    calibrated: bool
    model_version: str


# ---- /v1/edge -------------------------------------------------------------

class OutcomeIn(BaseModel):
    label: str = Field(..., description="What this outcome is, e.g. team or Over/Under")
    model_prob: float = Field(..., ge=0.0, le=1.0, description="Calibrated model probability")
    decimal_odds: Optional[float] = Field(None, gt=1.0)
    american_odds: Optional[float] = None

    @model_validator(mode="after")
    def _need_one_price(self) -> "OutcomeIn":
        if self.decimal_odds is None and self.american_odds is None:
            raise ValueError("Provide decimal_odds or american_odds")
        return self


class EdgeRequest(BaseModel):
    outcomes: list[OutcomeIn] = Field(
        ..., min_length=1,
        description="The FULL market (e.g. both moneyline sides) so vig removal is valid",
    )


class OutcomeOut(BaseModel):
    label: str
    model_prob: float
    decimal_odds: float
    implied_prob: float       # raw, with vig
    no_vig_prob: float        # fair
    edge: float               # model_prob - no_vig_prob
    ev_per_unit: float        # EV at the offered price
    recommend: bool           # edge > min_edge


class EdgeResponse(BaseModel):
    outcomes: list[OutcomeOut]
    market_hold: float        # overround - 1; the book's vig on this market


# ---- /v1/elo/update -------------------------------------------------------

class EloUpdateRequest(BaseModel):
    home_rating: float
    away_rating: float
    home_score: float
    away_score: float
    neutral: bool = False


class EloUpdateResponse(BaseModel):
    home_rating_new: float
    away_rating_new: float
