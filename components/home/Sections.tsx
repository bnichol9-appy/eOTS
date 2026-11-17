"use client";
import Link from "next/link";
import { ChevronRight, Home, MessageSquare, ThumbsUp, Trophy, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppContext";
import { Checkbox, ElfAvatar, Tiles } from "@/components/ui";
import { api } from "@/lib/client/api";
import { chosenIdea, nightNumber, photoNights, range, type Season } from "@/lib/client/season";
import { dayNum, errorMessage, REACTIONS, shiftDate, timeAgo, weekday } from "@/lib/client/utils";
import { formatWord, type Day, type Elf, type PostSummary } from "@/lib/types";

const SM = { size: 16, strokeWidth: 1.8 };

function SectionHead({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="section-head">
      <h2 className="section-title">{title}</h2>
      {action}
    </div>
  );
}

function fullDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function elfNames(elves: Elf[]) {
  if (!elves.length) return "your elf";
  if (elves.length === 1) return elves[0].name;
  return `${elves
    .slice(0, -1)
    .map((e) => e.name)
    .join(", ")} and ${elves[elves.length - 1].name}`;
}

/* ---------- Pre-season: countdown and build-up ---------- */

export function Countdown({ season, ready, total }: { season: Season; ready: number; total: number }) {
  const { data } = useApp();
  const elves = data.profile.elves;
  const who = elfNames(elves);
  const n = season.daysUntil;
  return (
    <section className="countdown" aria-label="Countdown to arrival">
      <div className="countdown-top">
        <div>
          <div className="eyebrow">The build-up</div>
          <div className="countdown-num">
            {n}
            <span>{n === 1 ? "sleep" : "sleeps"}</span>
          </div>
          <p className="countdown-line">
            until {who} {elves.length > 1 ? "arrive" : "arrives"} on {fullDate(season.start)}
          </p>
        </div>
        <div className="countdown-elves" aria-hidden="true">
          {(elves.length ? elves : [{ name: "?", personality: "", color: "elf1" as const }]).slice(0, 3).map((e) => (
            <ElfAvatar key={e.name} elf={e} size="xl" />
          ))}
        </div>
      </div>
      <div className="ready">
        <div className="between small">
          <span className="bold">Ready for arrival</span>
          <span className="muted">
            {ready} of {total}
          </span>
        </div>
        <div className="ready-bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={ready} aria-label="Ready for arrival">
          <i
            style={{
              width: `${Math.round((ready / Math.max(1, total)) * 100)}%`,
            }}
          />
        </div>
      </div>
    </section>
  );
}

export interface BuildStep {
  key: string;
  label: string;
  detail: string;
  done: boolean;
  href?: string;
  onClick?: () => void;
  optional?: boolean;
}

export function buildUpSteps({ season, onPlanArrival }: { season: Season; onPlanArrival: () => void }, data: ReturnType<typeof useApp>["data"]): BuildStep[] {
  const elves = data.profile.elves;
  const roomsWithPhotos = data.rooms.filter((r) => r.photos.length > 0).length;
  const byDate = new Map(data.days.map((d) => [d.date, d]));
  const arrival = byDate.get(season.start);
  const firstWeek = range(season.start, 7);
  const weekPlanned = firstWeek.filter((d) => byDate.get(d)?.chosenIdeaId).length;
  return [
    {
      key: "elf",
      label: elves.length > 1 ? "Meet your elves" : "Meet your elf",
      detail: elves.length && elves.every((e) => e.personality) ? elves.map((e) => e.name).join(", ") : "Name them and give them a personality",
      done: elves.length > 0 && elves.every((e) => e.personality.trim()),
      href: "/settings",
    },
    {
      key: "rooms",
      label: "Photograph your rooms",
      detail: `${Math.min(roomsWithPhotos, 3)} of 3 rooms · the ideas fit your actual house`,
      done: roomsWithPhotos >= 3,
      href: roomsWithPhotos ? "/rooms" : "/rooms/new",
    },
    {
      key: "arrival",
      label: "Plan arrival night",
      detail: chosenIdea(arrival)?.title ?? `${fullDate(season.start)} is a big night`,
      done: Boolean(arrival?.chosenIdeaId),
      onClick: onPlanArrival,
    },
    {
      key: "week",
      label: "Plan the first week",
      detail: `${weekPlanned} of 7 nights locked in`,
      done: weekPlanned >= 7,
      href: "/calendar",
    },
    {
      key: "push",
      label: "Turn on reminders",
      detail: "A nudge at set-up time, and the morning after",
      done: data.user.pushEnabled,
      href: "/settings",
    },
    {
      key: "partner",
      label: "Bring in your co-parent",
      detail: "Share the house, the plan and the 11pm shift",
      done: data.family.members.length > 1,
      href: "/settings",
      optional: true,
    },
    {
      key: "circle",
      label: "Start a circle with friends",
      detail: "Swap set-ups with families you know",
      done: data.circles.length > 0,
      href: "/ideas",
      optional: true,
    },
  ];
}

export function BuildUpList({ steps }: { steps: BuildStep[] }) {
  const ordered = [...steps.filter((s) => !s.done), ...steps.filter((s) => s.done)];
  return (
    <section aria-label="Get ready">
      <SectionHead title="Get ready" />
      <div className="list buildup">
        {ordered.map((s) => {
          const inner = (
            <>
              <Checkbox on={s.done} label={s.done ? `${s.label}: done` : s.label} disabled />
              <span className="grow">
                <span className={`buildup-label ${s.done ? "done" : ""}`}>
                  {s.label}
                  {s.optional && !s.done && <span className="muted small"> · optional</span>}
                </span>
                <span className="buildup-detail">{s.detail}</span>
              </span>
              {!s.done && <ChevronRight {...SM} className="muted" aria-hidden="true" />}
            </>
          );
          return s.href ? (
            <Link key={s.key} href={s.href} className="list-row">
              {inner}
            </Link>
          ) : (
            <button key={s.key} className="list-row" onClick={s.onClick}>
              {inner}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- The next few nights ---------- */

export function UpNext({ title, from, count, season, selected, onPick }: { title: string; from: string; count: number; season: Season; selected: string; onPick: (date: string) => void }) {
  const { data, actions } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const byDate = new Map(data.days.map((d) => [d.date, d]));
  const dates = range(from, count).filter((d) => d <= season.end || season.phase === "post");
  const unplanned = dates.filter((d) => !byDate.get(d)?.chosenIdeaId && byDate.get(d)?.status !== "done" && byDate.get(d)?.status !== "skipped");
  const elves = data.profile.elves;

  async function planAll() {
    setBusy(true);
    setError(null);
    try {
      const r = await api.planDates(unplanned);
      for (const d of r.days) actions.setDay(d);
      actions.toast(`${r.days.length} night${r.days.length === 1 ? "" : "s"} planned.`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (!dates.length) return null;
  return (
    <section aria-label={title}>
      <SectionHead
        title={title}
        action={
          <Link href="/calendar" className="link-btn small">
            Calendar
          </Link>
        }
      />
      <div className="nights" role="list">
        {dates.map((d) => {
          const day = byDate.get(d);
          const idea = chosenIdea(day);
          const n = nightNumber(season, d);
          const big = n === 1 || n === season.length;
          const status = day?.status === "done" ? "done" : idea ? "planned" : day?.isBusy ? "busy" : day?.ideas.length ? "ideas" : "open";
          const label =
            status === "done"
              ? `Done · ${REACTIONS[(day?.result?.reaction ?? 4) - 1]?.toLowerCase()}`
              : status === "planned"
                ? idea!.title
                : status === "busy"
                  ? "Busy night"
                  : status === "ideas"
                    ? `${day!.ideas.length} ideas to pick from`
                    : day?.status === "skipped"
                      ? "Night off"
                      : "Not planned";
          const roles = idea ? elves.filter((e) => idea.roles.some((r) => r.elf === e.name)) : [];
          return (
            <button key={d} role="listitem" className={`night ${status} ${big ? "big" : ""} ${d === selected ? "selected" : ""}`} onClick={() => onPick(d)} aria-label={`${fullDate(d)}: ${label}`}>
              <span className="night-date">
                <span>{weekday(d)}</span>
                <strong>{dayNum(d)}</strong>
              </span>
              <span className="night-body">
                <span className="night-meta">
                  {n ? (n === 1 ? "Arrival" : n === season.length ? "Farewell" : `Night ${n}`) : "Bonus"}
                  {idea ? ` · ${idea.roomName}` : ""}
                  {idea && idea.format !== "single" ? ` · ${formatWord(idea.format)}` : ""}
                </span>
                <span className="night-title">{label}</span>
              </span>
              {roles.length > 0 && (
                <span className="night-dots" aria-hidden="true">
                  {roles.map((e) => (
                    <i key={e.name} style={{ background: `var(--${e.color})` }} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {error && <p className="error">{error}</p>}
      {unplanned.length > 1 && (
        <button className="btn secondary full" onClick={() => void planAll()} disabled={busy}>
          {busy ? "The elves are plotting…" : `Plan the ${unplanned.length} open nights`}
        </button>
      )}
    </section>
  );
}

/* ---------- Highlights ---------- */

export function LastNight({ date, onLog, onOpen }: { date: string; onLog: () => void; onOpen: () => void }) {
  const { data } = useApp();
  const day = data.days.find((d) => d.date === date);
  const idea = chosenIdea(day);
  if (!day || (!idea && day.status !== "done")) return null;
  if (day.status === "planned") {
    return (
      <section className="card accent-border last-night-ask">
        <div className="eyebrow">Last night</div>
        <h3 className="card-title">How did {idea?.title ?? "it"} go?</h3>
        <p className="body">Thirty seconds: a photo and the kids&apos; reaction. The elves learn what lands in your house.</p>
        <button className="btn primary full" onClick={onLog}>
          Log last night
        </button>
      </section>
    );
  }
  if (day.status !== "done" || !day.result) return null;
  return (
    <section aria-label="Last night">
      <SectionHead title="Last night" />
      <button className="highlight" onClick={onOpen}>
        {day.result.photoUrl && (
          <span className="photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={day.result.photoUrl} alt="" />
            <span className="sample">The kids {REACTIONS[day.result.reaction - 1]?.toLowerCase()}</span>
          </span>
        )}
        <span className="highlight-text">
          <strong>{idea?.title ?? "Last night's set-up"}</strong>
          {day.result.learned && <span className="body small">{day.result.learned}</span>}
        </span>
      </button>
    </section>
  );
}

export function SeasonSoFar({
  title,
  from,
  to,
  onOpen,
  showEmpty = false,
  showStats = true,
  finished = false,
}: {
  title: string;
  from: string;
  to: string;
  onOpen: (date: string) => void;
  showEmpty?: boolean;
  showStats?: boolean;
  finished?: boolean;
}) {
  const { data } = useApp();
  const nights = data.days.filter((d) => d.status === "done" && d.date >= from && d.date <= to);
  const photos = photoNights(data.days, from, to).slice(0, 6);
  if (!nights.length && !showEmpty) return null;
  const best = [...nights].sort((a, b) => (b.result?.reaction ?? 0) - (a.result?.reaction ?? 0))[0];
  return (
    <section aria-label={title}>
      <SectionHead title={title} />
      {showStats && (
        <Tiles
          items={[
            { label: "Nights", value: String(nights.length) },
            { label: "Streak", value: `${data.stats.streak}` },
            { label: "Upvotes", value: String(data.stats.upvotesReceived) },
          ]}
        />
      )}
      {photos.length > 0 && (
        <div className="mosaic">
          {photos.map((d) => (
            <button key={d.date} className="mosaic-cell" onClick={() => onOpen(d.date)} aria-label={`${fullDate(d.date)}: ${chosenIdea(d)?.title ?? "set-up"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={d.result!.photoUrl!} alt="" loading="lazy" />
              <span>{dayNum(d.date)}</span>
            </button>
          ))}
        </div>
      )}
      {best?.result && best.result.reaction >= 4 && (
        <p className="body small">
          {finished || !showStats ? "Biggest hit" : "Biggest hit so far"}: <strong>{chosenIdea(best)?.title ?? fullDate(best.date)}</strong>. The kids{" "}
          {REACTIONS[best.result.reaction - 1]?.toLowerCase()}.
        </p>
      )}
    </section>
  );
}

/* ---------- Other elves ---------- */

export function Community({ today, heading = "Other elves" }: { today: string; heading?: string }) {
  const { data } = useApp();
  const [posts, setPosts] = useState<PostSummary[] | null>(null);
  useEffect(() => {
    api
      .feed({ sort: "hot" })
      .then((r) => setPosts(r.posts.filter((p) => !p.viewer.mine).slice(0, 8)))
      .catch(() => setPosts([]));
  }, []);
  const challenge = data.challenge;
  const daysLeft = challenge ? Math.max(0, Math.round((Date.parse(`${challenge.endsOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000)) : 0;
  const activity = data.circles
    .flatMap((c) => c.recent.map((r) => ({ ...r, circle: c.name, circleId: c.id })))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);

  return (
    <section aria-label={heading} className="community">
      <SectionHead
        title={heading}
        action={
          <Link href="/ideas" className="link-btn small">
            See all
          </Link>
        }
      />

      {challenge && (
        <Link href={`/ideas/challenges/${challenge.id}`} className="challenge">
          <span className="challenge-icon" aria-hidden="true">
            <Trophy {...SM} size={20} />
          </span>
          <span className="grow">
            <span className="eyebrow">Challenge · {daysLeft === 0 ? "last day" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}</span>
            <strong>{challenge.title}</strong>
            <span className="muted small">
              {challenge.entries} {challenge.entries === 1 ? "entry" : "entries"} so far
            </span>
          </span>
          <ChevronRight {...SM} className="muted" aria-hidden="true" />
        </Link>
      )}

      {posts === null ? (
        <div className="post-strip" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="post-mini skeleton" />
          ))}
        </div>
      ) : posts.length > 0 ? (
        <div className="post-strip" role="list">
          {posts.map((p) => (
            <Link key={p.id} href={`/ideas/${p.id}`} className="post-mini" role="listitem">
              <span className="photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.photoUrl} alt="" loading="lazy" />
              </span>
              <span className="post-mini-body">
                <span className="eyebrow">
                  {p.author.elfName} · {p.roomType}
                </span>
                <strong>{p.title}</strong>
                <span className="post-mini-stats">
                  <span>
                    <ThumbsUp {...SM} size={14} /> {p.upvotes}
                  </span>
                  <span>
                    <Home {...SM} size={14} /> {p.uses}
                  </span>
                  <span>
                    <MessageSquare {...SM} size={14} /> {p.commentsCount}
                  </span>
                </span>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="muted small">Nobody&apos;s shared a set-up yet. Log a night with a photo and yours can be the first.</p>
      )}

      {activity.length > 0 ? (
        <div className="list">
          {activity.map((a, i) => (
            <Link key={i} href={a.postId ? `/ideas/${a.postId}` : `/ideas/circles/${a.circleId}`} className="list-row activity">
              <Users {...SM} className="pine" aria-hidden="true" />
              <span className="grow">
                <strong>{a.elfName}</strong> did {a.title}
                <span className="muted small">
                  {" "}
                  · {a.circle} · {timeAgo(`${a.date}T20:00:00`)}
                </span>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        data.circles.length === 0 && (
          <Link href="/ideas" className="list-row activity">
            <Users {...SM} className="pine" aria-hidden="true" />
            <span className="grow">
              Start a circle with friends
              <span className="muted small"> · see what their elves get up to each night</span>
            </span>
            <ChevronRight {...SM} className="muted" aria-hidden="true" />
          </Link>
        )
      )}
    </section>
  );
}

/* ---------- After the season ---------- */

export function Wrap({ season, today }: { season: Season; today: string }) {
  const { data } = useApp();
  const done = data.days.filter((d) => d.status === "done" && d.date >= season.start && d.date <= season.end);
  const nextStart = `${Number(season.start.slice(0, 4)) + 1}${season.start.slice(4)}`;
  const daysToNext = Math.round((Date.parse(`${nextStart}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  return (
    <section className="countdown" aria-label="Season wrap">
      <div className="eyebrow">That&apos;s a wrap on {season.start.slice(0, 4)}</div>
      <div className="countdown-num">
        {done.length}
        <span>{done.length === 1 ? "night of mischief" : "nights of mischief"}</span>
      </div>
      <p className="countdown-line">
        {elfNames(data.profile.elves)} {data.profile.elves.length > 1 ? "are" : "is"} back on {fullDate(nextStart)}. That&apos;s {daysToNext} sleeps.
      </p>
    </section>
  );
}

export function dayIsOpen(day: Day | undefined) {
  return !day || (day.status === "open" && !day.chosenIdeaId);
}

export { fullDate, shiftDate };
