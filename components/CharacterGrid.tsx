import React from 'react';
import type { Character, AppView, User } from '../types';
import { EditIcon, HeartIcon } from './Icons';
import Avatar from './Avatar';

interface CharacterGridProps {
  characters: Character[];
  setView: (view: AppView) => void;
  showControls?: boolean;
  currentUser?: User | null;
  toggleFavorite?: (characterId: string) => void;
}

const CharacterGrid: React.FC<CharacterGridProps> = ({ characters, setView, showControls = false, currentUser = null, toggleFavorite = () => {} }) => {
  if (characters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 py-16">
        <p className="text-2xl">No characters found!</p>
        <p>Try creating a character or adjusting your filters.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6">
        {characters.map((character) => {
            const isFavorite = currentUser?.profile.favoriteCharacterIds?.includes(character.id);
            return (
              <div key={character.id} className="relative group bg-gray-900 rounded-lg overflow-hidden shadow-lg transform hover:-translate-y-1 transition-transform duration-200 cursor-pointer">
                <Avatar 
                  imageId={character.avatarUrl} 
                  alt={character.name} 
                  className="w-full h-64 object-cover" 
                  onClick={() => setView({ type: 'CHAT', characterId: character.id })}
                />
                <div 
                  className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"
                  onClick={() => setView({ type: 'CHAT', characterId: character.id })}
                ></div>
                <div 
                  className="absolute bottom-0 left-0 p-4"
                  onClick={() => setView({ type: 'CHAT', characterId: character.id })}
                >
                  <h3 className="text-lg font-bold text-white">{character.name}</h3>
                  <p className="text-sm text-gray-300 truncate">{character.description}</p>
                </div>
                {currentUser && (
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(character.id); }}
                        className="absolute top-2 left-2 p-2 bg-black bg-opacity-60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Favorite Character"
                    >
                        <HeartIcon className={`h-5 w-5 ${isFavorite ? 'text-pink-500 fill-current' : 'text-white'}`} />
                    </button>
                )}
                {showControls && (
                    <button
                        onClick={() => setView({ type: 'EDIT_CHARACTER', characterId: character.id })}
                        className="absolute top-2 right-2 p-2 bg-black bg-opacity-60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Edit Character"
                    >
                        <EditIcon className="h-5 w-5" />
                    </button>
                )}
              </div>
            )
        })}
      </div>
    </div>
  );
};

export default CharacterGrid;