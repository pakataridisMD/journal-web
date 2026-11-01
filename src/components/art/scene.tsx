import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { GRAIN_FILTER, ROUGH_FILTER } from "./art-defs";
import { GLYPHS } from "./glyph-paths";
import { toneColor } from "./plate";
import { SCENES, type Layer, type SceneName, type SceneSpec } from "./scene-paths";

const list = (d: string | readonly string[]) => (typeof d === "string" ? [d] : d);

/**
 * One of the journal's illustrations (see scene-paths.ts), drawn as cut
 * paper and ink. Decorative by default; pass `label` to describe it.
 * Scales to the width of its box.
 */
export function Scene({ name, label, className }: { name: SceneName; label?: string; className?: string }) {
  const spec: SceneSpec = SCENES[name];
  // Clip-path ids must be unique on the page, even with a scene shown twice.
  const prefix = `scene${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  let clipCount = 0;

  /** `scale` is the product of the enclosing groups' scales, so strokes keep their weight. */
  function render(layer: Layer, key: number, scale: number): ReactNode {
    switch (layer.kind) {
      case "field":
        return <path key={key} d={layer.d} style={{ fill: toneColor(layer.tone) }} filter={GRAIN_FILTER} />;
      case "paper": {
        const [dx, dy] = layer.offset ?? [0, 0];
        return (
          <g key={key} transform={`translate(${dx} ${dy})`} style={{ fill: toneColor(layer.tone ?? "paper") }}>
            {list(layer.d).map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
        );
      }
      case "ink":
        return (
          <g
            key={key}
            filter={ROUGH_FILTER}
            fill="none"
            strokeWidth={(layer.w ?? spec.stroke) / scale}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ stroke: layer.tone ? toneColor(layer.tone) : "var(--ink)" }}
          >
            {list(layer.d).map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
        );
      case "glyph": {
        const glyph = GLYPHS[layer.name];
        const unit = layer.size / 48;
        const turn = "rotate" in glyph ? ` rotate(${glyph.rotate} 24 24)` : "";
        const paper = "paper" in glyph ? glyph.paper : [];
        return (
          <g key={key} transform={`translate(${layer.x} ${layer.y}) scale(${unit})`}>
            <g transform={`translate(-1.1 0.9)${turn}`} style={{ fill: "var(--paper)" }}>
              {paper.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>
            <g filter={ROUGH_FILTER}>
              <g
                transform={turn || undefined}
                fill="none"
                strokeWidth={(layer.w ?? spec.stroke) / (scale * unit)}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ stroke: "var(--ink)" }}
              >
                {glyph.ink.map((d, i) => (
                  <path key={i} d={d} />
                ))}
              </g>
            </g>
          </g>
        );
      }
      case "group": {
        const transform = `translate(${layer.x ?? 0} ${layer.y ?? 0}) rotate(${layer.rotate ?? 0}) scale(${layer.scale ?? 1})`;
        const inner = layer.layers.map((child, i) => render(child, i, scale * (layer.scale ?? 1)));
        if (!layer.clip) {
          return (
            <g key={key} transform={transform}>
              {inner}
            </g>
          );
        }
        const clipId = `${prefix}-clip${clipCount++}`;
        return (
          <g key={key} transform={transform}>
            <clipPath id={clipId}>
              <path d={layer.clip} />
            </clipPath>
            <g clipPath={`url(#${clipId})`}>{inner}</g>
          </g>
        );
      }
    }
  }

  return (
    <svg
      viewBox={`0 0 ${spec.width} ${spec.height}`}
      focusable="false"
      className={cn("block h-auto w-full", className)}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      {spec.layers.map((layer, i) => render(layer, i, 1))}
    </svg>
  );
}
