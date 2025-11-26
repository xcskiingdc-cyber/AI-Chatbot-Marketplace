import React, { createContext, useState, useEffect, useCallback, ReactNode, useMemo, useRef } from 'react';
import { supabase } from '../supabase/client';
import { 
    User, Character, ChatMessage, ChatSettings, UserProfile, 
    GlobalSettings, AIContextSettings, ApiConnection, 
    Report, Ticket, AIAlert, Notification, DMConversation, 
    DirectMessage, Comment, ForumCategory, ForumThread, 
    ForumPost, AppView, AIToolSettings, CharacterStat, AITool, ToolConfig, AIAlertStatus
} from '../types';
import { fileToBase64 } from '../utils/imageUtils';
import { scanText } from '../services/moderationService';

interface AuthContextType {
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
    siteLogo: string | null;
    login: (email?: string, password?: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    signup: (username: string, password: string, email: string) => Promise<void>;
    logout: () => Promise<void>;
    saveCharacter: (character: Character, avatarFile: File | null) => Promise<void>;
    deleteCharacter: (characterId: string) => Promise<void>;
    silenceCharacter: (characterId: string, isSilenced: boolean) => Promise<void>;
    updateChatHistory: (characterId: string, messages: ChatMessage[]) => Promise<void>;
    deleteChatHistory: (characterId: string) => Promise<void>;
    updateChatSettings: (characterId: string, settings: ChatSettings) => Promise<void>;
    updateChatStats: (characterId: string, stats: Record<string, number>) => Promise<void>;
    updateNarrativeState: (characterId: string, state: any) => Promise<void>;
    updateUserProfile: (profile: UserProfile, avatarFile: File | null) => Promise<void>;
    updateAnyUserProfile: (userId: string, profile: UserProfile, avatarFile: File | null) => Promise<void>;
    updateUserType: (userId: string, type: User['userType']) => Promise<void>;
    updateUserRole: (userId: string, role: User['role']) => Promise<void>;
    silenceUser: (userId: string, isSilenced: boolean) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
    toggleFavorite: (characterId: string) => Promise<void>;
    likeCharacter: (characterId: string) => Promise<void>;
    addComment: (characterId: string, text: string, parentId?: string) => Promise<void>;
    deleteComment: (characterId: string, commentId: string) => Promise<void>;
    silenceComment: (characterId: string, commentId: string, isSilenced: boolean) => Promise<void>;
    editComment: (characterId: string, commentId: string, newText: string) => Promise<void>;
    followUser: (userId: string) => Promise<void>;
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
    deleteAIAlert: (alertId: string) => Promise<void>;
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
    clearAllNotifications: () => Promise<void>;
    markSingleNotificationAsRead: (notificationId: string) => Promise<void>;
    markCategoryAsRead: (category: string) => Promise<void>;
    markAdminNotificationsAsRead: (types: Notification['type'][]) => Promise<void>;
    findUserById: (userId: string) => User | null;
    findConnectionForModel: (modelName: string) => ApiConnection | undefined;
    getToolConfig: (tool: AITool) => { connection: ApiConnection, model: string | null } | undefined;
    refreshAdminData: () => Promise<void>;
    runFullModerationScan: (onProgress: (current: number, total: number) => void) => Promise<void>;
}

const mapDbUser = (dbUser: any): User => {
    const defaultProfile: UserProfile = {
        name: dbUser.username || 'Unknown User',
        email: '',
        gender: 'undisclosed',
        birthday: '',
        avatarUrl: '',
        bio: '',
        favoriteCharacterIds: [],
        following: [],
        followers: [],
        notifications: [],
        forumPostCount: 0,
        forumThreadCount: 0
    };

    return {
        id: dbUser.id,
        username: dbUser.username || '',
        userType: dbUser.user_type || 'Free',
        role: dbUser.role || 'User',
        isSilenced: dbUser.is_silenced || false,
        profile: dbUser.profile ? { ...defaultProfile, ...dbUser.profile } : defaultProfile
    };
};

const mapDbCharacter = (dbChar: any): Character => {
    let summary = {};
    if (dbChar.summary) {
        if (typeof dbChar.summary === 'string') {
            try { summary = JSON.parse(dbChar.summary); } catch(e) {}
        } else if (typeof dbChar.summary === 'object') {
            summary = dbChar.summary;
        }
    }

    return {
        id: dbChar.id,
        creatorId: dbChar.creator_id,
        name: dbChar.name,
        avatarUrl: dbChar.avatar_url || '',
        gender: dbChar.gender,
        description: dbChar.description,
        personality: dbChar.personality,
        story: dbChar.story || '',
        situation: dbChar.situation || '',
        feeling: dbChar.feeling || '',
        appearance: dbChar.appearance || '',
        isBeyondTheHaven: dbChar.is_beyond_the_haven,
        model: dbChar.model,
        greeting: dbChar.greeting,
        isPublic: dbChar.is_public,
        isSilencedByAdmin: dbChar.is_silenced_by_admin,
        categories: dbChar.categories || [],
        likes: dbChar.likes || [],
        comments: dbChar.comments || [], 
        stats: Array.isArray(dbChar.stats) ? dbChar.stats : [], 
        statsVisible: dbChar.stats_visible,
        summary: summary
    };
};

const mapDbConnection = (dbConn: any): ApiConnection => ({
    id: dbConn.id,
    name: dbConn.name,
    provider: dbConn.provider,
    apiKey: dbConn.api_key,
    baseUrl: dbConn.base_url,
    models: dbConn.models || [],
    isActive: dbConn.is_active
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
    
    const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({ havenPrompt: '', beyondTheHavenPrompt: '', kidModePrompt: '', enableAIModeration: false });
    const [aiContextSettings, setAiContextSettings] = useState<AIContextSettings>({ 
        includedFields: ['gender', 'personality', 'story', 'feeling', 'appearance', 'situation', 'greeting'], 
        historyLength: 50, 
        maxResponseTokens: 1000 
    });
    const [aiToolSettings, setAiToolSettings] = useState<AIToolSettings>({ toolConfigs: {} as any });
    
    const [apiConnections, setApiConnections] = useState<ApiConnection[]>([]);
    const [defaultApiConnectionId, setDefaultApiConnectionId] = useState<string | null>(null);
    
    const [forumCategories, setForumCategories] = useState<ForumCategory[]>([]);
    const [forumThreads, setForumThreads] = useState<ForumThread[]>([]);
    const [forumPosts, setForumPosts] = useState<ForumPost[]>([]); 
    
    const [reports, setReports] = useState<Report[]>([]);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [ticketFolders, setTicketFolders] = useState<any[]>([]);
    const [aiAlerts, setAiAlerts] = useState<AIAlert[]>([]);
    const [aiAlertFolders, setAiAlertFolders] = useState<any[]>([]);
    const [dmConversations, setDmConversations] = useState<Record<string, DMConversation>>({});
    const [dmFolders, setDmFolders] = useState<any[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [siteLogo, setSiteLogo] = useState<string | null>(null);
    
    const currentUserIdRef = useRef<string | null>(null);

    const refreshGlobalData = useCallback(async () => {
        try {
            const fetchWithRetry = async (table: string, retries = 1): Promise<any[] | null> => {
                for (let i = 0; i <= retries; i++) {
                    try {
                        const requestPromise = supabase.from(table).select('*');
                        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Request Timeout')), 15000));
                        
                        const { data, error } = await Promise.race([requestPromise, timeoutPromise]) as any;
                        
                        if (!error) return data;
                        if (i === retries) return null; 
                    } catch (err: any) {
                        if (i === retries) return null;
                    }
                    if (i < retries) await new Promise(r => setTimeout(r, 1000 * (i + 1))); 
                }
                return null;
            };

            const results = await Promise.allSettled([
                fetchWithRetry('profiles'),
                fetchWithRetry('characters'),
                fetchWithRetry('app_settings'),
                fetchWithRetry('global_settings'),
                fetchWithRetry('api_connections'),
                fetchWithRetry('forum_categories'),
                fetchWithRetry('forum_threads'),
                fetchWithRetry('forum_posts'),
                fetchWithRetry('reports'),
                fetchWithRetry('tickets'),
                fetchWithRetry('ai_alerts'),
                fetchWithRetry('dm_conversations'),
                fetchWithRetry('admin_folders')
            ]);

            const getResult = (index: number, fallback: any) => {
                const res = results[index];
                return res.status === 'fulfilled' && res.value !== null ? res.value : fallback;
            };

            const [
                profilesData, charactersData, appSettingsData, globalSettingsData, 
                apiConnectionsData, categoriesData, threadsData, postsData, 
                reportsData, ticketsData, alertsData, dmsData, foldersData
            ] = [0,1,2,3,4,5,6,7,8,9,10,11,12].map(i => getResult(i, []));

            if (profilesData.length > 0) setAllUsers(profilesData.map(mapDbUser));
            if (charactersData.length > 0) setCharacters(charactersData.map(mapDbCharacter));
            if (apiConnectionsData.length > 0) setApiConnections(apiConnectionsData.map(mapDbConnection));
            if (categoriesData.length > 0) setForumCategories(categoriesData);
            if (threadsData.length > 0) setForumThreads(threadsData);
            if (postsData.length > 0) setForumPosts(postsData);
            if (reportsData.length > 0) setReports(reportsData);
            if (ticketsData.length > 0) setTickets(ticketsData);
            if (alertsData.length > 0) setAiAlerts(alertsData);
            
            if (appSettingsData.length > 0) {
                const logoSetting = appSettingsData.find((s: any) => s.key === 'site_logo');
                if (logoSetting) setSiteLogo(logoSetting.value);

                const chatSettingsData = appSettingsData.find((s: any) => s.key === 'ai_chat_settings');
                if (chatSettingsData) setChatSettings(chatSettingsData.value);

                const defaultConn = appSettingsData.find((s: any) => s.key === 'default_api_connection');
                if (defaultConn) setDefaultApiConnectionId(defaultConn.value);

                const aiCtx = appSettingsData.find((s: any) => s.key === 'ai_context_settings');
                if (aiCtx) setAiContextSettings(aiCtx.value);

                const aiTool = appSettingsData.find((s: any) => s.key === 'ai_tool_settings');
                if (aiTool) setAiToolSettings(aiTool.value);
            }

            if (globalSettingsData.length > 0) {
                const gs = globalSettingsData[0].settings;
                setGlobalSettings({
                    havenPrompt: gs.havenPrompt || '',
                    beyondTheHavenPrompt: gs.beyondTheHavenPrompt || '',
                    kidModePrompt: gs.kidModePrompt || '',
                    enableAIModeration: gs.enableAIModeration || false
                });
            }

            if (foldersData.length > 0) {
                const tFolders = foldersData.filter((f: any) => f.type === 'ticket_folder');
                const aFolders = foldersData.filter((f: any) => f.type === 'ai_alert_folder');
                const dFolders = foldersData.filter((f: any) => f.type === 'dm_folder');
                setTicketFolders(tFolders);
                setAiAlertFolders(aFolders);
                setDmFolders(dFolders);
            }

            if (dmsData.length > 0) {
                const dmMap: Record<string, DMConversation> = {};
                dmsData.forEach((dm: any) => {
                    dmMap[dm.user_id] = {
                        userId: dm.user_id,
                        messages: dm.messages || [],
                        hasUnreadByUser: dm.has_unread_by_user,
                        hasUnreadByAdmin: dm.has_unread_by_admin,
                        folderId: dm.folder_id
                    };
                });
                setDmConversations(dmMap);
            }

        } catch (error) {
            console.error("Critical Error refreshing global data:", error);
        }
    }, []);

    useEffect(() => {
        let mounted = true;

        const init = async () => {
            setLoading(true);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                
                if (session?.user) {
                    currentUserIdRef.current = session.user.id;
                    const { data: userProfile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
                    if (userProfile) {
                        setCurrentUser(mapDbUser(userProfile));
                    } else {
                        const newProfile = {
                            id: session.user.id,
                            username: session.user.email?.split('@')[0] || 'User',
                            profile: { email: session.user.email, name: session.user.email?.split('@')[0] || 'User' }
                        };
                        const { error: createError } = await supabase.from('profiles').insert(newProfile);
                        if(!createError) setCurrentUser(mapDbUser(newProfile));
                    }

                    const { data: userData } = await supabase.from('user_character_data').select('*').eq('user_id', session.user.id);
                    if (userData) {
                        const settings: any = {};
                        const stats: any = {};
                        const narratives: any = {};
                        userData.forEach((row: any) => {
                            settings[row.character_id] = row.settings;
                            stats[row.character_id] = row.stats;
                            narratives[row.character_id] = row.narrative_state;
                        });
                        if (!chatSettings[session.user.id]) setChatSettings(prev => ({...prev, [session.user.id]: settings}));
                        setChatStats(prev => ({...prev, [session.user.id]: stats}));
                        setNarrativeStates(prev => ({...prev, [session.user.id]: narratives}));
                    }
                    
                    const { data: histories } = await supabase.from('chat_histories').select('*').eq('user_id', session.user.id);
                    if (histories) {
                        const histMap: Record<string, ChatMessage[]> = {};
                        histories.forEach((h: any) => {
                            histMap[h.character_id] = h.messages;
                        });
                        setChatHistories(prev => ({...prev, [session.user.id]: histMap}));
                    }
                }

                if (mounted) {
                    await refreshGlobalData();
                }

            } catch (err) {
                console.error("Auth Init Error:", err);
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        init();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                if (session.user.id !== currentUserIdRef.current) {
                    setLoading(true);
                    init();
                }
            } else if (event === 'SIGNED_OUT') {
                setCurrentUser(null);
                currentUserIdRef.current = null;
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [refreshGlobalData]);

    const notImplemented = async () => { console.warn("Function not fully implemented in this fix-step"); };

    const login = async (email?: string, password?: string) => {
        if (!email || !password) throw new Error("Email and password required");
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
    };

    const loginWithGoogle = async () => { console.log("Google Login Triggered"); };

    const signup = async (username: string, password: string, email: string) => {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
             await supabase.from('profiles').insert({
                id: data.user.id,
                username: username,
                profile: { email, name: username }
            });
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setCurrentUser(null);
    };

    const saveCharacter = async (character: Character, avatarFile: File | null) => {
        let avatarUrl = character.avatarUrl;
        if (avatarFile) {
             const fileExt = avatarFile.name.split('.').pop();
             const fileName = `${Math.random()}.${fileExt}`;
             const filePath = `avatars/${fileName}`;
             const { error: uploadError } = await supabase.storage.from('App-assets').upload(filePath, avatarFile);
             if (uploadError) {
                 if (uploadError.message.includes('violates row-level security')) {
                     throw new Error("Storage Permission Error: You do not have permission to upload images. Please ask an admin to enable storage policies.");
                 }
                 throw uploadError;
             }
             const { data: { publicUrl } } = supabase.storage.from('App-assets').getPublicUrl(filePath);
             avatarUrl = publicUrl;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("You must be logged in to save.");

        const characterData = {
            id: character.id,
            creator_id: character.creatorId || user.id,
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
            stats: character.stats,
            stats_visible: character.statsVisible,
            summary: character.summary
        };

        // Use standard upsert to let RLS handle permissions naturally
        const { error } = await supabase.from('characters').upsert(characterData);

        if (error) {
            if (error.code === '42501') { // RLS Violation
                 throw new Error("Permission denied. You may not be able to edit this character.");
            }
            throw error;
        }
        await refreshGlobalData();
    };

    const deleteCharacter = async (id: string) => { await supabase.from('characters').delete().eq('id', id); await refreshGlobalData(); };
    const updateChatHistory = async (cid: string, msgs: ChatMessage[]) => { 
        if(!currentUser) return;
        await supabase.from('chat_histories').upsert({ user_id: currentUser.id, character_id: cid, messages: msgs });
        setChatHistories(prev => ({...prev, [currentUser.id]: { ...prev[currentUser.id], [cid]: msgs } }));
    };

    const updateGlobalSettings = async (settings: GlobalSettings) => {
        const { error } = await supabase.from('global_settings').upsert({ id: true, settings });
        if (error) throw error;
        setGlobalSettings(settings);
    };

    const updateAIContextSettings = async (settings: AIContextSettings) => {
        const { error } = await supabase.from('app_settings').upsert({ key: 'ai_context_settings', value: settings });
        if (error) throw error;
        setAiContextSettings(settings);
    };

    const updateAIToolSettings = async (settings: AIToolSettings) => {
        const { error } = await supabase.from('app_settings').upsert({ key: 'ai_tool_settings', value: settings });
        if (error) throw error;
        setAiToolSettings(settings);
    };

    const addApiConnection = async (connection: Omit<ApiConnection, 'id'>) => {
        const { data, error } = await supabase.from('api_connections').insert({
            name: connection.name,
            provider: connection.provider,
            api_key: connection.apiKey,
            base_url: connection.baseUrl,
            models: connection.models,
            is_active: connection.isActive
        }).select().single();
        if (error) throw error;
        if (data) {
            setApiConnections(prev => [...prev, mapDbConnection(data)]);
        }
    };

    const updateApiConnection = async (connection: ApiConnection) => {
        const { error } = await supabase.from('api_connections').update({
            name: connection.name,
            provider: connection.provider,
            api_key: connection.apiKey,
            base_url: connection.baseUrl,
            models: connection.models,
            is_active: connection.isActive
        }).eq('id', connection.id);
        if (error) throw error;
        setApiConnections(prev => prev.map(c => c.id === connection.id ? connection : c));
    };

    const deleteApiConnection = async (id: string) => {
        const { error } = await supabase.from('api_connections').delete().eq('id', id);
        if (error) throw error;
        setApiConnections(prev => prev.filter(c => c.id !== id));
    };

    const toggleApiConnectionActive = async (id: string) => {
        const conn = apiConnections.find(c => c.id === id);
        if (conn) {
            await updateApiConnection({ ...conn, isActive: !conn.isActive });
        }
    };

    const setDefaultApiConnection = async (id: string) => {
        const { error } = await supabase.from('app_settings').upsert({ key: 'default_api_connection', value: id });
        if (error) throw error;
        setDefaultApiConnectionId(id);
    };

    const deleteChatHistory = async (characterId: string) => {
        if (!currentUser) return;
        await supabase.from('chat_histories').delete().match({ user_id: currentUser.id, character_id: characterId });
        setChatHistories(prev => {
            const newState = { ...prev };
            if (newState[currentUser.id]) {
                delete newState[currentUser.id][characterId];
            }
            return newState;
        });
    };

    const updateChatSettings = async (characterId: string, settings: ChatSettings) => {
        if (!currentUser) return;
        const { data: existing } = await supabase.from('user_character_data').select('settings').match({ user_id: currentUser.id, character_id: characterId }).single();
        const newSettings = { ...existing?.settings, ...settings };
        
        await supabase.from('user_character_data').upsert({ 
            user_id: currentUser.id, 
            character_id: characterId, 
            settings: newSettings 
        });
        
        setChatSettings(prev => ({
            ...prev,
            [currentUser.id]: {
                ...prev[currentUser.id],
                [characterId]: newSettings
            }
        }));
    };

    const submitTicket = async (ticket: Omit<Ticket, 'id' | 'submitterId' | 'status' | 'timestamp'>) => {
        if (!currentUser) return;
        const { data, error } = await supabase.from('tickets').insert({
            submitter_id: currentUser.id,
            subject: ticket.subject,
            description: ticket.description,
            email: ticket.email,
            status: 'New'
        }).select().single();
        if (error) throw error;
        if (data) {
            setTickets(prev => [
                { ...ticket, id: data.id, submitterId: currentUser.id, status: 'New', timestamp: Date.parse(data.created_at) } as Ticket,
                ...prev
            ]);
        }
    };

    const updateTicketStatus = async (ticketId: string, status: any) => {
        const { error } = await supabase.from('tickets').update({ status }).eq('id', ticketId);
        if (error) throw error;
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status } : t));
    };

    const sendDirectMessage = async (userId: string, content: { text?: string, imageFile?: File | null }, isFromAdmin: boolean, folderId?: string | null) => {
        let imageUrl;
        if (content.imageFile) {
             const fileExt = content.imageFile.name.split('.').pop();
             const fileName = `dm/${Math.random()}.${fileExt}`;
             const { error: uploadError } = await supabase.storage.from('App-assets').upload(fileName, content.imageFile);
             if (uploadError) throw uploadError;
             const { data: { publicUrl } } = supabase.storage.from('App-assets').getPublicUrl(fileName);
             imageUrl = publicUrl;
        }

        const newMessage = {
            conversation_user_id: userId,
            sender_id: isFromAdmin ? 'ADMIN' : userId,
            text: content.text,
            image_url: imageUrl,
            is_read_by_user: !isFromAdmin,
            is_read_by_admin: isFromAdmin,
            folder_id: folderId,
            timestamp: Date.now()
        };

        const { data, error } = await supabase.from('direct_messages').insert(newMessage).select().single();
        if (error) throw error;

        // Update local state
        setDmConversations(prev => {
            const conversation = prev[userId] || { userId, messages: [], hasUnreadByUser: false, hasUnreadByAdmin: false, folderId: null };
            const updatedMessages = [...conversation.messages, {
                id: data.id,
                senderId: data.sender_id,
                text: data.text,
                imageUrl: data.image_url,
                timestamp: data.timestamp
            }];
            
            return {
                ...prev,
                [userId]: {
                    ...conversation,
                    messages: updatedMessages,
                    hasUnreadByUser: isFromAdmin ? true : conversation.hasUnreadByUser,
                    hasUnreadByAdmin: !isFromAdmin ? true : conversation.hasUnreadByAdmin,
                    folderId: folderId // Update folder if changed
                }
            };
        });

        // Update DB conversation summary
        await supabase.from('dm_conversations').upsert({
            user_id: userId,
            has_unread_by_user: isFromAdmin,
            has_unread_by_admin: !isFromAdmin,
            folder_id: folderId
        });
    };

    const markDMAsReadByAdmin = async (userId: string) => {
        await supabase.from('direct_messages').update({ is_read_by_admin: true }).eq('conversation_user_id', userId);
        await supabase.from('dm_conversations').update({ has_unread_by_admin: false }).eq('user_id', userId);
        setDmConversations(prev => ({
            ...prev,
            [userId]: { ...prev[userId], hasUnreadByAdmin: false }
        }));
    };

    const markDMAsReadByUser = async (userId: string) => {
        await supabase.from('direct_messages').update({ is_read_by_user: true }).eq('conversation_user_id', userId);
        await supabase.from('dm_conversations').update({ has_unread_by_user: false }).eq('user_id', userId);
        setDmConversations(prev => ({
            ...prev,
            [userId]: { ...prev[userId], hasUnreadByUser: false }
        }));
    };

    const createDMFolder = async (name: string) => {
        const { data, error } = await supabase.from('admin_folders').insert({ type: 'dm_folder', name }).select().single();
        if (error) throw error;
        setDmFolders(prev => [...prev, data]);
    };

    const moveDMConversationToFolder = async (userId: string, folderId: string | null) => {
        await supabase.from('dm_conversations').update({ folder_id: folderId }).eq('user_id', userId);
        setDmConversations(prev => ({
            ...prev,
            [userId]: { ...prev[userId], folderId }
        }));
    };

    const markAllDMsAsReadByAdmin = async () => {
        // Optimistic update
        setDmConversations(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(key => {
                next[key].hasUnreadByAdmin = false;
            });
            return next;
        });
        await supabase.from('direct_messages').update({ is_read_by_admin: true }).eq('is_read_by_admin', false);
        await supabase.from('dm_conversations').update({ has_unread_by_admin: false });
    };

    const markAdminNotificationsAsRead = async (types: Notification['type'][]) => {
        if (!currentUser) return;
        const { error } = await supabase.from('notifications')
            .update({ is_read: true })
            .eq('user_id', currentUser.id)
            .in('type', types)
            .eq('is_read', false);

        if (error) console.error("Error marking notifications read:", error);

        setCurrentUser(prev => {
            if (!prev) return null;
            return {
                ...prev,
                profile: {
                    ...prev.profile,
                    notifications: prev.profile.notifications.map(n => 
                        types.includes(n.type) ? { ...n, isRead: true } : n
                    )
                }
            };
        });
    };

    const updateAIAlertStatus = async (alertId: string, status: AIAlertStatus) => {
        const { error } = await supabase.from('ai_alerts').update({ status }).eq('id', alertId);
        if (error) throw error;
        setAiAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status } : a));
    };

