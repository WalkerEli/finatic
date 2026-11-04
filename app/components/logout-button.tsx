
"use client";

import { useState } from "react";

export default function LogoutButton() {
  const [busy, setBusy] = useState(false);

  async function logOut() {
    setBusy(true);

    try {
      // Call the logout API to clear the user's session
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Unable to sign out.");
      }

      // Redirect to login after successful logout
      window.location.assign("/login");
    } catch {
      setBusy(false);

      window.alert(
        "Unable to sign out. Please try again."
      );
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={logOut}
      className="rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
    >
      {busy ? "Signing out…" : "Log out"}
    </button>
  );
}
