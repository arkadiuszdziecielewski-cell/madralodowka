import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

// Wykorzystujemy model 1.5-flash-latest jako najbardziej wydajny i najtańszy (Flash-Lite tier)
const genAI = new GoogleGenerativeAI(apiKey || "MOCK_KEY");

export const geminiModel = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash-latest",
  generationConfig: {
    responseMimeType: "application/json",
  }
});

// Model do analizy obrazu (Vision)
export const geminiVisionModel = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash-latest",
  generationConfig: {
    responseMimeType: "application/json",
  }
});
