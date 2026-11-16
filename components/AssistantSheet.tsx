"use client";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { useState } from "react";
import { channels, nightBeforeMessage } from "@/lib/assistant";
import type { AssistantSettings } from "@/lib/types";
import { Checkbox, ICON_SM, Segment, Sheet } from "./ui";

/** The "Send to my assistant" bottom sheet. Opens WhatsApp or Messages with the text ready; the parent taps send. */
export function AssistantSheet({
  title,
  message,
  settings,
  onChannel,
  onClose,
  reminder,
}: {
  title: string;
  message: string;
  settings: AssistantSettings;
  onChannel: (c: AssistantSettings["channel"]) => void;
  onClose: () => void;
  reminder?: { time: string; title: string; items: string[] } | null;
}) {
  const [alsoRemind, setAlsoRemind] = useState(Boolean(reminder));
  const channel = channels[settings.channel];
  const body = alsoRemind && reminder ? `${message}\n\n${nightBeforeMessage(reminder.time, reminder.title, reminder.items)}` : message;
  const url = settings.phone ? channel.composeUrl(settings, body) : null;

  return (
    <Sheet eyebrow="Send to my assistant" title={title} onClose={onClose}>
      <Segment
        options={[
          { key: "whatsapp" as const, label: <><MessageSquare {...ICON_SM} /> WhatsApp</> },
          { key: "imessage" as const, label: <><MessageSquare {...ICON_SM} /> iMessage</> },
        ]}
        value={settings.channel}
        onChange={onChannel}
      />
      <div className="between small">
        <span className="muted">To: My assistant</span>
        <span className="muted">{settings.phone || "No number yet"}</span>
      </div>
      <div className="bubble">{body}</div>
      {reminder && (
        <label className="check-line">
          <Checkbox on={alsoRemind} onChange={setAlsoRemind} label="Also remind me the night before" />
          Also remind me the night before each set-up
        </label>
      )}
      {url ? (
        <a className="btn primary large full" href={url} target="_blank" rel="noopener">
          Open in {channel.name}
        </a>
      ) : (
        <Link className="btn primary large full" href="/settings">
          Add your assistant&apos;s number
        </Link>
      )}
      <p className="muted small center">Opens {channel.name} with this message ready. You tap send.</p>
    </Sheet>
  );
}
