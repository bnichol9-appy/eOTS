import type { Notice } from "./notify";

/**
 * Every notification the app sends, in one place. `title`/`body` show in the in-app inbox (behind the PIN).
 * `pushTitle`/`pushBody` are what a lock screen shows, so they never mention elves: a child might see them.
 */
const q = (s: string) => `"${s}"`;

export const notices = {
  hello: (): Notice => ({
    type: "hello",
    title: "Notifications are on",
    body: "We'll nudge you at bedtime if tonight isn't planned, and in the morning to log how it went.",
    pushBody: "You'll get a nudge at bedtime if tonight isn't planned.",
    url: "/",
  }),
  eveningUnplanned: (): Notice => ({
    type: "nudge",
    title: "Tonight isn't planned yet",
    body: "The elf hasn't moved. Three ideas for your house are a tap away.",
    pushTitle: "Tonight isn't planned yet",
    pushBody: "Three ideas are a tap away.",
    url: "/",
  }),
  eveningPlanned: (title: string | null): Notice => ({
    type: "nudge",
    title: title ? `Tonight: ${title}` : "Tonight's plan is ready",
    body: "Steps and kit are waiting for when the kids are asleep.",
    pushTitle: "Tonight's plan is ready",
    pushBody: "Steps and kit are waiting for later.",
    url: "/",
  }),
  morningLog: (): Notice => ({
    type: "nudge",
    title: "How did last night go?",
    body: "Add a photo and the kids' reaction so tomorrow's ideas land even better.",
    pushTitle: "How did last night go?",
    pushBody: "Add a photo and a quick rating.",
    url: "/",
  }),
  badge: (name: string, description: string): Notice => ({ type: "badge", title: `New badge: ${name}`, body: description, pushBody: "You earned a new badge.", url: "/settings/badges" }),
  upvotes: (count: number, postTitle: string, postId: string): Notice => ({
    type: "upvotes",
    title: count === 1 ? `First upvote on ${q(postTitle)}` : `${q(postTitle)} reached ${count} upvotes`,
    body: count === 1 ? "Another parent liked your set-up." : "Other parents are loving it.",
    pushTitle: count === 1 ? "Your first upvote" : `${count} upvotes on your post`,
    pushBody: count === 1 ? "Another parent liked what you shared." : "Other parents are loving it.",
    url: `/ideas/${postId}`,
  }),
  comment: (who: string, postTitle: string, text: string, postId: string): Notice => ({
    type: "comment",
    title: `${who} commented on ${q(postTitle)}`,
    body: text.slice(0, 140),
    pushTitle: `${who} left a comment`,
    pushBody: "Tap to read it.",
    url: `/ideas/${postId}#comments`,
  }),
  remake: (who: string, postTitle: string, postId: string): Notice => ({
    type: "remake",
    title: `${who} remade ${q(postTitle)}`,
    body: "See how it turned out in their house.",
    pushTitle: "Someone remade your post",
    pushBody: "See how it turned out in their house.",
    url: `/ideas/${postId}`,
  }),
  circleJoin: (who: string, circle: string, circleId: string): Notice => ({
    type: "circle_join",
    title: `${who} joined ${circle}`,
    body: "Their nights will show up in the circle from now on.",
    pushTitle: `${who} joined your circle`,
    pushBody: "Say hello in the circle.",
    url: `/ideas/circles/${circleId}`,
  }),
  coparent: (who: string): Notice => ({
    type: "coparent",
    title: `${who} joined your family`,
    body: "You now share the house, the plan and the photos.",
    pushTitle: `${who} joined your family`,
    pushBody: "You now share the plan.",
    url: "/settings",
  }),
  challengeWon: (challenge: string, postTitle: string, challengeId: string): Notice => ({
    type: "challenge",
    title: `You won ${challenge}`,
    body: `${q(postTitle)} took the top spot. The Champion badge is yours.`,
    pushTitle: "You won this week's challenge",
    pushBody: "Tap to see the final board.",
    url: `/ideas/challenges/${challengeId}`,
  }),
  challengeEnded: (challenge: string, postTitle: string, challengeId: string): Notice => ({
    type: "challenge",
    title: `${challenge} has a winner`,
    body: `${q(postTitle)} came out on top. See the final board.`,
    pushTitle: "This week's challenge has a winner",
    pushBody: "Tap to see the final board.",
    url: `/ideas/challenges/${challengeId}`,
  }),
};

/** Last line of defence for lock screens: anything that still mentions elves becomes a neutral line. */
export function lockScreenSafe(text: string, fallback: string) {
  return /\b(elf|elves|santa)\b/i.test(text) ? fallback : text;
}
