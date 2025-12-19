import { GoogleGenAI, Type } from "@google/genai";
import { EmailSummary } from "../types.ts";

/**
 * Creates a new instance of the GoogleGenAI client using the environment's API key.
 * This ensures the client is always initialized with current credentials.
 */
const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Generates structured summaries of emails using Gemini 3 Flash.
 */
export const generateEmailSummaries = async (): Promise<EmailSummary[]> => {
  const ai = getAI();
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
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Infrastructure AI Node Error [Email]:", error);
    return [];
  }
};

/**
 * Answers questions based on provided logs using Gemini 3 Pro for higher reasoning.
 */
export const askAssistant = async (query: string, context: string): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Context from infrastructure logs:\n${context}\n\nUser Question: ${query}`,
      config: {
        systemInstruction: "You are Eric Wilson's personal AI infrastructure assistant. Your tone is technical, efficient, and precise. Provide actionable insights from the logs."
      }
    });
    return response.text || "No response received from core.";
  } catch (error) {
    console.error("Infrastructure AI Node Error [Assistant]:", error);
    return "Error connecting to AI infrastructure node.";
  }
};

/**
 * Generates social media copy using Gemini 3 Flash.
 */
export const generateSocialPost = async (topic: string): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Create a professional social media post for Eric Wilson's business regarding: ${topic}. Include relevant emojis, hashtags, and a strong call to action for high engagement.`,
    });
    return response.text || "";
  } catch (error) {
    console.error("Infrastructure AI Node Error [Social]:", error);
    return "Social generation cycle failed.";
  }
};

/**
 * Drafts a personalized review request email.
 */
export const generateReviewEmail = async (clientEmail: string): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Draft a high-conversion, professional yet friendly email requesting a Google Review for Eric Wilson's business. Target recipient: ${clientEmail}. Keep it concise and emphasize how much their feedback matters.`,
    });
    return response.text || "";
  } catch (error) {
    console.error("Infrastructure AI Node Error [Reviews]:", error);
    return "Review drafting cycle failed.";
  }
};
