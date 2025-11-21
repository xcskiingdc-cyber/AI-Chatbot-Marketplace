
import React, { useState, useMemo, useContext, useEffect } from 'react';
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
import { FlameIcon } from './components/Icons';

const MainApp: React.FC = () => {
  const [view, setView] = useState<AppView>({ type: 'HOME' });
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [isProfileEditModalOpen, setProfileEditModalOpen] = useState(false);
  const [isBeyondTheHavenModalOpen, setBeyondTheHavenModalOpen] = useState(false);
  const [contentFilter, setContentFilter] = useState<'haven' | 'beyond' | 'all'>('haven');
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
  
  const { 
    currentUser, 
    characters, 
    chatHistories, 
    saveCharacter, 
    updateChatHistory, 
    updateUserProfile, 
    toggleFavorite, 
    deleteChatHistory, 
    likeCharacter, 
    addComment, 
    followUser, 
    markNotificationsAsRead, 
    findUserById, 
    submitReport, 
    submitTicket, 
    findConnectionForModel,
    loading 
  } = auth;

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

  // Redirect to Home if user logs out while on a protected page
  useEffect(() => {
    const protectedViews: AppView['type'][] = ['PROFILE', 'RECENT_CHATS', 'CREATE_CHARACTER', 'NOTIFICATIONS', 'ADMIN_CONSOLE', 'MODERATOR_CONSOLE', 'SUPPORT_TICKET', 'CREATE_THREAD', 'AI_API_SETTINGS', 'SYSTEM_MONITOR'];
    // If user is not logged in, force redirect immediately
    if (!currentUser && protectedViews.includes(view.type)) {
        setView({ type: 'HOME' });
    }
  }, [currentUser, view, setView]);

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
  };

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
    if (!currentUser?.profile?.birthday) return false;
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
    if (!currentUser?.profile?.favoriteCharacterIds) return [];
    const favIds = new Set(currentUser.profile.favoriteCharacterIds);
    return characters.filter(c => favIds.has(c.id));
  }, [characters, currentUser]);
  
  const currentCharacterForView = useMemo(() => {
      if (view.type === 'CHAT' || view.type === 'EDIT_CHARACTER') {
          return characters.find(c => c.id === (view as any).characterId);
      }
      return undefined;
  }, [view, characters]);

    const handleContentFilterChange = (value: 'haven' | 'beyond' | 'all') => {
        if (value === 'beyond' || value === 'all') {
            setBeyondTheHavenModalOpen(true);
        } else {
            setContentFilter('haven');
        }
    };

    const onFilterSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value as 'haven' | 'beyond' | 'all';
        setContentFilter(val);
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

        // Content Categorization Logic
        if (isUserAdult) {
            if (contentFilter === 'haven') {
                chars = chars.filter(c => !c.isBeyondTheHaven);
            } else if (contentFilter === 'beyond') {
                 chars = chars.filter(c => c.isBeyondTheHaven);
            }
            // 'all' includes both
        } else {
            // Non-adults always forced to haven
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
    }, [publicCharacters, contentFilter, isUserAdult, searchTerm, sortOrder, characters, searchBy, findUserById, filterByFollowing, currentUser]);

    const handleTicketSubmit = (ticket: Omit<Ticket, 'id' | 'submitterId' | 'status' | 'timestamp'>) => {
        if(!currentUser) return;
        submitTicket(ticket);
        setTicketModalOpen(false);
        setSuccessModalOpen(true);
    };

  // Global Loading State
  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-primary text-text-primary">
             <div className="relative w-24 h-24">
                <div className="absolute top-0 left-0 w-full h-full border-4 border-tertiary rounded-full"></div>
                <div className="absolute top-0 left-0 w-full h-full border-4 border-accent-secondary rounded-full animate-spin border-t-transparent"></div>
             </div>
             <p className="mt-8 text-lg font-serif animate-pulse">Summoning the Haven...</p>
        </div>
    );
  }

  const renderContent = () => {
    // Safety check: If we are on a protected route but have no user, force HOME rendering immediately.
    // This prevents a "blank" screen or crashes if a component expects `currentUser` to exist.
    if (!currentUser && ['PROFILE', 'RECENT_CHATS', 'CREATE_CHARACTER', 'NOTIFICATIONS', 'ADMIN_CONSOLE', 'MODERATOR_CONSOLE', 'SUPPORT_TICKET', 'CREATE_THREAD', 'AI_API_SETTINGS', 'SYSTEM_MONITOR'].includes(view.type)) {
        // Render a safe fallback while the useEffect redirects
        return (
            <div className="w-full h-full flex items-center justify-center text-text-secondary">
                <p>Redirecting to Home...</p>
            </div>
        );
    }

    switch (view.type) {
      case 'CREATE_CHARACTER':
        return <CharacterForm onSave={handleSaveCharacter} onCancel={() => setView({ type: 'HOME' })} isUserAdult={isUserAdult} />;
      case 'EDIT_CHARACTER':
        return currentCharacterForView ? (
            <CharacterForm onSave={handleSaveCharacter} onCancel={() => setView({ type: 'PROFILE' })} existingCharacter={currentCharacterForView} isUserAdult={isUserAdult} />
        ) : <p className="text-center p-8">Character not found</p>;
      case 'CHAT':
        if (!currentCharacterForView) {
            setTimeout(() => setView({ type: 'HOME' }), 0);
            return null;
        }
        const history = (currentUser && chatHistories[currentUser.id]?.[currentCharacterForView.id]) || [];
        return <ChatView character={currentCharacterForView} chatHistory={history} updateChatHistory={updateChatHistory} onReportMessage={(msg) => setReportModalInfo({ entityType: 'message', entityId: msg.id, contentSnapshot: msg.text, entityCreatorId: currentCharacterForView.creatorId })} onCharacterSelect={setSelectedCharacter} />;
      case 'RECENT_CHATS':
        return currentUser ? <RecentChatsView characters={characters} userChatHistories={chatHistories[currentUser.id] || {}} setView={setView} deleteChatHistory={deleteChatHistory} /> : null;
      case 'PROFILE':
        return currentUser ? <ProfileView user={currentUser} myCharacters={myCharacters} favoriteCharacters={favoriteCharacters} setView={navigate} onEditProfile={() => setProfileEditModalOpen(true)} toggleFavorite={toggleFavorite} onCharacterClick={setSelectedCharacter} isLoading={loading} /> : null;
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
        return <CategoryView categoryId={(view as any).categoryId} setView={navigate} />;
      case 'FORUM_THREAD':
        return <ThreadView threadId={(view as any).threadId} setView={navigate} onReportPost={(post) => setReportModalInfo({ entityType: 'forumPost', entityId: post.id, contentSnapshot: post.content, entityCreatorId: post.authorId })}/>;
      case 'CREATE_THREAD':
        return <CreateThreadForm categoryId={(view as any).categoryId} setView={navigate} />;
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
                            className="w-full bg-secondary-glass border border-white/10 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-accent-primary text-white placeholder-white/50 shadow-sm backdrop-blur-sm transition-all focus:bg-secondary/80"
                        />
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-white/50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1 1 10.89 3.476l4.817 4.817a1 1 0 0 1-1.414 1.414l-4.816-4.816A6 6 0 0 1 2 8z" clipRule="evenodd" /></svg>
                        </div>
                    </div>
                     <select
                        value={searchBy}
                        onChange={(e) => setSearchBy(e.target.value as 'character' | 'creator')}
                        className="bg-secondary-glass border border-white/10 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-accent-primary text-white shadow-sm backdrop-blur-sm"
                      >
                        <option value="character">By Character</option>
                        <option value="creator">By Creator</option>
                      </select>
                </div>
                <div className="flex items-center gap-4 flex-wrap justify-end">
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="bg-secondary-glass border border-white/10 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-accent-primary text-white shadow-sm backdrop-blur-sm"
                  >
                    <option value="newest">Newest</option>
                    <option value="popular">Most Popular</option>
                  </select>

                  {isUserAdult && (
                       <select
                        value={contentFilter}
                        onChange={onFilterSelectChange}
                        className="bg-secondary-glass border border-white/10 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-accent-primary text-white shadow-sm backdrop-blur-sm cursor-pointer"
                      >
                        <option value="haven">Haven (Safe)</option>
                        <option value="beyond">Beyond (18+)</option>
                        <option value="all">All Content</option>
                      </select>
                  )}

                  {currentUser && (
                    <label htmlFor="following-toggle" className="flex items-center cursor-pointer group">
                        <div className="relative">
                            <input type="checkbox" id="following-toggle" checked={filterByFollowing} onChange={e => setFilterByFollowing(e.target.checked)} className="sr-only" />
                            <div className={`block w-14 h-8 rounded-full border border-white/10 transition-colors ${filterByFollowing ? 'bg-accent-secondary' : 'bg-black/40'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform shadow-md ${filterByFollowing ? 'transform translate-x-6' : ''}`}></div>
                        </div>
                        <div className="ml-3 text-text-primary font-medium group-hover:text-white transition-colors">Following</div>
                    </label>
                  )}
                </div>
              </div>
            </div>
            <CharacterGrid 
                characters={filteredCharacters} 
                setView={setView} 
                onCharacterClick={setSelectedCharacter}
                isLoading={loading}
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
  
  const isConsoleView = ['ADMIN_CONSOLE', 'MODERATOR_CONSOLE', 'AI_API_SETTINGS', 'SYSTEM_MONITOR'].includes(view.type);

  return (
    <div className="flex flex-col h-screen font-sans text-text-primary relative">
      {/* The background is now handled by styles.css on body::before */}
      <Navbar 
          setView={navigate} 
      />
      <main className={`flex-1 flex flex-col overflow-y-auto overflow-x-hidden ${isConsoleView ? 'w-full max-w-screen-2xl mx-auto' : ''}`}>
        {renderContent()}
      </main>
      {isLoginModalOpen && <LoginModal onClose={() => setLoginModalOpen(false)} />}
      {isProfileEditModalOpen && currentUser && <ProfileEditModal userProfile={currentUser.profile} onSave={handleSaveProfile} onCancel={() => setProfileEditModalOpen(false)} />}
      {isBeyondTheHavenModalOpen && (
          <BeyondTheHavenConfirmationModal 
            onConfirm={() => {
                setBeyondTheHavenModalOpen(false);
            }} 
            onCancel={() => {
                setBeyondTheHavenModalOpen(false);
                setContentFilter('haven'); // Revert if cancelled
            }} 
          />
      )}
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
