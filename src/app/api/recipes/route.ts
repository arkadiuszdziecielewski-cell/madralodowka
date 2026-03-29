import { NextResponse } from "next/server";
import { geminiModel } from "@/lib/gemini";
import { Recipe } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const diet = searchParams.get('diet') || 'Keto';
    
    const isRealAPI = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MOCK_KEY";

    if (!isRealAPI) {
      const MOCK_RECIPES: Recipe[] = [
        {
          id: "r1",
          title: "Cezar z Kurczakiem (Gemini Flash)",
          time: "15 min",
          calories: "450 kcal",
          macros: { protein: 35, carbs: 10, fat: 30 },
          diet: ["Keto", "Niskokaloryczne"],
          match: 0.95,
          ingredients: ["Kurczak", "Sałata", "Pomidory"],
          instructions: ["Podsmaż kurczaka.", "Wymieszaj składniki."],
          difficulty: 'Łatwe'
        },
        {
          id: "r2",
          title: "Omlet z Serem (Gemini Flash)",
          time: "10 min",
          calories: "320 kcal",
          macros: { protein: 20, carbs: 5, fat: 25 },
          diet: ["Keto", "Wege"],
          match: 0.98,
          ingredients: ["Jajka", "Ser Żółty"],
          instructions: ["Rozbij jajka.", "Smaż na maśle z serem."],
          difficulty: 'Łatwe'
        }
      ];
      
      return NextResponse.json({
        success: true,
        recipes: MOCK_RECIPES.filter(r => r.diet.includes(diet))
      });
    }

    const prompt = `Zaproponuj 3 kreatywne przepisy na dania z dostępnych produktów, biorąc pod uwagę dietę: ${diet}.
    Zwróć odpowiedź w formacie JSON zgodnym z interfejsem Recipe[]:
    [{ 
      "id": "string", 
      "title": "string", 
      "time": "string", 
      "calories": "string", 
      "macros": { "protein": number, "carbs": number, "fat": number },
      "diet": ["string"], 
      "match": number, 
      "ingredients": ["string"], 
      "instructions": ["string"], 
      "difficulty": "Łatwe|Średnie|Trudne" 
    }]
    Wartości makro podaj w gramach (B/W/T). Zadbaj o polskie nazwy i miary.`;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const recipes = JSON.parse(text);

    return NextResponse.json({
      success: true,
      recipes
    });

  } catch (error) {
    console.error("Gemini Recipes Error:", error);
    return NextResponse.json({
      success: false,
      error: "Błąd podczas generowania przepisów przez Gemini."
    }, { status: 500 });
  }
}
