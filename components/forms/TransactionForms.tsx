import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { GateInLog, GateOutLog, StockTransferLog, GateOutUsage } from '../../types';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Pencil, Trash2, X, PlusCircle, History, ArrowRight, MapPin, Package, ArrowRightLeft, AlertTriangle, Zap, CheckCircle2, ChevronRight, ChevronLeft, Layers } from 'lucide-react';
import { v4 as generateId } from 'uuid';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { StepIndicator, PerfumeTag, StockImpactGauge } from '../ui/TransactionElements';
import { SearchableSelect } from '../ui/SearchableSelect';

// --- SHARED HOOK FOR CYCLICAL LOGIC ---
const useCyclicalWeight = (packingTypeId: string, packingTypes: any[]) => {
  const [qty, setQty] = useState<string>('');
  const [weight, setWeight] = useState<string>('');

  const packingType = packingTypes.find(pt => pt.id === packingTypeId);
  const unitQty = packingType ? Number(packingType.qtyPerPacking) : 0;

  const handleQtyChange = useCallback((val: string) => {
    setQty(val);
    const numVal = Number(val);
    if (unitQty && !isNaN(numVal) && val !== '') {
      setWeight((numVal * unitQty).toFixed(2));
    } else if (val === '') {
      setWeight('');
    }
  }, [unitQty]);

  const handleWeightChange = useCallback((val: string) => {
    setWeight(val);
    const numVal = Number(val);
    if (unitQty && !isNaN(numVal) && val !== '') {
      setQty((numVal / unitQty).toFixed(2));
    } else if (val === '') {
      setQty('');
    }
  }, [unitQty]);

  return { qty, weight, handleQtyChange, handleWeightChange, setQty, setWeight };
};

