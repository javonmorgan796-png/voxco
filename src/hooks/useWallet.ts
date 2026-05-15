import { useState, useEffect } from "react";

export interface WalletTransaction {
  id: string;
  type: "deposit" | "withdrawal" | "bet_placed" | "bet_won" | "bet_cashout" | "bonus";
  amount: number;
  description: string;
  createdAt: string;
  balanceAfter: number;
}

const WALLET_BALANCE_KEY = "wallet_balance";
const WALLET_TRANSACTIONS_KEY = "wallet_transactions";
const STARTING_BALANCE = 1000;

export const useWallet = () => {
  const [balance, setBalance] = useState<number>(STARTING_BALANCE);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);

  useEffect(() => {
    const storedBalance = localStorage.getItem(WALLET_BALANCE_KEY);
    if (storedBalance !== null) {
      setBalance(parseFloat(storedBalance));
    } else {
      localStorage.setItem(WALLET_BALANCE_KEY, String(STARTING_BALANCE));
      const welcomeBonus: WalletTransaction = {
        id: `tx_welcome_${Date.now()}`,
        type: "bonus",
        amount: STARTING_BALANCE,
        description: "Welcome bonus — starting balance",
        createdAt: new Date().toISOString(),
        balanceAfter: STARTING_BALANCE,
      };
      localStorage.setItem(WALLET_TRANSACTIONS_KEY, JSON.stringify([welcomeBonus]));
      setTransactions([welcomeBonus]);
    }

    const storedTx = localStorage.getItem(WALLET_TRANSACTIONS_KEY);
    if (storedTx) {
      try { setTransactions(JSON.parse(storedTx)); } catch { setTransactions([]); }
    }
  }, []);

  const save = (newBalance: number, newTx: WalletTransaction[]) => {
    setBalance(newBalance);
    setTransactions(newTx);
    localStorage.setItem(WALLET_BALANCE_KEY, String(newBalance));
    localStorage.setItem(WALLET_TRANSACTIONS_KEY, JSON.stringify(newTx));
  };

  const addTransaction = (type: WalletTransaction["type"], amount: number, description: string) => {
    const newBalance = type === "withdrawal" || type === "bet_placed"
      ? balance - amount
      : balance + amount;

    const tx: WalletTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type,
      amount,
      description,
      createdAt: new Date().toISOString(),
      balanceAfter: Math.round(newBalance * 100) / 100,
    };

    save(Math.round(newBalance * 100) / 100, [tx, ...transactions]);
    return tx;
  };

  const deposit = (amount: number) => {
    if (amount <= 0) return null;
    return addTransaction("deposit", amount, `Deposit of $${amount.toFixed(2)}`);
  };

  const withdraw = (amount: number) => {
    if (amount <= 0 || amount > balance) return null;
    return addTransaction("withdrawal", amount, `Withdrawal of $${amount.toFixed(2)}`);
  };

  const placeBetDeduction = (amount: number, matchDescription: string) => {
    if (amount <= 0 || amount > balance) return null;
    return addTransaction("bet_placed", amount, `Bet: ${matchDescription}`);
  };

  const betWinCredit = (amount: number, matchDescription: string) => {
    return addTransaction("bet_won", amount, `Won: ${matchDescription}`);
  };

  const cashoutCredit = (amount: number, matchDescription: string) => {
    return addTransaction("bet_cashout", amount, `Cash out: ${matchDescription}`);
  };

  const canAfford = (amount: number) => balance >= amount;

  return {
    balance,
    transactions,
    deposit,
    withdraw,
    placeBetDeduction,
    betWinCredit,
    cashoutCredit,
    canAfford,
  };
};
