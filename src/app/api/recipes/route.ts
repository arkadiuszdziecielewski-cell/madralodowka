import { NextResponse } from "next/server";
import { geminiModel } from "@/lib/gemini";
import { Recipe } from "@/lib/types";

const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const diet = searchParams.get('diet') || 'Keto';
    const ingredients = searchParams.get('ingredients') || ''; // Lista składników z inwentarza
    
    const isRealGemini = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MOCK_KEY";
    const isRealSpoonacular = SPOONACULAR_API_KEY && SPOONACULAR_API_KEY !== "";

    let rawRecipes = [];

    if (isRealSpoonacular) {
      // 1. Pobieramy przepisy ze Spoonacular na podstawie składników
      const spoonRes = await fetch(
        `https://api.spoonacular.com/recipes/complexSearch?apiKey=${SPOONACULAR_API_KEY}&includeIngredients=${ingredients}&diet=${diet.toLowerCase()}&addRecipeInformation=true&fillIngredients=true&number=3`
      );
      const spoonData = await spoonRes.json();
      rawRecipes = spoonData.results || [];
    }

    if (!isRealGemini) {
      // Fallback/Mock jeśli brak Gemini
      const MOCK_RECIPES: Recipe[] = [
        {
          id: "r1",
          title: "Cezar z Kurczakiem (Spoonacular Mock)",
          image: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=800",
          time: "15 min",
          calories: "450 kcal",
          macros: { protein: 35, carbs: 10, fat: 30 },
          diet: ["Keto", "Niskokaloryczne"],
          match: 0.95,
          ingredients: ["Kurczak", "Sałata", "Pomidory"],
          instructions: ["Podsmaż kurczaka.", "Wymieszaj składniki."],
          difficulty: 'Łatwe',
          source: 'Spoonacular'
        },
        {
          id: "r2",
          title: "Omlet z Serem (Spoonacular Mock)",
          image: "https://images.unsplash.com/photo-1510629954389-c1e0da47d414?w=800",
          time: "10 min",
          calories: "320 kcal",
          macros: { protein: 20, carbs: 5, fat: 25 },
          diet: ["Keto", "Wege"],
          match: 0.98,
          ingredients: ["Jajka", "Ser Żółty"],
          instructions: ["Rozbij jajka.", "Smaż na maśle z serem."],
          difficulty: 'Łatwe',
          source: 'Spoonacular'
        }
      ];
      
      return NextResponse.json({
        success: true,
        recipes: MOCK_RECIPES.filter(r => r.diet.includes(diet))
      });
    }

    // 2. Używamy Gemini do przetłumaczenia i wzbogacenia danych ze Spoonacular lub wygenerowania własnych
    const prompt = isRealSpoonacular && rawRecipes.length > 0
      ? `Przetłumacz poniższe przepisy ze Spoonacular na język polski i sformatuj jako JSON zgodny z interfejsem Recipe[].
         Zadbaj o polskie nazwy produktów i miary. Wylicz makroskładniki (B/W/T w gramach), jeśli ich brakuje.
         Dane wejściowe: ${JSON.stringify(rawRecipes)}`
      : `Zaproponuj 3 kreatywne przepisy na dania z dostępnych produktów (${ingredients}), biorąc pod uwagę dietę: ${diet}.
         Zwróć odpowiedź w formacie JSON zgodnym z interfejsem Recipe[]:
         [{ 
           "id": "string", 
           "title": "string", 
           "image": "URL do zdjęcia (może być puste jeśli nie masz)",
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
    
    // Oczyszczanie JSON
    const cleanJson = text.replace(/```json\n?|```/g, "");
    const recipes = JSON.parse(cleanJson);

    return NextResponse.json({
      success: true,
      recipes: recipes.map((r: any) => ({ ...r, source: 'Spoonacular' }))
    });

  } catch (error) {
    console.error("Recipe API Error:", error);
    return NextResponse.json({
      success: false,
      error: "Błąd podczas pobierania przepisów."
    }, { status: 500 });
  }
}
