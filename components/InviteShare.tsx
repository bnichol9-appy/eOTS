"use client";
import { Check, Copy, MessageCircle, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { whatsappUrl } from "@/lib/invite";

const SM = { size: 18, strokeWidth: 1.8 };

/** Send an invite link: straight to WhatsApp, the phone's share sheet, or copy it. */
export function InviteShare({ link, text }: { link: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function"), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className="invite-share">
      <a className="btn pine full" href={whatsappUrl(text)} target="_blank" rel="noopener noreferrer">
        <MessageCircle {...SM} /> Send on WhatsApp
      </a>
      <div className="invite-row">
        {canShare && (
          <button className="btn" onClick={() => void navigator.share({ text }).catch(() => {})}>
            <Share2 {...SM} /> Share…
          </button>
        )}
        <button className="btn" onClick={() => void copy()}>
          {copied ? <Check {...SM} /> : <Copy {...SM} />} {copied ? "Copied" : "Copy link"}
        </button>
      </div>
      <p className="invite-link muted small">{link}</p>
    </div>
  );
}
