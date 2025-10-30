import React, { useState, useEffect, useRef, useCallback, useContext, useMemo } from 'react';
// FIX: Changed import type to allow LLMModel to be used as a value.
import { type Character, type ChatMessage, type ChatSettings, LLMModel, type TTSVoiceName } from '../types';
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
  const recognitionRef = useRef<any | null>(null); // Using `any` for SpeechRecognition for cross-browser compatibility
  
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
    
    // Free users cannot use Pro model
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
          // FIX: Explicitly type the greeting message to ensure it conforms to the ChatMessage interface.
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
            // The 'no-speech' error is common if the user clicks the mic but doesn't speak.
            // We can safely ignore it to avoid cluttering the console.
            if (event.error !== 'no-speech') {
                console.error('Speech recognition error:', event.error);
            }
        };

        // The onend event is the single source of truth for when recognition has stopped.
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
  }, []);

  const playTTS = useCallback(async (text: string) => {
    ensureAudioContext();
    const audioContext = audioContextRef.current;
    if (!audioContext) return;

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
    if (!input.trim() || isLoading || !auth?.currentUser) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: input,
      timestamp: Date.now(),
    };

    // If this is the first message from the user, add the character's greeting to the official history first.
    const initialHistory = chatHistory.length > 0 ? chatHistory : (character.greeting ? [{
        id: crypto.randomUUID(),
        sender: 'bot' as const,
        text: character.greeting,
        timestamp: Date.now() - 1 // ensure greeting is timestamped just before the user's message
    }] : []);
    
    const newHistory = [...initialHistory, userMessage];
    updateChatHistory(character.id, newHistory);
    setInput('');
    setIsLoading(true);

    if (userChatSettings.isStreaming) {
        const botMessage: ChatMessage = {
            id: crypto.randomUUID(),
            sender: 'bot',
            text: '', // Start with empty text
            timestamp: Date.now(),
        };
        updateChatHistory(character.id, [...newHistory, botMessage]);
        
        try {
            const stream = getChatResponseStream(character, newHistory, auth.currentUser, auth.globalSettings, userChatSettings.model);
            let fullText = '';
            for await (const chunk of stream) {
                fullText += chunk;
                // Find the last message and update its text
                updateChatHistory(character.id, [...newHistory, { ...botMessage, text: fullText }]);
            }
        } catch (e) {
            console.error(e);
            updateChatHistory(character.id, [...newHistory, { ...botMessage, text: "Error streaming response." }]);
        } finally {
            setIsLoading(false);
        }
    } else {
        const botResponseText = await getChatResponse(character, newHistory, auth.currentUser, auth.globalSettings, userChatSettings.model);
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
    if (isListening || !recognitionRef.current) return;
    try {
        recognitionRef.current.start();
        setIsListening(true);
    } catch (e) {
        console.error("Could not start recognition", e);
        alert("Voice recognition could not be started. Please check browser permissions.");
    }
  };

  const handleSaveSettings = (settings: ChatSettings) => {
    auth?.updateChatSettings(character.id, settings);
    setSettingsOpen(false);
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 overflow-hidden">
            <Avatar imageId={character.avatarUrl} alt={character.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
            <div className="overflow-hidden">
              <h2 className="text-xl font-bold truncate">{character.name}</h2>
              <p className="text-sm text-gray-400 truncate">{character.situation}</p>
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
                    <p className="font-bold">{character.name}</p>
                    <div className="text-gray-300 mt-1 flex items-center space-x-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-75"></span>
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-150"></span>
                    </div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-gray-800 bg-gray-900">
        <div className="flex items-center bg-gray-800 rounded-lg p-2 gap-2">
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
            className="flex-1 bg-transparent focus:outline-none resize-none px-2"
            rows={1}
            disabled={isLoading || !auth?.currentUser}
          />
          <button onClick={handleListen} disabled={isLoading || isListening || !auth?.currentUser} className="p-2 rounded-full text-gray-400 hover:text-white disabled:text-gray-600 transition-colors">
            <MicrophoneIcon className={`w-5 h-5 ${isListening ? 'text-red-500 animate-pulse' : ''}`} />
          </button>
           <button onClick={() => setSettingsOpen(true)} disabled={!auth?.currentUser} className="p-2 rounded-full text-gray-400 hover:text-white disabled:text-gray-600 transition-colors">
            <SettingsIcon className="w-5 h-5" />
          </button>
          <button onClick={handleSend} disabled={isLoading || !input.trim() || !auth?.currentUser} className="p-2 rounded-full bg-blue-600 disabled:bg-gray-600 hover:bg-blue-500 transition-colors">
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