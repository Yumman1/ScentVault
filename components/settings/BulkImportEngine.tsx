import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useInventory } from '../../context/InventoryContext';
import { Button } from '../ui/Button';
import { 
  FileBox, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Table, 
  Settings2,
  Trash2,
  ChevronRight,
  FlaskConical,
  Truck,
  Tag,
  X
} from 'lucide-react';
import { v4 as generateId } from 'uuid';
import { Supplier, Perfume, SupplierType } from '../../types';

type ImportEntity = 'perfume' | 'supplier' | 'note';

interface Mapping {
    fileColumn: string;
    systemField: string;
}

export const BulkImportEngine = () => {
    const { 
        suppliers, addSupplier, 
        perfumes, addPerfume,
        olfactiveNotes, addOlfactiveNote,
    } = useInventory();

    const [activeEntity, setActiveEntity] = useState<ImportEntity>('perfume');
    const [fileData, setFileData] = useState<any[] | null>(null);
    const [fileColumns, setFileColumns] = useState<string[]>([]);
    const [mappings, setMappings] = useState<Record<string, string>>({});
    const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
    const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Upload, 2: Map, 3: Preview
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Entity Definitions for Mapping
    const entityFields = useMemo(() => {
        if (activeEntity === 'perfume') {
            return [
                { key: 'name', label: 'Perfume Name', required: true },
                { key: 'code', label: 'Item Code / SKU', required: true },
                { key: 'supplierName', label: 'Supplier Name', required: true },
                { key: 'priceUSD', label: 'Price (USD)', required: false },
                { key: 'pricePKR', label: 'Price (PKR)', required: false },
                { key: 'lowStockAlert', label: 'Low Stock Alert (KG)', required: false },
                { key: 'dosage', label: 'Standard Dosage (%)', required: false },
                { key: 'olfactiveNotes', label: 'Scent Notes (Comma separated)', required: false },
                { key: 'remarks', label: 'Internal Remarks', required: false }
            ];
        }
        if (activeEntity === 'supplier') {
            return [
                { key: 'name', label: 'Supplier Name', required: true },
                { key: 'type', label: 'Type (Local/International)', required: true },
                { key: 'contactPerson', label: 'Contact Person', required: false },
                { key: 'phone', label: 'Phone Number', required: false },
                { key: 'email', label: 'Email Address', required: false }
            ];
        }
        return [
            { key: 'name', label: 'Note Name', required: true }
        ];
    }, [activeEntity]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);
            
            if (data.length > 0) {
                const cols = Object.keys(data[0] as object);
                setFileData(data);
                setFileColumns(cols);
                
                // Smart Mapping
                const initialMappings: Record<string, string> = {};
                entityFields.forEach(field => {
                    const match = cols.find(c => 
                        c.toLowerCase() === field.label.toLowerCase() || 
                        c.toLowerCase() === field.key.toLowerCase() ||
                        c.toLowerCase().includes(field.key.toLowerCase())
                    );
                    if (match) initialMappings[field.key] = match;
                });
                setMappings(initialMappings);
                setStep(2);
            }
        };
        reader.readAsBinaryString(file);
    };

    const validatedData = useMemo(() => {
        if (!fileData) return [];

        return fileData.map((row, index) => {
            const item: any = { _rowId: index, errors: [] as string[] };
            
            entityFields.forEach(field => {
                const colName = mappings[field.key];
                let value = colName ? row[colName] : undefined;

                if (field.required && (value === undefined || value === null || value === '')) {
                    item.errors.push(`Missing required field: ${field.label}`);
                }
                
                // Entity Specific Validation
                if (activeEntity === 'perfume') {
                    if (field.key === 'supplierName' && value) {
                        const s = suppliers.find(sup => sup.name.toLowerCase() === String(value).toLowerCase());
                        if (!s) {
                            item.errors.push(`Supplier "${value}" not found in registry.`);
                        } else {
                            item.supplierId = s.id;
                        }
                    }
                    if (field.key === 'code' && value) {
                        const exists = perfumes.find(p => p.code.toLowerCase() === String(value).toLowerCase());
                        if (exists) item.errors.push(`Duplicate Code: SKU ${value} already exists.`);
                    }
                }

                if (activeEntity === 'supplier' && field.key === 'name' && value) {
                    const exists = suppliers.find(s => s.name.toLowerCase() === String(value).toLowerCase());
                    if (exists) item.errors.push(`Supplier "${value}" already exists.`);
                }

                item[field.key] = value;
            });

            return item;
        });
    }, [fileData, mappings, entityFields, activeEntity, suppliers, perfumes]);

    // Handle Auto-untick of error rows when entering preview
    React.useEffect(() => {
        if (step === 3 && validatedData.length > 0) {
            const validIds = validatedData
                .filter(item => item.errors.length === 0)
                .map(item => item._rowId);
            setSelectedRowIds(new Set(validIds));
        }
    }, [step]); // Only trigger when step changes to 3

    const selectedItems = useMemo(() => 
        validatedData.filter(item => selectedRowIds.has(item._rowId)),
    [validatedData, selectedRowIds]);

    const canCommit = selectedItems.length > 0 && selectedItems.every(item => item.errors.length === 0);

    const toggleAll = () => {
        if (selectedRowIds.size === validatedData.length) {
            setSelectedRowIds(new Set());
        } else {
            setSelectedRowIds(new Set(validatedData.map(i => i._rowId)));
        }
    };

    const toggleRow = (id: number) => {
        const newSelected = new Set(selectedRowIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedRowIds(newSelected);
    };

    const executeImport = async () => {
        setImporting(true);
        try {
            let count = 0;
            if (activeEntity === 'perfume') {
                selectedItems.forEach(item => {
                    const supplier = suppliers.find(s => s.id === item.supplierId);
                    const isLocal = supplier?.type === 'Local';
                    
                    const p: Perfume = {
                        id: generateId(),
                        name: String(item.name).toUpperCase(),
                        code: String(item.code).toUpperCase(),
                        supplierId: item.supplierId,
                        dosage: Number(item.dosage) || 0,
                        priceUSD: isLocal ? 0 : (Number(item.priceUSD) || 0),
                        pricePKR: Number(item.pricePKR) || 0,
                        lowStockAlert: Number(item.lowStockAlert) || 10,
                        olfactiveNotes: String(item.olfactiveNotes || '').split(',').map(n => n.trim()).filter(Boolean),
                        remarks: String(item.remarks || '')
                    };
                    addPerfume(p);
                    count++;
                });
            } else if (activeEntity === 'supplier') {
                selectedItems.forEach(item => {
                    const s: Supplier = {
                        id: generateId(),
                        name: String(item.name).trim(),
                        type: String(item.type).toLowerCase().includes('intl') || String(item.type).toLowerCase().includes('international') ? SupplierType.International : SupplierType.Local,
                        contactPerson: String(item.contactPerson || ''),
                        phone: String(item.phone || ''),
                        email: String(item.email || '')
                    };
                    addSupplier(s);
                    count++;
                });
            } else if (activeEntity === 'note') {
                selectedItems.forEach(item => {
                    if (item.name) {
                        addOlfactiveNote(String(item.name));
                        count++;
                    }
                });
            }

            alert(`Successfully ingested ${count} ${activeEntity} records.`);
            resetImport();
        } catch (err) {
            console.error(err);
            alert("Error during bulk ingestion. Check console for details.");
        } finally {
            setImporting(false);
        }
    };

    const resetImport = () => {
        setFileData(null);
        setMappings({});
        setStep(1);
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all duration-500">
            {/* Header Tabs */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 p-2 bg-slate-50/50 dark:bg-slate-900/50">
                {[
                    { id: 'perfume', label: 'Perfume Archive', icon: FlaskConical },
                    { id: 'supplier', label: 'Supplier Registry', icon: Truck },
                    { id: 'note', label: 'Olfactive Notes', icon: Tag }
                ].map((item) => (
                    <button 
                        key={item.id}
                        onClick={() => { setActiveEntity(item.id as ImportEntity); resetImport(); }}
                        className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-3xl flex items-center justify-center gap-3 ${activeEntity === item.id ? 'bg-white dark:bg-slate-700 shadow-md text-indigo-700 dark:text-indigo-400 ring-1 ring-slate-200 dark:ring-slate-600' : 'text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                    >
                        <item.icon size={14} />
                        {item.label}
                    </button>
                ))}
            </div>

            <div className="p-10">
                {/* Step Indicators */}
                <div className="flex items-center gap-4 mb-10 overflow-x-auto pb-4">
                    {[
                        { num: 1, label: 'Upload Sheet' },
                        { num: 2, label: 'Map Intelligence' },
                        { num: 3, label: 'Preview & Commit' }
                    ].map(s => (
                        <div key={s.num} className="flex items-center gap-4 flex-shrink-0">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black transition-all ${step === s.num ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : step > s.num ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                {step > s.num ? <CheckCircle2 size={18} /> : s.num}
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${step === s.num ? 'text-indigo-600' : 'text-slate-400'}`}>{s.label}</span>
                            {s.num < 3 && <ChevronRight size={14} className="text-slate-300" />}
                        </div>
                    ))}
                </div>

                {step === 1 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-indigo-50/30 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 p-8 rounded-3xl">
                            <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter mb-2 italic">Industrial Sourcing Template</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                                To ensure maximum accuracy, please export your Google Sheet as an **Excel (.xlsx)** or **CSV** file.
                                {activeEntity === 'perfume' && " Ensure you have already registered your suppliers before importing perfumes."}
                            </p>
                        </div>

                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="group cursor-pointer border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem] p-24 text-center hover:border-indigo-400 dark:hover:border-indigo-600 transition-all bg-slate-50/50 dark:bg-slate-950/20"
                        >
                            <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx,.csv" />
                            <div className="h-20 w-20 bg-white dark:bg-slate-800 rounded-[2rem] shadow-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                                <Upload size={32} className="text-indigo-600" />
                            </div>
                            <h5 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Drag Intelligence File or Click</h5>
                            <p className="text-slate-400 font-bold mt-2">XLSX, CSV Supported (Max 200 Records Recommend)</p>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="flex justify-between items-center">
                            <div>
                                <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter italic">Map Field Intelligence</h4>
                                <p className="text-sm text-slate-500 font-bold">Align your spreadsheet columns with ScentVault's data architecture.</p>
                            </div>
                            <Button variant="outline" onClick={resetImport} className="rounded-2xl border-slate-100 dark:border-slate-800 px-6 font-bold text-slate-500"><X size={16} className="mr-2"/> Abort</Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                            {entityFields.map(field => (
                                <div key={field.key} className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            {field.required && <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>}
                                            {field.label}
                                        </label>
                                        {field.required && <span className="text-[8px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded uppercase">Required</span>}
                                    </div>
                                    <select 
                                        className="w-full bg-white dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold shadow-sm outline-none ring-2 ring-transparent focus:ring-indigo-500 transition-all dark:text-slate-200"
                                        value={mappings[field.key] || ''}
                                        onChange={(e) => setMappings({ ...mappings, [field.key]: e.target.value })}
                                    >
                                        <option value="">-- Manual Selection --</option>
                                        {fileColumns.map(col => <option key={col} value={col}>{col}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end">
                            <Button onClick={() => setStep(3)} className="h-16 px-12 rounded-[2rem] font-black text-lg gap-3 shadow-2xl shadow-indigo-600/20">
                                Verify Intelligence <ArrowRight size={20} />
                            </Button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="flex justify-between items-center">
                            <div>
                                <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter italic">Integrity Verification</h4>
                                <p className="text-sm text-slate-500 font-bold">Review detected records for accuracy before ingestion. Items with <span className="text-rose-500">errors</span> will block the import.</p>
                            </div>
                            <div className="flex gap-4">
                                <Button variant="outline" onClick={() => setStep(2)} className="h-12 rounded-2xl border-slate-200 dark:border-slate-800 px-6 font-bold text-slate-500 transition-all">Back to Mapping</Button>
                                <Button onClick={executeImport} disabled={!canCommit || importing} className="h-12 rounded-2xl px-10 font-bold shadow-xl flex items-center gap-2">
                                    {importing ? "Ingesting..." : <><CheckCircle2 size={18} /> Commit {selectedItems.length} Selected Records</>}
                                </Button>
                            </div>
                        </div>

                        <div className="border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                            <div className="max-h-[500px] overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50">
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10 border-b border-slate-100 dark:border-slate-700">
                                        <tr>
                                            <th className="px-8 py-5 w-10">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                    checked={selectedRowIds.size === validatedData.length && validatedData.length > 0}
                                                    onChange={toggleAll}
                                                />
                                            </th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                            {entityFields.map(f => (
                                                <th key={f.key} className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{f.label}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                                        {validatedData.map((item, idx) => (
                                            <tr key={idx} className={`transition-colors ${selectedRowIds.has(item._rowId) ? 'bg-indigo-50/20 dark:bg-indigo-900/10' : ''} ${item.errors.length > 0 ? 'bg-rose-50/30 dark:bg-rose-950/20' : 'hover:bg-white dark:hover:bg-slate-800'}`}>
                                                <td className="px-8 py-5">
                                                    <input 
                                                        type="checkbox" 
                                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                        checked={selectedRowIds.has(item._rowId)}
                                                        onChange={() => toggleRow(item._rowId)}
                                                    />
                                                </td>
                                                <td className="px-8 py-5">
                                                    {item.errors.length > 0 ? (
                                                        <div className="group relative">
                                                            <AlertCircle size={20} className="text-rose-500 animate-pulse" />
                                                            <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 w-64 p-4 bg-slate-900 text-white rounded-2xl text-[10px] font-bold z-[100] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-2xl">
                                                                <ul className="list-disc pl-3 gap-1 flex flex-col uppercase tracking-wider">
                                                                    {item.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <CheckCircle2 size={20} className="text-emerald-500" />
                                                    )}
                                                </td>
                                                {entityFields.map(f => (
                                                    <td key={f.key} className="px-8 py-5">
                                                        <div className={`max-w-[200px] truncate font-bold ${item.errors.some((e: string) => e.includes(f.label)) ? 'text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                            {String(item[f.key] || '-')}
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {!canCommit && (
                            <div className="p-6 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-3xl flex items-center gap-5">
                                <AlertCircle className="text-rose-500 h-10 w-10 shrink-0" />
                                <div>
                                    <h5 className="font-black text-rose-800 dark:text-rose-400 uppercase tracking-tight italic">Blocked: Verification Failure</h5>
                                    <p className="text-xs text-rose-600 dark:text-rose-400 font-bold mt-1 leading-relaxed">Intelligence conflicts detected in some rows. You must resolve these errors In your spreadsheet or mapping before the ingestion command can be executed.</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
