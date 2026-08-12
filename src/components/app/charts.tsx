/**
 * The two charts the landlord dashboard needs, as inline SVG.
 *
 * No charting library: two charts do not justify a dependency, and hand-drawing
 * them is what lets the marks follow the design system's own specs — hairline
 * solid grid, 2px lines, 2px surface gaps between touching fills, values labelled
 * rather than left to a tooltip.
 *
 * ## Why the status breakdown is a bar and not a donut
 *
 * The mockup draws a donut. Measured against the actual status tokens, a donut is
 * not readable, so this is a horizontal stacked bar with a labelled legend
 * instead:
 *
 *  - `--warning` (#f59e0b, DRAFT) and `--success` (#22c55e, ACTIVE) separate by
 *    only ΔE 5.7 under protanopia — the two statuses a landlord most needs to
 *    tell apart are the classic red-green confusion pair.
 *  - `--inactive` (#9ca3af, HIDDEN) and `--muted-foreground` (#5f5e5a, ARCHIVED)
 *    are both below the chroma floor: they read as the same grey.
 *
 * The colours stay as they are — they are the design system's status tokens and
 * `<StatusBadge>` uses them, so changing them here would make the same status two
 * different colours in one screen. What changes is that colour stops being the
 * identity channel: every segment is named and counted in the legend, so the
 * chart is still correct for a reader who cannot separate the hues at all.
 */

import { useEffect, useRef, useState } from "react";

import type { PropertyStatus } from "@/lib/api/types";
import { STATUS_CHART_COLORS } from "@/lib/demo/landlord";
import { cn } from "@/lib/utils";

/**
 * The container's pixel width, so coordinates can be computed in real pixels.
 *
 * A fixed `viewBox` scaled with `h-auto` would be less code, but it scales the
 * text and the hairlines too — axis labels end up at 6px on a phone. Measuring
 * keeps 1px hairlines at 1px and 12px text at 12px on every screen.
 */
function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    setWidth(element.clientWidth);

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

/** Rounded-rect path with per-corner control, for a stack's outer ends only. */
function barPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radii: { left: number; right: number },
): string {
  const w = Math.max(width, 0);
  // A radius wider than half the segment would invert the curve.
  const left = Math.min(radii.left, w / 2, height / 2);
  const right = Math.min(radii.right, w / 2, height / 2);

  return [
    `M ${x + left} ${y}`,
    `H ${x + w - right}`,
    right ? `A ${right} ${right} 0 0 1 ${x + w} ${y + right}` : `V ${y}`,
    `V ${y + height - right}`,
    right ? `A ${right} ${right} 0 0 1 ${x + w - right} ${y + height}` : `V ${y + height}`,
    `H ${x + left}`,
    left ? `A ${left} ${left} 0 0 1 ${x} ${y + height - left}` : `V ${y + height}`,
    `V ${y + left}`,
    left ? `A ${left} ${left} 0 0 1 ${x + left} ${y}` : "",
    "Z",
  ].join(" ");
}

const STATUS_ORDER: PropertyStatus[] = ["ACTIVE", "DRAFT", "HIDDEN", "ARCHIVED"];

const STATUS_LABELS: Record<PropertyStatus, string> = {
  ACTIVE: "Active",
  DRAFT: "Draft",
  HIDDEN: "Hidden",
  ARCHIVED: "Archived",
};

const BAR_HEIGHT = 20;
const SEGMENT_GAP = 2;

/**
 * Part-to-whole across the four property statuses.
 *
 * The legend doubles as the table view: every count and share is written out, so
 * no value is reachable only by decoding a colour or hovering a segment.
 */
