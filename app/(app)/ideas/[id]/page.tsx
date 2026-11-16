"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Bookmark, Home, MessageSquare, Repeat, ThumbsUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppContext";
import { IdeaDetail } from "@/components/IdeaSheet";
import { PostCard } from "@/components/PostCard";
import { Actions, Topbar, Working } from "@/components/ui";
import { api } from "@/lib/client/api";
import { errorMessage, localDate, REACTIONS, timeAgo } from "@/lib/client/utils";
import type { PostDetail } from "@/lib/types";

export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, actions } = useApp();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const sm = { size: 16, strokeWidth: 1.8 };

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

  if (error && !post) return <div className="screen"><p className="error">{error}</p></div>;
  if (!post) return <div className="screen"><Working label="Loading…" /></div>;

  return (
    <div className="screen has-actions">
      <Topbar
        eyebrow={
          <>
            by <Link href={`/ideas/elf/${post.author.handle}`}>{post.author.elfName}</Link> · {timeAgo(post.createdAt)} ago
          </>
        }
        title={post.title}
        back={() => router.back()}
      />
      {post.status !== "published" && <p className="error">This post is in review and only visible to you.</p>}
      {error && <p className="error">{error}</p>}
      <div className="photo tall">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={post.photoUrl} alt="" />
      </div>
      <div className="row" style={{ flexWrap: "wrap" }}>
        <button className={`mini ${post.viewer.voted ? "on" : ""}`} aria-pressed={post.viewer.voted} onClick={() => void act("vote", async () => { const r = await api.vote(post.id); setPost({ ...post, upvotes: r.upvotes, viewer: { ...post.viewer, voted: r.voted } }); })}>
          <ThumbsUp {...sm} /> {post.upvotes}
        </button>
        <span className="mini static"><Home {...sm} /> {post.uses} did this</span>
        {post.remakes > 0 && <span className="mini static"><Repeat {...sm} /> {post.remakes} remade</span>}
        <span className="mini static">kids: {REACTIONS[post.reaction - 1]?.toLowerCase()}</span>
        <button className={`mini ${post.viewer.saved ? "on" : ""}`} aria-pressed={post.viewer.saved} onClick={() => void act("save", async () => { const r = await api.savePost(post.id); setPost({ ...post, viewer: { ...post.viewer, saved: r.saved } }); await actions.reload(); })}>
          <Bookmark {...sm} /> {post.viewer.saved ? "Saved" : "Save"}
        </button>
      </div>
      {post.remakeOf && (
        <p className="muted small">
          A remake of <Link href={`/ideas/${post.remakeOf.id}`}>{post.remakeOf.title}</Link>
        </p>
      )}
      {post.challenge && (
        <p className="muted small">
          Entered in <Link href={`/ideas/challenges/${post.challenge.id}`}>{post.challenge.title}</Link>
        </p>
      )}
      <IdeaDetail idea={post} elves={data.profile.elves} />
      {post.parentTip && (
        <div>
          <div className="eyebrow">Parent tip</div>
          <blockquote className="quote">{post.parentTip}</blockquote>
        </div>
      )}

      {post.remakeList.length > 0 && (
        <>
          <div className="eyebrow">Remakes</div>
          {post.remakeList.map((r) => (
            <PostCard key={r.id} post={r} onVote={(x) => void api.vote(x.id).then((v) => setPost((p) => p && { ...p, remakeList: p.remakeList.map((q) => (q.id === x.id ? { ...q, upvotes: v.upvotes, viewer: { ...q.viewer, voted: v.voted } } : q)) }))} onSave={(x) => void api.savePost(x.id).then((v) => setPost((p) => p && { ...p, remakeList: p.remakeList.map((q) => (q.id === x.id ? { ...q, viewer: { ...q.viewer, saved: v.saved } } : q)) }))} />
          ))}
        </>
      )}

      <div className="eyebrow" id="comments">
        Comments
      </div>
      {post.comments.length === 0 && <p className="muted small">No comments yet.</p>}
      <div className="list">
        {post.comments.map((c) => (
          <div key={c.id} className="list-row" style={{ alignItems: "flex-start", flexDirection: "column", gap: 2 }}>
            <span className="small muted">
              <Link href={`/ideas/elf/${c.author.handle}`}>{c.author.displayName}</Link> · {timeAgo(c.createdAt)}
              {c.mine && (
                <button className="link-btn small" style={{ marginLeft: 8 }} onClick={() => void act("delc", async () => setPost(await api.deleteComment(post.id, c.id)))}>
                  delete
                </button>
              )}
            </span>
            <span>{c.body}</span>
          </div>
        ))}
      </div>
      <div className="row">
        <input className="input" placeholder="How did it go in your house?" value={comment} onChange={(e) => setComment(e.target.value)} aria-label="Comment" />
        <button className="btn" disabled={!comment.trim() || busy === "comment"} onClick={() => void act("comment", async () => { setPost(await api.comment(post.id, comment)); setComment(""); })}>
          <MessageSquare {...sm} /> Post
        </button>
      </div>
      {post.viewer.mine ? (
        <button className="link-btn small" onClick={() => { if (confirm("Delete this post?")) void act("del", async () => { await api.deletePost(post.id); await actions.reload(); router.replace("/ideas"); }); }}>
          Delete my post
        </button>
      ) : (
        <button className="link-btn small" onClick={() => { const reason = prompt("What's wrong with this post?"); if (reason !== null) void act("report", async () => { await api.report(post.id, reason); actions.toast("Thanks, we'll take a look."); }); }}>
          Report this post
        </button>
      )}
      {!post.viewer.mine && (
        <Actions stacked>
          <button className="btn primary large" disabled={busy === "use"} onClick={() => void act("use", async () => { const r = await api.usePost(post.id, localDate()); actions.setDay(r.day); router.push("/"); })}>
            Do this tonight
          </button>
        </Actions>
      )}
    </div>
  );
}
