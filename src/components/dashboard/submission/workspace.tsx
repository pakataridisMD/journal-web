"use client";

import { useMutation, useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { errorMessage } from "@/lib/errors";
import { PageSkeleton } from "../page-skeleton";
import { StatusView } from "./status-view";
import { SubmissionWizard } from "./wizard";

/** /dashboard/submissions/[id]: the draft wizard, the revision, or the record. */
export function SubmissionWorkspace() {
  const { id } = useParams<{ id: string }>();
  const manuscriptId = id as Id<"manuscripts">;
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const detail = useQuery(api.manuscripts.get, deleting ? "skip" : { manuscriptId });
  const deleteDraft = useMutation(api.manuscripts.deleteDraft);

  const isEditorView = detail?.view === "editor";
  useEffect(() => {
    if (isEditorView) router.replace(`/dashboard/editorial/${manuscriptId}`);
  }, [isEditorView, manuscriptId, router]);

  if (deleting) return <PageSkeleton label="Deleting the draft…" />;
  if (detail === undefined || detail.view === "editor") return <PageSkeleton />;

  const m = detail.manuscript;
  if (m.status === "draft" || m.status === "revision_requested") {
    return (
      <SubmissionWizard
        key={`${m.status}-${m.version}`}
        detail={detail}
        onSubmitted={() => setJustSubmitted(true)}
        onDelete={async () => {
          setDeleting(true);
          try {
            await deleteDraft({ manuscriptId });
            toast.success("Draft deleted");
            router.replace("/dashboard/submissions");
          } catch (error) {
            setDeleting(false);
            toast.error(errorMessage(error));
          }
        }}
      />
    );
  }
  return <StatusView detail={detail} justSubmitted={justSubmitted} />;
}
