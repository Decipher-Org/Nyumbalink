import { useCallback, useEffect, useState } from "react";

/**
 * Seconds-remaining countdown, used to rate-limit "Resend code".
 *
 * Deadline-based rather than a decrementing counter: a `setTimeout(…, 1000)`
 * chain drifts by however long each render takes, and a backgrounded tab throttles
 * timers to once a minute, which would leave a 60-second gate showing "52s" for
 * several minutes. Measuring against a fixed end time means the display is correct
 * the moment the tab wakes up.
 */
export function useCountdown() {
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (deadline === null) return;
    const endsAt = deadline;

    function tick() {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) setDeadline(null);
    }

    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [deadline]);

  const start = useCallback((seconds: number) => {
    setDeadline(Date.now() + seconds * 1000);
  }, []);

  return { remaining, start, active: remaining > 0 };
}
