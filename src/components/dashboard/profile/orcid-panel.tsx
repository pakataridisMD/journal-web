"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { RefreshCwIcon } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { refreshPeople } from "@/app/actions";
import { OrcidIcon, OrcidId } from "@/components/site/orcid";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { isValidOrcid } from "@/convex/lib/text";
import { errorMessage } from "@/lib/errors";
import { formatShortDate } from "@/lib/format";
import { FormField } from "../form-field";

export type MyProfile = FunctionReturnType<typeof api.profiles.mine>;
type Suggestions = NonNullable<Extract<NonNullable<MyProfile["orcid"]>, { authenticated: true }>["suggestions"]>;

/** Where ORCID sends people back to, and the session key that guards it. */
export const ORCID_CALLBACK_PATH = "/dashboard/profile/orcid";
export const ORCID_STATE_KEY = "journal:orcid-state";

/** Public profiles and article pages show the iD and works; refresh them. */
export function refreshAfterOrcidChange() {
  refreshPeople().catch((error) => console.warn("The public pages will refresh within the hour.", error));
}

/** Send the person to ORCID to sign in and approve sharing their iD. */
function startOrcidSignIn(config: { clientId: string; authorizeUrl: string }) {
  const state = crypto.randomUUID();
  try {
    sessionStorage.setItem(ORCID_STATE_KEY, state);
  } catch {
    // Without session storage the callback can't check the state; it will say so.
  }
  const url = new URL(config.authorizeUrl);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "/authenticate");
  url.searchParams.set("redirect_uri", `${window.location.origin}${ORCID_CALLBACK_PATH}`);
  url.searchParams.set("state", state);
  window.location.assign(url.toString());
}

/**
 * Connect, refresh or disconnect an ORCID iD. Without ORCID credentials
 * configured, falls back to typing the iD, which shows as unauthenticated.
 */
export function OrcidPanel({
  orcid,
  typed,
  onTypedChange,
  dirty,
  onImport,
}: {
  orcid: MyProfile["orcid"];
  /** The iD typed in the form, used only when ORCID sign-in isn't set up. */
  typed: string;
  onTypedChange: (value: string) => void;
  /** The form has unsaved changes, which leaving for ORCID would lose. */
  dirty: boolean;
  onImport: (suggestions: Suggestions) => void;
}) {
  const id = useId();
  const config = useQuery(api.orcid.config, {});
  const refresh = useAction(api.orcid.refresh);
  const disconnect = useMutation(api.orcid.disconnect);
  const [busy, setBusy] = useState<"refresh" | "disconnect" | null>(null);

  if (config === undefined) return <div className="h-24 animate-pulse bg-muted" aria-busy="true" />;

  if (orcid?.authenticated) {
    return (
      <div className="space-y-4">
        <div className="rounded-card border bg-card p-4">
          <OrcidId orcid={orcid.id} authenticated />
          <p className="mt-2 text-sm text-muted-foreground">
            Connected {formatShortDate(orcid.linkedAt)}
            {orcid.syncedAt ? ` · record read ${formatShortDate(orcid.syncedAt)}` : " · record not read yet"}
            {orcid.worksCount !== null ? ` · ${orcid.worksCount} ${orcid.worksCount === 1 ? "work" : "works"}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {orcid.suggestions ? (
            <Button type="button" variant="outline" size="sm" onClick={() => onImport(orcid.suggestions!)}>
              Fill in from ORCID
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy !== null}
            onClick={async () => {
              setBusy("refresh");
              try {
                await refresh({});
                refreshAfterOrcidChange();
                toast.success("Read your ORCID record again");
              } catch (error) {
                toast.error(errorMessage(error));
              } finally {
                setBusy(null);
              }
            }}
          >
            <RefreshCwIcon className={busy === "refresh" ? "animate-spin" : undefined} />
            {busy === "refresh" ? "Reading…" : "Read record again"}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost" size="sm" disabled={busy !== null}>
                Disconnect
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect your ORCID iD?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your iD and the works from your ORCID record come off your profile. Nothing changes on
                  orcid.org; to stop sharing there too, remove the journal under Trusted parties in your
                  ORCID account.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    setBusy("disconnect");
                    try {
                      await disconnect({});
                      refreshAfterOrcidChange();
                      toast.success("ORCID iD disconnected");
                    } catch (error) {
                      toast.error(errorMessage(error));
                    } finally {
                      setBusy(null);
                    }
                  }}
                >
                  Disconnect
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    );
  }

  if (!config.enabled) {
    const problem = typed.trim() && !isValidOrcid(typed.trim().toUpperCase()) ? "An ORCID iD looks like 0000-0002-1825-0097." : null;
    return (
      <FormField
        label="ORCID iD"
        htmlFor={`${id}-orcid`}
        optional
        hint="Shown on your profile as unauthenticated until the journal switches on connecting through ORCID."
        error={problem}
      >
        <Input
          id={`${id}-orcid`}
          value={typed}
          placeholder="0000-0000-0000-0000"
          className="font-mono"
          aria-invalid={problem ? true : undefined}
          onChange={(e) => onTypedChange(e.target.value)}
        />
      </FormField>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed">
        <a href="https://orcid.org" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
          ORCID
        </a>{" "}
        gives researchers a free, persistent identifier that tells them apart from everyone with a
        similar name. Connect yours by signing in to ORCID: we get your verified iD and read your
        public record, so editors know your work is yours and your profile can list it. You can
        disconnect at any time.
      </p>
      {typed.trim() ? (
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-card border bg-card p-4">
          <div className="min-w-0">
            <OrcidId orcid={typed.trim().toUpperCase()} authenticated={false} />
            <p className="mt-2 text-sm text-muted-foreground">
              You typed this iD in. Connect it through ORCID to show it as verified.
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => onTypedChange("")}>
            Remove
          </Button>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={dirty}
          onClick={() => startOrcidSignIn(config)}
        >
          <OrcidIcon className="size-5" />
          Connect your ORCID iD
        </Button>
        {dirty ? <span className="text-sm text-muted-foreground">Save your changes first.</span> : null}
        {config.sandbox ? <span className="meta-label text-warning">ORCID sandbox</span> : null}
      </div>
    </div>
  );
}
