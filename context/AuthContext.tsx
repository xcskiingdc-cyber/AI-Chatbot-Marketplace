

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { User, UserProfile, Character, ChatMessage, Notification, Comment, ChatSettings, GlobalSettings, AIContextSettings, Report, Ticket, AIAlert, DMConversation, DirectMessage, TicketStatus, AIViolationCategory, ReportableEntityType, UserRole, UserType, TicketFolder, DMFolder, AIAlertStatus, AIAlertFolder } from '../types';
import { scanImage, scanText } from '../services/moderationService';
import { saveImage } from '../services/dbService';

interface AuthContextType {
  currentUser: User | null;
  allUsers: User[];
  login: (username: string, pass: string) => Promise<void>;
  signup: (username: string, pass: string, email: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  updateUserProfile: (profile: UserProfile, avatarFile: File | null) => Promise<void>;
  updateAnyUserProfile: (userId: string, profile: UserProfile) => void;
  updateUserType: (userId: string, userType: User['userType']) => void;
  updateUserRole: (userId: string, role: UserRole) => void;
  deleteUser: (userId: string) => void;
  silenceUser: (userId: string, isSilenced: boolean) => void;
  toggleFavorite: (characterId: string) => void;
  characters: Character[];
  saveCharacter: (character: Character, avatarFile: File | null) => Promise<void>;
  deleteCharacter: (characterId: string) => void;
  silenceCharacter: (characterId: string, isSilenced: boolean) => void;
  likeCharacter: (characterId: string) => void;
  addComment: (characterId: string, commentText: string, parentId?: string) => Promise<void>;
  editComment: (characterId: string, commentId: string, newText: string) => Promise<void>;
  deleteComment: (characterId: string, commentId: string) => void;
  silenceComment: (characterId: string, commentId: string, isSilenced: boolean) => void;
  followUser: (userId: string) => void;
  findUserById: (userId: string) => User | null;
  markNotificationsAsRead: () => void;
  markSingleNotificationAsRead: (notificationId: string) => void;
  markCategoryAsRead: (category: 'Following' | 'My Characters' | 'Replies') => void;
  markAdminNotificationsAsRead: (types: Notification['type'][]) => void;
  chatHistories: Record<string, Record<string, ChatMessage[]>>;
  updateChatHistory: (characterId: string, history: ChatMessage[]) => void;
  deleteChatHistory: (characterId: string) => void;
  chatSettings: Record<string, Record<string, Partial<ChatSettings>>>;
  updateChatSettings: (characterId: string, settings: Partial<ChatSettings>) => void;
  globalSettings: GlobalSettings;
  updateGlobalSettings: (settings: GlobalSettings) => void;
  aiContextSettings: AIContextSettings;
  updateAIContextSettings: (settings: AIContextSettings) => void;
  reports: Report[];
  resolveReport: (reportId: string, isResolved: boolean) => void;
  addNoteToReport: (reportId: string, note: string) => void;
  aiAlerts: AIAlert[];
  updateAIAlertStatus: (alertId: string, status: AIAlertStatus) => void;
  tickets: Ticket[];
  updateTicketStatus: (ticketId: string, status: TicketStatus) => void;
  dmConversations: Record<string, DMConversation>;
  submitReport: (report: Omit<Report, 'id' | 'reporterId' | 'timestamp' | 'isResolved' | 'notes'>) => void;
  submitTicket: (ticket: Omit<Ticket, 'id' | 'submitterId' | 'status' | 'timestamp'>) => void;
  sendDirectMessage: (userId: string, content: { text?: string; imageFile?: File }, isFromAdmin?: boolean, folderId?: string | null) => Promise<void>;
  markDMAsReadByUser: (userId: string) => void;
  markDMAsReadByAdmin: (userId: string) => void;
  markAllDMsAsReadByAdmin: () => void;
  ticketFolders: TicketFolder[];
  createTicketFolder: (name: string) => void;
  moveTicketToFolder: (ticketId: string, folderId: string | null) => void;
  dmFolders: DMFolder[];
  createDMFolder: (name: string) => void;
  moveDMConversationToFolder: (userId: string, folderId: string | null) => void;
  aiAlertFolders: AIAlertFolder[];
  createAIAlertFolder: (name: string) => void;
  moveAIAlertToFolder: (alertId: string, folderId: string | null) => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

const initialAdmin: User = {
    id: 'admin-user-id-01',
    username: 'admin',
    userType: 'Subscription', // Admins get full site features
    role: 'Admin',
    isSilenced: false,
    profile: {
        name: 'Admin',
        email: 'admin@site.com',
        gender: 'undisclosed',
        birthday: '1990-01-01',
        avatarUrl: `https://i.pravatar.cc/150?u=admin`,
        bio: 'Site Administrator',
        favoriteCharacterIds: [],
        following: [],
        followers: [],
        notifications: [],
    },
};

const initialAIContextSettings: AIContextSettings = {
    includedFields: ['gender', 'description', 'personality', 'story', 'situation', 'feeling', 'appearance'],
    historyLength: 20,
    maxOutputTokens: 2048,
};

const initialDMFolders: DMFolder[] = [
    { id: 'dm-folder-reports', name: 'Reports' },
    { id: 'dm-folder-tickets', name: 'Ticketing System' },
    { id: 'dm-folder-ai-alerts', name: 'AI Alerts' },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useLocalStorage<Record<string, { pass: string; user: User }>>('ai-users', {
      'admin': { pass: 'admin123', user: initialAdmin }
  });
  const [session, setSession] = useLocalStorage<string | null>('ai-session', null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [characters, setCharacters] = useLocalStorage<Character[]>('ai-characters', []);
  const [chatHistories, setChatHistories] = useLocalStorage<Record<string, Record<string, ChatMessage[]>>>('ai-chatHistories', {});
  const [chatSettings, setChatSettings] = useLocalStorage<Record<string, Record<string, Partial<ChatSettings>>>>('ai-chatSettings', {});
  const [globalSettings, setGlobalSettings] = useLocalStorage<GlobalSettings>('ai-globalSettings', { havenStoriesPrompt: '', beyondTheHavenPrompt: '', kidModePrompt: '' });
  const [aiContextSettings, setAIContextSettings] = useLocalStorage<AIContextSettings>('ai-contextSettings', initialAIContextSettings);
  
  const [reports, setReports] = useLocalStorage<Report[]>('ai-reports', []);
  const [aiAlerts, setAIAlerts] = useLocalStorage<AIAlert[]>('ai-alerts', []);
  const [tickets, setTickets] = useLocalStorage<Ticket[]>('ai-tickets', []);
  const [dmConversations, setDmConversations] = useLocalStorage<Record<string, DMConversation>>('ai-dmConversations', {});

  const [ticketFolders, setTicketFolders] = useLocalStorage<TicketFolder[]>('ai-ticketFolders', []);
  const [dmFolders, setDmFolders] = useLocalStorage<DMFolder[]>('ai-dmFolders', initialDMFolders);
  const [aiAlertFolders, setAIAlertFolders] = useLocalStorage<AIAlertFolder[]>('ai-alertFolders', []);


  const allUsers = useMemo(() => Object.values(users).map(u => u.user), [users]);

  useEffect(() => {
    if (session && users[session]) {
      setCurrentUser(users[session].user);
    } else {
      setCurrentUser(null);
    }
  }, [session, users]);

  const updateUser = (userToUpdate: User) => {
      setUsers(prev => ({ ...prev, [userToUpdate.username]: { ...prev[userToUpdate.username], user: userToUpdate }}));
      setCurrentUser(current => current?.id === userToUpdate.id ? userToUpdate : current);
  }

  const createAdminNotification = (type: Notification['type'], message: string, relatedId: string) => {
    allUsers.forEach(user => {
        if (['Admin', 'Assistant Admin', 'Moderator'].includes(user.role)) {
            const notification: Notification = {
                id: crypto.randomUUID(), type, message, relatedId, timestamp: Date.now(), isRead: false,
            };
            const updatedUser = { ...user, profile: { ...user.profile, notifications: [notification, ...(user.profile.notifications || [])]}};
            updateUser(updatedUser);
        }
    });
  };

  const createAIAlert = (
    entityType: AIAlert['entityType'], 
    entityId: string, 
    category: AIViolationCategory, 
    confidence: number,
    entityCreatorId: string,
    flaggedText?: string,
    explanation?: string
  ) => {
      const newAlert: AIAlert = {
          id: crypto.randomUUID(), entityType, entityId, category, confidence,
          timestamp: Date.now(), status: 'New', entityCreatorId, flaggedText, explanation
      };
      setAIAlerts(prev => [newAlert, ...prev]);
      createAdminNotification('NEW_AI_ALERT', `New AI Alert: ${category} detected in ${entityType}.`, newAlert.id);
  };

  const login = async (username: string, pass: string): Promise<void> => {
    const lcUsername = username.toLowerCase();
    const storedUser = users[lcUsername];
    if (!storedUser || storedUser.pass !== pass) {
      throw new Error('Invalid username or password.');
    }
    setSession(lcUsername);
  };

  const signup = async (username: string, pass: string, email: string): Promise<void> => {
    const lcUsername = username.toLowerCase();
    if (users[lcUsername]) {
      throw new Error('An account with this username already exists.');
    }
    const emailInUse = Object.values(users).some(u => u.user.profile.email.toLowerCase() === email.toLowerCase());
    if (emailInUse) {
        throw new Error('An account with this email already exists.');
    }

    const userId = crypto.randomUUID();
    const newUser: User = {
      id: userId,
      username: lcUsername,
      userType: 'Free',
      role: 'User',
      isSilenced: false,
      profile: {
        name: username,
        email: email,
        gender: 'undisclosed',
        birthday: '',
        avatarUrl: `https://i.pravatar.cc/150?u=${userId}`,
        bio: '',
        favoriteCharacterIds: [],
        following: [],
        followers: [],
        notifications: [],
      },
    };
    setUsers(prev => ({ ...prev, [lcUsername]: { pass, user: newUser } }));
    setSession(lcUsername);
  };
  
  const loginWithGoogle = async (): Promise<void> => {
      const mockUsername = 'googleuser';
      if (!users[mockUsername]) {
          await signup(mockUsername, 'password123', 'user@google.com');
      } else {
          await login(mockUsername, 'password123');
      }
  }

  const logout = () => {
    setSession(null);
  };
  
  const findUserById = useCallback((userId: string): User | null => {
      return Object.values(users).find(u => u.user.id === userId)?.user || null;
  }, [users]);

  const updateUserProfile = async (profile: UserProfile, avatarFile?: File | null) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, profile };
      updateUser(updatedUser);

      if (profile.bio) {
        const textScanResult = await scanText(profile.bio);
        if (textScanResult) {
            createAIAlert('user', currentUser.id, textScanResult.category as AIViolationCategory, textScanResult.confidence, currentUser.id, textScanResult.flaggedText, textScanResult.explanation);
        }
      }
      if (avatarFile) {
        const imageScanResult = await scanImage(avatarFile);
        if (imageScanResult) {
            createAIAlert('image', profile.avatarUrl, imageScanResult.category as AIViolationCategory, imageScanResult.confidence, currentUser.id, undefined, imageScanResult.explanation);
        }
      }
    }
  };
  
