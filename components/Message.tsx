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
    // Split by the markdown for italics (*...*), capturing the delimiter.
    return message.text.split(/(\*.*?\*)/g).map((segment, index) => {
        if (segment.startsWith('*') && segment.endsWith('*')) {
            // This is an action/narration part. Render it as italics.
            return <em key={index}>{segment.substring(1, segment.length - 1)}</em>;
        }
        // This is a regular text part (e.g., dialogue).
        return <span key={index}>{segment}</span>;
    });
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
  const avatarId = isBot ? character.avatarUrl : (user?.profile.avatarUrl || `https://i.pravatar.cc/150?u=${user?.id || 'user'}`);
  const name = isBot ? character.name : 'You';

  const ActionBox = (
    <div className="flex items-center gap-1 p-1 bg-tertiary rounded-full shadow-sm flex-shrink-0">
        {isBot && (
          isTtsLoading 
            ? <SpinnerIcon className="w-4 h-4 text-text-secondary animate-spin mx-1" />
            : <button onClick={() => onPlayTTS(message.text, message.id)} className="p-1 text-text-secondary hover:text-text-primary rounded-full hover:bg-hover" title={isTtsPlaying ? "Stop" : "Read Aloud"}>
                {isTtsPlaying ? <StopIcon className="w-4 h-4 text-accent-primary"/> : <SoundOnIcon className="w-4 h-4" />}
            </button>
        )}
        <button onClick={handleCopy} className="p-1 text-text-secondary hover:text-text-primary rounded-full hover:bg-hover" title="Copy Text">
            <ClipboardIcon className={`w-4 h-4 ${isCopied ? 'text-success' : ''}`} />
        </button>
        {isBot && (
            <button onClick={() => onRetry(message.id)} className="p-1 text-text-secondary hover:text-text-primary rounded-full hover:bg-hover" title="Regenerate Response">
                <RefreshIcon className="w-4 h-4" />
            </button>
        )}
        <button onClick={() => onRewind(message.id)} className="p-1 text-text-secondary hover:text-text-primary rounded-full hover:bg-hover" title="Rewind to here"><RewindIcon className="w-4 h-4" /></button>
        <button onClick={() => setIsEditing(true)} className="p-1 text-text-secondary hover:text-text-primary rounded-full hover:bg-hover" title="Edit Message"><EditIcon className="w-4 h-4" /></button>
        <button onClick={() => onDelete(message.id)} className="p-1 text-text-secondary hover:text-text-primary rounded-full hover:bg-hover" title="Delete Message"><DeleteIcon className="w-4 h-4" /></button>
        {isBot && (
            <button onClick={() => onReport(message.id)} className="p-1 text-text-secondary hover:text-text-primary rounded-full hover:bg-hover" title="Report Message">
                <FlagIcon className="w-4 h-4" />
            </button>
        )}
    </div>
  );

  const MessageContent = (
      <div className="max-w-full sm:max-w-md lg:max-w-2xl xl:max-w-3xl">
          <div className={`px-4 py-3 rounded-xl ${isBot ? 'bg-secondary' : 'bg-accent-primary text-white'}`}>
              <p className={`font-bold ${isBot ? 'text-text-primary' : 'text-white'}`}>{name}</p>
              {isEditing ? (
                  <div className="mt-1">
                      <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full p-2 bg-primary border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent-primary text-text-primary"
                          rows={Math.max(3, editText.split('\n').length)}
                      />
                      <div className="flex gap-2 mt-2">
                          <button onClick={handleSave} className="p-1 text-success hover:opacity-80"><SaveIcon className="w-5 h-5" /></button>
                          <button onClick={handleCancel} className="p-1 text-danger hover:opacity-80"><CancelIcon className="w-5 h-5" /></button>
                      </div>
                  </div>
              ) : (
                  <div className={`whitespace-pre-wrap mt-1 ${isBot ? 'text-text-primary' : 'text-white'}`}>
                    {formattedText}
                  </div>
              )}
          </div>
      </div>
  );

  return (
    <div className={`flex items-start gap-3 sm:gap-4 ${isBot ? 'justify-start' : 'justify-end'}`}>
        {isBot && <Avatar imageId={avatarId} alt={name} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0" />}
        <div className={`flex flex-col gap-2 ${isBot ? 'items-start' : 'items-end'}`}>
            {MessageContent}
            {!isEditing && ActionBox}
        </div>
        {!isBot && <Avatar imageId={avatarId} alt={name} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0" />}
    </div>
  );
};

export default Message;