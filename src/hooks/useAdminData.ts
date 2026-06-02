import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AdminUserRow {
  id: string;
  username: string | null;
  display_name: string | null;
  is_suspended: boolean;
  created_at: string;
}
export type RequestStatus = "pending" | "approved" | "rejected";
export type CryptoKind = "BTC" | "ETH" | "USDT";
export type VipBetStatus = "pending" | "approved" | "rejected" | "won" | "lost";

export interface DepositRow {
  id: string; user_id: string; amount_usd: number; crypto: CryptoKind;
  tx_hash: string | null; note: string | null; status: RequestStatus;
  created_at: string;
  bank_name?: string | null; bank_account?: string | null; bank_reference?: string | null;
  receipt_url?: string | null; credited_at?: string | null;
  reject_reason?: string | null;
}
export interface WithdrawalRow {
  id: string; user_id: string; amount_usd: number; crypto: CryptoKind;
  destination_address: string; note: string | null; status: RequestStatus;
  created_at: string;
  reject_reason?: string | null;
}
export interface VipBetRow {
  id: string; user_id: string; prediction_id: string; stake: number;
  odds: number; potential_payout: number; status: VipBetStatus; created_at: string;
}
export interface AuditLogRow {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  created_at: string;
}

const writeAudit = async (
  action: string,
  entityType: string,
  entityId: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  await supabase.from("admin_audit_log").insert({
    actor_id: session.user.id, action, entity_type: entityType, entity_id: entityId,
    before: before as never, after: after as never,
  });
};

const diff = (before: Record<string, unknown>, after: Record<string, unknown>) => {
  const b: Record<string, unknown> = {}, a: Record<string, unknown> = {};
  Object.keys(after).forEach((k) => {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) {
      b[k] = before[k] ?? null;
      a[k] = after[k];
    }
  });
  return { before: b, after: a };
};

export const useAdminData = () => {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [deposits, setDeposits] = useState<DepositRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [vipBets, setVipBets] = useState<VipBetRow[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [u, d, w, v, a] = await Promise.all([
      supabase.from("profiles").select("id, username, display_name, is_suspended, created_at").order("created_at", { ascending: false }),
      supabase.from("deposit_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("withdrawal_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("vip_bets").select("*").order("created_at", { ascending: false }),
      supabase.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    if (u.data) setUsers(u.data as AdminUserRow[]);
    if (d.data) setDeposits(d.data as DepositRow[]);
    if (w.data) setWithdrawals(w.data as WithdrawalRow[]);
    if (v.data) setVipBets(v.data as VipBetRow[]);
    if (a.data) setAuditLog(a.data as AuditLogRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const ch = supabase
      .channel("admin_dash")
      .on("postgres_changes", { event: "*", schema: "public", table: "deposit_requests" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawal_requests" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "vip_bets" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_audit_log" }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [refresh]);

  const getReceiptUrl = async (path: string) => {
    const { data } = await supabase.storage.from("receipts").createSignedUrl(path, 60 * 60);
    return data?.signedUrl || null;
  };

  const setUserSuspended = async (userId: string, suspended: boolean) => {
    const before = users.find((u) => u.id === userId);
    const { error } = await supabase.from("profiles").update({ is_suspended: suspended }).eq("id", userId);
    if (!error) await writeAudit(suspended ? "suspend_user" : "reinstate_user", "profile", userId,
      { is_suspended: before?.is_suspended }, { is_suspended: suspended });
    return error;
  };
  const setDepositStatus = async (id: string, status: RequestStatus, rejectReason?: string) => {
    const before = deposits.find((d) => d.id === id);
    const patch: Record<string, unknown> = { status, reviewed_at: new Date().toISOString() };
    if (status === "approved" && before && !before.credited_at) patch.credited_at = new Date().toISOString();
    if (status === "rejected") patch.reject_reason = rejectReason || null;
    if (status !== "rejected") patch.reject_reason = null;
    const { error } = await supabase.from("deposit_requests").update(patch as any).eq("id", id);
    if (!error) await writeAudit(`deposit_${status}`, "deposit_request", id,
      { status: before?.status, reject_reason: before?.reject_reason ?? null },
      { status, credited_at: patch.credited_at, reject_reason: patch.reject_reason });
    return error;
  };
  const setWithdrawalStatus = async (id: string, status: RequestStatus, rejectReason?: string) => {
    const before = withdrawals.find((w) => w.id === id);
    const patch: Record<string, unknown> = { status, reviewed_at: new Date().toISOString() };
    if (status === "rejected") patch.reject_reason = rejectReason || null;
    if (status !== "rejected") patch.reject_reason = null;
    const { error } = await supabase.from("withdrawal_requests").update(patch as any).eq("id", id);
    if (!error) await writeAudit(`withdrawal_${status}`, "withdrawal_request", id,
      { status: before?.status, reject_reason: before?.reject_reason ?? null },
      { status, reject_reason: patch.reject_reason });
    return error;
  };
  const setVipBetStatus = async (id: string, status: VipBetStatus) => {
    const before = vipBets.find((b) => b.id === id);
    const { error } = await supabase.from("vip_bets").update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (!error) await writeAudit(`vip_bet_${status}`, "vip_bet", id, { status: before?.status }, { status });
    return error;
  };

  const updateDeposit = async (id: string, patch: Partial<Pick<DepositRow, "amount_usd" | "crypto" | "tx_hash" | "note" | "bank_name" | "bank_account" | "bank_reference">>) => {
    const before = deposits.find((d) => d.id === id) as unknown as Record<string, unknown> | undefined;
    const { error } = await supabase.from("deposit_requests").update(patch as any).eq("id", id);
    if (!error && before) {
      const d = diff(before, patch as Record<string, unknown>);
      await writeAudit("edit_deposit", "deposit_request", id, d.before, d.after);
    }
    return error;
  };
  const updateWithdrawal = async (id: string, patch: Partial<Pick<WithdrawalRow, "amount_usd" | "crypto" | "destination_address" | "note">>) => {
    const before = withdrawals.find((w) => w.id === id) as unknown as Record<string, unknown> | undefined;
    const { error } = await supabase.from("withdrawal_requests").update(patch as any).eq("id", id);
    if (!error && before) {
      const d = diff(before, patch as Record<string, unknown>);
      await writeAudit("edit_withdrawal", "withdrawal_request", id, d.before, d.after);
    }
    return error;
  };

  return {
    users, deposits, withdrawals, vipBets, auditLog, loading,
    refresh, setUserSuspended, setDepositStatus, setWithdrawalStatus, setVipBetStatus,
    updateDeposit, updateWithdrawal, getReceiptUrl,
  };
};