  const updateAnyUserProfile = (userId: string, profile: UserProfile) => {
      const userToUpdate = findUserById(userId);
      if (userToUpdate) {
        const updatedUser = { ...userToUpdate, profile };
        updateUser(updatedUser);
      }
  };
  
  const updateUserType = (userId: string, userType: UserType) => {
      const userToUpdate = findUserById(userId);
      if (userToUpdate && userToUpdate.role !== 'Admin') {
          const updatedUser = { ...userToUpdate, userType };
          updateUser(updatedUser);
      }
  };

  const updateUserRole = (userId: string, role: UserRole) => {
    const userToUpdate = findUserById(userId);
    if (userToUpdate && userToUpdate.role !== 'Admin') {
        const updatedUser = { ...userToUpdate, role };
        updateUser(updatedUser);
    }
  };

  const deleteUser = (userId: string) => {
      const userToDelete = findUserById(userId);
      if (!userToDelete || userToDelete.role === 'Admin') return; 

      setUsers(prev => {
          const newUsers = { ...prev };
          delete newUsers[userToDelete.username];
          return newUsers;
      });
      setCharacters(prev => prev.filter(c => c.creatorId !== userId));
      setChatHistories(prev => {
          const newHistories = { ...prev };
          delete newHistories[userId];
          return newHistories;
      });
      setChatSettings(prev => {
          const newSettings = { ...prev };
          delete newSettings[userId];
          return newSettings;
      });
  };

