/** The roles a person holds, in words, for headers and the profile page. */
export function roleNames(viewer: { isAdmin: boolean; isEditor: boolean; isReviewer: boolean }) {
  return [
    "Author",
    viewer.isReviewer ? "Reviewer" : null,
    viewer.isAdmin ? "Editor-in-chief" : viewer.isEditor ? "Editor" : null,
  ].filter((r): r is string => r !== null);
}
