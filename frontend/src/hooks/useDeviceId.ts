import { useState } from "react";

// crypto.randomUUID() only exists in secure contexts (HTTPS/localhost).
// Fallback covers plain HTTP, e.g. testing on a phone over local network.
function generateId(): string {
  if (crypto.randomUUID) return crypto.randomUUID();

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Generates a random id once and persists it, so this browser/device
// can be recognized by the backend without any account/login.
function getOrCreateDeviceId(): string {
  const existing = localStorage.getItem("deviceId");
  if (existing) return existing;

  const id = generateId();
  localStorage.setItem("deviceId", id);
  return id;
}

export function useDeviceId() {
  const [deviceId] = useState<string>(() => getOrCreateDeviceId());

  return deviceId;
}
