
import { GoogleGenAI, Type } from "@google/genai";
import type { EmailSummary } from "../types";

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please configure it via the Diagnostic Console or environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateEmailSummaries = async (): Promise<EmailSummary[]> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Analyze recent business emails and provide 3 realistic mock summaries for an auto shop dashboard. Focus on Eric Wilson's business style.",
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
              category: { 
                type: Type.STRING,
                description: 'Must be one of: URGENT, CUSTOMER, PARTS, ADMIN'
              },
              timestamp: { type: Type.STRING }
            },
            required: ["id", "sender", "subject", "summary", "category", "timestamp"]
          }
        }
      }
    });
    
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Error generating email summaries:", error);
    return [];
  }
};

export const askAssistant = async (query: string, context: string): Promise<string> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Context from logs:\n${context}\n\nUser Question: ${query}`,
      config: {
        systemInstruction: "You are a technical assistant for Eric Wilson's AI infrastructure. Provide precise, actionable responses based on the provided logs.",
      }
    });
    return response.text || "Assistant returned no data.";
  } catch (error) {
    console.error("Assistant query failed:", error);
    return "Connection error to AI node.";
  }
};

export const generateSocialPost = async (topic: string): Promise<string> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Create a professional social post for an auto shop regarding: ${topic}.`,
      config: {
        systemInstruction: "You are an expert social media manager.",
      }
    });
    return response.text || "Failed to generate content.";
  } catch (error) {
    return "Generation node error.";
  }
};

export const generateReviewEmail = async (clientName: string, clientEmail: string): Promise<string> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Draft a professional review request for a client named ${clientName} (${clientEmail}).`,
      config: {
        systemInstruction: `You are a professional customer experience manager for Eric Wilson's high-end auto shop. 
        Draft an email that:
        1. Sincerely thanks the client for their business.
        2. Encourages them to leave a Google review if they had a 5-star experience (using a placeholder [REVIEW_LINK]).
        3. Explicitly states that if for any reason the service wasn't perfect, they should contact us directly via email or phone first so we can make it right immediately.
        4. Tone: High-end, professional, sincere, and customer-obsessed.`,
      }
    });
    return response.text || "Failed to draft email.";
  } catch (error) {
    return "Drafting node error.";
  }
};
