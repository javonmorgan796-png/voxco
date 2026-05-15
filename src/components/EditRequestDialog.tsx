import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CryptoKind, DepositRow, WithdrawalRow } from "@/hooks/useAdminData";

interface EditRequestDialogProps {
  open: boolean;
  kind: "deposit" | "withdrawal";
  request: DepositRow | WithdrawalRow | null;
  onClose: () => void;
  onSave: (id: string, patch: Record<string, unknown>) => Promise<unknown>;
}

const CRYPTO_OPTIONS: CryptoKind[] = ["BTC", "ETH", "USDT"];

const EditRequestDialog = ({ open, kind, request, onClose, onSave }: EditRequestDialogProps) => {
  const [amount, setAmount] = useState("");
  const [crypto, setCrypto] = useState<CryptoKind>("USDT");
  const [txHash, setTxHash] = useState("");
  const [destAddr, setDestAddr] = useState("");
  const [note, setNote] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankRef, setBankRef] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!request) return;
    setAmount(String(request.amount_usd));
    setCrypto(request.crypto);
    setNote(request.note || "");
    setBankName(request.bank_name || "");
    setBankAccount(request.bank_account || "");
    setBankRef(request.bank_reference || "");
    if (kind === "deposit") {
      setTxHash((request as DepositRow).tx_hash || "");
    } else {
      setDestAddr((request as WithdrawalRow).destination_address || "");
    }
  }, [request, kind]);

  if (!request) return null;
  const isBank = crypto === "BANK";

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    setSaving(true);
    const patch: Record<string, unknown> = {
      amount_usd: amt,
      crypto,
      note: note || null,
      bank_name: isBank ? (bankName || null) : null,
      bank_account: isBank ? (bankAccount || null) : null,
      bank_reference: isBank ? (bankRef || null) : null,
    };
    if (kind === "deposit") {
      patch.tx_hash = isBank ? null : (txHash || null);
    } else {
      if (!isBank && !destAddr.trim()) { setSaving(false); toast.error("Destination address required"); return; }
      patch.destination_address = isBank ? (bankAccount || "BANK") : destAddr.trim();
    }
    const err = await onSave(request.id, patch);
    setSaving(false);
    if (err) { toast.error("Failed to save"); return; }
    toast.success("Request updated");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[90vh] bg-background border border-border/50 rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <h2 className="font-bold text-foreground">Edit {kind === "deposit" ? "Deposit" : "Withdrawal"}</h2>
              <button onClick={onClose} className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center">
                <X className="w-4 h-4 text-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Method */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Method</label>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {CRYPTO_OPTIONS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCrypto(c)}
                      className={`py-2 rounded-lg text-xs font-bold transition-colors ${
                        crypto === c
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/40 text-foreground hover:bg-muted/60"
                      }`}
                    >
                      {c === "BANK" ? "Bank" : c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Amount (USD)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full mt-1 bg-muted/40 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Crypto details */}
              {!isBank && kind === "deposit" && (
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Transaction hash</label>
                  <input
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    placeholder="0x… or BTC tx id"
                    className="w-full mt-1 bg-muted/40 rounded-lg px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}
              {!isBank && kind === "withdrawal" && (
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Destination address</label>
                  <input
                    value={destAddr}
                    onChange={(e) => setDestAddr(e.target.value)}
                    placeholder={`User's ${crypto} address`}
                    className="w-full mt-1 bg-muted/40 rounded-lg px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}

              {/* Bank details */}
              {isBank && (
                <div className="space-y-2 p-3 bg-muted/20 rounded-xl border border-border/40">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Bank transfer details</p>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Bank name</label>
                    <input
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. Chase, Barclays"
                      className="w-full mt-0.5 bg-background/60 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Account number / IBAN</label>
                    <input
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      placeholder="Account number or IBAN"
                      className="w-full mt-0.5 bg-background/60 rounded-lg px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Reference</label>
                    <input
                      value={bankRef}
                      onChange={(e) => setBankRef(e.target.value)}
                      placeholder="Transfer reference / memo"
                      className="w-full mt-0.5 bg-background/60 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              )}

              {/* Note */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Admin note</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="w-full mt-1 bg-muted/40 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>
            </div>

            <div className="p-4 border-t border-border/50 flex gap-2">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-lg bg-muted/40 text-foreground font-semibold text-sm">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save changes
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EditRequestDialog;
