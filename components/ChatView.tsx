
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<any | null>(null);
  
  const auth = useContext(AuthContext);

  const userChatSettings = useMemo(() => {
    const defaultSettings: ChatSettings = {
        model: character.model,
        isStreaming: true,
        ttsVoice: 'Kore'
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

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInput(prev => (prev ? prev + ' ' : '') + transcript);
        };
        
        recognition.onerror = (event: any) => {
            if (event.error !== 'no-speech') {
                console.error('Speech recognition error:', event.error);
            }
        };

        recognition.onend = () => {
             setIsListening(false);
        }
        recognitionRef.current = recognition;
    }
  }, []);
  
  const ensureAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    return audioContextRef.current;
  }, []);

  const playTTS = useCallback(async (text: string) => {
    const audioContext = ensureAudioContext();
    if (!audioContext) return;
    
    // Browsers may suspend audio context until a user interaction.
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }

    try {
        const base64Audio = await getTextToSpeech(text, userChatSettings.ttsVoice);
        if (base64Audio) {
            const audioData = decode(base64Audio);
            const audioBuffer = await decodeAudioData(audioData, audioContext, 24000, 1);
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start();
        }
    } catch (error) {
        console.error("Failed to play TTS audio:", error);
    }
  }, [ensureAudioContext, userChatSettings.ttsVoice]);


  const handleSend = async () => {
    if (!input.trim() || isLoading || !auth?.currentUser || !auth.aiContextSettings) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: input,
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
  };
  
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
  
  const handleListen = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
        recognitionRef.current.stop();
    } else {
        try {
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
  };

  const handleSaveSettings = (settings: ChatSettings) => {
    auth?.updateChatSettings(character.id, settings);
    setSettingsOpen(false);
  }

  return (
    <div className="flex flex-col h-full bg-[--bg-primary]">
      <div className="p-4 border-b border-[--border-color] flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-4 overflow-hidden">
            <Avatar imageId={character.avatarUrl} alt={character.name} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover flex-shrink-0" />
            <div className="overflow-hidden">
              <h2 className="text-lg sm:text-xl font-bold truncate text-[--text-primary]">{character.name}</h2>
              <p className="text-xs sm:text-sm text-[--text-secondary] truncate">{character.situation}</p>
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
          />
        ))}
        {isLoading && (
            <div className="flex items-start gap-4 p-4">
                <Avatar imageId={character.avatarUrl} alt={character.name} className="w-10 h-10 rounded-full object-cover" />
                <div className="flex-1">
                    <p className="font-bold text-[--text-primary]">{character.name}</p>
                    <div className="text-[--text-primary] mt-1 flex items-center space-x-2">
                        <span className="w-2 h-2 bg-[--accent-secondary] rounded-full animate-pulse"></span>
                        <span className="w-2 h-2 bg-[--accent-secondary] rounded-full animate-pulse delay-75"></span>
                        <span className="w-2 h-2 bg-[--accent-secondary] rounded-full animate-pulse delay-150"></span>
                    </div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-[--border-color] bg-[--bg-primary] flex-shrink-0">
        <div className="flex items-center bg-[--bg-secondary] rounded-lg p-2 gap-2">
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
            className="flex-1 bg-transparent focus:outline-none resize-none px-2 text-[--text-primary] max-h-32"
            rows={1}
            disabled={isLoading || !auth?.currentUser}
          />
          <button onClick={handleListen} disabled={isLoading || !auth?.currentUser} className="p-2 rounded-full text-[--text-secondary] hover:text-[--text-primary] disabled:text-[--bg-hover] transition-colors">
            <MicrophoneIcon className={`w-5 h-5 ${isListening ? 'text-[--danger] animate-pulse' : ''}`} />
          </button>
           <button onClick={() => setSettingsOpen(true)} disabled={!auth?.currentUser} className="p-2 rounded-full text-[--text-secondary] hover:text-[--text-primary] disabled:text-[--bg-hover] transition-colors">
            <SettingsIcon className="w-5 h-5" />
          </button>
          <button onClick={handleSend} disabled={isLoading || !input.trim() || !auth?.currentUser} className="p-2 rounded-full bg-[--accent-secondary] disabled:bg-[--bg-tertiary] hover:bg-[--accent-secondary-hover] transition-colors">
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
                auth.deleteChatHistory(character.id);
                setSettingsOpen(false);
            }}
            userType={auth.currentUser.userType}
        />
       )}
    </div>
  );
};

export default ChatView;