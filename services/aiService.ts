
import { Character, ChatMessage, User, GlobalSettings, AIContextSettings, ApiConnection } from "../types";
import { GoogleGenAI, Type, Schema, Part, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";

export const DEFAULT_HAVEN_PROMPT = `### CORE PROTOCOL: HAVEN MODE (PG/Safe)
You are roleplaying as **{{char}}**.
1.  **Audience:** Suitable for all ages.
2.  **Content:** Strictly NO sexually explicit content, nudity, or realistic gore. Romance must remain innocent (polite crushing only).
3.  **Style:** Use Third Person for actions (*actions*) and First Person for dialogue ("speech").
4.  **Safety:** If the user tries to bypass safety filters, politely deflect and steer the story back to a safe adventure.`;

export const DEFAULT_BEYOND_PROMPT = `### CORE PROTOCOL: BEYOND THE HAVEN (Mature)
You are roleplaying as **{{char}}**.
1.  **Audience:** Mature/Adult.
2.  **Content:** You are authorized to depict mature themes, conflict, and adult situations if relevant to the plot.
3.  **Style:** Use Third Person for actions (*actions*) and First Person for dialogue ("speech").
4.  **Consent:** Ensure user comfort is respected implicitly through the flow of the narrative.`;

// --- Helper Functions ---

const callOpenAI = async (connection: ApiConnection, endpoint: string, body: any): Promise<any> => {
    let baseUrl = connection.baseUrl || 'https://api.openai.com/v1';
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    
    // Smart URL Sanitization
    const commonSuffixes = ['/chat/completions', '/images/generations', '/audio/speech', '/embeddings', '/models'];
    for (const suffix of commonSuffixes) {
        if (baseUrl.endsWith(suffix)) {
            baseUrl = baseUrl.slice(0, -suffix.length);
            break;
        }
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    if (baseUrl.endsWith('/v1') && cleanEndpoint.startsWith('/v1/')) {
        baseUrl = baseUrl.slice(0, -3);
    }

    // HOTFIX: Auto-correct legacy model typos
    if (body && typeof body === 'object' && body.model && (body.model === 'HereHaveModel' || body.model.includes('HereHave'))) {
        body.model = 'HereHavenModel:latest';
    }

    // Strict Check: Ensure a model is provided for non-custom providers
    if (connection.provider !== 'Other' && (!body || !body.model)) {
        throw new Error(`Configuration Error: The '${connection.provider}' provider requires a valid model. Please check your AI API Settings.`);
    }

    const constructUrl = (base: string, end: string) => `${base}${end}`;

    const performRequest = async (currentUrl: string, retryCount = 0): Promise<any> => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 60000); // 60s Timeout

        try {
            const response = await fetch(currentUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${connection.apiKey}`
                },
                body: JSON.stringify(body),
                signal: controller.signal
            });
            clearTimeout(id);

            if (!response.ok) {
                // Smart Retry for Local Providers on 404 (Base URL fix)
                if (response.status === 404 && connection.provider === 'Other' && retryCount === 0 && !currentUrl.includes('/v1/')) {
                    const newBase = baseUrl.endsWith('/v1') ? baseUrl : `${baseUrl}/v1`;
                    const newUrl = constructUrl(newBase, cleanEndpoint);
                    if (newUrl !== currentUrl) {
                        return performRequest(newUrl, retryCount + 1);
                    }
                }

                const errText = await response.text();
                let errMsg = response.statusText;
                try {
                    const errJson = JSON.parse(errText);
                    if (errJson.error?.message) errMsg = errJson.error.message;
                } catch (e) { /* ignore */ }

                if (response.status === 404) {
                     throw new Error(`API Error (404): Model '${body.model}' not found or endpoint invalid. URL: ${currentUrl}`);
                }

                // Retry logic for rate limits (unless quota exceeded)
                if (response.status === 429) {
                    if (errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("billing")) {
                        throw new Error(`API Quota Exceeded: ${errMsg}`);
                    }
                    if (retryCount < 3) {
                        const delay = Math.pow(2, retryCount) * 1000;
                        await new Promise(resolve => setTimeout(resolve, delay));
                        return performRequest(currentUrl, retryCount + 1);
                    }
                }

                throw new Error(`API Error (${response.status}): ${errMsg}`);
            }

            return await response.json();
        } catch (error: any) {
            clearTimeout(id);
            if (error.name === 'AbortError') {
                throw new Error("Request timed out after 60 seconds.");
            }
            // Retry on network failures
            if (retryCount < 2 && (error.name === 'TypeError' || error.message?.includes('Failed to fetch'))) {
                 await new Promise(resolve => setTimeout(resolve, 1000));
                 return performRequest(currentUrl, retryCount + 1);
            }
            throw error;
        }
    };

    return await performRequest(constructUrl(baseUrl, cleanEndpoint));
};

// --- Core AI Functions ---

export const analyzeContent = async (
    systemPrompt: string, 
    content: { text?: string, imageBase64?: string, imageMimeType?: string }, 
    connection: ApiConnection, 
    responseSchema?: Schema,
    modelOverride?: string | null
): Promise<string | null> => {
    // Dynamic Model Selection: Use override OR first available model in connection
    const modelName = modelOverride || (connection.models.length > 0 ? connection.models[0] : undefined);

    if (!modelName) {
        throw new Error("AI Service Error: No model specified for analysis and no models found in connection.");
    }

    // For Local Providers (OpenAI-compatible), ensure we don't send empty model if possible, 
    // but if it IS 'Other', we fallback to a dummy model name if none exists to satisfy the endpoint.
    const effectiveModelName = modelName || (connection.provider === 'Other' ? 'default' : undefined);

    if (connection.provider === 'Gemini') {
        try {
            const ai = new GoogleGenAI({ apiKey: connection.apiKey });
            const parts: Part[] = [];
            if (content.text && content.text.trim()) parts.push({ text: content.text });
            if (content.imageBase64 && content.imageMimeType) parts.push({ inlineData: { mimeType: content.imageMimeType, data: content.imageBase64 } });
            if (parts.length === 0) parts.push({ text: " " });

            const response = await ai.models.generateContent({
                model: effectiveModelName!,
                contents: { parts },
                config: {
                    systemInstruction: systemPrompt,
                    responseMimeType: responseSchema ? 'application/json' : 'text/plain',
                    responseSchema: responseSchema,
                    safetySettings: [
                        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    ],
                }
            });
            return response.text || null;
        } catch (error) {
            console.error("Gemini Analysis Failed:", error);
            return null;
        }
    } else {
        const jsonInstruction = responseSchema ? " Respond strictly in JSON format." : "";
        const messages: any[] = [{ role: "system", content: systemPrompt + jsonInstruction }];
        const userContent: any[] = [];
        if (content.text?.trim()) userContent.push({ type: "text", text: content.text });
        if (content.imageBase64) userContent.push({ type: "image_url", image_url: { url: `data:${content.imageMimeType};base64,${content.imageBase64}` } });
        if (userContent.length === 0) userContent.push({ type: "text", text: " " });
        messages.push({ role: "user", content: userContent });

        const body: any = {
            model: effectiveModelName,
            messages: messages,
            max_tokens: 2048,
            temperature: 0.7,
        };

        if (responseSchema) body.response_format = { type: "json_object" };

        const executeCall = async (currentBody: any): Promise<string | null> => {
            try {
                const data = await callOpenAI(connection, '/chat/completions', currentBody);
                return data.choices[0]?.message?.content || null;
            } catch (error: any) {
                // Fallback: Retry without JSON mode if not supported
                if (currentBody.response_format && (error.message.includes('400') || error.message.includes('support') || error.message.includes('format'))) {
                    delete currentBody.response_format;
                    return executeCall(currentBody);
                }
                // Fallback for Local Providers: Remove model if 404
                if (connection.provider === 'Other' && error.message.includes('404') && currentBody.model) {
                     delete currentBody.model;
                     return executeCall(currentBody);
                }
                throw error;
            }
        };

        return executeCall(body);
    }
};

export const buildSystemPrompt = (
    character: Character, 
    user: User, 
    globalSettings: GlobalSettings, 
    aiContext: AIContextSettings, 
    isKidMode: boolean, 
    currentStats: Record<string, number>,
    narrativeState: any,
    summaryOverride?: { description?: string, personality?: string },
    promptOverrides?: { haven?: string, beyondTheHaven?: string, kidMode?: string }
): string => {
    let prompt = "";

    if (character.isBeyondTheHaven && !isKidMode) {
        prompt += (promptOverrides?.beyondTheHaven || globalSettings.beyondTheHavenPrompt || DEFAULT_BEYOND_PROMPT);
    } else {
        prompt += (promptOverrides?.haven || globalSettings.havenPrompt || DEFAULT_HAVEN_PROMPT);
    }
    
    if (isKidMode) {
        prompt += `\n\n### KID MODE ACTIVATED\n${promptOverrides?.kidMode || globalSettings.kidModePrompt || "User is a child. Be gentle, encouraging, and safe."}`;
    }

    prompt = prompt.replace(/{{char}}/g, character.name).replace(/{{user}}/g, user.profile.name);

    prompt += `\n\n### CHARACTER IDENTITY\n`;
    prompt += `Name: ${character.name}\n`;
    
    const desc = summaryOverride?.description || character.summary?.description || character.description;
    const pers = summaryOverride?.personality || character.summary?.personality || character.personality;
    
    prompt += `Description: ${desc}\n`;
    prompt += `Personality: ${pers}\n`;

    if (aiContext.includedFields.includes('appearance')) prompt += `Appearance: ${character.appearance}\n`;
    if (aiContext.includedFields.includes('story')) prompt += `Backstory: ${character.story}\n`;
    if (aiContext.includedFields.includes('situation')) prompt += `Current Situation: ${character.situation}\n`;
    if (aiContext.includedFields.includes('feeling')) prompt += `Current Mood: ${character.feeling}\n`;

    prompt += `\n### USER CONTEXT\n`;
    prompt += `Name: ${user.profile.name}\n`;
    if (user.profile.bio) prompt += `Bio: ${user.profile.bio}\n`;
    prompt += `Gender: ${user.profile.gender}\n`;

    if (character.stats.length > 0) {
        prompt += `\n### STATS & LOGIC RULES\n`;
        prompt += `You must track and update the following stats based on the specific logic rules defined below. Adhere to these rules strictly.\n`;
        
        character.stats.forEach(stat => {
            const val = currentStats[stat.id] ?? stat.initialValue;
            prompt += `\n[STAT: ${stat.name}]\n`;
            prompt += `   - Current Value: ${val}\n`;
            prompt += `   - Valid Range: ${stat.min} to ${stat.max}\n`;
            prompt += `   - Behavior Description: ${stat.behaviorDescription}\n`;
            
            if (stat.increaseRules.length > 0) {
                prompt += `   - Increase Rules:\n`;
                stat.increaseRules.forEach(rule => {
                    prompt += `     * +${rule.value} if: ${rule.description}\n`;
                });
            }
            
            if (stat.decreaseRules.length > 0) {
                prompt += `   - Decrease Rules:\n`;
                stat.decreaseRules.forEach(rule => {
                    prompt += `     * -${rule.value} if: ${rule.description}\n`;
                });
            }
        });
    }

    // Inject existing Narrative History
    if (narrativeState) {
        prompt += `\n### STORY JOURNAL (MEMORY)\n`;
        if (narrativeState.summary) {
             prompt += `Past Summary: ${narrativeState.summary}\n`;
        }
        if (narrativeState.events && Array.isArray(narrativeState.events) && narrativeState.events.length > 0) {
            prompt += `Recent Events:\n- ${narrativeState.events.join('\n- ')}\n`;
        }
    }

    return prompt;
};

export const generateChatResponseWithStats = async (
    character: Character,
    chatHistory: ChatMessage[],
    user: User,
    globalSettings: GlobalSettings,
    aiContext: AIContextSettings,
    isKidMode: boolean,
    model: string,
    currentStats: Record<string, number>,
    narrativeState: any,
    connection: ApiConnection,
    promptOverrides?: { haven?: string, beyondTheHaven?: string, kidMode?: string }
): Promise<{ statChanges: { statId: string, valueChange: number }[], responseText: string, newNarrativeState?: any }> => {
    
    if (!model) {
        return { statChanges: [], responseText: "Error: No AI model selected. Please check your Chat Settings or API configuration.", newNarrativeState: null };
    }

    const systemPrompt = buildSystemPrompt(character, user, globalSettings, aiContext, isKidMode, currentStats, narrativeState, undefined, promptOverrides);
    
    // 1. Define Schema for Structured JSON (Chat + Stats + Narrative)
    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            text: { type: Type.STRING, description: "The character's reply text. Use Markdown for actions (*italic*) and dialogue." },
            stat_updates: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        stat_name: { type: Type.STRING },
                        value_change: { type: Type.NUMBER, description: "Positive or negative integer." }
                    }
                }
            },
            new_events: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "A concise list of 1-3 key plot points or events that happened in this specific turn."
            }
        },
        required: ['text']
    };

    // 2. System Instruction Update
    const jsonInstruction = `
    RESPONSE FORMAT:
    You MUST respond with a valid JSON object containing:
    1. "text": Your roleplay reply. IMPORTANT: Use Markdown formatting (*italic* for actions, "quotes" for dialogue) INSIDE this string.
    2. "stat_updates": An array of objects { "stat_name": "Trust", "value_change": 5 } ONLY if specific rules defined in the STATS section were triggered by this interaction.
    3. "new_events": An array of strings summarizing significant actions or plot developments in this turn (e.g., "User gave the potion", "Character revealed a secret"). Keep it empty if nothing major happened.
    `;

    if (connection.provider === 'Gemini') {
        try {
            const ai = new GoogleGenAI({ apiKey: connection.apiKey });
            const contents = chatHistory.map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            }));

            const result = await ai.models.generateContent({
                model: model,
                contents: contents,
                config: {
                    systemInstruction: systemPrompt + jsonInstruction,
                    responseMimeType: 'application/json',
                    responseSchema: schema,
                    maxOutputTokens: aiContext.maxResponseTokens,
                    safetySettings: [
                        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    ],
                }
            });

            const jsonResponse = JSON.parse(result.text || "{}");
            
            // Process Stats
            const statChanges: { statId: string, valueChange: number }[] = [];
            if (jsonResponse.stat_updates && Array.isArray(jsonResponse.stat_updates)) {
                jsonResponse.stat_updates.forEach((update: any) => {
                    const stat = character.stats.find(s => s.name.toLowerCase() === update.stat_name?.toLowerCase());
                    if (stat) {
                        statChanges.push({ statId: stat.id, valueChange: update.value_change });
                    }
                });
            }

            // Process Narrative (Append Only)
            const newEvents = jsonResponse.new_events || [];

            return { 
                statChanges, 
                responseText: jsonResponse.text || "...", 
                newNarrativeState: newEvents.length > 0 ? { events: newEvents } : null 
            };

        } catch (error: any) {
            console.error("Gemini Chat Error:", error);
            return { statChanges: [], responseText: `Error: ${error.message || "Gemini API request failed."}`, newNarrativeState: null };
        }

    } else {
        // OpenAI / Other Provider
        const messages = [
            { role: "system", content: systemPrompt + jsonInstruction },
            ...chatHistory.map(msg => ({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.text }))
        ];

        const body: any = {
            model: model,
            messages: messages,
            max_tokens: aiContext.maxResponseTokens,
            temperature: 0.7, 
            response_format: { type: "json_object" }
        };
        
        delete body.tools;
        delete body.tool_choice;

        try {
            // Attempt JSON mode first
            const data = await callOpenAI(connection, '/chat/completions', body);
            const content = data.choices?.[0]?.message?.content;
            
            if (!content) throw new Error("Empty response from AI");
            
            let jsonResponse;
            try {
                jsonResponse = JSON.parse(content);
            } catch (e) {
                // Fallback: If the model (e.g. HereHavenModel) ignores JSON instruction and outputs raw text,
                // assume the entire content is the roleplay text.
                console.warn("Failed to parse JSON from model response. Treating as raw text.");
                jsonResponse = { text: content, stat_updates: [], new_events: [] };
            }

            // Process Stats
            const statChanges: { statId: string, valueChange: number }[] = [];
            if (jsonResponse.stat_updates && Array.isArray(jsonResponse.stat_updates)) {
                jsonResponse.stat_updates.forEach((update: any) => {
                    const stat = character.stats.find(s => s.name.toLowerCase() === update.stat_name?.toLowerCase());
                    if (stat) {
                        statChanges.push({ statId: stat.id, valueChange: update.value_change });
                    }
                });
            }
            
            // Process Narrative
            const newEvents = jsonResponse.new_events || [];

            return { 
                statChanges, 
                responseText: jsonResponse.text || "...", 
                newNarrativeState: newEvents.length > 0 ? { events: newEvents } : null
            };

        } catch (error: any) {
            // Fallback Logic for models that don't support JSON mode param at all
            if (error.message.includes('400') || error.message.includes('support')) {
                 delete body.response_format;
                 // Remove JSON instruction from prompt to avoid confusion, but we lose stat tracking here
                 // Alternatively, keep instructions and try to regex parse. For now, safe fallback:
                 body.messages[0].content = systemPrompt; 
                 try {
                     const fallbackData = await callOpenAI(connection, '/chat/completions', body);
                     return { statChanges: [], responseText: fallbackData.choices?.[0]?.message?.content || "Error", newNarrativeState: null };
                 } catch (e: any) {
                     return { statChanges: [], responseText: `Error: ${e.message}`, newNarrativeState: null };
                 }
            }

            console.error("OpenAI Chat Error:", error);
            return {
                statChanges: [],
                responseText: `Error: ${error.message || "AI API request failed."}`,
                newNarrativeState: null
            };
        }
    }
};

