import { SUBJECT_ART, type Subject } from "@/components/art/catalog";
import { Plate } from "@/components/art/plate";

/** Where each plate sits, as a share of the box, and how it is turned. */
const LAYOUT: readonly { subject: Subject; left: number; top: number; width: number; turn: number }[] = [
  { subject: "Cardiology", left: 2, top: 4, width: 46, turn: -3 },
  { subject: "Neurology", left: 52, top: 0, width: 44, turn: 2.5 },
  { subject: "Respiratory medicine", left: 27, top: 37, width: 44, turn: -1 },
  { subject: "Infectious diseases", left: 0, top: 60, width: 34, turn: 4 },
  { subject: "Obstetrics and gynecology", left: 66, top: 55, width: 34, turn: -4 },
];

/**
 * Specialty plates laid over one another like cuttings on a desk: the
 * editors' fields, side by side. Decorative.
 */
export function PlateCluster() {
  return (
    <div aria-hidden="true" className="relative aspect-[7/6] w-full">
      {LAYOUT.map(({ subject, left, top, width, turn }) => {
        const art = SUBJECT_ART[subject];
        return (
          <div
            key={subject}
            className="absolute"
            style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, transform: `rotate(${turn}deg)` }}
          >
            <Plate glyph={art.glyph} tone={art.tone} width={220} height={176} scale={0.6} stroke={2.8} />
          </div>
        );
      })}
    </div>
  );
}
