import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Catalog({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("serials")
    .select("id,title,slug,cover_url,status")
    .order("title", { ascending: true })
    .limit(60);

  if (q) query = query.ilike("title", `%${q}%`);

  const { data: serials } = await query;

  return (
    <div className="container" style={{padding:"32px 0"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"end",gap:20,marginBottom:22}}>
        <div>
          <div className="muted">CATALOG</div>
          <h1 style={{fontSize:36,margin:"6px 0"}}>Semua Donghua</h1>
        </div>
        <form style={{width:300,maxWidth:"45%"}}>
          <input className="input" name="q" defaultValue={q ?? ""} placeholder="Cari judul..." />
        </form>
      </div>

      {serials?.length ? (
        <div className="grid-posters">
          {serials.map((s) => (
            <Link className="card" key={s.id} href={`/donghua/${s.slug}`}>
              {s.cover_url ? <img className="poster" src={s.cover_url} alt={s.title}/> : <div className="poster"/>}
              <div style={{padding:10}}>
                <div style={{fontWeight:800,fontSize:14}}>{s.title}</div>
                <div className="muted" style={{fontSize:12,marginTop:5}}>{s.status ?? "Unknown"}</div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card" style={{padding:24}}>Tidak ada hasil.</div>
      )}
    </div>
  );
}
