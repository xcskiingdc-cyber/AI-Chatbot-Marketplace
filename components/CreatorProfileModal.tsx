
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
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
            <div className="bg-primary rounded-lg shadow-xl w-full max-w-sm relative border border-border">
                <button onClick={onClose} className="absolute top-3 right-3 text-text-secondary hover:text-text-primary">
                    <CloseIcon className="w-6 h-6" />
                </button>
                <div className="p-8 flex flex-col items-center text-center">
                    <Avatar 
                        imageId={creator.profile.avatarUrl} 
                        alt={creator.profile.name} 
                        className="w-24 h-24 rounded-full object-cover ring-4 ring-accent-primary/50 mb-4" 
                    />
                    <h2 className="text-2xl font-bold text-text-primary">{creator.profile.name}</h2>
                    <p className="text-text-secondary mt-2 text-sm max-h-24 overflow-y-auto">{creator.profile.bio || "No bio available."}</p>
                    
                    {creator.id !== currentUser.id && (
                        <button
                            onClick={() => onFollow(creator.id)}
                            className={`w-full mt-6 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${isFollowingCreator ? 'bg-accent-secondary text-white' : 'bg-tertiary text-text-primary hover:bg-hover'}`}
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