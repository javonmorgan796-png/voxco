import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const VIP_KEY = "vip_membership";

export interface VIPPlan {
  id: string;
  label: string;
  months: number;
  price: number;
  badge?: string;
  savings?: string;
}

export const VIP_PLANS: VIPPlan[] = [
  { id: "1m", label: "1 Month", months: 1, price: 100 },
  { id: "3m", label: "3 Months", months: 3, price: 270, badge: "POPULAR", savings: "Save $30" },
  { id: "6m", label: "6 Months", months: 6, price: 500, savings: "Save $100" },
  { id: "12m", label: "12 Months", months: 12, price: 900, badge: "BEST VALUE", savings: "Save $300" },
];

// Backward compat
export const VIP_PRICE = VIP_PLANS[0].price;

export interface VIPMembership {
  active: boolean;
  joinedAt: string | null;
  expiresAt: string | null;
  planId?: string | null;
}

const DEFAULT: VIPMembership = { active: false, joinedAt: null, expiresAt: null, planId: null };

export const useVIP = () => {
  const [membership, setMembership] = useState<VIPMembership>(DEFAULT);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(VIP_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as VIPMembership;
        // Auto-expire
        if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() < Date.now()) {
          setMembership(DEFAULT);
          localStorage.setItem(VIP_KEY, JSON.stringify(DEFAULT));
        } else {
          setMembership(parsed);
        }
      }
    } catch {
      setMembership(DEFAULT);
    }
  }, []);

  const previewExtension = useCallback((plan: VIPPlan) => {
    const now = new Date();
    const baseFrom = membership.active && membership.expiresAt && new Date(membership.expiresAt).getTime() > now.getTime()
      ? new Date(membership.expiresAt)
      : now;
    const newExpires = new Date(baseFrom.getTime() + plan.months * 30 * 24 * 60 * 60 * 1000);
    return {
      previousExpires: membership.expiresAt ? new Date(membership.expiresAt) : null,
      newExpires,
      addedDays: Math.round(plan.months * 30),
    };
  }, [membership]);

  const activate = useCallback(async (plan: VIPPlan = VIP_PLANS[0]) => {
    const wasActive = membership.active;
    const { previousExpires, newExpires } = previewExtension(plan);
    const next: VIPMembership = {
      active: true,
      joinedAt: membership.joinedAt || new Date().toISOString(),
      expiresAt: newExpires.toISOString(),
      planId: plan.id,
    };
    setMembership(next);
    localStorage.setItem(VIP_KEY, JSON.stringify(next));

    // Record in vip_history (best-effort)
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from("vip_history").insert({
          user_id: session.user.id,
          plan_id: plan.id,
          plan_label: plan.label,
          months: plan.months,
          price: plan.price,
          action: wasActive ? "extended" : "joined",
          previous_expires_at: previousExpires?.toISOString() || null,
          new_expires_at: newExpires.toISOString(),
        });
      }
    } catch { /* ignore */ }
  }, [membership, previewExtension]);

  const cancel = useCallback(() => {
    setMembership(DEFAULT);
    localStorage.setItem(VIP_KEY, JSON.stringify(DEFAULT));
  }, []);

  const daysRemaining = (() => {
    if (!membership.active || !membership.expiresAt) return 0;
    const ms = new Date(membership.expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  })();

  const currentPlan = membership.planId ? VIP_PLANS.find((p) => p.id === membership.planId) || null : null;

  return { membership, isVIP: membership.active, activate, previewExtension, cancel, daysRemaining, currentPlan };
};
