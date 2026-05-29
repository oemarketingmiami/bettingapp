import pytest

from app import elo


def test_equal_ratings_neutral_is_coinflip():
    assert elo.expected_score(1500, 1500, 0.0) == pytest.approx(0.5)


def test_home_advantage_lifts_favorite():
    assert elo.expected_score(1500, 1500, 65.0) > 0.5


def test_400_gap_is_about_91pct():
    # A 400-point edge ~ 10:1 in logistic Elo
    assert elo.expected_score(1900, 1500, 0.0) == pytest.approx(0.909, abs=1e-3)


def test_winner_gains_loser_loses_symmetrically():
    new_home, new_away = elo.update(1500, 1500, 110, 100, k=20, home_advantage=0.0)
    assert new_home > 1500
    assert new_away < 1500
    # zero-sum
    assert (new_home - 1500) == pytest.approx(1500 - new_away)


def test_bigger_margin_moves_more():
    _, away_close = elo.update(1500, 1500, 101, 100, k=20)
    _, away_blowout = elo.update(1500, 1500, 130, 100, k=20)
    assert (1500 - away_blowout) > (1500 - away_close)
