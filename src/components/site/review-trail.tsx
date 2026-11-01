import { formatDate } from "@/lib/format";

type Trail = {
  receivedAt?: number;
  revisedAt?: number;
  acceptedAt?: number;
  publishedAt: number;
};

/** The article's path through peer review, shown as dated steps. */
export function ReviewTrail({ article }: { article: Trail }) {
  const steps = [
    { label: "Received", at: article.receivedAt },
    { label: "Revised", at: article.revisedAt },
    { label: "Accepted", at: article.acceptedAt },
    { label: "Published", at: article.publishedAt },
  ].filter((s): s is { label: string; at: number } => typeof s.at === "number");
  return (
    <ol className="relative space-y-3.5 border-l border-foreground pl-4">
      {steps.map((step, i) => (
        <li key={step.label} className="relative">
          <span
            aria-hidden
            className={
              i === steps.length - 1
                ? "absolute top-[0.4rem] -left-[21px] size-2.5 bg-foreground"
                : "absolute top-[0.4rem] -left-[21px] size-2.5 border border-foreground bg-background"
            }
          />
          <p className="meta-label text-muted-foreground">{step.label}</p>
          <p className="text-sm">
            <time dateTime={new Date(step.at).toISOString()}>{formatDate(step.at)}</time>
          </p>
        </li>
      ))}
    </ol>
  );
}
