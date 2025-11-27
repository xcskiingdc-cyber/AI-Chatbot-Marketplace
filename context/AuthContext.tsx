
import React, { createContext, useState, useEffect, useCallback, ReactNode, useMemo, useRef } from 'react';
import { supabase } from '../supabase/client';
import { 
    User, Character, ChatMessage, ChatSettings, UserProfile, 
    GlobalSettings, AIContextSettings, ApiConnection, 
    Report, Ticket, AIAlert, Notification, DMConversation, 
    DirectMessage, Comment, ForumCategory, ForumThread, 
    ForumPost, AppView, AIToolSettings, CharacterStat, AITool, ToolConfig, AIAlertStatus,
    UserType, UserRole
} from '../types';

interface AuthContextType {
    currentUser: User | null;
    allUsers: User[];
    characters: Character[];
    chatHistories: Record<string, Record<string, ChatMessage[]>>;
    userCharacterData: Record<string, Record<string, any>>;
    apiConnections: ApiConnection[];
    defaultApiConnectionId: string | null;
    globalSettings: GlobalSettings;
    aiContextSettings: AIContextSettings;
    aiToolSettings: AIToolSettings;
    
    forumCategories: ForumCategory[];
    forumThreads: ForumThread[];
    forumPosts: ForumPost[];
    
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
    signup: (username: string, password?: string, email?: string) => Promise<void>;
    logout: () => Promise<void>;
    resetPasswordForEmail: (email: string) => Promise<void>;
    
    saveCharacter: (character: Character, avatarFile: File | null) => Promise<void>;
    deleteCharacter: (characterId: string) => Promise<void>;
    silenceCharacter: (characterId: string, isSilenced: boolean) => Promise<void>;
    
    updateUserProfile: (profile: UserProfile, avatarFile: File | null) => Promise<void>;
    updateAnyUserProfile: (userId: string, profile: UserProfile, avatarFile: File | null) => Promise<void>;
    updateUserType: (userId: string, type: UserType) => Promise<void>;
    updateUserRole: (userId: string, role: UserRole) => Promise<void>;
    silenceUser: (userId: string, isSilenced: boolean) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
    followUser: (userId: string) => Promise<void>;
    findUserById: (userId: string) => User | null;

    updateChatHistory: (characterId: string, messages: ChatMessage[]) => Promise<void>;
    deleteChatHistory: (characterId: string) => Promise<void>;
    saveUserCharacterData: (userId: string, characterId: string, data: any) => Promise<void>;
    
    toggleFavorite: (characterId: string) => Promise<void>;
    likeCharacter: (characterId: string) => Promise<void>;
    
    addComment: (characterId: string, text: string, parentId?: string) => Promise<void>;
    deleteComment: (characterId: string, commentId: string) => Promise<void>;
    silenceComment: (characterId: string, commentId: string, isSilenced: boolean) => Promise<void>;
    editComment: (characterId: string, commentId: string, newText: string) => Promise<void>;

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
    getPostsForThread: (threadId: string) => ForumPost[];

    updateGlobalSettings: (settings: GlobalSettings) => Promise<void>;
    updateAIContextSettings: (settings: AIContextSettings) => Promise<void>;
    updateAIToolSettings: (settings: AIToolSettings) => Promise<void>;
    
    addApiConnection: (connection: Omit<ApiConnection, 'id'>) => Promise<void>;
    updateApiConnection: (connection: ApiConnection) => Promise<void>;
    deleteApiConnection: (id: string) => Promise<void>;
    toggleApiConnectionActive: (id: string) => Promise<void>;
    setDefaultApiConnection: (id: string) => Promise<void>;
    findConnectionForModel: (modelName: string) => ApiConnection | undefined;
    getToolConfig: (tool: AITool) => { connection: ApiConnection, model: string | null } | undefined;

    updateSiteLogo: (file: File) => Promise<void>;
    resetSiteLogo: () => Promise<void>;
    
    submitReport: (report: Omit<Report, 'id' | 'reporterId' | 'timestamp' | 'isResolved' | 'notes'>) => Promise<void>;
    resolveReport: (reportId: string, isResolved: boolean) => Promise<void>;
    addNoteToReport: (reportId: string, note: string) => Promise<void>;
    deleteReport: (reportId: string) => Promise<void>;
    
    submitTicket: (ticket: Omit<Ticket, 'id' | 'submitterId' | 'status' | 'timestamp'>) => Promise<void>;
    updateTicketStatus: (ticketId: string, status: any) => Promise<void>;
    createTicketFolder: (name: string) => Promise<void>;
    moveTicketToFolder: (ticketId: string, folderId: string | null) => Promise<void>;
    deleteTicket: (ticketId: string) => Promise<void>;
    
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
    markAllDMsAsReadByUser: () => Promise<void>;
    createDMFolder: (name: string) => Promise<void>;
    moveDMConversationToFolder: (userId: string, folderId: string | null) => Promise<void>;
    deleteDMConversation: (userId: string) => Promise<void>;
    
    markNotificationsAsRead: () => Promise<void>;
    deleteNotifications: (ids: string[]) => Promise<void>;
    clearAllNotifications: () => Promise<void>;
    markSingleNotificationAsRead: (notificationId: string) => Promise<void>;
    markCategoryAsRead: (category: string) => Promise<void>;
    markAdminNotificationsAsRead: (types: Notification['type'][]) => Promise<void>;
    
    refreshAdminData: () => Promise<void>;
    runFullModerationScan: (onProgress: (current: number, total: number) => void) => Promise<void>;
    
    narrativeStates: Record<string, Record<string, any>>;
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

    const likes = Array.isArray(dbChar.likes) ? dbChar.likes : [];
    
