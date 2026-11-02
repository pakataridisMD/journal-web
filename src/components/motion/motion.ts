import type { CSSProperties } from "react";

/**
 * The public site's entrances (see "Motion" in globals.css). Each plays once,
 * as its element arrives:
 * - `rise`: the element fades up into place.
 * - `rule`: a ruled heading drawn with its ::after; the rule draws from the
 *   left, then the label fades in.
 * - `draw`: a <Plate> or <Scene> is printed: the plate is laid down, then its
 *   ink lines draw themselves. Use their `draw` prop.
 * - `develop`: a <CoverImage> develops out of the paper. Use its `develop` prop.
 */
export type Motion = "rise" | "rule" | "draw" | "develop";

export type MotionProps = { "data-motion": Motion; style?: CSSProperties };

/** Props that play the entrance `name`, `delay` ms after the element arrives. */
export function motion(name: Motion, delay = 0): MotionProps {
  return delay > 0
    ? { "data-motion": name, style: { "--motion-delay": `${Math.round(delay)}ms` } as CSSProperties }
    : { "data-motion": name };
}

/** All of a drawing's ink lines have started within this long, however many there are. */
const INK_SPREAD_MS = 840;
const INK_STEP_MS = 70;

/** Props for ink path `index` of `count` in a drawn <Plate> or <Scene>: each line draws in turn. */
export function inkPath(index: number, count: number) {
  const step = Math.min(INK_STEP_MS, INK_SPREAD_MS / Math.max(count, 1));
  return {
    pathLength: 1,
    style: { "--ink-delay": `${Math.round(index * step)}ms` } as CSSProperties,
  };
}
