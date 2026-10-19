"use client";

import { useState } from "react";
import { LoginForm } from "@/components/login-form";
import { SignupForm } from "@/components/signup-form";

export type AuthMode = "signup" | "signin";

/**
 * One authentication system in one visual design: the signup and login
 * forms share this card everywhere — the header dialog, /signup, /login.
 */
export function AuthCard({
  initialMode = "signup",
  next = "",
  error,
  googleEnabled,
  claim,
  embedded = false,
}: {
  initialMode?: AuthMode;
  next?: string;
  error?: string;
  googleEnabled: boolean;
  claim?: string;
  embedded?: boolean;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const switchMode = () => setMode((current) => (current === "signup" ? "signin" : "signup"));

  if (mode === "signin") {
    return (
      <LoginForm
        next={next}
        error={error}
        googleEnabled={googleEnabled}
        claim={claim}
        embedded={embedded}
        onSwitchMode={switchMode}
      />
    );
  }
  return (
    <SignupForm
      error={error}
      googleEnabled={googleEnabled}
      claim={claim}
      embedded={embedded}
      onSwitchMode={switchMode}
    />
  );
}
