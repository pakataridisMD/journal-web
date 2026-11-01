"use client";

import { useMutation } from "convex/react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { isValidOrcid } from "@/convex/lib/text";
import { errorMessage } from "@/lib/errors";
import { FormField } from "./form-field";
import { PageHeader } from "./page-header";
import { useViewer } from "./viewer-context";

export function roleNames(viewer: { roles: readonly string[]; isAdmin: boolean; isEditor: boolean; isReviewer: boolean }) {
  return [
    "Author",
    viewer.isReviewer ? "Reviewer" : null,
    viewer.isAdmin ? "Editor-in-chief" : viewer.isEditor ? "Editor" : null,
  ].filter((r): r is string => r !== null);
}

export function ProfileForm() {
  const id = useId();
  const viewer = useViewer();
  const updateProfile = useMutation(api.users.updateProfile);
  const [name, setName] = useState(viewer.name);
  const [affiliation, setAffiliation] = useState(viewer.affiliation ?? "");
  const [orcid, setOrcid] = useState(viewer.orcid ?? "");
  const [pending, setPending] = useState(false);

  const orcidProblem = orcid.trim() && !isValidOrcid(orcid.trim().toUpperCase()) ? "An ORCID iD looks like 0000-0002-1825-0097." : null;
  const changed =
    name !== viewer.name || affiliation !== (viewer.affiliation ?? "") || orcid !== (viewer.orcid ?? "");

  return (
    <>
      <PageHeader
        title="Profile"
        description="Used as the first author on new submissions, and shown to editors when they invite reviewers."
      />
      <div className="grid gap-x-12 gap-y-10 py-8 lg:grid-cols-[minmax(0,36rem)_1fr]">
        <form
          className="space-y-6"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            try {
              await updateProfile({ name, affiliation, orcid });
              toast.success("Profile saved");
            } catch (error) {
              toast.error(errorMessage(error));
            } finally {
              setPending(false);
            }
          }}
        >
          <FormField label="Full name" htmlFor={`${id}-name`} hint="As it should appear on published articles.">
            <Input id={`${id}-name`} value={name} required onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label="Affiliation" htmlFor={`${id}-affiliation`} optional hint="Department, institution, city, country.">
            <Input id={`${id}-affiliation`} value={affiliation} onChange={(e) => setAffiliation(e.target.value)} />
          </FormField>
          <FormField label="ORCID iD" htmlFor={`${id}-orcid`} optional error={orcidProblem}>
            <Input
              id={`${id}-orcid`}
              value={orcid}
              placeholder="0000-0000-0000-0000"
              className="font-mono"
              aria-invalid={orcidProblem ? true : undefined}
              onChange={(e) => setOrcid(e.target.value)}
            />
          </FormField>
          <FormField label="Email" htmlFor={`${id}-email`} hint="Your sign-in email. Change it from the account menu at the top right.">
            <Input id={`${id}-email`} value={viewer.email} readOnly disabled />
          </FormField>
          <Button type="submit" disabled={!changed || pending || Boolean(orcidProblem)}>
            {pending ? "Saving…" : "Save profile"}
          </Button>
        </form>
        <aside>
          <h2 className="meta-label text-muted-foreground">Your roles</h2>
          <ul className="mt-3 divide-y border-y">
            {roleNames(viewer).map((role) => (
              <li key={role} className="py-3 text-sm">
                {role}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            Roles are given by the editors. Anyone can submit a manuscript.
          </p>
        </aside>
      </div>
    </>
  );
}
