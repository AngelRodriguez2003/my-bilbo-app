/**
 * Pure Bilbo-method math. No React, no stores — unit-testable.
 *
 * The Bilbo method: one explosive set starting at ~50% of 1RM (27-35 reps),
 * adding a fixed increment (default 2.5 kg) each session. The cycle ends
 * when the set drops to ~15 reps.
 */

export const CYCLE_END_REPS = 15;

export interface SessionPoint {
  weight: number;
  reps: number;
}

/** Round to the nearest multiple of `step` (e.g. plate increments). */
export function roundToStep(value: number, step: number): number {
  if (step <= 0) return value;
  return Math.round(value / step) * step;
}

/** Suggested cycle start: 50% of 1RM, rounded to the increment step. */
export function startWeightFromOneRepMax(oneRepMax: number, step = 2.5): number {
  return roundToStep(oneRepMax * 0.5, step);
}

/** Weight to load next session. */
export function nextWeight(lastWeight: number, step: number): number {
  return lastWeight + step;
}

/**
 * Epley estimate: 1RM ≈ w · (1 + reps/30).
 * With Bilbo's high-rep sets this is a rough reference, not a testing max.
 */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export interface CycleProjection {
  /** Weight at which the set is expected to fall to CYCLE_END_REPS. */
  endWeight: number;
  /** Estimated sessions remaining after the last logged one. */
  sessionsLeft: number;
  /** Least-squares slope (reps lost per unit of weight added). */
  slope: number;
}

/**
 * Least-squares fit reps = a + b·weight over the cycle's sessions, then solve
 * for reps = CYCLE_END_REPS. Returns null with < 2 points, a non-negative
 * slope (no downward trend yet), or points without weight spread.
 */
export function projectCycleEnd(
  points: SessionPoint[],
  step: number,
  targetReps: number = CYCLE_END_REPS,
): CycleProjection | null {
  if (points.length < 2) return null;

  const n = points.length;
  const meanW = points.reduce((acc, p) => acc + p.weight, 0) / n;
  const meanR = points.reduce((acc, p) => acc + p.reps, 0) / n;

  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.weight - meanW) * (p.reps - meanR);
    den += (p.weight - meanW) ** 2;
  }
  if (den === 0) return null; // all sessions at the same weight
  const slope = num / den;
  if (slope >= 0) return null; // reps not trending down — no meaningful projection

  const intercept = meanR - slope * meanW;
  const rawEndWeight = (targetReps - intercept) / slope;

  const lastWeight = points[points.length - 1].weight;
  // Never project below the current weight; round up to the loadable step.
  const endWeight = Math.max(roundToStep(rawEndWeight, step), lastWeight);
  const sessionsLeft = Math.max(0, Math.ceil((endWeight - lastWeight) / step));

  return { endWeight, sessionsLeft, slope };
}

/** True once the last set is at/under the cycle-end rep target. */
export function isCycleEndNear(lastReps: number, threshold: number = CYCLE_END_REPS): boolean {
  return lastReps <= threshold;
}
