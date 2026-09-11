export type Currency = 'AED' | 'ETB' | 'KES' | 'USD';

export type AccountType = 'cash' | 'bank' | 'savings' | 'investment' | 'ewallet' | 'other';

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  currency: Currency;
  currentBalance: number;
  initialBalance: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType =
  | 'income'
  | 'expense'
  | 'transfer'
  | 'saving'
  | 'investment'
  | 'debt_payment';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  source?: string;
  category: string;
  subcategory?: string;
  accountId: string;
  toAccountId?: string;
  date: string; // ISO date string YYYY-MM-DD
  isRecurring?: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  description?: string;
  notes?: string;
  receiptUrl?: string;
  relatedGoalId?: string;
  relatedInvestmentId?: string;
  relatedDebtId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: 'expense' | 'income';
  color: string;
  icon: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  category: string;
  amount: number;
  currency: Currency;
  month: string; // YYYY-MM
  createdAt: string;
  updatedAt: string;
}

export type GoalStatus = 'active' | 'in_progress' | 'completed' | 'paused';

export interface SavingsGoal {
  id: string;
  userId: string;
  goalName: string;
  targetAmount: number;
  currentAmount: number;
  currency: Currency;
  targetDate?: string;
  deadline?: string;
  description?: string;
  status: GoalStatus;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export type InvestmentType =
  | 'business'
  | 'stocks'
  | 'crypto'
  | 'real_estate'
  | 'gold'
  | 'mutual_funds'
  | 'other';

export interface Investment {
  id: string;
  userId: string;
  investmentName: string;
  type: InvestmentType;
  amountInvested: number;
  currentValue: number;
  currency: Currency;
  date: string;
  platform?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type DebtType = 'borrowed' | 'lent';
export type DebtStatus = 'pending' | 'partially_paid' | 'paid' | 'overdue';

export interface Debt {
  id: string;
  userId: string;
  personOrOrg: string;
  type: DebtType; // borrowed = money I owe; lent = money owed to me
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  currency: Currency;
  dueDate?: string;
  description?: string;
  notes?: string;
  status: DebtStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  id: string;
  userId: string;
  baseCurrency: Currency;
  exchangeRates: Record<Currency, number>; // Rate relative to 1 USD
  theme: 'light' | 'dark' | 'system';
  language: 'ar' | 'en';
  updatedAt: string;
}

export interface NotificationAlert {
  id: string;
  type: 'warning' | 'info' | 'success';
  title: string;
  message: string;
  link?: string;
  date: string;
}

export interface FinancialOverview {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  totalInvestments: number;
  totalDebts: number;
  netWorth: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  baseCurrency: Currency;
}
