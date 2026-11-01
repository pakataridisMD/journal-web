"use client";

import { useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "@/convex/_generated/api";

/** Counts one view per page load. */
export function ViewTracker({ slug }: { slug: string }) {
  const recordView = useMutation(api.articles.recordView);
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    recordView({ slug }).catch(() => {});
  }, [recordView, slug]);
  return null;
}

export function PdfLink({ slug, href }: { slug: string; href: string }) {
  const recordDownload = useMutation(api.articles.recordDownload);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        recordDownload({ slug }).catch(() => {});
      }}
      className="inline-flex h-10 w-full items-center justify-center gap-2 bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      Download PDF
    </a>
  );
}
