
import React from 'react';
import type { Character, AppView, User } from '../types';
import { EditIcon, HeartIcon, DeleteIcon, ThumbsUpIcon, FlameIcon } from './Icons';
import Avatar from './Avatar';

interface CharacterGridProps {
  characters: Character[];
  setView: (view: AppView) => void;
  onCharacterClick: (character: Character) => void;
  isLoading: boolean;
  showControls?: boolean;
  currentUser?: User | null;
  toggleFavorite?: (characterId: string) => void;
  onDelete?: (characterId: string) => void;
  findUserById?: (userId: string) => User | null;
  onCreatorClick?: (creator: User) => void;
}

const SkeletonCharacterCard = () => (
    <div className="relative group bg-secondary rounded-lg overflow-hidden shadow-soft-lg">
        <div className="w-full aspect-[3/4] bg-tertiary animate-pulse" />
        <div className="absolute bottom-0 left-0 p-3 w-full">
            <div className="h-4 bg-tertiary rounded animate-pulse w-3/4 mb-2" />
            <div className="h-3 bg-tertiary rounded animate-pulse w-1/2" />
        </div>
    </div>
);


const CharacterGrid: React.FC<CharacterGridProps> = ({ 
    characters, 
    setView, 
    onCharacterClick, 
    isLoading,
    showControls = false, 
    currentUser = null, 
    // FIX: The default function for toggleFavorite had the wrong signature (0 arguments instead of 1), causing a type error on invocation.
    toggleFavorite = (_characterId: string) => {}, 
    onDelete, 
    findUserById,
    onCreatorClick
}) => {

  const renderGridContent = () => {
    if (isLoading) {
        return (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                {Array.from({ length: 12 }).map((_, index) => <SkeletonCharacterCard key={index} />)}
            </div>
        );
    }

    if (characters.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-text-secondary py-16">
                <p className="text-2xl">No characters found!</p>
                <p>Try creating a character or adjusting your filters.</p>
            </div>
        );
    }
    
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {characters.map((character) => {
                const isFavorite = currentUser?.profile.favoriteCharacterIds?.includes(character.id);
                const creator = findUserById ? findUserById(character.creatorId) : null;
                return (
                  <div 
                    key={character.id} 
                    className="relative group bg-gradient-to-br from-secondary to-primary rounded-lg overflow-hidden shadow-soft-lg transform hover:-translate-y-1 transition-all duration-300 border border-tertiary/50"
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
                    <div className="absolute top-2 left-2 flex flex-col items-start gap-2 z-10">
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
                        {/* Always visible icons */}
                        {character.isBeyondTheHaven && (
                            <div className="p-1.5 bg-black/60 rounded-full" title="Beyond the Haven (18+)">
                                <FlameIcon className="h-5 w-5 text-accent-primary" />
                            </div>
                        )}

                        {/* Hover-visible icons */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            {currentUser && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleFavorite?.(character.id); }}
                                    className="p-1.5 bg-black/60 rounded-full text-white hover:text-accent-primary transition-colors"
                                    aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                                    title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                                >
                                    <HeartIcon className={`h-5 w-5 ${isFavorite ? 'fill-current text-accent-primary' : 'text-white'}`} />
                                </button>
                            )}
                        </div>
                    </div>


                    {/* Top-right corner controls */}
                    {showControls && (
                        <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 z-10">
                            <button
                                onClick={(e) => { e.stopPropagation(); setView({ type: 'EDIT_CHARACTER', characterId: character.id }); }}
                                className="p-2 bg-black/60 rounded-full text-white hover:opacity-100 transition-opacity"
                                aria-label="Edit Character"
                            >
                                <EditIcon className="h-5 w-5" />
                            </button>
                            {onDelete && (
                                 <button
                                    onClick={(e) => { e.stopPropagation(); onDelete(character.id); }}
                                    className="p-2 bg-red-800/80 rounded-full text-white hover:opacity-100 transition-opacity"
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
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 w-full max-w-screen-2xl mx-auto">
      {renderGridContent()}
    </div>
  );
};

export default CharacterGrid;
