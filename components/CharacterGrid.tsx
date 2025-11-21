
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
    <div className="relative group bg-secondary/50 rounded-xl overflow-hidden shadow-soft-lg border border-white/5">
        <div className="w-full aspect-[3/4] bg-white/5 animate-pulse" />
        <div className="absolute bottom-0 left-0 p-4 w-full glass">
            <div className="h-4 bg-white/10 rounded animate-pulse w-3/4 mb-2" />
            <div className="h-3 bg-white/10 rounded animate-pulse w-1/2" />
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
            <div className="flex flex-col items-center justify-center text-text-secondary py-16 animate-fade-in">
                <p className="text-2xl font-serif">No characters found!</p>
                <p className="mt-2 opacity-70">Try creating a character or adjusting your filters.</p>
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
                    className="relative group bg-primary-glass rounded-xl overflow-hidden shadow-soft-lg hover:shadow-glow transform hover:-translate-y-1.5 transition-all duration-300 border border-white/5 animate-fade-in"
                  >
                    <div onClick={() => onCharacterClick(character)} className="cursor-pointer">
                        <Avatar 
                          imageId={character.avatarUrl} 
                          alt={character.name} 
                          className="w-full aspect-[3/4] object-cover transition-transform duration-500 group-hover:scale-105" 
                        />
                        <div 
                          className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-300"
                        ></div>
                    </div>

                    {/* Top-left corner items */}
                    <div className="absolute top-2 left-2 flex flex-col items-start gap-2 z-10">
                        {showControls && (
                            <div className="flex flex-col gap-1 items-start">
                                <span className={`px-2 py-1 text-xs font-bold text-white rounded-md shadow-sm backdrop-blur-md ${character.isPublic ? 'bg-success/80' : 'bg-gray-600/80'}`}>
                                    {character.isPublic ? 'Public' : 'Private'}
                                </span>
                                {character.isSilencedByAdmin && (
                                    <span className="px-2 py-1 text-xs font-bold text-yellow-200 bg-warning/80 rounded-md shadow-sm backdrop-blur-md">
                                        Silenced
                                    </span>
                                )}
                            </div>
                        )}
                        {/* Always visible icons */}
                        {character.isBeyondTheHaven && (
                            <div className="p-1.5 bg-black/60 backdrop-blur-sm rounded-full border border-accent-primary/30" title="Beyond the Haven (18+)">
                                <FlameIcon className="h-4 w-4 text-accent-primary" />
                            </div>
                        )}

                        {/* Hover-visible icons */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-x-[-10px] group-hover:translate-x-0">
                            {currentUser && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleFavorite?.(character.id); }}
                                    className="p-1.5 bg-black/60 backdrop-blur-sm rounded-full text-white hover:text-accent-primary transition-colors border border-white/10 hover:border-accent-primary/50"
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
                        <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 z-10 transform translate-x-[10px] md:group-hover:translate-x-0">
                            <button
                                onClick={(e) => { e.stopPropagation(); setView({ type: 'EDIT_CHARACTER', characterId: character.id }); }}
                                className="p-2 bg-black/60 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition-colors border border-white/10"
                                aria-label="Edit Character"
                            >
                                <EditIcon className="h-4 w-4" />
                            </button>
                            {onDelete && (
                                 <button
                                    onClick={(e) => { e.stopPropagation(); onDelete(character.id); }}
                                    className="p-2 bg-red-900/80 backdrop-blur-sm rounded-full text-white hover:bg-red-800 transition-colors border border-red-500/30"
                                    aria-label="Delete Character"
                                >
                                    <DeleteIcon className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    )}
                    
                    <div className="absolute bottom-0 left-0 w-full p-3 glass border-t border-white/10 backdrop-blur-xl transition-colors duration-300 group-hover:bg-black/40">
                      <h3 className="text-base font-bold text-white truncate cursor-pointer font-serif tracking-wide" onClick={() => onCharacterClick(character)}>{character.name}</h3>
                      <div className="flex justify-between items-center mt-1">
                          {creator && creator.profile ? (
                              <button 
                                onClick={(e) => { 
                                    if (onCreatorClick) {
                                        e.stopPropagation(); 
                                        onCreatorClick(creator); 
                                    }
                                }} 
                                className="text-xs text-gray-300 hover:text-white hover:underline truncate pr-2"
                              >
                                  by {creator.profile.name || 'Unknown'}
                              </button>
                          ) : (
                              <span className="text-xs text-gray-400 pr-2">by Unknown</span>
                          )}
                          <div className="flex items-center gap-1 text-xs text-gray-300 flex-shrink-0 bg-black/30 px-1.5 py-0.5 rounded-full">
                              <ThumbsUpIcon className="w-3 h-3" />
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