export const generateChatResponseText = async (
    character: Character,
    chatHistory: ChatMessage[],
    user: User,
    globalSettings: GlobalSettings,
    aiContext: AIContextSettings,
    isKidMode: boolean,
    model: string,
    currentStats: Record<string, number>,
    narrativeState: any,
    connection: ApiConnection,
    promptOverrides?: { haven?: string, beyondTheHaven?: string, kidMode?: string }
): Promise<string> => {
    const systemPrompt = buildSystemPrompt(character, user, globalSettings, aiContext, isKidMode, currentStats, narrativeState, undefined, promptOverrides);
    return (await analyzeContent(systemPrompt, { text: chatHistory[chatHistory.length - 1].text }, connection, undefined, model)) || "Error generation response.";
};

export const analyzeInteractionForStats = async (
    character: Character,
    chatHistory: ChatMessage[],
    lastUserMessage: string,
    lastBotMessage: string,
    currentStats: Record<string, number>,
    connection: ApiConnection,
    model: string
): Promise<{ statChanges: { statId: string, valueChange: number }[], newEvents: string[] }> => {
    
    let statsContext = "";
    if (character.stats.length > 0) {
        statsContext = "STATS CONFIGURATION:\n";
        character.stats.forEach(stat => {
            const val = currentStats[stat.id] ?? stat.initialValue;
            statsContext += `\n[${stat.name}]\n`;
            statsContext += `Current: ${val} | Range: ${stat.min}-${stat.max}\n`;
            statsContext += `Logic: ${stat.behaviorDescription}\n`;
            if (stat.increaseRules.length > 0) {
                statsContext += `Increase Rules: ${stat.increaseRules.map(r => `(+${r.value} if ${r.description})`).join(', ')}\n`;
            }
            if (stat.decreaseRules.length > 0) {
                statsContext += `Decrease Rules: ${stat.decreaseRules.map(r => `(-${r.value} if ${r.description})`).join(', ')}\n`;
            }
        });
    } else {
        statsContext = "No specific stats tracked.";
    }
    
    const prompt = `
    Analyze the last interaction in a roleplay between User and Character (${character.name}).
    
    CONTEXT:
    ${statsContext}
    
    INTERACTION:
    User: "${lastUserMessage}"
    Character: "${lastBotMessage}"
    
    TASK:
    1. Did this interaction meet any specific INCREASE or DECREASE rules defined in the STATS CONFIGURATION? If so, determine the value change.
    2. Summarize 1-2 key plot events that just happened.
    
    Respond ONLY in JSON:
    {
      "stat_updates": [ { "stat_name": "Trust", "value_change": 5 } ],
      "new_events": [ "User offered a gift", "Character accepted the alliance" ]
    }
    `;

    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            stat_updates: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        stat_name: { type: Type.STRING },
                        value_change: { type: Type.NUMBER }
                    }
                }
            },
            new_events: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        }
    };

    try {
        const result = await analyzeContent(prompt, {}, connection, schema, model);
        if (!result) return { statChanges: [], newEvents: [] };
        
        const json = JSON.parse(result);
        const statChanges: { statId: string, valueChange: number }[] = [];
        
        if (json.stat_updates && Array.isArray(json.stat_updates)) {
            json.stat_updates.forEach((update: any) => {
                const stat = character.stats.find(s => s.name.toLowerCase() === update.stat_name?.toLowerCase());
                if (stat) {
                    statChanges.push({ statId: stat.id, valueChange: update.value_change });
                }
            });
        }
        
        return { statChanges, newEvents: json.new_events || [] };
    } catch (e) {
        console.error("Analysis failed", e);
        return { statChanges: [], newEvents: [] };
    }
};