// --- GATE IN ---
export const GateInForm = () => {
  const { 
    perfumes, suppliers, packingTypes, 
    getMainLocations, getSubLocations, 
    addGateInLog, updateGateInLog, deleteGateInLog, 
    gateInLogs, hasPermission, locations
  } = useInventory();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isFastLog, setIsFastLog] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPerfumeId, setSelectedPerfumeId] = useState('');
  const [importRef, setImportRef] = useState('');
  const [selectedPackingTypeId, setSelectedPackingTypeId] = useState('');
  const [mainLocId, setMainLocId] = useState('');
  const [subLocId, setSubLocId] = useState('');
  const [invoice, setInvoice] = useState('');
  const [remarks, setRemarks] = useState('');
  const [priceUSD, setPriceUSD] = useState<string>('');
  const [pricePKR, setPricePKR] = useState<string>('');

  const { qty, weight, handleQtyChange, handleWeightChange, setQty, setWeight } = useCyclicalWeight(selectedPackingTypeId, packingTypes);

  const selectedPerfume = perfumes.find(p => p.id === selectedPerfumeId);
  const subLocations = useMemo(() => mainLocId ? getSubLocations(mainLocId) : [], [mainLocId, getSubLocations]);
  const canViewPrices = hasPermission('view_prices');

  const gateInPerfumeOptions = useMemo(
    () =>
      perfumes.map((p) => {
        const supplierLabel = suppliers.find((s) => s.id === p.supplierId)?.name || 'Unknown';
        return { value: p.id, label: `${p.code} - ${p.name} (${supplierLabel})` };
      }),
    [perfumes, suppliers],
  );

  useEffect(() => {
    if (selectedPerfume && !editingId) {
        setPriceUSD(selectedPerfume.priceUSD?.toString() || '');
        setPricePKR(selectedPerfume.pricePKR?.toString() || '');
    }
  }, [selectedPerfume, editingId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const logData: GateInLog = {
      id: editingId || generateId(),
      date, perfumeId: selectedPerfumeId, importReference: importRef,
      packingTypeId: selectedPackingTypeId, packingQty: Number(qty), netWeight: Number(weight),
      mainLocationId: mainLocId, subLocationId: subLocId || undefined, supplierInvoice: invoice, remarks,
      priceUSD: priceUSD ? Number(priceUSD) : undefined,
      pricePKR: pricePKR ? Number(pricePKR) : undefined
    };

    if (editingId) {
        updateGateInLog(editingId, logData);
        alert('Entry Updated');
        handleCancel();
    } else {
        addGateInLog(logData);
        alert('Gate In Logged');
        setQty(''); setWeight(''); setImportRef(''); setInvoice('');
        setCurrentStep(1); // Reset to step 1 as requested
    }
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 3));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const steps = [
    { label: 'Perfume', icon: <Package size={18} /> },
    { label: 'Logistics', icon: <Layers size={18} /> },
    { label: 'Payload', icon: <Zap size={18} /> }
  ];

  const handleEdit = (log: GateInLog) => {
      setEditingId(log.id);
      setDate(log.date);
      setSelectedPerfumeId(log.perfumeId);
      setImportRef(log.importReference);
      setSelectedPackingTypeId(log.packingTypeId);
      setQty(log.packingQty.toString());
      setWeight(log.netWeight.toString());
      setMainLocId(log.mainLocationId);
      setSubLocId(log.subLocationId || '');
      setInvoice(log.supplierInvoice);
      setRemarks(log.remarks);
      setPriceUSD(log.priceUSD?.toString() || '');
      setPricePKR(log.pricePKR?.toString() || '');
  };

  const handleCancel = () => {
      setEditingId(null);
      setSelectedPerfumeId('');
      setImportRef('');
      setSelectedPackingTypeId('');
      setQty('');
      setWeight('');
      setMainLocId('');
      setSubLocId('');
      setInvoice('');
      setRemarks('');
      setPriceUSD('');
      setPricePKR('');
  };

  return (
    <>
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-1">
            <div className="bg-white dark:bg-slate-900/50 p-7 rounded-[2rem] shadow-soft border border-slate-200 dark:border-slate-800 sticky top-24 backdrop-blur-xl">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${editingId ? 'bg-primary-50 text-primary-500' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500'}`}>
                                {editingId ? <Pencil size={20} /> : <PlusCircle size={20} />}
                            </div>
                            {editingId ? 'Modify Receipt' : 'Inbound Receipt'}
                        </h3>
                        <p className="text-[10px] h-4 font-black uppercase tracking-[0.2em] text-slate-400 mt-1 pl-1">
                            {isFastLog ? 'Fast Log Active' : `Guided Entry - Step ${currentStep} of 3`}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                         <button 
                            onClick={() => setIsFastLog(!isFastLog)}
                            className={`p-2 rounded-xl transition-all border ${isFastLog ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'}`}
                            title="Toggle Fast Log Mode"
                         >
                            <Zap size={18} className={isFastLog ? 'animate-pulse' : ''} />
                         </button>
                         {editingId && <button onClick={handleCancel} className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>}
                    </div>
                </div>

                {!isFastLog && <StepIndicator currentStep={currentStep} steps={steps} />}

                <form onSubmit={handleSubmit}>
                    <div className="space-y-5">
                        {/* VIEW MODE: STEPPER OR FAST LOG */}
                        {(isFastLog || currentStep === 1) && (
                            <div className={`space-y-4 animate-in fade-in slide-in-from-right-4 duration-500`}>
                                <Input label="Movement Date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                                <SearchableSelect 
                                    label="Perfume"
                                    options={gateInPerfumeOptions}
                                    value={selectedPerfumeId}
                                    onChange={val => setSelectedPerfumeId(val)}
                                    required
                                />
                                {selectedPerfume && <PerfumeTag perfume={selectedPerfume} />}
                            </div>
                        )}

                        {(isFastLog || currentStep === 2) && (
                            <div className={`space-y-4 animate-in fade-in slide-in-from-right-4 duration-500`}>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Batch Reference" value={importRef} onChange={e => setImportRef(e.target.value)} placeholder="e.g., T-123" required />
                                    <Select 
                                        label="Inbound Packing"
                                        options={packingTypes.map(pt => ({ value: pt.id, label: pt.name }))}
                                        value={selectedPackingTypeId}
                                        onChange={e => setSelectedPackingTypeId(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Select 
                                        label="Target Warehouse"
                                        options={getMainLocations().map(l => ({ value: l.id, label: l.name }))}
                                        value={mainLocId}
                                        onChange={e => { setMainLocId(e.target.value); setSubLocId(''); }}
                                        required
                                    />
                                    <Select 
                                        label="Sub Zone"
                                        options={subLocations.map(l => ({ value: l.id, label: l.name }))}
                                        value={subLocId}
                                        onChange={e => setSubLocId(e.target.value)}
                                        disabled={!mainLocId}
                                    />
                                </div>
                            </div>
                        )}

                        {(isFastLog || currentStep === 3) && (
                            <div className={`space-y-4 animate-in fade-in slide-in-from-right-4 duration-500`}>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Units (Drums/Boxes)" type="number" value={qty} onChange={e => handleQtyChange(e.target.value)} required />
                                    <Input label="Total Net Weight (KG)" type="number" step="0.01" value={weight} onChange={e => handleWeightChange(e.target.value)} required />
                                </div>
                                <Input label="Supplier Invoice Reference" value={invoice} onChange={e => setInvoice(e.target.value)} />
                                {canViewPrices && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input label="Valuation (USD/kg)" type="number" step="0.01" value={priceUSD} onChange={e => setPriceUSD(e.target.value)} />
                                        <Input label="Valuation (PKR/kg)" type="number" step="0.01" value={pricePKR} onChange={e => setPricePKR(e.target.value)} />
                                    </div>
                                )}
                                <Input label="Logistics Notes" value={remarks} onChange={e => setRemarks(e.target.value)} />
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                        {!isFastLog && currentStep > 1 && (
                            <button 
                                type="button" 
                                onClick={prevStep}
                                className="px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                            >
                                <ChevronLeft size={16} /> Previous
                            </button>
                        )}
                        
                        {!isFastLog && currentStep < 3 ? (
                            <button 
                                type="button" 
                                onClick={nextStep}
                                disabled={currentStep === 1 && !selectedPerfumeId}
                                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2"
                            >
                                Continue <ChevronRight size={16} />
                            </button>
                        ) : (
                            <Button 
                                type="submit" 
                                className={`flex-1 py-4 font-black uppercase text-xs tracking-widest shadow-xl ${editingId ? 'bg-primary-600 shadow-primary-500/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'}`}
                            >
                                {editingId ? 'Execute Update' : 'Log Logistics Receipt'}
                            </Button>
                        )}
                    </div>
                </form>
            </div>
        </div>

        <div className="xl:col-span-2 space-y-8">
            <div className="bg-white dark:bg-slate-900/50 rounded-[2.5rem] shadow-soft border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 className="font-black text-slate-800 dark:text-white text-lg">Inbound Logistics Receipt</h3>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verified Arrivals</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] text-slate-400 uppercase tracking-[0.2em] bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="px-8 py-6">Timeline</th>
                                <th className="px-8 py-6">Perfume & Lot</th>
                                <th className="px-8 py-6">Storage Zone</th>
                                <th className="px-8 py-6 text-right">Net Load</th>
                                <th className="px-8 py-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {gateInLogs.slice().reverse().slice(0, 15).map(log => {
                                const p = perfumes.find(x => x.id === log.perfumeId);
                                const loc = locations.find(x => x.id === log.mainLocationId);
                                return (
                                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group">
                                        <td className="px-8 py-6 text-slate-400 font-mono text-[10px] font-bold">{log.date}</td>
                                        <td className="px-8 py-6">
                                            <div className="font-black text-slate-800 dark:text-white">{p?.name}</div>
                                            <div className="text-[10px] text-emerald-500 font-bold font-mono mt-1 uppercase">Batch: {log.importReference}</div>
                                        </td>
                                        <td className="px-8 py-6 text-xs font-bold text-slate-500 dark:text-slate-400">{loc?.name}</td>
                                        <td className="px-8 py-6 text-right font-black text-emerald-600 dark:text-emerald-400">{log.netWeight.toFixed(2)} <span className="text-slate-400 dark:text-slate-500 text-[10px] font-normal">kg</span></td>
                                        <td className="px-8 py-6 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleEdit(log)} className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-emerald-500 hover:border-emerald-500 transition-all"><Pencil size={14}/></button>
                                                <button onClick={() => setDeleteTarget(log.id)} className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-rose-500 hover:border-rose-500 transition-all"><Trash2 size={14}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            {gateInLogs.length === 0 && (
                                <tr><td colSpan={5} className="px-8 py-32 text-center text-slate-300 dark:text-slate-600 font-bold italic text-lg">No inbound logistics records in the ledger.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    <ConfirmationModal
      isOpen={!!deleteTarget}
      title="Delete Inbound Log"
      message="This will permanently remove this Gate In record. This action cannot be undone."
      confirmText="Delete Record"
      type="danger"
      onConfirm={() => { deleteGateInLog(deleteTarget!); setDeleteTarget(null); }}
      onCancel={() => setDeleteTarget(null)}
    />
    </>
  );
};

// --- GATE OUT (ISSUING) ---
export const GateOutForm = () => {
  const { 
    perfumes, packingTypes, customers, locations,
    getMainLocations, getSubLocations, 
    addGateOutLog, updateGateOutLog, deleteGateOutLog,
    gateOutLogs, getBatchStock 
  } = useInventory();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isFastLog, setIsFastLog] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPerfumeId, setSelectedPerfumeId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [selectedPackingTypeId, setSelectedPackingTypeId] = useState('');
  const [mainLocId, setMainLocId] = useState('');
  const [subLocId, setSubLocId] = useState('');
  const [usage, setUsage] = useState<GateOutUsage>(GateOutUsage.Production);
  const [customerId, setCustomerId] = useState('');
  const [remarks, setRemarks] = useState('');

  const { qty, weight, handleQtyChange, handleWeightChange, setQty, setWeight } = useCyclicalWeight(selectedPackingTypeId, packingTypes);

  const subLocations = useMemo(() => mainLocId ? getSubLocations(mainLocId) : [], [mainLocId, getSubLocations]);

  // --- BIDIRECTIONAL FILTERING LOGIC ---
  const availableStockEntries = useMemo(() => {
    return selectedPerfumeId && mainLocId ? getBatchStock(selectedPerfumeId, mainLocId, subLocId || undefined, editingId || undefined) : [];
  }, [selectedPerfumeId, mainLocId, subLocId, editingId, getBatchStock]);

  const filteredPackingTypes = useMemo(() => {
    let types = Array.from(new Set(availableStockEntries.map(e => e.packingTypeId)));
    if (batchNumber) {
        types = availableStockEntries.filter(e => e.batch === batchNumber).map(e => e.packingTypeId);
    }
    return packingTypes.filter(pt => types.includes(pt.id));
  }, [availableStockEntries, batchNumber, packingTypes]);

  const filteredBatches = useMemo(() => {
    let entries = availableStockEntries;
    if (selectedPackingTypeId) {
        entries = availableStockEntries.filter(e => e.packingTypeId === selectedPackingTypeId);
    }
    const map: Record<string, number> = {};
    entries.forEach(e => map[e.batch] = (map[e.batch] || 0) + e.weight);
    return Object.entries(map).map(([batch, weight]) => ({ batch, weight }));
  }, [availableStockEntries, selectedPackingTypeId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const entry = availableStockEntries.find(e => e.batch === batchNumber && e.packingTypeId === selectedPackingTypeId);
    if (!entry || Number(weight) > entry.weight) {
        alert(`Insufficient Stock! Available: ${entry?.weight.toFixed(2) || 0} kg. Requested: ${Number(weight).toFixed(2)} kg.`);
        return;
    }

    const logData: GateOutLog = {
      id: editingId || generateId(),
      date, perfumeId: selectedPerfumeId, packingTypeId: selectedPackingTypeId, 
      packingQty: Number(qty), netWeight: Number(weight), mainLocationId: mainLocId, 
      subLocationId: subLocId || undefined, usage, customerId: usage === GateOutUsage.Sale ? customerId : undefined, 
      remarks, batchNumber
    };

    if (editingId) {
        updateGateOutLog(editingId, logData);
        alert('Entry Updated');
        handleCancel();
    } else {
        addGateOutLog(logData);
        alert('Gate Out Logged');
        handleCancel();
        setCurrentStep(1);
    }
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 3));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const steps = [
    { label: 'Perfume', icon: <Package size={18} /> },
    { label: 'Batch/Zone', icon: <MapPin size={18} /> },
    { label: 'Payload', icon: <Zap size={18} /> }
  ];

  const selectedPerfume = perfumes.find(p => p.id === selectedPerfumeId);
  const currentBatchTotal = filteredBatches.find(b => b.batch === batchNumber)?.weight || 0;

  const handleEdit = (log: GateOutLog) => {
      setEditingId(log.id);
      setDate(log.date);
      setSelectedPerfumeId(log.perfumeId);
      setMainLocId(log.mainLocationId);
      setSubLocId(log.subLocationId || '');
      setBatchNumber(log.batchNumber);
      setSelectedPackingTypeId(log.packingTypeId);
      setQty(log.packingQty.toString());
      setWeight(log.netWeight.toString());
      setUsage(log.usage);
      setCustomerId(log.customerId || '');
      setRemarks(log.remarks);
  };

  const handleCancel = () => {
    setEditingId(null);
    setSelectedPerfumeId('');
    setBatchNumber('');
    setSelectedPackingTypeId('');
    setQty('');
    setWeight('');
    setMainLocId('');
    setSubLocId('');
    setUsage(GateOutUsage.Production);
    setCustomerId('');
    setRemarks('');
  };

  return (
    <>
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-1">
            <div className="bg-white dark:bg-slate-900/50 p-7 rounded-[2rem] shadow-soft border border-slate-200 dark:border-slate-800 sticky top-24 backdrop-blur-xl">
                 <div className="flex justify-between items-start mb-8">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${editingId ? 'bg-primary-50 text-primary-500' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-500'}`}>
                                {editingId ? <Pencil size={20} /> : <ArrowRight size={20} />}
                            </div>
                            {editingId ? 'Modify Dispatch' : 'Industrial Dispatch'}
                        </h3>
                        <p className="text-[10px] h-4 font-black uppercase tracking-[0.2em] text-slate-400 mt-1 pl-1">
                            {isFastLog ? 'Fast Log Active' : `Guided Flow - Step ${currentStep} of 3`}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                         <button 
                            onClick={() => setIsFastLog(!isFastLog)}
                            className={`p-2 rounded-xl transition-all border ${isFastLog ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'}`}
                            title="Toggle Fast Log Mode"
                         >
                            <Zap size={18} className={isFastLog ? 'animate-pulse' : ''} />
                         </button>
                         {editingId && <button onClick={handleCancel} className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>}
                    </div>
                </div>

                {!isFastLog && <StepIndicator currentStep={currentStep} steps={steps} />}

                <form onSubmit={handleSubmit}>
                    <div className="space-y-5">
                         {(isFastLog || currentStep === 1) && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                                <Input label="Movement Date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                                <SearchableSelect 
                                    label="Perfume"
                                    options={perfumes.map(p => ({ value: p.id, label: `${p.code} - ${p.name}` }))}
                                    value={selectedPerfumeId}
                                    onChange={val => { setSelectedPerfumeId(val); setBatchNumber(''); }}
                                    required
                                />
                                {selectedPerfume && <PerfumeTag perfume={selectedPerfume} currentStock={availableStockEntries.reduce((acc, e) => acc + e.weight, 0)} />}
                            </div>
                        )}

                        {(isFastLog || currentStep === 2) && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="grid grid-cols-2 gap-4">
                                    <Select 
                                        label="Source Warehouse"
                                        options={getMainLocations().map(l => ({ value: l.id, label: l.name }))}
                                        value={mainLocId}
                                        onChange={e => { setMainLocId(e.target.value); setSubLocId(''); setBatchNumber(''); }}
                                        required
                                    />
                                    <Select 
                                        label="Sub Zone"
                                        options={subLocations.map(l => ({ value: l.id, label: l.name }))}
                                        value={subLocId}
                                        onChange={e => { setSubLocId(e.target.value); setBatchNumber(''); }}
                                        disabled={!mainLocId}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Select 
                                        label="Packing Type"
                                        options={filteredPackingTypes.map(pt => ({ value: pt.id, label: pt.name }))}
                                        value={selectedPackingTypeId}
                                        onChange={e => setSelectedPackingTypeId(e.target.value)}
                                        required
                                        disabled={!selectedPerfumeId || !mainLocId}
                                    />
                                    <Select 
                                        label="Batch (FIFO Recommended)"
                                        options={filteredBatches.map(b => ({ value: b.batch, label: `${b.batch} [${b.weight.toFixed(2)} kg available]` }))}
                                        value={batchNumber}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setBatchNumber(val);
                                            const entry = availableStockEntries.find(x => x.batch === val && (selectedPackingTypeId ? x.packingTypeId === selectedPackingTypeId : true));
                                            if (entry) {
                                                setWeight(entry.weight.toFixed(2));
                                                if (!selectedPackingTypeId) setSelectedPackingTypeId(entry.packingTypeId);
                                                const pt = packingTypes.find(x => x.id === entry.packingTypeId);
                                                if (pt?.qtyPerPacking) setQty((entry.weight / pt.qtyPerPacking).toFixed(2));
                                            }
                                        }}
                                        required
                                        disabled={!selectedPerfumeId || !mainLocId}
                                    />
                                </div>
                            </div>
                        )}

                        {(isFastLog || currentStep === 3) && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Net Weight (KG)" type="number" step="0.01" value={weight} onChange={e => handleWeightChange(e.target.value)} required />
                                    <Input label="Packing Quantity" type="number" value={qty} onChange={e => handleQtyChange(e.target.value)} required />
                                </div>
                                
                                <div className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4 mt-2">
                                    <div className="grid grid-cols-2 gap-4">
                                        <Select label="Movement Purpose" options={Object.values(GateOutUsage).map(u => ({ value: u, label: u }))} value={usage} onChange={e => setUsage(e.target.value as GateOutUsage)} />
                                        {usage === GateOutUsage.Sale && (
                                            <Select label="Target Customer" options={customers.map(c => ({ value: c.id, label: c.name }))} value={customerId} onChange={e => setCustomerId(e.target.value)} required />
                                        )}
                                    </div>
                                    <Input label="Movement Remarks" value={remarks} onChange={e => setRemarks(e.target.value)} />
                                </div>

                                {selectedPerfume && (
                                    <StockImpactGauge 
                                        current={currentBatchTotal} 
                                        delta={Number(weight)} 
                                        threshold={selectedPerfume?.lowStockAlert || 0}
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                        {!isFastLog && currentStep > 1 && (
                            <button 
                                type="button" 
                                onClick={prevStep}
                                className="px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                            >
                                <ChevronLeft size={16} /> Previous
                            </button>
                        )}
                        
                        {!isFastLog && currentStep < 3 ? (
                            <button 
                                type="button" 
                                onClick={nextStep}
                                disabled={currentStep === 1 && !selectedPerfumeId}
                                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2"
                            >
                                Continue <ChevronRight size={16} />
                            </button>
                        ) : (
                            <Button 
                                type="submit" 
                                className={`flex-1 py-4 font-black uppercase text-xs tracking-widest shadow-xl ${editingId ? 'bg-primary-600 shadow-primary-500/20' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'}`}
                            >
                                {editingId ? 'Execute Dispatch Update' : 'Execute Logistics Dispatch'}
                            </Button>
                        )}
                    </div>
                </form>
            </div>
        </div>

        <div className="xl:col-span-2 space-y-8">
            <div className="bg-white dark:bg-slate-900/50 rounded-[2.5rem] shadow-soft border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 className="font-black text-slate-800 dark:text-white text-lg">Outbound Dispatch Ledger</h3>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operational Movements</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] text-slate-400 uppercase tracking-[0.2em] bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="px-8 py-6">Timeline</th>
                                <th className="px-8 py-6">Perfume & Batch</th>
                                <th className="px-8 py-6">Destination</th>
                                <th className="px-8 py-6 text-right">Net Load</th>
                                <th className="px-8 py-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {gateOutLogs.slice().reverse().slice(0, 15).map(log => {
                                const p = perfumes.find(x => x.id === log.perfumeId);
                                const cust = customers.find(c => c.id === log.customerId);
                                return (
                                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group">
                                        <td className="px-8 py-6 text-slate-400 font-mono text-[10px] font-bold">{log.date}</td>
                                        <td className="px-8 py-6">
                                            <div className="font-black text-slate-800 dark:text-white">{p?.name}</div>
                                            <div className="text-[10px] text-rose-500 font-bold font-mono mt-1 uppercase">Batch: {log.batchNumber}</div>
                                        </td>
                                        <td className="px-8 py-6 text-xs font-bold text-slate-500 dark:text-slate-400">{log.usage === 'Sale' ? cust?.name : log.usage}</td>
                                        <td className="px-8 py-6 text-right font-black text-rose-600 dark:text-rose-400">{log.netWeight.toFixed(2)} <span className="text-slate-400 dark:text-slate-500 text-[10px] font-normal">kg</span></td>
                                        <td className="px-8 py-6 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleEdit(log)} className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-rose-500 hover:border-rose-500 transition-all"><Pencil size={14}/></button>
                                                <button onClick={() => setDeleteTarget(log.id)} className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-rose-500 hover:border-rose-500 transition-all"><Trash2 size={14}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            {gateOutLogs.length === 0 && (
                                <tr><td colSpan={5} className="px-8 py-32 text-center text-slate-300 dark:text-slate-600 font-bold italic text-lg">No outbound dispatch records in the ledger.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    <ConfirmationModal
      isOpen={!!deleteTarget}
      title="Delete Outbound Log"
      message="This will permanently remove this dispatch record. Inventory positions will be recalculated. This cannot be undone."
      confirmText="Delete Record"
      type="danger"
      onConfirm={() => { deleteGateOutLog(deleteTarget!); setDeleteTarget(null); }}
      onCancel={() => setDeleteTarget(null)}
    />
    </>
  );
};

// --- STOCK TRANSFER ---
export const StockTransferForm = () => {
  const { 
    perfumes, packingTypes, locations,
    getMainLocations, getSubLocations, 
    addTransferLog, updateTransferLog, deleteTransferLog,
    transferLogs, getBatchStock 
  } = useInventory();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isFastLog, setIsFastLog] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPerfumeId, setSelectedPerfumeId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [selectedPackingTypeId, setSelectedPackingTypeId] = useState('');
  
  const [fromMainLocId, setFromMainLocId] = useState('');
  const [fromSubLocId, setFromSubLocId] = useState('');
  const [toMainLocId, setToMainLocId] = useState('');
  const [toSubLocId, setToSubLocId] = useState('');
  const [remarks, setRemarks] = useState('');

  const { qty, weight, handleQtyChange, handleWeightChange, setQty, setWeight } = useCyclicalWeight(selectedPackingTypeId, packingTypes);

  const fromSubLocations = useMemo(() => fromMainLocId ? getSubLocations(fromMainLocId) : [], [fromMainLocId, getSubLocations]);
  const toSubLocations = useMemo(() => toMainLocId ? getSubLocations(toMainLocId) : [], [toMainLocId, getSubLocations]);

  // --- BIDIRECTIONAL FILTERING LOGIC ---
  const availableStockEntries = useMemo(() => {
    return selectedPerfumeId && fromMainLocId ? getBatchStock(selectedPerfumeId, fromMainLocId, fromSubLocId || undefined, editingId || undefined) : [];
  }, [selectedPerfumeId, fromMainLocId, fromSubLocId, editingId, getBatchStock]);

  const filteredPackingTypes = useMemo(() => {
    let types = Array.from(new Set(availableStockEntries.map(e => e.packingTypeId)));
    if (batchNumber) {
        types = availableStockEntries.filter(e => e.batch === batchNumber).map(e => e.packingTypeId);
    }
    return packingTypes.filter(pt => types.includes(pt.id));
  }, [availableStockEntries, batchNumber, packingTypes]);

  const filteredBatches = useMemo(() => {
    let entries = availableStockEntries;
    if (selectedPackingTypeId) {
        entries = availableStockEntries.filter(e => e.packingTypeId === selectedPackingTypeId);
    }
    const map: Record<string, number> = {};
    entries.forEach(e => map[e.batch] = (map[e.batch] || 0) + e.weight);
    return Object.entries(map).map(([batch, weight]) => ({ batch, weight }));
  }, [availableStockEntries, selectedPackingTypeId]);
  // ------------------------------------

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fromMainLocId || !toMainLocId) {
        alert("Origin and Destination locations are required.");
        return;
    }

    if (fromMainLocId === toMainLocId && fromSubLocId === toSubLocId) {
        alert("Error: Origin and Destination must be different.");
        return;
    }

    const entry = availableStockEntries.find(e => e.batch === batchNumber && e.packingTypeId === selectedPackingTypeId);
    if (!entry || Number(weight) > entry.weight) {
        alert(`Transfer Blocked! Available at origin: ${entry?.weight.toFixed(2) || 0} kg. Requested: ${Number(weight).toFixed(2)} kg.`);
        return;
    }

    const logData: StockTransferLog = {
      id: editingId || generateId(),
      date, perfumeId: selectedPerfumeId, packingTypeId: selectedPackingTypeId, 
      packingQty: Number(qty), netWeight: Number(weight), 
      fromMainLocationId: fromMainLocId, fromSubLocationId: fromSubLocId || undefined,
      toMainLocationId: toMainLocId, toSubLocationId: toSubLocId || undefined,
      remarks, batchNumber
    };

    if (editingId) {
        updateTransferLog(editingId, logData);
        alert('Transfer Updated');
        handleCancel();
    } else {
        addTransferLog(logData);
        alert('Stock Transferred Successfully');
        handleCancel();
        setCurrentStep(1);
    }
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 3));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const steps = [
    { label: 'Perfume', icon: <Package size={18} /> },
    { label: 'Logistics', icon: <ArrowRightLeft size={18} /> },
    { label: 'Payload', icon: <Zap size={18} /> }
  ];

  const selectedPerfume = perfumes.find(p => p.id === selectedPerfumeId);
  const currentBatchTotal = filteredBatches.find(b => b.batch === batchNumber)?.weight || 0;

  const handleEdit = (log: StockTransferLog) => {
      setEditingId(log.id);
      setDate(log.date);
      setSelectedPerfumeId(log.perfumeId);
      setFromMainLocId(log.fromMainLocationId);
      setFromSubLocId(log.fromSubLocationId || '');
      setToMainLocId(log.toMainLocationId);
      setToSubLocId(log.toSubLocationId || '');
      setBatchNumber(log.batchNumber);
      setSelectedPackingTypeId(log.packingTypeId);
      setQty(log.packingQty.toString());
      setWeight(log.netWeight.toString());
      setRemarks(log.remarks);
  };

  const handleCancel = () => {
    setEditingId(null);
    setSelectedPerfumeId('');
    setBatchNumber('');
    setSelectedPackingTypeId('');
    setQty('');
    setWeight('');
    setFromMainLocId('');
    setFromSubLocId('');
    setToMainLocId('');
    setToSubLocId('');
    setRemarks('');
  };

  const getLocName = (id?: string) => locations.find(l => l.id === id)?.name || '-';

  return (
    <>
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-1">
            <div className="bg-white dark:bg-slate-900/50 p-7 rounded-[2rem] shadow-soft border border-slate-200 dark:border-slate-800 sticky top-24 backdrop-blur-xl">
                 <div className="flex justify-between items-start mb-8">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                                {editingId ? <Pencil size={20} /> : <ArrowRightLeft size={20} />}
                            </div>
                            {editingId ? 'Modify Move' : 'Internal Transfer'}
                        </h3>
                        <p className="text-[10px] h-4 font-black uppercase tracking-[0.2em] text-slate-400 mt-1 pl-1">
                            {isFastLog ? 'Fast Log Active' : `Guided Flow - Step ${currentStep} of 3`}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                         <button 
                            onClick={() => setIsFastLog(!isFastLog)}
                            className={`p-2 rounded-xl transition-all border ${isFastLog ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'}`}
                            title="Toggle Fast Log Mode"
                         >
                            <Zap size={18} className={isFastLog ? 'animate-pulse' : ''} />
                         </button>
                         {editingId && <button onClick={handleCancel} className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>}
                    </div>
                </div>

                {!isFastLog && <StepIndicator currentStep={currentStep} steps={steps} />}

                <form onSubmit={handleSubmit}>
                    <div className="space-y-5">
                         {(isFastLog || currentStep === 1) && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                                <Input label="Transfer Date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                                <SearchableSelect 
                                    label="Perfume"
                                    options={perfumes.map(p => ({ value: p.id, label: `${p.code} - ${p.name}` }))}
                                    value={selectedPerfumeId}
                                    onChange={val => { setSelectedPerfumeId(val); setBatchNumber(''); }}
                                    required
                                />
                                {selectedPerfume && <PerfumeTag perfume={selectedPerfume} currentStock={availableStockEntries.reduce((acc, e) => acc + e.weight, 0)} />}
                            </div>
                        )}

                        {(isFastLog || currentStep === 2) && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="p-4 bg-slate-900/5 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                                     <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                                        <MapPin size={10} /> Route Configuration
                                     </p>
                                     <div className="grid grid-cols-2 gap-4">
                                        <Select 
                                            label="Source Hub"
                                            options={getMainLocations().map(l => ({ value: l.id, label: l.name }))}
                                            value={fromMainLocId}
                                            onChange={e => { setFromMainLocId(e.target.value); setFromSubLocId(''); setBatchNumber(''); }}
                                            required
                                        />
                                        <Select 
                                            label="Sub Zone"
                                            options={fromSubLocations.map(l => ({ value: l.id, label: l.name }))}
                                            value={fromSubLocId}
                                            onChange={e => { setFromSubLocId(e.target.value); setBatchNumber(''); }}
                                            disabled={!fromMainLocId}
                                        />
                                     </div>
                                     <div className="flex justify-center -my-2 relative z-10">
                                         <div className="p-1 px-3 bg-indigo-600 rounded-full text-white text-[9px] font-black uppercase tracking-tighter shadow-lg shadow-indigo-500/20">Destination below</div>
                                     </div>
                                     <div className="grid grid-cols-2 gap-4 pt-2">
                                        <Select 
                                            label="Target Hub"
                                            options={getMainLocations().map(l => ({ value: l.id, label: l.name }))}
                                            value={toMainLocId}
                                            onChange={e => { setToMainLocId(e.target.value); setToSubLocId(''); }}
                                            required
                                        />
                                        <Select 
                                            label="Sub Zone"
                                            options={toSubLocations.map(l => ({ value: l.id, label: l.name }))}
                                            value={toSubLocId}
                                            onChange={e => setToSubLocId(e.target.value)}
                                            disabled={!toMainLocId}
                                        />
                                     </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Select 
                                        label="Packing Type"
                                        options={filteredPackingTypes.map(pt => ({ value: pt.id, label: pt.name }))}
                                        value={selectedPackingTypeId}
                                        onChange={e => setSelectedPackingTypeId(e.target.value)}
                                        required
                                        disabled={!selectedPerfumeId || !fromMainLocId}
                                    />
                                    <Select 
                                        label="Batch (FIFO Optional)"
                                        options={filteredBatches.map(b => ({ value: b.batch, label: `${b.batch} [${b.weight.toFixed(2)} kg available]` }))}
                                        value={batchNumber}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setBatchNumber(val);
                                            const entry = availableStockEntries.find(x => x.batch === val && (selectedPackingTypeId ? x.packingTypeId === selectedPackingTypeId : true));
                                            if (entry) {
                                                setWeight(entry.weight.toFixed(2));
                                                if (!selectedPackingTypeId) setSelectedPackingTypeId(entry.packingTypeId);
                                                const pt = packingTypes.find(x => x.id === entry.packingTypeId);
                                                if (pt?.qtyPerPacking) setQty((entry.weight / pt.qtyPerPacking).toFixed(2));
                                            }
                                        }}
                                        required
                                        disabled={!selectedPerfumeId || !fromMainLocId}
                                    />
                                </div>
                            </div>
                        )}

                        {(isFastLog || currentStep === 3) && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Net Weight (KG)" type="number" step="0.01" value={weight} onChange={e => handleWeightChange(e.target.value)} required />
                                    <Input label="Packing Count" type="number" value={qty} onChange={e => handleQtyChange(e.target.value)} required />
                                </div>
                                <Input label="Transfer Notes" value={remarks} onChange={e => setRemarks(e.target.value)} />
                                
                                {selectedPerfume && (
                                    <StockImpactGauge 
                                        current={currentBatchTotal} 
                                        delta={Number(weight)} 
                                        unit="kg"
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                        {!isFastLog && currentStep > 1 && (
                            <button 
                                type="button" 
                                onClick={prevStep}
                                className="px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                            >
                                <ChevronLeft size={16} /> Previous
                            </button>
                        )}
                        
                        {!isFastLog && currentStep < 3 ? (
                            <button 
                                type="button" 
                                onClick={nextStep}
                                disabled={currentStep === 1 && !selectedPerfumeId}
                                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2"
                            >
                                Continue <ChevronRight size={16} />
                            </button>
                        ) : (
                            <Button 
                                type="submit" 
                                className={`flex-1 py-4 font-black uppercase text-xs tracking-widest shadow-xl bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20`}
                            >
                                {editingId ? 'Execute Move Update' : 'Execute Internal Transfer'}
                            </Button>
                        )}
                    </div>
                </form>
            </div>
        </div>

        <div className="xl:col-span-2 space-y-8">
            <div className="bg-white dark:bg-slate-900/50 rounded-[2.5rem] shadow-soft border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 className="font-black text-slate-800 dark:text-white text-lg">Internal Transfer Ledger</h3>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global History</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] text-slate-400 uppercase tracking-[0.2em] bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="px-8 py-6">Timeline</th>
                                <th className="px-8 py-6">Perfume & Batch</th>
                                <th className="px-8 py-6">Transfer Logic</th>
                                <th className="px-8 py-6 text-right">Net Load</th>
                                <th className="px-8 py-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {transferLogs.slice().reverse().slice(0, 15).map(log => {
                                const p = perfumes.find(x => x.id === log.perfumeId);
                                return (
                                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group">
                                        <td className="px-8 py-6 text-slate-400 font-mono text-[10px] font-bold">{log.date}</td>
                                        <td className="px-8 py-6">
                                            <div className="font-black text-slate-800 dark:text-white">{p?.name}</div>
                                            <div className="text-[10px] text-indigo-500 font-bold font-mono mt-1 uppercase">Batch: {log.batchNumber}</div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                                                <div className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">{getLocName(log.fromMainLocationId)}</div>
                                                <ArrowRight size={14} className="text-slate-300 dark:text-slate-600" />
                                                <div className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">{getLocName(log.toMainLocationId)}</div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right font-black text-slate-900 dark:text-slate-100">{log.netWeight.toFixed(2)} <span className="text-slate-400 dark:text-slate-500 text-[10px] font-normal">kg</span></td>
                                        <td className="px-8 py-6 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleEdit(log)} className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-500 transition-all"><Pencil size={14}/></button>
                                                <button onClick={() => setDeleteTarget(log.id)} className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-rose-500 hover:border-rose-500 transition-all"><Trash2 size={14}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            {transferLogs.length === 0 && (
                                <tr><td colSpan={5} className="px-8 py-32 text-center text-slate-300 dark:text-slate-600 font-bold italic text-lg">No stock transfers recorded in the ledger.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    <ConfirmationModal
      isOpen={!!deleteTarget}
      title="Delete Transfer Log"
      message="This will permanently remove this movement record. Perfume positions will be recalculated. This cannot be undone."
      confirmText="Delete Record"
      type="danger"
      onConfirm={() => { deleteTransferLog(deleteTarget!); setDeleteTarget(null); }}
      onCancel={() => setDeleteTarget(null)}
    />
    </>
  );
};