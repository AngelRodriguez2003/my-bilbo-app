import {
  CYCLE_END_REPS,
  estimateOneRepMax,
  isCycleEndNear,
  nextWeight,
  projectCycleEnd,
  roundToStep,
  startWeightFromOneRepMax,
} from '@/lib/bilbo';

describe('roundToStep', () => {
  it('rounds to the nearest multiple', () => {
    expect(roundToStep(41.2, 2.5)).toBe(40);
    expect(roundToStep(41.3, 2.5)).toBe(42.5);
    expect(roundToStep(40, 2.5)).toBe(40);
  });

  it('returns the value unchanged for a non-positive step', () => {
    expect(roundToStep(41.2, 0)).toBe(41.2);
  });
});

describe('startWeightFromOneRepMax', () => {
  it('suggests 50% of 1RM rounded to the step', () => {
    expect(startWeightFromOneRepMax(80)).toBe(40);
    expect(startWeightFromOneRepMax(100)).toBe(50);
    expect(startWeightFromOneRepMax(85)).toBe(42.5);
    expect(startWeightFromOneRepMax(83)).toBe(42.5); // 41.5 → 42.5
  });
});

describe('nextWeight', () => {
  it('adds the increment step', () => {
    expect(nextWeight(40, 2.5)).toBe(42.5);
    expect(nextWeight(42.5, 2.5)).toBe(45);
  });
});

describe('estimateOneRepMax (Epley)', () => {
  it('matches w·(1 + reps/30)', () => {
    expect(estimateOneRepMax(40, 30)).toBe(80);
    expect(estimateOneRepMax(60, 15)).toBe(90);
  });

  it('returns the weight itself for a single rep', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
  });

  it('returns 0 for invalid input', () => {
    expect(estimateOneRepMax(0, 10)).toBe(0);
    expect(estimateOneRepMax(50, 0)).toBe(0);
  });
});

describe('projectCycleEnd', () => {
  it('needs at least two sessions', () => {
    expect(projectCycleEnd([{ weight: 40, reps: 38 }], 2.5)).toBeNull();
  });

  it('needs weight spread between sessions', () => {
    expect(
      projectCycleEnd(
        [
          { weight: 40, reps: 38 },
          { weight: 40, reps: 36 },
        ],
        2.5,
      ),
    ).toBeNull();
  });

  it('returns null when reps are not trending down', () => {
    expect(
      projectCycleEnd(
        [
          { weight: 40, reps: 30 },
          { weight: 42.5, reps: 32 },
        ],
        2.5,
      ),
    ).toBeNull();
  });

  it('projects the pau.ninja example cycle to ~15 reps', () => {
    // Real-world data: 40kg×38, 45kg×32, 52.5kg×27 → cycle ended at 67.5kg×15
    const projection = projectCycleEnd(
      [
        { weight: 40, reps: 38 },
        { weight: 45, reps: 32 },
        { weight: 52.5, reps: 27 },
      ],
      2.5,
    );
    expect(projection).not.toBeNull();
    expect(projection!.slope).toBeLessThan(0);
    // Linear fit lands near the real 67.5kg outcome
    expect(projection!.endWeight).toBeGreaterThanOrEqual(60);
    expect(projection!.endWeight).toBeLessThanOrEqual(72.5);
    expect(projection!.sessionsLeft).toBe(
      Math.ceil((projection!.endWeight - 52.5) / 2.5),
    );
  });

  it('clamps the projection to the current weight when already past target', () => {
    const projection = projectCycleEnd(
      [
        { weight: 60, reps: 20 },
        { weight: 62.5, reps: 14 },
      ],
      2.5,
    );
    expect(projection).not.toBeNull();
    expect(projection!.endWeight).toBeGreaterThanOrEqual(62.5);
    expect(projection!.sessionsLeft).toBeGreaterThanOrEqual(0);
  });
});

describe('isCycleEndNear', () => {
  it('flags reps at or below the target', () => {
    expect(isCycleEndNear(15)).toBe(true);
    expect(isCycleEndNear(14)).toBe(true);
    expect(isCycleEndNear(16)).toBe(false);
  });

  it('uses the exported constant', () => {
    expect(CYCLE_END_REPS).toBe(15);
  });
});
