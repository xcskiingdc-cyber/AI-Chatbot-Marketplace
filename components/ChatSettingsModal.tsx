

import React, { useState, useEffect, useRef } from 'react';
// FIX: Add ApiConnection to types and correct import path for getTextToSpeech
import { ChatSettings, TTSVoices, TTSVoiceName, UserType, ApiConnection } from '../types';
import { CloseIcon, RefreshIcon, PlayIcon, SpinnerIcon, StopIcon } from './Icons';
import ConfirmationModal from './ConfirmationModal';
import { getTextToSpeech } from '../services/aiService';
import { decode, decodeAudioData } from '../utils/audioUtils';

interface ChatSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChatSettings;
  onSave: (settings: ChatSettings) => void;
  onResetChat: () => void;
  userType: UserType;
  // FIX: Add activeConnection to props to be used for API calls
  activeConnection: ApiConnection;
}

const ChatSettingsModal: React.FC<ChatSettingsModalProps> = ({ isOpen, onClose, settings, onSave, onResetChat, userType, activeConnection }) => {
  const [currentSettings, setCurrentSettings] = useState<ChatSettings>(settings);
  const [isResetModalOpen, setResetModalOpen] = useState(false);
  
  const [isTestPlaying, setIsTestPlaying] = useState<TTSVoiceName | null>(null);
  const [isTestLoading, setIsTestLoading] = useState<TTSVoiceName | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeTestSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    setCurrentSettings(settings);
  }, [settings]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
        if (activeTestSourceRef.current) {
            activeTestSourceRef.current.stop();
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
    }
  }, []);

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

  const playTestVoice = async (voice: TTSVoiceName) => {
    if (isTestPlaying === voice) {
        if(activeTestSourceRef.current) {
            activeTestSourceRef.current.stop();
        }
        setIsTestPlaying(null);
        return;
    }

    if (activeTestSourceRef.current) {
        activeTestSourceRef.current.stop();
    }
    
    setIsTestLoading(voice);
    try {
        // FIX: Pass activeConnection to the API service function.
        const base64Audio = await getTextToSpeech("Hello, this is a test of my voice.", voice, activeConnection);
        if (base64Audio) {
            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            const audioData = decode(base64Audio);
            const audioBuffer = await decodeAudioData(audioData, audioContextRef.current, 24000, 1);
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);
            
            source.onended = () => {
                setIsTestPlaying(null);
                activeTestSourceRef.current = null;
            }
            
            activeTestSourceRef.current = source;
            source.start();
            setIsTestPlaying(voice);
        }
    } catch (e) {
        console.error("Failed to play test voice", e);
    } finally {
        setIsTestLoading(null);
    }
  }
  
  const formFieldClasses = "w-full p-2 bg-secondary border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary disabled:opacity-50 disabled:cursor-not-allowed";
  const labelClasses = "block text-sm font-medium text-text-secondary mb-1";
  
  const canUsePro = userType !== 'Free';
  const availableModels = activeConnection.models || [];

  return (
    <>
      <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-40 p-4">
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
              <div className="relative cursor-pointer" onClick={() => handleSettingChange('isStreaming', !currentSettings.isStreaming)}>
                <input type="checkbox" id="isStreaming" name="isStreaming" checked={currentSettings.isStreaming} readOnly className="sr-only" />
                <div className={`block w-14 h-8 rounded-full ${currentSettings.isStreaming ? 'bg-accent-primary' : 'bg-tertiary'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${currentSettings.isStreaming ? 'transform translate-x-6' : ''}`}></div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="kidMode" className="font-medium text-text-primary">
                Kid Mode
                <p className="text-xs text-text-secondary">AI uses simpler language.</p>
              </label>
              <div className="relative cursor-pointer" onClick={() => handleSettingChange('kidMode', !currentSettings.kidMode)}>
                <input type="checkbox" id="kidMode" name="kidMode" checked={currentSettings.kidMode} readOnly className="sr-only" />
                <div className={`block w-14 h-8 rounded-full ${currentSettings.kidMode ? 'bg-accent-primary' : 'bg-tertiary'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${currentSettings.kidMode ? 'transform translate-x-6' : ''}`}></div>
              </div>
            </div>

            <div>
              <label htmlFor="model" className={labelClasses}>AI Model</label>
              <select 
                id="model" 
                name="model" 
                value={currentSettings.model} 
                onChange={(e) => handleSettingChange('model', e.target.value)} 
                className={formFieldClasses}>
                {availableModels.map(modelName => {
                    const isProModel = modelName.toLowerCase().includes('pro');
                    const isDisabled = isProModel && !canUsePro;
                    return (
                        <option key={modelName} value={modelName} disabled={isDisabled}>
                            {modelName} {isDisabled && '(Subscription required)'}
                        </option>
                    );
                })}
              </select>
               {!canUsePro && <p className="text-xs text-text-secondary mt-1">Upgrade to a Subscription or Ad-supported plan to use Pro models.</p>}
            </div>

            <div>
              <label htmlFor="ttsVoice" className={labelClasses}>Text-to-Speech Voice</label>
              <div className="flex items-center gap-2">
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
                <button 
                    onClick={() => playTestVoice(currentSettings.ttsVoice)}
                    className="p-2 bg-tertiary rounded-md hover:bg-hover transition-colors"
                    aria-label="Test Voice"
                >
                    {isTestLoading === currentSettings.ttsVoice ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : 
                     isTestPlaying === currentSettings.ttsVoice ? <StopIcon className="w-5 h-5 text-accent-primary" /> :
                     <PlayIcon className="w-5 h-5" />}
                </button>
              </div>
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