    const deleteAIAlert = async (alertId: string) => {
        const { error } = await supabase.from('ai_alerts').delete().eq('id', alertId);
        if (error) throw error;
        setAiAlerts(prev => prev.filter(a => a.id !== alertId));
    };

    return (
        <AuthContext.Provider value={{
            currentUser, allUsers, characters, chatHistories, chatSettings, chatStats, narrativeStates,
            globalSettings, aiContextSettings, aiToolSettings, apiConnections, defaultApiConnectionId,
            forumCategories, forumThreads, forumPosts: [],
            reports, tickets, ticketFolders, aiAlerts, aiAlertFolders, dmConversations, dmFolders,
            loading, siteLogo,
            login, loginWithGoogle, signup, logout, saveCharacter, deleteCharacter, 
            updateChatHistory, 
            updateGlobalSettings, updateAIContextSettings, updateAIToolSettings, addApiConnection,
            updateApiConnection, deleteApiConnection, toggleApiConnectionActive, setDefaultApiConnection,
            deleteChatHistory, updateChatSettings,
            submitTicket, updateTicketStatus, 
            sendDirectMessage, markDMAsReadByUser, markDMAsReadByAdmin, markAllDMsAsReadByAdmin,
            createDMFolder, moveDMConversationToFolder, markAdminNotificationsAsRead,
            updateAIAlertStatus, deleteAIAlert,
            silenceCharacter: notImplemented as any,
            updateChatStats: notImplemented as any, updateNarrativeState: notImplemented as any, updateUserProfile: notImplemented as any,
            updateAnyUserProfile: notImplemented as any, updateUserType: notImplemented as any, updateUserRole: notImplemented as any,
            silenceUser: notImplemented as any, deleteUser: notImplemented as any, toggleFavorite: notImplemented as any,
            likeCharacter: notImplemented as any, addComment: notImplemented as any, deleteComment: notImplemented as any,
            silenceComment: notImplemented as any, editComment: notImplemented as any, followUser: notImplemented as any,
            createCategory: notImplemented as any, updateCategory: notImplemented as any, deleteCategory: notImplemented as any,
            createThread: notImplemented as any, deleteThread: notImplemented as any, togglePinThread: notImplemented as any,
            toggleLockThread: notImplemented as any, silenceThread: notImplemented as any, moveThread: notImplemented as any,
            createPost: notImplemented as any, editPost: notImplemented as any, deletePost: notImplemented as any,
            silencePost: notImplemented as any, togglePostVote: notImplemented as any, 
            updateSiteLogo: notImplemented as any, resetSiteLogo: notImplemented as any,
            submitReport: notImplemented as any, resolveReport: notImplemented as any, addNoteToReport: notImplemented as any,
            createTicketFolder: notImplemented as any, moveTicketToFolder: notImplemented as any, 
            createAIAlertFolder: notImplemented as any, moveAIAlertToFolder: notImplemented as any, 
            addNoteToAIAlert: notImplemented as any, updateAIAlertFeedback: notImplemented as any,
            markNotificationsAsRead: notImplemented as any, clearAllNotifications: notImplemented as any, markSingleNotificationAsRead: notImplemented as any,
            markCategoryAsRead: notImplemented as any,
            findUserById: (id: string) => allUsers.find(u => u.id === id) || null,
            findConnectionForModel: (name) => apiConnections.find(c => c.isActive && c.models.includes(name)) || apiConnections.find(c => c.id === defaultApiConnectionId),
            getToolConfig: (tool) => { 
                const conf = aiToolSettings.toolConfigs[tool]; 
                if(!conf) return undefined;
                const conn = apiConnections.find(c => c.id === conf.connectionId);
                return conn ? { connection: conn, model: conf.modelOverride } : undefined; 
            },
            refreshAdminData: refreshGlobalData,
            runFullModerationScan: notImplemented as any,
            getPostsForThread: (threadId) => []
        }}>
            {children}
        </AuthContext.Provider>
    );
};