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


  return (
    <div className="bg-gray-950 min-h-full">
        <div className="p-8 bg-gray-900">
            <div className="flex items-center space-x-6 max-w-7xl mx-auto relative">
                <Avatar 
                    imageId={user.profile.avatarUrl} 
                    alt="User profile" 
                    className="w-24 h-24 md:w-32 md:h-32 rounded-full ring-4 ring-pink-500 object-cover"
                />
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white">{user.profile.name}</h1>
                    <p className="text-gray-400 mt-2">{user.profile.bio || "No bio set."}</p>
                    {user.isSilenced && <p className="mt-2 px-3 py-1 text-sm bg-yellow-900/50 text-yellow-300 rounded-full inline-block">This user is silenced.</p>}
                </div>
                <button 
                    onClick={onEditProfile}
                    className="absolute top-0 right-0 mt-2 mr-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm flex items-center gap-2"
                >
                    <EditIcon className="w-4 h-4" />
                    Edit Profile
                </button>
            </div>
        </div>
        
        <div className="p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">My Characters</h2>
                  <div className="flex items-center gap-4">
                      <input 
                          type="text" 
                          placeholder="Search my characters..." 
                          value={myCharsSearch}
                          onChange={(e) => setMyCharsSearch(e.target.value)}
                          className="bg-gray-800 border border-gray-700 rounded-md py-2 px-4 focus:outline-none focus:ring-1 focus:ring-pink-500"
                      />
                      <select 
                          value={myCharsVisibility}
                          onChange={(e) => setMyCharsVisibility(e.target.value)}
                          className="bg-gray-800 border border-gray-700 rounded-md py-2 px-3 focus:outline-none focus:ring-1 focus:ring-pink-500"
                      >
                          <option value="all">All</option>
                          <option value="public">Public</option>
                          <option value="private">Private</option>
                      </select>
                  </div>
              </div>
              <CharacterGrid characters={filteredMyCharacters} setView={setView} onCharacterClick={onCharacterClick} showControls={true} currentUser={auth?.currentUser} toggleFavorite={toggleFavorite} onDelete={handleDeleteRequest} />
            </div>
        </div>

        <div className="p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">Favorite Characters</h2>
                    <input 
                          type="text" 
                          placeholder="Search favorites..." 
                          value={favsSearch}
                          onChange={(e) => setFavsSearch(e.target.value)}
                          className="bg-gray-800 border border-gray-700 rounded-md py-2 px-4 focus:outline-none focus:ring-1 focus:ring-pink-500"
                      />
                </div>
                <CharacterGrid characters={filteredFavoriteCharacters} setView={setView} onCharacterClick={onCharacterClick} showControls={false} currentUser={auth?.currentUser} toggleFavorite={toggleFavorite} />
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