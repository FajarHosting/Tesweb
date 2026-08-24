"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function BookmarkButton({ serialId }: { serialId: string }) {
  const supabase = createClient();
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");

  async function toggle() {
    setBusy(true);
    setMessage("");

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Login dulu.");
      setBusy(false);
      return;
    }

    const { data: existing } = await supabase
      .from("bookmarks")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("serial_id", serialId)
      .maybeSingle();

    if (existing) {
      await supabase.from("bookmarks")
        .delete()
        .eq("user_id", user.id)
        .eq("serial_id", serialId);
      setMessage("Dihapus");
    } else {
      await supabase.from("bookmarks")
        .insert({ user_id: user.id, serial_id: serialId });
      setMessage("Tersimpan");
    }

    setBusy(false);
  }

  return (
    <button className="btn btn-secondary" onClick={toggle} disabled={busy}>
      🔖 {busy ? "..." : "Bookmark"} {message && `· ${message}`}
    </button>
  );
}
