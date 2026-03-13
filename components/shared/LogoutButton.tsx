"use client";

import { useTransition } from "react";
import { Loader2, LogOut } from "lucide-react";
import { gameLogoutAction } from "@/modules/auth/actions";
import { Button } from "@/components/ui/button";

export function LogoutButton({ label, className }: { label: string; className?: string }) {
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await gameLogoutAction();
    });
  }

  return (
    <Button
      onClick={handleLogout}
      disabled={isPending}
      variant="outline"
      className={`border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/50 transition-colors${className ? ` ${className}` : ""}`}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4 mr-2" />
      )}
      {label}
    </Button>
  );
}
