
import React, { useState, useContext, useMemo, useEffect, useCallback, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { User, Character, Report, Ticket, AIAlert, DMConversation, DirectMessage, TicketStatus, Comment, UserType, TicketFolder, DMFolder, Notification, AIAlertStatus, AppView, ForumThread, ForumPost } from '../types';
import ConfirmationModal from './ConfirmationModal';
import ProfileEditModal from './ProfileEditModal';
import Avatar from './Avatar';
import { SendIcon, TicketIcon, PlusIcon, UploadIcon, CloseIcon, ThumbsUpIcon, ThumbsDownIcon, DeleteIcon } from './Icons';
import ForumModerationTab from './ForumModerationTab';

interface DmUserContext {
    user: User;
    sourceFolder?: 'Reports' | 'Ticketing System' | 'AI Alerts';
}

interface ModeratorConsoleViewProps {
  setSelectedCharacter: (character: Character) => void;
  setSelectedCreator: (user: User) => void;
  setView: (view: AppView) => void;
  initialTab?: string;
  preselectedUser?: User | null;
}

const ModeratorConsoleView: React.FC<ModeratorConsoleViewProps> = ({ setSelectedCharacter, setSelectedCreator, setView, initialTab, preselectedUser }) => {
    const auth = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState(initialTab || 'reports');
    const [dmUserContext, setDmUserContext] = useState<DmUserContext | null>(preselectedUser ? { user: preselectedUser } : null);

    useEffect(() => {
        if (initialTab) setActiveTab(initialTab);
    }, [initialTab]);
    
    useEffect(() => {
        if (preselectedUser) {
            setDmUserContext({ user: preselectedUser });
        }
    }, [preselectedUser]);

    const openDmTabForUser = (user: User, sourceFolder?: 'Reports' | 'Ticketing System' | 'AI Alerts') => {
        setDmUserContext({ user, sourceFolder });
        setActiveTab('dms');
    };
    
    const handleTabClick = (tabId: string) => {
        setActiveTab(tabId);
        // Note: We removed auto-clearing here to allow manual clearing via button as requested
    };


    if (!auth || !['Admin', 'Assistant Admin', 'Moderator'].includes(auth.currentUser?.role || '')) {
        return <p className="p-8 text-center text-red-400">Access Denied.</p>;
    }

    const { reports, aiAlerts, tickets, dmConversations, currentUser } = auth;
    
    const unreadNotifs = useMemo(() => {
        const counts = { reports: 0, alerts: 0, tickets: 0 };
        if (!currentUser?.profile.notifications) return counts;

        currentUser.profile.notifications.forEach(n => {
            if (!n.isRead) {
                if (n.type === 'NEW_REPORT') counts.reports++;
                if (n.type === 'NEW_AI_ALERT') counts.alerts++;
                if (n.type === 'NEW_TICKET') counts.tickets++;
            }
        });
        return counts;

    }, [currentUser?.profile.notifications]);

    const unreadDMs = Object.values(dmConversations).filter((c: DMConversation) => c.hasUnreadByAdmin).length;

    const tabs = [
        { id: 'reports', label: 'Reports', count: unreadNotifs.reports },
        { id: 'ai_alerts', label: 'AI Mod Alerts', count: unreadNotifs.alerts },
        { id: 'tickets', label: 'Ticketing System', count: unreadNotifs.tickets },
        { id: 'dms', label: 'Direct Messages', count: unreadDMs },
        { id: 'forum', label: 'Forum Moderation', count: 0 }, // Count can be added later
    ];

    return (
        <div className="p-4 sm:p-6 md:p-8 w-full h-full flex flex-col">
            <h1 className="text-3xl font-bold mb-6 text-text-primary flex items-center gap-3 flex-shrink-0"><TicketIcon className="w-8 h-8"/> Moderator Console</h1>
            <div className="border-b border-border mb-6 flex-shrink-0">
                <nav className="-mb-px flex space-x-2 sm:space-x-6 overflow-x-auto" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabClick(tab.id)}
                            className={`${
                                activeTab === tab.id
                                ? 'border-accent-primary text-accent-primary'
                                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'
                            } whitespace-nowrap py-4 px-1 sm:px-2 border-b-2 font-medium text-sm flex items-center gap-2`}
                        >
                            {tab.label}
                            {tab.count > 0 && <span className="bg-tertiary text-accent-primary text-xs font-semibold px-2 py-0.5 rounded-full">{tab.count}</span>}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="bg-secondary p-4 sm:p-6 rounded-lg border border-border flex-1 overflow-y-auto">
                {activeTab === 'reports' && <ReportsTab openDmForUser={openDmTabForUser} setSelectedCharacter={setSelectedCharacter} setSelectedCreator={setSelectedCreator} unreadCount={unreadNotifs.reports} />}
                {activeTab === 'ai_alerts' && <AIModAlertsTab openDmForUser={openDmTabForUser} setSelectedCharacter={setSelectedCharacter} setSelectedCreator={setSelectedCreator} setView={setView} unreadCount={unreadNotifs.alerts} />}
                {activeTab === 'tickets' && <TicketingSystemTab openDmForUser={openDmTabForUser} setSelectedCreator={setSelectedCreator} unreadCount={unreadNotifs.tickets} />}
                {activeTab === 'dms' && <DirectMessagesTab preselectedUserContext={dmUserContext} setSelectedCreator={setSelectedCreator} />}
                {activeTab === 'forum' && <ForumModerationTab setSelectedCharacter={setSelectedCharacter} setSelectedCreator={setSelectedCreator} />}
            </div>
        </div>
    );
};

const TabFilter: React.FC<{showResolved: boolean, setShowResolved: (val: boolean) => void, children?: React.ReactNode}> = ({showResolved, setShowResolved, children}) => (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
        {children}
        <div className="flex items-center gap-2 p-1 bg-primary border border-border rounded-md flex-shrink-0">
            <button onClick={() => setShowResolved(false)} className={`px-3 py-1 text-sm rounded ${!showResolved ? 'bg-accent-primary text-white' : 'hover:bg-hover'}`}>Pending</button>
            <button onClick={() => setShowResolved(true)} className={`px-3 py-1 text-sm rounded ${showResolved ? 'bg-accent-primary text-white' : 'hover:bg-hover'}`}>Resolved</button>
        </div>
    </div>
);

