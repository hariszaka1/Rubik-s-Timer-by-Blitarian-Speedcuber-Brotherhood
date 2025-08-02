
import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  // This prevents clicks inside the modal from closing it
  const handleModalContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className="bg-slate-100/80 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-900/10 dark:border-white/20 rounded-lg p-6 sm:p-8 w-full max-w-md text-slate-900 dark:text-slate-200 shadow-2xl m-4"
        onClick={handleModalContentClick}
      >
        <h3 id="modal-title" className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="text-slate-600 dark:text-slate-400 mb-8">{message}</p>
        <div className="flex justify-end gap-4">
          <button 
            onClick={onClose}
            className="px-5 py-2 bg-slate-900/5 dark:bg-white/5 hover:bg-slate-900/10 dark:hover:bg-white/10 active:bg-slate-900/20 dark:active:bg-white/20 text-slate-700 dark:text-slate-300 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg transition-colors font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};