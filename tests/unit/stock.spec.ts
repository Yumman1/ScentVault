import { describe, it, expect } from 'vitest';
import { computeStockPositions, computeTotalStock } from '../../lib/stock';
import {
  GateOutUsage,
  type GateInLog,
  type GateOutLog,
  type StockTransferLog,
  type Perfume,
} from '../../types';

const PERFUME_ID = 'p1';
const OTHER_PERFUME_ID = 'p2';
const LOC_A = 'loc-A';
const LOC_B = 'loc-B';
const PT = 'pt-1';

const perfume: Perfume = {
  id: PERFUME_ID,
  name: 'Test Perfume',
  code: 'TP',
  supplierId: 's1',
  dosage: 10,
  priceUSD: 50,
  pricePKR: 14000,
  lowStockAlert: 0,
  olfactiveNotes: [],
  remarks: '',
};

function gateIn(overrides: Partial<GateInLog> = {}): GateInLog {
  return {
    id: 'gi-' + Math.random().toString(36).slice(2),
    date: '2025-01-01',
    perfumeId: PERFUME_ID,
    importReference: 'B1',
    packingTypeId: PT,
    packingQty: 1,
    netWeight: 100,
    mainLocationId: LOC_A,
    supplierInvoice: '',
    remarks: '',
    priceUSD: 50,
    ...overrides,
  };
}

function gateOut(overrides: Partial<GateOutLog> = {}): GateOutLog {
  return {
    id: 'go-' + Math.random().toString(36).slice(2),
    date: '2025-01-02',
    perfumeId: PERFUME_ID,
    packingTypeId: PT,
    packingQty: 1,
    netWeight: 20,
    mainLocationId: LOC_A,
    usage: GateOutUsage.Production,
    remarks: '',
    batchNumber: 'B1',
    ...overrides,
  };
}

function transfer(overrides: Partial<StockTransferLog> = {}): StockTransferLog {
  return {
    id: 'tx-' + Math.random().toString(36).slice(2),
    date: '2025-01-03',
    perfumeId: PERFUME_ID,
    packingTypeId: PT,
    packingQty: 1,
    netWeight: 30,
    fromMainLocationId: LOC_A,
    toMainLocationId: LOC_B,
    remarks: '',
    batchNumber: 'B1',
    ...overrides,
  };
}

const EMPTY = { gateIn: [], gateOut: [], transfer: [] };

describe('computeStockPositions - empty', () => {
  it('returns empty for no logs', () => {
    expect(computeStockPositions(PERFUME_ID, EMPTY, [perfume])).toEqual([]);
  });

  it('ignores logs for other perfumes', () => {
    const result = computeStockPositions(
      PERFUME_ID,
      {
        gateIn: [gateIn({ perfumeId: OTHER_PERFUME_ID })],
        gateOut: [],
        transfer: [],
      },
      [perfume],
    );
    expect(result).toEqual([]);
  });
});

describe('computeStockPositions - gate in', () => {
  it('creates one position per (location, batch)', () => {
    const result = computeStockPositions(
      PERFUME_ID,
      {
        gateIn: [
          gateIn({ netWeight: 100, importReference: 'B1' }),
          gateIn({ netWeight: 50, importReference: 'B2' }),
        ],
        gateOut: [],
        transfer: [],
      },
      [perfume],
    );
    expect(result).toHaveLength(2);
    expect(result.find((p) => p.batch === 'B1')?.weight).toBe(100);
    expect(result.find((p) => p.batch === 'B2')?.weight).toBe(50);
  });

  it('accumulates multiple gate-ins with the same batch+location', () => {
    const result = computeStockPositions(
      PERFUME_ID,
      {
        gateIn: [gateIn({ netWeight: 10 }), gateIn({ netWeight: 15 })],
        gateOut: [],
        transfer: [],
      },
      [perfume],
    );
    expect(result).toHaveLength(1);
    expect(result[0].weight).toBe(25);
  });

  it('distinguishes main vs sub location', () => {
    const result = computeStockPositions(
      PERFUME_ID,
      {
        gateIn: [
          gateIn({ netWeight: 10, subLocationId: undefined }),
          gateIn({ netWeight: 20, subLocationId: 'sub-1' }),
        ],
        gateOut: [],
        transfer: [],
      },
      [perfume],
    );
    expect(result).toHaveLength(2);
  });

  it('normalizes empty importReference to "Unknown Batch"', () => {
    const result = computeStockPositions(
      PERFUME_ID,
      {
        gateIn: [gateIn({ importReference: '' })],
        gateOut: [],
        transfer: [],
      },
      [perfume],
    );
    expect(result[0].batch).toBe('Unknown Batch');
  });

  it('priceUSD falls back to perfume.priceUSD when log has no priceUSD', () => {
    const result = computeStockPositions(
      PERFUME_ID,
      {
        gateIn: [gateIn({ priceUSD: undefined })],
        gateOut: [],
        transfer: [],
      },
      [perfume],
    );
    expect(result[0].priceUSD).toBe(perfume.priceUSD);
  });
});

