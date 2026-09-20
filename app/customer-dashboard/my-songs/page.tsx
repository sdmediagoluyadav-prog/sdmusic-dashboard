"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Song = {
  id: number;
  song_title: string;
  artist_name: string;
  album_name: string | null;
  singer_name: string | null;
  composer: string | null;
  lyricist: string | null;
  genre: string | null;
  language: string | null;
  release_date: string | null;
  cover_url: string | null;
  audio_url: string | null;
  status: string | null;
  rejection_reason: string | null;
  cover_signed_url?: string | null;
  audio_signed_url?: string | null;
};

type Customer = {
  id: number;
  customer_name: string;
  label_name: string | null;
};

export default function MySongsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [expandedSong, setExpandedSong] = useState<number | null>(null);

  useEffect(() => {
    loadMySongs();
  }, []);

  async function loadMySongs() {
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

      // Customer ke songs
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

      // Songs details
      const { data: songsData, error: songsError } = await supabase
        .from("songs")
        .select(
          `
          id,
          song_title,
          artist_name,
          album_name,
          singer_name,
          composer,
          lyricist,
          genre,
          language,
          release_date,
          cover_url,
          audio_url,
          status,
          rejection_reason
          `
        )
        .in("id", songIds)
        .order("id", { ascending: false });

      if (songsError) {
        console.error("Songs error:", songsError);
        setLoading(false);
        return;
      }

      // Signed URLs
      const songsWithUrls: Song[] = await Promise.all(
        (songsData || []).map(async (song) => {
          let cover_signed_url: string | null = null;
          let audio_signed_url: string | null = null;

          // Cover URL
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

          // Audio URL
          if (song.audio_url) {
            if (song.audio_url.startsWith("http")) {
              audio_signed_url = song.audio_url;
            } else {
              const { data } = await supabase.storage
                .from("songs")
                .createSignedUrl(song.audio_url, 3600);

              audio_signed_url = data?.signedUrl || null;
            }
          }

          return {
            ...song,
            cover_signed_url,
            audio_signed_url,
          };
        })
      );

      setSongs(songsWithUrls);
    } catch (error) {
      console.error("My Songs error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const filteredSongs = songs.filter((song) => {
    const searchText = search.toLowerCase().trim();

    const matchesSearch =
      !searchText ||
      song.song_title?.toLowerCase().includes(searchText) ||
      song.artist_name?.toLowerCase().includes(searchText) ||
      song.album_name?.toLowerCase().includes(searchText) ||
      song.singer_name?.toLowerCase().includes(searchText);

    const matchesStatus =
      statusFilter === "All" ||
      (song.status || "").toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const approvedCount = songs.filter(
    (song) => (song.status || "").toLowerCase() === "approved"
  ).length;

  const pendingCount = songs.filter(
    (song) => (song.status || "").toLowerCase() === "pending"
  ).length;

  const rejectedCount = songs.filter(
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

          <button className="menuItem active">
            <span>🎵</span>
            <span>My Songs</span>
          </button>

          <button
            className="menuItem"
            onClick={() => router.push("/customer-dashboard/artists")}
          >
            <span>🎤</span>
            <span>Artists</span>
          </button>

          <button
            className="menuItem"
            onClick={() => router.push("/customer-dashboard/royalty")}
          >
            <span>💰</span>
            <span>Royalty</span>
          </button>

          <button
            className="menuItem"
            onClick={() => router.push("/customer-dashboard/sub-labels")}
          >
            <span>🏷️</span>
            <span>Sub Labels</span>
          </button>

          <button
            className="menuItem"
            onClick={() => router.push("/customer-dashboard/profile")}
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
        <header className="topbar">
          <div>
            <h1>My Songs</h1>
            <p>
              {customer
                ? `Welcome, ${customer.customer_name}`
                : "Manage your uploaded songs"}
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
              <h2>🎵 My Songs</h2>
              <p>View and manage all your uploaded songs.</p>
            </div>

            <button
              className="uploadBtn"
              onClick={() => router.push("/upload")}
            >
              + Upload New Song
            </button>
          </div>

          {/* STATS */}
          <div className="statsGrid">
            <div className="statCard">
              <div className="statIcon blue">🎵</div>
              <div>
                <div className="statLabel">Total Songs</div>
                <div className="statValue">{songs.length}</div>
              </div>
            </div>

            <div className="statCard">
              <div className="statIcon green">✓</div>
              <div>
                <div className="statLabel">Approved</div>
                <div className="statValue">{approvedCount}</div>
              </div>
            </div>

            <div className="statCard">
              <div className="statIcon orange">⏳</div>
              <div>
                <div className="statLabel">Pending</div>
                <div className="statValue">{pendingCount}</div>
              </div>
            </div>

            <div className="statCard">
              <div className="statIcon red">✕</div>
              <div>
                <div className="statLabel">Rejected</div>
                <div className="statValue">{rejectedCount}</div>
              </div>
            </div>
          </div>

          {/* SEARCH / FILTER */}
          <div className="filterBox">
            <div className="searchBox">
              <span>🔍</span>
              <input
                type="text"
                placeholder="Search by song, artist or album..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="filterButtons">
              {["All", "Approved", "Pending", "Rejected"].map((status) => (
                <button
                  key={status}
                  className={
                    statusFilter === status
                      ? "filterBtn activeFilter"
                      : "filterBtn"
                  }
                  onClick={() => setStatusFilter(status)}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* SONG LIST */}
          <div className="songsBox">
            <div className="songsHeader">
              <div>
                <h2>All Songs</h2>
                <p>
                  Showing {filteredSongs.length} of {songs.length} songs
                </p>
              </div>
            </div>

            {loading ? (
              <div className="emptyState">
                <div className="loader"></div>
                <h3>Loading Songs...</h3>
                <p>Please wait.</p>
              </div>
            ) : filteredSongs.length === 0 ? (
              <div className="emptyState">
                <div className="emptyIcon">🎵</div>
                <h3>No Songs Found</h3>
                <p>
                  {songs.length === 0
                    ? "You have not uploaded any songs yet."
                    : "No songs match your search or filter."}
                </p>

                {songs.length === 0 && (
                  <button
                    className="uploadBtn"
                    onClick={() => router.push("/upload")}
                  >
                    + Upload Your First Song
                  </button>
                )}
              </div>
            ) : (
              <div className="songList">
                {filteredSongs.map((song) => (
                  <SongRow
                    key={song.id}
                    song={song}
                    expanded={expandedSong === song.id}
                    onToggle={() =>
                      setExpandedSong(
                        expandedSong === song.id ? null : song.id
                      )
                    }
                    onEdit={() =>
                      router.push(
                        `/customer-dashboard/edit/${song.id}`
                      )
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <footer className="footer">
          © {new Date().getFullYear()} SD Media Entertainment. All rights
          reserved.
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
            Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
            "Segoe UI", sans-serif;
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
          padding: 18px 18px;
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

        .statIcon.green {
          background: #ecfdf5;
          color: #16a34a;
        }

        .statIcon.orange {
          background: #fff7ed;
          color: #ea580c;
        }

        .statIcon.red {
          background: #fef2f2;
          color: #dc2626;
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

        .filterBox {
          background: #ffffff;
          border: 1px solid #e7edf5;
          border-radius: 15px;
          padding: 16px;
          display: flex;
          gap: 15px;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .searchBox {
          flex: 1;
          max-width: 550px;
          height: 44px;
          border: 1px solid #dce4ef;
          border-radius: 9px;
          display: flex;
          align-items: center;
          padding: 0 13px;
          gap: 9px;
          background: #ffffff;
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

        .filterButtons {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
        }

        .filterBtn {
          border: 1px solid #dce4ef;
          background: #ffffff;
          color: #64748b;
          border-radius: 8px;
          padding: 9px 13px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .filterBtn:hover {
          background: #f8fafc;
        }

        .activeFilter {
          background: #2563eb;
          color: #ffffff;
          border-color: #2563eb;
        }

        .songsBox {
          background: #ffffff;
          border: 1px solid #e7edf5;
          border-radius: 16px;
          overflow: hidden;
        }

        .songsHeader {
          padding: 22px 24px;
          border-bottom: 1px solid #eef2f7;
        }

        .songsHeader h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 800;
        }

        .songsHeader p {
          margin: 5px 0 0;
          color: #8792a3;
          font-size: 12px;
        }

        .songList {
          width: 100%;
        }

        .songRow {
          border-bottom: 1px solid #eef2f7;
          padding: 18px 22px;
        }

        .songRow:last-child {
          border-bottom: 0;
        }

        .songMain {
          display: grid;
          grid-template-columns: 58px 2fr 1.2fr 1.2fr 1fr auto;
          gap: 16px;
          align-items: center;
        }

        .cover {
          width: 58px;
          height: 58px;
          border-radius: 10px;
          object-fit: cover;
          background: #eef2f7;
        }

        .coverPlaceholder {
          width: 58px;
          height: 58px;
          border-radius: 10px;
          background: #eff6ff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
        }

        .songTitle {
          font-size: 14px;
          font-weight: 800;
          color: #172033;
          margin-bottom: 4px;
        }

        .songSub {
          font-size: 12px;
          color: #7b8798;
        }

        .columnLabel {
          font-size: 10px;
          color: #9aa5b5;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
          font-weight: 700;
        }

        .columnValue {
          font-size: 12px;
          color: #475569;
          font-weight: 600;
        }

        .status {
          display: inline-flex;
          align-items: center;
          padding: 5px 9px;
          border-radius: 20px;
          font-size: 10px;
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

        .songActions {
          display: flex;
          gap: 7px;
          align-items: center;
          justify-content: flex-end;
        }

        .detailsBtn,
        .editBtn {
          border: 1px solid #dce4ef;
          background: #ffffff;
          color: #475569;
          padding: 8px 10px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
        }

        .detailsBtn:hover {
          background: #f8fafc;
        }

        .editBtn {
          background: #fff7ed;
          color: #c2410c;
          border-color: #fed7aa;
        }

        .editBtn:hover {
          background: #ffedd5;
        }

        .audioBox {
          margin-top: 15px;
          padding: 13px;
          background: #f8fafc;
          border-radius: 10px;
        }

        .audioBox audio {
          width: 100%;
          height: 38px;
        }

        .details {
          margin-top: 16px;
          background: #f8fafc;
          border-radius: 12px;
          padding: 18px;
        }

        .detailsGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
        }

        .detailItem {
          background: #ffffff;
          border: 1px solid #e8edf4;
          border-radius: 9px;
          padding: 11px;
        }

        .detailLabel {
          font-size: 10px;
          color: #94a3b8;
          font-weight: 800;
          text-transform: uppercase;
          margin-bottom: 5px;
        }

        .detailValue {
          font-size: 12px;
          color: #334155;
          font-weight: 600;
          word-break: break-word;
        }

        .rejectionBox {
          margin-top: 15px;
          padding: 13px;
          border-radius: 9px;
          background: #fef2f2;
          border: 1px solid #fecaca;
        }

        .rejectionTitle {
          color: #dc2626;
          font-size: 11px;
          font-weight: 800;
          margin-bottom: 5px;
        }

        .rejectionText {
          color: #991b1b;
          font-size: 12px;
          line-height: 1.5;
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

          .songMain {
            grid-template-columns: 58px 2fr 1fr auto;
          }

          .songColumnHide {
            display: none;
          }

          .detailsGrid {
            grid-template-columns: repeat(2, 1fr);
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

          .filterBox {
            flex-direction: column;
            align-items: stretch;
          }

          .searchBox {
            max-width: none;
          }

          .filterButtons {
            justify-content: flex-start;
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

          .pageHeader {
            flex-direction: column;
            align-items: flex-start;
            gap: 15px;
          }

          .statsGrid {
            grid-template-columns: 1fr;
          }

          .songMain {
            grid-template-columns: 50px 1fr auto;
          }

          .cover,
          .coverPlaceholder {
            width: 50px;
            height: 50px;
          }

          .songColumnHide {
            display: none;
          }

          .songActions {
            flex-direction: column;
          }

          .detailsGrid {
            grid-template-columns: 1fr;
          }

          .backBtn {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

function SongRow({
  song,
  expanded,
  onToggle,
  onEdit,
}: {
  song: Song;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const status = (song.status || "Pending").toLowerCase();

  let statusClass = "default";

  if (status === "approved") {
    statusClass = "approved";
  } else if (status === "pending") {
    statusClass = "pending";
  } else if (status === "rejected") {
    statusClass = "rejected";
  }

  return (
    <div className="songRow">
      <div className="songMain">
        {song.cover_signed_url ? (
          <img
            src={song.cover_signed_url}
            alt={song.song_title}
            className="cover"
          />
        ) : (
          <div className="coverPlaceholder">🎵</div>
        )}

        <div>
          <div className="songTitle">{song.song_title}</div>
          <div className="songSub">
            {song.singer_name || song.artist_name || "Unknown Artist"}
          </div>
        </div>

        <div className="songColumnHide">
          <div className="columnLabel">Artist</div>
          <div className="columnValue">
            {song.artist_name || "—"}
          </div>
        </div>

        <div className="songColumnHide">
          <div className="columnLabel">Album</div>
          <div className="columnValue">
            {song.album_name || "—"}
          </div>
        </div>

        <div>
          <div className="columnLabel">Status</div>
          <span className={`status ${statusClass}`}>
            {song.status || "Pending"}
          </span>
        </div>

        <div className="songActions">
          <button className="detailsBtn" onClick={onToggle}>
            {expanded ? "Hide" : "Details"}
          </button>

          {status === "rejected" && (
            <button className="editBtn" onClick={onEdit}>
              ✏️ Edit
            </button>
          )}
        </div>
      </div>

      {song.audio_signed_url && (
        <div className="audioBox">
          <audio controls src={song.audio_signed_url} />
        </div>
      )}

      {expanded && (
        <div className="details">
          <div className="detailsGrid">
            <Detail label="Song Title" value={song.song_title} />
            <Detail label="Artist" value={song.artist_name} />
            <Detail label="Album" value={song.album_name} />
            <Detail label="Singer" value={song.singer_name} />
            <Detail label="Composer" value={song.composer} />
            <Detail label="Lyricist" value={song.lyricist} />
            <Detail label="Genre" value={song.genre} />
            <Detail label="Language" value={song.language} />
            <Detail
              label="Release Date"
              value={song.release_date}
            />
            <Detail
              label="Status"
              value={song.status || "Pending"}
            />
          </div>

          {status === "rejected" && song.rejection_reason && (
            <div className="rejectionBox">
              <div className="rejectionTitle">
                ❌ Rejection Reason
              </div>

              <div className="rejectionText">
                {song.rejection_reason}
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .songRow {
          border-bottom: 1px solid #eef2f7;
          padding: 18px 22px;
        }

        .songRow:last-child {
          border-bottom: 0;
        }

        .songMain {
          display: grid;
          grid-template-columns: 58px 2fr 1.2fr 1.2fr 1fr auto;
          gap: 16px;
          align-items: center;
        }

        .cover {
          width: 58px;
          height: 58px;
          border-radius: 10px;
          object-fit: cover;
          background: #eef2f7;
        }

        .coverPlaceholder {
          width: 58px;
          height: 58px;
          border-radius: 10px;
          background: #eff6ff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
        }

        .songTitle {
          font-size: 14px;
          font-weight: 800;
          color: #172033;
          margin-bottom: 4px;
        }

        .songSub {
          font-size: 12px;
          color: #7b8798;
        }

        .columnLabel {
          font-size: 10px;
          color: #9aa5b5;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
          font-weight: 700;
        }

        .columnValue {
          font-size: 12px;
          color: #475569;
          font-weight: 600;
        }

        .status {
          display: inline-flex;
          align-items: center;
          padding: 5px 9px;
          border-radius: 20px;
          font-size: 10px;
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

        .songActions {
          display: flex;
          gap: 7px;
          align-items: center;
          justify-content: flex-end;
        }

        .detailsBtn,
        .editBtn {
          border: 1px solid #dce4ef;
          background: #ffffff;
          color: #475569;
          padding: 8px 10px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
        }

        .detailsBtn:hover {
          background: #f8fafc;
        }

        .editBtn {
          background: #fff7ed;
          color: #c2410c;
          border-color: #fed7aa;
        }

        .editBtn:hover {
          background: #ffedd5;
        }

        .audioBox {
          margin-top: 15px;
          padding: 13px;
          background: #f8fafc;
          border-radius: 10px;
        }

        .audioBox audio {
          width: 100%;
          height: 38px;
        }

        .details {
          margin-top: 16px;
          background: #f8fafc;
          border-radius: 12px;
          padding: 18px;
        }

        .detailsGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
        }

        .detailItem {
          background: #ffffff;
          border: 1px solid #e8edf4;
          border-radius: 9px;
          padding: 11px;
        }

        .detailLabel {
          font-size: 10px;
          color: #94a3b8;
          font-weight: 800;
          text-transform: uppercase;
          margin-bottom: 5px;
        }

        .detailValue {
          font-size: 12px;
          color: #334155;
          font-weight: 600;
          word-break: break-word;
        }

        .rejectionBox {
          margin-top: 15px;
          padding: 13px;
          border-radius: 9px;
          background: #fef2f2;
          border: 1px solid #fecaca;
        }

        .rejectionTitle {
          color: #dc2626;
          font-size: 11px;
          font-weight: 800;
          margin-bottom: 5px;
        }

        .rejectionText {
          color: #991b1b;
          font-size: 12px;
          line-height: 1.5;
        }

        @media (max-width: 1200px) {
          .songMain {
            grid-template-columns: 58px 2fr 1fr auto;
          }

          .detailsGrid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 650px) {
          .songMain {
            grid-template-columns: 50px 1fr auto;
          }

          .cover,
          .coverPlaceholder {
            width: 50px;
            height: 50px;
          }

          .songColumnHide {
            display: none;
          }

          .songActions {
            flex-direction: column;
          }

          .detailsGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="detailItem">
      <div className="detailLabel">{label}</div>
      <div className="detailValue">{value || "—"}</div>

      <style jsx>{`
        .detailItem {
          background: #ffffff;
          border: 1px solid #e8edf4;
          border-radius: 9px;
          padding: 11px;
        }

        .detailLabel {
          font-size: 10px;
          color: #94a3b8;
          font-weight: 800;
          text-transform: uppercase;
          margin-bottom: 5px;
        }

        .detailValue {
          font-size: 12px;
          color: #334155;
          font-weight: 600;
          word-break: break-word;
        }
      `}</style>
    </div>
  );
}