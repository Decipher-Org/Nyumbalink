import { DoorOpen, Minus, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AmenityPicker } from "@/components/landlord/AmenityPicker";
import { EmptyState } from "@/components/app/States";
import { VacancyBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/api/client";
import { createUnit, deleteUnit, updateUnit } from "@/lib/api/properties";
import { UNIT_LIMITS, type Unit, type UnitCreateInput } from "@/lib/api/types";
import { formatAmenity, formatRent } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The unit manager.
 *
 * ## A unit is a type, not a door
 *
 * The schema stores unit **types** with counts — "Bedsitter ×8, 3 vacant" — not
 * one row per physical door. So there is no per-unit label and no maintenance
 * state to render: a vacancy is a number, and that number is what tenants search
 * against. This matches `Unit` exactly and needs no schema change.
 *
 * ## Vacancy is derived, so the stepper edits the count
 *
 * `Unit.vacancy` is computed server-side as `availableUnits > 0` and never
 * stored. Editing it directly would be editing a view of the data, so the control
 * here is a stepper on `availableUnits` that PATCHes a single field. The
 * boolean-`vacancy` shorthand the API also accepts is deliberately unused — it
 * would throw away the landlord's count.
 *
 * ## Saves are immediate, not staged
 *
 * Units live behind their own endpoints, so each row commits on its own rather
 * than waiting for a property-level save. That keeps a half-finished property
 * form from being able to lose a unit that was already created.
 */

type UnitDraft = {
  unitType: string;
  rent: string;
  deposit: string;
  totalUnits: string;
  availableUnits: string;
  amenities: string[];
};

const EMPTY_DRAFT: UnitDraft = {
  unitType: "",
  rent: "",
  deposit: "",
  totalUnits: "1",
  availableUnits: "1",
  amenities: [],
};

/** Common Kenyan rental types, offered as a shortcut on an empty type field. */
const UNIT_TYPE_SUGGESTIONS = [
  "Single Room",
  "Bedsitter",
  "1 Bedroom",
  "2 Bedroom",
  "3 Bedroom",
  "Maisonette",
  "Studio",
];

function toDraft(unit: Unit): UnitDraft {
  return {
    unitType: unit.unitType,
    rent: String(unit.rent),
    deposit: unit.deposit === null || unit.deposit === undefined ? "" : String(unit.deposit),
    totalUnits: String(unit.totalUnits),
    availableUnits: String(unit.availableUnits),
    amenities: unit.amenities ?? [],
  };
}

/** Mirrors `validateUnitCreate`, so a bad row never costs a round trip. */
function validate(draft: UnitDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  const type = draft.unitType.trim();

  if (type.length < UNIT_LIMITS.unitType.min || type.length > UNIT_LIMITS.unitType.max) {
    errors.unitType = `Between ${UNIT_LIMITS.unitType.min} and ${UNIT_LIMITS.unitType.max} characters.`;
  }

  const rent = Number(draft.rent);
  if (draft.rent.trim() === "" || !Number.isInteger(rent) || rent < 0) {
    errors.rent = "A whole number of shillings.";
  } else if (rent > UNIT_LIMITS.rent.max) {
    errors.rent = "That rent looks wrong — check the figure.";
  }

  if (draft.deposit.trim() !== "") {
    const deposit = Number(draft.deposit);
    if (!Number.isInteger(deposit) || deposit < 0 || deposit > UNIT_LIMITS.deposit.max) {
      errors.deposit = "A whole number of shillings, or leave it blank.";
    }
  }

  const total = Number(draft.totalUnits);
  if (!Number.isInteger(total) || total < UNIT_LIMITS.totalUnits.min) {
    errors.totalUnits = "At least 1.";
  } else if (total > UNIT_LIMITS.totalUnits.max) {
    errors.totalUnits = `At most ${UNIT_LIMITS.totalUnits.max}.`;
  }

  const available = Number(draft.availableUnits);
  if (!Number.isInteger(available) || available < 0) {
    errors.availableUnits = "Zero or more.";
  } else if (Number.isInteger(total) && available > total) {
    errors.availableUnits = "Cannot be more than the total.";
  }

  return errors;
}

function toInput(draft: UnitDraft): UnitCreateInput {
  return {
    unitType: draft.unitType.trim(),
    rent: Number(draft.rent),
    ...(draft.deposit.trim() === "" ? {} : { deposit: Number(draft.deposit) }),
    totalUnits: Number(draft.totalUnits),
    availableUnits: Number(draft.availableUnits),
    amenities: draft.amenities,
  };
}

export function UnitManager({
  propertyId,
  units,
  onChanged,
  disabled,
  className,
}: {
  propertyId: string;
  units: Unit[];
  /** Called after any successful write, so the parent can refetch. */
  onChanged: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const [editing, setEditing] = useState<{ unit: Unit | null } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Unit | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const totalDoors = units.reduce((sum, unit) => sum + unit.totalUnits, 0);
  const vacantDoors = units.reduce((sum, unit) => sum + unit.availableUnits, 0);

  async function stepAvailable(unit: Unit, delta: number) {
    const next = unit.availableUnits + delta;
    if (next < 0 || next > unit.totalUnits) return;

    setBusyId(unit.id);
    try {
      await updateUnit(propertyId, unit.id, { availableUnits: next });
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't update the vacancy.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(unit: Unit) {
    setBusyId(unit.id);
    try {
      await deleteUnit(propertyId, unit.id);
      toast.success(`"${unit.unitType}" removed.`);
      setPendingDelete(null);
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't remove that unit type.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-body font-semibold text-foreground">Unit types</p>
          <p className="text-body-sm text-muted-foreground">
            {units.length === 0
              ? "Add each kind of unit in this property, with how many there are."
              : `${totalDoors} ${totalDoors === 1 ? "unit" : "units"} across ${units.length} ${
                  units.length === 1 ? "type" : "types"
                } · ${vacantDoors} vacant`}
          </p>
        </div>
        <Button type="button" disabled={disabled} onClick={() => setEditing({ unit: null })}>
          <Plus />
          Add unit type
        </Button>
      </div>

      {units.length === 0 ? (
        <EmptyState
          icon={DoorOpen}
          title="No units yet"
          body="A property needs at least one unit type before it can be published — that's what carries the rent and the vacancy count."
          action={
            <Button type="button" disabled={disabled} onClick={() => setEditing({ unit: null })}>
              <Plus />
              Add unit type
            </Button>
          }
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Rent</TableHead>
                  <TableHead className="text-right">Deposit</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Available</TableHead>
                  <TableHead>Amenities</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell>
                      <span className="font-medium text-foreground">{unit.unitType}</span>
                      <div className="mt-1">
                        <VacancyBadge
                          availableUnits={unit.availableUnits}
                          totalUnits={unit.totalUnits}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatRent(unit.rent)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {unit.deposit ? formatRent(unit.deposit) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{unit.totalUnits}</TableCell>
                    <TableCell>
                      <VacancyStepper
                        unit={unit}
                        busy={busyId === unit.id}
                        disabled={disabled}
                        onStep={stepAvailable}
                      />
                    </TableCell>
                    <TableCell className="max-w-52">
                      <AmenityList amenities={unit.amenities} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={disabled || busyId === unit.id}
                          aria-label={`Edit ${unit.unitType}`}
                          onClick={() => setEditing({ unit })}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={disabled || busyId === unit.id}
                          aria-label={`Remove ${unit.unitType}`}
                          className="text-destructive-strong hover:text-destructive-strong"
                          onClick={() => setPendingDelete(unit)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="space-y-3 md:hidden">
            {units.map((unit) => (
              <li key={unit.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-body font-semibold text-foreground">
                      {unit.unitType}
                    </p>
                    <p className="text-body-sm text-foreground">
                      {formatRent(unit.rent)}
                      <span className="text-muted-foreground">/mo</span>
                      {unit.deposit ? (
                        <span className="text-muted-foreground">
                          {" "}
                          · {formatRent(unit.deposit)} deposit
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={disabled || busyId === unit.id}
                      aria-label={`Edit ${unit.unitType}`}
                      onClick={() => setEditing({ unit })}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={disabled || busyId === unit.id}
                      aria-label={`Remove ${unit.unitType}`}
                      className="text-destructive-strong hover:text-destructive-strong"
                      onClick={() => setPendingDelete(unit)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
                  <div>
                    <p className="text-caption text-muted-foreground">Vacancy</p>
                    <div className="mt-1">
                      <VacancyBadge
                        availableUnits={unit.availableUnits}
                        totalUnits={unit.totalUnits}
                      />
                    </div>
                  </div>
                  <VacancyStepper
                    unit={unit}
                    busy={busyId === unit.id}
                    disabled={disabled}
                    onStep={stepAvailable}
                  />
                </div>

                {unit.amenities && unit.amenities.length > 0 ? (
                  <div className="mt-3 border-t border-border pt-3">
                    <AmenityList amenities={unit.amenities} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}

      {editing ? (
        <UnitDialog
          propertyId={propertyId}
          unit={editing.unit}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChanged();
          }}
        />
      ) : null}

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this unit type?</DialogTitle>
            <DialogDescription>
              "{pendingDelete?.unitType}" and its rent, deposit and vacancy count will be deleted.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busyId !== null}
              onClick={() => pendingDelete && remove(pendingDelete)}
            >
              {busyId ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * The vacancy control: −/+ around a live count, each press one PATCH.
 *
 * Bounded at 0 and `totalUnits` because the server rejects anything outside that
 * range; disabling the button is clearer than surfacing a 400.
 */
function VacancyStepper({
  unit,
  busy,
  disabled,
  onStep,
}: {
  unit: Unit;
  busy: boolean;
  disabled?: boolean;
  onStep: (unit: Unit, delta: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8"
        disabled={disabled || busy || unit.availableUnits <= 0}
        aria-label={`One fewer ${unit.unitType} available`}
        onClick={() => onStep(unit, -1)}
      >
        <Minus className="size-3.5" />
      </Button>
      <span
        aria-live="polite"
        className="w-12 text-center text-body font-semibold tabular-nums text-foreground"
      >
        {unit.availableUnits}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8"
        disabled={disabled || busy || unit.availableUnits >= unit.totalUnits}
        aria-label={`One more ${unit.unitType} available`}
        onClick={() => onStep(unit, 1)}
      >
        <Plus className="size-3.5" />
      </Button>
    </div>
  );
}

function AmenityList({ amenities }: { amenities?: string[] }) {
  if (!amenities || amenities.length === 0) {
    return <span className="text-body-sm text-muted-foreground">—</span>;
  }

  const shown = amenities.slice(0, 3);
  const rest = amenities.length - shown.length;

  return (
    <p className="truncate text-body-sm text-muted-foreground">
      {shown.map(formatAmenity).join(", ")}
      {rest > 0 ? ` +${rest} more` : ""}
    </p>
  );
}

/** Add/edit form. One dialog for both, since the fields are identical. */
function UnitDialog({
  propertyId,
  unit,
  onClose,
  onSaved,
}: {
  propertyId: string;
  unit: Unit | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<UnitDraft>(unit ? toDraft(unit) : EMPTY_DRAFT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function set<K extends keyof UnitDraft>(key: K, value: UnitDraft[K]) {
    setDraft((previous) => {
      const next = { ...previous, [key]: value };
      // Raising the total shouldn't leave available stranded above it, and a new
      // type is almost always fully vacant.
      if (key === "totalUnits" && Number(next.availableUnits) > Number(value)) {
        next.availableUnits = String(value);
      }
      return next;
    });
    setErrors((previous) => {
      if (!previous[key as string]) return previous;
      const next = { ...previous };
      delete next[key as string];
      return next;
    });
  }

  async function submit() {
    const found = validate(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      const input = toInput(draft);
      if (unit) {
        await updateUnit(propertyId, unit.id, input);
        toast.success(`"${input.unitType}" updated.`);
      } else {
        await createUnit(propertyId, input);
        toast.success(`"${input.unitType}" added.`);
      }
      onSaved();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
        // Field-level detail when the server disagrees with the local check.
        const details = err.details as Array<{ field?: string; message?: string }>;
        const mapped: Record<string, string> = {};
        for (const detail of details ?? []) {
          if (detail?.field && detail.message) mapped[detail.field] = detail.message;
        }
        if (Object.keys(mapped).length > 0) setErrors(mapped);
      } else {
        toast.error("Couldn't save that unit type.");
      }
    } finally {
      setSaving(false);
    }
  }

  const unusedTypes = UNIT_TYPE_SUGGESTIONS.filter(
    (suggestion) => suggestion.toLowerCase() !== draft.unitType.trim().toLowerCase(),
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{unit ? `Edit ${unit.unitType}` : "Add a unit type"}</DialogTitle>
          <DialogDescription>
            One row per kind of unit — "Bedsitter", "2 Bedroom" — with how many of them exist and
            how many are free.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Unit type" htmlFor="unit-type" error={errors.unitType}>
            <Input
              id="unit-type"
              value={draft.unitType}
              maxLength={UNIT_LIMITS.unitType.max}
              placeholder="e.g. Bedsitter"
              aria-invalid={Boolean(errors.unitType)}
              onChange={(event) => set("unitType", event.target.value)}
            />
            {draft.unitType.trim() === "" ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {unusedTypes.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="rounded-full border border-border px-2.5 py-0.5 text-caption text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onClick={() => set("unitType", suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Rent per month (KSh)" htmlFor="unit-rent" error={errors.rent}>
              <Input
                id="unit-rent"
                type="number"
                inputMode="numeric"
                min={0}
                step={500}
                value={draft.rent}
                placeholder="15000"
                aria-invalid={Boolean(errors.rent)}
                onChange={(event) => set("rent", event.target.value)}
              />
            </Field>

            <Field
              label="Deposit (KSh)"
              htmlFor="unit-deposit"
              hint="Optional"
              error={errors.deposit}
            >
              <Input
                id="unit-deposit"
                type="number"
                inputMode="numeric"
                min={0}
                step={500}
                value={draft.deposit}
                placeholder="Same as rent, usually"
                aria-invalid={Boolean(errors.deposit)}
                onChange={(event) => set("deposit", event.target.value)}
              />
            </Field>

            <Field label="How many in total" htmlFor="unit-total" error={errors.totalUnits}>
              <Input
                id="unit-total"
                type="number"
                inputMode="numeric"
                min={UNIT_LIMITS.totalUnits.min}
                max={UNIT_LIMITS.totalUnits.max}
                value={draft.totalUnits}
                aria-invalid={Boolean(errors.totalUnits)}
                onChange={(event) => set("totalUnits", event.target.value)}
              />
            </Field>

            <Field
              label="How many are free"
              htmlFor="unit-available"
              hint="This is what tenants search on"
              error={errors.availableUnits}
            >
              <Input
                id="unit-available"
                type="number"
                inputMode="numeric"
                min={0}
                max={Number(draft.totalUnits) || undefined}
                value={draft.availableUnits}
                aria-invalid={Boolean(errors.availableUnits)}
                onChange={(event) => set("availableUnits", event.target.value)}
              />
            </Field>
          </div>

          <Field label="Amenities" hint="Shown on the listing">
            <AmenityPicker
              value={draft.amenities}
              onChange={(next) => set("amenities", next)}
              disabled={saving}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={submit}>
            {saving ? "Saving…" : unit ? "Save changes" : "Add unit type"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={htmlFor}>{label}</Label>
        {hint && !error ? <span className="text-caption text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
      {error ? <p className="text-caption text-destructive-strong">{error}</p> : null}
    </div>
  );
}
