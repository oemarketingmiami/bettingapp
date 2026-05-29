"""Probability calibration hook (INSTRUCTIONS.md §6: "calibrated probabilities").

Raw Elo/XGBoost outputs are often mis-calibrated — a model that says "70%" may
win 62% of the time. Betting on uncalibrated probabilities leaks money, so every
model probability passes through here before it becomes an edge.

Default is the identity (no-op) so the service is correct out of the box. Once
you have settled results, fit an isotonic or Platt calibrator offline
(sklearn IsotonicRegression / CalibratedClassifierCV), persist it, and load it
here — the rest of the pipeline doesn't change.
"""
from __future__ import annotations

from typing import Optional


class Calibrator:
    def __init__(self, model: Optional[object] = None) -> None:
        # `model` is any object with .predict([x]) -> [y], e.g. a fitted
        # sklearn IsotonicRegression. None => identity passthrough.
        self._model = model

    @property
    def is_fitted(self) -> bool:
        return self._model is not None

    def calibrate(self, prob: float) -> float:
        if self._model is None:
            return prob
        out = float(self._model.predict([prob])[0])
        # Clamp — a fitted calibrator can extrapolate slightly past [0, 1].
        return min(1.0, max(0.0, out))

    @classmethod
    def load(cls, path: str) -> "Calibrator":
        """Load a pickled fitted calibrator. Stubbed until you have one to load."""
        import pickle

        with open(path, "rb") as fh:
            return cls(model=pickle.load(fh))


# Process-wide default. Swap via Calibrator.load(...) during app startup once fitted.
default_calibrator = Calibrator()
