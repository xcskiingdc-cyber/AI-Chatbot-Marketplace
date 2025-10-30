export enum LLMModel {
  GEMINI_FLASH = 'gemini-2.5-flash',
  GEMINI_PRO = 'gemini-2.5-pro',
}

export interface UserProfile {
  name: string;
  email: string;
  gender: 'male' | 'female' | 'non-binary' | 'undisclosed';
  birthday: string; // YYYY-MM-DD
  avatarUrl: string;
  bio: string;
  favoriteCharacterIds: string[];
}

export interface User {
  id: string;
  username: string;
  profile: UserProfile;
}

export interface Character {
  id: string;
  creatorId: string; // New field to link to a User
  name:string;
  avatarUrl:string;
  description: string; // New field for public description
  personality: string;
  story: string;
  situation: string;
  feeling: string;
  appearance: string; // New field for physical description
  isNSFW: boolean;
  model: LLMModel;
  greeting: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: number;
}

export type AppView = 
  | { type: 'HOME' }
  | { type: 'CREATE_CHARACTER' }
  | { type: 'EDIT_CHARACTER', characterId: string }
  | { type: 'CHAT', characterId: string }
  | { type: 'RECENT_CHATS' }
  | { type: 'PROFILE' };