import React from 'react';
import { Button } from './Button';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger'
}) => {
  if (!isOpen) return null;

  const colorClass = type === 'danger' ? 'text-rose-500 bg-rose-50 dark:bg-rose-900/20' : 
                    type === 'warning' ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 
                    'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20';

  const btnClass = type === 'danger' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20' : 
                   type === 'warning' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20' : 
                   'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onCancel}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div className={`p-4 rounded-2xl ${colorClass}`}>
              <AlertCircle size={28} />
            </div>
            <button 
              onClick={onCancel}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight leading-none">
            {title}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            {message}
          </p>
        </div>
        
        <div className="p-8 bg-slate-50 dark:bg-slate-950/50 flex gap-4">
          <button 
            onClick={onCancel}
            className="flex-1 px-6 py-4 rounded-2xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-800"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            className={`flex-1 px-6 py-4 rounded-2xl font-bold text-white shadow-xl transition-all ${btnClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
