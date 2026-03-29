import { NextResponse } from "next/server";
import { geminiVisionModel } from "@/lib/gemini";
import { InventoryItem } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const isRealAPI = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MOCK_KEY";

    if (!isRealAPI) {
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      const extractedItems: Partial<InventoryItem>[] = [
        { name: "Chleb Żytni", quantity: "1 szt.", category: 'szafki' },
        { name: "Masło Ekstra", quantity: "200g", category: 'lodówka' },
        { name: "Szynka Konserwowa", quantity: "150g", category: 'lodówka' },
        { name: "Sok Pomarańczowy", quantity: "1L", category: 'lodówka' },
      ];

      return NextResponse.json({
        success: true,
        items: extractedItems,
        message: "AI Gemini Flash-Lite (Mock) wyciągnęło produkty z paragonu Żabka."
      });
    }

    // Prawdziwa integracja z Gemini Vision
    const { image } = await request.json();
    
    if (!image) {
      return NextResponse.json({ success: false, error: "Brak zdjęcia paragonu." }, { status: 400 });
    }

    const base64Data = image.split(",")[1];
    const mimeType = image.split(";")[0].split(":")[1];

    const prompt = `Przeanalizuj to zdjęcie paragonu (np. z Biedronki, Lidla, Żabki). 
    Wyodrębnij listę zakupionych produktów spożywczych.
    Zwróć odpowiedź w formacie JSON:
    { "items": [{ "name": "string", "quantity": "string", "category": "lodówka|zamrażarka|szafki|przyprawy" }] }
    Ignoruj produkty niespożywcze (np. reklamówki, chemia). Przetłumacz skróty z paragonu na pełne nazwy.`;

    const result = await geminiVisionModel.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();
    const cleanJson = text.replace(/```json\n?|```/g, "");
    const parsed = JSON.parse(cleanJson);

    return NextResponse.json({
      success: true,
      items: parsed.items,
      message: "AI Gemini Flash-Lite pomyślnie przetworzyło paragon."
    });

  } catch (error) {
    console.error("Gemini Receipt Error:", error);
    return NextResponse.json({
      success: false,
      error: "Błąd podczas analizy paragonu przez Gemini."
    }, { status: 500 });
  }
}
