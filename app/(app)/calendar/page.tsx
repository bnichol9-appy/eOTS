"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/components/AppContext";
import { NightPlanner } from "@/components/home/NightPlanner";
import { fullDate, UpNext } from "@/components/home/Sections";
import { Segment, Topbar, Working } from "@/components/ui";
import { api } from "@/lib/client/api";
import { chosenIdea, nightNumber, range, seasonFor, type Season } from "@/lib/client/season";
import { dayNum, errorMessage, localDate, monthName, prettyDate, REACTIONS } from "@/lib/client/utils";
import type { Day } from "@/lib/types";

const ROOM_SHORT: Record<string, string> = { "living room": "living", bathroom: "bath", hallway: "hall", stairs: "stairs", kitchen: "kitchen", bedroom: "bedroom", "whole house": "house" };
const VIEW_KEY = "eots.calendarView";

/**
 * The whole season at a glance. A summary of done / planned / open nights, the month grid (logged nights show
 * their photo) or a list of every night, and the same night planner as Home for whichever night is selected.
 */
export default function CalendarPage() {
  const { data } = useApp();
  const today = localDate();
  const season = useMemo(() => seasonFor(data.profile, today), [data.profile, today]);
  const homeDate = season.phase === "in" ? today : season.start;
  const [selected, setSelected] = useState(homeDate);
  const [view, setView] = useState<"month" | "list">("month");
  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { actions } = useApp();
  const plannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("date");
    if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) setSelected(q);
    try {
      const v = localStorage.getItem(VIEW_KEY);
      if (v === "list" || v === "month") setView(v);
    } catch {
      /* private mode */
    }
  }, []);

  function changeView(v: "month" | "list") {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* private mode */
    }
  }

  function pick(date: string) {
    setSelected(date);
    requestAnimationFrame(() => plannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  const byDate = new Map(data.days.map((d) => [d.date, d]));
  const openAhead = range(season.start, season.length).filter((d) => nightStatus(byDate, d, today) === "open");

  async function planOpen() {
    setPlanning(true);
    setError(null);
    try {
      const r = await api.planDates(openAhead.slice(0, 7));
      for (const d of r.days) actions.setDay(d);
      actions.toast(`${r.days.length} night${r.days.length === 1 ? "" : "s"} planned.`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPlanning(false);
    }
  }

  const n = nightNumber(season, selected);
  const short = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  const heading = selected === today ? "Tonight" : n === 1 ? `Arrival night · ${short(selected)}` : n === season.length ? `Farewell night · ${short(selected)}` : fullDate(selected);

  return (
    <div className={`screen home ${selected < today && byDate.get(selected)?.status !== "planned" ? "" : "has-actions"}`}>
      <Topbar
        eyebrow={
          season.phase === "pre"
            ? `${season.daysUntil} ${season.daysUntil === 1 ? "sleep" : "sleeps"} to arrival`
            : season.phase === "in"
              ? `Night ${season.nightNumber} of ${season.length}`
              : "Season wrapped"
        }
        title="Your season"
        right={
          season.phase !== "post" &&
          openAhead.length > 0 && (
            <button className="btn small" onClick={() => void planOpen()} disabled={planning}>
              {planning ? "Planning…" : `Plan ${Math.min(7, openAhead.length)} nights`}
            </button>
          )
        }
      />

      <SeasonSummary season={season} today={today} byDate={byDate} />
      {error && <p className="error">{error}</p>}
      {planning && <Working label="The elves are plotting the next few nights…" />}

      <Segment
        options={[
          { key: "month" as const, label: monthName(season.start) },
          { key: "list" as const, label: "Every night" },
        ]}
        value={view}
        onChange={changeView}
      />

      {view === "month" ? (
        <MonthGrid season={season} today={today} selected={selected} byDate={byDate} onPick={pick} />
      ) : (
        <UpNext title={`${season.length} nights`} from={season.start} count={season.length} season={season} selected={selected} onPick={pick} calendarLink={false} />
      )}

      <div ref={plannerRef} className="anchor">
        <NightPlanner date={selected} setDate={setSelected} heading={heading} homeDate={homeDate} homeLabel={season.phase === "in" ? "Back to tonight" : "Back to arrival"} />
      </div>
    </div>
  );
}

function nightStatus(byDate: Map<string, Day>, d: string, today: string) {
  const day = byDate.get(d);
  if (day?.status === "done") return "done";
  if (day?.chosenIdeaId) return "planned";
  if (day?.status === "skipped" || d < today) return "past";
  return "open";
}

function SeasonSummary({ season, today, byDate }: { season: Season; today: string; byDate: Map<string, Day> }) {
  const nights = range(season.start, season.length);
  const counts = { done: 0, planned: 0, open: 0, past: 0 };
  for (const d of nights) counts[nightStatus(byDate, d, today)]++;
  const pct = (k: number) => `${(k / season.length) * 100}%`;
  return (
    <section className="season-summary" aria-label="Season summary">
      <div className="season-legend">
        <span>
          <i className="done" />
          <strong>{counts.done}</strong> done
        </span>
        <span>
          <i className="planned" />
          <strong>{counts.planned}</strong> planned
        </span>
        <span>
          <i />
          <strong>{counts.open}</strong> to plan
        </span>
      </div>
      <div className="season-bar" role="img" aria-label={`${counts.done} done, ${counts.planned} planned, ${counts.open} still to plan, out of ${season.length} nights`}>
        <i className="done" style={{ width: pct(counts.done) }} />
        <i className="planned" style={{ width: pct(counts.planned) }} />
      </div>
    </section>
  );
}

function MonthGrid({ season, today, selected, byDate, onPick }: { season: Season; today: string; selected: string; byDate: Map<string, Day>; onPick: (d: string) => void }) {
  const { data } = useApp();
  const elves = data.profile.elves;
  const monthStart = `${season.start.slice(0, 7)}-01`;
  const cells = useMemo(() => {
    const [y, m] = monthStart.split("-").map(Number);
    const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(y, m, 0).getDate();
    const out: (string | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(`${monthStart.slice(0, 8)}${String(d).padStart(2, "0")}`);
    return out;
  }, [monthStart]);

  function tag(day: Day | undefined, date: string) {
    if (date === season.start) return "arrive";
    if (date === season.end) return "bye";
    const idea = chosenIdea(day);
    if (!idea) return day?.isBusy ? "5 min" : "";
    if (idea.format === "split") return "split";
    const r = idea.roomName.toLowerCase();
    return ROOM_SHORT[r] ?? r.split(" ")[0];
  }

  return (
    <section aria-label="Month">
      <div className="cal-head" aria-hidden="true">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="cal" role="grid">
        {cells.map((date, i) => {
          if (!date) return <span key={`e${i}`} />;
          const d = byDate.get(date);
          const inSeason = date >= season.start && date <= season.end;
          const photo = d?.status === "done" ? d.result?.photoUrl : null;
          const idea = chosenIdea(d);
          const dots = idea ? elves.filter((e) => idea.roles.some((r) => r.elf === e.name)) : [];
          const cls = [
            "cell",
            date === today ? "today" : "",
            d?.status === "done" ? "done" : "",
            d?.status === "planned" ? "planned" : "",
            inSeason && (date === season.start || date === season.end) ? "big" : "",
            date === selected ? "selected" : "",
            photo ? "has-photo" : "",
            inSeason ? "" : "outside",
          ].join(" ");
          const label = `${prettyDate(date)}${idea ? `: ${idea.title}` : ""}${d?.status === "done" && d.result ? `, the kids ${REACTIONS[d.result.reaction - 1]?.toLowerCase()}` : ""}`;
          return (
            <button key={date} className={cls} onClick={() => onPick(date)} aria-label={label} aria-pressed={date === selected} disabled={!inSeason && !d}>
              {photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="" loading="lazy" />
              )}
              <span className="num">{dayNum(date)}</span>
              {!photo && (
                <>
                  <span className="dots">
                    {dots.map((e) => (
                      <i key={e.name} className={e.color} />
                    ))}
                  </span>
                  <span className="room">{tag(d, date)}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
      <div className="legend">
        {elves.map((e) => (
          <span key={e.name}>
            <i style={{ background: `var(--${e.color})` }} />
            {e.name}
          </span>
        ))}
        <span>
          <span className="box" />
          Big night
        </span>
        <span>Photo = logged</span>
      </div>
    </section>
  );
}
