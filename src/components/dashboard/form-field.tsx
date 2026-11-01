import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Label, hint, control and message, stacked. */
export function FormField({
  label,
  htmlFor,
  hint,
  hintId,
  optional,
  aside,
  error,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  /** Give the hint an id so the control can point at it with aria-describedby. */
  hintId?: string;
  optional?: boolean;
  /** Right-aligned beside the label, e.g. a character count. */
  aside?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <Label htmlFor={htmlFor} className="leading-snug">
          {label}
          {optional ? <span className="font-normal text-muted-foreground">(optional)</span> : null}
        </Label>
        {aside}
      </div>
      {hint ? (
        <p id={hintId} className="text-sm leading-snug text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Counter({ value, max, unit }: { value: number; max: number; unit: string }) {
  const over = value > max;
  return (
    <span className={cn("shrink-0 text-xs tabular-nums", over ? "font-medium text-destructive" : "text-muted-foreground")}>
      {value.toLocaleString("en-US")} / {max.toLocaleString("en-US")} {unit}
    </span>
  );
}