  const silenceUser = (userId: string, isSilenced: boolean) => {
      const userToUpdate = findUserById(userId);
      if (userToUpdate && userToUpdate.role !== 'Admin') {
          const updatedUser = { ...userToUpdate, isSilenced };
          updateUser(updatedUser);
      }
  };
  
  const toggleFavorite = (characterId: string) => {
    if (currentUser) {
      const favs = currentUser.profile.favoriteCharacterIds || [];
      const isFav = favs.includes(characterId);
      const newFavs = isFav ? favs.filter(id => id !== characterId) : [...favs, characterId];
      const updatedProfile = { ...currentUser.profile, favoriteCharacterIds: newFavs };
      const updatedUser = { ...currentUser, profile: updatedProfile };
      updateUser(updatedUser);
    }
  };

  const saveCharacter = async (character: Character, avatarFile: File | null) => {
    const isNewCharacter = !characters.some(c => c.id === character.id);
    
    setCharacters(prev => {
        const existingIndex = prev.findIndex(c => c.id === character.id);
        if (existingIndex > -1) {
            const updated = [...prev];
            updated[existingIndex] = character;
            return updated;
        }
        return [character, ...prev];
    });

    // --- AI MODERATION SCAN ---
    const textToScan = [character.name, character.description, character.personality, character.greeting, character.story, character.situation].join(' ');
    const textScanResult = await scanText(textToScan);
    if (textScanResult) {
        createAIAlert('character', character.id, textScanResult.category as AIViolationCategory, textScanResult.confidence, character.creatorId, textScanResult.flaggedText, textScanResult.explanation);
    }
    if (avatarFile) {
        const imageScanResult = await scanImage(avatarFile);
        if (imageScanResult) {
            createAIAlert('image', character.avatarUrl, imageScanResult.category as AIViolationCategory, imageScanResult.confidence, character.creatorId, undefined, imageScanResult.explanation);
        }
    }
    // --- END AI MODERATION ---


    if (isNewCharacter && character.isPublic && currentUser) {
        const creator = currentUser;
        if (creator.profile.followers?.length) {
            const notification: Notification = {
                id: crypto.randomUUID(),
                type: 'NEW_BOT',
                message: `${creator.profile.name} has created a new public character: ${character.name}`,
                relatedId: character.id,
                timestamp: Date.now(),
                isRead: false,
            };

            setUsers(prevUsers => {
                const newUsers = {...prevUsers};
                creator.profile.followers.forEach(followerId => {
                    const follower = findUserById(followerId);
                    if (follower && newUsers[follower.username]) {
                        const userToNotify = newUsers[follower.username].user;
                        userToNotify.profile.notifications = [notification, ...(userToNotify.profile.notifications || [])];
                    }
                });
                return newUsers;
            });
        }
    }
  };
  
