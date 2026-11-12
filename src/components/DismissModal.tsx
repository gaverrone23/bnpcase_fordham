import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

interface DismissModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  clientName: string;
}

const PRESET_REASONS = [
  'Client already hedged / executed via competitor',
  'Exposure volume below treasury materiality threshold',
  'Commercial timing mismatch / project delivery rescheduled',
  'Client treasury leadership requested temporary moratorium',
  'Internal relationship conflict / pending group credit review',
];

export const DismissModal: React.FC<DismissModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  clientName,
}) => {
  const [selectedReason, setSelectedReason] = useState(PRESET_REASONS[0]);
  const [customNote, setCustomNote] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = customNote.trim()
      ? `${selectedReason} — Note: ${customNote.trim()}`
      : selectedReason;
    onConfirm(finalReason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Dismiss Opportunity: {clientName}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed">
            Record a compliant audit explanation for excluding this recommendation from outreach. This provides a transparent record for portfolio coverage reviews.
          </p>

          <div className="space-y-2">
            <label className="font-semibold text-slate-800 block">
              Audit Reason Category:
            </label>
            <div className="space-y-1.5">
              {PRESET_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={`flex items-start gap-2.5 p-2 rounded border cursor-pointer transition-colors ${
                    selectedReason === reason
                      ? 'bg-rose-50/50 border-rose-300 text-slate-900 font-medium'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="dismissReason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={() => setSelectedReason(reason)}
                    className="mt-0.5 text-rose-600 focus:ring-rose-500"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-800 block">
              Additional Context / RM Note (Optional):
            </label>
            <textarea
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="e.g. Discussed with CFO on off-record call; already placed forward layer with local bank."
              rows={2}
              className="w-full p-2.5 rounded border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 transition-colors shadow-xs cursor-pointer"
            >
              Confirm Dismissal
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
