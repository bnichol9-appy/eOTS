import { useCallback, useEffect, useRef, useState } from "react";
import { api, onUnauthorized, type Bootstrap } from "./api";
import { Lock } from "./screens/Lock";
import { Today } from "./screens/Today";
import { House } from "./screens/House";
import { History } from "./screens/History";
import { Elf } from "./screens/Elf";
import { lockAfterSeconds } from "./utils";
import type { Day, Profile, Room, Taste } from "./types";

type Tab = "today" | "house" | "history" | "elf";

export interface AppData extends Bootstrap {}

export interface AppActions {
  setProfile: (p: Profile) => void;
  setRooms: (fn: (rooms: Room[]) => Room[]) => void;
  setTaste: (t: Taste) => void;
  setDay: (d: Day) => void;
  lock: () => void;
}

export function App() {
  const [locked, setLocked] = useState(true);
  const [data, setData] = useState<AppData | null>(null);
  const [tab, setTab] = useState<Tab>("today");
  const [loadError, setLoadError] = useState<string | null>(null);
  const hiddenAt = useRef<number | null>(null);

  const lock = useCallback(() => {
    setLocked(true);
    setData(null);
    api.logout().catch(() => {});
  }, []);

  useEffect(() => {
    onUnauthorized.handler = () => {
      setLocked(true);
      setData(null);
    };
  }, []);

  // Auto-lock when the app goes to the background for longer than the configured delay.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt.current = Date.now();
        if (lockAfterSeconds() === 0) lock();
      } else if (hiddenAt.current !== null) {
        const away = (Date.now() - hiddenAt.current) / 1000;
        hiddenAt.current = null;
        if (!locked && away >= lockAfterSeconds()) lock();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [locked, lock]);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const b = await api.bootstrap();
      setData(b);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load");
    }
  }, []);

  const onUnlocked = useCallback(() => {
    setLocked(false);
    void load();
  }, [load]);

  if (locked) return <Lock onUnlocked={onUnlocked} />;

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
    setRooms: (fn) => setData((d) => d && { ...d, rooms: fn(d.rooms) }),
    setTaste: (taste) => setData((d) => d && { ...d, taste }),
    setDay: (day) => setData((d) => d && { ...d, days: { ...d.days, [day.date]: day } }),
    lock,
  };

  return (
    <div className="app">
      <main className="screen">
        {tab === "today" && <Today data={data} actions={actions} />}
        {tab === "house" && <House data={data} actions={actions} />}
        {tab === "history" && <History data={data} actions={actions} />}
        {tab === "elf" && <Elf data={data} actions={actions} />}
      </main>
      <nav className="tabs">
        <TabButton active={tab === "today"} onClick={() => setTab("today")} icon="🌙" label="Tonight" />
        <TabButton active={tab === "house"} onClick={() => setTab("house")} icon="🏠" label="House" />
        <TabButton active={tab === "history"} onClick={() => setTab("history")} icon="📓" label="Log" />
        <TabButton active={tab === "elf"} onClick={() => setTab("elf")} icon="🧝" label="Elf" />
      </nav>
    </div>
  );
}

function TabButton(props: { active: boolean; onClick: () => void; icon: string; label: string }) {
  return (
    <button className={`tab ${props.active ? "active" : ""}`} onClick={props.onClick}>
      <span className="tab-icon">{props.icon}</span>
      <span>{props.label}</span>
    </button>
  );
}
