
import React, { useState, useRef, useEffect, useContext } from 'react';
import type { Character, ChatMessage, ChatSettings, User } from '../types';
import { SendIcon, SpinnerIcon, StopIcon, RefreshIcon, SettingsIcon, MicrophoneIcon } from './Icons';
import Message from './Message';
import { AuthContext } from '../context/AuthContext';
import { generateChatResponseWithStats, getTextToSpeech } from '../services/aiService';
import { decode, decodeAudioData } from '../utils/audioUtils';
import ChatSettingsModal from './ChatSettingsModal';

interface ChatViewProps {
  character: Character;
  chatHistory: ChatMessage[];
  updateChatHistory: (characterId: string, newHistory: ChatMessage[]) => void;
  onReportMessage: (message: ChatMessage) => void;
  onCharacterSelect?: (character: Character) => void;
}

const ChatView: React.FC<ChatViewProps> = ({ character, chatHistory, updateChatHistory, onReportMessage, onCharacterSelect }) => {
  const auth = useContext(AuthContext);
  const { 
      currentUser, 
      globalSettings, 
      aiContextSettings, 
      findConnectionForModel, 
      userCharacterData, 
      saveUserCharacterData, 
      getToolConfig 
  } = auth || {};

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTtsPlaying, setIsTtsPlaying] = useState(false);
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Ensure chatHistory is an array to prevent crashes
  const messages = Array.isArray(chatHistory) ? chatHistory : [];
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Derived state for user-specific character data
  const userCharData = userCharacterData?.[currentUser?.id || '']?.[character.id] || {};
  const chatSettings: ChatSettings = userCharData.settings || {
      model: character.model,
      isStreaming: false,
      ttsVoice: 'Kore',
      kidMode: false
  };
  const narrativeState = userCharData.narrative_state || {};
  const userStats = userCharData.stats || {};

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
      // Auto-greeting
      if (messages.length === 0 && character.greeting) {
          const greetingMsg: ChatMessage = {
              id: crypto.randomUUID(),
              sender: 'bot',
              text: character.greeting,
              timestamp: Date.now()
          };
          updateChatHistory(character.id, [greetingMsg]);
      }
  }, [character.id, messages.length, character.greeting]);

  useEffect(() => {
      // Cleanup audio on unmount
      return () => stopAudio();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const stopAudio = () => {
      if (activeSourceRef.current) {
          activeSourceRef.current.stop();
          activeSourceRef.current = null;
      }
      setIsTtsPlaying(false);
      setIsTtsLoading(false);
  };

  const handleSettingsSave = async (newSettings: ChatSettings) => {
      if (saveUserCharacterData && currentUser) {
          await saveUserCharacterData(currentUser.id, character.id, { settings: newSettings });
      }
      setIsSettingsOpen(false);
  };

  const handleResetChat = () => {
      updateChatHistory(character.id, []);
      if (saveUserCharacterData && currentUser) {
          // Reset stats and narrative state as well
          saveUserCharacterData(currentUser.id, character.id, { stats: {}, narrative_state: {} });
      }
  };

  const handlePlayTTS = async (text: string, messageId: string) => {
      if (isTtsPlaying) {
          stopAudio();
          return;
      }

      const ttsConfig = getToolConfig?.('textToSpeech');
      if (!ttsConfig || !ttsConfig.connection) {
          alert("TTS is not configured. Please check API Settings.");
          return;
      }

      setIsTtsLoading(true);
      try {
          const base64Audio = await getTextToSpeech(text, chatSettings.ttsVoice, ttsConfig.connection, ttsConfig.model);
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
                  setIsTtsPlaying(false);
                  activeSourceRef.current = null;
              };
              
              activeSourceRef.current = source;
              source.start();
              setIsTtsPlaying(true);
          }
      } catch (error) {
          console.error("TTS Error:", error);
          alert("Failed to play audio.");
      } finally {
          setIsTtsLoading(false);
      }
  };

  const handleSendMessage = async () => {
      if (!inputText.trim() || !currentUser || !globalSettings || !aiContextSettings || !findConnectionForModel) return;

      const text = inputText.trim();
      setInputText('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';

      const newUserMessage: ChatMessage = {
          id: crypto.randomUUID(),
          sender: 'user',
          text: text,
          timestamp: Date.now()
      };

      const newHistory = [...messages, newUserMessage];
      updateChatHistory(character.id, newHistory);
      setIsLoading(true);

      try {
          // 1. Resolve Connection & Model Name
          let modelName = chatSettings.model;
          let connection = findConnectionForModel(modelName);
          
          // 2. Fallback: Check Tool Config if specific model connection not found
          if (!connection) {
              const chatToolConfig = getToolConfig?.('aiCharacterChat');
              if (chatToolConfig && chatToolConfig.connection) {
                  connection = chatToolConfig.connection;
                  
                  // If the tool config prescribes a model, adopt it
                  if (chatToolConfig.model) {
                      modelName = chatToolConfig.model;
                  } 
                  // If the tool config connection doesn't support the requested model, pick the first available
                  else if (connection.models.length > 0 && (!modelName || !connection.models.includes(modelName))) {
                      modelName = connection.models[0];
                  }
              }
          }

          // 3. Fallback: Default Connection (if defined in AuthContext) or just pick default from active
          if (!connection && auth?.defaultApiConnectionId) {
             const defaultConn = auth.apiConnections.find(c => c.id === auth.defaultApiConnectionId);
             if (defaultConn && defaultConn.isActive) {
                 connection = defaultConn;
                 if (defaultConn.models.length > 0 && (!modelName || !defaultConn.models.includes(modelName))) {
                     modelName = defaultConn.models[0];
                 }
             }
          }

          // 4. Final Checks
          if (!connection) {
              throw new Error(`No active API connection found. Please check AI API Settings.`);
          }
          
          // Ensure we have a valid model name to send
          if (!modelName && connection.models.length > 0) {
              modelName = connection.models[0];
          }

          if (!modelName) {
              throw new Error(`No AI model selected and connection '${connection.name}' has no models configured.`);
          }

          const { responseText, statChanges, newNarrativeState } = await generateChatResponseWithStats(
              character,
              newHistory,
              currentUser,
              globalSettings,
              aiContextSettings,
              chatSettings.kidMode,
              modelName,
              userStats,
              narrativeState,
              connection
          );

          const newBotMessage: ChatMessage = {
              id: crypto.randomUUID(),
              sender: 'bot',
              text: responseText,
              timestamp: Date.now()
          };

          updateChatHistory(character.id, [...newHistory, newBotMessage]);

          // Update stats and narrative state if they changed
          if (saveUserCharacterData && (statChanges.length > 0 || newNarrativeState)) {
              const updatedStats = { ...userStats };
              statChanges.forEach(change => {
                  const currentVal = updatedStats[change.statId] ?? character.stats.find(s => s.id === change.statId)?.initialValue ?? 0;
                  updatedStats[change.statId] = currentVal + change.valueChange;
              });
              
              // Merge narrative events
              const updatedNarrative = { ...narrativeState };
              if (newNarrativeState && newNarrativeState.events) {
                  updatedNarrative.events = [...(updatedNarrative.events || []), ...newNarrativeState.events];
              }

              await saveUserCharacterData(currentUser.id, character.id, { 
                  stats: updatedStats, 
                  narrative_state: updatedNarrative 
              });
          }

      } catch (error) {
          console.error("Error during message sending:", error);
          let errorMessageText = "A critical error occurred while processing the response.";
          if (error instanceof Error) {
              errorMessageText = error.message;
          } else if (typeof error === 'object' && error !== null) {
              try {
                  errorMessageText = JSON.stringify(error);
              } catch (e) {
                  errorMessageText = String(error);
              }
          } else {
              errorMessageText = String(error);
          }
  
          const errorMessage: ChatMessage = {
               id: crypto.randomUUID(), 
               sender: 'bot',
               text: `Error: ${errorMessageText}`,
               timestamp: Date.now()
          };
          updateChatHistory(character.id, [...newHistory, errorMessage]);
      } finally {
          setIsLoading(false);
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSendMessage();
      }
  };

  const handleMessageUpdate = (messageId: string, newText: string) => {
      const updatedHistory = messages.map(msg => 
          msg.id === messageId ? { ...msg, text: newText } : msg
      );
      updateChatHistory(character.id, updatedHistory);
  };

  const handleMessageDelete = (messageId: string) => {
      const updatedHistory = messages.filter(msg => msg.id !== messageId);
      updateChatHistory(character.id, updatedHistory);
  };

  const handleRewind = (messageId: string) => {
      const index = messages.findIndex(msg => msg.id === messageId);
      if (index !== -1) {
          const updatedHistory = messages.slice(0, index + 1);
          updateChatHistory(character.id, updatedHistory);
      }
  };

  const handleRetry = () => {
      // Remove last bot message and trigger send again
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.sender === 'bot') {
          const historyWithoutLast = messages.slice(0, -1);
          updateChatHistory(character.id, historyWithoutLast);
          // We can't easily reuse handleSendMessage because it depends on input state. 
          // A robust retry needs a refactor to separate logic from input handling.
          // For now, we just delete the bot message so user can resend.
          alert("Last message deleted. Please type your message again to retry.");
      }
  };

  return (
    <div className="flex flex-col h-full bg-primary/90 relative">
      <div className="flex-1 overflow-y-auto p-4 pb-32 scroll-smooth custom-scrollbar">
        <div className="max-w-3xl mx-auto space-y-6">
            {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-text-secondary opacity-50 min-h-[50vh]">
                    <p>Start the conversation with {character.name}...</p>
                </div>
            )}
            {messages.map((msg) => (
              <Message 
                key={msg.id} 
                message={msg} 
                character={character} 
                user={currentUser || null} 
                onUpdate={handleMessageUpdate}
                onDelete={handleMessageDelete}
                onPlayTTS={handlePlayTTS}
                onRewind={handleRewind}
                onRetry={handleRetry}
                onReport={() => onReportMessage(msg)}
                isTtsLoading={isTtsLoading}
                isTtsPlaying={isTtsPlaying}
              />
            ))}
            {isLoading && (
                <div className="flex items-start gap-3 animate-fade-in">
                    <div className="w-9 h-9 rounded-xl bg-tertiary animate-pulse" />
                    <div className="bg-secondary/50 px-4 py-3 rounded-2xl rounded-tl-none text-text-secondary flex items-center gap-2">
                        <SpinnerIcon className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Thinking...</span>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-primary via-primary to-transparent pt-10 pb-4 px-4">
        <div className="max-w-3xl mx-auto flex items-end gap-2 bg-secondary border border-border rounded-2xl p-2 shadow-lg relative z-10">
            <button onClick={() => setIsSettingsOpen(true)} className="p-3 text-text-secondary hover:text-text-primary hover:bg-tertiary rounded-xl transition-colors">
                <SettingsIcon className="w-6 h-6" />
            </button>
            <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${character.name}...`}
                className="flex-1 max-h-40 bg-transparent border-none focus:ring-0 resize-none py-3 text-text-primary placeholder-text-secondary/50 scrollbar-hide"
                rows={1}
                style={{ minHeight: '48px' }}
            />
            <button 
                onClick={handleSendMessage} 
                disabled={isLoading || !inputText.trim()}
                className="p-3 bg-accent-primary text-white rounded-xl hover:bg-accent-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-glow"
            >
                <SendIcon className="w-5 h-5" />
            </button>
        </div>
      </div>

      {isSettingsOpen && (
          <ChatSettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            settings={chatSettings}
            onSave={handleSettingsSave}
            onResetChat={handleResetChat}
            userType={currentUser?.userType || 'Free'}
            apiConnections={auth?.apiConnections || []}
            ttsConfig={getToolConfig?.('textToSpeech') || null}
            character={character}
            narrativeState={narrativeState}
            summaryConfig={getToolConfig?.('characterSummarization') || null}
            characterStats={userStats}
          />
      )}
    </div>
  );
};

export default ChatView;
