"use client";

import type { FunctionReturnType } from "convex/server";
import { createContext, useContext } from "react";
import type { api } from "@/convex/_generated/api";

export type Viewer = NonNullable<FunctionReturnType<typeof api.users.me>>;

export const ViewerContext = createContext<Viewer | null>(null);

/** The signed-in person; only used below the dashboard shell. */
export function useViewer(): Viewer {
  const viewer = useContext(ViewerContext);
  if (!viewer) throw new Error("useViewer must be used inside the dashboard shell.");
  return viewer;
}
