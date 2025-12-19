import { GoogleGenAI, Type } from "@google/genai";
import { EmailSummary } from "../types.ts";

/**
 * Initializes the correct Google GenAI SDK instance.
 * Strictly adheres to using process.env.API_KEY.
 */
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is not defined in the environment.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Generates structured email summaries using Gemini 3 Flash.
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
    return text ? JSON.parse(text) : [];
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
        systemInstruction: "You are Eric Wilson's personal AI infrastructure assistant. Your tone is technical, efficient, and precise."
      }
    });
    return response.text || "Query returned no data from core.";
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
      contents: `Create a professional social media post for Eric Wilson's business regarding: ${topic}. Include relevant emojis and hashtags.`,
    });
    return response.text || "Failed to generate post.";
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
      contents: `Draft a friendly email requesting a Google Review for Eric Wilson's business. Recipient: ${clientEmail}.`,
    });
    return response.text || "Failed to generate email.";
  } catch (error) {
    console.error("Infrastructure AI Node Error [Reviews]:", error);
    return "Review drafting cycle failed.";
  }
};
