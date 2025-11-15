

import React, { useContext, useState, useMemo } from 'react';
import type { Character, AppView, User, ForumThread, ForumPost } from '../types';
import CharacterGrid from './CharacterGrid';
import { EditIcon, TicketIcon } from './Icons';
import Avatar from './Avatar';
import { AuthContext } from '../context/AuthContext';
import ConfirmationModal from './ConfirmationModal';

const ForumActivity: React.FC<{ user: User, setView: (view: AppView) => void }> = ({ user, setView }) => {
    const auth = useContext(AuthContext);
    const { forumThreads = [], getPostsForThread, findUserById } = auth || {};

    const myThreads = useMemo(() => {
        return forumThreads.filter(t => t.authorId === user.id);
    }, [forumThreads, user.id]);

    const myPosts = useMemo(() => {
        const allPosts: ForumPost[] = [];
        forumThreads.forEach(thread => {
            const posts = getPostsForThread?.(thread.id) || [];
            allPosts.push(...posts.filter(p => p.authorId === user.id && !p.isCharacterPost));
        });
        return allPosts.sort((a, b) => b.createdAt - a.createdAt).slice(0, 10); // Show recent 10 posts
    }, [forumThreads, getPostsForThread, user.id]);

    const getThreadForPost = (postId: string) => {
        return forumThreads.find(t => getPostsForThread?.(t.id)?.some(p => p.id === postId));
    };

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-xl font-bold mb-4">My Threads ({myThreads.length})</h3>
                {myThreads.length > 0 ? (
                    <div className="space-y-2">
                        {myThreads.map(thread => (
                            <button key={thread.id} onClick={() => setView({ type: 'FORUM_THREAD', threadId: thread.id })} className="w-full text-left p-3 bg-secondary hover:bg-hover rounded-lg transition-colors">
                                <p className="font-semibold text-text-primary">{thread.title}</p>
                                <p className="text-xs text-text-secondary">Created on {new Date(thread.createdAt).toLocaleDateString()}</p>
                            </button>
                        ))}
                    </div>
                ) : (
                    <p className="text-text-secondary">No threads created yet.</p>
                )}
            </div>
            <div>
                <h3 className="text-xl font-bold mb-4">Recent Posts</h3>
                {myPosts.length > 0 ? (
                    <div className="space-y-2">
                        {myPosts.map(post => {
                            const thread = getThreadForPost(post.id);
                            return (
                                <button key={post.id} onClick={() => thread && setView({ type: 'FORUM_THREAD', threadId: thread.id })} className="w-full text-left p-3 bg-secondary hover:bg-hover rounded-lg transition-colors" disabled={!thread}>
                                    <p className="text-sm text-text-primary truncate">{post.content}</p>
                                    {thread && <p className="text-xs text-text-secondary mt-1">in thread: <span className="font-medium">{thread.title}</span></p>}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-text-secondary">No posts made yet.</p>
                )}
            </div>
        </div>
    );
};


interface ProfileViewProps {
  user: User;
  myCharacters: Character[];
  favoriteCharacters: Character[];
  setView: (view: AppView) => void;
  onEditProfile: () => void;
  toggleFavorite: (characterId: string) => void;
  onCharacterClick: (character: Character) => void;
  isLoading: boolean;
}

const ProfileView: React.FC<ProfileViewProps> = ({ user, myCharacters, favoriteCharacters, setView, onEditProfile, toggleFavorite, onCharacterClick, isLoading }) => {
  const auth = useContext(AuthContext);
  const [charToDelete, setCharToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('characters');

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

  const formFieldClasses = "w-full sm:w-auto bg-secondary border border-border rounded-md py-2 px-4 focus:outline-none focus:ring-1 focus:ring-accent-primary";

  const tabs = [
    { id: 'characters', label: 'My Characters' },
    { id: 'favorites', label: 'Favorites' },
    { id: 'forum', label: 'Forum Activity' },
  ];

  return (
    <div className="bg-primary min-h-full">
        <div className="p-4 sm:p-8 bg-secondary border-b border-border">
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 max-w-7xl mx-auto relative">
                <Avatar 
                    imageId={user.profile.avatarUrl} 
                    alt="User profile" 
                    className="w-24 h-24 md:w-32 md:h-32 rounded-full ring-4 ring-accent-primary object-cover"
                />
                <div className="text-center sm:text-left">
                    <h1 className="text-3xl md:text-4xl font-bold text-text-primary">{user.profile.name}</h1>
                    <p className="text-text-secondary mt-2">{user.profile.bio || "No bio set."}</p>
                    {user.isSilenced && <p className="mt-2 px-3 py-1 text-sm bg-yellow-900/50 text-yellow-300 rounded-full inline-block">This user is silenced.</p>}
                </div>
                <div className="absolute top-0 right-0 flex gap-2">
                    <button 
                        onClick={() => setView({type: 'SUPPORT_TICKET'})}
                        className="px-3 py-2 bg-tertiary hover:bg-hover rounded-md text-sm flex items-center gap-2"
                        title="Submit a Ticket"
                    >
                        <TicketIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Support</span>
                    </button>
                    <button 
                        onClick={onEditProfile}
                        className="px-3 py-2 bg-tertiary hover:bg-hover rounded-md text-sm flex items-center gap-2"
                        title="Edit Profile"
                    >
                        <EditIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Edit Profile</span>
                    </button>
                </div>
            </div>
        </div>
        
        <div className="p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="border-b border-border mb-6">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`${
                                    activeTab === tab.id
                                    ? 'border-accent-primary text-accent-primary'
                                    : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {activeTab === 'characters' && (
                  <div>
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-text-primary">My Characters ({myCharacters.length})</h2>
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
                    <CharacterGrid characters={filteredMyCharacters} setView={setView} onCharacterClick={onCharacterClick} isLoading={isLoading} showControls={true} currentUser={auth?.currentUser} toggleFavorite={toggleFavorite} onDelete={handleDeleteRequest} findUserById={auth?.findUserById} onCreatorClick={() => {}}/>
                  </div>
                )}
                
                {activeTab === 'favorites' && (
                    <div>
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-text-primary">Favorite Characters ({favoriteCharacters.length})</h2>
                            <input 
                                  type="text" 
                                  placeholder="Search favorites..." 
                                  value={favsSearch}
                                  onChange={(e) => setFavsSearch(e.target.value)}
                                  className={formFieldClasses}
                              />
                        </div>
                        <CharacterGrid characters={filteredFavoriteCharacters} setView={setView} onCharacterClick={onCharacterClick} isLoading={isLoading} showControls={false} currentUser={auth?.currentUser} toggleFavorite={toggleFavorite} findUserById={auth?.findUserById} onCreatorClick={(creator) => { /* Handle creator click if needed */ }}/>
                    </div>
                )}

                {activeTab === 'forum' && <ForumActivity user={user} setView={setView} />}
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
