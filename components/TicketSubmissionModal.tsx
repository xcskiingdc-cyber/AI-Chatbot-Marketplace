
import React, { useState } from 'react';
import { User, Ticket } from '../types';
import { CloseIcon, SpinnerIcon } from './Icons';

interface TicketSubmissionModalProps {
  user: User;
  onClose: () => void;
  onSubmit: (ticket: Omit<Ticket, 'id' | 'submitterId' | 'status' | 'timestamp'>) => Promise<void>;
}

const TicketSubmissionModal: React.FC<TicketSubmissionModalProps> = ({ user, onClose, onSubmit }) => {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState(user.profile.email);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subject.trim() && description.trim() && email.trim()) {
        setIsSubmitting(true);
        setError(null);
        try {
            await onSubmit({ subject, description, email });
            // onSubmit in parent handles closing on success
        } catch (err: any) {
            console.error("Ticket submission failed:", err);
            let msg = "Failed to submit ticket.";
            if (err?.message) {
                msg = err.message;
                // Postgrest error details
                if (err.details) msg += ` (${err.details})`;
                if (err.hint) msg += ` Hint: ${err.hint}`;
            } else if (typeof err === 'object') {
                try { msg = JSON.stringify(err); } catch {}
            }
            setError(msg);
        } finally {
            setIsSubmitting(false);
        }
    } else {
      alert("Please fill out all fields.");
    }
  };

  const formFieldClasses = "w-full p-2 bg-secondary border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary text-text-primary";
  const labelClasses = "block text-sm font-medium text-text-secondary mb-1";
  
  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-40 p-4">
      <div className="bg-gradient-to-b from-primary to-secondary rounded-lg shadow-soft-lg w-full max-w-2xl relative border border-border">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="text-xl font-bold text-text-primary">Submit a Support Ticket</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-text-secondary">Have a question, suggestion, or need to appeal a moderation action? Fill out the form below to contact an administrator.</p>
          
          {error && (
            <div className="p-3 bg-danger/20 border border-danger/50 rounded-md text-danger text-sm break-words">
                {error}
            </div>
          )}

          <div>
            <label htmlFor="subject" className={labelClasses}>Subject *</label>
            <input 
              type="text" 
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={formFieldClasses}
              required 
            />
          </div>
          <div>
            <label htmlFor="description" className={labelClasses}>Description *</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={formFieldClasses}
              rows={6}
              required 
            />
          </div>
          <div>
            <label htmlFor="email" className={labelClasses}>Contact Email *</label>
            <input 
              type="email" 
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={formFieldClasses}
              required 
            />
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="px-6 py-2 bg-tertiary hover:bg-hover rounded-md transition-colors" disabled={isSubmitting}>Cancel</button>
            <button 
                type="submit" 
                className="px-6 py-2 bg-accent-secondary hover:bg-accent-secondary-hover text-white rounded-md transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
            >
                {isSubmitting ? (
                    <>
                        <SpinnerIcon className="w-4 h-4 animate-spin" />
                        <span>Sending...</span>
                    </>
                ) : 'Send Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TicketSubmissionModal;
