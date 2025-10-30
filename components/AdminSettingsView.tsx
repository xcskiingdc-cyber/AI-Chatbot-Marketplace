import React, { useState, useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import { GlobalSettings, User, UserType, Character } from '../types';
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
        { id: 'users', label: 'User Management' },
        { id: 'content', label: 'Content Moderation' },
    ];

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-white">Admin Settings</h1>
            <div className="border-b border-gray-700 mb-6">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`${
                                activeTab === tab.id
                                ? 'border-pink-500 text-pink-400'
                                : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div>
                {activeTab === 'stats' && <SiteStatsTab />}
                {activeTab === 'prompts' && <GlobalPromptsTab />}
                {activeTab === 'users' && <UserManagementTab />}
                {activeTab === 'content' && <ContentModerationTab />}
            </div>
        </div>
    );
};

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard title="Total Users" value={allUsers.length} />
            <StatCard title="Total Characters" value={characters.length} />
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-medium text-gray-400">Characters by Type</h3>
                <p className="text-3xl font-bold mt-2"><span className="text-green-400">{publicChars}</span> Public / <span className="text-gray-400">{privateChars}</span> Private</p>
            </div>
             <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 md:col-span-3">
                <h3 className="text-lg font-medium text-gray-400">Users by Tier</h3>
                <div className="flex justify-around mt-2">
                    {['Admin', 'Subscription', 'Ads', 'Free'].map(type => (
                        <div key={type} className="text-center">
                            <p className="text-3xl font-bold">{(userStats[type as UserType] || 0)}</p>
                            <p className="text-sm text-gray-500">{type}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const StatCard: React.FC<{ title: string; value: number | string }> = ({ title, value }) => (
    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-medium text-gray-400">{title}</h3>
        <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
);

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
    
    const labelClasses = "block text-sm font-medium text-pink-400 mb-2";
    const textAreaClasses = "w-full p-2 bg-gray-900 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 h-64 font-mono text-sm";

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
                <button onClick={handleSave} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-md transition-colors">
                    Save Prompts
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
        <div>
            <input 
                type="text" 
                placeholder="Search users by username, name, or email..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-4 mb-4"
            />
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-900">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {filteredUsers.map(user => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <Avatar imageId={user.profile.avatarUrl} alt={user.profile.name} className="h-10 w-10 rounded-full object-cover"/>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-white">{user.profile.name}</div>
                                            <div className="text-sm text-gray-400">@{user.username}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <select 
                                        value={user.userType}
                                        onChange={(e) => auth?.updateUserType(user.id, e.target.value as UserType)}
                                        className="bg-gray-700 border-gray-600 rounded-md p-1 text-sm focus:ring-pink-500 focus:border-pink-500"
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
                                        ? <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-900 text-yellow-200">Silenced</span>
                                        : <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-900 text-green-200">Active</span>
                                    }
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex items-center space-x-2">
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
         <div>
            <input 
                type="text" 
                placeholder="Search characters by name or description..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-4 mb-4"
            />
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-900">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Character</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Creator</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {filteredCharacters.map(char => {
                            const creator = auth?.findUserById(char.creatorId);
                            return (
                                <tr key={char.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <Avatar imageId={char.avatarUrl} alt={char.name} className="h-10 w-10 rounded-md object-cover"/>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-white">{char.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{creator?.profile.name || 'Unknown'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {char.isSilencedByAdmin 
                                            ? <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-900 text-yellow-200">Silenced</span>
                                            : <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${char.isPublic ? 'bg-green-900 text-green-200' : 'bg-gray-600 text-gray-200'}`}>{char.isPublic ? 'Public' : 'Private'}</span>
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
