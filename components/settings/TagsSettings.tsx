import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { PlusCircle, Pencil, Trash2, Check, X, FlaskConical, Tag } from 'lucide-react';

export const TagsSettings = () => {
  const { olfactiveNotes, addOlfactiveNote, updateOlfactiveNote, deleteOlfactiveNote, perfumes } = useInventory();
  
  const [newTagName, setNewTagName] = useState('');
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

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
      ? `This note is used by ${usageCount} perfumes. Deleting it will remove it from all of them. Proceed?`
      : `Are you sure you want to delete the note "${tag}"?`;
      
    if (window.confirm(msg)) {
      deleteOlfactiveNote(tag);
    }
  };

  const getUsageCount = (tag: string) => perfumes.filter(p => (p.olfactiveNotes || []).includes(tag)).length;

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Fragrance Library</h2>
          <p className="text-slate-500 font-medium mt-1">Manage global olfactive notes and aromatic classifications.</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-soft border border-slate-200 overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
          <form onSubmit={handleAdd} className="flex gap-4">
            <div className="flex-1">
              <input 
                type="text" 
                placeholder="Enter new note name (e.g., Sandalwood, Aquatic)..." 
                className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 shadow-sm"
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
              />
            </div>
            <Button type="submit" className="px-8 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 flex items-center gap-3">
              <PlusCircle size={20} /> Add Note
            </Button>
          </form>
        </div>

        <div className="p-0">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
              <tr>
                <th className="px-10 py-5">Classification</th>
                <th className="px-10 py-5 text-center">Asset Usage</th>
                <th className="px-10 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium">
              {olfactiveNotes.map(tag => (
                <tr key={tag} className="hover:bg-indigo-50/20 transition-all">
                  <td className="px-10 py-5">
                    {editingTag === tag ? (
                      <div className="flex items-center gap-2">
                        <input 
                          autoFocus
                          className="px-3 py-1.5 border border-indigo-500 rounded-lg outline-none font-bold text-slate-900 bg-white shadow-sm ring-4 ring-indigo-500/10"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && saveEdit()}
                        />
                        <button onClick={saveEdit} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100"><Check size={16}/></button>
                        <button onClick={() => setEditingTag(null)} className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100"><X size={16}/></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
                          <Tag size={18} />
                        </div>
                        <span className="font-black text-slate-800 text-lg">{tag}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-10 py-5 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full">
                       <FlaskConical size={12} className="text-slate-400" />
                       <span className="text-xs font-black text-slate-600">{getUsageCount(tag)} perfumes</span>
                    </div>
                  </td>
                  <td className="px-10 py-5 text-right">
                    <div className="flex justify-end gap-3">
                      <button 
                        onClick={() => startEdit(tag)}
                        className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-500 transition-all shadow-sm"
                      >
                        <Pencil size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(tag)}
                        className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-rose-600 hover:border-rose-500 transition-all shadow-sm"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {olfactiveNotes.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-10 py-20 text-center text-slate-300 italic font-medium">
                    No olfactive notes defined in the library.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};