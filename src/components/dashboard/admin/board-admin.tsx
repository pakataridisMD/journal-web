"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ArrowDownIcon, ArrowUpIcon, ArrowUpRightIcon, MoreHorizontalIcon, PlusIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { toast } from "sonner";
import { refreshPeople } from "@/app/actions";
import { subjectArt } from "@/components/art/catalog";
import { Glyph } from "@/components/art/glyph";
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { boardGroupOrder, boardGroups, subjects, suggestedBoard, type BoardGroupKey } from "@/config/journal";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { errorMessage } from "@/lib/errors";
import { FormField } from "../form-field";
import { EmptyState, PageHeader } from "../page-header";
import { PageSkeleton } from "../page-skeleton";
import { useDebounced } from "../use-debounced";

type Position = FunctionReturnType<typeof api.board.list>[number];

/** The board changed: refresh the public pages, which show it within the hour anyway. */
function refreshSite() {
  refreshPeople().catch((error) => console.warn("The Who we are page will refresh within the hour.", error));
}

async function attempt(action: () => Promise<unknown>, success: string) {
  try {
    await action();
    toast.success(success);
    refreshSite();
    return true;
  } catch (error) {
    toast.error(errorMessage(error));
    return false;
  }
}

export function BoardAdmin() {
  const positions = useQuery(api.board.list, {});
  const addSuggested = useMutation(api.board.addSuggested);
  const [adding, setAdding] = useState(false);

  return (
    <>
      <PageHeader
        title="Editorial board"
        description="The board on the Who we are page. Appointing someone puts their profile on the website; they choose what it shows."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/who-we-are#editorial-board" target="_blank">
                View the page
                <ArrowUpRightIcon />
              </Link>
            </Button>
            <Button onClick={() => setAdding(true)}>
              <PlusIcon />
              Add position
            </Button>
          </>
        }
      />
      <PositionDialog open={adding} onOpenChange={setAdding} />
      {positions === undefined ? (
        <PageSkeleton />
      ) : positions.length === 0 ? (
        <div className="py-8">
          <EmptyState
            title="No board yet"
            art={{ glyph: "medical-education", tone: "nerve" }}
            action={
              <Button
                onClick={() => void attempt(() => addSuggested({}), "Added the suggested positions")}
              >
                Start from the suggested board
              </Button>
            }
          >
            Until you add positions, the website lists the {suggestedBoard.length} suggested positions as open. Start
            from them and appoint people as they join, or add your own.
          </EmptyState>
        </div>
      ) : (
        <div className="space-y-10 py-8">
          {boardGroupOrder.map((group) => {
            const rows = positions.filter((p) => p.group === group);
            if (rows.length === 0) return null;
            return (
              <section key={group} aria-labelledby={`group-${group}`}>
                <h2 id={`group-${group}`} className="meta-label border-b border-foreground pb-2.5">
                  {boardGroups[group].label}
                </h2>
                <ul className="divide-y border-b">
                  {rows.map((position, i) => (
                    <PositionRow key={position._id} position={position} first={i === 0} last={i === rows.length - 1} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

function PositionRow({ position, first, last }: { position: Position; first: boolean; last: boolean }) {
  const move = useMutation(api.board.move);
  const assign = useMutation(api.board.assign);
  const remove = useMutation(api.board.removePosition);
  const [dialog, setDialog] = useState<"appoint" | "edit" | "remove" | null>(null);
  const glyph = position.subject ? subjectArt(position.subject)?.glyph : undefined;
  const person = position.person;

  return (
    <li className="grid items-center gap-x-4 gap-y-2 py-3.5 sm:grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1fr)_auto]">
      <div className="flex gap-1 max-sm:hidden">
        <Button
          variant="ghost"
          size="icon-xs"
          disabled={first}
          aria-label={`Move ${position.title} up`}
          onClick={() => void attempt(() => move({ positionId: position._id, direction: "up" }), "Moved up")}
        >
          <ArrowUpIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          disabled={last}
          aria-label={`Move ${position.title} down`}
          onClick={() => void attempt(() => move({ positionId: position._id, direction: "down" }), "Moved down")}
        >
          <ArrowDownIcon />
        </Button>
      </div>
      <p className="flex items-center gap-2 text-sm font-medium">
        {glyph ? <Glyph name={glyph} className="size-4" /> : null}
        {position.title}
      </p>
      <div className="min-w-0 text-sm">
        {person ? (
          <>
            <p className="truncate">
              {person.handle ? (
                <Link href={`/people/${person.handle}`} target="_blank" className="underline-offset-4 hover:underline">
                  {person.name}
                </Link>
              ) : (
                person.name
              )}
              {person.hasAccount ? null : <span className="text-muted-foreground"> (invited)</span>}
            </p>
            <p className="truncate text-muted-foreground">{person.affiliation ?? person.email}</p>
          </>
        ) : (
          <p className="meta-label text-muted-foreground">Open position</p>
        )}
      </div>
      <div className="flex items-center gap-2 sm:justify-end">
        <Button variant="outline" size="sm" onClick={() => setDialog("appoint")}>
          {person ? "Change" : "Appoint"}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`More for ${position.title}`}>
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setDialog("edit")}>Edit position</DropdownMenuItem>
            {person ? (
              <DropdownMenuItem
                onSelect={() =>
                  void attempt(() => assign({ positionId: position._id }), `${person.name} is off the board`)
                }
              >
                Leave the position open
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setDialog("remove")}>
              Remove position
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AppointDialog position={position} open={dialog === "appoint"} onOpenChange={(open) => setDialog(open ? "appoint" : null)} />
      <PositionDialog position={position} open={dialog === "edit"} onOpenChange={(open) => setDialog(open ? "edit" : null)} />
      <AlertDialog open={dialog === "remove"} onOpenChange={(open) => setDialog(open ? "remove" : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove “{position.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {person
                ? `${person.name} comes off the board. Their account and roles don’t change.`
                : "The open position comes off the Who we are page."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void attempt(() => remove({ positionId: position._id }), "Position removed")}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

/** Add a position, or with `position` edit one. */
function PositionDialog({
  position,
  open,
  onOpenChange,
}: {
  position?: Position;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const id = useId();
  const add = useMutation(api.board.addPosition);
  const update = useMutation(api.board.updatePosition);
  const initial = { group: position?.group ?? ("section" as BoardGroupKey), title: position?.title ?? "", subject: position?.subject ?? "" };
  const [fields, setFields] = useState(initial);
  const [pending, setPending] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) setFields(initial);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{position ? "Edit position" : "Add a position"}</DialogTitle>
          <DialogDescription>
            The title shows above the person’s name. A specialty gives the position its glyph.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            const subject = fields.subject || undefined;
            const ok = await attempt(
              () =>
                position
                  ? update({ positionId: position._id, group: fields.group, title: fields.title, subject: subject ?? null })
                  : add({ group: fields.group, title: fields.title, subject }),
              position ? "Position updated" : "Position added",
            );
            setPending(false);
            if (ok) onOpenChange(false);
          }}
        >
          <FormField label="Title" htmlFor={`${id}-title`}>
            <Input
              id={`${id}-title`}
              value={fields.title}
              required
              placeholder="Section editor, cardiology"
              onChange={(e) => setFields({ ...fields, title: e.target.value })}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Group" htmlFor={`${id}-group`}>
              <Select value={fields.group} onValueChange={(group) => setFields({ ...fields, group: group as BoardGroupKey })}>
                <SelectTrigger id={`${id}-group`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {boardGroupOrder.map((g) => (
                    <SelectItem key={g} value={g}>
                      {boardGroups[g].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Specialty" htmlFor={`${id}-subject`} optional>
              <Select value={fields.subject || "none"} onValueChange={(s) => setFields({ ...fields, subject: s === "none" ? "" : s })}>
                <SelectTrigger id={`${id}-subject`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
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
            <Button type="submit" disabled={pending || !fields.title.trim()}>
              {position ? "Save" : "Add position"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AppointDialog({
  position,
  open,
  onOpenChange,
}: {
  position: Position;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const id = useId();
  const assign = useMutation(api.board.assign);
  const [query, setQuery] = useState("");
  const term = useDebounced(query.trim(), 250);
  const results = useQuery(api.users.search, open && term.length >= 2 ? { query: term } : "skip");
  const [pending, setPending] = useState<Id<"users"> | null>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setQuery("");
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Appoint to “{position.title}”</DialogTitle>
          <DialogDescription>
            Search everyone with an account or an invitation. Someone new? Add them on{" "}
            <Link href="/dashboard/people" className="underline underline-offset-2">
              People and roles
            </Link>{" "}
            first.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={`${id}-search`}
            aria-label="Search people"
            placeholder="Name, email or affiliation"
            value={query}
            autoFocus
            className="pl-9"
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="max-h-72 overflow-y-auto">
          {term.length < 2 ? (
            <p className="py-4 text-sm text-muted-foreground">Type at least two letters.</p>
          ) : results === undefined ? (
            <p className="py-4 text-sm text-muted-foreground">Searching…</p>
          ) : results.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No one matches that search.</p>
          ) : (
            <ul className="divide-y border-y">
              {results.map((person) => (
                <li key={person._id} className="flex items-center justify-between gap-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{person.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {[person.email, person.affiliation].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={position.person?._id === person._id ? "secondary" : "outline"}
                    disabled={pending !== null || position.person?._id === person._id}
                    onClick={async () => {
                      setPending(person._id);
                      const ok = await attempt(
                        () => assign({ positionId: position._id, userId: person._id }),
                        `${person.name} appointed`,
                      );
                      setPending(null);
                      if (ok) onOpenChange(false);
                    }}
                  >
                    {position.person?._id === person._id ? "Appointed" : "Appoint"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
