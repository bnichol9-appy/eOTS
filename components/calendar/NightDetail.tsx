"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, ChevronRight, Lightbulb, MessageSquare, Moon, Share2, ShoppingBag, Sparkles } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/AppContext";
import { AssistantSheet } from "@/components/AssistantSheet";
import { Actions, ElfAvatar, ICON_SM, Tiles, Working } from "@/components/ui";
import { datedRemindMessage, friendlyTime } from "@/lib/assistant";
import { api } from "@/lib/client/api";
import { chosenIdea } from "@/lib/client/season";
import { errorMessage, localDate, REACTIONS, shiftDate } from "@/lib/client/utils";
import { samplePhoto } from "@/lib/placeholders";
import { formatWord, messWord, type Day } from "@/lib/types";

const SM = { size: 18, strokeWidth: 1.8 };

export type NightState = "logged" | "planned" | "unlogged" | "ideas" | "open" | "quiet";

/** What a calendar night is, from the parent's point of view. */
export function nightState(day: Day | undefined, date: string, today: string): NightState {
  if (day?.status === "done") return "logged";
  if (day?.chosenIdeaId) return date < today ? "unlogged" : "planned";
  if (date < today) return "quiet";
  if (day?.ideas.length && day.status === "open") return "ideas";
  return "open";
}

export const nightHasActions = (s: NightState) => s !== "quiet";

/**
 * The selected night under the calendar. Shows what happened or what's planned, and hands the heavy lifting
 * (picking, logging, sharing) to that night on Home, which already does it.
 */
