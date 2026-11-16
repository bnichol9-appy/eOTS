"use client";
import { Award, Bell, Camera, Crown, Flame, Hash, Heart, Home, Medal, MessageSquare, Moon, Repeat, Scroll, Target, ThumbsUp, Trophy, Users, Zap, type LucideIcon } from "lucide-react";

const MAP: Record<string, LucideIcon> = { moon: Moon, hash: Hash, flame: Flame, trophy: Trophy, zap: Zap, scroll: Scroll, camera: Camera, "thumbs-up": ThumbsUp, crown: Crown, repeat: Repeat, home: Home, users: Users, target: Target, medal: Medal };

export function BadgeIcon({ name, size = 28 }: { name: string; size?: number }) {
  const Icon = MAP[name] ?? Award;
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" />;
}

const NOTIF: Record<string, LucideIcon> = { nudge: Moon, upvotes: ThumbsUp, comment: MessageSquare, remake: Repeat, badge: Award, circle_join: Users, coparent: Heart, challenge: Target, hello: Bell };

export function NotifIcon({ type }: { type: string }) {
  const Icon = NOTIF[type] ?? Bell;
  return <Icon size={22} strokeWidth={1.8} aria-hidden="true" />;
}
