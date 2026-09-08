import { useState } from "react";
import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/lib/api/auth";

export function GoogleSignInButton({ role, next, disabled }: {
  role?: "TENANT" | "LANDLORD";
  next?: string | null;
  disabled?: boolean;
}) {
  const [redirecting, setRedirecting] = useState(false);
  return (
    <div className="space-y-4">
      <Button type="button" variant="outline" className="w-full"
        disabled={disabled || redirecting}
        onClick={() => { setRedirecting(true); signInWithGoogle(role, next); }}>
        {redirecting ? "Connecting to Google…" : "Continue with Google"}
      </Button>
      <p className="text-center text-caption text-muted-foreground">or continue with email</p>
    </div>
  );
}
