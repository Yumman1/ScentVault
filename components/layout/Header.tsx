import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventory } from '../../context/InventoryContext';
import { 
  Search, 
  ChevronDown, 
  CheckCircle2,
  FlaskConical,
  Truck,
  Users,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface HeaderProps {
  currentView: string;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  currentView, 
  searchTerm, 
  setSearchTerm 
}) => {
  const { 
    users, currentUser, setCurrentUser, 
    perfumes, suppliers, customers, 
    getPerfumeStockBreakdown 
  } = useInventory();
  const { user: authUser, profile, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const results = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return null;

    const term = searchTerm.toLowerCase();
    
    return {
      perfumes: perfumes.filter(p => p.name.toLowerCase().includes(term) || p.code.toLowerCase().includes(term)).slice(0, 3),
      suppliers: suppliers.filter(s => s.name.toLowerCase().includes(term)).slice(0, 2),
      customers: customers.filter(c => c.name.toLowerCase().includes(term)).slice(0, 2)
    };
  }, [searchTerm, perfumes, suppliers, customers]);

  const hasResults = results && (results.perfumes.length > 0 || results.suppliers.length > 0 || results.customers.length > 0);

  const sessionEmail = authUser?.email?.trim() || '';
  const displayName =
    (currentUser?.name || profile?.name || '').trim() ||
    (typeof authUser?.user_metadata?.name === 'string' ? authUser.user_metadata.name.trim() : '') ||
    sessionEmail ||
    'Account';
  const displayRole = currentUser?.role ?? profile?.role;
  const headerSubline = displayRole || sessionEmail;

  return (
    <header className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 h-24 flex items-center px-12 justify-between">
      <div className="flex items-center gap-8">
          <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter capitalize border-l-4 border-indigo-600 pl-4 py-1">
              {currentView.replace('-', ' ')}
          </span>
          
          <div className="relative group" ref={searchRef}>
            <div className="hidden lg:flex items-center gap-4 bg-slate-100 dark:bg-slate-800 px-6 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all">
                <Search size={18} className="text-slate-400" />
                <input 
                  id="global-search"
                  type="text" 
                  placeholder="Global Intelligence Search..." 
                  className="text-sm font-bold outline-none w-64 bg-transparent text-slate-700 dark:text-slate-200" 
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => setShowSearchResults(true)}
                />
                <div className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-700 text-slate-400 dark:text-slate-500 rounded-md border border-slate-200 dark:border-slate-600 text-[10px] font-black">
                    <span className="text-[8px]">CTRL</span>K
                </div>
            </div>

            {showSearchResults && hasResults && (
              <div className="absolute top-full left-0 mt-3 w-[400px] bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 py-4 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="px-6 py-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Command Search Results</p>
                  
                  {results.perfumes.length > 0 && (
                    <div className="mb-4">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <FlaskConical size={12} /> Perfumes
                      </p>
                      <div className="space-y-1">
                        {results.perfumes.map(p => {
                          const stock = getPerfumeStockBreakdown(p.id).reduce((acc, b) => acc + b.weight, 0);
                          const supplierName = suppliers.find(s => s.id === p.supplierId)?.name || 'Unknown';
                          return (
                            <button 
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setShowSearchResults(false);
                                setSearchTerm('');
                                if (currentUser?.role === UserRole.Admin) {
                                  navigate(`/perfumes?highlight=${encodeURIComponent(p.id)}`);
                                } else {
                                  navigate('/reports');
                                }
                              }}
                              className="w-full text-left p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group flex justify-between items-center gap-3"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-black text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 break-words">
                                  {p.name}{' '}
                                  <span className="text-slate-500 dark:text-slate-400 font-bold">({supplierName})</span>
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 mt-0.5">{p.code}</p>
                              </div>
                              <div className={`px-2 py-1 rounded-lg text-[10px] font-black ${stock <= (p.lowStockAlert || 0) ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600'}`}>
                                {stock.toFixed(1)} KG
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {results.suppliers.length > 0 && (
                    <div className="mb-4">
                      <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Truck size={12} /> Suppliers
                      </p>
                      <div className="space-y-1">
                        {results.suppliers.map(s => (
                          <button 
                            key={s.id}
                            onClick={() => { 
                              navigate(`/reports?tab=capital&supplier=${encodeURIComponent(s.name)}`); 
                              setShowSearchResults(false); 
                            }}
                            className="w-full text-left p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all group"
                          >
                            <p className="text-sm font-black text-slate-700 dark:text-slate-200 group-hover:text-indigo-600">{s.name}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {results.customers.length > 0 && (
                    <div className="mb-2">
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Users size={12} /> Customers
                      </p>
                      <div className="space-y-1">
                        {results.customers.map(c => (
                          <button 
                            key={c.id}
                            onClick={() => { navigate('/customers'); setShowSearchResults(false); }}
                            className="w-full text-left p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all group"
                          >
                            <p className="text-sm font-black text-slate-700 dark:text-slate-200 group-hover:text-indigo-600">{c.name}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
      </div>
      
      <div className="flex items-center gap-8">
        <div className="relative">
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all pl-1.5 pr-5 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 group shadow-sm"
            >
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-sm shadow-xl">
                    {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="text-left min-w-0 max-w-[200px]">
                    <p className="text-sm font-black text-slate-900 dark:text-slate-100 leading-none truncate" title={sessionEmail || displayName}>
                      {displayName}
                    </p>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 truncate" title={headerSubline}>
                      {headerSubline}
                    </p>
                </div>
                <ChevronDown size={16} className="text-slate-300 group-hover:text-indigo-600 transition-all" />
            </button>

            {showUserMenu && (
                <div className="absolute right-0 mt-4 w-64 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 py-3 animate-in slide-in-from-top-4 duration-300 ring-1 ring-slate-900/5">
                    <div className="px-5 py-4 border-b border-slate-50 dark:border-slate-700 mb-2 space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Signed in as</p>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate" title={sessionEmail}>
                          {sessionEmail || '—'}
                        </p>
                        <p className="text-[10px] text-slate-400 leading-snug">
                          Below switches which profile the UI uses (same Supabase login).
                        </p>
                    </div>
                    {users.map(u => (
                        <button 
                          key={u.id}
                          onClick={() => { setCurrentUser(u); setShowUserMenu(false); navigate('/dashboard'); }}
                          className={`w-full text-left px-5 py-3.5 text-sm flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all ${currentUser?.id === u.id ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}
                        >
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black ${currentUser?.id === u.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500'}`}>
                                {u.name?.charAt(0) || '?'}
                            </div>
                            <div className="flex-1">
                                <p className={`font-black dark:text-slate-200 ${currentUser?.id === u.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700'}`}>{u.name?.trim() || `User (${u.id.slice(0, 8)}…)`}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">{u.role}</p>
                            </div>
                            {currentUser?.id === u.id && <CheckCircle2 size={16} className="text-indigo-600" />}
                        </button>
                    ))}
                    <div className="mt-2 border-t border-slate-100 dark:border-slate-700 pt-2 px-2">
                      <button
                        type="button"
                        onClick={async () => {
                          setShowUserMenu(false);
                          await signOut();
                          navigate('/', { replace: true });
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <LogOut size={16} strokeWidth={2.5} />
                        Sign out
                      </button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </header>
  );
};
