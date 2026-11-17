"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Copy, MessageSquare } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/AppContext";
import { AssistantSheet } from "@/components/AssistantSheet";
import { SectionHead } from "@/components/home/Sections";
import { Actions, Checkbox, ICON_SM, Segment, Topbar, Working } from "@/components/ui";
import { buyMessage, friendlyTime } from "@/lib/assistant";
import { api } from "@/lib/client/api";
import { seasonFor } from "@/lib/client/season";
import { copyText, dayNum, errorMessage, localDate, weekday } from "@/lib/client/utils";
import type { KitBag, KitNight } from "@/lib/kit";
import { formatWord } from "@/lib/types";

const SM = { size: 16, strokeWidth: 1.8 };
const fullDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

interface ShopItem {
  key: string;
  name: string;
  qty: string;
  have: boolean;
  dates: string[];
}

/** The kit bag: one shopping list for the coming nights, then what each night needs. */
export default function KitPage() {
  const router = useRouter();
  const { data, actions } = useApp();
  const today = localDate();
  const season = useMemo(() => seasonFor(data.profile, today), [data.profile, today]);
  const [from, setFrom] = useState(season.phase === "pre" ? season.start : today);
  const [nights, setNights] = useState(4);
  const [bag, setBag] = useState<KitBag | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [send, setSend] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("from");
    if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) setFrom(q);
  }, []);

  const load = (f: string, n: number) =>
    api
      .kit(f, n)
      .then(setBag)
      .catch((e) => setError(errorMessage(e)));

  useEffect(() => {
    setBag(null);
    void load(from, nights);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, nights]);

  async function setHave(dates: string[], key: string, have: boolean) {
    setPending(key);
    try {
      for (const d of dates) {
        const r = await api.setKit(d, key, have);
        actions.setDay(r.day);
      }
      await load(from, nights);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(null);
    }
  }

  // One line per item across all the nights, so a single tick covers every night that needs it.
  const shop: ShopItem[] = useMemo(() => {
    const map = new Map<string, ShopItem>();
    for (const n of bag?.nights ?? []) {
      for (const i of n.items) {
        const cur = map.get(i.key);
        if (cur) {
          cur.dates.push(n.date);
          cur.have = cur.have && i.have;
        } else map.set(i.key, { key: i.key, name: i.name, qty: i.qty ?? "", have: i.have, dates: [n.date] });
      }
    }
    return [...map.values()];
  }, [bag]);
  const toBuy = shop.filter((i) => !i.have);
  const atHome = shop.filter((i) => i.have);
  const buyItems = bag?.nights.flatMap((n) => n.items.filter((i) => !i.have)) ?? [];
  const buyBy = bag?.buyBy ?? from;
  const pct = shop.length ? (atHome.length / shop.length) * 100 : 0;

  return (
    <div className="screen home has-actions">
      <Topbar eyebrow={bag ? `${fullDate(bag.from)} to ${fullDate(bag.to)}` : "The coming nights"} title="Kit bag" back={() => router.back()} />
      <Segment
        options={[
          { key: "4", label: "Next 4 nights" },
          { key: "7", label: "Next week" },
        ]}
        value={String(nights)}
        onChange={(v) => setNights(Number(v))}
      />
      {error && <p className="error">{error}</p>}

      {!bag ? (
        <Working label="Checking the cupboards…" />
      ) : bag.nights.length === 0 ? (
        <section className="countdown">
          <div className="eyebrow">Nothing to pack yet</div>
          <h2 className="card-title">Plan a few nights and the kit lands here</h2>
          <p className="body">Every planned set-up lists what it needs. Anything you don&apos;t usually have at home goes on one shopping list.</p>
          <Link href="/calendar" className="btn primary full">
            Plan the nights
          </Link>
        </section>
      ) : (
        <>
          <section className="season-summary" aria-label="Summary">
            <div className="season-legend">
              <span>
                <i className="done" />
                <strong>{toBuy.length}</strong> to buy{toBuy.length > 0 && bag.buyBy ? ` by ${weekday(buyBy)} ${dayNum(buyBy)}` : ""}
              </span>
              <span>
                <i className="planned" />
                <strong>{atHome.length}</strong> at home
              </span>
              {bag.budgetGBP > 0 && (
                <span>
                  about <strong>£{bag.budgetGBP}</strong>
                </span>
              )}
            </div>
            <div className="season-bar kit-bar" role="img" aria-label={`${atHome.length} of ${shop.length} items at home`}>
              <i className="planned" style={{ width: `${pct}%` }} />
            </div>
          </section>

          <section aria-label="Shopping list">
            <SectionHead title={toBuy.length ? "Shopping list" : "All packed"} action={toBuy.length > 0 ? <span className="muted small">{toBuy.length}</span> : undefined} />
            {toBuy.length === 0 ? (
              <p className="body">Everything for these nights is already at home. Nice.</p>
            ) : (
              <div className="list">
                {toBuy.map((i) => (
                  <ShopRow key={i.key} item={i} busy={pending === i.key} onChange={(v) => void setHave(i.dates, i.key, v)} />
                ))}
              </div>
            )}
            {atHome.length > 0 && (
              <details className="at-home">
                <summary>
                  Already at home <span className="muted">· {atHome.length}</span>
                </summary>
                <div className="list">
                  {atHome.map((i) => (
                    <ShopRow key={i.key} item={i} busy={pending === i.key} onChange={(v) => void setHave(i.dates, i.key, v)} />
                  ))}
                </div>
              </details>
            )}
          </section>

          <section aria-label="Night by night">
            <SectionHead title="Night by night" />
            <div className="kit-nights">
              {bag.nights.map((n) => (
                <NightKit key={n.date} night={n} pending={pending} onChange={(key, v) => void setHave([n.date], key, v)} />
              ))}
            </div>
          </section>
        </>
      )}

      <Actions>
        <button
          className="btn secondary"
          disabled={buyItems.length === 0}
          onClick={() => void copyText(toBuy.map((i) => `${i.name}${i.qty ? ` (${i.qty})` : ""}`).join("\n")).then((ok) => actions.toast(ok ? "Shopping list copied." : "Couldn't copy."))}
        >
          <Copy {...ICON_SM} /> Copy list
        </button>
        <button className="btn primary" disabled={buyItems.length === 0} onClick={() => setSend(true)}>
          <MessageSquare {...ICON_SM} /> Ask my assistant
        </button>
      </Actions>

      {send && bag && (
        <AssistantSheet
          title={`Buy ${toBuy.length} thing${toBuy.length === 1 ? "" : "s"} by ${weekday(buyBy)} ${dayNum(buyBy)}`}
          message={buyMessage(buyItems, buyBy, bag.budgetGBP)}
          settings={data.user.settings.assistant}
          onChannel={(channel) => void api.saveSettings({ assistant: { channel } }).then(actions.setSettings)}
          onClose={() => setSend(false)}
          reminder={
            bag.nights[0]
              ? { time: friendlyTime(data.user.settings.eveningReminder ?? "21:00"), title: bag.nights[0].title, items: bag.nights[0].items.filter((i) => !i.have).map((i) => i.name) }
              : null
          }
        />
      )}
    </div>
  );
}

