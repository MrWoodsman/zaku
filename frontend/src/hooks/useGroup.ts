import { useEffect, useState } from "react";
import { GROUP_INVALID_EVENT } from "../api/api";

export function useGroup() {
  // Przy starcie aplikacji sprawdzamy, czy w pamięci telefonu jest zapisany kod
  const [groupId, setGroupId] = useState<string | null>(() => localStorage.getItem("groupId"));

  // Funkcja dołączania / tworzenia
  const joinGroup = (id: string) => {
    localStorage.setItem("groupId", id);
    setGroupId(id);
  };

  // Funkcja opuszczania
  const leaveGroup = () => {
    localStorage.removeItem("groupId");
    setGroupId(null);
  };

  // Backend no longer knows our group -> leave it and show the start screen
  useEffect(() => {
    window.addEventListener(GROUP_INVALID_EVENT, leaveGroup);
    return () => window.removeEventListener(GROUP_INVALID_EVENT, leaveGroup);
    // leaveGroup only touches localStorage and a stable state setter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { groupId, joinGroup, leaveGroup };
}