  const updateChatHistory = useCallback((characterId: string, history: ChatMessage[]) => {
      if (currentUser) {
        setChatHistories(prev => ({
            ...prev,
            [currentUser.id]: {
                ...(prev[currentUser.id] || {}),
                [characterId]: history,
            }
        }));
      }
  }, [currentUser, setChatHistories]);
  
  const deleteChatHistory = useCallback((characterId: string) => {
    if (currentUser) {
      setChatHistories(prev => {
        const userHistories = { ...(prev[currentUser.id] || {}) };
        delete userHistories[characterId];
        return {
          ...prev,
          [currentUser.id]: userHistories
        };
      });
    }
  }, [currentUser, setChatHistories]);

  const deleteCharacter = (characterId: string) => {
    setCharacters(prev => prev.filter(c => c.id !== characterId));
    setChatHistories(prev => {
        const newHistories = { ...prev };
        Object.keys(newHistories).forEach(userId => {
            delete newHistories[userId][characterId];
        });
        return newHistories;
    });
  };

  const silenceCharacter = (characterId: string, isSilenced: boolean) => {
      setCharacters(prev => prev.map(c => c.id === characterId ? { ...c, isSilencedByAdmin: isSilenced } : c));
  };

  const likeCharacter = (characterId: string) => {
    if (!currentUser) return;

    setCharacters(prev => prev.map(c => {
        if (c.id === characterId) {
            const likes = c.likes || [];
            const isLiked = likes.includes(currentUser.id);
            const newLikes = isLiked ? likes.filter(id => id !== currentUser.id) : [...likes, currentUser.id];
            
            if (!isLiked && c.creatorId !== currentUser.id) {
                const creator = findUserById(c.creatorId);
                if(creator) {
                    const notification: Notification = {
                        id: crypto.randomUUID(), type: 'NEW_LIKE',
                        message: `${currentUser.profile.name} liked your character: ${c.name}`,
                        relatedId: c.id, timestamp: Date.now(), isRead: false,
                        fromUserId: currentUser.id,
                    };
                    const updatedCreator = {...creator, profile: {...creator.profile, notifications: [notification, ...(creator.profile.notifications || [])]}};
                    updateUser(updatedCreator);
                }
            }

            return { ...c, likes: newLikes };
        }
        return c;
    }));
  };

