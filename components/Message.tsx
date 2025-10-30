

import React, { useState } from 'react';
import type { ChatMessage, Character, User } from '../types';
import { EditIcon, DeleteIcon, SaveIcon, CancelIcon, SoundOnIcon, RewindIcon } from './Icons';
import Avatar from './Avatar';

interface MessageProps {
  message: ChatMessage;
  character: Character;
  user: User | null;
  onUpdate: (messageId: string, newText: string) => void;
  onDelete: (messageId:string) => void;
  onPlayTTS: (text: string) => void;
  onRewind: (messageId: string) => void;
}

const Message: React.FC<MessageProps> = ({ message, character, user, onUpdate, onDelete, onPlayTTS, onRewind }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);

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

  const isBot = message.sender === 'bot';
  const avatarId = isBot ? character.avatarUrl : (user?.profile.avatarUrl || `https://i.pravatar.cc/150?u=${user?.id || 'user'}`);
  const name = isBot ? character.name : 'You';

  const MessageBubble = (
    <div className="group max-w-md lg:max-w-2xl xl:max-w-3xl">
      <div className={`px-4 py-3 rounded-xl ${isBot ? 'bg-[--bg-secondary]' : 'bg-[--accent-secondary] text-white'}`}>
        <div className="flex items-center justify-between">
            <p className={`font-bold ${isBot ? 'text-[--text-primary]' : 'text-white'}`}>{name}</p>
            {!isEditing && (
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isBot && <button onClick={() => onPlayTTS(message.text)} className="p-1 text-[--text-secondary] hover:text-[--text-primary]"><SoundOnIcon className="w-4 h-4" /></button>}
                    <button onClick={() => onRewind(message.id)} className="p-1 text-[--text-secondary] hover:text-[--text-primary]" title="Rewind to here"><RewindIcon className="w-4 h-4" /></button>
                    <button onClick={() => setIsEditing(true)} className="p-1 text-[--text-secondary] hover:text-[--text-primary]"><EditIcon className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(message.id)} className="p-1 text-[--text-secondary] hover:text-[--text-primary]"><DeleteIcon className="w-4 h-4" /></button>
                </div>
            )}
        </div>
        {isEditing ? (
          <div className="mt-1">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full p-2 bg-[--bg-primary] border border-[--border-color] rounded-md focus:outline-none focus:ring-1 focus:ring-[--accent-primary] text-[--text-primary]"
              rows={3}
            />
            <div className="flex gap-2 mt-2">
              <button onClick={handleSave} className="p-1 text-green-400 hover:text-green-300"><SaveIcon className="w-5 h-5" /></button>
              <button onClick={handleCancel} className="p-1 text-red-400 hover:text-red-300"><CancelIcon className="w-5 h-5" /></button>
            </div>
          </div>
        ) : (
          <p className={`whitespace-pre-wrap mt-1 ${isBot ? 'text-[--text-primary]' : 'text-white'}`}>{message.text}</p>
        )}
      </div>
    </div>
  );

  return (
    <div className={`flex items-start gap-3 sm:gap-4 ${isBot ? 'justify-start' : 'justify-end'}`}>
        {isBot && <Avatar imageId={avatarId} alt={name} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0" />}
        {MessageBubble}
        {!isBot && <Avatar imageId={avatarId} alt={name} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0" />}
    </div>
  );
};

export default Message;