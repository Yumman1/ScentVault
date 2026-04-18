import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  ArrowRightLeft,
  X
} from 'lucide-react';

export const QuickActionsFAB: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const actions = [
        { 
            label: 'Internal Transfer', 
            icon: ArrowRightLeft, 
            path: '/transfer', 
            color: 'bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 shadow-indigo-500/30' 
        },
        { 
            label: 'Stock Dispatch', 
            icon: ArrowUpFromLine, 
            path: '/gate-out', 
            color: 'bg-rose-500 dark:bg-rose-600 hover:bg-rose-600 shadow-rose-500/30' 
        },
        { 
            label: 'Gate Inbound', 
            icon: ArrowDownToLine, 
            path: '/gate-in', 
            color: 'bg-emerald-500 dark:bg-emerald-600 hover:bg-emerald-600 shadow-emerald-500/30' 
        },
    ];

    return (
        <div ref={menuRef} className="fixed bottom-10 right-10 z-[100] flex flex-col items-end gap-3 translate-y-2 pointer-events-none">
            {/* Menu Items */}
            <div className={`flex flex-col items-end gap-4 transition-all duration-300 origin-bottom pointer-events-auto ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-10 pointer-events-none'}`}>
                {actions.map((action, idx) => (
                    <button
                        key={idx}
                        onClick={() => {
                            navigate(action.path);
                            setIsOpen(false);
                        }}
                        className="group flex items-center gap-3 pr-2 transition-all hover:-translate-x-1"
                    >
                        <span className="bg-slate-900 dark:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl shadow-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                            {action.label}
                        </span>
                        <div className={`p-4 rounded-2xl text-white shadow-2xl transition-transform hover:scale-110 active:scale-95 ${action.color}`}>
                            <action.icon size={20} className="stroke-[2.5]" />
                        </div>
                    </button>
                ))}
            </div>

            {/* Main Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-16 h-16 rounded-[2rem] flex items-center justify-center text-white shadow-2xl transition-all duration-500 active:scale-90 pointer-events-auto ${isOpen ? 'bg-slate-900 rotate-45' : 'bg-indigo-600 dark:bg-indigo-500 hover:rotate-12'}`}
            >
                {isOpen ? <X size={28} className="stroke-[3]" /> : <Plus size={32} className="stroke-[3]" />}
            </button>
        </div>
    );
};
