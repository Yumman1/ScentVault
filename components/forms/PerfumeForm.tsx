import React, { useState, useEffect, useMemo, useLayoutEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { v4 as generateId } from 'uuid';
import { useInventory } from '../../context/InventoryContext';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Pencil, Trash2, X, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { Perfume } from '../../types';

const MASTER_LIST_PAGE_SIZE = 15;

function buildPageList(current: number, total: number): (number | 'gap')[] {
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

export const PerfumeMasterForm = () => {
  const { addPerfume, updatePerfume, deletePerfume, perfumes, suppliers, olfactiveNotes, addOlfactiveNote } = useInventory();
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightRowId, setHighlightRowId] = useState<string | null>(null);
  const [listPage, setListPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initialForm = {
    name: '', code: '', supplierId: '', dosage: '', 
    priceUSD: '', pricePKR: '', lowStockAlert: '', remarks: ''
  };
  const [formData, setFormData] = useState(initialForm);
  
  // Tag system state
  const [currentTag, setCurrentTag] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const handleAddTag = () => {
    if (!currentTag.trim()) return;
    const cleanTag = currentTag.trim();
    
    // Add to global list if not exists
    if (!olfactiveNotes.includes(cleanTag)) {
        addOlfactiveNote(cleanTag);
    }
    
    // Add to local perfume selection
    if (!tags.includes(cleanTag)) {
      setTags([...tags, cleanTag]);
    }
    setCurrentTag('');
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const duplicateCode = perfumes.find(p => 
      p.code.toLowerCase() === formData.code.toLowerCase() && p.id !== editingId
    );

    if (duplicateCode) {
      setError(`Error: Perfume code '${formData.code}' already exists. Please use a unique code.`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const perfumeData = {
      name: formData.name,
      code: formData.code,
      supplierId: formData.supplierId,
      dosage: Number(formData.dosage),
      priceUSD: suppliers.find(s => s.id === formData.supplierId)?.type === 'Local' ? 0 : Number(formData.priceUSD),
      pricePKR: Number(formData.pricePKR),
      lowStockAlert: Number(formData.lowStockAlert),
      olfactiveNotes: tags,
      remarks: formData.remarks
    };

    if (editingId) {
      updatePerfume(editingId, { ...perfumeData, id: editingId });
      setEditingId(null);
      alert('Perfume Updated');
    } else {
      addPerfume({ ...perfumeData, id: generateId() });
      alert('Perfume Added to Master List');
    }
    
    setFormData(initialForm);
    setTags([]);
    setError(null);
  };

  const handleEdit = (perfume: Perfume) => {
    setError(null);
    setFormData({
      name: perfume.name,
      code: perfume.code,
      supplierId: perfume.supplierId,
      dosage: (perfume.dosage || 0).toString(),
      priceUSD: (perfume.priceUSD || 0).toString(),
      pricePKR: (perfume.pricePKR || 0).toString(),
      lowStockAlert: (perfume.lowStockAlert || 0).toString(),
      remarks: perfume.remarks || ''
    });
    setTags(perfume.olfactiveNotes || []);
    setEditingId(perfume.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setFormData(initialForm);
    setTags([]);
    setEditingId(null);
    setError(null);
  };

  const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.name || 'Unknown';

  const highlightParam = searchParams.get('highlight');

  const totalPages = Math.max(1, Math.ceil(perfumes.length / MASTER_LIST_PAGE_SIZE));
  const pageList = useMemo(() => buildPageList(listPage, totalPages), [listPage, totalPages]);

  const paginatedPerfumes = useMemo(() => {
    const start = (listPage - 1) * MASTER_LIST_PAGE_SIZE;
    return perfumes.slice(start, start + MASTER_LIST_PAGE_SIZE);
  }, [perfumes, listPage]);

  useEffect(() => {
    if (listPage > totalPages) setListPage(totalPages);
  }, [listPage, totalPages]);

  useEffect(() => {
    if (!highlightParam) return;
    if (perfumes.length === 0) return;

    const idx = perfumes.findIndex(p => p.id === highlightParam);
    if (idx < 0) {
      setSearchParams({}, { replace: true });
      return;
    }

    setListPage(Math.floor(idx / MASTER_LIST_PAGE_SIZE) + 1);
    setHighlightRowId(highlightParam);

    const clearTimer = window.setTimeout(() => {
      setHighlightRowId(null);
      setSearchParams({}, { replace: true });
    }, 4000);

    return () => window.clearTimeout(clearTimer);
  }, [highlightParam, perfumes, setSearchParams]);

  useLayoutEffect(() => {
    if (!highlightRowId) return;
    const el = document.getElementById(`perfume-master-row-${highlightRowId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightRowId, listPage]);

  return (
    <>
    <div className="space-y-8 w-full max-w-full min-w-0">
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 transition-colors max-w-full min-w-0 box-border">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">{editingId ? 'Edit Perfume' : 'New Perfume'}</h3>
            {editingId && <Button type="button" variant="secondary" onClick={handleCancel} className="text-xs flex items-center gap-1"><X size={14}/> Cancel Edit</Button>}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 flex items-start gap-2 rounded-r">
            <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Validation Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <Input label="Perfume Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
          <Input label="Perfume Code" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} required />
          <Select 
            label="Supplier" 
            options={suppliers.map(s => ({ value: s.id, label: s.name }))}
            value={formData.supplierId}
            onChange={e => setFormData({ ...formData, supplierId: e.target.value })}
            required
          />
          <div className="relative group">
            <Input 
              label="Price (USD)" type="number" step="0.01" 
              value={formData.priceUSD} 
              onChange={e => setFormData({ ...formData, priceUSD: e.target.value })} 
              disabled={suppliers.find(s => s.id === formData.supplierId)?.type === 'Local'}
            />
            {suppliers.find(s => s.id === formData.supplierId)?.type === 'Local' && (
              <div className="absolute top-0 right-0 h-full flex items-center pr-10">
                <span className="text-[8px] font-black text-amber-500 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded uppercase tracking-tighter">Local Source: No USD</span>
              </div>
            )}
          </div>
          <Input 
            label="Price (PKR)" type="number" step="0.01" 
            value={formData.pricePKR} onChange={e => setFormData({ ...formData, pricePKR: e.target.value })} 
          />
          <Input 
            label="Low Stock Alert (KG)" type="number" 
            value={formData.lowStockAlert} onChange={e => setFormData({ ...formData, lowStockAlert: e.target.value })} 
          />
          <Input 
            label="Dosage (%)" type="number" step="0.01" 
            value={formData.dosage} onChange={e => setFormData({ ...formData, dosage: e.target.value })} 
          />
        </div>

        {/* Tags Section */}
        <div className="mt-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Olfactive Notes (Tags)</label>
          <div className="flex gap-2 mb-2">
            <input 
              list="tag-suggestions"
              className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-md shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-200"
              value={currentTag}
              onChange={e => setCurrentTag(e.target.value)}
              placeholder="Type or select a managed note..."
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
            />
            <datalist id="tag-suggestions">
              {olfactiveNotes.map(tag => <option key={tag} value={tag} />)}
            </datalist>
            <Button type="button" onClick={handleAddTag} variant="secondary">Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(tags || []).map(tag => (
              <span key={tag} className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 px-3 py-1 rounded-full text-sm flex items-center gap-1 font-semibold">
                {tag}
                <button type="button" onClick={() => removeTag(tag)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-200 font-bold ml-1">&times;</button>
              </span>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Remarks</label>
          <textarea 
            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary shadow-sm dark:text-slate-200"
            rows={3}
            value={formData.remarks}
            onChange={e => setFormData({ ...formData, remarks: e.target.value })}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit">{editingId ? 'Update Perfume' : 'Save Perfume'}</Button>
        </div>
      </form>

      {/* Perfume List */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden transition-colors max-w-full min-w-0">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-medium text-gray-700 dark:text-slate-200">Perfume Master List</h3>
          {perfumes.length > 0 && (
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums">
              {(listPage - 1) * MASTER_LIST_PAGE_SIZE + 1}
              –{Math.min(listPage * MASTER_LIST_PAGE_SIZE, perfumes.length)} of {perfumes.length}
            </p>
          )}
        </div>
        <div className="overflow-x-auto max-w-full -mx-px">
            <table className="w-full text-sm text-left text-gray-700 dark:text-slate-300 table-auto">
                <thead className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 uppercase bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700 whitespace-nowrap">
                    <tr>
                        <th className="px-2 sm:px-3 py-3">Code</th>
                        <th className="px-2 sm:px-3 py-3 min-w-[6rem]">Name</th>
                        <th className="px-2 sm:px-3 py-3 min-w-[5rem]">Supplier</th>
                        <th className="px-2 sm:px-3 py-3 min-w-[7rem]">Notes</th>
                        <th className="px-2 sm:px-3 py-3 text-right">Dosage</th>
                        <th className="px-2 sm:px-3 py-3 text-right whitespace-nowrap">USD</th>
                        <th className="px-2 sm:px-3 py-3 text-right whitespace-nowrap">PKR</th>
                        <th className="px-2 sm:px-3 py-3 text-right w-px"><span className="sr-only">Actions</span></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {paginatedPerfumes.map(p => (
                        <tr
                          key={p.id}
                          id={`perfume-master-row-${p.id}`}
                          className={`hover:bg-gray-50 dark:hover:bg-slate-900/50 transition-[background-color,box-shadow] duration-500 ${
                            highlightRowId === p.id
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 ring-2 ring-inset ring-indigo-500 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.35)]'
                              : ''
                          }`}
                        >
                            <td className="px-2 sm:px-3 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap tabular-nums">{p.code}</td>
                            <td className="px-2 sm:px-3 py-3 font-medium dark:text-slate-200 max-w-[10rem] sm:max-w-[14rem] truncate" title={p.name}>{p.name}</td>
                            <td className="px-2 sm:px-3 py-3 max-w-[8rem] sm:max-w-[12rem] truncate" title={getSupplierName(p.supplierId)}>{getSupplierName(p.supplierId)}</td>
                            <td className="px-2 sm:px-3 py-3 max-w-[12rem]">
                              <div className="flex flex-wrap gap-1">
                                {(p.olfactiveNotes || []).map((note, idx) => (
                                  <span key={idx} className="bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 text-[10px] px-2 py-0.5 rounded-full font-bold">{note}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-2 sm:px-3 py-3 text-right whitespace-nowrap tabular-nums">
                              {Number(p.dosage) === 0 ? '-' : `${p.dosage}%`}
                            </td>
                            <td className="px-2 sm:px-3 py-3 text-right whitespace-nowrap tabular-nums min-w-[5rem]">
                              {suppliers.find(s => s.id === p.supplierId)?.type === 'Local' ? (
                                <span className="text-gray-400 italic text-xs whitespace-nowrap" title="Local supplier — no USD">local</span>
                              ) : (p.priceUSD || 0) === 0 ? (
                                '-'
                              ) : (
                                `$${(p.priceUSD || 0).toFixed(2)}`
                              )}
                            </td>
                            <td className="px-2 sm:px-3 py-3 text-right whitespace-nowrap tabular-nums min-w-[6.5rem]"><span className="inline-block">Rs. {(p.pricePKR || 0).toLocaleString()}</span></td>
                             <td className="px-2 sm:px-3 py-3 text-right whitespace-nowrap">
                                 <div className="flex justify-end items-center gap-1">
                                   <button
                                     type="button"
                                     aria-label={`Edit ${p.name}`}
                                     title="Edit"
                                     onClick={() => handleEdit(p)}
                                     className="p-2 rounded-xl text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                                   >
                                       <Pencil size={16} strokeWidth={2.25} />
                                   </button>
                                   <button
                                     type="button"
                                     aria-label={`Delete ${p.name}`}
                                     title="Delete"
                                     onClick={() => setDeleteTarget(p.id)}
                                     className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 transition-colors"
                                   >
                                       <Trash2 size={16} strokeWidth={2.25} />
                                   </button>
                                 </div>
                             </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 dark:border-slate-700 bg-gray-50/80 dark:bg-slate-900/40">
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Page {listPage} of {totalPages}
            </p>
            <div className="flex flex-wrap items-center justify-end gap-1">
              <button
                type="button"
                aria-label="First page"
                disabled={listPage <= 1}
                onClick={() => setListPage(1)}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-tight text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                First
              </button>
              <button
                type="button"
                aria-label="Previous page"
                disabled={listPage <= 1}
                onClick={() => setListPage(p => Math.max(1, p - 1))}
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
                      aria-current={item === listPage ? 'page' : undefined}
                      onClick={() => setListPage(item)}
                      className={`min-w-[2.25rem] px-2 py-1.5 rounded-lg text-xs font-black tabular-nums transition-colors ${
                        item === listPage
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
                disabled={listPage >= totalPages}
                onClick={() => setListPage(p => Math.min(totalPages, p + 1))}
                className="p-2 rounded-lg text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <ChevronRight size={18} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                aria-label="Last page"
                disabled={listPage >= totalPages}
                onClick={() => setListPage(totalPages)}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-tight text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    <ConfirmationModal
      isOpen={!!deleteTarget}
      title="Delete Perfume Registration"
      message="This will permanently remove this perfume from the master list. This action can ONLY be performed if there are no historical transaction records linked to this perfume."
      confirmText="Proceed with Deletion"
      type="danger"
      onConfirm={() => {
        if (deletePerfume(deleteTarget!)) {
          setDeleteTarget(null);
        }
      }}
      onCancel={() => setDeleteTarget(null)}
    />
    </>
  );
};