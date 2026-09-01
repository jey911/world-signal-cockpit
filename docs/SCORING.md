# Scoring model — V0

V0 optimizes transparency and low compute rather than pretending to have a trained predictive model.

## Sensor anomaly

Before a mature local baseline exists, the proxy score combines:

- category-normalized absolute daily move;
- displacement from the 50-day average when available;
- abnormal volume when available.

The category scale prevents a 1% FX move from being treated the same as a 1% crypto move.

After at least eight distinct return observations accumulate, the app computes a running Welford mean/variance and a local return z-score. The final score becomes a blend dominated by `abs(local sigma)` with the transparent proxy retained as a secondary term.

Only a new provider market timestamp updates the baseline. Repeated polling of a closed market does not add fake zero-return observations.

## Relationship score

For each predefined relationship:

1. collect available member sensor anomaly scores;
2. average the five strongest contributors;
3. add a breadth term for the share of constituents above the watch threshold.

This intentionally detects coordinated abnormality before attempting causal classification.

## Risk vector

Each risk dimension selects sensors and relationships tagged with that event sensitivity. It combines their strongest current anomaly scores into a 0-100 stress index.

These are **not calibrated probabilities**. Calibration requires historical point-in-time replay and labeled outcomes.
