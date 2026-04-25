import React, { useState, useMemo, useEffect } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Button } from '../ui/Button';
import { 
  FileDown, FileSpreadsheet, Search, Filter, X, 
  DollarSign, Coins, ChevronDown, ChevronUp, Scale,
  MapPin, Package, ArrowRightLeft, Lock, ArrowLeft,
  Info, History, Clock, TrendingDown, TrendingUp,
  AlertCircle, Zap, Box, Tag, ChevronLeft, ChevronRight
} from 'lucide-react';
import { MovementType, GateInLog, GateOutLog, StockTransferLog } from '../../types';
import { SearchableSelect } from '../ui/SearchableSelect';
import { useSearchParams } from 'react-router-dom';

type ReportType = 'inventory' | 'yield' | 'capital' | 'batch';

const REPORT_TABLE_PAGE_SIZE = 15;

function buildReportPageList(current: number, total: number): (number | 'gap')[] {
  if (total <= 1) return [];
  const windowSize = 5;
  const half = Math.floor(windowSize / 2);
  let start = Math.max(1, current - half);
  let end = Math.min(total, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);

  const items: (number | 'gap')[] = [];
  if (start > 1) {
    items.push(1);
    if (start > 2) items.push('gap');
  }
  for (let i = start; i <= end; i++) items.push(i);
  if (end < total) {
    if (end < total - 1) items.push('gap');
    items.push(total);
  }
  return items;
}

