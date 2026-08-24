"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function CommentBox({ episodeId }: { episodeId: string }) {
  const supabase = createClient();
  const [content,setContent] = useState("");
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setBusy(true);
    setMessage("");

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Login dulu untuk berkomentar.");
      setBusy(false);
      return;
    }

    const { error } = await supabase.from("comments").insert({
      user_id: user.id,
      episode_id: episodeId,
      content: content.trim()
    });

    if (error) setMessage(error.message);
    else {
      setContent("");
      setMessage("Komentar tersimpan. Refresh untuk melihatnya.");
    }

    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="card" style={{padding:16,marginTop:18}}>
      <textarea
        className="input"
        style={{minHeight:100,resize:"vertical"}}
        placeholder="Tulis komentar..."
        value={content}
        onChange={e=>setContent(e.target.value)}
        maxLength={1000}
      />
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
        <span className="muted" style={{fontSize:12}}>{message}</span>
        <button className="btn btn-primary" disabled={busy}>{busy ? "Mengirim..." : "Kirim"}</button>
      </div>
    </form>
  );
}
