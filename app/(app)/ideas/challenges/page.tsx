"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Crown, Hourglass, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { SectionHead } from "@/components/home/Sections";
import { Topbar, Working } from "@/components/ui";
import { api } from "@/lib/client/api";
import { errorMessage, localDate } from "@/lib/client/utils";
import type { Challenge } from "@/lib/types";

const SM = { size: 18, strokeWidth: 1.8 };
const short = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });

/** The season's weekly challenges: this week up top, then what's coming and who won. */
export default function ChallengesPage() {
  const router = useRouter();
  const [list, setList] = useState<Challenge[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const today = localDate();

  useEffect(() => {
    api
      .challenges(today)
      .then((r) => setList(r.challenges))
      .catch((e) => setError(errorMessage(e)));
  }, [today]);

  const active = list?.find((c) => c.status === "active") ?? null;
  const upcoming = list?.filter((c) => c.status === "upcoming") ?? [];
  const ended = list?.filter((c) => c.status === "ended").reverse() ?? [];
  const daysLeft = active ? Math.max(0, Math.round((Date.parse(`${active.endsOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000)) : 0;

  return (
    <div className="screen home">
      <Topbar eyebrow="One theme a week" title="Challenges" back={() => router.back()} />
      {error && <p className="error">{error}</p>}
      {!list ? (
        <Working label="Loading…" />
      ) : (
        <>
          <p className="muted small">Share a night into the week&apos;s theme. Most upvotes when the week ends wins the Champion badge.</p>

          {active ? (
            <Link href={`/ideas/challenges/${active.id}`} className="countdown challenge-hero">
              <div className="family-top">
                <span className="challenge-icon big" aria-hidden="true">
                  <Trophy {...SM} size={24} />
                </span>
                <div className="grow">
                  <div className="eyebrow">This week · {daysLeft === 0 ? "last day" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}</div>
                  <h2 className="card-title">{active.title}</h2>
                </div>
              </div>
              <p className="body">{active.description}</p>
              <span className="between">
                <span className="muted small">
                  {active.entries} {active.entries === 1 ? "entry" : "entries"} so far
                </span>
                <span className="link-btn small">See the leaderboard</span>
              </span>
            </Link>
          ) : (
            <section className="countdown">
              <div className="eyebrow">No challenge this week</div>
              <p className="body">The next one starts soon. Keep logging nights with photos so you&apos;re ready to enter.</p>
            </section>
          )}

          {upcoming.length > 0 && (
            <section aria-label="Coming up">
              <SectionHead title="Coming up" />
              <div className="list">
                {upcoming.map((c) => (
                  <Link key={c.id} href={`/ideas/challenges/${c.id}`} className="list-row set-row">
                    <Hourglass {...SM} className="row-icon" aria-hidden="true" />
                    <span className="row-label">
                      <strong>{c.title}</strong>
                      <span className="row-sub">
                        {short(c.startsOn)} to {short(c.endsOn)}
                      </span>
                    </span>
                    <ChevronRight {...SM} className="muted" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {ended.length > 0 && (
            <section aria-label="Finished">
              <SectionHead title="Finished" />
              <div className="list">
                {ended.map((c) => (
                  <Link key={c.id} href={`/ideas/challenges/${c.id}`} className="list-row set-row">
                    <Crown {...SM} className="row-icon" aria-hidden="true" />
                    <span className="row-label">
                      <strong>{c.title}</strong>
                      <span className="row-sub">{c.winner ? `Won by ${c.winner.elfName} with ${c.winner.title}` : `${c.entries} ${c.entries === 1 ? "entry" : "entries"}, no winner`}</span>
                    </span>
                    <ChevronRight {...SM} className="muted" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