  const addComment = async (characterId: string, commentText: string, parentId?: string) => {
      if (!currentUser) return;
      const character = characters.find(c => c.id === characterId);
      if (!character) return;
      
      const newComment: Comment = {
          id: crypto.randomUUID(),
          userId: currentUser.id,
          username: currentUser.profile.name,
          avatarUrl: currentUser.profile.avatarUrl,
          text: commentText,
          timestamp: Date.now(),
          parentId,
          isSilenced: false
      };
      
      setCharacters(prev => prev.map(c => 
          c.id === characterId ? { ...c, comments: [newComment, ...(c.comments || [])]} : c
      ));

      // --- AI MODERATION SCAN ---
      const textScanResult = await scanText(commentText);
      if (textScanResult) {
          createAIAlert('comment', newComment.id, textScanResult.category as AIViolationCategory, textScanResult.confidence, currentUser.id, textScanResult.flaggedText, textScanResult.explanation);
      }
      // --- END AI MODERATION ---

      // Create notifications
      const parentComment = parentId ? character.comments.find(c => c.id === parentId) : null;
      const notifyUser = (userToNotifyId: string, type: Notification['type'], message: string) => {
          const user = findUserById(userToNotifyId);
          if (user) {
              const notification: Notification = {
                  id: crypto.randomUUID(), type, message, relatedId: character.id, timestamp: Date.now(), isRead: false, fromUserId: currentUser.id,
              };
              const updatedUser = {...user, profile: {...user.profile, notifications: [notification, ...(user.profile.notifications || [])]}};
              updateUser(updatedUser);
          }
      };

      if (parentComment && parentComment.userId !== currentUser.id) {
        notifyUser(parentComment.userId, 'REPLY', `${currentUser.profile.name} replied to your comment on ${character.name}.`);
      } else if (!parentId && character.creatorId !== currentUser.id) {
        notifyUser(character.creatorId, 'NEW_COMMENT', `${currentUser.profile.name} commented on your character: ${character.name}`);
      }
  };

  const editComment = async (characterId: string, commentId: string, newText: string) => {
    if (!currentUser) return;

    const textScanResult = await scanText(newText);
    if (textScanResult) {
        createAIAlert('comment', commentId, textScanResult.category as AIViolationCategory, textScanResult.confidence, currentUser.id, textScanResult.flaggedText, textScanResult.explanation);
    }

    setCharacters(prev => prev.map(c => {
        if (c.id === characterId) {
            const updatedComments = c.comments.map(com => 
                com.id === commentId ? { ...com, text: newText } : com
            );
            return { ...c, comments: updatedComments };
        }
        return c;
    }));
  };

