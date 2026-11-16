"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppContext";
import { PageHead, Working } from "@/components/ui";
import { api } from "@/lib/client/api";
import { errorMessage, timeAgo } from "@/lib/client/utils";
import type { Notification } from "@/lib/types";

const ICONS: Record<string, string> = { nudge: "🧝", upvotes: "▲", comment: "💬", remake: "🔁", badge: "🏅", circle_join: "👥", coparent: "💞", challenge: "🎯", hello: "👋" };

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

  return (
    <div>
      <PageHead
        title="Inbox"
        sub={data.user.pushEnabled ? "Push is on for this device." : "Turn on push in the Elf tab to get these on your phone."}
        left={
          <button className="icon-btn" onClick={() => router.back()} aria-label="Back">
            ‹
          </button>
        }
      />
      {error && <p className="error">{error}</p>}
      {items === null ? (
        <Working label="Loading…" />
      ) : items.length === 0 ? (
        <div className="card notice">Nothing yet. Upvotes, comments, remakes, badges and bedtime nudges land here.</div>
      ) : (
        items.map((n) => (
          <Link key={n.id} href={n.url} className={`card notif ${n.readAt ? "" : "unread"}`}>
            <span className="notif-icon">{ICONS[n.type] ?? "•"}</span>
            <div>
              <strong>{n.title}</strong>
              <p className="small muted">{n.body}</p>
              <p className="small muted">{timeAgo(n.createdAt)} ago</p>
            </div>
          </Link>
        ))
      )}
    </div>
  );
}
