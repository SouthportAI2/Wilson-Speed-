import { GoogleGenAI, Type } from "@google/genai";
import type { EmailSummary } from "../types";

/**
 * Fix: Removed global aiInstance cache to ensure new instances are created with the latest API key
 * as per security and session guidelines for environments that support key selection.
 */
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("CRITICAL_ERROR: process.env.API_KEY is undefined. AI Services cannot initialize.");
  }
  // Create a new instance right before making an API call to ensure it always uses 
  // the most up-to-date API key from the environment.
  return new GoogleGenAI({ apiKey });
};

export const generateEmailSummaries = async (): Promise<EmailSummary[]> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Analyze recent business emails and provide 3 realistic mock summaries for an auto shop dashboard. The emails should be relevant to Eric Wilson's business operations.",
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
            propertyOrdering: ["id", "sender", "subject", "summary", "category", "timestamp"],
          }
        }
      }
    });
    
    // Fix: Using response.text property (not a method) as per SDK guidelines.
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
        systemInstruction: "You are a technical assistant for Eric Wilson's AI infrastructure. Provide precise, actionable responses.",
      }
    });
    
    // Fix: Accessing text property directly.
    return response.text || "Query returned no data.";
  } catch (error) {
    console.error("Error with AI assistant:", error);
    return "Connection error to AI.";
  }
};

export const generateSocialPost = async (topic: string): Promise<string> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Draft a professional social media post about: ${topic}. Include relevant emojis and hashtags.`,
      config: {
        systemInstruction: "You are a social media manager for an auto shop. Create engaging and professional content.",
      }
    });
    
    // Fix: Accessing text property directly.
    return response.text || "Failed to generate post.";
  } catch (error) {
    console.error("Error generating social post:", error);
    return "Generation failed.";
  }
};

export const generateReviewEmail = async (clientEmail: string): Promise<string> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Draft a friendly, professional review request email for: ${clientEmail}. Keep it brief.`,
      config: {
        systemInstruction: "You are a customer relationship manager. Write a concise email asking for a Google review.",
      }
    });
    
    // Fix: Accessing text property directly.
    return response.text || "Failed to generate email.";
  } catch (error) {
    console.error("Error generating review email:", error);
    return "Drafting failed.";
  }
};
