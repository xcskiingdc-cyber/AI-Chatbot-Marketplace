
import React, { useState, useEffect, useRef } from 'react';
import { ChatSettings, TTSVoices, TTSVoiceName, UserType, ApiConnection, Character, CharacterStat } from '../types';
import { CloseIcon, RefreshIcon, PlayIcon, SpinnerIcon, StopIcon } from './Icons';
import ConfirmationModal from './ConfirmationModal';
import { getTextToSpeech, summarizeNarrativeState } from '../services/aiService';
import { decode, decodeAudioData } from '../utils/audioUtils';

interface ChatSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChatSettings;
  onSave: (settings: ChatSettings) => void;
  onResetChat: () => void;
  userType: UserType;
  apiConnections: ApiConnection[];
  ttsConfig: { connection: ApiConnection, model: string | null } | undefined | null;
  character: Character;
  narrativeState: any;
  summaryConfig: { connection: ApiConnection, model: string | null } | undefined | null;
  characterStats: Record<string, number>;
}

const ChatSettingsModal: React.FC<ChatSettingsModalProps> = ({ isOpen, onClose, settings, onSave, onResetChat, userType, apiConnections, ttsConfig, character, narrativeState, summaryConfig, characterStats }) => {
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
    if (!ttsConfig) {
      alert("No connection with a TTS model is available.");
      return;
    }

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
        const base64Audio = await getTextToSpeech("Hello, this is a test of my voice.", voice, ttsConfig.connection, ttsConfig.model);
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

  const StoryJournal: React.FC<{ data: any }> = ({ data }) => {
    const [summary, setSummary] = useState<string | null>(null);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const hasData = data && Object.keys(data).length > 0;

    useEffect(() => {
        if (hasData && !summary && summaryConfig) {
            setIsSummarizing(true);
            summarizeNarrativeState(data, character.name, summaryConfig.connection, summaryConfig.model)
                .then(setSummary)
                .catch(err => {
                    console.error("Failed to summarize narrative state:", err);
                    setSummary("Could not generate summary.");
                })
                .finally(() => setIsSummarizing(false));
        }
    }, [data, hasData, summary, summaryConfig, character.name]);

    return (
        <div>
            <h3 className="font-medium text-text-primary mb-2">Story Journal</h3>
            <p className="text-xs text-text-secondary mb-2">A summary of important events and choices from your chat, managed by the AI.</p>
            <div className="p-3 bg-primary rounded-md border border-border text-sm max-h-40 overflow-y-auto">
                {isSummarizing ? (
                    <div className="flex items-center justify-center gap-2 text-text-secondary">
                        <SpinnerIcon className="w-4 h-4 animate-spin" />
                        <span>Generating summary...</span>
                    </div>
                ) : hasData && summary ? (
                    <p className="text-sm whitespace-pre-wrap break-words">{summary}</p>
                ) : (
                    <p className="text-xs text-text-secondary italic">No story events recorded yet.</p>
                )}
            </div>
        </div>
    );
  };
  
  const CharacterStats: React.FC<{ stats: CharacterStat[]; currentValues: Record<string, number> }> = ({ stats, currentValues }) => {
    if (!stats || stats.length === 0) {
        return null;
    }
    return (
        <div className="border-t border-border pt-6">
            <h3 className="font-medium text-text-primary mb-2">Character Stats</h3>
            <p className="text-xs text-text-secondary mb-2">Current values based on your interactions.</p>
            <div className="p-3 bg-primary rounded-md border border-border text-sm max-h-40 overflow-y-auto space-y-2">
                {stats.map(stat => (
                    <div key={stat.id} className="flex justify-between items-center">
                        <span className="font-semibold">{stat.name}</span>
                        <span className="font-mono bg-tertiary px-2 py-0.5 rounded">{currentValues[stat.id] ?? stat.initialValue} / {stat.max}</span>
                    </div>
                ))}
            </div>
        </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-40 p-4">
        <div className="bg-gradient-to-b from-primary to-secondary rounded-lg shadow-soft-lg w-full max-w-md relative border border-border">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h2 className="text-xl font-bold text-text-primary">Chat Settings</h2>
            <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            
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
                    disabled={!ttsConfig}
                >
                    {isTestLoading === currentSettings.ttsVoice ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : 
                     isTestPlaying === currentSettings.ttsVoice ? <StopIcon className="w-5 h-5 text-accent-primary" /> :
                     <PlayIcon className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <div className="border-t border-border pt-6">
                <StoryJournal data={narrativeState} />
            </div>
            
            <CharacterStats stats={character.stats} currentValues={characterStats} />

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
