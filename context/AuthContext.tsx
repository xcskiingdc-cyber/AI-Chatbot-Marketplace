
import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../supabase/client';
import { 
    User, Character, ChatMessage, ChatSettings, UserProfile, 
    GlobalSettings, AIContextSettings, ApiConnection, 
    Report, Ticket, AIAlert, Notification, DMConversation, 
    DirectMessage, Comment, ForumCategory, ForumThread, 
    ForumPost, AppView, AIToolSettings, CharacterStat, AITool
} from '../types';
import { fileToBase64 } from '../utils/imageUtils';

export interface AuthContextType {
    currentUser: User | null;
    allUsers: User[];
    characters: Character[];
    chatHistories: Record<string, Record<string, ChatMessage[]>>;
    chatSettings: Record<string, Record<string, ChatSettings>>;
    chatStats: Record<string, Record<string, Record<string, number>>>;
    narrativeStates: Record<string, Record<string, any>>;
    globalSettings: GlobalSettings;
    aiContextSettings: AIContextSettings;
    aiToolSettings: AIToolSettings;
    apiConnections: ApiConnection[];
    defaultApiConnectionId: string | null;
    
    forumCategories: ForumCategory[];
    forumThreads: ForumThread[];
    getPostsForThread: (threadId: string) => ForumPost[]; 

    reports: Report[];
    tickets: Ticket[];
    ticketFolders: any[];
    aiAlerts: AIAlert[];
    aiAlertFolders: any[];
    dmConversations: Record<string, DMConversation>;
    dmFolders: any[];

    loading: boolean;
    
