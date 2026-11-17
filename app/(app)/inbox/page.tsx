"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellOff, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppContext";
import { SectionHead } from "@/components/home/Sections";
import { NotifIcon } from "@/components/icons";
import { Topbar, Working } from "@/components/ui";
import { api } from "@/lib/client/api";
import { errorMessage, localDate, timeAgo } from "@/lib/client/utils";
import type { Notification } from "@/lib/types";

const SM = { size: 18, strokeWidth: 1.8 };
/** What each kind of notification is called in the list, and its icon tone: people are pine, wins are orange, reminders are plain. */
const KINDS: Record<string, { label: string; tone: "people" | "win" | "plain" }> = {
  nudge: { label: "Reminder", tone: "plain" },
  hello: { label: "Reminder", tone: "plain" },
  upvotes: { label: "Upvotes", tone: "win" },
  badge: { label: "Badge", tone: "win" },
  challenge: { label: "Challenge", tone: "win" },
  comment: { label: "Comment", tone: "people" },
  remake: { label: "Remake", tone: "people" },
  circle_join: { label: "Circle", tone: "people" },
  coparent: { label: "Family", tone: "people" },
};

/** Upvotes, comments, remakes, badges and nudges, newest first. */
export default function InboxPage() {
  const router = useRouter();
  const { data, actions } = useApp();
  const [items, setItems] = useState<Notification[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .notifications()
      .then((r) => {
        setItems(r.items);
        if (r.unread > 0) void api.markRead().then(() => actions.setUnread(0));
      })
      .catch((e) => setError(errorMessage(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = localDate();
  const isToday = (n: Notification) => localDate(new Date(n.createdAt)) === today;
  const groups = items
    ? [
        { title: "Today", list: items.filter(isToday) },
        { title: "Earlier", list: items.filter((n) => !isToday(n)) },
      ].filter((g) => g.list.length)
    : [];

  return (
    <div className="screen home">
      <Topbar eyebrow="Notifications" title="Inbox" back={() => router.back()} />
      {error && <p className="error">{error}</p>}

      {!data.user.pushEnabled && (
        <Link href="/settings" className="challenge push-prompt">
          <span className="challenge-icon line" aria-hidden="true">
            <BellOff {...SM} />
          </span>
          <span className="grow">
            <strong>Get these on your phone</strong>
            <span className="muted small">Turn on notifications in Settings for bedtime nudges and replies.</span>
          </span>
          <ChevronRight {...SM} className="muted" aria-hidden="true" />
        </Link>
      )}

      {items === null ? (
        <Working label="Loading…" />
      ) : items.length === 0 ? (
        <section className="countdown">
          <div className="eyebrow">All quiet</div>
          <h2 className="card-title">Nothing yet</h2>
          <p className="body">Upvotes, comments, remakes, badges and bedtime nudges land here.</p>
        </section>
      ) : (
        groups.map((g) => (
          <section key={g.title} aria-label={g.title}>
            <SectionHead title={g.title} />
            <div className="list">
              {g.list.map((n) => {
                const kind = KINDS[n.type] ?? { label: "Update", tone: "plain" as const };
                return (
                  <Link key={n.id} href={n.url} className={`list-row set-row notif-row ${n.readAt ? "" : "unread"}`}>
                    <span className={`notif-icon tone-${kind.tone}`} aria-hidden="true">
                      <NotifIcon type={n.type} />
                    </span>
                    <span className="row-label">
                      <span className="notif-kind">
                        {kind.label} · {timeAgo(n.createdAt)} ago
                      </span>
                      <strong>{n.title}</strong>
                      <span className="body small">{n.body}</span>
                    </span>
                    {!n.readAt && <span className="unread-dot" aria-label="New" />}
                  </Link>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