export function StatusBreakdown({
  counts,
  className,
}: {
  counts: Record<PropertyStatus, number>;
  className?: string;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();

  const present = STATUS_ORDER.filter((status) => counts[status] > 0);
  const total = STATUS_ORDER.reduce((sum, status) => sum + counts[status], 0);

  // Gaps sit *between* segments, so one fewer than the segment count.
  const gapTotal = Math.max(present.length - 1, 0) * SEGMENT_GAP;
  const barWidth = Math.max(width - gapTotal, 0);

  let offset = 0;
  const segments = present.map((status, index) => {
    const segmentWidth = total > 0 ? (counts[status] / total) * barWidth : 0;
    const x = offset;
    offset += segmentWidth + SEGMENT_GAP;
    return {
      status,
      x,
      width: segmentWidth,
      isFirst: index === 0,
      isLast: index === present.length - 1,
    };
  });

  return (
    <div className={className}>
      <div ref={ref}>
        {width > 0 ? (
          <svg
            width={width}
            height={BAR_HEIGHT}
            role="img"
            aria-label={
              total === 0
                ? "No properties yet"
                : `Property status: ${present
                    .map((status) => `${counts[status]} ${STATUS_LABELS[status].toLowerCase()}`)
                    .join(", ")}`
            }
          >
            {total === 0 ? (
              <path
                d={barPath(0, 0, width, BAR_HEIGHT, { left: 4, right: 4 })}
                fill="var(--muted)"
              />
            ) : (
              segments.map((segment) => (
                <path
                  key={segment.status}
                  d={barPath(segment.x, 0, segment.width, BAR_HEIGHT, {
                    left: segment.isFirst ? 4 : 0,
                    right: segment.isLast ? 4 : 0,
                  })}
                  fill={STATUS_CHART_COLORS[segment.status]}
                />
              ))
            )}
          </svg>
        ) : (
          <div style={{ height: BAR_HEIGHT }} />
        )}
      </div>

      <ul className="mt-4 space-y-2">
        {STATUS_ORDER.map((status) => {
          const count = counts[status];
          const share = total > 0 ? Math.round((count / total) * 100) : 0;

          return (
            <li key={status} className="flex items-center gap-2.5 text-body-sm">
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: STATUS_CHART_COLORS[status] }}
              />
              <span className="text-foreground">{STATUS_LABELS[status]}</span>
              <span className="ml-auto tabular-nums text-muted-foreground">
                {count} {total > 0 ? `· ${share}%` : ""}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ------------------------------------------------------------- trend chart

export type TrendPoint = { label: string; views: number };

const TREND_PLOT_HEIGHT = 140;
/** Reserved below the plot for the month labels, so they are never clipped. */
const TREND_AXIS_BAND = 22;
const TREND_PAD_LEFT = 40;
const TREND_PAD_RIGHT = 12;
const TREND_PAD_TOP = 12;

/** Round a maximum up to a clean axis top (1,000 / 2,500 / 5,000…). */
function niceCeiling(value: number): number {
  if (value <= 0) return 10;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10]) {
    const candidate = step * magnitude;
    if (candidate >= value) return candidate;
  }
  return 10 * magnitude;
}

/**
 * A single series over time: 2px line, a 10%-opacity wash beneath it, hairline
 * solid gridlines, and a value written only at the final point.
 *
 * One series means no legend box — the panel's own heading says what is plotted.
 * Hover (and keyboard focus) reveals a per-point value, but the axis and the end
 * label mean no value is *only* available on hover.
 */
export function TrendChart({
  points,
  className,
  valueSuffix = "",
}: {
  points: TrendPoint[];
  className?: string;
  valueSuffix?: string;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const height = TREND_PLOT_HEIGHT + TREND_AXIS_BAND;
  const plotWidth = Math.max(width - TREND_PAD_LEFT - TREND_PAD_RIGHT, 0);
  const plotHeight = TREND_PLOT_HEIGHT - TREND_PAD_TOP;

  const max = niceCeiling(Math.max(...points.map((p) => p.views), 0));
  const ticks = [0, max / 2, max];

  const xFor = (index: number) =>
    TREND_PAD_LEFT +
    (points.length <= 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
  const yFor = (value: number) => TREND_PAD_TOP + plotHeight - (value / max) * plotHeight;

  const line = points.map((point, index) => `${xFor(index)},${yFor(point.views)}`).join(" ");
  const area =
    points.length > 0
      ? `${xFor(0)},${TREND_PAD_TOP + plotHeight} ${line} ${xFor(points.length - 1)},${
          TREND_PAD_TOP + plotHeight
        }`
      : "";

  const lastIndex = points.length - 1;
  const shown = active ?? lastIndex;

  return (
    <div className={cn("relative", className)}>
      <div ref={ref}>
        {width > 0 ? (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={`Trend by month: ${points
              .map((point) => `${point.label} ${point.views}`)
              .join(", ")}`}
            onMouseLeave={() => setActive(null)}
          >
            {/* Gridlines and their ticks. Solid hairlines, one step off surface. */}
            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={TREND_PAD_LEFT}
                  x2={TREND_PAD_LEFT + plotWidth}
                  y1={yFor(tick)}
                  y2={yFor(tick)}
                  stroke="var(--border)"
                  strokeWidth={1}
                />
                <text
                  x={TREND_PAD_LEFT - 8}
                  y={yFor(tick)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-muted-foreground text-[11px] tabular-nums"
                >
                  {Math.round(tick).toLocaleString("en-KE")}
                </text>
              </g>
            ))}

            {area ? <polyline points={area} fill="var(--primary)" fillOpacity={0.1} /> : null}

            <polyline
              points={line}
              fill="none"
              stroke="var(--primary)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {points.map((point, index) => (
              <g key={point.label}>
                {/* Hit target far larger than the dot — a 4px radius marker is
                    impossible to land on, so the band owns the hover. */}
                <rect
                  x={xFor(index) - Math.max(plotWidth / Math.max(points.length, 1) / 2, 12)}
                  y={TREND_PAD_TOP}
                  width={Math.max(plotWidth / Math.max(points.length, 1), 24)}
                  height={plotHeight}
                  fill="transparent"
                  tabIndex={0}
                  role="button"
                  aria-label={`${point.label}: ${point.views.toLocaleString("en-KE")}${valueSuffix}`}
                  onMouseEnter={() => setActive(index)}
                  onFocus={() => setActive(index)}
                  onBlur={() => setActive(null)}
                />
                {index === shown ? (
                  <circle
                    cx={xFor(index)}
                    cy={yFor(point.views)}
                    r={4}
                    fill="var(--primary)"
                    stroke="var(--card)"
                    strokeWidth={2}
                  />
                ) : null}
                <text
                  x={xFor(index)}
                  y={height - 6}
                  textAnchor="middle"
                  className={cn(
                    "text-[11px]",
                    index === shown ? "fill-foreground font-medium" : "fill-muted-foreground",
                  )}
                >
                  {point.label}
                </text>
              </g>
            ))}

            {/* The value for whichever point is active, defaulting to the last —
                so the chart always shows a number without being hovered. */}
            {points.length > 0 ? (
              <text
                x={Math.min(
                  Math.max(xFor(shown), TREND_PAD_LEFT + 16),
                  TREND_PAD_LEFT + plotWidth - 16,
                )}
                y={Math.max(yFor(points[shown].views) - 12, 12)}
                textAnchor="middle"
                className="fill-foreground text-[12px] font-semibold tabular-nums"
              >
                {points[shown].views.toLocaleString("en-KE")}
                {valueSuffix}
              </text>
            ) : null}
          </svg>
        ) : (
          <div style={{ height }} />
        )}
      </div>
    </div>
  );
}
