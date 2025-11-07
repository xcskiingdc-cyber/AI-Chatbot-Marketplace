import React, { useState, useContext, useMemo, useEffect, useCallback, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { GlobalSettings, User, UserType, Character, AIContextSettings, CharacterContextField, UserRole, AppView } from '../types';
import ConfirmationModal from './ConfirmationModal';
import ProfileEditModal from './ProfileEditModal';
import Avatar from './Avatar';
import { ShieldCheckIcon, SaveIcon } from './Icons';
import { BEYOND_THE_HAVEN_PROMPT, HAVEN_PROMPT } from '../services/aiService';

interface AdminConsoleViewProps {
  setView: (view: AppView) => void;
  setSelectedCharacter: (character: Character) => void;
  setSelectedCreator: (user: User) => void;
}

const AdminConsoleView: React.FC<AdminConsoleViewProps> = ({ setView, setSelectedCharacter, setSelectedCreator }) => {
    const auth = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState('stats');
    
    if (!auth || !['Admin', 'Assistant Admin'].includes(auth.currentUser?.role || '')) {
        return <p className="p-8 text-center text-red-400">Access Denied.</p>;
    }

    const tabs = [
        { id: 'stats', label: 'Site Stats' },
        { id: 'prompts', label: 'Global Prompts' },
        { id: 'context', label: 'AI Context' },
        { id: 'kid_mode', label: 'Kid Mode' },
        { id: 'users', label: 'User Management' },
        { id: 'content', label: 'Content Moderation' },
    ];

    return (
        <div className="p-4 sm:p-6 md:p-8 w-full h-full flex flex-col">
            <h1 className="text-3xl font-bold mb-6 text-text-primary flex items-center gap-3 flex-shrink-0"><ShieldCheckIcon className="w-8 h-8"/> Admin Console</h1>
            <div className="border-b border-border mb-6 flex-shrink-0">
                <nav className="-mb-px flex space-x-2 sm:space-x-6 overflow-x-auto" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`${
                                activeTab === tab.id
                                ? 'border-accent-primary text-accent-primary'
                                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'
                            } whitespace-nowrap py-4 px-1 sm:px-2 border-b-2 font-medium text-sm flex items-center gap-2`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="bg-secondary p-4 sm:p-6 rounded-lg border border-border flex-1 overflow-y-auto">
                {activeTab === 'stats' && <SiteStatsTab />}
                {activeTab === 'prompts' && <GlobalPromptsTab />}
                {activeTab === 'context' && <AIContextManagementTab />}
                {activeTab === 'kid_mode' && <KidModeManagementTab />}
                {activeTab === 'users' && <UserManagementTab />}
                {activeTab === 'content' && <ContentModerationTab setView={setView}/>}
            </div>
        </div>
    );
};

const StatCard: React.FC<{ title: string; value?: number | string, children?: React.ReactNode }> = ({ title, value, children }) => (
    <div className="bg-primary p-6 rounded-lg border border-border">
        <h3 className="text-lg font-medium text-text-secondary">{title}</h3>
        {value !== undefined && <p className="text-3xl font-bold mt-2 text-text-primary">{value}</p>}
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
                <p className="text-3xl font-bold mt-2 text-text-primary"><span className="text-success">{publicChars}</span> Public / <span className="text-text-secondary">{privateChars}</span> Private</p>
            </StatCard>
             <div className="md:col-span-2 lg:col-span-3">
                <StatCard title="Users by Tier">
                    <div className="flex flex-wrap justify-around mt-2 gap-4">
                        {['Subscription', 'Ads', 'Free'].map(type => (
                            <div key={type} className="text-center">
                                <p className="text-3xl font-bold text-text-primary">{(userStats[type as UserType] || 0)}</p>
                                <p className="text-sm text-text-secondary">{type}</p>
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
    const [prompts, setPrompts] = useState<Omit<GlobalSettings, 'kidModePrompt'>>({ 
        havenPrompt: '',
        beyondTheHavenPrompt: '',
    });
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        if (auth?.globalSettings) {
            setPrompts({
                havenPrompt: auth.globalSettings.havenPrompt || HAVEN_PROMPT,
                beyondTheHavenPrompt: auth.globalSettings.beyondTheHavenPrompt || BEYOND_THE_HAVEN_PROMPT,
            });
        }
    }, [auth?.globalSettings]);

    const handleSave = () => {
        if (auth) {
            auth.updateGlobalSettings({ ...auth.globalSettings, ...prompts });
        }
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2500);
    };
    
    const labelClasses = "block text-sm font-medium text-accent-primary mb-2";
    const textAreaClasses = "w-full p-2 bg-primary border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary h-64 font-mono text-sm";

    return (
        <div className="space-y-6">
            <div>
                <label htmlFor="havenPrompt" className={labelClasses}>Haven Global Prompt</label>
                <textarea 
                    id="havenPrompt"
                    value={prompts.havenPrompt}
                    onChange={(e) => setPrompts(p => ({ ...p, havenPrompt: e.target.value }))}
                    className={textAreaClasses}
                    placeholder="Enter the global Haven prompt. If empty, the hardcoded default will be used."
                />
            </div>
            <div>
                <label htmlFor="beyondTheHavenPrompt" className={labelClasses}>Beyond the Haven Global Prompt</label>
                <textarea 
                    id="beyondTheHavenPrompt"
                    value={prompts.beyondTheHavenPrompt}
                    onChange={(e) => setPrompts(p => ({ ...p, beyondTheHavenPrompt: e.target.value }))}
                    className={textAreaClasses}
                    placeholder="Enter the global Beyond the Haven prompt. If empty, the hardcoded default will be used."
                />
            </div>
            <div className="flex justify-end">
                <button 
                    onClick={handleSave} 
                    className={`px-6 py-2 rounded-md transition-colors flex items-center justify-center gap-2 ${
                        isSaved 
                            ? 'bg-success text-white cursor-default' 
                            : 'bg-accent-secondary text-white hover:bg-accent-secondary-hover'
                    }`}
                    disabled={isSaved}
                >
                    {isSaved ? (
                        <>
                            <SaveIcon className="w-5 h-5" />
                            Saved!
                        </>
                    ) : (
                        'Save Prompts'
                    )}
                </button>
            </div>
        </div>
    );
};

const KidModeManagementTab: React.FC = () => {
    const auth = useContext(AuthContext);
    const [kidPrompt, setKidPrompt] = useState('');
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        if (auth?.globalSettings.kidModePrompt) {
            setKidPrompt(auth.globalSettings.kidModePrompt);
        }
    }, [auth?.globalSettings.kidModePrompt]);

    const handleSave = () => {
        if(auth) {
            auth.updateGlobalSettings({ ...auth.globalSettings, kidModePrompt: kidPrompt });
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 2500);
        }
    };
    
    const labelClasses = "block text-sm font-medium text-accent-primary mb-2";
    const textAreaClasses = "w-full p-2 bg-primary border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary h-64 font-mono text-sm";

    return (
        <div className="space-y-6">
            <div>
                <label htmlFor="kidModePrompt" className={labelClasses}>Kid Mode Instructions</label>
                 <p className="text-sm text-text-secondary mb-3">These instructions are added to the system prompt when a user enables 'Kid Mode' in their chat settings. Use this to guide the AI to be more child-friendly.</p>
                <textarea 
                    id="kidModePrompt"
                    value={kidPrompt}
                    onChange={(e) => setKidPrompt(e.target.value)}
                    className={textAreaClasses}
                    placeholder="Example: You are speaking to a young child. Use simple words, short sentences, and a very friendly, encouraging, and patient tone. Avoid complex topics or scary situations."
                />
            </div>
            <div className="flex justify-end">
                <button 
                    onClick={handleSave}
                    className={`px-6 py-2 rounded-md transition-colors flex items-center justify-center gap-2 ${
                        isSaved 
                            ? 'bg-success text-white cursor-default' 
                            : 'bg-accent-secondary text-white hover:bg-accent-secondary-hover'
                    }`}
                    disabled={isSaved}
                >
                    {isSaved ? (
                        <>
                            <SaveIcon className="w-5 h-5" />
                            Saved!
                        </>
                    ) : (
                        'Save Kid Mode Prompt'
                    )}
                </button>
            </div>
        </div>
    )
}

