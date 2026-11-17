import { APP_NAME } from "./brand";

export type InviteInfo = { kind: "family"; code: string; elves: string[]; parents: string[] } | { kind: "circle"; code: string; name: string; families: number };

export function inviteLink(code: string, origin = typeof window !== "undefined" ? window.location.origin : "") {
  return `${origin}/join/${encodeURIComponent(code)}`;
}

export function familyInviteText(elves: string[], link: string) {
  const who = elves.length ? elves.join(" and ") : "our elf";
  return `Come and run ${who} with me on ${APP_NAME}. We'll share the house, the plan and the 11pm shift: ${link}`;
}

export function circleInviteText(name: string, link: string) {
  return `Join our "${name}" circle on ${APP_NAME} so we can see what each other's elves get up to and swap set-ups: ${link}`;
}

export function whatsappUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

const PENDING = "eots.pendingInvite";
export function setPendingInvite(code: string | null) {
  try {
    if (code) localStorage.setItem(PENDING, code);
    else localStorage.removeItem(PENDING);
  } catch {
    /* private mode */
  }
}
export function takePendingInvite(): string | null {
  try {
    const c = localStorage.getItem(PENDING);
    if (c) localStorage.removeItem(PENDING);
    return c;
  } catch {
    return null;
  }
}
