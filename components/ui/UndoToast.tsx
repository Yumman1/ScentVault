import React, { useEffect, useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { RotateCcw, X } from 'lucide-react';

export const UndoToast: React.FC = () => {
  const { canUndo, undoAction } = useInventory();
  const [visible, setVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    if (canUndo) {
      setVisible(true);
      setTimeLeft(30);
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setVisible(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setVisible(false);
    }
  }, [canUndo]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-slate-900 text-white rounded-2xl shadow-2xl p-1 pr-4 flex items-center gap-4 border border-slate-800 backdrop-blur-xl bg-opacity-90">
        <div className="bg-indigo-600 text-white p-3 rounded-xl shadow-lg">
          <RotateCcw size={20} className={timeLeft < 5 ? "animate-spin" : ""} />
        </div>
        <div className="flex-1 pr-2">
          <p className="text-sm font-bold">Action Completed</p>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
            Undo expires in <span className="text-indigo-400 font-mono font-bold">{timeLeft}s</span>
          </p>
        </div>
        <button
          onClick={() => {
            undoAction();
            setVisible(false);
          }}
          className="px-4 py-2 bg-white text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-sm"
        >
          Undo
        </button>
        <button 
          onClick={() => setVisible(false)}
          className="p-1 text-slate-500 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
