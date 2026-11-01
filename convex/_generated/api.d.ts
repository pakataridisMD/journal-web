/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as articles from "../articles.js";
import type * as crons from "../crons.js";
import type * as editorial from "../editorial.js";
import type * as files from "../files.js";
import type * as issues from "../issues.js";
import type * as lib_articles from "../lib/articles.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_labels from "../lib/labels.js";
import type * as lib_manuscripts from "../lib/manuscripts.js";
import type * as lib_people from "../lib/people.js";
import type * as lib_submission from "../lib/submission.js";
import type * as lib_text from "../lib/text.js";
import type * as lib_validators from "../lib/validators.js";
import type * as manuscripts from "../manuscripts.js";
import type * as reviews from "../reviews.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  articles: typeof articles;
  crons: typeof crons;
  editorial: typeof editorial;
  files: typeof files;
  issues: typeof issues;
  "lib/articles": typeof lib_articles;
  "lib/auth": typeof lib_auth;
  "lib/errors": typeof lib_errors;
  "lib/labels": typeof lib_labels;
  "lib/manuscripts": typeof lib_manuscripts;
  "lib/people": typeof lib_people;
  "lib/submission": typeof lib_submission;
  "lib/text": typeof lib_text;
  "lib/validators": typeof lib_validators;
  manuscripts: typeof manuscripts;
  reviews: typeof reviews;
  seed: typeof seed;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
