import { GoogleGenAI } from "@google/genai";

export const resumeExtractionModel = "gemini-2.5-flash";

export function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  return new GoogleGenAI({ apiKey });
}
