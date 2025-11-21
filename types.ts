


export const TTSVoices = {
  Kore: "Female - Calm",
  Zephyr: "Female - Warm",
  Puck: "Male - Standard",
  Charon: "Male - Deep",
  Fenrir: "Male - Storyteller",
} as const;

export type TTSVoiceName = keyof typeof TTSVoices;

export interface ChatSettings {
  model: string;
  isStreaming: boolean;
  ttsVoice: TTSVoiceName;
  kidMode: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string;
  text: string;
  timestamp: number;
  parentId?: string; // For replies
  isSilenced?: boolean;
}

export type ReportReason = 'Underage Content' | 'Hate Speech' | 'Bullying/Harassment' | 'Non-consensual Sexual Acts' | 'Spam' | 'Impersonation' | 'Other';

export type ReportableEntityType = 'character' | 'user' | 'comment' | 'message' | 'forumThread' | 'forumPost';

export interface Report {
  id: string;
  reporterId: string;
  entityType: ReportableEntityType;
  entityId: string;
  reason: ReportReason;
  description: string;
  timestamp: number;
  isResolved: boolean;
  notes?: string[]; // Admin notes
  // Optional content snapshot for context
  contentSnapshot?: string; 
  entityCreatorId?: string;
}

export type AIViolationCategory = 'underage-themes' | 'racism' | 'bullying' | 'non-consensual-sexual-acts' | 'explicit-nudity' | 'suggestive-content' | 'violence' | 'hate-symbols';

export type AIAlertStatus = 'New' | 'In Progress' | 'Resolved';

export interface AIAlertFolder {
    id: string;
    name: string;
}

export interface AIAlert {
  id: string;
  entityType: ReportableEntityType | 'image';
  entityId: string;
  category: AIViolationCategory;
  confidence: number;
  flaggedText?: string;
  explanation?: string;
  timestamp: number;
  status: AIAlertStatus;
  folderId?: string | null;
  entityCreatorId?: string;
  notes?: string[];
  feedback?: 'good' | 'bad';
}

export type TicketStatus = 'New' | 'In Progress' | 'Resolved';

export interface TicketFolder {
    id: string;
    name: string;
}

export interface DMFolder {
    id: string;
    name: string;
}

export interface Ticket {
    id: string;
    submitterId: string;
    subject: string;
    description: string;
    email: string;
    status: TicketStatus;
    timestamp: number;
    folderId?: string | null;
}

export interface DirectMessage {
    id: string;
    senderId: string; // 'ADMIN' or a userId
    text?: string;
    imageUrl?: string;
    timestamp: number;
}

export interface DMConversation {
    userId: string; // The user involved in the conversation
    messages: DirectMessage[];
    hasUnreadByUser: boolean;
    hasUnreadByAdmin: boolean;
    folderId?: string | null;
}

export interface Notification {
    id: string;
    type: 'NEW_BOT' | 'NEW_FOLLOWER' | 'NEW_LIKE' | 'NEW_COMMENT' | 'REPLY' | 'NEW_REPORT' | 'NEW_AI_ALERT' | 'NEW_TICKET' | 'NEW_DM';
    message: string;
    relatedId: string; // characterId, userId, reportId, ticketId, etc.
    timestamp: number;
    isRead: boolean;
    fromUserId?: string;
}

export type UserType = 'Free' | 'Ads' | 'Subscription';
export type UserRole = 'User' | 'Moderator' | 'Assistant Admin' | 'Admin';

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
  forumPostCount: number;
  forumThreadCount: number;
}

export interface User {
  id: string;
  username: string;
  profile: UserProfile;
  userType: UserType;
  role: UserRole;
  isSilenced: boolean;
}

// Fields that can be dynamically included in the AI context
export type CharacterContextField = 'gender' | 'description' | 'personality' | 'story' | 'situation' | 'feeling' | 'appearance' | 'greeting';

export interface StatRule {
  id: string;
  description: string;
  value: number;
}

export interface CharacterStat {
  id: string;
  name: string;
  initialValue: number;
  min: number;
  max: number;
  behaviorDescription: string;
  increaseRules: StatRule[];
  decreaseRules: StatRule[];
}

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
  isBeyondTheHaven: boolean;
  model: string;
  greeting: string;
  isPublic: boolean;
  isSilencedByAdmin: boolean;
  categories: string[];
  likes: string[]; // Array of user IDs
  comments: Comment[];
  stats: CharacterStat[];
  statsVisible: boolean;
  summary?: {
    description?: string;
    personality?: string;
    story?: string;
    situation?: string;
    feeling?: string;
    appearance?: string;
    greeting?: string;
  };
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: number;
  statsSnapshot?: string;
}

export interface GlobalSettings {
    havenPrompt: string;
    beyondTheHavenPrompt: string;
    kidModePrompt: string;
    enableAIModeration: boolean;
}

export interface AIContextSettings {
    includedFields: CharacterContextField[];
    historyLength: number;
    maxResponseTokens: number;
}

// Forum interfaces
export interface Tag {
  id: string;
  name: string;
  description: string;
}

export interface ForumPost {
  id: string;
  threadId: string;
  authorId: string; // Can be a User ID or a Character ID
  isCharacterPost: boolean;
  content: string;
  createdAt: number;
  upvotes: string[]; // User IDs
  downvotes: string[]; // User IDs
  isEdited: boolean;
  isSilenced: boolean;
}

export interface ForumThread {
  id: string;
  categoryId: string;
  authorId: string;
  title: string;
  createdAt: number;
  tags: Tag[];
  isLocked: boolean;
  isPinned: boolean;
  isSilenced: boolean;
  viewCount: number;
}

export interface ForumCategory {
  id: string;
  name: string;
  description: string;
  parentId?: string | null; // For subcategories
  isLocked: boolean;
}

// AI API Management
export type ApiProvider = 'Gemini' | 'OpenAI' | 'Anthropic' | 'Other';

export interface ApiConnection {
  id: string;
  name: string;
  provider: ApiProvider;
  apiKey: string;
  baseUrl?: string;
  models: string[]; 
  isActive: boolean;
}

export type AITool = 
  | 'imageGeneration'
  | 'characterSummarization'
  | 'narrativeSummarization'
  | 'textToSpeech'
  | 'textModeration'
  | 'imageModeration';

export interface AIToolSettings {
  toolConnections: Record<AITool, string | null>; // Maps tool to ApiConnection.id
}


export type AppView = 
  | { type: 'HOME' }
  | { type: 'CREATE_CHARACTER' }
  | { type: 'EDIT_CHARACTER', characterId: string }
  | { type: 'CHAT', characterId: string }
  | { type: 'RECENT_CHATS' }
  | { type: 'PROFILE' }
  | { type: 'NOTIFICATIONS' }
  | { type: 'SUPPORT_TICKET'}
  | { type: 'ADMIN_CONSOLE' }
  | { type: 'MODERATOR_CONSOLE' }
  | { type: 'AI_API_SETTINGS' }
  | { type: 'SYSTEM_MONITOR' }
  | { type: 'FORUM_HOME' }
  | { type: 'FORUM_CATEGORY', categoryId: string }
  | { type: 'FORUM_THREAD', threadId: string }
  | { type: 'CREATE_THREAD', categoryId: string };