"use client";

import { useMutation } from "convex/react";
import { FileIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fileKinds, submissionRules, type FileKindKey } from "@/config/journal";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { errorMessage } from "@/lib/errors";
import { fileSize, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export type UploadedFile = {
  _id: Id<"manuscriptFiles">;
  fileName: string;
  size: number;
  uploadedAt: number;
  url: string | null;
};

/** POST a file to a Convex upload URL, reporting progress. */
export function uploadToConvex(
  url: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<Id<"_storage">> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText).storageId);
        } catch {
          reject(new Error("The upload finished but the response was unreadable."));
        }
      } else {
        reject(new Error(`The upload failed (${xhr.status}). Please try again.`));
      }
    };
    xhr.onerror = () => reject(new Error("The upload failed. Check your connection and try again."));
    xhr.send(file);
  });
}

function extension(name: string) {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

export function checkFile(file: File, extensions: readonly string[]): string | null {
  if (!extensions.includes(extension(file.name))) {
    return `${file.name}: use ${extensions.map((e) => `.${e}`).join(", ")}.`;
  }
  if (file.size > submissionRules.maxFileBytes) {
    return `${file.name} is larger than ${submissionRules.maxFileBytes / 1024 / 1024} MB.`;
  }
  return null;
}

/**
 * One upload slot (e.g. "Title page"): accepted types, drop zone, progress,
 * and the files already attached to this version.
 */
export function FileSlot({
  manuscriptId,
  kind,
  files,
  required,
  disabled,
}: {
  manuscriptId: Id<"manuscripts">;
  kind: FileKindKey;
  files: readonly UploadedFile[];
  required?: boolean;
  disabled?: boolean;
}) {
  const config = fileKinds[kind];
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const attach = useMutation(api.files.attach);
  const remove = useMutation(api.files.remove);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [progress, setProgress] = useState<{ name: string; percent: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function upload(list: FileList | File[]) {
    const chosen = Array.from(list).slice(0, config.single ? 1 : 20);
    setProblem(null);
    for (const file of chosen) {
      const issue = checkFile(file, config.extensions);
      if (issue) {
        setProblem(issue);
        continue;
      }
      try {
        setProgress({ name: file.name, percent: 0 });
        const url = await generateUploadUrl({});
        const storageId = await uploadToConvex(url, file, (percent) =>
          setProgress({ name: file.name, percent }),
        );
        await attach({ manuscriptId, kind, storageId, fileName: file.name });
      } catch (e) {
        setProblem(e instanceof Error && !("data" in e) ? e.message : errorMessage(e));
      } finally {
        setProgress(null);
      }
    }
  }

  const accept = config.extensions.map((e) => `.${e}`).join(",");
  const busy = progress !== null;

  return (
    <div className="border-b py-5 first:pt-0 last:border-b-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <label htmlFor={inputId} className="font-medium">
          {config.label}
          {required ? <span className="ml-2 meta-label text-muted-foreground">Required</span> : null}
        </label>
        <p className="meta-label normal-case text-muted-foreground">
          {config.extensions.map((e) => `.${e}`).join(" ")} · up to {submissionRules.maxFileBytes / 1024 / 1024} MB
        </p>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{config.help}</p>

      {files.length > 0 ? (
        <ul className="mt-3 divide-y border-y">
          {files.map((file) => (
            <li key={file._id} className="flex items-center gap-3 py-2.5">
              <FileIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                {file.url ? (
                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="block truncate text-sm underline-offset-4 hover:underline">
                    {file.fileName}
                  </a>
                ) : (
                  <span className="block truncate text-sm">{file.fileName}</span>
                )}
                <span className="text-xs text-muted-foreground">
                  {fileSize(file.size)} · {formatShortDate(file.uploadedAt)}
                </span>
              </div>
              {!disabled ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${file.fileName}`}
                  onClick={async () => {
                    try {
                      await remove({ fileId: file._id });
                    } catch (e) {
                      toast.error(errorMessage(e));
                    }
                  }}
                >
                  <Trash2Icon />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {!disabled ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!busy && e.dataTransfer.files.length > 0) void upload(e.dataTransfer.files);
          }}
          className={cn(
            "mt-3 flex flex-col items-center justify-center gap-2 border border-dashed border-input px-4 py-5 text-center transition-colors",
            dragging && "border-foreground bg-accent",
          )}
        >
          {busy ? (
            <div className="w-full max-w-sm" role="status" aria-live="polite">
              <p className="truncate text-sm">Uploading {progress.name}…</p>
              <div className="mt-2 h-1 w-full bg-muted">
                <div className="h-1 bg-foreground transition-[width]" style={{ width: `${progress.percent}%` }} />
              </div>
            </div>
          ) : (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                <UploadIcon />
                {files.length > 0 && config.single ? "Replace file" : config.single ? "Choose file" : "Add files"}
              </Button>
              <p className="text-xs text-muted-foreground">or drop {config.single ? "a file" : "files"} here</p>
            </>
          )}
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            className="sr-only"
            accept={accept}
            multiple={!config.single}
            onChange={(e) => {
              if (e.target.files?.length) void upload(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      ) : null}
      {problem ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {problem}
        </p>
      ) : null}
    </div>
  );
}
