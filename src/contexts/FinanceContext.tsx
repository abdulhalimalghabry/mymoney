import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useAuth } from './AuthContext';
import {
  Account,
  Transaction,
  Category,
  Budget,
  SavingsGoal,
  Investment,
  Debt,
  UserSettings,
  Currency,
  NotificationAlert,
} from '../types';
import {
  subscribeAccounts,
  subscribeTransactions,
  subscribeCategories,
  subscribeBudgets,
  subscribeSavingsGoals,
  subscribeInvestments,
  subscribeDebts,
  subscribeSettings,
} from '../services/financialService';
import { convertCurrency, DEFAULT_EXCHANGE_RATES } from '../utils/currencies';

interface FinanceContextType {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  investments: Investment[];
  debts: Debt[];
  settings: UserSettings | null;
  baseCurrency: Currency;
  exchangeRates: Record<Currency, number>;
  loading: boolean;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  // Computed stats in Base Currency
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  totalSavings: number;
  totalInvestments: number;
  totalDebts: number;
  netWorth: number;
  savingsRate: number;
  alerts: NotificationAlert[];
  // Currency conversion helper
  toBaseCurrency: (amount: number, fromCurrency: Currency) => number;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Default month: Current YYYY-MM
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  useEffect(() => {
    if (!currentUser) {
      setAccounts([]);
      setTransactions([]);
      setCategories([]);
      setBudgets([]);
      setSavingsGoals([]);
      setInvestments([]);
      setDebts([]);
      setSettings(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const userId = currentUser.uid;

    const unsubAccounts = subscribeAccounts(userId, (data) => setAccounts(data));
    const unsubTxs = subscribeTransactions(userId, (data) => setTransactions(data));
    const unsubCats = subscribeCategories(userId, (data) => setCategories(data));
    const unsubBudgets = subscribeBudgets(userId, selectedMonth, (data) => setBudgets(data));
    const unsubGoals = subscribeSavingsGoals(userId, (data) => setSavingsGoals(data));
    const unsubInvs = subscribeInvestments(userId, (data) => setInvestments(data));
    const unsubDebts = subscribeDebts(userId, (data) => setDebts(data));
    const unsubSettings = subscribeSettings(userId, (data) => {
      setSettings(data);
      setLoading(false);
    });

    return () => {
      unsubAccounts();
      unsubTxs();
      unsubCats();
      unsubBudgets();
      unsubGoals();
      unsubInvs();
      unsubDebts();
      unsubSettings();
    };
  }, [currentUser, selectedMonth]);

  const baseCurrency: Currency = settings?.baseCurrency || 'AED';
  const exchangeRates = settings?.exchangeRates || DEFAULT_EXCHANGE_RATES;

  const toBaseCurrency = (amount: number, fromCurrency: Currency): number => {
    return convertCurrency(amount, fromCurrency, baseCurrency, exchangeRates);
  };

  // 1. Total Account Balance
  const totalBalance = useMemo(() => {
    return accounts
      .filter((a) => a.isActive)
      .reduce((sum, acc) => sum + toBaseCurrency(acc.currentBalance, acc.currency), 0);
  }, [accounts, baseCurrency, exchangeRates]);

  // 2. Monthly Income & Monthly Expenses for selectedMonth
  const { monthlyIncome, monthlyExpenses } = useMemo(() => {
    let incomeSum = 0;
    let expenseSum = 0;

    transactions.forEach((tx) => {
      if (tx.date && tx.date.startsWith(selectedMonth)) {
        const baseAmount = toBaseCurrency(tx.amount, tx.currency);
        if (tx.type === 'income') {
          incomeSum += baseAmount;
        } else if (tx.type === 'expense') {
          expenseSum += baseAmount;
        }
      }
    });

    return { monthlyIncome: incomeSum, monthlyExpenses: expenseSum };
  }, [transactions, selectedMonth, baseCurrency, exchangeRates]);

  // 3. Total Savings
  const totalSavings = useMemo(() => {
    return savingsGoals.reduce(
      (sum, goal) => sum + toBaseCurrency(goal.currentAmount, goal.currency),
      0
    );
  }, [savingsGoals, baseCurrency, exchangeRates]);

  // 4. Total Investments
  const totalInvestments = useMemo(() => {
    return investments.reduce(
      (sum, inv) => sum + toBaseCurrency(inv.currentValue, inv.currency),
      0
    );
  }, [investments, baseCurrency, exchangeRates]);

  // 5. Total Debts (money I owe to others)
  const totalDebts = useMemo(() => {
    return debts
      .filter((d) => d.type === 'borrowed' && d.status !== 'paid')
      .reduce((sum, d) => sum + toBaseCurrency(d.remainingAmount, d.currency), 0);
  }, [debts, baseCurrency, exchangeRates]);

  // 6. Net Worth = Total Assets - Total Liabilities
  // Assets: accounts balance + investments + savings
  // Liabilities: debts owed
  const netWorth = useMemo(() => {
    const totalAssets = totalBalance + totalInvestments;
    return totalAssets - totalDebts;
  }, [totalBalance, totalInvestments, totalDebts]);

  // 7. Savings Rate = (Savings / Income) * 100
  const savingsRate = useMemo(() => {
    if (monthlyIncome <= 0) return 0;
    const rate = ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100;
    return Math.max(0, Math.min(100, Math.round(rate)));
  }, [monthlyIncome, monthlyExpenses]);

  // 8. Dynamic Alerts & Warnings (Requirement 25)
  const alerts = useMemo(() => {
    const list: NotificationAlert[] = [];
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Check budget overruns
    budgets.forEach((b) => {
      const spent = transactions
        .filter(
          (t) =>
            t.type === 'expense' &&
            t.category.toLowerCase() === b.category.toLowerCase() &&
            t.date.startsWith(b.month)
        )
        .reduce((sum, t) => sum + toBaseCurrency(t.amount, t.currency), 0);

      const budgetLimitInBase = toBaseCurrency(b.amount, b.currency);
      if (spent > budgetLimitInBase) {
        list.push({
          id: `budget-${b.id}`,
          type: 'warning',
          title: `Budget Exceeded: ${b.category}`,
          message: `You exceeded the budget for ${b.category} (${baseCurrency} ${spent.toFixed(
            0
          )} / ${budgetLimitInBase.toFixed(0)})`,
          link: '/budget',
          date: todayStr,
        });
      }
    });

    // Check debts overdue or due within 7 days
    debts.forEach((d) => {
      if (d.status !== 'paid' && d.remainingAmount > 0 && d.dueDate) {
        const dueDate = new Date(d.dueDate);
        const diffDays = Math.ceil(
          (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays < 0) {
          list.push({
            id: `debt-overdue-${d.id}`,
            type: 'warning',
            title: `Overdue Debt: ${d.personOrOrg}`,
            message: `Payment of ${d.currency} ${d.remainingAmount.toLocaleString()} to ${
              d.personOrOrg
            } is overdue by ${Math.abs(diffDays)} days.`,
            link: '/debts',
            date: todayStr,
          });
        } else if (diffDays <= 7) {
          list.push({
            id: `debt-due-soon-${d.id}`,
            type: 'warning',
            title: `Debt Due Soon: ${d.personOrOrg}`,
            message: `Payment of ${d.currency} ${d.remainingAmount.toLocaleString()} to ${
              d.personOrOrg
            } is due in ${diffDays} day(s).`,
            link: '/debts',
            date: todayStr,
          });
        }
      }
    });

    // Check savings goal completed
    savingsGoals.forEach((g) => {
      if (g.currentAmount >= g.targetAmount && g.status !== 'completed') {
        list.push({
          id: `goal-completed-${g.id}`,
          type: 'success',
          title: `Goal Achieved: ${g.goalName}!`,
          message: `Congratulations! You reached 100% of your target for "${g.goalName}".`,
          link: '/savings',
          date: todayStr,
        });
      }
    });

    return list;
  }, [budgets, transactions, debts, savingsGoals, baseCurrency, exchangeRates]);

  return (
    <FinanceContext.Provider
      value={{
        accounts,
        transactions,
        categories,
        budgets,
        savingsGoals,
        investments,
        debts,
        settings,
        baseCurrency,
        exchangeRates,
        loading,
        selectedMonth,
        setSelectedMonth,
        totalBalance,
        monthlyIncome,
        monthlyExpenses,
        totalSavings,
        totalInvestments,
        totalDebts,
        netWorth,
        savingsRate,
        alerts,
        toBaseCurrency,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance(): FinanceContextType {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}
