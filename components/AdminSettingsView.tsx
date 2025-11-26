
import React, { useState, useContext, useMemo, useEffect, useCallback, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { GlobalSettings, User, UserType, Character, AIContextSettings, CharacterContextField, UserRole, AppView, UserProfile } from '../types';
import ConfirmationModal from './ConfirmationModal';
import ProfileEditModal from './ProfileEditModal';
import Avatar from './Avatar';
import { ShieldCheckIcon, SaveIcon, SpinnerIcon, RefreshIcon, EditIcon, DeleteIcon, CloseIcon } from './Icons';
import { DEFAULT_BEYOND_PROMPT, DEFAULT_HAVEN_PROMPT } from '../services/aiService';

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
                {activeTab === 'content' && <ContentModerationTab setView={setView} setSelectedCharacter={setSelectedCharacter} setSelectedCreator={setSelectedCreator} />}
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
    const { allUsers = [], characters = [] } = auth || ({} as any);

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
    const [prompts, setPrompts] = useState<Omit<GlobalSettings, 'kidModePrompt' | 'enableAIModeration'>>({ 
        havenPrompt: '',
        beyondTheHavenPrompt: '',
    });
    const [isSaved, setIsSaved] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (auth?.globalSettings) {
            setPrompts({
                havenPrompt: auth.globalSettings.havenPrompt || DEFAULT_HAVEN_PROMPT,
                beyondTheHavenPrompt: auth.globalSettings.beyondTheHavenPrompt || DEFAULT_BEYOND_PROMPT,
            });
        }
    }, [auth?.globalSettings]);

    const handleSave = async () => {
        if (auth) {
            setIsSaving(true);
            try {
                await auth.updateGlobalSettings({ ...auth.globalSettings, ...prompts });
                setIsSaved(true);
                setTimeout(() => setIsSaved(false), 2500);
            } catch (error) {
                console.error("Save failed", error);
                alert("Failed to save global prompts. Please check your network.");
            } finally {
                setIsSaving(false);
            }
        }
    };
    
    const labelClasses = "block text-sm font-medium text-accent-primary mb-2";
    const textAreaClasses = "w-full p-2 bg-primary border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary h-64 font-mono text-sm";

    return (
        <div className="space-y-6">
            <div>
                <label htmlFor="havenPrompt" className="labelClasses">Haven Global Prompt</label>
                <textarea 
                    id="havenPrompt"
                    value={prompts.havenPrompt}
                    onChange={(e) => setPrompts(p => ({ ...p, havenPrompt: e.target.value }))}
                    className={textAreaClasses}
                    placeholder="Enter the global Haven prompt. If empty, the hardcoded default will be used."
                />
            </div>
            <div>
                <label htmlFor="beyondTheHavenPrompt" className="labelClasses">Beyond the Haven Global Prompt</label>
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
                    disabled={isSaving || isSaved}
                >
                    {isSaving ? (
                        <>
                            <SpinnerIcon className="w-5 h-5 animate-spin"/>
                            Saving...
                        </>
                    ) : isSaved ? (
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
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (auth?.globalSettings.kidModePrompt) {
            setKidPrompt(auth.globalSettings.kidModePrompt);
        }
    }, [auth?.globalSettings.kidModePrompt]);

    const handleSave = async () => {
        if(auth) {
            setIsSaving(true);
            try {
                await auth.updateGlobalSettings({ ...auth.globalSettings, kidModePrompt: kidPrompt });
                setIsSaved(true);
                setTimeout(() => setIsSaved(false), 2500);
            } catch (error) {
                console.error("Save failed", error);
                alert("Failed to save Kid Mode prompt. Please check your network.");
            } finally {
                setIsSaving(false);
            }
        }
    };
    
    const labelClasses = "block text-sm font-medium text-accent-primary mb-2";
    const textAreaClasses = "w-full p-2 bg-primary border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary h-64 font-mono text-sm";

    return (
        <div className="space-y-6">
            <div>
                <label htmlFor="kidModePrompt" className="labelClasses">Kid Mode Instructions</label>
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
                    disabled={isSaving || isSaved}
                >
                    {isSaving ? (
                        <>
                            <SpinnerIcon className="w-5 h-5 animate-spin"/>
                            Saving...
                        </>
                    ) : isSaved ? (
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
        includedFields: ['gender', 'personality', 'story', 'feeling', 'appearance', 'situation', 'greeting'], 
        historyLength: 50,
        maxResponseTokens: 1000,
    });
    const [inputValues, setInputValues] = useState({
        historyLength: '50',
        maxResponseTokens: '1000',
    });
    const [errors, setErrors] = useState({
        historyLength: '',
        maxResponseTokens: '',
    });
    const [isSaved, setIsSaved] = useState(false);

    const allFields: { id: CharacterContextField; label: string }[] = [
        { id: 'gender', label: 'Gender' },
        // Description is intentionally removed to enforce the "no description in context" rule
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
                maxResponseTokens: String(auth.aiContextSettings.maxResponseTokens),
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

    const handleInputChange = (key: 'historyLength' | 'maxResponseTokens', value: string) => {
        setInputValues(prev => ({ ...prev, [key]: value }));
        if (errors[key]) {
            setErrors(prev => ({ ...prev, [key]: '' }));
        }
    };

    const handleSave = () => {
        const newErrors = { historyLength: '', maxResponseTokens: '' };
        let isValid = true;

        const historyLengthNum = parseInt(inputValues.historyLength, 10);
        if (isNaN(historyLengthNum) || historyLengthNum < 0 || historyLengthNum > 200) {
            newErrors.historyLength = 'Must be a number between 0 and 200.';
            isValid = false;
        }

        const maxResponseTokensNum = parseInt(inputValues.maxResponseTokens, 10);
        if (isNaN(maxResponseTokensNum) || maxResponseTokensNum < 1 || maxResponseTokensNum > 8192) {
            newErrors.maxResponseTokens = 'Must be a number between 1 and 8192.';
            isValid = false;
        }

        setErrors(newErrors);

        if (isValid) {
            auth?.updateAIContextSettings({
                ...settings,
                historyLength: historyLengthNum,
                maxResponseTokens: maxResponseTokensNum,
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
                <p className="text-sm text-text-secondary mb-3">Select which fields from a character's profile are included in the AI's system instruction. 'Description' is excluded by system policy.</p>
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
            <div>
                <label htmlFor="historyLength" className="labelClasses">Chat History Context Length</label>
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
                <label htmlFor="maxResponseTokens" className="labelClasses">Max Response Tokens</label>
                <p className="text-sm text-text-secondary mb-3">The maximum number of tokens the AI can generate in a single response. Lower values may cut off responses mid-sentence. Recommended: 500-1000.</p>
                <input
                    type="number"
                    id="maxResponseTokens"
                    value={inputValues.maxResponseTokens}
                    onChange={(e) => handleInputChange('maxResponseTokens', e.target.value)}
                    className={inputClasses}
                />
                {errors.maxResponseTokens && <p className={errorTextClasses}>{errors.maxResponseTokens}</p>}
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
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!auth) return null;

    const { allUsers = [], updateUserType, updateUserRole, silenceUser, deleteUser, updateAnyUserProfile, currentUser } = auth;

    const filteredUsers = useMemo(() => {
        const lowerFilter = filter.toLowerCase();
        return allUsers.filter(u =>
            u.profile.name.toLowerCase().includes(lowerFilter) ||
            u.username.toLowerCase().includes(lowerFilter) ||
            u.profile.email.toLowerCase().includes(lowerFilter)
        );
    }, [allUsers, filter]);

    const handleSaveProfile = (profile: UserProfile, avatarFile: File | null) => {
        if (userToEdit) {
            updateAnyUserProfile(userToEdit.id, profile, avatarFile);
        }
        setUserToEdit(null);
    };
    
    const handleConfirmDelete = () => {
        if (userToDelete) {
            deleteUser(userToDelete.id);
        }
        setUserToDelete(null);
    };

    const userTypes: UserType[] = ['Free', 'Ads', 'Subscription'];
    const userRoles: UserRole[] = ['User', 'Moderator', 'Assistant Admin', 'Admin'];

    return (
        <div className="space-y-4">
            <input 
                type="text"
                placeholder="Search by name, username, or email..."
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="w-full max-w-lg p-2 bg-primary border border-border rounded-md"
            />
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-primary">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">User</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">Type</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">Role</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">Status</th>
                            <th className="relative px-4 py-2"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filteredUsers.map(user => (
                            <tr key={user.id}>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                        <Avatar imageId={user.profile.avatarUrl} alt={user.profile.name} className="w-8 h-8 rounded-full object-cover" />
                                        <div>
                                            <p className="font-medium">{user.profile.name}</p>
                                            <p className="text-sm text-text-secondary">{user.profile.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">{user.userType}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">{user.role}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                    {user.isSilenced && <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-900/50 text-yellow-300">Silenced</span>}
                                    {!user.isSilenced && <span className="px-2 py-1 text-xs font-semibold rounded-full bg-success/20 text-success">Active</span>}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium relative">
                                    {user.id !== currentUser?.id && user.role !== 'Admin' && (
                                        <button onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)} className="text-text-secondary hover:text-text-primary">
                                            &#x22EE; {/* Vertical ellipsis */}
                                        </button>
                                    )}
                                    {openMenu === user.id && (
                                        <div ref={menuRef} className="absolute right-0 mt-2 w-48 origin-top-right bg-primary rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10 border border-border">
                                            <div className="py-1" role="menu" aria-orientation="vertical">
                                                <button onClick={() => { setUserToEdit(user); setOpenMenu(null); }} className="block w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-hover">Edit Profile</button>
                                                <div className="px-4 py-2 text-xs text-text-secondary">Set Type:</div>
                                                {userTypes.map(type => (
                                                    <button key={type} onClick={() => { updateUserType(user.id, type); setOpenMenu(null); }} className="block w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-hover">{user.userType === type ? '✓ ' : ''}{type}</button>
                                                ))}
                                                <div className="border-t border-border my-1"></div>
                                                <div className="px-4 py-2 text-xs text-text-secondary">Set Role:</div>
                                                {userRoles.map(role => (
                                                    <button key={role} onClick={() => { updateUserRole(user.id, role); setOpenMenu(null); }} className="block w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-hover">{user.role === role ? '✓ ' : ''}{role}</button>
                                                ))}
                                                <div className="border-t border-border my-1"></div>
                                                <button onClick={() => { silenceUser(user.id, !user.isSilenced); setOpenMenu(null); }} className="block w-full text-left px-4 py-2 text-sm text-yellow-400 hover:bg-hover">{user.isSilenced ? 'Unsilence' : 'Silence'} User</button>
                                                <button onClick={() => { setUserToDelete(user); setOpenMenu(null); }} className="block w-full text-left px-4 py-2 text-sm text-danger hover:bg-hover">Delete User</button>
                                            </div>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {userToEdit && (
                <ProfileEditModal 
                    userProfile={userToEdit.profile} 
                    onSave={handleSaveProfile} 
                    onCancel={() => setUserToEdit(null)} 
                />
            )}
            {userToDelete && (
                <ConfirmationModal 
                    title="Delete User?"
                    message={`Are you sure you want to permanently delete user "${userToDelete.profile.name}"? This cannot be undone.`} 
                    onConfirm={handleConfirmDelete} 
                    onCancel={() => setUserToDelete(null)} 
                />
            )}
        </div>
    );
};

const ToggleSwitch: React.FC<{ id: string, checked: boolean; onChange: () => void }> = ({ id, checked, onChange }) => (
    <label htmlFor={id} className="relative inline-block w-12 h-6 align-middle select-none cursor-pointer">
        <input 
            type="checkbox" 
            id={id}
            checked={checked} 
            onChange={onChange} 
            className="sr-only"
        />
        <div className={`block w-12 h-6 rounded-full transition-colors ${checked ? 'bg-success' : 'bg-tertiary'}`}></div>
        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'transform translate-x-6' : ''}`}></div>
    </label>
);

const ContentModerationTab: React.FC<{
    setView: (view: AppView) => void;
    setSelectedCharacter: (character: Character) => void;
    setSelectedCreator: (user: User) => void;
}> = ({setView, setSelectedCharacter, setSelectedCreator}) => {
    const auth = useContext(AuthContext);
    const { globalSettings, updateGlobalSettings, runFullModerationScan, characters = [], silenceCharacter, deleteCharacter, findUserById } = auth || ({} as any);
    
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });
    const [characterSearch, setCharacterSearch] = useState('');
    const [charToDelete, setCharToDelete] = useState<string | null>(null);

    const handleToggleAIModeration = () => {
        if (updateGlobalSettings && globalSettings) {
            updateGlobalSettings({ ...globalSettings, enableAIModeration: !globalSettings.enableAIModeration });
        }
    };

    const handleRunScan = async () => {
        if (runFullModerationScan) {
            setIsScanning(true);
            setScanProgress({ current: 0, total: 0 });
            await runFullModerationScan((current: number, total: number) => {
                setScanProgress({ current, total });
            });
            setIsScanning(false);
        }
    };

    const handleConfirmDeleteCharacter = () => {
        if (charToDelete && deleteCharacter) {
            deleteCharacter(charToDelete);
            setCharToDelete(null);
        }
    };

    const filteredCharacters = useMemo(() => {
        if (!characterSearch) return characters;
        const lower = characterSearch.toLowerCase();
        return characters.filter((c: Character) => {
            const creator = findUserById?.(c.creatorId);
            const creatorName = creator?.profile?.name || '';
            return c.name.toLowerCase().includes(lower) || creatorName.toLowerCase().includes(lower);
        });
    }, [characters, characterSearch, findUserById]);

    return (
        <div className="space-y-8">
            {/* Moderation Tools Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-primary border border-border rounded-lg flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold text-text-primary">Active AI Moderation</h3>
                            <ToggleSwitch 
                                id="ai-mod-toggle"
                                checked={globalSettings?.enableAIModeration || false}
                                onChange={handleToggleAIModeration}
                            />
                        </div>
                        <p className="text-sm text-text-secondary">Automatically scan new comments and forum posts for policy violations.</p>
                    </div>
                </div>

                <div className="p-4 bg-primary border border-border rounded-lg flex flex-col justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-text-primary mb-2">Manual Content Scan</h3>
                        <p className="text-sm text-text-secondary mb-4">Run a one-time scan on all existing content.</p>
                    </div>
                    {isScanning ? (
                        <div className="w-full bg-tertiary rounded-full h-4 overflow-hidden relative">
                            <div 
                                className="bg-accent-secondary h-full transition-all duration-300" 
                                style={{ width: `${(scanProgress.current / Math.max(scanProgress.total, 1)) * 100}%` }}
                            ></div>
                            <p className="text-xs text-center text-white absolute inset-0 flex items-center justify-center drop-shadow-md">
                                {scanProgress.current} / {scanProgress.total}
                            </p>
                        </div>
                    ) : (
                        <button 
                            onClick={handleRunScan}
                            className="px-4 py-2 bg-tertiary hover:bg-hover text-text-primary rounded-md transition-colors flex items-center justify-center gap-2"
                        >
                            <RefreshIcon className="w-4 h-4" />
                            Run Full Scan
                        </button>
                    )}
                </div>
            </div>

            <div className="border-t border-border"></div>

            {/* Character Management Section */}
            <div>
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                    <h2 className="text-xl font-bold text-text-primary">Character Management</h2>
                    <input 
                        type="text"
                        placeholder="Search characters or creators..."
                        value={characterSearch}
                        onChange={e => setCharacterSearch(e.target.value)}
                        className="w-full sm:w-64 p-2 bg-primary border border-border rounded-md text-sm"
                    />
                </div>

                <div className="overflow-x-auto bg-primary border border-border rounded-lg">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-tertiary">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Character</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Creator</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredCharacters.map((char: Character) => {
                                const creator = findUserById?.(char.creatorId);
                                return (
                                    <tr key={char.id} className="hover:bg-secondary/50 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <button onClick={() => setSelectedCharacter(char)} className="flex items-center gap-3 hover:opacity-80 text-left">
                                                <Avatar imageId={char.avatarUrl} alt={char.name} className="w-8 h-8 rounded-full object-cover" />
                                                <span className="font-semibold text-text-primary">{char.name}</span>
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {creator ? (
                                                <button onClick={() => setSelectedCreator(creator)} className="text-sm text-text-primary hover:underline">
                                                    {creator.profile.name}
                                                </button>
                                            ) : (
                                                <span className="text-sm text-text-secondary italic">Unknown</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex gap-1">
                                                <span className={`px-2 py-0.5 text-xs rounded-full ${char.isPublic ? 'bg-success/20 text-success' : 'bg-tertiary text-text-secondary'}`}>
                                                    {char.isPublic ? 'Public' : 'Private'}
                                                </span>
                                                {char.isBeyondTheHaven && (
                                                    <span className="px-2 py-0.5 text-xs rounded-full bg-danger/20 text-danger">Beyond</span>
                                                )}
                                                {char.isSilencedByAdmin && (
                                                    <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-900/50 text-yellow-400">Silenced</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => setSelectedCharacter(char)}
                                                    className="p-1.5 text-text-secondary hover:text-accent-primary hover:bg-tertiary rounded transition-colors"
                                                    title="View"
                                                >
                                                    {/* Eye Icon fallback/reuse */}
                                                    <span className="text-xs font-bold border border-current px-1 rounded">View</span>
                                                </button>
                                                <button 
                                                    onClick={() => setView({ type: 'EDIT_CHARACTER', characterId: char.id })}
                                                    className="p-1.5 text-text-secondary hover:text-accent-secondary hover:bg-tertiary rounded transition-colors"
                                                    title="Edit"
                                                >
                                                    <EditIcon className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => silenceCharacter?.(char.id, !char.isSilencedByAdmin)}
                                                    className={`p-1.5 rounded transition-colors ${char.isSilencedByAdmin ? 'text-yellow-400 bg-yellow-900/20' : 'text-text-secondary hover:text-yellow-400 hover:bg-tertiary'}`}
                                                    title={char.isSilencedByAdmin ? "Unsilence" : "Silence"}
                                                >
                                                    <span className="text-xs font-bold px-1">!</span>
                                                </button>
                                                <button 
                                                    onClick={() => setCharToDelete(char.id)}
                                                    className="p-1.5 text-text-secondary hover:text-danger hover:bg-tertiary rounded transition-colors"
                                                    title="Delete"
                                                >
                                                    <DeleteIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredCharacters.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-text-secondary">
                                        No characters found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="flex justify-end">
                 <button onClick={() => setView({ type: 'MODERATOR_CONSOLE' })} className="text-accent-secondary hover:underline text-sm">Go to Moderator Console &rarr;</button>
            </div>

            {charToDelete && (
                <ConfirmationModal 
                    title="Delete Character?"
                    message="Are you sure you want to delete this character? This action cannot be undone and will remove all associated chats."
                    confirmText="Delete"
                    onConfirm={handleConfirmDeleteCharacter}
                    onCancel={() => setCharToDelete(null)}
                />
            )}
        </div>
    );
};

export default AdminConsoleView;
