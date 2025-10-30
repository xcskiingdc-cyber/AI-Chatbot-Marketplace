import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import type { Character, ChatMessage } from '../types';
import { getChatResponse, getTextToSpeech } from '../services/geminiService';
import Message from './Message';
import { SendIcon, RefreshIcon } from './Icons';
import { decode, decodeAudioData } from '../utils/audioUtils';
import { AuthContext } from '../context/AuthContext';
import Avatar from './Avatar';
import ConfirmationModal from './ConfirmationModal';

interface ChatViewProps {
  character: Character;
  chatHistory: ChatMessage[];
  updateChatHistory: (characterId: string, history: ChatMessage[]) => void;
}

const ChatView: React.FC<ChatViewProps> = ({ character, chatHistory, updateChatHistory }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResetModalOpen, setResetModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const auth = useContext(AuthContext);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);
  
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
        const base64Audio = await getTextToSpeech(text);
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
  }, [ensureAudioContext]);


  const handleSend = async () => {
    if (!input.trim() || isLoading || !auth?.currentUser) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: input,
      timestamp: Date.now(),
    };

    const newHistory = [...chatHistory, userMessage];
    updateChatHistory(character.id, newHistory);
    setInput('');
    setIsLoading(true);

    const botResponseText = await getChatResponse(character, newHistory, input);

    const botMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'bot',
      text: botResponseText,
      timestamp: Date.now(),
    };
    
    updateChatHistory(character.id, [...newHistory, botMessage]);
    setIsLoading(false);
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
  
  const handleResetConfirm = () => {
    if (auth?.currentUser) {
        auth.deleteChatHistory(character.id);
    }
    setResetModalOpen(false);
  };


  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <Avatar imageId={character.avatarUrl} alt={character.name} className="w-12 h-12 rounded-full object-cover" />
            <div>
              <h2 className="text-xl font-bold">{character.name}</h2>
              <p className="text-sm text-gray-400">{character.situation}</p>
            </div>
        </div>
        {auth?.currentUser && (
            <button onClick={() => setResetModalOpen(true)} className="p-2 text-gray-400 hover:text-white" aria-label="Reset Chat">
                <RefreshIcon className="w-5 h-5" />
            </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {chatHistory.map(msg => (
          <Message 
            key={msg.id} 
            message={msg} 
            character={character}
            user={auth?.currentUser || null}
            onUpdate={handleUpdateMessage}
            onDelete={handleDeleteMessage}
            onPlayTTS={playTTS}
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
        <div className="flex items-center bg-gray-800 rounded-lg p-2">
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
          <button onClick={handleSend} disabled={isLoading || !input.trim() || !auth?.currentUser} className="p-2 rounded-full bg-blue-600 disabled:bg-gray-600 hover:bg-blue-500 transition-colors">
            <SendIcon className="w-5 h-5 text-white" />
          </button>
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
    </div>
  );
};

export default ChatView;