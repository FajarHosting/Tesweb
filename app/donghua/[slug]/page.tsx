import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BookmarkButton from "@/components/BookmarkButton";

export default async function Detail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: serial } = await supabase
    .from("serials")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!serial) notFound();

  const { data: episodes } = await supabase
    .from("episodes")
    .select("id,episode_number,title")
    .eq("serial_id", serial.id)
    .order("episode_number", { ascending: true });

  return (
    <div className="container" style={{padding:"34px 0"}}>
      <section style={{display:"grid",gridTemplateColumns:"220px 1fr",gap:26,alignItems:"start"}}>
        <div className="card">
          {serial.cover_url ? <img className="poster" src={serial.cover_url} alt={serial.title}/> : <div className="poster"/>}
        </div>
        <div>
          <div className="muted">{serial.status ?? "Unknown"} {serial.studio ? `• ${serial.studio}` : ""}</div>
          <h1 style={{fontSize:"clamp(30px,5vw,52px)",margin:"8px 0 12px"}}>{serial.title}</h1>
          <p className="muted" style={{lineHeight:1.8,maxWidth:780}}>{serial.synopsis ?? "Belum ada sinopsis."}</p>
          <div style={{display:"flex",gap:10,marginTop:18}}>
            {episodes?.[0] && <Link className="btn btn-primary" href={`/watch/${episodes[0].id}`}>▶ Episode 1</Link>}
            <BookmarkButton serialId={serial.id}/>
          </div>
        </div>
      </section>

      <section>
        <div className="section-title">
          <h2 style={{fontSize:24,margin:0}}>Episode</h2>
          <span className="muted">{episodes?.length ?? 0} episode</span>
        </div>
        <div className="card" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(100px,1fr))"}}>
          {episodes?.map((ep) => (
            <Link key={ep.id} className="episode-item" href={`/watch/${ep.id}`}>
              <strong>EP {ep.episode_number}</strong>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
