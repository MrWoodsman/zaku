const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

// Parsuje surowy tekst komendy głosowej (np. "dodaj chleb i mleko do listy Zakupy")
// na strukturę { list_name, items } za pomocą Gemini (structured output / JSON schema).
async function parseVoiceCommand(text, existingLists) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Brak GEMINI_API_KEY w konfiguracji serwera");
  }

  const listNames = existingLists.map((l) => l.name).join(", ") || "(brak list)";

  const prompt = `Jesteś parserem poleceń głosowych do listy zakupów. Użytkownik powiedział po polsku: "${text}".
Istniejące listy zakupów tego użytkownika: ${listNames}.

Wyciągnij z wypowiedzi produkty do dodania oraz (jeśli wprost wskazano) nazwę docelowej listy.
Zasady:
- "list_name" ustaw tylko jeśli użytkownik WPROST wymienił nazwę listy (np. "do listy Impreza"). Jeśli nie wymienił, ustaw null - nie zgaduj.
- Dla każdego produktu podaj "name" (pojedyncza rzecz, w mianowniku, bez ilości w nazwie), "quantity" (liczba, domyślnie 1) i "unit" (np. "szt.", "kg", "l", "opak.", domyślnie "szt.").
- Jeśli wypowiedź nie zawiera żadnych produktów, zwróć pustą tablicę "items".`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              list_name: { type: "STRING", nullable: true },
              items: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    name: { type: "STRING" },
                    quantity: { type: "NUMBER" },
                    unit: { type: "STRING" },
                  },
                  required: ["name"],
                },
              },
            },
            required: ["items"],
          },
        },
      }),
    },
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error("Pusta odpowiedź od Gemini");
  }

  const parsed = JSON.parse(rawText);
  return {
    list_name: parsed.list_name || null,
    items: Array.isArray(parsed.items) ? parsed.items : [],
  };
}

module.exports = { parseVoiceCommand };
