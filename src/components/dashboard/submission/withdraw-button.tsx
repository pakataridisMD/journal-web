"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { errorMessage } from "@/lib/errors";

export function WithdrawButton({ manuscriptId }: { manuscriptId: Id<"manuscripts"> }) {
  const withdraw = useMutation(api.manuscripts.withdraw);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Withdraw</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Withdraw this manuscript?</DialogTitle>
          <DialogDescription>
            The editors and reviewers stop work on it straight away. This can’t be undone; to
            continue later you would submit it again as a new manuscript.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            try {
              await withdraw({ manuscriptId, reason });
              toast.success("Manuscript withdrawn");
              setOpen(false);
            } catch (error) {
              toast.error(errorMessage(error));
            } finally {
              setPending(false);
            }
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="withdraw-reason">Reason for the editors</Label>
            <Textarea
              id="withdraw-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              required
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Keep it under consideration
              </Button>
            </DialogClose>
            <Button type="submit" variant="destructive" disabled={pending || !reason.trim()}>
              Withdraw manuscript
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
