/**
 * Unit tests for the client-side shift incentive engine.
 *
 * Expected values are computed by hand from the algorithm so they lock
 * parity with the backend pip-calculation.ts source of truth.
 */

import {
  calculateIncentive,
  calculateMethod1,
  calculateMethod2,
  calculateSlabAmount,
  type PartEntry,
  type SlabTier,
} from '@/features/production/pip/lib/shift-incentive';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const flatSlab: SlabTier[] = [{ fromQty: 1, toQty: null, ratePerPiece: 5 }];

function makeEntry(
  overrides: Partial<PartEntry> & {
    qtyProduced: number;
    shiftTargetQty: number;
    slabTiers?: SlabTier[];
  },
): PartEntry {
  return {
    partId: 'p1',
    partNumber: 'PN-001',
    partName: 'Part A',
    machineId: 'm1',
    machineCode: 'MC-001',
    slabTiers: flatSlab,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// calculateSlabAmount
// ---------------------------------------------------------------------------

describe('calculateSlabAmount', () => {
  it('returns 0 for zero earningQty', () => {
    const result = calculateSlabAmount(0, 100, 80, flatSlab);
    expect(result.amount).toBe(0);
  });

  it('returns 0 when slabTiers is empty', () => {
    const result = calculateSlabAmount(10, 100, 80, []);
    expect(result.amount).toBe(0);
  });

  it('below-target only: earns at Slab 1 rate', () => {
    // qtyProduced=80, target=100 → all earning is below-target
    // earningQty=40, totalAboveTarget=max(0,80-100)=0, belowTargetEarning=40
    // amount = 40 * 5 = 200
    const result = calculateSlabAmount(40, 100, 80, flatSlab);
    expect(result.amount).toBe(200);
  });

  it('slab-tier walking: above-target pieces walk through tiers', () => {
    // produced=70, target=60, slabs: [1-10 @ ₹5, 11-∞ @ ₹8]
    // earningQty=70 (Case B scenario), totalAboveTarget=10, aboveTargetEarning=10
    // belowTargetEarning=60 → 60*5=300
    // nonEarningAboveTarget=0, tier1 cap=10: 10 pcs @ ₹5 = 50
    // total = 300 + 50 = 350
    const tiered: SlabTier[] = [
      { fromQty: 1, toQty: 10, ratePerPiece: 5 },
      { fromQty: 11, toQty: null, ratePerPiece: 8 },
    ];
    const result = calculateSlabAmount(70, 60, 70, tiered);
    expect(result.amount).toBe(350);
  });

  it('slab-tier walking: pieces spill into second tier', () => {
    // produced=75, target=60, earningQty=75 (Case B)
    // totalAboveTarget=15, aboveTargetEarning=15, belowTargetEarning=60
    // below: 60*5=300
    // above 15 pcs: tier1 cap=10 (1-10), nonEarning=0 → 10 pcs @ ₹5 = 50
    // tier2 (11-∞): remaining=5 → 5*8=40
    // total = 300 + 50 + 40 = 390
    const tiered: SlabTier[] = [
      { fromQty: 1, toQty: 10, ratePerPiece: 5 },
      { fromQty: 11, toQty: null, ratePerPiece: 8 },
    ];
    const result = calculateSlabAmount(75, 60, 75, tiered);
    expect(result.amount).toBe(390);
  });
});

// ---------------------------------------------------------------------------
// Method 1 — Excess Ratio Incentive
// ---------------------------------------------------------------------------

describe('calculateMethod1', () => {
  it('Case A: single part below 100% → 0 incentive, isEligible false', () => {
    // produced=50, target=100 → ratio=0.5, ratioAfter=0.5 ≤ 1.0 → Case A
    const result = calculateMethod1([makeEntry({ qtyProduced: 50, shiftTargetQty: 100 })]);

    expect(result.isEligible).toBe(false);
    expect(result.totalIncentive).toBe(0);
    expect(result.cumulativeRatio).toBe(50); // 50% expressed as %
    expect(result.methodNumber).toBe(1);
    expect(result.parts).toHaveLength(1);

    const part = result.parts[0]!;
    expect(part.case).toBe('A');
    expect(part.earningQty).toBe(0);
    expect(part.incentiveAmount).toBe(0);
    expect(part.achievementPct).toBe(50);
  });

  it('exactly 100% cumulative → case A (ratioAfter ≤ 1.0) but isEligible true', () => {
    // produced=100, target=100 → ratioAfter=1.0 ≤ 1.0 → Case A
    // isEligible = cumulativeRatio >= 1.0 = true
    const result = calculateMethod1([makeEntry({ qtyProduced: 100, shiftTargetQty: 100 })]);

    expect(result.isEligible).toBe(true);
    expect(result.totalIncentive).toBe(0); // Case A earns nothing
    expect(result.cumulativeRatio).toBe(100);

    const part = result.parts[0]!;
    expect(part.case).toBe('A');
    expect(part.earningQty).toBe(0);
    expect(part.incentiveAmount).toBe(0);
  });

  it('Case C: part crosses 100% → only excess portion earns', () => {
    // part1: produced=60, target=100 → ratioBefore=0, ratioAfter=0.6 → Case A, no earn
    // part2: produced=80, target=100 → ratioBefore=0.6, ratioAfter=1.4 → Case C
    //   ratioNeeded=0.4, piecesNeeded=ceil(0.4*100)=40, earningQty=80-40=40
    //   calculateSlabAmount(40, 100, 80, flatSlab):
    //     totalAboveTarget=max(0,80-100)=0, aboveTargetEarning=0, belowTargetEarning=40
    //     amount=40*5=200
    const entries = [
      makeEntry({ partId: 'p1', qtyProduced: 60, shiftTargetQty: 100 }),
      makeEntry({ partId: 'p2', qtyProduced: 80, shiftTargetQty: 100 }),
    ];
    const result = calculateMethod1(entries);

    expect(result.isEligible).toBe(true);
    expect(result.totalIncentive).toBe(200);
    expect(result.cumulativeRatio).toBe(140);

    const [p1, p2] = result.parts;
    expect(p1!.case).toBe('A');
    expect(p1!.earningQty).toBe(0);
    expect(p1!.incentiveAmount).toBe(0);

    expect(p2!.case).toBe('C');
    expect(p2!.earningQty).toBe(40);
    expect(p2!.incentiveAmount).toBe(200);
  });

  it('Case B: ratioBefore ≥ 1.0 → full qty earns', () => {
    // part1: produced=100, target=100 → ratioAfter=1.0 ≤ 1.0 → Case A
    // part2: ratioBefore=1.0 ≥ 1.0 → Case B, produced=50, target=60 @ ₹10
    //   earningQty=50, totalAboveTarget=max(0,50-60)=0, belowTargetEarning=50
    //   amount=50*10=500
    const slab10: SlabTier[] = [{ fromQty: 1, toQty: null, ratePerPiece: 10 }];
    const entries = [
      makeEntry({ partId: 'p1', qtyProduced: 100, shiftTargetQty: 100 }),
      makeEntry({ partId: 'p2', qtyProduced: 50, shiftTargetQty: 60, slabTiers: slab10 }),
    ];
    const result = calculateMethod1(entries);

    expect(result.isEligible).toBe(true);
    expect(result.totalIncentive).toBe(500);

    const [p1, p2] = result.parts;
    expect(p1!.case).toBe('A');
    expect(p1!.earningQty).toBe(0);

    expect(p2!.case).toBe('B');
    expect(p2!.earningQty).toBe(50);
    expect(p2!.incentiveAmount).toBe(500);
    expect(p2!.appliedSlabLabel).toBe('Slab 1');
  });

  it('slab-tier walking in Case B: pieces walk into higher tiers', () => {
    // part1 brings ratioBefore to 1.0 (produced=100, target=100 → Case A)
    // part2: ratioBefore=1.0 → Case B, produced=70, target=60
    //   tiered slabs: [1-10 @ ₹5, 11-∞ @ ₹8]
    //   totalAboveTarget=10, aboveTargetEarning=10, belowTargetEarning=60
    //   below: 60*5=300; above tier1 (10 pcs): 10*5=50; total=350
    const tiered: SlabTier[] = [
      { fromQty: 1, toQty: 10, ratePerPiece: 5 },
      { fromQty: 11, toQty: null, ratePerPiece: 8 },
    ];
    const entries = [
      makeEntry({ partId: 'p1', qtyProduced: 100, shiftTargetQty: 100 }),
      makeEntry({ partId: 'p2', qtyProduced: 70, shiftTargetQty: 60, slabTiers: tiered }),
    ];
    const result = calculateMethod1(entries);

    expect(result.isEligible).toBe(true);
    const p2 = result.parts[1]!;
    expect(p2.case).toBe('B');
    expect(p2.earningQty).toBe(70);
    expect(p2.incentiveAmount).toBe(350);
  });

  it('empty entries returns zero result', () => {
    const result = calculateMethod1([]);
    expect(result.totalIncentive).toBe(0);
    expect(result.isEligible).toBe(false);
    expect(result.parts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Method 2 — Milestone Rounding Incentive
// ---------------------------------------------------------------------------

describe('calculateMethod2', () => {
  it('floorToMilestone: 73% floors to 50% (not 75%)', () => {
    // Verify indirectly: entry with produced=73, target=100 → actualPct=73 → milestone=50
    const entry = makeEntry({ qtyProduced: 73, shiftTargetQty: 100 });
    const result = calculateMethod2([entry]);
    expect(result.parts[0]!.milestone).toBe(50);
  });

  it('floorToMilestone: exactly 75% → milestone 75', () => {
    const entry = makeEntry({ qtyProduced: 75, shiftTargetQty: 100 });
    const result = calculateMethod2([entry]);
    expect(result.parts[0]!.milestone).toBe(75);
  });

  it('floorToMilestone: 100%+ → milestone 100', () => {
    const entry = makeEntry({ qtyProduced: 110, shiftTargetQty: 100 });
    const result = calculateMethod2([entry]);
    expect(result.parts[0]!.milestone).toBe(100);
  });

  it('below 25% → milestone 0, no earning', () => {
    const entry = makeEntry({ qtyProduced: 20, shiftTargetQty: 100 });
    const result = calculateMethod2([entry]);
    const part = result.parts[0]!;
    expect(part.milestone).toBe(0);
    expect(part.earningQty).toBe(0);
    expect(part.incentiveAmount).toBe(0);
  });

  it('eligible when milestoneSum ≥ 100: incentives are applied', () => {
    // part1: produced=80, target=100 → actualPct=80 → milestone=75
    //   milestoneQty=round(75/100*100)=75, earningQty=80-75=5, @₹5=25
    // part2: produced=60, target=100 → actualPct=60 → milestone=50
    //   milestoneQty=50, earningQty=60-50=10, @₹5=50
    // milestoneSum=125 ≥ 100 → eligible
    // totalIncentive = 25 + 50 = 75
    const entries = [
      makeEntry({ partId: 'p1', qtyProduced: 80, shiftTargetQty: 100 }),
      makeEntry({ partId: 'p2', qtyProduced: 60, shiftTargetQty: 100 }),
    ];
    const result = calculateMethod2(entries);

    expect(result.isEligible).toBe(true);
    expect(result.cumulativeRatio).toBe(125); // milestoneSum
    expect(result.totalIncentive).toBe(75);

    expect(result.parts[0]!.milestone).toBe(75);
    expect(result.parts[0]!.milestoneQty).toBe(75);
    expect(result.parts[0]!.earningQty).toBe(5);
    expect(result.parts[0]!.incentiveAmount).toBe(25);

    expect(result.parts[1]!.milestone).toBe(50);
    expect(result.parts[1]!.earningQty).toBe(10);
    expect(result.parts[1]!.incentiveAmount).toBe(50);
  });

  it('NOT eligible when milestoneSum < 100: all incentives zeroed', () => {
    // part1: produced=40, target=100 → actualPct=40 → milestone=25
    //   milestoneQty=25, earningQty=40-25=15, @₹5=75 (would be, but zeroed)
    // part2: produced=20, target=100 → actualPct=20 → milestone=0, earningQty=0
    // milestoneSum=25 < 100 → NOT eligible
    const entries = [
      makeEntry({ partId: 'p1', qtyProduced: 40, shiftTargetQty: 100 }),
      makeEntry({ partId: 'p2', qtyProduced: 20, shiftTargetQty: 100 }),
    ];
    const result = calculateMethod2(entries);

    expect(result.isEligible).toBe(false);
    expect(result.totalIncentive).toBe(0);
    expect(result.cumulativeRatio).toBe(25);

    // All part incentives zeroed
    for (const part of result.parts) {
      expect(part.incentiveAmount).toBe(0);
    }
  });

  it('all parts are N/A case (Method 2 does not use A/B/C)', () => {
    const result = calculateMethod2([makeEntry({ qtyProduced: 80, shiftTargetQty: 100 })]);
    expect(result.parts[0]!.case).toBe('N/A');
  });

  it('method number is 2', () => {
    const result = calculateMethod2([makeEntry({ qtyProduced: 100, shiftTargetQty: 100 })]);
    expect(result.methodNumber).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// calculateIncentive — dispatch + empty guard
// ---------------------------------------------------------------------------

describe('calculateIncentive', () => {
  it('empty entries returns zero result for method 1', () => {
    const result = calculateIncentive([], 1);
    expect(result.totalIncentive).toBe(0);
    expect(result.isEligible).toBe(false);
    expect(result.parts).toHaveLength(0);
    expect(result.methodNumber).toBe(1);
    expect(result.cumulativeRatio).toBe(0);
  });

  it('empty entries returns zero result for method 2', () => {
    const result = calculateIncentive([], 2, 'My Method');
    expect(result.totalIncentive).toBe(0);
    expect(result.isEligible).toBe(false);
    expect(result.methodUsed).toBe('My Method');
    expect(result.methodNumber).toBe(2);
  });

  it('dispatches to Method 1 (Excess Ratio)', () => {
    const entry = makeEntry({ qtyProduced: 120, shiftTargetQty: 100 });
    const result = calculateIncentive([entry], 1);
    expect(result.methodNumber).toBe(1);
    // produced=120, target=100 → ratioAfter=1.2 > 1.0 → Case C
    // ratioNeeded=1.0, piecesNeeded=ceil(1.0*100)=100, earningQty=120-100=20
    // amount = 20 * 5 = 100
    expect(result.totalIncentive).toBe(100);
    expect(result.parts[0]!.case).toBe('C');
  });

  it('dispatches to Method 2 (Milestone Rounding)', () => {
    const entry = makeEntry({ qtyProduced: 80, shiftTargetQty: 100 });
    const result = calculateIncentive([entry], 2);
    expect(result.methodNumber).toBe(2);
    // single part, milestoneSum=75 < 100 → not eligible
    expect(result.isEligible).toBe(false);
    expect(result.totalIncentive).toBe(0);
    expect(result.parts[0]!.case).toBe('N/A');
  });

  it('uses custom methodName when provided', () => {
    const result = calculateIncentive([], 1, 'Custom Method');
    expect(result.methodUsed).toBe('Custom Method');
  });

  it('falls back to default methodName when not provided', () => {
    const result = calculateIncentive([], 1);
    expect(result.methodUsed).toBe('');
  });
});
