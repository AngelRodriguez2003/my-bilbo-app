import {
  CYCLE_END_REPS,
  cycleProgress,
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

describe('cycleProgress', () => {
  it('is 0 with no sessions and with a single one', () => {
    expect(cycleProgress([])).toBe(0);
    expect(cycleProgress([{ weight: 60, reps: 30 }])).toBe(0);
  });

  it('measures the way from the first set down to the cycle-end reps', () => {
    const points = [
      { weight: 60, reps: 30 },
      { weight: 62.5, reps: 25 },
    ];
    // De 30 a 15 hay 15 reps de recorrido; se han hecho 5.
    expect(cycleProgress(points)).toBeCloseTo(5 / 15);
  });

  it('caps at 1 once the set reaches or passes the target', () => {
    expect(
      cycleProgress([
        { weight: 60, reps: 30 },
        { weight: 80, reps: 12 },
      ]),
    ).toBe(1);
  });

  it('never goes negative when reps go back up', () => {
    expect(
      cycleProgress([
        { weight: 60, reps: 25 },
        { weight: 62.5, reps: 28 },
      ]),
    ).toBe(0);
  });

  it('treats a cycle that starts at the target as finished', () => {
    expect(cycleProgress([{ weight: 100, reps: 15 }, { weight: 102.5, reps: 14 }])).toBe(1);
  });
});
