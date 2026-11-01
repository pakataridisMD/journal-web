import { ConvexError } from "convex/values";

/** The message to show for a failed Convex call. */
export function errorMessage(error: unknown): string {
  if (error instanceof ConvexError) {
    const data = error.data as unknown;
    if (typeof data === "string") return data;
    if (data && typeof data === "object" && "message" in data && typeof data.message === "string") {
      return data.message;
    }
  }
  return "Something went wrong. Please try again.";
}

export function errorCode(error: unknown): string | undefined {
  if (error instanceof ConvexError) {
    const data = error.data as unknown;
    if (data && typeof data === "object" && "code" in data && typeof data.code === "string") {
      return data.code;
    }
  }
  return undefined;
}
