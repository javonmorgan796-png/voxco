import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import AuthScreen from "@/components/AuthScreen";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  return (
    <AuthScreen
      mode={mode}
      onBack={() => navigate({ to: "/" })}
      onSuccess={() => navigate({ to: "/" })}
      onToggleMode={() => setMode(mode === "signin" ? "signup" : "signin")}
    />
  );
}
