import { ViewTransition, type ReactNode } from "react";

/**
 * Moving between pages of the public site, the page fades out and the next
 * one fades up in its place while the header and footer hold still (see
 * "Motion" in globals.css). A template mounts afresh on each navigation,
 * which is what plays the enter and exit; nothing else animates here.
 */
export default function SiteTemplate({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="page-enter" exit="page-exit" default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
