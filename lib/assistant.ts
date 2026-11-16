// Message templates for handing jobs to the parent's AI assistant.
// Version 1 opens WhatsApp or Messages with the text filled in; the parent taps send.
// Later, an AssistantChannel can send directly (email, webhook, MCP) without changing the templates.

import type { AssistantSettings } from "./types";

export interface AssistantChannel {
  name: string;
  /** Returns a URL that opens the channel with the message ready, or null if it can send directly. */
  composeUrl(settings: AssistantSettings, body: string): string | null;
}

export const whatsapp: AssistantChannel = {
  name: "WhatsApp",
  composeUrl: (s, body) => `https://wa.me/${s.phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(body)}`,
};

export const imessage: AssistantChannel = {
  name: "iMessage",
  // `sms:number?&body=` opens the Messages composer on iOS and Android.
  composeUrl: (s, body) => `sms:${s.phone.replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(body)}`,
};

export const channels: Record<AssistantSettings["channel"], AssistantChannel> = { whatsapp, imessage };

export function longDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

export function buyMessage(items: { name: string; qty: string }[], byDate: string, budgetGBP: number) {
  const lines = items.map((i) => `• ${i.name}${i.qty ? ` (${i.qty})` : ""}`);
  return `Please order for delivery by ${longDate(byDate)}:\n${lines.join("\n")}\nBudget up to £${budgetGBP}. Deliver to home, mark "elf supplies" so the kids don't open it.`;
}

export function remindMessage(time: string, title: string, room: string, items: string[]) {
  return `Remind me at ${time} tonight: elf set-up, ${title} in the ${room}.${items.length ? ` Kit: ${items.join(", ")}.` : ""}`;
}

export function nightBeforeMessage(time: string, title: string, items: string[]) {
  return `Remind me tomorrow at ${time}: ${title}.${items.length ? ` Needs ${items.join(", ")}.` : ""}`;
}

/** "9pm" from "21:00". */
export function friendlyTime(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hour}:${String(m).padStart(2, "0")}${suffix}` : `${hour}${suffix}`;
}
