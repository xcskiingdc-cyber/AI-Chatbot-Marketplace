

import React, { useState, useEffect, useRef, useCallback, useContext, useMemo } from 'react';
import { Character, ChatMessage, ChatSettings, ApiConnection } from '../types';
import { getChatResponseStream, getTextToSpeech, generateChatResponseWithStats } from '../services/aiService';
import Message from './Message';
import { SendIcon, SettingsIcon, SpinnerIcon } from './Icons';
import { decode, decodeAudioData } from '../utils/audioUtils';
import { AuthContext } from '../context/AuthContext';
import Avatar from './Avatar';
import ChatSettingsModal from './ChatSettingsModal';

interface ChatViewProps {
  character: Character;
  chatHistory: ChatMessage[];
  updateChatHistory: (characterId: string, history: ChatMessage[]) => void;
  onReportMessage: (message: ChatMessage) => void;
  activeConnection: ApiConnection;
}

const SkeletonMessage: React.FC = () => (
    <div className="flex items-start gap-3 sm:gap-4 justify-start">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-tertiary animate-pulse flex-shrink-0" />
        <div className="flex-1 max-w-full sm:max-w-md lg:max-w-2xl xl:max-w-3xl">
            <div className="h-4 w-24 bg-tertiary rounded animate-pulse mb-3" />
            <div className="space-y-2">
                <div className="h-3 w-full bg-tertiary rounded animate-pulse" />
                <div className="h-3 w-5/6 bg-tertiary rounded animate-pulse" />
            </div>
        </div>
    </div>
);

const generateStatsString = (character: Character, stats: Record<string, number> | null): string => {
    if (!character.statsVisible || !stats || !character.stats.length) {
        return '';
    }
    return character.stats
        .map(stat => `${stat.name}=${stats[stat.id] ?? stat.initialValue}`)
        .join(', ');
};

