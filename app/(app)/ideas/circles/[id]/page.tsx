"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronRight, LogOut, Trash2, User, UserPlus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppContext";
import { SectionHead } from "@/components/home/Sections";
import { InviteShare } from "@/components/InviteShare";
import { PostCard } from "@/components/PostCard";
import { Sheet, Topbar, Working } from "@/components/ui";
import { api } from "@/lib/client/api";
import { errorMessage, timeAgo } from "@/lib/client/utils";
import { circleInviteText, inviteLink } from "@/lib/invite";
import type { Circle, PostSummary } from "@/lib/types";

const SM = { size: 18, strokeWidth: 1.8 };

/** A circle: who's in it, what their elves did lately, and what they've shared to it. */
export default function CirclePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, actions } = useApp();
  const [circle, setCircle] = useState<Circle | null>(null);
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    api
      .circle(id)
      .then((r) => {
        setCircle(r.circle);
        setPosts(r.posts);
        if (new URLSearchParams(window.location.search).get("invite") === "1") setInviting(true);
      })
      .catch((e) => setError(errorMessage(e)));
  }, [id]);

  function patch(pid: string, fn: (p: PostSummary) => PostSummary) {
    setPosts((ps) => ps.map((p) => (p.id === pid ? fn(p) : p)));
  }

  if (error && !circle)
    return (
      <div className="screen">
        <Topbar title="Circle" back={() => router.back()} />
        <p className="error">{error}</p>
      </div>
    );
  if (!circle)
    return (
      <div className="screen">
        <Working label="Loading…" />
      </div>
    );

  return (
    <div className="screen home">
      <Topbar eyebrow="Circle" title={circle.name} back={() => router.back()} />
      {error && <p className="error">{error}</p>}

      <section className="countdown" aria-label="About this circle">
        <div className="family-top">
          <span className="challenge-icon big" aria-hidden="true">
            <Users {...SM} size={24} />
          </span>
          <div className="grow">
            <div className="eyebrow">{circle.isOwner ? "You started this circle" : "You're a member"}</div>
            <h2 className="card-title">
              {circle.memberCount} {circle.memberCount === 1 ? "family" : "families"}
            </h2>
            <p className="muted small">Members see each other&apos;s nights and can share set-ups just to the circle.</p>
          </div>
        </div>
        <button className="btn pine full" onClick={() => setInviting(true)}>
          <UserPlus {...SM} /> Invite parents
        </button>
      </section>

      <section aria-label="Families">
        <SectionHead title="Families" />
        <div className="list">
          {circle.members.map((m) => (
            <Link key={m.familyId} href={`/ideas/elf/${m.handle}`} className="list-row set-row">
              <span className={`elf l ${m.handle === data.family.handle ? "elf1" : "elf2"}`} aria-hidden="true">
                {m.elfName.charAt(0).toUpperCase()}
              </span>
              <span className="row-label">
                <strong>
                  {m.elfName}
                  {m.handle === data.family.handle ? " (yours)" : ""}
                </strong>
                <span className="row-sub">{m.parents}</span>
              </span>
              <ChevronRight {...SM} className="muted" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      {circle.recent.length > 0 && (
        <section aria-label="Last few nights">
          <SectionHead title="Last few nights" />
          <div className="list">
            {circle.recent.map((r, i) => {
              const inner = (
                <>
                  <User {...SM} className="row-icon pine" aria-hidden="true" />
                  <span className="row-label">
                    <span>
                      <strong>{r.elfName}</strong> did {r.title}
                    </span>
                    <span className="row-sub">{timeAgo(`${r.date}T20:00:00`)} ago</span>
                  </span>
                  {r.postId && <ChevronRight {...SM} className="muted" aria-hidden="true" />}
                </>
              );
              return r.postId ? (
                <Link key={i} href={`/ideas/${r.postId}`} className="list-row set-row">
                  {inner}
                </Link>
              ) : (
                <div key={i} className="list-row set-row">
                  {inner}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section aria-label="Shared in this circle">
        <SectionHead title="Shared here" action={posts.length ? <span className="muted small">{posts.length}</span> : undefined} />
        {posts.length === 0 && <p className="muted small">Nothing shared yet. When a member shares a night it shows up here, even if they chose &quot;just my circles&quot;.</p>}
        {posts.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            onVote={(x) => void api.vote(x.id).then((v) => patch(x.id, (q) => ({ ...q, upvotes: v.upvotes, viewer: { ...q.viewer, voted: v.voted } })))}
            onSave={(x) => void api.savePost(x.id).then((v) => patch(x.id, (q) => ({ ...q, viewer: { ...q.viewer, saved: v.saved } })))}
          />
        ))}
      </section>

      <div className="list">
        <button
          className="list-row set-row"
          onClick={() => {
            if (confirm(circle.isOwner ? "Delete this circle for everyone?" : "Leave this circle?"))
              void api
                .leaveCircle(circle.id)
                .then(() => actions.reload())
                .then(() => router.replace("/ideas"))
                .catch((e) => setError(errorMessage(e)));
          }}
        >
          {circle.isOwner ? <Trash2 {...SM} className="row-icon" aria-hidden="true" /> : <LogOut {...SM} className="row-icon" aria-hidden="true" />}
          <span className="row-label acc">{circle.isOwner ? "Delete this circle" : "Leave this circle"}</span>
        </button>
      </div>

      {inviting && (
        <Sheet eyebrow="Invite" title={`Invite to ${circle.name}`} onClose={() => setInviting(false)}>
          <p className="body">Anyone with the link can join this circle and see the nights shared to it.</p>
          <InviteShare link={inviteLink(circle.inviteCode)} text={circleInviteText(circle.name, inviteLink(circle.inviteCode))} />
          <p className="muted small">
            Or share the code: <strong className="code">{circle.inviteCode}</strong>
          </p>
        </Sheet>
      )}
    </div>
  );
}
