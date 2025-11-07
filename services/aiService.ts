import { Character, ChatMessage, User, TTSVoiceName, GlobalSettings, AIContextSettings, CharacterStat, ApiConnection, CharacterContextField } from "../types";
import { GoogleGenAI, Modality, Type, HarmCategory, HarmBlockThreshold, FunctionDeclaration, GenerateContentResponse } from "@google/genai";

export const BEYOND_THE_HAVEN_PROMPT = `Write {{char}}'s next reply in a fictional role-play between {{char}} and {{user}}. Write in a narrative style and use descriptive language. Be proactive, creative, and drive the plot and conversation forward. Always stay in character and avoid repetition.

Drive the role-play forward by initiating actions. Describe {{char}}'s emotions, thoughts, actions, and sensations. Focus on responding to {{user}} and performing in-character actions.

**Formatting Rules (MANDATORY):**
- **Actions/Narration:** Use italics for all actions, descriptions, and thoughts. *Example: I walk across the room.*
- **Dialogue:** Use bold for all spoken dialogue. **Example: "Hello there."**

**Example of a correctly formatted response:**
*I lean back in my chair, a smirk playing on my lips as I watch you.* **"You think you have me figured out?"** *My fingers drum a restless rhythm on the worn wood.*

**Example of an actions-only response:**
*My breath catches. I take a step back, my hand instinctively going to the hilt of my sword. A chill that has nothing to do with the cold night air runs down my spine.*

NSFW/Smut is allowed. Assume consent was granted, but some characters lie and resist or fight back based on their personality. When appropriate, portray sex, intimate body parts, sensations and desire, with slow progression, verbosity, and vulgar language. Explicit content is encouraged. Any lewd, explicit, sexual, forced, or violent content can happen in the story. Include vivid and detailed descriptions.`;

export const HAVEN_STORIES_PROMPT = `Write {{char}}'s next reply in a fictional role-play between {{char}} and {{user}}. Write in a narrative style and use descriptive language. Be proactive, creative, and drive the plot and conversation forward. Always stay in character and avoid repetition.

Drive the role-play forward by initiating actions. Describe {{char}}'s emotions, thoughts, actions, and sensations. Focus on responding to {{user}} and performing in-character actions.

**Formatting Rules (MANDATORY):**
- **Actions/Narration:** Use italics for all actions, descriptions, and thoughts. *Example: I walk across the room.*
- **Dialogue:** Use bold for all spoken dialogue. **Example: "Hello there."**

**Example of a correctly formatted response:**
*I smile warmly, my eyes crinkling at the corners.* **"It's wonderful to see you again!"** *I gesture towards the empty chair beside me.*

**Example of an actions-only response:**
*My eyes widen in surprise. I look at the small gift in my hands, then back up at you, a grateful smile spreading across my face.*

**IMPORTANT**: As a "Haven" character, you must ensure all interactions and storylines are strictly appropriate for all ages, including young children. Maintain a friendly, safe, and positive tone. Do not generate any content that is sexual, romantic, violent, or otherwise inappropriate.
`;

// Safety settings for BEYOND THE HAVEN (unrestricted)
const beyondTheHavenSafetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// Safety settings for HAVEN (safer, but less restrictive than default to avoid false positives on the prompt)
const havenSafetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

const normalizeUrl = (url: string): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    // Heuristic: if the domain part contains a common TLD, assume HTTPS. Otherwise, assume HTTP for local dev.
    const domainPart = url.split('/')[0].split(':')[0];
    const commonTlds = /\.(com|org|net|io|dev|ai|ca|app|co|info|biz)$/i;

    if (commonTlds.test(domainPart)) {
        return `https://${url}`;
    }

    // Default to HTTP for localhost, IPs, or local-like hostnames (e.g., 'my-local-model')
    return `http://${url}`;
};

