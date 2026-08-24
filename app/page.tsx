import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: serials } = await supabase
    .from("serials")
    .select("id,title,slug,cover_url,synopsis,status")
    .order("updated_at", { ascending: false })
    .limit(12);

  const featured = serials?.[0];

  return (
    <div className="container" style={{padding:"28px 0 0"}}>
      <section
        className="hero"
        style={{
          backgroundImage: featured?.cover_url
            ? `url(${featured.cover_url})`
            : "linear-gradient(135deg,#1e1b4b,#111827)"
        }}
      >
        <div className="hero-content">
          <div style={{color:"#c4b5fd",fontWeight:800,fontSize:13,letterSpacing:1}}>
            FEATURED DONGHUA
          </div>
          <h1 style={{fontSize:"clamp(32px,6vw,62px)",lineHeight:1,margin:"10px 0"}}>
            {featured?.title ?? "NusaDonghua"}
          </h1>
          <p className="muted" style={{fontSize:16,lineHeight:1.7,maxWidth:600}}>
            {featured?.synopsis ?? "Katalog donghua dengan pencarian, episode, akun, bookmark, komentar, dan player."}
          </p>
          {featured && (
            <div style={{display:"flex",gap:10,marginTop:22}}>
              <Link className="btn btn-primary" href={`/donghua/${featured.slug}`}>▶ Mulai Nonton</Link>
              <Link className="btn btn-secondary" href={`/donghua/${featured.slug}`}>Detail</Link>
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="section-title">
          <h2 style={{fontSize:24,margin:0}}>🔥 Terbaru</h2>
          <Link className="muted" href="/catalog">Lihat semua →</Link>
        </div>

        {serials?.length ? (
          <div className="grid-posters">
            {serials.map((s) => (
              <Link className="card" key={s.id} href={`/donghua/${s.slug}`}>
                {s.cover_url ? (
                  <img className="poster" src={s.cover_url} alt={s.title} />
                ) : (
                  <div className="poster" />
                )}
                <div style={{padding:10}}>
                  <div style={{fontWeight:800,fontSize:14}}>{s.title}</div>
                  <div className="muted" style={{fontSize:12,marginTop:5}}>{s.status ?? "Unknown"}</div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card" style={{padding:24}}>
            Belum ada data. Jalankan importer/scraper setelah database siap.
          </div>
        )}
      </section>
    </div>
  );
}
