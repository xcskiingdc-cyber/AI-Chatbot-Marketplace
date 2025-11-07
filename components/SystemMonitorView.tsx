import React, { useState, useContext, useMemo, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ApiConnection, Character, GlobalSettings, AIContextSettings, CharacterContextField, ChatMessage, User } from '../types';
import { SystemMonitorIcon, SpinnerIcon, UserIcon, DocumentTextIcon, CodeBracketIcon, ChatBubbleIcon, CpuChipIcon, ServerIcon, SparklesIcon, DatabaseIcon, CloseIcon } from './Icons';
// FIX: Import 'generateChatResponseWithStats' to resolve the 'Cannot find name' error.
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
    // FIX: Explicitly type the parameters in the nested reduce functions to resolve a TypeScript type inference issue.
    const totalMessages = Object.values(chatHistories).reduce((acc: number, userHistory: Record<string, ChatMessage[]>) => 
        acc + Object.values(userHistory).reduce((userAcc, history) => userAcc + history.length, 0), 0
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
                <InfoRow label="Max Response Chars" value={String(aiContextSettings.maxResponseCharacters)} />
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


const LiveSimulationTab: React.FC = () => {
    const auth = useContext(AuthContext);
    const { characters = [], currentUser, findConnectionForModel, globalSettings, aiContextSettings, apiConnections, narrativeStates } = auth!;
    const [isSimulating, setIsSimulating] = useState(false);
    const [selectedCharId, setSelectedCharId] = useState<string>('');
    const [modelOverride, setModelOverride] = useState<string>('');
    const [userInput, setUserInput] = useState('');
    const [simulationResults, setSimulationResults] = useState<any[]>([]);
    const [forceFullData, setForceFullData] = useState(false);

    const [overrideContext, setOverrideContext] = useState(false);
    const [tempIncludedFields, setTempIncludedFields] = useState<CharacterContextField[]>(aiContextSettings.includedFields);
    
    const selectedCharacter = useMemo(() => characters.find(c => c.id === selectedCharId), [selectedCharId, characters]);
    
    useEffect(() => {
        if (selectedCharacter) {
            setModelOverride(selectedCharacter.model);
        } else {
            setModelOverride('');
        }
    }, [selectedCharacter]);

    const handleFieldToggle = (field: CharacterContextField) => {
        setTempIncludedFields(prev => prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]);
    };

    const handleRunSimulation = async () => {
        const character = selectedCharacter;
        if (!character || !currentUser || !userInput || !modelOverride) return;

        setIsSimulating(true);
        setSimulationResults([]);
        const startTime = Date.now();
        const results: any[] = [];

        try {
            results.push({ title: "1. Initialization", icon: <UserIcon className="w-5 h-5" />, status: 'info', data: { character: character.name, model: modelOverride, userInput }});
            
            const stats = auth.chatStats[currentUser.id]?.[character.id] || {};
            character.stats.forEach(s => {
                if(stats[s.id] === undefined) stats[s.id] = s.initialValue;
            });
             if(character.stats.length > 0) {
                results.push({ title: "2a. Stat Initialization", icon: <DatabaseIcon className="w-5 h-5" />, status: 'info', data: stats });
            }

            const narrativeState = narrativeStates[currentUser.id]?.[character.id] || {};
            results.push({ title: "2b. Narrative State Initialization", icon: <DatabaseIcon className="w-5 h-5" />, status: 'info', data: narrativeState });

            const connection = findConnectionForModel(modelOverride);
            if (!connection) {
                results.push({ title: "3. Connection Selection", icon: <ServerIcon className="w-5 h-5 text-danger" />, status: 'failure', data: `No active connection found for model: ${modelOverride}` });
                setSimulationResults(results); setIsSimulating(false); return;
            }
            results.push({ title: "3. Connection Selection", icon: <ServerIcon className="w-5 h-5" />, status: 'success', data: { name: connection.name, provider: connection.provider, model: modelOverride } });
            
            const characterForPrompt = forceFullData ? { ...character, summary: undefined } : character;
            const finalSystemPrompt = buildSystemPrompt(characterForPrompt, currentUser, globalSettings, aiContextSettings, false, stats, narrativeState, overrideContext ? tempIncludedFields : undefined);
            results.push({ title: "4. System Prompt Assembled", icon: <DocumentTextIcon className="w-5 h-5" />, status: 'success', data: finalSystemPrompt });

            const history: ChatMessage[] = [{ id: 'sim-user-1', sender: 'user', text: userInput, timestamp: Date.now() }];
            
            let requestPayload;
            if (connection.provider === 'Gemini') {
                 requestPayload = {
                    model: modelOverride,
                    contents: [ ...history.map(msg => ({ role: msg.sender === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] })) ],
                    config: { systemInstruction: finalSystemPrompt }
                };
            } else { // OpenAI compatible
                requestPayload = {
                    model: modelOverride,
                    messages: [
                        { role: 'system', content: finalSystemPrompt },
                        ...history.map(msg => ({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.text }))
                    ]
                };
            }
            results.push({ title: "5. API Request Payload", icon: <CpuChipIcon className="w-5 h-5" />, status: 'info', data: requestPayload});
            
            const response = await generateChatResponseWithStats(characterForPrompt, history, currentUser, globalSettings, aiContextSettings, false, modelOverride, stats, narrativeState, connection);
            const duration = Date.now() - startTime;
            results.push({ title: "6. API Response", icon: <SparklesIcon className="w-5 h-5" />, status: 'success', duration, data: response });
            
            results.push({ title: "7. Final Processed Output", icon: <ChatBubbleIcon className="w-5 h-5" />, status: 'success', data: { responseText: response.responseText, statChanges: response.statChanges, newNarrativeState: response.newNarrativeState }});

        } catch (error: any) {
            results.push({ title: "Simulation Error", icon: <CloseIcon className="w-5 h-5 text-danger" />, status: 'failure', data: error.message });
        } finally {
            setIsSimulating(false);
            setSimulationResults(results);
        }
    };
    
    const allFields: CharacterContextField[] = ['gender', 'description', 'personality', 'story', 'situation', 'feeling', 'appearance'];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
                <Section title="Simulation Setup">
                    <div className="space-y-4">
                        <select value={selectedCharId} onChange={e => setSelectedCharId(e.target.value)} className="w-full p-2 bg-secondary border border-border rounded-md">
                            <option value="">Select a Character...</option>
                            {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <select value={modelOverride} onChange={e => setModelOverride(e.target.value)} className="w-full p-2 bg-secondary border border-border rounded-md" disabled={!selectedCharId}>
                            <option value="">Select a Model...</option>
                            {apiConnections.filter(c => c.isActive).map(conn => (
                                <optgroup key={conn.id} label={conn.name}>
                                    {conn.models.map(m => <option key={m} value={m}>{m}</option>)}
                                </optgroup>
                            ))}
                        </select>
                        <textarea value={userInput} onChange={e => setUserInput(e.target.value)} placeholder="Enter user message..." className="w-full p-2 bg-secondary border border-border rounded-md" rows={4}/>
                        
                        <div className="p-2 bg-tertiary rounded-md">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="checkbox" checked={forceFullData} onChange={e => setForceFullData(e.target.checked)} className="form-checkbox h-4 w-4 text-accent-primary bg-primary rounded"/>
                                Force use of full data (ignore summary)
                            </label>
                        </div>

                        <details className="bg-tertiary p-2 rounded-md">
                            <summary className="text-sm cursor-pointer" onClick={() => setOverrideContext(c => !c)}>Override Context Fields</summary>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                            {allFields.map(field => (
                                <label key={field} className="flex items-center space-x-2 text-text-primary text-sm">
                                    <input type="checkbox" checked={tempIncludedFields.includes(field)} onChange={() => handleFieldToggle(field)} className="form-checkbox h-4 w-4 text-accent-primary bg-primary rounded"/>
                                    <span className="capitalize">{field}</span>
                                </label>
                            ))}
                            </div>
                        </details>

                        <button onClick={handleRunSimulation} disabled={isSimulating || !selectedCharId || !userInput || !modelOverride} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent-secondary text-white rounded-md disabled:bg-hover">
                            {isSimulating && <SpinnerIcon className="w-5 h-5 animate-spin"/>}
                            Run Simulation
                        </button>
                    </div>
                </Section>
            </div>
            <div>
                 <Section title="Live Flow Diagram">
                    {simulationResults.length === 0 && !isSimulating && <p className="text-text-secondary text-center py-8">Run a simulation to see the data flow.</p>}
                    {isSimulating && <div className="flex justify-center items-center gap-3 py-8 text-text-secondary"><SpinnerIcon className="w-6 h-6 animate-spin" /><span>Simulation in progress...</span></div>}
                    <div className="space-y-2">
                        {simulationResults.map((result, i) => (
                             <React.Fragment key={i}>
                                <FlowCard title={result.title} icon={result.icon} status={result.status} duration={result.duration}>
                                    {result.data && <pre className="whitespace-pre-wrap bg-primary p-2 rounded mt-2 text-xs font-mono max-h-60 overflow-y-auto">{typeof result.data === 'object' ? JSON.stringify(result.data, null, 2) : String(result.data)}</pre>}
                                </FlowCard>
                                {i < simulationResults.length - 1 && <FlowArrow />}
                            </React.Fragment>
                        ))}
                    </div>
                </Section>
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