  const deleteComment = (characterId: string, commentId: string) => {
    setCharacters(prev => prev.map(c => {
        if (c.id === characterId) {
            // Also delete replies to this comment
            const commentsToDelete = new Set<string>([commentId]);
            const findRepliesRecursive = (parentId: string) => {
                c.comments.forEach(comment => {
                    if(comment.parentId === parentId) {
                        commentsToDelete.add(comment.id);
                        findRepliesRecursive(comment.id);
                    }
                });
            };
            findRepliesRecursive(commentId);
            
            return { ...c, comments: c.comments.filter(comment => !commentsToDelete.has(comment.id)) };
        }
        return c;
    }));
  };

  const silenceComment = (characterId: string, commentId: string, isSilenced: boolean) => {
    if (!['Admin', 'Assistant Admin', 'Moderator'].includes(currentUser?.role || '')) return;
    setCharacters(prev => prev.map(c => {
      if (c.id === characterId) {
        const updatedComments = c.comments.map(com => com.id === commentId ? { ...com, isSilenced } : com);
        return { ...c, comments: updatedComments };
      }
      return c;
    }));
  };

  const followUser = (userIdToFollow: string) => {
      if (!currentUser || currentUser.id === userIdToFollow) return;
      const userToFollow = findUserById(userIdToFollow);
      if (!userToFollow) return;

      const me = { ...currentUser };
      const isFollowing = me.profile.following.includes(userIdToFollow);
      me.profile.following = isFollowing 
          ? me.profile.following.filter(id => id !== userIdToFollow) 
          : [...me.profile.following, userIdToFollow];
      updateUser(me);

      const them = { ...userToFollow };
       if (!isFollowing) { // Notify only on new follow
        const notification: Notification = {
            id: crypto.randomUUID(),
            type: 'NEW_FOLLOWER',
            message: `${currentUser.profile.name} started following you.`,
            relatedId: currentUser.id,
            fromUserId: currentUser.id,
            timestamp: Date.now(),
            isRead: false,
        };
        them.profile.notifications = [notification, ...(them.profile.notifications || [])];
      }
      them.profile.followers = isFollowing
          ? them.profile.followers.filter(id => id !== currentUser.id)
          : [...them.profile.followers, currentUser.id];
      updateUser(them);
  };

  const markSingleNotificationAsRead = (notificationId: string) => {
    if (!currentUser) return;
    const updatedNotifications = currentUser.profile.notifications.map(n => n.id === notificationId ? { ...n, isRead: true } : n);
    updateUser({ ...currentUser, profile: { ...currentUser.profile, notifications: updatedNotifications }});
  };

  const markNotificationsAsRead = () => {
    if (!currentUser) return;
    const updatedNotifications = currentUser.profile.notifications.map(n => ({...n, isRead: true}));
    updateUser({ ...currentUser, profile: { ...currentUser.profile, notifications: updatedNotifications }});
  };
  
  const markCategoryAsRead = (category: 'Following' | 'My Characters' | 'Replies') => {
    if (!currentUser) return;
    const typesToUpdate: Notification['type'][] = [];
    if (category === 'Following') typesToUpdate.push('NEW_BOT');
    else if (category === 'My Characters') typesToUpdate.push('NEW_LIKE', 'NEW_COMMENT');
    else if (category === 'Replies') typesToUpdate.push('REPLY');

    const updatedNotifications = currentUser.profile.notifications.map(n => 
        (typesToUpdate.includes(n.type) && !n.isRead) ? { ...n, isRead: true } : n
    );
    updateUser({ ...currentUser, profile: { ...currentUser.profile, notifications: updatedNotifications }});
  };
  
  const markAdminNotificationsAsRead = (types: Notification['type'][]) => {
    if (!currentUser || !['Admin', 'Assistant Admin', 'Moderator'].includes(currentUser.role)) return;

    const updatedNotifications = currentUser.profile.notifications.map(n =>
        types.includes(n.type) ? { ...n, isRead: true } : n
    );
    updateUser({ ...currentUser, profile: { ...currentUser.profile, notifications: updatedNotifications } });
  };


  const updateChatSettings = useCallback((characterId: string, settings: Partial<ChatSettings>) => {
    if (currentUser) {
        setChatSettings(prev => ({
            ...prev,
            [currentUser.id]: {
                ...(prev[currentUser.id] || {}),
                [characterId]: { ...(prev[currentUser.id]?.[characterId] || {}), ...settings }
            }
        }));
    }
  }, [currentUser, setChatSettings]);

