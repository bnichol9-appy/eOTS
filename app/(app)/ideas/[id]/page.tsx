"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Bookmark, ChevronRight, Flag, Repeat, Send, ThumbsUp, Trash2, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppContext";
import { SectionHead } from "@/components/home/Sections";
import { IdeaDetail } from "@/components/IdeaSheet";
import { PostMini } from "@/components/PostMini";
import { Actions, ICON_SM, Tiles, Topbar, Working } from "@/components/ui";
import { api } from "@/lib/client/api";
import { errorMessage, localDate, REACTIONS, timeAgo } from "@/lib/client/utils";
import type { PostDetail } from "@/lib/types";

const SM = { size: 18, strokeWidth: 1.8 };

/** One shared set-up: the photo, how it went, how to do it, remakes and comments. */
export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, actions } = useApp();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    api
      .post(id)
      .then(setPost)
      .catch((e) => setError(errorMessage(e)));
  }, [id]);

  async function act(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  if (error && !post)
    return (
      <div className="screen">
        <Topbar title="Set-up" back={() => router.back()} />
        <p className="error">{error}</p>
      </div>
    );
  if (!post)
    return (
      <div className="screen">
        <Working label="Loading…" />
      </div>
    );

  const vote = () =>
    void act("vote", async () => {
      const r = await api.vote(post.id);
      setPost({ ...post, upvotes: r.upvotes, viewer: { ...post.viewer, voted: r.voted } });
    });
  const save = () =>
    void act("save", async () => {
      const r = await api.savePost(post.id);
      setPost({ ...post, viewer: { ...post.viewer, saved: r.saved } });
      await actions.reload();
    });

  return (
    <div className={`screen home ${post.viewer.mine ? "" : "has-actions"}`}>
      <Topbar eyebrow={`${post.roomType} · ${timeAgo(post.createdAt)} ago`} title={post.title} back={() => router.back()} />
      {post.status !== "published" && <p className="error">This post is in review and only visible to you.</p>}
      {error && <p className="error">{error}</p>}

      <div className="photo tall">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={post.photoUrl} alt="" />
        {post.challenge && <span className="corner left">Challenge entry</span>}
      </div>

      <Link href={`/ideas/elf/${post.author.handle}`} className="author-row">
        <span className="elf l elf1" aria-hidden="true">
          {post.author.elfName.charAt(0).toUpperCase()}
        </span>
        <span className="row-label">
          <strong>{post.author.elfName}</strong>
          <span className="row-sub">{post.author.displayName}&apos;s elf · see their page</span>
        </span>
        <ChevronRight {...SM} className="muted" aria-hidden="true" />
      </Link>

      <Tiles
        items={[
          { label: "Upvotes", value: String(post.upvotes) },
          { label: "Did it", value: String(post.uses) },
          { label: "The kids", value: REACTIONS[post.reaction - 1] ?? "Loved it" },
        ]}
      />

      <div className="invite-row">
        <button className={`btn ${post.viewer.voted ? "on-pine" : ""}`} aria-pressed={post.viewer.voted} onClick={vote} disabled={busy === "vote"}>
          <ThumbsUp {...SM} /> {post.viewer.voted ? "Upvoted" : "Upvote"}
        </button>
        <button className={`btn ${post.viewer.saved ? "on-pine" : ""}`} aria-pressed={post.viewer.saved} onClick={save} disabled={busy === "save"}>
          <Bookmark {...SM} fill={post.viewer.saved ? "currentColor" : "none"} /> {post.viewer.saved ? "Saved" : "Save"}
        </button>
      </div>

      {(post.remakeOf || post.challenge) && (
        <div className="list">
          {post.remakeOf && (
            <Link href={`/ideas/${post.remakeOf.id}`} className="list-row set-row">
              <Repeat {...SM} className="row-icon" aria-hidden="true" />
              <span className="row-label">
                <span className="row-sub">A remake of</span>
                <strong>{post.remakeOf.title}</strong>
              </span>
              <ChevronRight {...SM} className="muted" aria-hidden="true" />
            </Link>
          )}
          {post.challenge && (
            <Link href={`/ideas/challenges/${post.challenge.id}`} className="list-row set-row">
              <Trophy {...SM} className="row-icon" aria-hidden="true" />
              <span className="row-label">
                <span className="row-sub">Entered in the challenge</span>
                <strong>{post.challenge.title}</strong>
              </span>
              <ChevronRight {...SM} className="muted" aria-hidden="true" />
            </Link>
          )}
        </div>
      )}

      <section aria-label="How to do it">
        <SectionHead title="How to do it" />
        <IdeaDetail idea={post} elves={data.profile.elves} />
      </section>

      {post.parentTip && (
        <section aria-label="Parent tip">
          <SectionHead title="From the parent" />
          <blockquote className="quote">{post.parentTip}</blockquote>
        </section>
      )}

      {post.remakeList.length > 0 && (
        <section aria-label="Remakes">
          <SectionHead title="Remakes" action={<span className="muted small">{post.remakeList.length}</span>} />
          <div className="post-strip" role="list">
            {post.remakeList.map((r) => (
              <PostMini key={r.id} post={r} />
            ))}
          </div>
        </section>
      )}

      <section aria-label="Comments" id="comments">
        <SectionHead title="Comments" action={<span className="muted small">{post.comments.length}</span>} />
        {post.comments.length === 0 && <p className="muted small">No comments yet. Did you try it? Say how it went.</p>}
        <div className="list">
          {post.comments.map((c) => (
            <div key={c.id} className="comment">
              <span className="comment-avatar" aria-hidden="true">
                {c.author.displayName.charAt(0).toUpperCase()}
              </span>
              <div className="comment-body">
                <div className="comment-meta">
                  <Link href={`/ideas/elf/${c.author.handle}`}>{c.author.displayName}</Link>
                  <span className="muted"> · {timeAgo(c.createdAt)}</span>
                  {c.mine && (
                    <button className="link-btn small" onClick={() => void act("delc", async () => setPost(await api.deleteComment(post.id, c.id)))} aria-label="Delete comment">
                      <Trash2 size={14} strokeWidth={1.8} />
                    </button>
                  )}
                </div>
                <p className="body">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="comment-box">
          <input className="input" placeholder="How did it go in your house?" value={comment} onChange={(e) => setComment(e.target.value)} aria-label="Comment" />
          <button
            className="icon-btn send"
            disabled={!comment.trim() || busy === "comment"}
            aria-label="Post comment"
            onClick={() =>
              void act("comment", async () => {
                setPost(await api.comment(post.id, comment));
                setComment("");
              })
            }
          >
            <Send {...SM} />
          </button>
        </div>
      </section>

      <div className="list">
        {post.viewer.mine ? (
          <button
            className="list-row set-row"
            onClick={() => {
              if (confirm("Delete this post?"))
                void act("del", async () => {
                  await api.deletePost(post.id);
                  await actions.reload();
                  router.replace("/ideas");
                });
            }}
          >
            <Trash2 {...SM} className="row-icon" aria-hidden="true" />
            <span className="row-label acc">Delete my post</span>
          </button>
        ) : (
          <button
            className="list-row set-row"
            onClick={() => {
              const reason = prompt("What's wrong with this post?");
              if (reason !== null)
                void act("report", async () => {
                  await api.report(post.id, reason);
                  actions.toast("Thanks, we'll take a look.");
                });
            }}
          >
            <Flag {...SM} className="row-icon" aria-hidden="true" />
            <span className="row-label muted">Report this post</span>
          </button>
        )}
      </div>

      {!post.viewer.mine && (
        <Actions>
          <button className={`btn secondary ${post.viewer.saved ? "on-pine" : ""}`} onClick={save} disabled={busy === "save"}>
            <Bookmark {...ICON_SM} fill={post.viewer.saved ? "currentColor" : "none"} /> {post.viewer.saved ? "Saved" : "Save"}
          </button>
          <button
            className="btn primary"
            disabled={busy === "use"}
            onClick={() =>
              void act("use", async () => {
                const r = await api.usePost(post.id, localDate());
                actions.setDay(r.day);
                router.push("/");
              })
            }
          >
            Do this tonight
          </button>
        </Actions>
      )}
    </div>
  );
}
