import React, { useState, useCallback, useMemo, useContext, useEffect } from 'react';
import useLocalStorage from './hooks/useLocalStorage';
import type { Character, ChatMessage, AppView, UserProfile, User } from './types';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Navbar from './components/Navbar';
import CharacterGrid from './components/CharacterGrid';
import CharacterForm from './components/CharacterForm';
import ChatView from './components/ChatView';
import RecentChatsView from './components/RecentChatsView';
import ProfileView from './components/ProfileView';
import LoginModal from './components/LoginModal';
import ProfileEditModal from './components/ProfileEditModal';
import NSFWConfirmationModal from './components/NSFWConfirmationModal';
import CharacterDetailModal from './components/CharacterDetailModal';
import NotificationsView from './components/NotificationsView';
import CreatorProfileModal from './components/CreatorProfileModal';
import AdminSettingsView from './components/AdminSettingsView';


const MainApp: React.FC = () => {
  const [view, setView] = useState<AppView>({ type: 'HOME' });
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [isProfileEditModalOpen, setProfileEditModalOpen] = useState(false);
  const [isNsfwModalOpen, setNsfwModalOpen] = useState(false);
  const [showNSFW, setShowNSFW] = useLocalStorage('ai-showNSFW', false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<User | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState<'character' | 'creator'>('character');
  const [sortOrder, setSortOrder] = useState('newest');

  
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error("AuthContext not found");
  }
  const { currentUser, allUsers, characters, chatHistories, saveCharacter, updateChatHistory, updateUserProfile, toggleFavorite, deleteChatHistory, likeCharacter, addComment, followUser, markNotificationsAsRead, findUserById } = auth;

  useEffect(() => {
    if (selectedCharacter) {
      const updatedCharacter = characters.find(c => c.id === selectedCharacter.id);
      if (updatedCharacter) {
        // This ensures the modal gets the latest data (likes, comments)
        if (JSON.stringify(updatedCharacter) !== JSON.stringify(selectedCharacter)) {
            setSelectedCharacter(updatedCharacter);
        }
      } else {
        // Character was likely deleted, so close the modal
        setSelectedCharacter(null);
      }
    }
  }, [characters, selectedCharacter]);

  const handleSaveCharacter = (characterData: Omit<Character, 'creatorId'> & { creatorId?: string }) => {
    if (!currentUser) {
        setLoginModalOpen(true);
        return;
    }
    const character: Character = {
        ...characterData,
        creatorId: characterData.creatorId || currentUser.id,
    };
    saveCharacter(character);
    setView({ type: 'PROFILE' });
  };
  
  const handleSaveProfile = (profile: UserProfile) => {
    updateUserProfile(profile);
    setProfileEditModalOpen(false);
  }

  const navigate = (newView: AppView) => {
    const protectedViews: AppView['type'][] = ['PROFILE', 'RECENT_CHATS', 'CREATE_CHARACTER', 'NOTIFICATIONS', 'ADMIN_SETTINGS'];
    if (protectedViews.includes(newView.type) && !currentUser) {
        setLoginModalOpen(true);
    } else if (newView.type === 'ADMIN_SETTINGS' && currentUser?.userType !== 'Admin') {
        // Prevent non-admins from accessing admin settings
        setView({ type: 'HOME' });
    } else {
        setView(newView);
    }
  };
  
  const isUserAdult = useMemo(() => {
    if (!currentUser?.profile.birthday) return false;
    try {
        const birthDate = new Date(currentUser.profile.birthday);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age >= 18;
    } catch (e) {
        return false;
    }
  }, [currentUser]);

  const myCharacters = useMemo(() => {
    if (!currentUser) return [];
    return characters.filter(c => c.creatorId === currentUser.id);
  }, [characters, currentUser]);
  
  const favoriteCharacters = useMemo(() => {
    if (!currentUser?.profile.favoriteCharacterIds) return [];
    const favIds = new Set(currentUser.profile.favoriteCharacterIds);
    return characters.filter(c => favIds.has(c.id));
  }, [characters, currentUser]);
  
  const currentCharacterForView = useMemo(() => {
      if (view.type === 'CHAT' || view.type === 'EDIT_CHARACTER') {
          return characters.find(c => c.id === view.characterId);
      }
      return undefined;
  }, [view, characters]);

    const handleNsfwToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        const isChecked = e.target.checked;
        if (isChecked) {
            setNsfwModalOpen(true);
        } else {
            setShowNSFW(false);
        }
    };

    const confirmNsfw = () => {
        setShowNSFW(true);
        setNsfwModalOpen(false);
    };

    const cancelNsfw = () => {
        setNsfwModalOpen(false);
    };

    const publicCharacters = useMemo(() => {
        return characters.filter(c => c.isPublic && !c.isSilencedByAdmin);
    }, [characters]);

    const filteredCharacters = useMemo(() => {
        let chars = publicCharacters;

        if (!showNSFW || !isUserAdult) {
            chars = chars.filter(c => !c.isNSFW);
        }

        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            chars = chars.filter(c => {
                 if (searchBy === 'character') {
                    return c.name.toLowerCase().includes(lowerSearchTerm) ||
                           c.description.toLowerCase().includes(lowerSearchTerm);
                } else { // search by creator
                    const creator = findUserById(c.creatorId);
                    return creator?.profile.name.toLowerCase().includes(lowerSearchTerm);
                }
            });
        }

        switch (sortOrder) {
            case 'popular':
                return chars.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
            case 'newest':
                 const sorted = [...chars].sort((a, b) => {
                    const aIndex = characters.findIndex(char => char.id === a.id);
                    const bIndex = characters.findIndex(char => char.id === b.id);
                    return bIndex - aIndex;
                });
                return sorted;
            default:
                return chars;
        }
    }, [publicCharacters, showNSFW, isUserAdult, searchTerm, sortOrder, characters, searchBy, findUserById]);


  const renderContent = () => {
    switch (view.type) {
      case 'CREATE_CHARACTER':
        return <CharacterForm onSave={handleSaveCharacter} onCancel={() => setView({ type: 'HOME' })} isUserAdult={isUserAdult} />;
      case 'EDIT_CHARACTER':
        return currentCharacterForView ? (
            <CharacterForm onSave={handleSaveCharacter} onCancel={() => setView({ type: 'PROFILE' })} existingCharacter={currentCharacterForView} isUserAdult={isUserAdult} />
        ) : <p>Character not found</p>;
      case 'CHAT':
        if (!currentCharacterForView) {
            setView({ type: 'HOME' });
            return null;
        }
        const history = (currentUser && chatHistories[currentUser.id]?.[currentCharacterForView.id]) || [];
        return <ChatView character={currentCharacterForView} chatHistory={history} updateChatHistory={updateChatHistory} />;
      case 'RECENT_CHATS':
        return currentUser ? <RecentChatsView characters={characters} userChatHistories={chatHistories[currentUser.id] || {}} setView={setView} deleteChatHistory={deleteChatHistory} /> : null;
      case 'PROFILE':
        return currentUser ? <ProfileView user={currentUser} myCharacters={myCharacters} favoriteCharacters={favoriteCharacters} setView={setView} onEditProfile={() => setProfileEditModalOpen(true)} toggleFavorite={toggleFavorite} onCharacterClick={setSelectedCharacter} /> : null;
      case 'NOTIFICATIONS':
        return currentUser ? <NotificationsView user={currentUser} setView={setView} onCharacterClick={setSelectedCharacter} markNotificationsAsRead={markNotificationsAsRead} /> : null;
      case 'ADMIN_SETTINGS':
        return (currentUser?.userType === 'Admin') ? <AdminSettingsView /> : <p>Access Denied</p>;
      case 'HOME':
      default:
        return (
          <>
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 w-full">
              <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex items-center gap-2 w-full md:w-1/2">
                    <div className="relative flex-grow">
                        <input 
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-pink-500"
                        />
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                        </div>
                    </div>
                     <select
                        value={searchBy}
                        onChange={(e) => setSearchBy(e.target.value as 'character' | 'creator')}
                        className="bg-gray-800 border border-gray-700 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-pink-500"
                      >
                        <option value="character">By Character</option>
                        <option value="creator">By Creator</option>
                      </select>
                </div>
                <div className="flex items-center gap-4">
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="newest">Newest</option>
                    <option value="popular">Most Popular</option>
                  </select>
                  {currentUser && isUserAdult && (
                    <label htmlFor="nsfw-toggle" className="flex items-center cursor-pointer">
                        <div className="mr-3 text-gray-300 font-medium hidden sm:block">
                            Show NSFW
                        </div>
                        <div className="relative">
                            <input type="checkbox" id="nsfw-toggle" checked={showNSFW} onChange={handleNsfwToggle} className="sr-only" />
                            <div className={`block w-14 h-8 rounded-full ${showNSFW ? 'bg-pink-600' : 'bg-gray-600'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${showNSFW ? 'transform translate-x-6' : ''}`}></div>
                        </div>
                    </label>
                  )}
                </div>
              </div>
            </div>
            <CharacterGrid 
                characters={filteredCharacters} 
                setView={setView} 
                onCharacterClick={setSelectedCharacter} 
                showControls={false} 
                currentUser={currentUser} 
                toggleFavorite={toggleFavorite} 
                findUserById={findUserById}
                onCreatorClick={setSelectedCreator}
             />
          </>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen font-sans bg-gray-950">
      <Navbar setView={navigate} />
      <main className="flex-1 flex flex-col overflow-y-auto">
        {renderContent()}
      </main>
      {isLoginModalOpen && <LoginModal onClose={() => setLoginModalOpen(false)} />}
      {isProfileEditModalOpen && currentUser && <ProfileEditModal userProfile={currentUser.profile} onSave={handleSaveProfile} onCancel={() => setProfileEditModalOpen(false)} />}
      {isNsfwModalOpen && <NSFWConfirmationModal onConfirm={confirmNsfw} onCancel={cancelNsfw} />}
      {selectedCharacter && currentUser && (
        <CharacterDetailModal 
            character={selectedCharacter}
            creator={findUserById(selectedCharacter.creatorId)}
            currentUser={currentUser}
            onClose={() => setSelectedCharacter(null)}
            onStartChat={(charId) => {
                setSelectedCharacter(null);
                setView({type: 'CHAT', characterId: charId});
            }}
            onLike={likeCharacter}
            onFollow={followUser}
            onAddComment={addComment}
        />
      )}
       {selectedCreator && currentUser && (
        <CreatorProfileModal 
            creator={selectedCreator}
            currentUser={currentUser}
            onClose={() => setSelectedCreator(null)}
            onFollow={followUser}
        />
       )}
    </div>
  );
}


const App: React.FC = () => {
  return (
    <AuthProvider>
        <MainApp />
    </AuthProvider>
  )
}

export default App;