  const updateGlobalSettings = (settings: GlobalSettings) => {
      if (['Admin', 'Assistant Admin'].includes(currentUser?.role || '')) setGlobalSettings(settings);
  };
  
  const updateAIContextSettings = (settings: AIContextSettings) => {
      if (['Admin', 'Assistant Admin'].includes(currentUser?.role || '')) setAIContextSettings(settings);
  };

  const submitReport = (reportData: Omit<Report, 'id' | 'reporterId' | 'timestamp' | 'isResolved' | 'notes'>) => {
    if (!currentUser) return;
    const newReport: Report = {
        ...reportData, id: crypto.randomUUID(), reporterId: currentUser.id,
        timestamp: Date.now(), isResolved: false,
    };
    setReports(prev => [newReport, ...prev]);
    createAdminNotification('NEW_REPORT', `New report submitted for ${reportData.entityType}.`, newReport.id);
  };
  
  const resolveReport = (reportId: string, isResolved: boolean) => {
    setReports(prev => prev.map(r => r.id === reportId ? {...r, isResolved} : r));
  };
  
  const addNoteToReport = (reportId: string, note: string) => {
    if (!currentUser || !['Admin', 'Assistant Admin', 'Moderator'].includes(currentUser?.role || '') || !note.trim()) return;
    const noteWithAuthor = `${currentUser.profile.name} (${new Date().toLocaleString()}): ${note}`;
    setReports(prev => prev.map(r => 
      r.id === reportId ? { ...r, notes: [...(r.notes || []), noteWithAuthor] } : r
    ));
  };