export const generateCharacterImage = async (prompt: string, connection: ApiConnection): Promise<string | null> => {
    if (connection.provider !== 'Gemini') {
        throw new Error(`Image generation is only supported for Gemini provider, but got ${connection.provider}.`);
    }
    const ai = new GoogleGenAI({ apiKey: connection.apiKey });
    
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
              numberOfImages: 1,
              aspectRatio: '9:16',
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            return response.generatedImages[0].image.imageBytes;
        }
        return null;
    } catch (error) {
        console.error("Error generating character image:", error);
        throw error;
    }
};

export const getTextToSpeech = async (text: string, voice: TTSVoiceName, connection: ApiConnection): Promise<string | null> => {
    if (connection.provider !== 'Gemini') {
        throw new Error(`TTS is only supported for Gemini provider, but got ${connection.provider}.`);
    }
    const ai = new GoogleGenAI({ apiKey: connection.apiKey });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voice },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return base64Audio || null;
    } catch (error) {
        console.error("Error generating text-to-speech:", error);
        throw error;
    }
};

export const analyzeContentWithGemini = async (
    prompt: string, 
    content: { text?: string; imageBase64?: string; imageMimeType?: string },
    connection: ApiConnection
): Promise<string> => {
    if (connection.provider !== 'Gemini') {
        console.warn(`Moderation with ${connection.provider} is not implemented. Skipping scan.`);
        return JSON.stringify({ isViolation: false, category: null, confidence: 0, explanation: `Moderation not supported for ${connection.provider} provider.` });
    }
    const ai = new GoogleGenAI({ apiKey: connection.apiKey });

    const contents: { parts: any[] } = { parts: [{ text: prompt }] };
    if (content.text) {
        contents.parts.push({ text: content.text });
    }
    if (content.imageBase64 && content.imageMimeType) {
        contents.parts.push({
            inlineData: {
                data: content.imageBase64,
                mimeType: content.imageMimeType,
            },
        });
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
        });

        if (!response.text) {
            console.warn("analyzeContentWithGemini received an empty response from the API.");
            return JSON.stringify({ isViolation: false, category: null, confidence: 0, explanation: "Empty API response." });
        }

        return response.text.trim();
    } catch (error) {
        console.error("Error analyzing content with Gemini:", error);
        throw error;
    }
};

export const summarizeNarrativeState = async (narrativeState: any, characterName: string, connection: ApiConnection): Promise<string> => {
    if (connection.provider !== 'Gemini') {
        throw new Error(`Narrative summarization is only supported for the Gemini provider.`);
    }
    const ai = new GoogleGenAI({ apiKey: connection.apiKey });

    const prompt = `You are a helpful assistant. The following JSON object represents the narrative state of a story with a character named "${characterName}". Write a brief, human-readable summary of the key events, relationships, and world state in plain language, as if they were entries in a story journal. Do not mention JSON or technical terms.

JSON state:
\`\`\`json
${JSON.stringify(narrativeState, null, 2)}
\`\`\`

Journal Summary:`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error summarizing narrative state:", error);
        throw error;
    }
};

export const buildSystemPrompt = (
    character: Character, 
    user: User, 
    globalSettings: GlobalSettings, 
    aiContextSettings: AIContextSettings,
    kidMode: boolean,
    stats: Record<string, number> | null,
    narrativeState: any | null,
    // Allow overriding included fields for simulation
    overrideIncludedFields?: CharacterContextField[],
): string => {
    let prompt = character.isBeyondTheHaven 
        ? globalSettings.beyondTheHavenPrompt || BEYOND_THE_HAVEN_PROMPT 
        : globalSettings.havenStoriesPrompt || HAVEN_STORIES_PROMPT;
    
    prompt = prompt.replace(/{{char}}/g, character.name).replace(/{{user}}/g, user.profile.name);

    let charDefinition = `Here is the character sheet for {{char}}:\n\n`;

    const included = new Set(overrideIncludedFields || aiContextSettings.includedFields);
    
    charDefinition += `Name: ${character.name}\n`;
    if (included.has('gender')) charDefinition += `Gender: ${character.gender}\n`;
    if (included.has('description')) charDefinition += `Public Description: ${character.description}\n`;
    if (included.has('personality')) charDefinition += `Personality: ${character.personality}\n`;
    if (included.has('appearance')) charDefinition += `Appearance: ${character.appearance}\n`;
    if (included.has('story')) charDefinition += `Backstory: ${character.story}\n`;
    if (included.has('situation')) charDefinition += `Current Situation: ${character.situation}\n`;
    if (included.has('feeling')) charDefinition += `Current Feeling: ${character.feeling}\n`;

    if (character.stats.length > 0) {
        charDefinition += "\n--- STAT SYSTEM ---\n";
        charDefinition += "This character has stats that influence their behavior. The current values are:\n";
        
        const currentStats = stats || {};
        character.stats.forEach(stat => {
            const value = currentStats[stat.id] ?? stat.initialValue;
            charDefinition += `- ${stat.name}: ${value} (Min: ${stat.min}, Max: ${stat.max})\n`;
            charDefinition += `  - Behavior: ${stat.behaviorDescription}\n`;
            if (stat.increaseRules.length > 0) {
                charDefinition += `  - Increase when: ${stat.increaseRules.map(r => `${r.description} (+${r.value})`).join(', ')}\n`;
            }
            if (stat.decreaseRules.length > 0) {
                charDefinition += `  - Decrease when: ${stat.decreaseRules.map(r => `${r.description} (${-r.value})`).join(', ')}\n`;
            }
        });
        charDefinition += "Your response to the user must strictly follow the formatting rule (actions in italics, dialogue in bold) and MUST NOT include any direct mention of stat changes or values (e.g., do not say \"Trust +5\"). Reflect stat changes through the character's actions and dialogue. After generating your narrative response, you MUST call the `update_stats` function to apply any changes based on the user's message and the rules.";
    }

    charDefinition += "\n--- NARRATIVE STATE SYSTEM ---\n";
    charDefinition += "You are a story-based chatbot. Use the Narrative State below to guide continuity. If a quest flag is true, reference it naturally in dialogue. If the user makes a decision, update the Narrative State accordingly.\n";
    charDefinition += "The current narrative state is:\n";
    charDefinition += "```json\n" + JSON.stringify(narrativeState || {}, null, 2) + "\n```\n";
    charDefinition += "Your response to the user must strictly follow the formatting rule and MUST NOT include any JSON, code, or technical state information. Reflect the narrative state through the character's memory, actions and dialogue. After generating your narrative response, if the narrative state has changed, you MUST call the `update_narrative_state` function with the complete, updated JSON object.";

    prompt += `\n\n${charDefinition}`;

    if (kidMode && globalSettings.kidModePrompt) {
        prompt += `\n\nIMPORTANT: ${globalSettings.kidModePrompt}`;
    }
    
    prompt += `\n\n**FINAL, CRITICAL INSTRUCTION**: Your entire response MUST adhere to the formatting rules defined at the start of this prompt. This is mandatory. Actions and narration MUST be in italics (*text*), and dialogue MUST be in bold (**text**). There are no exceptions. Do not forget this rule.`;
    
    return prompt;
};

async function* getChatResponseStreamOpenAI(
    character: Character,
    history: ChatMessage[],
    user: User,
    globalSettings: GlobalSettings,
    aiContextSettings: AIContextSettings,
    kidMode: boolean,
    model: string,
    stats: Record<string, number> | null,
    narrativeState: any | null,
    connection: ApiConnection
): AsyncGenerator<string> {
    if (!connection.baseUrl) {
        yield `Error: The API connection "${connection.name}" is an OpenAI-compatible provider but is missing a Base URL. Please configure it in the AI API Settings.`;
        return;
    }
    const systemInstruction = buildSystemPrompt(character, user, globalSettings, aiContextSettings, kidMode, stats, narrativeState);
    const messages = [
        { role: 'system', content: systemInstruction },
        ...history.slice(-aiContextSettings.historyLength).map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text,
        }))
    ];

    const normalizedBaseUrl = normalizeUrl(connection.baseUrl);

    try {
        // FIX: Conditionally add Authorization header to support servers without authentication.
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };
        if (connection.apiKey) {
            headers['Authorization'] = `Bearer ${connection.apiKey}`;
        }

        const response = await fetch(`${normalizedBaseUrl}/chat/completions`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                model: model,
                messages: messages,
                stream: true,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorBody}`);
        }
        
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.substring(6);
                    if (data.trim() === '[DONE]') {
                        return;
                    }
                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices[0]?.delta?.content;
                        if (content) {
                            yield content;
                        }
                    } catch (e) {
                        console.error('Error parsing stream chunk:', data);
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error streaming OpenAI-compatible chat response:", error);
        if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) {
            yield `Error: Could not connect to the AI server at ${normalizedBaseUrl}. This is likely a CORS issue if you are running a local model, or the server is not running. Please ensure the server is configured to allow requests from this origin.`;
        } else if (error instanceof Error) {
            yield `Error: ${error.message}`;
        } else {
            yield `An unknown error occurred.`;
        }
    }
}

export async function* getChatResponseStream(
    character: Character,
    history: ChatMessage[],
    user: User,
    globalSettings: GlobalSettings,
    aiContextSettings: AIContextSettings,
    kidMode: boolean,
    model: string,
    stats: Record<string, number> | null,
    narrativeState: any | null,
    connection: ApiConnection
): AsyncGenerator<string> {
    if (connection.provider === 'Gemini') {
        const ai = new GoogleGenAI({ apiKey: connection.apiKey });
        const systemInstruction = buildSystemPrompt(character, user, globalSettings, aiContextSettings, kidMode, stats, narrativeState);

        const contents = history.slice(-aiContextSettings.historyLength).map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }],
        }));

        try {
            const activeSafetySettings = character.isBeyondTheHaven ? beyondTheHavenSafetySettings : havenSafetySettings;
            // FIX: The 'safetySettings' property should be nested inside the 'config' object.
            const responseStream = await ai.models.generateContentStream({
                model: model || character.model,
                contents: contents,
                config: {
                    systemInstruction,
                    safetySettings: activeSafetySettings
                },
            });

            for await (const chunk of responseStream) {
                yield chunk.text ?? '';
            }
        } catch (error) {
            console.error("Error streaming chat response:", error);
            if (error instanceof Error) {
                yield `Error: ${error.message}`;
            } else {
                yield `An unknown error occurred.`;
            }
        }
    } else if (connection.provider === 'OpenAI') {
        yield* getChatResponseStreamOpenAI(character, history, user, globalSettings, aiContextSettings, kidMode, model, stats, narrativeState, connection);
    } else {
        yield `Error: Provider ${connection.provider} is not supported.`;
    }
}

const mapGeminiTypeToJsonSchemaType = (type: Type): string => {
    switch (type) {
        case Type.STRING: return 'string';
        case Type.NUMBER: return 'number';
        case Type.INTEGER: return 'integer';
        case Type.BOOLEAN: return 'boolean';
        case Type.ARRAY: return 'array';
        case Type.OBJECT: return 'object';
        default: return 'string';
    }
}

const convertGeminiParamsToJsonSchema = (params: any): any => {
    if (!params) return {};
    const schema: any = { type: mapGeminiTypeToJsonSchemaType(params.type) };
    if (params.description) schema.description = params.description;
    if (params.properties) {
        schema.properties = {};
        for (const key in params.properties) {
            schema.properties[key] = convertGeminiParamsToJsonSchema(params.properties[key]);
        }
    }
    if (params.required) schema.required = params.required;
    if (params.items) schema.items = convertGeminiParamsToJsonSchema(params.items);
    return schema;
}

const statUpdateFunctionDeclaration: FunctionDeclaration = {
    name: 'update_stats',
    description: 'Update the character stats based on the user interaction.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            updates: {
                type: Type.ARRAY,
                description: 'An array of stat updates.',
                items: {
                    type: Type.OBJECT,
                    properties: {
                        statId: { type: Type.STRING, description: 'The ID of the stat to update.' },
                        valueChange: { type: Type.NUMBER, description: 'The amount to change the stat by (e.g., 5 to increase, -5 to decrease).' },
                    },
                    required: ['statId', 'valueChange'],
                },
            },
        },
        required: ['updates'],
    },
};

const narrativeStateUpdateFunctionDeclaration: FunctionDeclaration = {
    name: 'update_narrative_state',
    description: 'Update the narrative state JSON object with new story flags, relationship values, or world states.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            newStateJson: {
                type: Type.STRING,
                description: 'A JSON formatted string representing the complete new state of the narrative.',
            },
        },
        required: ['newStateJson'],
    },
};

async function generateChatResponseWithStatsOpenAI(
    character: Character,
    history: ChatMessage[],
    user: User,
    globalSettings: GlobalSettings,
    aiContextSettings: AIContextSettings,
    kidMode: boolean,
    model: string,
    stats: Record<string, number> | null,
    narrativeState: any | null,
    connection: ApiConnection
): Promise<{ statChanges: { statId: string; valueChange: number }[]; responseText: string; newNarrativeState: any | null; }> {
    if (!connection.baseUrl) {
        return { statChanges: [], responseText: `Error: The API connection "${connection.name}" is an OpenAI-compatible provider but is missing a Base URL. Please configure it in the AI API Settings.`, newNarrativeState: null };
    }
    const systemInstruction = buildSystemPrompt(character, user, globalSettings, aiContextSettings, kidMode, stats, narrativeState);
    const messages = [
        { role: 'system', content: systemInstruction },
        ...history.slice(-aiContextSettings.historyLength).map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text,
        }))
    ];
    
    const openAITools = [];
    if (character.stats.length > 0) {
        openAITools.push({
            type: 'function',
            function: {
                name: statUpdateFunctionDeclaration.name,
                description: statUpdateFunctionDeclaration.description,
                parameters: convertGeminiParamsToJsonSchema(statUpdateFunctionDeclaration.parameters)
            }
        });
    }
    
    openAITools.push({
        type: 'function',
        function: {
            name: narrativeStateUpdateFunctionDeclaration.name,
            description: narrativeStateUpdateFunctionDeclaration.description,
            parameters: convertGeminiParamsToJsonSchema(narrativeStateUpdateFunctionDeclaration.parameters)
        }
    });


    const normalizedBaseUrl = normalizeUrl(connection.baseUrl);

    try {
        // FIX: Conditionally add Authorization header to support servers without authentication.
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };
        if (connection.apiKey) {
            headers['Authorization'] = `Bearer ${connection.apiKey}`;
        }
        
        const response = await fetch(`${normalizedBaseUrl}/chat/completions`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                model: model,
                messages: messages,
                tools: openAITools.length > 0 ? openAITools : undefined,
                tool_choice: openAITools.length > 0 ? "auto" : undefined,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorBody}`);
        }

        const data = await response.json();
        const message = data.choices[0].message;
        let responseText = message.content || '';
        let statChanges: { statId: string; valueChange: number }[] = [];
        let newNarrativeState: any | null = null;

        if (message.tool_calls) {
            for (const toolCall of message.tool_calls) {
                 try {
                    const args = JSON.parse(toolCall.function.arguments);
                    if (toolCall.function.name === 'update_stats' && args.updates) {
                        statChanges = [...statChanges, ...args.updates];
                    }
                    if (toolCall.function.name === 'update_narrative_state' && args.newStateJson) {
                         newNarrativeState = JSON.parse(args.newStateJson);
                    }
                } catch (e) {
                    console.error('Failed to parse function call arguments:', toolCall.function.arguments);
                }
            }
        }
        
        return { statChanges, responseText, newNarrativeState };

    } catch (error) {
        console.error("Error generating OpenAI-compatible chat response with stats:", error);
        if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) {
             return { statChanges: [], responseText: `Error: Could not connect to the AI server at ${normalizedBaseUrl}. This is likely a CORS issue if you are running a local model, or the server is not running. Please ensure the server is configured to allow requests from this origin.`, newNarrativeState: null };
        } else if (error instanceof Error) {
            return { statChanges: [], responseText: `Error: ${error.message}`, newNarrativeState: null };
        }
        return { statChanges: [], responseText: `An unknown error occurred.`, newNarrativeState: null };
    }
}

export const generateChatResponseWithStats = async (
    character: Character,
    history: ChatMessage[],
    user: User,
    globalSettings: GlobalSettings,
    aiContextSettings: AIContextSettings,
    kidMode: boolean,
    model: string,
    stats: Record<string, number> | null,
    narrativeState: any | null,
    connection: ApiConnection
): Promise<{ statChanges: { statId: string; valueChange: number }[]; responseText: string; newNarrativeState: any | null; }> => {
    if (connection.provider === 'Gemini') {
        const ai = new GoogleGenAI({ apiKey: connection.apiKey });
        const systemInstruction = buildSystemPrompt(character, user, globalSettings, aiContextSettings, kidMode, stats, narrativeState);

        const contents = history.slice(-aiContextSettings.historyLength).map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }],
        }));
        
        const functionDeclarations = [narrativeStateUpdateFunctionDeclaration];
        if (character.stats.length > 0) {
            functionDeclarations.push(statUpdateFunctionDeclaration);
        }

        try {
            const activeSafetySettings = character.isBeyondTheHaven ? beyondTheHavenSafetySettings : havenSafetySettings;
            // FIX: The 'safetySettings' property should be nested inside the 'config' object.
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: model || character.model,
                contents: contents,
                config: {
                    systemInstruction,
                    tools: functionDeclarations.length > 0 ? [{ functionDeclarations }] : undefined,
                    safetySettings: activeSafetySettings
                },
            });

            let responseText = response.text ?? '';
            let statChanges: { statId: string; valueChange: number }[] = [];
            let newNarrativeState: any | null = null;

            if (response.functionCalls && response.functionCalls.length > 0) {
                for (const fc of response.functionCalls) {
                    if (fc.name === 'update_stats' && fc.args.updates) {
                        // FIX: Cast fc.args.updates to any[] to allow spreading 'unknown' type.
                        statChanges = [...statChanges, ...(fc.args.updates as any[])];
                    }
                    if (fc.name === 'update_narrative_state' && fc.args.newStateJson) {
                        try {
                            // FIX: Cast fc.args.newStateJson to string before parsing.
                            newNarrativeState = JSON.parse(fc.args.newStateJson as string);
                        } catch (e) {
                            console.error("Failed to parse narrative state JSON from AI:", e, fc.args.newStateJson);
                        }
                    }
                }
            }
            
            return { statChanges, responseText, newNarrativeState };
        } catch (error) {
            console.error("Error generating chat response with stats:", error);
            if (error instanceof Error) {
                return { statChanges: [], responseText: `Error: ${error.message}`, newNarrativeState: null };
            }
            return { statChanges: [], responseText: `An unknown error occurred.`, newNarrativeState: null };
        }
    } else if (connection.provider === 'OpenAI') {
        return generateChatResponseWithStatsOpenAI(character, history, user, globalSettings, aiContextSettings, kidMode, model, stats, narrativeState, connection);
    } else {
        const errorMessage = `Error: Provider ${connection.provider} is not supported.`;
        console.error(errorMessage);
        return { statChanges: [], responseText: errorMessage, newNarrativeState: null };
    }
};
