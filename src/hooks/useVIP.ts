import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  const userIdRef = useRef<string | null>(null);

  const refresh = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from("vip_history")
      .select("plan_id, new_expires_at, created_at")
      .eq("user_id", uid)
      .order("new_expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) {
      setMembership(DEFAULT);
      return;
    }
    const exp = new Date(data.new_expires_at).getTime();
    if (exp < Date.now()) {
      setMembership(DEFAULT);
      return;
    }
    setMembership({
      active: true,
      joinedAt: data.created_at,
      expiresAt: data.new_expires_at,
      planId: data.plan_id,
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session?.user?.id) { setMembership(DEFAULT); return; }
      userIdRef.current = session.user.id;
      await refresh(session.user.id);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const uid = session?.user?.id ?? null;
      userIdRef.current = uid;
      if (!uid) { setMembership(DEFAULT); return; }
      await refresh(uid);
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, [refresh]);

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

  const activate = useCallback(async (plan: VIPPlan = VIP_PLANS[0]): Promise<{ error: string | null }> => {
    const uid = userIdRef.current;
    if (!uid) return { error: "Not signed in" };
    const { data, error } = await supabase.rpc("purchase_vip", {
      _plan_id: plan.id,
      _plan_label: plan.label,
      _months: plan.months,
      _price: plan.price,
    });
    if (error) return { error: error.message };
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.new_expires_at) {
      setMembership({
        active: true,
        joinedAt: membership.joinedAt || new Date().toISOString(),
        expiresAt: row.new_expires_at,
        planId: plan.id,
      });
    }
    return { error: null };
  }, [membership.joinedAt]);

  const cancel = useCallback(() => setMembership(DEFAULT), []);

  const daysRemaining = (() => {
    if (!membership.active || !membership.expiresAt) return 0;
    const ms = new Date(membership.expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  })();

  const currentPlan = membership.planId ? VIP_PLANS.find((p) => p.id === membership.planId) || null : null;

  return { membership, isVIP: membership.active, activate, previewExtension, cancel, daysRemaining, currentPlan };
};