  const updateAIAlertStatus = (alertId: string, status: AIAlertStatus) => {
    setAIAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status } : a));
  };
  
  const updateTicketStatus = (ticketId: string, status: TicketStatus) => {
    setTickets(prev => prev.map(t => t.id === ticketId ? {...t, status} : t));
  };

  const submitTicket = (ticketData: Omit<Ticket, 'id' | 'submitterId' | 'status' | 'timestamp'>) => {
    if (!currentUser) return;
    const newTicket: Ticket = {
        ...ticketData, id: crypto.randomUUID(), submitterId: currentUser.id,
        status: 'New', timestamp: Date.now(),
    };
    setTickets(prev => [newTicket, ...prev]);
    createAdminNotification('NEW_TICKET', `New support ticket: "${ticketData.subject}"`, newTicket.id);
  };

  const sendDirectMessage = async (userId: string, content: { text?: string; imageFile?: File }, isFromAdmin = true, folderId: string | null = null) => {
    if (!content.text?.trim() && !content.imageFile) return;

    const senderId = isFromAdmin ? 'ADMIN' : (currentUser?.id || '');
    if (!senderId) return;

    let imageUrl: string | undefined = undefined;

    if (content.imageFile) {
        const imageScanResult = await scanImage(content.imageFile);
        if (imageScanResult) {
            createAIAlert('image', `dm-image-${crypto.randomUUID()}`, imageScanResult.category as AIViolationCategory, imageScanResult.confidence, senderId, undefined, imageScanResult.explanation);
        }

        try {
            const imageId = crypto.randomUUID();
            await saveImage(imageId, content.imageFile);
            imageUrl = imageId;
        } catch (error) {
            console.error("Failed to save DM image:", error);
            return;
        }
    }

    if (content.text) {
        const textScanResult = await scanText(content.text);
        if (textScanResult) {
            createAIAlert('message', `dm-text-${crypto.randomUUID()}`, textScanResult.category as AIViolationCategory, textScanResult.confidence, senderId, textScanResult.flaggedText, textScanResult.explanation);
        }
    }

    const message: DirectMessage = {
        id: crypto.randomUUID(), senderId, text: content.text, imageUrl, timestamp: Date.now(),
    };

    setDmConversations(prev => {
        const convo = prev[userId] || { userId, messages: [], hasUnreadByUser: false, hasUnreadByAdmin: false, folderId: folderId };
        const updatedMessages = [...convo.messages, message];
        if (isFromAdmin) { // User receives message
            const userToNotify = findUserById(userId);
            if (userToNotify) {
                const notification: Notification = {
                    id: crypto.randomUUID(), type: 'NEW_DM', message: `You have a new message from an administrator.`,
                    relatedId: userId, timestamp: Date.now(), isRead: false,
                };
                const updatedUser = { ...userToNotify, profile: { ...userToNotify.profile, notifications: [notification, ...(userToNotify.profile.notifications || [])]}};
                updateUser(updatedUser);
            }
        } else { // Admin receives message
            const userWhoReplied = findUserById(userId);
            createAdminNotification('NEW_DM', `You have a new reply from ${userWhoReplied?.profile.name || 'a user'}.`, userId);
        }
        
        return {
            ...prev,
            [userId]: { ...convo, messages: updatedMessages, hasUnreadByUser: isFromAdmin, hasUnreadByAdmin: !isFromAdmin }
        };
    });
  };

  const markDMAsReadByUser = (userId: string) => {
    setDmConversations(prev => {
        const convo = prev[userId];
        if (convo && convo.hasUnreadByUser) {
            return { ...prev, [userId]: { ...convo, hasUnreadByUser: false } };
        }
        return prev;
    });
  };

  const markDMAsReadByAdmin = (userId: string) => {
      setDmConversations(prev => {
          const convo = prev[userId];
          if (convo && convo.hasUnreadByAdmin) {
              return { ...prev, [userId]: { ...convo, hasUnreadByAdmin: false } };
          }
          return prev;
      });
  };
  
  const markAllDMsAsReadByAdmin = () => {
    setDmConversations(prev => {
        const newConversations = { ...prev };
        let changed = false;
        Object.keys(newConversations).forEach(userId => {
            if (newConversations[userId].hasUnreadByAdmin) {
                newConversations[userId] = { ...newConversations[userId], hasUnreadByAdmin: false };
                changed = true;
            }
        });
        return changed ? newConversations : prev;
    });
  };

  const createTicketFolder = (name: string) => {
    const newFolder: TicketFolder = { id: crypto.randomUUID(), name };
    setTicketFolders(prev => [...prev, newFolder]);
  };
  
  const moveTicketToFolder = (ticketId: string, folderId: string | null) => {
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, folderId } : t));
  };
  
  const createDMFolder = (name: string) => {
    const newFolder: DMFolder = { id: crypto.randomUUID(), name };
    setDmFolders(prev => [...prev, newFolder]);
  };

  const moveDMConversationToFolder = (userId: string, folderId: string | null) => {
    setDmConversations(prev => {
        const convo = prev[userId];
        if (convo) {
            return { ...prev, [userId]: { ...convo, folderId } };
        }
        return prev;
    });
  };

  const createAIAlertFolder = (name: string) => {
    const newFolder: AIAlertFolder = { id: crypto.randomUUID(), name };
    setAIAlertFolders(prev => [...prev, newFolder]);
  };

  const moveAIAlertToFolder = (alertId: string, folderId: string | null) => {
    setAIAlerts(prev => prev.map(a => a.id === alertId ? { ...a, folderId } : a));
  };


  const value = {
    currentUser, allUsers, login, signup, loginWithGoogle, logout, updateUserProfile,
    updateAnyUserProfile, updateUserType, deleteUser, silenceUser, toggleFavorite, characters,
    saveCharacter, deleteCharacter, silenceCharacter, likeCharacter, addComment, editComment, deleteComment, followUser,
    findUserById, markNotificationsAsRead, markSingleNotificationAsRead, markCategoryAsRead,
    markAdminNotificationsAsRead,
    chatHistories, updateChatHistory, deleteChatHistory, chatSettings, updateChatSettings,
    globalSettings, updateGlobalSettings, aiContextSettings, updateAIContextSettings,
    reports, resolveReport, aiAlerts, updateAIAlertStatus, tickets, updateTicketStatus,
    dmConversations, submitReport, submitTicket, sendDirectMessage, markDMAsReadByUser,
    markDMAsReadByAdmin, addNoteToReport, silenceComment, updateUserRole,
    markAllDMsAsReadByAdmin,
    ticketFolders, createTicketFolder, moveTicketToFolder,
    dmFolders, createDMFolder, moveDMConversationToFolder,
    aiAlertFolders, createAIAlertFolder, moveAIAlertToFolder,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};