
import React, { useState, useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ApiConnection, Character, GlobalSettings, AIContextSettings, ChatMessage } from '../types';
import { SystemMonitorIcon, SpinnerIcon, UserIcon, DocumentTextIcon, CodeBracketIcon, ChatBubbleIcon, CpuChipIcon, ServerIcon, SparklesIcon, DatabaseIcon, CloseIcon, UploadIcon, RefreshIcon, DeleteIcon, ShieldCheckIcon, MicrophoneIcon, BookIcon } from './Icons';
import { buildSystemPrompt, DEFAULT_HAVEN_PROMPT, DEFAULT_BEYOND_PROMPT, generateChatResponseWithStats, editImage } from '../services/aiService';
import Logo from './Logo';
import Avatar from './Avatar';

declare let Cropper: any;

const StatusIndicator: React.FC<{ isOk: boolean; okText?: string; failText?: string }> = ({ isOk, okText = 'OK', failText = 'Error/Inactive' }) => (
    <div className="flex items-center gap-2">
        <span className={`w-3 h-3 rounded-full inline-block ${isOk ? 'bg-success' : 'bg-danger'}`} title={isOk ? okText : failText}></span>
        <span className="text-sm font-medium">{isOk ? okText : failText}</span>
    </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-primary border border-border rounded-lg">
        <h3 className="text-lg font-bold p-4 border-b border-border">{title}</h3>
        <div className="p-4 space-y-3">{children}</div>
    </div>
);

const InfoRow: React.FC<{ label: string; value?: string | React.ReactNode; children?: React.ReactNode; status?: boolean }> = ({ label, value, children, status }) => (
    <div className="flex justify-between items-start text-sm">
        <span className="text-text-secondary pr-4">{label}</span>
        <div className="flex items-center gap-2 text-right">
            {value && (typeof value === 'string' ? <span className="font-mono bg-tertiary px-2 py-0.5 rounded">{value}</span> : value)}
            {children}
            {status !== undefined && <StatusIndicator isOk={status} />}
        </div>
    </div>
);

// Helper function for consistent logic
const isCharacterSummarized = (c: Character) => {
    return !!c.summary && (!!c.summary.description || !!c.summary.personality);
};

const CharacterRow: React.FC<{ 
    character: Character, 
    statusText: string, 
    statusColorClass: string,
    onSilence: (id: string, isSilenced: boolean) => void,
    onDelete: (id: string) => void
}> = ({ character, statusText, statusColorClass, onSilence, onDelete }) => (
    <div className={`flex items-center gap-3 p-2 bg-secondary rounded-md border-l-2 ${statusColorClass} hover:bg-tertiary transition-colors group`}>
        <Avatar imageId={character.avatarUrl} alt={character.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0"/>
        <div className="overflow-hidden flex-1">
            <div className="flex items-center gap-2">
                <p className="font-medium truncate text-sm text-text-primary">{character.name}</p>
                {character.isSilencedByAdmin && <span className="text-[10px] bg-warning/20 text-warning px-1 rounded">Silenced</span>}
            </div>
            <p className="text-xs text-text-secondary truncate">{statusText}</p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
                onClick={() => onSilence(character.id, !character.isSilencedByAdmin)} 
                className="p-1.5 text-text-secondary hover:text-warning hover:bg-white/5 rounded" 
                title={character.isSilencedByAdmin ? "Unsilence" : "Silence"}
            >
                <span className="text-xs font-bold">!</span>
            </button>
            <button 
                onClick={() => { if(window.confirm('Delete this character?')) onDelete(character.id); }} 
                className="p-1.5 text-text-secondary hover:text-danger hover:bg-white/5 rounded"
                title="Delete"
            >
                <DeleteIcon className="w-4 h-4" />
            </button>
        </div>
    </div>
);

const SummaryStatusModal: React.FC<{ isOpen: boolean; onClose: () => void; characters: Character[] }> = ({ isOpen, onClose, characters }) => {
    const auth = useContext(AuthContext);
    if (!isOpen) return null;

    const summarized = characters.filter(isCharacterSummarized);
    const notSummarized = characters.filter(c => !isCharacterSummarized(c));

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-primary rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col border border-border shadow-soft-lg">
                <div className="p-4 border-b border-border flex justify-between items-center">
                    <h3 className="text-xl font-bold text-text-primary">Character Summary Status</h3>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary"><CloseIcon className="w-6 h-6" /></button>
                </div>
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    <div className="flex-1 p-4 border-b md:border-b-0 md:border-r border-border overflow-y-auto">
                        <h4 className="text-lg font-semibold text-success mb-3 flex items-center gap-2 sticky top-0 bg-primary z-10 py-2">
                            <span>Summarized</span>
                            <span className="text-xs bg-success/20 px-2 py-0.5 rounded-full text-white">{summarized.length}</span>
                        </h4>
                        <div className="space-y-2">
                            {summarized.map(c => (
                                <CharacterRow 
                                    key={c.id} 
                                    character={c} 
                                    statusText="Optimized context ready" 
                                    statusColorClass="border-success" 
                                    onSilence={auth?.silenceCharacter || (() => {})}
                                    onDelete={auth?.deleteCharacter || (() => {})}
                                />
                            ))}
                            {summarized.length === 0 && <p className="text-sm text-text-secondary italic p-2">No characters summarized yet.</p>}
                        </div>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto">
                        <h4 className="text-lg font-semibold text-text-secondary mb-3 flex items-center gap-2 sticky top-0 bg-primary z-10 py-2">
                            <span>Raw Profile</span>
                            <span className="text-xs bg-tertiary px-2 py-0.5 rounded-full text-white">{notSummarized.length}</span>
                        </h4>
                        <div className="space-y-2">
                            {notSummarized.map(c => (
                                <CharacterRow 
                                    key={c.id} 
                                    character={c} 
                                    statusText="Using raw fields" 
                                    statusColorClass="border-warning" 
                                    onSilence={auth?.silenceCharacter || (() => {})}
                                    onDelete={auth?.deleteCharacter || (() => {})}
                                />
                            ))}
                             {notSummarized.length === 0 && <p className="text-sm text-text-secondary italic p-2">All characters are summarized.</p>}
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-border bg-secondary/50 text-right">
                    <button onClick={onClose} className="px-4 py-2 bg-tertiary hover:bg-hover rounded-md text-sm text-text-primary">Close</button>
                </div>
            </div>
        </div>
    );
};

