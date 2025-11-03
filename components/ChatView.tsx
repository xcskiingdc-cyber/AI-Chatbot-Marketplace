import React, { useState, useEffect, useRef, useCallback, useContext, useMemo } from 'react';
import { Character, ChatMessage, ChatSettings, LLMModel } from '../types';
import { getChatResponse, getTextToSpeech, getChatResponseStream } from '../services/geminiService';
import Message from './Message';
import { SendIcon, SettingsIcon, MicrophoneIcon } from './Icons';
import { decode, decodeAudioData } from '../utils/audioUtils';
import { AuthContext } from '../context/AuthContext';
import Avatar from './Avatar';
import ChatSettingsModal from './ChatSettingsModal';

// FIX: Add type definitions for the experimental SpeechRecognition API to resolve TypeScript errors.
interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  onresult: (event: SpeechRecognitionEvent) => void;
  onstart: () => void;
  onend: () => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: { new (): SpeechRecognition };
    webkitSpeechRecognition: { new (): SpeechRecognition };
  }
}

interface ChatViewProps {
  character: Character;
  chatHistory: ChatMessage[];
  updateChatHistory: (characterId: string, history: ChatMessage[]) => void;
  onReportMessage: (message: ChatMessage) => void;
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


const ChatView: React.FC<ChatViewProps> = ({ character, chatHistory, updateChatHistory, onReportMessage }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  
  const [isTtsLoading, setIsTtsLoading] = useState<Set<string>>(new Set());
  const [playedTtsMessages, setPlayedTtsMessages] = useState<Set<string>>(new Set());
  const [ttsAudioCache, setTtsAudioCache] = useState<Map<string, string>>(new Map());
  const ttsFetchesInProgress = useRef<Set<string>>(new Set());
  const [currentlyPlayingTtsId, setCurrentlyPlayingTtsId] = useState<string | null>(null);
  const activeTtsSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  const handsFreeTriggeredSend = useRef(false);
  const silenceTimerRef = useRef<number | null>(null);
  const textToSendRef = useRef('');
  const finalTranscriptRef = useRef('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const auth = useContext(AuthContext);

  const userChatSettings = useMemo(() => {
    const defaultSettings: ChatSettings = {
        model: character.model,
        isStreaming: true,
        ttsVoice: 'Kore',
        kidMode: false,
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

  // FIX: Moved handleSend before the useEffect that calls it to prevent a "used before declaration" error.
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
            const stream = getChatResponseStream(character, newHistory, auth.currentUser, auth.globalSettings, auth.aiContextSettings, userChatSettings.kidMode, userChatSettings.model);
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
        const botResponseText = await getChatResponse(character, newHistory, auth.currentUser, auth.globalSettings, auth.aiContextSettings, userChatSettings.kidMode, userChatSettings.model);
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
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported by this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      let interimTranscript = '';
      // Start processing from the first new result returned by the API
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          // Append final results to our ref, ensuring a space separator
          finalTranscriptRef.current += transcript + ' ';
        } else {
          // The rest of the results are interim
          interimTranscript += transcript;
        }
      }
      
      const fullTranscript = finalTranscriptRef.current + interimTranscript;
      setInput(fullTranscript);

      if (userChatSettings.autoRead && event.results.length > 0 && event.results[event.results.length - 1].isFinal) {
        silenceTimerRef.current = window.setTimeout(() => {
          const transcriptToSend = fullTranscript.trim();
          if (transcriptToSend) {
            textToSendRef.current = transcriptToSend;
            handsFreeTriggeredSend.current = true;
            speechRecognitionRef.current?.stop();
          }
        }, 1500);
      }
    };

    recognition.onstart = () => {
      finalTranscriptRef.current = ''; // Reset transcript on new recording session
      setIsRecording(true);
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
    
    recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        if (isRecording) {
            setIsRecording(false);
        }
    };

    speechRecognitionRef.current = recognition;
    
    return () => {
        if(speechRecognitionRef.current) {
            speechRecognitionRef.current.stop();
        }
    };

  }, [userChatSettings.autoRead]);

  useEffect(() => {
    if (!isRecording && handsFreeTriggeredSend.current) {
      handsFreeTriggeredSend.current = false;
      if (textToSendRef.current) {
        handleSend(textToSendRef.current);
        textToSendRef.current = '';
      } else if (userChatSettings.autoRead) {
        // If there was no input, just start listening again
        setTimeout(() => speechRecognitionRef.current?.start(), 250);
      }
    }
  }, [isRecording, handleSend, userChatSettings.autoRead]);


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
  
