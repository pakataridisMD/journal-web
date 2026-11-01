"use client";

import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { SearchIcon, UserPlusIcon } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import type { Role } from "@/convex/lib/validators";
import { errorMessage } from "@/lib/errors";
import { FormField } from "../form-field";
import { PageHeader } from "../page-header";
import { PageSkeleton } from "../page-skeleton";
import type { Person } from "../types";
import { useDebounced } from "../use-debounced";
import { useViewer } from "../viewer-context";

const ROLE_LABELS: Record<Exclude<Role, "author">, string> = {
  reviewer: "Reviewer",
  editor: "Editor",
  admin: "Editor-in-chief",
};
const TOGGLES = ["reviewer", "editor", "admin"] as const;

export function PeopleAdmin() {
  const [query, setQuery] = useState("");
  const term = useDebounced(query.trim(), 250);
  const searching = term.length >= 2;
  const found = useQuery(api.users.search, searching ? { query: term } : "skip");
  const everyone = usePaginatedQuery(api.users.list, searching ? "skip" : {}, { initialNumItems: 30 });
  const rows = searching ? found : everyone.status === "LoadingFirstPage" ? undefined : everyone.results;

  return (
    <>
      <PageHeader
        title="People and roles"
        description="Everyone can submit. Editors add reviewers when they invite them; only the editor-in-chief adds editors."
        actions={<AddPersonDialog />}
      />
      <div className="py-6">
        <div className="relative max-w-md">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search people"
            placeholder="Search by name, email or affiliation"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      {rows === undefined ? (
        <PageSkeleton />
      ) : rows.length === 0 ? (
        <p className="border-y py-8 text-center text-sm text-muted-foreground">
          {searching ? "No one matches that search." : "No one has signed up yet."}
        </p>
      ) : (
        <>
          <div
            aria-hidden
            className="hidden border-b pb-2 text-xs text-muted-foreground lg:grid lg:grid-cols-[minmax(0,1fr)_8rem_repeat(3,8.5rem)] lg:gap-x-4"
          >
            <span>Person</span>
            <span>Account</span>
            {TOGGLES.map((r) => (
              <span key={r}>{ROLE_LABELS[r]}</span>
            ))}
          </div>
          <ul className="divide-y border-b max-lg:border-t">
            {rows.map((person) => (
              <PersonRow key={person._id} person={person} />
            ))}
          </ul>
          {!searching && (everyone.status === "CanLoadMore" || everyone.status === "LoadingMore") ? (
            <div className="mt-6 flex justify-center">
              <Button variant="outline" disabled={everyone.status === "LoadingMore"} onClick={() => everyone.loadMore(30)}>
                {everyone.status === "LoadingMore" ? "Loading…" : "Show more"}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}

function PersonRow({ person }: { person: Person }) {
  const viewer = useViewer();
  const setRoles = useMutation(api.users.setRoles);
  const [confirmAdmin, setConfirmAdmin] = useState<boolean | null>(null);
  const roles = new Set(person.roles);
  const isSelf = person._id === viewer._id;

  async function apply(next: Set<Role>) {
    try {
      await setRoles({ userId: person._id, roles: [...next].filter((r) => r !== "author") });
      toast.success(`Roles updated for ${person.name}`);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  function toggle(role: (typeof TOGGLES)[number], on: boolean) {
    if (role === "admin") {
      setConfirmAdmin(on);
      return;
    }
    const next = new Set(roles);
    if (on) next.add(role);
    else next.delete(role);
    void apply(next);
  }

  return (
    <li className="grid gap-x-4 gap-y-3 py-3.5 lg:grid-cols-[minmax(0,1fr)_8rem_repeat(3,8.5rem)] lg:items-center">
      <div className="min-w-0">
        <p className="text-sm font-medium">
          {person.name}
          {isSelf ? <span className="font-normal text-muted-foreground"> (you)</span> : null}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          {[person.email, person.affiliation].filter(Boolean).join(" · ")}
        </p>
      </div>
      <span className="text-sm text-muted-foreground">{person.hasAccount ? "Signed up" : "Invited"}</span>
      <div className="flex flex-wrap gap-x-5 gap-y-2 lg:contents">
        {TOGGLES.map((role) => {
          const implied = role === "editor" && roles.has("admin");
          const checked = roles.has(role) || implied;
          const locked = implied || (role === "admin" && isSelf);
          const why = implied
            ? "Editors-in-chief are always editors"
            : locked
              ? "You can’t remove your own editor-in-chief role"
              : undefined;
          return (
            <label key={role} className="flex items-center gap-2 text-sm" title={why}>
              <Checkbox
                checked={checked}
                disabled={locked}
                onCheckedChange={(value) => toggle(role, value === true)}
                aria-label={`${ROLE_LABELS[role]}: ${person.name}`}
              />
              <span className="lg:sr-only">{ROLE_LABELS[role]}</span>
            </label>
          );
        })}
      </div>
      <AlertDialog open={confirmAdmin !== null} onOpenChange={(open) => !open && setConfirmAdmin(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAdmin ? `Make ${person.name} an editor-in-chief?` : `Remove ${person.name} as editor-in-chief?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAdmin
                ? "Editors-in-chief can assign any manuscript, decide on any manuscript, manage issues and change anyone’s roles."
                : "They keep the editor role, and can still handle the manuscripts assigned to them."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const next = new Set(roles);
                if (confirmAdmin) {
                  next.add("admin");
                  next.add("editor");
                } else {
                  next.delete("admin");
                  next.add("editor");
                }
                setConfirmAdmin(null);
                void apply(next);
              }}
            >
              {confirmAdmin ? "Make editor-in-chief" : "Remove role"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

function AddPersonDialog() {
  const id = useId();
  const addPerson = useMutation(api.users.addPerson);
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState({ name: "", email: "", affiliation: "", role: "editor" as Role });
  const [pending, setPending] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setFields({ name: "", email: "", affiliation: "", role: "editor" });
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlusIcon />
          Add person
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a person</DialogTitle>
          <DialogDescription>
            They get the role when they sign in with this email. If they already have an account, the
            role is added now.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            try {
              await addPerson({
                name: fields.name,
                email: fields.email,
                affiliation: fields.affiliation.trim() || undefined,
                role: fields.role,
              });
              toast.success(`${fields.name} added as ${ROLE_LABELS[fields.role as Exclude<Role, "author">].toLowerCase()}`);
              setOpen(false);
              setFields({ name: "", email: "", affiliation: "", role: "editor" });
            } catch (error) {
              toast.error(errorMessage(error));
            } finally {
              setPending(false);
            }
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Full name" htmlFor={`${id}-name`}>
              <Input
                id={`${id}-name`}
                value={fields.name}
                required
                onChange={(e) => setFields({ ...fields, name: e.target.value })}
              />
            </FormField>
            <FormField label="Email" htmlFor={`${id}-email`}>
              <Input
                id={`${id}-email`}
                type="email"
                value={fields.email}
                required
                onChange={(e) => setFields({ ...fields, email: e.target.value })}
              />
            </FormField>
            <FormField label="Affiliation" htmlFor={`${id}-affiliation`} optional>
              <Input
                id={`${id}-affiliation`}
                value={fields.affiliation}
                onChange={(e) => setFields({ ...fields, affiliation: e.target.value })}
              />
            </FormField>
            <FormField label="Role" htmlFor={`${id}-role`}>
              <Select value={fields.role} onValueChange={(v) => setFields({ ...fields, role: v as Role })}>
                <SelectTrigger id={`${id}-role`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TOGGLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending || !fields.name.trim() || !fields.email.trim()}>
              Add person
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