const FlowArrow: React.FC = () => (
    <div className="flex justify-center items-center my-1">
        <svg className="w-6 h-6 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
    </div>
);

const FlowCard: React.FC<{ title: string; icon: React.ReactNode; children?: React.ReactNode; duration?: number; status: 'success' | 'failure' | 'info' | 'warning'; type?: string }> = ({ title, icon, children, duration, status, type }) => {
    const statusClasses = {
        success: 'border-success',
        failure: 'border-danger',
        info: 'border-accent-secondary',
        warning: 'border-yellow-500'
    };
    const borderClass = statusClasses[status];
    
    return (
        <div className={`border rounded-lg border-l-4 ${borderClass} bg-secondary p-3`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 font-bold text-text-primary">
                    {icon} {title}
                </div>
                <div className="flex items-center gap-2">
                    {type && <span className="text-[10px] uppercase tracking-wider bg-tertiary px-1.5 py-0.5 rounded text-text-secondary">{type}</span>}
                    {duration !== undefined && <span className="text-xs text-text-secondary">{duration}ms</span>}
                </div>
            </div>
            {children && <div className="text-sm text-text-secondary space-y-2">{children}</div>}
        </div>
    );
};

const ArchitectureTab: React.FC = () => {
    return (
        <div className="space-y-8 p-4 sm:p-6">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-text-primary mb-2">Core Chat Engine</h2>
                <p className="text-text-secondary mb-4">The Single-Pass Architecture handles dialogue, stats, and narrative in one API call for maximum efficiency.</p>
                
                <div className="max-w-3xl mx-auto space-y-2">
                    <FlowCard title="1. User Input & Context" icon={<UserIcon className="w-5 h-5" />} status="info" type="INPUT">
                        <p>User sends message. System retrieves:</p>
                        <ul className="list-disc list-inside pl-2 text-xs">
                            <li><strong>Character Profile:</strong> Summarized personality & scenario.</li>
                            <li><strong>Stats:</strong> Current values (e.g., Trust: 50).</li>
                            <li><strong>Narrative History:</strong> Recent plot events from the Journal.</li>
                            <li><strong>Chat History:</strong> Last 50 messages.</li>
                        </ul>
                    </FlowCard>
                    <FlowArrow />
                    <FlowCard title="2. Protocol Assembly" icon={<DocumentTextIcon className="w-5 h-5" />} status="info" type="SYSTEM PROMPT">
                        <p>System constructs a strict prompt enforcing:</p>
                        <ul className="list-disc list-inside pl-2 text-xs">
                            <li><strong>Mode:</strong> Haven vs Beyond (Safety limits).</li>
                            <li><strong>Kid Mode:</strong> (If enabled) Language simplification.</li>
                            <li><strong>Format:</strong> Forces JSON output schema.</li>
                        </ul>
                    </FlowCard>
                    <FlowArrow />
                    <FlowCard title="3. AI Processing (Single Pass)" icon={<CpuChipIcon className="w-5 h-5" />} status="success" type="LLM INFERENCE">
                        <p>The model (Gemini/OpenAI) generates a <strong>single JSON object</strong> containing:</p>
                        <ul className="list-disc list-inside pl-2 text-xs font-mono bg-tertiary p-2 rounded mt-1">
                            <li>{"{"}</li>
                            <li>&nbsp;&nbsp;"text": "The character's spoken reply...",</li>
                            <li>&nbsp;&nbsp;"stat_updates": [ {"{"}"stat_name": "Trust", "value": 5 } ],</li>
                            <li>&nbsp;&nbsp;"new_events": [ "User gave the artifact to the character" ]</li>
                            <li>{"}"}</li>
                        </ul>
                    </FlowCard>
                    <FlowArrow />
                    <FlowCard title="4. Response Distribution" icon={<ServerIcon className="w-5 h-5" />} status="success" type="CLIENT UPDATE">
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-tertiary p-2 rounded">
                                <ChatBubbleIcon className="w-4 h-4 mx-auto mb-1"/>
                                <span className="text-xs font-bold">Chat UI</span>
                                <p className="text-[10px]">Displays Text</p>
                            </div>
                            <div className="bg-tertiary p-2 rounded">
                                <DatabaseIcon className="w-4 h-4 mx-auto mb-1"/>
                                <span className="text-xs font-bold">DB (Stats)</span>
                                <p className="text-[10px]">Updates Values</p>
                            </div>
                            <div className="bg-tertiary p-2 rounded">
                                <BookIcon className="w-4 h-4 mx-auto mb-1"/>
                                <span className="text-xs font-bold">Journal</span>
                                <p className="text-[10px]">Appends Events</p>
                            </div>
                        </div>
                    </FlowCard>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <h3 className="text-xl font-bold text-text-primary mb-3 flex items-center gap-2"><SparklesIcon className="w-5 h-5"/> Image Generation Flow</h3>
                    <div className="space-y-2">
                        <FlowCard title="Prompt Construction" icon={<DocumentTextIcon className="w-4 h-4" />} status="info">
                            <p className="text-xs">Combines Appearance, Mood, Situation, and Art Style settings into a descriptive prompt.</p>
                        </FlowCard>
                        <FlowArrow />
                        <FlowCard title="Provider Selection" icon={<ServerIcon className="w-4 h-4" />} status="info">
                            <p className="text-xs">Checks API Settings. Routes to <strong>Gemini (generateContent)</strong> or <strong>OpenAI (images/generations)</strong>.</p>
                        </FlowCard>
                        <FlowArrow />
                        <FlowCard title="Safety & Output" icon={<ShieldCheckIcon className="w-4 h-4" />} status="success">
                            <p className="text-xs">Handles safety refusals (Gemini). Returns Base64 image data for display/cropping.</p>
                        </FlowCard>
                    </div>
                </div>

                <div>
                    <h3 className="text-xl font-bold text-text-primary mb-3 flex items-center gap-2"><MicrophoneIcon className="w-5 h-5"/> Text-to-Speech Flow</h3>
                    <div className="space-y-2">
                        <FlowCard title="Text Input" icon={<ChatBubbleIcon className="w-4 h-4" />} status="info">
                            <p className="text-xs">Character's message text is sent to the service.</p>
                        </FlowCard>
                        <FlowArrow />
                        <FlowCard title="Audio Generation" icon={<CpuChipIcon className="w-4 h-4" />} status="info">
                            <p className="text-xs">Uses <strong>Gemini (audio modality)</strong> or <strong>OpenAI (TTS)</strong> to generate a PCM/MP3 stream.</p>
                        </FlowCard>
                        <FlowArrow />
                        <FlowCard title="Playback" icon={<SparklesIcon className="w-4 h-4" />} status="success">
                            <p className="text-xs">Audio is decoded in browser AudioContext and played. Cached in memory to save API calls.</p>
                        </FlowCard>
                    </div>
                </div>

                <div>
                    <h3 className="text-xl font-bold text-text-primary mb-3 flex items-center gap-2"><ShieldCheckIcon className="w-5 h-5"/> AI Moderation Flow</h3>
                    <div className="space-y-2">
                        <FlowCard title="Content Scan" icon={<DocumentTextIcon className="w-4 h-4" />} status="info">
                            <p className="text-xs">New comments/posts are sent to the background scanner.</p>
                        </FlowCard>
                        <FlowArrow />
                        <FlowCard title="Analysis" icon={<CpuChipIcon className="w-4 h-4" />} status="info">
                            <p className="text-xs">LLM analyzes content against categories (Hate, Sexual, etc.) and returns a JSON score.</p>
                        </FlowCard>
                        <FlowArrow />
                        <FlowCard title="Enforcement" icon={<DatabaseIcon className="w-4 h-4" />} status="warning">
                            <p className="text-xs">If violation detected -> Auto-creates <strong>AI Alert</strong> for Mods. Content may be auto-hidden.</p>
                        </FlowCard>
                    </div>
                </div>
            </div>
        </div>
    );
}

const makeBackgroundTransparent = (base64Data: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(base64Data); return; }

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            const r0 = data[0], g0 = data[1], b0 = data[2];
            const tolerance = 30; 

            const isClose = (i: number) => {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                return Math.abs(r - r0) < tolerance && 
                       Math.abs(g - g0) < tolerance && 
                       Math.abs(b - b0) < tolerance;
            };

            for (let i = 0; i < data.length; i += 4) {
                if (isClose(i)) {
                    data[i + 3] = 0;
                }
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png').split(',')[1]);
        };
        img.onerror = () => reject(new Error("Failed to load image for transparency processing"));
        
        if (base64Data.startsWith('iVBOR')) {
            img.src = `data:image/png;base64,${base64Data}`;
        } else {
            img.src = `data:image/jpeg;base64,${base64Data}`;
        }
    });
};

interface LogoEditorModalProps {
  imageUrl: string;
  onClose: () => void;
  onSave: (file: File) => Promise<void>;
}

const LogoEditorModal: React.FC<LogoEditorModalProps> = ({ imageUrl, onClose, onSave }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentImage, setCurrentImage] = useState(imageUrl);
    const cropperRef = useRef<any>(null);
    const imageElementRef = useRef<HTMLImageElement>(null);
    const auth = useContext(AuthContext);
    
    useEffect(() => {
        if (imageElementRef.current) {
            const cropper = new Cropper(imageElementRef.current, {
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 0.8,
                background: false,
            });
            cropperRef.current = cropper;
        }
        return () => {
            if (cropperRef.current) {
                cropperRef.current.destroy();
            }
        };
    }, [currentImage]); 

    const handleRemoveBackground = async () => {
        if (!auth) return;
        
        let connection: ApiConnection | undefined;
        let modelOverride: string | null = null;

        const imageToolConfig = auth.getToolConfig?.('imageGeneration');
        if (imageToolConfig) {
            connection = imageToolConfig.connection;
            modelOverride = imageToolConfig.model;
        } else {
             connection = auth.findConnectionForModel('gemini-2.5-flash-image') || auth.apiConnections.find(c => c.isActive);
        }

        if (!connection) {
            alert("No active API connection found to process images.");
            return;
        }

        setIsProcessing(true);
        try {
            let base64Data = "";
             if (cropperRef.current) {
                const canvas = cropperRef.current.getCroppedCanvas();
                 base64Data = canvas.toDataURL('image/png').split(',')[1];
            } else {
                 base64Data = currentImage.split(',')[1]; 
            }
            
            const prompt = "Isolate the logo and place it on a solid white background. Ensure the logo edges are clean and distinct. Do not alter the logo shape or colors.";
            const processedBase64 = await editImage(base64Data, 'image/png', prompt, connection, modelOverride);
            
            if (processedBase64) {
                const transparentBase64 = await makeBackgroundTransparent(processedBase64);
                const newUrl = `data:image/png;base64,${transparentBase64}`;
                setCurrentImage(newUrl);
            } else {
                alert("Failed to process image.");
            }

        } catch (error) {
            console.error(error);
            alert("Error removing background.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSave = async () => {
        if (!cropperRef.current) return;
        setIsProcessing(true);
        cropperRef.current.getCroppedCanvas({ fillColor: 'transparent' }).toBlob(async (blob: Blob) => {
            if (blob) {
                const file = new File([blob], "logo.png", { type: "image/png" });
                await onSave(file);
                onClose();
            }
            setIsProcessing(false);
        }, 'image/png');
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-primary rounded-lg w-full max-w-4xl h-[90vh] flex flex-col">
                 <div className="p-4 border-b border-border flex justify-between items-center">
                    <h3 className="text-xl font-bold">Edit Logo</h3>
                    <button onClick={onClose}><CloseIcon className="w-6 h-6" /></button>
                </div>
                <div className="flex-1 bg-tertiary relative overflow-hidden flex items-center justify-center p-4">
                    {isProcessing && (
                        <div className="absolute inset-0 bg-black/50 z-10 flex flex-col items-center justify-center text-white">
                            <SpinnerIcon className="w-10 h-10 animate-spin mb-2" />
                            <span>Processing...</span>
                        </div>
                    )}
                    <img ref={imageElementRef} src={currentImage} crossOrigin="anonymous" alt="Logo to edit" className="max-w-full max-h-full" />
                </div>
                <div className="p-4 border-t border-border flex justify-between items-center bg-secondary">
                    <div className="flex gap-2">
                        <button 
                            onClick={handleRemoveBackground} 
                            className="flex items-center gap-2 px-4 py-2 bg-tertiary hover:bg-hover rounded-md text-sm"
                            disabled={isProcessing}
                        >
                            <SparklesIcon className="w-4 h-4 text-accent-secondary" />
                            Remove Background (AI)
                        </button>
                    </div>
                    <div className="flex gap-2">
                         <button onClick={onClose} className="px-4 py-2 bg-tertiary hover:bg-hover rounded-md text-sm">Cancel</button>
                         <button onClick={handleSave} className="px-4 py-2 bg-success hover:opacity-80 text-white rounded-md text-sm font-bold">Save & Upload</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const OverviewTab: React.FC = () => {
    const auth = useContext(AuthContext);
    const [dbStatus, setDbStatus] = useState(false);
    const [localStorageSize, setLocalStorageSize] = useState('0 KB');
    const [logoEditorOpen, setLogoEditorOpen] = useState(false);
    const [logoFileToEdit, setLogoFileToEdit] = useState<string | null>(null);
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);
    
    useEffect(() => {
        const dbCheck = window.indexedDB.open('AIChatbotMarketplaceDB');
        dbCheck.onsuccess = () => { setDbStatus(true); dbCheck.result.close(); };
        dbCheck.onerror = () => setDbStatus(false);
        
        let total = 0;
        for(let x in localStorage) {
            if (!localStorage.hasOwnProperty(x)) continue;
            total += (localStorage[x].length * 2);
        }
        setLocalStorageSize(`${(total / 1024).toFixed(2)} KB`);
    }, []);

    if (!auth) return null;
    const { 
        apiConnections = [], 
        defaultApiConnectionId, 
        globalSettings, 
        aiContextSettings,
        allUsers = [],
        characters = [],
        chatHistories = {},
        reports = [],
        aiAlerts = [],
        tickets = [],
        forumThreads = [],
        getPostsForThread,
        siteLogo,
        updateSiteLogo,
        resetSiteLogo
    } = auth;
    
    const activeConnections = apiConnections.filter(c => c.isActive).length;
    const totalMessages = Object.values(chatHistories).reduce((acc: number, userHistory: Record<string, ChatMessage[]>) => 
        acc + Object.values(userHistory).reduce((userAcc: number, history: ChatMessage[]) => userAcc + history.length, 0), 0
    );
    const totalPosts = forumThreads.reduce((acc, thread) => acc + (getPostsForThread?.(thread.id)?.length || 0), 0);
    const charsWithNarrativeSystem = characters.length;
    const summarizedCharacters = characters.filter(isCharacterSummarized).length;
    
    const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setLogoFileToEdit(reader.result as string);
                setLogoEditorOpen(true);
                if (logoInputRef.current) logoInputRef.current.value = '';
            };
            reader.readAsDataURL(file);
        }
    }

    const handleEditorSave = async (file: File) => {
        try {
            await updateSiteLogo(file);
        } catch (error) {
            console.error("Failed to upload logo:", error);
            alert("Failed to upload logo. Please try again.");
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <div className="lg:col-span-2 xl:col-span-3">
                <Section title="System Health Summary">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="p-2 bg-tertiary rounded-md">
                            <p className="font-semibold">API Connectivity</p>
                            <StatusIndicator isOk={activeConnections > 0} okText={`${activeConnections}/${apiConnections.length} Active`} failText="No Active APIs" />
                        </div>
                        <div className="p-2 bg-tertiary rounded-md">
                            <p className="font-semibold">Image Database</p>
                            <StatusIndicator isOk={dbStatus} okText="Operational" failText="Not Found"/>
                        </div>
                        <div className="p-2 bg-tertiary rounded-md">
                            <p className="font-semibold">Local Storage</p>
                            <StatusIndicator isOk={true} okText={localStorageSize} />
                        </div>
                        <div className="p-2 bg-tertiary rounded-md">
                            <p className="font-semibold">Moderation Service</p>
                            <StatusIndicator isOk={!!auth.findConnectionForModel('gemini-2.5-flash')} okText="Online" failText="Offline" />
                        </div>
                    </div>
                </Section>
            </div>
             <Section title="Site Branding">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm text-text-secondary mb-2">Current Site Logo</p>
                        <div className="p-4 bg-secondary border border-border rounded-md flex items-center justify-center h-20 w-full max-w-[200px]">
                            <Logo className="h-12 w-auto" logoUrl={siteLogo} />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <input type="file" ref={logoInputRef} onChange={handleLogoSelect} accept="image/*" className="hidden" />
                        <button 
                            onClick={() => logoInputRef.current?.click()} 
                            className="flex items-center gap-2 px-4 py-2 bg-accent-secondary hover:bg-accent-secondary-hover text-white rounded-md text-sm disabled:bg-tertiary"
                        >
                            <UploadIcon className="w-4 h-4" />
                            Select & Edit Logo
                        </button>
                        {siteLogo && (
                            <button 
                                onClick={() => resetSiteLogo()}
                                className="flex items-center gap-2 px-4 py-2 bg-tertiary hover:bg-hover rounded-md text-sm text-text-secondary hover:text-text-primary"
                            >
                                <RefreshIcon className="w-4 h-4" />
                                Reset to Default
                            </button>
                        )}
                    </div>
                </div>
                <p className="text-xs text-text-secondary mt-2">Upload an image to replace the default site logo. You can crop and remove the background before applying.</p>
            </Section>
            <Section title="API Connections">
                {apiConnections.map(conn => (
                    <details key={conn.id} className="p-3 bg-tertiary rounded-md" open>
                        <summary className="font-semibold flex justify-between items-center cursor-pointer">
                            <span>{conn.name} {conn.id === defaultApiConnectionId && <span className="text-xs text-success">(Default)</span>}</span>
                            <StatusIndicator isOk={conn.isActive} />
                        </summary>
                        <div className="mt-2 pl-2 border-l-2 border-border text-xs space-y-1">
                            <InfoRow label="Provider" value={conn.provider} />
                            <InfoRow label="Base URL" value={conn.baseUrl || 'N/A'} />
                            <InfoRow label="Models" value={conn.models.join(', ')} />
                        </div>
                    </details>
                ))}
            </Section>
            <Section title="Global Prompts">
                <details>
                    <summary className="cursor-pointer font-semibold">Haven Prompt <span className="text-xs text-text-secondary">({globalSettings.havenPrompt ? 'Custom' : 'Default'})</span></summary>
                    <pre className="text-xs font-mono bg-primary p-2 mt-1 rounded border border-border max-h-40 overflow-y-auto">{globalSettings.havenPrompt || DEFAULT_HAVEN_PROMPT}</pre>
                </details>
                 <details>
                    <summary className="cursor-pointer font-semibold">Beyond the Haven Prompt <span className="text-xs text-text-secondary">({globalSettings.beyondTheHavenPrompt ? 'Custom' : 'Default'})</span></summary>
                    <pre className="text-xs font-mono bg-primary p-2 mt-1 rounded border border-border max-h-40 overflow-y-auto">{globalSettings.beyondTheHavenPrompt || DEFAULT_BEYOND_PROMPT}</pre>
                </details>
                <InfoRow label="Kid Mode" value={globalSettings.kidModePrompt ? 'Enabled' : 'Disabled'} status={!!globalSettings.kidModePrompt} />
            </Section>
            <Section title="AI Context">
                <InfoRow label="History Length" value={String(aiContextSettings.historyLength)} />
                <InfoRow label="Max Response Tokens" value={String(aiContextSettings.maxResponseTokens)} />
                <InfoRow label="Included Fields" value={aiContextSettings.includedFields.join(', ')} status={aiContextSettings.includedFields.length > 0} />
            </Section>
             <Section title="User & Content Stats">
                <InfoRow label="Total Users" value={String(allUsers.length)} />
                <InfoRow label="Total Characters" value={String(characters.length)} />
                <InfoRow label="Public / Private" value={`${characters.filter(c => c.isPublic).length} / ${characters.filter(c => !c.isPublic).length}`} />
                <InfoRow 
                    label="Summarized Characters" 
                    value={
                        <button 
                            onClick={() => setShowSummaryModal(true)} 
                            className="font-mono bg-tertiary px-2 py-0.5 rounded hover:bg-accent-secondary hover:text-white cursor-pointer transition-colors"
                            title="Click to view details"
                        >
                            {`${summarizedCharacters} / ${characters.length}`}
                        </button>
                    } 
                />
                <InfoRow label="Narrative System Users" value={`${charsWithNarrativeSystem} / ${characters.length}`} />
                <InfoRow label="Total Chats" value={String(Object.values(chatHistories).reduce((acc: number, userHistory: any) => acc + Object.keys(userHistory).length, 0))}/>
                <InfoRow label="Total Messages" value={String(totalMessages)} />
                <InfoRow label="Forum Threads" value={String(forumThreads.length)} />
                <InfoRow label="Forum Posts" value={String(totalPosts)} />
            </Section>
             <Section title="Moderation & Security">
                <InfoRow label="Pending Reports" value={String(reports.filter(r => !r.isResolved).length)} />
                <InfoRow label="Pending AI Alerts" value={String(aiAlerts.filter(a => a.status !== 'Resolved').length)} />
                <InfoRow label="Open Tickets" value={String(tickets.filter(t => t.status !== 'Resolved').length)} />
            </Section>

            {logoEditorOpen && logoFileToEdit && (
                <LogoEditorModal 
                    imageUrl={logoFileToEdit} 
                    onClose={() => { setLogoEditorOpen(false); setLogoFileToEdit(null); }} 
                    onSave={handleEditorSave} 
                />
            )}
            {showSummaryModal && (
                <SummaryStatusModal 
                    isOpen={showSummaryModal} 
                    onClose={() => setShowSummaryModal(false)} 
                    characters={characters} 
                />
            )}
        </div>
    );
};

