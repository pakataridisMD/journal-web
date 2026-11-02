"use client";

import { useAction } from "convex/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { OrcidIcon, OrcidId } from "@/components/site/orcid";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/lib/errors";
import { ORCID_CALLBACK_PATH, ORCID_STATE_KEY, refreshAfterOrcidChange } from "./orcid-panel";

type Outcome =
  | { kind: "working" }
  | { kind: "connected"; orcid: string }
  | { kind: "declined" }
  | { kind: "failed"; message: string };

const BACK_AFTER_MS = 4000;

/**
 * Where ORCID sends people back after they sign in there. Checks the request
 * came from this browser's Connect button, trades the code for the iD, says
 * so plainly (as ORCID asks), then returns to the profile.
 */
export function OrcidCallback() {
  const params = useSearchParams();
  const router = useRouter();
  const connect = useAction(api.orcid.connect);
  // The state this browser saved before leaving for ORCID. Read once: the
  // effect below removes it so the same sign-in can't be replayed.
  const [expected] = useState(() => {
    try {
      return typeof window === "undefined" ? null : sessionStorage.getItem(ORCID_STATE_KEY);
    } catch {
      return null;
    }
  });
  const [code] = useState(() => params.get("code"));
  const [check] = useState<Outcome | null>(() => {
    if (params.get("error") === "access_denied") return { kind: "declined" };
    const state = params.get("state");
    if (!params.get("code") || !state || !expected || state !== expected) {
      return {
        kind: "failed",
        message: "This sign-in didn’t start from your profile page in this browser, so we didn’t use it.",
      };
    }
    return null;
  });
  const [result, setResult] = useState<Outcome>({ kind: "working" });
  const outcome = check ?? result;
  const started = useRef(false);

  useEffect(() => {
    // Codes work once; development's double effects must not spend it twice.
    if (started.current) return;
    started.current = true;
    try {
      sessionStorage.removeItem(ORCID_STATE_KEY);
    } catch {
      // Nothing saved, nothing to remove.
    }
    // Keep the one-time code out of the address bar and history.
    window.history.replaceState(null, "", ORCID_CALLBACK_PATH);
    if (check || !code) return;
    connect({ code, redirectUri: `${window.location.origin}${ORCID_CALLBACK_PATH}` })
      .then(({ orcid }) => {
        refreshAfterOrcidChange();
        setResult({ kind: "connected", orcid });
      })
      .catch((e) => setResult({ kind: "failed", message: errorMessage(e) }));
  }, [check, code, connect]);

  useEffect(() => {
    if (outcome.kind !== "connected") return;
    const timer = setTimeout(() => router.push("/dashboard/profile"), BACK_AFTER_MS);
    return () => clearTimeout(timer);
  }, [outcome, router]);

  return (
    <div className="max-w-2xl py-16" aria-live="polite">
      <OrcidIcon className="size-10" />
      {outcome.kind === "working" ? (
        <div aria-busy="true">
          <h1 className="mt-6 font-serif text-headline">Connecting your ORCID record…</h1>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            We’re confirming your iD with ORCID and reading your public record. This takes a few seconds.
          </p>
        </div>
      ) : outcome.kind === "connected" ? (
        <div>
          <h1 className="mt-6 font-serif text-headline">Your ORCID record is connected</h1>
          <div className="mt-5">
            <OrcidId orcid={outcome.orcid} authenticated />
          </div>
          <p className="mt-5 leading-relaxed text-muted-foreground">
            Your profile now shows this iD as verified, and can list the works from your ORCID record.
            Taking you back to your profile…
          </p>
          <Button asChild className="mt-8">
            <Link href="/dashboard/profile">Back to your profile now</Link>
          </Button>
        </div>
      ) : outcome.kind === "declined" ? (
        <div>
          <h1 className="mt-6 font-serif text-headline">Nothing was connected</h1>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            You chose not to share your ORCID iD with the journal. You can connect it later from your profile.
          </p>
          <Button asChild variant="outline" className="mt-8">
            <Link href="/dashboard/profile">Back to your profile</Link>
          </Button>
        </div>
      ) : (
        <div>
          <h1 className="mt-6 font-serif text-headline">We couldn’t connect your ORCID iD</h1>
          <p className="mt-3 leading-relaxed text-muted-foreground">{outcome.message}</p>
          <Button asChild variant="outline" className="mt-8">
            <Link href="/dashboard/profile">Back to your profile and try again</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