const AIContextManagementTab: React.FC = () => {
    const auth = useContext(AuthContext);
    const [settings, setSettings] = useState<AIContextSettings>({ 
        includedFields: ['gender', 'personality', 'story', 'situation', 'feeling', 'appearance'], 
        historyLength: 200, 
        maxResponseCharacters: 2000 
    });
    const [inputValues, setInputValues] = useState({
        historyLength: '200',
        maxResponseCharacters: '2000'
    });
    const [errors, setErrors] = useState({
        historyLength: '',
        maxResponseCharacters: ''
    });
    const [isSaved, setIsSaved] = useState(false);

    const allFields: { id: CharacterContextField; label: string }[] = [
        { id: 'gender', label: 'Gender' },
        { id: 'description', label: 'Description' },
        { id: 'personality', label: 'Personality' },
        { id: 'appearance', label: 'Appearance' },
        { id: 'story', label: 'Backstory' },
        { id: 'situation', label: 'Situation' },
        { id: 'feeling', label: 'Initial Mood' },
        { id: 'greeting', label: 'Greeting' },
    ];

    useEffect(() => {
        if (auth?.aiContextSettings) {
            setSettings(auth.aiContextSettings);
            setInputValues({
                historyLength: String(auth.aiContextSettings.historyLength),
                maxResponseCharacters: String(auth.aiContextSettings.maxResponseCharacters),
            });
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

    const handleInputChange = (key: 'historyLength' | 'maxResponseCharacters', value: string) => {
        setInputValues(prev => ({ ...prev, [key]: value }));
        if (errors[key]) {
            setErrors(prev => ({ ...prev, [key]: '' }));
        }
    };

    const handleSave = () => {
        const newErrors = { historyLength: '', maxResponseCharacters: '' };
        let isValid = true;

        const historyLengthNum = parseInt(inputValues.historyLength, 10);
        if (isNaN(historyLengthNum) || historyLengthNum < 0 || historyLengthNum > 200) {
            newErrors.historyLength = 'Must be a number between 0 and 200.';
            isValid = false;
        }

        const maxResponseCharactersNum = parseInt(inputValues.maxResponseCharacters, 10);
        if (isNaN(maxResponseCharactersNum) || maxResponseCharactersNum < 400 || maxResponseCharactersNum > 40000) {
            newErrors.maxResponseCharacters = 'Must be a number between 400 and 40,000.';
            isValid = false;
        }

        setErrors(newErrors);

        if (isValid) {
            auth?.updateAIContextSettings({
                ...settings,
                historyLength: historyLengthNum,
                maxResponseCharacters: maxResponseCharactersNum,
            });
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 2500);
        }
    };

    const labelClasses = "block text-sm font-medium text-accent-primary mb-2";
    const inputClasses = "w-full max-w-xs p-2 bg-primary border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary";
    const errorTextClasses = "text-sm text-red-400 mt-1";

    return (
        <div className="space-y-6">
            <div>
                <label className={labelClasses}>Character Fields for Context</label>
                <p className="text-sm text-text-secondary mb-3">Select which fields from a character's profile are included in the AI's system instruction.</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {allFields.map(field => (
                        <label key={field.id} className="flex items-center space-x-2 text-text-primary p-2 bg-primary border border-border rounded-md">
                            <input
                                type="checkbox"
                                checked={settings.includedFields.includes(field.id)}
                                onChange={() => handleFieldToggle(field.id)}
                                className="form-checkbox h-5 w-5 text-accent-primary bg-tertiary border-border rounded focus:ring-accent-primary"
                            />
                            <span>{field.label}</span>
                        </label>
                    ))}
                </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
                 <div>
                    <label htmlFor="historyLength" className={labelClasses}>Chat History Context Length</label>
                    <p className="text-sm text-text-secondary mb-3">How many previous messages (user and bot combined) to include for context. Recommended: 20-40.</p>
                    <input
                        type="number"
                        id="historyLength"
                        value={inputValues.historyLength}
                        onChange={(e) => handleInputChange('historyLength', e.target.value)}
                        className={inputClasses}
                    />
                    {errors.historyLength && <p className={errorTextClasses}>{errors.historyLength}</p>}
                </div>
                 <div>
                    <label htmlFor="maxResponseCharacters" className={labelClasses}>Max Response Characters</label>
                    <p className="text-sm text-text-secondary mb-3">Global character limit for an AI response. Range: 400 - 40,000.</p>
                    <input
                        type="number"
                        id="maxResponseCharacters"
                        value={inputValues.maxResponseCharacters}
                        onChange={(e) => handleInputChange('maxResponseCharacters', e.target.value)}
                        className={inputClasses}
                    />
                    {errors.maxResponseCharacters && <p className={errorTextClasses}>{errors.maxResponseCharacters}</p>}
                </div>
            </div>
             <div className="flex justify-end">
                <button 
                    onClick={handleSave} 
                    className={`px-6 py-2 rounded-md transition-colors flex items-center justify-center gap-2 ${
                        isSaved 
                            ? 'bg-success text-white cursor-default' 
                            : 'bg-accent-secondary text-white hover:bg-accent-secondary-hover'
                    }`}
                    disabled={isSaved}
                >
                    {isSaved ? (
                        <>
                            <SaveIcon className="w-5 h-5" />
                            Saved!
                        </>
                    ) : (
                        'Save AI Settings'
                    )}
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
    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenu(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const filteredUsers = useMemo(() => {
        if (!auth?.allUsers) return [];
        return auth.allUsers.filter(user => 
            user.username.toLowerCase().includes(filter.toLowerCase()) ||
            user.profile.name.toLowerCase().includes(filter.toLowerCase()) ||
            user.profile.email.toLowerCase().includes(filter.toLowerCase())
        );
    }, [auth?.allUsers, filter]);

    const handleSaveProfile = (profile: User['profile'], avatarFile: File | null) => {
        if (userToEdit) {
            auth?.updateAnyUserProfile(userToEdit.id, profile);
            // Note: Admin edits to profile pictures are not implemented to avoid complexity with dbService
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
                className="w-full bg-primary border border-border rounded-md py-2 px-4"
            />
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-tertiary">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filteredUsers.map(user => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <Avatar imageId={user.profile.avatarUrl} alt={user.profile.name} className="h-10 w-10 rounded-full object-cover"/>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-text-primary">{user.profile.name}</div>
                                            <div className="text-sm text-text-secondary">@{user.username}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">{user.role}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">{user.userType}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {user.isSilenced 
                                        ? <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-900/50 text-yellow-300">Silenced</span>
                                        : <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-900/50 text-green-300">Active</span>
                                    }
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="relative" ref={openMenu === user.id ? menuRef : null}>
                                        <button onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)} className="px-3 py-1 bg-tertiary hover:bg-hover rounded-md">
                                            Actions &#9662;
                                        </button>
                                        {openMenu === user.id && (
                                            <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-tertiary ring-1 ring-black ring-opacity-5 z-10 p-1">
                                                <button onClick={() => { setUserToEdit(user); setOpenMenu(null); }} className="block w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-hover hover:text-text-primary rounded">Edit Profile</button>
                                                {user.role !== 'Admin' && (
                                                    <>
                                                        <div className="my-1 border-t border-border"></div>
                                                        <div className="px-3 py-2 text-xs font-semibold text-text-secondary">Change Role</div>
                                                        {(['User', 'Moderator', 'Assistant Admin'] as UserRole[]).map(role => (
                                                            <button key={role} disabled={user.role === role} onClick={() => { auth?.updateUserRole(user.id, role); setOpenMenu(null); }} className="block w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-hover hover:text-text-primary rounded disabled:opacity-50 disabled:cursor-not-allowed">{user.role === role ? `✓ ${role}` : role}</button>
                                                        ))}
                                                        <div className="my-1 border-t border-border"></div>
                                                        <div className="px-3 py-2 text-xs font-semibold text-text-secondary">Change Type</div>
                                                        {(['Free', 'Ads', 'Subscription'] as UserType[]).map(type => (
                                                             <button key={type} disabled={user.userType === type} onClick={() => { auth?.updateUserType(user.id, type); setOpenMenu(null); }} className="block w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-hover hover:text-text-primary rounded disabled:opacity-50 disabled:cursor-not-allowed">{user.userType === type ? `✓ ${type}` : type}</button>
                                                        ))}
                                                        <div className="my-1 border-t border-border"></div>
                                                        <button onClick={() => { auth?.silenceUser(user.id, !user.isSilenced); setOpenMenu(null); }} className="block w-full text-left px-3 py-2 text-sm text-yellow-400 hover:bg-hover hover:text-yellow-300 rounded">{user.isSilenced ? 'Unsilence' : 'Silence User'}</button>
                                                        <button onClick={() => { setUserToDelete(user); setOpenMenu(null); }} className="block w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-hover hover:text-red-400 rounded">Delete User</button>
                                                    </>
                                                )}
                                            </div>
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

const ContentModerationTab: React.FC<{setView: (view: AppView) => void}> = ({setView}) => {
    const auth = useContext(AuthContext);
    const [filter, setFilter] = useState('');
    const [charToDelete, setCharToDelete] = useState<Character | null>(null);
    
    const filteredCharacters = useMemo(() => {
        if (!auth?.characters) return [];
        return auth.characters.filter(c => 
            c.name.toLowerCase().includes(filter.toLowerCase()) ||
            c.description.toLowerCase().includes(filter.toLowerCase())
        );
    }, [auth?.characters, filter]);
    
    const handleConfirmDelete = () => {
        if (charToDelete && auth) {
            auth.deleteCharacter(charToDelete.id);
        }
        setCharToDelete(null);
    };

    return (
         <div className="space-y-4">
            <input 
                type="text" 
                placeholder="Search characters by name or description..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full bg-primary border border-border rounded-md py-2 px-4"
            />
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-tertiary">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Character</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Creator</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filteredCharacters.map(char => {
                            const creator = auth?.findUserById(char.creatorId);
                            return (
                                <tr key={char.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <Avatar imageId={char.avatarUrl} alt={char.name} className="h-10 w-10 rounded-md object-cover"/>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-text-primary">{char.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{creator?.profile.name || 'Unknown'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {char.isSilencedByAdmin 
                                            ? <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-900/50 text-yellow-300">Silenced</span>
                                            : <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${char.isPublic ? 'bg-green-900/50 text-green-300' : 'bg-gray-600/50 text-gray-300'}`}>{char.isPublic ? 'Public' : 'Private'}</span>
                                        }
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                                        <button onClick={() => setView({ type: 'EDIT_CHARACTER', characterId: char.id })} className="text-accent-secondary hover:underline">Edit</button>
                                        <button onClick={() => auth?.silenceCharacter(char.id, !char.isSilencedByAdmin)} className="text-yellow-400 hover:text-yellow-300">{char.isSilencedByAdmin ? 'Unsilence' : 'Silence'}</button>
                                        <button onClick={() => setCharToDelete(char)} className="text-danger hover:opacity-80">Delete</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {charToDelete && (
                <ConfirmationModal 
                    title="Delete Character?"
                    message={`Are you sure you want to permanently delete "${charToDelete.name}"? This action cannot be undone.`}
                    confirmText="Delete"
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setCharToDelete(null)}
                />
            )}
        </div>
    );
};

export default AdminConsoleView;