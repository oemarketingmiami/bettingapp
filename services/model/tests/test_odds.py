import math

import pytest

from app import odds


def test_american_to_decimal_positive():
    assert odds.american_to_decimal(150) == pytest.approx(2.5)


def test_american_to_decimal_negative():
    assert odds.american_to_decimal(-200) == pytest.approx(1.5)


def test_decimal_to_implied():
    assert odds.decimal_to_implied(2.0) == pytest.approx(0.5)


def test_american_to_implied_roundtrip():
    # -110 is the classic ~52.38% implied
    assert odds.american_to_implied(-110) == pytest.approx(0.5238, abs=1e-3)


def test_remove_vig_sums_to_one():
    # -110 / -110 market: each ~0.524 raw, fair should be 0.5 / 0.5
    raw = [odds.american_to_implied(-110), odds.american_to_implied(-110)]
    fair = odds.remove_vig(raw)
    assert sum(fair) == pytest.approx(1.0)
    assert fair[0] == pytest.approx(0.5)


def test_remove_vig_preserves_ratio():
    raw = [0.6, 0.45]  # overround 1.05
    fair = odds.remove_vig(raw)
    assert fair[0] / fair[1] == pytest.approx(0.6 / 0.45)
    assert sum(fair) == pytest.approx(1.0)


def test_bad_decimal_raises():
    with pytest.raises(ValueError):
        odds.decimal_to_implied(0.9)
