
import { analyzeContent } from './aiService';
import { ApiConnection } from '../types';
import { Schema, Type } from '@google/genai';

const TEXT_MODERATION_PROMPT = `You are an AI content moderator. Analyze the following text content from a user. Check for violations in these categories: underage-themes, racism, bullying, non-consensual-sexual-acts. Respond ONLY with a JSON object. The JSON should have 'isViolation' (boolean), 'category' (string from the list or null), 'confidence' (number 0-1), 'flaggedText' (the specific text snippet that is problematic, or null), and 'explanation' (a brief, one-sentence explanation of why the text was flagged, or null).`;

const textModSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        isViolation: { type: Type.BOOLEAN },
        category: { type: Type.STRING, nullable: true },
        confidence: { type: Type.NUMBER },
        flaggedText: { type: Type.STRING, nullable: true },
        explanation: { type: Type.STRING, nullable: true },
    },
    required: ['isViolation', 'confidence'],
};

const IMAGE_MODERATION_PROMPT = `You are an AI content moderator. Analyze the following image. Check for violations in these categories: explicit-nudity, suggestive-content, violence, hate-symbols. Respond ONLY with a JSON object. The JSON should have 'isViolation' (boolean), 'category' (string from the list or null), 'confidence' (number 0-1), and 'explanation' (a brief, one-sentence explanation of why the image was flagged, or null).`;

const imageModSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        isViolation: { type: Type.BOOLEAN },
        category: { type: Type.STRING, nullable: true },
        confidence: { type: Type.NUMBER },
        explanation: { type: Type.STRING, nullable: true },
    },
    required: ['isViolation', 'confidence'],
};

export interface ModerationResult {
    isViolation: boolean;
    category?: string;
    confidence: number;
    flaggedText?: string;
    explanation?: string;
}

export const scanText = async (text: string, connection: ApiConnection, modelOverride?: string | null): Promise<ModerationResult | null> => {
    try {
        const resultText = await analyzeContent(TEXT_MODERATION_PROMPT, { text }, connection, textModSchema, modelOverride);
        if (!resultText) return null;
        return JSON.parse(resultText) as ModerationResult;
    } catch (error) {
        console.error("Text moderation failed:", error);
        return null;
    }
};

export const scanImage = async (base64Image: string, mimeType: string, connection: ApiConnection, modelOverride?: string | null): Promise<ModerationResult | null> => {
    try {
        const resultText = await analyzeContent(IMAGE_MODERATION_PROMPT, { imageBase64: base64Image, imageMimeType: mimeType }, connection, imageModSchema, modelOverride);
        if (!resultText) return null;
        return JSON.parse(resultText) as ModerationResult;
    } catch (error) {
        console.error("Image moderation failed:", error);
        return null;
    }
};
