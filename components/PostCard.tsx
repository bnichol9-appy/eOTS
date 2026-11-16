"use client";
import Link from "next/link";
import type { PostSummary } from "@/lib/types";
import { timeAgo } from "@/lib/client/utils";
import { Meters } from "./ui";

export function PostCard({ post, onVote, onSave }: { post: PostSummary; onVote: (p: PostSummary) => void; onSave: (p: PostSummary) => void }) {
  return (
    <article className="card post">
      <Link href={`/community/${post.id}`} className="post-link">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="post-photo" src={post.photoUrl} alt="" loading="lazy" />
        <div className="post-body">
          <p className="eyebrow">
            {post.author.elfName} · {post.roomType} · {timeAgo(post.createdAt)}
          </p>
          <h3>{post.title}</h3>
          <p className="muted">{post.pitch}</p>
          <Meters chaos={post.chaos} mess={post.mess} minutes={post.setupMinutes} />
        </div>
      </Link>
      <div className="post-actions">
        <button className={`pill ${post.viewer.voted ? "on" : ""}`} onClick={() => onVote(post)}>
          ▲ {post.upvotes}
        </button>
        <span className="pill static">🏠 {post.uses}</span>
        <Link href={`/community/${post.id}#comments`} className="pill static">
          💬 {post.commentsCount}
        </Link>
        <button className={`pill ${post.viewer.saved ? "on" : ""}`} onClick={() => onSave(post)}>
          {post.viewer.saved ? "♥ Saved" : "♡ Save"}
        </button>
      </div>
    </article>
  );
}
