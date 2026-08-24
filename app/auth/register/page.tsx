"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Register() {
  const supabase = createClient();
  const router = useRouter();
  const [username,setUsername] = useState("");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [error,setError] = useState("");
  const [done,setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } }
    });

    if (error) return setError(error.message);

    if (data.session) {
      router.push("/");
      router.refresh();
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <div className="container" style={{padding:"70px 0",maxWidth:500}}>
        <div className="card" style={{padding:26}}>
          <h1>Hampir selesai.</h1>
          <p className="muted">Cek email untuk konfirmasi akun.</p>
          <Link className="btn btn-secondary" href="/auth/login">Ke Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{padding:"70px 0",maxWidth:500}}>
      <div className="card" style={{padding:26}}>
        <h1 style={{fontSize:30,marginTop:0}}>Register</h1>
        <form onSubmit={submit} style={{display:"grid",gap:12}}>
          <input className="input" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} required minLength={3}/>
          <input className="input" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required/>
          <input className="input" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8}/>
          {error && <div style={{color:"#fda4af",fontSize:13}}>{error}</div>}
          <button className="btn btn-primary" type="submit">Buat Akun</button>
        </form>
        <p className="muted">Sudah punya akun? <Link href="/auth/login" style={{color:"#c4b5fd"}}>Login</Link></p>
      </div>
    </div>
  );
}
