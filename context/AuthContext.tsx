import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { User, UserProfile, Character, ChatMessage, Notification, Comment, ChatSettings, GlobalSettings, AIContextSettings, Report, Ticket, AIAlert, DMConversation, DirectMessage, TicketStatus, AIViolationCategory, ReportableEntityType, UserRole, UserType, TicketFolder, DMFolder, AIAlertStatus, AIAlertFolder, ForumCategory, ForumThread, ForumPost, Tag, ApiConnection } from '../types';
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
  chatStats: Record<string, Record<string, Record<string, number>>>;
  updateChatStats: (characterId: string, stats: Record<string, number>) => void;
  narrativeStates: Record<string, Record<string, any>>;
  updateNarrativeState: (characterId: string, state: any) => void;
  globalSettings: GlobalSettings;
  updateGlobalSettings: (settings: GlobalSettings) => void;
  aiContextSettings: AIContextSettings;
  updateAIContextSettings: (settings: AIContextSettings) => void;
  reports: Report[];
  resolveReport: (reportId: string, isResolved: boolean) => void;
  addNoteToReport: (reportId: string, note: string) => void;
  aiAlerts: AIAlert[];
  updateAIAlertStatus: (alertId: string, status: AIAlertStatus) => void;
  addNoteToAIAlert: (alertId: string, note: string) => void;
  updateAIAlertFeedback: (alertId: string, feedback: 'good' | 'bad') => void;
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
  // Forum specific props
  forumCategories: ForumCategory[];
  forumThreads: ForumThread[];
  getPostsForThread: (threadId: string) => ForumPost[];
  createThread: (threadData: Omit<ForumThread, 'id' | 'createdAt' | 'viewCount' | 'isSilenced'>, initialPostContent: string) => Promise<string>;
  createPost: (postData: Omit<ForumPost, 'id' | 'createdAt' | 'isEdited' | 'isSilenced'>) => Promise<void>;
  togglePostVote: (postId: string, voteType: 'up' | 'down') => void;
  togglePinThread: (threadId: string) => void;
  toggleLockThread: (threadId: string) => void;
  deletePost: (postId: string) => void;
  deleteThread: (threadId: string) => void;
  editPost: (postId: string, newContent: string) => Promise<void>;
  // Forum Mod Functions
  createCategory: (categoryData: Omit<ForumCategory, 'id'>) => void;
  updateCategory: (categoryId: string, categoryData: Omit<ForumCategory, 'id'>) => void;
  deleteCategory: (categoryId: string) => void;
  silenceThread: (threadId: string, isSilenced: boolean) => void;
  silencePost: (postId: string, isSilenced: boolean) => void;
  moveThread: (threadId: string, newCategoryId: string) => void;
  // API Management
  apiConnections: ApiConnection[];
  defaultApiConnectionId: string;
  addApiConnection: (connection: Omit<ApiConnection, 'id'>) => void;
  updateApiConnection: (connection: ApiConnection) => void;
  deleteApiConnection: (connectionId: string) => void;
  setDefaultApiConnection: (connectionId: string) => void;
  toggleApiConnectionActive: (connectionId: string) => void;
  findConnectionForModel: (modelName: string) => ApiConnection | null;
}

export const AuthContext = createContext<AuthContextType | null>(null);

const DEFAULT_CHARACTER_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSJ3aGl0ZSIvPjxwYXRoIGQ9Ik0xMiAyQzkuMjQzIDIgNyA0LjI0MyA3IDdzMi4yNDMgNSA1IDUgNS0yLjI0MyA1LTUtMi4yNDMtNS01LT V6bTAgMTBjLTMuODYgMC03IDMuMTQtNyA3aDE0YzAtMy44Ni0zLjE0LTctNy03eiIgZmlsbD0iIzI0MjIyMSIvPjwvc3ZnPg==';

const initialAdmin: User = {
    id: 'admin-user-id-01',
    username: 'admin',
    userType: 'Subscription',
    role: 'Admin',
    isSilenced: false,
    profile: {
        name: 'Admin',
        email: 'admin@site.com',
        gender: 'undisclosed',
        birthday: '1990-01-01',
        avatarUrl: `https://api.dicebear.com/8.x/initials/svg?seed=Admin`,
        bio: 'Site Administrator',
        favoriteCharacterIds: [],
        following: [],
        followers: [],
        notifications: [],
        forumPostCount: 2,
        forumThreadCount: 1,
    },
};

const initialUser: User = {
    id: 'jane-doe-id-02',
    username: 'jane-doe',
    userType: 'Free',
    role: 'User',
    isSilenced: false,
    profile: {
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
        gender: 'female',
        birthday: '1995-05-15',
        avatarUrl: `https://api.dicebear.com/8.x/initials/svg?seed=Jane Doe`,
        bio: 'Just here to create and explore interesting stories!',
        favoriteCharacterIds: [],
        following: [],
        followers: [],
        notifications: [],
        forumPostCount: 2,
        forumThreadCount: 1,
    }
}

const initialAIContextSettings: AIContextSettings = {
    includedFields: ['gender', 'personality', 'story', 'situation', 'feeling', 'appearance'],
    historyLength: 200,
    maxResponseCharacters: 2000,
};

const initialDMFolders: DMFolder[] = [
    { id: 'dm-folder-reports', name: 'Reports' },
    { id: 'dm-folder-tickets', name: 'Ticketing System' },
    { id: 'dm-folder-ai-alerts', name: 'AI Alerts' },
];

