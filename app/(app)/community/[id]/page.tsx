"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppContext";
import { Meters, PageHead, Working } from "@/components/ui";
import { api } from "@/lib/client/api";
import { errorMessage, localDate, REACTIONS, timeAgo } from "@/lib/client/utils";
import type { PostDetail } from "@/lib/types";

export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { actions } = useApp();
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

  if (error && !post) return <p className="error">{error}</p>;
  if (!post) return <Working label="Loading…" />;

  return (
    <div>
      <PageHead
        title={post.title}
        sub={
          <>
            by <Link href={`/community/elf/${post.author.handle}`}>{post.author.elfName}</Link> ({post.author.displayName}) · {timeAgo(post.createdAt)} ago
          </>
        }
        left={
          <button className="icon-btn" onClick={() => router.back()} aria-label="Back">
            ‹
          </button>
        }
      />
      {post.status !== "published" && <p className="error">This post is in review and only visible to you.</p>}
      {error && <p className="error">{error}</p>}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="result-photo" src={post.photoUrl} alt="" />

      <div className="post-actions">
        <button
          className={`pill ${post.viewer.voted ? "on" : ""}`}
          onClick={() =>
            void act("vote", async () => {
              const r = await api.vote(post.id);
              setPost({ ...post, upvotes: r.upvotes, viewer: { ...post.viewer, voted: r.voted } });
            })
          }
        >
          ▲ {post.upvotes}
        </button>
        <span className="pill static">🏠 {post.uses} did this</span>
        <span className="pill static">kids {REACTIONS[post.reaction - 1]}</span>
        <button
          className={`pill ${post.viewer.saved ? "on" : ""}`}
          onClick={() =>
            void act("save", async () => {
              const r = await api.savePost(post.id);
              setPost({ ...post, viewer: { ...post.viewer, saved: r.saved } });
              await actions.reload();
            })
          }
        >
          {post.viewer.saved ? "♥ Saved" : "♡ Save"}
        </button>
      </div>

      <div className="card">
        <p>{post.pitch}</p>
        <Meters chaos={post.chaos} mess={post.mess} minutes={post.setupMinutes} />
        {post.remakeOf && (
          <p className="small muted">
            A remake of <Link href={`/community/${post.remakeOf.id}`}>{post.remakeOf.title}</Link>
          </p>
        )}
        <p className="eyebrow">What the kids see</p>
        <p className="scene">{post.whatKidsSee}</p>
        <p className="eyebrow">You&apos;ll need</p>
        <p>{post.supplies.join(" · ")}</p>
        <p className="eyebrow">Steps</p>
        <ol className="steps plain">
          {post.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
        {post.parentTip && (
          <blockquote className="elf-note">
            <span className="eyebrow">Parent tip</span>
            {post.parentTip}
          </blockquote>
        )}
        <p className="tags">{post.tags.map((t) => `#${t}`).join(" ")}</p>
        {!post.viewer.mine && (
          <button
            className="btn primary big"
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
        )}
      </div>

      <h2 className="section" id="comments">
        Comments
      </h2>
      {post.comments.length === 0 && <p className="muted small">No comments yet.</p>}
      {post.comments.map((c) => (
        <div key={c.id} className="comment">
          <p className="eyebrow">
            <Link href={`/community/elf/${c.author.handle}`}>{c.author.displayName}</Link> · {timeAgo(c.createdAt)}
            {c.mine && (
              <button className="link-btn" onClick={() => void act("delc", async () => setPost(await api.deleteComment(post.id, c.id)))}>
                delete
              </button>
            )}
          </p>
          <p>{c.body}</p>
        </div>
      ))}
      <div className="row">
        <input className="input" placeholder="How did it go in your house?" value={comment} onChange={(e) => setComment(e.target.value)} />
        <button
          className="btn ghost"
          disabled={!comment.trim() || busy === "comment"}
          onClick={() =>
            void act("comment", async () => {
              setPost(await api.comment(post.id, comment));
              setComment("");
            })
          }
        >
          Post
        </button>
      </div>

      <div className="row">
        {post.viewer.mine ? (
          <button
            className="btn danger"
            onClick={() => {
              if (confirm("Delete this post?")) void act("del", async () => {
                await api.deletePost(post.id);
                await actions.reload();
                router.replace("/community");
              });
            }}
          >
            Delete my post
          </button>
        ) : (
          <button
            className="btn ghost small"
            onClick={() => {
              const reason = prompt("What's wrong with this post?");
              if (reason !== null) void act("report", async () => {
                await api.report(post.id, reason);
                alert("Thanks, we'll take a look.");
              });
            }}
          >
            Report
          </button>
        )}
      </div>
    </div>
  );
}