interface ReportsTabProps {
  openDmForUser: (user: User, sourceFolder: 'Reports') => void;
  setSelectedCharacter: (character: Character) => void;
  setSelectedCreator: (user: User) => void;
  unreadCount: number;
}

const ReportsTab: React.FC<ReportsTabProps> = ({ openDmForUser, setSelectedCharacter, setSelectedCreator, unreadCount }) => {
    const auth = useContext(AuthContext);
    const [showResolved, setShowResolved] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
    const [deleteAction, setDeleteAction] = useState<{ type: 'character' | 'user' | 'comment', id: string, secondaryId?: string, name: string } | null>(null);
    
    const { reports = [], findUserById, characters = [], silenceUser, deleteUser, deleteCharacter, silenceCharacter, deleteComment, resolveReport, addNoteToReport, silenceComment, markAdminNotificationsAsRead } = auth || ({} as any);

    const filteredReports = useMemo(() => {
         return reports
            .filter(r => r.isResolved === showResolved)
            .filter(r => {
                if (!searchTerm) return true;
                const lowerSearch = searchTerm.toLowerCase();
                const reporter = findUserById?.(r.reporterId);
                const creator = findUserById?.(r.entityCreatorId || '');

                return (
                    r.reason.toLowerCase().includes(lowerSearch) ||
                    (r.description && r.description.toLowerCase().includes(lowerSearch)) ||
                    (r.contentSnapshot && r.contentSnapshot.toLowerCase().includes(lowerSearch)) ||
                    (reporter && reporter.profile.name.toLowerCase().includes(lowerSearch)) ||
                    (creator && creator.profile.name.toLowerCase().includes(lowerSearch))
                );
            });
    }, [reports, showResolved, searchTerm, findUserById]);

    const getEntity = (report: Report): { character?: Character, user?: User, comment?: Comment } => {
        if (report.entityType === 'character') return { character: characters.find(c => c.id === report.entityId) };
        if (report.entityType === 'user') return { user: findUserById?.(report.entityId) };
        if (report.entityType === 'comment' || report.entityType === 'message') {
            const character = characters.find(c => c.comments.some(com => com.id === report.entityId));
            const comment = character?.comments.find(com => com.id === report.entityId);
            return { character, comment };
        }
        return {};
    };
    
     const handleAddNote = (reportId: string) => {
        if (addNoteToReport && noteInputs[reportId]?.trim()) {
            addNoteToReport(reportId, noteInputs[reportId]);
            setNoteInputs(prev => ({ ...prev, [reportId]: '' }));
        }
    };

    const handleConfirmDelete = () => {
        if (!deleteAction) return;
        const { type, id, secondaryId } = deleteAction;
        if (type === 'character') deleteCharacter?.(id);
        if (type === 'user') deleteUser?.(id);
        if (type === 'comment' && secondaryId) deleteComment?.(secondaryId, id);
        setDeleteAction(null);
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-lg">Reports</h3>
                {unreadCount > 0 && (
                    <button 
                        onClick={() => markAdminNotificationsAsRead?.(['NEW_REPORT'])}
                        className="text-sm text-accent-secondary hover:underline"
                    >
                        Clear Notifications ({unreadCount})
                    </button>
                )}
            </div>
            <TabFilter showResolved={showResolved} setShowResolved={setShowResolved}>
                <input 
                    type="text"
                    placeholder="Search reports..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-64 bg-primary border border-border rounded-md py-1.5 px-3 text-sm focus:ring-accent-primary focus:border-accent-primary"
                />
            </TabFilter>
            <div className="space-y-4">
                {filteredReports.length === 0 && <p className="text-center text-text-secondary py-8">No {showResolved ? 'resolved' : 'pending'} reports.</p>}
                {filteredReports.map(report => {
                    const reporter = findUserById?.(report.reporterId);
                    const entityCreator = findUserById?.(report.entityCreatorId || '');
                    const { character, user, comment } = getEntity(report);
                    const isSilenced = user?.isSilenced || character?.isSilencedByAdmin || comment?.isSilenced;
                    
                    const handleGoTo = () => {
                        if (character) setSelectedCharacter(character);
                        else if (user) setSelectedCreator(user);
                    };

                    return (
                        <div key={report.id} className="bg-primary border border-border p-4 rounded-lg">
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <h3 className="font-bold text-lg text-accent-primary capitalize flex items-center gap-2">
                                        {report.entityType} Report: {report.reason}
                                        {isSilenced && <span className="text-xs font-bold text-yellow-400 bg-yellow-900/50 px-2 py-0.5 rounded-full">Silenced</span>}
                                    </h3>
                                    <p className="text-xs text-text-secondary">Reported by <button onClick={() => reporter && setSelectedCreator(reporter)} className="hover:underline font-semibold disabled:no-underline disabled:cursor-default" disabled={!reporter}>{reporter?.profile.name || 'Unknown User'}</button> on {new Date(report.timestamp).toLocaleString()}</p>
                                </div>
                                <span className={`px-2 py-1 text-xs rounded-full ${report.isResolved ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                                    {report.isResolved ? 'Resolved' : 'Pending'}
                                </span>
                            </div>
                            <div className="my-3 p-3 bg-tertiary rounded-md border-l-2 border-border">
                                {report.description && <p className="mb-2"><strong className="text-text-secondary">Details:</strong> {report.description}</p>}
                                {report.contentSnapshot && <p className="text-sm font-mono bg-primary p-2 rounded border border-border">"{report.contentSnapshot}"</p>}
                                {entityCreator && <p className="text-sm mt-2">Content created by: <button onClick={() => setSelectedCreator(entityCreator)} className="font-semibold hover:underline">{entityCreator.profile.name}</button></p>}
                            </div>
                            
                            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm justify-between">
                                <div className="flex flex-wrap gap-2">
                                    <button onClick={handleGoTo} className="px-3 py-1 bg-tertiary hover:bg-hover rounded" disabled={!character && !user}>Go to Content</button>
                                    {reporter && <button onClick={() => openDmForUser(reporter, 'Reports')} className="px-3 py-1 bg-tertiary hover:bg-hover rounded">Message Reporter</button>}
                                    {entityCreator && reporter?.id !== entityCreator.id && <button onClick={() => openDmForUser(entityCreator, 'Reports')} className="px-3 py-1 bg-tertiary hover:bg-hover rounded">Message Offender</button>}
                                    {entityCreator && <button onClick={() => silenceUser?.(entityCreator.id, !entityCreator.isSilenced)} className="px-3 py-1 bg-tertiary hover:bg-hover rounded text-yellow-400">{entityCreator.isSilenced ? 'Unsilence User' : 'Silence User'}</button>}
                                    {character && !comment && <button onClick={() => silenceCharacter?.(character.id, !character.isSilencedByAdmin)} className="px-3 py-1 bg-tertiary hover:bg-hover rounded text-yellow-400">{character.isSilencedByAdmin ? 'Unsilence' : 'Silence'} Character</button>}
                                    {comment && character && <button onClick={() => silenceComment?.(character.id, comment.id, !comment.isSilenced)} className="px-3 py-1 bg-tertiary hover:bg-hover rounded text-yellow-400">{comment.isSilenced ? 'Unsilence' : 'Silence'} Comment</button>}
                                    
                                    {character && !comment && <button onClick={() => setDeleteAction({ type: 'character', id: character.id, name: character.name })} className="px-3 py-1 bg-tertiary hover:bg-hover rounded text-danger">Delete Character</button>}
                                    {user && <button onClick={() => setDeleteAction({ type: 'user', id: user.id, name: user.profile.name })} className="px-3 py-1 bg-tertiary hover:bg-hover rounded text-danger">Delete User</button>}
                                    {comment && character && <button onClick={() => setDeleteAction({ type: 'comment', id: comment.id, secondaryId: character.id, name: 'Comment' })} className="px-3 py-1 bg-tertiary hover:bg-hover rounded text-danger">Delete Comment</button>}
                                </div>
                                <button onClick={() => resolveReport?.(report.id, !report.isResolved)} className="px-3 py-1 bg-tertiary hover:bg-hover rounded text-success">{report.isResolved ? 'Re-open' : 'Mark Resolved'}</button>
                            </div>

                            <div className="mt-4 border-t border-border pt-3">
                                <h4 className="text-sm font-semibold text-text-secondary mb-2">Admin Notes</h4>
                                {report.notes && report.notes.length > 0 ? (
                                    <ul className="text-xs text-text-secondary space-y-1 mb-2 list-disc list-inside">
                                        {report.notes.map((note, i) => <li key={i}>{note}</li>)}
                                    </ul>
                                ) : <p className="text-xs text-text-secondary mb-2 italic">No notes yet.</p>}
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="Add a new note..."
                                        value={noteInputs[report.id] || ''}
                                        onChange={(e) => setNoteInputs(prev => ({...prev, [report.id]: e.target.value}))}
                                        onKeyDown={e => e.key === 'Enter' && handleAddNote(report.id)}
                                        className="flex-grow bg-tertiary border border-border rounded-md py-1 px-2 text-sm"
                                    />
                                    <button onClick={() => handleAddNote(report.id)} className="px-3 py-1 bg-tertiary hover:bg-hover rounded text-sm">Add Note</button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            {deleteAction && (
                <ConfirmationModal
                    title={`Delete ${deleteAction.type === 'comment' ? 'Comment' : deleteAction.name}?`}
                    message={`Are you sure you want to delete this ${deleteAction.type}? This action cannot be undone.`}
                    confirmText="Delete"
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setDeleteAction(null)}
                />
            )}
        </div>
    );
};

interface AIModAlertsTabProps {
  openDmForUser: (user: User, sourceFolder: 'AI Alerts') => void;
  setSelectedCharacter: (character: Character) => void;
  setSelectedCreator: (user: User) => void;
  setView: (view: AppView) => void;
  unreadCount: number;
}

const AIModAlertsTab: React.FC<AIModAlertsTabProps> = ({ openDmForUser, setSelectedCharacter, setSelectedCreator, setView, unreadCount }) => {
    const auth = useContext(AuthContext);
    const { 
        aiAlerts = [], findUserById, silenceUser, updateAIAlertStatus, deleteAIAlert,
        aiAlertFolders = [], createAIAlertFolder, moveAIAlertToFolder,
        characters = [], allUsers, addNoteToAIAlert, updateAIAlertFeedback,
        forumThreads = [], getPostsForThread, markAdminNotificationsAsRead
    } = auth || ({} as any);

    const [selectedAlert, setSelectedAlert] = useState<AIAlert | null>(null);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>('all');
    const [statusFilter, setStatusFilter] = useState<'pending' | 'resolved'>('pending');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [newFolderName, setNewFolderName] = useState('');
    const [noteInput, setNoteInput] = useState('');
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    useEffect(() => {
        if (selectedAlert) {
            const updatedAlert = aiAlerts.find(a => a.id === selectedAlert.id);
            if (updatedAlert && JSON.stringify(updatedAlert) !== JSON.stringify(selectedAlert)) {
                setSelectedAlert(updatedAlert);
            } else if (!updatedAlert) {
                setSelectedAlert(null);
            }
        }
    }, [aiAlerts, selectedAlert]);
    
    useEffect(() => {
        if (selectedAlert && selectedAlert.status === 'New' && updateAIAlertStatus) {
            updateAIAlertStatus(selectedAlert.id, 'In Progress');
        }
    }, [selectedAlert, updateAIAlertStatus]);

    const handleCreateFolder = () => {
        if (newFolderName.trim() && createAIAlertFolder) {
            createAIAlertFolder(newFolderName.trim());
            setNewFolderName('');
        }
    };
    
    const sortedAndFilteredAlerts = useMemo(() => {
        let filtered = aiAlerts;
        
        if (statusFilter === 'pending') {
            filtered = filtered.filter(a => a.status === 'New' || a.status === 'In Progress');
        } else {
            filtered = filtered.filter(a => a.status === 'Resolved');
        }

        if (selectedFolderId === 'uncategorized') {
            filtered = filtered.filter(a => !a.folderId);
        } else if (selectedFolderId !== 'all') {
            filtered = filtered.filter(a => a.folderId === selectedFolderId);
        }

        return [...filtered].sort((a, b) => {
            if (sortOrder === 'oldest') return a.timestamp - b.timestamp;
            return b.timestamp - a.timestamp; // newest
        });
    }, [aiAlerts, statusFilter, selectedFolderId, sortOrder]);

    const AlertImage: React.FC<{imageId: string}> = ({imageId}) => {
        const imageUrl = imageId;
        return imageUrl ? <img src={imageUrl} className="w-32 h-32 object-cover rounded-md mt-2" alt="Flagged content" /> : <div className="w-32 h-32 bg-tertiary rounded-md mt-2 animate-pulse" />;
    };

    const getEntityInfo = useCallback((alert: AIAlert | null) => {
        if (!alert || !allUsers || !forumThreads || !getPostsForThread) return { character: null, user: null, comment: null, forumThread: null, forumPost: null };
        
        let character: Character | null = null;
        let user: User | null = null;
        let comment: Comment | null = null;
        let forumThread: ForumThread | null = null;
        let forumPost: ForumPost | null = null;

        if (alert.entityType === 'character') {
            character = characters.find(c => c.id === alert.entityId) || null;
        } else if (alert.entityType === 'user') {
            user = findUserById?.(alert.entityId) || null;
        } else if (alert.entityType === 'comment' || alert.entityType === 'message') {
            const foundChar = characters.find(c => c.comments.some(com => com.id === alert.entityId));
            if (foundChar) {
                character = foundChar;
                comment = foundChar.comments.find(com => com.id === alert.entityId) || null;
            }
        } else if (alert.entityType === 'image') {
            character = characters.find(c => c.avatarUrl === alert.entityId) || null;
            if (!character) {
                user = allUsers.find(u => u.profile.avatarUrl === alert.entityId) || null;
            }
        } else if (alert.entityType === 'forumThread') {
            forumThread = forumThreads.find(t => t.id === alert.entityId) || null;
        } else if (alert.entityType === 'forumPost') {
            for (const thread of forumThreads) {
                const posts = getPostsForThread(thread.id);
                const foundPost = posts.find(p => p.id === alert.entityId);
                if (foundPost) {
                    forumPost = foundPost;
                    forumThread = thread;
                    break;
                }
            }
        }
        
        return { character, user, comment, forumThread, forumPost };
    }, [characters, findUserById, allUsers, forumThreads, getPostsForThread]);

    const handleAddNote = () => {
        if (addNoteToAIAlert && selectedAlert && noteInput.trim()) {
            addNoteToAIAlert(selectedAlert.id, noteInput.trim());
            setNoteInput('');
        }
    };

    const handleDeleteAlert = () => {
        if (deleteAIAlert && selectedAlert) {
            deleteAIAlert(selectedAlert.id);
            setSelectedAlert(null);
            setIsDeleteConfirmOpen(false);
        }
    }

    return (
        <div className="flex h-[75vh] flex-col">
             <div className="flex justify-between items-center mb-2 px-2">
                <h3 className="font-bold text-lg">AI Alerts</h3>
                {unreadCount > 0 && (
                    <button 
                        onClick={() => markAdminNotificationsAsRead?.(['NEW_AI_ALERT'])}
                        className="text-sm text-accent-secondary hover:underline"
                    >
                        Clear Notifications ({unreadCount})
                    </button>
                )}
            </div>
            <div className="flex h-full">
                <div className="w-2/5 xl:w-1/3 border-r border-border flex flex-col">
                    <div className="p-2 border-b border-border space-y-2 flex-shrink-0">
                        <button onClick={() => setSelectedFolderId('all')} className={`w-full text-left p-2 rounded hover:bg-hover ${selectedFolderId === 'all' ? 'bg-hover' : ''}`}>All Alerts</button>
                        <button onClick={() => setSelectedFolderId('uncategorized')} className={`w-full text-left p-2 rounded hover:bg-hover ${selectedFolderId === 'uncategorized' ? 'bg-hover' : ''}`}>Uncategorized</button>
                        {aiAlertFolders?.map(folder => (
                            <button key={folder.id} onClick={() => setSelectedFolderId(folder.id)} className={`w-full text-left p-2 rounded hover:bg-hover ${selectedFolderId === folder.id ? 'bg-hover' : ''}`}>{folder.name}</button>
                        ))}
                        <div className="flex items-center gap-2 pt-2 border-t border-border">
                            <input type="text" placeholder="New Folder Name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateFolder()} className="w-full bg-primary border border-border rounded-md py-1 px-2 text-sm"/>
                            <button onClick={handleCreateFolder} className="p-1 bg-tertiary hover:bg-hover rounded-md"><PlusIcon className="w-4 h-4" /></button>
                        </div>
                    </div>
                    <div className="flex items-center p-2 border-b border-border flex-shrink-0">
                        <div className="flex items-center gap-1 p-1 bg-primary border border-border rounded-md flex-grow">
                            <button onClick={() => setStatusFilter('pending')} className={`flex-1 px-3 py-1 text-sm rounded ${statusFilter === 'pending' ? 'bg-accent-primary text-white' : 'hover:bg-hover'}`}>Pending</button>
                            <button onClick={() => setStatusFilter('resolved')} className={`flex-1 px-3 py-1 text-sm rounded ${statusFilter === 'resolved' ? 'bg-success/50 text-white' : 'hover:bg-hover'}`}>Resolved</button>
                        </div>
                        <select value={sortOrder} onChange={e => setSortOrder(e.target.value as any)} className="bg-primary border border-border text-xs rounded ml-2">
                            <option value="newest">Newest</option>
                            <option value="oldest">Oldest</option>
                        </select>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {sortedAndFilteredAlerts.map(alert => {
                            return (
                                <button key={alert.id} onClick={() => setSelectedAlert(alert)} className={`w-full text-left p-3 border-b border-border hover:bg-hover ${selectedAlert?.id === alert.id ? 'bg-hover' : ''}`}>
                                    <div className="flex justify-between items-start">
                                        <p className="font-semibold truncate capitalize">{alert.category}</p>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${alert.status === 'New' ? 'bg-blue-500/30 text-blue-300' : alert.status === 'Resolved' ? 'bg-success/30 text-success' : 'bg-tertiary'}`}>{alert.status}</span>
                                    </div>
                                    <p className="text-sm text-text-secondary truncate capitalize">{alert.entityType} alert</p>
                                    <p className="text-xs text-text-secondary mt-1">{new Date(alert.timestamp).toLocaleDateString()}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="w-3/5 xl:w-2/3 flex flex-col p-4">
                    {selectedAlert ? (
                        (() => {
                            const entityCreator = findUserById?.(selectedAlert.entityCreatorId || '');
                            const { character, user, forumThread, forumPost } = getEntityInfo(selectedAlert);

                            const handleGoToContent = () => {
                                if (forumThread) {
                                    setView({ type: 'FORUM_THREAD', threadId: forumThread.id });
                                } else if (character) {
                                    setSelectedCharacter(character);
                                } else if (user) {
                                    setSelectedCreator(user);
                                }
                            };

                            return (
                                <div className="flex flex-col h-full">
                                    <div className="border-b border-border pb-3 mb-3 flex justify-between items-start">
                                        <div>
                                            <h2 className="text-2xl font-bold capitalize text-accent-primary">{selectedAlert.category}</h2>
                                            <p className="text-sm text-text-secondary">Detected in a <span className="font-semibold">{selectedAlert.entityType}</span> on {new Date(selectedAlert.timestamp).toLocaleString()}</p>
                                        </div>
                                        <button onClick={() => setIsDeleteConfirmOpen(true)} className="text-danger hover:text-red-400 p-2 hover:bg-tertiary rounded-full" title="Delete Alert"><DeleteIcon className="w-5 h-5"/></button>
                                    </div>
                                    
                                    {entityCreator && (
                                        <div className="flex items-center gap-3 mb-4">
                                            <p className="text-sm">Content creator:</p>
                                            <button onClick={() => setSelectedCreator(entityCreator)} className="flex items-center gap-3 hover:opacity-80">
                                                <Avatar imageId={entityCreator.profile.avatarUrl} alt={entityCreator.profile.name} className="w-8 h-8 rounded-full object-cover"/>
                                                <p className="font-semibold text-left">{entityCreator.profile.name}</p>
                                            </button>
                                        </div>
                                    )}
                                    
                                    <div className="flex-1 overflow-y-auto bg-primary p-3 rounded-md border border-border mb-4 space-y-3">
                                        {selectedAlert.explanation && (
                                            <div>
                                                <h4 className="text-sm font-semibold text-text-secondary mb-1">AI Explanation:</h4>
                                                <p className="text-sm italic p-2 bg-tertiary rounded">"{selectedAlert.explanation}"</p>
                                            </div>
                                        )}
                                        {selectedAlert.flaggedText && (
                                            <div>
                                                <h4 className="text-sm font-semibold text-text-secondary mb-1">Flagged Text:</h4>
                                                <p className="font-mono text-sm whitespace-pre-wrap p-2 bg-tertiary rounded">"{selectedAlert.flaggedText}"</p>
                                            </div>
                                        )}
                                        {(selectedAlert.entityType === 'forumPost' && forumPost) && (
                                            <div>
                                                <h4 className="text-sm font-semibold text-text-secondary mb-1">Full Post Content:</h4>
                                                <div className="text-sm p-2 bg-tertiary rounded border border-border">
                                                    <p className="whitespace-pre-wrap">{forumPost.content}</p>
                                                </div>
                                            </div>
                                        )}
                                        {(selectedAlert.entityType === 'forumThread' && forumThread) && (
                                            <div>
                                                <h4 className="text-sm font-semibold text-text-secondary mb-1">Thread Title:</h4>
                                                <div className="text-sm p-2 bg-tertiary rounded border border-border">
                                                    <p className="font-semibold">{forumThread.title}</p>
                                                </div>
                                            </div>
                                        )}
                                        {selectedAlert.entityType === 'image' && (
                                            <div>
                                                <h4 className="text-sm font-semibold text-text-secondary mb-1">Flagged Image:</h4>
                                                <AlertImage imageId={selectedAlert.entityId} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-auto space-y-4">
                                        <div className="border-t border-border pt-3">
                                            <h4 className="text-sm font-semibold text-text-secondary mb-2">Admin Notes</h4>
                                            {selectedAlert.notes && selectedAlert.notes.length > 0 ? (
                                                <ul className="text-xs text-text-secondary space-y-1 mb-2 list-disc list-inside max-h-24 overflow-y-auto">
                                                    {selectedAlert.notes.map((note, i) => <li key={i}>{note}</li>)}
                                                </ul>
                                            ) : <p className="text-xs text-text-secondary mb-2 italic">No notes yet.</p>}
                                            <div className="flex gap-2">
                                                <input type="text" placeholder="Add a new note..." value={noteInput} onChange={(e) => setNoteInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddNote()} className="flex-grow bg-tertiary border border-border rounded-md py-1 px-2 text-sm" />
                                                <button onClick={handleAddNote} className="px-3 py-1 bg-tertiary hover:bg-hover rounded text-sm">Add Note</button>
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button onClick={handleGoToContent} className="px-3 py-1 bg-tertiary hover:bg-hover rounded text-sm" disabled={!character && !user && !forumThread}>Go to Content</button>
                                            {entityCreator && <button onClick={() => openDmForUser(entityCreator, 'AI Alerts')} className="px-3 py-1 bg-tertiary hover:bg-hover rounded text-sm">Message User</button>}
                                            {entityCreator && <button onClick={() => silenceUser?.(entityCreator.id, true)} className="px-3 py-1 bg-tertiary hover:bg-hover rounded text-sm text-yellow-400">Silence User</button>}
                                        </div>

                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-text-secondary">Status:</span>
                                                <select value={selectedAlert.status} onChange={e => updateAIAlertStatus?.(selectedAlert.id, e.target.value as any)} className="bg-tertiary border border-border rounded-md p-2 text-sm">
                                                    <option>New</option>
                                                    <option>In Progress</option>
                                                    <option>Resolved</option>
                                                </select>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-text-secondary">Move to:</span>
                                                <select value={selectedAlert.folderId || ''} onChange={e => moveAIAlertToFolder?.(selectedAlert.id, e.target.value || null)} className="bg-tertiary border border-border rounded-md p-2 text-sm">
                                                    <option value="">Uncategorized</option>
                                                    {aiAlertFolders?.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="border-t border-border pt-3 flex items-center justify-center gap-4">
                                            <span className="text-sm text-text-secondary">Was this alert helpful?</span>
                                            <button onClick={() => updateAIAlertFeedback?.(selectedAlert.id, 'good')} className={`p-2 rounded-full ${selectedAlert.feedback === 'good' ? 'bg-success/30 text-success' : 'bg-tertiary hover:bg-hover'}`}>
                                                <ThumbsUpIcon className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => updateAIAlertFeedback?.(selectedAlert.id, 'bad')} className={`p-2 rounded-full ${selectedAlert.feedback === 'bad' ? 'bg-danger/30 text-danger' : 'bg-tertiary hover:bg-hover'}`}>
                                                <ThumbsDownIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })()
                    ) : (
                        <div className="flex items-center justify-center h-full text-text-secondary">
                            <p>Select an alert to view details.</p>
                        </div>
                    )}
                </div>
            </div>
            {isDeleteConfirmOpen && (
                <ConfirmationModal 
                    title="Delete Alert?"
                    message="Are you sure you want to delete this alert record? This action cannot be undone."
                    confirmText="Delete"
                    onConfirm={handleDeleteAlert}
                    onCancel={() => setIsDeleteConfirmOpen(false)}
                />
            )}
        </div>
    );
};

const TicketingSystemTab: React.FC<{ openDmForUser: (user: User, sourceFolder: 'Ticketing System') => void; setSelectedCreator: (user: User) => void; unreadCount: number; }> = ({ openDmForUser, setSelectedCreator, unreadCount }) => {
    const auth = useContext(AuthContext);
    const { tickets = [], findUserById, updateTicketStatus, ticketFolders, createTicketFolder, moveTicketToFolder, markAdminNotificationsAsRead } = auth || ({} as any);
    
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>('all'); // 'all', 'uncategorized', or a folder ID
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'status'>('newest');
    const [newFolderName, setNewFolderName] = useState('');

    useEffect(() => {
        if (selectedTicket) {
            const updatedTicket = tickets.find(t => t.id === selectedTicket.id);
            if (updatedTicket && JSON.stringify(updatedTicket) !== JSON.stringify(selectedTicket)) {
                setSelectedTicket(updatedTicket);
            } else if (!updatedTicket) {
                setSelectedTicket(null);
            }
        }
    }, [tickets, selectedTicket]);

    useEffect(() => {
        if (selectedTicket && selectedTicket.status === 'New' && updateTicketStatus) {
            updateTicketStatus(selectedTicket.id, 'In Progress');
        }
    }, [selectedTicket, updateTicketStatus]);

    const handleCreateFolder = () => {
        if (newFolderName.trim() && createTicketFolder) {
            createTicketFolder(newFolderName.trim());
            setNewFolderName('');
        }
    };

    const sortedAndFilteredTickets = useMemo(() => {
        let filtered = tickets;
        if (selectedFolderId === 'uncategorized') {
            filtered = tickets.filter(t => !t.folderId);
        } else if (selectedFolderId !== 'all') {
            filtered = tickets.filter(t => t.folderId === selectedFolderId);
        }

        return [...filtered].sort((a, b) => {
            if (sortOrder === 'oldest') return a.timestamp - b.timestamp;
            if (sortOrder === 'status') {
                const statusOrder = { 'New': 1, 'In Progress': 2, 'Resolved': 3 };
                return statusOrder[a.status] - statusOrder[b.status];
            }
            return b.timestamp - a.timestamp; // newest
        });
    }, [tickets, selectedFolderId, sortOrder]);

    return (
        <div className="flex h-[75vh] flex-col">
             <div className="flex justify-between items-center mb-2 px-2">
                <h3 className="font-bold text-lg">Tickets</h3>
                {unreadCount > 0 && (
                    <button 
                        onClick={() => markAdminNotificationsAsRead?.(['NEW_TICKET'])}
                        className="text-sm text-accent-secondary hover:underline"
                    >
                        Clear Notifications ({unreadCount})
                    </button>
                )}
            </div>
            <div className="flex h-full">
                <div className="w-2/5 xl:w-1/3 border-r border-border flex flex-col">
                    <div className="p-2 border-b border-border space-y-2 flex-shrink-0">
                        <button onClick={() => setSelectedFolderId('all')} className={`w-full text-left p-2 rounded hover:bg-hover ${selectedFolderId === 'all' ? 'bg-hover' : ''}`}>All Tickets</button>
                        <button onClick={() => setSelectedFolderId('uncategorized')} className={`w-full text-left p-2 rounded hover:bg-hover ${selectedFolderId === 'uncategorized' ? 'bg-hover' : ''}`}>Uncategorized</button>
                        {ticketFolders?.map(folder => (
                            <button key={folder.id} onClick={() => setSelectedFolderId(folder.id)} className={`w-full text-left p-2 rounded hover:bg-hover ${selectedFolderId === folder.id ? 'bg-hover' : ''}`}>{folder.name}</button>
                        ))}
                        <div className="flex items-center gap-2 pt-2 border-t border-border">
                            <input type="text" placeholder="New Folder Name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateFolder()} className="w-full bg-primary border border-border rounded-md py-1 px-2 text-sm"/>
                            <button onClick={handleCreateFolder} className="p-1 bg-tertiary hover:bg-hover rounded-md"><PlusIcon className="w-4 h-4" /></button>
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-2 border-b border-border flex-shrink-0">
                        <span className="text-xs text-text-secondary">Sort by:</span>
                        <select value={sortOrder} onChange={e => setSortOrder(e.target.value as any)} className="bg-primary border border-border text-xs rounded">
                            <option value="newest">Newest</option>
                            <option value="oldest">Oldest</option>
                            <option value="status">Status</option>
                        </select>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {sortedAndFilteredTickets.map(ticket => {
                            const submitter = findUserById?.(ticket.submitterId);
                            return (
                                <button key={ticket.id} onClick={() => setSelectedTicket(ticket)} className={`w-full text-left p-3 border-b border-border hover:bg-hover ${selectedTicket?.id === ticket.id ? 'bg-hover' : ''}`}>
                                    <div className="flex justify-between items-start">
                                        <p className="font-semibold truncate">{ticket.subject}</p>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${ticket.status === 'New' ? 'bg-blue-500/30 text-blue-300' : ticket.status === 'Resolved' ? 'bg-success/30 text-success' : 'bg-tertiary'}`}>{ticket.status}</span>
                                    </div>
                                    <p className="text-sm text-text-secondary truncate">From: {submitter?.profile.name || 'Unknown'}</p>
                                    <p className="text-xs text-text-secondary mt-1">{new Date(ticket.timestamp).toLocaleDateString()}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="w-3/5 xl:w-2/3 flex flex-col p-4">
                    {selectedTicket ? (
                        (() => {
                            const submitter = findUserById?.(selectedTicket.submitterId);
                            return (
                                <div className="flex flex-col h-full">
                                    <h2 className="text-2xl font-bold border-b border-border pb-3 mb-3">{selectedTicket.subject}</h2>
                                    {submitter && (
                                        <div className="flex items-center gap-3 mb-4">
                                            <button onClick={() => setSelectedCreator(submitter)} className="flex items-center gap-3 hover:opacity-80">
                                                <Avatar imageId={submitter.profile.avatarUrl} alt={submitter.profile.name} className="w-10 h-10 rounded-full object-cover"/>
                                                <div>
                                                    <p className="font-semibold text-left">{submitter.profile.name}</p>
                                                    <p className="text-sm text-text-secondary text-left">{selectedTicket.email}</p>
                                                </div>
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex-1 overflow-y-auto bg-primary p-3 rounded-md border border-border mb-4">
                                        <p className="whitespace-pre-wrap">{selectedTicket.description}</p>
                                    </div>
                                    <div className="flex items-center justify-between gap-4 mt-auto">
                                        <div className="flex items-center gap-4">
                                            <select value={selectedTicket.status} onChange={e => updateTicketStatus?.(selectedTicket.id, e.target.value as TicketStatus)} className="bg-tertiary border border-border rounded-md p-2">
                                                <option>New</option>
                                                <option>In Progress</option>
                                                <option>Resolved</option>
                                            </select>
                                            {submitter && <button onClick={() => openDmForUser(submitter, 'Ticketing System')} className="px-4 py-2 bg-accent-secondary hover:bg-accent-secondary-hover rounded-md">Reply via DM</button>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-text-secondary">Move to:</span>
                                            <select value={selectedTicket.folderId || ''} onChange={e => moveTicketToFolder?.(selectedTicket.id, e.target.value || null)} className="bg-tertiary border border-border rounded-md p-2 text-sm">
                                                <option value="">Uncategorized</option>
                                                {ticketFolders?.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )
                        })()
                    ) : (
                        <div className="flex items-center justify-center h-full text-text-secondary">
                            <p>Select a ticket to view details.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ImagePreview: React.FC<{ src: string; onRemove: () => void }> = ({ src, onRemove }) => (
    <div className="relative inline-block m-2">
        <img src={src} alt="Preview" className="h-20 w-20 object-cover rounded-md" />
        <button onClick={onRemove} className="absolute -top-2 -right-2 bg-danger text-white rounded-full p-0.5 shadow-md">
            <CloseIcon className="w-4 h-4" />
        </button>
    </div>
);

const DMImage: React.FC<{ imageId: string }> = ({ imageId }) => {
    const imageUrl = imageId;
    if (!imageUrl) return <div className="w-48 h-32 bg-tertiary animate-pulse rounded-md mt-2" />;
    return (
        <a href={imageUrl} target="_blank" rel="noopener noreferrer">
            <img src={imageUrl} alt="Direct message content" className="max-w-xs max-h-64 rounded-md mt-2 object-contain" />
        </a>
    );
};

const DirectMessagesTab: React.FC<{preselectedUserContext?: { user: User, sourceFolder?: 'Reports' | 'Ticketing System' | 'AI Alerts' } | null, setSelectedCreator: (user: User) => void}> = ({ preselectedUserContext, setSelectedCreator }) => {
    const auth = useContext(AuthContext);
    const { allUsers = [], dmConversations = {}, sendDirectMessage, findUserById, markDMAsReadByAdmin, dmFolders, createDMFolder, moveDMConversationToFolder, markAllDMsAsReadByAdmin, currentUser } = auth || ({} as any);
    
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [messageText, setMessageText] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>('all');
    const [newFolderName, setNewFolderName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (preselectedUserContext) {
            setSelectedUser(preselectedUserContext.user);
            // If the preselected user doesn't have a conversation yet, they won't be in any folder,
            // so we switch to the "All Messages" view to ensure they are visible.
            if (!dmConversations[preselectedUserContext.user.id]) {
                setSelectedFolderId('all');
            }
        }
    }, [preselectedUserContext, dmConversations]);

    const handleSendMessage = () => {
        if (selectedUser && (messageText.trim() || imageFile) && sendDirectMessage) {
            let folderId: string | null = currentConversation?.folderId ?? null;
            if (!currentConversation && preselectedUserContext?.sourceFolder && dmFolders) {
                const folder = dmFolders.find(f => f.name === preselectedUserContext.sourceFolder);
                if (folder) folderId = folder.id;
            }
            sendDirectMessage(selectedUser.id, { text: messageText.trim(), imageFile }, true, folderId);
            setMessageText('');
            setImageFile(null);
            if (imagePreview) URL.revokeObjectURL(imagePreview);
            setImagePreview(null);
        }
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type === 'image/jpeg' && file.size <= 3 * 1024 * 1024) {
                if (imagePreview) URL.revokeObjectURL(imagePreview);
                setImageFile(file);
                setImagePreview(URL.createObjectURL(file));
            } else {
                alert('Please select a JPEG image under 3MB.');
            }
        }
    };
    
    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const file = (Array.from(e.clipboardData.items) as any[]).find(item => item.type.startsWith('image/'))?.getAsFile();
        if (file) {
            e.preventDefault();
            if (file.type === 'image/jpeg' && file.size <= 3 * 1024 * 1024) {
                if (imagePreview) URL.revokeObjectURL(imagePreview);
                setImageFile(file);
                setImagePreview(URL.createObjectURL(file));
            } else {
                alert('Pasted image must be a JPEG under 3MB.');
            }
        }
    };

    const handleCreateFolder = () => {
        if (newFolderName.trim() && createDMFolder) {
            createDMFolder(newFolderName.trim());
            setNewFolderName('');
        }
    };
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selectedUser, dmConversations]);

    const currentConversation = selectedUser ? dmConversations[selectedUser.id] : null;

    const filteredUsers = useMemo(() => {
        let usersToList = allUsers.filter(u => u.id !== currentUser?.id);

        if (selectedFolderId !== 'all') {
            usersToList = usersToList.filter(u => {
                const convo = dmConversations[u.id];
                if (!convo) return false;
                if (selectedFolderId === 'uncategorized') return !convo.folderId;
                return convo.folderId === selectedFolderId;
            });
        }
        
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            usersToList = usersToList.filter(u => 
                u.profile.name.toLowerCase().includes(lowerSearch) ||
                u.username.toLowerCase().includes(lowerSearch)
            );
        }
        
        return usersToList;
    }, [allUsers, dmConversations, selectedFolderId, searchTerm, currentUser?.id]);
    
    const hasUnread = useMemo(() => {
        return Object.values(dmConversations).some((convo: DMConversation) => convo.hasUnreadByAdmin);
    }, [dmConversations]);

    return (
        <div className="flex h-[75vh]">
            <div className="w-2/5 xl:w-1/3 border-r border-border flex flex-col">
                <div className="p-2 border-b border-border flex-shrink-0">
                    <input 
                        type="text" 
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-primary border border-border rounded-md py-1 px-2 text-sm"
                    />
                </div>
                <div className="p-2 border-b border-border space-y-2 flex-shrink-0">
                    <button onClick={() => setSelectedFolderId('all')} className={`w-full text-left p-2 rounded hover:bg-hover ${selectedFolderId === 'all' ? 'bg-hover' : ''}`}>All Messages</button>
                    <button onClick={() => setSelectedFolderId('uncategorized')} className={`w-full text-left p-2 rounded hover:bg-hover ${selectedFolderId === 'uncategorized' ? 'bg-hover' : ''}`}>Uncategorized</button>
                    {dmFolders?.map(folder => (
                        <button key={folder.id} onClick={() => setSelectedFolderId(folder.id)} className={`w-full text-left p-2 rounded hover:bg-hover ${selectedFolderId === folder.id ? 'bg-hover' : ''}`}>{folder.name}</button>
                    ))}
                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                        <input type="text" placeholder="New Folder Name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateFolder()} className="w-full bg-primary border border-border rounded-md py-1 px-2 text-sm"/>
                        <button onClick={handleCreateFolder} className="p-1 bg-tertiary hover:bg-hover rounded-md"><PlusIcon className="w-4 h-4" /></button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {filteredUsers.map(user => (
                         <button key={user.id} onClick={() => setSelectedUser(user)} className={`w-full text-left p-3 border-b border-border hover:bg-hover ${selectedUser?.id === user.id ? 'bg-hover' : ''}`}>
                            <div className="flex items-center gap-3">
                                <Avatar imageId={user.profile.avatarUrl} alt={user.profile.name} className="w-10 h-10 rounded-full object-cover"/>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline">
                                        <p className="font-semibold truncate">{user.profile.name}</p>
                                        {dmConversations[user.id]?.hasUnreadByAdmin && <span className="h-2 w-2 bg-accent-primary rounded-full"></span>}
                                    </div>
                                    <p className="text-xs text-text-secondary truncate">{user.profile.email}</p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
            <div className="w-3/5 xl:w-2/3 flex flex-col p-4">
                {selectedUser ? (
                    <div className="flex flex-col h-full">
                        <div className="border-b border-border pb-3 mb-3 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setSelectedCreator(selectedUser)} className="hover:opacity-80">
                                    <Avatar imageId={selectedUser.profile.avatarUrl} alt={selectedUser.profile.name} className="w-10 h-10 rounded-full object-cover"/>
                                </button>
                                <div>
                                    <h3 className="font-bold">{selectedUser.profile.name}</h3>
                                    {currentConversation && (
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-text-secondary">Folder:</span>
                                            <select 
                                                value={currentConversation.folderId || ''} 
                                                onChange={e => moveDMConversationToFolder?.(selectedUser.id, e.target.value || null)} 
                                                className="bg-tertiary border border-border rounded px-1 text-xs"
                                            >
                                                <option value="">Uncategorized</option>
                                                {dmFolders?.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>
                             {currentConversation?.hasUnreadByAdmin && (
                                <button onClick={() => markDMAsReadByAdmin?.(selectedUser.id)} className="text-xs text-accent-secondary hover:underline">Mark Read</button>
                            )}
                        </div>
                        
                        <div className="flex-1 overflow-y-auto bg-primary p-4 rounded-lg mb-4 space-y-4">
                            {currentConversation?.messages.map(msg => {
                                const isFromAdmin = msg.senderId === 'ADMIN';
                                return (
                                    <div key={msg.id} className={`flex flex-col ${isFromAdmin ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[80%] px-4 py-2 rounded-lg ${isFromAdmin ? 'bg-accent-primary text-white' : 'bg-tertiary'}`}>
                                            {msg.imageUrl && <DMImage imageId={msg.imageUrl} />}
                                            {msg.text && <p className={msg.imageUrl ? 'mt-2' : ''}>{msg.text}</p>}
                                        </div>
                                        <span className="text-xs text-text-secondary mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                )
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="border-t border-border pt-3 bg-secondary">
                             {imagePreview && <ImagePreview src={imagePreview} onRemove={() => { if(imagePreview) URL.revokeObjectURL(imagePreview); setImageFile(null); setImagePreview(null); }} />}
                             <div className="flex items-center gap-2">
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/jpeg" className="hidden" />
                                <button onClick={() => fileInputRef.current?.click()} className="p-2 text-text-secondary hover:text-text-primary">
                                    <UploadIcon className="w-5 h-5"/>
                                </button>
                                <textarea
                                    value={messageText}
                                    onChange={e => setMessageText(e.target.value)}
                                    onPaste={handlePaste}
                                    onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                                    placeholder={`Message ${selectedUser.profile.name}...`}
                                    className="flex-1 bg-tertiary border border-border rounded-lg p-2 focus:outline-none resize-none"
                                    rows={1}
                                />
                                <button onClick={handleSendMessage} className="p-2 bg-accent-secondary rounded-full text-white hover:bg-accent-secondary-hover disabled:bg-tertiary" disabled={!messageText.trim() && !imageFile}>
                                    <SendIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-text-secondary flex-col gap-4">
                        <p>Select a conversation to view messages.</p>
                         {hasUnread && (
                             <button onClick={() => markAllDMsAsReadByAdmin?.()} className="px-4 py-2 bg-tertiary hover:bg-hover rounded-md text-sm">
                                Mark All DMs as Read
                            </button>
                         )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModeratorConsoleView;