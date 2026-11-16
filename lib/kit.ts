import type { Day, Idea, KitItem } from "./types";

export interface KitNight {
  date: string;
  title: string;
  format: Idea["format"];
  roomName: string;
  status: Day["status"];
  items: (KitItem & { have: boolean; key: string })[];
}

export interface KitBag {
  from: string;
  to: string;
  nights: KitNight[];
  atHome: number;
  toBuy: number;
  buyBy: string | null; // the night before the first night that needs a bought item
  budgetGBP: number; // rounded up to the next £5
}

export const kitKey = (item: KitItem) => item.name.trim().toLowerCase();

/** Build the kit bag for the given nights (planned or done, in date order). */
export function buildKitBag(days: Day[], from: string, to: string): KitBag {
  const nights: KitNight[] = [];
  for (const d of days) {
    if (d.date < from || d.date > to) continue;
    if (d.status !== "planned" && d.status !== "done") continue;
    const idea = d.ideas.find((i) => i.id === d.chosenIdeaId);
    if (!idea) continue;
    nights.push({
      date: d.date,
      title: idea.title,
      format: idea.format,
      roomName: idea.roomName,
      status: d.status,
      items: idea.kit.map((k) => ({ ...k, key: kitKey(k), have: d.kitState[kitKey(k)] ?? k.commonlyAtHome })),
    });
  }
  nights.sort((a, b) => a.date.localeCompare(b.date));
  const all = nights.flatMap((n) => n.items.map((i) => ({ ...i, date: n.date })));
  const buy = all.filter((i) => !i.have);
  const firstNeed = buy.map((i) => i.date).sort()[0] ?? null;
  const budget = buy.reduce((sum, i) => sum + (i.estPriceGBP ?? 3), 0);
  return {
    from,
    to,
    nights,
    atHome: all.filter((i) => i.have).length,
    toBuy: buy.length,
    buyBy: firstNeed ? shiftDate(firstNeed, -1) : null,
    budgetGBP: budget > 0 ? Math.ceil(budget / 5) * 5 : 0,
  };
}

export function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
