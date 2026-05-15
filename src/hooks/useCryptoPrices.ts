import { useEffect, useState } from "react";

export interface CryptoPrice {
  id: string; // coingecko id
  symbol: string;
  usd: number;
  change24h: number;
  updatedAt: number;
}

const COIN_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDT: "tether",
};

const REFRESH_MS = 30_000;

export const useCryptoPrices = () => {
  const [prices, setPrices] = useState<Record<string, CryptoPrice>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchPrices = async () => {
      try {
        const ids = Object.values(COIN_IDS).join(",");
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
        );
        if (!res.ok) throw new Error("price fetch failed");
        const data = await res.json();
        if (cancelled) return;
        const next: Record<string, CryptoPrice> = {};
        Object.entries(COIN_IDS).forEach(([sym, id]) => {
          const d = data[id];
          if (d) {
            next[sym] = {
              id,
              symbol: sym,
              usd: d.usd ?? 0,
              change24h: d.usd_24h_change ?? 0,
              updatedAt: Date.now(),
            };
          }
        });
        setPrices(next);
      } catch {
        // keep existing prices on failure
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPrices();
    const t = setInterval(fetchPrices, REFRESH_MS);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  return { prices, loading };
};
