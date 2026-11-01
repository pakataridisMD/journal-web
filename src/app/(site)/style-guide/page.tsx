import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SUBJECT_ART, TYPE_ART } from "@/components/art/catalog";
import { Glyph } from "@/components/art/glyph";
import type { GlyphName } from "@/components/art/glyph-paths";
import { Plate, toneColor, type PlateTone } from "@/components/art/plate";
import { Scene } from "@/components/art/scene";
import type { SceneName } from "@/components/art/scene-paths";
import { SectionHeading } from "@/components/site/section-heading";
import { Button } from "@/components/ui/button";
import { articleTypes, subjects, type ArticleTypeKey } from "@/config/journal";

export const metadata: Metadata = {
  title: "Style guide",
  description: "The journal's colours, type, glyphs and illustrations.",
  robots: { index: false, follow: false },
};

const INTERFACE = [
  { name: "Paper", token: "--paper", value: "#f8f6f1", role: "Page canvas" },
  { name: "Ink", token: "--ink", value: "#161512", role: "Text, rules, primary buttons" },
  { name: "Card", token: "--card", value: "#fffefb", role: "Cards, inputs, menus" },
  { name: "Panel", token: "--muted", value: "#ede9e1", role: "Quiet panels, covers" },
  { name: "Muted ink", token: "--muted-foreground", value: "#67625a", role: "Secondary text" },
  { name: "Hairline", token: "--border", value: "#dcd6cb", role: "Layout rules" },
  { name: "Vermillion", token: "--brand", value: "#f05a36", role: "Primary action, active nav, logo only" },
] as const;

const TONES: { tone: PlateTone; name: string; value: string; stands: string }[] = [
  { tone: "artery", name: "Artery", value: "#ec6240", stands: "Heart, blood, emergencies" },
  { tone: "vein", name: "Vein", value: "#7e99d6", stands: "Lungs, kidneys, populations" },
  { tone: "nerve", name: "Nerve", value: "#eec453", stands: "Brain, mind, children" },
  { tone: "lymph", name: "Lymph", value: "#89ba97", stands: "Infection, gut, glands" },
  { tone: "eosin", name: "Eosin", value: "#f0a4b1", stands: "Skin, cells, reproduction" },
  { tone: "bone", name: "Bone", value: "#e5dbca", stands: "Joints, surgery, ageing, teaching" },
];

const SCENES: { name: SceneName; title: string; where: string }[] = [
  { name: "closeReading", title: "Close reading", where: "Home page while the journal is empty; sign-in" },
  { name: "manuscript", title: "Manuscript", where: "Home page for-authors band; guide for authors" },
  { name: "helix", title: "Helix", where: "About the journal" },
  { name: "breath", title: "Breath", where: "Create an account" },
  { name: "emptySlide", title: "Empty slide", where: "Page not found" },
];

const TYPE_KEYS = Object.keys(articleTypes) as ArticleTypeKey[];

