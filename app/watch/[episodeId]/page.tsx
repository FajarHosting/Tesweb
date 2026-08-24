import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CommentBox from "@/components/CommentBox";

export default async function Watch({
  params,
}: {
  params: Promise<{ episodeId: string }>;
}) {
  const { episodeId } = await params;
  const supabase = await createClient();

  const { data: episode } = await supabase
    .from("episodes")
    .select("id,episode_number,title,iframe_url,serial_id,serials(id,title,slug)")
    .eq("id", episodeId)
    .single();

  if (!episode) notFound();

  const serial = Array.isArray(episode.serials)
    ? episode.serials[0]
    : episode.serials;

  const { data: episodes } = await supabase
    .from("episodes")
    .select("id,episode_number,title")
    .eq("serial_id", episode.serial_id)
    .order("episode_number", { ascending: true });

  const { data: comments } = await supabase
    .from("comments")
    .select("id,content,created_at,profiles(username,rank_level)")
    .eq("episode_id", episode.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="container" style={{padding:"24px 0"}}>
      <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 300px",gap:16}}>
        <div>
          <div className="card" style={{padding:8}}>
            {episode.iframe_url ? (
              <iframe
                className="player"
                src={episode.iframe_url}
                title={episode.title}
                allowFullScreen
                referrerPolicy="no-referrer"
              />
            ) : (
              <div style={{aspectRatio:"16/9",display:"grid",placeItems:"center",background:"#050507",borderRadius:14}}>
                <span className="muted">Player belum tersedia.</span>
              </div>
            )}
          </div>

          <div style={{marginTop:16}}>
            <div className="muted">{serial?.title ?? "Donghua"}</div>
            <h1 style={{fontSize:26,margin:"6px 0"}}>{episode.title}</h1>
          </div>

          <CommentBox episodeId={episode.id}/>

          <div style={{marginTop:22}}>
            <h2 style={{fontSize:20}}>Komentar</h2>
            {comments?.map((c: any) => (
              <div className="comment" key={c.id}>
                <strong>{c.profiles?.username ?? "User"}</strong>
                <span className="muted" style={{marginLeft:8,fontSize:12}}>Lv.{c.profiles?.rank_level ?? 1}</span>
                <div style={{marginTop:6}}>{c.content}</div>
              </div>
            ))}
            {!comments?.length && <div className="muted">Belum ada komentar.</div>}
          </div>
        </div>

        <aside className="card episode-list">
          <div style={{padding:14,fontWeight:900,position:"sticky",top:0,background:"#10121a",zIndex:1}}>
            Episode
          </div>
          {episodes?.map((ep) => (
            <Link
              key={ep.id}
              href={`/watch/${ep.id}`}
              className={`episode-item ${ep.id === episode.id ? "episode-active" : ""}`}
            >
              EP {ep.episode_number} — {ep.title}
            </Link>
          ))}
        </aside>
      </div>
    </div>
  );
}
