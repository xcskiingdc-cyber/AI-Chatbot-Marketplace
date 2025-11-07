import React, { useState, useContext, useMemo, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ApiConnection, Character, GlobalSettings, AIContextSettings, CharacterContextField, ChatMessage, User } from '../types';
import { SystemMonitorIcon, SpinnerIcon, UserIcon, DocumentTextIcon, CodeBracketIcon, ChatBubbleIcon, CpuChipIcon, ServerIcon, SparklesIcon, DatabaseIcon } from './Icons';
import { buildSystemPrompt, HAVEN_STORIES_PROMPT, BEYOND_THE_HAVEN_PROMPT, generateChatResponseWithStats } from '../services/aiService';

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

const FlowCard: React.FC<{ title: string; icon: React.ReactNode; active?: boolean; children?: React.ReactNode; }> = ({ title, icon, active = true, children }) => (
    <div className={`border rounded-lg ${active ? 'border-border bg-secondary' : 'border-dashed border-tertiary bg-secondary/50 text-text-secondary'}`}>
        <h4 className="font-semibold flex items-center gap-2 p-3 border-b border-border">
            {icon} {title}
        </h4>
        {children && <div className="p-3 text-sm space-y-2">{children}</div>}
    </div>
);

const LogicBlock: React.FC<{ title: string; condition: string; then: string; elseStmt: string; active?: boolean; }> = ({ title, condition, then, elseStmt, active = true }) => (
    <div>
        <h5 className="text-xs font-semibold text-text-secondary mb-1">{title}</h5>
        <div className={`p-2 rounded ${active ? 'bg-primary' : 'bg-tertiary'}`}>
            <p><span className="font-bold text-accent-secondary">IF</span> <span className="font-mono text-xs">{condition}</span></p>
            <p className="pl-4 text-xs"><strong>THEN:</strong> {then}</p>
            <p><span className="font-bold text-accent-secondary">ELSE</span></p>
            <p className="pl-4 text-xs"><strong>THEN:</strong> {elseStmt}</p>
        </div>
    </div>
);

