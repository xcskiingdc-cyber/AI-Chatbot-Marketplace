import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { User, UserProfile, Character, ChatMessage, Notification, Comment, ChatSettings, GlobalSettings } from '../types';

interface AuthContextType {
  currentUser: User | null;
  allUsers: User[];
  login: (username: string, pass: string) => Promise<void>;
  signup: (username: string, pass: string, email: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  updateUserProfile: (profile: UserProfile) => void;
  updateAnyUserProfile: (userId: string, profile: UserProfile) => void;
  updateUserType: (userId: string, userType: User['userType']) => void;
  deleteUser: (userId: string) => void;
  silenceUser: (userId: string, isSilenced: boolean) => void;
  toggleFavorite: (characterId: string) => void;
  characters: Character[];
  saveCharacter: (character: Character) => void;
  deleteCharacter: (characterId: string) => void;
  silenceCharacter: (characterId: string, isSilenced: boolean) => void;
  likeCharacter: (characterId: string) => void;
  addComment: (characterId: string, commentText: string, parentId?: string) => void;
  followUser: (userIdToFollow: string) => void;
  findUserById: (userId: string) => User | null;
  markNotificationsAsRead: () => void;
  chatHistories: Record<string, Record<string, ChatMessage[]>>;
  updateChatHistory: (characterId: string, history: ChatMessage[]) => void;
  deleteChatHistory: (characterId: string) => void;
  chatSettings: Record<string, Record<string, Partial<ChatSettings>>>;
  updateChatSettings: (characterId: string, settings: Partial<ChatSettings>) => void;
  globalSettings: GlobalSettings;
  updateGlobalSettings: (settings: GlobalSettings) => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

const initialAdmin: User = {
    id: 'admin-user-id-01',
    username: 'admin',
    userType: 'Admin',
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

// NOTE: This is a mock authentication system using localStorage.
// DO NOT use this in a production environment.
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useLocalStorage<Record<string, { pass: string; user: User }>>('ai-users', {
      'admin': { pass: 'admin123', user: initialAdmin }
  });
  const [session, setSession] = useLocalStorage<string | null>('ai-session', null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [characters, setCharacters] = useLocalStorage<Character[]>('ai-characters', []);
  const [chatHistories, setChatHistories] = useLocalStorage<Record<string, Record<string, ChatMessage[]>>>('ai-chatHistories', {});
  const [chatSettings, setChatSettings] = useLocalStorage<Record<string, Record<string, Partial<ChatSettings>>>>('ai-chatSettings', {});
  const [globalSettings, setGlobalSettings] = useLocalStorage<GlobalSettings>('ai-globalSettings', { sfwPrompt: '', nsfwPrompt: '' });

  const allUsers = useMemo(() => Object.values(users).map(u => u.user), [users]);

  useEffect(() => {
    if (session && users[session]) {
      setCurrentUser(users[session].user);
    } else {
      setCurrentUser(null);
    }
  }, [session, users]);

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
      // Mock google login
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

  const updateUser = (userToUpdate: User) => {
      setUsers(prev => ({ ...prev, [userToUpdate.username]: { ...prev[userToUpdate.username], user: userToUpdate }}));
      if (currentUser?.id === userToUpdate.id) {
          setCurrentUser(userToUpdate);
      }
  }
  
  const findUserById = useCallback((userId: string): User | null => {
      return Object.values(users).find(u => u.user.id === userId)?.user || null;
  }, [users]);

  const updateUserProfile = (profile: UserProfile) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, profile };
      updateUser(updatedUser);
    }
  };
  
  const updateAnyUserProfile = (userId: string, profile: UserProfile) => {
      const userToUpdate = findUserById(userId);
      if (userToUpdate) {
        const updatedUser = { ...userToUpdate, profile };
        updateUser(updatedUser);
      }
  };
  
  const updateUserType = (userId: string, userType: User['userType']) => {
      const userToUpdate = findUserById(userId);
      if (userToUpdate) {
          const updatedUser = { ...userToUpdate, userType };
          updateUser(updatedUser);
      }
  };

  const deleteUser = (userId: string) => {
      const userToDelete = findUserById(userId);
      if (!userToDelete || userToDelete.userType === 'Admin') return; // Prevent admin deletion

      // 1. Delete user
      setUsers(prev => {
          const newUsers = { ...prev };
          delete newUsers[userToDelete.username];
          return newUsers;
      });
      // 2. Delete their characters
      setCharacters(prev => prev.filter(c => c.creatorId !== userId));
      // 3. Delete their chat histories
      setChatHistories(prev => {
          const newHistories = { ...prev };
          delete newHistories[userId];
          return newHistories;
      });
      // 4. Delete their chat settings
      setChatSettings(prev => {
          const newSettings = { ...prev };
          delete newSettings[userId];
          return newSettings;
      });
  };

  const silenceUser = (userId: string, isSilenced: boolean) => {
      const userToUpdate = findUserById(userId);
      if (userToUpdate && userToUpdate.userType !== 'Admin') {
          const updatedUser = { ...userToUpdate, isSilenced };
          updateUser(updatedUser);
      }
  };
  
  const toggleFavorite = (characterId: string) => {
    if (currentUser) {
      const favs = currentUser.profile.favoriteCharacterIds || [];
      const isFav = favs.includes(characterId);
      const newFavs = isFav ? favs.filter(id => id !== characterId) : [...favs, characterId];
      updateUserProfile({ ...currentUser.profile, favoriteCharacterIds: newFavs });
    }
  };

  const saveCharacter = (character: Character) => {
    const isNewCharacter = !characters.some(c => c.id === character.id);
    
    setCharacters(prev => {
        const existingIndex = prev.findIndex(c => c.id === character.id);
        if (existingIndex > -1) {
            const updated = [...prev];
            updated[existingIndex] = character;
            return updated;
        }
        return [...prev, character];
    });

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
                    const followerUsername = Object.values(newUsers).find(u => u.user.id === followerId)?.user.username;
                    if (followerUsername && newUsers[followerUsername]) {
                        const userToNotify = newUsers[followerUsername].user;
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
    let characterCreatorId: string | undefined;

    setCharacters(prev => prev.map(c => {
        if (c.id === characterId) {
            characterCreatorId = c.creatorId;
            const likes = c.likes || [];
            const isLiked = likes.includes(currentUser.id);
            const newLikes = isLiked ? likes.filter(id => id !== currentUser.id) : [...likes, currentUser.id];
            
            // Only create notification if it's a new like and not self-like
            if (!isLiked && c.creatorId !== currentUser.id) {
                const notification: Notification = {
                    id: crypto.randomUUID(),
                    type: 'NEW_LIKE',
                    message: `${currentUser.profile.name} liked your character: ${c.name}`,
                    relatedId: c.id,
                    timestamp: Date.now(),
                    isRead: false,
                };
                
                setUsers(prevUsers => {
                    const creatorUser = Object.values(prevUsers).find(u => u.user.id === c.creatorId);
                    if (creatorUser) {
                        const newUsers = {...prevUsers};
                        const userToNotify = newUsers[creatorUser.user.username].user;
                        userToNotify.profile.notifications = [notification, ...(userToNotify.profile.notifications || [])];
                        return newUsers;
                    }
                    return prevUsers;
                });
            }

            return { ...c, likes: newLikes };
        }
        return c;
    }));
  };

  const addComment = (characterId: string, commentText: string, parentId?: string) => {
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
          parentId
      };
      
      setCharacters(prev => prev.map(c => {
          if (c.id === characterId) {
              const comments = c.comments || [];
              return { ...c, comments: [newComment, ...comments]};
          }
          return c;
      }));

      // Create notifications
      if (parentId) {
        // This is a reply, notify the author of the parent comment
        const parentComment = character.comments.find(c => c.id === parentId);
        if (parentComment && parentComment.userId !== currentUser.id) {
            const notification: Notification = {
                id: crypto.randomUUID(),
                type: 'REPLY',
                message: `${currentUser.profile.name} replied to your comment on ${character.name}.`,
                relatedId: character.id,
                timestamp: Date.now(),
                isRead: false,
            };
            setUsers(prevUsers => {
                const parentAuthor = Object.values(prevUsers).find(u => u.user.id === parentComment.userId);
                if (parentAuthor) {
                    const newUsers = {...prevUsers};
                    const userToNotify = newUsers[parentAuthor.user.username].user;
                    userToNotify.profile.notifications = [notification, ...(userToNotify.profile.notifications || [])];
                    return newUsers;
                }
                return prevUsers;
            });
        }
      } else {
        // This is a top-level comment, notify the character creator
        if (character.creatorId !== currentUser.id) {
            const notification: Notification = {
                id: crypto.randomUUID(),
                type: 'NEW_COMMENT',
                message: `${currentUser.profile.name} commented on your character: ${character.name}`,
                relatedId: character.id,
                timestamp: Date.now(),
                isRead: false,
            };
            setUsers(prevUsers => {
                const creatorUser = Object.values(prevUsers).find(u => u.user.id === character.creatorId);
                if (creatorUser) {
                    const newUsers = {...prevUsers};
                    const userToNotify = newUsers[creatorUser.user.username].user;
                    userToNotify.profile.notifications = [notification, ...(userToNotify.profile.notifications || [])];
                    return newUsers;
                }
                return prevUsers;
            });
        }
      }
  };

