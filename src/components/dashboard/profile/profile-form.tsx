"use client";

import { useMutation, useQuery } from "convex/react";
import { ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { refreshPeople } from "@/app/actions";
import { subjectArt } from "@/components/art/catalog";
import { Glyph } from "@/components/art/glyph";
import { Portrait } from "@/components/site/people/portrait";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { profileRules, subjects } from "@/config/journal";
import { api } from "@/convex/_generated/api";
import { handleProblem, LINK_KINDS, LINK_ORDER, normalizeLink } from "@/convex/lib/profileFields";
import { isValidOrcid } from "@/convex/lib/text";
import type { LinkKind } from "@/convex/lib/validators";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { Counter, FormField } from "../form-field";
import { PageHeader } from "../page-header";
import { PageSkeleton } from "../page-skeleton";
import { roleNames } from "../roles";
import { useViewer } from "../viewer-context";
import { OrcidPanel, type MyProfile } from "./orcid-panel";

type Form = {
  name: string;
  affiliation: string;
  credentials: string;
  orcid: string;
  handle: string;
  isPublic: boolean;
  bio: string;
  expertise: string[];
  keywords: string;
  links: Record<LinkKind, string>;
  showPhoto: boolean;
  showOrcidWorks: boolean;
  showMetrics: boolean;
  listAsReviewer: boolean;
};

function toForm(viewer: { name: string; affiliation?: string; orcid?: string }, mine: MyProfile): Form {
  const links = Object.fromEntries(LINK_ORDER.map((k) => [k, ""])) as Record<LinkKind, string>;
  for (const link of mine.links) links[link.kind] = link.url;
  return {
    name: viewer.name,
    affiliation: viewer.affiliation ?? "",
    credentials: mine.credentials,
    orcid: mine.orcid && !mine.orcid.authenticated ? mine.orcid.id : "",
    handle: mine.handle,
    isPublic: mine.isPublic,
    bio: mine.bio,
    expertise: mine.expertise,
    keywords: mine.keywords.join(", "),
    links,
    showPhoto: mine.showPhoto,
    showOrcidWorks: mine.showOrcidWorks,
    showMetrics: mine.showMetrics,
    listAsReviewer: mine.listAsReviewer,
  };
}

const splitKeywords = (text: string) =>
  text
    .split(/[,;\n]/)
    .map((k) => k.trim())
    .filter(Boolean);

/** Problems to show before saving; the server checks the same rules. */
function problems(form: Form, authenticated: boolean) {
  const keywords = splitKeywords(form.keywords);
  const links: Partial<Record<LinkKind, string>> = {};
  for (const kind of LINK_ORDER) {
    const value = form.links[kind].trim();
    if (!value) continue;
    const result = normalizeLink(kind, value);
    if (!result.ok) links[kind] = result.message;
  }
  return {
    name: form.name.trim() ? null : "Enter your name.",
    handle: handleProblem(form.handle.trim().toLowerCase()),
    orcid: !authenticated && form.orcid.trim() && !isValidOrcid(form.orcid.trim().toUpperCase()) ? "That ORCID iD isn't valid." : null,
    bio: form.bio.trim().length > profileRules.maxBio ? `Keep it under ${profileRules.maxBio} characters.` : null,
    credentials: form.credentials.trim().length > profileRules.maxCredentials ? "That’s too long." : null,
    keywords:
      keywords.length > profileRules.maxKeywords
        ? `Up to ${profileRules.maxKeywords} keywords.`
        : keywords.some((k) => k.length > profileRules.maxKeywordLength)
          ? `Keep each keyword under ${profileRules.maxKeywordLength} characters.`
          : null,
    links,
  };
}

export function ProfileForm() {
  const viewer = useViewer();
  const mine = useQuery(api.profiles.mine, {});
  if (mine === undefined) return <PageSkeleton label="Loading your profile…" />;
  return <ProfileEditor key={viewer._id} mine={mine} />;
}

function ProfileEditor({ mine }: { mine: MyProfile }) {
  const id = useId();
  const viewer = useViewer();
  const save = useMutation(api.profiles.save);
  const baseline = toForm(viewer, mine);
  const [edited, setEdited] = useState<Form | null>(null);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const form = edited ?? baseline;
  const dirty = edited !== null && JSON.stringify(edited) !== JSON.stringify(baseline);
  const authenticated = mine.orcid?.authenticated === true;
  const issues = problems(form, authenticated);
  const blocked =
    Boolean(issues.name || issues.handle || issues.orcid || issues.bio || issues.credentials || issues.keywords) ||
    Object.keys(issues.links).length > 0;

  const set = (patch: Partial<Form>) => setEdited({ ...form, ...patch });
  const touch = (key: string) => setTouched((t) => (t.has(key) ? t : new Set(t).add(key)));
  const shown = (key: string, message: string | null | undefined) => (touched.has(key) ? message : null);

  async function onSubmit() {
    setTouched(new Set(["name", "handle", "orcid", "keywords", ...LINK_ORDER.map((k) => `link:${k}`)]));
    if (blocked) {
      toast.error("Check the highlighted fields.");
      return;
    }
    setPending(true);
    try {
      const { handle } = await save({
        name: form.name,
        affiliation: form.affiliation,
        credentials: form.credentials,
        orcid: authenticated ? undefined : form.orcid,
        handle: form.handle.trim().toLowerCase(),
        isPublic: form.isPublic,
        bio: form.bio,
        expertise: form.expertise,
        keywords: splitKeywords(form.keywords),
        links: LINK_ORDER.filter((k) => form.links[k].trim()).map((kind) => ({ kind, url: form.links[kind] })),
        showPhoto: form.showPhoto,
        showOrcidWorks: form.showOrcidWorks,
        showMetrics: form.showMetrics,
        listAsReviewer: form.listAsReviewer,
      });
      setEdited(null);
      setTouched(new Set());
      toast.success("Profile saved");
      const handles = handle === mine.handle ? [handle] : [handle, mine.handle];
      refreshPeople(handles).catch((error) => console.warn("The public pages will refresh within the hour.", error));
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  function importFromOrcid(s: NonNullable<Extract<NonNullable<MyProfile["orcid"]>, { authenticated: true }>["suggestions"]>) {
    const added: string[] = [];
    const patch: Partial<Form> = {};
    if (s.biography && !form.bio.trim()) {
      patch.bio = s.biography.slice(0, profileRules.maxBio);
      added.push("bio");
    }
    if (s.affiliation && !form.affiliation.trim()) {
      patch.affiliation = s.affiliation;
      added.push("affiliation");
    }
    const keywords = splitKeywords(form.keywords);
    const lower = new Set(keywords.map((k) => k.toLowerCase()));
    const newKeywords = s.keywords.filter((k) => !lower.has(k.toLowerCase()));
    if (newKeywords.length > 0) {
      patch.keywords = [...keywords, ...newKeywords].slice(0, profileRules.maxKeywords).join(", ");
      added.push("keywords");
    }
    const links = { ...form.links };
    for (const link of s.links) {
      if (!links[link.kind].trim()) {
        links[link.kind] = link.url;
        added.push(LINK_KINDS[link.kind].label);
      }
    }
    patch.links = links;
    if (added.length === 0) {
      toast.info("Your profile already has everything your ORCID record offers.");
      return;
    }
    set(patch);
    toast.success(`Filled in ${added.join(", ")} from ORCID. Check them, then save.`);
  }

  const keywordCount = splitKeywords(form.keywords).length;
  const atExpertiseLimit = form.expertise.length >= profileRules.maxExpertise;
  const visibleNow = mine.visible;

  return (
    <>
      <PageHeader
        title="Profile"
        description="How editors see you, and how readers see you on the journal’s website if you choose."
        actions={
          visibleNow ? (
            <Button asChild variant="outline">
              <Link href={`/people/${mine.handle}`} target="_blank">
                View your public profile
                <ArrowUpRightIcon />
              </Link>
            </Button>
          ) : null
        }
      />
      <form
        noValidate
        className="grid gap-x-12 gap-y-10 pt-8 lg:grid-cols-[minmax(0,40rem)_1fr]"
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit();
        }}
      >
        <div className="min-w-0 space-y-12">
          <FormSection title="On the website">
            <ToggleRow
              id={`${id}-public`}
              label="Show my profile on the journal’s website"
              description="Readers see your name, affiliation, bio, expertise, links and the articles you published here. Your email is never shown."
              checked={form.isPublic}
              onChange={(isPublic) => set({ isPublic })}
            />
            {mine.positions.length > 0 ? (
              <p className="border-l-2 border-foreground pl-3 text-sm leading-relaxed">
                You’re on the editorial board ({mine.positions.map((p) => p.title).join(", ")}), so your profile is
                on the website whatever this switch says.
              </p>
            ) : null}
            <FormField
              label="Profile address"
              htmlFor={`${id}-handle`}
              hint="Lowercase letters, numbers and hyphens."
              error={shown("handle", issues.handle)}
            >
              <div className="flex items-stretch">
                <span className="flex items-center border border-r-0 border-input bg-muted px-3 font-mono text-[0.8125rem] text-muted-foreground">
                  /people/
                </span>
                <Input
                  id={`${id}-handle`}
                  value={form.handle}
                  className="font-mono"
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-invalid={shown("handle", issues.handle) ? true : undefined}
                  onBlur={() => touch("handle")}
                  onChange={(e) => set({ handle: e.target.value })}
                />
              </div>
            </FormField>
          </FormSection>

          <FormSection title="ORCID">
            <OrcidPanel
              orcid={mine.orcid}
              typed={form.orcid}
              onTypedChange={(orcid) => {
                touch("orcid");
                set({ orcid });
              }}
              dirty={dirty}
              onImport={importFromOrcid}
            />
          </FormSection>

          <FormSection title="Name and affiliation">
            <FormField label="Full name" htmlFor={`${id}-name`} hint="As it should appear on published articles." error={shown("name", issues.name)}>
              <Input
                id={`${id}-name`}
                value={form.name}
                required
                aria-invalid={shown("name", issues.name) ? true : undefined}
                onBlur={() => touch("name")}
                onChange={(e) => set({ name: e.target.value })}
              />
            </FormField>
            <FormField
              label="Degrees and titles"
              htmlFor={`${id}-credentials`}
              optional
              hint="Shown after your name, for example MD, PhD, FRCP."
              error={issues.credentials}
            >
              <Input id={`${id}-credentials`} value={form.credentials} onChange={(e) => set({ credentials: e.target.value })} />
            </FormField>
            <FormField label="Affiliation" htmlFor={`${id}-affiliation`} optional hint="Department, institution, city, country.">
              <Input id={`${id}-affiliation`} value={form.affiliation} onChange={(e) => set({ affiliation: e.target.value })} />
            </FormField>
          </FormSection>

          <FormSection title="About you">
            <FormField
              label="Bio"
              htmlFor={`${id}-bio`}
              optional
              hint="A few sentences on your clinical work and research. Leave a blank line between paragraphs."
              aside={<Counter value={form.bio.trim().length} max={profileRules.maxBio} unit="characters" />}
              error={issues.bio}
            >
              <Textarea
                id={`${id}-bio`}
                value={form.bio}
                rows={6}
                className="min-h-36 font-serif text-[1.0625rem] leading-relaxed md:text-[1.0625rem]"
                onChange={(e) => set({ bio: e.target.value })}
              />
            </FormField>
          </FormSection>

          <FormSection title="Expertise">
            <fieldset>
              <legend className="text-sm font-medium">
                Specialties <span className="font-normal text-muted-foreground">(up to {profileRules.maxExpertise})</span>
              </legend>
              <p className="mt-1 text-sm text-muted-foreground">Editors use these when they look for reviewers.</p>
              <ul className="mt-3 grid gap-x-4 sm:grid-cols-2">
                {subjects.map((subject) => {
                  const checked = form.expertise.includes(subject);
                  const glyph = subjectArt(subject)?.glyph;
                  return (
                    <li key={subject}>
                      <label
                        className={cn(
                          "flex items-center gap-2.5 border-b py-2 text-sm",
                          !checked && atExpertiseLimit ? "text-muted-foreground" : "cursor-pointer",
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          disabled={!checked && atExpertiseLimit}
                          onCheckedChange={(on) =>
                            set({
                              expertise: on === true ? [...form.expertise, subject] : form.expertise.filter((s) => s !== subject),
                            })
                          }
                        />
                        {glyph ? <Glyph name={glyph} className="size-4" /> : null}
                        {subject}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
            <FormField
              label="Keywords"
              htmlFor={`${id}-keywords`}
              optional
              hint="Topics you work on, separated by commas."
              aside={<Counter value={keywordCount} max={profileRules.maxKeywords} unit="keywords" />}
              error={shown("keywords", issues.keywords)}
            >
              <Input
                id={`${id}-keywords`}
                value={form.keywords}
                placeholder="frailty, falls, hip fracture"
                onBlur={() => touch("keywords")}
                onChange={(e) => set({ keywords: e.target.value })}
              />
            </FormField>
          </FormSection>

          <FormSection
            title="Profiles elsewhere"
            description="Paste your profile addresses; for most sites your ID or handle is enough. They appear as links on your profile."
          >
            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
              {LINK_ORDER.map((kind) => {
                const spec = LINK_KINDS[kind];
                const error = shown(`link:${kind}`, issues.links[kind]);
                return (
                  <FormField key={kind} label={spec.label} htmlFor={`${id}-${kind}`} optional error={error}>
                    <Input
                      id={`${id}-${kind}`}
                      value={form.links[kind]}
                      placeholder={spec.placeholder}
                      inputMode="url"
                      autoCapitalize="none"
                      spellCheck={false}
                      title={spec.hint}
                      aria-invalid={error ? true : undefined}
                      onBlur={() => touch(`link:${kind}`)}
                      onChange={(e) => set({ links: { ...form.links, [kind]: e.target.value } })}
                    />
                  </FormField>
                );
              })}
            </div>
          </FormSection>

          <FormSection title="What your profile shows">
            <ToggleRow
              id={`${id}-photo`}
              label="Your photo"
              description={
                mine.imageUrl
                  ? "From your sign-in account. Without it, your profile shows your initials."
                  : "Add a photo to your account first (account menu, top right). Until then your profile shows your initials."
              }
              checked={form.showPhoto && Boolean(mine.imageUrl)}
              disabled={!mine.imageUrl}
              onChange={(showPhoto) => set({ showPhoto })}
            />
            <ToggleRow
              id={`${id}-works`}
              label="Works and career from ORCID"
              description={
                authenticated
                  ? "Your ten most recent works, jobs and degrees, as listed on your ORCID record."
                  : "Connect your ORCID iD to show these."
              }
              checked={form.showOrcidWorks && authenticated}
              disabled={!authenticated}
              onChange={(showOrcidWorks) => set({ showOrcidWorks })}
            />
            <ToggleRow
              id={`${id}-metrics`}
              label="Research output counts"
              description={
                mine.orcid?.authenticated && mine.orcid.hasMetrics
                  ? "Works, citations and h-index, counted by OpenAlex. Off unless you turn it on: counts differ between databases and say little about any one paper."
                  : "Available once your ORCID iD is connected and OpenAlex knows your work."
              }
              checked={form.showMetrics && Boolean(mine.orcid?.authenticated && mine.orcid.hasMetrics)}
              disabled={!(mine.orcid?.authenticated && mine.orcid.hasMetrics)}
              onChange={(showMetrics) => set({ showMetrics })}
            />
            {viewer.isReviewer ? (
              <ToggleRow
                id={`${id}-reviewer`}
                label="Name me among the journal’s reviewers"
                description="Listed on the Who we are page. The manuscripts you review are never shown."
                checked={form.listAsReviewer}
                onChange={(listAsReviewer) => set({ listAsReviewer })}
              />
            ) : null}
          </FormSection>

          <FormSection title="Account">
            <FormField label="Email" htmlFor={`${id}-email`} hint="Your sign-in email. Change it from the account menu at the top right. Never shown on your profile.">
              <Input id={`${id}-email`} value={viewer.email} readOnly disabled />
            </FormField>
          </FormSection>

          <div className="sticky bottom-0 z-10 -mx-1 flex items-center justify-between gap-4 border-t bg-background px-1 py-3">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {dirty ? "You have unsaved changes." : mine.saved ? "All changes saved." : "Not saved yet."}
            </p>
            <div className="flex gap-2">
              {dirty ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEdited(null);
                    setTouched(new Set());
                  }}
                >
                  Discard
                </Button>
              ) : null}
              <Button type="submit" disabled={pending || (!dirty && mine.saved)}>
                {pending ? "Saving…" : "Save profile"}
              </Button>
            </div>
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-6 space-y-8">
            <div className="rounded-card border bg-card p-5">
              <div className="grid grid-cols-[4.5rem_1fr] items-center gap-4">
                <Portrait
                  name={form.name || viewer.name}
                  imageUrl={form.showPhoto ? mine.imageUrl : undefined}
                  expertise={form.expertise}
                />
                <div className="min-w-0">
                  <p className="font-serif text-[1.25rem] leading-tight">
                    {form.name || viewer.name}
                    {form.credentials.trim() ? <span className="text-muted-foreground">, {form.credentials.trim()}</span> : null}
                  </p>
                  {form.affiliation.trim() ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{form.affiliation}</p> : null}
                </div>
              </div>
              <p className="mt-4 flex items-center gap-2 border-t pt-3 text-sm">
                <span aria-hidden className={cn("size-2", visibleNow ? "bg-success" : "bg-muted-foreground")} />
                {visibleNow ? "On the website" : "Only editors can see this"}
              </p>
            </div>
            <div>
              <h2 className="meta-label text-muted-foreground">Your roles</h2>
              <ul className="mt-3 divide-y border-y">
                {roleNames(viewer).map((role) => (
                  <li key={role} className="py-3 text-sm">
                    {role}
                  </li>
                ))}
                {mine.positions.map((p) => (
                  <li key={p.title} className="py-3 text-sm">
                    {p.title}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-muted-foreground">Roles are given by the editors. Anyone can submit a manuscript.</p>
            </div>
          </div>
        </aside>
      </form>
    </>
  );
}

function FormSection({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="meta-label border-b border-foreground pb-2.5 text-foreground">{title}</h2>
        {description ? <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <label htmlFor={id} className={cn("text-sm font-medium", disabled && "text-muted-foreground")}>
          {label}
        </label>
        <p id={`${id}-description`} className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        aria-describedby={`${id}-description`}
        onCheckedChange={onChange}
        className="mt-0.5"
      />
    </div>
  );
}
