"""Service configuration. Override any field via MODEL_* env vars (see .env.example)."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="MODEL_", env_file=".env", extra="ignore")

    # Elo
    elo_base: float = 1500.0          # rating for a brand-new team
    elo_k: float = 20.0               # update step size
    home_advantage: float = 65.0      # Elo points added to the home side (~ NBA baseline)

    # Edge gate — a side is only "recommended" when edge strictly exceeds this.
    # INSTRUCTIONS.md §6: no positive edge -> no bet. Keep at 0.0 to mean "any +edge".
    min_edge: float = 0.0

    # Market anchoring: pull the model probability this fraction toward the
    # de-vigged market before computing edge (0 = pure model, 1 = trust market
    # fully). The market is a strong calibrated baseline, so a little anchoring
    # shrinks over-confident edges. 0.0 keeps prior behavior.
    market_anchor: float = 0.0

    # Identifies which model produced a probability, so cards are traceable.
    model_version: str = "elo-cal-v1"


settings = Settings()
