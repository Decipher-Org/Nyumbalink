import { cn } from "@/lib/utils";

type LogoMarkProps = {
  className?: string;
};

/**
 * The NyumbaLink mark: a house outline whose interior forms an "N", with a
 * location pin cut into the right shoulder and a ground swoosh beneath.
 * Drawn as SVG so it stays crisp at any size and inherits no raster weight.
 */
export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-10", className)}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="32" cy="32" r="32" fill="var(--color-primary)" />

      {/* Roofline and walls of the house, drawn as a stroke. */}
      <path
        d="M15 30.5 32 17l17 13.5V47H15V30.5Z"
        stroke="var(--color-primary-foreground)"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />

      {/* Diagonal of the "N" — reads as a wall and as a letterform. */}
      <path
        d="M23.5 43V25.5L40.5 43V25.5"
        stroke="var(--color-primary-foreground)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Location pin overlapping the right shoulder. */}
      <path
        d="M44 15c4.7 0 8.5 3.8 8.5 8.5 0 5.6-8.5 13-8.5 13V15Z"
        fill="var(--color-accent)"
      />
      <circle cx="44.2" cy="23.4" r="3" fill="var(--color-primary)" />

      {/* Ground swoosh. */}
      <path
        d="M12 48.5c7.5-3.4 32.5-3.4 40 0"
        stroke="var(--color-accent)"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

type LogoProps = {
  className?: string;
  /** Hide the wordmark on tight layouts. */
  markOnly?: boolean;
  /** Inverts the wordmark for use on the dark CTA band and footer. */
  inverted?: boolean;
};

export function Logo({ className, markOnly = false, inverted = false }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {!markOnly && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "font-serif text-xl font-semibold tracking-tight",
              inverted ? "text-primary-foreground" : "text-primary",
            )}
          >
            Nyumba<span className="text-accent">Link</span>
          </span>
          <span
            className={cn(
              "mt-1 text-[0.6rem] font-medium tracking-wide",
              inverted ? "text-primary-foreground/70" : "text-muted-foreground",
            )}
          >
            Find. Connect. Home.
          </span>
        </span>
      )}
    </span>
  );
}
