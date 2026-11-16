"use client";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppContext";
import { BadgeIcon } from "@/components/icons";
import { Topbar } from "@/components/ui";

export default function BadgesPage() {
  const router = useRouter();
  const { data } = useApp();
  const earned = data.badges.filter((b) => b.awardedAt).length;
  return (
    <div className="screen">
      <Topbar eyebrow={`${earned} of ${data.badges.length} earned · ${data.stats.nightsDone} nights · ${data.stats.streak} night streak`} title="Badges" back={() => router.back()} />
      <div className="badges-grid">
        {data.badges.map((b) => (
          <div key={b.key} className={`card badge-card ${b.awardedAt ? "earned" : ""}`}>
            <BadgeIcon name={b.icon} />
            <strong>{b.name}</strong>
            <p className="small body">{b.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