/** The design system on one page, for editors and anyone extending the site. */
export default function StyleGuidePage() {
  return (
    <div className="page-container pb-24">
      <header className="border-b py-10 md:py-14">
        <p className="meta-label text-muted-foreground">Design</p>
        <h1 className="mt-3 font-serif text-headline md:text-display">Style guide</h1>
        <p className="mt-5 max-w-2xl font-serif text-[1.1875rem] leading-relaxed text-pretty">
          A modern anatomical atlas: warm paper, black ink, and cut-paper plates in an atlas’s
          colour code. Everything here is drawn for the journal and lives in the code, so it
          stays sharp at any size.
        </p>
      </header>

      <Section id="colour" title="Colour">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <p className="meta-label text-muted-foreground">Interface</p>
            <ul className="mt-4 divide-y border-y">
              {INTERFACE.map((c) => (
                <Swatch key={c.token} color={c.value} name={c.name} detail={`${c.token} · ${c.value}`} role={c.role} />
              ))}
            </ul>
          </div>
          <div>
            <p className="meta-label text-muted-foreground">Plates (illustration only)</p>
            <ul className="mt-4 divide-y border-y">
              {TONES.map((t) => (
                <Swatch
                  key={t.tone}
                  color={toneColor(t.tone)}
                  name={t.name}
                  detail={`--plate-${t.tone} · ${t.value}`}
                  role={t.stands}
                />
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section id="type" title="Type">
        <div className="divide-y border-y">
          <TypeSample label="Display · Newsreader light">
            <p className="font-serif text-headline md:text-display">Early mobilization after hip fracture</p>
          </TypeSample>
          <TypeSample label="Title · Newsreader">
            <p className="font-serif text-title">Deprescribing in older adults with polypharmacy</p>
          </TypeSample>
          <TypeSample label="Reading · Newsreader 19px">
            <p className="max-w-2xl font-serif text-[1.1875rem] leading-relaxed">
              Independent walking at 30 days was achieved by 61.2% of patients in the early group and
              52.4% in the usual-care group.
            </p>
          </TypeSample>
          <TypeSample label="Interface · Schibsted Grotesk">
            <p className="max-w-2xl text-base">
              Submit a manuscript, follow peer review and publish open access.{" "}
              <span className="font-medium">Medium for emphasis.</span>{" "}
              <span className="font-semibold">Semibold for labels.</span>
            </p>
          </TypeSample>
          <TypeSample label="Metadata · IBM Plex Mono">
            <p className="meta-label">Original research · 12 Oct 2026 · Vol 1 · No 1</p>
          </TypeSample>
          <TypeSample label="Actions">
            <div className="flex flex-wrap gap-3">
              <Button variant="brand">Submit a manuscript</Button>
              <Button>Primary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
          </TypeSample>
        </div>
      </Section>

      <Section id="glyphs" title="Glyphs">
        <p className="max-w-2xl text-muted-foreground">
          One glyph for every specialty and article type, drawn on a 48-unit grid with round
          ends. At text sizes they take the colour of the text around them; set large, they sit
          on a plate with their paper cut-out under the ink.
        </p>
        <p className="meta-label mt-8 text-muted-foreground">Specialties</p>
        <GlyphGrid items={subjects.map((s) => ({ key: s, glyph: SUBJECT_ART[s].glyph, label: s }))} />
        <p className="meta-label mt-10 text-muted-foreground">Article types</p>
        <GlyphGrid items={TYPE_KEYS.map((t) => ({ key: t, glyph: TYPE_ART[t].glyph, label: articleTypes[t].label }))} />
      </Section>

      <Section id="plates" title="Plates">
        <p className="max-w-2xl text-muted-foreground">
          A grainy coloured field cut by hand, the glyph’s paper silhouette printed slightly off
          register, and the ink on top. Each plate is cut the same way every time.
        </p>
        <ul className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-7">
          {TYPE_KEYS.map((t) => (
            <li key={t}>
              <Plate glyph={TYPE_ART[t].glyph} tone={TYPE_ART[t].tone} width={160} height={120} scale={0.6} stroke={2.6} />
              <p className="mt-2.5 text-sm">{articleTypes[t].label}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="scenes" title="Scenes">
        <ul className="grid gap-x-10 gap-y-12 md:grid-cols-2">
          {SCENES.map((s) => (
            <li key={s.name}>
              <div className="max-w-[32rem]">
                <Scene name={s.name} />
              </div>
              <p className="meta-label mt-4 text-foreground">{s.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.where}</p>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-heading`} className="pt-14">
      <SectionHeading id={`${id}-heading`}>{title}</SectionHeading>
      <div className="mt-8">{children}</div>
    </section>
  );
}

function Swatch({ color, name, detail, role }: { color: string; name: string; detail: string; role: string }) {
  return (
    <li className="flex items-center gap-4 py-3">
      <span aria-hidden className="size-10 shrink-0 rounded-card border" style={{ background: color }} />
      <span className="min-w-0">
        <span className="block font-medium">{name}</span>
        <span className="block font-mono text-xs text-muted-foreground">{detail}</span>
      </span>
      <span className="ml-auto text-right text-sm text-muted-foreground">{role}</span>
    </li>
  );
}

function TypeSample({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-3 py-6 md:grid-cols-[17rem_1fr] md:gap-8">
      <p className="meta-label pt-1 text-muted-foreground">{label}</p>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function GlyphGrid({ items }: { items: { key: string; glyph: GlyphName; label: string }[] }) {
  return (
    <ul className="mt-4 grid grid-cols-2 border-t border-l sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
      {items.map((item) => (
        <li key={item.key} className="flex flex-col items-start gap-4 border-r border-b p-4">
          <Glyph name={item.glyph} className="size-10 [--glyph-stroke:1.75px]" />
          <span className="text-sm leading-snug">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
