
import React, { useState, useMemo } from 'react';
import type { ChatMessage, Character, User } from '../types';
import { EditIcon, DeleteIcon, SaveIcon, CancelIcon, SoundOnIcon, RewindIcon, SpinnerIcon, StopIcon, ClipboardIcon, RefreshIcon, FlagIcon } from './Icons';
import Avatar from './Avatar';

interface MessageProps {
  message: ChatMessage;
  character: Character;
  user: User | null;
  onUpdate: (messageId: string, newText: string) => void;
  onDelete: (messageId:string) => void;
  onPlayTTS: (text: string, messageId: string) => void;
  onRewind: (messageId: string) => void;
  onRetry: (messageId: string) => void;
  onReport: (messageId: string) => void;
  isTtsLoading: boolean;
  isTtsPlaying: boolean;
}

const Message: React.FC<MessageProps> = ({ message, character, user, onUpdate, onDelete, onPlayTTS, onRewind, onRetry, onReport, isTtsLoading, isTtsPlaying }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [isCopied, setIsCopied] = useState(false);

  const formattedText = useMemo(() => {
    if (!message.text) return [];
    const nodes: React.ReactNode[] = [];
    const regex = /(\*.*?\*)|(["].*?["])/gs;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(message.text)) !== null) {
      if (match.index > lastIndex) {
        nodes.push(<span key={`text-${lastIndex}`}>{message.text.substring(lastIndex, match.index)}</span>);
      }
      const [fullMatch, italic, quote] = match;
      if (italic) {
        // Gold italic for both bot and user (since both now have dark backgrounds)
        const italicClass = "text-accent-secondary italic opacity-90";
        nodes.push(<em key={`italic-${match.index}`} className={italicClass}>{italic.substring(1, italic.length - 1)}</em>);
      } else if (quote) {
        // Brighter white/cream for spoken text
        nodes.push(<span key={`quote-${match.index}`} className="text-white font-medium">{quote}</span>);
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < message.text.length) {
      nodes.push(<span key={`text-${lastIndex}`}>{message.text.substring(lastIndex)}</span>);
    }
    return nodes;
  }, [message.text]);

  const handleSave = () => {
    if (editText.trim()) {
      onUpdate(message.id, editText.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditText(message.text);
    setIsEditing(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const isBot = message.sender === 'bot';
  const avatarId = isBot ? character.avatarUrl : (user?.profile?.avatarUrl || `https://i.pravatar.cc/150?u=${user?.id || 'user'}`);
  const name = isBot ? character.name : (user?.profile?.name || 'You');

  const ActionBox = (
    <div className="flex items-center gap-1 p-1 bg-tertiary/40 backdrop-blur-md rounded-full shadow-lg flex-shrink-0 border border-white/5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
       {isBot && (
        isTtsLoading ? <SpinnerIcon className="w-4 h-4 text-accent-secondary animate-spin mx-1" /> :
        <button onClick={() => onPlayTTS(message.text, message.id)} className="p-1.5 text-text-secondary hover:text-accent-secondary rounded-full hover:bg-white/5 transition-colors" title={isTtsPlaying ? "Stop" : "Read Aloud"}>
          {isTtsPlaying ? <StopIcon className="w-3 h-3 text-accent-secondary"/> : <SoundOnIcon className="w-3 h-3" />}
        </button>
      )}
      <button onClick={handleCopy} className="p-1.5 text-text-secondary hover:text-white rounded-full hover:bg-white/5 transition-colors" title="Copy Text">
        <ClipboardIcon className={`w-3 h-3 ${isCopied ? 'text-success' : ''}`} />
      </button>
       {isBot && (
        <button onClick={() => onRetry(message.id)} className="p-1.5 text-text-secondary hover:text-white rounded-full hover:bg-white/5 transition-colors" title="Regenerate Response">
          <RefreshIcon className="w-3 h-3" />
        </button>
      )}
      <button onClick={() => onRewind(message.id)} className="p-1.5 text-text-secondary hover:text-white rounded-full hover:bg-white/5 transition-colors" title="Rewind to here"><RewindIcon className="w-3 h-3" /></button>
      <button onClick={() => setIsEditing(true)} className="p-1.5 text-text-secondary hover:text-white rounded-full hover:bg-white/5 transition-colors" title="Edit Message"><EditIcon className="w-3 h-3" /></button>
      <button onClick={() => onDelete(message.id)} className="p-1.5 text-text-secondary hover:text-danger rounded-full hover:bg-white/5 transition-colors" title="Delete Message"><DeleteIcon className="w-3 h-3" /></button>
      {isBot && (
        <button onClick={() => onReport(message.id)} className="p-1.5 text-text-secondary hover:text-warning rounded-full hover:bg-white/5 transition-colors" title="Report Message">
          <FlagIcon className="w-3 h-3" />
        </button>
      )}
    </div>
  );

  const MessageContent = (
    <div className="max-w-full sm:max-w-md lg:max-w-2xl xl:max-w-3xl shadow-soft-lg relative group">
      <div className={`px-6 py-5 rounded-2xl border ${
        isBot 
          ? 'bg-secondary-glass border-white/5 rounded-tl-none text-text-primary' 
          : 'bg-[#2A1810] border-accent-secondary/20 text-text-primary rounded-tr-none shadow-glow' // Deep warm brown for user
      }`}>
        <p className={`font-serif text-xs mb-1.5 tracking-wider uppercase font-bold ${isBot ? 'text-accent-secondary' : 'text-accent-secondary/80'}`}>{name}</p>
        
        {isEditing ? (
          <div className="mt-1 animate-fade-in">
            <textarea 
              value={editText} 
              onChange={(e) => setEditText(e.target.value)} 
              className="w-full p-3 bg-primary/50 border border-accent-secondary/30 rounded-lg focus:outline-none focus:ring-1 focus:ring-accent-secondary text-text-primary font-sans leading-relaxed"
              rows={Math.max(3, editText.split('\n').length)} 
            />
            <div className="flex gap-2 mt-3">
              <button onClick={handleSave} className="p-1.5 bg-success/20 text-success rounded hover:bg-success/30 transition-colors"><SaveIcon className="w-5 h-5" /></button>
              <button onClick={handleCancel} className="p-1.5 bg-danger/20 text-danger rounded hover:bg-danger/30 transition-colors"><CancelIcon className="w-5 h-5" /></button>
            </div>
          </div>
        ) : (
          <div className={`whitespace-pre-wrap text-[1.05rem] leading-7 ${isBot ? 'text-text-primary/90' : 'text-text-primary'}`}>
             {formattedText}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={`flex items-end gap-3 sm:gap-4 group animate-fade-in py-2 ${isBot ? 'justify-start' : 'justify-end'}`}>
      {isBot && <Avatar imageId={avatarId} alt={name} className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl object-cover flex-shrink-0 mb-4 ring-2 ring-white/10 shadow-lg" />}
      
      <div className={`flex flex-col gap-2 ${isBot ? 'items-start' : 'items-end'}`}>
        {MessageContent}
        {!isEditing && ActionBox}
      </div>

      {!isBot && <Avatar imageId={avatarId} alt={name} className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl object-cover flex-shrink-0 mb-4 ring-2 ring-accent-primary/50 shadow-lg" />}
    </div>
  );
};

export default Message;
