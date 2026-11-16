"use client";
import Link from "next/link";
import { Bookmark, Home, MessageSquare, Repeat, ThumbsUp } from "lucide-react";
import type { PostSummary } from "@/lib/types";
import { formatWord, messWord } from "@/lib/types";
import { timeAgo } from "@/lib/client/utils";

export function PostCard({ post, onVote, onSave }: { post: PostSummary; onVote: (p: PostSummary) => void; onSave: (p: PostSummary) => void }) {
  const sm = { size: 16, strokeWidth: 1.8 };
  return (
    <article className="card post-card">
      <Link href={`/ideas/${post.id}`}>
        <div className="photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.photoUrl} alt="" loading="lazy" />
          {post.challengeId && <span className="corner left">Challenge entry</span>}
          {post.visibility === "circles" && <span className="corner">Circle only</span>}
        </div>
        <div className="inner">
          <div className="eyebrow">
            {post.author.elfName} · {post.roomType} · {timeAgo(post.createdAt)}
          </div>
          <h3>{post.title}</h3>
          <p className="body">{post.pitch}</p>
          <div className="idea-meta">
            <span>{post.setupMinutes} min</span>
            <span>{messWord(post.mess)} mess</span>
            <span>Spook {post.spook}/5</span>
            {post.format !== "single" && <span>{formatWord(post.format)}</span>}
          </div>
        </div>
      </Link>
      <div className="post-actions">
        <button className={`mini ${post.viewer.voted ? "on" : ""}`} onClick={() => onVote(post)} aria-pressed={post.viewer.voted} aria-label="Upvote">
          <ThumbsUp {...sm} /> {post.upvotes}
        </button>
        <span className="mini static" title="Families who did this">
          <Home {...sm} /> {post.uses}
        </span>
        {post.remakes > 0 && (
          <span className="mini static" title="Remakes">
            <Repeat {...sm} /> {post.remakes}
          </span>
        )}
        <Link href={`/ideas/${post.id}#comments`} className="mini static">
          <MessageSquare {...sm} /> {post.commentsCount}
        </Link>
        <button className={`mini ${post.viewer.saved ? "on" : ""}`} onClick={() => onSave(post)} aria-pressed={post.viewer.saved}>
          <Bookmark {...sm} /> {post.viewer.saved ? "Saved" : "Save"}
        </button>
      </div>
    </article>
  );
}