const ChatFlowDiagram: React.FC = () => {
    const auth = useContext(AuthContext);
    if (!auth) return null;
    const { globalSettings, aiContextSettings, apiConnections, defaultApiConnectionId } = auth;
    
    const allFields: CharacterContextField[] = ['gender', 'description', 'personality', 'story', 'situation', 'feeling', 'appearance'];
    const defaultConnection = apiConnections.find(c => c.id === defaultApiConnectionId);

    return (
        <Section title="Dynamic Chat Flow Diagram">
            <div className="flex flex-col items-center">
                <FlowCard title="User Input" icon={<UserIcon className="w-5 h-5" />} />
                <FlowArrow />
                <div className="grid grid-cols-2 gap-2 w-full">
                    <FlowCard title="Character Data" icon={<DocumentTextIcon className="w-5 h-5" />} />
                    <FlowCard title="Narrative State" icon={<DatabaseIcon className="w-5 h-5" />} />
                </div>
                <FlowArrow />
                <FlowCard title="Context Assembly" icon={<CodeBracketIcon className="w-5 h-5" />}>
                    <LogicBlock 
                        title="Base Prompt Selection"
                        condition="character.isBeyondTheHaven"
                        then={`Use 'Beyond the Haven' Prompt (${globalSettings.beyondTheHavenPrompt ? 'Custom' : 'Default'})`}
                        elseStmt={`Use 'Haven Stories' Prompt (${globalSettings.havenStoriesPrompt ? 'Custom' : 'Default'})`}
                    />
                    <div>
                         <h5 className="text-xs font-semibold text-text-secondary mb-1">Character Field Injection</h5>
                         <div className="grid grid-cols-2 gap-1 p-2 bg-primary rounded text-xs">
                            {allFields.map(field => {
                                const isActive = aiContextSettings.includedFields.includes(field);
                                return (
                                    <div key={field} className={`flex items-center gap-1 ${isActive ? 'text-text-primary' : 'text-text-secondary line-through'}`}>
                                        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-success' : 'bg-tertiary'}`}></span>
                                        <span className="capitalize">{field}</span>
                                    </div>
                                );
                            })}
                         </div>
                    </div>
                    <LogicBlock
                        title="Stat System Injection"
                        condition="character.stats.length > 0"
                        then="Append stat definitions and function call instruction."
                        elseStmt="Skip."
                    />
                    <div>
                        <h5 className="text-xs font-semibold text-text-secondary mb-1">Narrative State Injection</h5>
                        <div className="p-2 rounded bg-primary text-xs">
                            <p>Always active. Appends the current narrative state JSON and includes the `update_narrative_state` function instruction to the prompt.</p>
                        </div>
                    </div>
                    <LogicBlock
                        title="Kid Mode Filter"
                        condition="chatSettings.kidMode === true"
                        then={`Append 'Kid Mode' Prompt (${globalSettings.kidModePrompt ? 'Active' : 'Not Set'})`}
                        elseStmt="Skip."
                        active={!!globalSettings.kidModePrompt}
                    />
                </FlowCard>
                <FlowArrow />
                <FlowCard title="System Prompt Assembled" icon={<DocumentTextIcon className="w-5 h-5" />} />
                <FlowArrow />
                <FlowCard title="Chat History Context" icon={<ChatBubbleIcon className="w-5 h-5" />}>
                     <p>Last <strong className="text-accent-primary">{aiContextSettings.historyLength}</strong> messages are included.</p>
                </FlowCard>
                <FlowArrow />
                <FlowCard title="API Connection & Call" icon={<ServerIcon className="w-5 h-5" />}>
                    <p>Default Connection: <strong className="text-accent-primary">{defaultConnection?.name || 'Not Set'}</strong></p>
                    <LogicBlock 
                        title="Provider Logic"
                        condition={`connection.provider === 'Gemini'`}
                        then="Use Gemini SDK"
                        elseStmt="Use OpenAI-compatible API endpoint"
                    />
                     <p className="text-xs mt-2"><strong>Note:</strong> Character's model setting overrides the default if a connection is found.</p>
                </FlowCard>
                <FlowArrow />
                <FlowCard title="API Response" icon={<SparklesIcon className="w-5 h-5" />}>
                    <LogicBlock
                        title="Stat Parsing"
                        condition="Function call for 'update_stats' is present"
                        then="Extract 'responseText' and 'statChanges' separately."
                        elseStmt="Response is treated as plain 'responseText'."
                    />
                     <LogicBlock
                        title="Narrative State Parsing"
                        condition="Function call for 'update_narrative_state' is present"
                        then="Extract 'newStateJson' and parse it."
                        elseStmt="Narrative state remains unchanged."
                    />
                </FlowCard>
            </div>
        </Section>
    );
};


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
                    <summary className="cursor-pointer font-semibold">Haven Stories Prompt <span className="text-xs text-text-secondary">({globalSettings.havenStoriesPrompt ? 'Custom' : 'Default'})</span></summary>
                    <pre className="text-xs font-mono bg-primary p-2 mt-1 rounded border border-border max-h-40 overflow-y-auto">{globalSettings.havenStoriesPrompt || HAVEN_STORIES_PROMPT}</pre>
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
            <div className="lg:col-span-2 xl:col-span-3">
                <ChatFlowDiagram />
            </div>
        </div>
    );
};


const FlowStep: React.FC<{ title: string; status: 'success' | 'failure' | 'info'; data?: any, children?: React.ReactNode, duration?: number }> = ({ title, status, data, children, duration }) => {
    const statusClasses = {
        success: 'border-success',
        failure: 'border-danger',
        info: 'border-accent-secondary'
    };
    return (
        <details className="bg-primary rounded-lg border-l-4 p-4" open>
            <summary className={`font-semibold cursor-pointer flex justify-between items-center ${statusClasses[status].replace('border-','text-')}`}>
                <span>{title}</span>
                {duration !== undefined && <span className="text-xs text-text-secondary">{duration}ms</span>}
            </summary>
            <div className="mt-2 pl-4 border-l border-border text-sm">
                {children}
                {data && <pre className="whitespace-pre-wrap bg-tertiary p-2 rounded mt-2 text-xs font-mono max-h-60 overflow-y-auto">{typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data)}</pre>}
            </div>
        </details>
    );
}

