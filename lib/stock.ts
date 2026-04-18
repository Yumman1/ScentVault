import type { GateInLog, GateOutLog, StockTransferLog, Perfume } from '../types';

export interface StockPosition {
  mainLocationId: string;
  subLocationId?: string;
  batch: string;
  weight: number;
  priceUSD: number;
  arrivalDate: string;
}

export interface StockLogs {
  gateIn: GateInLog[];
  gateOut: GateOutLog[];
  transfer: StockTransferLog[];
}

const normalizeBatch = (s: string | undefined | null) => (s || 'Unknown Batch').trim();
const getKey = (main: string, sub: string | undefined, batch: string) =>
  `${main}|${sub || ''}|${batch}`;

/**
 * Pure stock-position calculator.
 *
 * Given all logs for a perfume, sums by (mainLocation, subLocation, batch).
 *
 * Batch matching rules (by design of the app):
 *   - GateInLog.importReference        is the batch.
 *   - GateOutLog.batchNumber           is the batch.
 *   - StockTransferLog.batchNumber     is the batch (stays the same across the move).
 *
 * A gate-out whose batchNumber does NOT match any prior gate-in.importReference
 * will create/affect its own phantom position; this mirrors the production
 * behaviour so tests can detect misaligned batches.
 *
 * Positions whose absolute weight is less than 0.001 are filtered out.
 * Negative positions (overdraw) ARE returned so callers can flag them.
 */
export function computeStockPositions(
  perfumeId: string,
  logs: StockLogs,
  perfumes: Perfume[] = [],
): StockPosition[] {
  const stockMap: Record<string, number> = {};
  const batchPriceMap: Record<string, number> = {};
  const batchDateMap: Record<string, string> = {};

  logs.gateIn.forEach((l) => {
    if (l.perfumeId !== perfumeId) return;
    const batch = normalizeBatch(l.importReference);
    const k = getKey(l.mainLocationId, l.subLocationId, batch);
    stockMap[k] = (stockMap[k] || 0) + Number(l.netWeight);
    batchPriceMap[batch] =
      l.priceUSD || perfumes.find((p) => p.id === perfumeId)?.priceUSD || 0;
    batchDateMap[batch] = l.date;
  });

  logs.gateOut.forEach((l) => {
    if (l.perfumeId !== perfumeId) return;
    const batch = normalizeBatch(l.batchNumber);
    const k = getKey(l.mainLocationId, l.subLocationId, batch);
    stockMap[k] = (stockMap[k] || 0) - Number(l.netWeight);
  });

  logs.transfer.forEach((l) => {
    if (l.perfumeId !== perfumeId) return;
    const batch = normalizeBatch(l.batchNumber);
    const fromKey = getKey(l.fromMainLocationId, l.fromSubLocationId, batch);
    const toKey = getKey(l.toMainLocationId, l.toSubLocationId, batch);
    stockMap[fromKey] = (stockMap[fromKey] || 0) - Number(l.netWeight);
    stockMap[toKey] = (stockMap[toKey] || 0) + Number(l.netWeight);
  });

  return Object.entries(stockMap)
    .map(([key, weight]) => {
      const [mainLocId, subLocId, batch] = key.split('|');
      return {
        mainLocationId: mainLocId,
        subLocationId: subLocId || undefined,
        batch,
        weight,
        priceUSD: batchPriceMap[batch] || 0,
        arrivalDate: batchDateMap[batch] || '1970-01-01',
      };
    })
    .filter((item) => Math.abs(item.weight) > 0.001);
}

/**
 * Total net weight of a perfume across all positions (can be negative if overdrawn).
 */
export function computeTotalStock(
  perfumeId: string,
  logs: StockLogs,
  perfumes: Perfume[] = [],
): number {
  return computeStockPositions(perfumeId, logs, perfumes).reduce(
    (sum, p) => sum + p.weight,
    0,
  );
}