function ReportTablePagination(props: {
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
  totalCount: number;
  pageList: (number | 'gap')[];
}) {
  const { page, setPage, totalPages, totalCount, pageList } = props;
  if (totalPages <= 1 || totalCount === 0) return null;
  const start = (page - 1) * REPORT_TABLE_PAGE_SIZE + 1;
  const end = Math.min(page * REPORT_TABLE_PAGE_SIZE, totalCount);
  return (
    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40">
      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">
        <span className="uppercase tracking-wide">Page </span>
        {page} of {totalPages}
        <span className="text-slate-400 dark:text-slate-500 font-medium ml-2">
          ({start}–{end} of {totalCount})
        </span>
      </p>
      <div className="flex flex-wrap items-center justify-end gap-1">
        <button
          type="button"
          aria-label="First page"
          disabled={page <= 1}
          onClick={() => setPage(1)}
          className="px-2.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-tight text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          First
        </button>
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => setPage(p => Math.max(1, p - 1))}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <ChevronLeft size={18} strokeWidth={2.5} />
        </button>
        <div className="flex flex-wrap items-center gap-1 px-1">
          {pageList.map((item, i) =>
            item === 'gap' ? (
              <span key={`gap-${i}`} className="px-1 text-slate-400 font-black text-xs">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                aria-label={`Page ${item}`}
                aria-current={item === page ? 'page' : undefined}
                onClick={() => setPage(item)}
                className={`min-w-[2.25rem] px-2 py-1.5 rounded-lg text-xs font-black tabular-nums transition-colors ${
                  item === page
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {item}
              </button>
            )
          )}
        </div>
        <button
          type="button"
          aria-label="Next page"
          disabled={page >= totalPages}
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <ChevronRight size={18} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          aria-label="Last page"
          disabled={page >= totalPages}
          onClick={() => setPage(totalPages)}
          className="px-2.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-tight text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          Last
        </button>
      </div>
    </div>
  );
}

export const ReportsView = () => {
  const { 
    perfumes, suppliers, locations, packingTypes,
    gateInLogs, gateOutLogs, transferLogs,
    getMainLocations, getSubLocations,
    currentUser, hasPermission, getPerfumeStockBreakdown,
    olfactiveNotes
  } = useInventory();

  const [activeTab, setActiveTab] = useState<ReportType>('inventory');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatchName, setSelectedBatchName] = useState('');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Drill-down State
  const [drillDownPerfumeId, setDrillDownPerfumeId] = useState<string | null>(null);
  const [drillDownTab, setDrillDownTab] = useState<'stock' | 'history'>('stock');
  const [drillDownSupplier, setDrillDownSupplier] = useState<string | null>(null);

  // Drawer State
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Filter States
  const [filterLocation, setFilterLocation] = useState('');
  const [filterSubLocation, setFilterSubLocation] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterOlfactive, setFilterOlfactive] = useState('');
  
  // Price Filter States
  const [filterPriceUSDMin, setFilterPriceUSDMin] = useState('');
  const [filterPriceUSDMax, setFilterPriceUSDMax] = useState('');

  // Date & Type Filter States
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterTxType, setFilterTxType] = useState<MovementType | 'ALL'>('ALL');

  const [pageInventory, setPageInventory] = useState(1);
  const [pageYield, setPageYield] = useState(1);
  const [pageBatch, setPageBatch] = useState(1);
  const [pageAgedBatches, setPageAgedBatches] = useState(1);

  // Permissions Checks
  const canViewPrices = hasPermission('view_prices');
  const allowedLocationIds = currentUser?.permissions?.allowedLocationIds || [];
  const isLocationRestricted = allowedLocationIds.length > 0;

  // Handle URL Parameters
  React.useEffect(() => {
    const tab = searchParams.get('tab') as ReportType;
    const supplier = searchParams.get('supplier');
    
    if (tab && (['inventory', 'yield', 'capital', 'batch'] as ReportType[]).includes(tab)) {
      setActiveTab(tab);
    } else if (!tab) {
      setActiveTab('inventory');
    }
    
    if (supplier) {
      setDrillDownSupplier(supplier);
    } else {
      setDrillDownSupplier(null);
    }
  }, [searchParams]);

  useEffect(() => {
    setPageInventory(1);
    setPageYield(1);
    setPageBatch(1);
    setPageAgedBatches(1);
  }, [activeTab]);

  const mainLocations = getMainLocations().filter(l => 
    !isLocationRestricted || allowedLocationIds.includes(l.id)
  );

  const clearFilters = () => {
    setFilterLocation('');
    setFilterSubLocation('');
    setFilterSupplier('');
    setFilterOlfactive('');
    setFilterPriceUSDMin('');
    setFilterPriceUSDMax('');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterTxType('ALL');
    setPageInventory(1);
    setPageYield(1);
    setPageBatch(1);
    setPageAgedBatches(1);
  };

  const hasActiveFilters = !!(
    filterLocation || filterSubLocation || filterSupplier || filterOlfactive ||
    filterPriceUSDMin || filterPriceUSDMax ||
    filterStartDate || filterEndDate || filterTxType !== 'ALL'
  );

  const movementListConstraintActive =
    filterTxType !== 'ALL' || !!filterStartDate || !!filterEndDate;

  const historyData = useMemo(() => {
    const hubF = filterLocation.trim();
    const subF = filterSubLocation.trim();

    const all = [
      ...gateInLogs.map(l => ({ ...l, type: 'IN' as MovementType })),
      ...gateOutLogs.map(l => ({ ...l, type: 'OUT' as MovementType })),
      ...transferLogs.map(l => ({ ...l, type: 'TRANSFER' as MovementType })),
    ];

    return all
      .filter(log => {
        const dateStr = (log.date || '').slice(0, 10);
        if (filterStartDate && dateStr < filterStartDate) return false;
        if (filterEndDate && dateStr > filterEndDate) return false;
        if (filterTxType !== 'ALL' && log.type !== filterTxType) return false;

        const perfume = perfumes.find(x => x.id === log.perfumeId);
        if (filterSupplier && (!perfume || perfume.supplierId !== filterSupplier)) return false;
        if (filterOlfactive && (!perfume || !(perfume.olfactiveNotes || []).includes(filterOlfactive))) return false;

        if (hubF || subF) {
          if (log.type === 'IN' || log.type === 'OUT') {
            const loc = log as GateInLog | GateOutLog;
            if (hubF && (loc.mainLocationId || '').trim() !== hubF) return false;
            if (subF && (loc.subLocationId || '').trim() !== subF) return false;
          } else {
            const tr = log as StockTransferLog;
            const mainOk =
              !hubF ||
              (tr.fromMainLocationId || '').trim() === hubF ||
              (tr.toMainLocationId || '').trim() === hubF;
            if (!mainOk) return false;
            if (subF) {
              const subOk =
                (tr.fromSubLocationId || '').trim() === subF ||
                (tr.toSubLocationId || '').trim() === subF;
              if (!subOk) return false;
            }
          }
        }

        if (isLocationRestricted && allowedLocationIds.length > 0) {
          if (log.type === 'IN' || log.type === 'OUT') {
            const loc = log as GateInLog | GateOutLog;
            if (!allowedLocationIds.includes(loc.mainLocationId)) return false;
          } else {
            const tr = log as StockTransferLog;
            const touch =
              allowedLocationIds.includes(tr.fromMainLocationId) ||
              allowedLocationIds.includes(tr.toMainLocationId);
            if (!touch) return false;
          }
        }

        if (searchTerm) {
          const p = perfume;
          const batchOrRef =
            log.type === 'TRANSFER'
              ? (log as StockTransferLog).batchNumber
              : log.type === 'OUT'
                ? (log as GateOutLog).batchNumber
                : (log as GateInLog).importReference;
          const searchStr = `${p?.name || ''} ${p?.code || ''} ${batchOrRef || ''}`.toLowerCase();
          if (!searchStr.includes(searchTerm.toLowerCase())) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [
    gateInLogs,
    gateOutLogs,
    transferLogs,
    filterStartDate,
    filterEndDate,
    filterTxType,
    filterSupplier,
    filterOlfactive,
    filterLocation,
    filterSubLocation,
    searchTerm,
    perfumes,
    isLocationRestricted,
    allowedLocationIds,
  ]);

  const checkPriceFilter = (priceUSD: number | undefined) => {
      if (!canViewPrices) return true;
      const usd = priceUSD || 0;
      if (filterPriceUSDMin && usd < Number(filterPriceUSDMin)) return false;
      if (filterPriceUSDMax && usd > Number(filterPriceUSDMax)) return false;
      return true;
  };

  const checkLocationPermission = (mainLocId?: string) => {
      if (!isLocationRestricted) return true;
      if (mainLocId && allowedLocationIds.includes(mainLocId)) return true;
      return false;
  };

  // Summary logic
  const inventoryData = useMemo(() => {
    const hubF = filterLocation.trim();
    const subF = filterSubLocation.trim();
    const hubScopeActive = !!(hubF || subF);

    return perfumes.map(p => {
      const breakdown = getPerfumeStockBreakdown(p.id);
      
      const filteredBreakdown = breakdown.filter(pos => {
        if (!checkLocationPermission(pos.mainLocationId)) return false;
        if (hubF && (pos.mainLocationId || '').trim() !== hubF) return false;
        if (subF && (pos.subLocationId || '').trim() !== subF) return false;
        return true;
      });

      // FIFO Valuation Calculation
      const totalWeight = filteredBreakdown.reduce((acc, b) => acc + b.weight, 0);
      const totalValueUSD = filteredBreakdown.reduce((acc, b) => acc + (b.weight * b.priceUSD), 0);
      
      const supplier = suppliers.find(s => s.id === p.supplierId);
      
      const batchEntries = filteredBreakdown
        .filter(b => b.weight > 0.001)
        .sort((a, b) => b.weight - a.weight);

      const primaryBatch = batchEntries[0]?.batch || '-';
      const activeBatches = batchEntries.map(b => b.batch).sort().join(', ');

      // Filter logic
      if (filterSupplier && p.supplierId !== filterSupplier) return null;
      if (filterOlfactive && (!(p.olfactiveNotes || []).includes(filterOlfactive))) return null;
      if (!checkPriceFilter(p.priceUSD)) return null;

      // Hub / sub scope: only list SKUs that actually have on-hand (or non-zero position) there
      if (hubScopeActive && Math.abs(totalWeight) <= 0.001) return null;

      const isLowStock = totalWeight <= (p.lowStockAlert || 0);
      const isCritical = totalWeight <= ((p.lowStockAlert || 0) * 0.5);

      if (activeTab === 'low-stock' && !isLowStock) return null;

      return {
        id: p.id,
        code: p.code,
        name: p.name,
        supplierName: supplier?.name || 'Unknown',
        olfactiveNotes: p.olfactiveNotes || [],
        currentWeight: totalWeight,
        primaryBatch,
        activeBatches: activeBatches || '-',
        unitPriceUSD: p.priceUSD,
        unitPricePKR: p.pricePKR || 0,
        totalValueUSD,
        totalValuePKR: totalWeight * (p.pricePKR || 0), // Base default if PKR not batch-tracked
        lowStockAlert: p.lowStockAlert,
        isLowStock,
        isCritical,
        fullBreakdown: filteredBreakdown
      };
    }).filter(item => {
        if (!item) return false;
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             item.activeBatches.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;
        if (movementListConstraintActive) {
          const allowed = historyData.some(h => h.perfumeId === item.id);
          if (!allowed) return false;
        }
        return true;
    });
  }, [
      perfumes, suppliers, getPerfumeStockBreakdown, filterLocation, filterSubLocation, 
      filterSupplier, filterOlfactive, canViewPrices, filterPriceUSDMin, filterPriceUSDMax,
      activeTab, searchTerm, movementListConstraintActive, historyData
  ]);

  // Batch Intelligence Logic
  const uniqueBatches = useMemo(() => {
    const batches = new Set<string>();
    gateInLogs.forEach(l => { if (l.importReference) batches.add(l.importReference) });
    gateOutLogs.forEach(l => { if (l.batchNumber) batches.add(l.batchNumber) });
    transferLogs.forEach(l => { if (l.batchNumber) batches.add(l.batchNumber) });
    return Array.from(batches).sort().map(b => ({ value: b, label: b }));
  }, [gateInLogs, gateOutLogs, transferLogs]);

  const batchReportData = useMemo(() => {
    if (!selectedBatchName || activeTab !== 'batch') return null;

    const firstGateIn = gateInLogs.find(l => l.importReference === selectedBatchName);
    const relatedPerfume = perfumes.find(p => p.id === firstGateIn?.perfumeId);
    const supplier = suppliers.find(s => s.id === relatedPerfume?.supplierId);

    const perfumesInBatch = new Set<string>();
    gateInLogs.forEach(l => { if (l.importReference === selectedBatchName) perfumesInBatch.add(l.perfumeId) });
    gateOutLogs.forEach(l => { if (l.batchNumber === selectedBatchName) perfumesInBatch.add(l.perfumeId) });

    const rows = Array.from(perfumesInBatch).map(pid => {
        const p = perfumes.find(per => per.id === pid);
        const received = gateInLogs
            .filter(l => l.importReference === selectedBatchName && l.perfumeId === pid)
            .reduce((acc, l) => acc + l.netWeight, 0);
        
        const produced = gateOutLogs
            .filter(l => l.batchNumber === selectedBatchName && l.perfumeId === pid && l.usage === 'Production')
            .reduce((acc, l) => acc + l.netWeight, 0);
            
        const sold = gateOutLogs
            .filter(l => l.batchNumber === selectedBatchName && l.perfumeId === pid && l.usage === 'Sale')
            .reduce((acc, l) => acc + l.netWeight, 0);

        return {
            id: pid,
            code: p?.code || 'N/A',
            name: p?.name || 'Unknown Item',
            received,
            produced,
            sold,
            balance: received - produced - sold
        };
    });

    return {
        batchName: selectedBatchName,
        supplierName: supplier?.name || 'Unknown Supplier',
        gateInDate: firstGateIn?.date || 'N/A',
        rows
    };
  }, [selectedBatchName, activeTab, gateInLogs, gateOutLogs, perfumes, suppliers]);

  const yieldData = useMemo(() => {
    const inventoryIds = new Set(inventoryData.map(i => i.id));
    return perfumes
      .filter(p => inventoryIds.has(p.id))
      .map(p => {
        const outLogs = gateOutLogs.filter(l => l.perfumeId === p.id);
        const productionVolume = outLogs.filter(l => l.usage === 'Production').reduce((acc, l) => acc + l.netWeight, 0);
        const commerceVolume = outLogs.filter(l => l.usage === 'Sale').reduce((acc, l) => acc + l.netWeight, 0);
        const totalOutbound = productionVolume + commerceVolume;

        return {
          id: p.id,
          code: p.code,
          name: p.name,
          productionVolume,
          commerceVolume,
          totalOutbound,
          productionPct: totalOutbound ? (productionVolume / totalOutbound) * 100 : 0,
          commercePct: totalOutbound ? (commerceVolume / totalOutbound) * 100 : 0,
        };
      })
      .filter(d => d.totalOutbound > 0)
      .sort((a, b) => b.totalOutbound - a.totalOutbound);
  }, [perfumes, gateOutLogs, inventoryData]);

  const capitalIntelligence = useMemo(() => {
    const supplierStats = suppliers.map(s => {
        const supplierPerfumes = inventoryData.filter(i => i.supplierName === s.name);
        const skuCount = supplierPerfumes.length;
        const totalWeight = supplierPerfumes.reduce((acc, i) => acc + i.currentWeight, 0);
        const totalValueUSD = supplierPerfumes.reduce((acc, i) => acc + i.totalValueUSD, 0);
        const totalValuePKR = supplierPerfumes.reduce((acc, i) => acc + i.totalValuePKR, 0);
        return { name: s.name, skuCount, totalWeight, totalValueUSD, totalValuePKR };
    }).filter(s => s.skuCount > 0).sort((a,b) => b.totalValueUSD - a.totalValueUSD);

    const olfactiveStats = olfactiveNotes.map(note => {
        const matchingPerfumes = inventoryData.filter(i => i.olfactiveNotes && i.olfactiveNotes.includes(note));
        const totalValueUSD = matchingPerfumes.reduce((acc, i) => acc + i.totalValueUSD, 0);
        const totalValuePKR = matchingPerfumes.reduce((acc, i) => acc + i.totalValuePKR, 0);
        return { note, totalValueUSD, totalValuePKR };
    }).filter(n => n.totalValueUSD > 0).sort((a,b) => b.totalValueUSD - a.totalValueUSD);

    const agedBatches: any[] = [];
    inventoryData.forEach(p => {
        p.fullBreakdown.forEach(b => {
             const ageDays = Math.floor((new Date().getTime() - new Date(b.arrivalDate).getTime()) / (1000 * 60 * 60 * 24));
             if (ageDays >= 90 && b.weight > 0) {
                 const mLoc = locations.find(l => l.id === b.mainLocationId);
                 agedBatches.push({
                     perfumeCode: p.code,
                     perfumeName: p.name,
                     batch: b.batch,
                     location: mLoc?.name || 'Unknown',
                     ageDays,
                     weight: b.weight,
                     valueUSD: b.weight * (p.unitPriceUSD || 0)
                 });
             }
        });
    });
    agedBatches.sort((a,b) => b.valueUSD - a.valueUSD);

    return { supplierStats, olfactiveStats, agedBatches };
  }, [inventoryData, suppliers, olfactiveNotes, locations]);

  const stats = useMemo(() => {
      const totalWeight = inventoryData.reduce((acc, item) => acc + (item?.currentWeight || 0), 0);
      const totalValue = inventoryData.reduce((acc, item) => acc + (item?.totalValueUSD || 0), 0);
      const criticalCount = inventoryData.filter(item => item?.isCritical).length;
      const moveCount24h = historyData.filter(h => {
          const hours = (new Date().getTime() - new Date(h.date).getTime()) / (1000 * 60 * 60);
          return hours <= 24;
      }).length;

      return { totalWeight, totalValue, criticalCount, moveCount24h };
  }, [inventoryData, historyData]);

  const batchRows = useMemo(() => batchReportData?.rows ?? [], [batchReportData]);

  const invTotalPages = Math.max(1, Math.ceil(inventoryData.length / REPORT_TABLE_PAGE_SIZE));
  const yieldTotalPages = Math.max(1, Math.ceil(yieldData.length / REPORT_TABLE_PAGE_SIZE));
  const batchTotalPages = Math.max(1, Math.ceil(batchRows.length / REPORT_TABLE_PAGE_SIZE));
  const agedTotalPages = Math.max(1, Math.ceil(capitalIntelligence.agedBatches.length / REPORT_TABLE_PAGE_SIZE));

  useEffect(() => {
    setPageInventory(p => Math.min(p, invTotalPages));
  }, [invTotalPages]);

  useEffect(() => {
    setPageYield(p => Math.min(p, yieldTotalPages));
  }, [yieldTotalPages]);

  useEffect(() => {
    setPageBatch(p => Math.min(p, batchTotalPages));
  }, [batchTotalPages]);

  useEffect(() => {
    setPageAgedBatches(p => Math.min(p, agedTotalPages));
  }, [agedTotalPages]);

  useEffect(() => {
    setPageBatch(1);
  }, [selectedBatchName]);

  const paginatedInventory = useMemo(() => {
    const start = (pageInventory - 1) * REPORT_TABLE_PAGE_SIZE;
    return inventoryData.slice(start, start + REPORT_TABLE_PAGE_SIZE);
  }, [inventoryData, pageInventory]);

  const paginatedYield = useMemo(() => {
    const start = (pageYield - 1) * REPORT_TABLE_PAGE_SIZE;
    return yieldData.slice(start, start + REPORT_TABLE_PAGE_SIZE);
  }, [yieldData, pageYield]);

  const paginatedBatchRows = useMemo(() => {
    const start = (pageBatch - 1) * REPORT_TABLE_PAGE_SIZE;
    return batchRows.slice(start, start + REPORT_TABLE_PAGE_SIZE);
  }, [batchRows, pageBatch]);

  const paginatedAgedBatches = useMemo(() => {
    const start = (pageAgedBatches - 1) * REPORT_TABLE_PAGE_SIZE;
    return capitalIntelligence.agedBatches.slice(start, start + REPORT_TABLE_PAGE_SIZE);
  }, [capitalIntelligence.agedBatches, pageAgedBatches]);

  const invPageList = useMemo(() => buildReportPageList(pageInventory, invTotalPages), [pageInventory, invTotalPages]);
  const yieldPageList = useMemo(() => buildReportPageList(pageYield, yieldTotalPages), [pageYield, yieldTotalPages]);
  const batchPageList = useMemo(() => buildReportPageList(pageBatch, batchTotalPages), [pageBatch, batchTotalPages]);
  const agedPageList = useMemo(() => buildReportPageList(pageAgedBatches, agedTotalPages), [pageAgedBatches, agedTotalPages]);

  const triggerDownload = async (fileBlob: Blob, fileName: string) => {
    try {
      // 1. Prioritize native File System Access API (forces the exact filename via OS dialog)
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: fileName.endsWith('.pdf') ? 'PDF Report' : 'Excel Report',
            accept: {
              [fileName.endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']: [fileName.endsWith('.pdf') ? '.pdf' : '.xlsx']
            }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(fileBlob);
        await writable.close();
        return; // Download secured by OS
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return; // User cancelled saving
      console.warn('File System Access API failed, falling back...', err);
    }

    // 2. Fallback to bulletproof Data URI (bypasses browser Blob URL interception)
    const reader = new FileReader();
    reader.onloadend = () => {
      const link = document.createElement('a');
      link.href = reader.result as string; 
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => document.body.removeChild(link), 1000); // 1-second grace period for PWA handlers
    };
    reader.readAsDataURL(fileBlob);
  };

  const exportPDF = async () => {
    try {
      console.log('Exporting PDF...', { activeTab });
      const doc = new jsPDF();
      const isHistory = activeTab === 'transactions'; // Deprecated but leaving for typing
      const isBatch = activeTab === 'batch';
      const isYield = activeTab === 'yield';
      const isCapital = activeTab === 'capital';
      const title = isYield
        ? 'Operations Yield & Consumption Analytics'
        : isCapital
          ? 'Capital Intelligence & Sourcing'
          : isBatch 
            ? `Batch Intelligence: ${selectedBatchName}` 
            : 'Inventory Master Summary';
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59);
      doc.text('ScentVault', 14, 22);
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184);
      doc.text('ERP System | Supply Intelligence Report', 14, 28);
      
      doc.setFontSize(14);
      doc.setTextColor(71, 85, 105);
      doc.text(title, 14, 42);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 48);

      // Summary Box
      if (!isHistory && !isBatch) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, 55, 182, 25, 'F');
          doc.setFontSize(9);
          doc.setTextColor(100, 116, 139);
          doc.text('Total Perfume Weight:', 20, 65);
          doc.text('Total Portfolio Value:', 20, 72);
          doc.setTextColor(15, 23, 42);
          doc.setFont('helvetica', 'bold');
          doc.text(`${stats.totalWeight.toFixed(2)} KG`, 60, 65);
          doc.text(`$${stats.totalValue.toLocaleString()}`, 60, 72);
          doc.setFont('helvetica', 'normal');
      } else if (isBatch && batchReportData) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, 55, 182, 20, 'F');
          doc.setFontSize(9);
          doc.setTextColor(100, 116, 139);
          doc.text('Supplier Source:', 20, 68);
          doc.text('Inbound Date:', 110, 68);
          doc.setTextColor(15, 23, 42);
          doc.setFont('helvetica', 'bold');
          doc.text(batchReportData.supplierName, 50, 68);
          doc.text(batchReportData.gateInDate, 135, 68);
          doc.setFont('helvetica', 'normal');
      }

      let tableData: any[] = [];
      let head: any[] = [];

      if (isYield) {
        head = [['Perfume Code', 'Name', 'Production (Soap Unit)', 'Commerce (External Sales)', 'Total Outbound']];
        tableData = yieldData.map(y => [
          y.code, y.name, 
          `${y.productionVolume.toFixed(2)} kg (${y.productionPct.toFixed(1)}%)`,
          `${y.commerceVolume.toFixed(2)} kg (${y.commercePct.toFixed(1)}%)`, 
          `${y.totalOutbound.toFixed(2)} kg`
        ]);
      } else if (isCapital) {
        head = [['Perfume / Metric', 'Category', 'Volume / Details', 'Capital Value (USD/PKR)']];
        
        tableData.push(['--- SUPPLIER CAPITAL LOAD ---', '', '', '']);
        capitalIntelligence.supplierStats.forEach(s => tableData.push([s.name, 'Supplier', `${s.skuCount} SKUs | ${s.totalWeight.toFixed(2)} kg`, canViewPrices ? `$${s.totalValueUSD.toFixed(2)} / Rs. ${s.totalValuePKR.toLocaleString()}` : 'REDACTED']));
        
        tableData.push(['--- OLFACTIVE DISTRIBUTION ---', '', '', '']);
        capitalIntelligence.olfactiveStats.forEach(o => tableData.push([o.note, 'Olfactive Class', '-', canViewPrices ? `$${o.totalValueUSD.toFixed(2)} / Rs. ${o.totalValuePKR.toLocaleString()}` : 'REDACTED']));
        
        tableData.push(['--- AGED PERFUMES (>90 DAYS) ---', '', '', '']);
        capitalIntelligence.agedBatches.forEach(b => tableData.push([`${b.perfumeCode} - ${b.perfumeName}`, `Batch: ${b.batch}`, `Age: ${b.ageDays} Days | ${b.weight.toFixed(2)} kg`, canViewPrices ? `$${b.valueUSD.toFixed(2)}` : 'REDACTED']));
      } else if (isBatch) {
        head = [['Perfume Code', 'Perfume Name', 'Received', 'Production', 'Sales', 'Balance']];
        tableData = batchReportData?.rows.map(row => [
          row.code, row.name, row.received.toFixed(2), row.produced.toFixed(2), row.sold.toFixed(2), row.balance.toFixed(2)
        ]) || [];
      } else {
        head = [['Code', 'Name', 'Stock (KG)', 'Value (USD)', 'Status']];
        tableData = inventoryData.map(item => [
          item.code, item.name, item.currentWeight.toFixed(2), 
          canViewPrices ? `$${item.totalValueUSD.toFixed(2)}` : 'REDACTED', 
          item.isLowStock ? 'LOW' : 'OK'
        ]);
      }

      if (tableData.length === 0) {
        alert("No data to export for this view.");
        return;
      }

      autoTable(doc, {
        startY: (isHistory || isBatch) ? 80 : 85,
        head,
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { top: 30 }
      });

      const fileName = `scentvault_report_${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`;
      const pdfBlob = doc.output('blob');
      await triggerDownload(pdfBlob, fileName);
      console.log('PDF Export successful');
    } catch (error) {
      console.error('PDF Export failed:', error);
      alert('Failed to generate PDF report. Please check the console for details.');
    }
  };

  const exportExcel = async () => {
    try {
      console.log('Exporting Excel...', { activeTab });
      let data: any[] = [];
      let sheetName = "Report";
      let title = activeTab;

      if (activeTab === 'batch' && batchReportData) {
        title = `Batch_${batchReportData.batchName}`;
        sheetName = "Batch Intelligence";
        data = batchReportData.rows.map(r => ({
          'Perfume Code': r.code,
          'Perfume Name': r.name,
          'Total Received': r.received.toFixed(2),
          'Production': r.produced.toFixed(2),
          'Sales': r.sold.toFixed(2),
          'Balance': r.balance.toFixed(2)
        }));
      } else if (activeTab === 'yield') {
        title = 'Operations_Yield';
        sheetName = "Yield & Consumption";
        data = yieldData.map(y => ({
          'Perfume Code': y.code,
          'Perfume Name': y.name,
          'Production Volume (KG)': y.productionVolume.toFixed(2),
          'Production %': `${y.productionPct.toFixed(1)}%`,
          'Commerce Volume (KG)': y.commerceVolume.toFixed(2),
          'Commerce %': `${y.commercePct.toFixed(1)}%`,
          'Total Outbound (KG)': y.totalOutbound.toFixed(2)
        }));
      } else if (activeTab === 'capital') {
        title = 'Capital_Intelligence';
        sheetName = "Capital & Sourcing";
        
        // Exporting complex mixed data to Excel requires flattening or multiple sheets in a real enterprise app,
        // but for simplicity we will export Aged Assets as the primary Excel dataset for "Capital",
        // since that's the most actionable row-by-row data.
        data = capitalIntelligence.agedBatches.map(b => ({
          'Perfume Code': b.perfumeCode,
          'Perfume Name': b.perfumeName,
          'Batch': b.batch,
          'Location': b.location,
          'Age (Days)': b.ageDays,
          'Stagnant Weight (KG)': b.weight.toFixed(2),
          ...(canViewPrices ? { 'Tied Capital (USD)': b.valueUSD.toFixed(2) } : {})
        }));
        
        if (data.length === 0) {
            sheetName = "Supplier Load";
            data = capitalIntelligence.supplierStats.map(s => ({
              'Supplier': s.name,
              'Active SKUs': s.skuCount,
              'Total Load (KG)': s.totalWeight.toFixed(2),
              ...(canViewPrices ? { 'Valuation (USD)': s.totalValueUSD.toFixed(2), 'Valuation (PKR)': s.totalValuePKR.toFixed(2) } : {})
            }));
        }
      } else {
        title = 'Inventory_Summary';
        sheetName = "Inventory";
        data = inventoryData.map(r => ({
          'Code': r.code,
          'Name': r.name,
          'Supplier': r.supplierName,
          'Primary Batch': r.primaryBatch,
          'Total Weight (KG)': r.currentWeight.toFixed(2),
          'Status': r.isCritical ? 'CRITICAL' : r.isLowStock ? 'LOW' : 'OK',
          ...(canViewPrices ? {
            'Price (USD)': r.unitPriceUSD?.toFixed(2) || '0.00',
            'Valuation (USD)': r.totalValueUSD.toFixed(2)
          } : {})
        }));
      }

      if (data.length === 0) {
        alert("No data available to export for the current filters.");
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      
      const fileName = `ScentVault_${title}_${new Date().toISOString().split('T')[0]}.xlsx`;
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const excelBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      await triggerDownload(excelBlob, fileName);
      console.log('Excel Export successful');
    } catch (error) {
      console.error('Excel Export failed:', error);
      alert('Failed to generate Excel report. Please check the console for details.');
    }
  };

  const renderDrillDown = () => {
      const p = inventoryData.find(i => i.id === drillDownPerfumeId);
      if (!p) return null;

      const movementHistory = historyData.filter(h => h.perfumeId === p.id);

      return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="p-6 bg-slate-900 text-white rounded-t-3xl flex justify-between items-center border-b border-slate-800">
                  <div className="flex items-center gap-5">
                      <button 
                        onClick={() => setDrillDownPerfumeId(null)} 
                        className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl transition-all shadow-lg"
                      >
                          <ArrowLeft size={20} />
                      </button>
                      <div>
                          <div className="flex items-center gap-3">
                              <h3 className="text-2xl font-black">{p.name}</h3>
                              <span className="bg-indigo-500/20 text-indigo-400 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border border-indigo-500/30 dark:bg-indigo-900/50 dark:border-indigo-700">{p.code}</span>
                          </div>
                          <p className="text-xs text-slate-400 flex items-center gap-2 mt-1 font-medium">
                              <MapPin size={12} className="text-indigo-500" /> Managed Hub: {p.supplierName}
                          </p>
                      </div>
                  </div>
                  <div className="flex gap-4 items-center">
                      <div className="text-right">
                          <p className="text-3xl font-black text-white">{p.currentWeight.toFixed(2)} <span className="text-lg font-normal text-slate-500">kg</span></p>
                          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">Total Available</p>
                      </div>
                      <div className={`h-12 w-1 border-r border-slate-700 ml-4`}></div>
                      <div className="flex flex-col gap-1 ml-4">
                          {p.isLowStock && (
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${p.isCritical ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30' : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'}`}>
                                  {p.isCritical ? 'Critical Level' : 'Low Stock'}
                              </span>
                          )}
                          {!p.isLowStock && (
                              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                                  Healthy Stock
                              </span>
                          )}
                      </div>
                  </div>
              </div>
 
              <div className="bg-white dark:bg-slate-800 border-x border-b border-slate-200 dark:border-slate-700 rounded-b-3xl shadow-xl overflow-hidden min-h-[500px]">
                  <div className="flex border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-1">
                      <button 
                        onClick={() => setDrillDownTab('stock')}
                        className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all rounded-2xl ${drillDownTab === 'stock' ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                      >
                          <Package size={16} /> Batch Distribution
                      </button>
                      <button 
                        onClick={() => setDrillDownTab('history')}
                        className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all rounded-2xl ${drillDownTab === 'history' ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                      >
                          <History size={16} /> Movement History
                      </button>
                  </div>

                  <div className="p-8">
                      {drillDownTab === 'stock' ? (
                          <div className="overflow-hidden border border-slate-100 dark:border-slate-700 rounded-2xl">
                              <table className="w-full text-sm text-left">
                                  <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                                      <tr>
                                          <th className="px-8 py-5">Batch Ident</th>
                                          <th className="px-8 py-5">Storage Facility</th>
                                          <th className="px-8 py-5">Batch Age</th>
                                          <th className="px-8 py-5 text-right">Qty (KG)</th>
                                          {canViewPrices && <th className="px-8 py-5 text-right">Value Perfume</th>}
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-medium text-slate-700 dark:text-slate-300">
                                      {p.fullBreakdown.sort((a, b) => new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime()).map((pos, idx) => {
                                          const mLoc = locations.find(l => l.id === pos.mainLocationId);
                                          const sLoc = locations.find(l => l.id === pos.subLocationId);
                                          const ageDays = Math.floor((new Date().getTime() - new Date(pos.arrivalDate).getTime()) / (1000 * 60 * 60 * 24));
                                          
                                          return (
                                              <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900 transition-colors">
                                                  <td className="px-8 py-5">
                                                      <span className="font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2 py-1 rounded text-xs border dark:border-slate-700">{pos.batch}</span>
                                                  </td>
                                                  <td className="px-8 py-5">
                                                      <div className="flex items-center gap-2">
                                                          <MapPin size={14} className="text-slate-300" />
                                                          <span>{mLoc?.name || 'Unknown'}</span>
                                                          {sLoc && <span className="text-slate-400 text-xs font-normal">/ {sLoc.name}</span>}
                                                      </div>
                                                  </td>
                                                  <td className="px-8 py-5">
                                                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${ageDays > 90 ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400' : ageDays > 30 ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                                          {ageDays === 0 ? 'Fresh Today' : `${ageDays} Days Old`}
                                                      </span>
                                                  </td>
                                                  <td className="px-8 py-5 text-right font-black text-slate-900 dark:text-slate-100">{pos.weight.toFixed(2)}</td>
                                                  {canViewPrices && (
                                                      <td className="px-8 py-5 text-right text-slate-500 dark:text-slate-400 font-mono">
                                                          ${(pos.weight * (p.unitPriceUSD || 0)).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                                      </td>
                                                  )}
                                              </tr>
                                          )
                                      })}
                                  </tbody>
                              </table>
                          </div>
                      ) : (
                          <div className="space-y-4">
                              {movementHistory.map((log, idx) => (
                                  <div key={idx} className="flex items-center gap-6 p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-700 transition-all">
                                      <div className={`p-4 rounded-xl flex-shrink-0 ${log.type === 'IN' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400' : log.type === 'OUT' ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400' : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'}`}>
                                          {log.type === 'IN' ? <TrendingUp size={20} /> : log.type === 'OUT' ? <TrendingDown size={20} /> : <ArrowRightLeft size={20} />}
                                      </div>
                                      <div className="flex-1">
                                          <div className="flex items-center justify-between mb-1">
                                              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{log.type === 'IN' ? 'Inbound Logistic' : log.type === 'OUT' ? 'Outbound Dispatch' : 'Internal Transfer'}</p>
                                              <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                                  <Clock size={10} /> {log.date}
                                              </span>
                                          </div>
                                          <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400">
                                              <p><span className="font-bold text-slate-400 dark:text-slate-500">Batch:</span> {log.importReference || log.batchNumber}</p>
                                              <p><span className="font-bold text-slate-400 dark:text-slate-500">Ref:</span> {log.supplierInvoice || log.usage || 'Internal'}</p>
                                          </div>
                                      </div>
                                      <div className="text-right">
                                          <p className={`text-lg font-black ${log.type === 'IN' ? 'text-emerald-600' : log.type === 'OUT' ? 'text-rose-600' : 'text-indigo-600'}`}>
                                              {log.type === 'IN' ? '+' : log.type === 'OUT' ? '-' : ''}{log.netWeight.toFixed(2)} kg
                                          </p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      );
  };

  const renderSupplierDrillDown = () => {
       if (!drillDownSupplier) return null;
       
       const supplierItems = inventoryData.filter(i => i.supplierName === drillDownSupplier);
       const breakdownRows: any[] = [];
       
       supplierItems.forEach(p => {
           p.fullBreakdown.forEach(b => {
                const ageDays = Math.floor((new Date().getTime() - new Date(b.arrivalDate).getTime()) / (1000 * 60 * 60 * 24));
                if (b.weight > 0) {
                    breakdownRows.push({
                        code: p.code,
                        name: p.name,
                        batch: b.batch,
                        weight: b.weight,
                        valueUSD: b.weight * (p.unitPriceUSD || 0),
                        valuePKR: b.weight * (p.unitPricePKR || 0),
                        ageDays: ageDays
                    });
                }
           });
       });
       
       breakdownRows.sort((a,b) => b.ageDays - a.ageDays);

       return (
           <div className="animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="p-6 bg-slate-900 text-white rounded-t-3xl flex justify-between items-center border-b border-slate-800">
                   <div className="flex items-center gap-5">
                       <button 
                         onClick={() => setDrillDownSupplier(null)} 
                         className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl transition-all shadow-lg"
                       >
                           <ArrowLeft size={20} />
                       </button>
                       <div>
                           <div className="flex items-center gap-3">
                               <h3 className="text-2xl font-black">{drillDownSupplier}</h3>
                               <span className="bg-indigo-500/20 text-indigo-400 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border border-indigo-500/30 dark:bg-indigo-900/50 dark:border-indigo-700">Procurement Partner</span>
                           </div>
                           <p className="text-xs text-slate-400 flex items-center gap-2 mt-1 font-medium">
                               <Package size={12} className="text-indigo-500" /> Complete Consignment Traceability
                           </p>
                       </div>
                   </div>
               </div>
               
               <div className="bg-white dark:bg-slate-800 border-x border-b border-slate-200 dark:border-slate-700 rounded-b-3xl shadow-xl overflow-hidden min-h-[500px] p-8">
                   <div className="overflow-hidden border border-slate-100 dark:border-slate-700 rounded-2xl">
                       <table className="w-full text-sm text-left">
                           <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                               <tr>
                                   <th className="px-8 py-5">Perfume Identity</th>
                                   <th className="px-8 py-5">Batch Reference</th>
                                   <th className="px-8 py-5">Consignment Age</th>
                                   <th className="px-8 py-5 text-right">Qty (KG)</th>
                                   {canViewPrices && <th className="px-8 py-5 text-right">Value (USD)</th>}
                                   {canViewPrices && <th className="px-8 py-5 text-right">Value (PKR)</th>}
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-medium text-slate-700 dark:text-slate-300">
                               {breakdownRows.length > 0 ? breakdownRows.map((row, idx) => (
                                   <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900 transition-colors">
                                       <td className="px-8 py-5">
                                           <div className="font-black text-slate-900 dark:text-slate-100 uppercase">{row.name}</div>
                                           <div className="text-[10px] font-mono text-indigo-500 font-bold">{row.code}</div>
                                       </td>
                                       <td className="px-8 py-5">
                                           <span className="font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2.5 py-1 rounded-lg text-xs border dark:border-slate-700 font-bold">{row.batch}</span>
                                       </td>
                                       <td className="px-8 py-5">
                                           <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${row.ageDays > 90 ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400' : row.ageDays > 30 ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                               {row.ageDays === 0 ? 'Fresh Today' : `${row.ageDays} Days Old`}
                                           </span>
                                       </td>
                                       <td className="px-8 py-5 text-right font-black text-slate-900 dark:text-slate-100 text-lg">{row.weight.toFixed(2)}</td>
                                       {canViewPrices && <td className="px-8 py-5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-500">${row.valueUSD.toFixed(2)}</td>}
                                       {canViewPrices && <td className="px-8 py-5 text-right font-mono font-bold text-slate-500">Rs. {row.valuePKR.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>}
                                   </tr>
                               )) : (
                                   <tr>
                                       <td colSpan={6} className="px-8 py-24 text-center text-slate-400 italic font-bold">No active stock remaining for this supplier.</td>
                                   </tr>
                               )}
                           </tbody>
                       </table>
                   </div>
               </div>
           </div>
       );
  };

  return (
    <>
      <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full min-w-0 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Supply Intelligence</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Audit-ready inventory monitoring and dispatch tracking.</p>
        </div>
        <div className="flex gap-3">
            <Button variant="outline" onClick={exportPDF} className="flex items-center gap-2 bg-white dark:bg-slate-800 h-12 px-6 rounded-2xl shadow-sm border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition-all font-bold text-slate-700 dark:text-slate-300">
                <FileDown size={18} /> Export PDF
            </Button>
            <Button onClick={exportExcel} className="flex items-center gap-2 h-12 px-6 rounded-2xl shadow-lg shadow-indigo-500/20 font-bold">
                <FileSpreadsheet size={18} /> Excel Report
            </Button>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      {!drillDownPerfumeId && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-top-4 duration-500 delay-100">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-soft border border-slate-200 dark:border-slate-700 flex items-center gap-5 transition-colors">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                    <Box size={24} />
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Net Stock Load</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalWeight.toLocaleString(undefined, {maximumFractionDigits: 1})} <span className="text-xs font-normal text-slate-500">kg</span></p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-soft border border-slate-200 dark:border-slate-700 flex items-center gap-5 transition-colors">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                    <DollarSign size={24} />
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Financial Valuation</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">${stats.totalValue.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-soft border border-slate-200 dark:border-slate-700 flex items-center gap-5 transition-colors">
                <div className="p-4 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-2xl">
                    <AlertCircle size={24} />
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Critical Shortages</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.criticalCount}</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-soft border border-slate-200 dark:border-slate-700 flex items-center gap-5 transition-colors">
                <div className="p-4 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl">
                    <Zap size={24} />
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">24h Velocity</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.moveCount24h} <span className="text-xs font-normal text-slate-500">ops</span></p>
                </div>
            </div>
          </div>
      )}

      {drillDownPerfumeId ? (
          renderDrillDown()
      ) : drillDownSupplier ? (
          renderSupplierDrillDown()
      ) : (
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-soft border border-slate-200 dark:border-slate-700 min-w-0 overflow-x-auto transition-colors">
            <div className="flex border-b border-slate-100 dark:border-slate-700 p-2 bg-slate-50/50 dark:bg-slate-900/50">
                {(['inventory', 'yield', 'capital', 'batch'] as ReportType[]).map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-4 text-sm font-black transition-all rounded-3xl ${activeTab === tab ? 'bg-white dark:bg-slate-700 shadow-md text-indigo-700 dark:text-indigo-400 ring-1 ring-slate-200 dark:ring-slate-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                    >
                        {tab === 'inventory' ? 'Master Summary' : tab === 'yield' ? 'Operations Yield' : tab === 'capital' ? 'Capital Intelligence' : 'Batch Intelligence'}
                    </button>
                ))}
            </div>

            <div className="p-8">
                <div className="flex flex-col md:flex-row gap-6 items-center justify-between mb-8">
                    {activeTab === 'batch' ? (
                        <div className="w-full flex flex-col gap-8 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="max-w-md">
                                <SearchableSelect 
                                    label="Select Logistics Batch"
                                    options={uniqueBatches}
                                    value={selectedBatchName}
                                    onChange={setSelectedBatchName}
                                    placeholder="Search batch references..."
                                />
                            </div>
                            
                            {batchReportData && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Tag size={14} className="text-indigo-500" />
                                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Selected Batch</p>
                                        </div>
                                        <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">{batchReportData.batchName}</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-3 mb-2">
                                            <MapPin size={14} className="text-slate-400" />
                                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Supplier Source</p>
                                        </div>
                                        <p className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{batchReportData.supplierName}</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Clock size={14} className="text-slate-400" />
                                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Inbound Date</p>
                                        </div>
                                        <p className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight">{batchReportData.gateInDate}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="relative flex-1 w-full">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input 
                                    type="text" 
                                    placeholder="Filter by SKU, name, or batch signature..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-3xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 transition-all font-medium dark:text-slate-200"
                                />
                            </div>
                            <button
                                onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                                className={`flex items-center gap-3 px-8 h-14 rounded-3xl border font-bold transition-all ${isFilterPanelOpen || hasActiveFilters ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm'}`}
                            >
                                <Filter size={18} />
                                Refine
                                {isFilterPanelOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                        </>
                    )}
                </div>

                {isFilterPanelOpen && (
                    <div className="p-8 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-700 space-y-8 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Network Hub</label>
                                <select 
                                    className="w-full px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-4 focus:ring-indigo-500/10"
                                    value={filterLocation}
                                    onChange={(e) => setFilterLocation(e.target.value)}
                                >
                                    <option value="">Entire Network</option>
                                    {mainLocations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Partner Supplier</label>
                                <select 
                                    className="w-full px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-4 focus:ring-indigo-500/10"
                                    value={filterSupplier}
                                    onChange={(e) => setFilterSupplier(e.target.value)}
                                >
                                    <option value="">All Partners</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Transaction Type</label>
                                <select 
                                    className="w-full px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-4 focus:ring-indigo-500/10"
                                    value={filterTxType}
                                    onChange={(e) => setFilterTxType(e.target.value as any)}
                                >
                                    <option value="ALL">All Categories</option>
                                    <option value="IN">Gate Inbound</option>
                                    <option value="OUT">Gate Outbound</option>
                                    <option value="TRANSFER">Internal Move</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Olfactive Focus</label>
                                <select 
                                    className="w-full px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-4 focus:ring-indigo-500/10"
                                    value={filterOlfactive}
                                    onChange={(e) => setFilterOlfactive(e.target.value)}
                                >
                                    <option value="">Any Profile</option>
                                    {olfactiveNotes.map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Period Start</label>
                                <input 
                                    type="date"
                                    className="w-full px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-4 focus:ring-indigo-500/10"
                                    value={filterStartDate}
                                    onChange={e => setFilterStartDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Period End</label>
                                <input 
                                    type="date"
                                    className="w-full px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-4 focus:ring-indigo-500/10"
                                    value={filterEndDate}
                                    onChange={e => setFilterEndDate(e.target.value)}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <button onClick={clearFilters} className="w-full h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-800 transition-all flex items-center justify-center gap-2">
                                    <X size={14} /> Reset Intelligence Parameters
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'inventory' && filterLocation.trim() && (
                  <div className="mb-4 px-1 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                    <MapPin size={16} className="text-indigo-500 shrink-0" />
                    <span>
                      Showing on-hand only at{' '}
                      <span className="text-indigo-600 dark:text-indigo-400">
                        {mainLocations.find(l => l.id === filterLocation.trim())?.name || 'selected hub'}
                      </span>
                      . Perfumes with no stock at this hub are omitted.
                    </span>
                  </div>
                )}

                <div className="overflow-x-auto border border-slate-100 dark:border-slate-700 rounded-3xl min-w-0 -mx-px">
                    <table className="w-full min-w-[56rem] text-left text-sm">
                        {activeTab === 'batch' ? (
                            <>
                                <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="px-8 py-6">Perfume Code</th>
                                        <th className="px-8 py-6">Perfume Name</th>
                                        <th className="px-8 py-6 text-right">Total Received</th>
                                        <th className="px-8 py-6 text-right">Production</th>
                                        <th className="px-8 py-6 text-right">Sales</th>
                                        <th className="px-8 py-6 text-right">Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50 font-medium">
                                    {paginatedBatchRows.map((row) => (
                                        <tr key={row.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all">
                                            <td className="px-8 py-6 text-indigo-500 font-mono text-xs font-bold uppercase tracking-widest">{row.code}</td>
                                            <td className="px-8 py-6 font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter">{row.name}</td>
                                            <td className="px-8 py-6 text-right text-slate-900 dark:text-slate-200 font-bold">{row.received.toFixed(2)} kg</td>
                                            <td className="px-8 py-6 text-right text-amber-600 dark:text-amber-500 font-bold">{row.produced.toFixed(2)} kg</td>
                                            <td className="px-8 py-6 text-right text-rose-600 dark:text-rose-500 font-bold">{row.sold.toFixed(2)} kg</td>
                                            <td className="px-8 py-6 text-right">
                                                <span className={`font-black text-lg ${row.balance < 0.01 ? 'text-slate-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                    {row.balance.toFixed(2)}
                                                </span>
                                                <span className="text-slate-400 ml-1 text-xs">kg</span>
                                            </td>
                                        </tr>
                                    ))}
                                    {selectedBatchName && batchReportData?.rows.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-8 py-32 text-center text-slate-300 dark:text-slate-600 italic font-medium">No perfume movements found for this batch.</td>
                                        </tr>
                                    )}
                                    {!selectedBatchName && (
                                        <tr>
                                            <td colSpan={6} className="px-8 py-32 text-center text-slate-300 dark:text-slate-600 italic font-medium">Select a batch above to generate analysis.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </>
                        ) : activeTab === 'yield' ? (
                            <>
                                <thead className="bg-slate-50 dark:bg-slate-900 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="px-8 py-6">Code</th>
                                        <th className="px-8 py-6">Perfume Name</th>
                                        <th className="px-8 py-6 text-right">Production (Soap Unit)</th>
                                        <th className="px-8 py-6 text-right">Commerce (Sales)</th>
                                        <th className="px-8 py-6 text-right">Total Yield</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50 font-medium">
                                    {paginatedYield.map((y) => (
                                        <tr key={y.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all">
                                            <td className="px-8 py-6 text-indigo-500 font-mono text-xs font-bold uppercase tracking-widest">{y.code}</td>
                                            <td className="px-8 py-6 font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter">{y.name}</td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="font-bold text-amber-600 dark:text-amber-500">{y.productionVolume.toFixed(2)} kg</div>
                                                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1">{y.productionPct.toFixed(1)}%</div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="font-bold text-emerald-600 dark:text-emerald-500">{y.commerceVolume.toFixed(2)} kg</div>
                                                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1">{y.commercePct.toFixed(1)}%</div>
                                            </td>
                                            <td className="px-8 py-6 text-right font-black text-lg text-slate-900 dark:text-slate-100">
                                                {y.totalOutbound.toFixed(2)}
                                                <span className="text-slate-400 dark:text-slate-600 ml-1 text-xs font-normal">kg</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </>
                        ) : activeTab === 'capital' ? (
                            <tbody>
                                <tr>
                                    <td className="p-0">
                                        <div className="p-8 space-y-12 bg-slate-50/30 dark:bg-slate-900/20">
                                            
                                            <div className="space-y-6">
                                                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
                                                    <Box size={20} className="text-indigo-500" /> Supplier Capital Load
                                                </h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                    {capitalIntelligence.supplierStats.map(s => (
                                                        <div 
                                                            key={s.name} 
                                                            onClick={() => setDrillDownSupplier(s.name)}
                                                            className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-5 hover:border-indigo-500 hover:shadow-md cursor-pointer transition-all"
                                                        >
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">{s.name}</span>
                                                                <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-xl text-xs font-bold font-mono">{s.skuCount} SKUs</span>
                                                            </div>
                                                            <div className="flex justify-between items-end border-t border-slate-100 dark:border-slate-700 pt-4">
                                                                <div>
                                                                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Load Weight</p>
                                                                    <p className="font-black text-slate-700 dark:text-slate-300">{s.totalWeight.toFixed(2)} <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">kg</span></p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Valuation</p>
                                                                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">${s.totalValueUSD.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                                                                    <p className="text-xs font-mono font-bold text-slate-400">Rs. {s.totalValuePKR.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
                                                    <DollarSign size={20} className="text-emerald-500" /> Olfactive Distribution
                                                </h3>
                                                <div className="flex flex-wrap gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                                                    {capitalIntelligence.olfactiveStats.map(n => (
                                                            <div 
                                                                key={n.note} 
                                                                onClick={() => { setSelectedNote(n.note); setIsDrawerOpen(true); }}
                                                                className="px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between gap-8 shadow-sm hover:border-emerald-500 cursor-pointer transition-all hover:shadow-md"
                                                            >
                                                                <span className="font-bold text-slate-700 dark:text-slate-300">{n.note}</span>
                                                                <div className="text-right">
                                                                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold block leading-none">${n.totalValueUSD.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                                                                    <span className="font-mono text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider block mt-1">Rs. {n.totalValuePKR.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                                                                </div>
                                                            </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                <h3 className="text-xl font-black text-rose-600 dark:text-rose-400 uppercase tracking-tight flex items-center gap-3">
                                                    <AlertCircle size={20} /> Aged Capital Lockup (&gt;90 Days)
                                                </h3>
                                                {capitalIntelligence.agedBatches.length > 0 ? (
                                                    <div className="overflow-hidden border border-rose-100 dark:border-rose-900/30 rounded-3xl bg-white dark:bg-slate-800 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                                                        <table className="w-full text-sm text-left">
                                                            <thead className="bg-rose-50 dark:bg-rose-950/20 text-[10px] font-black text-rose-400 dark:text-rose-500 uppercase tracking-widest border-b border-rose-100 dark:border-rose-900/30">
                                                                <tr>
                                                                    <th className="px-6 py-5">Perfume</th>
                                                                    <th className="px-6 py-5">Batch Identity</th>
                                                                    <th className="px-6 py-5">Storage Pool</th>
                                                                    <th className="px-6 py-5 text-center">Batch Age</th>
                                                                    <th className="px-6 py-5 text-right">Locked Weight</th>
                                                                    {canViewPrices && <th className="px-6 py-5 text-right">Stagnant Capital</th>}
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-rose-50 dark:divide-rose-900/20">
                                                                {paginatedAgedBatches.map((b, i) => (
                                                                    <tr key={`${b.perfumeCode}-${b.batch}-${b.location}-${(pageAgedBatches - 1) * REPORT_TABLE_PAGE_SIZE + i}`} className="hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-colors">
                                                                        <td className="px-6 py-5">
                                                                            <div className="font-black text-slate-900 dark:text-slate-100 uppercase">{b.perfumeName}</div>
                                                                            <div className="text-[10px] font-mono text-rose-400">{b.perfumeCode}</div>
                                                                        </td>
                                                                        <td className="px-6 py-5 font-mono font-bold text-slate-600 dark:text-slate-400 text-xs">{b.batch}</td>
                                                                        <td className="px-6 py-5 text-slate-500 dark:text-slate-400 font-bold text-xs">{b.location}</td>
                                                                        <td className="px-6 py-5 text-center">
                                                                            <span className="px-3 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-400 font-bold font-mono text-[10px]">
                                                                                {b.ageDays} DAYS
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-6 py-5 text-right font-black text-slate-800 dark:text-slate-200">{b.weight.toFixed(2)} kg</td>
                                                                        {canViewPrices && <td className="px-6 py-5 text-right font-mono text-rose-600 dark:text-rose-400 font-bold">${b.valueUSD.toFixed(2)}</td>}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                        <ReportTablePagination
                                                          page={pageAgedBatches}
                                                          setPage={setPageAgedBatches}
                                                          totalPages={agedTotalPages}
                                                          totalCount={capitalIntelligence.agedBatches.length}
                                                          pageList={agedPageList}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="p-12 text-center flex flex-col items-center justify-center gap-4 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                                                        <div className="h-16 w-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center text-emerald-500">
                                                            <Zap size={24} />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-slate-900 dark:text-white font-black text-lg">No Stagnant Lockups</h4>
                                                            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Warehouse rotation is highly efficient. All stock is moving steadily.</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        ) : (
                            <>
                                <thead className="bg-slate-50 dark:bg-slate-900 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="px-4 lg:px-6 py-6">Supplier</th>
                                        <th className="px-4 lg:px-6 py-6">Perfume Code</th>
                                        <th className="px-4 lg:px-6 py-6">Perfume Name</th>
                                        <th className="px-4 lg:px-6 py-6">Batch</th>
                                        <th className="px-4 lg:px-6 text-right">Net-on-Hand</th>
                                        <th className="px-4 lg:px-6 text-center">Status</th>
                                        <th className="px-4 lg:px-6 text-right whitespace-nowrap"><span className="sr-only">Action</span></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50 font-medium">
                                    {paginatedInventory.map((item) => (
                                        <tr 
                                        key={item.id} 
                                        className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all cursor-pointer group"
                                        onClick={() => setDrillDownPerfumeId(item.id)}
                                        >
                                            <td className="px-4 lg:px-6 py-6">
                                                <div className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight text-xs">{item.supplierName}</div>
                                            </td>
                                            <td className="px-4 lg:px-6 py-6 text-xs font-mono font-bold text-indigo-500 uppercase tracking-widest whitespace-nowrap">
                                                {item.code}
                                            </td>
                                            <td className="px-4 lg:px-6 py-6 min-w-[8rem]">
                                                <div className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter">{item.name}</div>
                                            </td>
                                            <td className="px-4 lg:px-6 py-6">
                                                <div className="flex flex-wrap gap-2 max-w-[200px]">
                                                    {item.activeBatches.split(', ').slice(0, 2).map((b, idx) => (
                                                        <span key={idx} className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 px-2 py-1 rounded text-[10px] font-mono font-bold shadow-sm">{b}</span>
                                                    ))}
                                                    {item.activeBatches.split(', ').length > 2 && <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">+{item.activeBatches.split(', ').length - 2}</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 lg:px-6 py-6 text-right whitespace-nowrap tabular-nums">
                                                <span className={`font-black text-lg ${item.isLowStock ? 'text-rose-600 dark:text-rose-500' : 'text-slate-900 dark:text-slate-200'}`}>{item.currentWeight.toFixed(2)}</span>
                                                <span className="text-slate-400 dark:text-slate-500 ml-1 text-xs">kg</span>
                                            </td>
                                            <td className="px-4 lg:px-6 py-6 text-center whitespace-nowrap">
                                                <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                                                    item.isCritical ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400' :
                                                    item.isLowStock ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400' :
                                                    'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                                                }`}>
                                                    {item.isCritical ? 'Critical' : item.isLowStock ? 'Low' : 'Secure'}
                                                </span>
                                            </td>
                                            <td className="px-4 lg:px-6 py-6 text-right whitespace-nowrap w-px">
                                                <button
                                                  type="button"
                                                  aria-label={`Details for ${item.name}`}
                                                  onClick={(e) => e.stopPropagation()}
                                                  className="p-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl text-slate-300 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:border-indigo-500 transition-all shadow-sm"
                                                >
                                                    <Info size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </>
                        )}
                        {(activeTab === 'yield' ? yieldData : inventoryData).length === 0 && activeTab !== 'capital' && activeTab !== 'batch' && (
                            <tbody>
                                <tr>
                                    <td colSpan={activeTab === 'yield' ? 5 : 7} className="px-8 py-32 text-center text-slate-300 dark:text-slate-600 italic font-medium">No records match your criteria.</td>
                                </tr>
                            </tbody>
                        )}
                    </table>
                    {activeTab === 'inventory' && (
                      <ReportTablePagination
                        page={pageInventory}
                        setPage={setPageInventory}
                        totalPages={invTotalPages}
                        totalCount={inventoryData.length}
                        pageList={invPageList}
                      />
                    )}
                    {activeTab === 'yield' && (
                      <ReportTablePagination
                        page={pageYield}
                        setPage={setPageYield}
                        totalPages={yieldTotalPages}
                        totalCount={yieldData.length}
                        pageList={yieldPageList}
                      />
                    )}
                    {activeTab === 'batch' && selectedBatchName && batchRows.length > 0 && (
                      <ReportTablePagination
                        page={pageBatch}
                        setPage={setPageBatch}
                        totalPages={batchTotalPages}
                        totalCount={batchRows.length}
                        pageList={batchPageList}
                      />
                    )}
                </div>
            </div>
          </div>
      )}
    </div>

      {/* Perfume Archive Drawer from Scent Library */}
      <div 
        className={`fixed inset-0 z-[100] transition-opacity duration-500 ease-in-out ${isDrawerOpen ? 'bg-slate-950/60 backdrop-blur-sm' : 'bg-transparent pointer-events-none'}`} 
        onClick={() => setIsDrawerOpen(false)}
      />
      <div className={`fixed inset-y-0 right-0 w-full md:w-[600px] bg-slate-900 shadow-[0_0_80px_rgba(0,0,0,0.8)] z-[100] transform transition-transform duration-700 cubic-bezier(0.4, 0, 0.2, 1) border-l border-slate-800 ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="h-full flex flex-col">
            <div className="p-10 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div>
                <h3 className="text-3xl font-black text-white tracking-tight uppercase">Perfume Archive</h3>
                <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2 leading-none">Associations for "{selectedNote}"</p>
              </div>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="p-5 bg-slate-800 hover:bg-slate-700 hover:text-rose-400 rounded-[2rem] text-slate-400 transition-all"
              >
                <X size={28} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
              {perfumes.filter(p => (p.olfactiveNotes || []).includes(selectedNote || '')).map(p => {
                const stock = getPerfumeStockBreakdown(p.id).reduce((acc, b) => acc + b.weight, 0);
                return (
                    <div key={p.id} className="bg-slate-800/40 rounded-[2.5rem] p-8 border border-slate-700/30 group hover:border-indigo-500/40 transition-all cursor-default">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h4 className="font-black text-white text-2xl uppercase tracking-tighter group-hover:text-indigo-400 transition-colors">{p.name}</h4>
                                <p className="text-[10px] font-black text-slate-500 font-mono mt-1 uppercase tracking-widest">{p.code}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none mb-2">Current Load</p>
                                <p className="text-3xl font-black text-indigo-400 tracking-tighter">{stock.toFixed(1)} <span className="text-xs font-normal text-slate-500">kg</span></p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6 pt-8 border-t border-slate-700/40">
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 leading-none">Supplier Hub</p>
                                <p className="text-sm font-bold text-slate-300">{suppliers.find(s=>s.id === p.supplierId)?.name || 'Unknown'}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 leading-none">Reference Price</p>
                                <p className="text-sm font-black text-emerald-500 uppercase tracking-widest">Rs. {p.pricePKR?.toLocaleString() || '0'}</p>
                            </div>
                        </div>
                    </div>
                );
              })}
              {perfumes.filter(p => (p.olfactiveNotes || []).includes(selectedNote || '')).length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center py-20">
                      <Tag size={64} className="text-slate-800 mb-6" />
                      <p className="text-slate-500 font-bold italic">No items associated with this note found.</p>
                  </div>
              )}
            </div>
          </div>
      </div>
    </>
  );
};