const LiveSimulationTab: React.FC = () => {
    const auth = useContext(AuthContext);
    const { characters = [], currentUser, findConnectionForModel, globalSettings, aiContextSettings, apiConnections, narrativeStates } = auth!;
    const [isSimulating, setIsSimulating] = useState(false);
    const [selectedCharId, setSelectedCharId] = useState<string>('');
    const [modelOverride, setModelOverride] = useState<string>('');
    const [userInput, setUserInput] = useState('');
    const [simulationResults, setSimulationResults] = useState<any[]>([]);

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
            results.push({ title: "1. Initialization", status: 'info', data: { character: character.name, model: modelOverride, userInput }});
            
            const stats = auth.chatStats[currentUser.id]?.[character.id] || {};
            character.stats.forEach(s => {
                if(stats[s.id] === undefined) stats[s.id] = s.initialValue;
            });
             if(character.stats.length > 0) {
                results.push({ title: "2a. Stat Initialization", status: 'info', data: stats });
            }

            const narrativeState = narrativeStates[currentUser.id]?.[character.id] || {};
            results.push({ title: "2b. Narrative State Initialization", status: 'info', data: narrativeState });

            const connection = findConnectionForModel(modelOverride);
            if (!connection) {
                results.push({ title: "3. Connection Selection", status: 'failure', data: `No active connection found for model: ${modelOverride}` });
                setSimulationResults(results); return;
            }
            results.push({ title: "3. Connection Selection", status: 'success', data: { name: connection.name, provider: connection.provider, model: modelOverride } });
            
            const basePrompt = character.isBeyondTheHaven ? globalSettings.beyondTheHavenPrompt || BEYOND_THE_HAVEN_PROMPT : globalSettings.havenStoriesPrompt || HAVEN_STORIES_PROMPT;
            const charDefinition = buildSystemPrompt(character, currentUser, globalSettings, aiContextSettings, false, stats, narrativeState, overrideContext ? tempIncludedFields : undefined).split(basePrompt)[1] || '';
            results.push({ title: "4. Context Assembly", status: 'info', data: { 'Base Prompt': basePrompt, 'Character & Stat Definition': charDefinition.trim() }});

            const finalSystemPrompt = buildSystemPrompt(character, currentUser, globalSettings, aiContextSettings, false, stats, narrativeState, overrideContext ? tempIncludedFields : undefined);
            results.push({ title: "5. Final Assembled System Prompt", status: 'success', data: finalSystemPrompt });

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
            results.push({ title: "6. API Request Payload", status: 'info', data: requestPayload});
            
            const response = await generateChatResponseWithStats(character, history, currentUser, globalSettings, aiContextSettings, false, modelOverride, stats, narrativeState, connection);
            const duration = Date.now() - startTime;
            results.push({ title: "7. API Response", status: 'success', duration, data: response });
            
            results.push({ title: "8. Final Processed Output", status: 'success', data: { responseText: response.responseText, statChanges: response.statChanges, newNarrativeState: response.newNarrativeState }});

        } catch (error: any) {
            results.push({ title: "Simulation Error", status: 'failure', data: error.message });
        } finally {
            setIsSimulating(false);
            setSimulationResults(results);
        }
    };
    
    const allFields: CharacterContextField[] = ['gender', 'description', 'personality', 'story', 'situation', 'feeling', 'appearance'];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
                <Section title="Simulation Setup">
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
                    
                    <details className="bg-tertiary p-2 rounded-md">
                        <summary className="text-sm cursor-pointer" onClick={() => setOverrideContext(c => !c)}>Override Context Fields</summary>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                        {allFields.map(field => (
                            <label key={field} className="flex items-center space-x-2 text-text-primary text-sm">
                                <input type="checkbox" checked={tempIncludedFields.includes(field)} onChange={() => handleFieldToggle(field)} className="form-checkbox h-4 w-4 text-accent-primary bg-primary rounded"/>
                                <span>{field}</span>
                            </label>
                        ))}
                        </div>
                    </details>

                    <button onClick={handleRunSimulation} disabled={isSimulating || !selectedCharId || !userInput || !modelOverride} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent-secondary text-white rounded-md disabled:bg-hover">
                        {isSimulating && <SpinnerIcon className="w-5 h-5 animate-spin"/>}
                        Run Simulation
                    </button>
                </Section>
            </div>
            <div className="space-y-4">
                 <Section title="Simulation Flow">
                    {simulationResults.length === 0 && !isSimulating && <p className="text-text-secondary text-center py-8">Run a simulation to see the data flow.</p>}
                    {isSimulating && <div className="flex justify-center items-center gap-3 py-8 text-text-secondary"><SpinnerIcon className="w-6 h-6 animate-spin" /><span>Simulation in progress...</span></div>}
                    <div className="space-y-2">
                        {simulationResults.map((result, i) => <FlowStep key={i} {...result} />)}
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