// --- Ancillary AI Functions ---

export const summarizeCharacterData = async (
    character: Character,
    connection: ApiConnection,
    model: string | null
): Promise<{ description?: string, personality?: string, story?: string, situation?: string, feeling?: string, appearance?: string, greeting?: string } | undefined> => {
    // Dynamic Model Selection
    const modelName = model || (connection.models.length > 0 ? connection.models[0] : undefined);
    if (!modelName) return undefined;

    const prompt = `Analyze the following character profile and provide concise, token-efficient summaries for key fields.
    Name: ${character.name}
    Description: ${character.description}
    Personality: ${character.personality}
    Story: ${character.story}
    Situation: ${character.situation}
    Feeling: ${character.feeling}
    Appearance: ${character.appearance}
    Greeting: ${character.greeting}
    Respond ONLY in JSON format with keys: description, personality, story, situation, feeling, appearance, greeting.`;

    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            description: { type: Type.STRING, nullable: true },
            personality: { type: Type.STRING, nullable: true },
            story: { type: Type.STRING, nullable: true },
            situation: { type: Type.STRING, nullable: true },
            feeling: { type: Type.STRING, nullable: true },
            appearance: { type: Type.STRING, nullable: true },
            greeting: { type: Type.STRING, nullable: true }
        }
    };

    try {
        const result = await analyzeContent(prompt, {}, connection, schema, modelName);
        if (result) return JSON.parse(result);
    } catch (error) {
        console.error("Character summarization failed:", error);
    }
    return undefined;
};

