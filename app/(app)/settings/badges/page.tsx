"use client";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppContext";
import { SectionHead } from "@/components/home/Sections";
import { BadgeIcon } from "@/components/icons";
import { Topbar } from "@/components/ui";

/** Badges earned so far and the ones still to go. */
export default function BadgesPage() {
  const router = useRouter();
  const { data } = useApp();
  const earned = data.badges.filter((b) => b.awardedAt);
  const todo = data.badges.filter((b) => !b.awardedAt);
  const pct = data.badges.length ? (earned.length / data.badges.length) * 100 : 0;

  return (
    <div className="screen home">
      <Topbar eyebrow="Your elf's trophy shelf" title="Badges" back={() => router.back()} />

      <section className="countdown" aria-label="Progress">
        <div className="countdown-num">
          {earned.length}
          <span>of {data.badges.length} earned</span>
        </div>
        <div className="season-bar" role="progressbar" aria-valuemin={0} aria-valuemax={data.badges.length} aria-valuenow={earned.length} aria-label="Badges earned">
          <i className="done" style={{ width: `${pct}%` }} />
        </div>
        <p className="muted small">
          {data.stats.nightsDone} {data.stats.nightsDone === 1 ? "night" : "nights"} logged · {data.stats.streak} night streak · {data.stats.posts} shared
        </p>
      </section>

      {earned.length > 0 && (
        <section aria-label="Earned">
          <SectionHead title="Earned" />
          <div className="badges-grid">
            {earned.map((b) => (
              <div key={b.key} className="badge-card earned">
                <span className="badge-icon" aria-hidden="true">
                  <BadgeIcon name={b.icon} size={22} />
                </span>
                <strong>{b.name}</strong>
                <p className="small body">{b.description}</p>
                {b.awardedAt && <span className="row-sub">{new Date(b.awardedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {todo.length > 0 && (
        <section aria-label="Still to earn">
          <SectionHead title="Still to earn" />
          <div className="badges-grid">
            {todo.map((b) => (
              <div key={b.key} className="badge-card">
                <span className="badge-icon" aria-hidden="true">
                  <BadgeIcon name={b.icon} size={22} />
                </span>
                <strong>{b.name}</strong>
                <p className="small body">{b.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
