
import React, { useContext, useState, useMemo } from 'react';
import type { Character, AppView, User } from '../types';
import CharacterGrid from './CharacterGrid';
import { EditIcon } from './Icons';
import Avatar from './Avatar';
import { AuthContext } from '../context/AuthContext';
import ConfirmationModal from './ConfirmationModal';

interface ProfileViewProps {
  user: User;
  myCharacters: Character[];
  favoriteCharacters: Character[];
  setView: (view: AppView) => void;
  onEditProfile: () => void;
  toggleFavorite: (characterId: string) => void;
  onCharacterClick: (character: Character) => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ user, myCharacters, favoriteCharacters, setView, onEditProfile, toggleFavorite, onCharacterClick }) => {
  const auth = useContext(AuthContext);
  const [charToDelete, setCharToDelete] = useState<string | null>(null);

  const [myCharsSearch, setMyCharsSearch] = useState('');
  const [myCharsVisibility, setMyCharsVisibility] = useState('all');

  const [favsSearch, setFavsSearch] = useState('');

  const filteredMyCharacters = useMemo(() => {
    return myCharacters.filter(c => {
        if (myCharsVisibility === 'public' && !c.isPublic) return false;
        if (myCharsVisibility === 'private' && c.isPublic) return false;
        if (myCharsSearch && !c.name.toLowerCase().includes(myCharsSearch.toLowerCase()) && !c.description.toLowerCase().includes(myCharsSearch.toLowerCase())) return false;
        return true;
    });
  }, [myCharacters, myCharsSearch, myCharsVisibility]);
  
  const filteredFavoriteCharacters = useMemo(() => {
    return favoriteCharacters.filter(c => {
        if (favsSearch && !c.name.toLowerCase().includes(favsSearch.toLowerCase()) && !c.description.toLowerCase().includes(favsSearch.toLowerCase())) return false;
        return true;
    });
  }, [favoriteCharacters, favsSearch]);


  const handleDeleteRequest = (characterId: string) => {
    setCharToDelete(characterId);
  };

  const handleConfirmDelete = () => {
    if (charToDelete && auth) {
      auth.deleteCharacter(charToDelete);
    }
    setCharToDelete(null);
  };

  const formFieldClasses = "w-full sm:w-auto bg-[--bg-secondary] border border-[--border-color] rounded-md py-2 px-4 focus:outline-none focus:ring-1 focus:ring-[--accent-primary]";


  return (
    <div className="bg-[--bg-primary] min-h-full">
        <div className="p-4 sm:p-8 bg-[--bg-secondary] border-b border-[--border-color]">
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 max-w-7xl mx-auto relative">
                <Avatar 
                    imageId={user.profile.avatarUrl} 
                    alt="User profile" 
                    className="w-24 h-24 md:w-32 md:h-32 rounded-full ring-4 ring-[--accent-primary] object-cover"
                />
                <div className="text-center sm:text-left">
                    <h1 className="text-3xl md:text-4xl font-bold text-[--text-primary]">{user.profile.name}</h1>
                    <p className="text-[--text-secondary] mt-2">{user.profile.bio || "No bio set."}</p>
                    {user.isSilenced && <p className="mt-2 px-3 py-1 text-sm bg-yellow-900/50 text-yellow-300 rounded-full inline-block">This user is silenced.</p>}
                </div>
                <button 
                    onClick={onEditProfile}
                    className="absolute top-0 right-0 px-3 py-2 bg-[--bg-tertiary] hover:bg-[--bg-hover] rounded-md text-sm flex items-center gap-2"
                >
                    <EditIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Edit Profile</span>
                </button>
            </div>
        </div>
        
        <div className="p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-[--text-primary]">My Characters</h2>
                  <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                      <input 
                          type="text" 
                          placeholder="Search my characters..." 
                          value={myCharsSearch}
                          onChange={(e) => setMyCharsSearch(e.target.value)}
                          className={formFieldClasses}
                      />
                      <select 
                          value={myCharsVisibility}
                          onChange={(e) => setMyCharsVisibility(e.target.value)}
                          className={formFieldClasses}
                      >
                          <option value="all">All</option>
                          <option value="public">Public</option>
                          <option value="private">Private</option>
                      </select>
                  </div>
              </div>
              <CharacterGrid characters={filteredMyCharacters} setView={setView} onCharacterClick={onCharacterClick} showControls={true} currentUser={auth?.currentUser} toggleFavorite={toggleFavorite} onDelete={handleDeleteRequest} findUserById={auth?.findUserById} onCreatorClick={() => {}}/>
            </div>
        </div>

        <div className="p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-[--text-primary]">Favorite Characters</h2>
                    <input 
                          type="text" 
                          placeholder="Search favorites..." 
                          value={favsSearch}
                          onChange={(e) => setFavsSearch(e.target.value)}
                          className={formFieldClasses}
                      />
                </div>
                <CharacterGrid characters={filteredFavoriteCharacters} setView={setView} onCharacterClick={onCharacterClick} showControls={false} currentUser={auth?.currentUser} toggleFavorite={toggleFavorite} findUserById={auth?.findUserById} onCreatorClick={() => {}}/>
            </div>
        </div>

        {charToDelete && (
            <ConfirmationModal 
                title="Delete Character?"
                message="Are you sure you want to permanently delete this character and all associated chat histories? This action cannot be undone."
                confirmText="Delete"
                onConfirm={handleConfirmDelete}
                onCancel={() => setCharToDelete(null)}
            />
        )}
    </div>
  );
};

export default ProfileView;