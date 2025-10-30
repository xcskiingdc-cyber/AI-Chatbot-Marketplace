
import React, { useState, useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import { GlobalSettings, User, UserType, Character, AIContextSettings, CharacterContextField } from '../types';
import ConfirmationModal from './ConfirmationModal';
import ProfileEditModal from './ProfileEditModal';
import Avatar from './Avatar';

const AdminSettingsView: React.FC = () => {
    const auth = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState('stats');

    if (!auth || auth.currentUser?.userType !== 'Admin') {
        return <p className="p-8 text-center text-red-400">Access Denied.</p>;
    }

    const tabs = [
        { id: 'stats', label: 'Site Stats' },
        { id: 'prompts', label: 'Global Prompts' },
        { id: 'context', label: 'AI Context' },
        { id: 'users', label: 'User Management' },
        { id: 'content', label: 'Content Moderation' },
    ];

    return (
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-[--text-primary]">Admin Settings</h1>
            <div className="border-b border-[--border-color] mb-6">
                <nav className="-mb-px flex space-x-2 sm:space-x-6 overflow-x-auto" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`${
                                activeTab === tab.id
                                ? 'border-[--accent-primary] text-[--accent-primary]'
                                : 'border-transparent text-[--text-secondary] hover:text-[--text-primary] hover:border-[--border-color]'
                            } whitespace-nowrap py-4 px-1 sm:px-2 border-b-2 font-medium text-sm`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="bg-[--bg-secondary] p-4 sm:p-6 rounded-lg border border-[--border-color]">
                {activeTab === 'stats' && <SiteStatsTab />}
                {activeTab === 'prompts' && <GlobalPromptsTab />}
                {activeTab === 'context' && <AIContextManagementTab />}
                {activeTab === 'users' && <UserManagementTab />}
                {activeTab === 'content' && <ContentModerationTab />}
            </div>
        </div>
    );
};

const StatCard: React.FC<{ title: string; value?: number | string, children?: React.ReactNode }> = ({ title, value, children }) => (
    <div className="bg-[--bg-primary] p-6 rounded-lg border border-[--border-color]">
        <h3 className="text-lg font-medium text-[--text-secondary]">{title}</h3>
        {value && <p className="text-3xl font-bold mt-2 text-[--text-primary]">{value}</p>}
        {children}
    </div>
);

const SiteStatsTab: React.FC = () => {
    const auth = useContext(AuthContext);
    const { allUsers = [], characters = [] } = auth || {};

    const publicChars = characters.filter(c => c.isPublic).length;
    const privateChars = characters.length - publicChars;

    const userStats = allUsers.reduce((acc, user) => {
        acc[user.userType] = (acc[user.userType] || 0) + 1;
        return acc;
    }, {} as Record<UserType, number>);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard title="Total Users" value={allUsers.length} />
            <StatCard title="Total Characters" value={characters.length} />
            <StatCard title="Characters by Type">
                <p className="text-3xl font-bold mt-2 text-[--text-primary]"><span className="text-[--success]">{publicChars}</span> Public / <span className="text-[--text-secondary]">{privateChars}</span> Private</p>
            </StatCard>
             <div className="md:col-span-2 lg:col-span-3">
                <StatCard title="Users by Tier">
                    <div className="flex flex-wrap justify-around mt-2 gap-4">
                        {['Admin', 'Subscription', 'Ads', 'Free'].map(type => (
                            <div key={type} className="text-center">
                                <p className="text-3xl font-bold text-[--text-primary]">{(userStats[type as UserType] || 0)}</p>
                                <p className="text-sm text-[--text-secondary]">{type}</p>
                            </div>
                        ))}
                    </div>
                </StatCard>
            </div>
        </div>
    );
};

const GlobalPromptsTab: React.FC = () => {
    const auth = useContext(AuthContext);
    const [prompts, setPrompts] = useState<GlobalSettings>({ sfwPrompt: '', nsfwPrompt: '' });

    React.useEffect(() => {
        if (auth?.globalSettings) {
            setPrompts(auth.globalSettings);
        }
    }, [auth?.globalSettings]);

    const handleSave = () => {
        auth?.updateGlobalSettings(prompts);
        alert('Global prompts updated!');
    };
    
    const labelClasses = "block text-sm font-medium text-[--accent-primary] mb-2";
    const textAreaClasses = "w-full p-2 bg-[--bg-primary] border border-[--border-color] rounded-md focus:outline-none focus:ring-2 focus:ring-[--accent-primary] h-64 font-mono text-sm";

    return (
        <div className="space-y-6">
            <div>
                <label htmlFor="sfwPrompt" className={labelClasses}>Global SFW Prompt</label>
                <textarea 
                    id="sfwPrompt"
                    value={prompts.sfwPrompt}
                    onChange={(e) => setPrompts(p => ({ ...p, sfwPrompt: e.target.value }))}
                    className={textAreaClasses}
                    placeholder="Enter the global SFW prompt. If empty, the hardcoded default will be used."
                />
            </div>
            <div>
                <label htmlFor="nsfwPrompt" className={labelClasses}>Global NSFW Prompt</label>
                <textarea 
                    id="nsfwPrompt"
                    value={prompts.nsfwPrompt}
                    onChange={(e) => setPrompts(p => ({ ...p, nsfwPrompt: e.target.value }))}
                    className={textAreaClasses}
                    placeholder="Enter the global NSFW prompt. If empty, the hardcoded default will be used."
                />
            </div>
            <div className="flex justify-end">
                <button onClick={handleSave} className="px-6 py-2 bg-[--accent-secondary] text-white hover:bg-[--accent-secondary-hover] rounded-md transition-colors">
                    Save Prompts
                </button>
            </div>
        </div>
    );
};

