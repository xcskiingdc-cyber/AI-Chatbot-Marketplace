import React, { createContext, useState, useEffect, useCallback } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { User, UserProfile, Character, ChatMessage } from '../types';

interface AuthContextType {
  currentUser: User | null;
  login: (username: string, pass: string) => Promise<void>;
  signup: (username: string, pass: string, email: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  updateUserProfile: (profile: UserProfile) => void;
  toggleFavorite: (characterId: string) => void;
  characters: Character[];
  saveCharacter: (character: Character) => void;
  chatHistories: Record<string, Record<string, ChatMessage[]>>;
  updateChatHistory: (characterId: string, history: ChatMessage[]) => void;
  deleteChatHistory: (characterId: string) => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

// NOTE: This is a mock authentication system using localStorage.
// DO NOT use this in a production environment.
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useLocalStorage<Record<string, { pass: string; user: User }>>('ai-users', {});
  const [session, setSession] = useLocalStorage<string | null>('ai-session', null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [characters, setCharacters] = useLocalStorage<Character[]>('ai-characters', []);
  const [chatHistories, setChatHistories] = useLocalStorage<Record<string, Record<string, ChatMessage[]>>>('ai-chatHistories', {});

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
      profile: {
        name: username,
        email: email,
        gender: 'undisclosed',
        birthday: '',
        avatarUrl: `https://i.pravatar.cc/150?u=${userId}`,
        bio: '',
        favoriteCharacterIds: [],
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

  const updateUserProfile = (profile: UserProfile) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, profile };
      setCurrentUser(updatedUser);
      setUsers(prev => ({ ...prev, [currentUser.username]: { ...prev[currentUser.username], user: updatedUser } }));
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
    setCharacters(prev => {
        const existingIndex = prev.findIndex(c => c.id === character.id);
        if (existingIndex > -1) {
            const updated = [...prev];
            updated[existingIndex] = character;
            return updated;
        }
        return [...prev, character];
    });
    // Add greeting message if it doesn't exist
    if (currentUser && character.greeting) {
        setChatHistories(prev => {
            const userHistories = prev[currentUser.id] || {};
            if (!userHistories[character.id] || userHistories[character.id].length === 0) {
                 userHistories[character.id] = [{
                    id: crypto.randomUUID(),
                    sender: 'bot',
                    text: character.greeting,
                    timestamp: Date.now()
                }];
            }
            return { ...prev, [currentUser.id]: userHistories };
        });
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

  const value = {
    currentUser,
    login,
    signup,
    loginWithGoogle,
    logout,
    updateUserProfile,
    toggleFavorite,
    characters,
    saveCharacter,
    chatHistories,
    updateChatHistory,
    deleteChatHistory
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};