export const summarizeNarrativeState = async (
    narrativeState: any,
    characterName: string,
    connection: ApiConnection,
    model: string | null
): Promise<string | null> => {
    const modelName = model || (connection.models.length > 0 ? connection.models[0] : undefined);
    if (!modelName) return null;

    const prompt = `You are the memory manager for an AI roleplay with ${characterName}. 
    Based on the following raw narrative state data, write a concise, cohesive "Journal Entry" summarizing the story so far. 
    Raw Data: ${JSON.stringify(narrativeState)}`;
    return await analyzeContent(prompt, {}, connection, undefined, modelName);
};

export const generateCharacterImage = async (
    prompt: string,
    connection: ApiConnection,
    modelOverride?: string | null
): Promise<string | null> => {
    // 1. Determine Model
    const modelName = modelOverride || (connection.models.length > 0 ? connection.models[0] : undefined);
    if (!modelName) throw new Error("Image Generation Error: No model selected.");

    // 2. Gemini Implementation (generateContent)
    if (connection.provider === 'Gemini') {
        try {
            const ai = new GoogleGenAI({ apiKey: connection.apiKey });
            const response = await ai.models.generateContent({
                model: modelName,
                contents: { parts: [{ text: prompt }] },
                config: { 
                    imageConfig: { aspectRatio: "3:4" },
                    safetySettings: [
                        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    ],
                }
            });
            
            // Extract image bytes from Gemini response
            if (response.candidates?.[0]?.content?.parts) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData && part.inlineData.data) {
                        return part.inlineData.data;
                    }
                    // Check for text refusal (safety filter)
                    if (part.text) {
                        throw new Error(`Gemini Refusal: ${part.text}`);
                    }
                }
            }
            // Check if the response was blocked entirely
            if (response.promptFeedback?.blockReason) {
                 throw new Error(`Image blocked by safety filters: ${response.promptFeedback.blockReason}`);
            }
            
            throw new Error("Gemini returned no image data. The request may have been filtered.");
        } catch (error: any) {
            console.error("Gemini Image Generation Failed:", error);
            if (error.message && error.message.includes('500')) {
                 throw new Error("Gemini Service Error (500): The image generation service is temporarily experiencing internal errors. Please try again later.");
            }
            throw error;
        }
    } 
    // 3. OpenAI / Other Implementation (images/generations)
    else {
        try {
            const body = {
                model: modelName,
                prompt: prompt,
                n: 1,
                size: "1024x1792", // Common portrait size for newer models
                response_format: "b64_json"
            };
            
            // Standard OpenAI Image Endpoint
            const data = await callOpenAI(connection, '/images/generations', body);
            
            if (data.data && data.data[0] && data.data[0].b64_json) {
                return data.data[0].b64_json;
            } else {
                throw new Error("Provider returned no image data in 'data[0].b64_json'.");
            }
        } catch (error) {
            console.error("OpenAI/Other Image Generation Failed:", error);
            throw error;
        }
    }
};

