import React, { useState, useEffect, useRef, useCallback, useContext, useMemo } from 'react';
import { Character, ChatMessage, ChatSettings, LLMModel, TTSVoiceName } from '../types';
import { getChatResponse, getTextToSpeech, getChatResponseStream } from '../services/geminiService';
import Message from './Message';
import { SendIcon, MicrophoneIcon, SettingsIcon } from './Icons';
import { decode, decodeAudioData } from '../utils/audioUtils';
import { AuthContext } from '../context/AuthContext';
import Avatar from './Avatar';
import ChatSettingsModal from './ChatSettingsModal';

interface ChatViewProps {
  character: Character;
  chatHistory: ChatMessage[];
  updateChatHistory: (characterId: string, history: ChatMessage[]) => void;
}

const ChatView: React.FC<ChatViewProps> = ({ character, chatHistory, updateChatHistory }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const [isTtsLoading, setIsTtsLoading] = useState<Set<string>>(new Set());
  const [playedTtsMessages, setPlayedTtsMessages] = useState<Set<string>>(new Set());
  const [ttsAudioCache, setTtsAudioCache] = useState<Map<string, string>>(new Map());
  const ttsFetchesInProgress = useRef<Set<string>>(new Set());

  // New state and refs for managing TTS playback
  const [currentlyPlayingTtsId, setCurrentlyPlayingTtsId] = useState<string | null>(null);
  const activeTtsSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<any | null>(null);
  const manualStopRef = useRef(false);
  
  const auth = useContext(AuthContext);

  const userChatSettings = useMemo(() => {
    const defaultSettings: ChatSettings = {
        model: character.model,
        isStreaming: true,
        ttsVoice: 'Kore',
        autoRead: false,
    };
    if (!auth?.currentUser) return defaultSettings;
    const savedSettings = auth.chatSettings[auth.currentUser.id]?.[character.id] || {};

    const finalSettings = { ...defaultSettings, ...savedSettings };
    
    if (auth.currentUser.userType === 'Free' && finalSettings.model === LLMModel.GEMINI_PRO) {
        finalSettings.model = LLMModel.GEMINI_FLASH;
    }

    return finalSettings;
  }, [auth?.currentUser, auth?.chatSettings, character.id, character.model]);
  
  const displayedHistory = useMemo(() => {
      if (chatHistory.length > 0) {
          return chatHistory;
      }
      if (character.greeting) {
          const greetingMessage: ChatMessage = { id: 'greeting-0', sender: 'bot', text: character.greeting, timestamp: Date.now() };
          return [greetingMessage];
      }
      return [];
  }, [chatHistory, character.greeting]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayedHistory]);

  const stopCurrentTts = useCallback(() => {
    if (activeTtsSourceRef.current) {
        activeTtsSourceRef.current.onended = null; // Important: prevent onended from firing on manual stop
        activeTtsSourceRef.current.stop();
        activeTtsSourceRef.current = null;
    }
    setCurrentlyPlayingTtsId(null);
  }, []);

  // Effect to stop TTS when user navigates away from the chat
  useEffect(() => {
    return () => {
        stopCurrentTts();
    };
  }, [stopCurrentTts]);
  
  const ensureAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    return audioContextRef.current;
  }, []);

  const handleSend = useCallback(async (messageText?: string) => {
    const textToSend = (messageText ?? input).trim();
    if (!textToSend || isLoading || !auth?.currentUser || !auth.aiContextSettings) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: textToSend,
      timestamp: Date.now(),
    };

    const initialHistory = chatHistory.length > 0 ? chatHistory : (character.greeting ? [{
        id: crypto.randomUUID(),
        sender: 'bot' as const,
        text: character.greeting,
        timestamp: Date.now() - 1
    }] : []);
    
    const newHistory = [...initialHistory, userMessage];
    updateChatHistory(character.id, newHistory);
    setInput('');
    setIsLoading(true);

    if (userChatSettings.isStreaming) {
        const botMessage: ChatMessage = {
            id: crypto.randomUUID(),
            sender: 'bot',
            text: '',
            timestamp: Date.now(),
        };
        updateChatHistory(character.id, [...newHistory, botMessage]);
        
        try {
            const stream = getChatResponseStream(character, newHistory, auth.currentUser, auth.globalSettings, auth.aiContextSettings, userChatSettings.model);
            let fullText = '';
            for await (const chunk of stream) {
                fullText += chunk;
                updateChatHistory(character.id, [...newHistory, { ...botMessage, text: fullText }]);
            }
        } catch (e) {
            console.error(e);
            updateChatHistory(character.id, [...newHistory, { ...botMessage, text: "Error streaming response." }]);
        } finally {
            setIsLoading(false);
        }
    } else {
        const botResponseText = await getChatResponse(character, newHistory, auth.currentUser, auth.globalSettings, auth.aiContextSettings, userChatSettings.model);
        const botMessage: ChatMessage = {
          id: crypto.randomUUID(),
          sender: 'bot',
          text: botResponseText,
          timestamp: Date.now(),
        };
        updateChatHistory(character.id, [...newHistory, botMessage]);
        setIsLoading(false);
    }
  }, [input, isLoading, auth, character, chatHistory, updateChatHistory, userChatSettings]);


  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = 0; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            
            setInput(finalTranscript + interimTranscript);

            if (userChatSettings.autoRead && finalTranscript.toLowerCase().includes('send user message')) {
                manualStopRef.current = true;
                recognition.stop();
                const messageToSend = finalTranscript.replace(/send user message/i, '').trim();
                handleSend(messageToSend);
            }
        };
        
        recognition.onerror = (event: any) => {
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
                console.error('Speech recognition error:', event.error);
            }
            if(event.error === 'network'){
                manualStopRef.current = false;
            }
        };

        recognition.onend = () => {
             if (userChatSettings.autoRead && !manualStopRef.current) {
                console.log("Speech recognition ended, restarting for hands-free mode.");
                recognition.start();
             } else {
                setIsListening(false);
             }
        }
        recognitionRef.current = recognition;
    }
  }, [userChatSettings.autoRead, handleSend]);

  const handleListen = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isListening) {
        manualStopRef.current = true;
        recognitionRef.current.stop();
        setIsListening(false);
    } else {
        try {
            setInput('');
            manualStopRef.current = false;
            recognitionRef.current.start();
            setIsListening(true);
        } catch (e) {
            console.error("Could not start recognition", e);
            if (e instanceof DOMException && e.name === 'NotAllowedError') {
                alert("Microphone access was denied. Please allow microphone permissions in your browser settings to use voice input.");
            } else {
                alert("Voice recognition could not be started. Please check browser permissions.");
            }
        }
    }
  }, [isListening]);
  
  const playTTS = useCallback(async (text: string, messageId: string, onEnded?: () => void) => {
    if (activeTtsSourceRef.current && messageId === currentlyPlayingTtsId) {
        stopCurrentTts();
        return;
    }
    stopCurrentTts();

    const audioContext = ensureAudioContext();
    if (!audioContext) return;
    
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
              onEnded?.();
            };
            source.start();
        } catch (error) {
            console.error("Failed to play decoded TTS audio:", error);
            activeTtsSourceRef.current = null;
            setCurrentlyPlayingTtsId(null);
            onEnded?.();
        }
    };

    if (ttsAudioCache.has(messageId)) {
        const cachedAudio = ttsAudioCache.get(messageId)!;
        await playAudio(cachedAudio);
        return;
    }

    setIsTtsLoading(prev => new Set(prev).add(messageId));
    try {
        const base64Audio = await getTextToSpeech(text, userChatSettings.ttsVoice);
        if (base64Audio) {
            setTtsAudioCache(prevCache => new Map(prevCache).set(messageId, base64Audio));
            await playAudio(base64Audio);
        } else {
          onEnded?.();
        }
    } catch (error) {
        console.error("Failed to play TTS audio:", error);
        onEnded?.();
    } finally {
        setIsTtsLoading(prev => {
            const next = new Set(prev);
            next.delete(messageId);
            return next;
        });
    }
  }, [ensureAudioContext, userChatSettings.ttsVoice, ttsAudioCache, currentlyPlayingTtsId, stopCurrentTts]);
  
  
  useEffect(() => {
    const lastMessage = displayedHistory.length > 0 ? displayedHistory[displayedHistory.length - 1] : null;

    if (lastMessage && lastMessage.sender === 'bot' && !ttsAudioCache.has(lastMessage.id) && !ttsFetchesInProgress.current.has(lastMessage.id)) {
        const fetchTts = async () => {
            if (!lastMessage.text.trim()) return; // Don't fetch for empty streaming messages
            ttsFetchesInProgress.current.add(lastMessage.id);
            try {
                const base64Audio = await getTextToSpeech(lastMessage.text, userChatSettings.ttsVoice);
                if (base64Audio) {
                    setTtsAudioCache(prevCache => new Map(prevCache).set(lastMessage.id, base64Audio));
                }
            } catch (error) {
                console.error("Failed to pre-fetch TTS audio:", error);
            } finally {
                ttsFetchesInProgress.current.delete(lastMessage.id);
            }
        };

        fetchTts();
    }
  }, [displayedHistory, userChatSettings.ttsVoice, ttsAudioCache]);


  useEffect(() => {
    if (!userChatSettings.autoRead || isLoading || displayedHistory.length === 0) {
        if (isListening) {
            manualStopRef.current = true;
            recognitionRef.current?.stop();
        }
        return;
    }

    const lastMessage = displayedHistory[displayedHistory.length - 1];
    if (lastMessage.sender === 'bot' && !playedTtsMessages.has(lastMessage.id)) {
        setPlayedTtsMessages(prev => new Set(prev).add(lastMessage.id));

        playTTS(lastMessage.text, lastMessage.id, () => {
            if (recognitionRef.current && !isListening) {
                setTimeout(() => handleListen(), 100); 
            }
        });
    }
  }, [displayedHistory, userChatSettings.autoRead, isLoading, playedTtsMessages, playTTS, isListening, handleListen]);

  
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

  const handleSaveSettings = (settings: ChatSettings) => {
    auth?.updateChatSettings(character.id, settings);
    setSettingsOpen(false);
  }
  
  const handleHandsFreeToggle = () => {
    const isEnabling = !userChatSettings.autoRead;
    auth?.updateChatSettings(character.id, { ...userChatSettings, autoRead: isEnabling });

    if (!isEnabling && isListening) {
        manualStopRef.current = true;
        recognitionRef.current?.stop();
    }
};

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
        {displayedHistory.map(msg => (
          <Message 
            key={msg.id} 
            message={msg} 
            character={character}
            user={auth?.currentUser || null}
            onUpdate={handleUpdateMessage}
            onDelete={handleDeleteMessage}
            onPlayTTS={playTTS}
            onRewind={handleRewindMessage}
            isTtsLoading={isTtsLoading.has(msg.id)}
            isTtsPlaying={currentlyPlayingTtsId === msg.id}
          />
        ))}
        {isLoading && !userChatSettings.isStreaming && (
            <div className="flex items-start gap-4 p-4">
                <Avatar imageId={character.avatarUrl} alt={character.name} className="w-10 h-10 rounded-full object-cover" />
                <div className="flex-1">
                    <p className="font-bold text-text-primary">{character.name}</p>
                    <div className="text-text-primary mt-1 flex items-center space-x-2">
                        <span className="w-2 h-2 bg-accent-secondary rounded-full animate-pulse"></span>
                        <span className="w-2 h-2 bg-accent-secondary rounded-full animate-pulse delay-75"></span>
                        <span className="w-2 h-2 bg-accent-secondary rounded-full animate-pulse delay-150"></span>
                    </div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-border bg-primary flex-shrink-0">
        <div className="flex justify-end items-center px-2 pb-2">
            <label htmlFor="hands-free-toggle" className="flex items-center cursor-pointer">
                <span className="mr-3 text-sm font-medium text-text-secondary">Hands-Free Mode</span>
                <div className="relative">
                    <input type="checkbox" id="hands-free-toggle" checked={userChatSettings.autoRead} onChange={handleHandsFreeToggle} className="sr-only" />
                    <div className={`block w-14 h-8 rounded-full ${userChatSettings.autoRead ? 'bg-accent-primary' : 'bg-tertiary'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${userChatSettings.autoRead ? 'transform translate-x-6' : ''}`}></div>
                </div>
            </label>
        </div>
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
          <button onClick={handleListen} disabled={isLoading || !auth?.currentUser} className="p-2 rounded-full text-text-secondary hover:text-text-primary disabled:text-hover transition-colors">
            <MicrophoneIcon className={`w-5 h-5 ${isListening ? 'text-danger animate-pulse' : ''}`} />
          </button>
           <button onClick={() => setSettingsOpen(true)} disabled={!auth?.currentUser} className="p-2 rounded-full text-text-secondary hover:text-text-primary disabled:text-hover transition-colors">
            <SettingsIcon className="w-5 h-5" />
          </button>
          <button onClick={() => handleSend()} disabled={isLoading || !input.trim() || !auth?.currentUser} className="p-2 rounded-full bg-accent-secondary disabled:bg-tertiary hover:bg-accent-secondary-hover transition-colors">
            <SendIcon className="w-5 h-5 text-white" />
          </button>
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
        />
       )}
    </div>
  );
};

export default ChatView;
