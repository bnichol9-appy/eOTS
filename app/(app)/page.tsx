"use client";
import Link from "next/link";
import { Settings } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/components/AppContext";
import { NightPlanner } from "@/components/home/NightPlanner";
import { BuildUpList, buildUpSteps, Community, Countdown, fullDate, LastNight, SeasonSoFar, UpNext, Wrap } from "@/components/home/Sections";
import { Bell, Garland, ICON } from "@/components/ui";
import { APP_NAME } from "@/lib/brand";
import { nightNumber, seasonFor } from "@/lib/client/season";
import { localDate, shiftDate } from "@/lib/client/utils";

/**
 * Home. Before the season: a countdown, a get-ready checklist, arrival night and the first week.
 * During: tonight's plan, last night, the next few nights, the season so far and what other elves are up to.
 * After: the season wrap and the community.
 */
export default function HomePage() {
  const { data } = useApp();
  const today = localDate();
  const season = useMemo(() => seasonFor(data.profile, today), [data.profile, today]);
  const defaultDate = season.phase === "pre" ? season.start : today;
  const [date, setDate] = useState(defaultDate);
  const [logYesterday, setLogYesterday] = useState(false);
  const plannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("date");
    if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) setDate(q);
  }, []);

  function show(d: string) {
    setDate(d);
    requestAnimationFrame(() => plannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  const yesterday = shiftDate(today, -1);
  const n = nightNumber(season, date);
  const short = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  const heading = date === today ? "Tonight" : n === 1 ? `Arrival night · ${short(date)}` : n === season.length ? `Farewell night · ${short(date)}` : fullDate(date);

  const steps = buildUpSteps({ season, onPlanArrival: () => show(season.start) }, data);
  const required = steps.filter((s) => !s.optional);

  return (
    <div className={`screen home ${season.phase === "post" ? "" : "has-actions"}`}>
      <header className="topbar">
        <div className="titles">
          <Garland />
          <div className="brand">{APP_NAME}</div>
        </div>
        <Bell unread={data.unread} />
        <Link href="/settings" className="icon-btn" aria-label="Settings">
          <Settings {...ICON} size={20} />
        </Link>
      </header>

      {season.phase === "pre" && (
        <>
          <Countdown season={season} ready={required.filter((s) => s.done).length} total={required.length} />
          <BuildUpList steps={steps} />
          <div ref={plannerRef} className="anchor">
            <NightPlanner
              date={date}
              setDate={setDate}
              heading={heading}
              homeDate={season.start}
              homeLabel="Back to arrival"
              emptyText="Arrival night sets the tone for the whole season, so it's worth planning ahead. Tap Plan for three entrances built for your rooms."
            />
          </div>
          <UpNext title="The first week" from={season.start} count={7} season={season} selected={date} onPick={show} />
          <SeasonSoFar title="Last year's best" from={`${Number(today.slice(0, 4)) - 1}-01-01`} to={`${Number(today.slice(0, 4)) - 1}-12-31`} onOpen={show} showStats={false} />
          <Community today={today} heading="From other elves" />
        </>
      )}

      {season.phase === "in" && (
        <>
          <div ref={plannerRef} className="anchor">
            <NightPlanner date={date} setDate={setDate} heading={heading} homeDate={today} openComplete={logYesterday && date === yesterday} onCompleteOpened={() => setLogYesterday(false)} />
          </div>
          {date === today && yesterday >= season.start && (
            <LastNight
              date={yesterday}
              onOpen={() => show(yesterday)}
              onLog={() => {
                setLogYesterday(true);
                show(yesterday);
              }}
            />
          )}
          <UpNext title="Coming up" from={shiftDate(today, 1)} count={5} season={season} selected={date} onPick={show} />
          <Community today={today} />
          <SeasonSoFar title="Your season so far" from={season.start} to={season.end} onOpen={show} />
        </>
      )}

      {season.phase === "post" && (
        <>
          <Wrap season={season} today={today} />
          <SeasonSoFar title="Your season" from={season.start} to={season.end} onOpen={(d) => (window.location.href = `/calendar?date=${d}`)} showEmpty finished />
          <Community today={today} heading="The best of other elves" />
        </>
      )}
    </div>
  );
}
