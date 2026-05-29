"""Odds <-> probability conversion and vig removal (INSTRUCTIONS.md §6).

implied prob = 1 / decimal_odds. Strip the vig before comparing model vs market.
"""
from __future__ import annotations


def american_to_decimal(american: float) -> float:
    """American (+150 / -180) -> decimal odds."""
    if american == 0:
        raise ValueError("American odds cannot be 0")
    if american > 0:
        return 1.0 + american / 100.0
    return 1.0 + 100.0 / abs(american)


def decimal_to_implied(decimal_odds: float) -> float:
    """Decimal odds -> raw implied probability (still includes the vig)."""
    if decimal_odds <= 1.0:
        raise ValueError("Decimal odds must be > 1.0")
    return 1.0 / decimal_odds


def american_to_implied(american: float) -> float:
    return decimal_to_implied(american_to_decimal(american))


def remove_vig(implied_probs: list[float]) -> list[float]:
    """Normalize a set of raw implied probs to remove the bookmaker's vig.

    Proportional (a.k.a. multiplicative) method: divide each by the overround.
    Input must be the FULL market (e.g. both moneyline sides) for this to be
    meaningful. Returns no-vig "fair" probabilities that sum to 1.0.
    """
    if not implied_probs:
        raise ValueError("Need at least one implied probability")
    if any(p <= 0 for p in implied_probs):
        raise ValueError("Implied probabilities must be > 0")
    overround = sum(implied_probs)
    return [p / overround for p in implied_probs]
