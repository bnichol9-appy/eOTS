"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Garland } from "@/components/ui";
import { APP_NAME } from "@/lib/brand";
import { api, type AuthStatus } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/utils";
import { setPendingInvite, type InviteInfo } from "@/lib/invite";

/** Where an invite link lands: says who invited you, then signs you up, signs you in or joins straight away. */
export default function JoinPage() {
  const { code: raw } = useParams<{ code: string }>();
  const code = decodeURIComponent(raw ?? "").toUpperCase();
  const router = useRouter();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .invite(code)
      .then(setInvite)
      .catch((e) => setError(errorMessage(e)));
    api
      .authStatus()
      .then(setAuth)
      .catch(() => setAuth({ authed: false, hasPin: false, unlocked: false }));
  }, [code]);

  const ready = auth?.authed && (auth.unlocked || !auth.hasPin);

  async function join() {
    if (!invite) return;
    setBusy(true);
    setError(null);
    try {
      if (invite.kind === "family") {
        await api.joinFamily(code);
        router.replace("/");
      } else {
        const c = await api.joinCircle(code);
        router.replace(`/ideas/circles/${c.id}`);
      }
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  function viaLogin(signup: boolean) {
    // Family invites are handled by sign-up itself; everything else is picked up once you're in the app.
    if (!(signup && invite?.kind === "family")) setPendingInvite(code);
    router.push(`/login?${signup ? "mode=signup&" : ""}code=${encodeURIComponent(code)}`);
  }

  const elves = invite?.kind === "family" ? (invite.elves.length ? invite.elves.join(" and ") : "their elf") : "";

  return (
    <div className="screen full lock join">
      <Garland />
      <div className="brand">{APP_NAME}</div>

      {!invite && !error && <p className="muted">Opening your invite…</p>}

      {invite && (
        <section className="countdown join-card">
          <span className="challenge-icon" aria-hidden="true">
            <Users size={20} strokeWidth={1.8} />
          </span>
          {invite.kind === "family" ? (
            <>
              <div className="eyebrow">{invite.parents.length ? `${invite.parents.join(" and ")} invited you` : "You're invited"}</div>
              <h1 className="card-title">Run {elves} together</h1>
              <p className="body">You&apos;ll share the house, the plan and the photos, so whoever&apos;s up at 11pm sees exactly the same thing.</p>
            </>
          ) : (
            <>
              <div className="eyebrow">Circle invite</div>
              <h1 className="card-title">Join {invite.name}</h1>
              <p className="body">
                {invite.families} {invite.families === 1 ? "family" : "families"} already swapping elf set-ups. See what each other&apos;s elves get up to each night, and share yours just with the
                circle.
              </p>
            </>
          )}
        </section>
      )}

      {error && <p className="error">{error}</p>}

      {invite && auth && (
        <div className="join-actions">
          {ready ? (
            <>
              <button className="btn primary large full" onClick={() => void join()} disabled={busy}>
                {busy ? "Joining…" : invite.kind === "family" ? `Join ${elves}` : `Join ${invite.name}`}
              </button>
              {invite.kind === "family" && <p className="muted small center">This works for a new account. If yours already has rooms or nights, your partner can sign up with your code instead.</p>}
              <Link href="/" className="btn full">
                Not now
              </Link>
            </>
          ) : auth.authed ? (
            <button
              className="btn primary large full"
              onClick={() => {
                setPendingInvite(code);
                router.push("/");
              }}
            >
              Unlock to join
            </button>
          ) : (
            <>
              <button className="btn primary large full" onClick={() => viaLogin(true)}>
                Create my account
              </button>
              <button className="btn full" onClick={() => viaLogin(false)}>
                I already have an account
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
