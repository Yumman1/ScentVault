import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { Button } from '../ui/Button';
import { PlusCircle, Pencil, Trash2, Check, X, Tag, Search, FlaskConical } from 'lucide-react';
import { ConfirmationModal } from '../ui/ConfirmationModal';

export const TagsSettings = () => {
  const { 
    olfactiveNotes, addOlfactiveNote, updateOlfactiveNote, 
    deleteOlfactiveNote, perfumes, getPerfumeStockBreakdown
  } = useInventory();
  
  const [newTagName, setNewTagName] = useState('');
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [deleteMsg, setDeleteMsg] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    addOlfactiveNote(newTagName);
    setNewTagName('');
  };

  const startEdit = (tag: string) => {
    setEditingTag(tag);
    setEditValue(tag);
  };

  const saveEdit = () => {
    if (editingTag && editValue.trim()) {
      updateOlfactiveNote(editingTag, editValue);
      setEditingTag(null);
    }
  };

  const handleDelete = (tag: string) => {
    const usageCount = perfumes.filter(p => (p.olfactiveNotes || []).includes(tag)).length;
    const msg = usageCount > 0 
      ? `This note is associated with ${usageCount} perfumes. Removing it will update those records. Proceed with deletion?`
      : `Are you sure you want to permanently delete the note "${tag}" from the library?`;
      
    setNoteToDelete(tag);
    setDeleteMsg(msg);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (noteToDelete) {
      deleteOlfactiveNote(noteToDelete);
      setIsDeleteModalOpen(false);
      setNoteToDelete(null);
    }
  };

  const getUsageCount = (tag: string) => perfumes.filter(p => (p.olfactiveNotes || []).includes(tag)).length;

  const filteredNotes = olfactiveNotes.filter(tag => 
    tag.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Scent Library</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-bold uppercase tracking-widest text-[10px]">Classification & Olfactive Notes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white dark:bg-slate-800 rounded-[3.5rem] shadow-soft border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
          <div className="p-10 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/50 dark:bg-slate-900/50">
            <h3 className="font-black text-slate-900 dark:text-white text-2xl flex items-center gap-3">
                <Tag size={24} className="text-indigo-500" />
                Note Registry
            </h3>
            <div className="flex-1 max-w-xl">
              <form onSubmit={handleAdd} className="flex gap-4">
                <input 
                  type="text" 
                  placeholder="Register new note (e.g., Bergamot)..." 
                  className="flex-1 px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-800 dark:text-slate-200 shadow-sm"
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                />
                <Button type="submit" className="p-5 h-16 w-16 bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 rounded-3xl">
                  <PlusCircle size={28} />
                </Button>
              </form>
            </div>
          </div>

          <div className="p-10 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="relative w-full max-w-md group">
                <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Search scent notes..." 
                    className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
          </div>

          <div className="p-0">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em] border-b border-slate-100 dark:border-slate-700">
                <tr>
                  <th className="px-10 py-6">Scent Note</th>
                  <th className="px-10 py-6 text-center">Associated Perfumes</th>
                  <th className="px-10 py-6 text-right">Reference Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {filteredNotes.map((note) => (
                  <tr key={note} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10 transition-all group">
                    <td className="px-10 py-8">
                       {editingTag === note ? (
                         <div className="flex items-center gap-3">
                            <input 
                                autoFocus
                                className="px-5 py-2 bg-white dark:bg-slate-900 border border-indigo-500 rounded-xl outline-none font-black text-slate-900 dark:text-white shadow-xl shadow-indigo-500/10"
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && saveEdit()}
                            />
                            <button onClick={saveEdit} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl transition-all hover:bg-emerald-100"><Check size={20}/></button>
                            <button onClick={() => setEditingTag(null)} className="p-2 bg-rose-50 text-rose-600 rounded-xl transition-all hover:bg-rose-100"><X size={20}/></button>
                         </div>
                       ) : (
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 rounded-2xl">
                                <Tag size={20} />
                            </div>
                            <span className="font-black text-slate-900 dark:text-white text-xl tracking-tight uppercase">{note}</span>
                        </div>
                       )}
                    </td>
                    <td className="px-10 py-8 text-center">
                        <button 
                          onClick={() => { setSelectedNote(note); setIsDrawerOpen(true); }}
                          className="px-6 py-2 bg-slate-100 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 rounded-2xl text-xs font-black tracking-widest uppercase hover:bg-indigo-50 dark:hover:bg-indigo-900 transition-all border border-slate-200 dark:border-slate-800 flex items-center gap-3 mx-auto"
                        >
                          <FlaskConical size={14} />
                          {getUsageCount(note)} {getUsageCount(note) === 1 ? 'perfume' : 'perfumes'}
                        </button>
                    </td>
                    <td className="px-10 py-8 text-right">
                        <div className={`flex justify-end gap-3 transition-all ${editingTag === note ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'}`}>
                            <button 
                                onClick={(e) => { e.stopPropagation(); startEdit(note); }} 
                                className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all shadow-sm"
                                title="Edit Note"
                            >
                                <Pencil size={18}/>
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDelete(note); }} 
                                className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:text-rose-500 transition-all shadow-sm"
                                title="Delete Note"
                            >
                                <Trash2 size={18}/>
                            </button>
                        </div>
                    </td>
                  </tr>
                ))}
                {filteredNotes.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-10 py-24 text-center text-slate-300 dark:text-slate-600 italic font-black text-2xl">No scent notes found in the library.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Perfume Archive Drawer */}
      <div 
        className={`fixed inset-0 z-50 transition-opacity duration-500 ease-in-out ${isDrawerOpen ? 'bg-slate-950/60 backdrop-blur-sm' : 'bg-transparent pointer-events-none'}`} 
        onClick={() => setIsDrawerOpen(false)}
      />
      <div className={`fixed inset-y-0 right-0 w-full md:w-[600px] bg-slate-900 shadow-[0_0_80px_rgba(0,0,0,0.8)] z-50 transform transition-transform duration-700 cubic-bezier(0.4, 0, 0.2, 1) border-l border-slate-800 ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
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
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-2">Current Load</p>
                                <p className="text-3xl font-black text-indigo-400 tracking-tighter">{stock.toFixed(1)} <span className="text-xs font-normal text-slate-500">kg</span></p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6 pt-8 border-t border-slate-700/40">
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 leading-none">Supplier Hub</p>
                                <p className="text-sm font-bold text-slate-300">{p.supplier}</p>
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

      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        title="Delete Scent Note"
        message={deleteMsg}
        onConfirm={confirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
        confirmText="Remove Permanently"
        type="danger"
      />
    </div>
  );
};