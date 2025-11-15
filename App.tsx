import React, { useState, useCallback, useMemo, useContext, useEffect } from 'react';
import type { Character, ChatMessage, AppView, UserProfile, User, Report, Ticket } from './types';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Navbar from './components/Navbar';
import CharacterGrid from './components/CharacterGrid';
import CharacterForm from './components/CharacterForm';
import ChatView from './components/ChatView';
import RecentChatsView from './components/RecentChatsView';
import ProfileView from './components/ProfileView';
import LoginModal from './components/LoginModal';
import ProfileEditModal from './components/ProfileEditModal';
import BeyondTheHavenConfirmationModal from './components/NSFWConfirmationModal';
import CharacterDetailModal from './components/CharacterDetailModal';
import NotificationsView from './components/NotificationsView';
import CreatorProfileModal from './components/CreatorProfileModal';
import AdminConsoleView from './components/AdminSettingsView';
import ModeratorConsoleView from './components/ModeratorConsoleView';
import ReportModal from './components/ReportModal';
import TicketSubmissionModal from './components/TicketSubmissionModal';
import SuccessModal from './components/SuccessModal';
import ForumHomeView from './components/ForumHomeView';
import CategoryView from './components/CategoryView';
import ThreadView from './components/ThreadView';
import CreateThreadForm from './components/CreateThreadForm';
import AiApiSettingsView from './components/AiApiSettingsView';
import SystemMonitorView from './components/SystemMonitorView';


const MainApp: React.FC = () => {
  const [view, setView] = useState<AppView>({ type: 'HOME' });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [isProfileEditModalOpen, setProfileEditModalOpen] = useState(false);
  const [isBeyondTheHavenModalOpen, setBeyondTheHavenModalOpen] = useState(false);
  const [showBeyondTheHaven, setShowBeyondTheHaven] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<User | null>(null);
  
  const [reportModalInfo, setReportModalInfo] = useState<Omit<Report, 'id' | 'reporterId' | 'reason' | 'description' | 'timestamp' | 'isResolved' | 'notes'> | null>(null);
  const [isTicketModalOpen, setTicketModalOpen] = useState(false);
  const [isSuccessModalOpen, setSuccessModalOpen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState<'character' | 'creator'>('character');
  const [sortOrder, setSortOrder] = useState('newest');
  const [filterByFollowing, setFilterByFollowing] = useState(false);

  const [modConsoleInitialTab, setModConsoleInitialTab] = useState<string>('reports');
  const [preselectedDMUser, setPreselectedDMUser] = useState<User | null>(null);

  
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error("AuthContext not found");
  }
  const { currentUser, characters, chatHistories, saveCharacter, updateChatHistory, updateUserProfile, toggleFavorite, deleteChatHistory, likeCharacter, addComment, followUser, markNotificationsAsRead, findUserById, submitReport, submitTicket, findConnectionForModel } = auth;
  

  useEffect(() => {
    // This simulates an initial data fetch. In a real app with an API,
    // this would be tied to the data fetching lifecycle.
    const timer = setTimeout(() => {
        setIsLoading(false);
    }, 1200); 
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (selectedCharacter) {
      const updatedCharacter = characters.find(c => c.id === selectedCharacter.id);
      if (updatedCharacter) {
        if (JSON.stringify(updatedCharacter) !== JSON.stringify(selectedCharacter)) {
            setSelectedCharacter(updatedCharacter);
        }
      } else {
        setSelectedCharacter(null);
      }
    }
  }, [characters, selectedCharacter]);

  useEffect(() => {
    if (view.type !== 'MODERATOR_CONSOLE') {
        setPreselectedDMUser(null);
        setModConsoleInitialTab('reports');
    }
  }, [view]);

  const handleSaveCharacter = async (characterData: Omit<Character, 'creatorId'> & { creatorId?: string }, avatarFile: File | null) => {
    if (!currentUser) {
        setLoginModalOpen(true);
        return;
    }
    const character: Character = {
        ...characterData,
        creatorId: characterData.creatorId || currentUser.id,
    };
    await saveCharacter(character, avatarFile);
    setView({ type: 'PROFILE' });
  };
  
  const handleSaveProfile = async (profile: UserProfile, avatarFile: File | null) => {
    await updateUserProfile(profile, avatarFile);
    setProfileEditModalOpen(false);
  }

  const navigate = (newView: AppView) => {
    const protectedViews: AppView['type'][] = ['PROFILE', 'RECENT_CHATS', 'CREATE_CHARACTER', 'NOTIFICATIONS', 'ADMIN_CONSOLE', 'MODERATOR_CONSOLE', 'SUPPORT_TICKET', 'CREATE_THREAD', 'AI_API_SETTINGS', 'SYSTEM_MONITOR'];
    
    if (protectedViews.includes(newView.type) && !currentUser) {
        setLoginModalOpen(true);
        return;
    }
    
    if (newView.type === 'ADMIN_CONSOLE' && !['Admin', 'Assistant Admin'].includes(currentUser?.role || '')) {
        setView({ type: 'HOME' });
        return;
    }

    if ((newView.type === 'AI_API_SETTINGS' || newView.type === 'SYSTEM_MONITOR') && currentUser?.role !== 'Admin') {
        setView({ type: 'HOME' });
        return;
    }
    
    if (newView.type === 'MODERATOR_CONSOLE' && !['Admin', 'Assistant Admin', 'Moderator'].includes(currentUser?.role || '')) {
        setView({ type: 'HOME' });
        return;
    }

    if (newView.type === 'SUPPORT_TICKET') {
        setTicketModalOpen(true);
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

    const handleBeyondTheHavenToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        const isChecked = e.target.checked;
        if (isChecked) {
            setBeyondTheHavenModalOpen(true);
        } else {
            setShowBeyondTheHaven(false);
        }
    };

    const confirmBeyondTheHaven = () => {
        setShowBeyondTheHaven(true);
        setBeyondTheHavenModalOpen(false);
    };

    const cancelBeyondTheHaven = () => {
        setBeyondTheHavenModalOpen(false);
    };

    const publicCharacters = useMemo(() => {
        return characters.filter(c => c.isPublic && !c.isSilencedByAdmin);
    }, [characters]);

    const filteredCharacters = useMemo(() => {
        let chars = publicCharacters;

        if (filterByFollowing && currentUser) {
            const followingIds = new Set(currentUser.profile.following);
            chars = chars.filter(c => followingIds.has(c.creatorId));
        }

        if (!showBeyondTheHaven || !isUserAdult) {
            chars = chars.filter(c => !c.isBeyondTheHaven);
        }

        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            chars = chars.filter(c => {
                 if (searchBy === 'character') {
                    return c.name.toLowerCase().includes(lowerSearchTerm) ||
                           c.description.toLowerCase().includes(lowerSearchTerm);
                } else { 
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
    }, [publicCharacters, showBeyondTheHaven, isUserAdult, searchTerm, sortOrder, characters, searchBy, findUserById, filterByFollowing, currentUser]);

    const handleTicketSubmit = (ticket: Omit<Ticket, 'id' | 'submitterId' | 'status' | 'timestamp'>) => {
        if(!currentUser) return;
        submitTicket(ticket);
        setTicketModalOpen(false);
        setSuccessModalOpen(true);
    };


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
        
        const connection = findConnectionForModel?.(currentCharacterForView.model);
        const isGeminiModel = currentCharacterForView.model.includes('gemini') || currentCharacterForView.model.includes('imagen');

        if (!connection) {
            if (isGeminiModel && currentUser) {
                // It's a Gemini model and the user is logged in but has no key (and no global fallback was found)
                return (
                    <div className="p-8 text-center text-yellow-300 bg-secondary m-4 sm:m-8 rounded-lg">
                        <h2 className="text-2xl font-bold mb-4">Gemini API Key Required</h2>
                        <p>This character uses a Gemini AI model. To continue, please add your own Gemini API Key in your profile settings.</p>
                        <p className="text-sm text-text-secondary mt-2">Your key is stored locally in your browser and is never shared.</p>
                        <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
                            <button onClick={() => setView({ type: 'HOME' })} className="px-4 py-2 bg-tertiary text-white rounded-md">Back to Home</button>
                            <button onClick={() => setProfileEditModalOpen(true)} className="px-4 py-2 bg-accent-secondary text-white rounded-md">Add API Key</button>
                        </div>
                    </div>
                );
            }
             // It's some other model, or a Gemini model and user is not logged in
            return <div className="p-8 text-center text-red-400">Error: The AI model "{currentCharacterForView.model}" for this character is not available. An administrator may need to configure it in the AI API Settings.</div>;
        }

        const history = (currentUser && chatHistories[currentUser.id]?.[currentCharacterForView.id]) || [];
        return <ChatView character={currentCharacterForView} chatHistory={history} updateChatHistory={updateChatHistory} onReportMessage={(msg) => setReportModalInfo({ entityType: 'message', entityId: msg.id, contentSnapshot: msg.text, entityCreatorId: currentCharacterForView.creatorId })} onCharacterSelect={setSelectedCharacter} />;
      case 'RECENT_CHATS':
        return currentUser ? <RecentChatsView characters={characters} userChatHistories={chatHistories[currentUser.id] || {}} setView={setView} deleteChatHistory={deleteChatHistory} /> : null;
      case 'PROFILE':
        return currentUser ? <ProfileView user={currentUser} myCharacters={myCharacters} favoriteCharacters={favoriteCharacters} setView={navigate} onEditProfile={() => setProfileEditModalOpen(true)} toggleFavorite={toggleFavorite} onCharacterClick={setSelectedCharacter} isLoading={isLoading} /> : null;
      case 'NOTIFICATIONS':
        return currentUser ? <NotificationsView user={currentUser} setView={setView} onCharacterClick={setSelectedCharacter} onCreatorClick={setSelectedCreator} /> : null;
      case 'ADMIN_CONSOLE':
        return (currentUser?.role === 'Admin' || currentUser?.role === 'Assistant Admin') ? <AdminConsoleView setView={navigate} setSelectedCharacter={setSelectedCharacter} setSelectedCreator={setSelectedCreator}/> : <p>Access Denied</p>;
      case 'AI_API_SETTINGS':
        return (currentUser?.role === 'Admin') ? <AiApiSettingsView /> : <p>Access Denied</p>;
      case 'SYSTEM_MONITOR':
        return (currentUser?.role === 'Admin') ? <SystemMonitorView /> : <p>Access Denied</p>;
      case 'MODERATOR_CONSOLE':
        return ['Admin', 'Assistant Admin', 'Moderator'].includes(currentUser?.role || '') ? <ModeratorConsoleView setView={navigate} initialTab={modConsoleInitialTab} preselectedUser={preselectedDMUser} setSelectedCharacter={setSelectedCharacter} setSelectedCreator={setSelectedCreator} /> : <p>Access Denied</p>;
      case 'FORUM_HOME':
        return <ForumHomeView setView={navigate} />;
      case 'FORUM_CATEGORY':
        return <CategoryView categoryId={view.categoryId} setView={navigate} />;
      case 'FORUM_THREAD':
        return <ThreadView threadId={view.threadId} setView={navigate} onReportPost={(post) => setReportModalInfo({ entityType: 'forumPost', entityId: post.id, contentSnapshot: post.content, entityCreatorId: post.authorId })}/>;
      case 'CREATE_THREAD':
        return <CreateThreadForm categoryId={view.categoryId} setView={navigate} />;
      case 'HOME':
      default:
        return (
          <div className="w-full">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 md:px-8 py-4 w-full">
              <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex items-center gap-2 w-full md:w-auto md:flex-grow">
                    <div className="relative flex-grow max-w-sm">
                        <input 
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-secondary border border-border rounded-md py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-accent-primary"
                        />
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-text-secondary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                        </div>
                    </div>
                     <select
                        value={searchBy}
                        onChange={(e) => setSearchBy(e.target.value as 'character' | 'creator')}
                        className="bg-secondary border border-border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-accent-primary"
                      >
                        <option value="character">By Character</option>
                        <option value="creator">By Creator</option>
                      </select>
                </div>
                <div className="flex items-center gap-4 flex-wrap justify-end">
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="bg-secondary border border-border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-accent-primary"
                  >
                    <option value="newest">Newest</option>
                    <option value="popular">Most Popular</option>
                  </select>
                  {currentUser && (
                    <label htmlFor="following-toggle" className="flex items-center cursor-pointer">
                        <div className="relative">
                            <input type="checkbox" id="following-toggle" checked={filterByFollowing} onChange={e => setFilterByFollowing(e.target.checked)} className="sr-only" />
                            <div className={`block w-14 h-8 rounded-full ${filterByFollowing ? 'bg-accent-secondary' : 'bg-tertiary'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${filterByFollowing ? 'transform translate-x-6' : ''}`}></div>
                        </div>
                        <div className="ml-3 text-text-primary font-medium">Following</div>
                    </label>
                  )}
                  {currentUser && isUserAdult && (
                    <label htmlFor="beyond-the-haven-toggle" className="flex items-center cursor-pointer">
                        <div className="relative">
                            <input type="checkbox" id="beyond-the-haven-toggle" checked={showBeyondTheHaven} onChange={handleBeyondTheHavenToggle} className="sr-only" />
                            <div className={`block w-14 h-8 rounded-full ${showBeyondTheHaven ? 'bg-accent-primary' : 'bg-tertiary'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${showBeyondTheHaven ? 'transform translate-x-6' : ''}`}></div>
                        </div>
                         <div className="ml-3 text-text-primary font-medium">Beyond the Haven</div>
                    </label>
                  )}
                </div>
              </div>
            </div>
            <CharacterGrid 
                characters={filteredCharacters} 
                setView={setView} 
                onCharacterClick={setSelectedCharacter}
                isLoading={isLoading}
                showControls={false} 
                currentUser={currentUser} 
                toggleFavorite={toggleFavorite} 
                findUserById={findUserById}
                onCreatorClick={setSelectedCreator}
             />
          </div>
        );
    }
  };
  
  const isConsoleView = view.type === 'ADMIN_CONSOLE' || view.type === 'MODERATOR_CONSOLE' || view.type === 'AI_API_SETTINGS' || view.type === 'SYSTEM_MONITOR';

  return (
    <div className="flex flex-col h-screen font-sans bg-primary text-text-primary">
      <Navbar setView={navigate} />
      <main className={`flex-1 flex flex-col overflow-y-auto ${isConsoleView ? 'w-full max-w-screen-2xl mx-auto' : ''}`}>
        {renderContent()}
      </main>
      {isLoginModalOpen && <LoginModal onClose={() => setLoginModalOpen(false)} />}
      {isProfileEditModalOpen && currentUser && <ProfileEditModal userProfile={currentUser.profile} onSave={handleSaveProfile} onCancel={() => setProfileEditModalOpen(false)} />}
      {isBeyondTheHavenModalOpen && <BeyondTheHavenConfirmationModal onConfirm={confirmBeyondTheHaven} onCancel={cancelBeyondTheHaven} />}
      {reportModalInfo && currentUser && (
        <ReportModal 
            reportInfo={reportModalInfo}
            onClose={() => setReportModalInfo(null)}
            onSubmit={submitReport}
        />
      )}
      {isTicketModalOpen && currentUser && (
        <TicketSubmissionModal 
            user={currentUser}
            onClose={() => setTicketModalOpen(false)}
            onSubmit={handleTicketSubmit}
        />
      )}
       {isSuccessModalOpen && (
        <SuccessModal
            title="Ticket Submitted"
            message="Your ticket has been successfully sent to the admin team. We will get back to you shortly."
            onClose={() => {
                setSuccessModalOpen(false);
                navigate({ type: 'PROFILE' });
            }}
        />
       )}
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
            onReportCharacter={() => {
                setReportModalInfo({ entityType: 'character', entityId: selectedCharacter.id, entityCreatorId: selectedCharacter.creatorId });
            }}
            onReportComment={(comment) => {
                setReportModalInfo({ entityType: 'comment', entityId: comment.id, entityCreatorId: comment.userId, contentSnapshot: comment.text });
            }}
            onCreatorClick={setSelectedCreator}
        />
      )}
       {selectedCreator && currentUser && (
        <CreatorProfileModal 
            creator={selectedCreator}
            currentUser={currentUser}
            characters={characters}
            onClose={() => setSelectedCreator(null)}
            onFollow={followUser}
            onReportUser={() => {
                setReportModalInfo({ entityType: 'user', entityId: selectedCreator.id, entityCreatorId: selectedCreator.id });
            }}
            onCharacterClick={(character) => {
                setSelectedCreator(null);
                setSelectedCharacter(character);
            }}
            onSendMessage={(user) => {
                setSelectedCreator(null);
                setPreselectedDMUser(user);
                setModConsoleInitialTab('dms');
                navigate({ type: 'MODERATOR_CONSOLE' });
            }}
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
