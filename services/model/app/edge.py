"""The edge calculation — the whole game (INSTRUCTIONS.md §6).

edge = model_prob - no_vig_market_prob.  No positive edge -> no bet.
"""
from __future__ import annotations


def edge(model_prob: float, no_vig_prob: float) -> float:
    """How much the model's probability beats the fair (de-vigged) market price."""
    return model_prob - no_vig_prob


def expected_value(model_prob: float, decimal_odds: float) -> float:
    """EV per 1 unit staked, at the offered (vigged) price.

    Win returns (decimal_odds - 1) units; a loss returns -1. This is the real
    money question — edge vs the fair line tells you there's value; EV tells you
    how much, at the price you can actually bet.
    """
    return model_prob * (decimal_odds - 1.0) - (1.0 - model_prob)
