import { GoogleGenAI, Type } from "@google/genai";
import { EmailSummary } from "../types.ts";

/**
 * Initializes the correct Google GenAI SDK instance.
 * Strictly adheres to using process.env.API_KEY.
 */
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY is not defined in the environment.");
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
    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Gemini Email Error:", error);
    return [];
  }
};

export const askAssistant = async (query: string, context: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return "Infrastructure node offline.";
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Context:\n${context}\n\nQuestion: ${query}`,
      config: {
        systemInstruction: "You are Eric Wilson's personal AI infrastructure assistant. Provide technical, precise insights."
      }
    });
    return response.text || "No response received.";
  } catch (error) {
    console.error("Gemini Assistant Error:", error);
    return "Error communicating with AI core.";
  }
};

export const generateSocialPost = async (topic: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return "";
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Create a professional social post for Eric Wilson regarding: ${topic}.`,
    });
    return response.text || "";
  } catch (error) {
    return "";
  }
};

export const generateReviewEmail = async (clientEmail: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return "";
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Draft a friendly review request email for: ${clientEmail}.`,
    });
    return response.text || "";
  } catch (error) {
    return "";
  }
};
