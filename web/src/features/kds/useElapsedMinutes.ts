import { useEffect, useState } from "react";

export function useElapsedMinutes(sinceIso: string): { label: string; minutes: number } {
  const [, tick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const elapsedMs = Date.now() - new Date(sinceIso).getTime();
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return { label: `${minutes}:${seconds.toString().padStart(2, "0")}`, minutes };
}
