"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { api, onUnauthorized, type Bootstrap } from "@/lib/client/api";
import { lockAfterSeconds } from "@/lib/client/utils";
import { AppContext, type AppActions } from "./AppContext";
import { Lock } from "./Lock";

type Gate = "loading" | "signed-out" | "create-pin" | "locked" | "open";

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [gate, setGate] = useState<Gate>("loading");
  const [wait, setWait] = useState(0);
  const [data, setData] = useState<Bootstrap | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hiddenAt = useRef<number | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const s = await api.authStatus();
      if (!s.authed) return setGate("signed-out");
      setWait(s.waitSeconds ?? 0);
      if (!s.hasPin) return setGate("create-pin");
      // Always ask for the PIN on a fresh open, even if the unlock cookie is still valid.
      setGate("locked");
    } catch {
      setLoadError("Can't reach the server");
    }
  }, []);

  useEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  useEffect(() => {
    if (gate === "signed-out") router.replace("/login");
  }, [gate, router]);

  const lock = useCallback(() => {
    setGate("locked");
    setData(null);
    api.lock().catch(() => {});
  }, []);

  useEffect(() => {
    onUnauthorized.handler = (reason) => {
      if (reason === "signed_out") setGate("signed-out");
      else {
        setGate("locked");
        setData(null);
      }
    };
  }, []);

  // Auto-lock after the app has been in the background.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt.current = Date.now();
        if (gate === "open" && lockAfterSeconds() === 0) lock();
      } else if (hiddenAt.current !== null) {
        const away = (Date.now() - hiddenAt.current) / 1000;
        hiddenAt.current = null;
        if (gate === "open" && away >= lockAfterSeconds()) lock();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [gate, lock]);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setData(await api.bootstrap());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load");
    }
  }, []);

  const onUnlocked = useCallback(() => {
    setGate("open");
    void load();
  }, [load]);

  if (gate === "loading" || gate === "signed-out") {
    return (
      <div className="screen center">
        <p className="muted">{loadError ?? "…"}</p>
      </div>
    );
  }
  if (gate === "create-pin") return <Lock mode="create" onUnlocked={onUnlocked} />;
  if (gate === "locked") return <Lock mode="unlock" onUnlocked={onUnlocked} waitSeconds={wait} />;

  if (!data) {
    return (
      <div className="screen center">
        {loadError ? (
          <>
            <p className="error">{loadError}</p>
            <button className="btn" onClick={() => void load()}>
              Try again
            </button>
          </>
        ) : (
          <p className="muted">Waking the elf…</p>
        )}
      </div>
    );
  }

  const actions: AppActions = {
    setProfile: (profile) => setData((d) => d && { ...d, profile }),
    setUser: (user) => setData((d) => d && { ...d, user }),
    setRooms: (fn) => setData((d) => d && { ...d, rooms: fn(d.rooms) }),
    setTaste: (taste) => setData((d) => d && { ...d, taste }),
    setDay: (day) => setData((d) => d && { ...d, days: [day, ...d.days.filter((x) => x.date !== day.date)].sort((a, b) => b.date.localeCompare(a.date)) }),
    setFavourites: (fn) => setData((d) => d && { ...d, favourites: fn(d.favourites) }),
    reload: load,
    lock,
  };

  const tabs = [
    { href: "/", icon: "🌙", label: "Tonight" },
    { href: "/house", icon: "🏠", label: "House" },
    { href: "/community", icon: "🧑‍🧑‍🧒", label: "Elves" },
    { href: "/log", icon: "📓", label: "Log" },
    { href: "/elf", icon: "🧝", label: "Elf" },
  ];

  return (
    <AppContext.Provider value={{ data, actions }}>
      <div className="app">
        <main className="screen">{children}</main>
        <nav className="tabs">
          {tabs.map((t) => {
            const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
            return (
              <Link key={t.href} href={t.href} className={`tab ${active ? "active" : ""}`}>
                <span className="tab-icon">{t.icon}</span>
                <span>{t.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </AppContext.Provider>
  );
}
