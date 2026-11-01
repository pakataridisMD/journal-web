"use client";

import { useSyncExternalStore } from "react";
import { formatShortDate } from "@/lib/format";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, MINUTE);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/** The current time, refreshed every minute, safe to read while rendering. */
export function useNow(): number {
  return useSyncExternalStore(
    subscribe,
    () => now,
    () => now,
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** "in 5 days", "in under a day", "overdue by 2 days". */
export function dueIn(dueAt: number, at: number): string {
  if (dueAt < at) {
    const late = Math.floor((at - dueAt) / DAY);
    return late < 1 ? "overdue" : `overdue by ${plural(late, "day")}`;
  }
  const days = Math.floor((dueAt - at) / DAY);
  return days < 1 ? "in under a day" : `in ${plural(days, "day")}`;
}

/** "Due in 5 days", "Due in under a day", "Overdue by 2 days". */
export function dueLabel(dueAt: number, at: number): string {
  const relative = dueIn(dueAt, at);
  return dueAt < at ? relative.charAt(0).toUpperCase() + relative.slice(1) : `Due ${relative}`;
}

/** "today", "yesterday", "5 days ago". */
export function daysAgo(then: number, at: number): string {
  const days = daysSince(then, at);
  return days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
}

/** "0 days", "1 day", "12 days". */
export function dayCount(days: number): string {
  return plural(days, "day");
}

/** "just now", "12 minutes ago", "3 hours ago", "2 days ago", then a date. */
export function timeAgo(then: number, at: number): string {
  const diff = Math.max(0, at - then);
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return `${plural(Math.floor(diff / MINUTE), "minute")} ago`;
  if (diff < DAY) return `${plural(Math.floor(diff / HOUR), "hour")} ago`;
  if (diff < 14 * DAY) return `${plural(Math.floor(diff / DAY), "day")} ago`;
  return formatShortDate(then);
}

export function daysSince(then: number, at: number): number {
  return Math.max(0, Math.floor((at - then) / DAY));
}