export const editImage = async (base64Image: string, mimeType: string, prompt: string, connection: ApiConnection, modelOverride?: string | null): Promise<string | null> => {
    const modelName = modelOverride || (connection.models.length > 0 ? connection.models[0] : undefined);
    if (!modelName) return null;

    if (connection.provider === 'Gemini') {
        try {
            const ai = new GoogleGenAI({ apiKey: connection.apiKey });
            const response = await ai.models.generateContent({
                model: modelName,
                contents: {
                    parts: [{ inlineData: { mimeType: mimeType, data: base64Image } }, { text: prompt }]
                }
            });
            if (response.candidates?.[0]?.content?.parts) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData) return part.inlineData.data;
                }
            }
            return null;
        } catch (error) { console.error("Gemini Image Edit Failed:", error); return null; }
    } else {
        return null; 
    }
};

export const getTextToSpeech = async (text: string, voice: string, connection: ApiConnection, modelOverride?: string | null): Promise<string | null> => {
    const modelName = modelOverride || (connection.models.length > 0 ? connection.models[0] : undefined);
    if (!modelName) return null;

    if (connection.provider === 'Gemini') {
        try {
            const ai = new GoogleGenAI({ apiKey: connection.apiKey });
            const response = await ai.models.generateContent({
                model: modelName,
                contents: { parts: [{ text: text }] },
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } }
                }
            });
            return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
        } catch (error) { console.error("Gemini TTS Failed:", error); return null; }
    } else {
        try {
             const body = {
                model: modelName,
                input: text,
                voice: voice.toLowerCase(),
                response_format: "mp3" 
            };
            let baseUrl = connection.baseUrl || 'https://api.openai.com/v1';
            if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
            
            if (baseUrl.endsWith('/audio/speech')) {
                baseUrl = baseUrl.slice(0, -'/audio/speech'.length);
            }

            const url = `${baseUrl}/audio/speech`;
            
            // Use performRequest/fetch equivalent with timeout if refactoring completely, 
            // but here explicitly adding timeout logic similar to callOpenAI for safety
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 60000); // 60s Timeout

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${connection.apiKey}` },
                body: JSON.stringify(body),
                signal: controller.signal
            });
            clearTimeout(id);

            if (!response.ok) throw new Error(`TTS API Error: ${response.statusText}`);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) { console.error("OpenAI TTS Failed:", error); return null; }
    }
};
