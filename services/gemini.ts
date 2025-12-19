import { GoogleGenerativeAI } from "@google/generative-ai";
import type { EmailSummary } from "../types";

/**
 * Safely initializes the Gemini AI client for browser environment.
 */
const getAI = () => {
  try {
    // Use Vite's import.meta.env for browser environment
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

/**
 * Generates structured summaries of emails.
 */
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

/**
 * Answers questions based on provided logs.
 */
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

/**
 * Generates social media posts.
 */
export const generateSocialPost = async (topic: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return "Social post generator offline.";
  
  try {
    const model = ai.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Draft a professional social media post about: ${t
