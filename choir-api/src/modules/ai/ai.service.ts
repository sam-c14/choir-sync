import { GoogleGenAI } from '@google/genai';
import { logger } from '../../lib/logger';

// Requires GEMINI_API_KEY in environment
const ai = new GoogleGenAI({});

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export class AiService {
  async generateChatResponse(messages: ChatMessage[], newMessage: string, userName: string) {
    try {
      const systemInstruction = `You are the ChoirSync Copilot, a friendly, encouraging AI assistant built into a choir management app. Your job is to help choristers and directors with music theory, vocal warmups, harmonizing tips, and general choir advice. Keep answers concise, mobile-friendly, and formatted nicely. The user you are talking to is named ${userName}.`;

      // Map history to the format expected by the SDK
      const contents = messages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      }));
      
      // Append the new message
      contents.push({
        role: 'user',
        parts: [{ text: newMessage }]
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });

      return response.text;
    } catch (error) {
      logger.error('Gemini API Error:', error);
      throw new Error('Failed to generate AI response');
    }
  }
}

export const aiService = new AiService();