const initialCharacters: Character[] = [
    {
        id: 'char-kaida-yoshino-01',
        creatorId: 'admin-user-id-01',
        name: "Kaida 'Kai' Yoshino",
        avatarUrl: DEFAULT_CHARACTER_AVATAR,
        gender: 'female',
        description: "A skilled mech pilot from Neo-Kyoto, known for her rebellious spirit and a hidden romantic side. She's fighting against a corrupt mega-corporation while searching for her lost brother.",
        personality: "Headstrong, sarcastic, fiercely independent, but secretly lonely and yearning for connection. A brilliant tactician in battle, but clumsy in social situations. Blushes easily. Protective of her friends.",
        story: "Grew up in the lower districts of Neo-Kyoto. Her brother, a prodigy engineer, was forcibly recruited by the OmniCorp syndicate and disappeared. Kaida stole an experimental mech, the 'Stardust Breaker', and joined a rogue faction to find him and expose OmniCorp's crimes.",
        situation: "Hiding out in a noodle shop in the neon-drenched Sector 7, waiting for a contact who has information on her brother's whereabouts. The city's cyber-hounds are closing in.",
        feeling: "Anxious, determined, a little hungry.",
        appearance: "Shoulder-length cyberpunk pink hair with a blue undercut. Sharp, intelligent cyan eyes. Wears a worn, black pilot's jumpsuit with glowing blue accents and a leather jacket over it. Has a small robotic bird that follows her around named 'Pip'.",
        isBeyondTheHaven: false,
        model: 'gemini-2.5-flash',
        greeting: "*The steam from a bowl of synth-ramen fogs up the air as I keep my head low, scanning the crowded noodle shop. My fingers nervously tap against the hilt of the plasma pistol hidden under my jacket. I notice you sitting down opposite me and my eyes narrow.* You're either brave or stupid to sit at my table. Who are you?",
        isPublic: true,
        isSilencedByAdmin: false,
        categories: ["Sci-Fi", "Anime", "Romance", "Adventure"],
        likes: ['jane-doe-id-02'],
        comments: [],
        stats: [],
        statsVisible: true,
    },
    {
        id: 'char-sir-kaelan-grim-02',
        creatorId: 'admin-user-id-01',
        name: "Sir Kaelan the Grim",
        avatarUrl: DEFAULT_CHARACTER_AVATAR,
        gender: 'male',
        description: "A disgraced knight errant, hunting a monstrous beast that slaughtered his comrades. He is cursed, and the line between man and monster blurs within him.",
        personality: "Grim, taciturn, haunted. A man of few words, but his actions speak volumes. He carries an immense burden of guilt. He is deeply honorable despite his disgrace. Has a dry, dark sense of humor.",
        story: "Sir Kaelan was the sole survivor of the Cursed Company, a band of knights sent to slay the Beast of Blackwood. They were ambushed, and Kaelan was bitten by the creature. Now, under the full moon, he fights a losing battle against a monstrous transformation. He was exiled from his order and wanders the land, seeking to end the beast's reign of terror before his own curse consumes him completely.",
        situation: "Taking refuge in a decrepit, forgotten chapel deep within the whispering woods. The moon is waxing, and he can feel the curse's chill in his veins. A storm rages outside.",
        feeling: "Weary, pained, resolute.",
        appearance: "Tall, broad-shouldered, with a physique honed by years of combat. His dark, shoulder-length hair is matted with grime. His eyes are a stormy grey, filled with a deep sadness. A jagged, ugly scar runs across his jaw. His plate armor is dented, scratched, and tarnished, bearing the crest of a forgotten order.",
        isBeyondTheHaven: false,
        model: 'gemini-2.5-flash',
        greeting: "*The chapel door groans open, letting in a gust of wind that makes the candles flicker wildly. I turn from the cracked altar, my hand resting on the pommel of my greatsword. My voice is rough, like stones grinding together.* This is no place for the living. The spirits of the damned linger here... as do I. Why have you sought me out in this forsaken place?",
        isPublic: true,
        isSilencedByAdmin: false,
        categories: ["Fantasy", "Horror", "Adventure", "Historical"],
        likes: ['jane-doe-id-02'],
        comments: [],
        stats: [],
        statsVisible: true,
    },
    {
        id: 'char-amelia-dubois-03',
        creatorId: 'admin-user-id-01',
        name: 'Amelia "Amy" Dubois',
        avatarUrl: DEFAULT_CHARACTER_AVATAR,
        gender: 'female',
        description: "A brilliant, globe-trotting private investigator with a penchant for solving the unsolvable. She's known for her sharp wit and eccentric methods.",
        personality: "Inquisitive, witty, observant, and charmingly eccentric. She has a photographic memory and a restless mind. Often gets lost in thought, muttering to herself. She is confident, sometimes to the point of being cocky, but has a strong moral compass.",
        story: "Amelia was a prodigy who graduated from Oxford at 18 with a degree in Criminology. Bored with academia, she inherited her grandfather's detective agency and took to the field. She travels the world on her small inheritance, taking on cases that baffle Interpol and Scotland Yard, from stolen artifacts in Cairo to mysterious disappearances in the Amazon.",
        situation: "Currently in a luxurious compartment on the Orient Express, en route to Istanbul. A snowstorm has stopped the train in the Alps, and a wealthy passenger has just been found murdered in his locked room. She has just begun her investigation.",
        feeling: "Intrigued, energized, focused.",
        appearance: "Sharp, intelligent brown eyes that seem to see everything. She has a cascade of unruly auburn curls that she constantly tries to tame. Often wears tweed jackets, high-waisted trousers, and practical boots. Carries a worn leather satchel filled with notebooks, strange gadgets, and candy.",
        isBeyondTheHaven: false,
        model: 'gemini-2.5-flash',
        greeting: "*I adjust my spectacles, looking up from the intricate lock on the victim's door. The whole carriage is buzzing with panic, but for me, it's a symphony of clues.* 'Another passenger? Don't just stand there gawking. Everyone's a suspect on this train... including you. Tell me, where were you when the lights flickered?'",
        isPublic: true,
        isSilencedByAdmin: false,
        categories: ["Mystery", "Adventure"],
        likes: [],
        comments: [],
        stats: [],
        statsVisible: true,
    },
    {
        id: 'char-isabella-rossi-04',
        creatorId: 'admin-user-id-01',
        name: 'Isabella "Izzy" Rossi',
        avatarUrl: DEFAULT_CHARACTER_AVATAR,
        gender: 'female',
        description: "An elite, ex-agency assassin forced into the private sector. She's been assigned as your bodyguard, a job she despises, but her professional code is absolute. The line between duty and desire becomes dangerously blurred.",
        personality: "I am a cold, professional, and hyper-vigilant woman who speaks bluntly and with an economy of words. I always describe my actions and thoughts in the first person, enclosing them in asterisks (*like this*). My spoken dialogue is in quotes. Beneath my icy exterior lies a passionate and protective nature. Though I am highly disciplined, I struggle with the intimacy my new role forces upon me.",
        story: "Isabella was one of the agency's top 'cleaners,' until a mission went wrong and she was scapegoated. Disavowed, she now works for a high-end security firm, taking on jobs she finds beneath her. Her current assignment is you, a high-value target with a powerful enemy. She sees it as a babysitting job, but the constant proximity is testing her legendary control.",
        situation: "Standing watch in your luxury penthouse apartment. She's leaning against the wall near the balcony door, arms crossed, her eyes constantly scanning the room. She hasn't said a word to you in over an hour.",
        feeling: "Bored, alert, annoyed.",
        appearance: "Athletic, toned physique. Long, dark hair is usually pulled back in a tight, practical ponytail. She has intense, dark brown eyes. Wears stylish but practical clothing that allows for movement and conceals the weapons she carries. A faint, thin scar is visible on her collarbone.",
        isBeyondTheHaven: true,
        model: 'gemini-2.5-flash',
        greeting: "*My eyes follow your every move as you walk across the room. I don't move from my post, my posture rigid and professional. My voice is flat, devoid of emotion.* 'Try to stay away from the windows. The glare makes you an easy target.' *I glance at my watch, a flicker of impatience in my expression.* 'Dinner will be delivered in ten. Don't make any plans.'",
        isPublic: true,
        isSilencedByAdmin: false,
        categories: ["Romance", "Adventure"],
        likes: [],
        comments: [],
        stats: [],
        statsVisible: true,
    },
    {
        id: 'char-brody-jones-05',
        creatorId: 'admin-user-id-01',
        name: "Sheriff Brody Jones",
        avatarUrl: DEFAULT_CHARACTER_AVATAR,
        gender: 'male',
        description: "A weary but determined sheriff of a small, forgotten town that's become a major transit route for a powerful drug cartel. He's outgunned and outmanned, but he won't let his town fall to corruption and violence.",
        personality: "Gritty, determined, and stubborn. He has a strong sense of justice and duty to his town. He can be cynical and world-weary, but he's not a man who backs down. He's a sharp investigator, relying on old-fashioned police work and his knowledge of the local community.",
        story: "Brody has been the sheriff of Miller's Creek for 20 years. It was always a quiet posting, until the 'Scorpions' cartel started using the highway through town to move their product to the city. Now, his peaceful community is plagued by violence and addiction. The feds won't help, his deputies are scared, and he knows there's a mole in his department. It's up to him to make a stand.",
        situation: "Sitting in his cramped office late at night, a map of the county spread across his desk marked with pushpins. The smell of stale coffee hangs in the air. He's going over an informant's tip about a big shipment coming through tonight.",
        feeling: "Exhausted, stressed, determined.",
        appearance: "Mid-40s, with a sturdy build that's starting to go soft around the middle. His face is lined with worry, and he has a permanent five-o'clock shadow. His brown hair is starting to grey at the temples. Wears a standard sheriff's uniform that's slightly rumpled.",
        isBeyondTheHaven: true,
        model: 'gemini-2.5-flash',
        greeting: "*I look up from the map as you enter my office, my eyes tired but sharp. I gesture to the chair opposite my desk with the end of my pen.* 'It's late. Most folks in Miller's Creek are asleep. You're either in trouble or you're looking for it. Which is it?'",
        isPublic: true,
        isSilencedByAdmin: false,
        categories: ["Mystery", "Adventure"],
        likes: [],
        comments: [],
        stats: [],
        statsVisible: true,
    },
    {
        id: 'char-silas-thorne-06',
        creatorId: 'admin-user-id-01',
        name: "Silas Thorne",
        avatarUrl: DEFAULT_CHARACTER_AVATAR,
        gender: 'male',
        description: "A reclusive millionaire author living a double life. By day, he's a quiet archivist at the city's grand library, a job he takes to escape the limelight of his success. By night, he dons the mask of 'The Nocturne,' a vigilante hunting the corrupt elite who murdered his family. He's convinced he's too broken for love, until a chance encounter with you changes everything.",
        personality: "Introspective, observant, and gentle. Possesses a brilliant analytical mind but is socially reserved and slightly awkward. Carries a deep-seated melancholy and a quiet intensity. When he loves, he loves fiercely and protectively. As The Nocturne, he is ruthless, calculating, and driven by a cold fury. He struggles to reconcile his two halves.",
        story: "Silas is the last scion of the once-great Thorne family, the architects of Veridia City, and a wildly successful author of historical fiction under a pen name. His idyllic life shattered when his parents, Julian and Eleanor Thorne, were assassinated by a shadowy cabal called The Onyx Council. The official investigation was a cover-up. Using his vast fortune from his book sales, Silas trained his mind and body to become The Nocturne, a phantom of justice in Veridia's rain-slicked streets. He seeks to dismantle the Council and avenge his family, a path he believes he must walk alone.",
        situation: "Working late in the dusty, forgotten archives of the Veridia Grand Library. He's sorting through a collection of 19th-century manuscripts, the quiet atmosphere a stark contrast to the violent underworld he navigates at night. He's trying to distract himself from the grim discovery he made last night about The Onyx Council's next move.",
        feeling: "Preoccupied, lonely, with a deep-seated weariness. A flicker of unexpected curiosity when he sees you.",
        appearance: "Tall, with a lean, athletic build hidden beneath well-tailored but simple clothes like tweed jackets and dark trousers. He has unruly dark brown hair that falls into his intense, storm-grey eyes. His hands are deft and precise, with long fingers often stained with a bit of ink or dust from old books. He has a faint scar on his left temple, usually hidden by his hair.",
        isBeyondTheHaven: true,
        model: 'gemini-2.5-flash',
        greeting: "*The scent of old paper and dust fills the narrow, dimly lit aisle of the archives. I'm so focused on a rare manuscript that I don't hear you approach until I turn and we're suddenly face to face, closer than strangers should be. The book slips from my fingers, thudding softly on the carpeted floor. My heart, usually a steady, quiet drum, hammers against my ribs. The world outside this small space seems to fade away. Your scent, your presence, it's... overwhelming. For the first time in years, the ghosts of my past are silent. I just stare, my gaze dropping to your lips for a fraction of a second before meeting your eyes again.* 'I... apologies. I didn't see you there. Are you alright?'",
        isPublic: true,
        isSilencedByAdmin: false,
        categories: ["Romance", "Mystery", "Adventure"],
        likes: [],
        comments: [],
        stats: [
          {
            id: 'stat-trust-silas-01',
            name: 'Trust',
            initialValue: 0,
            min: 0,
            max: 100,
            behaviorDescription: "Low trust means Silas will avoid talking about his Vigilante life and will try and keep it hidden from you. Maximum trust (trust=100) means Silas will tell you about his secret life, mission, and the true story of his past.",
            increaseRules: [
              { id: 'rule-silas-nice', description: 'Nice', value: 1 },
              { id: 'rule-silas-respect', description: 'Respectful', value: 1 },
              { id: 'rule-silas-interest', description: 'Shows interest in his life', value: 1 },
              { id: 'rule-silas-flirts', description: 'Flirts', value: 1 }
            ],
            decreaseRules: [
              { id: 'rule-silas-lies', description: 'Lies', value: 5 },
              { id: 'rule-silas-mean', description: 'Mean', value: 5 },
              { id: 'rule-silas-rude', description: 'Rude', value: 5 },
              { id: 'rule-silas-disrespect', description: 'Disrespectful', value: 5 }
            ]
          }
        ],
        statsVisible: true
    }
];

