import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";

export type ManuscriptDetail = FunctionReturnType<typeof api.manuscripts.get>;
export type AuthorDetail = Extract<ManuscriptDetail, { view: "author" }>;
export type EditorDetail = Extract<ManuscriptDetail, { view: "editor" }>;
export type ManuscriptDoc = AuthorDetail["manuscript"];
export type FileView = AuthorDetail["files"][number];
export type QueueRow = FunctionReturnType<typeof api.manuscripts.queue>[number];
export type AssignmentDetail = FunctionReturnType<typeof api.reviews.getAssignment>;
export type Person = FunctionReturnType<typeof api.users.editors>[number];
