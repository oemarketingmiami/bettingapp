"""Probability calibration (INSTRUCTIONS.md §6: "calibrated probabilities").

Raw Elo win probabilities are mis-calibrated — a model that says "70%" may win
only 62% of the time. Betting on uncalibrated numbers leaks money, so every model
probability passes through here before it becomes an edge.

The calibration map is fit offline by scripts/calibrate.py (isotonic regression on
historical results) and saved to calibration_data.json. We apply it with a simple
monotonic interpolation so there's no sklearn version dependency at serve time.
If the artifact is missing, this is the identity (no-op) and the service still runs.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np

_ARTIFACT = Path(__file__).with_name("calibration_data.json")


class Calibrator:
    def __init__(self, x: list[float] | None = None, y: list[float] | None = None, meta: dict | None = None) -> None:
        self._x = np.asarray(x, dtype=float) if x else None
        self._y = np.asarray(y, dtype=float) if y else None
        self.meta = meta or {}

    @property
    def is_fitted(self) -> bool:
        return self._x is not None and self._x.size > 0

    def calibrate(self, prob: float) -> float:
        if not self.is_fitted:
            return prob
        out = float(np.interp(prob, self._x, self._y))  # monotonic, clipped at ends
        return min(1.0, max(0.0, out))

    @classmethod
    def load(cls) -> "Calibrator":
        if _ARTIFACT.exists():
            try:
                d = json.loads(_ARTIFACT.read_text())
                return cls(d.get("x"), d.get("y"), d.get("meta"))
            except Exception:
                pass
        return cls()


# Process-wide default; loads the fitted map at startup if present.
default_calibrator = Calibrator.load()
