
import React, { useContext } from 'react';
import type { Character, AppView, User } from '../types';
import { EditIcon, HeartIcon, DeleteIcon, ThumbsUpIcon, FlameIcon, RefreshIcon } from './Icons';
import Avatar from './Avatar';
import { AuthContext } from '../context/AuthContext';

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
  variant?: 'default' | 'profile';
}

const SkeletonCharacterCard = () => (
  <div className="relative group bg-secondary rounded-xl overflow-hidden shadow-soft-lg border border-accent-secondary/30">
    <div className="w-full aspect-[3/4] bg-tertiary animate-pulse" />
    <div className="absolute bottom-0 left-0 p-2 w-full glass-strong">
      <div className="h-3 bg-white/10 rounded animate-pulse w-3/4 mb-1.5" />
      <div className="h-1.5 bg-white/10 rounded animate-pulse w-1/2" />
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
  onCreatorClick,
  variant = 'default'
}) => {
  const auth = useContext(AuthContext);

  const handleManualRefresh = () => {
      if (auth?.refreshAdminData) {
          auth.refreshAdminData();
      } else {
          window.location.reload();
      }
  };

  // Determine grid layout based on variant
  const gridClasses = variant === 'profile'
    ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6" // Larger cards for profile
    : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2 sm:gap-3"; // Default compact grid

  // Determine button styling based on variant
  const controlButtonClasses = variant === 'profile'
    ? "p-2.5 bg-black/60 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition-colors border border-white/10 shadow-md"
    : "p-1.5 bg-black/60 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition-colors border border-white/10";

  const controlIconClasses = variant === 'profile' ? "h-4 w-4" : "h-3 w-3";
  const controlsContainerClasses = variant === 'profile'
    ? "absolute top-3 right-3 flex flex-col gap-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 z-10 transform translate-x-4 md:group-hover:translate-x-0"
    : "absolute top-2 right-2 flex flex-col gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 z-10 transform translate-x-4 md:group-hover:translate-x-0";


  const renderGridContent = () => {
    if (isLoading) {
      return (
        <div className={gridClasses}>
          {Array.from({ length: 16 }).map((_, index) => <SkeletonCharacterCard key={index} />)}
        </div>
      );
    }

    if (characters.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center text-text-secondary py-20 animate-fade-in text-center">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-6 shadow-glow">
             <span className="text-4xl">🏰</span>
          </div>
          <p className="text-3xl font-serif text-accent-secondary">The hall is empty.</p>
          <p className="mt-3 opacity-60 max-w-md">No characters match your search. Perhaps you should conjure one of your own?</p>
          
          <button 
            onClick={handleManualRefresh}
            className="mt-8 px-6 py-2 bg-tertiary hover:bg-hover rounded-full flex items-center gap-2 transition-colors border border-border"
          >
            <RefreshIcon className="w-4 h-4" />
            <span>Refresh the Realm</span>
          </button>
        </div>
      );
    }

    return (
      <div className={gridClasses}>
        {characters.map((character) => {
          const isFavorite = currentUser?.profile.favoriteCharacterIds?.includes(character.id);
          const creator = findUserById ? findUserById(character.creatorId) : null;
          
          return (
            <div key={character.id} className="relative group bg-secondary rounded-xl overflow-hidden shadow-soft-lg hover:shadow-glow-strong transform hover:-translate-y-1 transition-all duration-500 border border-accent-secondary/20 hover:border-accent-secondary/50 animate-fade-in" >
              <div onClick={() => onCharacterClick(character)} className="cursor-pointer overflow-hidden h-full relative">
                <Avatar imageId={character.avatarUrl} alt={character.name} className="w-full aspect-[3/4] object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-500" ></div>
              </div>

              {/* Badges */}
              <div className="absolute top-2 left-2 flex flex-col items-start gap-1 z-10 pointer-events-none">
                 {showControls && (
                  <div className="flex flex-col gap-1 items-start">
                    <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white rounded shadow-sm backdrop-blur-md ${character.isPublic ? 'bg-success/90' : 'bg-tertiary/90'}`}>
                      {character.isPublic ? 'Public' : 'Private'}
                    </span>
                    {character.isSilencedByAdmin && (
                       <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary bg-warning/90 rounded shadow-sm backdrop-blur-md">
                        Silenced
                      </span>
                    )}
                  </div>
                )}
                {character.isBeyondTheHaven && (
                   <div className="p-1 bg-black/60 backdrop-blur-md rounded-full border border-accent-primary/50 shadow-lg" title="Beyond the Haven (18+)">
                    <FlameIcon className="h-2.5 w-2.5 text-accent-primary animate-pulse" />
                  </div>
                )}
                
                {/* Heart Icon - Moves in on Hover - pointer-events-auto for button */}
                <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-x-4 group-hover:translate-x-0 pointer-events-auto pt-1">
                  {currentUser && (
                    <button onClick={(e) => { e.stopPropagation(); toggleFavorite?.(character.id); }} className="p-1.5 bg-black/60 backdrop-blur-md rounded-full text-white hover:text-accent-primary transition-colors border border-white/10 hover:border-accent-primary/50 shadow-lg" >
                      <HeartIcon className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current text-accent-primary' : 'text-white'}`} />
                    </button>
                  )}
                </div>
              </div>

              {/* Edit Controls - Adjusted size and position via classes */}
              {showControls && (
                <div className={controlsContainerClasses}>
                  <button onClick={(e) => { e.stopPropagation(); setView({ type: 'EDIT_CHARACTER', characterId: character.id }); }} className={controlButtonClasses} aria-label="Edit" >
                    <EditIcon className={controlIconClasses} />
                  </button>
                  {onDelete && (
                    <button onClick={(e) => { e.stopPropagation(); onDelete(character.id); }} className={`${controlButtonClasses} bg-red-900/80 hover:bg-red-800 border-red-500/30`} aria-label="Delete" >
                      <DeleteIcon className={controlIconClasses} />
                    </button>
                  )}
                </div>
              )}

              {/* Card Footer */}
              <div className="absolute bottom-0 left-0 w-full p-2.5">
                <h3 className="text-sm font-bold text-text-primary truncate cursor-pointer font-serif tracking-wide group-hover:text-accent-secondary transition-colors leading-tight drop-shadow-md" onClick={() => onCharacterClick(character)}>{character.name}</h3>
                <div className="flex justify-between items-end mt-1">
                  {creator && creator.profile ? (
                    <button onClick={(e) => { if (onCreatorClick) { e.stopPropagation(); onCreatorClick(creator); } }} className="text-[10px] font-medium text-text-secondary hover:text-white hover:underline truncate pr-2 flex items-center opacity-80 hover:opacity-100" >
                      <span className="opacity-50 font-normal mr-1">by</span> {creator.profile.name}
                    </button>
                  ) : (
                    <span className="text-[10px] text-text-secondary opacity-50">Unknown Creator</span>
                  )}
                  <div className="flex items-center gap-1 text-[10px] font-bold text-text-secondary flex-shrink-0 opacity-80 bg-black/40 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                    <ThumbsUpIcon className="w-2.5 h-2.5" />
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
    <div className="p-3 sm:p-6 w-full max-w-[2000px] mx-auto min-h-[50vh]">
      {renderGridContent()}
    </div>
  );
};

export default CharacterGrid;