const ChatView: React.FC<ChatViewProps> = ({ character, chatHistory, updateChatHistory, onReportMessage, activeConnection }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  
  const [isTtsLoading, setIsTtsLoading] = useState<Set<string>>(new Set());
  const [ttsAudioCache, setTtsAudioCache] = useState<Map<string, string>>(new Map());
  const [currentlyPlayingTtsId, setCurrentlyPlayingTtsId] = useState<string | null>(null);
  const activeTtsSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const auth = useContext(AuthContext);

  const userChatSettings = useMemo(() => {
    const defaultSettings: ChatSettings = {
        model: character.model,
        isStreaming: true,
        ttsVoice: 'Kore',
        kidMode: false,
    };
    if (!auth?.currentUser) return defaultSettings;
    const savedSettings = auth.chatSettings[auth.currentUser.id]?.[character.id] || {};

    const finalSettings = { ...defaultSettings, ...savedSettings };
    
    if (auth.currentUser.userType === 'Free' && finalSettings.model === 'gemini-2.5-pro') {
        finalSettings.model = 'gemini-2.5-flash';
    }

    return finalSettings;
  }, [auth?.currentUser, auth?.chatSettings, character.id, character.model]);
  
  const displayedHistory = useMemo(() => {
      if (chatHistory.length > 0) {
          return chatHistory;
      }
      if (character.greeting) {
          const processedGreeting = character.greeting
              .replace(/{{char}}/g, character.name)
              .replace(/{{user}}/g, auth?.currentUser?.profile.name || 'user');
          const greetingMessage: ChatMessage = { id: 'greeting-0', sender: 'bot', text: processedGreeting, timestamp: Date.now() };
          return [greetingMessage];
      }
      return [];
  }, [chatHistory, character.greeting, character.name, auth?.currentUser]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayedHistory]);
  
  const handleSend = useCallback(async () => {
    const textToSend = input.trim();
    if (!textToSend || isLoading || !auth?.currentUser || !auth.aiContextSettings) return;

    setIsLoading(true);
    setInput('');

    const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'user',
        text: textToSend,
        timestamp: Date.now(),
    };
    
    const newHistory = [...displayedHistory, userMessage];
    updateChatHistory(character.id, newHistory);

    const historyForApi = newHistory.filter(msg => msg.id !== 'greeting-0');

    // If character has no stats, use the simple, streaming method to preserve UX.
    if (!character.stats || character.stats.length === 0) {
        const botMessage: ChatMessage = { id: crypto.randomUUID(), sender: 'bot', text: '', timestamp: Date.now() };
        // Show a placeholder while waiting for the first chunk
        updateChatHistory(character.id, [...newHistory, botMessage]);

        try {
            const stream = getChatResponseStream(character, historyForApi, auth.currentUser, auth.globalSettings, auth.aiContextSettings, userChatSettings.kidMode, userChatSettings.model, null, activeConnection);
            let fullText = '';
            for await (const chunk of stream) {
                fullText += chunk;
                updateChatHistory(character.id, [...newHistory, { ...botMessage, text: fullText }]);
            }
        } catch (e) {
            console.error("Error streaming response:", e);
            updateChatHistory(character.id, [...newHistory, { ...botMessage, text: `Error streaming response: ${e instanceof Error ? e.message : String(e)}` }]);
        } finally {
            setIsLoading(false);
        }
        return;
    }
    
    // --- Stat System Logic (New combined, non-streaming call to prevent rate limits) ---
    try {
        let statsForUpdate = auth.chatStats?.[auth.currentUser.id]?.[character.id];
        if (!statsForUpdate) {
            statsForUpdate = {};
            character.stats.forEach(stat => {
                statsForUpdate[stat.id] = stat.initialValue;
            });
        }

        // Single API call to get response and stat changes
        const { statChanges, responseText } = await generateChatResponseWithStats(
            character, historyForApi, auth.currentUser, auth.globalSettings, auth.aiContextSettings, userChatSettings.kidMode, userChatSettings.model, statsForUpdate, activeConnection
        );
        
        // Handle API errors gracefully
        if (responseText.startsWith("Error:")) {
            const errorMessage: ChatMessage = { id: crypto.randomUUID(), sender: 'bot', text: responseText, timestamp: Date.now() };
            updateChatHistory(character.id, [...newHistory, errorMessage]);
            setIsLoading(false);
            return;
        }

        // Apply stat updates
        let finalStats = { ...statsForUpdate };
        if (statChanges && statChanges.length > 0) {
          statChanges.forEach(update => {
            const statInfo = character.stats.find(s => s.id === update.statId);
            if (statInfo) {
              let newValue = (finalStats[update.statId] ?? statInfo.initialValue) + update.valueChange;
              newValue = Math.max(statInfo.min, Math.min(statInfo.max, newValue));
              finalStats[update.statId] = newValue;
            }
          });
        }
        
        auth.updateChatStats(character.id, finalStats);
        const statsString = generateStatsString(character, finalStats);

        const botMessage: ChatMessage = { 
          id: crypto.randomUUID(), 
          sender: 'bot', 
          text: responseText, 
          timestamp: Date.now(),
          statsSnapshot: statsString
        };
        updateChatHistory(character.id, [...newHistory, botMessage]);

    } catch (error) {
        console.error("Error during message sending with stats:", error);
        const errorMessageText = `A critical error occurred while processing the response: ${error instanceof Error ? error.message : String(error)}`;
        const errorMessage: ChatMessage = {
             id: crypto.randomUUID(), 
             sender: 'bot',
             text: errorMessageText,
             timestamp: Date.now()
        };
        updateChatHistory(character.id, [...newHistory, errorMessage]);
    } finally {
        setIsLoading(false);
    }

  }, [input, isLoading, auth, character, updateChatHistory, userChatSettings, displayedHistory, activeConnection]);
  
  const stopCurrentTts = useCallback(() => {
    if (activeTtsSourceRef.current) {
        activeTtsSourceRef.current.onended = null; 
        activeTtsSourceRef.current.stop();
        activeTtsSourceRef.current = null;
    }
    setCurrentlyPlayingTtsId(null);
  }, []);


  useEffect(() => {
    return () => {
        stopCurrentTts();
    };
  }, [stopCurrentTts]);
  
  const playTTS = useCallback(async (text: string, messageId: string) => {
    if (activeTtsSourceRef.current && messageId === currentlyPlayingTtsId) {
        stopCurrentTts();
        return;
    }
    stopCurrentTts();

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }

    const playAudio = async (base64: string) => {
        try {
            const audioData = decode(base64);
            const audioBuffer = await decodeAudioData(audioData, audioContext, 24000, 1);
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            
            activeTtsSourceRef.current = source;
            setCurrentlyPlayingTtsId(messageId);

            source.onended = () => {
              if (activeTtsSourceRef.current === source) {
                activeTtsSourceRef.current = null;
                setCurrentlyPlayingTtsId(null);
              }
            };
            source.start();
        } catch (error) {
            console.error("Failed to play decoded TTS audio:", error);
            activeTtsSourceRef.current = null;
            setCurrentlyPlayingTtsId(null);
        }
    };

    if (ttsAudioCache.has(messageId)) {
        const cachedAudio = ttsAudioCache.get(messageId)!;
        await playAudio(cachedAudio);
        return;
    }

    setIsTtsLoading(prev => new Set(prev).add(messageId));
    try {
        const base64Audio = await getTextToSpeech(text, userChatSettings.ttsVoice, activeConnection);
        if (base64Audio) {
            setTtsAudioCache(prevCache => new Map(prevCache).set(messageId, base64Audio));
            await playAudio(base64Audio);
        }
    } catch (error) {
        console.error("Failed to play TTS audio:", error);
    } finally {
        setIsTtsLoading(prev => {
            const next = new Set(prev);
            next.delete(messageId);
            return next;
        });
    }
  }, [userChatSettings.ttsVoice, ttsAudioCache, currentlyPlayingTtsId, stopCurrentTts, activeConnection]);
  
  const handleUpdateMessage = (messageId: string, newText: string) => {
    const updatedHistory = chatHistory.map(msg => 
      msg.id === messageId ? { ...msg, text: newText } : msg
    );
    updateChatHistory(character.id, updatedHistory);
  };

  const handleDeleteMessage = (messageId: string) => {
    const updatedHistory = chatHistory.filter(msg => msg.id !== messageId);
    updateChatHistory(character.id, updatedHistory);
  };

  const handleRewindMessage = (messageId: string) => {
    const messageIndex = chatHistory.findIndex(msg => msg.id === messageId);
    if (messageIndex > -1) {
        const updatedHistory = chatHistory.slice(0, messageIndex + 1);
        updateChatHistory(character.id, updatedHistory);
    }
  }

  const handleRetry = useCallback(async (messageId: string) => {
    if (isLoading || !auth?.currentUser || !auth.aiContextSettings) return;

    const messageIndex = displayedHistory.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1 || displayedHistory[messageIndex].sender !== 'bot') {
        console.warn("Retry can only be performed on bot messages.");
        return;
    }

    // History up to the point before the bot message we want to regenerate.
    const historyForRetry = displayedHistory.slice(0, messageIndex);

    const lastMessage = historyForRetry[historyForRetry.length - 1];
    if (lastMessage?.sender !== 'user') {
        console.warn("Cannot retry, the preceding message is not from the user.");
        return;
    }

    setIsLoading(true);

    // Clean up TTS cache for the message being replaced and any after it.
    const idsToDelete = displayedHistory.slice(messageIndex).map(msg => msg.id);
    setTtsAudioCache(prevCache => {
        const newCache = new Map(prevCache);
        idsToDelete.forEach(id => newCache.delete(id));
        return newCache;
    });
    
    // Update UI to show only the history up to the point of retry.
    updateChatHistory(character.id, historyForRetry);
    
    // Replicate the logic from handleSend but using the constructed history.
    const historyForApi = historyForRetry.filter(msg => msg.id !== 'greeting-0');

    // Streaming path (no stats)
    if (!character.stats || character.stats.length === 0) {
        const botMessage: ChatMessage = { id: crypto.randomUUID(), sender: 'bot', text: '', timestamp: Date.now() };
        updateChatHistory(character.id, [...historyForRetry, botMessage]); // Show placeholder

        try {
            const stream = getChatResponseStream(character, historyForApi, auth.currentUser, auth.globalSettings, auth.aiContextSettings, userChatSettings.kidMode, userChatSettings.model, null, activeConnection);
            let fullText = '';
            for await (const chunk of stream) {
                fullText += chunk;
                updateChatHistory(character.id, [...historyForRetry, { ...botMessage, text: fullText }]);
            }
        } catch (e) {
            console.error("Error streaming response during retry:", e);
            updateChatHistory(character.id, [...historyForRetry, { ...botMessage, text: `Error streaming response: ${e instanceof Error ? e.message : String(e)}` }]);
        } finally {
            setIsLoading(false);
        }
        return;
    }

    // Non-streaming path (with stats)
    try {
        let statsForUpdate = auth.chatStats?.[auth.currentUser.id]?.[character.id];
        if (!statsForUpdate) {
            statsForUpdate = {};
            character.stats.forEach(stat => {
                statsForUpdate[stat.id] = stat.initialValue;
            });
        }

        const { statChanges, responseText } = await generateChatResponseWithStats(
            character, historyForApi, auth.currentUser, auth.globalSettings, auth.aiContextSettings, userChatSettings.kidMode, userChatSettings.model, statsForUpdate, activeConnection
        );

        if (responseText.startsWith("Error:")) {
            const errorMessage: ChatMessage = { id: crypto.randomUUID(), sender: 'bot', text: responseText, timestamp: Date.now() };
            updateChatHistory(character.id, [...historyForRetry, errorMessage]);
            setIsLoading(false);
            return;
        }

        let finalStats = { ...statsForUpdate };
        if (statChanges && statChanges.length > 0) {
          statChanges.forEach(update => {
            const statInfo = character.stats.find(s => s.id === update.statId);
            if (statInfo) {
              let newValue = (finalStats[update.statId] ?? statInfo.initialValue) + update.valueChange;
              newValue = Math.max(statInfo.min, Math.min(statInfo.max, newValue));
              finalStats[update.statId] = newValue;
            }
          });
        }
        
        auth.updateChatStats(character.id, finalStats);
        const statsString = generateStatsString(character, finalStats);

        const botMessage: ChatMessage = { 
          id: crypto.randomUUID(), 
          sender: 'bot', 
          text: responseText, 
          timestamp: Date.now(),
          statsSnapshot: statsString
        };
        updateChatHistory(character.id, [...historyForRetry, botMessage]);

    } catch (error) {
        console.error("Error during message retry with stats:", error);
        const errorMessageText = `A critical error occurred while processing the response: ${error instanceof Error ? error.message : String(error)}`;
        const errorMessage: ChatMessage = {
             id: crypto.randomUUID(), 
             sender: 'bot',
             text: errorMessageText,
             timestamp: Date.now()
        };
        updateChatHistory(character.id, [...historyForRetry, errorMessage]);
    } finally {
        setIsLoading(false);
    }
  }, [isLoading, auth, character, updateChatHistory, userChatSettings, displayedHistory, activeConnection]);

  const handleSaveSettings = (settings: ChatSettings) => {
    auth?.updateChatSettings(character.id, settings);
    setSettingsOpen(false);
  }

  return (
    <div className="flex flex-col h-full bg-primary">
      <div className="p-4 border-b border-border flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-4 overflow-hidden">
            <Avatar imageId={character.avatarUrl} alt={character.name} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover flex-shrink-0" />
            <div className="overflow-hidden">
              <h2 className="text-lg sm:text-xl font-bold truncate text-text-primary">{character.name}</h2>
              <p className="text-xs sm:text-sm text-text-secondary truncate">{character.situation}</p>
            </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {displayedHistory.map((msg) => (
            <Message 
              key={msg.id} 
              message={msg} 
              character={character}
              user={auth?.currentUser || null}
              onUpdate={handleUpdateMessage}
              onDelete={handleDeleteMessage}
              onPlayTTS={playTTS}
              onRewind={handleRewindMessage}
              onRetry={handleRetry}
              onReport={() => onReportMessage(msg)}
              isTtsLoading={isTtsLoading.has(msg.id)}
              isTtsPlaying={currentlyPlayingTtsId === msg.id}
            />
          )
        )}
        {isLoading && (
            <SkeletonMessage />
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-border bg-primary flex-shrink-0">
        <div className="flex items-center bg-secondary rounded-lg p-2 gap-2">
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                    }
                }}
                placeholder={auth?.currentUser ? `Message ${character.name}...` : 'Please log in to chat'}
                className="flex-1 bg-transparent focus:outline-none resize-none px-2 text-text-primary max-h-32"
                rows={1}
                disabled={isLoading || !auth?.currentUser}
            />
             {isLoading ? <SpinnerIcon className="w-5 h-5 text-text-secondary animate-spin mx-3.5"/> : (
                <div className="flex items-center gap-3 border-l border-border pl-3">
                    <button onClick={() => setSettingsOpen(true)} disabled={!auth?.currentUser} className="p-2 rounded-full text-text-secondary hover:text-text-primary disabled:text-hover transition-colors">
                        <SettingsIcon className="w-5 h-5" />
                    </button>
                    <button onClick={handleSend} disabled={isLoading || !input.trim() || !auth?.currentUser} className="p-2 rounded-full bg-accent-secondary disabled:bg-tertiary hover:bg-accent-secondary-hover transition-colors">
                        <SendIcon className="w-5 h-5 text-white" />
                    </button>
                </div>
             )}
        </div>
      </div>
      {isSettingsOpen && auth?.currentUser && (
        <ChatSettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setSettingsOpen(false)}
            settings={userChatSettings}
            onSave={handleSaveSettings}
            onResetChat={() => {
                if (auth?.currentUser?.id) {
                    auth.deleteChatHistory(character.id);
                }
                setSettingsOpen(false);
            }}
            userType={auth.currentUser.userType}
            // FIX: Pass activeConnection to the modal for API calls
            activeConnection={activeConnection}
        />
       )}
    </div>
  );
};

export default ChatView;