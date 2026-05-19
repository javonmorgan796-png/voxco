import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, ArrowDownLeft, ArrowUpRight, Crown, ShieldCheck, ShieldAlert, Loader2, Check, XCircle, Ban, RotateCcw, Pencil, Landmark, ScrollText, Image as ImageIcon, Wallet as WalletIcon, Plus, Trash2, Upload, Save, DollarSign } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useAdminData, RequestStatus, VipBetStatus, DepositRow, WithdrawalRow } from "@/hooks/useAdminData";
import { usePaymentWallets, PaymentWallet, CryptoKind } from "@/hooks/usePaymentWallets";
import EditRequestDialog from "./EditRequestDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AdminDashboardProps {
  onClose: () => void;
}

type Tab = "users" | "deposits" | "withdrawals" | "vipBets" | "wallets" | "audit";
type DepositFilter = "all" | "pending" | "approved" | "rejected" | "credited";

const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: "users", label: "Users", icon: Users },
  { id: "deposits", label: "Deposits", icon: ArrowDownLeft },
  { id: "withdrawals", label: "Withdrawals", icon: ArrowUpRight },
  { id: "vipBets", label: "VIP Bets", icon: Crown },
  { id: "wallets", label: "Wallets", icon: WalletIcon },
  { id: "audit", label: "Audit Log", icon: ScrollText },
];

const FILTERS: { id: DepositFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending receipt" },
  { id: "approved", label: "Approved" },
  { id: "credited", label: "Credited" },
  { id: "rejected", label: "Rejected" },
];

const AdminDashboard = ({ onClose }: AdminDashboardProps) => {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { users, deposits, withdrawals, vipBets, auditLog, loading, setUserSuspended, setDepositStatus, setWithdrawalStatus, setVipBetStatus, updateDeposit, updateWithdrawal, getReceiptUrl } = useAdminData();
  const [tab, setTab] = useState<Tab>("users");
  const [editing, setEditing] = useState<{ kind: "deposit" | "withdrawal"; row: DepositRow | WithdrawalRow } | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [depositFilter, setDepositFilter] = useState<DepositFilter>("pending");
  const [rejecting, setRejecting] = useState<{ kind: "dep" | "wd"; id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [crediting, setCrediting] = useState<{ id: string; name: string } | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditNote, setCreditNote] = useState("");
  const [creditSubmitting, setCreditSubmitting] = useState(false);

  const handleCreditUser = async () => {
    if (!crediting) return;
    const amt = parseFloat(creditAmount);
    if (!Number.isFinite(amt) || amt === 0) { toast.error("Enter a non-zero amount"); return; }
    if (Math.abs(amt) > 1_000_000) { toast.error("Amount too large"); return; }
    setCreditSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("admin_credit_user" as never, {
        _user_id: crediting.id, _amount: amt, _note: creditNote || undefined,
      } as never);
      if (error) throw error;
      toast.success(`${amt > 0 ? "Credited" : "Debited"} $${Math.abs(amt).toFixed(2)} · new balance $${Number(data).toFixed(2)}`);
      setCrediting(null); setCreditAmount(""); setCreditNote("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to credit user");
    } finally {
      setCreditSubmitting(false);
    }
  };

  const filteredDeposits = useMemo(() => {
    return deposits.filter((d) => {
      switch (depositFilter) {
        case "all": return true;
        case "pending": return d.status === "pending";
        case "approved": return d.status === "approved";
        case "rejected": return d.status === "rejected";
        case "credited": return d.status === "approved" && !!d.credited_at;
      }
    });
  }, [deposits, depositFilter]);

  const openReceipt = async (path: string) => {
    const url = await getReceiptUrl(path);
    if (url) setReceiptUrl(url);
    else toast.error("Could not load receipt");
  };

  if (roleLoading) {
    return (
      <motion.div className="fixed inset-0 z-50 bg-background flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </motion.div>
    );
  }

  if (!isAdmin) {
    return (
      <motion.div initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }}
        className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6">
        <ShieldAlert className="w-12 h-12 text-destructive mb-3" />
        <h2 className="font-bold text-lg text-foreground mb-1">Admin access required</h2>
        <p className="text-sm text-muted-foreground text-center mb-4">Only admins can open this dashboard.</p>
        <button onClick={onClose} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-semibold">Close</button>
      </motion.div>
    );
  }

  const userById = (id: string) => users.find((u) => u.id === id);

  const handleApprove = async (kind: "dep" | "wd" | "vip", id: string) => {
    const fn = kind === "dep" ? setDepositStatus : kind === "wd" ? setWithdrawalStatus : setVipBetStatus;
    const err = await (fn as (id: string, s: string) => Promise<unknown>)(id, "approved");
    if (err) toast.error("Failed to update"); else toast.success("Approved");
  };
  const handleVipMark = async (id: string, status: VipBetStatus) => {
    const err = await setVipBetStatus(id, status);
    if (err) toast.error("Failed"); else toast.success(`Marked ${status}`);
  };
  const submitReject = async () => {
    if (!rejecting) return;
    const reason = rejectReason.trim();
    if (!reason) { toast.error("Reject reason is required"); return; }
    const err = rejecting.kind === "dep"
      ? await setDepositStatus(rejecting.id, "rejected", reason)
      : await setWithdrawalStatus(rejecting.id, "rejected", reason);
    if (err) toast.error("Failed");
    else { toast.success("Rejected with reason"); setRejecting(null); setRejectReason(""); }
  };

  const handleSuspend = async (id: string, suspended: boolean) => {
    const err = await setUserSuspended(id, suspended);
    if (err) toast.error("Failed");
    else toast.success(suspended ? "User suspended" : "User reinstated");
  };

  return (
    <motion.div initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border/50 p-4">
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h1 className="font-bold text-lg text-foreground">Admin Dashboard</h1>
          </div>
          <div className="w-10" />
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
          {TABS.map((t) => {
            const count = t.id === "users" ? users.length
              : t.id === "deposits" ? deposits.filter((d) => d.status === "pending").length
              : t.id === "withdrawals" ? withdrawals.filter((w) => w.status === "pending").length
              : t.id === "vipBets" ? vipBets.filter((b) => b.status === "pending").length
              : 0;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all ${
                  active ? "bg-primary text-primary-foreground shadow shadow-primary/30" : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                }`}>
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
                {count > 0 && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${active ? "bg-primary-foreground/25" : "bg-destructive/80 text-destructive-foreground"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {tab === "deposits" && (
          <div className="mt-3 flex gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1">
            {FILTERS.map((f) => {
              const count = f.id === "all" ? deposits.length
                : f.id === "credited" ? deposits.filter((d) => d.status === "approved" && !!d.credited_at).length
                : deposits.filter((d) => d.status === f.id).length;
              const active = depositFilter === f.id;
              return (
                <button key={f.id} onClick={() => setDepositFilter(f.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                    active ? "bg-foreground text-background" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                  }`}>
                  {f.label} <span className="opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        ) : (
          <>
            {tab === "users" && users.map((u) => (
              <div key={u.id} className="glass-card p-3 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground truncate">{u.display_name || u.username || "User"}</p>
                  <p className="text-xs text-muted-foreground truncate">@{u.username || "—"} · joined {new Date(u.created_at).toLocaleDateString()}</p>
                  {u.is_suspended && <span className="text-[10px] font-bold text-destructive uppercase">Suspended</span>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => { setCrediting({ id: u.id, name: u.display_name || u.username || "User" }); setCreditAmount(""); setCreditNote(""); }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-xs font-bold hover:bg-primary/30"
                  >
                    <DollarSign className="w-3.5 h-3.5" /> Credit
                  </button>
                  {u.is_suspended ? (
                    <button onClick={() => handleSuspend(u.id, false)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                      <RotateCcw className="w-3.5 h-3.5" /> Reinstate
                    </button>
                  ) : (
                    <button onClick={() => handleSuspend(u.id, true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-destructive/20 text-destructive text-xs font-bold">
                      <Ban className="w-3.5 h-3.5" /> Suspend
                    </button>
                  )}
                </div>
              </div>
            ))}

            {tab === "deposits" && filteredDeposits.map((d) => {
              const u = userById(d.user_id);
              const isBank = d.crypto === "BANK";
              return (
                <div key={d.id} className="glass-card p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate flex items-center gap-1.5">
                        ${d.amount_usd.toFixed(2)} · {isBank ? <><Landmark className="w-3.5 h-3.5" /> Bank</> : d.crypto}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">{u?.display_name || u?.username || d.user_id.slice(0, 8)} · {new Date(d.created_at).toLocaleString()}</p>
                    </div>
                    <StatusPill status={d.status} />
                  </div>
                  {!isBank && d.tx_hash && <p className="text-[10px] text-muted-foreground font-mono break-all mb-1">tx: {d.tx_hash}</p>}
                  {d.note && <p className="text-[11px] text-muted-foreground italic mb-2 break-all">"{d.note}"</p>}
                  {d.status === "rejected" && d.reject_reason && (
                    <div className="mb-2 p-2 rounded-lg bg-destructive/10 border border-destructive/30">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-destructive mb-0.5">Rejected · reason</p>
                      <p className="text-xs text-foreground">{d.reject_reason}</p>
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {d.status === "pending" && (
                      <>
                        <ApproveBtn onClick={() => handleApprove("dep", d.id)} />
                        <RejectBtn onClick={() => { setRejecting({ kind: "dep", id: d.id }); setRejectReason(""); }} />
                      </>
                    )}
                    {d.receipt_url && (
                      <button onClick={() => openReceipt(d.receipt_url!)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-400 text-xs font-bold hover:bg-sky-500/30">
                        <ImageIcon className="w-3.5 h-3.5" /> Receipt
                      </button>
                    )}
                    <button onClick={() => setEditing({ kind: "deposit", row: d })}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted/40 text-foreground text-xs font-bold hover:bg-muted/60">
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>
                  {d.credited_at && <p className="text-[10px] text-emerald-400 mt-1">Credited {new Date(d.credited_at).toLocaleString()}</p>}
                </div>
              );
            })}

            {tab === "withdrawals" && withdrawals.map((w) => {
              const u = userById(w.user_id);
              const isBank = w.crypto === "BANK";
              return (
                <div key={w.id} className="glass-card p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate flex items-center gap-1.5">
                        ${w.amount_usd.toFixed(2)} · {isBank ? <><Landmark className="w-3.5 h-3.5" /> Bank</> : w.crypto}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">{u?.display_name || u?.username || w.user_id.slice(0, 8)} · {new Date(w.created_at).toLocaleString()}</p>
                    </div>
                    <StatusPill status={w.status} />
                  </div>
                  {!isBank && (
                    <p className="text-[10px] text-muted-foreground font-mono break-all mb-2">→ {w.destination_address}</p>
                  )}
                  {w.note && <p className="text-[11px] text-muted-foreground italic mb-2">"{w.note}"</p>}
                  {w.status === "rejected" && w.reject_reason && (
                    <div className="mb-2 p-2 rounded-lg bg-destructive/10 border border-destructive/30">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-destructive mb-0.5">Rejected · reason</p>
                      <p className="text-xs text-foreground">{w.reject_reason}</p>
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {w.status === "pending" && (
                      <>
                        <ApproveBtn onClick={() => handleApprove("wd", w.id)} />
                        <RejectBtn onClick={() => { setRejecting({ kind: "wd", id: w.id }); setRejectReason(""); }} />
                      </>
                    )}
                    <button onClick={() => setEditing({ kind: "withdrawal", row: w })}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted/40 text-foreground text-xs font-bold hover:bg-muted/60">
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>
                </div>
              );
            })}

            {tab === "vipBets" && vipBets.map((b) => {
              const u = userById(b.user_id);
              return (
                <div key={b.id} className="glass-card p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">${b.stake.toFixed(2)} @ {Number(b.odds).toFixed(2)}</p>
                      <p className="text-[11px] text-muted-foreground truncate">Win ${b.potential_payout.toFixed(2)} · {u?.display_name || u?.username || b.user_id.slice(0, 8)}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(b.created_at).toLocaleString()}</p>
                    </div>
                    <StatusPill status={b.status} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {b.status === "pending" && (
                      <>
                        <ApproveBtn label="Approve" onClick={() => handleApprove("vip", b.id)} />
                        <RejectBtn label="Reject" onClick={() => handleVipMark(b.id, "rejected")} />
                      </>
                    )}
                    {(b.status === "approved" || b.status === "pending") && (
                      <>
                        <button onClick={() => handleVipMark(b.id, "won")} className="px-3 py-1.5 rounded-lg bg-emerald-600/30 text-emerald-300 text-xs font-bold">Mark Won</button>
                        <button onClick={() => handleVipMark(b.id, "lost")} className="px-3 py-1.5 rounded-lg bg-destructive/25 text-destructive text-xs font-bold">Mark Lost</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {tab === "wallets" && <WalletsManager />}

            {tab === "audit" && auditLog.map((a) => {
              const u = userById(a.actor_id);
              return (
                <div key={a.id} className="glass-card p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{a.action.replace(/_/g, " ")}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    by <span className="text-foreground">{u?.display_name || u?.username || a.actor_id.slice(0, 8)}</span> · {a.entity_type}
                  </p>
                  {a.before && Object.keys(a.before).length > 0 && (
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                      <div className="bg-destructive/10 rounded p-1.5 font-mono break-all">
                        <p className="text-destructive font-bold mb-0.5">before</p>
                        <pre className="whitespace-pre-wrap text-muted-foreground">{JSON.stringify(a.before, null, 1)}</pre>
                      </div>
                      <div className="bg-emerald-500/10 rounded p-1.5 font-mono break-all">
                        <p className="text-emerald-400 font-bold mb-0.5">after</p>
                        <pre className="whitespace-pre-wrap text-foreground">{JSON.stringify(a.after, null, 1)}</pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {((tab === "users" && users.length === 0) ||
              (tab === "deposits" && filteredDeposits.length === 0) ||
              (tab === "withdrawals" && withdrawals.length === 0) ||
              (tab === "vipBets" && vipBets.length === 0) ||
              (tab === "audit" && auditLog.length === 0)) && (
              <p className="text-center text-muted-foreground py-12 text-sm">Nothing here yet.</p>
            )}
          </>
        )}
      </div>

      {/* Receipt viewer */}
      <AnimatePresence>
        {receiptUrl && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setReceiptUrl(null)}
          >
            <button onClick={() => setReceiptUrl(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-background/80 flex items-center justify-center">
              <X className="w-5 h-5 text-foreground" />
            </button>
            {receiptUrl.toLowerCase().includes(".pdf") ? (
              <iframe src={receiptUrl} className="w-full h-full max-w-3xl bg-white rounded-xl" title="Receipt" />
            ) : (
              <img src={receiptUrl} alt="Receipt" className="max-w-full max-h-full rounded-xl shadow-2xl" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject reason dialog */}
      <AnimatePresence>
        {rejecting && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[75] bg-black/70 flex items-end sm:items-center justify-center p-4"
            onClick={() => setRejecting(null)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-background border border-border rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-destructive" />
                <h3 className="font-bold text-foreground">Reject {rejecting.kind === "dep" ? "deposit" : "withdrawal"}</h3>
              </div>
              <p className="text-xs text-muted-foreground">Provide a reason. The user will see this on their request.</p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                placeholder="e.g. Receipt does not match the amount sent…"
                className="w-full bg-muted/40 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-destructive resize-none"
              />
              <div className="flex gap-2">
                <button onClick={() => setRejecting(null)} className="flex-1 py-2.5 rounded-lg bg-muted/40 text-foreground font-semibold text-sm">Cancel</button>
                <button onClick={submitReject} className="flex-1 py-2.5 rounded-lg bg-destructive text-destructive-foreground font-bold text-sm">
                  Confirm reject
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {crediting && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => !creditSubmitting && setCrediting(null)}>
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl bg-background border border-border p-5 space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}>
              <div>
                <h3 className="font-bold text-foreground text-lg">Adjust balance</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{crediting.name}</p>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Amount (USD)</label>
                <div className="relative mt-1.5">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="number" inputMode="decimal" autoFocus
                    placeholder="100  (use - to debit)"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    className="w-full pl-9 pr-3 py-3 rounded-lg bg-muted/40 border border-border text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Use a negative number to debit (e.g. -25).</p>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Note (optional)</label>
                <input
                  type="text" maxLength={200}
                  placeholder="Reason for adjustment"
                  value={creditNote}
                  onChange={(e) => setCreditNote(e.target.value)}
                  className="w-full mt-1.5 px-3 py-2.5 rounded-lg bg-muted/40 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setCrediting(null)} disabled={creditSubmitting}
                  className="flex-1 py-2.5 rounded-lg bg-muted/40 text-foreground font-semibold text-sm">Cancel</button>
                <button onClick={handleCreditUser} disabled={creditSubmitting || !creditAmount}
                  className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {creditSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Apply
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <EditRequestDialog
        open={!!editing}
        kind={editing?.kind || "deposit"}
        request={editing?.row || null}
        onClose={() => setEditing(null)}
        onSave={async (id, patch) => {
          if (!editing) return null;
          return editing.kind === "deposit"
            ? await updateDeposit(id, patch as Parameters<typeof updateDeposit>[1])
            : await updateWithdrawal(id, patch as Parameters<typeof updateWithdrawal>[1]);
        }}
      />
    </motion.div>
  );
};

const StatusPill = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    pending: "bg-amber-500/20 text-amber-400",
    approved: "bg-emerald-500/20 text-emerald-400",
    rejected: "bg-destructive/25 text-destructive",
    won: "bg-emerald-600/30 text-emerald-300",
    lost: "bg-destructive/25 text-destructive",
  };
  return <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${map[status] || map.pending}`}>{status}</span>;
};

const ApproveBtn = ({ onClick, label = "Approve" }: { onClick: () => void; label?: string }) => (
  <button onClick={onClick} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold">
    <Check className="w-3.5 h-3.5" /> {label}
  </button>
);
const RejectBtn = ({ onClick, label = "Reject" }: { onClick: () => void; label?: string }) => (
  <button onClick={onClick} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-destructive/20 text-destructive text-xs font-bold">
    <XCircle className="w-3.5 h-3.5" /> {label}
  </button>
);

const CRYPTO_OPTS: CryptoKind[] = ["BTC", "ETH", "USDT"];

const WalletsManager = () => {
  const { wallets, loading, add, update, remove, uploadQr } = usePaymentWallets({ adminMode: true });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [crypto, setCrypto] = useState<CryptoKind>("BTC");
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [network, setNetwork] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setShowForm(false); setEditingId(null);
    setCrypto("BTC"); setLabel(""); setAddress(""); setNetwork(""); setIconUrl(""); setQrUrl(""); setIsActive(true);
  };

  const startEdit = (w: PaymentWallet) => {
    setEditingId(w.id); setShowForm(true);
    setCrypto(w.crypto); setLabel(w.label); setAddress(w.address);
    setNetwork(w.network); setIconUrl(w.icon_url || ""); setQrUrl(w.qr_url || "");
    setIsActive(w.is_active);
  };

  const onPickQr = async (file: File | null) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("QR image too large (max 2MB)"); return; }
    setUploading(true);
    try {
      const url = await uploadQr(file);
      setQrUrl(url);
      toast.success("QR uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!label.trim() || !address.trim() || !network.trim()) {
      toast.error("Label, address and network are required");
      return;
    }
    setSaving(true);
    const payload = {
      crypto, label: label.trim(), address: address.trim(),
      network: network.trim(),
      icon_url: iconUrl.trim() || null,
      qr_url: qrUrl.trim() || null,
      is_active: isActive,
    };
    const res = editingId
      ? await update(editingId, payload)
      : await add(payload);
    setSaving(false);
    if (res.error) toast.error(res.error.message);
    else { toast.success(editingId ? "Wallet updated" : "Wallet added"); reset(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this wallet? Users won't see it on the deposit page anymore.")) return;
    const res = await remove(id);
    if (res.error) toast.error(res.error.message);
    else toast.success("Wallet deleted");
  };

  const toggleActive = async (w: PaymentWallet) => {
    const res = await update(w.id, { is_active: !w.is_active });
    if (res.error) toast.error(res.error.message);
    else toast.success(!w.is_active ? "Wallet activated" : "Wallet hidden");
  };

  return (
    <div className="space-y-3">
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow shadow-primary/20"
        >
          <Plus className="w-4 h-4" /> Add new wallet
        </button>
      )}

      {showForm && (
        <div className="glass-card p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-bold text-foreground">{editingId ? "Edit wallet" : "New wallet"}</p>
            <button onClick={reset} className="text-xs text-muted-foreground">Cancel</button>
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Crypto</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {CRYPTO_OPTS.map((c) => (
                <button key={c} onClick={() => setCrypto(c)}
                  className={`py-2 rounded-lg text-xs font-bold ${crypto === c ? "bg-primary text-primary-foreground" : "bg-muted/40 text-foreground"}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <Field label="Label" value={label} onChange={setLabel} placeholder="e.g. Main Bitcoin Wallet" />
          <Field label="Wallet address" value={address} onChange={setAddress} mono placeholder="bc1q…" />
          <Field label="Network" value={network} onChange={setNetwork} placeholder="e.g. Bitcoin Network, ERC-20, TRC-20" />
          <Field label="Icon URL (optional)" value={iconUrl} onChange={setIconUrl} placeholder="https://…" />
          <div>
            <label className="text-[10px] uppercase font-bold text-muted-foreground">QR code image (optional)</label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPickQr(e.target.files?.[0] || null)} />
            {qrUrl ? (
              <div className="mt-1 flex items-center gap-3 p-2 rounded-lg bg-muted/30 border border-border">
                <img src={qrUrl} alt="QR" className="w-16 h-16 rounded bg-white p-1 object-contain" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground truncate font-mono">{qrUrl}</p>
                </div>
                <button onClick={() => fileRef.current?.click()} className="text-xs px-2 py-1 rounded bg-muted/60 text-foreground">Change</button>
                <button onClick={() => setQrUrl("")} className="text-xs px-2 py-1 rounded bg-destructive/20 text-destructive">Remove</button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="mt-1 w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border rounded-lg text-sm font-semibold text-foreground hover:bg-muted/30"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? "Uploading…" : "Upload QR image"}
              </button>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">If no QR is uploaded, one will be generated from the wallet address.</p>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 accent-primary" />
            <span className="text-xs text-foreground">Active (visible to users)</span>
          </label>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {editingId ? "Save changes" : "Add wallet"}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
      ) : wallets.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-6">No wallets yet. Add one to start receiving deposits.</p>
      ) : (
        wallets.map((w) => (
          <div key={w.id} className="glass-card p-3 space-y-2">
            <div className="flex items-center gap-3">
              {w.icon_url && <img src={w.icon_url} alt="" className="w-8 h-8 rounded-full" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{w.label} <span className="text-[10px] text-muted-foreground">· {w.crypto}</span></p>
                <p className="text-[11px] text-muted-foreground truncate">{w.network}</p>
              </div>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${w.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-muted/40 text-muted-foreground"}`}>
                {w.is_active ? "Active" : "Hidden"}
              </span>
            </div>
            <p className="text-[10px] font-mono text-muted-foreground break-all">{w.address}</p>
            {w.qr_url && (
              <img src={w.qr_url} alt="QR" className="w-20 h-20 rounded bg-white p-1 object-contain" />
            )}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => startEdit(w)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted/40 text-foreground text-xs font-bold">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
              <button onClick={() => toggleActive(w)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-400 text-xs font-bold">
                {w.is_active ? "Hide" : "Activate"}
              </button>
              <button onClick={() => handleDelete(w.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-destructive/20 text-destructive text-xs font-bold">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

const Field = ({ label, value, onChange, placeholder, mono }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean; }) => (
  <div>
    <label className="text-[10px] uppercase font-bold text-muted-foreground">{label}</label>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full mt-1 bg-muted/40 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary ${mono ? "font-mono text-xs" : ""}`}
    />
  </div>
);

export default AdminDashboard;
