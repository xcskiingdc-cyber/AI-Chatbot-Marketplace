export enum LLMModel {
  GEMINI_FLASH = 'gemini-2.5-flash',
  GEMINI_PRO = 'gemini-2.5-pro',
}

export const TTSVoices = {
  Kore: "Female A",
  Zephyr: "Female B",
  Puck: "Male A",
  Charon: "Male B",
  Fenrir: "Male C",
} as const;

export type TTSVoiceName = keyof typeof TTSVoices;

export interface ChatSettings {
  model: LLMModel;
  isStreaming: boolean;
  ttsVoice: TTSVoiceName;
  autoRead: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string;
  text: string;
  timestamp: number;
  parentId?: string; // For replies
}

export interface Notification {
    id: string;
    type: 'NEW_BOT' | 'NEW_FOLLOWER' | 'NEW_LIKE' | 'NEW_COMMENT' | 'REPLY';
    message: string;
    relatedId: string; // characterId or userId
    timestamp: number;
    isRead: boolean;
}

export type UserType = 'Free' | 'Ads' | 'Subscription' | 'Admin';

export interface UserProfile {
  name: string;
  email: string;
  gender: 'male' | 'female' | 'non-binary' | 'undisclosed';
  birthday: string; // YYYY-MM-DD
  avatarUrl: string;
  bio: string;
  favoriteCharacterIds: string[];
  following: string[]; // Array of user IDs they follow
  followers: string[]; // Array of user IDs who follow them
  notifications: Notification[];
}

export interface User {
  id: string;
  username: string;
  profile: UserProfile;
  userType: UserType;
  isSilenced: boolean;
}

// Fields that can be dynamically included in the AI context
export type CharacterContextField = 'gender' | 'description' | 'personality' | 'story' | 'situation' | 'feeling' | 'appearance';


export interface Character {
  id: string;
  creatorId: string; // New field to link to a User
  name:string;
  avatarUrl:string;
  gender: 'male' | 'female' | 'non-binary' | 'unspecified';
  description: string; // New field for public description
  personality: string;
  story: string;
  situation: string;
  feeling: string;
  appearance: string; // New field for physical description
  isNSFW: boolean;
  model: LLMModel;
  greeting: string;
  isPublic: boolean;
  isSilencedByAdmin: boolean;
  categories: string[];
  likes: string[]; // Array of user IDs
  comments: Comment[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: number;
}

export interface GlobalSettings {
    sfwPrompt: string;
    nsfwPrompt: string;
}

export interface AIContextSettings {
    includedFields: CharacterContextField[];
    historyLength: number;
}


export type AppView = 
  | { type: 'HOME' }
  | { type: 'CREATE_CHARACTER' }
  | { type: 'EDIT_CHARACTER', characterId: string }
  | { type: 'CHAT', characterId: string }
  | { type: 'RECENT_CHATS' }
  | { type: 'PROFILE' }
  | { type: 'NOTIFICATIONS' }
  | { type: 'ADMIN_SETTINGS' };