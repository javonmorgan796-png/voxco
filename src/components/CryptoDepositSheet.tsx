import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Copy,
  Check,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ArrowLeft,
  Upload,
  Loader2,
  FileImage,
  DollarSign,
  AlertCircle,
} from "lucide-react";

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

const CryptoDepositSheet = ({
  onClose,
}: CryptoDepositSheetProps) => {
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState("");
  const [confirmedCrypto, setConfirmedCrypto] = useState(false);
  const [selectedSym, setSelectedSym] =
    useState<CryptoSym>("BTC");

  const [copied, setCopied] = useState(false);

  const [receiptFile, setReceiptFile] =
    useState<File | null>(null);

  const [receiptPreview, setReceiptPreview] =
    useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const {
    prices,
    loading: pricesLoading,
  } = useCryptoPrices();

  const {
    wallets,
    loading: walletsLoading,
    refresh: refreshWallets,
  } = usePaymentWallets();

  const { addNotification } = useNotifications();

  const { isSuspended } = useSuspension();

  const pricesAvailable =
    Object.keys(prices).length > 0;

  // GLOBAL ERROR DEBUGGING
  useEffect(() => {
    window.onerror = function (
      msg,
      url,
      line,
      col,
      error
    ) {
      console.log("GLOBAL ERROR:", error);
      return false;
    };
  }, []);

  // FILTER ACTIVE CRYPTO WALLETS
  const cryptoWallets = useMemo(() => {
    return wallets.filter(
      (w) => w.crypto !== "BANK" && w.is_active
    );
  }, [wallets]);

  const availableSyms = useMemo(() => {
    return Array.from(
      new Set(cryptoWallets.map((w) => w.crypto))
    ) as CryptoSym[];
  }, [cryptoWallets]);

  const selectedWallet = useMemo(() => {
    return (
      cryptoWallets.find(
        (w) => w.crypto === selectedSym
      ) || cryptoWallets[0]
    );
  }, [cryptoWallets, selectedSym]);

  const livePrice = selectedWallet
    ? prices[selectedWallet.crypto as CryptoSym]
    : undefined;

  // AUTO PICK FIRST AVAILABLE WALLET
  useEffect(() => {
    if (
      availableSyms.length > 0 &&
      !availableSyms.includes(selectedSym)
    ) {
      setSelectedSym(availableSyms[0]);
    }
  }, [availableSyms, selectedSym]);

  // SAFE NUMBER PARSING
  const amountNum = Number(amount) || 0;

  const cryptoAmount =
    livePrice && livePrice.usd > 0
      ? amountNum / livePrice.usd
      : 0;

  // VALIDATION
  const amountError = (() => {
    if (!amount) return null;

    if (Number.isNaN(amountNum)) {
      return "Enter a valid number";
    }

    if (amountNum < 5) {
      return "Minimum deposit is $5";
    }

    if (amountNum > 100000) {
      return "Maximum deposit is $100,000";
    }

    if (!livePrice) {
      return "Live price unavailable";
    }

    return null;
  })();

  // LOADING SCREEN
  if (walletsLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background z-[100]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // COPY WALLET
  const handleCopy = async () => {
    if (!selectedWallet?.address) return;

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(
          selectedWallet.address
        );

        setCopied(true);

        toast.success(
          `${selectedWallet.crypto} address copied`
        );

        setTimeout(() => {
          setCopied(false);
        }, 2000);
      } else {
        toast.error("Clipboard not supported");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to copy");
    }
  };

  // PROCEED
  const handleProceed = () => {
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
      toast.error(
        "Confirm the crypto amount first"
      );
      return;
    }

    if (!selectedWallet) {
      toast.error("No wallet available");
      return;
    }

    setStep("pay");
  };

  // FILE PICK
  const handlePickFile = (f: File | null) => {
    if (!f) return;

    if (f.size > 5 * 1024 * 1024) {
      toast.error("File too large");
      return;
    }

    setReceiptFile(f);

    const preview = URL.createObjectURL(f);

    setReceiptPreview(preview);
  };

  // SUBMIT
  const handleSubmit = async () => {
    if (!receiptFile) {
      toast.error("Upload receipt");
      return;
    }

    if (!selectedWallet) {
      toast.error("No wallet selected");
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error("Login required");
        return;
      }

      const ext =
        receiptFile.name
          .split(".")
          .pop()
          ?.toLowerCase() || "jpg";

      const path = `${session.user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } =
        await supabase.storage
          .from("receipts")
          .upload(path, receiptFile, {
            upsert: false,
            contentType: receiptFile.type,
          });

      if (uploadError) {
        throw uploadError;
      }

      const { error: insertError } =
        await supabase
          .from("deposit_requests")
          .insert({
            user_id: session.user.id,
            amount_usd: amountNum,
            crypto: selectedWallet.crypto,
            receipt_url: path,
            note: `${cryptoAmount.toFixed(
              selectedWallet?.crypto === "USDT"
                ? 2
                : 8
            )} ${
              selectedWallet.crypto
            } → ${selectedWallet.address}`,
          });

      if (insertError) {
        throw insertError;
      }

      // SAFE MONGO SYNC
      try {
        mongoSync("deposit_requested", {
          amount_usd: amountNum,
          crypto: selectedWallet.crypto,
          has_receipt: true,
        });
      } catch (err) {
        console.error("Mongo sync failed", err);
      }

      addNotification(
        "deposit",
        "Deposit submitted",
        `$${amountNum.toFixed(
          2
        )} pending approval`
      );

      toast.success(
        "Deposit submitted successfully"
      );

      onClose();
    } catch (err) {
      console.error(err);

      toast.error(
        err instanceof Error
          ? err.message
          : "Submission failed"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      transition={{
        type: "spring",
        damping: 25,
        stiffness: 300,
      }}
      className="fixed inset-0 z-[60] bg-background flex flex-col"
    >
      {/* HEADER */}
      <div className="sticky top-0 z-10 bg-background border-b border-border p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() =>
              step === "pay"
                ? setStep("amount")
                : onClose()
            }
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
          >
            {step === "pay" ? (
              <ArrowLeft className="w-5 h-5" />
            ) : (
              <X className="w-5 h-5" />
            )}
          </button>

          <h1 className="font-bold text-lg">
            {step === "amount"
              ? "Crypto Deposit"
              : `Pay ${
                  selectedWallet?.crypto || ""
                }`}
          </h1>

          <div className="w-10 flex justify-end">
            {pricesLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-green-500" />
            )}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {step === "amount" ? (
          <>
            {/* WALLET SELECT */}
            <div className="grid grid-cols-3 gap-3">
              {availableSyms.map((sym) => {
                const p = prices[sym];

                const active =
                  selectedSym === sym;

                return (
                  <button
                    key={sym}
                    onClick={() => {
                      setSelectedSym(sym);
                      setConfirmedCrypto(false);
                    }}
                    className={`p-3 rounded-xl border ${
                      active
                        ? "border-primary bg-primary/10"
                        : "border-border"
                    }`}
                  >
                    <div className="font-bold">
                      {sym}
                    </div>

                    {p && (
                      <div className="text-xs mt-1">
                        $
                        {p.usd.toLocaleString()}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* AMOUNT */}
            <div>
              <label className="text-sm font-medium">
                Amount
              </label>

              <div className="relative mt-2">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" />

                <input
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setConfirmedCrypto(false);
                  }}
                  placeholder="100"
                  className="w-full pl-10 pr-4 py-4 rounded-xl border bg-muted/30"
                />
              </div>

              {amountError && (
                <p className="text-xs text-red-500 mt-2">
                  {amountError}
                </p>
              )}
            </div>

            {/* CONFIRM */}
            {selectedWallet &&
              amountNum > 0 &&
              livePrice && (
                <div className="rounded-xl border border-primary/20 p-4">
                  <div className="font-bold text-primary">
                    {cryptoAmount.toFixed(
                      selectedWallet?.crypto ===
                        "USDT"
                        ? 2
                        : 8
                    )}{" "}
                    {selectedWallet.crypto}
                  </div>

                  <label className="flex gap-2 mt-3 text-sm">
                    <input
                      type="checkbox"
                      checked={confirmedCrypto}
                      onChange={(e) =>
                        setConfirmedCrypto(
                          e.target.checked
                        )
                      }
                    />

                    <span>
                      I will send exact amount
                    </span>
                  </label>
                </div>
              )}

            {/* BUTTON */}
            <button
              onClick={handleProceed}
              disabled={
                !confirmedCrypto ||
                !!amountError
              }
              className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-50"
            >
              Continue
            </button>
          </>
        ) : (
          <>
            {/* QR */}
            {selectedWallet && (
              <div className="flex flex-col items-center gap-4">
                <div className="bg-white p-4 rounded-2xl">
                  <QRCodeSVG
                    value={
                      selectedWallet.address
                    }
                    size={180}
                  />
                </div>

                <button
                  onClick={handleCopy}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground"
                >
                  {copied
                    ? "Copied"
                    : "Copy Address"}
                </button>
              </div>
            )}

            {/* UPLOAD */}
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) =>
                  handlePickFile(
                    e.target.files?.[0] || null
                  )
                }
              />

              <button
                onClick={() =>
                  fileRef.current?.click()
                }
                className="w-full border-2 border-dashed rounded-xl py-8"
              >
                Upload Receipt
              </button>

              {receiptPreview && (
                <img
                  src={receiptPreview}
                  alt="preview"
                  className="mt-4 rounded-xl"
                />
              )}
            </div>

            {/* SUBMIT */}
            <button
              onClick={handleSubmit}
              disabled={
                !receiptFile || submitting
              }
              className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                "Submit Deposit"
              )}
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default CryptoDepositSheet;
