import { GoogleGenerativeAI } from "@google/generative-ai";
import type { EmailSummary } from "../types";

const getAI = () => {
  try {
    const key = import.meta.env.VITE_GEMINI_API_KEY;
    if (!key || key.trim() === '') {
      console.warn("Gemini API Key is not defined in environment.");
      return null;
    }
    return new GoogleGenerativeAI(key);
  } catch (error) {
    console.error("Critical error initializing Gemini:", error);
    return null;
  }
};

export const generateEmailSummaries = async (): Promise<EmailSummary[]> => {
  const ai = getAI();
  if (!ai) return [];
  try {
    const model = ai.getGenerativeModel({ model: "gemini-pro" });
    const prompt = "Analyze recent business emails and provide 3 realistic mock summaries for an auto shop dashboard. Return as JSON array with id, sender, subject, summary, category (URGENT/CUSTOMER/PARTS/ADMIN), and timestamp fields.";
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text ? JSON.parse(text) : [];
  } catch (error) {
    console.error("Error generating email summaries:", error);
    return [];
  }
};

export const askAssistant = async (query: string, context: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return "AI assistant unavailable. Check API credentials.";
  try {
    const model = ai.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Context from logs:\n${context}\n\nUser Question: ${query}\n\nProvide a technical, precise, and actionable response.`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text() || "Query returned no data.";
  } catch (error) {
    console.error("Error with AI assistant:", error);
    return "Connection error to AI.";
  }
};

export const generateSocialPost = async (topic: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return "Social post generator offline.";
  try {
    const model = ai.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Draft a professional social media post about: ${topic}. Include relevant emojis and hashtags.`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text() || "Failed to generate post.";
  } catch (error) {
    console.error("Error generating social post:", error);
    return "Generation failed.";
  }
};

export const generateReviewEmail = async (clientEmail: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return "Review email generator offline.";
  try {
    const model = ai.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Draft a friendly, professional review request email for: ${clientEmail}. Keep it brief.`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text() || "Failed to generate email.";
  } catch (error) {
    console.error("Error generating review email:", error);
    return "Drafting failed.";
  }
};
