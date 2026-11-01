"use client";

import { useMutation, useQuery } from "convex/react";
import { SearchIcon } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { submissionRules } from "@/config/journal";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { normalizeEmail } from "@/convex/lib/text";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { FormField } from "../form-field";
import type { EditorDetail } from "../types";
import { useDebounced } from "../use-debounced";

type Prefill = { name: string; email: string; affiliation?: string };

export function InviteReviewerDialog({
  detail,
  prefill,
  trigger,
}: {
  detail: EditorDetail;
  prefill?: Prefill;
  trigger: ReactNode;
}) {
  const id = useId();
  const m = detail.manuscript;
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"find" | "new">(prefill ? "new" : "find");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Id<"users"> | null>(null);
  const [person, setPerson] = useState<Prefill>({
    name: prefill?.name ?? "",
    email: prefill?.email ?? "",
    affiliation: prefill?.affiliation ?? "",
  });
  const [days, setDays] = useState(String(submissionRules.defaultReviewDays));
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const term = useDebounced(query.trim(), 250);
  const results = useQuery(api.users.search, open && mode === "find" && term.length >= 2 ? { query: term } : "skip");
  const invite = useMutation(api.reviews.invite);

  const authorEmails = new Set(m.authors.map((a) => normalizeEmail(a.email)));
  const busy = new Set(
    detail.reviews
      .filter((r) => r.version === m.version && ["invited", "accepted", "submitted"].includes(r.status))
      .map((r) => r.reviewer?._id),
  );

  function conflict(candidate: { _id: Id<"users">; email: string }): string | null {
    if (authorEmails.has(normalizeEmail(candidate.email))) return "Author";
    if (candidate._id === m.handlingEditorId) return "Handling editor";
    if (candidate._id === m.submitterId) return "Submitter";
    if (busy.has(candidate._id)) return "Already invited";
    return null;
  }

  const dueInDays = Number(days);
  const daysValid = Number.isInteger(dueInDays) && dueInDays >= 1 && dueInDays <= 90;
  const ready =
    daysValid && (mode === "find" ? selected !== null : person.name.trim() !== "" && person.email.trim() !== "");

  function reset() {
    setQuery("");
    setSelected(null);
    setMessage("");
    setMode(prefill ? "new" : "find");
    setPerson({ name: prefill?.name ?? "", email: prefill?.email ?? "", affiliation: prefill?.affiliation ?? "" });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Invite a reviewer</DialogTitle>
          <DialogDescription>
            For version {m.version}. Reviewers see the anonymized manuscript, never the authors’ names.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-6"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!ready) return;
            setPending(true);
            try {
              await invite({
                manuscriptId: m._id,
                ...(mode === "find" && selected
                  ? { reviewerId: selected }
                  : {
                      newReviewer: {
                        name: person.name,
                        email: person.email,
                        affiliation: person.affiliation?.trim() || undefined,
                      },
                    }),
                dueInDays,
                message: message.trim() || undefined,
              });
              toast.success("Reviewer invited");
              setOpen(false);
              reset();
            } catch (error) {
              toast.error(errorMessage(error));
            } finally {
              setPending(false);
            }
          }}
        >
          <Tabs value={mode} onValueChange={(v) => setMode(v as "find" | "new")}>
            <TabsList variant="line" className="w-full justify-start gap-5 border-b">
              <TabsTrigger value="find" className="flex-none px-0">
                Someone with an account
              </TabsTrigger>
              <TabsTrigger value="new" className="flex-none px-0">
                Someone new
              </TabsTrigger>
            </TabsList>
            <TabsContent value="find" className="mt-4 space-y-3">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Search people by name, email or affiliation"
                  placeholder="Name, email or affiliation"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelected(null);
                  }}
                  className="pl-9"
                  autoFocus
                />
              </div>
              <div className="max-h-64 overflow-y-auto border" role="listbox" aria-label="People">
                {term.length < 2 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">Type at least two letters.</p>
                ) : results === undefined ? (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">Searching…</p>
                ) : results.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No one matches. Use “Someone new” to invite them by email.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {results.map((p) => {
                      const reason = conflict(p);
                      const isSelected = selected === p._id;
                      return (
                        <li key={p._id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            disabled={reason !== null}
                            onClick={() => setSelected(p._id)}
                            className={cn(
                              "flex w-full items-start justify-between gap-4 px-4 py-3 text-left",
                              isSelected ? "bg-foreground text-background" : "hover:bg-accent",
                              reason && "cursor-not-allowed opacity-60 hover:bg-transparent",
                            )}
                          >
                            <span className="min-w-0">
                              <span className="block text-sm font-medium">{p.name}</span>
                              <span
                                className={cn(
                                  "block truncate text-sm",
                                  isSelected ? "text-background/75" : "text-muted-foreground",
                                )}
                              >
                                {[p.affiliation, p.email].filter(Boolean).join(" · ")}
                              </span>
                            </span>
                            {reason ? <span className="meta-label shrink-0 pt-0.5">{reason}</span> : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </TabsContent>
            <TabsContent value="new" className="mt-4 grid gap-4 sm:grid-cols-2">
              <FormField label="Full name" htmlFor={`${id}-name`}>
                <Input
                  id={`${id}-name`}
                  value={person.name}
                  onChange={(e) => setPerson({ ...person, name: e.target.value })}
                />
              </FormField>
              <FormField label="Email" htmlFor={`${id}-email`}>
                <Input
                  id={`${id}-email`}
                  type="email"
                  value={person.email}
                  onChange={(e) => setPerson({ ...person, email: e.target.value })}
                />
              </FormField>
              <FormField label="Affiliation" htmlFor={`${id}-affiliation`} optional className="sm:col-span-2">
                <Input
                  id={`${id}-affiliation`}
                  value={person.affiliation ?? ""}
                  onChange={(e) => setPerson({ ...person, affiliation: e.target.value })}
                />
              </FormField>
            </TabsContent>
          </Tabs>

          <div className="grid gap-4 sm:grid-cols-[9rem_1fr]">
            <FormField
              label="Days to report"
              htmlFor={`${id}-days`}
              error={daysValid ? null : "1 to 90 days."}
            >
              <Input
                id={`${id}-days`}
                type="number"
                min={1}
                max={90}
                value={days}
                onChange={(e) => setDays(e.target.value)}
                aria-invalid={daysValid ? undefined : true}
              />
            </FormField>
            <FormField label="Message" htmlFor={`${id}-message`} optional>
              <Textarea
                id={`${id}-message`}
                value={message}
                rows={3}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Why you think they’re the right reviewer."
              />
            </FormField>
          </div>

          <p className="text-sm text-muted-foreground">
            The invitation appears in their dashboard when they sign in with this email. The journal
            doesn’t send email yet, so let them know.
          </p>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={!ready || pending}>
              {pending ? "Inviting…" : "Invite reviewer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
