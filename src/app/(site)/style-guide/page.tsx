import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SUBJECT_ART, TYPE_ART } from "@/components/art/catalog";
import { Glyph } from "@/components/art/glyph";
import type { GlyphName } from "@/components/art/glyph-paths";
import { Plate, toneColor, type PlateTone } from "@/components/art/plate";
import { Scene } from "@/components/art/scene";
import type { SceneName } from "@/components/art/scene-paths";
import { Replay } from "@/components/motion/replay";
import { CoverCredit, CoverImage } from "@/components/site/cover-image";
import type { CoverName } from "@/components/site/cover-images";
import { SectionHeading } from "@/components/site/section-heading";
import { Button } from "@/components/ui/button";
import { articleTypes, subjects, type ArticleTypeKey } from "@/config/journal";

export const metadata: Metadata = {
  title: "Style guide",
  description: "The journal's colours, type, glyphs, illustrations and motion.",
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
  { name: "closeReading", title: "Close reading", where: "Article list, before anything is published" },
  { name: "manuscript", title: "Manuscript", where: "Home page for-authors band; guide for authors" },
  { name: "helix", title: "Helix", where: "About the journal" },
  { name: "breath", title: "Breath", where: "Issue archive, before the first issue" },
  { name: "emptySlide", title: "Empty slide", where: "Page not found" },
];

const COVER_USES: { name: CoverName; where: string }[] = [
  { name: "spiraea", where: "Home page cover" },
  { name: "forearms", where: "Sign in" },
  { name: "fern", where: "Create an account" },
];

const MOTION = [
  { token: "--duration-fast", value: "120 ms", role: "Hover and press feedback; the old page fading out" },
  { token: "--duration-base", value: "200 ms", role: "Arrows leaning toward their link; the menu closing" },
  { token: "--duration-slow", value: "320 ms", role: "Underlines drawing in, the menu opening, the next page fading in" },
  { token: "--duration-reveal", value: "720 ms", role: "Text and plates arriving" },
  { token: "--duration-draw", value: "1100 ms", role: "Each ink line drawing itself" },
  { token: "--duration-develop", value: "1600 ms", role: "A cover image developing" },
] as const;

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
          colour code. The glyphs and illustrations are drawn for the journal and live in the
          code, so they stay sharp at any size. The cover images are public-domain works from
          The Met. Motion follows the printing of an atlas.
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
              <Plate glyph={TYPE_ART[t].glyph} tone={TYPE_ART[t].tone} width={160} height={120} scale={0.6} stroke={2.6} draw />
              <p className="mt-2.5 text-sm">{articleTypes[t].label}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="covers" title="Cover images">
        <p className="max-w-2xl text-muted-foreground">
          Full-bleed images are historical science and natural history from The Met’s Open
          Access collection: public domain, cropped to the artwork, and credited wherever they
          appear.
        </p>
        <ul className="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {COVER_USES.map((c) => (
            <li key={c.name}>
              <CoverImage name={c.name} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw" className="aspect-[3/4]" />
              <p className="meta-label mt-4 text-foreground">{c.where}</p>
              <CoverCredit name={c.name} className="mt-1.5 text-sm text-muted-foreground" />
            </li>
          ))}
        </ul>
      </Section>

      <Section id="scenes" title="Scenes">
        <ul className="grid gap-x-10 gap-y-12 md:grid-cols-2">
          {SCENES.map((s) => (
            <li key={s.name}>
              <div className="max-w-[32rem]">
                <Scene name={s.name} draw />
              </div>
              <p className="meta-label mt-4 text-foreground">{s.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.where}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="motion" title="Motion">
        <p className="max-w-2xl text-muted-foreground">
          Things arrive the way an atlas is printed: rules are ruled, plates are laid down and
          inked a line at a time, and cover images develop out of the paper. Each plays once, as
          it comes into view, and nothing loops. Feedback on hover and press is quick. With
          reduced motion turned on, everything appears in its final state.
        </p>
        <div className="mt-8">
          <Replay>
            <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              <figure>
                <Plate glyph="cardiology" tone="artery" width={240} height={180} draw />
                <figcaption className="meta-label mt-4 text-foreground">A plate is printed</figcaption>
              </figure>
              <figure>
                <CoverImage name="spiraea" sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw" develop className="aspect-[4/3]" />
                <figcaption className="meta-label mt-4 text-foreground">A cover develops</figcaption>
              </figure>
              <figure className="flex flex-col justify-end gap-6 sm:col-span-2 lg:col-span-1">
                <SectionHeading href="/style-guide#motion" linkLabel="Hover me">
                  A section is ruled
                </SectionHeading>
                <p className="font-serif text-title leading-snug">
                  <a href="#motion" className="ink-link">
                    Titles underline themselves as you point at them, a line at a time
                  </a>
                </p>
              </figure>
            </div>
          </Replay>
        </div>
        <ul className="mt-10 divide-y border-y">
          {MOTION.map((m) => (
            <li key={m.token} className="grid gap-1 py-3 sm:grid-cols-[14rem_6rem_1fr] sm:gap-6">
              <span className="font-mono text-xs leading-6">{m.token}</span>
              <span className="text-sm leading-6">{m.value}</span>
              <span className="text-sm leading-6 text-muted-foreground">{m.role}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
          Arrivals ease out hard and settle (<code className="font-mono text-xs">ease-out-quint</code>);
          underlines and developing covers ease out more evenly, so you see them travel (
          <code className="font-mono text-xs">ease-out-cubic</code>); drawn lines start and finish gently,
          like a pen (<code className="font-mono text-xs">ease-in-out-cubic</code>).
        </p>
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
