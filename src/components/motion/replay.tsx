"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

/** Plays the entrances inside it again, for the style guide. */
export function Replay({ children }: { children: ReactNode }) {
  const [take, setTake] = useState(0);
  return (
    <div>
      {/* A new key mounts the children afresh, which restarts their animations. */}
      <div key={take}>{children}</div>
      <Button variant="outline" size="sm" className="mt-6 motion-reduce:hidden" onClick={() => setTake((n) => n + 1)}>
        Play again
      </Button>
    </div>
  );
}
