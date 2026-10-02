import { getOrCreateDeviceId } from "../hooks/useDeviceId";

export async function fetchWithGroup(url: string, options: RequestInit = {}) {
  // Wyciągamy kod z pamięci przeglądarki
  const groupId = localStorage.getItem("groupId");

  // Doklejamy nasz nagłówek do istniejących nagłówków (jeśli jakieś są, np. Content-Type)
  const headers = {
    ...options.headers,
    "x-group-id": groupId || "",
    // Only for the server logs - lets them tell which phone a request came from
    "x-device-id": getOrCreateDeviceId(),
  };

  // Puszczamy standardowego fetcha, ale z doklejonymi nagłówkami
  return fetch(url, { ...options, headers });
}