describe('computeStockPositions - gate out', () => {
  it('reduces the matching batch at the matching location', () => {
    const result = computeStockPositions(
      PERFUME_ID,
      {
        gateIn: [gateIn({ netWeight: 100, importReference: 'B1' })],
        gateOut: [gateOut({ netWeight: 30, batchNumber: 'B1' })],
        transfer: [],
      },
      [perfume],
    );
    expect(result).toHaveLength(1);
    expect(result[0].weight).toBe(70);
  });

  it('mismatched batchNumber creates a negative phantom position (documents the rule)', () => {
    const result = computeStockPositions(
      PERFUME_ID,
      {
        gateIn: [gateIn({ netWeight: 100, importReference: 'B1' })],
        gateOut: [gateOut({ netWeight: 20, batchNumber: 'WRONG' })],
        transfer: [],
      },
      [perfume],
    );
    expect(result).toHaveLength(2);
    expect(result.find((p) => p.batch === 'B1')?.weight).toBe(100);
    expect(result.find((p) => p.batch === 'WRONG')?.weight).toBe(-20);
  });

  it('overdraw: gate-out exceeding gate-in produces negative weight', () => {
    const result = computeStockPositions(
      PERFUME_ID,
      {
        gateIn: [gateIn({ netWeight: 10, importReference: 'B1' })],
        gateOut: [gateOut({ netWeight: 25, batchNumber: 'B1' })],
        transfer: [],
      },
      [perfume],
    );
    expect(result).toHaveLength(1);
    expect(result[0].weight).toBe(-15);
  });
});

describe('computeStockPositions - transfer', () => {
  it('moves weight between locations without changing total', () => {
    const result = computeStockPositions(
      PERFUME_ID,
      {
        gateIn: [gateIn({ netWeight: 100 })],
        gateOut: [],
        transfer: [transfer({ netWeight: 30 })],
      },
      [perfume],
    );
    expect(computeTotalStock(PERFUME_ID, {
      gateIn: [gateIn({ netWeight: 100 })],
      gateOut: [],
      transfer: [transfer({ netWeight: 30 })],
    }, [perfume])).toBe(100);

    expect(result.find((p) => p.mainLocationId === LOC_A)?.weight).toBe(70);
    expect(result.find((p) => p.mainLocationId === LOC_B)?.weight).toBe(30);
  });
});

describe('computeStockPositions - filtering', () => {
  it('filters out positions whose absolute weight is < 0.001', () => {
    const result = computeStockPositions(
      PERFUME_ID,
      {
        gateIn: [gateIn({ netWeight: 0.0005, importReference: 'B1' })],
        gateOut: [],
        transfer: [],
      },
      [perfume],
    );
    expect(result).toEqual([]);
  });

  it('returns zero-weight positions only when abs > 0.001', () => {
    const result = computeStockPositions(
      PERFUME_ID,
      {
        gateIn: [gateIn({ netWeight: 10, importReference: 'B1' })],
        gateOut: [gateOut({ netWeight: 10, batchNumber: 'B1' })],
        transfer: [],
      },
      [perfume],
    );
    expect(result).toEqual([]);
  });
});

describe('computeStockPositions - full timeline consistency', () => {
  it('gate-in + transfer + partial gate-out stays consistent', () => {
    const logs = {
      gateIn: [
        gateIn({ netWeight: 100, importReference: 'B1', mainLocationId: LOC_A }),
        gateIn({ netWeight: 50, importReference: 'B2', mainLocationId: LOC_A }),
      ],
      gateOut: [
        gateOut({ netWeight: 20, batchNumber: 'B1', mainLocationId: LOC_B }),
      ],
      transfer: [
        transfer({
          netWeight: 30,
          batchNumber: 'B1',
          fromMainLocationId: LOC_A,
          toMainLocationId: LOC_B,
        }),
      ],
    };
    const positions = computeStockPositions(PERFUME_ID, logs, [perfume]);
    // A/B1 = 100 - 30 = 70
    // A/B2 = 50
    // B/B1 = 30 - 20 = 10
    expect(positions.find((p) => p.mainLocationId === LOC_A && p.batch === 'B1')?.weight).toBe(70);
    expect(positions.find((p) => p.mainLocationId === LOC_A && p.batch === 'B2')?.weight).toBe(50);
    expect(positions.find((p) => p.mainLocationId === LOC_B && p.batch === 'B1')?.weight).toBe(10);
    expect(computeTotalStock(PERFUME_ID, logs, [perfume])).toBe(130);
  });
});
