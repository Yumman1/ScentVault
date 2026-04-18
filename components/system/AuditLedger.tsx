import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { 
  History, Search, Filter, Calendar, User, 
  Database, ArrowLeft, ArrowRight, Clock,
  Plus, Pencil, Trash2, RotateCcw
} from 'lucide-react';
import { AuditAction, AuditEntity } from '../../types';

export const AuditLedger = () => {
  const { auditLogs } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.details.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.entityId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = !actionFilter || log.action === actionFilter;
    const matchesEntity = !entityFilter || log.entity === entityFilter;
    return matchesSearch && matchesAction && matchesEntity;
  });

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getActionIcon = (action: AuditAction) => {
    switch (action) {
      case AuditAction.Create: return <Plus size={14} className="text-emerald-500" />;
      case AuditAction.Update: return <Pencil size={14} className="text-amber-500" />;
      case AuditAction.Delete: return <Trash2 size={14} className="text-rose-500" />;
      case AuditAction.Undo: return <RotateCcw size={14} className="text-indigo-500" />;
      default: return <Clock size={14} className="text-slate-400" />;
    }
  };

  const getEntityLabel = (entity: AuditEntity) => {
      return entity.replace('_', ' ');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">System Audit Ledger</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Immutable record of all system operations and configuration changes.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-soft border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/30">
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search by user, action details, or ID..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-sm text-slate-700 dark:text-slate-200"
                    />
                </div>
                <select 
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                    className="px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-700 dark:text-slate-200 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10"
                >
                    <option value="">All Actions</option>
                    {Object.values(AuditAction).map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <select 
                    value={entityFilter}
                    onChange={(e) => setEntityFilter(e.target.value)}
                    className="px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-700 dark:text-slate-200 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10"
                >
                    <option value="">All Entities</option>
                    {Object.values(AuditEntity).map(e => <option key={e} value={e}>{getEntityLabel(e)}</option>)}
                </select>
            </div>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
                    <tr>
                        <th className="px-8 py-5">Timestamp</th>
                        <th className="px-8 py-5">User</th>
                        <th className="px-8 py-5">Action</th>
                        <th className="px-8 py-5">Entity</th>
                        <th className="px-8 py-5">Details</th>
                        <th className="px-8 py-5">Reference ID</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50 font-medium text-slate-600 dark:text-slate-400">
                    {paginatedLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-5">
                                <div className="text-[11px] font-mono font-bold text-slate-400">
                                    {new Date(log.timestamp).toLocaleString()}
                                </div>
                            </td>
                            <td className="px-8 py-5">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                                        {log.userName.charAt(0)}
                                    </div>
                                    <span className="text-slate-900 dark:text-slate-200 font-bold">{log.userName}</span>
                                </div>
                            </td>
                            <td className="px-8 py-5">
                                <div className="flex items-center gap-2">
                                    {getActionIcon(log.action)}
                                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">{log.action}</span>
                                </div>
                            </td>
                            <td className="px-8 py-5">
                                <span className="bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter text-slate-500 dark:text-slate-400">
                                    {getEntityLabel(log.entity)}
                                </span>
                            </td>
                            <td className="px-8 py-5">
                                <span className="text-slate-700 dark:text-slate-300">{log.details}</span>
                            </td>
                            <td className="px-8 py-5">
                                <code className="text-[10px] bg-slate-50 dark:bg-slate-900 p-1 rounded font-mono text-slate-400 dark:text-slate-600">{log.entityId}</code>
                            </td>
                        </tr>
                    ))}
                    {filteredLogs.length === 0 && (
                        <tr>
                            <td colSpan={6} className="px-8 py-20 text-center text-slate-400 italic">
                                No audit records found matching your criteria.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
            <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/30 flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500">
                    Showing <span className="text-slate-900 dark:text-slate-200">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-900 dark:text-slate-200">{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</span> of <span className="text-slate-900 dark:text-slate-200">{filteredLogs.length}</span> records
                </p>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-400"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    {[...Array(totalPages)].map((_, i) => {
                        const page = i + 1;
                        // Only show first, last, and pages around current
                        if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                            return (
                                <button 
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`w-9 h-9 rounded-xl border font-bold text-xs transition-all ${currentPage === page ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'}`}
                                >
                                    {page}
                                </button>
                            );
                        }
                        if (page === currentPage - 2 || page === currentPage + 2) {
                            return <span key={page} className="flex items-center justify-center w-9 h-9 text-slate-400">...</span>;
                        }
                        return null;
                    })}
                    <button 
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-400"
                    >
                        <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
