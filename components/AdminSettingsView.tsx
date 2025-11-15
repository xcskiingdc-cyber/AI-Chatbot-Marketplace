import React, { useState, useContext, useMemo, useEffect, useCallback, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
// FIX: Import UserProfile to resolve the 'Cannot find name' error.
import { GlobalSettings, User, UserType, Character, AIContextSettings, CharacterContextField, UserRole, AppView, UserProfile } from '../types';
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
        maxResponseTokens: 150,
    });
    const [inputValues, setInputValues] = useState({
        historyLength: '200',
        maxResponseTokens: '150',
    });
    const [errors, setErrors] = useState({
        historyLength: '',
        maxResponseTokens: '',
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
                <label htmlFor="maxResponseTokens" className={labelClasses}>Max Response Tokens</label>
                <p className="text-sm text-text-secondary mb-3">The maximum number of tokens the AI can generate in a single response. A lower number means shorter replies. (e.g., 150)</p>
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

    const handleSaveProfile = (profile: UserProfile) => {
        if (userToEdit) {
            updateAnyUserProfile(userToEdit.id, profile);
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
                                <td className="px-4