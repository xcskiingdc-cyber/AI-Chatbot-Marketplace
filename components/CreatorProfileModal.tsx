import React from 'react';
import type { User } from '../types';
import { CloseIcon } from './Icons';
import Avatar from './Avatar';

interface CreatorProfileModalProps {
  creator: User;
  currentUser: User;
  onClose: () => void;
  onFollow: (userId: string) => void;
}

const CreatorProfileModal: React.FC<CreatorProfileModalProps> = ({ creator, currentUser, onClose, onFollow }) => {
    const isFollowingCreator = currentUser.profile.following.includes(creator.id);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-sm relative border border-gray-700">
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-white">
                    <CloseIcon className="w-6 h-6" />
                </button>
                <div className="p-8 flex flex-col items-center text-center">
                    <Avatar 
                        imageId={creator.profile.avatarUrl} 
                        alt={creator.profile.name} 
                        className="w-24 h-24 rounded-full object-cover ring-4 ring-pink-500/50 mb-4" 
                    />
                    <h2 className="text-2xl font-bold text-white">{creator.profile.name}</h2>
                    <p className="text-gray-400 mt-2 text-sm max-h-24 overflow-y-auto">{creator.profile.bio || "No bio available."}</p>
                    
                    {creator.id !== currentUser.id && (
                        <button
                            onClick={() => onFollow(creator.id)}
                            className={`w-full mt-6 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${isFollowingCreator ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                        >
                            {isFollowingCreator ? 'Following' : 'Follow'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreatorProfileModal;
