import React, { useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Input: React.FC<InputProps> = ({ label, className, id, ...props }) => {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <div className="mb-4">
      <label
        htmlFor={inputId}
        className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2 ml-0.5"
      >
        {label}
      </label>
      <input
        id={inputId}
        className={`w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-200 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-600 ${className}`}
        {...props}
      />
    </div>
  );
};
