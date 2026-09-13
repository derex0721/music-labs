"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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

const artists = artistsData as Artist[];
const roles = ["All", ...Array.from(new Set(artists.map((artist) => artist.role)))];

export default function ArtistsPage() {
  const [query, setQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("All");

  const filteredArtists = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase();

    return artists.filter((artist) => {
      const matchesRole = selectedRole === "All" || artist.role === selectedRole;
      const matchesQuery =
        !keyword ||
        [artist.name, artist.role, artist.bio].some((value) =>
          value.toLocaleLowerCase().includes(keyword),
        );

      return matchesRole && matchesQuery;
    });
  }, [query, selectedRole]);

  return (
    <main className="min-h-screen bg-[#101113] text-[#e9e9e7]">
      <header className="border-b border-white/10 bg-[#101113]/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/music-labs.html" className="flex items-center gap-3 font-semibold tracking-tight">
            <span className="grid size-9 place-items-center rounded-lg border border-[#c76a08]/50 bg-[#c76a08]/10 text-[#e89a42]">ML</span>
            <span>Music <strong className="text-[#d77a16]">Labs</strong></span>
          </Link>
          <span className="font-mono text-xs tracking-[0.18em] text-white/45">ARTIST DIRECTORY / V1</span>
        </div>
      </header>

      <section className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
        <div className="max-w-3xl">
          <p className="font-mono text-xs tracking-[0.22em] text-[#d77a16]">PEOPLE / WORKS / NOTES</p>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
            音樂人作品集與部落格
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-white/60 sm:text-lg">
            認識不同創作角色、聆聽作品，並閱讀音樂人分享的製作方法與靈感筆記。
          </p>
        </div>

        <div className="mt-10 grid gap-5 rounded-2xl border border-white/10 bg-[#17191d] p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <label className="relative block">
            <span className="sr-only">搜尋音樂人</span>
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#d77a16]">⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜尋姓名、角色或介紹…"
              className="h-12 w-full rounded-xl border border-white/10 bg-[#0d0e10] pl-11 pr-4 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#d77a16] focus:ring-4 focus:ring-[#d77a16]/10"
            />
          </label>

          <div className="flex flex-wrap gap-2" aria-label="依角色篩選">
            {roles.map((role) => (
              <button
                key={role}
                type="button"
                aria-pressed={selectedRole === role}
                onClick={() => setSelectedRole(role)}
                className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
                  selectedRole === role
                    ? "border-[#d77a16] bg-[#d77a16] text-[#111214]"
                    : "border-white/10 bg-white/[0.03] text-white/65 hover:-translate-y-0.5 hover:border-[#d77a16]/70 hover:text-white"
                }`}
              >
                {role === "All" ? "全部" : role}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between border-b border-white/10 pb-4 font-mono text-xs tracking-[0.16em] text-white/40">
          <span>ARTISTS</span>
          <span>{String(filteredArtists.length).padStart(2, "0")} RESULTS</span>
        </div>

        {filteredArtists.length > 0 ? (
          <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredArtists.map((artist, index) => (
              <Link
                key={artist.id}
                href={`/artists/${artist.id}`}
                aria-label={`查看 ${artist.name} 的作品集`}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-[#191b1f] transition duration-300 hover:-translate-y-1 hover:border-[#d77a16]/70 hover:shadow-[0_22px_70px_rgba(0,0,0,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d77a16]"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-[#0d0e10]">
                  <img
                    src={artist.avatar}
                    alt={`${artist.name} 的頭像`}
                    className="h-full w-full object-cover grayscale transition duration-500 group-hover:scale-[1.03] group-hover:grayscale-0"
                  />
                  <span className="absolute left-4 top-4 rounded-md border border-white/15 bg-black/55 px-2.5 py-1 font-mono text-[11px] tracking-[0.15em] text-white/70 backdrop-blur">
                    {String(index + 1).padStart(2, "0")} / {artist.role.toUpperCase()}
                  </span>
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-semibold tracking-[-0.03em] underline-offset-4 group-hover:underline">{artist.name}</h2>
                      <p className="mt-1 font-mono text-xs tracking-[0.13em] text-[#df8525]">{artist.role}</p>
                    </div>
                    <span className="text-xl text-white/30 transition group-hover:translate-x-1 group-hover:text-[#df8525]">↗</span>
                  </div>
                  <p className="mt-5 line-clamp-3 text-sm leading-7 text-white/55">{artist.bio}</p>
                  <div className="mt-6 flex gap-4 border-t border-white/10 pt-4 font-mono text-[11px] tracking-[0.12em] text-white/35">
                    <span>{artist.works.length} WORKS</span>
                    <span>{artist.posts.length} POSTS</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-7 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-20 text-center">
            <p className="text-lg font-semibold">找不到符合條件的音樂人</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSelectedRole("All");
              }}
              className="mt-4 text-sm font-semibold text-[#df8525] hover:text-[#f0a95f]"
            >
              清除搜尋與篩選
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
