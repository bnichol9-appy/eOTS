"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppContext";
import { NotifIcon } from "@/components/icons";
import { Topbar, Working } from "@/components/ui";
import { api } from "@/lib/client/api";
import { errorMessage, timeAgo } from "@/lib/client/utils";
import type { Notification } from "@/lib/types";

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
    <div className="screen">
      <Topbar eyebrow={data.user.pushEnabled ? "Push is on for this device" : "Turn on push in Settings to get these on your phone"} title="Inbox" back={() => router.back()} />
      {error && <p className="error">{error}</p>}
      {items === null ? (
        <Working label="Loading…" />
      ) : items.length === 0 ? (
        <div className="card filled body">Nothing yet. Upvotes, comments, remakes, badges and bedtime nudges land here.</div>
      ) : (
        items.map((n) => (
          <Link key={n.id} href={n.url} className={`card notif ${n.readAt ? "" : "accent-border"}`}>
            <NotifIcon type={n.type} />
            <div>
              <strong>{n.title}</strong>
              <p className="body small">{n.body}</p>
              <p className="muted small">{timeAgo(n.createdAt)} ago</p>
            </div>
          </Link>
        ))
      )}
    </div>
  );
}
