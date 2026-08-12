import { ArrowLeft, Eye, EyeOff, Info, MapPin, Save, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { DemoBadge } from "@/components/app/DemoBadge";
import { PageHeader } from "@/components/app/PageHeader";
import { StatusBadge } from "@/components/app/StatusBadge";
import { ErrorState } from "@/components/app/States";
import { ImageManager, type ImageManagerValue } from "@/components/landlord/ImageManager";
import { UnitManager } from "@/components/landlord/UnitManager";
import { useLandlordGate, VerificationNotice } from "@/components/landlord/VerificationNotice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import {
  createProperty,
  getProperty,
  updateProperty,
  uploadPropertyImages,
} from "@/lib/api/properties";
import {
  KE_BOUNDS,
  PROPERTY_LIMITS,
  STATUS_TRANSITIONS,
  type PropertyDetail,
  type PropertyStatus,
  type PropertyWriteInput,
} from "@/lib/api/types";
import { COUNTY, KILIFI_TOWNS } from "@/lib/content/kilifi";
import { formatRentPerMonth } from "@/lib/format";
import { useAsync } from "@/lib/hooks/use-async";

/**
 * Create and edit a property.
 *
 * ## Two saves, because the API validates multipart with the JSON rules
 *
 * Scalars go as JSON and files go as their own multipart request — see
 * `uploadPropertyImages` for why sending both together returns
 * `400 latitude must be a number`. A create therefore lands as: POST the fields,
 * then (if photos were picked) PATCH the files. If the second call fails the
 * property still exists as a draft, which is why the toast says so instead of
 * claiming the save failed.
 *
 * ## Units cannot exist before the property does
 *
 * Unit endpoints are nested under `/properties/:id/units`, so on a new property
 * the Units tab has nothing to write to. It is disabled until the draft is saved,
 * rather than staging units in memory and replaying them — a half-applied replay
 * is worse than a second step.
 *
 * ## Four fields in the mockup cannot be stored
 *
 * `propertyType`, `bathrooms`, `size` and `furnishing` are not on the Property
 * model. They render disabled with a demo marker: showing them enabled would
 * silently discard whatever the landlord typed.
 */

type Draft = {
  title: string;
  description: string;
  town: string;
  estate: string;
  latitude: string;
  longitude: string;
};

const EMPTY_DRAFT: Draft = {
  title: "",
  description: "",
  town: "",
  estate: "",
  latitude: "",
  longitude: "",
};

function toDraft(property: PropertyDetail): Draft {
  return {
    title: property.title,
    description: property.description ?? "",
    town: property.town,
    estate: property.estate ?? "",
    latitude: property.latitude === null ? "" : String(property.latitude),
    longitude: property.longitude === null ? "" : String(property.longitude),
  };
}

/** Mirrors `validatePropertyCreate`, so an invalid form never costs a round trip. */
function validate(draft: Draft): Record<string, string> {
  const errors: Record<string, string> = {};
  const title = draft.title.trim();
  const description = draft.description.trim();
  const estate = draft.estate.trim();

  if (title.length < PROPERTY_LIMITS.title.min || title.length > PROPERTY_LIMITS.title.max) {
    errors.title = `Between ${PROPERTY_LIMITS.title.min} and ${PROPERTY_LIMITS.title.max} characters.`;
  }

  // Optional, but the server's minimum is 10 — an empty box is cleared, not sent.
  if (description !== "" && description.length < PROPERTY_LIMITS.description.min) {
    errors.description = `At least ${PROPERTY_LIMITS.description.min} characters, or leave it empty.`;
  } else if (description.length > PROPERTY_LIMITS.description.max) {
    errors.description = `At most ${PROPERTY_LIMITS.description.max} characters.`;
  }

  if (draft.town.trim() === "") errors.town = "Choose the town this property is in.";

  if (estate !== "" && estate.length < PROPERTY_LIMITS.estate.min) {
    errors.estate = `At least ${PROPERTY_LIMITS.estate.min} characters, or leave it empty.`;
  }

  const hasLat = draft.latitude.trim() !== "";
  const hasLng = draft.longitude.trim() !== "";

  if (hasLat !== hasLng) {
    errors[hasLat ? "longitude" : "latitude"] = "Latitude and longitude go together.";
  }

  if (hasLat) {
    const latitude = Number(draft.latitude);
    if (!Number.isFinite(latitude) || latitude < KE_BOUNDS.minLat || latitude > KE_BOUNDS.maxLat) {
      errors.latitude = `Must be between ${KE_BOUNDS.minLat} and ${KE_BOUNDS.maxLat}.`;
    }
  }
  if (hasLng) {
    const longitude = Number(draft.longitude);
    if (
      !Number.isFinite(longitude) ||
      longitude < KE_BOUNDS.minLng ||
      longitude > KE_BOUNDS.maxLng
    ) {
      errors.longitude = `Must be between ${KE_BOUNDS.minLng} and ${KE_BOUNDS.maxLng}.`;
    }
  }

  return errors;
}

