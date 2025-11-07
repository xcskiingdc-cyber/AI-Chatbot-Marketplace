
import React, { useMemo } from 'react';
import type { User, Character } from '../types';
import { CloseIcon, FlagIcon, MessageIcon } from './Icons';
import Avatar from './Avatar';

interface CreatorProfileModalProps {
  creator: User;
  currentUser: User;
  characters: Character[];
  onClose: () => void;
  onFollow: (userId: string) => void;
  onReportUser: () => void;
  onCharacterClick: (character: Character) => void;
  onSendMessage?: (user: User) => void;
}

const CreatorProfileModal: React.FC<CreatorProfileModalProps> = ({ creator, currentUser, characters, onClose, onFollow, onReportUser, onCharacterClick, onSendMessage }) => {
    const isFollowingCreator = currentUser.profile.following.includes(creator.id);

    const creatorCharacters = useMemo(() => {
        return characters.filter(c => c.creatorId === creator.id && c.isPublic && !c.isSilencedByAdmin);
    }, [characters, creator.id]);

    return (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-40 p-4">
            <div className="bg-gradient-to-b from-primary to-secondary rounded-lg shadow-soft-lg w-full max-w-sm flex flex-col relative border border-border max-h-[90vh]">
                <button onClick={onClose} className="absolute top-3 right-3 text-text-secondary hover:text-text-primary z-10">
                    <CloseIcon className="w-6 h-6" />
                </button>

                <div className="p-8 flex flex-col items-center text-center flex-shrink-0">
                    <Avatar 
                        imageId={creator.profile.avatarUrl} 
                        alt={creator.profile.name} 
                        className="w-24 h-24 rounded-full object-cover ring-4 ring-accent-primary/50 mb-4" 
                    />
                    <h2 className="text-2xl font-bold text-text-primary">{creator.profile.name}</h2>
                    <p className="text-text-secondary mt-2 text-sm max-h-24 overflow-y-auto">{creator.profile.bio || "No bio available."}</p>
                    
                    <div className="w-full mt-6 flex flex-col gap-2">
                        {creator.id !== currentUser.id && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => onFollow(creator.id)}
                                    className={`flex-1 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${isFollowingCreator ? 'bg-accent-secondary text-white' : 'bg-tertiary text-text-primary hover:bg-hover'}`}
                                >
                                    {isFollowingCreator ? 'Following' : 'Follow'}
                                </button>
                                <button onClick={onReportUser} className="p-2 rounded-full bg-tertiary text-text-secondary hover:bg-hover hover:text-text-primary transition-colors" title="Report User">
                                    <FlagIcon className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                        {currentUser && ['Admin', 'Assistant Admin', 'Moderator'].includes(currentUser.role) && creator.id !== currentUser.id && onSendMessage && (
                            <button
                                onClick={() => onSendMessage(creator)}
                                className="w-full px-4 py-2 rounded-full text-sm font-semibold transition-colors bg-accent-primary text-white hover:bg-accent-primary-hover flex items-center justify-center gap-2"
                            >
                                <MessageIcon className="w-5 h-5" />
                                Send Message
                            </button>
                        )}
                    </div>
                </div>

                <div className="border-t border-border mt-auto flex-1 overflow-y-auto">
                    <h3 className="text-lg font-semibold text-text-primary p-4 pb-2 sticky top-0 bg-primary z-10">Creations ({creatorCharacters.length})</h3>
                    {creatorCharacters.length > 0 ? (
                        <div className="px-4 pb-4 space-y-3">
                            {creatorCharacters.map(char => (
                                <button key={char.id} onClick={() => onCharacterClick(char)} className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-secondary transition-colors text-left">
                                    <Avatar imageId={char.avatarUrl} alt={char.name} className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
                                    <span className="font-medium text-text-primary truncate">{char.name}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-text-secondary text-center p-4">This user has no public creations.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreatorProfileModal;