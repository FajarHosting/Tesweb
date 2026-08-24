"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const supabase = createClient();
  const router = useRouter();
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [error,setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setError(error.message);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="container" style={{padding:"70px 0",maxWidth:500}}>
      <div className="card" style={{padding:26}}>
        <h1 style={{fontSize:30,marginTop:0}}>Login</h1>
        <form onSubmit={submit} style={{display:"grid",gap:12}}>
          <input className="input" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required/>
          <input className="input" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required/>
          {error && <div style={{color:"#fda4af",fontSize:13}}>{error}</div>}
          <button className="btn btn-primary" type="submit">Masuk</button>
        </form>
        <p className="muted">Belum punya akun? <Link href="/auth/register" style={{color:"#c4b5fd"}}>Register</Link></p>
      </div>
    </div>
  );
}
