import "./globals.css";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "NusaDonghua",
  description: "Platform katalog dan player donghua."
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="id">
      <body>
        <header className="glass" style={{position:"sticky",top:0,zIndex:50}}>
          <div className="container" style={{height:64,display:"flex",alignItems:"center",justifyContent:"space-between",gap:20}}>
            <Link href="/" style={{fontSize:22,fontWeight:900}}>
              <span style={{color:"#a78bfa"}}>NUSA</span>DHUA
            </Link>
            <nav style={{display:"flex",gap:18,fontSize:14}}>
              <Link href="/">Home</Link>
              <Link href="/catalog">Donghua</Link>
              {user ? <Link href="/profile">Profile</Link> : <Link href="/auth/login">Login</Link>}
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="container" style={{padding:"50px 0 28px",color:"#737b8b",fontSize:13}}>
          NusaDonghua — independent streaming UI demo.
        </footer>
      </body>
    </html>
  );
}
