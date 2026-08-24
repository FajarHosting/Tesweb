import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

export default async function Profile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username,exp,rank_level")
    .eq("id", user.id)
    .single();

  const { data: bookmarks } = await supabase
    .from("bookmarks")
    .select("serials(id,title,slug,cover_url)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="container" style={{padding:"34px 0"}}>
      <div className="card" style={{padding:24}}>
        <div className="muted">PROFILE</div>
        <h1 style={{fontSize:34,margin:"6px 0"}}>{profile?.username ?? "User"}</h1>
        <div style={{display:"flex",gap:18}}>
          <span>EXP: <strong>{profile?.exp ?? 0}</strong></span>
          <span>Rank: <strong>Lv.{profile?.rank_level ?? 1}</strong></span>
        </div>
        <div style={{marginTop:18}}><LogoutButton/></div>
      </div>

      <div className="section-title"><h2>🔖 Bookmark</h2></div>
      {bookmarks?.length ? (
        <div className="grid-posters">
          {bookmarks.map((b:any) => {
            const s = Array.isArray(b.serials) ? b.serials[0] : b.serials;
            return s ? (
              <Link className="card" key={s.id} href={`/donghua/${s.slug}`}>
                {s.cover_url ? <img className="poster" src={s.cover_url} alt={s.title}/> : <div className="poster"/>}
                <div style={{padding:10,fontWeight:800}}>{s.title}</div>
              </Link>
            ) : null;
          })}
        </div>
      ) : <div className="muted">Belum ada bookmark.</div>}
    </div>
  );
}
