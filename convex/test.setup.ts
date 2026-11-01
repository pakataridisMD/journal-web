/// <reference types="vite/client" />

// Every Convex module except tests, helpers and type declarations
// (files with two or more dots, which Convex itself skips too).
export const modules = import.meta.glob(["./**/*.{js,ts}", "!./**/*.*.{js,ts}"]);
