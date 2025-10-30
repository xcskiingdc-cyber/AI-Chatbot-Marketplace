import React, { useState, useCallback, useMemo, useContext } from 'react';
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


const MainApp: React.FC = () => {
  const [view, setView] = useState<AppView>({ type: 'HOME' });
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [isProfileEditModalOpen, setProfileEditModalOpen] = useState(false);
  const [isNsfwModalOpen, setNsfwModalOpen] = useState(false);
  const [showNSFW, setShowNSFW] = useLocalStorage('ai-showNSFW', false);

  
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error("AuthContext not found");
  }
  const { currentUser, characters, chatHistories, saveCharacter, updateChatHistory, updateUserProfile, toggleFavorite, deleteChatHistory } = auth;

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
    const protectedViews: AppView['type'][] = ['PROFILE', 'RECENT_CHATS', 'CREATE_CHARACTER'];
    if (protectedViews.includes(newView.type) && !currentUser) {
        setLoginModalOpen(true);
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

    const filteredCharacters = useMemo(() => {
        if (showNSFW && isUserAdult) {
          return characters;
        }
        return characters.filter(c => !c.isNSFW);
    }, [characters, showNSFW, isUserAdult]);


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
        const history = (currentUser && chatHistories[currentUser.id]?.[currentCharacterForView.id]) || (currentCharacterForView.greeting ? [{id: crypto.randomUUID(), sender: 'bot', text: currentCharacterForView.greeting, timestamp: Date.now()}] : []);
        return <ChatView character={currentCharacterForView} chatHistory={history} updateChatHistory={updateChatHistory} />;
      case 'RECENT_CHATS':
        return currentUser ? <RecentChatsView characters={characters} userChatHistories={chatHistories[currentUser.id] || {}} setView={setView} deleteChatHistory={deleteChatHistory} /> : null;
      case 'PROFILE':
        return currentUser ? <ProfileView user={currentUser} characters={myCharacters} favoriteCharacters={favoriteCharacters} setView={setView} onEditProfile={() => setProfileEditModalOpen(true)} toggleFavorite={toggleFavorite} /> : null;
      case 'HOME':
      default:
        return (
          <>
            {currentUser && isUserAdult && (
              <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex justify-end">
                  <label htmlFor="nsfw-toggle" className="flex items-center cursor-pointer">
                      <div className="mr-3 text-gray-300 font-medium">
                          Show NSFW Characters
                      </div>
                      <div className="relative">
                          <input type="checkbox" id="nsfw-toggle" checked={showNSFW} onChange={handleNsfwToggle} className="sr-only" />
                          <div className={`block w-14 h-8 rounded-full ${showNSFW ? 'bg-pink-600' : 'bg-gray-600'}`}></div>
                          <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${showNSFW ? 'transform translate-x-6' : ''}`}></div>
                      </div>
                  </label>
              </div>
            )}
            <CharacterGrid characters={filteredCharacters} setView={setView} showControls={false} currentUser={currentUser} toggleFavorite={toggleFavorite} />
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