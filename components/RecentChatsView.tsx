
import React, { useState } from 'react';
import type { Character, ChatMessage, AppView } from '../types';
import Avatar from './Avatar';
import { DeleteIcon } from './Icons';
import ConfirmationModal from './ConfirmationModal';

interface RecentChatsViewProps {
  characters: Character[];
  userChatHistories: Record<string, ChatMessage[]>;
  setView: (view: AppView) => void;
  deleteChatHistory: (characterId: string) => void;
}

const RecentChatsView: React.FC<RecentChatsViewProps> = ({ characters, userChatHistories, setView, deleteChatHistory }) => {
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);

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

  const handleConfirmDelete = () => {
      if (chatToDelete) {
          deleteChatHistory(chatToDelete);
          setChatToDelete(null);
      }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-2 sm:p-6 md:p-8 overflow-hidden">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-text-primary px-2">Recent Chats</h1>
      
      <div className="mb-4 mx-1 sm:mx-0 p-3 sm:p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg flex gap-3 text-sm text-yellow-200/90 items-start">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0 text-yellow-500 mt-0.5">
            <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
        </svg>
        <p>Any chat that you don't interact with for 7 days will be deleted. Send a reply in the chat before the 7 days to keep the chat from being deleted.</p>
      </div>

      <div className="space-y-2 sm:space-y-3 pb-20">
        {recentChats.map(({ character, lastMessage }) => (
          <div
            key={character.id}
            onClick={() => setView({ type: 'CHAT', characterId: character.id })}
            className="w-full flex items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-secondary rounded-lg cursor-pointer hover:bg-hover transition-colors duration-200 group overflow-hidden shadow-sm border border-white/5"
          >
            <Avatar imageId={character.avatarUrl} alt={character.name} className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover flex-shrink-0" />
            
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex justify-between items-baseline mb-0.5 gap-2">
                <h2 className="text-base sm:text-lg font-bold text-text-primary truncate">{character.name}</h2>
                <p className="text-[10px] sm:text-xs text-text-secondary flex-shrink-0 whitespace-nowrap">
                  {new Date(lastMessage.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
              <p className="text-xs sm:text-sm text-text-secondary truncate">
                <span className="font-medium text-text-primary">{lastMessage.sender === 'user' ? 'You: ' : ''}</span>
                {lastMessage.text}
              </p>
            </div>

             <button
                onClick={(e) => { e.stopPropagation(); setChatToDelete(character.id); }}
                className="p-2 sm:p-2.5 text-red-400 hover:bg-red-900/20 hover:text-red-300 rounded-full transition-colors flex-shrink-0 ml-1"
                aria-label="Delete Chat"
                title="Delete Chat"
            >
                <DeleteIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        ))}
      </div>
      
      {chatToDelete && (
        <ConfirmationModal
            title="Delete Chat History?"
            message="Are you sure you want to delete the entire chat history with this character? This action cannot be undone."
            confirmText="Delete"
            onConfirm={handleConfirmDelete}
            onCancel={() => setChatToDelete(null)}
        />
      )}
    </div>
  );
};

export default RecentChatsView;