    const comments: Comment[] = []; 

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
        likes: likes,
        comments: comments, 
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

const mapDbCategory = (dbCat: any): ForumCategory => ({
    id: dbCat.id,
    name: dbCat.name,
    description: dbCat.description,
    parentId: dbCat.parent_id,
    isLocked: dbCat.is_locked
});

const mapDbThread = (dbThread: any): ForumThread => ({
    id: dbThread.id,
    categoryId: dbThread.category_id,
    authorId: dbThread.author_id,
    title: dbThread.title,
    createdAt: new Date(dbThread.created_at).getTime(),
    tags: dbThread.tags || [],
    isLocked: dbThread.is_locked,
    isPinned: dbThread.is_pinned,
    isSilenced: dbThread.is_silenced,
    viewCount: dbThread.view_count
});

const mapDbPost = (dbPost: any): ForumPost => ({
    id: dbPost.id,
    threadId: dbPost.thread_id,
    authorId: dbPost.author_id,
    isCharacterPost: dbPost.is_character_post,
    content: dbPost.content,
    createdAt: new Date(dbPost.created_at).getTime(),
    upvotes: dbPost.upvotes || [],
    downvotes: dbPost.downvotes || [],
    isEdited: dbPost.is_edited,
    isSilenced: dbPost.is_silenced
});

const mapDbReport = (dbReport: any): Report => ({
    id: dbReport.id,
    reporterId: dbReport.reporter_id,
    entityType: dbReport.entity_type,
    entityId: dbReport.entity_id,
    reason: dbReport.reason,
    description: dbReport.description,
    timestamp: new Date(dbReport.created_at).getTime(),
    isResolved: dbReport.is_resolved,
    notes: dbReport.notes || [],
    contentSnapshot: dbReport.content_snapshot,
    entityCreatorId: dbReport.entity_creator_id
});

const mapDbTicket = (dbTicket: any): Ticket => ({
    id: dbTicket.id,
    submitterId: dbTicket.submitter_id,
    subject: dbTicket.subject,
    description: dbTicket.description,
    email: dbTicket.email,
    status: dbTicket.status,
    timestamp: new Date(dbTicket.created_at).getTime(),
    folderId: dbTicket.folder_id
});

const mapDbAIAlert = (dbAlert: any): AIAlert => ({
    id: dbAlert.id,
    entityType: dbAlert.entity_type,
    entityId: dbAlert.entity_id,
    category: dbAlert.category,
    confidence: dbAlert.confidence,
    flaggedText: dbAlert.flagged_text,
    explanation: dbAlert.explanation,
    timestamp: new Date(dbAlert.created_at).getTime(),
    status: dbAlert.status,
    folderId: dbAlert.folder_id,
    entityCreatorId: dbAlert.entity_creator_id,
    notes: dbAlert.notes || [],
    feedback: dbAlert.feedback
});

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children?: ReactNode }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [characters, setCharacters] = useState<Character[]>([]);
    
    const [chatHistories, setChatHistories] = useState<Record<string, Record<string, ChatMessage[]>>>({});
    const [userCharacterData, setUserCharacterData] = useState<Record<string, Record<string, any>>>({});
    
    const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({ havenPrompt: '', beyondTheHavenPrompt: '', kidModePrompt: '', enableAIModeration: false });
    const [aiContextSettings, setAiContextSettings] = useState<AIContextSettings>({ 
        includedFields: ['gender', 'personality', 'story', 'feeling', 'appearance', 'situation', 'greeting'], 
        historyLength: 50, 
        maxResponseTokens: 1000 
    });
    const [aiToolSettings, setAiToolSettings] = useState<AIToolSettings>({ architecture: 'single', toolConfigs: {} as any });
    
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
    const currentUserRoleRef = useRef<UserRole | null>(null);

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

            // Determine if we should fetch admin/mod tables
            const isAdminOrMod = currentUserRoleRef.current && ['Admin', 'Assistant Admin', 'Moderator'].includes(currentUserRoleRef.current);

            const results = await Promise.allSettled([
                fetchWithRetry('profiles'),
                fetchWithRetry('characters'),
                fetchWithRetry('app_settings'),
                fetchWithRetry('global_settings'),
                fetchWithRetry('api_connections'),
                fetchWithRetry('forum_categories'),
                fetchWithRetry('forum_threads'),
                fetchWithRetry('forum_posts'),
                fetchWithRetry('comments'),
                fetchWithRetry('notifications'),
                fetchWithRetry('reports'),
                fetchWithRetry('tickets'),
                fetchWithRetry('ai_alerts'),
                fetchWithRetry('dm_conversations'),
                fetchWithRetry('admin_folders'),
                fetchWithRetry('direct_messages')
            ]);

            const getResult = (index: number, fallback: any) => {
                const res = results[index];
                return res.status === 'fulfilled' && res.value !== null ? res.value : fallback;
            };

            const [
                profilesData, charactersData, appSettingsData, globalSettingsData, 
                apiConnectionsData, categoriesData, threadsData, postsData, 
                commentsData, notificationsData,
                reportsData, ticketsData, alertsData, dmConversationsData, foldersData, directMessagesData
            ] = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(i => getResult(i, []));

            if (profilesData.length > 0) {
                const mappedUsers = profilesData.map(mapDbUser);
                setAllUsers(mappedUsers);
                
                if (currentUserIdRef.current) {
                    const myNotifications = notificationsData
                        .filter((n: any) => n.user_id === currentUserIdRef.current)
                        .map((n: any) => ({
                            id: n.id,
                            type: n.type,
                            message: n.message,
                            relatedId: n.related_id,
                            fromUserId: n.from_user_id,
                            isRead: n.is_read,
                            timestamp: new Date(n.created_at).getTime()
                        }));

                    const myProfile = mappedUsers.find(u => u.id === currentUserIdRef.current);
                    if (myProfile) {
                        myProfile.profile.notifications = myNotifications;
                        setCurrentUser(myProfile);
                        currentUserRoleRef.current = myProfile.role;
                    }
                }
            }
            
            if (charactersData.length > 0) {
                const mappedCharacters = charactersData.map((c: any) => {
                    const char = mapDbCharacter(c);
                    if (commentsData.length > 0) {
                        const charComments = commentsData
                            .filter((com: any) => com.character_id === char.id)
                            .map((com: any) => {
                                const user = profilesData.find((p: any) => p.id === com.user_id);
                                return {
                                    id: com.id,
                                    userId: com.user_id,
                                    username: user?.profile?.name || 'Unknown',
                                    avatarUrl: user?.profile?.avatarUrl || '',
                                    text: com.text,
                                    timestamp: new Date(com.created_at).getTime(),
                                    parentId: com.parent_id,
                                    isSilenced: com.is_silenced
                                };
                            });
                        char.comments = charComments;
                    }
                    return char;
                });
                setCharacters(mappedCharacters);
            }

            if (apiConnectionsData.length > 0) setApiConnections(apiConnectionsData.map(mapDbConnection));
            if (categoriesData.length > 0) setForumCategories(categoriesData.map(mapDbCategory));
            if (threadsData.length > 0) setForumThreads(threadsData.map(mapDbThread));
            if (postsData.length > 0) setForumPosts(postsData.map(mapDbPost));
            
            if (reportsData.length > 0) setReports(reportsData.map(mapDbReport));
            if (ticketsData.length > 0) setTickets(ticketsData.map(mapDbTicket));
            if (alertsData.length > 0) setAiAlerts(alertsData.map(mapDbAIAlert));
            
            if (appSettingsData.length > 0) {
                const logoSetting = appSettingsData.find((s: any) => s.key === 'site_logo');
                if (logoSetting) setSiteLogo(logoSetting.value);

                const defaultConn = appSettingsData.find((s: any) => s.key === 'default_api_connection');
                if (defaultConn) setDefaultApiConnectionId(defaultConn.value);

                const aiCtx = appSettingsData.find((s: any) => s.key === 'ai_context_settings');
                if (aiCtx) setAiContextSettings(aiCtx.value);

                const aiTool = appSettingsData.find((s: any) => s.key === 'ai_tool_settings');
                if (aiTool && aiTool.value) {
                    setAiToolSettings({
                        architecture: aiTool.value.architecture || 'single',
                        toolConfigs: aiTool.value.toolConfigs || {}
                    });
                } else {
                    setAiToolSettings({ architecture: 'single', toolConfigs: {} as any });
                }
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

            if (dmConversationsData.length > 0) {
                const dmMap: Record<string, DMConversation> = {};
                
                dmConversationsData.forEach((convo: any) => {
                    const conversationMessages = directMessagesData
                        .filter((m: any) => m.conversation_user_id === convo.user_id)
                        .map((m: any) => ({
                            id: m.id,
                            senderId: m.sender_id,
                            text: m.text,
                            imageUrl: m.image_url,
                            timestamp: new Date(m.created_at).getTime()
                        }))
                        .sort((a: any, b: any) => a.timestamp - b.timestamp);

                    dmMap[convo.user_id] = {
                        userId: convo.user_id,
                        messages: conversationMessages,
                        hasUnreadByUser: convo.has_unread_by_user,
                        hasUnreadByAdmin: convo.has_unread_by_admin,
                        folderId: convo.folder_id
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
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error) throw error;
                
                if (session?.user) {
                    currentUserIdRef.current = session.user.id;
                    const { data: userProfile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
                    if (userProfile) {
                        setCurrentUser(mapDbUser(userProfile));
                        currentUserRoleRef.current = userProfile.role;
                    } else {
                        const newProfile = {
                            id: session.user.id,
                            username: session.user.email?.split('@')[0] || 'User',
                            profile: { email: session.user.email, name: session.user.email?.split('@')[0] || 'User' }
                        };
                        const { error: createError } = await supabase.from('profiles').insert(newProfile);
                        if(!createError) {
                            setCurrentUser(mapDbUser(newProfile));
                            currentUserRoleRef.current = 'User';
                        }
                    }

                    // Fetch User Specific Data (Chat histories and settings)
                    const { data: userData } = await supabase.from('user_character_data').select('*').eq('user_id', session.user.id);
                    if (userData) {
                        const dataMap: Record<string, any> = {};
                        userData.forEach((row: any) => {
                            dataMap[row.character_id] = {
                                settings: row.settings,
                                stats: row.stats,
                                narrative_state: row.narrative_state
                            };
                        });
                        setUserCharacterData(prev => ({...prev, [session.user.id]: dataMap}));
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

            } catch (err: any) {
                console.error("Auth Init Error:", err);
                // If refresh token is invalid, clear session to prevent loop/error state
                if (err.message && (err.message.includes("Refresh Token") || err.message.includes("refresh_token"))) {
                    console.warn("Invalid Refresh Token detected. Clearing session.");
                    await supabase.auth.signOut();
                    setCurrentUser(null);
                }
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
                currentUserRoleRef.current = null;
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [refreshGlobalData]);

    // Authentication
    const login = async (email?: string, password?: string) => {
        if (!email || !password) throw new Error("Email and password required");
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
    };

    const signup = async (username: string, password?: string, email?: string) => {
        if (!email || !password) throw new Error("Email and password required");
        const { data, error } = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
                data: {
                    username: username,
                    name: username
                }
            }
        });
        if (error) throw error;
    };

    const loginWithGoogle = async () => { console.log("Google Login Triggered"); };
    const logout = async () => { await supabase.auth.signOut(); setCurrentUser(null); };
    const resetPasswordForEmail = async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) throw error;
    };

    // Character Management
    const saveCharacter = async (character: Character, avatarFile: File | null) => {
        let avatarUrl = character.avatarUrl;
        if (avatarFile) {
             const fileExt = avatarFile.name.split('.').pop();
             const fileName = `${Math.random()}.${fileExt}`;
             const filePath = `avatars/${fileName}`;
             const { error: uploadError } = await supabase.storage.from('App-assets').upload(filePath, avatarFile);
             if (uploadError) throw uploadError;
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
            summary: character.summary,
            likes: character.likes || []
        };

        const { error } = await supabase.from('characters').upsert(characterData);
        if (error) throw error;
        await refreshGlobalData();
    };

    const deleteCharacter = async (id: string) => { 
        await supabase.from('characters').delete().eq('id', id); 
        await refreshGlobalData(); 
    };
    
    const silenceCharacter = async (id: string, isSilenced: boolean) => {
        await supabase.from('characters').update({ is_silenced_by_admin: isSilenced }).eq('id', id);
        await refreshGlobalData();
    };

    // User Management
    const updateUserProfile = async (profile: UserProfile, avatarFile: File | null) => {
        if (!currentUser) return;
        await updateAnyUserProfile(currentUser.id, profile, avatarFile);
    };

    const updateAnyUserProfile = async (userId: string, profile: UserProfile, avatarFile: File | null) => {
        let avatarUrl = profile.avatarUrl;
        if (avatarFile) {
             const fileExt = avatarFile.name.split('.').pop();
             const fileName = `avatars/${Math.random()}.${fileExt}`;
             const filePath = `avatars/${fileName}`;
             const { error: uploadError } = await supabase.storage.from('App-assets').upload(filePath, avatarFile);
             if (!uploadError) {
                 const { data: { publicUrl } } = supabase.storage.from('App-assets').getPublicUrl(filePath);
                 avatarUrl = publicUrl;
             }
        }
        
        const updatedProfile = { ...profile, avatarUrl };
        const { error } = await supabase.from('profiles').update({ 
            username: profile.name,
            profile: updatedProfile 
        }).eq('id', userId);
        
        if (error) throw error;
        if (currentUser && currentUser.id === userId) {
            setCurrentUser(prev => prev ? { ...prev, profile: updatedProfile, username: profile.name } : null);
        }
        await refreshGlobalData();
    };

    const updateUserType = async (userId: string, type: UserType) => {
        await supabase.from('profiles').update({ user_type: type }).eq('id', userId);
        await refreshGlobalData();
    };

    const updateUserRole = async (userId: string, role: UserRole) => {
        await supabase.from('profiles').update({ role }).eq('id', userId);
        await refreshGlobalData();
    };

    const silenceUser = async (userId: string, isSilenced: boolean) => {
        await supabase.from('profiles').update({ is_silenced: isSilenced }).eq('id', userId);
        await refreshGlobalData();
    };

    const deleteUser = async (userId: string) => {
        await supabase.from('profiles').delete().eq('id', userId);
        await refreshGlobalData();
    };

    const followUser = async (userId: string) => {
        if (!currentUser) return;
        const isFollowing = currentUser.profile.following.includes(userId);
        let newFollowing = isFollowing 
            ? currentUser.profile.following.filter(id => id !== userId)
            : [...currentUser.profile.following, userId];
            
        const updatedProfile = { ...currentUser.profile, following: newFollowing };
        await supabase.from('profiles').update({ profile: updatedProfile }).eq('id', currentUser.id);
        setCurrentUser({ ...currentUser, profile: updatedProfile });
        await refreshGlobalData();
    };

    // Chat Data
    const updateChatHistory = async (characterId: string, messages: ChatMessage[]) => {
        if (!currentUser) return;
        await supabase.from('chat_histories').upsert({ user_id: currentUser.id, character_id: characterId, messages });
        setChatHistories(prev => ({
            ...prev,
            [currentUser.id]: { ...prev[currentUser.id], [characterId]: messages }
        }));
    };

    const deleteChatHistory = async (characterId: string) => {
        if (!currentUser) return;
        await supabase.from('chat_histories').delete().match({ user_id: currentUser.id, character_id: characterId });
        setChatHistories(prev => {
            const newState = { ...prev };
            if (newState[currentUser.id]) delete newState[currentUser.id][characterId];
            return newState;
        });
    };

    const saveUserCharacterData = async (userId: string, characterId: string, data: any) => {
        const existing = userCharacterData[userId]?.[characterId] || {};
        const newData = { ...existing, ...data };
        
        await supabase.from('user_character_data').upsert({
            user_id: userId,
            character_id: characterId,
            settings: newData.settings,
            stats: newData.stats,
            narrative_state: newData.narrative_state
        });
        
        setUserCharacterData(prev => ({
            ...prev,
            [userId]: { ...prev[userId], [characterId]: newData }
        }));
    };

    // Interactions
    const toggleFavorite = async (characterId: string) => {
        if (!currentUser) return;
        const isFav = currentUser.profile.favoriteCharacterIds.includes(characterId);
        let newFavs = isFav 
            ? currentUser.profile.favoriteCharacterIds.filter(id => id !== characterId)
            : [...currentUser.profile.favoriteCharacterIds, characterId];
            
        const updatedProfile = { ...currentUser.profile, favoriteCharacterIds: newFavs };
        await supabase.from('profiles').update({ profile: updatedProfile }).eq('id', currentUser.id);
        setCurrentUser({ ...currentUser, profile: updatedProfile });
    };

    const likeCharacter = async (characterId: string) => {
        if (!currentUser) return;
        const character = characters.find(c => c.id === characterId);
        if (!character) return;
        
        const hasLiked = character.likes.includes(currentUser.id);
        let newLikes = hasLiked 
            ? character.likes.filter(id => id !== currentUser.id)
            : [...character.likes, currentUser.id];
            
        await supabase.from('characters').update({ likes: newLikes }).eq('id', characterId);
        setCharacters(prev => prev.map(c => c.id === characterId ? { ...c, likes: newLikes } : c));
    };

    const addComment = async (characterId: string, text: string, parentId?: string) => {
        if (!currentUser) return;
        await supabase.from('comments').insert({
            character_id: characterId,
            user_id: currentUser.id,
            text: text,
            parent_id: parentId || null
        });
        await refreshGlobalData();
    };

    const deleteComment = async (characterId: string, commentId: string) => {
        await supabase.from('comments').delete().eq('id', commentId);
        await refreshGlobalData();
    };

    const silenceComment = async (characterId: string, commentId: string, isSilenced: boolean) => {
        await supabase.from('comments').update({ is_silenced: isSilenced }).eq('id', commentId);
        await refreshGlobalData();
    };

    const editComment = async (characterId: string, commentId: string, newText: string) => {
        await supabase.from('comments').update({ text: newText }).eq('id', commentId);
        await refreshGlobalData();
    };

    // Forums
    const createCategory = async (category: Omit<ForumCategory, 'id'>) => {
        await supabase.from('forum_categories').insert({
            name: category.name,
            description: category.description,
            parent_id: category.parentId,
            is_locked: category.isLocked
        });
        await refreshGlobalData();
    };

    const updateCategory = async (categoryId: string, data: Partial<ForumCategory>) => {
        await supabase.from('forum_categories').update({
            name: data.name,
            description: data.description,
            parent_id: data.parentId,
            is_locked: data.isLocked
        }).eq('id', categoryId);
        await refreshGlobalData();
    };

    const deleteCategory = async (categoryId: string) => {
        await supabase.from('forum_categories').delete().eq('id', categoryId);
        await refreshGlobalData();
    };

    const createThread = async (thread: Omit<ForumThread, 'id'|'createdAt'|'viewCount'|'isSilenced'>, initialPostContent: string): Promise<string> => {
        // 1. Insert Thread
        const { data: threadData, error: threadError } = await supabase.from('forum_threads').insert({
            category_id: thread.categoryId,
            author_id: thread.authorId,
            title: thread.title,
            tags: thread.tags
        }).select().single();
        
        if(threadError) throw threadError;

        // 2. Insert Initial Post
        const { data: postData, error: postError } = await supabase.from('forum_posts').insert({
            thread_id: threadData.id,
            author_id: thread.authorId,
            content: initialPostContent,
            is_character_post: false
        }).select().single();

        if (postError) {
            // Rollback thread creation if post fails
            await supabase.from('forum_threads').delete().eq('id', threadData.id);
            throw postError;
        }

        // 3. Optimistically update local state to show the new thread AND post immediately
        const newThread: ForumThread = {
            id: threadData.id,
            categoryId: thread.categoryId,
            authorId: thread.authorId,
            title: thread.title,
            createdAt: new Date(threadData.created_at).getTime(),
            tags: thread.tags,
            isLocked: false,
            isPinned: false,
            isSilenced: false,
            viewCount: 0
        };
        setForumThreads(prev => [newThread, ...prev]);

        if (postData) {
            const newPost: ForumPost = {
                id: postData.id,
                threadId: postData.thread_id,
                authorId: postData.author_id,
                isCharacterPost: false,
                content: postData.content,
                createdAt: new Date(postData.created_at).getTime(),
                upvotes: [],
                downvotes: [],
                isEdited: false,
                isSilenced: false
            };
            setForumPosts(prev => [...prev, newPost]);
        }

        // Trigger global refresh for consistency
        refreshGlobalData();
        return threadData.id;
    };

    const deleteThread = async (threadId: string) => {
        await supabase.from('forum_threads').delete().eq('id', threadId);
        await refreshGlobalData();
    };

    const togglePinThread = async (threadId: string) => {
        const thread = forumThreads.find(t => t.id === threadId);
        if (thread) {
            await supabase.from('forum_threads').update({ is_pinned: !thread.isPinned }).eq('id', threadId);
            await refreshGlobalData();
        }
    };

    const toggleLockThread = async (threadId: string) => {
        const thread = forumThreads.find(t => t.id === threadId);
        if (thread) {
            await supabase.from('forum_threads').update({ is_locked: !thread.isLocked }).eq('id', threadId);
            await refreshGlobalData();
        }
    };

    const silenceThread = async (threadId: string, isSilenced: boolean) => {
        await supabase.from('forum_threads').update({ is_silenced: isSilenced }).eq('id', threadId);
        await refreshGlobalData();
    };

    const moveThread = async (threadId: string, newCategoryId: string) => {
        await supabase.from('forum_threads').update({ category_id: newCategoryId }).eq('id', threadId);
        await refreshGlobalData();
    };

    const createPost = async (post: Omit<ForumPost, 'id'|'createdAt'|'isEdited'|'isSilenced'>) => {
        await supabase.from('forum_posts').insert({
            thread_id: post.threadId,
            author_id: post.authorId,
            is_character_post: post.isCharacterPost,
            content: post.content
        });
        await refreshGlobalData();
    };

    const editPost = async (postId: string, content: string) => {
        await supabase.from('forum_posts').update({ content, is_edited: true }).eq('id', postId);
        await refreshGlobalData();
    };

    const deletePost = async (postId: string) => {
        await supabase.from('forum_posts').delete().eq('id', postId);
        await refreshGlobalData();
    };

    const silencePost = async (postId: string, isSilenced: boolean) => {
        await supabase.from('forum_posts').update({ is_silenced: isSilenced }).eq('id', postId);
        await refreshGlobalData();
    };

    const togglePostVote = async (postId: string, type: 'up' | 'down') => {
        if (!currentUser) return;
        const post = forumPosts.find(p => p.id === postId);
        if (!post) return;

        let upvotes = [...post.upvotes];
        let downvotes = [...post.downvotes];

        if (type === 'up') {
            if (upvotes.includes(currentUser.id)) upvotes = upvotes.filter(id => id !== currentUser.id);
            else {
                upvotes.push(currentUser.id);
                downvotes = downvotes.filter(id => id !== currentUser.id);
            }
        } else {
            if (downvotes.includes(currentUser.id)) downvotes = downvotes.filter(id => id !== currentUser.id);
            else {
                downvotes.push(currentUser.id);
                upvotes = upvotes.filter(id => id !== currentUser.id);
            }
        }

        await supabase.from('forum_posts').update({ upvotes, downvotes }).eq('id', postId);
        
        // Optimistic update for immediate UI feedback
        setForumPosts(prev => prev.map(p => p.id === postId ? { ...p, upvotes, downvotes } : p));
    };

    const getPostsForThread = (threadId: string) => {
        return forumPosts.filter(p => p.threadId === threadId);
    };

    // Settings
    const updateGlobalSettings = async (settings: GlobalSettings) => {
        await supabase.from('global_settings').upsert({ id: true, settings });
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

    // Connections
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
        if (data) setApiConnections(prev => [...prev, mapDbConnection(data)]);
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
        setApiConnections(prev => prev.map(c => c.id === connection.id ? connection : c));
    };

    const deleteApiConnection = async (id: string) => {
        await supabase.from('api_connections').delete().eq('id', id);
        setApiConnections(prev => prev.filter(c => c.id !== id));
    };

    const toggleApiConnectionActive = async (id: string) => {
        const conn = apiConnections.find(c => c.id === id);
        if (conn) await updateApiConnection({ ...conn, isActive: !conn.isActive });
    };

    const setDefaultApiConnection = async (id: string) => {
        await supabase.from('app_settings').upsert({ key: 'default_api_connection', value: id });
        setDefaultApiConnectionId(id);
    };

    const findConnectionForModel = (model: string) => {
        let conn = apiConnections.find(c => c.isActive && c.models.includes(model));
        if (!conn && defaultApiConnectionId) {
            conn = apiConnections.find(c => c.id === defaultApiConnectionId);
        }
        return conn;
    };

    const getToolConfig = (tool: AITool) => {
        const config = aiToolSettings.toolConfigs[tool];
        if (!config || !config.connectionId) return undefined;
        const connection = apiConnections.find(c => c.id === config.connectionId);
        if (!connection || !connection.isActive) return undefined;
        return { connection, model: config.modelOverride };
    };

    const updateSiteLogo = async (file: File) => {
        const fileName = `logo/site-logo-${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage.from('App-assets').upload(fileName, file);
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage.from('App-assets').getPublicUrl(fileName);
        await supabase.from('app_settings').upsert({ key: 'site_logo', value: publicUrl });
        setSiteLogo(publicUrl);
    };

    const resetSiteLogo = async () => {
        await supabase.from('app_settings').upsert({ key: 'site_logo', value: null });
        setSiteLogo(null);
    };

    // Reports & Tickets
    const submitReport = async (report: Omit<Report, 'id' | 'reporterId' | 'timestamp' | 'isResolved' | 'notes'>) => {
        if (!currentUser) return;
        const { data, error } = await supabase.from('reports').insert({
            reporter_id: currentUser.id,
            entity_type: report.entityType,
            entity_id: report.entityId,
            reason: report.reason,
            description: report.description,
            content_snapshot: report.contentSnapshot,
            entity_creator_id: report.entityCreatorId
        }).select().single();
        if (error) throw error;
        if(data) {
            setReports(prev => [{...report, id: data.id, reporterId: currentUser.id, timestamp: Date.parse(data.created_at), isResolved: false, notes: []} as Report, ...prev]);
        }
    };

    const resolveReport = async (reportId: string, isResolved: boolean) => {
        await supabase.from('reports').update({ is_resolved: isResolved }).eq('id', reportId);
        setReports(prev => prev.map(r => r.id === reportId ? { ...r, isResolved } : r));
    };

    const addNoteToReport = async (reportId: string, note: string) => {
        const report = reports.find(r => r.id === reportId);
        if (!report) return;
        const updatedNotes = [...(report.notes || []), note];
        await supabase.from('reports').update({ notes: updatedNotes }).eq('id', reportId);
        setReports(prev => prev.map(r => r.id === reportId ? { ...r, notes: updatedNotes } : r));
    };

    const deleteReport = async (reportId: string) => {
        await supabase.from('reports').delete().eq('id', reportId);
        setReports(prev => prev.filter(r => r.id !== reportId));
        await refreshGlobalData();
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
        if(data) {
            setTickets(prev => [{...ticket, id: data.id, submitterId: currentUser.id, status: 'New', timestamp: Date.parse(data.created_at)} as Ticket, ...prev]);
        }
    };

    const updateTicketStatus = async (ticketId: string, status: string) => {
        await supabase.from('tickets').update({ status }).eq('id', ticketId);
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: status as any } : t));
    };

    const createTicketFolder = async (name: string) => {
        const { data } = await supabase.from('admin_folders').insert({ type: 'ticket_folder', name }).select().single();
        if(data) setTicketFolders(prev => [...prev, data]);
    };

    const moveTicketToFolder = async (ticketId: string, folderId: string | null) => {
        await supabase.from('tickets').update({ folder_id: folderId }).eq('id', ticketId);
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, folderId } : t));
    };

    const deleteTicket = async (ticketId: string) => {
        await supabase.from('tickets').delete().eq('id', ticketId);
        setTickets(prev => prev.filter(t => t.id !== ticketId));
        await refreshGlobalData();
    };

    // AI Alerts
    const updateAIAlertStatus = async (alertId: string, status: string) => {
        await supabase.from('ai_alerts').update({ status }).eq('id', alertId);
        setAiAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: status as AIAlertStatus } : a));
    };

    const deleteAIAlert = async (alertId: string) => {
        await supabase.from('ai_alerts').delete().eq('id', alertId);
        setAiAlerts(prev => prev.filter(a => a.id !== alertId));
    };

    const createAIAlertFolder = async (name: string) => {
        const { data } = await supabase.from('admin_folders').insert({ type: 'ai_alert_folder', name }).select().single();
        if(data) setAiAlertFolders(prev => [...prev, data]);
    };

    const moveAIAlertToFolder = async (alertId: string, folderId: string | null) => {
        await supabase.from('ai_alerts').update({ folder_id: folderId }).eq('id', alertId);
        setAiAlerts(prev => prev.map(a => a.id === alertId ? { ...a, folderId } : a));
    };

    const addNoteToAIAlert = async (alertId: string, note: string) => {
        const alert = aiAlerts.find(a => a.id === alertId);
        if(!alert) return;
        const updatedNotes = [...(alert.notes || []), note];
        await supabase.from('ai_alerts').update({ notes: updatedNotes }).eq('id', alertId);
        setAiAlerts(prev => prev.map(a => a.id === alertId ? { ...a, notes: updatedNotes } : a));
    };

    const updateAIAlertFeedback = async (alertId: string, feedback: 'good' | 'bad') => {
        await supabase.from('ai_alerts').update({ feedback }).eq('id', alertId);
        setAiAlerts(prev => prev.map(a => a.id === alertId ? { ...a, feedback } : a));
    };

    // Direct Messages
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

        await supabase.from('direct_messages').insert(newMessage);
        await refreshGlobalData();
    };

    const markDMAsReadByUser = async (userId: string) => {
        await supabase.from('direct_messages').update({ is_read_by_user: true }).eq('conversation_user_id', userId);
        await supabase.from('dm_conversations').update({ has_unread_by_user: false }).eq('user_id', userId);
        setDmConversations(prev => ({ ...prev, [userId]: { ...prev[userId], hasUnreadByUser: false } }));
    };

    const markDMAsReadByAdmin = async (userId: string) => {
        await supabase.from('direct_messages').update({ is_read_by_admin: true }).eq('conversation_user_id', userId);
        await supabase.from('dm_conversations').update({ has_unread_by_admin: false }).eq('user_id', userId);
        setDmConversations(prev => ({ ...prev, [userId]: { ...prev[userId], hasUnreadByAdmin: false } }));
    };

    const markAllDMsAsReadByUser = async () => {
        if(!currentUser) return;
        await supabase.from('direct_messages').update({ is_read_by_user: true }).eq('conversation_user_id', currentUser.id);
        await supabase.from('dm_conversations').update({ has_unread_by_user: false }).eq('user_id', currentUser.id);
        await markCategoryAsRead('Messages');
        await refreshGlobalData();
    };

    const markAllDMsAsReadByAdmin = async () => {
        await supabase.from('direct_messages').update({ is_read_by_admin: true }).eq('is_read_by_admin', false);
        await supabase.from('dm_conversations').update({ has_unread_by_admin: false });
        setDmConversations(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(k => next[k].hasUnreadByAdmin = false);
            return next;
        });
    };

    const createDMFolder = async (name: string) => {
        const { data } = await supabase.from('admin_folders').insert({ type: 'dm_folder', name }).select().single();
        if(data) setDmFolders(prev => [...prev, data]);
    };

    const moveDMConversationToFolder = async (userId: string, folderId: string | null) => {
        await supabase.from('dm_conversations').update({ folder_id: folderId }).eq('user_id', userId);
        setDmConversations(prev => ({ ...prev, [userId]: { ...prev[userId], folderId } }));
    };

    const deleteDMConversation = async (userId: string) => {
        // Delete all messages first (if not cascading)
        await supabase.from('direct_messages').delete().eq('conversation_user_id', userId);
        // Delete the conversation entry
        await supabase.from('dm_conversations').delete().eq('user_id', userId);
        
        setDmConversations(prev => {
            const newMap = { ...prev };
            delete newMap[userId];
            return newMap;
        });
        await refreshGlobalData();
    };

    // Notifications
    const markNotificationsAsRead = async () => {
        if (!currentUser) return;
        await supabase.from('notifications').update({ is_read: true }).eq('user_id', currentUser.id);
        await refreshGlobalData();
    };

    const deleteNotifications = async (ids: string[]) => {
        if (!currentUser) return;
        if (ids.length === 0) return;
        
        // Optimistic update FIRST to make UI responsive
        const previousUser = currentUser;
        const updatedNotifications = currentUser.profile.notifications.filter(n => !ids.includes(n.id));
        setCurrentUser({
             ...currentUser,
             profile: {
                 ...currentUser.profile,
                 notifications: updatedNotifications
             }
        });

        const { error } = await supabase.from('notifications').delete().eq('user_id', currentUser.id).in('id', ids);
        
        if (error) {
            console.error("Failed to delete notifications:", error);
            // Revert optimistic update
            setCurrentUser(previousUser);
            throw error; 
        }
        
        // NOTE: We intentionally DO NOT call refreshGlobalData() here.
        // The optimistic update handles the UI, and calling a global refresh would 
        // block the function return until all unrelated data is fetched, making the delete feel slow.
        // The state will sync on the next natural refresh or page load.
    };

    const clearAllNotifications = async () => {
        if (!currentUser) return;
        
        // Optimistic update
        const previousUser = currentUser;
        setCurrentUser({
             ...currentUser,
             profile: {
                 ...currentUser.profile,
                 notifications: []
             }
        });

        const { error } = await supabase.from('notifications').delete().eq('user_id', currentUser.id);
        
        if (error) {
            console.error("Failed to clear notifications:", error);
            setCurrentUser(previousUser);
        }

        // Similar to deleteNotifications, we skip the blocking refresh to keep UI snappy
    };

    const markSingleNotificationAsRead = async (notificationId: string) => {
        if (!currentUser) return;
        await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
        // Only refresh if absolutely necessary, but read status is less critical than deletion
        await refreshGlobalData();
    };

    const markCategoryAsRead = async (category: string) => {
        if (!currentUser) return;
        let types: Notification['type'][] = [];
        if (category === 'Following') types = ['NEW_BOT', 'NEW_FOLLOWER'];
        else if (category === 'My Characters') types = ['NEW_LIKE', 'NEW_COMMENT'];
        else if (category === 'Replies') types = ['REPLY'];
        else if (category === 'Messages') types = ['NEW_DM'];
        
        if (types.length > 0) {
            await supabase.from('notifications').update({ is_read: true }).eq('user_id', currentUser.id).in('type', types);
            await refreshGlobalData();
        }
    };

    const markAdminNotificationsAsRead = async (types: Notification['type'][]) => {
        if (!currentUser) return;
        await supabase.from('notifications').update({ is_read: true }).eq('user_id', currentUser.id).in('type', types);
        await refreshGlobalData();
    };

    // Misc
    const refreshAdminData = async () => { await refreshGlobalData(); };
    
    // Placeholder
    const runFullModerationScan = async () => { console.log("Manual scan triggered"); };

    const findUserById = (userId: string) => allUsers.find(u => u.id === userId) || null;

    // Legacy accessor helper
    const narrativeStates = useMemo(() => {
        const states: Record<string, Record<string, any>> = {};
        if (!userCharacterData) return states;
        Object.keys(userCharacterData).forEach(uid => {
            states[uid] = {};
            Object.keys(userCharacterData[uid]).forEach(cid => {
                states[uid][cid] = userCharacterData[uid][cid].narrative_state;
            });
        });
        return states;
    }, [userCharacterData]);

    const value: AuthContextType = {
        currentUser,
        allUsers,
        characters,
        chatHistories,
        apiConnections,
        defaultApiConnectionId,
        globalSettings,
        aiContextSettings,
        aiToolSettings,
        reports,
        tickets,
        ticketFolders,
        aiAlerts,
        aiAlertFolders,
        dmConversations,
        dmFolders,
        forumCategories,
        forumThreads,
        forumPosts,
        siteLogo,
        loading,
        login,
        signup,
        loginWithGoogle,
        logout,
        resetPasswordForEmail,
        saveCharacter,
        deleteCharacter,
        silenceCharacter,
        updateUserProfile,
        updateAnyUserProfile,
        updateUserType,
        updateUserRole,
        silenceUser,
        deleteUser,
        followUser,
        findUserById,
        updateChatHistory,
        deleteChatHistory,
        saveUserCharacterData,
        toggleFavorite,
        likeCharacter,
        addComment,
        editComment,
        deleteComment,
        silenceComment,
        createCategory,
        updateCategory,
        deleteCategory,
        createThread,
        deleteThread,
        moveThread,
        togglePinThread,
        toggleLockThread,
        silenceThread,
        createPost,
        deletePost,
        editPost,
        silencePost,
        togglePostVote,
        getPostsForThread,
        updateGlobalSettings,
        updateAIContextSettings,
        updateAIToolSettings,
        addApiConnection,
        updateApiConnection,
        deleteApiConnection,
        toggleApiConnectionActive,
        setDefaultApiConnection,
        findConnectionForModel,
        getToolConfig,
        updateSiteLogo,
        resetSiteLogo,
        submitReport,
        resolveReport,
        addNoteToReport,
        deleteReport,
        submitTicket,
        updateTicketStatus,
        createTicketFolder,
        moveTicketToFolder,
        deleteTicket,
        updateAIAlertStatus,
        deleteAIAlert,
        createAIAlertFolder,
        moveAIAlertToFolder,
        addNoteToAIAlert,
        updateAIAlertFeedback,
        sendDirectMessage,
        markDMAsReadByUser,
        markDMAsReadByAdmin,
        markAllDMsAsReadByAdmin,
        markAllDMsAsReadByUser,
        createDMFolder,
        moveDMConversationToFolder,
        deleteDMConversation,
        markNotificationsAsRead,
        deleteNotifications,
        clearAllNotifications,
        markSingleNotificationAsRead,
        markCategoryAsRead,
        markAdminNotificationsAsRead,
        refreshAdminData,
        runFullModerationScan,
        userCharacterData,
        narrativeStates
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
