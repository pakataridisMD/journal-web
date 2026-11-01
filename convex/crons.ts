import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "delete orphaned uploads",
  { hourUTC: 3, minuteUTC: 30 },
  internal.files.deleteOrphanedUploads,
  {},
);

export default crons;
