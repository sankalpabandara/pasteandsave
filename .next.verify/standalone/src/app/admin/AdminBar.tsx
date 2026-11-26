"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminBar({ generatedAt }: { generatedAt: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-xs text-neutral-400 sm:inline">
        Updated {new Date(generatedAt).toLocaleTimeString()}
      </span>
      <button
        type="button"
        onClick={() => router.refresh()}
        className="glass glass-hairline rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 dark:text-neutral-300"
      >
        Refresh
      </button>
      <button
        type="button"
        onClick={logout}
        disabled={busy}
        className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900"
      >
        Sign out
      </button>
    </div>
  );
}