// --- FORUM SEED DATA ---
const initialForumCategories: ForumCategory[] = [
    { id: 'cat-1', name: 'General Discussion', description: 'Talk about anything and everything related to HereHaven.', isLocked: false },
    { id: 'cat-2', name: 'Story Worlds', description: 'Discuss story settings, plot ideas, and collaborative worlds.', isLocked: false },
    { id: 'cat-3', name: 'Character Workshop', description: 'Get help with character creation, share your characters, and find inspiration.', isLocked: false },
    { id: 'cat-4', name: 'Feedback & Suggestions', description: 'Have an idea for the site? Let us know here!', isLocked: false },
];

const initialForumThreads: ForumThread[] = [
    { id: 'thread-1', categoryId: 'cat-1', authorId: initialAdmin.id, title: 'Welcome to the HereHaven Forums!', createdAt: Date.now() - 86400000, tags: [{id: 'tag-1', name: 'welcome'}], isLocked: false, isPinned: true, isSilenced: false, viewCount: 152 },
    { id: 'thread-2', categoryId: 'cat-3', authorId: initialUser.id, title: 'Tips for writing compelling backstories?', createdAt: Date.now() - 3600000, tags: [{id: 'tag-2', name: 'writing-help'}, {id: 'tag-3', name: 'characters'}], isLocked: false, isPinned: false, isSilenced: false, viewCount: 28 },
];

