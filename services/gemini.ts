import type { EmailSummary } from "../types";

// Gemini is temporarily disabled - returning mock data
const GEMINI_DISABLED = true;

export const generateEmailSummaries = async (): Promise<EmailSummary[]> => {
  if (GEMINI_DISABLED) {
    console.log("Gemini disabled - returning empty array");
    return [];
  }
  return [];
};

export const askAssistant = async (query: string, context: string): Promise<string> => {
  if (GEMINI_DISABLED) {
    return "AI assistant temporarily unavailable.";
  }
  return "AI assistant temporarily unavailable.";
};

export const generateSocialPost = async (topic: string): Promise<string> => {
  if (GEMINI_DISABLED) {
    return "Social post generator temporarily unavailable.";
  }
  return "Social post generator temporarily unavailable.";
};

export const generateReviewEmail = async (clientEmail: string): Promise<string> => {
  if (GEMINI_DISABLED) {
    return "Review email generator temporarily unavailable.";
  }
  return "Review email generator temporarily unavailable.";
};