  const playTTS = useCallback(async (text: string, messageId: string, onEnded?: () => void) => {
    if (activeTtsSourceRef.current && messageId === currentlyPlayingTtsId) {
        stopCurrentTts();
        onEnded?.();
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
  }, [userChatSettings.ttsVoice, ttsAudioCache, currentlyPlayingTtsId, stopCurrentTts]);
  
  useEffect(() => {
    const lastMessage = displayedHistory.length > 0 ? displayedHistory[displayedHistory.length - 1] : null;

    if (!isLoading && lastMessage && lastMessage.sender === 'bot') {
        if (userChatSettings.autoRead && !playedTtsMessages.has(lastMessage.id)) {
            setPlayedTtsMessages(prev => new Set(prev).add(lastMessage.id));
            playTTS(lastMessage.text, lastMessage.id, () => {
                if (userChatSettings.autoRead && speechRecognitionRef.current && !isRecording) {
                    setTimeout(() => {
                      setInput(''); // Clear for new utterance
                      speechRecognitionRef.current?.start()
                    }, 250);
                }
            });
        } else if (!userChatSettings.autoRead && !ttsAudioCache.has(lastMessage.id) && !ttsFetchesInProgress.current.has(lastMessage.id)) {
            const fetchTts = async () => {
                if (!lastMessage.text.trim()) return; 
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
    }
  }, [displayedHistory, userChatSettings.autoRead, userChatSettings.ttsVoice, ttsAudioCache, isLoading, playTTS, playedTtsMessages, isRecording]);
  
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

    if (chatHistory.length === 0) return;
    const lastMessage = chatHistory[chatHistory.length - 1];
    if (lastMessage.id !== messageId || lastMessage.sender !== 'bot') {
        console.warn("Retry can only be performed on the last bot message.");
        return;
    }

    const historyForRetry = chatHistory.slice(0, -1);
    
    setIsLoading(true);

    setTtsAudioCache(prevCache => {
        const newCache = new Map(prevCache);
        newCache.delete(messageId);
        return newCache;
    });

    setPlayedTtsMessages(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
    });

    if (userChatSettings.isStreaming) {
        const botMessageToUpdate = lastMessage;
        
        updateChatHistory(character.id, [...historyForRetry, { ...botMessageToUpdate, text: '' }]);
        
        try {
            const stream = getChatResponseStream(character, historyForRetry, auth.currentUser, auth.globalSettings, auth.aiContextSettings, userChatSettings.kidMode, userChatSettings.model);
            let fullText = '';
            for await (const chunk of stream) {
                fullText += chunk;
                updateChatHistory(character.id, [...historyForRetry, { ...botMessageToUpdate, text: fullText }]);
            }
        } catch (e) {
            console.error(e);
            updateChatHistory(character.id, [...historyForRetry, { ...botMessageToUpdate, text: "Error regenerating response." }]);
        } finally {
            setIsLoading(false);
        }
    } else {
        const botResponseText = await getChatResponse(character, historyForRetry, auth.currentUser, auth.globalSettings, auth.aiContextSettings, userChatSettings.kidMode, userChatSettings.model);
        const newBotMessage: ChatMessage = {
            ...lastMessage,
            text: botResponseText,
            timestamp: Date.now(),
        };
        updateChatHistory(character.id, [...historyForRetry, newBotMessage]);
        setIsLoading(false);
    }
  }, [chatHistory, isLoading, auth, character, updateChatHistory, userChatSettings]);

  const toggleRecording = () => {
    if (!speechRecognitionRef.current) return;
    
    if (isRecording) {
        speechRecognitionRef.current.stop();
    } else {
        setInput(''); // Clear input for manual recording
        speechRecognitionRef.current.start();
    }
  };

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
        {displayedHistory.map((msg, index) => {
          const isLastMessage = index === displayedHistory.length - 1;
          const isLastBotMessage = isLastMessage && msg.sender === 'bot' && !isLoading;
          return (
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
              isLastBotMessage={isLastBotMessage}
            />
          );
        })}
        {isLoading && !userChatSettings.isStreaming && (
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
                disabled={isLoading || !auth?.currentUser || isRecording}
            />
            <div className="flex items-center gap-3 border-l border-border pl-3">
                <div className="flex flex-col items-center">
                    <div className="relative cursor-pointer" onClick={() => auth?.updateChatSettings(character.id, { autoRead: !userChatSettings.autoRead })}>
                        <input type="checkbox" id="hands-free-toggle" checked={userChatSettings.autoRead} readOnly className="sr-only" />
                        <div className={`block w-10 h-5 rounded-full ${userChatSettings.autoRead ? 'bg-accent-secondary' : 'bg-tertiary'}`}></div>
                        <div className={`dot absolute left-1 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${userChatSettings.autoRead ? 'transform translate-x-5' : ''}`}></div>
                    </div>
                    <label htmlFor="hands-free-toggle" className="text-xs text-text-secondary cursor-pointer mt-1">Hands-Free</label>
                </div>
                <button onClick={toggleRecording} disabled={!auth?.currentUser || userChatSettings.autoRead} className={`p-2 rounded-full text-text-secondary hover:text-text-primary disabled:text-hover disabled:cursor-not-allowed transition-colors ${isRecording ? 'bg-red-500/50 text-white animate-pulse' : ''}`}>
                    <MicrophoneIcon className="w-5 h-5" />
                </button>
                <button onClick={() => setSettingsOpen(true)} disabled={!auth?.currentUser} className="p-2 rounded-full text-text-secondary hover:text-text-primary disabled:text-hover transition-colors">
                    <SettingsIcon className="w-5 h-5" />
                </button>
                <button onClick={() => handleSend()} disabled={isLoading || !input.trim() || !auth?.currentUser} className="p-2 rounded-full bg-accent-secondary disabled:bg-tertiary hover:bg-accent-secondary-hover transition-colors">
                    <SendIcon className="w-5 h-5 text-white" />
                </button>
            </div>
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