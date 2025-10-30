
import React from 'react';
import type { Character, ChatMessage, AppView } from '../types';
import Avatar from './Avatar';
import { DeleteIcon } from './Icons';

interface RecentChatsViewProps {
  characters: Character[];
  userChatHistories: Record<string, ChatMessage[]>;
  setView: (view: AppView) => void;
  deleteChatHistory: (characterId: string) => void;
}

const RecentChatsView: React.FC<RecentChatsViewProps> = ({ characters, userChatHistories, setView, deleteChatHistory }) => {
  const recentChats = Object.keys(userChatHistories)
    .map(characterId => {
      const character = characters.find(c => c.id === characterId);
      const history = userChatHistories[characterId];
      if (!character || !history || history.length === 0) {
        return null;
      }
      const lastMessage = history[history.length - 1];
      return { character, lastMessage };
    })
    .filter((chat): chat is { character: Character; lastMessage: ChatMessage } => chat !== null)
    .sort((a, b) => b.lastMessage.timestamp - a.lastMessage.timestamp);

  if (recentChats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-secondary text-center p-4">
        <p className="text-2xl">No recent chats.</p>
        <p>Start a conversation from the Home screen.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-text-primary">Recent Chats</h1>
      <div className="space-y-4">
        {recentChats.map(({ character, lastMessage }) => (
          <div
            key={character.id}
            onClick={() => setView({ type: 'CHAT', characterId: character.id })}
            className="flex items-center p-4 bg-secondary rounded-lg cursor-pointer hover:bg-hover transition-colors duration-200 group relative"
          >
            <Avatar imageId={character.avatarUrl} alt={character.name} className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover mr-4" />
            <div className="flex-1 overflow-hidden">
              <div className="flex justify-between items-baseline">
                <h2 className="text-lg font-bold text-text-primary truncate">{character.name}</h2>
                <p className="text-xs text-text-secondary flex-shrink-0 ml-4">
                  {new Date(lastMessage.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
              <p className="text-text-secondary truncate mt-1">
                <span className="font-medium text-text-primary">{lastMessage.sender === 'user' ? 'You: ' : ''}</span>
                {lastMessage.text}
              </p>
            </div>
             <button
                onClick={(e) => { e.stopPropagation(); deleteChatHistory(character.id); }}
                className="absolute top-1/2 -translate-y-1/2 right-4 p-2 bg-red-800/50 rounded-full text-red-300 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700/50"
                aria-label="Delete Chat"
            >
                <DeleteIcon className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentChatsView;