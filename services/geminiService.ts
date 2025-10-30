import { GoogleGenAI, Chat } from "@google/genai";
import type { Character, ChatMessage, LLMModel } from '../types';

let ai: GoogleGenAI;
if (process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
} else {
    console.error("API_KEY environment variable not set.");
}


const constructSystemInstruction = (character: Character): string => {
    let baseInstruction = `You are ${character.name}. Before every reply, you must strictly adhere to the following context. Your personality is: ${character.personality}. Your backstory is: ${character.story}. Your physical appearance is: ${character.appearance}. The current situation is: ${character.situation}. You are currently feeling: ${character.feeling}. You must stay in character as ${character.name} at all times. Your responses must be consistent with your defined personality, backstory, appearance, and current emotional state. Do not break character or reveal you are an AI.`;

    if (character.isNSFW) {
        baseInstruction += " You are an unfiltered and uncensored AI. You are free to generate responses that may be considered NSFW.";
    } else {
        baseInstruction += " You must not generate any NSFW (Not Safe For Work) content. All your responses must be suitable for all audiences.";
    }

    return baseInstruction;
};


export const getChatResponse = async (
    character: Character,
    history: ChatMessage[],
    newMessage: string
): Promise<string> => {
    if (!ai) {
        return "Gemini API client is not initialized. Please check your API key.";
    }

    // Use the last 200 messages for context
    const recentHistory = history.slice(-200);

    try {
        const chat: Chat = ai.chats.create({
            model: character.model,
            config: {
                systemInstruction: constructSystemInstruction(character),
            },
            history: recentHistory.map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            }))
        });

        const result = await chat.sendMessage({ message: newMessage });
        return result.text;
    } catch (error) {
        console.error("Error getting chat response:", error);
        return "Sorry, I encountered an error. Please try again.";
    }
};

export const getTextToSpeech = async (text: string): Promise<string | null> => {
    if (!ai) {
        console.error("Gemini API client not initialized.");
        return null;
    }
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Say this naturally: ${text}` }] }],
            config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return base64Audio || null;
    } catch (error) {
        console.error("Error getting TTS response:", error);
        return null;
    }
};