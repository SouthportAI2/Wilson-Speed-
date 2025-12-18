
import { GoogleGenAI, Type } from "@google/genai";
import { EmailSummary } from "../types";

/**
 * The API key is sourced from process.env.API_KEY as per the system instructions.
 * If Vite is used, this is typically injected via the define config.
 */
const getAI = () => {
  // Use a fallback to check if the key is effectively provided before instantiating.
  // This prevents the SDK from throwing a top-level Error that crashes the React mount.
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === '') {
    console.error("Gemini API Key is missing. Please ensure process.env.API_KEY is configured.");
    return null;
  }
  
  return new GoogleGenAI({ apiKey });
};

export const generateEmailSummaries = async (): Promise<EmailSummary[]> => {
  const ai = getAI();
  if (!ai) return [];
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Analyze recent business emails and provide 3 realistic mock summaries for a car shop infrastructure dashboard. Return JSON.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              sender: { type: Type.STRING },
              subject: { type: Type.STRING },
              summary: { type: Type.STRING },
              category: { type: Type.STRING, enum: ['URGENT', 'CUSTOMER', 'PARTS', 'ADMIN'] },
              timestamp: { type: Type.STRING }
            },
            required: ['id', 'sender', 'subject', 'summary', 'category', 'timestamp']
          }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Gemini Error in generateEmailSummaries:", error);
    return [];
  }
};

export const askAssistant = async (query: string, context: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return "AI Configuration Error: Missing API Key.";
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Context from logs: ${context}\n\nUser Question: ${query}`,
      config: {
        systemInstruction: "You are Eric Wilson's AI assistant. Answer questions based on the provided shop audio logs."
      }
    });
    return response.text || "I'm sorry, I couldn't process that request.";
  } catch (error) {
    console.error("Gemini Error in askAssistant:", error);
    return "Error connecting to AI core.";
  }
};

export const generateSocialPost = async (topic: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return "AI Configuration Error: Missing API Key.";
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Create a professional social media post for an auto shop about: ${topic}. Include hashtags and a call to action.`,
    });
    return response.text || "";
  } catch (error) {
    console.error("Gemini Error in generateSocialPost:", error);
    return "Generation failed.";
  }
};

export const generateReviewEmail = async (clientEmail: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return "AI Configuration Error: Missing API Key.";
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Write a short, friendly, high-conversion email asking for a Google Review. Client: ${clientEmail}`,
    });
    return response.text || "";
  } catch (error) {
    console.error("Gemini Error in generateReviewEmail:", error);
    return "Drafting failed.";
  }
};
