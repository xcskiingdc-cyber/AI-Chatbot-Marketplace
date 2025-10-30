

import React, { useState } from 'react';
import type { ChatMessage, Character, User } from '../types';
import { EditIcon, DeleteIcon, SaveIcon, CancelIcon, SoundOnIcon } from './Icons';
import Avatar from './Avatar';

interface MessageProps {
  message: ChatMessage;
  character: Character;
  user: User | null;
  onUpdate: (messageId: string, newText: string) => void;
  onDelete: (messageId:string) => void;
  onPlayTTS: (text: string) => void;
}

const Message: React.FC<MessageProps> = ({ message, character, user, onUpdate, onDelete, onPlayTTS }) => {
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
  const avatarId = isBot ? character.avatarUrl : (user?.profile.avatarUrl || 'https://i.pravatar.cc/150?u=user');
  const name = isBot ? character.name : 'You';

  const MessageBubble = (
    <div className="group max-w-md lg:max-w-lg">
      <div className={`px-4 py-3 rounded-xl ${isBot ? 'bg-gray-800' : 'bg-blue-600 text-white'}`}>
        <div className="flex items-center justify-between">
            <p className={`font-bold ${isBot ? 'text-gray-100' : 'text-white'}`}>{name}</p>
            {!isEditing && (
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isBot && <button onClick={() => onPlayTTS(message.text)} className="p-1 text-gray-400 hover:text-white"><SoundOnIcon className="w-4 h-4" /></button>}
                    <button onClick={() => setIsEditing(true)} className="p-1 text-gray-400 hover:text-white"><EditIcon className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(message.id)} className="p-1 text-gray-400 hover:text-white"><DeleteIcon className="w-4 h-4" /></button>
                </div>
            )}
        </div>
        {isEditing ? (
          <div className="mt-1">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full p-2 bg-gray-950 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-white"
              rows={3}
            />
            <div className="flex gap-2 mt-2">
              <button onClick={handleSave} className="p-1 text-green-400 hover:text-green-300"><SaveIcon className="w-5 h-5" /></button>
              <button onClick={handleCancel} className="p-1 text-red-400 hover:text-red-300"><CancelIcon className="w-5 h-5" /></button>
            </div>
          </div>
        ) : (
          <p className={`whitespace-pre-wrap mt-1 ${isBot ? 'text-gray-300' : 'text-white'}`}>{message.text}</p>
        )}
      </div>
    </div>
  );

  return (
    <div className={`flex items-start gap-4 ${isBot ? 'justify-start' : 'justify-end'}`}>
        {isBot && <Avatar imageId={avatarId} alt={name} className="w-10 h-10 rounded-full object-cover" />}
        {MessageBubble}
        {!isBot && <Avatar imageId={avatarId} alt={name} className="w-10 h-10 rounded-full object-cover" />}
    </div>
  );
};

export default Message;