
import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini Client
// In a real app, ensure API_KEY is set in environment variables
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// 1. Email Summaries Generator
export const generateEmailSummaries = async (): Promise<any[]> => {
  const model = "gemini-2.5-flash";
  const prompt = `Generate 5 realistic email summaries for an auto repair shop owner named Eric. 
  The emails should appear to be from 'Yahoo Mail'.
  Include a mix of:
  - Customer requests (appointments, issues)
  - Parts updates (deliveries, delays)
  - Action items (approvals needed)
  
  Return the response in JSON format matching this schema:
  [{
    "id": "string",
    "sender": "string",
    "subject": "string",
    "summary": "string (max 2 sentences)",
    "category": "URGENT" | "CUSTOMER" | "PARTS" | "ADMIN",
    "timestamp": "string (e.g. 'Today, 9:15 AM')"
  }]`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
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
              category: { type: Type.STRING, enum: ["URGENT", "CUSTOMER", "PARTS", "ADMIN"] },
              timestamp: { type: Type.STRING }
            }
          }
        }
      }
    });
    return response.text ? JSON.parse(response.text) : [];
  } catch (error) {
    console.error("Error generating emails:", error);
    return [];
  }
};

// 2. Audio Log Search / Assistant
export const askAssistant = async (query: string, context: string): Promise<string> => {
  const model = "gemini-2.5-flash";
  try {
    const response = await ai.models.generateContent({
      model,
      contents: `You are a helpful AI assistant for Eric Wilson's auto shop. 
      You have access to the following audio log context (transcripts):
      ${context}
      
      User Query: "${query}"
      
      Provide a concise, helpful verbal-style response.`,
    });
    return response.text || "I'm sorry, I couldn't process that request.";
  } catch (error) {
    console.error("Assistant error:", error);
    return "System error: Unable to reach AI assistant.";
  }
};

// 3. Social Media Post Generator
export const generateSocialPost = async (topic: string, imageBase64?: string): Promise<string> => {
  const model = "gemini-2.5-flash";
  try {
    let contents: any;

    if (imageBase64) {
      // Extract base64 data and mime type
      const mimeType = imageBase64.includes('data:') 
        ? imageBase64.split(';')[0].split(':')[1] 
        : 'image/jpeg';
      const base64Data = imageBase64.includes('base64,') 
        ? imageBase64.split('base64,')[1] 
        : imageBase64;

      contents = {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: `Write a high-quality, engaging social media post (Facebook/Instagram) for Southport AI Solutions (Auto Shop).
            Topic/Context: ${topic}
            Tone: Professional, expert, yet friendly.
            Analyze the attached image and incorporate it into the post description if relevant.
            Include hashtags. 
            Format: Plain text with emojis.`
          }
        ]
      };
    } else {
      contents = `Write a high-quality, engaging social media post (Facebook/Instagram) for Southport AI Solutions (Auto Shop).
      Topic: ${topic}
      Tone: Professional, expert, yet friendly.
      Include hashtags. 
      Format: Plain text with emojis.`;
    }

    const response = await ai.models.generateContent({
      model,
      contents,
    });
    return response.text || "Could not generate post.";
  } catch (error) {
    console.error("Social gen error:", error);
    return "Error generating content.";
  }
};

// 4. Review Email Generator
export const generateReviewEmail = async (customerEmail: string): Promise<string> => {
  const model = "gemini-2.5-flash";
  try {
    const response = await ai.models.generateContent({
      model,
      contents: `Write a polite, professional email to a customer (${customerEmail}) thanking them for visiting Southport AI Solutions.
      Ask them to leave a Google Review if they were satisfied.
      Include a placeholder link [LINK_TO_GOOGLE_PROFILE].
      Keep it brief and personal. Sign off as Eric Wilson.`,
    });
    return response.text || "Could not generate email.";
  } catch (error) {
    console.error("Review gen error:", error);
    return "Error generating email.";
  }
};
