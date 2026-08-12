import { Plus, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AMENITY_LIMITS, AMENITY_SUGGESTIONS, normaliseAmenity } from "@/lib/content/amenities";
import { formatAmenity } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Amenity entry: type-to-add with suggestion chips.
 *
 * Values are normalised on the way in exactly as the server normalises them
 * (trimmed, lowercased, de-duplicated), so what the landlord sees selected is
 * what will be stored. They are titlecased only for display.
 *
 * There is no whitelist server-side, so free text is allowed on purpose — the
 * suggestions are a shortcut, not a constraint.
 */
export function AmenityPicker({
  value,
  onChange,
  disabled,
  className,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [draft, setDraft] = useState("");
  const atLimit = value.length >= AMENITY_LIMITS.max;

  function add(raw: string) {
    const amenity = normaliseAmenity(raw);
    if (!amenity || amenity.length > AMENITY_LIMITS.itemMax) return;
    if (value.includes(amenity) || atLimit) return;
    onChange([...value, amenity]);
    setDraft("");
  }

  const unused = AMENITY_SUGGESTIONS.filter((suggestion) => !value.includes(suggestion));

  return (
    <div className={cn("space-y-3", className)}>
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {value.map((amenity) => (
            <li key={amenity}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary py-1 pr-1 pl-3 text-body-sm text-secondary-foreground">
                {formatAmenity(amenity)}
                <button
                  type="button"
                  disabled={disabled}
                  aria-label={`Remove ${formatAmenity(amenity)}`}
                  className="flex size-5 items-center justify-center rounded-full transition-colors hover:bg-primary/15 disabled:pointer-events-none"
                  onClick={() => onChange(value.filter((candidate) => candidate !== amenity))}
                >
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex gap-2">
        <Input
          value={draft}
          disabled={disabled || atLimit}
          maxLength={AMENITY_LIMITS.itemMax}
          placeholder={atLimit ? `${AMENITY_LIMITS.max} is the maximum` : "Type an amenity"}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // Enter must not submit the surrounding form — it means "add this one".
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              add(draft);
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={disabled || atLimit || draft.trim().length === 0}
          onClick={() => add(draft)}
        >
          <Plus />
          Add
        </Button>
      </div>

      {unused.length > 0 && !atLimit ? (
        <div className="flex flex-wrap gap-1.5">
          {unused.slice(0, 12).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={disabled}
              onClick={() => add(suggestion)}
              className="disabled:pointer-events-none"
            >
              <Badge
                variant="outline"
                className="cursor-pointer font-normal transition-colors hover:bg-muted"
              >
                + {formatAmenity(suggestion)}
              </Badge>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
