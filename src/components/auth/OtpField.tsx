import { useId } from "react";

import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";

/** The backend issues 6-digit codes (`otpLength: 6` in the auth config). */
export const OTP_LENGTH = 6;

/**
 * The 6-digit code field, shared by email verification and password reset.
 *
 * Slots are 44×44 rather than shadcn's default 36px, both for the touch-target
 * minimum in the design sheet and because a phone keypad over a cramped field is
 * where most mistyped codes come from. `onComplete` lets the caller submit as
 * soon as the sixth digit lands, so the common case needs no button press.
 */
export function OtpField({
  label = "6-digit code",
  value,
  onChange,
  onComplete,
  disabled,
  invalid,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const id = useId();

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <InputOTP
        id={id}
        maxLength={OTP_LENGTH}
        value={value}
        onChange={onChange}
        onComplete={onComplete}
        disabled={disabled}
        aria-invalid={invalid}
        // Prompts the numeric keypad on mobile and lets iOS autofill the code
        // straight from the notification banner.
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        containerClassName="justify-center gap-2 sm:gap-3"
      >
        <InputOTPGroup className="gap-2 sm:gap-3">
          {Array.from({ length: OTP_LENGTH }, (_, index) => (
            <InputOTPSlot
              key={index}
              index={index}
              // Separated slots, so every one needs its own full border and its
              // own corners — the primitive's defaults assume a joined strip
              // (`border-y border-r`, square inner edges).
              className="size-11 rounded-lg border text-lg font-semibold tabular-nums first:rounded-l-lg last:rounded-r-lg sm:size-12"
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </div>
  );
}
