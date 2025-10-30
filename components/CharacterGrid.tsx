
import React from 'react';
import type { Character, AppView, User } from '../types';
import { EditIcon, HeartIcon, DeleteIcon, ThumbsUpIcon } from './Icons';
import Avatar from './Avatar';

interface CharacterGridProps {
  characters: Character[];
  setView: (view: AppView) => void;
  onCharacterClick: (character: Character) => void;
  showControls?: boolean;
  currentUser?: User | null;
  toggleFavorite?: (characterId: string) => void;
  onDelete?: (characterId: string) => void;
  findUserById?: (userId: string) => User | null;
  onCreatorClick?: (creator: User) => void;
}

const CharacterGrid: React.FC<CharacterGridProps> = ({ 
    characters, 
    setView, 
    onCharacterClick, 
    showControls = false, 
    currentUser = null, 
    toggleFavorite = () => {}, 
    onDelete, 
    findUserById,
    onCreatorClick
}) => {
  if (characters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-text-secondary py-16">
        <p className="text-2xl">No characters found!</p>
        <p>Try creating a character or adjusting your filters.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 w-full max-w-screen-2xl mx-auto">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
        {characters.map((character) => {
            const isFavorite = currentUser?.profile.favoriteCharacterIds?.includes(character.id);
            const creator = findUserById ? findUserById(character.creatorId) : null;
            return (
              <div 
                key={character.id} 
                className="relative group bg-secondary rounded-lg overflow-hidden shadow-lg transform hover:-translate-y-1 transition-all duration-300"
              >
                <div onClick={() => onCharacterClick(character)} className="cursor-pointer">
                    <Avatar 
                      imageId={character.avatarUrl} 
                      alt={character.name} 
                      className="w-full aspect-[3/4] object-cover" 
                    />
                    <div 
                      className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
                    ></div>
                </div>

                {/* Top-left corner items */}
                <div className="absolute top-2 left-2 flex flex-col items-start gap-2">
                    {showControls && (
                        <div className="flex flex-col gap-1 items-start">
                            <span className={`px-2 py-1 text-xs font-bold text-white rounded-md ${character.isPublic ? 'bg-success/80' : 'bg-gray-600/80'}`}>
                                {character.isPublic ? 'Public' : 'Private'}
                            </span>
                            {character.isSilencedByAdmin && (
                                <span className="px-2 py-1 text-xs font-bold text-yellow-200 bg-warning/50 rounded-md">
                                    Silenced
                                </span>
                            )}
                        </div>
                    )}
                    {currentUser && (
                        <button
                            onClick={(e) => { e.stopPropagation(); toggleFavorite?.(character.id); }}
                            className="p-2 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Favorite Character"
                        >
                            <HeartIcon className={`h-5 w-5 ${isFavorite ? 'text-accent-primary fill-current' : 'text-white'}`} />
                        </button>
                    )}
                </div>

                {/* Top-right corner controls */}
                {showControls && (
                    <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={(e) => { e.stopPropagation(); setView({ type: 'EDIT_CHARACTER', characterId: character.id }); }}
                            className="p-2 bg-black/60 rounded-full text-white"
                            aria-label="Edit Character"
                        >
                            <EditIcon className="h-5 w-5" />
                        </button>
                        {onDelete && (
                             <button
                                onClick={(e) => { e.stopPropagation(); onDelete(character.id); }}
                                className="p-2 bg-red-800/80 rounded-full text-white"
                                aria-label="Delete Character"
                            >
                                <DeleteIcon className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                )}
                
                <div className="absolute bottom-0 left-0 p-3 w-full">
                  <h3 className="text-base font-bold text-white truncate cursor-pointer" onClick={() => onCharacterClick(character)}>{character.name}</h3>
                  <div className="flex justify-between items-center mt-1">
                      {creator && onCreatorClick ? (
                          <button onClick={(e) => { e.stopPropagation(); onCreatorClick(creator); }} className="text-xs text-text-secondary hover:text-white hover:underline truncate pr-2">
                              by {creator.profile.name}
                          </button>
                      ) : (
                          <span className="text-xs text-text-secondary pr-2">by Unknown</span>
                      )}
                      <div className="flex items-center gap-1 text-xs text-gray-300 flex-shrink-0">
                          <ThumbsUpIcon className="w-4 h-4" />
                          <span>{character.likes?.length || 0}</span>
                      </div>
                  </div>
                </div>
              </div>
            )
        })}
      </div>
    </div>
  );
};

export default CharacterGrid;