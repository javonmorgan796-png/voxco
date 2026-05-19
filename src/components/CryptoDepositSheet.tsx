import { useEffect, useMemo, useRef, useState } from "react";
import { X, Copy, Check, TrendingUp, TrendingDown, RefreshCw, ArrowLeft, Upload, Loader2, FileImage, DollarSign, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { useNotifications } from "@/hooks/useNotifications";
import { useSuspension } from "@/hooks/useSuspension";
import { usePaymentWallets } from "@/hooks/usePaymentWallets";
import { supabase } from "@/integrations/supabase/client";
import { mongoSync } from "@/lib/mongoSync";

interface CryptoDepositSheetProps {
  onClose: () => void;
}

type Step = "amount" | "pay";
type CryptoSym = "BTC" | "ETH" | "USDT";

const CryptoDepositSheet = ({ onClose }: CryptoDepositSheetProps) => {
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState("");
  const [confirmedCrypto, setConfirmedCrypto] = useState(false);
  const [selectedSym, setSelectedSym] = useState<CryptoSym>("BTC");
  const [copied, setCopied] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  
  // Hooks must be called unconditionally at the top level
  const { prices = {}, loading: pricesLoading = true } = useCryptoPrices() || {};
  const { addNotification = () => {} } = useNotifications() || {};
  const { isSuspended = false } = useSuspension() || {};
  const { wallets = [], loading: walletsLoading = true, refresh: refreshWallets = () => {} } = usePaymentWallets() || {};

  // Clean up object URL on unmount or when receiptPreview changes
  useEffect(() => {
    return () => {
      if (receiptPreview) {
        try {
          URL.revokeObjectURL(receiptPreview);
        } catch (err) {
          console.error("CryptoDepositSheet Error: URL.revokeObjectURL failed", err);
        }
      }
    };
  }, [receiptPreview]);

  // Filter to crypto wallets only (exclude BANK), then unique active ones
  const cryptoWallets = useMemo(
    () => (wallets || []).filter((w) => w?.crypto !== "BANK" && w?.is_active === true),
    [wallets],
  );
  
  const availableSyms = useMemo(
    () => {
      const syms = (cryptoWallets || []).map((w) => w?.crypto).filter(Boolean);
      return Array.from(new Set(syms)) as CryptoSym[];
    },
    [cryptoWallets],
  );
  
  const selectedWallet = useMemo(
    () => {
      const found = (cryptoWallets || []).find((w) => w?.crypto === selectedSym);
      return found || (cryptoWallets?.[0] || null);
    },
    [cryptoWallets, selectedSym],
  );
  
  const pricesAvailable = Object.keys(prices || {}).length > 0;
  
  const livePrice = selectedWallet?.crypto ? (prices as any)[selectedWallet.crypto as CryptoSym] : undefined;

  // Auto-pick first available wallet when current selection isn't available
  useEffect(() => {
    try {
      if (availableSyms.length > 0 && !availableSyms.includes(selectedSym)) {
        setSelectedSym(availableSyms[0]);
      }
    } catch (err) {
      console.error("CryptoDepositSheet Error: auto-pick wallet failed", err);
    }
  }, [availableSyms, selectedSym]);

  const amountNum = (() => {
    try {
      const parsed = parseFloat(amount);
      return isNaN(parsed) ? 0 : parsed;
    } catch {
      return 0;
    }
  })();
  
  const cryptoAmount = (() => {
    try {
      if (livePrice?.usd && livePrice.usd > 0 && amountNum > 0) {
        return amountNum / livePrice.usd;
      }
      return 0;
    } catch {
      return 0;
    }
  })();

  const amountError = (() => {
    try {
      if (!amount) return null;
      if (amountNum < 5) return "Minimum deposit is $5";
      if (amountNum > 100000) return "Maximum deposit is $100,000";
      if (!livePrice && !pricesLoading && pricesAvailable) return "Live price unavailable, please wait…";
      return null;
    } catch {
      return "Error validating amount";
    }
  })();

  const handleCopy = async () => {
    if (!selectedWallet?.address) {
      toast.error("No wallet address available");
      return;
    }
    
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(selectedWallet.address);
      } else {
        // Fallback for mobile browsers without clipboard API
        const textArea = document.createElement("textarea");
        textArea.value = selectedWallet.address;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      toast.success(`${selectedWallet?.crypto || "Wallet"} address copied!`);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("CryptoDepositSheet Error: clipboard copy failed", err);
      toast.error("Failed to copy address. Please copy manually.");
    }
  };

  const handleProceed = () => {
    try {
      if (isSuspended) { 
        toast.error("Account suspended"); 
        return; 
      }
      if (!amountNum || amountNum < 5) { 
        toast.error("Minimum deposit is $5"); 
        return; 
      }
      if (amountError) { 
        toast.error(amountError); 
        return; 
      }
      if (!confirmedCrypto) { 
        toast.error("Confirm the crypto amount you'll send"); 
        return; 
      }
      if (!selectedWallet?.address) { 
        toast.error("No wallet available — contact support"); 
        return; 
      }
      setStep("pay");
    } catch (err) {
      console.error("CryptoDepositSheet Error: handleProceed failed", err);
      toast.error("Failed to proceed. Please try again.");
    }
  };

  const handlePickFile = (f: File | null) => {
    try {
      if (!f) return;
      if (f.size > 5 * 1024 * 1024) { 
        toast.error("File too large (max 5MB)"); 
        return; 
      }
      setReceiptFile(f);
      const previewUrl = URL.createObjectURL(f);
      setReceiptPreview(previewUrl);
    } catch (err) {
      console.error("CryptoDepositSheet Error: handlePickFile failed", err);
      toast.error("Failed to process receipt file");
    }
  };

  const handleSubmit = async () => {
    if (!receiptFile) { 
      toast.error("Please upload a payment receipt"); 
      return; 
    }
    if (!selectedWallet?.address) { 
      toast.error("No wallet available"); 
      return; 
    }
    
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) { 
        toast.error("Sign in required"); 
        return; 
      }
      
      const ext = receiptFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${session.user.id}/${Date.now()}.${ext}`;
      
      const { error: upErr } = await supabase.storage
        .from("receipts")
        .upload(path, receiptFile, { 
          upsert: false, 
          contentType: receiptFile.type 
        });
      
      if (upErr) throw upErr;
      
      const { error: insErr } = await supabase
        .from("deposit_requests")
        .insert({
          user_id: session.user.id,
          amount_usd: amountNum,
          crypto: selectedWallet.crypto || "UNKNOWN",
          receipt_url: path,
          note: `${cryptoAmount.toFixed(selectedWallet?.crypto === "USDT" ? 2 : 8)} ${selectedWallet?.crypto || ""} → ${selectedWallet.address}`,
        });
      
      if (insErr) throw insErr;
      
      try {
        addNotification(
          "deposit", 
          "Deposit submitted", 
          `$${amountNum.toFixed(2)} (${selectedWallet?.crypto || ""}) — receipt uploaded, pending admin approval.`
        );
      } catch (notifErr) {
        console.error("CryptoDepositSheet Error: addNotification failed", notifErr);
      }
      
      toast.success("Deposit submitted for approval");
      
      // Safe mongoSync with try/catch to prevent crashes
      try {
        await mongoSync("deposit_requested", { 
          amount_usd: amountNum, 
          crypto: selectedWallet.crypto, 
          has_receipt: true 
        });
      } catch (mongoErr) {
        console.error("CryptoDepositSheet Error: mongoSync failed", mongoErr);
        // Don't fail the deposit if mongo sync fails
      }
      
      onClose();
    } catch (e) {
      console.error("CryptoDepositSheet Error: handleSubmit failed", e);
      toast.error(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Fallback UI for when wallets fail to load
  if (!walletsLoading && cryptoWallets.length === 0 && availableSyms.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed inset-0 z-[60] bg-background flex flex-col"
      >
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border/50 p-4">
          <div className="flex items-center justify-between">
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
              <X className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="font-bold text-lg text-foreground">Crypto Deposit</h1>
            <div className="w-10" />
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-4 text-center">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <h2 className="text-lg font-bold text-foreground">No wallets available</h2>
          <p className="text-sm text-muted-foreground">
            No deposit wallets have been configured yet. Please try again later or contact support.
          </p>
          <button
            onClick={() => { refreshWallets(); toast.message("Refreshing wallets…"); }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
          <button onClick={onClose} className="text-sm text-muted-foreground underline">
            Close
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed inset-0 z-[60] bg-background flex flex-col"
    >
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border/50 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => (step === "pay" ? setStep("amount") : onClose())}
            className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center"
          >
            {step === "pay" ? <ArrowLeft className="w-5 h-5 text-foreground" /> : <X className="w-5 h-5 text-foreground" />}
          </button>
          <h1 className="font-bold text-lg text-foreground">
            {step === "amount" ? "Crypto Deposit" : `Pay ${selectedWallet?.crypto || ""}`}
          </h1>
          <div className="w-10 flex items-center justify-end">
            {pricesLoading
              ? <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />
              : <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Live prices" />}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          <div className={`flex-1 h-1 rounded-full ${step === "amount" ? "bg-primary" : "bg-emerald-500"}`} />
          <div className={`flex-1 h-1 rounded-full ${step === "pay" ? "bg-primary" : "bg-muted/40"}`} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === "amount" ? (
          <motion.div
            key="amount"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 overflow-y-auto p-4 space-y-5"
          >
            <div>
              <label className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Choose currency</label>
              {walletsLoading ? (
                <div className="mt-2 flex items-center justify-center py-6"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
              ) : availableSyms.length === 0 ? (
                <div className="mt-2 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm space-y-2">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertCircle className="w-4 h-4" /> No deposit wallets available
                  </div>
                  <p className="text-xs text-destructive/80">Wallets may still be loading or an admin hasn't configured any yet.</p>
                  <button
                    onClick={() => { refreshWallets(); toast.message("Refreshing wallets…"); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/20 text-destructive text-xs font-bold hover:bg-destructive/30"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Retry
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {availableSyms.map((sym) => {
                    const wallet = (cryptoWallets || []).find((w) => w?.crypto === sym);
                    const p = (prices as any)[sym];
                    const change = p?.change24h ?? 0;
                    const positive = change >= 0;
                    const active = selectedSym === sym;
                    return (
                      <button
                        key={sym}
                        onClick={() => { setSelectedSym(sym); setConfirmedCrypto(false); }}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all ${
                          active ? "border-primary bg-primary/10" : "border-border bg-muted/30 hover:bg-muted/50"
                        }`}
                      >
                        {wallet?.icon_url && (
                          <img src={wallet.icon_url} alt="" loading="lazy" className="w-9 h-9 rounded-full shadow-sm" />
                        )}
                        <span className="text-sm font-semibold text-foreground">{sym}</span>
                        {p ? (
                          <>
                            <span className="text-[11px] font-bold text-foreground">
                              ${p.usd.toLocaleString(undefined, { maximumFractionDigits: p.usd > 100 ? 0 : 4 })}
                            </span>
                            <span className={`flex items-center gap-0.5 text-[9px] font-semibold ${positive ? "text-emerald-400" : "text-destructive"}`}>
                              {positive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                              {Math.abs(change).toFixed(2)}%
                            </span>
                          </>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">{wallet?.label || sym}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Amount in USD</label>
              {!pricesAvailable && !pricesLoading && availableSyms.length > 0 && (
                <div className="mt-2 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 text-[11px] flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Live price feed unavailable. Please retry shortly.
                </div>
              )}
              <div className="relative mt-2">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="100.00"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setConfirmedCrypto(false); }}
                  className="w-full pl-10 pr-4 py-4 rounded-xl bg-muted/40 border border-border text-lg font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="flex gap-2 mt-2">
                {[50, 100, 250, 500].map((qa) => (
                  <button
                    key={qa}
                    onClick={() => { setAmount(String(qa)); setConfirmedCrypto(false); }}
                    className="flex-1 py-2 rounded-lg bg-muted/40 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >${qa}</button>
                ))}
              </div>
              {amountError && (
                <p className="mt-2 text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {amountError}
                </p>
              )}
            </div>

            {amountNum > 0 && livePrice && selectedWallet && !amountError && (
              <div className="space-y-2">
                <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/30 rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-muted-foreground">You will pay exactly</div>
                    <div className="text-right">
                      <div className="text-base font-bold text-primary">
                        {cryptoAmount.toFixed(selectedWallet?.crypto === "USDT" ? 2 : 8)} {selectedWallet?.crypto || ""}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        @ ${livePrice.usd.toLocaleString(undefined, { maximumFractionDigits: 2 })} / {selectedWallet?.crypto || ""}
                      </div>
                    </div>
                  </div>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmedCrypto}
                      onChange={(e) => setConfirmedCrypto(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-primary"
                    />
                    <span className="text-[11px] text-foreground">
                      I confirm I will send exactly{" "}
                      <strong>{cryptoAmount.toFixed(selectedWallet?.crypto === "USDT" ? 2 : 8)} {selectedWallet?.crypto || ""}</strong>{" "}
                      (≈ ${amountNum.toFixed(2)}) at the current rate.
                    </span>
                  </label>
                </div>
              </div>
            )}

            <button
              onClick={handleProceed}
              disabled={!amountNum || !!amountError || !confirmedCrypto || availableSyms.length === 0}
              className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-base shadow-lg shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue to payment
            </button>
            <p className="text-[11px] text-muted-foreground text-center">
              Minimum deposit $5 · Funds credited after admin approves your receipt.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="pay"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 overflow-y-auto p-4 space-y-5"
          >
            <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-xl p-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Sending</div>
                <div className="text-lg font-bold text-foreground">${amountNum.toFixed(2)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Send exactly</div>
                <div className="text-sm font-bold text-primary">
                  {cryptoAmount.toFixed(selectedWallet?.crypto === "USDT" ? 2 : 8)} {selectedWallet?.crypto || ""}
                </div>
              </div>
            </div>

            {selectedWallet && (
              <div className="flex flex-col items-center gap-3">
                <div className="bg-white p-4 rounded-2xl shadow-lg">
                  {selectedWallet.qr_url ? (
                    <img src={selectedWallet.qr_url} alt="Wallet QR" className="w-[180px] h-[180px] object-contain" />
                  ) : selectedWallet.address ? (
                    <QRCodeSVG value={selectedWallet.address} size={180} bgColor="#ffffff" fgColor="#000000" level="H" />
                  ) : (
                    <div className="w-[180px] h-[180px] bg-muted rounded-lg flex items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Scan to pay <strong className="text-foreground">{selectedWallet.crypto || ""}</strong> · {selectedWallet.network || ""}
                </p>
              </div>
            )}

            {selectedWallet && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{selectedWallet.label || selectedWallet.crypto || "Wallet"} address</p>
                <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-xl p-3">
                  <p className="flex-1 text-xs font-mono text-foreground break-all leading-relaxed">{selectedWallet.address || "Address not available"}</p>
                  {selectedWallet.address && (
                    <button onClick={handleCopy} className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors">
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-primary" />}
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Payment receipt <span className="text-destructive">*</span></p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => handlePickFile(e.target.files?.[0] || null)}
              />
              {receiptPreview ? (
                <div className="relative">
                  {receiptFile?.type.startsWith("image/") ? (
                    <img src={receiptPreview} alt="Receipt preview" className="w-full max-h-56 object-contain rounded-xl bg-muted/30 border border-border" />
                  ) : (
                    <div className="flex items-center gap-2 p-4 bg-muted/30 rounded-xl border border-border">
                      <FileImage className="w-6 h-6 text-primary" />
                      <span className="text-sm text-foreground truncate">{receiptFile?.name}</span>
                    </div>
                  )}
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="absolute top-2 right-2 px-3 py-1 rounded-lg bg-background/80 backdrop-blur text-xs font-bold text-foreground"
                  >Change</button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex flex-col items-center gap-2 py-8 border-2 border-dashed border-border rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  <Upload className="w-6 h-6 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Upload receipt</span>
                  <span className="text-[10px] text-muted-foreground">Image or PDF · max 5MB</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!receiptFile || submitting}
              className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-base shadow-lg shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {submitting ? "Submitting…" : "Submit deposit for approval"}
            </button>

            {selectedWallet && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 space-y-1">
                <p className="text-xs font-semibold text-yellow-600">⚠️ Important</p>
                <ul className="text-[11px] text-muted-foreground space-y-0.5">
                  <li>• Send exactly <strong className="text-foreground">{cryptoAmount.toFixed(selectedWallet?.crypto === "USDT" ? 2 : 8)} {selectedWallet?.crypto || ""}</strong></li>
                  <li>• Only send {selectedWallet?.crypto || ""} on the {selectedWallet?.network || "correct network"}</li>
                  <li>• Your balance will be credited after admin approval</li>
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CryptoDepositSheet;
