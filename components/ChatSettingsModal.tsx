import React, { useState, useEffect } from 'react';
import { ChatSettings, LLMModel, TTSVoices, TTSVoiceName, UserType } from '../types';
import { CloseIcon, RefreshIcon } from './Icons';
import ConfirmationModal from './ConfirmationModal';

interface ChatSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChatSettings;
  onSave: (settings: ChatSettings) => void;
  onResetChat: () => void;
  userType: UserType;
}

const ChatSettingsModal: React.FC<ChatSettingsModalProps> = ({ isOpen, onClose, settings, onSave, onResetChat, userType }) => {
  const [currentSettings, setCurrentSettings] = useState<ChatSettings>(settings);
  const [isResetModalOpen, setResetModalOpen] = useState(false);

  useEffect(() => {
    setCurrentSettings(settings);
  }, [settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(currentSettings);
  };
  
  const handleResetConfirm = () => {
    onResetChat();
    setResetModalOpen(false);
  };

  const handleSettingChange = <K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => {
    setCurrentSettings(prev => ({ ...prev, [key]: value }));
  };
  
  const formFieldClasses = "w-full p-2 bg-secondary border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary disabled:opacity-50 disabled:cursor-not-allowed";
  const labelClasses = "block text-sm font-medium text-text-secondary mb-1";
  
  const canUsePro = userType !== 'Free';

  return (
    <>
      <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
        <div className="bg-primary rounded-lg shadow-xl w-full max-w-md relative border border-border">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h2 className="text-xl font-bold text-text-primary">Chat Settings</h2>
            <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>
          <div className="p-6 space-y-6">
            
            <div className="flex items-center justify-between">
              <label htmlFor="isStreaming" className="font-medium text-text-primary">
                Streaming Replies
                <p className="text-xs text-text-secondary">Receive replies word-by-word.</p>
              </label>
              <div className="relative">
                <input type="checkbox" id="isStreaming" name="isStreaming" 
                       checked={currentSettings.isStreaming} 
                       onChange={(e) => handleSettingChange('isStreaming', e.target.checked)} 
                       className="sr-only" />
                <div className={`block w-14 h-8 rounded-full ${currentSettings.isStreaming ? 'bg-accent-primary' : 'bg-tertiary'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${currentSettings.isStreaming ? 'transform translate-x-6' : ''}`}></div>
              </div>
            </div>

            <div>
              <label htmlFor="model" className={labelClasses}>AI Model</label>
              <select 
                id="model" 
                name="model" 
                value={currentSettings.model} 
                onChange={(e) => handleSettingChange('model', e.target.value as LLMModel)} 
                className={formFieldClasses}>
                <option value={LLMModel.GEMINI_FLASH}>Gemini 2.5 Flash</option>
                <option value={LLMModel.GEMINI_PRO} disabled={!canUsePro}>
                    Gemini 2.5 Pro { !canUsePro && '(Subscription required)' }
                </option>
              </select>
               {!canUsePro && <p className="text-xs text-text-secondary mt-1">Upgrade to a Subscription or Ad-supported plan to use Pro models.</p>}
            </div>

            <div>
              <label htmlFor="ttsVoice" className={labelClasses}>Text-to-Speech Voice</label>
              <select 
                id="ttsVoice" 
                name="ttsVoice" 
                value={currentSettings.ttsVoice} 
                onChange={(e) => handleSettingChange('ttsVoice', e.target.value as TTSVoiceName)} 
                className={formFieldClasses}>
                {Object.entries(TTSVoices).map(([key, value]) => (
                  <option key={key} value={key}>{value}</option>
                ))}
              </select>
            </div>

            <div className="border-t border-border pt-6">
                 <button 
                    onClick={() => setResetModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-400 bg-red-900/50 hover:bg-red-900/80 rounded-md transition-colors"
                  >
                    <RefreshIcon className="w-5 h-5" />
                    Reset Chat History
                </button>
            </div>
            
          </div>
          <div className="p-4 bg-secondary/50 border-t border-border flex justify-end gap-4">
            <button type="button" onClick={onClose} className="px-6 py-2 bg-tertiary hover:bg-hover rounded-md transition-colors">Cancel</button>
            <button type="button" onClick={handleSave} className="px-6 py-2 bg-accent-secondary hover:bg-accent-secondary-hover text-white rounded-md transition-colors">Save Settings</button>
          </div>
        </div>
      </div>
      {isResetModalOpen && (
        <ConfirmationModal
            title="Reset Chat?"
            message="Are you sure you want to delete the entire chat history with this character? This action cannot be undone."
            confirmText="Reset"
            onConfirm={handleResetConfirm}
            onCancel={() => setResetModalOpen(false)}
        />
       )}
    </>
  );
};

export default ChatSettingsModal;