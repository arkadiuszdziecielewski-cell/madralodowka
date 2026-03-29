import { NextResponse } from "next/server";
import { geminiModel } from "@/lib/gemini";
import { MealPlanDay } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { days = 3, diet = "Keto" } = await request.json();
    const isRealAPI = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MOCK_KEY";

    if (!isRealAPI) {
      // Mocked plan
      const plan: MealPlanDay[] = [];
      const weekdays = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];

      for (let i = 0; i < days; i++) {
        plan.push({
          day: weekdays[i % 7],
          breakfast: { id: "m1", title: "Omlet (Mock Gemini)", time: "10 min", calories: "320 kcal", macros: { protein: 20, carbs: 5, fat: 25 }, diet: ["Keto"], match: 0.9, ingredients: [], instructions: [], difficulty: 'Łatwe' },
          lunch: { id: "m2", title: "Sałatka (Mock Gemini)", time: "15 min", calories: "450 kcal", macros: { protein: 35, carbs: 10, fat: 30 }, diet: ["Keto"], match: 0.9, ingredients: [], instructions: [], difficulty: 'Łatwe' },
          dinner: { id: "m3", title: "Kurczak (Mock Gemini)", time: "20 min", calories: "420 kcal", macros: { protein: 40, carbs: 0, fat: 25 }, diet: ["Keto"], match: 0.9, ingredients: [], instructions: [], difficulty: 'Łatwe' },
        });
      }

      return NextResponse.json({ success: true, plan });
    }

    const prompt = `Stwórz plan posiłków na ${days} dni dla diety ${diet}.
    Zwróć odpowiedź w formacie JSON zgodnym z interfejsem MealPlanDay[]:
    [{ "day": "string", "breakfast": { "title": "string", ... }, "lunch": { ... }, "dinner": { ... } }]
    Użyj polskiego języka i dbaj o różnorodność dań.`;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const plan = JSON.parse(text);

    return NextResponse.json({
      success: true,
      plan
    });

  } catch (error) {
    console.error("Gemini Plan Error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