  const followUser = (userIdToFollow: string) => {
      if (!currentUser || currentUser.id === userIdToFollow) return;
      
      const userToFollow = findUserById(userIdToFollow);
      if (!userToFollow) return;

      setUsers(prevUsers => {
          const newUsers = { ...prevUsers };
          
          // Update current user's following list
          const me = newUsers[currentUser.username].user;
          const isFollowing = me.profile.following.includes(userIdToFollow);
          me.profile.following = isFollowing 
              ? me.profile.following.filter(id => id !== userIdToFollow) 
              : [...me.profile.following, userIdToFollow];
          
          // Update followed user's followers list
          const them = newUsers[userToFollow.username].user;
          them.profile.followers = isFollowing
              ? them.profile.followers.filter(id => id !== currentUser.id)
              : [...them.profile.followers, currentUser.id];
          
          if (currentUser.username === session) {
              setCurrentUser(me);
          }
          
          return newUsers;
      });
  };

  const markNotificationsAsRead = () => {
      if (!currentUser) return;
      const updatedUser = { ...currentUser };
      updatedUser.profile.notifications = updatedUser.profile.notifications.map(n => ({...n, isRead: true}));
      updateUser(updatedUser);
  };

  const updateChatSettings = useCallback((characterId: string, settings: Partial<ChatSettings>) => {
    if (currentUser) {
        setChatSettings(prev => ({
            ...prev,
            [currentUser.id]: {
                ...(prev[currentUser.id] || {}),
                [characterId]: {
                    ...(prev[currentUser.id]?.[characterId] || {}),
                    ...settings,
                }
            }
        }));
    }
  }, [currentUser, setChatSettings]);

  const updateGlobalSettings = (settings: GlobalSettings) => {
      if (currentUser?.userType === 'Admin') {
          setGlobalSettings(settings);
      }
  };


  const value = {
    currentUser,
    allUsers,
    login,
    signup,
    loginWithGoogle,
    logout,
    updateUserProfile,
    updateAnyUserProfile,
    updateUserType,
    deleteUser,
    silenceUser,
    toggleFavorite,
    characters,
    saveCharacter,
    deleteCharacter,
    silenceCharacter,
    likeCharacter,
    addComment,
    followUser,
    findUserById,
    markNotificationsAsRead,
    chatHistories,
    updateChatHistory,
    deleteChatHistory,
    chatSettings,
    updateChatSettings,
    globalSettings,
    updateGlobalSettings,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};