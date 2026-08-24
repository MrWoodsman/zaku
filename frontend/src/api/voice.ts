import type { VoiceParseResponse } from "@shared/types";
import { fetchWithGroup } from "./api";

// PARSOWANIE KOMENDY GŁOSOWEJ/TEKSTOWEJ PRZEZ AI (bez zapisu do bazy)
export const parseVoiceCommandApi = async (text: string): Promise<VoiceParseResponse> => {
  const response = await fetchWithGroup("/api/v1/voice/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Nie udało się przetworzyć komendy");
  }

  return data;
};
