import React, { useState, useEffect } from 'react';
import { Button } from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  requireVerification?: string;
  danger?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  requireVerification,
  danger = false,
}) => {
  const [verificationInput, setVerificationInput] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    } else {
      setTimeout(() => setIsAnimating(false), 200);
    }
  }, [isOpen]);

  if (!isOpen && !isAnimating) return null;

  const handleConfirm = () => {
    if (requireVerification && verificationInput !== requireVerification) return;
    onConfirm();
    onClose();
    setVerificationInput('');
  };

  const isConfirmDisabled = requireVerification ? verificationInput !== requireVerification : false;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <div className={`relative w-full max-w-md overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-2xl transition-all duration-300 transform ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
        {/* Header */}
        <div className={`px-6 py-4 ${danger ? 'bg-red-950/30' : 'bg-slate-800/50'}`}>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            {danger && (
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            {title}
          </h3>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-slate-300 leading-relaxed mb-6">
            {message}
          </p>

          {requireVerification && (
            <div className="mb-6 space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Type <span className="text-red-400 font-bold">"{requireVerification}"</span> to authorize
              </label>
              <input
                type="text"
                value={verificationInput}
                onChange={(e) => setVerificationInput(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-2 text-white placeholder-slate-600 outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50"
                placeholder={`Enter "${requireVerification}"`}
                autoFocus
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="ghost"
              onClick={onClose}
              className="px-4 py-2 text-slate-300 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              variant={danger ? 'danger' : 'primary'}
              onClick={handleConfirm}
              disabled={isConfirmDisabled}
              className={`px-6 py-2 ${danger && !isConfirmDisabled ? 'animate-pulse' : ''}`}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
