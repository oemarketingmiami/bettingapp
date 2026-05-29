"""Elo ratings — the baseline win-probability model (INSTRUCTIONS.md §6).

Stateless on purpose: ratings are passed in and returned. Storage lives in
Supabase, so this service can run serverless and never owns mutable state.
"""
from __future__ import annotations

import math


def expected_score(rating_a: float, rating_b: float, home_advantage: float = 0.0) -> float:
    """Probability that A beats B, given A holds `home_advantage` Elo points.

    Pass home_advantage=0.0 for a neutral site. Logistic on the rating gap / 400.
    """
    gap = (rating_a + home_advantage) - rating_b
    return 1.0 / (1.0 + 10.0 ** (-gap / 400.0))


def mov_multiplier(margin: float, winner_rating_diff: float) -> float:
    """538-style margin-of-victory multiplier.

    Bigger wins move ratings more, but the autocorrelation term damps the move
    when a strong favorite (large positive rating diff) wins — so blowouts by
    already-great teams don't over-inflate. `winner_rating_diff` is
    (winner_rating - loser_rating) BEFORE the game, including home advantage.
    """
    margin = abs(margin)
    return math.log(margin + 1.0) * (2.2 / ((winner_rating_diff * 0.001) + 2.2))


def update(
    home_rating: float,
    away_rating: float,
    home_score: float,
    away_score: float,
    k: float,
    home_advantage: float = 0.0,
) -> tuple[float, float]:
    """Return (new_home_rating, new_away_rating) after one game.

    Uses the margin-of-victory multiplier so a 1-point win and a 30-point win
    aren't graded the same. Ties (rare in the sports we cover) score 0.5.
    """
    exp_home = expected_score(home_rating, away_rating, home_advantage)
    if home_score > away_score:
        actual_home, winner_diff = 1.0, (home_rating + home_advantage) - away_rating
    elif home_score < away_score:
        actual_home, winner_diff = 0.0, (away_rating - (home_rating + home_advantage))
    else:
        actual_home, winner_diff = 0.5, 0.0

    margin = abs(home_score - away_score)
    mult = mov_multiplier(margin, winner_diff) if margin > 0 else 1.0
    delta = k * mult * (actual_home - exp_home)
    return home_rating + delta, away_rating - delta