/**
 * The write payload. `null` clears a field — the only way, since `description`
 * and `estate` have minimum lengths and so reject `""`.
 */
function toInput(draft: Draft, images: string[] | undefined): PropertyWriteInput {
  const description = draft.description.trim();
  const estate = draft.estate.trim();
  const hasCoords = draft.latitude.trim() !== "" && draft.longitude.trim() !== "";

  return {
    title: draft.title.trim(),
    county: COUNTY,
    town: draft.town.trim(),
    description: description === "" ? null : description,
    estate: estate === "" ? null : estate,
    latitude: hasCoords ? Number(draft.latitude) : null,
    longitude: hasCoords ? Number(draft.longitude) : null,
    ...(images === undefined ? {} : { images }),
  };
}

const TRANSITION_META: Record<
  PropertyStatus,
  { label: string; icon: typeof Eye; description: string } | undefined
> = {
  ACTIVE: { label: "Publish", icon: Send, description: "Tenants can find it in search." },
  HIDDEN: {
    label: "Hide",
    icon: EyeOff,
    description: "Taken out of search; you keep it and can republish.",
  },
  ARCHIVED: undefined, // Terminal; archiving lives on the list, behind a confirm.
  DRAFT: undefined,
};

export default function PropertyEditor() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const isNew = !propertyId || propertyId === "new";
  const gate = useLandlordGate();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const loaded = useAsync<PropertyDetail | null>(
    async (signal) => (isNew ? null : getProperty(propertyId!, signal)),
    [propertyId, isNew],
  );
  const property = loaded.data ?? null;

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [images, setImages] = useState<ImageManagerValue>({ existing: [], files: [] });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Keyed on the id, not on `property` itself: a reload after a unit change
  // returns a new object, and depending on identity would stamp on whatever the
  // landlord has typed since.
  useEffect(() => {
    if (!property) return;
    setDraft(toDraft(property));
    setImages({ existing: property.images, files: [] });
    setDirty(false);
  }, [property?.id]);

  const tab = searchParams.get("tab") ?? "basics";
  const canWrite = gate === "approved";
  const isArchived = property?.status === "ARCHIVED";
  const readOnly = !canWrite || isArchived;

  const imagesChanged = useMemo(() => {
    if (!property) return images.existing.length > 0;
    return (
      images.existing.length !== property.images.length ||
      images.existing.some((url, index) => url !== property.images[index])
    );
  }, [images.existing, property]);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setDirty(true);
    setErrors((previous) => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
  }

  function applyServerErrors(err: ApiError) {
    const details = err.details as Array<{ field?: string; message?: string }>;
    const mapped: Record<string, string> = {};
    for (const detail of details ?? []) {
      if (detail?.field && detail.message) mapped[detail.field] = detail.message;
    }
    if (Object.keys(mapped).length > 0) setErrors(mapped);
  }

  async function save() {
    const found = validate(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      toast.error("Some details need fixing.");
      setSearchParams({ tab: found.latitude || found.longitude ? "location" : "basics" });
      return;
    }

    setSaving(true);
    try {
      // Only send `images` when the kept set actually changed — an unchanged
      // PATCH would rewrite stored relative paths as absolute URLs for nothing.
      const input = toInput(draft, imagesChanged ? images.existing : undefined);
      const saved = isNew ? await createProperty(input) : await updateProperty(propertyId!, input);

      if (images.files.length > 0) {
        try {
          await uploadPropertyImages(saved.id, images.files);
        } catch (uploadError) {
          const detail =
            uploadError instanceof ApiError ? uploadError.message : "the upload failed";
          toast.warning(`Details saved, but the photos didn't upload — ${detail}`);
          navigate(`/landlord/properties/${saved.id}`, { replace: true });
          loaded.reload();
          return;
        }
      }

      toast.success(isNew ? "Draft saved. Add unit types next." : "Changes saved.");
      setDirty(false);

      if (isNew) {
        navigate(`/landlord/properties/${saved.id}?tab=units`, { replace: true });
      } else {
        loaded.reload();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
        applyServerErrors(err);
      } else {
        toast.error("Couldn't save this property.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function move(next: PropertyStatus) {
    if (!property) return;

    if (next === "ACTIVE" && property.units.length === 0) {
      toast.error("Add at least one unit type before publishing.");
      setSearchParams({ tab: "units" });
      return;
    }

    setSaving(true);
    try {
      await updateProperty(property.id, { status: next });
      toast.success(next === "ACTIVE" ? "Your listing is live." : "Listing hidden from search.");
      loaded.reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't change the status.");
    } finally {
      setSaving(false);
    }
  }

  if (loaded.error) {
    return (
      <>
        <BackLink />
        <ErrorState error={loaded.error} onRetry={loaded.reload} />
      </>
    );
  }

  if (!isNew && loaded.loading && !property) {
    return (
      <>
        <BackLink />
        <div className="space-y-4">
          <div className="h-9 w-64 animate-pulse rounded bg-muted" />
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
        </div>
      </>
    );
  }

  const transitions = property ? STATUS_TRANSITIONS[property.status] : [];

  return (
    <>
      <BackLink />

      <PageHeader
        title={isNew ? "Add a property" : draft.title || "Property"}
        description={
          isNew
            ? "Save the basics first — you can add photos and unit types straight after."
            : "Changes to the details save when you press Save."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {property ? <StatusBadge status={property.status} /> : null}

            {canWrite && !isArchived
              ? transitions.map((next) => {
                  const meta = TRANSITION_META[next];
                  if (!meta) return null;
                  const Icon = meta.icon;
                  return (
                    <Button
                      key={next}
                      type="button"
                      variant="outline"
                      disabled={saving}
                      onClick={() => move(next)}
                    >
                      <Icon />
                      {meta.label}
                    </Button>
                  );
                })
              : null}

            {readOnly ? null : (
              <Button type="button" disabled={saving} onClick={save}>
                <Save />
                {saving ? "Saving…" : isNew ? "Save draft" : "Save"}
              </Button>
            )}
          </div>
        }
      />

      <VerificationNotice className="mb-6" />

      {isArchived ? (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3.5">
          <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <div className="text-body-sm text-muted-foreground">
            <p className="font-semibold text-foreground">This property is archived</p>
            <p className="mt-0.5">
              Archiving is permanent, so it can't be edited or republished. Create a new listing if
              you want to advertise it again.
            </p>
          </div>
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={(next) => setSearchParams({ tab: next })}>
        <TabsList className="mb-6 w-full justify-start overflow-x-auto">
          <TabsTrigger value="basics">Details</TabsTrigger>
          <TabsTrigger value="location">Location</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="units" disabled={isNew}>
            Units{property ? ` (${property.units.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basics" className="space-y-6">
          <section className="space-y-5 rounded-xl border border-border bg-card p-5">
            <Field
              label="Listing title"
              htmlFor="title"
              hint={`${draft.title.trim().length}/${PROPERTY_LIMITS.title.max}`}
              error={errors.title}
            >
              <Input
                id="title"
                value={draft.title}
                maxLength={PROPERTY_LIMITS.title.max}
                disabled={readOnly}
                placeholder="e.g. Bahari Apartments, Mnarani"
                aria-invalid={Boolean(errors.title)}
                onChange={(event) => set("title", event.target.value)}
              />
            </Field>

            <Field
              label="Description"
              htmlFor="description"
              hint="Optional — what makes this place worth renting"
              error={errors.description}
            >
              <Textarea
                id="description"
                value={draft.description}
                rows={6}
                maxLength={PROPERTY_LIMITS.description.max}
                disabled={readOnly}
                placeholder="Water 24/7, walking distance to the matatu stage, secure compound with a gate…"
                aria-invalid={Boolean(errors.description)}
                onChange={(event) => set("description", event.target.value)}
              />
            </Field>
          </section>

          <UnstorableSpecs />
        </TabsContent>

        <TabsContent value="location" className="space-y-6">
          <section className="space-y-5 rounded-xl border border-border bg-card p-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="County" htmlFor="county" hint="Kilifi only, for now">
                <Input id="county" value={COUNTY} disabled readOnly />
              </Field>

              <Field label="Town" htmlFor="town" error={errors.town}>
                <Select
                  value={draft.town}
                  disabled={readOnly}
                  onValueChange={(value) => set("town", value)}
                >
                  <SelectTrigger id="town" className="w-full" aria-invalid={Boolean(errors.town)}>
                    <SelectValue placeholder="Choose a town" />
                  </SelectTrigger>
                  <SelectContent>
                    {KILIFI_TOWNS.map((town) => (
                      <SelectItem key={town} value={town}>
                        {town}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field
              label="Estate or neighbourhood"
              htmlFor="estate"
              hint="Optional — helps tenants place it"
              error={errors.estate}
            >
              <Input
                id="estate"
                value={draft.estate}
                maxLength={PROPERTY_LIMITS.estate.max}
                disabled={readOnly}
                placeholder="e.g. Mnarani, Bofa, Kibaoni"
                aria-invalid={Boolean(errors.estate)}
                onChange={(event) => set("estate", event.target.value)}
              />
            </Field>
          </section>

          <section className="space-y-5 rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-body font-semibold text-foreground">Map coordinates</p>
                <p className="text-body-sm text-muted-foreground">
                  Optional, and saved as a pair. Stored now so the map works the day it ships.
                </p>
              </div>
              <DemoBadge feature="map" />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Latitude" htmlFor="latitude" error={errors.latitude}>
                <Input
                  id="latitude"
                  value={draft.latitude}
                  inputMode="decimal"
                  disabled={readOnly}
                  placeholder="-3.6305"
                  aria-invalid={Boolean(errors.latitude)}
                  onChange={(event) => set("latitude", event.target.value)}
                />
              </Field>
              <Field label="Longitude" htmlFor="longitude" error={errors.longitude}>
                <Input
                  id="longitude"
                  value={draft.longitude}
                  inputMode="decimal"
                  disabled={readOnly}
                  placeholder="39.8499"
                  aria-invalid={Boolean(errors.longitude)}
                  onChange={(event) => set("longitude", event.target.value)}
                />
              </Field>
            </div>

            <p className="flex items-start gap-2 text-caption text-muted-foreground">
              <MapPin aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              Open the spot in Google Maps, long-press it, and copy the two numbers it shows.
            </p>
          </section>
        </TabsContent>

        <TabsContent value="photos">
          <section className="rounded-xl border border-border bg-card p-5">
            <ImageManager value={images} onChange={setImages} disabled={readOnly} />
            {images.files.length > 0 ? (
              <p className="mt-4 rounded-lg bg-secondary px-4 py-3 text-body-sm text-secondary-foreground">
                {images.files.length} new{" "}
                {images.files.length === 1 ? "photo uploads" : "photos upload"} when you press{" "}
                {isNew ? "Save draft" : "Save"}.
              </p>
            ) : null}
          </section>
        </TabsContent>

        <TabsContent value="units">
          {property ? (
            <section className="rounded-xl border border-border bg-card p-5">
              <UnitManager
                propertyId={property.id}
                units={property.units}
                disabled={readOnly}
                onChanged={loaded.reload}
              />

              {property.units.length > 0 ? (
                <p className="mt-4 text-body-sm text-muted-foreground">
                  Tenants will see this listing from{" "}
                  <span className="font-semibold text-foreground">
                    {formatRentPerMonth(Math.min(...property.units.map((unit) => unit.rent)))}
                  </span>
                  .
                </p>
              ) : null}
            </section>
          ) : null}
        </TabsContent>
      </Tabs>

      {dirty && !readOnly ? (
        <p className="mt-6 text-body-sm text-muted-foreground">You have unsaved changes.</p>
      ) : null}
    </>
  );
}

function BackLink() {
  return (
    <Link
      to="/landlord/properties"
      className="mb-4 inline-flex items-center gap-1.5 text-body-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      All properties
    </Link>
  );
}

/**
 * The four fields the mockup shows that the Property model does not have.
 * Rendered disabled rather than omitted, so the gap is visible to whoever
 * compares this screen to the design instead of looking like an oversight.
 */
function UnstorableSpecs() {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-body font-semibold text-foreground">Property specifications</p>
          <p className="text-body-sm text-muted-foreground">
            Not saved yet — these fields don't exist on a property, so they're shown for reference
            only. Put the same information in the description for now.
          </p>
        </div>
        <DemoBadge feature="propertySpecs" />
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Field label="Property type" htmlFor="spec-type">
          <Input id="spec-type" disabled placeholder="Apartment" />
        </Field>
        <Field label="Bathrooms" htmlFor="spec-bathrooms">
          <Input id="spec-bathrooms" disabled placeholder="2" />
        </Field>
        <Field label="Size (m²)" htmlFor="spec-size">
          <Input id="spec-size" disabled placeholder="75" />
        </Field>
        <Field label="Furnishing" htmlFor="spec-furnishing">
          <Input id="spec-furnishing" disabled placeholder="Unfurnished" />
        </Field>
      </div>
    </section>
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