function ShopRow({ item, busy, onChange }: { item: ShopItem; busy: boolean; onChange: (have: boolean) => void }) {
  const first = [...item.dates].sort()[0];
  return (
    <button className="list-row set-row shop-row" onClick={() => onChange(!item.have)} disabled={busy} aria-pressed={item.have}>
      <Checkbox on={item.have} label={item.have ? `${item.name}: at home` : `${item.name}: got it`} disabled />
      <span className="row-label">
        <span className={item.have ? "done-text" : "bold"}>
          {item.name}
          {item.qty ? <span className="muted"> · {item.qty}</span> : null}
        </span>
        <span className="row-sub">{item.dates.length > 1 ? `${item.dates.length} nights, first ${weekday(first)} ${dayNum(first)}` : `For ${weekday(first)} ${dayNum(first)}`}</span>
      </span>
      {!item.have && <span className="tag">Buy</span>}
    </button>
  );
}

function NightKit({ night, pending, onChange }: { night: KitNight; pending: string | null; onChange: (key: string, have: boolean) => void }) {
  const { data } = useApp();
  const missing = night.items.filter((i) => !i.have).length;
  return (
    <article className="kit-night">
      <Link href={`/?date=${night.date}`} className="kit-night-head">
        <span className="night-date">
          <span>{weekday(night.date)}</span>
          <strong>{dayNum(night.date)}</strong>
        </span>
        <span className="night-body">
          <span className="night-meta">
            {night.roomName}
            {night.format !== "single" ? ` · ${formatWord(night.format)}` : ""}
          </span>
          <span className="night-title">{night.title}</span>
        </span>
        <span className={`kit-count ${missing ? "need" : ""}`}>{night.items.length === 0 ? "Nothing needed" : missing ? `${missing} to buy` : "Packed"}</span>
        <ChevronRight {...SM} className="muted" aria-hidden="true" />
      </Link>
      {night.items.length > 0 && (
        <div className="kit-items">
          {night.items.map((i) => {
            const elf = data.profile.elves.find((e) => e.name === i.elf);
            return (
              <button
                key={i.key}
                className={`kit-chip ${i.have ? "have" : ""}`}
                onClick={() => onChange(i.key, !i.have)}
                disabled={pending === i.key}
                aria-pressed={i.have}
                aria-label={`${i.name}${i.have ? ", at home" : ", to buy"}`}
              >
                {elf && <i style={{ background: `var(--${elf.color})` }} aria-hidden="true" />}
                {i.name}
                {i.qty ? ` · ${i.qty}` : ""}
              </button>
            );
          })}
        </div>
      )}
    </article>
  );
}