    login: (email?: string, password?: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    signup: (username: string, password: string, email: string) => Promise<void>;
    logout: () => Promise<void>;
    
    saveCharacter: (character: Character, avatarFile: File | null) => Promise<void>;
    deleteCharacter: (characterId: string) => Promise<void>;
    silenceCharacter: (characterId: string, isSilenced: boolean) => Promise<void>;
    updateChatHistory: (characterId: string, messages: ChatMessage[]) => void;
    deleteChatHistory: (characterId: string) => void;
    updateChatSettings: (characterId: string, settings: ChatSettings) => void;
    updateChatStats: (characterId: string, stats: Record<string, number>) => void;
    updateNarrativeState: (characterId: string, state: any) => void;
    
    updateUserProfile: (profile: UserProfile, avatarFile: File | null) => Promise<void>;
    updateAnyUserProfile: (userId: string, profile: UserProfile) => Promise<void>;
    updateUserType: (userId: string, type: User['userType']) => Promise<void>;
    updateUserRole: (userId: string, role: User['role']) => Promise<void>;
    silenceUser: (userId: string, isSilenced: boolean) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
    
    toggleFavorite: (characterId: string) => void;
    likeCharacter: (characterId: string) => void;
    addComment: (characterId: string, text: string, parentId?: string) => Promise<void>;
    deleteComment: (characterId: string, commentId: string) => Promise<void>;
    silenceComment: (characterId: string, commentId: string, isSilenced: boolean) => Promise<void>;
    editComment: (characterId: string, commentId: string, newText: string) => Promise<void>;
    
    followUser: (userId: string) => void;
    
    createCategory: (category: Omit<ForumCategory, 'id'>) => Promise<void>;
    updateCategory: (categoryId: string, data: Partial<ForumCategory>) => Promise<void>;
    deleteCategory: (categoryId: string) => Promise<void>;
    createThread: (thread: Omit<ForumThread, 'id'|'createdAt'|'viewCount'|'isSilenced'>, initialPostContent: string) => Promise<string>;
    deleteThread: (threadId: string) => Promise<void>;
    togglePinThread: (threadId: string) => Promise<void>;
    toggleLockThread: (threadId: string) => Promise<void>;
    silenceThread: (threadId: string, isSilenced: boolean) => Promise<void>;
    moveThread: (threadId: string, newCategoryId: string) => Promise<void>;
    createPost: (post: Omit<ForumPost, 'id'|'createdAt'|'isEdited'|'isSilenced'>) => Promise<void>;
    editPost: (postId: string, content: string) => Promise<void>;
    deletePost: (postId: string) => Promise<void>;
    silencePost: (postId: string, isSilenced: boolean) => Promise<void>;
    togglePostVote: (postId: string, type: 'up' | 'down') => Promise<void>;

    updateGlobalSettings: (settings: GlobalSettings) => Promise<void>;
    updateAIContextSettings: (settings: AIContextSettings) => Promise<void>;
    updateAIToolSettings: (settings: AIToolSettings) => Promise<void>;
    addApiConnection: (connection: Omit<ApiConnection, 'id'>) => Promise<void>;
    updateApiConnection: (connection: ApiConnection) => Promise<void>;
    deleteApiConnection: (id: string) => Promise<void>;
    toggleApiConnectionActive: (id: string) => Promise<void>;
    setDefaultApiConnection: (id: string) => Promise<void>;
    
    siteLogo: string | null;
    updateSiteLogo: (file: File) => Promise<void>;
    resetSiteLogo: () => Promise<void>;

    submitReport: (report: Omit<Report, 'id' | 'reporterId' | 'timestamp' | 'isResolved' | 'notes'>) => Promise<void>;
    resolveReport: (reportId: string, isResolved: boolean) => Promise<void>;
    addNoteToReport: (reportId: string, note: string) => Promise<void>;
    
    submitTicket: (ticket: Omit<Ticket, 'id' | 'submitterId' | 'status' | 'timestamp'>) => Promise<void>;
    updateTicketStatus: (ticketId: string, status: any) => Promise<void>;
    createTicketFolder: (name: string) => Promise<void>;
    moveTicketToFolder: (ticketId: string, folderId: string | null) => Promise<void>;

    updateAIAlertStatus: (alertId: string, status: any) => Promise<void>;
    createAIAlertFolder: (name: string) => Promise<void>;
    moveAIAlertToFolder: (alertId: string, folderId: string | null) => Promise<void>;
    addNoteToAIAlert: (alertId: string, note: string) => Promise<void>;
    updateAIAlertFeedback: (alertId: string, feedback: 'good' | 'bad') => Promise<void>;

    sendDirectMessage: (userId: string, content: { text?: string, imageFile?: File | null }, isFromAdmin: boolean, folderId?: string | null) => Promise<void>;
    markDMAsReadByUser: (userId: string) => Promise<void>;
    markDMAsReadByAdmin: (userId: string) => Promise<void>;
    markAllDMsAsReadByAdmin: () => Promise<void>;
    createDMFolder: (name: string) => Promise<void>;
    moveDMConversationToFolder: (userId: string, folderId: string | null) => Promise<void>;

    markNotificationsAsRead: () => Promise<void>;
    markSingleNotificationAsRead: (notificationId: string) => Promise<void>;
    markCategoryAsRead: (category: string) => Promise<void>;
    markAdminNotificationsAsRead: (types: Notification['type'][]) => Promise<void>;

    findUserById: (userId: string) => User | null;
    findConnectionForModel: (modelName: string) => ApiConnection | undefined;
    findConnectionForTool: (tool: AITool) => ApiConnection | undefined;
    
    refreshAdminData: () => Promise<void>;
}

// Data Mapping Helpers
const mapDbUser = (u: any): User => ({
    id: u.id,
    username: u.username || '',
    userType: u.user_type || 'Free',
    role: u.role || 'User',
    isSilenced: u.is_silenced ?? false,
    profile: typeof u.profile === 'string' ? JSON.parse(u.profile) : (u.profile || {}),
});

const mapDbCharacter = (c: any): Character => ({
    id: c.id,
    creatorId: c.creator_id,
    name: c.name || '',
    avatarUrl: c.avatar_url || '',
    gender: c.gender || 'unspecified',
    description: c.description || '',
    personality: c.personality || '',
    story: c.story || '',
    situation: c.situation || '',
    feeling: c.feeling || '',
    appearance: c.appearance || '',
    isBeyondTheHaven: c.is_beyond_the_haven ?? false,
    model: c.model || '',
    greeting: c.greeting || '',
    isPublic: c.is_public ?? false,
    isSilencedByAdmin: c.is_silenced_by_admin ?? false,
    categories: c.categories || [],
    likes: c.likes || [],
    comments: [], // Populated later
    stats: typeof c.stats === 'string' ? JSON.parse(c.stats) : (c.stats || []),
    statsVisible: c.stats_visible ?? true,
    summary: typeof c.summary === 'string' ? JSON.parse(c.summary) : (c.summary || {}),
});

const mapDbConnection = (c: any): ApiConnection => ({
    id: c.id,
    name: c.name,
    provider: c.provider,
    apiKey: c.api_key || '',
    baseUrl: c.base_url || '',
    models: c.models || [],
    isActive: c.is_active ?? true
});

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children?: ReactNode }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [chatHistories, setChatHistories] = useState<Record<string, Record<string, ChatMessage[]>>>({});
    const [chatSettings, setChatSettings] = useState<Record<string, Record<string, ChatSettings>>>({});
    const [chatStats, setChatStats] = useState<Record<string, Record<string, Record<string, number>>>>({});
    const [narrativeStates, setNarrativeStates] = useState<Record<string, Record<string, any>>>({});
    
    const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({ havenPrompt: '', beyondTheHavenPrompt: '', kidModePrompt: '', enableAIModeration: true });
    const [aiContextSettings, setAiContextSettings] = useState<AIContextSettings>({ includedFields: ['personality'], historyLength: 20, maxResponseTokens: 200 });
    const [aiToolSettings, setAiToolSettings] = useState<AIToolSettings>({ toolConnections: { imageGeneration: null, characterSummarization: null, narrativeSummarization: null, textToSpeech: null, textModeration: null, imageModeration: null } });
    const [apiConnections, setApiConnections] = useState<ApiConnection[]>([]);
    const [defaultApiConnectionId, setDefaultApiConnectionId] = useState<string | null>(null);

    const [forumCategories, setForumCategories] = useState<ForumCategory[]>([]);
    const [forumThreads, setForumThreads] = useState<ForumThread[]>([]);
    const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);

    const [reports, setReports] = useState<Report[]>([]);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [aiAlerts, setAiAlerts] = useState<AIAlert[]>([]);
    const [dmConversations, setDmConversations] = useState<Record<string, DMConversation>>({});
    
    const [ticketFolders, setTicketFolders] = useState<any[]>([]);
    const [aiAlertFolders, setAiAlertFolders] = useState<any[]>([]);
    const [dmFolders, setDmFolders] = useState<any[]>([]);
    
    const [siteLogo, setSiteLogo] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // --- Data Refreshing ---

    const refreshAdminData = useCallback(async () => {
        try {
            // Reports (snake_case)
            const { data: reportData } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
            if (reportData) {
                setReports(reportData.map((r: any) => ({
                    id: r.id,
                    reporterId: r.reporter_id,
                    entityType: r.entity_type,
                    entityId: r.entity_id,
                    reason: r.reason,
                    description: r.description,
                    timestamp: new Date(r.created_at).getTime(),
                    isResolved: r.is_resolved,
                    notes: r.notes,
                    contentSnapshot: r.content_snapshot,
                    entityCreatorId: r.entity_creator_id
                })));
            }

            // Tickets (snake_case)
            const { data: ticketData } = await supabase.from('tickets').select('*').order('created_at', { ascending: false });
            if (ticketData) {
                setTickets(ticketData.map((t: any) => ({
                    id: t.id,
                    submitterId: t.submitter_id,
                    subject: t.subject,
                    description: t.description,
                    email: t.email,
                    status: t.status,
                    timestamp: new Date(t.created_at).getTime(),
                    folderId: t.folder_id
                })));
            }

            // Alerts (snake_case)
            const { data: alertData } = await supabase.from('ai_alerts').select('*').order('created_at', { ascending: false });
            if (alertData) {
                setAiAlerts(alertData.map((a: any) => ({
                    id: a.id,
                    entityType: a.entity_type,
                    entityId: a.entity_id,
                    category: a.category,
                    confidence: a.confidence,
                    explanation: a.explanation,
                    flaggedText: a.flagged_text,
                    timestamp: new Date(a.created_at).getTime(),
                    status: a.status,
                    folderId: a.folder_id,
                    entityCreatorId: a.entity_creator_id,
                    notes: a.notes,
                    feedback: a.feedback
                })));
            }

            // Folders
            const { data: folderData } = await supabase.from('admin_folders').select('*');
            if (folderData) {
                setTicketFolders(folderData.filter((f: any) => f.type === 'ticket'));
                setAiAlertFolders(folderData.filter((f: any) => f.type === 'ai_alert'));
                setDmFolders(folderData.filter((f: any) => f.type === 'dm'));
            }
            
            // Admin DMs (snake_case)
            const { data: dmData } = await supabase.from('direct_messages').select('*');
            if (dmData) {
                const allDms: DirectMessage[] = dmData.map((dm: any) => ({
                        id: dm.id,
                        senderId: dm.sender_id,
                        text: dm.text,
                        imageUrl: dm.image_url,
                        timestamp: dm.timestamp
                }));
                
                const { data: convoData } = await supabase.from('dm_conversations').select('*');
                const convos: Record<string, DMConversation> = {};
                if (convoData) {
                    convoData.forEach((c: any) => {
                        const userMsgs = allDms.filter((m: any) => {
                                const msgRaw = dmData.find((d: any) => d.id === m.id);
                                return msgRaw.conversation_user_id === c.user_id;
                        }).sort((a, b) => a.timestamp - b.timestamp);

                        convos[c.user_id] = {
                            userId: c.user_id,
                            messages: userMsgs,
                            hasUnreadByUser: c.has_unread_by_user,
                            hasUnreadByAdmin: c.has_unread_by_admin,
                            folderId: c.folder_id
                        };
                    });
                    setDmConversations(convos);
                }
            }
        } catch (err) {
            console.error("Unexpected error refreshing admin data:", err);
        }
    }, []);

    // --- Initialization ---

    const fetchInitialData = async () => {
        try {
            // Users (snake_case)
            const { data: userData } = await supabase.from('profiles').select('*');
            if (userData) setAllUsers(userData.map(mapDbUser));
            
            // Comments (snake_case keys)
            let commentsByChar: Record<string, Comment[]> = {};
            const { data: commentsData } = await supabase
                .from('comments')
                .select('*, profiles (username, profile)');
            
            if (commentsData) {
                commentsData.forEach((c: any) => {
                    let userProfile: any = {};
                    try {
                        userProfile = c.profiles?.profile ? (typeof c.profiles.profile === 'string' ? JSON.parse(c.profiles.profile) : c.profiles.profile) : {};
                    } catch (e) { }

                    const comment: Comment = {
                        id: c.id,
                        userId: c.user_id,
                        username: c.profiles?.username || 'Unknown',
                        avatarUrl: userProfile.avatarUrl || '',
                        text: c.text,
                        timestamp: c.created_at,
                        parentId: c.parent_id,
                        isSilenced: c.is_silenced
                    };
                    
                    if (!commentsByChar[c.character_id]) {
                        commentsByChar[c.character_id] = [];
                    }
                    commentsByChar[c.character_id].push(comment);
                });
            }

            // Characters (snake_case)
            const { data: charData } = await supabase.from('characters').select('*');
            if (charData) {
                const mappedChars = charData.map(c => {
                    const char = mapDbCharacter(c);
                    char.comments = commentsByChar[char.id] || [];
                    return char;
                });
                setCharacters(mappedChars);
            }

            // API Connections (snake_case)
            let connections: ApiConnection[] = [];
            const defaultConnId = 'google-ai-studio-default-connection';
            const envApiKey = process.env.API_KEY || '';
            
            const { data: apiData } = await supabase.from('api_connections').select('*');
            connections = apiData ? apiData.map(mapDbConnection) : [];

            const defaultConnection: ApiConnection = {
                id: defaultConnId,
                name: 'Gemini Default',
                provider: 'Gemini',
                apiKey: envApiKey,
                baseUrl: '',
                models: [
                    'gemini-2.5-flash', 
                    'gemini-2.5-flash-image', 
                    'gemini-2.5-flash-preview-tts', 
                    'gemini-3-pro-preview', 
                    'gemini-3-pro-image-preview',
                    'gemini-2.5-flash-native-audio-preview-09-2025',
                    'gemini-flash-latest',
                    'gemini-flash-lite-latest',
                    'veo-3.1-fast-generate-preview',
                    'veo-3.1-generate-preview'
                ],
                isActive: true
            };

            if (!connections.find(c => c.id === defaultConnId)) {
                connections.push(defaultConnection);
            }
            setApiConnections(connections);
            setDefaultApiConnectionId(defaultConnId);

            // Settings
            const { data: settingsData } = await supabase.from('app_settings').select('*');
            if (settingsData) {
                settingsData.forEach((item: any) => {
                    if (item.key === 'global_settings') setGlobalSettings(item.value);
                    if (item.key === 'ai_context_settings') setAiContextSettings(item.value);
                    if (item.key === 'ai_tool_settings') setAiToolSettings(item.value);
                    if (item.key === 'site_logo') setSiteLogo(item.value);
                });
            }

            // Forum Data (snake_case)
            const { data: cats } = await supabase.from('forum_categories').select('*');
            if (cats) setForumCategories(cats.map((c: any) => ({ id: c.id, name: c.name, description: c.description, parentId: c.parent_id, isLocked: c.is_locked })));

            const { data: threads } = await supabase.from('forum_threads').select('*');
            if (threads) {
                setForumThreads(threads.map((t: any) => ({
                    id: t.id,
                    categoryId: t.category_id,
                    authorId: t.author_id,
                    title: t.title,
                    createdAt: new Date(t.created_at).getTime(),
                    isLocked: t.is_locked,
                    isPinned: t.is_pinned,
                    isSilenced: t.is_silenced,
                    viewCount: t.view_count,
                    tags: t.tags
                })));
            }

            const { data: posts } = await supabase.from('forum_posts').select('*');
            if (posts) {
                setForumPosts(posts.map((p: any) => ({
                    id: p.id,
                    threadId: p.thread_id,
                    authorId: p.author_id,
                    isCharacterPost: p.is_character_post,
                    content: p.content,
                    createdAt: new Date(p.created_at).getTime(),
                    isEdited: p.is_edited,
                    isSilenced: p.is_silenced,
                    upvotes: p.upvotes || [],
                    downvotes: p.downvotes || []
                })));
            }

        } catch (e) { 
            console.error("Failed to fetch initial data", e); 
        }
    };

    const fetchCurrentUserData = async (userId: string) => {
        try {
            // Chat History (snake_case)
            const { data: histories } = await supabase.from('chat_histories').select('*').eq('user_id', userId);
            const historyMap: Record<string, ChatMessage[]> = {};
            if (histories) {
                histories.forEach((h: any) => {
                    historyMap[h.character_id] = typeof h.messages === 'string' ? JSON.parse(h.messages) : h.messages;
                });
                setChatHistories(prev => ({ ...prev, [userId]: historyMap }));
            }

            // User Settings & Stats (snake_case)
            const { data: charData } = await supabase.from('user_character_data').select('*').eq('user_id', userId);
            const settingsMap: Record<string, ChatSettings> = {};
            const statsMap: Record<string, Record<string, number>> = {};
            const narrativeMap: Record<string, any> = {};
            
            if (charData) {
                charData.forEach((d: any) => {
                    if (d.settings) settingsMap[d.character_id] = d.settings;
                    if (d.stats) statsMap[d.character_id] = d.stats;
                    if (d.narrative_state) narrativeMap[d.character_id] = d.narrative_state;
                });
                setChatSettings(prev => ({ ...prev, [userId]: settingsMap }));
                setChatStats(prev => ({ ...prev, [userId]: statsMap }));
                setNarrativeStates(prev => ({ ...prev, [userId]: narrativeMap }));
            }

            // Notifications (snake_case)
            const { data: notifs } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
            const userNotifs = notifs ? notifs.map((n: any) => ({
                id: n.id,
                type: n.type,
                message: n.message,
                relatedId: n.related_id,
                timestamp: new Date(n.created_at).getTime(),
                isRead: n.is_read,
                fromUserId: n.from_user_id
            })) : [];

            // Likes (snake_case)
            const { data: likes } = await supabase.from('character_likes').select('character_id').eq('user_id', userId);
            const favoriteIds = likes ? likes.map((l: any) => l.character_id) : [];

            const { data: userData } = await supabase.from('profiles').select('*').eq('id', userId).single();
            if (userData) {
                const user = mapDbUser(userData);
                user.profile.notifications = userNotifs;
                user.profile.favoriteCharacterIds = favoriteIds;
                setCurrentUser(user);
            }

        } catch (e) { console.error("Failed to fetch current user data", e); }
    };

    useEffect(() => {
        const init = async () => {
            await fetchInitialData();
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                await fetchCurrentUserData(session.user.id);
                refreshAdminData();
            }
            setLoading(false);
        };
        init();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                fetchCurrentUserData(session.user.id);
            } else {
                setCurrentUser(null);
            }
        });

        // Realtime Subscriptions
        const channel = supabase.channel('db_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'characters' }, () => fetchInitialData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => fetchInitialData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchInitialData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_posts' }, () => fetchInitialData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_threads' }, () => fetchInitialData())
            .subscribe();

        return () => {
            subscription.unsubscribe();
            supabase.removeChannel(channel);
        };
    }, []);

    // --- Actions ---

    const saveCharacter = async (character: Character, avatarFile: File | null) => {
        let avatarUrl = character.avatarUrl;
        if (avatarFile) {
            // In a real app, upload to storage. Here we use base64 for demo simplicity/compatibility.
            avatarUrl = await fileToBase64(avatarFile); 
        }

        const dbChar = {
            id: character.id,
            creator_id: character.creatorId,
            name: character.name,
            avatar_url: avatarUrl,
            gender: character.gender,
            description: character.description,
            personality: character.personality,
            story: character.story,
            situation: character.situation,
            feeling: character.feeling,
            appearance: character.appearance,
            is_beyond_the_haven: character.isBeyondTheHaven,
            model: character.model,
            greeting: character.greeting,
            is_public: character.isPublic,
            is_silenced_by_admin: character.isSilencedByAdmin,
            categories: character.categories,
            likes: character.likes,
            stats: JSON.stringify(character.stats),
            stats_visible: character.statsVisible,
            summary: JSON.stringify(character.summary || {}),
            created_at: new Date().toISOString()
        };

        const { error } = await supabase.from('characters').upsert(dbChar);
        if (error) throw error;
        fetchInitialData();
    };

    const deleteCharacter = async (characterId: string) => {
        await supabase.from('characters').delete().eq('id', characterId);
        fetchInitialData();
    };

    const silenceCharacter = async (characterId: string, isSilenced: boolean) => {
        await supabase.from('characters').update({ is_silenced_by_admin: isSilenced }).eq('id', characterId);
    };

    const updateChatHistory = async (characterId: string, messages: ChatMessage[]) => {
        if (!currentUser) return;
        setChatHistories(prev => ({
            ...prev,
            [currentUser.id]: {
                ...(prev[currentUser.id] || {}),
                [characterId]: messages
            }
        }));
        
        await supabase.from('chat_histories').upsert({
            user_id: currentUser.id,
            character_id: characterId,
            messages: JSON.stringify(messages),
            updated_at: new Date().toISOString()
        });
    };

    const deleteChatHistory = async (characterId: string) => {
        if (!currentUser) return;
        await supabase.from('chat_histories').delete().eq('user_id', currentUser.id).eq('character_id', characterId);
        fetchCurrentUserData(currentUser.id);
    };

    const updateChatSettings = async (characterId: string, settings: ChatSettings) => {
        if (!currentUser) return;
        await supabase.from('user_character_data').upsert({
            user_id: currentUser.id,
            character_id: characterId,
            settings: settings
        }, { onConflict: 'user_id, character_id' });
        fetchCurrentUserData(currentUser.id);
    };

    const updateChatStats = async (characterId: string, stats: Record<string, number>) => {
        if (!currentUser) return;
        // Need to merge with existing row if it exists to not wipe settings
        const { data: existing } = await supabase.from('user_character_data').select('*').eq('user_id', currentUser.id).eq('character_id', characterId).single();
        
        await supabase.from('user_character_data').upsert({
            user_id: currentUser.id,
            character_id: characterId,
            stats: stats,
            settings: existing?.settings || {},
            narrative_state: existing?.narrative_state || {}
        }, { onConflict: 'user_id, character_id' });
    };

    const updateNarrativeState = async (characterId: string, state: any) => {
        if (!currentUser) return;
        const { data: existing } = await supabase.from('user_character_data').select('*').eq('user_id', currentUser.id).eq('character_id', characterId).single();
        
        await supabase.from('user_character_data').upsert({
            user_id: currentUser.id,
            character_id: characterId,
            narrative_state: state,
            settings: existing?.settings || {},
            stats: existing?.stats || {}
        }, { onConflict: 'user_id, character_id' });
    };

    // User Profile Updates
    const updateUserProfile = async (profile: UserProfile, avatarFile: File | null) => {
        if (!currentUser) return;
        let avatarUrl = profile.avatarUrl;
        if (avatarFile) {
            avatarUrl = await fileToBase64(avatarFile);
        }
        const updatedProfile = { ...profile, avatarUrl };
        await supabase.from('profiles').update({ profile: updatedProfile, username: profile.name }).eq('id', currentUser.id);
        fetchCurrentUserData(currentUser.id);
    };

    const updateAnyUserProfile = async (userId: string, profile: UserProfile) => {
        await supabase.from('profiles').update({ profile: profile, username: profile.name }).eq('id', userId);
        fetchInitialData();
    };

    const updateUserType = async (userId: string, type: User['userType']) => {
        await supabase.from('profiles').update({ user_type: type }).eq('id', userId);
        fetchInitialData();
    };

    const updateUserRole = async (userId: string, role: User['role']) => {
        await supabase.from('profiles').update({ role: role }).eq('id', userId);
        fetchInitialData();
    };

    const silenceUser = async (userId: string, isSilenced: boolean) => {
        await supabase.from('profiles').update({ is_silenced: isSilenced }).eq('id', userId);
        fetchInitialData();
    };

    const deleteUser = async (userId: string) => {
        // In Supabase, deleting auth user is separate, typically handled via admin API. 
        // Here we just delete the profile row which cascades.
        await supabase.from('profiles').delete().eq('id', userId);
        fetchInitialData();
    };

    // Interactions
    const toggleFavorite = async (characterId: string) => {
        if (!currentUser) return;
        const isFav = currentUser.profile.favoriteCharacterIds.includes(characterId);
        if (isFav) {
            // Remove favorite logic would be deleting from a favorites table if it existed, or array update
            // Assuming array on profile for now or a join table. The schema has character_likes but profile has favoriteCharacterIds
            // Let's sync them.
            await supabase.from('character_likes').delete().eq('user_id', currentUser.id).eq('character_id', characterId);
        } else {
            await supabase.from('character_likes').insert({ user_id: currentUser.id, character_id: characterId });
        }
        fetchCurrentUserData(currentUser.id);
    };

    const likeCharacter = async (characterId: string) => {
        if (!currentUser) return;
        const character = characters.find(c => c.id === characterId);
        if (character && !character.likes.includes(currentUser.id)) {
            const newLikes = [...character.likes, currentUser.id];
            await supabase.from('characters').update({ likes: newLikes }).eq('id', characterId);
            
            // Notify creator
            if (character.creatorId !== currentUser.id) {
                await supabase.from('notifications').insert({
                    user_id: character.creatorId,
                    type: 'NEW_LIKE',
                    message: `${currentUser.profile.name} liked your character ${character.name}`,
                    related_id: character.id,
                    from_user_id: currentUser.id,
                    is_read: false
                });
            }
        }
    };

    const addComment = async (characterId: string, text: string, parentId?: string) => {
        if (!currentUser) return;
        await supabase.from('comments').insert({
            character_id: characterId,
            user_id: currentUser.id,
            text: text,
            parent_id: parentId || null,
            created_at: Date.now(),
            is_silenced: false
        });
        
        const character = characters.find(c => c.id === characterId);
        if (character && character.creatorId !== currentUser.id) {
             await supabase.from('notifications').insert({
                user_id: character.creatorId,
                type: parentId ? 'REPLY' : 'NEW_COMMENT',
                message: parentId ? `${currentUser.profile.name} replied to a comment on ${character.name}` : `${currentUser.profile.name} commented on ${character.name}`,
                related_id: character.id,
                from_user_id: currentUser.id,
                is_read: false
            });
        }
        fetchInitialData();
    };

    const deleteComment = async (characterId: string, commentId: string) => {
        await supabase.from('comments').delete().eq('id', commentId);
        fetchInitialData();
    };

    const silenceComment = async (characterId: string, commentId: string, isSilenced: boolean) => {
        await supabase.from('comments').update({ is_silenced: isSilenced }).eq('id', commentId);
        fetchInitialData();
    };

    const editComment = async (characterId: string, commentId: string, newText: string) => {
        await supabase.from('comments').update({ text: newText }).eq('id', commentId);
        fetchInitialData();
    };

    const followUser = async (userId: string) => {
        if (!currentUser) return;
        const isFollowing = currentUser.profile.following.includes(userId);
        let newFollowing = [...currentUser.profile.following];
        
        if (isFollowing) {
            newFollowing = newFollowing.filter(id => id !== userId);
        } else {
            newFollowing.push(userId);
            await supabase.from('notifications').insert({
                user_id: userId,
                type: 'NEW_FOLLOWER',
                message: `${currentUser.profile.name} started following you`,
                related_id: currentUser.id,
                from_user_id: currentUser.id,
                is_read: false
            });
        }
        
        const updatedProfile = { ...currentUser.profile, following: newFollowing };
        await supabase.from('profiles').update({ profile: updatedProfile }).eq('id', currentUser.id);
        fetchCurrentUserData(currentUser.id);
    };

    // --- Forum Actions (snake_case) ---

    const createCategory = async (category: Omit<ForumCategory, 'id'>) => {
        await supabase.from('forum_categories').insert({
            name: category.name,
            description: category.description,
            parent_id: category.parentId,
            is_locked: category.isLocked
        });
        fetchInitialData();
    };

    const updateCategory = async (categoryId: string, data: Partial<ForumCategory>) => {
        const updateData: any = {};
        if (data.name) updateData.name = data.name;
        if (data.description) updateData.description = data.description;
        if (data.parentId !== undefined) updateData.parent_id = data.parentId;
        if (data.isLocked !== undefined) updateData.is_locked = data.isLocked;
        await supabase.from('forum_categories').update(updateData).eq('id', categoryId);
        fetchInitialData();
    };

    const deleteCategory = async (categoryId: string) => {
        await supabase.from('forum_categories').delete().eq('id', categoryId);
        fetchInitialData();
    };

    const createThread = async (thread: Omit<ForumThread, 'id'|'createdAt'|'viewCount'|'isSilenced'>, initialPostContent: string) => {
        const { data, error } = await supabase.from('forum_threads').insert({
            category_id: thread.categoryId,
            author_id: thread.authorId,
            title: thread.title,
            is_locked: false,
            is_pinned: false,
            is_silenced: false,
            view_count: 0,
            tags: thread.tags
        }).select().single();
        
        if (data) {
            await createPost({
                threadId: data.id,
                authorId: thread.authorId,
                isCharacterPost: false,
                content: initialPostContent,
                upvotes: [],
                downvotes: []
            });
            return data.id;
        }
        throw error;
    };

    const deleteThread = async (threadId: string) => {
        await supabase.from('forum_threads').delete().eq('id', threadId);
        fetchInitialData();
    };

    const togglePinThread = async (threadId: string) => {
        const thread = forumThreads.find(t => t.id === threadId);
        if (thread) {
            await supabase.from('forum_threads').update({ is_pinned: !thread.isPinned }).eq('id', threadId);
            fetchInitialData();
        }
    };

    const toggleLockThread = async (threadId: string) => {
        const thread = forumThreads.find(t => t.id === threadId);
        if (thread) {
            await supabase.from('forum_threads').update({ is_locked: !thread.isLocked }).eq('id', threadId);
            fetchInitialData();
        }
    };

    const silenceThread = async (threadId: string, isSilenced: boolean) => {
        await supabase.from('forum_threads').update({ is_silenced: isSilenced }).eq('id', threadId);
        fetchInitialData();
    };

    const moveThread = async (threadId: string, newCategoryId: string) => {
        await supabase.from('forum_threads').update({ category_id: newCategoryId }).eq('id', threadId);
        fetchInitialData();
    };

    const createPost = async (post: Omit<ForumPost, 'id'|'createdAt'|'isEdited'|'isSilenced'>) => {
        await supabase.from('forum_posts').insert({
            thread_id: post.threadId,
            author_id: post.authorId,
            is_character_post: post.isCharacterPost,
            content: post.content,
            is_edited: false,
            is_silenced: false,
            upvotes: [],
            downvotes: []
        });
        
        // Notify thread author if reply
        const thread = forumThreads.find(t => t.id === post.threadId);
        if (thread && thread.authorId !== post.authorId) {
             await supabase.from('notifications').insert({
                user_id: thread.authorId,
                type: 'REPLY',
                message: `New reply in your thread "${thread.title}"`,
                related_id: thread.id,
                from_user_id: post.authorId,
                is_read: false
            });
        }
        fetchInitialData();
    };

    const editPost = async (postId: string, content: string) => {
        await supabase.from('forum_posts').update({ content: content, is_edited: true }).eq('id', postId);
        fetchInitialData();
    };

    const deletePost = async (postId: string) => {
        await supabase.from('forum_posts').delete().eq('id', postId);
        fetchInitialData();
    };

    const silencePost = async (postId: string, isSilenced: boolean) => {
        await supabase.from('forum_posts').update({ is_silenced: isSilenced }).eq('id', postId);
        fetchInitialData();
    };

    const togglePostVote = async (postId: string, type: 'up' | 'down') => {
        if (!currentUser) return;
        const post = forumPosts.find(p => p.id === postId);
        if (!post) return;

        let newUp = [...post.upvotes];
        let newDown = [...post.downvotes];

        if (type === 'up') {
            if (newUp.includes(currentUser.id)) newUp = newUp.filter(id => id !== currentUser.id);
            else {
                newUp.push(currentUser.id);
                newDown = newDown.filter(id => id !== currentUser.id);
            }
        } else {
            if (newDown.includes(currentUser.id)) newDown = newDown.filter(id => id !== currentUser.id);
            else {
                newDown.push(currentUser.id);
                newUp = newUp.filter(id => id !== currentUser.id);
            }
        }

        await supabase.from('forum_posts').update({ upvotes: newUp, downvotes: newDown }).eq('id', postId);
        fetchInitialData();
    };

    // --- Settings & API ---

    const updateGlobalSettings = async (settings: GlobalSettings) => {
        await supabase.from('app_settings').upsert({ key: 'global_settings', value: settings });
        setGlobalSettings(settings);
    };

    const updateAIContextSettings = async (settings: AIContextSettings) => {
        await supabase.from('app_settings').upsert({ key: 'ai_context_settings', value: settings });
        setAiContextSettings(settings);
    };

    const updateAIToolSettings = async (settings: AIToolSettings) => {
        await supabase.from('app_settings').upsert({ key: 'ai_tool_settings', value: settings });
        setAiToolSettings(settings);
    };

    const addApiConnection = async (connection: Omit<ApiConnection, 'id'>) => {
        await supabase.from('api_connections').insert({
            name: connection.name,
            provider: connection.provider,
            api_key: connection.apiKey,
            base_url: connection.baseUrl,
            models: connection.models,
            is_active: connection.isActive
        });
        fetchInitialData();
    };

    const updateApiConnection = async (connection: ApiConnection) => {
        await supabase.from('api_connections').update({
            name: connection.name,
            provider: connection.provider,
            api_key: connection.apiKey,
            base_url: connection.baseUrl,
            models: connection.models,
            is_active: connection.isActive
        }).eq('id', connection.id);
        fetchInitialData();
    };

    const deleteApiConnection = async (id: string) => {
        await supabase.from('api_connections').delete().eq('id', id);
        fetchInitialData();
    };

    const toggleApiConnectionActive = async (id: string) => {
        const conn = apiConnections.find(c => c.id === id);
        if (conn) {
            await updateApiConnection({ ...conn, isActive: !conn.isActive });
        }
    };

    const setDefaultApiConnection = async (id: string) => {
        // Logic to set default handled in state mostly, or persistent if needed
        setDefaultApiConnectionId(id);
    };

    const updateSiteLogo = async (file: File) => {
        const base64 = await fileToBase64(file);
        await supabase.from('app_settings').upsert({ key: 'site_logo', value: base64 });
        setSiteLogo(base64);
    };

    const resetSiteLogo = async () => {
        await supabase.from('app_settings').delete().eq('key', 'site_logo');
        setSiteLogo(null);
    };

    // --- Admin/Mod Actions (snake_case) ---

    const submitReport = async (report: Omit<Report, 'id' | 'reporterId' | 'timestamp' | 'isResolved' | 'notes'>) => {
        if (!currentUser) return;
        await supabase.from('reports').insert({
            reporter_id: currentUser.id,
            entity_type: report.entityType,
            entity_id: report.entityId,
            reason: report.reason,
            description: report.description,
            is_resolved: false,
            notes: [],
            content_snapshot: report.contentSnapshot,
            entity_creator_id: report.entityCreatorId
        });
        refreshAdminData();
    };

    const resolveReport = async (reportId: string, isResolved: boolean) => {
        await supabase.from('reports').update({ is_resolved: isResolved }).eq('id', reportId);
        refreshAdminData();
    };

    const addNoteToReport = async (reportId: string, note: string) => {
        const report = reports.find(r => r.id === reportId);
        if (report) {
            const newNotes = [...(report.notes || []), `${currentUser?.username}: ${note}`];
            await supabase.from('reports').update({ notes: newNotes }).eq('id', reportId);
            refreshAdminData();
        }
    };

    const submitTicket = async (ticket: Omit<Ticket, 'id' | 'submitterId' | 'status' | 'timestamp'>) => {
        if (!currentUser) return;
        await supabase.from('tickets').insert({
            submitter_id: currentUser.id,
            subject: ticket.subject,
            description: ticket.description,
            email: ticket.email,
            status: 'New',
            folder_id: null
        });
        refreshAdminData();
    };

    const updateTicketStatus = async (ticketId: string, status: any) => {
        await supabase.from('tickets').update({ status: status }).eq('id', ticketId);
        refreshAdminData();
    };

    const createTicketFolder = async (name: string) => {
        await supabase.from('admin_folders').insert({ type: 'ticket', name: name });
        refreshAdminData();
    };

    const moveTicketToFolder = async (ticketId: string, folderId: string | null) => {
        await supabase.from('tickets').update({ folder_id: folderId }).eq('id', ticketId);
        refreshAdminData();
    };

    const updateAIAlertStatus = async (alertId: string, status: any) => {
        await supabase.from('ai_alerts').update({ status: status }).eq('id', alertId);
        refreshAdminData();
    };

    const createAIAlertFolder = async (name: string) => {
        await supabase.from('admin_folders').insert({ type: 'ai_alert', name: name });
        refreshAdminData();
    };

    const moveAIAlertToFolder = async (alertId: string, folderId: string | null) => {
        await supabase.from('ai_alerts').update({ folder_id: folderId }).eq('id', alertId);
        refreshAdminData();
    };

    const addNoteToAIAlert = async (alertId: string, note: string) => {
        const alert = aiAlerts.find(a => a.id === alertId);
        if (alert) {
            const newNotes = [...(alert.notes || []), `${currentUser?.username}: ${note}`];
            await supabase.from('ai_alerts').update({ notes: newNotes }).eq('id', alertId);
            refreshAdminData();
        }
    };

    const updateAIAlertFeedback = async (alertId: string, feedback: 'good' | 'bad') => {
        await supabase.from('ai_alerts').update({ feedback: feedback }).eq('id', alertId);
        refreshAdminData();
    };

    const sendDirectMessage = async (userId: string, content: { text?: string, imageFile?: File | null }, isFromAdmin: boolean, folderId?: string | null) => {
        let imageUrl = undefined;
        if (content.imageFile) {
            imageUrl = await fileToBase64(content.imageFile);
        }

        await supabase.from('direct_messages').insert({
            conversation_user_id: userId,
            sender_id: isFromAdmin ? 'ADMIN' : (currentUser?.id || ''),
            text: content.text,
            image_url: imageUrl,
            timestamp: Date.now(),
            is_read_by_user: isFromAdmin ? false : true,
            is_read_by_admin: isFromAdmin ? true : false,
            folder_id: folderId
        });

        // Update Conversation Metadata
        const existing = dmConversations[userId];
        await supabase.from('dm_conversations').upsert({
            user_id: userId,
            has_unread_by_user: isFromAdmin ? true : (existing?.hasUnreadByUser ?? false),
            has_unread_by_admin: !isFromAdmin ? true : (existing?.hasUnreadByAdmin ?? false),
            folder_id: folderId ?? existing?.folderId
        });
        
        if (isFromAdmin) {
             await supabase.from('notifications').insert({
                user_id: userId,
                type: 'NEW_DM',
                message: `You have a new message from an administrator`,
                related_id: userId,
                is_read: false
            });
        }

        refreshAdminData();
    };

    const markDMAsReadByUser = async (userId: string) => {
        await supabase.from('dm_conversations').update({ has_unread_by_user: false }).eq('user_id', userId);
        // Also update all DMs? Usually conversation flag is enough for badge
    };

    const markDMAsReadByAdmin = async (userId: string) => {
        await supabase.from('dm_conversations').update({ has_unread_by_admin: false }).eq('user_id', userId);
        refreshAdminData();
    };

    const markAllDMsAsReadByAdmin = async () => {
        await supabase.from('dm_conversations').update({ has_unread_by_admin: false }).neq('user_id', 'placeholder');
        refreshAdminData();
    };

    const createDMFolder = async (name: string) => {
        await supabase.from('admin_folders').insert({ type: 'dm', name: name });
        refreshAdminData();
    };

    const moveDMConversationToFolder = async (userId: string, folderId: string | null) => {
        await supabase.from('dm_conversations').update({ folder_id: folderId }).eq('user_id', userId);
        refreshAdminData();
    };

    const markNotificationsAsRead = async () => {
        if (!currentUser) return;
        await supabase.from('notifications').update({ is_read: true }).eq('user_id', currentUser.id);
        fetchCurrentUserData(currentUser.id);
    };

    const markSingleNotificationAsRead = async (notificationId: string) => {
        await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
        if (currentUser) fetchCurrentUserData(currentUser.id);
    };

    const markCategoryAsRead = async (category: string) => {
        if (!currentUser) return;
        // Logic depends on how categories map to types, implementing simple all-read for now or types check
        let types: string[] = [];
        if (category === 'Following') types = ['NEW_BOT', 'NEW_FOLLOWER'];
        if (category === 'My Characters') types = ['NEW_LIKE', 'NEW_COMMENT'];
        if (category === 'Replies') types = ['REPLY'];
        
        if (types.length > 0) {
            await supabase.from('notifications')
                .update({ is_read: true })
                .eq('user_id', currentUser.id)
                .in('type', types);
            fetchCurrentUserData(currentUser.id);
        }
    };

    const markAdminNotificationsAsRead = async (types: Notification['type'][]) => {
        if (!currentUser) return;
        await supabase.from('notifications')
            .update({ is_read: true })
            .eq('user_id', currentUser.id)
            .in('type', types);
        fetchCurrentUserData(currentUser.id);
    };

    // Helpers
    const findUserById = (userId: string) => allUsers.find(u => u.id === userId) || null;
    const findConnectionForModel = (modelName: string) => {
        for (const conn of apiConnections) {
            if (conn.isActive && conn.models.includes(modelName)) return conn;
        }
        if (defaultApiConnectionId) {
            const def = apiConnections.find(c => c.id === defaultApiConnectionId);
            if (def && def.isActive) return def;
        }
        return undefined;
    };
    const findConnectionForTool = (tool: AITool) => {
        const connId = aiToolSettings.toolConnections[tool];
        if (connId) return apiConnections.find(c => c.id === connId && c.isActive);
        return undefined;
    };
    const getPostsForThread = (threadId: string) => forumPosts.filter(p => p.threadId === threadId);

    // Auth Actions (Simple Mocks wrapping Supabase Auth)
    const login = async (email?: string, password?: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email: email!, password: password! });
        if (error) throw error;
    };
    const loginWithGoogle = async () => {
        await supabase.auth.signInWithOAuth({ provider: 'google' });
    };
    const signup = async (username: string, password: string, email: string) => {
        const { error } = await supabase.auth.signUp({
            email, 
            password,
            options: { data: { username } }
        });
        if (error) throw error;
    };
    const logout = async () => {
        await supabase.auth.signOut();
        setCurrentUser(null);
    };

    return (
        <AuthContext.Provider value={{
            currentUser, allUsers, characters, chatHistories, chatSettings, chatStats, narrativeStates,
            globalSettings, aiContextSettings, aiToolSettings, apiConnections, defaultApiConnectionId,
            forumCategories, forumThreads, getPostsForThread,
            reports, tickets, ticketFolders, aiAlerts, aiAlertFolders, dmConversations, dmFolders,
            loading,
            login, loginWithGoogle, signup, logout,
            saveCharacter, deleteCharacter, silenceCharacter, updateChatHistory, deleteChatHistory, updateChatSettings, updateChatStats, updateNarrativeState,
            updateUserProfile, updateAnyUserProfile, updateUserType, updateUserRole, silenceUser, deleteUser,
            toggleFavorite, likeCharacter, addComment, deleteComment, silenceComment, editComment,
            followUser,
            createCategory, updateCategory, deleteCategory, createThread, deleteThread, togglePinThread, toggleLockThread, silenceThread, moveThread, createPost, editPost, deletePost, silencePost, togglePostVote,
            updateGlobalSettings, updateAIContextSettings, updateAIToolSettings, addApiConnection, updateApiConnection, deleteApiConnection, toggleApiConnectionActive, setDefaultApiConnection,
            siteLogo, updateSiteLogo, resetSiteLogo,
            submitReport, resolveReport, addNoteToReport,
            submitTicket, updateTicketStatus, createTicketFolder, moveTicketToFolder,
            updateAIAlertStatus, createAIAlertFolder, moveAIAlertToFolder, addNoteToAIAlert, updateAIAlertFeedback,
            sendDirectMessage, markDMAsReadByUser, markDMAsReadByAdmin, markAllDMsAsReadByAdmin, createDMFolder, moveDMConversationToFolder,
            markNotificationsAsRead, markSingleNotificationAsRead, markCategoryAsRead, markAdminNotificationsAsRead,
            findUserById, findConnectionForModel, findConnectionForTool,
            refreshAdminData
        }}>
            {children}
        </AuthContext.Provider>
    );
};