const AIContextManagementTab: React.FC = () => {
    const auth = useContext(AuthContext);
    const [settings, setSettings] = useState<AIContextSettings>({ includedFields: [], historyLength: 20 });

    const allFields: { id: CharacterContextField; label: string }[] = [
        { id: 'gender', label: 'Gender' },
        { id: 'description', label: 'Description' },
        { id: 'personality', label: 'Personality' },
        { id: 'appearance', label: 'Appearance' },
        { id: 'story', label: 'Backstory' },
        { id: 'situation', label: 'Situation' },
        { id: 'feeling', label: 'Initial Mood' },
    ];

    React.useEffect(() => {
        if (auth?.aiContextSettings) {
            setSettings(auth.aiContextSettings);
        }
    }, [auth?.aiContextSettings]);

    const handleFieldToggle = (fieldId: CharacterContextField) => {
        setSettings(prev => {
            const includedFields = prev.includedFields.includes(fieldId)
                ? prev.includedFields.filter(f => f !== fieldId)
                : [...prev.includedFields, fieldId];
            return { ...prev, includedFields };
        });
    };

    const handleHistoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value) && value >= 0 && value <= 100) {
            setSettings(prev => ({ ...prev, historyLength: value }));
        }
    };
    
    const handleSave = () => {
        auth?.updateAIContextSettings(settings);
        alert('AI Context settings updated!');
    };

    const labelClasses = "block text-sm font-medium text-[--accent-primary] mb-2";

    return (
        <div className="space-y-6">
            <div>
                <label className={labelClasses}>Character Fields for Context</label>
                <p className="text-sm text-[--text-secondary] mb-3">Select which fields from a character's profile are included in the AI's system instruction.</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {allFields.map(field => (
                        <label key={field.id} className="flex items-center space-x-2 text-[--text-primary] p-2 bg-[--bg-primary] border border-[--border-color] rounded-md">
                            <input
                                type="checkbox"
                                checked={settings.includedFields.includes(field.id)}
                                onChange={() => handleFieldToggle(field.id)}
                                className="form-checkbox h-5 w-5 text-[--accent-primary] bg-[--bg-tertiary] border-[--border-color] rounded focus:ring-[--accent-primary]"
                            />
                            <span>{field.label}</span>
                        </label>
                    ))}
                </div>
            </div>
            <div>
                <label htmlFor="historyLength" className={labelClasses}>Chat History Context Length</label>
                <p className="text-sm text-[--text-secondary] mb-3">How many previous messages (user and bot combined) to include for context. Recommended: 20-40. Max: 100.</p>
                <input
                    type="number"
                    id="historyLength"
                    value={settings.historyLength}
                    onChange={handleHistoryChange}
                    min="0"
                    max="100"
                    className="w-full max-w-xs p-2 bg-[--bg-primary] border border-[--border-color] rounded-md focus:outline-none focus:ring-2 focus:ring-[--accent-primary]"
                />
            </div>
             <div className="flex justify-end">
                <button onClick={handleSave} className="px-6 py-2 bg-[--accent-secondary] text-white hover:bg-[--accent-secondary-hover] rounded-md transition-colors">
                    Save AI Settings
                </button>
            </div>
        </div>
    );
};

