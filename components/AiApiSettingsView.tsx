
import React, { useState, useContext, useEffect, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ApiConnection, ApiProvider, AITool, ToolConfig } from '../types';
import { PlusIcon, EditIcon, DeleteIcon, CloseIcon, SaveIcon, RefreshIcon, SpinnerIcon } from './Icons';
import ConfirmationModal from './ConfirmationModal';

const toolMetadata: Record<AITool, { name: string; description: string }> = {
    aiCharacterChat: {
        name: 'AI Character Chat, Stats & Narrative',
        description: 'The core engine. Handles generating character replies, calculating stat updates based on the conversation, and auto-updating the Story Journal with new events in a single pass.',
    },
    imageGeneration: {
        name: 'Image Generation',
        description: 'Generates character avatars in the character editor.',
    },
    characterSummarization: {
        name: 'Character Summarization',
        description: 'Creates concise versions of character data for more efficient context.',
    },
    narrativeSummarization: {
        name: 'Legacy Narrative (Deprecated)',
        description: 'Deprecated. Narrative updates are now handled automatically by the main Chat model.',
    },
    textToSpeech: {
        name: 'Text-to-Speech (TTS)',
        description: 'Generates audio for character messages in chat.',
    },
    textModeration: {
        name: 'Text Content Moderation',
        description: 'Scans comments, direct messages, and forum posts for policy violations.',
    },
    imageModeration: {
        name: 'Image Content Moderation',
        description: 'Scans uploaded images for policy violations.',
    },
};

