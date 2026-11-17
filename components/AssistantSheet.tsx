"use client";
import { Bell, Bot, Check, Copy, MessageSquare, Pencil } from "lucide-react";
import { useState } from "react";
import { channels, nightBeforeMessage } from "@/lib/assistant";
import { api } from "@/lib/client/api";
import { copyText, errorMessage } from "@/lib/client/utils";
import type { AssistantSettings } from "@/lib/types";
import { useApp } from "./AppContext";
import { ICON_SM, Segment, Sheet } from "./ui";

const SM = { size: 18, strokeWidth: 1.8 };

/**
 * "Send to my assistant": a preview of the chat with the message ready to go. Opens WhatsApp or Messages
 * with the text filled in; the parent taps send. The number can be added and the text tweaked right here.
 */
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
  const { actions } = useApp();
  const [alsoRemind, setAlsoRemind] = useState(Boolean(reminder));
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(settings.phone);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const generated = alsoRemind && reminder ? `${message}\n\n${nightBeforeMessage(reminder.time, reminder.title, reminder.items)}` : message;
  // Once the parent edits the text, it's theirs: it no longer follows the generated version.
  const [custom, setCustom] = useState<string | null>(null);
  const body = custom ?? generated;

  const channel = channels[settings.channel];
  const number = settings.phone || phone;
  const url = number ? channel.composeUrl({ ...settings, phone: number }, body) : null;

  async function savePhone() {
    setError(null);
    try {
      actions.setSettings(await api.saveSettings({ assistant: { phone: phone.trim() } }));
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <Sheet eyebrow="Send to my assistant" title={title} onClose={onClose}>
      <Segment
        options={[
          {
            key: "whatsapp" as const,
            label: (
              <>
                <MessageSquare {...ICON_SM} /> WhatsApp
              </>
            ),
          },
          {
            key: "imessage" as const,
            label: (
              <>
                <MessageSquare {...ICON_SM} /> iMessage
              </>
            ),
          },
        ]}
        value={settings.channel}
        onChange={onChannel}
      />

      <div className="chat-card">
        <div className="chat-head">
          <span className="chat-avatar" aria-hidden="true">
            <Bot {...SM} />
          </span>
          <span className="row-label">
            <strong>My assistant</strong>
            <span className="row-sub">{settings.phone ? `${settings.phone} · ${channel.name}` : "No number yet"}</span>
          </span>
          <button className={`icon-btn plain chat-edit ${editing ? "on" : ""}`} onClick={() => setEditing(!editing)} aria-label={editing ? "Done editing" : "Edit message"} aria-pressed={editing}>
            {editing ? <Check {...SM} /> : <Pencil {...SM} />}
          </button>
        </div>
        {editing ? (
          <textarea
            className="input chat-edit-box"
            rows={Math.min(10, body.split("\n").length + 2)}
            value={body}
            onChange={(e) => setCustom(e.target.value)}
            aria-label="Message to your assistant"
            autoFocus
          />
        ) : (
          <div className="bubble">{body}</div>
        )}
        {!settings.phone && (
          <div className="chat-number">
            <input className="input" type="tel" placeholder="Assistant's number, e.g. +44 7700 900123" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Assistant's number" />
            <button className="btn" disabled={!phone.trim()} onClick={() => void savePhone()}>
              Save
            </button>
          </div>
        )}
      </div>

      {reminder && (
        <button className="list-row set-row" role="switch" aria-checked={alsoRemind} onClick={() => setAlsoRemind(!alsoRemind)}>
          <Bell {...SM} className="row-icon" aria-hidden="true" />
          <span className="row-label">
            Also remind me the night before
            <span className="row-sub">Adds a line asking your assistant to nudge you</span>
          </span>
          <span className={`switch ${alsoRemind ? "on" : ""}`} aria-hidden="true">
            <i />
          </span>
        </button>
      )}

      {error && <p className="error">{error}</p>}

      <div className="invite-row">
        <button
          className="btn"
          onClick={() =>
            void copyText(body).then((ok) => {
              setCopied(ok);
              if (ok) setTimeout(() => setCopied(false), 2000);
            })
          }
        >
          {copied ? <Check {...ICON_SM} /> : <Copy {...ICON_SM} />} {copied ? "Copied" : "Copy"}
        </button>
        {url ? (
          <a className="btn pine chat-send" href={url} target="_blank" rel="noopener noreferrer">
            <MessageSquare {...ICON_SM} /> Open in {channel.name}
          </a>
        ) : (
          <button className="btn pine chat-send" disabled>
            Add a number to send
          </button>
        )}
      </div>
      <p className="muted small center">Opens {channel.name} with this message ready. You tap send.</p>
    </Sheet>
  );
}
