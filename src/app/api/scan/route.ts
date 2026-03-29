import { NextResponse } from "next/server";
import { geminiVisionModel } from "@/lib/gemini";
import { InventoryItem } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const isRealAPI = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MOCK_KEY";

    if (!isRealAPI) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const recognizedItems: InventoryItem[] = [
        { 
          id: "1", name: "Mleko Mlekovita 2%", quantity: "1L", status: "Świeże", expiryDays: 2, category: 'lodówka',
          spoilageProbability: 15, spoilageSuggestion: "Zużyj do kawy lub płatków"
        },
        { 
          id: "2", name: "Pomidory Maliniowe", quantity: "4 szt.", status: "Użyć wkrótce", expiryDays: 4, category: 'lodówka',
          spoilageProbability: 70, spoilageSuggestion: "Zrób sos pomidorowy lub leczo"
        },
        { 
          id: "3", name: "Pierś z Kurczaka", quantity: "500g", status: "Użyć wkrótce", expiryDays: 1, category: 'lodówka',
          spoilageProbability: 40, spoilageSuggestion: "Ugotuj na obiad dzisiaj"
        },
        { 
          id: "4", name: "Makaron Spaghetti", quantity: "1 opak.", status: "Świeże", expiryDays: 180, category: 'szafki',
          spoilageProbability: 0
        },
        { 
          id: "5", name: "Ser Żółty Podlaski", quantity: "200g", status: "Świeże", expiryDays: 10, category: 'lodówka',
          spoilageProbability: 5
        },
      ];

      return NextResponse.json({
        success: true,
        items: recognizedItems,
        message: "AI Gemini Flash-Lite (Mock) rozpoznało produkty i przewidziało marnowanie."
      });
    }

    // Prawdziwa integracja z Gemini Vision
    const { image } = await request.json(); // Oczekujemy base64 w polu image
    
    if (!image) {
      return NextResponse.json({ success: false, error: "Brak zdjęcia do analizy." }, { status: 400 });
    }

    // Wyciągamy czyste dane base64 i format
    const base64Data = image.split(",")[1];
    const mimeType = image.split(";")[0].split(":")[1];

    const prompt = `Zidentyfikuj produkty spożywcze na tym zdjęciu lodówki/szafki. 
    Zwróć listę produktów w formacie JSON zgodnym z interfejsem InventoryItem:
    { "items": [{ 
      "id": "string (unikalny id)", 
      "name": "string (polska nazwa)", 
      "quantity": "string (np. 1 szt, 200g)", 
      "status": "Świeże|Użyć wkrótce|Zaraz się zepsuje", 
      "expiryDays": number (oszacuj dni), 
      "category": "lodówka|zamrażarka|szafki|przyprawy",
      "spoilageProbability": number (0-100),
      "spoilageSuggestion": "string (krótka porada co zrobić z tym produktem)"
    }] }
    Rozpoznaj polskie marki. Oceń prawdopodobieństwo zepsucia na podstawie wyglądu i typowego czasu trwałości.`;

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
    
    // Gemini czasami zwraca JSON w blokach markdown, musimy to oczyścić
    const cleanJson = text.replace(/```json\n?|```/g, "");
    const parsed = JSON.parse(cleanJson);

    return NextResponse.json({
      success: true,
      items: parsed.items,
      message: `AI Gemini Flash-Lite pomyślnie przeanalizowało zdjęcie i wykryło ${parsed.items.length} produktów.`
    });

  } catch (error) {
    console.error("Gemini Scan Error:", error);
    return NextResponse.json({
      success: false,
      error: "Błąd podczas skanowania przez Gemini."
    }, { status: 500 });
  }
}
