/**
 * Cut-paper shapes. Every plate gets its own slightly crooked field, cut by a
 * seeded generator so the same plate is cut the same way on every render
 * (server and client agree, and nothing shifts between visits).
 */

/** A small linear congruential generator: deterministic, good enough for art. */
export function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

/** A stable 32-bit seed from a string (FNV-1a). */
export function seedFrom(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

const round = (n: number) => Math.round(n * 10) / 10;

/**
 * A sheet cut by hand: a quadrilateral whose corners wander a little from
 * the inset rectangle, with two or three slight kinks along each edge.
 * Returns an SVG path in a `width` × `height` box.
 */
export function cutPaperField(width: number, height: number, seed: number, inset = 0.06): string {
  const random = rng(seed);
  const jitter = (n: number) => (random() - 0.5) * n;
  const corners: [number, number][] = [
    [width * inset + jitter(width * 0.06), height * inset + jitter(height * 0.06)],
    [width * (1 - inset) + jitter(width * 0.06), height * inset + jitter(height * 0.06)],
    [width * (1 - inset) + jitter(width * 0.06), height * (1 - inset) + jitter(height * 0.06)],
    [width * inset + jitter(width * 0.06), height * (1 - inset) + jitter(height * 0.06)],
  ];
  const kink = Math.min(width, height) * 0.025;
  const points: [number, number][] = [];
  for (let i = 0; i < 4; i++) {
    const [x1, y1] = corners[i];
    const [x2, y2] = corners[(i + 1) % 4];
    points.push([x1, y1]);
    const steps = 2 + Math.floor(random() * 2);
    // Unit normal of the edge, to push the kinks in or out.
    const length = Math.hypot(x2 - x1, y2 - y1);
    const nx = -(y2 - y1) / length;
    const ny = (x2 - x1) / length;
    for (let k = 1; k <= steps; k++) {
      const t = k / (steps + 1);
      const off = jitter(kink);
      points.push([x1 + (x2 - x1) * t + nx * off, y1 + (y2 - y1) * t + ny * off]);
    }
  }
  return `M${points.map(([x, y]) => `${round(x)} ${round(y)}`).join("L")}Z`;
}
