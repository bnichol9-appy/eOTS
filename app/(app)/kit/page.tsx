"use client";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppContext";
import { AssistantSheet } from "@/components/AssistantSheet";
import { Actions, Checkbox, ICON_SM, Topbar, Working } from "@/components/ui";
import { buyMessage, friendlyTime, longDate } from "@/lib/assistant";
import { api } from "@/lib/client/api";
import { copyText, errorMessage, localDate, prettyDate } from "@/lib/client/utils";
import type { KitBag } from "@/lib/kit";
import { formatWord } from "@/lib/types";

export default function KitPage() {
  const router = useRouter();
  const { data, actions } = useApp();
  const [from, setFrom] = useState(localDate());
  const [bag, setBag] = useState<KitBag | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [send, setSend] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("from");
    if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) setFrom(q);
  }, []);

  const load = (f: string) =>
    api
      .kit(f, 4)
      .then(setBag)
      .catch((e) => setError(errorMessage(e)));

  useEffect(() => {
    void load(from);
  }, [from]);

  async function toggle(date: string, key: string, have: boolean) {
    try {
      const r = await api.setKit(date, key, have);
      actions.setDay(r.day);
      await load(from);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const buyItems = bag?.nights.flatMap((n) => n.items.filter((i) => !i.have)) ?? [];
  const buyBy = bag?.buyBy ?? from;

  return (
    <div className="screen has-actions">
      <Topbar eyebrow={bag ? `${prettyDate(bag.from)} – ${prettyDate(bag.to)}` : "Next four nights"} title="The elves' kit bag" back={() => router.back()} />
      {error && <p className="error">{error}</p>}
      {!bag ? (
        <Working label="Checking the cupboards…" />
      ) : (
        <>
          <div className="tiles">
            <div className="tile big">
              <strong>{bag.atHome}</strong>
              <div className="muted small">already at home</div>
            </div>
            <div className="tile big outline">
              <strong className="acc">{bag.toBuy}</strong>
              <div className="small">{bag.toBuy ? `to buy by ${longDate(buyBy).split(" ")[0]}` : "nothing to buy"}</div>
            </div>
          </div>
          {bag.nights.length === 0 && <div className="card filled body">Nothing planned for these nights yet. Plan the week from the Calendar and the kit lands here.</div>}
          <div className="list">
            {bag.nights.map((n) => (
              <div key={n.date}>
                <div className="group-head">
                  <strong>
                    {prettyDate(n.date).replace(/,.*$/, "")} {n.date.slice(8)} · {n.format === "split" ? "Split night" : n.title}
                  </strong>
                  <span>
                    {n.format !== "single" && n.format !== "split" ? "Both · " : ""}
                    {n.roomName}
                  </span>
                </div>
                {n.items.length === 0 && <div className="list-row muted">Nothing needed</div>}
                {n.items.map((i) => (
                  <label key={i.key} className="list-row" style={{ cursor: "pointer" }}>
                    <Checkbox on={i.have} onChange={(v) => void toggle(n.date, i.key, v)} label={`${i.name} at home`} />
                    <span>
                      {i.name}
                      {i.qty ? ` ${i.qty}` : ""} {i.elf && <span className="muted">({i.elf})</span>}
                    </span>
                    {!i.have && <span className="tag" style={{ marginLeft: "auto" }}>Buy</span>}
                  </label>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
      <Actions stacked noTabs>
        <button className="btn primary large" disabled={buyItems.length === 0} onClick={() => setSend(true)}>
          <MessageSquare {...ICON_SM} /> Ask my assistant to buy these {buyItems.length || ""}
        </button>
        <button
          className="btn"
          disabled={buyItems.length === 0}
          onClick={() => void copyText(buyItems.map((i) => `${i.name}${i.qty ? ` (${i.qty})` : ""}`).join("\n")).then((ok) => actions.toast(ok ? "Copied to your clipboard." : "Couldn't copy."))}
        >
          Copy to shopping list instead
        </button>
      </Actions>
      {send && bag && (
        <AssistantSheet
          title={`Buy ${buyItems.length} thing${buyItems.length === 1 ? "" : "s"} by ${longDate(buyBy).split(" ")[0]}`}
          message={buyMessage(buyItems, buyBy, bag.budgetGBP)}
          settings={data.user.settings.assistant}
          onChannel={(channel) => void api.saveSettings({ assistant: { channel } }).then(actions.setSettings)}
          onClose={() => setSend(false)}
          reminder={bag.nights[0] ? { time: friendlyTime(data.user.settings.eveningReminder ?? "21:00"), title: bag.nights[0].title, items: bag.nights[0].items.filter((i) => !i.have).map((i) => i.name) } : null}
        />
      )}
    </div>
  );
}