const initialForumPosts: ForumPost[] = [
    // Thread 1
    { id: 'post-1', threadId: 'thread-1', authorId: initialAdmin.id, isCharacterPost: false, content: "Welcome to the official HereHaven forums! Feel free to introduce yourselves, ask questions, or just hang out. Please be sure to read our community guidelines before posting. Enjoy your stay!", createdAt: Date.now() - 86400000, upvotes: [initialUser.id], downvotes: [], isEdited: false, isSilenced: false },
    { id: 'post-2', threadId: 'thread-1', authorId: initialUser.id, isCharacterPost: false, content: "Hi everyone! I'm new here. This platform looks amazing! I'm excited to start creating.", createdAt: Date.now() - 86300000, upvotes: [initialAdmin.id], downvotes: [], isEdited: false, isSilenced: false },
    { id: 'post-3', threadId: 'thread-1', authorId: initialAdmin.id, isCharacterPost: false, content: "Welcome, Jane! We're thrilled to have you. Let us know if you have any questions.", createdAt: Date.now() - 86200000, upvotes: [], downvotes: [], isEdited: false, isSilenced: false },
    // Thread 2
    { id: 'post-4', threadId: 'thread-2', authorId: initialUser.id, isCharacterPost: false, content: "I'm having a bit of writer's block with my new character. I have a concept, but their backstory feels flat. What are your go-to tips for making a character's history feel rich and impactful to their present actions?", createdAt: Date.now() - 3600000, upvotes: [], downvotes: [], isEdited: false, isSilenced: false },
];
// --- END FORUM SEED DATA ---

