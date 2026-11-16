"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "@/components/AppContext";
import { AssistantSheet } from "@/components/AssistantSheet";
import { ICON_SM, Topbar, Working } from "@/components/ui";
import { friendlyTime, nightBeforeMessage } from "@/lib/assistant";
import { api } from "@/lib/client/api";
import { dayNum, errorMessage, localDate, monthName, prettyDate } from "@/lib/client/utils";
import { formatWord, type Day } from "@/lib/types";

const ROOM_SHORT: Record<string, string> = { "living room": "living", bathroom: "bath", hallway: "hall", stairs: "stairs", kitchen: "kitchen", bedroom: "bedroom", "whole house": "house" };

export default function CalendarPage() {
  const { data, actions } = useApp();
  const router = useRouter();
  const today = localDate();
  const year = Number(today.slice(0, 4));
  const start = `${year}-${data.profile.seasonStart}`;
  const end = `${year}-${data.profile.seasonEnd}`;
  const [selected, setSelected] = useState(today >= start && today <= end ? today : start);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remind, setRemind] = useState(false);

  // Grid covers the month of the season start, Monday first.
  const monthStart = `${start.slice(0, 7)}-01`;
  const cells = useMemo(() => {
    const [y, m] = monthStart.split("-").map(Number);
    const first = new Date(y, m - 1, 1);
    const offset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(y, m, 0).getDate();
    const out: (string | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(`${monthStart.slice(0, 8)}${String(d).padStart(2, "0")}`);
    return out;
  }, [monthStart]);

  const byDate = new Map(data.days.map((d) => [d.date, d]));
  const seasonDays = cells.filter((d): d is string => Boolean(d) && d! >= start && d! <= end);
  const done = seasonDays.filter((d) => byDate.get(d)?.status === "done").length;
  const sel: Day | undefined = byDate.get(selected);
  const selIdea = sel?.ideas.find((i) => i.id === sel.chosenIdeaId);
  const elves = data.profile.elves;

  async function planWeek() {
    setBusy(true);
    setError(null);
    try {
      const from = today < start ? start : today;
      const r = await api.plan(from, 4);
      for (const d of r.days) actions.setDay(d);
      actions.toast("The next four nights are planned.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function planOne(date: string) {
    setBusy(true);
    setError(null);
    try {
      const r = await api.planDates([date]);
      for (const d of r.days) actions.setDay(d);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function roomTag(d: Day | undefined, date: string) {
    if (date === start) return "arrive";
    if (date === end) return "farewell";
    if (!d) return "";
    const idea = d.ideas.find((i) => i.id === d.chosenIdeaId);
    if (!idea) return d.isBusy ? "5 min" : "";
    if (idea.format === "split") return "split";
    const r = idea.roomName.toLowerCase();
    return ROOM_SHORT[r] ?? r.split(" ")[0];
  }

  return (
    <div className="screen">
      <Topbar
        eyebrow={`${done} done · ${Math.max(0, seasonDays.length - done)} to go`}
        title={monthName(start)}
        right={
          <button className="btn small" onClick={() => void planWeek()} disabled={busy}>
            {busy ? "Planning…" : "Plan the week"}
          </button>
        }
      />
      {error && <p className="error">{error}</p>}
      {busy && <Working label="Planning the next nights…" />}

      <div className="cal-head" aria-hidden="true">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="cal" role="grid">
        {cells.map((date, i) => {
          if (!date) return <span key={`e${i}`} />;
          const d = byDate.get(date);
          const inSeason = date >= start && date <= end;
          const cls = [
            "cell",
            date === today ? "today" : "",
            d?.status === "done" ? "done" : "",
            d?.status === "planned" ? "planned" : "",
            inSeason && (date === start || date === end) ? "big" : "",
            date === selected ? "selected" : "",
            inSeason ? "" : "outside",
          ].join(" ");
          const idea = d?.ideas.find((x) => x.id === d.chosenIdeaId);
          const dots = idea ? (idea.format === "solo" ? elves.slice(0, 1) : elves) : inSeason && date >= today ? elves : [];
          return (
            <button key={date} className={cls} onClick={() => setSelected(date)} aria-label={prettyDate(date)} aria-pressed={date === selected}>
              {dayNum(date)}
              <span className="dots">
                {dots.map((e) => (
                  <i key={e.name} className={e.color} />
                ))}
              </span>
              <span className="room">{roomTag(d, date)}</span>
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
        {elves.length > 1 && <span>Same room = duo · tag shows room</span>}
        <span>
          <span className="box" />
          Big night
        </span>
      </div>

      <div className="card filled stack">
        <div className="eyebrow">
          {sel?.status === "done" ? "Done" : sel?.status === "planned" ? "Planned" : sel?.isBusy ? "Busy night" : "Not planned"} · {prettyDate(selected)}
        </div>
        {selIdea ? (
          <>
            <h2>{selIdea.format !== "single" ? `${formatWord(selIdea.format)}: ` : ""}{selIdea.title}</h2>
            <p className="body">
              {selIdea.pitch}
              {selIdea.kit.some((k) => !k.commonlyAtHome) ? ` Needs ${selIdea.kit.filter((k) => !k.commonlyAtHome).map((k) => k.name).join(" and ")}.` : ""}
            </p>
            {sel?.status === "planned" && selected > today && (
              <button className="link-btn row" onClick={() => setRemind(true)}>
                <MessageSquare {...ICON_SM} className="pine" /> Text me a reminder the night before
              </button>
            )}
            <div className="row">
              <button className="btn small" onClick={() => router.push(selected === today ? "/" : `/?date=${selected}`)}>
                Open the night
              </button>
              {sel?.status === "done" && sel.postId && (
                <Link href={`/ideas/${sel.postId}`} className="btn small">
                  See the post
                </Link>
              )}
            </div>
          </>
        ) : (
          <>
            <h2>{selected < today ? "Nothing logged" : "Nothing planned yet"}</h2>
            <p className="body">{selected < today ? "The elves slept in." : "Plan this night on its own, or plan the next four from today."}</p>
            {selected >= today && (
              <div className="row">
                <button className="btn small primary" onClick={() => void planOne(selected)} disabled={busy}>
                  Plan this night
                </button>
                <button className="btn small" onClick={() => void api.setBusy(selected, !sel?.isBusy).then((r) => actions.setDay(r.day))}>
                  {sel?.isBusy ? "Not busy after all" : "Mark busy"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {remind && selIdea && (
        <AssistantSheet
          title="Remind me the night before"
          message={nightBeforeMessage(friendlyTime(data.user.settings.eveningReminder ?? "21:00"), selIdea.title, selIdea.kit.filter((k) => !k.commonlyAtHome).map((k) => k.name))}
          settings={data.user.settings.assistant}
          onChannel={(channel) => void api.saveSettings({ assistant: { channel } }).then(actions.setSettings)}
          onClose={() => setRemind(false)}
        />
      )}
    </div>
  );
}

