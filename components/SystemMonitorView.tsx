import React, { useState, useContext, useMemo, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ApiConnection, Character, GlobalSettings, AIContextSettings, CharacterContextField, ChatMessage, User } from '../types';
import { SystemMonitorIcon, SpinnerIcon, UserIcon, DocumentTextIcon, CodeBracketIcon, ChatBubbleIcon, CpuChipIcon, ServerIcon, SparklesIcon, DatabaseIcon, CloseIcon } from './Icons';
import { buildSystemPrompt, HAVEN_PROMPT, BEYOND_THE_HAVEN_PROMPT, generateChatResponseWithStats } from '../services/aiService';

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

// --- Chat Flow Diagram Components ---
const FlowArrow: React.FC = () => (
    <div className="flex justify-center items-center my-1">
        <svg className="w-6 h-6 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
    </div>
);

const FlowCard: React.FC<{ title: string; icon: React.ReactNode; children?: React.ReactNode; duration?: number; status: 'success' | 'failure' | 'info' }> = ({ title, icon, children, duration, status }) => {
    const statusClasses = {
        success: 'border-success',
        failure: 'border-danger',
        info: 'border-accent-secondary'
    };
    const borderClass = statusClasses[status];
    
    return (
        <details className={`border rounded-lg border-l-4 ${borderClass} bg-secondary`} open>
            <summary className="font-semibold flex items-center justify-between gap-2 p-3 cursor-pointer">
                <div className="flex items-center gap-2">
                    {icon} {title}
                </div>
                {duration !== undefined && <span className="text-xs text-text-secondary">{duration}ms</span>}
            </summary>
            {children && <div className="p-3 pt-0 text-sm space-y-2">{children}</div>}
        </details>
    );
};

const ChatFlowDiagram: React.FC = () => (
    <div className="space-y-2">
        <FlowCard title="User Input" icon={<UserIcon className="w-5 h-5" />} status="info">
            <p>The user sends a message to the character.</p>
        </FlowCard>
        <FlowArrow />
        <FlowCard title="Character & System Data Loaded" icon={<DatabaseIcon className="w-5 h-5" />} status="info">
            <ul className="list-disc list-inside pl-2 text-xs">
                <li>Character Profile (Personality, Story, etc.) - <span className="font-semibold">Summarized version is prioritized.</span></li>
                <li>Chat History</li>
                <li>Current Character Stats</li>
                <li>Current Narrative State</li>
                <li>Global & AI Context Settings</li>
            </ul>
        </FlowCard>
        <FlowArrow />
        <FlowCard title="System Prompt Assembled" icon={<DocumentTextIcon className="w-5 h-5" />} status="info">
            <p>All data is combined into a single, comprehensive prompt for the AI, including instructions, character sheet, and history.</p>
        </FlowCard>
        <FlowArrow />
        <FlowCard title="API Call" icon={<ServerIcon className="w-5 h-5" />} status="info">
            <p>The assembled prompt is sent to the selected AI model's API (e.g., Gemini or an OpenAI-compatible endpoint).</p>
        </FlowCard>
        <FlowArrow />
        <FlowCard title="API Response Received" icon={<SparklesIcon className="w-5 h-5" />} status="info">
            <p>The API returns a response. This can be:</p>
            <ul className="list-disc list-inside pl-2 text-xs">
                <li>A standard text message.</li>
                <li>A function call to update stats.</li>
                <li>A function call to update the narrative state.</li>
                <li>A combination of the above.</li>
            </ul>
        </FlowCard>
        <FlowArrow />
        <FlowCard title="Response Processing" icon={<CpuChipIcon className="w-5 h-5" />} status="info">
            <p>The system parses the response:</p>
             <ul className="list-disc list-inside pl-2 text-xs">
                <li>Extracts the character's reply text.</li>
                <li>Applies any stat changes.</li>
                <li>Updates the narrative state.</li>
            </ul>
        </FlowCard>
        <FlowArrow />
        <FlowCard title="Display to User" icon={<ChatBubbleIcon className="w-5 h-5" />} status="info">
            <p>The final, formatted message is displayed in the chat window. Stat changes may be shown if enabled.</p>
        </FlowCard>
    </div>
);

const OverviewTab: React.FC = () => {
    const auth = useContext(AuthContext);
    const [dbStatus, setDbStatus] = useState(false);
    const [localStorageSize, setLocalStorageSize] = useState('0 KB');
    
    useEffect(() => {
        // Check IndexedDB
        const dbCheck = window.indexedDB.open('AIChatbotMarketplaceDB');
        dbCheck.onsuccess = () => { setDbStatus(true); dbCheck.result.close(); };
        dbCheck.onerror = () => setDbStatus(false);
        
        // Calculate localStorage size
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
    } = auth;
    
    const activeConnections = apiConnections.filter(c => c.isActive).length;
    const totalMessages = Object.values(chatHistories).reduce((acc: number, userHistory: Record<string, ChatMessage[]>) => 
        acc + Object.values(userHistory).reduce((userAcc: number, history: ChatMessage[]) => userAcc + history.length, 0), 0
    );
    const totalPosts = forumThreads.reduce((acc, thread) => acc + (getPostsForThread?.(thread.id)?.length || 0), 0);
    const charsWithNarrativeSystem = characters.length; // Now all characters use it
    const summarizedCharacters = characters.filter(c => c.summary && Object.keys(c.summary).length > 0).length;

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
                    <pre className="text-xs font-mono bg-primary p-2 mt-1 rounded border border-border max-h-40 overflow-y-auto">{globalSettings.havenPrompt || HAVEN_PROMPT}</pre>
                </details>
                 <details>
                    <summary className="cursor-pointer font-semibold">Beyond the Haven Prompt <span className="text-xs text-text-secondary">({globalSettings.beyondTheHavenPrompt ? 'Custom' : 'Default'})</span></summary>
                    <pre className="text-xs font-mono bg-primary p-2 mt-1 rounded border border-border max-h-40 overflow-y-auto">{globalSettings.beyondTheHavenPrompt || BEYOND_THE_HAVEN_PROMPT}</pre>
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
                <InfoRow label="Summarized Characters" value={`${summarizedCharacters} / ${characters.length}`} />
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
            <Section title="Static Chat Flow Diagram">
                <ChatFlowDiagram />
            </Section>
        </div>
    );
};


// --- Multi-lane Simulation ---

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
    const { characters = [], currentUser, allUsers, findConnectionForModel, globalSettings, aiContextSettings, apiConnections, narrativeStates } = auth!;

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
        // When a character is selected in a lane, update its model override to the character's default.
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
    const auth = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState('overview');

    if (!auth || auth.currentUser?.role !== 'Admin') {
        return <p className="p-8 text-center text-red-400">Access Denied.</p>;
    }

    const tabs = [
        { id: 'overview', label: 'System Overview' },
        { id: 'simulation', label: 'Live Simulation' }
    ];

    return (
        <div className="p-4 sm:p-6 md:p-8 w-full h-full flex flex-col">
            <h1 className="text-3xl font-bold mb-6 text-text-primary flex items-center gap-3 flex-shrink-0">
                <SystemMonitorIcon className="w-8 h-8"/> System Monitor
            </h1>
            <div className="border-b border-border mb-6 flex-shrink-0">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`${activeTab === tab.id ? 'border-accent-primary text-accent-primary' : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="flex-1 overflow-y-auto">
                {activeTab === 'overview' && <OverviewTab />}
                {activeTab === 'simulation' && <LiveSimulationTab />}
            </div>
        </div>
    );
};

export default SystemMonitorView;