const ToolConnectionSettings: React.FC = () => {
    const auth = useContext(AuthContext);
    const { apiConnections = [], aiToolSettings, updateAIToolSettings } = auth!;
    const [localSettings, setLocalSettings] = useState(aiToolSettings.toolConfigs);
    const [isSaved, setIsSaved] = useState(false);

    // Sync local settings if global settings change (e.g. on initial load)
    useEffect(() => {
        setLocalSettings(aiToolSettings.toolConfigs);
    }, [aiToolSettings.toolConfigs]);

    const activeConnections = useMemo(() => apiConnections.filter(c => c.isActive), [apiConnections]);

    const handleConnectionChange = (tool: AITool, connectionId: string) => {
        setLocalSettings(prev => ({
            ...prev,
            [tool]: {
                connectionId: connectionId === 'none' ? null : connectionId,
                modelOverride: null // Reset model when connection changes
            }
        }));
    };

    const handleModelChange = (tool: AITool, model: string) => {
        setLocalSettings(prev => ({
            ...prev,
            [tool]: {
                ...prev[tool],
                modelOverride: model === 'default' ? null : model
            }
        }));
    };

    const handleSave = () => {
        updateAIToolSettings({ toolConfigs: localSettings });
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2500);
    };

    // Filter out narrativeSummarization from the UI as it is now merged into Chat
    const visibleTools = Object.keys(toolMetadata).filter(key => key !== 'narrativeSummarization') as AITool[];

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">Tool Connections & Models</h2>
            <p className="text-sm text-text-secondary mb-6">Assign a specific active API connection and model to each system function. If 'Default Model' is selected, the system will use the first model available in that connection. If a tool is set to 'Disabled', the feature will not be available.</p>
            <div className="space-y-4">
                {visibleTools.map(toolKey => {
                    const tool = toolKey as AITool;
                    const config = localSettings[tool] || { connectionId: null, modelOverride: null };
                    const selectedConnection = activeConnections.find(c => c.id === config.connectionId);

                    return (
                        <div key={tool} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-primary border border-border rounded-lg">
                            <div className="flex-1">
                                <h4 className="font-semibold">{toolMetadata[tool].name}</h4>
                                <p className="text-xs text-text-secondary">{toolMetadata[tool].description}</p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                <div className="flex flex-col">
                                    <label className="text-xs text-text-secondary mb-1">Connection</label>
                                    <select
                                        value={config.connectionId || 'none'}
                                        onChange={(e) => handleConnectionChange(tool, e.target.value)}
                                        className="w-full sm:w-48 p-2 bg-secondary border border-border rounded-md text-sm"
                                    >
                                        <option value="none">Disabled</option>
                                        {activeConnections.map(conn => (
                                            <option key={conn.id} value={conn.id}>
                                                {conn.name} ({conn.provider})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {selectedConnection && (
                                    <div className="flex flex-col">
                                        <label className="text-xs text-text-secondary mb-1">Model Override</label>
                                        <select
                                            value={config.modelOverride || 'default'}
                                            onChange={(e) => handleModelChange(tool, e.target.value)}
                                            className="w-full sm:w-48 p-2 bg-secondary border border-border rounded-md text-sm"
                                        >
                                            <option value="default">Default Model</option>
                                            {selectedConnection.models.map(model => (
                                                <option key={model} value={model}>
                                                    {model}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-end mt-6">
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
                            Saved Tool Configuration
                        </>
                    ) : (
                        'Save Tool Configuration'
                    )}
                </button>
            </div>
        </div>
    );
};

// Modal for Adding/Editing a connection
const ApiConnectionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (connection: Omit<ApiConnection, 'id'> & { id?: string }) => void;
    existingConnection?: ApiConnection | null;
}> = ({ isOpen, onClose, onSave, existingConnection }) => {
    const [connection, setConnection] = useState<Omit<ApiConnection, 'id'>>({
        name: '',
        provider: 'Gemini',
        apiKey: '',
        baseUrl: '',
        models: [],
        isActive: true,
    });
    const [modelsStr, setModelsStr] = useState('');

    useEffect(() => {
        if (existingConnection) {
            setConnection(existingConnection);
            setModelsStr(existingConnection.models.join(', '));
        } else {
            setConnection({ name: '', provider: 'Gemini', apiKey: '', baseUrl: '', models: [], isActive: true });
            setModelsStr('gemini-2.5-flash, gemini-2.5-flash-image, gemini-2.5-flash-preview-tts');
        }
    }, [existingConnection, isOpen]);

    if (!isOpen) return null;

    const isDefaultConnection = existingConnection?.id === 'google-ai-studio-default-connection';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...connection,
            id: existingConnection?.id,
            models: modelsStr.split(',').map(m => m.trim()).filter(Boolean),
        });
    };
    
    const formFieldClasses = "w-full p-2 bg-secondary border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary text-text-primary";
    const labelClasses = "block text-sm font-medium text-text-secondary mb-1";
    const providers: ApiProvider[] = ['Gemini', 'OpenAI', 'Anthropic', 'Other'];

    return (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-b from-primary to-secondary rounded-lg shadow-soft-lg w-full max-w-lg relative border border-border">
                <div className="p-4 border-b border-border flex justify-between items-center">
                    <h2 className="text-xl font-bold">{existingConnection ? 'Edit' : 'Add'} API Connection</h2>
                    <button onClick={onClose}><CloseIcon className="w-6 h-6" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label htmlFor="name" className="labelClasses">Connection Name *</label>
                        <input type="text" id="name" value={connection.name} onChange={e => setConnection(c => ({...c, name: e.target.value}))} className={formFieldClasses} required />
                    </div>
                    <div>
                        <label htmlFor="provider" className="labelClasses">Provider *</label>
                        <select id="provider" value={connection.provider} onChange={e => setConnection(c => ({...c, provider: e.target.value as ApiProvider}))} className={formFieldClasses}>
                            {providers.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="apiKey" className="labelClasses">API Key *</label>
                        {isDefaultConnection ? (
                             <input type="text" id="apiKey" value="Using built-in key" className={`${formFieldClasses} bg-hover cursor-not-allowed`} disabled />
                        ) : (
                             <input type="password" id="apiKey" value={connection.apiKey} onChange={e => setConnection(c => ({...c, apiKey: e.target.value}))} className={formFieldClasses} required />
                        )}
                    </div>
                     <div>
                        <label htmlFor="baseUrl" className="labelClasses">Base URL (Optional)</label>
                        <input type="text" id="baseUrl" value={connection.baseUrl} onChange={e => setConnection(c => ({...c, baseUrl: e.target.value}))} className={formFieldClasses} placeholder="e.g., for proxies or self-hosted models" />
                    </div>
                    <div>
                        <label htmlFor="models" className="labelClasses">Available Models *</label>
                        <textarea id="models" value={modelsStr} onChange={e => setModelsStr(e.target.value)} className={formFieldClasses} rows={3} placeholder="Comma-separated model names, e.g., gemini-2.5-flash, gemini-2.5-flash-image" required />
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 bg-tertiary rounded-md">Cancel</button>
                        <button type="submit" className="px-6 py-2 bg-accent-secondary text-white rounded-md">Save Connection</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ToggleSwitch: React.FC<{ id: string, checked: boolean; onChange: () => void; disabled?: boolean }> = ({ id, checked, onChange, disabled }) => (
    <label htmlFor={id} className={`relative inline-block w-14 h-8 align-middle select-none transition duration-200 ease-in ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
        <input 
            type="checkbox" 
            id={id}
            checked={checked} 
            onChange={!disabled ? onChange : undefined} 
            className="sr-only"
            disabled={disabled}
        />
        <div className={`block w-14 h-8 rounded-full ${checked ? 'bg-success' : 'bg-tertiary'}`}></div>
        <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${checked ? 'transform translate-x-6' : ''}`}></div>
    </label>
);


const AiApiSettingsView: React.FC = () => {
    const auth = useContext(AuthContext);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [connectionToEdit, setConnectionToEdit] = useState<ApiConnection | null>(null);
    const [connectionToDelete, setConnectionToDelete] = useState<ApiConnection | null>(null);
    const [isRestoring, setIsRestoring] = useState(false);
    
    if (!auth) return null;
    const { apiConnections, defaultApiConnectionId, addApiConnection, updateApiConnection, deleteApiConnection, setDefaultApiConnection, toggleApiConnectionActive } = auth;

    const handleSave = (connection: Omit<ApiConnection, 'id'> & { id?: string }) => {
        if (connection.id) { // Editing
            updateApiConnection(connection as ApiConnection);
        } else { // Adding
            addApiConnection(connection);
        }
        setIsModalOpen(false);
    };

    const handleConfirmDelete = () => {
        if (connectionToDelete) {
            deleteApiConnection(connectionToDelete.id);
        }
        setConnectionToDelete(null);
    };

    const handleRestoreGemini = async () => {
        setIsRestoring(true);
        try {
            await addApiConnection({
                name: 'Gemini (Default)',
                provider: 'Gemini',
                apiKey: 'process.env.API_KEY', // This acts as a placeholder flag for the backend to use the env var
                models: [
                    'gemini-2.5-flash',
                    'gemini-3-pro-preview',
                    'gemini-2.5-flash-image',
                    'gemini-2.5-flash-preview-tts'
                ],
                isActive: true,
                baseUrl: ''
            });
            alert("Gemini connection restored successfully!");
        } catch (error) {
            console.error("Failed to restore Gemini:", error);
            alert("Failed to restore default Gemini connection. Please check your network.");
        } finally {
            setIsRestoring(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-text-primary">AI API Settings</h1>
                <div className="flex gap-2">
                    <button 
                        onClick={handleRestoreGemini} 
                        disabled={isRestoring}
                        className="flex items-center gap-2 px-4 py-2 bg-tertiary text-text-primary rounded-md hover:bg-hover transition-colors border border-border disabled:opacity-50"
                    >
                        {isRestoring ? <SpinnerIcon className="w-5 h-5 animate-spin"/> : <RefreshIcon className="w-5 h-5" />} 
                        {isRestoring ? 'Restoring...' : 'Restore Default Gemini'}
                    </button>
                    <button onClick={() => { setConnectionToEdit(null); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-accent-secondary text-white rounded-md hover:bg-accent-secondary-hover">
                        <PlusIcon className="w-5 h-5" /> Add New Connection
                    </button>
                </div>
            </div>
            <div className="space-y-8">
                <div>
                    <h2 className="text-2xl font-bold mb-4">API Connections</h2>
                    <p className="text-sm text-text-secondary mb-6">Manage the API keys and endpoints for different AI providers. The 'Default' connection is a fallback for chat if a character's model isn't found in another connection. It cannot be deactivated or deleted.</p>
                    <div className="space-y-4">
                        {apiConnections.length === 0 && (
                            <div className="p-4 bg-secondary rounded-lg border border-border text-center text-text-secondary">
                                No API connections found. Click "Restore Default Gemini" or add one manually.
                            </div>
                        )}
                        {apiConnections.map(conn => {
                            const isDefault = conn.id === defaultApiConnectionId;
                            return (
                                <div key={conn.id} className={`p-4 bg-secondary rounded-lg border-2 ${isDefault ? 'border-success' : 'border-border'} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`}>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-xl font-bold">{conn.name}</h3>
                                            {isDefault && <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-success/20 text-success">Default</span>}
                                        </div>
                                        <p className="text-sm text-text-secondary">Provider: {conn.provider}</p>
                                        <p className="text-xs text-text-secondary mt-2 font-mono">ID: {conn.id}</p>
                                    </div>
                                    <div className="flex items-center gap-4 flex-shrink-0">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm font-medium ${conn.isActive ? 'text-text-primary' : 'text-text-secondary'}`}>
                                                {conn.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                            <ToggleSwitch 
                                                id={`toggle-${conn.id}`}
                                                checked={conn.isActive} 
                                                onChange={() => toggleApiConnectionActive(conn.id)}
                                                disabled={isDefault}
                                            />
                                        </div>
                                        {!isDefault && (
                                            <button onClick={() => setDefaultApiConnection(conn.id)} disabled={!conn.isActive} className="px-3 py-1.5 text-sm bg-tertiary rounded-md hover:bg-hover disabled:opacity-50 disabled:cursor-not-allowed">Set as Default</button>
                                        )}
                                        <button onClick={() => { setConnectionToEdit(conn); setIsModalOpen(true); }} className="p-2 bg-tertiary rounded-md hover:bg-hover"><EditIcon className="w-4 h-4" /></button>
                                        <button onClick={() => setConnectionToDelete(conn)} disabled={isDefault} className="p-2 bg-tertiary rounded-md hover:bg-hover disabled:opacity-50 disabled:cursor-not-allowed"><DeleteIcon className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="border-t border-border my-8"></div>

                <ToolConnectionSettings />
            </div>

            <ApiConnectionModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                existingConnection={connectionToEdit}
            />

            {connectionToDelete && (
                <ConfirmationModal 
                    title="Delete Connection?"
                    message={`Are you sure you want to delete the "${connectionToDelete.name}" connection? This action cannot be undone.`}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setConnectionToDelete(null)}
                />
            )}
        </div>
    );
};

export default AiApiSettingsView;
