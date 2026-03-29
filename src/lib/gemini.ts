import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

// Wykorzystujemy najnowszy model 2.5-flash-lite zgodnie z dostępnością API (najbardziej wydajny i najtańszy)
const genAI = new GoogleGenerativeAI(apiKey || "MOCK_KEY");

export const geminiModel = genAI.getGenerativeModel({ 
  model: "gemini-2.5-flash-lite",
  generationConfig: {
    responseMimeType: "application/json",
  }
});

// Model do analizy obrazu (Vision)
export const geminiVisionModel = genAI.getGenerativeModel({ 
  model: "gemini-2.5-flash-lite",
  generationConfig: {
    responseMimeType: "application/json",
  }
});
