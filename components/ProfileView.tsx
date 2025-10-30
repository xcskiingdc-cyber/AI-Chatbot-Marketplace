import React, { useContext } from 'react';
import type { Character, AppView, User } from '../types';
import CharacterGrid from './CharacterGrid';
import { EditIcon } from './Icons';
import Avatar from './Avatar';
import { AuthContext } from '../context/AuthContext';

interface ProfileViewProps {
  user: User;
  characters: Character[];
  favoriteCharacters: Character[];
  setView: (view: AppView) => void;
  onEditProfile: () => void;
  toggleFavorite: (characterId: string) => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ user, characters, favoriteCharacters, setView, onEditProfile, toggleFavorite }) => {
  const auth = useContext(AuthContext);

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
            <h2 className="text-2xl font-bold mb-6 text-white max-w-7xl mx-auto">My Characters</h2>
            <CharacterGrid characters={characters} setView={setView} showControls={true} currentUser={auth?.currentUser} toggleFavorite={toggleFavorite} />
        </div>

        <div className="p-4 md:p-8">
            <h2 className="text-2xl font-bold mb-6 text-white max-w-7xl mx-auto">Favorite Characters</h2>
            <CharacterGrid characters={favoriteCharacters} setView={setView} showControls={false} currentUser={auth?.currentUser} toggleFavorite={toggleFavorite} />
        </div>
    </div>
  );
};

export default ProfileView;