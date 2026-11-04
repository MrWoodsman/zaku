import { getOrCreateDeviceId } from "../hooks/useDeviceId";

// Fired when the backend says the saved group no longer exists (e.g. database was wiped)
export const GROUP_INVALID_EVENT = "zaku:group-invalid";

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
  const response = await fetch(url, { ...options, headers });

  // Unknown group -> tell useGroup to leave it, so the app returns to the start screen
  if (response.status === 401 && groupId) {
    const body = await response
      .clone()
      .json()
      .catch(() => null);
    if (body?.message === "Nieznana grupa") {
      window.dispatchEvent(new Event(GROUP_INVALID_EVENT));
    }
  }

  return response;
}