interface SimulationConfig {
    selectedCharId: string;
    modelOverride: string;
    userInput: string;
    forceFullData: boolean;
    selectedUserId: string;
    historyOverride: string;
    statsOverride: string;
    narrativeStateOverride: string;
    kidMode: boolean;
    havenPromptOverride: string;
    bthPromptOverride: string;
    kidModePromptOverride: string;
}

interface SimulationSlot {
    id: number;
    config: SimulationConfig;
    results: any[] | null;
    isLoading: boolean;
}

const LiveSimulationTab: React.FC = () => {
    const auth = useContext(AuthContext);
    const { characters = [], currentUser, allUsers, findConnectionForModel, globalSettings, aiContextSettings, apiConnections, narrativeStates } = auth || {} as any;

    const createDefaultSlot = (id: number): SimulationSlot => ({
        id,
        isLoading: false,
        results: null,
        config: {
            selectedCharId: '',
            modelOverride: '',
            userInput: 'Hello!',
            forceFullData: false,
            selectedUserId: currentUser?.id || '',
            historyOverride: '',
            statsOverride: '',
            narrativeStateOverride: '',
            kidMode: false,
            havenPromptOverride: '',
            bthPromptOverride: '',
            kidModePromptOverride: '',
        }
    });

    const [simulations, setSimulations] = useState<SimulationSlot[]>(() => Array.from({ length: 4 }, (_, i) => createDefaultSlot(i)));
    const [isSimulating, setIsSimulating] = useState(false);

    const handleConfigChange = <K extends keyof SimulationConfig>(id: number, field: K, value: SimulationConfig[K]) => {
        setSimulations(prev => prev.map(sim => sim.id === id ? { ...sim, config: { ...sim.config, [field]: value } } : sim));
    };
    
    useEffect(() => {
        const updatedSims = simulations.map(sim => {
            const char = characters.find(c => c.id === sim.config.selectedCharId);
            if (char && sim.config.modelOverride === '') {
                return { ...sim, config: { ...sim.config, modelOverride: char.model } };
            }
            return sim;
        });
        if (JSON.stringify(updatedSims) !== JSON.stringify(simulations)) {
            setSimulations(updatedSims);
        }
    }, [simulations, characters]);


    const handleRunAllSimulations = async () => {
        const activeSims = simulations.filter(s => s.config.selectedCharId && s.config.userInput && s.config.modelOverride);
        if (activeSims.length === 0) return;

        setIsSimulating(true);
        setSimulations(prev => prev.map(sim => activeSims.some(as => as.id === sim.id) ? { ...sim, isLoading: true, results: [] } : sim));

        const simulationPromises = activeSims.map(async (sim) => {
            const startTime = Date.now();
            const results: any[] = [];
            const { config } = sim;
            try {
                const character = characters.find(c => c.id === config.selectedCharId)!;
                const user = allUsers.find(u => u.id === config.selectedUserId) || currentUser!;
                
                results.push({ title: "1. Initialization", icon: <UserIcon className="w-5 h-5" />, status: 'info', data: { character: character.name, model: config.modelOverride, userInput: config.userInput, asUser: user.profile.name }});
                
                let stats: Record<string, number> = {};
                if(config.statsOverride) {
                    try { stats = JSON.parse(config.statsOverride); } catch(e) { throw new Error("Invalid Stats Override JSON"); }
                } else { character.stats.forEach(s => { stats[s.id] = s.initialValue; }); }
                if(character.stats.length > 0) results.push({ title: "2a. Stat Initialization", icon: <DatabaseIcon className="w-5 h-5" />, status: 'info', data: stats });

                let narrativeState: any = {};
                if (config.narrativeStateOverride) {
                    try { narrativeState = JSON.parse(config.narrativeStateOverride); } catch(e) { throw new Error("Invalid Narrative State Override JSON"); }
                } else { narrativeState = narrativeStates[user.id]?.[character.id] || {}; }
                results.push({ title: "2b. Narrative State Initialization", icon: <DatabaseIcon className="w-5 h-5" />, status: 'info', data: narrativeState });

                const connection = findConnectionForModel(config.modelOverride);
                if (!connection) throw new Error(`No active connection found for model: ${config.modelOverride}`);
                results.push({ title: "3. Connection Selection", icon: <ServerIcon className="w-5 h-5" />, status: 'success', data: { name: connection.name, provider: connection.provider } });

                const characterForPrompt = config.forceFullData ? { ...character, summary: undefined } : character;
                const finalSystemPrompt = buildSystemPrompt(characterForPrompt, user, globalSettings, aiContextSettings, config.kidMode, stats, narrativeState, undefined, { haven: config.havenPromptOverride, beyondTheHaven: config.bthPromptOverride, kidMode: config.kidModePromptOverride });
                results.push({ title: "4. System Prompt Assembled", icon: <DocumentTextIcon className="w-5 h-5" />, status: 'success', data: finalSystemPrompt });
                
                let history: ChatMessage[];
                if(config.historyOverride) {
                    try { history = JSON.parse(config.historyOverride); } catch(e) { throw new Error("Invalid History Override JSON"); }
                } else { history = [{ id: 'sim-user-1', sender: 'user', text: config.userInput, timestamp: Date.now() }]; }

                const response = await generateChatResponseWithStats(characterForPrompt, history, user, globalSettings, aiContextSettings, config.kidMode, config.modelOverride, stats, narrativeState, connection, { haven: config.havenPromptOverride, beyondTheHaven: config.bthPromptOverride, kidMode: config.kidModePromptOverride });
                const duration = Date.now() - startTime;
                results.push({ title: "5. API Response", icon: <SparklesIcon className="w-5 h-5" />, status: 'success', duration, data: response });
                
                return { id: sim.id, results, error: null };
            } catch (error: any) {
                results.push({ title: "Simulation Error", icon: <CloseIcon className="w-5 h-5 text-danger" />, status: 'failure', data: error.message });
                return { id: sim.id, results, error: error.message };
            }
        });

        const completedSims = await Promise.allSettled(simulationPromises);

        setSimulations(prev => {
            const newSims = [...prev];
            completedSims.forEach(res => {
                if (res.status === 'fulfilled') {
                    const { id, results } = res.value;
                    const index = newSims.findIndex(s => s.id === id);
                    if (index > -1) {
                        newSims[index] = { ...newSims[index], isLoading: false, results };
                    }
                }
            });
            return newSims.map(sim => ({...sim, isLoading: false }));
        });
        setIsSimulating(false);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 p-4 bg-secondary border-b border-border">
                <button onClick={handleRunAllSimulations} disabled={isSimulating} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent-primary text-white font-bold text-lg rounded-md disabled:bg-hover">
                    {isSimulating ? <SpinnerIcon className="w-6 h-6 animate-spin"/> : <SystemMonitorIcon className="w-6 h-6" />}
                    Run All Active Simulations
                </button>
                 <p className="text-xs text-text-secondary text-center mt-2 lg:hidden">
                    &larr; Scroll horizontally to view all simulation lanes &rarr;
                </p>
            </div>
            <div className="flex-1 overflow-x-auto">
                <div className="flex gap-4 p-4">
                    {simulations.map((sim, index) => {
                        const character = characters.find(c => c.id === sim.config.selectedCharId);
                        return (
                        <div key={sim.id} className="bg-secondary p-4 rounded-lg border border-border flex flex-col gap-4 flex-shrink-0 w-[90vw] sm:w-96 lg:w-auto lg:flex-1">
                            <h3 className="font-bold text-xl text-center">Lane {index + 1}</h3>
                            {/* Setup */}
                            <div className="space-y-2">
                                <select value={sim.config.selectedCharId} onChange={e => handleConfigChange(sim.id, 'selectedCharId', e.target.value)} className="w-full p-2 bg-primary border border-border rounded-md">
                                    <option value="">Select Character...</option>
                                    {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <textarea value={sim.config.userInput} onChange={e => handleConfigChange(sim.id, 'userInput', e.target.value)} placeholder="User input..." className="w-full p-2 bg-primary border border-border rounded-md text-sm" rows={2}/>
                            </div>
                            {/* Advanced */}
                            <details className="bg-primary rounded-md border border-border">
                                <summary className="p-2 cursor-pointer text-sm font-semibold">Advanced Settings</summary>
                                <div className="p-2 border-t border-border space-y-2 text-sm">
                                    <label>Model Override: <select value={sim.config.modelOverride} onChange={e => handleConfigChange(sim.id, 'modelOverride', e.target.value)} className="w-full mt-1 p-1 bg-tertiary border border-border rounded-md text-xs"><option value="">Default</option>{apiConnections.map(c => <optgroup key={c.id} label={c.name}>{c.models.map(m => <option key={m} value={m}>{m}</option>)}</optgroup>)}</select></label>
                                    <label>User Persona: <select value={sim.config.selectedUserId} onChange={e => handleConfigChange(sim.id, 'selectedUserId', e.target.value)} className="w-full mt-1 p-1 bg-tertiary border border-border rounded-md text-xs">{allUsers.map(u => <option key={u.id} value={u.id}>{u.profile.name}</option>)}</select></label>
                                    <label className="flex items-center gap-2"><input type="checkbox" checked={sim.config.forceFullData} onChange={e => handleConfigChange(sim.id, 'forceFullData', e.target.checked)} /> Force Full Data</label>
                                    <label className="flex items-center gap-2"><input type="checkbox" checked={sim.config.kidMode} onChange={e => handleConfigChange(sim.id, 'kidMode', e.target.checked)} /> Kid Mode</label>
                                    <div><label>History Override (JSON): <textarea value={sim.config.historyOverride} onChange={e => handleConfigChange(sim.id, 'historyOverride', e.target.value)} className="w-full p-1 bg-tertiary border border-border rounded-md text-xs font-mono" rows={3} placeholder='[{"sender": "user", "text": "Hi"}]'/></label></div>
                                    <div><label>Stats Override (JSON): <textarea value={sim.config.statsOverride} onChange={e => handleConfigChange(sim.id, 'statsOverride', e.target.value)} className="w-full p-1 bg-tertiary border border-border rounded-md text-xs font-mono" rows={2} placeholder={character?.stats.length ? 'e.g., {"stat-id": 50}' : 'No stats on this char'}/></label></div>
                                    <div><label>Narrative State Override (JSON): <textarea value={sim.config.narrativeStateOverride} onChange={e => handleConfigChange(sim.id, 'narrativeStateOverride', e.target.value)} className="w-full p-1 bg-tertiary border border-border rounded-md text-xs font-mono" rows={2} placeholder='{"metBefore": true}'/></label></div>
                                    <div><label>Haven Prompt Override: <textarea value={sim.config.havenPromptOverride} onChange={e => handleConfigChange(sim.id, 'havenPromptOverride', e.target.value)} className="w-full p-1 bg-tertiary border border-border rounded-md text-xs font-mono" rows={2} placeholder="Uses global setting if empty"/></label></div>
                                    <div><label>BTH Prompt Override: <textarea value={sim.config.bthPromptOverride} onChange={e => handleConfigChange(sim.id, 'bthPromptOverride', e.target.value)} className="w-full p-1 bg-tertiary border border-border rounded-md text-xs font-mono" rows={2} placeholder="Uses global setting if empty"/></label></div>
                                    <div><label>Kid Mode Prompt Override: <textarea value={sim.config.kidModePromptOverride} onChange={e => handleConfigChange(sim.id, 'kidModePromptOverride', e.target.value)} className="w-full p-1 bg-tertiary border border-border rounded-md text-xs font-mono" rows={2} placeholder="Uses global setting if empty"/></label></div>
                                </div>
                            </details>
                            {/* Results */}
                            <div className="flex-1 overflow-y-auto bg-primary p-2 rounded border border-border">
                                {sim.isLoading && <div className="flex justify-center items-center gap-3 h-full text-text-secondary"><SpinnerIcon className="w-6 h-6 animate-spin" /><span>Simulating...</span></div>}
                                {!sim.isLoading && !sim.results && <p className="text-text-secondary text-center text-sm py-4">Ready to simulate.</p>}
                                <div className="space-y-2">
                                {sim.results?.map((result, i) => (
                                    <React.Fragment key={i}>
                                        <FlowCard title={result.title} icon={result.icon} status={result.status} duration={result.duration}>
                                            {result.data && <pre className="whitespace-pre-wrap bg-secondary p-2 rounded mt-2 text-xs font-mono max-h-60 overflow-y-auto">{typeof result.data === 'object' ? JSON.stringify(result.data, null, 2) : String(result.data)}</pre>}
                                        </FlowCard>
                                        {i < sim.results!.length - 1 && <FlowArrow />}
                                    </React.Fragment>
                                ))}
                                </div>
                            </div>
                        </div>
                    )})}
                </div>
            </div>
        </div>
    );
};

const SystemMonitorView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'overview' | 'architecture' | 'simulation'>('overview');

    return (
        <div className="flex flex-col h-full bg-primary/95">
            <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/50 backdrop-blur-sm">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <SystemMonitorIcon className="w-6 h-6 text-accent-primary"/>
                    <span>System Monitor</span>
                </h2>
                <div className="flex bg-primary rounded-lg p-1 border border-border">
                    <button 
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-accent-secondary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                        Overview
                    </button>
                    <button 
                        onClick={() => setActiveTab('architecture')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'architecture' ? 'bg-accent-secondary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                        Architecture
                    </button>
                    <button 
                        onClick={() => setActiveTab('simulation')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'simulation' ? 'bg-accent-secondary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                        Live Simulation
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-hidden">
                {activeTab === 'overview' && (
                    <div className="h-full overflow-y-auto p-4 sm:p-6">
                        <OverviewTab />
                    </div>
                )}
                {activeTab === 'architecture' && (
                    <div className="h-full overflow-y-auto p-4 sm:p-6">
                        <ArchitectureTab />
                    </div>
                )}
                {activeTab === 'simulation' && <LiveSimulationTab />}
            </div>
        </div>
    );
};

export default SystemMonitorView;
