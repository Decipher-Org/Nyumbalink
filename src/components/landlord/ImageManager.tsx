import { ImagePlus, Star, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { PROPERTY_LIMITS } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * Photo management for a property.
 *
 * ## Two lists, because the backend has two ideas of an image
 *
 * `existing` are URLs already stored on the property. `files` are picked but not
 * yet uploaded. They are kept apart because they are saved by different requests
 * (a JSON `images` array vs. a multipart upload) and only the second one has a
 * preview that must be revoked.
 *
 * ## The cap is a total, not a per-source limit
 *
 * The backend allows 12 images per property, counting both. The picker disables
 * itself at the ceiling rather than letting the server reject the save.
 *
 * ## Removing a stored photo leaves the file on the server
 *
 * Removal works by PATCHing back the URLs that survived. The backend only deletes
 * displaced files when the stored value is a relative path, and a value that has
 * made a round trip through this component is an absolute URL, which
 * `discardStoredPath` skips. The photo does disappear from the listing — the file
 * behind it is simply orphaned on disk. Fixing that needs a backend change
 * (accepting stored paths back, or diffing on the server), so it is recorded here
 * rather than papered over.
 */

const MAX_IMAGES = PROPERTY_LIMITS.images.max;
const ACCEPT = "image/jpeg,image/png,image/webp";
/** Matches `config.uploads.maxFileSizeMb` on the server. */
const MAX_FILE_MB = 5;

export type ImageManagerValue = {
  existing: string[];
  files: File[];
};

export function ImageManager({
  value,
  onChange,
  disabled,
  className,
}: {
  value: ImageManagerValue;
  onChange: (next: ImageManagerValue) => void;
  disabled?: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rejected, setRejected] = useState<string[]>([]);
  const total = value.existing.length + value.files.length;
  const remaining = MAX_IMAGES - total;

  function addFiles(picked: FileList | null) {
    if (!picked || picked.length === 0) return;

    const accepted: File[] = [];
    const problems: string[] = [];

    for (const file of Array.from(picked)) {
      if (accepted.length >= remaining) {
        problems.push(`${file.name} — over the ${MAX_IMAGES}-photo limit`);
        continue;
      }
      if (!ACCEPT.split(",").includes(file.type)) {
        problems.push(`${file.name} — must be a JPEG, PNG or WebP`);
        continue;
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        problems.push(`${file.name} — over ${MAX_FILE_MB} MB`);
        continue;
      }
      accepted.push(file);
    }

    setRejected(problems);
    if (accepted.length > 0) onChange({ ...value, files: [...value.files, ...accepted] });
    // Clear the input so re-picking the same file fires `change` again.
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-body font-semibold text-foreground">Photos</p>
          <p className="text-body-sm text-muted-foreground">
            The first photo is the one tenants see in search results. Up to {MAX_IMAGES}, {MAX_FILE_MB}{" "}
            MB each.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || remaining <= 0}
          onClick={() => inputRef.current?.click()}
        >
          <Upload />
          {remaining <= 0 ? "Photo limit reached" : "Add photos"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(event) => addFiles(event.target.files)}
        />
      </div>

      {rejected.length > 0 ? (
        <ul className="space-y-1 rounded-lg border border-destructive/25 bg-destructive-soft px-4 py-3 text-body-sm text-destructive-strong">
          {rejected.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      ) : null}

      {total === 0 ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface px-6 py-10 text-center transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-60"
        >
          <ImagePlus aria-hidden="true" className="size-6 text-muted-foreground" />
          <span className="text-body-sm font-medium text-foreground">Add your first photo</span>
          <span className="text-caption text-muted-foreground">
            Listings with photos get far more enquiries.
          </span>
        </button>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {value.existing.map((url, index) => (
            <ImageTile
              key={url}
              src={url}
              cover={index === 0}
              disabled={disabled}
              onRemove={() =>
                onChange({
                  ...value,
                  existing: value.existing.filter((candidate) => candidate !== url),
                })
              }
            />
          ))}
          {value.files.map((file, index) => (
            <PendingTile
              key={`${file.name}-${file.lastModified}-${index}`}
              file={file}
              cover={value.existing.length === 0 && index === 0}
              disabled={disabled}
              onRemove={() =>
                onChange({ ...value, files: value.files.filter((_, i) => i !== index) })
              }
            />
          ))}
        </ul>
      )}

      {total > 0 ? (
        <p className="text-caption text-muted-foreground">
          {total} of {MAX_IMAGES} used
          {value.files.length > 0 ? ` · ${value.files.length} not uploaded yet` : ""}
        </p>
      ) : null}
    </div>
  );
}

function ImageTile({
  src,
  cover,
  disabled,
  pending,
  onRemove,
}: {
  src: string;
  cover: boolean;
  disabled?: boolean;
  pending?: boolean;
  onRemove: () => void;
}) {
  return (
    <li className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted">
      <img src={src} alt="" className="size-full object-cover" loading="lazy" />

      {cover ? (
        <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-card/95 px-2 py-0.5 text-caption font-semibold text-foreground">
          <Star aria-hidden="true" className="size-3 fill-current" />
          Cover
        </span>
      ) : null}

      {pending ? (
        <span className="absolute bottom-2 left-2 rounded-full bg-warning-soft px-2 py-0.5 text-caption font-semibold text-warning-strong">
          Not saved
        </span>
      ) : null}

      {/* Always visible rather than hover-only: a hover-only control is
          unreachable on the phones most of these landlords use. */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={disabled}
        aria-label="Remove this photo"
        className="absolute top-2 right-2 size-8 border-transparent bg-card/95 text-destructive-strong hover:bg-card"
        onClick={onRemove}
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  );
}

/** A picked-but-unsaved file, shown through a revoked-on-unmount object URL. */
function PendingTile({
  file,
  cover,
  disabled,
  onRemove,
}: {
  file: File;
  cover: boolean;
  disabled?: boolean;
  onRemove: () => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!preview) return null;

  return <ImageTile src={preview} cover={cover} disabled={disabled} pending onRemove={onRemove} />;
}
