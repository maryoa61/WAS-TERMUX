/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Mobile PWA Confirmation Modal
 * Replaces window.confirm with a dark Termux styled interactive dialog.
 */

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title = 'Confirmation',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 drawer-backdrop">
      <div className="w-full max-w-sm bg-[#0d141e] border border-[#233346] rounded-xl shadow-2xl p-4 text-gray-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-[#1f2d3e]">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${isDestructive ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#1a2533]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="py-3 text-xs text-gray-300 leading-relaxed">{message}</p>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1f2d3e]">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg bg-[#182332] hover:bg-[#202f43] text-gray-300 text-xs font-medium"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-[#00ff88] hover:bg-[#00dd77] text-black'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
