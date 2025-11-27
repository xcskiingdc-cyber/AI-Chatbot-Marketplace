
import React, { useState, useContext } from 'react';
import { Report, ReportReason, ReportableEntityType } from '../types';
import { CloseIcon, SpinnerIcon } from './Icons';
import { AuthContext } from '../context/AuthContext';

interface ReportModalProps {
  reportInfo: Omit<Report, 'id' | 'reporterId' | 'reason' | 'description' | 'timestamp' | 'isResolved' | 'notes'>;
  onClose: () => void;
  onSubmit: (report: Omit<Report, 'id' | 'reporterId' | 'timestamp' | 'isResolved' | 'notes'>) => Promise<void>;
}

const ReportModal: React.FC<ReportModalProps> = ({ reportInfo, onClose, onSubmit }) => {
  const [reason, setReason] = useState<ReportReason>('Other');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const auth = useContext(AuthContext);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth?.currentUser) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
        await onSubmit({
          ...reportInfo,
          reason,
          description
        });
        onClose();
    } catch (err: any) {
        console.error("Report submission failed:", err);
        let msg = "Failed to submit report. Please try again.";
        
        // Extract meaningful message from error object
        if (typeof err === 'string') {
            msg = err;
        } else if (err?.message) {
            msg = err.message;
            if (err.details) msg += ` (${err.details})`;
            if (err.hint) msg += ` Hint: ${err.hint}`;
        } else if (typeof err === 'object') {
            try {
                msg = JSON.stringify(err);
            } catch (e) {}
        }
        
        setError(msg);
    } finally {
        setIsSubmitting(false);
    }
  };

  const reasons: ReportReason[] = ['Underage Content', 'Hate Speech', 'Bullying/Harassment', 'Non-consensual Sexual Acts', 'Spam', 'Impersonation', 'Other'];

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-primary to-secondary rounded-lg shadow-soft-lg w-full max-w-lg relative border border-border">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="text-xl font-bold text-text-primary">Report Content</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <p className="text-sm text-text-secondary">You are reporting a <span className="font-semibold text-text-primary">{reportInfo.entityType}</span>. Please provide details below. Your report is anonymous to the user being reported.</p>
            
            {error && (
                <div className="p-3 bg-danger/20 border border-danger/50 rounded-md text-danger text-sm break-words">
                    {error}
                </div>
            )}

            <div>
                <label htmlFor="reason" className="block text-sm font-medium text-text-secondary mb-1">Reason</label>
                <select 
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value as ReportReason)}
                    className="w-full p-2 bg-secondary border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary"
                >
                    {reasons.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
            </div>
             <div>
                <label htmlFor="description" className="block text-sm font-medium text-text-secondary mb-1">Description (optional)</label>
                <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide any additional details or context here."
                    className="w-full p-2 bg-secondary border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary"
                    rows={4}
                />
            </div>
            <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={onClose} className="px-6 py-2 bg-tertiary hover:bg-hover rounded-md transition-colors" disabled={isSubmitting}>Cancel</button>
                <button 
                    type="submit" 
                    className="px-6 py-2 bg-danger hover:opacity-90 text-white rounded-md transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <>
                            <SpinnerIcon className="w-4 h-4 animate-spin" />
                            <span>Submitting...</span>
                        </>
                    ) : 'Submit Report'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default ReportModal;
