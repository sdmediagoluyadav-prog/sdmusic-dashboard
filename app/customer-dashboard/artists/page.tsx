"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: number;
  customer_name: string;
  label_name: string | null;
};

type Song = {
  id: number;
  song_title: string;
  artist_name: string;
  singer_name: string | null;
  album_name: string | null;
  status: string | null;
  cover_url: string | null;
  cover_signed_url?: string | null;
};

type Artist = {
  name: string;
  songs: Song[];
  totalSongs: number;
  approved: number;
  pending: number;
  rejected: number;
  albums: number;
};

export default function ArtistsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [search, setSearch] = useState("");
  const [expandedArtist, setExpandedArtist] = useState<string | null>(null);

  useEffect(() => {
    loadArtists();
  }, []);

  async function loadArtists() {
    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      // Customer information
      const { data: customerData, error: customerError } =
        await supabase
          .from("customers")
          .select("id, customer_name, label_name")
          .eq("auth_user_id", session.user.id)
          .maybeSingle();

      if (customerError) {
        console.error("Customer error:", customerError);
        setLoading(false);
        return;
      }

      if (!customerData) {
        setLoading(false);
        return;
      }

      setCustomer(customerData);

      // Customer songs
      const { data: customerSongs, error: customerSongsError } =
        await supabase
          .from("customer_songs")
          .select("song_id")
          .eq("customer_id", customerData.id);

      if (customerSongsError) {
        console.error("Customer songs error:", customerSongsError);
        setLoading(false);
        return;
      }

      const songIds =
        customerSongs?.map((item) => item.song_id).filter(Boolean) || [];

      if (songIds.length === 0) {
        setSongs([]);
        setLoading(false);
        return;
      }

      // Songs
      const { data: songsData, error: songsError } = await supabase
        .from("songs")
        .select(
          `
          id,
          song_title,
          artist_name,
          singer_name,
          album_name,
          status,
          cover_url
          `
        )
        .in("id", songIds)
        .order("id", { ascending: false });

      if (songsError) {
        console.error("Songs error:", songsError);
        setLoading(false);
        return;
      }

      // Cover signed URLs
      const songsWithUrls: Song[] = await Promise.all(
        (songsData || []).map(async (song) => {
          let cover_signed_url: string | null = null;

          if (song.cover_url) {
            if (song.cover_url.startsWith("http")) {
              cover_signed_url = song.cover_url;
            } else {
              const { data } = await supabase.storage
                .from("covers")
                .createSignedUrl(song.cover_url, 3600);

              cover_signed_url = data?.signedUrl || null;
            }
          }

          return {
            ...song,
            cover_signed_url,
          };
        })
      );

      setSongs(songsWithUrls);
    } catch (error) {
      console.error("Artists page error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const artists = useMemo<Artist[]>(() => {
    const artistMap = new Map<string, Song[]>();

    songs.forEach((song) => {
      const artistName =
        song.artist_name?.trim() ||
        song.singer_name?.trim() ||
        "Unknown Artist";

      if (!artistMap.has(artistName)) {
        artistMap.set(artistName, []);
      }

      artistMap.get(artistName)!.push(song);
    });

    return Array.from(artistMap.entries())
      .map(([name, artistSongs]) => {
        const approved = artistSongs.filter(
          (song) =>
            (song.status || "").toLowerCase() === "approved"
        ).length;

        const pending = artistSongs.filter(
          (song) =>
            (song.status || "").toLowerCase() === "pending"
        ).length;

        const rejected = artistSongs.filter(
          (song) =>
            (song.status || "").toLowerCase() === "rejected"
        ).length;

        const albums = new Set(
          artistSongs
            .map((song) => song.album_name?.trim())
            .filter(Boolean)
        ).size;

        return {
          name,
          songs: artistSongs,
          totalSongs: artistSongs.length,
          approved,
          pending,
          rejected,
          albums,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [songs]);

  const filteredArtists = artists.filter((artist) =>
    artist.name.toLowerCase().includes(search.toLowerCase().trim())
  );

  const totalArtists = artists.length;

  const totalAlbums = new Set(
    songs
      .map((song) => song.album_name?.trim())
      .filter(Boolean)
  ).size;

  const approvedSongs = songs.filter(
    (song) => (song.status || "").toLowerCase() === "approved"
  ).length;

  const pendingSongs = songs.filter(
    (song) => (song.status || "").toLowerCase() === "pending"
  ).length;

  const rejectedSongs = songs.filter(
    (song) => (song.status || "").toLowerCase() === "rejected"
  ).length;

  return (
    <div className="page">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="logoBox">
          <img src="/sd-logo.png" alt="SD Media" />

          <div>
            <div className="logoTitle">SD Media</div>
            <div className="logoSub">Customer Dashboard</div>
          </div>
        </div>

        <div className="menuTitle">MAIN MENU</div>

        <nav className="menu">
          <button
            className="menuItem"
            onClick={() => router.push("/customer-dashboard")}
          >
            <span>🏠</span>
            <span>Dashboard</span>
          </button>

          <button
            className="menuItem"
            onClick={() => router.push("/upload")}
          >
            <span>⬆️</span>
            <span>Upload Song</span>
          </button>

          <button
            className="menuItem"
            onClick={() =>
              router.push("/customer-dashboard/my-songs")
            }
          >
            <span>🎵</span>
            <span>My Songs</span>
          </button>

          <button className="menuItem active">
            <span>🎤</span>
            <span>Artists</span>
          </button>

          <button
            className="menuItem"
            onClick={() =>
              router.push("/customer-dashboard/royalty")
            }
          >
            <span>💰</span>
            <span>Royalty</span>
          </button>

          <button
            className="menuItem"
            onClick={() =>
              router.push("/customer-dashboard/sub-labels")
            }
          >
            <span>🏷️</span>
            <span>Sub Labels</span>
          </button>

          <button
            className="menuItem"
            onClick={() =>
              router.push("/customer-dashboard/profile")
            }
          >
            <span>👤</span>
            <span>Profile</span>
          </button>
        </nav>

        <div className="sidebarBottom">
          <button className="logoutBtn" onClick={logout}>
            <span>🚪</span>
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main">
        {/* TOP BAR */}
        <header className="topbar">
          <div>
            <h1>Artists</h1>

            <p>
              {customer
                ? `Welcome, ${customer.customer_name}`
                : "Manage your artists"}
            </p>
          </div>

          <button
            className="backBtn"
            onClick={() => router.push("/customer-dashboard")}
          >
            ← Dashboard
          </button>
        </header>

        <section className="content">
          {/* PAGE HEADER */}
          <div className="pageHeader">
            <div>
              <h2>🎤 Artists</h2>

              <p>
                All artists connected with your uploaded songs.
              </p>
            </div>

            <button
              className="songsBtn"
              onClick={() =>
                router.push("/customer-dashboard/my-songs")
              }
            >
              🎵 My Songs
            </button>
          </div>

          {/* STATS */}
          <div className="statsGrid">
            <div className="statCard">
              <div className="statIcon blue">🎤</div>

              <div>
                <div className="statLabel">Total Artists</div>
                <div className="statValue">{totalArtists}</div>
              </div>
            </div>

            <div className="statCard">
              <div className="statIcon purple">💿</div>

              <div>
                <div className="statLabel">Total Albums</div>
                <div className="statValue">{totalAlbums}</div>
              </div>
            </div>

            <div className="statCard">
              <div className="statIcon green">✓</div>

              <div>
                <div className="statLabel">Approved Songs</div>
                <div className="statValue">{approvedSongs}</div>
              </div>
            </div>

            <div className="statCard">
              <div className="statIcon orange">⏳</div>

              <div>
                <div className="statLabel">Pending Songs</div>
                <div className="statValue">{pendingSongs}</div>
              </div>
            </div>
          </div>

          {/* REJECTED INFO */}
          {rejectedSongs > 0 && (
            <div className="noticeBox">
              <div className="noticeIcon">⚠️</div>

              <div>
                <div className="noticeTitle">
                  Rejected Songs
                </div>

                <div className="noticeText">
                  {rejectedSongs} song
                  {rejectedSongs !== 1 ? "s are" : " is"} currently
                  rejected. You can edit rejected songs from the My
                  Songs page.
                </div>
              </div>

              <button
                className="noticeBtn"
                onClick={() =>
                  router.push("/customer-dashboard/my-songs")
                }
              >
                View Songs
              </button>
            </div>
          )}

          {/* SEARCH */}
          <div className="searchCard">
            <div className="searchBox">
              <span>🔍</span>

              <input
                type="text"
                placeholder="Search artist..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="resultCount">
              {filteredArtists.length} artist
              {filteredArtists.length !== 1 ? "s" : ""}
            </div>
          </div>

          {/* ARTISTS */}
          <div className="artistsBox">
            <div className="artistsHeader">
              <div>
                <h2>All Artists</h2>

                <p>
                  Click an artist to view their songs.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="emptyState">
                <div className="loader"></div>

                <h3>Loading Artists...</h3>

                <p>Please wait.</p>
              </div>
            ) : filteredArtists.length === 0 ? (
              <div className="emptyState">
                <div className="emptyIcon">🎤</div>

                <h3>No Artists Found</h3>

                <p>
                  {songs.length === 0
                    ? "You have not uploaded any songs yet."
                    : "No artist matches your search."}
                </p>

                {songs.length === 0 && (
                  <button
                    className="uploadBtn"
                    onClick={() => router.push("/upload")}
                  >
                    + Upload Song
                  </button>
                )}
              </div>
            ) : (
              <div className="artistList">
                {filteredArtists.map((artist) => (
                  <div className="artistCard" key={artist.name}>
                    {/* ARTIST HEADER */}
                    <button
                      className="artistHeader"
                      onClick={() =>
                        setExpandedArtist(
                          expandedArtist === artist.name
                            ? null
                            : artist.name
                        )
                      }
                    >
                      <div className="artistLeft">
                        <div className="artistAvatar">
                          {artist.songs[0]?.cover_signed_url ? (
                            <img
                              src={
                                artist.songs[0].cover_signed_url
                              }
                              alt={artist.name}
                            />
                          ) : (
                            <span>🎤</span>
                          )}
                        </div>

                        <div className="artistInfo">
                          <div className="artistName">
                            {artist.name}
                          </div>

                          <div className="artistSub">
                            {artist.totalSongs} song
                            {artist.totalSongs !== 1 ? "s" : ""}{" "}
                            • {artist.albums} album
                            {artist.albums !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>

                      <div className="artistRight">
                        <div className="artistStat">
                          <span className="artistStatNumber">
                            {artist.approved}
                          </span>
                          <span className="artistStatLabel">
                            Approved
                          </span>
                        </div>

                        <div className="artistStat">
                          <span className="artistStatNumber pendingText">
                            {artist.pending}
                          </span>
                          <span className="artistStatLabel">
                            Pending
                          </span>
                        </div>

                        <div className="artistStat">
                          <span className="artistStatNumber rejectedText">
                            {artist.rejected}
                          </span>
                          <span className="artistStatLabel">
                            Rejected
                          </span>
                        </div>

                        <div className="arrow">
                          {expandedArtist === artist.name
                            ? "▲"
                            : "▼"}
                        </div>
                      </div>
                    </button>

                    {/* SONGS */}
                    {expandedArtist === artist.name && (
                      <div className="artistSongs">
                        {artist.songs.map((song) => {
                          const status = (
                            song.status || "Pending"
                          ).toLowerCase();

                          let statusClass = "default";

                          if (status === "approved") {
                            statusClass = "approved";
                          } else if (status === "pending") {
                            statusClass = "pending";
                          } else if (status === "rejected") {
                            statusClass = "rejected";
                          }

                          return (
                            <div
                              className="artistSong"
                              key={song.id}
                            >
                              {song.cover_signed_url ? (
                                <img
                                  src={song.cover_signed_url}
                                  alt={song.song_title}
                                  className="songCover"
                                />
                              ) : (
                                <div className="songCoverPlaceholder">
                                  🎵
                                </div>
                              )}

                              <div className="songInfo">
                                <div className="songTitle">
                                  {song.song_title}
                                </div>

                                <div className="songSub">
                                  {song.singer_name ||
                                    song.artist_name ||
                                    "Unknown Artist"}
                                </div>
                              </div>

                              <div className="songAlbum">
                                <div className="smallLabel">
                                  Album
                                </div>

                                <div className="smallValue">
                                  {song.album_name || "—"}
                                </div>
                              </div>

                              <div>
                                <span
                                  className={`status ${statusClass}`}
                                >
                                  {song.status || "Pending"}
                                </span>
                              </div>

                              <button
                                className="viewSongBtn"
                                onClick={() =>
                                  router.push(
                                    "/customer-dashboard/my-songs"
                                  )
                                }
                              >
                                View
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <footer className="footer">
          © {new Date().getFullYear()} SD Media Entertainment. All
          rights reserved.
        </footer>
      </main>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          background: #f5f8fc;
          color: #172033;
          display: flex;
          font-family:
            Inter, ui-sans-serif, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .sidebar {
          width: 250px;
          min-height: 100vh;
          background: #ffffff;
          border-right: 1px solid #e7edf5;
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          z-index: 20;
        }

        .logoBox {
          height: 90px;
          padding: 18px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid #eef2f7;
        }

        .logoBox img {
          width: 45px;
          height: 45px;
          object-fit: contain;
          border-radius: 10px;
        }

        .logoTitle {
          font-size: 18px;
          font-weight: 800;
          color: #111827;
        }

        .logoSub {
          font-size: 11px;
          color: #718096;
          margin-top: 2px;
        }

        .menuTitle {
          font-size: 10px;
          font-weight: 800;
          color: #9aa5b5;
          letter-spacing: 1px;
          padding: 24px 20px 10px;
        }

        .menu {
          padding: 0 12px;
        }

        .menuItem {
          width: 100%;
          height: 46px;
          border: 0;
          background: transparent;
          border-radius: 10px;
          margin-bottom: 5px;
          padding: 0 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          text-align: left;
          transition: 0.2s;
        }

        .menuItem:hover {
          background: #f1f5f9;
          color: #2563eb;
        }

        .menuItem.active {
          background: #2563eb;
          color: #ffffff;
          box-shadow: 0 5px 15px rgba(37, 99, 235, 0.18);
        }

        .sidebarBottom {
          margin-top: auto;
          padding: 16px 12px;
          border-top: 1px solid #eef2f7;
        }

        .logoutBtn {
          width: 100%;
          height: 44px;
          border: 0;
          border-radius: 10px;
          background: #fff1f2;
          color: #e11d48;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .logoutBtn:hover {
          background: #ffe4e6;
        }

        .main {
          margin-left: 250px;
          width: calc(100% - 250px);
          min-height: 100vh;
        }

        .topbar {
          height: 82px;
          background: #ffffff;
          border-bottom: 1px solid #e7edf5;
          padding: 0 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .topbar h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 800;
        }

        .topbar p {
          margin: 5px 0 0;
          color: #7b8798;
          font-size: 13px;
        }

        .backBtn {
          border: 1px solid #dce4ef;
          background: #ffffff;
          color: #334155;
          padding: 10px 16px;
          border-radius: 9px;
          font-weight: 700;
          cursor: pointer;
        }

        .backBtn:hover {
          background: #f8fafc;
        }

        .content {
          max-width: 1600px;
          margin: 0 auto;
          padding: 30px;
        }

        .pageHeader {
          background: #ffffff;
          border: 1px solid #e7edf5;
          border-radius: 16px;
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .pageHeader h2 {
          margin: 0;
          font-size: 22px;
          font-weight: 800;
        }

        .pageHeader p {
          margin: 6px 0 0;
          color: #718096;
          font-size: 13px;
        }

        .songsBtn,
        .uploadBtn {
          border: 0;
          background: #2563eb;
          color: #ffffff;
          padding: 11px 17px;
          border-radius: 9px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 5px 12px rgba(37, 99, 235, 0.16);
        }

        .songsBtn:hover,
        .uploadBtn:hover {
          background: #1d4ed8;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
          margin-bottom: 20px;
        }

        .statCard {
          background: #ffffff;
          border: 1px solid #e7edf5;
          border-radius: 15px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .statIcon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 800;
        }

        .statIcon.blue {
          background: #eff6ff;
          color: #2563eb;
        }

        .statIcon.purple {
          background: #f5f3ff;
          color: #7c3aed;
        }

        .statIcon.green {
          background: #ecfdf5;
          color: #16a34a;
        }

        .statIcon.orange {
          background: #fff7ed;
          color: #ea580c;
        }

        .statLabel {
          font-size: 12px;
          color: #7b8798;
          margin-bottom: 4px;
        }

        .statValue {
          font-size: 25px;
          font-weight: 800;
          color: #172033;
        }

        .noticeBox {
          background: #fff7ed;
          border: 1px solid #fed7aa;
          border-radius: 14px;
          padding: 15px 18px;
          display: flex;
          align-items: center;
          gap: 13px;
          margin-bottom: 20px;
        }

        .noticeIcon {
          font-size: 22px;
        }

        .noticeTitle {
          color: #9a3412;
          font-size: 13px;
          font-weight: 800;
        }

        .noticeText {
          color: #c2410c;
          font-size: 12px;
          margin-top: 3px;
        }

        .noticeBox > div:nth-child(2) {
          flex: 1;
        }

        .noticeBtn {
          border: 1px solid #fdba74;
          background: #ffffff;
          color: #c2410c;
          padding: 9px 13px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .searchCard {
          background: #ffffff;
          border: 1px solid #e7edf5;
          border-radius: 15px;
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 20px;
        }

        .searchBox {
          height: 44px;
          width: 100%;
          max-width: 600px;
          border: 1px solid #dce4ef;
          border-radius: 9px;
          display: flex;
          align-items: center;
          padding: 0 13px;
          gap: 9px;
        }

        .searchBox input {
          border: 0;
          outline: 0;
          width: 100%;
          font-size: 14px;
          color: #172033;
          background: transparent;
        }

        .searchBox input::placeholder {
          color: #9aa5b5;
        }

        .resultCount {
          color: #718096;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }

        .artistsBox {
          background: #ffffff;
          border: 1px solid #e7edf5;
          border-radius: 16px;
          overflow: hidden;
        }

        .artistsHeader {
          padding: 22px 24px;
          border-bottom: 1px solid #eef2f7;
        }

        .artistsHeader h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 800;
        }

        .artistsHeader p {
          margin: 5px 0 0;
          color: #8792a3;
          font-size: 12px;
        }

        .artistList {
          width: 100%;
        }

        .artistCard {
          border-bottom: 1px solid #eef2f7;
        }

        .artistCard:last-child {
          border-bottom: 0;
        }

        .artistHeader {
          width: 100%;
          border: 0;
          background: #ffffff;
          padding: 18px 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          cursor: pointer;
          text-align: left;
        }

        .artistHeader:hover {
          background: #f8fafc;
        }

        .artistLeft {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }

        .artistAvatar {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          overflow: hidden;
          background: #eff6ff;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2563eb;
          font-size: 24px;
          flex-shrink: 0;
        }

        .artistAvatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .artistInfo {
          min-width: 0;
        }

        .artistName {
          font-size: 15px;
          font-weight: 800;
          color: #172033;
          word-break: break-word;
        }

        .artistSub {
          font-size: 12px;
          color: #7b8798;
          margin-top: 5px;
        }

        .artistRight {
          display: flex;
          align-items: center;
          gap: 24px;
          flex-shrink: 0;
        }

        .artistStat {
          min-width: 58px;
          text-align: center;
        }

        .artistStatNumber {
          display: block;
          font-size: 16px;
          font-weight: 800;
          color: #15803d;
        }

        .artistStatLabel {
          display: block;
          font-size: 9px;
          color: #94a3b8;
          margin-top: 2px;
          font-weight: 700;
        }

        .pendingText {
          color: #c2410c;
        }

        .rejectedText {
          color: #dc2626;
        }

        .arrow {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          font-size: 11px;
        }

        .artistSongs {
          background: #f8fafc;
          border-top: 1px solid #eef2f7;
          padding: 10px 22px 14px 94px;
        }

        .artistSong {
          background: #ffffff;
          border: 1px solid #e7edf5;
          border-radius: 11px;
          padding: 11px;
          margin: 7px 0;
          display: grid;
          grid-template-columns: 48px 2fr 1.3fr auto auto;
          align-items: center;
          gap: 13px;
        }

        .songCover {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          object-fit: cover;
        }

        .songCoverPlaceholder {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          background: #eff6ff;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .songTitle {
          font-size: 13px;
          font-weight: 800;
          color: #172033;
        }

        .songSub {
          font-size: 11px;
          color: #7b8798;
          margin-top: 3px;
        }

        .smallLabel {
          font-size: 9px;
          color: #9aa5b5;
          text-transform: uppercase;
          font-weight: 800;
          margin-bottom: 3px;
        }

        .smallValue {
          font-size: 11px;
          color: #475569;
          font-weight: 600;
        }

        .status {
          display: inline-flex;
          align-items: center;
          padding: 5px 9px;
          border-radius: 20px;
          font-size: 9px;
          font-weight: 800;
        }

        .status.approved {
          background: #ecfdf5;
          color: #15803d;
        }

        .status.pending {
          background: #fff7ed;
          color: #c2410c;
        }

        .status.rejected {
          background: #fef2f2;
          color: #dc2626;
        }

        .status.default {
          background: #f1f5f9;
          color: #64748b;
        }

        .viewSongBtn {
          border: 1px solid #dce4ef;
          background: #ffffff;
          color: #2563eb;
          padding: 7px 11px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
        }

        .viewSongBtn:hover {
          background: #eff6ff;
        }

        .emptyState {
          padding: 70px 20px;
          text-align: center;
        }

        .emptyIcon {
          width: 65px;
          height: 65px;
          margin: 0 auto 15px;
          border-radius: 50%;
          background: #eff6ff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
        }

        .emptyState h3 {
          margin: 0;
          font-size: 18px;
        }

        .emptyState p {
          color: #8792a3;
          font-size: 13px;
          margin: 7px 0 20px;
        }

        .loader {
          width: 35px;
          height: 35px;
          border: 3px solid #dbeafe;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 18px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .footer {
          text-align: center;
          padding: 25px;
          color: #94a3b8;
          font-size: 11px;
        }

        @media (max-width: 1200px) {
          .statsGrid {
            grid-template-columns: repeat(2, 1fr);
          }

          .artistRight {
            gap: 12px;
          }

          .artistSong {
            grid-template-columns: 48px 2fr 1fr auto;
          }
        }

        @media (max-width: 900px) {
          .sidebar {
            width: 210px;
          }

          .main {
            margin-left: 210px;
            width: calc(100% - 210px);
          }

          .artistHeader {
            align-items: flex-start;
          }

          .artistRight {
            flex-wrap: wrap;
            justify-content: flex-end;
          }

          .artistSongs {
            padding-left: 22px;
          }

          .artistSong {
            grid-template-columns: 48px 1fr auto;
          }

          .songAlbum {
            display: none;
          }
        }

        @media (max-width: 650px) {
          .sidebar {
            display: none;
          }

          .main {
            margin-left: 0;
            width: 100%;
          }

          .topbar {
            padding: 0 16px;
          }

          .content {
            padding: 15px;
          }

          .backBtn {
            display: none;
          }

          .pageHeader {
            flex-direction: column;
            align-items: flex-start;
            gap: 15px;
          }

          .statsGrid {
            grid-template-columns: 1fr;
          }

          .searchCard {
            flex-direction: column;
            align-items: stretch;
          }

          .searchBox {
            max-width: none;
          }

          .artistHeader {
            flex-direction: column;
            gap: 15px;
          }

          .artistRight {
            width: 100%;
            justify-content: space-between;
          }

          .artistSongs {
            padding: 10px;
          }

          .artistSong {
            grid-template-columns: 48px 1fr auto;
          }

          .status {
            display: none;
          }

          .artistStat {
            min-width: 45px;
          }

          .noticeBox {
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .noticeBtn {
            margin-left: 35px;
          }
        }
      `}</style>
    </div>
  );
}