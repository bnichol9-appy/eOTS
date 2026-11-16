"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Calendar, Home, Moon, Star } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { api, onUnauthorized, type Bootstrap } from "@/lib/client/api";
import { applyTheme, localDate, lockAfterSeconds, registerServiceWorker } from "@/lib/client/utils";
import { AppContext, type AppActions } from "./AppContext";
import { Lock } from "./Lock";
import { ICON } from "./ui";

type Gate = "loading" | "signed-out" | "create-pin" | "locked" | "open";

const TABS = [
  { href: "/", icon: Moon, label: "Tonight" },
  { href: "/calendar", icon: Calendar, label: "Calendar" },
  { href: "/rooms", icon: Home, label: "Rooms" },
  { href: "/ideas", icon: Star, label: "Ideas" },
];

const NO_TABS = ["/onboarding", "/rooms/new", "/kit", "/settings", "/inbox"];

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [gate, setGate] = useState<Gate>("loading");
  const [wait, setWait] = useState(0);
  const [data, setData] = useState<Bootstrap | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const hiddenAt = useRef<number | null>(null);

  useEffect(() => {
    void registerServiceWorker();
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      const s = await api.authStatus();
      if (!s.authed) return setGate("signed-out");
      setWait(s.waitSeconds ?? 0);
      if (!s.hasPin) return setGate("create-pin");
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
      const b = await api.bootstrap(localDate());
      applyTheme(b.user.settings.theme);
      setData(b);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load");
    }
  }, []);

  const onUnlocked = useCallback(() => {
    setGate("open");
    void load();
  }, [load]);

  // First run: send new families through onboarding.
  useEffect(() => {
    if (data && !data.profile.onboarded && pathname !== "/onboarding") router.replace("/onboarding");
  }, [data, pathname, router]);

  if (gate === "loading" || gate === "signed-out") {
    return (
      <div className="screen full center">
        <p className="muted">{loadError ?? "…"}</p>
      </div>
    );
  }
  if (gate === "create-pin") return <Lock mode="create" onUnlocked={onUnlocked} />;
  if (gate === "locked") return <Lock mode="unlock" onUnlocked={onUnlocked} waitSeconds={wait} />;

  if (!data) {
    return (
      <div className="screen full center">
        {loadError ? (
          <>
            <p className="error">{loadError}</p>
            <button className="btn" onClick={() => void load()}>
              Try again
            </button>
          </>
        ) : (
          <p className="muted">Waking the elves…</p>
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
    setSettings: (settings) => {
      applyTheme(settings.theme);
      setData((d) => d && { ...d, user: { ...d.user, settings } });
    },
    setCircles: (fn) => setData((d) => d && { ...d, circles: fn(d.circles) }),
    setUnread: (unread) => setData((d) => d && { ...d, unread }),
    toast: (message) => {
      setToastMsg(message);
      setTimeout(() => setToastMsg(null), 3500);
    },
    reload: load,
    lock,
  };

  const hideTabs = NO_TABS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  return (
    <AppContext.Provider value={{ data, actions }}>
      <div className="app">
        {children}
        {toastMsg && (
          <div className="toast" role="status">
            {toastMsg}
          </div>
        )}
        {!hideTabs && (
          <nav className="tabs" aria-label="Main">
            <div className="tabs-inner">
              {TABS.map((t) => {
                const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
                return (
                  <Link key={t.href} href={t.href} className={`tab ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}>
                    <t.icon {...ICON} />
                    {t.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </AppContext.Provider>
  );
}
