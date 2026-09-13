import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import artistsData from "@/data/artists.json";

type Work = {
  title: string;
  type: "audio" | "video";
  url: string;
};

type Post = {
  id: string;
  title: string;
  date: string;
  excerpt: string;
};

type ArtistLink = {
  label: string;
  url: string;
};

type Artist = {
  id: string;
  name: string;
  role: string;
  bio: string;
  avatar: string;
  links: ArtistLink[];
  works: Work[];
  posts: Post[];
};

type ArtistPageProps = {
  params: Promise<{ id: string }>;
};

const artists = artistsData as Artist[];

export function generateStaticParams() {
  return artists.map((artist) => ({ id: artist.id }));
}

export async function generateMetadata({ params }: ArtistPageProps): Promise<Metadata> {
  const { id } = await params;
  const artist = artists.find((item) => item.id === id);

  if (!artist) return { title: "找不到音樂人 — Music Labs" };

  return {
    title: `${artist.name} — Music Labs Artists`,
    description: artist.bio,
  };
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export default async function ArtistProfilePage({ params }: ArtistPageProps) {
  const { id } = await params;
  const artist = artists.find((item) => item.id === id);

  if (!artist) notFound();

  return (
    <main className="min-h-screen bg-[#101113] text-[#e9e9e7]">
      <header className="border-b border-white/10 bg-[#101113]/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/music-labs.html" className="flex items-center gap-3 font-semibold tracking-tight">
            <span className="grid size-9 place-items-center rounded-lg border border-[#c76a08]/50 bg-[#c76a08]/10 text-[#e89a42]">ML</span>
            <span>Music <strong className="text-[#d77a16]">Labs</strong></span>
          </Link>
          <Link href="/artists" className="text-sm font-semibold text-white/55 transition hover:text-[#e89a42]">
            ← 所有音樂人
          </Link>
        </div>
      </header>

      <article>
        <section className="border-b border-white/10 bg-[radial-gradient(circle_at_80%_10%,rgba(199,106,8,0.16),transparent_34%)]">
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-end lg:py-20">
            <div className="relative aspect-square overflow-hidden rounded-3xl border border-white/10 bg-[#17191d] shadow-[0_28px_90px_rgba(0,0,0,0.4)]">
              <img src={artist.avatar} alt={`${artist.name} 的頭像`} className="h-full w-full object-cover" />
              <span className="absolute bottom-4 left-4 rounded-md border border-white/15 bg-black/60 px-3 py-1.5 font-mono text-[11px] tracking-[0.16em] text-white/70 backdrop-blur">
                ARTIST PROFILE
              </span>
            </div>

            <div className="pb-2">
              <p className="font-mono text-xs tracking-[0.22em] text-[#df8525]">{artist.role.toUpperCase()}</p>
              <h1 className="mt-4 text-5xl font-semibold tracking-[-0.055em] sm:text-7xl lg:text-8xl">{artist.name}</h1>
              <p className="mt-7 max-w-3xl text-lg leading-9 text-white/65 sm:text-xl">{artist.bio}</p>
              <div className="mt-8 flex flex-wrap gap-3 font-mono text-xs tracking-[0.13em] text-white/40">
                <span className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">{artist.works.length} WORKS</span>
                <span className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">{artist.posts.length} POSTS</span>
              </div>
              <nav className="mt-5 flex flex-wrap gap-2" aria-label={`${artist.name} 的外部連結`}>
                {artist.links.map((link) => (
                  <a
                    key={`${link.label}-${link.url}`}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-[#d77a16]/40 bg-[#d77a16]/10 px-4 py-2.5 text-sm font-semibold text-[#e99a43] transition hover:-translate-y-0.5 hover:border-[#d77a16] hover:bg-[#d77a16] hover:text-[#111214] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d77a16]"
                  >
                    {link.label} ↗
                  </a>
                ))}
              </nav>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
          <div className="flex items-end justify-between gap-6 border-b border-white/10 pb-5">
            <div>
              <p className="font-mono text-xs tracking-[0.2em] text-[#df8525]">SELECTED WORKS</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">作品</h2>
            </div>
            <span className="font-mono text-xs text-white/35">{String(artist.works.length).padStart(2, "0")} ITEMS</span>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {artist.works.map((work, index) => (
              <section key={`${work.title}-${index}`} className="overflow-hidden rounded-2xl border border-white/10 bg-[#181a1e]">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div>
                    <span className="font-mono text-[10px] tracking-[0.16em] text-[#df8525]">{work.type.toUpperCase()}</span>
                    <h3 className="mt-1 text-base font-semibold">{work.title}</h3>
                  </div>
                  <span className="font-mono text-xs text-white/30">{String(index + 1).padStart(2, "0")}</span>
                </div>

                {work.type === "video" ? (
                  <div className="aspect-video bg-black">
                    <iframe
                      src={work.url}
                      title={`${artist.name} — ${work.title}`}
                      className="h-full w-full"
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="bg-[#0d0e10] p-4">
                    <iframe
                      src={work.url}
                      title={`${artist.name} — ${work.title}`}
                      className="h-[152px] w-full rounded-xl border-0"
                      loading="lazy"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    />
                  </div>
                )}
              </section>
            ))}
          </div>
        </section>

        <section className="border-t border-white/10 bg-[#0d0e10]">
          <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
            <div className="border-b border-white/10 pb-5">
              <p className="font-mono text-xs tracking-[0.2em] text-[#df8525]">ARTIST NOTES</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">部落格</h2>
            </div>

            <div className="divide-y divide-white/10">
              {artist.posts.map((post, index) => (
                <article key={post.id} className="group grid gap-4 py-7 sm:grid-cols-[70px_minmax(0,1fr)_auto] sm:items-start sm:gap-6">
                  <span className="font-mono text-xs text-white/30">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="text-xl font-semibold tracking-[-0.02em] transition group-hover:text-[#e2933f] sm:text-2xl">{post.title}</h3>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-white/50 sm:text-base">{post.excerpt}</p>
                  </div>
                  <time dateTime={post.date} className="font-mono text-xs tracking-[0.08em] text-white/35 sm:text-right">
                    {formatDate(post.date)}
                  </time>
                </article>
              ))}
            </div>
          </div>
        </section>
      </article>
    </main>
  );
}
