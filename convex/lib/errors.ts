import { ConvexError } from "convex/values";

export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID_STATE"
  | "INVALID_INPUT"
  | "CONFLICT"
  | "SETUP_REQUIRED";

export type AppErrorData = { code: ErrorCode; message: string };

/**
 * Throw an error the client can show as-is. The message is written for the
 * person using the app; the code lets the UI branch (e.g. sign-in prompts).
 */
export function fail(code: ErrorCode, message: string): never {
  throw new ConvexError<AppErrorData>({ code, message });
}
