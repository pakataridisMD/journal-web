import { orcidUrl } from "@/convex/lib/orcid";
import { cn } from "@/lib/utils";

/**
 * The ORCID iD icon, exactly as ORCID supplies it (orcid-angular,
 * src/assets/vectors/orcid.logo.icon.svg). ORCID's display guidelines ask
 * that it isn't redrawn or recoloured.
 */
export function OrcidIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 72 72" aria-hidden="true" focusable="false" className={cn("size-6 shrink-0", className)}>
      <path
        d="M72,36 C72,55.884375 55.884375,72 36,72 C16.115625,72 0,55.884375 0,36 C0,16.115625 16.115625,0 36,0 C55.884375,0 72,16.115625 72,36 Z"
        fill="#A6CE39"
      />
      <g transform="translate(18.868966, 12.910345)" fill="#FFFFFF">
        <polygon points="5.03734929 39.1250878 0.695429861 39.1250878 0.695429861 9.14431787 5.03734929 9.14431787 5.03734929 22.6930505 5.03734929 39.1250878" />
        <path d="M11.409257,9.14431787 L23.1380784,9.14431787 C34.303014,9.14431787 39.2088191,17.0664074 39.2088191,24.1486995 C39.2088191,31.846843 33.1470485,39.1530811 23.1944669,39.1530811 L11.409257,39.1530811 L11.409257,9.14431787 Z M15.7511765,35.2620194 L22.6587756,35.2620194 C32.49858,35.2620194 34.7541226,27.8438084 34.7541226,24.1486995 C34.7541226,18.1301509 30.8915059,13.0353795 22.4332213,13.0353795 L15.7511765,13.0353795 L15.7511765,35.2620194 Z" />
        <path d="M5.71401206,2.90182329 C5.71401206,4.441452 4.44526937,5.72914146 2.86638958,5.72914146 C1.28750978,5.72914146 0.0187670918,4.441452 0.0187670918,2.90182329 C0.0187670918,1.33420133 1.28750978,0.0745051096 2.86638958,0.0745051096 C4.44526937,0.0745051096 5.71401206,1.36219458 5.71401206,2.90182329 Z" />
      </g>
    </svg>
  );
}

/**
 * An ORCID iD in ORCID's "full" display format: the icon and the whole
 * https address. An iD the person didn't prove by signing in to ORCID is
 * marked "(unauthenticated)", as the guidelines ask.
 */
export function OrcidId({
  orcid,
  authenticated,
  name,
  className,
}: {
  orcid: string;
  authenticated: boolean;
  name?: string;
  className?: string;
}) {
  const url = orcidUrl(orcid);
  return (
    <a
      href={url}
      rel="noopener noreferrer"
      target="_blank"
      aria-label={`ORCID record${name ? ` for ${name}` : ""}: ${url}${authenticated ? "" : " (unauthenticated)"}`}
      className={cn("inline-flex items-center gap-2 text-sm underline-offset-4 hover:underline", className)}
    >
      {authenticated ? <OrcidIcon className="size-5" /> : null}
      <span className="font-mono text-[0.8125rem] break-all">{url}</span>
      {authenticated ? null : <span className="text-muted-foreground">(unauthenticated)</span>}
    </a>
  );
}