const UserManagementTab: React.FC = () => {
    const auth = useContext(AuthContext);
    const [filter, setFilter] = useState('');
    const [userToEdit, setUserToEdit] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    const filteredUsers = useMemo(() => {
        if (!auth?.allUsers) return [];
        return auth.allUsers.filter(user => 
            user.username.toLowerCase().includes(filter.toLowerCase()) ||
            user.profile.name.toLowerCase().includes(filter.toLowerCase()) ||
            user.profile.email.toLowerCase().includes(filter.toLowerCase())
        );
    }, [auth?.allUsers, filter]);

    const handleSaveProfile = (profile: User['profile']) => {
        if (userToEdit) {
            auth?.updateAnyUserProfile(userToEdit.id, profile);
        }
        setUserToEdit(null);
    };
    
    const handleConfirmDelete = () => {
        if(userToDelete) {
            auth?.deleteUser(userToDelete.id);
        }
        setUserToDelete(null);
    }
    
    return (
        <div className="space-y-4">
            <input 
                type="text" 
                placeholder="Search users by username, name, or email..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full bg-[--bg-primary] border border-[--border-color] rounded-md py-2 px-4"
            />
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[--border-color]">
                    <thead className="bg-[--bg-tertiary]">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[--text-secondary] uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[--text-secondary] uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[--text-secondary] uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[--text-secondary] uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[--border-color]">
                        {filteredUsers.map(user => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <Avatar imageId={user.profile.avatarUrl} alt={user.profile.name} className="h-10 w-10 rounded-full object-cover"/>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-[--text-primary]">{user.profile.name}</div>
                                            <div className="text-sm text-[--text-secondary]">@{user.username}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <select 
                                        value={user.userType}
                                        onChange={(e) => auth?.updateUserType(user.id, e.target.value as UserType)}
                                        className="bg-[--bg-tertiary] border-[--border-color] rounded-md p-1 text-sm focus:ring-[--accent-primary] focus:border-[--accent-primary]"
                                        disabled={user.userType === 'Admin'}
                                    >
                                        <option>Free</option>
                                        <option>Ads</option>
                                        <option>Subscription</option>
                                        <option>Admin</option>
                                    </select>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {user.isSilenced 
                                        ? <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-900/50 text-yellow-300">Silenced</span>
                                        : <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-900/50 text-green-300">Active</span>
                                    }
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex items-center space-x-3">
                                        <button onClick={() => setUserToEdit(user)} className="text-indigo-400 hover:text-indigo-300">Edit</button>
                                        {user.userType !== 'Admin' && (
                                            <>
                                                <button onClick={() => auth?.silenceUser(user.id, !user.isSilenced)} className="text-yellow-400 hover:text-yellow-300">{user.isSilenced ? 'Unsilence' : 'Silence'}</button>
                                                <button onClick={() => setUserToDelete(user)} className="text-red-500 hover:text-red-400">Delete</button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {userToEdit && (
                <ProfileEditModal userProfile={userToEdit.profile} onSave={handleSaveProfile} onCancel={() => setUserToEdit(null)} />
            )}
            {userToDelete && (
                <ConfirmationModal
                    title="Delete User?"
                    message={`Are you sure you want to delete ${userToDelete.profile.name}? This will also delete all their characters and chats. This is irreversible.`}
                    confirmText="Delete User"
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setUserToDelete(null)}
                />
            )}
        </div>
    );
};

const ContentModerationTab: React.FC = () => {
    const auth = useContext(AuthContext);
    const [filter, setFilter] = useState('');
    
    const filteredCharacters = useMemo(() => {
        if (!auth?.characters) return [];
        return auth.characters.filter(c => 
            c.name.toLowerCase().includes(filter.toLowerCase()) ||
            c.description.toLowerCase().includes(filter.toLowerCase())
        );
    }, [auth?.characters, filter]);

    return (
         <div className="space-y-4">
            <input 
                type="text" 
                placeholder="Search characters by name or description..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full bg-[--bg-primary] border border-[--border-color] rounded-md py-2 px-4"
            />
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[--border-color]">
                    <thead className="bg-[--bg-tertiary]">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[--text-secondary] uppercase tracking-wider">Character</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[--text-secondary] uppercase tracking-wider">Creator</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[--text-secondary] uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[--text-secondary] uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[--border-color]">
                        {filteredCharacters.map(char => {
                            const creator = auth?.findUserById(char.creatorId);
                            return (
                                <tr key={char.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <Avatar imageId={char.avatarUrl} alt={char.name} className="h-10 w-10 rounded-md object-cover"/>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-[--text-primary]">{char.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[--text-secondary]">{creator?.profile.name || 'Unknown'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {char.isSilencedByAdmin 
                                            ? <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-900/50 text-yellow-300">Silenced</span>
                                            : <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${char.isPublic ? 'bg-green-900/50 text-green-300' : 'bg-gray-600/50 text-gray-300'}`}>{char.isPublic ? 'Public' : 'Private'}</span>
                                        }
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button onClick={() => auth?.silenceCharacter(char.id, !char.isSilencedByAdmin)} className="text-yellow-400 hover:text-yellow-300">{char.isSilencedByAdmin ? 'Unsilence' : 'Silence'}</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminSettingsView;