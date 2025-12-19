
import { GoogleGenAI, Type } from "@google/genai";
import { EmailSummary } from "../types.ts";

/**
 * Safely initializes the GoogleGenAI client.
 * Uses a try-catch and checks for the existence of the API key string.
 */
const getAI = () => {
  try {
    const key = typeof process !== 'undefined' ? process.env.API_KEY : undefined;
    if (!key) {
      console.warn("Gemini API Key is not defined in environment.");
      return null;
    }
    return new GoogleGenAI({ apiKey: key });
  } catch (error) {
    console.error("Critical error initializing Gemini Node:", error);
    return null;
  }
};

/**
 * Generates structured summaries of emails.
 */
export const generateEmailSummaries = async (): Promise<EmailSummary[]> => {
  const ai = getAI();
  if (!ai) return [];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Analyze recent business emails and provide 3 realistic mock summaries for an auto shop infrastructure dashboard. Return JSON.",
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
    
    const text = response.text;
    return text ? JSON.parse(text) : [];
  } catch (error) {
    console.error("Infrastructure Node Error [Email Summaries]:", error);
    return [];
  }
};

/**
 * Answers questions based on provided logs.
 */
export const askAssistant = async (query: string, context: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return "Infrastructure core unavailable. Check API credentials.";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Context from logs:\n${context}\n\nUser Question: ${query}`,
      config: {
        systemInstruction: "You are Eric Wilson's personal AI infrastructure assistant. Provide technical, precise, and actionable insights."
      }
    });
    return response.text || "Query returned no data from core.";
  } catch (error) {
    console.error("Infrastructure Node Error [Assistant]:", error);
    return "Connection error to AI mesh node.";
  }
};

/**
 * Generates engagement-ready social media copy.
 */
export const generateSocialPost = async (topic: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return "Social distribution node offline.";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Draft a professional social post for Eric Wilson regarding: ${topic}. Include emojis and hashtags.`,
    });
    return response.text || "Failed to generate copy.";
  } catch (error) {
    console.error("Infrastructure Node Error [Social]:", error);
    return "Generation cycle interrupted.";
  }
};

/**
 * Drafts review request emails.
 */
export const generateReviewEmail = async (clientEmail: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return "Review outreach node offline.";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Draft a professional review request for: ${clientEmail}. Keep it brief and friendly.`,
    });
    return response.text || "Failed to generate draft.";
  } catch (error) {
    console.error("Infrastructure Node Error [Reviews]:", error);
    return "Drafting cycle interrupted.";
  }
};
