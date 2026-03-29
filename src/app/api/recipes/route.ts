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
      // Używamy complexSearch, aby uzyskać więcej informacji od razu
      const spoonRes = await fetch(
        `https://api.spoonacular.com/recipes/complexSearch?apiKey=${SPOONACULAR_API_KEY}&includeIngredients=${encodeURIComponent(ingredients)}&diet=${diet.toLowerCase()}&addRecipeInformation=true&fillIngredients=true&number=3&sort=max-used-ingredients`
      );
      const spoonData = await spoonRes.json();
      rawRecipes = spoonData.results || [];
    }

    // 2. Używamy Gemini do przetłumaczenia i wzbogacenia danych ze Spoonacular lub wygenerowania własnych
    const prompt = isRealSpoonacular && rawRecipes.length > 0
      ? `Jesteś ekspertem kulinarnym. Przetłumacz poniższe przepisy ze Spoonacular na język polski i zwróć je jako czysty obiekt JSON zgodny z interfejsem Recipe[].
         
         WAŻNE ZASADY:
         1. Zwróć TYLKO tablicę obiektów [], bez żadnego dodatkowego tekstu ani bloków markdown.
         2. Przetłumacz nazwy potraw na apetyczne polskie nazwy.
         3. Składniki (ingredients) i instrukcje (instructions) muszą być po polsku.
         4. Wylicz wartości makro (protein, carbs, fat) jako LICZBY (w gramach), bazując na składnikach.
         5. Ustal trudność: Łatwe, Średnie lub Trudne.
         6. Zachowaj oryginalne ID i URL obrazka.
         7. Dopasuj (match) - określ w skali 0-100 jak dobrze przepis pasuje do posiadanych składników (${ingredients}).

         STRUKTURA OBIEKTU:
         {
           "id": "string",
           "title": "string",
           "image": "string",
           "time": "string",
           "calories": "string",
           "macros": { "protein": number, "carbs": number, "fat": number },
           "diet": ["string"],
           "match": number,
           "ingredients": ["string"],
           "instructions": ["string"],
           "difficulty": "Łatwe|Średnie|Trudne"
         }

         DANE DO PRZETŁUMACZENIA: ${JSON.stringify(rawRecipes.map(r => ({
           id: r.id.toString(),
           title: r.title,
           image: r.image,
           time: r.readyInMinutes + " min",
           calories: r.nutrition?.nutrients?.find((n: any) => n.name === 'Calories')?.amount + " kcal" || "0 kcal",
           ingredients: r.extendedIngredients?.map((i: any) => i.original),
           instructions: r.analyzedInstructions?.[0]?.steps?.map((s: any) => s.step) || [r.instructions]
         })))}`
      : `Zaproponuj 3 kreatywne przepisy na dania z dostępnych produktów (${ingredients}), biorąc pod uwagę dietę: ${diet}.
         Zwróć odpowiedź w formacie JSON zgodnym z interfejsem Recipe[]:
         [{ 
           "id": "string", 
           "title": "string", 
           "image": "URL do zdjęcia (użyj https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800 jeśli nie masz innego)",
           "time": "string", 
           "calories": "string", 
           "macros": { "protein": number, "carbs": number, "fat": number },
           "diet": ["string"], 
           "match": number, 
           "ingredients": ["string"], 
           "instructions": ["string"], 
           "difficulty": "Łatwe|Średnie|Trudne" 
         }]
         Wartości makro podaj jako LICZBY w gramach (B/W/T). Zadbaj o polskie nazwy i miary.`;


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
