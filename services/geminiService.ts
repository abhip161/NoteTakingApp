import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  summarizeNote: async (text: string): Promise<string> => {
    try {
      if (!text || text.length < 10) {
        return "Not enough content to summarize.";
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Please provide a concise summary of the following note. Use bullet points if there are multiple key concepts. Return only the summary. \n\n Note Content: ${text}`,
        config: {
          thinkingConfig: { thinkingBudget: 0 }, // Minimize latency for simple summarization
          temperature: 0.3, // Lower temperature for more factual summaries
        },
      });

      return response.text || "Could not generate summary.";
    } catch (error) {
      console.error("Error summarizing note:", error);
      return "Error connecting to AI service. Please check your API key or connection.";
    }
  },
};