export function NightDetail({ date, day, heading, eyebrow, big }: { date: string; day: Day | undefined; heading: string; eyebrow: string; big: boolean }) {
  const { data, actions } = useApp();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remind, setRemind] = useState(false);
  const now = localDate();
  const state = nightState(day, date, now);
  const idea = chosenIdea(day);
  const elves = data.profile.elves;
  const open = () => router.push(`/?date=${date}`);
  const room = idea ? data.rooms.find((r) => r.name.toLowerCase() === idea.roomName.toLowerCase()) : undefined;
  const toBuy = idea ? idea.kit.filter((k) => !(day?.kitState[k.name.trim().toLowerCase()] ?? k.commonlyAtHome)) : [];
  const setupTime = data.user.settings.eveningReminder ?? "21:00";

  async function run(label: string, fn: () => Promise<{ day: Day } | { days: Day[] }>) {
    setBusy(label);
    setError(null);
    try {
      const r = await fn();
      if ("day" in r) actions.setDay(r.day);
      else for (const d of r.days) actions.setDay(d);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="night-detail" aria-label={heading}>
      <div className="section-head">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h2 className="section-title">{heading}</h2>
        </div>
        {big && <span className="tag line">Big night</span>}
      </div>
      {error && <p className="error">{error}</p>}

      {busy === "plan" ? (
        <Working label="The elves are plotting…" />
      ) : state === "logged" && day?.result ? (
        <div className="countdown nd-card">
          {day.result.photoUrl ? (
            <div className="photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={day.result.photoUrl} alt="" />
              <span className="sample">The kids {REACTIONS[day.result.reaction - 1]?.toLowerCase()}</span>
            </div>
          ) : null}
          <div>
            <div className="eyebrow">Logged{idea ? ` · ${idea.roomName}` : ""}</div>
            <h3 className="card-title">{idea?.title ?? "The elves' night"}</h3>
            {!day.result.photoUrl && <p className="muted small">The kids {REACTIONS[day.result.reaction - 1]?.toLowerCase()}. No photo for this one.</p>}
          </div>
          {day.result.feedbackTags.length > 0 && (
            <div className="hooks">
              {day.result.feedbackTags.map((t) => (
                <span key={t} className="tag line">
                  {t}
                </span>
              ))}
            </div>
          )}
          {day.result.notes && <p className="body">{day.result.notes}</p>}
          {day.result.learned && (
            <div className="nd-learned">
              <Lightbulb {...SM} aria-hidden="true" />
              <p className="body small">{day.result.learned}</p>
            </div>
          )}
        </div>
      ) : (state === "planned" || state === "unlogged") && idea ? (
        <div className="countdown nd-card">
          <div className="nd-plan">
            <span className="idea-thumb nd-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={room?.photos[0]?.url ?? samplePhoto(idea.roomName, room?.isKidsRoom)} alt="" />
            </span>
            <div className="grow">
              <div className="eyebrow">
                {state === "unlogged" ? "Planned, not logged" : "Planned"} · {idea.roomName}
                {idea.format !== "single" ? ` · ${formatWord(idea.format)}` : ""}
              </div>
              <h3 className="card-title">{idea.title}</h3>
            </div>
          </div>
          <p className="body">{idea.pitch}</p>
          {idea.roles.length > 0 && (
            <div className="tonight-roles">
              {idea.roles.map((r, i) => {
                const elf = elves.find((e) => e.name === r.elf) ?? { name: r.elf || "?", color: "elf3" as const };
                return (
                  <span key={i}>
                    <ElfAvatar elf={elf} /> {r.spotLabel || r.roomName}
                  </span>
                );
              })}
            </div>
          )}
          <Tiles
            items={[
              { label: "Set-up", value: `${idea.setupMinutes} min` },
              { label: "Mess", value: messWord(idea.mess) },
              { label: "Spook", value: `${idea.spook} / 5` },
            ]}
          />
          {state === "planned" && (
            <div className="list">
              <Link href={`/kit?from=${date}`} className="list-row set-row">
                <ShoppingBag {...SM} className="row-icon" aria-hidden="true" />
                <span className="row-label">
                  Kit
                  <span className="row-sub">{idea.kit.length === 0 ? "Nothing needed" : toBuy.length ? `${toBuy.length} to buy: ${toBuy.map((k) => k.name).join(", ")}` : "All at home"}</span>
                </span>
                <ChevronRight {...SM} className="muted" aria-hidden="true" />
              </Link>
              <button className="list-row set-row" onClick={() => setRemind(true)}>
                <MessageSquare {...SM} className="row-icon pine" aria-hidden="true" />
                <span className="row-label">
                  Remind me
                  <span className="row-sub">
                    {date === now ? "Tonight" : date === shiftDate(now, 1) ? "Tomorrow" : "On the night"} at {friendlyTime(setupTime)}, via your assistant
                  </span>
                </span>
                <ChevronRight {...SM} className="muted" aria-hidden="true" />
              </button>
            </div>
          )}
          {state === "unlogged" && <p className="muted small">Log it with a photo and the kids&apos; reaction and the elves learn what lands in your house.</p>}
        </div>
      ) : state === "ideas" && day ? (
        <div className="countdown nd-card">
          <div className="eyebrow">Not picked yet</div>
          <h3 className="card-title">
            {day.ideas.length} idea{day.ideas.length === 1 ? "" : "s"} waiting
          </h3>
          <div className="list">
            {day.ideas.slice(0, 4).map((i) => (
              <button key={i.id} className="list-row set-row" onClick={open}>
                <Sparkles {...SM} className="row-icon" aria-hidden="true" />
                <span className="row-label">
                  <strong>{i.title}</strong>
                  <span className="row-sub">
                    {i.roomName} · {i.setupMinutes} min
                  </span>
                </span>
                <ChevronRight {...SM} className="muted" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      ) : state === "open" ? (
        <div className="countdown nd-card">
          <div className="eyebrow">{day?.isBusy ? "Marked busy" : "Nothing planned yet"}</div>
          <h3 className="card-title">{big ? "A big night: worth planning ahead" : day?.isBusy ? "A quick one, then" : "Free night"}</h3>
          <p className="body">{day?.isBusy ? "Busy nights get five-minute ideas with nothing to buy." : "Plan it now and the elves pick a set-up for your rooms. You can still change it later."}</p>
          <div className="list">
            <button className="list-row set-row" onClick={() => void run("busy", () => api.setBusy(date, !day?.isBusy))} disabled={busy !== null}>
              <CalendarClock {...SM} className="row-icon" aria-hidden="true" />
              <span className="row-label">
                {day?.isBusy ? "Not busy after all" : "Busy night"}
                <span className="row-sub">{day?.isBusy ? "Back to normal-sized ideas" : "Five minutes, no mess, nothing to buy"}</span>
              </span>
            </button>
            <button className="list-row set-row" onClick={() => void run("skip", () => api.skip(date))} disabled={busy !== null}>
              <Moon {...SM} className="row-icon" aria-hidden="true" />
              <span className="row-label">
                Night off
                <span className="row-sub">The elves stay put this time</span>
              </span>
            </button>
          </div>
        </div>
      ) : (
        <div className="nd-quiet">
          <Moon {...SM} aria-hidden="true" />
          <p className="muted">{day?.status === "skipped" ? "The elves had the night off." : "Nothing was planned or logged this night."}</p>
          {day?.status === "skipped" && date >= now && (
            <button className="link-btn small" onClick={() => void run("reopen", () => api.reopen(date))}>
              Plan it after all
            </button>
          )}
        </div>
      )}

      {nightHasActions(state) && (
        <Actions>
          {state === "logged" ? (
            <>
              <button className="btn secondary" onClick={open}>
                Open
              </button>
              {day?.postId ? (
                <Link href={`/ideas/${day.postId}`} className="btn primary">
                  See the post
                </Link>
              ) : day?.result?.photoUrl ? (
                <button className="btn primary" onClick={open}>
                  <Share2 {...ICON_SM} /> Share it
                </button>
              ) : (
                <Link href="/ideas?tab=elves" className="btn primary">
                  See other elves
                </Link>
              )}
            </>
          ) : state === "planned" ? (
            <>
              <button className="btn secondary" onClick={() => void run("unchoose", () => api.unchoose(date))} disabled={busy !== null}>
                Change
              </button>
              <button className="btn primary" onClick={open}>
                {date === now ? "Open tonight" : "Open the plan"}
              </button>
            </>
          ) : state === "unlogged" ? (
            <button className="btn primary" onClick={open}>
              Log how it went
            </button>
          ) : state === "ideas" ? (
            <button className="btn primary" onClick={open}>
              Pick one
            </button>
          ) : (
            <>
              <button className="btn secondary" onClick={open}>
                Tweak first
              </button>
              <button className="btn primary" onClick={() => void run("plan", () => api.planDates([date]))} disabled={busy !== null}>
                Plan this night
              </button>
            </>
          )}
        </Actions>
      )}

      {remind && idea && (
        <AssistantSheet
          title={`Remind me at ${friendlyTime(setupTime)}`}
          message={datedRemindMessage(
            date === now ? "tonight" : date === shiftDate(now, 1) ? "tomorrow" : `on ${heading}`,
            friendlyTime(setupTime),
            idea.title,
            idea.roomName,
            toBuy.map((k) => k.name),
          )}
          settings={data.user.settings.assistant}
          onChannel={(channel) => void api.saveSettings({ assistant: { channel } }).then(actions.setSettings)}
          onClose={() => setRemind(false)}
        />
      )}
    </section>
  );
}
