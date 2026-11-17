"use client";
import Link from "next/link";
import { Home, MessageSquare, ThumbsUp } from "lucide-react";
import type { PostSummary } from "@/lib/types";

const SM = { size: 14, strokeWidth: 1.8 };

/** Compact photo card for strips and grids of shared set-ups. */
export function PostMini({ post, grid = false }: { post: PostSummary; grid?: boolean }) {
  return (
    <Link href={`/ideas/${post.id}`} className={`post-mini ${grid ? "in-grid" : ""}`} role="listitem">
      <span className="photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={post.photoUrl} alt="" loading="lazy" />
        {post.challengeId && <span className="sample">Challenge entry</span>}
      </span>
      <span className="post-mini-body">
        <span className="eyebrow">
          {post.author.elfName} · {post.roomType}
        </span>
        <strong>{post.title}</strong>
        <span className="post-mini-stats">
          <span>
            <ThumbsUp {...SM} /> {post.upvotes}
          </span>
          <span>
            <Home {...SM} /> {post.uses}
          </span>
          <span>
            <MessageSquare {...SM} /> {post.commentsCount}
          </span>
        </span>
      </span>
    </Link>
  );
}
