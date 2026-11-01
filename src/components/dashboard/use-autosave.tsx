"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "@/lib/errors";

export type SaveState = "idle" | "pending" | "saving" | "saved" | "error";

/**
 * Saves `value` a moment after it stops changing. `flush` saves right away
 * (e.g. before moving to the next step) and reports whether it worked.
 */
export function useAutosave<T>(
  value: T,
  save: (value: T) => Promise<unknown>,
  { delay = 900, enabled = true }: { delay?: number; enabled?: boolean } = {},
) {
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const saveRef = useRef(save);
  const valueRef = useRef(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);
  const serialized = JSON.stringify(value);
  const lastSaved = useRef(serialized);

  useEffect(() => {
    saveRef.current = save;
    valueRef.current = value;
  });

  const run = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!dirty.current) return true;
    const snapshot = valueRef.current;
    const snapshotKey = JSON.stringify(snapshot);
    setState("saving");
    try {
      await saveRef.current(snapshot);
      lastSaved.current = snapshotKey;
      dirty.current = JSON.stringify(valueRef.current) !== snapshotKey;
      setState(dirty.current ? "pending" : "saved");
      setError(null);
      return true;
    } catch (e) {
      setState("error");
      setError(errorMessage(e));
      return false;
    }
  }, []);

  useEffect(() => {
    if (!enabled || serialized === lastSaved.current) return;
    dirty.current = true;
    setState("pending");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void run(), delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [serialized, enabled, delay, run]);

  return { state, error, flush: run };
}

export function SaveIndicatorText({ state, error }: { state: SaveState; error: string | null }) {
  if (state === "error") return <span className="text-destructive">{error ?? "Not saved"}</span>;
  if (state === "pending" || state === "saving") return <span className="text-muted-foreground">Saving…</span>;
  if (state === "saved") return <span className="text-muted-foreground">All changes saved</span>;
  return null;
}
