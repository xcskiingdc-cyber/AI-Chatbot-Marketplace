


import { analyzeContentWithGemini } from './aiService';
import { fileToBase64 } from '../utils/imageUtils';
import { ApiConnection } from '../types';

const TEXT_MODERATION_PROMPT = `You are an AI content moderator. Analyze the following text content from a user. Check for violations in these categories: underage-themes, racism, bullying, non-consensual-sexual-acts. Respond ONLY with a JSON object. The JSON should have 'isViolation' (boolean), 'category' (string from the list or null), 'confidence' (number 0-1), 'flaggedText' (the specific text snippet that is problematic, or null), and 'explanation' (a brief, one-sentence explanation of why the text was flagged, or null).`;

const IMAGE_MODERATION_PROMPT = `You are an AI content moderator. Analyze the following image. Check for violations in these categories: explicit-nudity, suggestive-content, violence, hate-symbols. Respond ONLY with a JSON object. The JSON should have 'isViolation' (boolean), 'category' (string from the list or null), 'confidence' (number 0-1), and 'explanation' (a brief, one-sentence explanation of why the image was flagged, or null).`;

interface ModerationResult {
    isViolation: boolean;
    category: string | null;
    confidence: number;
    flaggedText?: string | null;
    explanation?: string | null;
}

export const scanText = async (text: string, activeConnection: ApiConnection): Promise<ModerationResult | null> => {
    if (!text.trim()) return null;

    try {
        const resultJson = await analyzeContentWithGemini(TEXT_MODERATION_PROMPT, { text }, activeConnection);
        const result = JSON.parse(resultJson);
        return result.isViolation ? result : null;
    } catch (error) {
        console.error("Failed to moderate text:", error);
        return null;
    }
};

export const scanImage = async (imageBlob: Blob, activeConnection: ApiConnection): Promise<ModerationResult | null> => {
    try {
        // FIX: Convert Blob to File to satisfy the `fileToBase64` function signature.
        const imageFile = new File([imageBlob], 'image.png', { type: imageBlob.type });
        const base64DataUrl = await fileToBase64(imageFile);
        const base64String = base64DataUrl.split(',')[1];
        
        const resultJson = await analyzeContentWithGemini(IMAGE_MODERATION_PROMPT, { 
            imageBase64: base64String, 
            imageMimeType: imageBlob.type 
        }, activeConnection);
        const result = JSON.parse(resultJson);
        return result.isViolation ? result : null;
    } catch (error) {
        console.error("Failed to moderate image:", error);
        return null;
    }
};