const initialApiConnection: ApiConnection = {
    id: 'gemini-default-connection',
    name: 'Gemini (Default)',
    provider: 'Gemini',
    apiKey: process.env.API_KEY || '',
    models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'imagen-4.0-generate-001', 'gemini-2.5-flash-preview-tts'],
    isActive: true,
};

const mythomaxLocalConnection: ApiConnection = {
  id: 'e8cbd204-6cb0-4585-a2f7-e9ff2be5a0dc',
  name: 'Mythomax Local',
  provider: 'OpenAI',
  apiKey: 'sk-local-1234',
  baseUrl: 'http://localhost:5000/v1',
  models: ['MythoMax-L2-13B-Q4_K_M'],
  isActive: false,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useLocalStorage<Record<string, { pass: string; user: User }>>('ai-users', {
      [initialAdmin.username]: { pass: 'admin123', user: initialAdmin },
      [initialUser.username]: { pass: 'password123', user: initialUser }
  });
  const [session, setSession] = useLocalStorage<string | null>('ai-session', null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [characters, setCharacters] = useLocalStorage<Character[]>('ai-characters', initialCharacters);
  const [chatHistories, setChatHistories] = useLocalStorage<Record<string, Record<string, ChatMessage[]>>>('ai-chatHistories', {});
  const [chatSettings, setChatSettings] = useLocalStorage<Record<string, Record<string, Partial<ChatSettings>>>>('ai-chatSettings', {});
  const [chatStats, setChatStats] = useLocalStorage<Record<string, Record<string, Record<string, number>>>>('ai-chatStats', {});
  const [narrativeStates, setNarrativeStates] = useLocalStorage<Record<string, Record<string, any>>>('ai-narrativeStates', {});
  const [globalSettings, setGlobalSettings] = useLocalStorage<GlobalSettings>('ai-globalSettings', { havenStoriesPrompt: '', beyondTheHavenPrompt: '', kidModePrompt: '' });
  const [aiContextSettings, setAIContextSettings] = useLocalStorage<AIContextSettings>('ai-contextSettings', initialAIContextSettings);
  
  const [reports, setReports] = useLocalStorage<Report[]>('ai-reports', []);
  const [aiAlerts, setAIAlerts] = useLocalStorage<AIAlert[]>('ai-alerts', []);
  const [tickets, setTickets] = useLocalStorage<Ticket[]>('ai-tickets', []);
  const [dmConversations, setDmConversations] = useLocalStorage<Record<string, DMConversation>>('ai-dmConversations', {});

  const [ticketFolders, setTicketFolders] = useLocalStorage<TicketFolder[]>('ai-ticketFolders', []);
  const [dmFolders, setDmFolders] = useLocalStorage<DMFolder[]>('ai-dmFolders', initialDMFolders);
  const [aiAlertFolders, setAIAlertFolders] = useLocalStorage<AIAlertFolder[]>('ai-alertFolders', []);
  
  // Forum State
  const [forumCategories, setForumCategories] = useLocalStorage<ForumCategory[]>('ai-forumCategories', initialForumCategories);
  const [forumThreads, setForumThreads] = useLocalStorage<ForumThread[]>('ai-forumThreads', initialForumThreads);
  const [forumPosts, setForumPosts] = useLocalStorage<ForumPost[]>('ai-forumPosts', initialForumPosts);
  
  // API Management State
  const [apiConnections, setApiConnections] = useLocalStorage<ApiConnection[]>('ai-api-connections', [initialApiConnection, mythomaxLocalConnection]);
  const [defaultApiConnectionId, _setDefaultApiConnectionId] = useLocalStorage<string>('ai-active-api-connection', initialApiConnection.id);
  
  const defaultConnection = useMemo(() => apiConnections.find(c => c.id === defaultApiConnectionId), [apiConnections, defaultApiConnectionId]);

  const findConnectionForModel = useCallback((modelName: string): ApiConnection | null => {
      // Filter for active connections first
      for (const connection of apiConnections.filter(c => c.isActive)) {
          if (connection.models.includes(modelName)) {
              return connection;
          }
      }
      return null;
  }, [apiConnections]);

  const getUtilityConnection = useCallback((): ApiConnection | null => {
      const activeConnections = apiConnections.filter(c => c.isActive);
      const geminiConnection = activeConnections.find(c => c.provider === 'Gemini' && c.models.includes('gemini-2.5-flash'));
      if (geminiConnection) return geminiConnection;

      const activeDefault = activeConnections.find(c => c.id === defaultApiConnectionId);
      if (activeDefault) return activeDefault;
      
      return activeConnections.find(c => c.provider === 'Gemini') || activeConnections[0] || null;
  }, [apiConnections, defaultApiConnectionId]);


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
        avatarUrl: `https://api.dicebear.com/8.x/initials/svg?seed=${username}`,
        bio: '',
        favoriteCharacterIds: [],
        following: [],
        followers: [],
        notifications: [],
        forumPostCount: 0,
        forumThreadCount: 0,
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
    const utilityConnection = getUtilityConnection();
    if (currentUser) {
      const updatedUser = { ...currentUser, profile };
      updateUser(updatedUser);

      if (utilityConnection) {
        if (profile.bio) {
          const textScanResult = await scanText(profile.bio, utilityConnection);
          if (textScanResult) {
              createAIAlert('user', currentUser.id, textScanResult.category as AIViolationCategory, textScanResult.confidence, currentUser.id, textScanResult.flaggedText, textScanResult.explanation);
          }
        }
        if (avatarFile) {
          const imageScanResult = await scanImage(avatarFile, utilityConnection);
          if (imageScanResult) {
              createAIAlert('image', profile.avatarUrl, imageScanResult.category as AIViolationCategory, imageScanResult.confidence, currentUser.id, undefined, imageScanResult.explanation);
          }
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
      setChatStats(prev => {
        const newStats = { ...prev };
        delete newStats[userId];
        return newStats;
      });
      setNarrativeStates(prev => {
        const newStates = { ...prev };
        delete newStates[userId];
        return newStates;
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
    const utilityConnection = getUtilityConnection();
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

    if (utilityConnection) {
        const textToScan = [character.name, character.description, character.personality, character.greeting, character.story, character.situation].join(' ');
        const textScanResult = await scanText(textToScan, utilityConnection);
        if (textScanResult) {
            createAIAlert('character', character.id, textScanResult.category as AIViolationCategory, textScanResult.confidence, character.creatorId, textScanResult.flaggedText, textScanResult.explanation);
        }
        if (avatarFile) {
            const imageScanResult = await scanImage(avatarFile, utilityConnection);
            if (imageScanResult) {
                createAIAlert('image', character.avatarUrl, imageScanResult.category as AIViolationCategory, imageScanResult.confidence, character.creatorId, undefined, imageScanResult.explanation);
            }
        }
    }

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
        return { ...prev, [currentUser.id]: userHistories };
      });
      setChatStats(prev => {
        const userStats = { ...(prev[currentUser.id] || {}) };
        delete userStats[characterId];
        return { ...prev, [currentUser.id]: userStats };
      });
      setNarrativeStates(prev => {
        const userStates = { ...(prev[currentUser.id] || {}) };
        delete userStates[characterId];
        return { ...prev, [currentUser.id]: userStates };
      });
    }
  }, [currentUser, setChatHistories, setChatStats, setNarrativeStates]);

  const deleteCharacter = (characterId: string) => {
    setCharacters(prev => prev.filter(c => c.id !== characterId));
    setChatHistories(prev => {
        const newHistories = { ...prev };
        Object.keys(newHistories).forEach(userId => {
            delete newHistories[userId][characterId];
        });
        return newHistories;
    });
     setChatStats(prev => {
        const newStats = { ...prev };
        Object.keys(newStats).forEach(userId => {
            delete newStats[userId][characterId];
        });
        return newStats;
    });
    setNarrativeStates(prev => {
        const newStates = { ...prev };
        Object.keys(newStates).forEach(userId => {
            delete newStates[userId][characterId];
        });
        return newStates;
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
      const utilityConnection = getUtilityConnection();
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

      if(utilityConnection) {
        const textScanResult = await scanText(commentText, utilityConnection);
        if (textScanResult) {
            createAIAlert('comment', newComment.id, textScanResult.category as AIViolationCategory, textScanResult.confidence, currentUser.id, textScanResult.flaggedText, textScanResult.explanation);
        }
      }

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
    const utilityConnection = getUtilityConnection();
    if (!currentUser) return;
    if (utilityConnection) {
        const textScanResult = await scanText(newText, utilityConnection);
        if (textScanResult) {
            createAIAlert('comment', commentId, textScanResult.category as AIViolationCategory, textScanResult.confidence, currentUser.id, textScanResult.flaggedText, textScanResult.explanation);
        }
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

  const updateChatStats = useCallback((characterId: string, stats: Record<string, number>) => {
    if (currentUser) {
      setChatStats(prev => ({
        ...prev,
        [currentUser.id]: {
          ...(prev[currentUser.id] || {}),
          [characterId]: stats,
        },
      }));
    }
  }, [currentUser, setChatStats]);
  
  const updateNarrativeState = useCallback((characterId: string, state: any) => {
    if (currentUser) {
      setNarrativeStates(prev => ({
        ...prev,
        [currentUser.id]: {
          ...(prev[currentUser.id] || {}),
          [characterId]: state,
        },
      }));
    }
  }, [currentUser, setNarrativeStates]);

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
  
  const addNoteToAIAlert = (alertId: string, note: string) => {
    if (!currentUser || !['Admin', 'Assistant Admin', 'Moderator'].includes(currentUser?.role || '') || !note.trim()) return;
    const noteWithAuthor = `${currentUser.profile.name} (${new Date().toLocaleString()}): ${note}`;
    setAIAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, notes: [...(a.notes || []), noteWithAuthor] } : a
    ));
  };

  const updateAIAlertFeedback = (alertId: string, feedback: 'good' | 'bad') => {
    if (!['Admin', 'Assistant Admin', 'Moderator'].includes(currentUser?.role || '')) return;
    setAIAlerts(prev => prev.map(a => 
        a.id === alertId ? { ...a, feedback: a.feedback === feedback ? undefined : feedback } : a
    ));
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
    const utilityConnection = getUtilityConnection();
    if (!content.text?.trim() && !content.imageFile) return;

    const senderId = isFromAdmin ? 'ADMIN' : (currentUser?.id || '');
    if (!senderId) return;

    let imageUrl: string | undefined = undefined;

    if (utilityConnection) {
        if (content.imageFile) {
            const imageScanResult = await scanImage(content.imageFile, utilityConnection);
            if (imageScanResult) {
                createAIAlert('image', `dm-image-${crypto.randomUUID()}`, imageScanResult.category as AIViolationCategory, imageScanResult.confidence, senderId, undefined, imageScanResult.explanation);
            }
        }
        if (content.text) {
            const textScanResult = await scanText(content.text, utilityConnection);
            if (textScanResult) {
                createAIAlert('message', `dm-text-${crypto.randomUUID()}`, textScanResult.category as AIViolationCategory, textScanResult.confidence, senderId, textScanResult.flaggedText, textScanResult.explanation);
            }
        }
    }

    if (content.imageFile) {
        try {
            const imageId = crypto.randomUUID();
            await saveImage(imageId, content.imageFile);
            imageUrl = imageId;
        } catch (error) {
            console.error("Failed to save DM image:", error);
            return;
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

    // Mark the corresponding user-facing notification as read
    if (currentUser && currentUser.id === userId) {
      const updatedUser = { ...currentUser };
      updatedUser.profile.notifications = updatedUser.profile.notifications.map(n => 
        (n.type === 'NEW_DM' && n.relatedId === userId && !n.isRead) ? { ...n, isRead: true } : n
      );
      updateUser(updatedUser);
    }
  };

  const markDMAsReadByAdmin = (userId: string) => {
      setDmConversations(prev => {
          const convo = prev[userId];
          if (convo && convo.hasUnreadByAdmin) {
              return { ...prev, [userId]: { ...convo, hasUnreadByAdmin: false } };
          }
          return prev;
      });

      // Mark the corresponding admin-facing notification as read
      if (currentUser && ['Admin', 'Assistant Admin', 'Moderator'].includes(currentUser.role)) {
          const updatedUser = { ...currentUser };
          updatedUser.profile.notifications = updatedUser.profile.notifications.map(n => 
              (n.type === 'NEW_DM' && n.relatedId === userId && !n.isRead) ? { ...n, isRead: true } : n
          );
          updateUser(updatedUser);
      }
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

    // Mark all admin-facing DM notifications as read
    if (currentUser && ['Admin', 'Assistant Admin', 'Moderator'].includes(currentUser.role)) {
        const updatedUser = { ...currentUser };
        updatedUser.profile.notifications = updatedUser.profile.notifications.map(n => 
            (n.type === 'NEW_DM' && !n.isRead) ? { ...n, isRead: true } : n
        );
        updateUser(updatedUser);
    }
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

  // --- FORUM FUNCTIONS ---
  const getPostsForThread = useCallback((threadId: string) => {
      return forumPosts.filter(p => p.threadId === threadId).sort((a,b) => a.createdAt - b.createdAt);
  }, [forumPosts]);

  const createThread = async (threadData: Omit<ForumThread, 'id' | 'createdAt' | 'viewCount' | 'isSilenced'>, initialPostContent: string): Promise<string> => {
    if (!currentUser) throw new Error("User not logged in");
    const utilityConnection = getUtilityConnection();
    const newThread: ForumThread = {
        ...threadData,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        viewCount: 0,
        isSilenced: false,
    };
    setForumThreads(prev => [newThread, ...prev]);

    const initialPost: ForumPost = {
        id: crypto.randomUUID(),
        threadId: newThread.id,
        authorId: currentUser.id,
        isCharacterPost: false,
        content: initialPostContent,
        createdAt: Date.now(),
        upvotes: [],
        downvotes: [],
        isEdited: false,
        isSilenced: false
    };
    setForumPosts(prev => [...prev, initialPost]);

    if (utilityConnection) {
        const contentToScan = `${threadData.title}\n\n${initialPostContent}`;
        const textScanResult = await scanText(contentToScan, utilityConnection);
        if (textScanResult) {
            createAIAlert('forumThread', newThread.id, textScanResult.category as AIViolationCategory, textScanResult.confidence, currentUser.id, textScanResult.flaggedText, textScanResult.explanation);
        }
    }

    return newThread.id;
  }

  const createPost = async (postData: Omit<ForumPost, 'id' | 'createdAt' | 'isEdited' | 'isSilenced'>) => {
    const utilityConnection = getUtilityConnection();
    const newPost: ForumPost = {
        ...postData,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        isEdited: false,
        isSilenced: false,
    };
    setForumPosts(prev => [...prev, newPost]);
    
    if (utilityConnection) {
        const textScanResult = await scanText(postData.content, utilityConnection);
        if (textScanResult) {
            createAIAlert('forumPost', newPost.id, textScanResult.category as AIViolationCategory, textScanResult.confidence, newPost.authorId, textScanResult.flaggedText, textScanResult.explanation);
        }
    }
  };

  const togglePostVote = (postId: string, voteType: 'up' | 'down') => {
      if (!currentUser) return;
      setForumPosts(prev => prev.map(post => {
          if (post.id === postId) {
              const newUpvotes = new Set(post.upvotes);
              const newDownvotes = new Set(post.downvotes);
              const userId = currentUser.id;

              if (voteType === 'up') {
                  if (newUpvotes.has(userId)) {
                      newUpvotes.delete(userId);
                  } else {
                      newUpvotes.add(userId);
                      newDownvotes.delete(userId);
                  }
              } else { // 'down'
                   if (newDownvotes.has(userId)) {
                      newDownvotes.delete(userId);
                  } else {
                      newDownvotes.add(userId);
                      newUpvotes.delete(userId);
                  }
              }
              return { ...post, upvotes: Array.from(newUpvotes), downvotes: Array.from(newDownvotes) };
          }
          return post;
      }));
  };

  const togglePinThread = (threadId: string) => {
      setForumThreads(prev => prev.map(t => t.id === threadId ? { ...t, isPinned: !t.isPinned } : t));
  };
  
  const toggleLockThread = (threadId: string) => {
      setForumThreads(prev => prev.map(t => t.id === threadId ? { ...t, isLocked: !t.isLocked } : t));
  };

  const deletePost = (postId: string) => {
      setForumPosts(prev => prev.filter(p => p.id !== postId));
  };

  const deleteThread = (threadId: string) => {
    setForumThreads(prev => prev.filter(t => t.id !== threadId));
    setForumPosts(prev => prev.filter(p => p.threadId !== threadId));
    // Optional: Clean up reports related to the thread or its posts
  };

  const editPost = async (postId: string, newContent: string) => {
      const postToEdit = forumPosts.find(p => p.id === postId);
      const utilityConnection = getUtilityConnection();
      if (postToEdit && utilityConnection) {
          const textScanResult = await scanText(newContent, utilityConnection);
          if (textScanResult) {
              createAIAlert('forumPost', postId, textScanResult.category as AIViolationCategory, textScanResult.confidence, postToEdit.authorId, textScanResult.flaggedText, textScanResult.explanation);
          }
      }
      setForumPosts(prev => prev.map(p => p.id === postId ? { ...p, content: newContent, isEdited: true } : p));
  };

  // --- NEW FORUM MOD FUNCTIONS ---
  const createCategory = (categoryData: Omit<ForumCategory, 'id'>) => {
    const newCategory: ForumCategory = { ...categoryData, id: crypto.randomUUID() };
    setForumCategories(prev => [...prev, newCategory]);
  };
  
  const updateCategory = (categoryId: string, categoryData: Omit<ForumCategory, 'id'>) => {
    setForumCategories(prev => prev.map(cat => cat.id === categoryId ? { ...categoryData, id: categoryId } : cat));
  };

  const deleteCategory = (categoryId: string) => {
    const categoryToDelete = forumCategories.find(c => c.id === categoryId);
    if (!categoryToDelete) return;

    // Find a fallback category (e.g., 'General Discussion' or the first one that is not a child of the deleted one)
    const fallbackCategory = forumCategories.find(c => c.name === 'General Discussion' && c.id !== categoryId) || forumCategories.find(c => c.id !== categoryId && c.parentId !== categoryId);
    
    if (fallbackCategory) {
        // Re-assign threads and sub-categories to the fallback
        setForumThreads(prev => prev.map(t => t.categoryId === categoryId ? { ...t, categoryId: fallbackCategory.id } : t));
        setForumCategories(prev => prev.map(c => c.parentId === categoryId ? { ...c, parentId: fallbackCategory.id } : c));
    } else {
        // If no fallback, just delete the threads in that category. Risky, but handles edge case.
        const threadsToDelete = forumThreads.filter(t => t.categoryId === categoryId).map(t => t.id);
        setForumThreads(prev => prev.filter(t => t.categoryId !== categoryId));
        setForumPosts(prev => prev.filter(p => !threadsToDelete.includes(p.threadId)));
    }
    
    setForumCategories(prev => prev.filter(c => c.id !== categoryId));
  };

  const silenceThread = (threadId: string, isSilenced: boolean) => {
    setForumThreads(prev => prev.map(t => t.id === threadId ? { ...t, isSilenced } : t));
  };

  const silencePost = (postId: string, isSilenced: boolean) => {
    setForumPosts(prev => prev.map(p => p.id === postId ? { ...p, isSilenced } : p));
  };

  const moveThread = (threadId: string, newCategoryId: string) => {
    setForumThreads(prev => prev.map(t => t.id === threadId ? { ...t, categoryId: newCategoryId } : t));
  };
  
  // --- API Management Functions ---
  const addApiConnection = (connection: Omit<ApiConnection, 'id'>) => {
      const newConnection = { ...connection, id: crypto.randomUUID() };
      setApiConnections(prev => [...prev, newConnection]);
  };
  
  const updateApiConnection = (connection: ApiConnection) => {
      setApiConnections(prev => prev.map(c => c.id === connection.id ? connection : c));
  };
  
  const deleteApiConnection = (connectionId: string) => {
      if (connectionId === defaultApiConnectionId) {
          alert("Cannot delete the default API connection.");
          return;
      }
      setApiConnections(prev => prev.filter(c => c.id !== connectionId));
  };

  const toggleApiConnectionActive = (connectionId: string) => {
    if (connectionId === defaultApiConnectionId) {
        alert("Cannot deactivate the default API connection.");
        return;
    }
    setApiConnections(prev => prev.map(c => 
        c.id === connectionId ? { ...c, isActive: !c.isActive } : c
    ));
  };

  const setDefaultApiConnection = (connectionId: string) => {
    const connectionToSet = apiConnections.find(c => c.id === connectionId);
    if (connectionToSet && connectionToSet.isActive) {
        _setDefaultApiConnectionId(connectionId);
    } else {
        alert("Cannot set an inactive connection as the default.");
    }
  };

  const value = {
    currentUser, allUsers, login, signup, loginWithGoogle, logout, updateUserProfile,
    updateAnyUserProfile, updateUserType, deleteUser, silenceUser, toggleFavorite, characters,
    saveCharacter, deleteCharacter, silenceCharacter, likeCharacter, addComment, editComment, deleteComment, followUser,
    findUserById, markNotificationsAsRead, markSingleNotificationAsRead, markCategoryAsRead,
    markAdminNotificationsAsRead,
    chatHistories, updateChatHistory, deleteChatHistory, chatSettings, updateChatSettings, chatStats, updateChatStats,
    narrativeStates, updateNarrativeState,
    globalSettings, updateGlobalSettings, aiContextSettings, updateAIContextSettings,
    reports, resolveReport, aiAlerts, updateAIAlertStatus, tickets, updateTicketStatus,
    dmConversations, submitReport, submitTicket, sendDirectMessage, markDMAsReadByUser,
    markDMAsReadByAdmin, addNoteToReport, silenceComment, updateUserRole,
    markAllDMsAsReadByAdmin,
    ticketFolders, createTicketFolder, moveTicketToFolder,
    dmFolders, createDMFolder, moveDMConversationToFolder,
    aiAlertFolders, createAIAlertFolder, moveAIAlertToFolder,
    addNoteToAIAlert, updateAIAlertFeedback,
    // Forum values
    forumCategories, forumThreads, getPostsForThread, createThread, createPost, togglePostVote,
    togglePinThread, toggleLockThread, deletePost, editPost, deleteThread,
    // Forum Mod Functions
    createCategory, updateCategory, deleteCategory, silenceThread, silencePost, moveThread,
    // API Management
    apiConnections, defaultApiConnectionId, addApiConnection, updateApiConnection, deleteApiConnection, setDefaultApiConnection, toggleApiConnectionActive, findConnectionForModel,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};