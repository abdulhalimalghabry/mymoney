import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  onSnapshot,
  runTransaction,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import {
  Account,
  Transaction,
  Category,
  Budget,
  SavingsGoal,
  Investment,
  Debt,
  UserSettings,
} from '../types';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from '../utils/constants';
import { DEFAULT_EXCHANGE_RATES } from '../utils/currencies';

/**
 * Recursively strips keys with `undefined` values from an object before saving to Firestore.
 * Firestore will reject any document write containing `undefined`.
 */
export function cleanFirestoreData<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => cleanFirestoreData(item)) as unknown as T;
  }

  if (obj instanceof Date) {
    return obj;
  }

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
        cleaned[key] = cleanFirestoreData(value);
      } else {
        cleaned[key] = value;
      }
    }
  }

  return cleaned as T;
}

// --- INITIAL SEEDING ---
export async function seedInitialUserData(userId: string): Promise<void> {
  const path = `users/${userId}/settings`;
  try {
    const settingsRef = doc(db, 'users', userId, 'settings', 'general');
    const settingsSnap = await getDoc(settingsRef);

    if (!settingsSnap.exists()) {
      const defaultSettings: UserSettings = {
        id: 'general',
        userId,
        baseCurrency: 'AED',
        exchangeRates: DEFAULT_EXCHANGE_RATES,
        theme: 'light',
        language: 'ar',
        updatedAt: new Date().toISOString(),
      };
      await setDoc(settingsRef, cleanFirestoreData(defaultSettings));
    }

    // Check categories
    const categoriesCol = collection(db, 'users', userId, 'categories');
    const catSnap = await getDocs(categoriesCol);
    if (catSnap.empty) {
      const batch = writeBatch(db);
      const allDefaults = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES];
      allDefaults.forEach((cat) => {
        const newDoc = doc(categoriesCol);
        batch.set(newDoc, cleanFirestoreData({
          id: newDoc.id,
          userId,
          name: cat.name,
          type: cat.type,
          color: cat.color,
          icon: cat.icon,
          createdAt: new Date().toISOString(),
        }));
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- ACCOUNTS ---
export function subscribeAccounts(
  userId: string,
  callback: (accounts: Account[]) => void
) {
  const path = `users/${userId}/accounts`;
  const q = query(collection(db, 'users', userId, 'accounts'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const accounts = snapshot.docs.map((doc) => doc.data() as Account);
      callback(accounts);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function addAccount(
  userId: string,
  accountData: Omit<Account, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<Account> {
  const path = `users/${userId}/accounts`;
  try {
    const colRef = collection(db, 'users', userId, 'accounts');
    const docRef = doc(colRef);
    const now = new Date().toISOString();
    const newAccount: Account = {
      ...accountData,
      id: docRef.id,
      userId,
      currentBalance: Number(accountData.currentBalance) || 0,
      initialBalance: Number(accountData.currentBalance) || 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(docRef, cleanFirestoreData(newAccount));
    return newAccount;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateAccount(
  userId: string,
  accountId: string,
  updates: Partial<Account>
): Promise<void> {
  const path = `users/${userId}/accounts/${accountId}`;
  try {
    const docRef = doc(db, 'users', userId, 'accounts', accountId);
    await updateDoc(docRef, cleanFirestoreData({
      ...updates,
      updatedAt: new Date().toISOString(),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteAccount(userId: string, accountId: string): Promise<void> {
  const path = `users/${userId}/accounts/${accountId}`;
  try {
    const docRef = doc(db, 'users', userId, 'accounts', accountId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- TRANSACTIONS ---
export function subscribeTransactions(
  userId: string,
  callback: (txs: Transaction[]) => void
) {
  const path = `users/${userId}/transactions`;
  const q = query(
    collection(db, 'users', userId, 'transactions'),
    orderBy('date', 'desc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const txs = snapshot.docs.map((doc) => doc.data() as Transaction);
      callback(txs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

/**
 * Creates a transaction and atomically updates relevant accounts
 */
export async function addTransaction(
  userId: string,
  txData: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<Transaction> {
  const path = `users/${userId}/transactions`;
  try {
    const txCol = collection(db, 'users', userId, 'transactions');
    const txDocRef = doc(txCol);
    const now = new Date().toISOString();

    const newTx: Transaction = {
      ...txData,
      id: txDocRef.id,
      userId,
      amount: Number(txData.amount),
      createdAt: now,
      updatedAt: now,
    };

    await runTransaction(db, async (fireTx) => {
      // 1. If linked to an account, adjust balance
      if (txData.accountId) {
        const accRef = doc(db, 'users', userId, 'accounts', txData.accountId);
        const accSnap = await fireTx.get(accRef);
        if (accSnap.exists()) {
          const accData = accSnap.data() as Account;
          let newBalance = accData.currentBalance;

          if (txData.type === 'income') {
            newBalance += newTx.amount;
          } else if (
            txData.type === 'expense' ||
            txData.type === 'saving' ||
            txData.type === 'investment' ||
            txData.type === 'debt_payment'
          ) {
            newBalance -= newTx.amount;
          } else if (txData.type === 'transfer' && txData.toAccountId) {
            newBalance -= newTx.amount;
          }

          fireTx.update(accRef, cleanFirestoreData({
            currentBalance: newBalance,
            updatedAt: now,
          }));
        }
      }

      // 2. If transfer destination account exists
      if (txData.type === 'transfer' && txData.toAccountId) {
        const toAccRef = doc(db, 'users', userId, 'accounts', txData.toAccountId);
        const toAccSnap = await fireTx.get(toAccRef);
        if (toAccSnap.exists()) {
          const toAccData = toAccSnap.data() as Account;
          const newToBalance = toAccData.currentBalance + newTx.amount;
          fireTx.update(toAccRef, cleanFirestoreData({
            currentBalance: newToBalance,
            updatedAt: now,
          }));
        }
      }

      // 3. Save the transaction document
      fireTx.set(txDocRef, cleanFirestoreData(newTx));
    });

    return newTx;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Deletes a transaction and atomically reverses balance adjustments
 */
export async function deleteTransaction(
  userId: string,
  tx: Transaction
): Promise<void> {
  const path = `users/${userId}/transactions/${tx.id}`;
  try {
    const txRef = doc(db, 'users', userId, 'transactions', tx.id);
    const now = new Date().toISOString();

    await runTransaction(db, async (fireTx) => {
      // Revert account adjustment
      if (tx.accountId) {
        const accRef = doc(db, 'users', userId, 'accounts', tx.accountId);
        const accSnap = await fireTx.get(accRef);
        if (accSnap.exists()) {
          const accData = accSnap.data() as Account;
          let reversedBalance = accData.currentBalance;

          if (tx.type === 'income') {
            reversedBalance -= tx.amount;
          } else if (
            tx.type === 'expense' ||
            tx.type === 'saving' ||
            tx.type === 'investment' ||
            tx.type === 'debt_payment'
          ) {
            reversedBalance += tx.amount;
          } else if (tx.type === 'transfer') {
            reversedBalance += tx.amount;
          }

          fireTx.update(accRef, cleanFirestoreData({
            currentBalance: reversedBalance,
            updatedAt: now,
          }));
        }
      }

      // Revert transfer target account
      if (tx.type === 'transfer' && tx.toAccountId) {
        const toAccRef = doc(db, 'users', userId, 'accounts', tx.toAccountId);
        const toAccSnap = await fireTx.get(toAccRef);
        if (toAccSnap.exists()) {
          const toAccData = toAccSnap.data() as Account;
          fireTx.update(toAccRef, cleanFirestoreData({
            currentBalance: toAccData.currentBalance - tx.amount,
            updatedAt: now,
          }));
        }
      }

      // Delete the transaction
      fireTx.delete(txRef);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

/**
 * Updates a transaction and atomically recalculates account balances if amount or account changed
 */
export async function updateTransaction(
  userId: string,
  txId: string,
  updates: Partial<Omit<Transaction, 'id' | 'userId' | 'createdAt'>>,
  oldTx: Transaction
): Promise<void> {
  const path = `users/${userId}/transactions/${txId}`;
  try {
    const txRef = doc(db, 'users', userId, 'transactions', txId);
    const now = new Date().toISOString();

    await runTransaction(db, async (fireTx) => {
      const newAmount = updates.amount !== undefined ? Number(updates.amount) : oldTx.amount;
      const newAccountId = updates.accountId !== undefined ? updates.accountId : oldTx.accountId;
      const newToAccountId = updates.toAccountId !== undefined ? updates.toAccountId : oldTx.toAccountId;
      const type = oldTx.type;

      const amountOrAccountChanged =
        newAmount !== oldTx.amount ||
        newAccountId !== oldTx.accountId ||
        newToAccountId !== oldTx.toAccountId;

      if (amountOrAccountChanged) {
        // 1. Revert old transaction effect on old accounts
        if (oldTx.accountId) {
          const oldAccRef = doc(db, 'users', userId, 'accounts', oldTx.accountId);
          const oldAccSnap = await fireTx.get(oldAccRef);
          if (oldAccSnap.exists()) {
            const accData = oldAccSnap.data() as Account;
            let revertedBal = accData.currentBalance;
            if (type === 'income') {
              revertedBal -= oldTx.amount;
            } else if (
              type === 'expense' ||
              type === 'saving' ||
              type === 'investment' ||
              type === 'debt_payment'
            ) {
              revertedBal += oldTx.amount;
            } else if (type === 'transfer') {
              revertedBal += oldTx.amount;
            }
            fireTx.update(oldAccRef, cleanFirestoreData({
              currentBalance: revertedBal,
              updatedAt: now,
            }));
          }
        }

        if (type === 'transfer' && oldTx.toAccountId) {
          const oldToAccRef = doc(db, 'users', userId, 'accounts', oldTx.toAccountId);
          const oldToAccSnap = await fireTx.get(oldToAccRef);
          if (oldToAccSnap.exists()) {
            const toAccData = oldToAccSnap.data() as Account;
            fireTx.update(oldToAccRef, cleanFirestoreData({
              currentBalance: toAccData.currentBalance - oldTx.amount,
              updatedAt: now,
            }));
          }
        }

        // 2. Apply new transaction effect on new accounts
        if (newAccountId) {
          const newAccRef = doc(db, 'users', userId, 'accounts', newAccountId);
          const newAccSnap = await fireTx.get(newAccRef);
          if (newAccSnap.exists()) {
            const newAccData = newAccSnap.data() as Account;
            let appliedBal = newAccData.currentBalance;
            if (type === 'income') {
              appliedBal += newAmount;
            } else if (
              type === 'expense' ||
              type === 'saving' ||
              type === 'investment' ||
              type === 'debt_payment'
            ) {
              appliedBal -= newAmount;
            } else if (type === 'transfer') {
              appliedBal -= newAmount;
            }
            fireTx.update(newAccRef, cleanFirestoreData({
              currentBalance: appliedBal,
              updatedAt: now,
            }));
          }
        }

        if (type === 'transfer' && newToAccountId) {
          const newToAccRef = doc(db, 'users', userId, 'accounts', newToAccountId);
          const newToAccSnap = await fireTx.get(newToAccRef);
          if (newToAccSnap.exists()) {
            const newToAccData = newToAccSnap.data() as Account;
            fireTx.update(newToAccRef, cleanFirestoreData({
              currentBalance: newToAccData.currentBalance + newAmount,
              updatedAt: now,
            }));
          }
        }
      }

      // Update the transaction document
      fireTx.update(txRef, cleanFirestoreData({
        ...updates,
        userId,
        updatedAt: now,
      }));
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

// --- CATEGORIES ---
export function subscribeCategories(
  userId: string,
  callback: (cats: Category[]) => void
) {
  const path = `users/${userId}/categories`;
  const q = query(collection(db, 'users', userId, 'categories'), orderBy('name', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const cats = snapshot.docs.map((doc) => doc.data() as Category);
      callback(cats);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function addCategory(
  userId: string,
  catData: Omit<Category, 'id' | 'userId' | 'createdAt'>
): Promise<Category> {
  const path = `users/${userId}/categories`;
  try {
    const colRef = collection(db, 'users', userId, 'categories');
    const docRef = doc(colRef);
    const newCat: Category = {
      ...catData,
      id: docRef.id,
      userId,
      createdAt: new Date().toISOString(),
    };
    await setDoc(docRef, cleanFirestoreData(newCat));
    return newCat;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteCategory(userId: string, categoryId: string): Promise<void> {
  const path = `users/${userId}/categories/${categoryId}`;
  try {
    const docRef = doc(db, 'users', userId, 'categories', categoryId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- BUDGETS ---
export function subscribeBudgets(
  userId: string,
  month: string,
  callback: (budgets: Budget[]) => void
) {
  const path = `users/${userId}/budgets`;
  const q = query(
    collection(db, 'users', userId, 'budgets'),
    where('month', '==', month)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const budgets = snapshot.docs.map((doc) => doc.data() as Budget);
      callback(budgets);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function setBudget(
  userId: string,
  budgetData: Omit<Budget, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const budgetId = `${budgetData.month}_${budgetData.category.replace(/\s+/g, '_')}`;
  const path = `users/${userId}/budgets/${budgetId}`;
  try {
    const docRef = doc(db, 'users', userId, 'budgets', budgetId);
    const now = new Date().toISOString();
    const item: Budget = {
      ...budgetData,
      id: budgetId,
      userId,
      amount: Number(budgetData.amount),
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(docRef, cleanFirestoreData(item));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteBudget(userId: string, budgetId: string): Promise<void> {
  const path = `users/${userId}/budgets/${budgetId}`;
  try {
    const docRef = doc(db, 'users', userId, 'budgets', budgetId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- SAVINGS GOALS ---
export function subscribeSavingsGoals(
  userId: string,
  callback: (goals: SavingsGoal[]) => void
) {
  const path = `users/${userId}/savingsGoals`;
  const q = query(
    collection(db, 'users', userId, 'savingsGoals'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const goals = snapshot.docs.map((doc) => doc.data() as SavingsGoal);
      callback(goals);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function addSavingsGoal(
  userId: string,
  goalData: Omit<SavingsGoal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<SavingsGoal> {
  const path = `users/${userId}/savingsGoals`;
  try {
    const colRef = collection(db, 'users', userId, 'savingsGoals');
    const docRef = doc(colRef);
    const now = new Date().toISOString();
    const newGoal: SavingsGoal = {
      ...goalData,
      id: docRef.id,
      userId,
      targetAmount: Number(goalData.targetAmount),
      currentAmount: Number(goalData.currentAmount) || 0,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(docRef, cleanFirestoreData(newGoal));
    return newGoal;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function contributeToGoal(
  userId: string,
  goalId: string,
  amount: number,
  accountId: string
): Promise<void> {
  const path = `users/${userId}/savingsGoals/${goalId}`;
  try {
    const goalRef = doc(db, 'users', userId, 'savingsGoals', goalId);
    const accRef = doc(db, 'users', userId, 'accounts', accountId);
    const txCol = collection(db, 'users', userId, 'transactions');
    const txRef = doc(txCol);
    const now = new Date().toISOString();

    await runTransaction(db, async (fireTx) => {
      const goalSnap = await fireTx.get(goalRef);
      const accSnap = await fireTx.get(accRef);

      if (!goalSnap.exists()) throw new Error('Goal not found');
      if (!accSnap.exists()) throw new Error('Account not found');

      const goalData = goalSnap.data() as SavingsGoal;
      const accData = accSnap.data() as Account;

      const updatedGoalAmount = goalData.currentAmount + amount;
      const isCompleted = updatedGoalAmount >= goalData.targetAmount;

      fireTx.update(goalRef, cleanFirestoreData({
        currentAmount: updatedGoalAmount,
        status: isCompleted ? 'completed' : goalData.status,
        updatedAt: now,
      }));

      fireTx.update(accRef, cleanFirestoreData({
        currentBalance: accData.currentBalance - amount,
        updatedAt: now,
      }));

      const savingTx: Transaction = {
        id: txRef.id,
        userId,
        type: 'saving',
        amount,
        currency: goalData.currency,
        category: 'Savings',
        accountId,
        date: now.split('T')[0],
        description: `Deposit to savings goal: ${goalData.goalName}`,
        relatedGoalId: goalId,
        createdAt: now,
        updatedAt: now,
      };

      fireTx.set(txRef, cleanFirestoreData(savingTx));
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteSavingsGoal(userId: string, goalId: string): Promise<void> {
  const path = `users/${userId}/savingsGoals/${goalId}`;
  try {
    const docRef = doc(db, 'users', userId, 'savingsGoals', goalId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- INVESTMENTS ---
export function subscribeInvestments(
  userId: string,
  callback: (investments: Investment[]) => void
) {
  const path = `users/${userId}/investments`;
  const q = query(
    collection(db, 'users', userId, 'investments'),
    orderBy('date', 'desc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const investments = snapshot.docs.map((doc) => doc.data() as Investment);
      callback(investments);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function addInvestment(
  userId: string,
  invData: Omit<Investment, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
  sourceAccountId?: string
): Promise<Investment> {
  const path = `users/${userId}/investments`;
  try {
    const invCol = collection(db, 'users', userId, 'investments');
    const invDocRef = doc(invCol);
    const now = new Date().toISOString();

    const newInv: Investment = {
      ...invData,
      id: invDocRef.id,
      userId,
      amountInvested: Number(invData.amountInvested),
      currentValue: Number(invData.currentValue),
      createdAt: now,
      updatedAt: now,
    };

    if (sourceAccountId) {
      await runTransaction(db, async (fireTx) => {
        const accRef = doc(db, 'users', userId, 'accounts', sourceAccountId);
        const accSnap = await fireTx.get(accRef);
        if (accSnap.exists()) {
          const accData = accSnap.data() as Account;
          fireTx.update(accRef, cleanFirestoreData({
            currentBalance: accData.currentBalance - newInv.amountInvested,
            updatedAt: now,
          }));
        }

        const txCol = collection(db, 'users', userId, 'transactions');
        const txDoc = doc(txCol);
        fireTx.set(txDoc, cleanFirestoreData({
          id: txDoc.id,
          userId,
          type: 'investment',
          amount: newInv.amountInvested,
          currency: newInv.currency,
          category: 'Investment',
          accountId: sourceAccountId,
          date: newInv.date || now.split('T')[0],
          description: `Investment in ${newInv.investmentName}`,
          relatedInvestmentId: newInv.id,
          createdAt: now,
          updatedAt: now,
        }));

        fireTx.set(invDocRef, cleanFirestoreData(newInv));
      });
    } else {
      await setDoc(invDocRef, cleanFirestoreData(newInv));
    }

    return newInv;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateInvestment(
  userId: string,
  investmentId: string,
  updates: Partial<Investment>
): Promise<void> {
  const path = `users/${userId}/investments/${investmentId}`;
  try {
    const docRef = doc(db, 'users', userId, 'investments', investmentId);
    await updateDoc(docRef, cleanFirestoreData({
      ...updates,
      updatedAt: new Date().toISOString(),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteInvestment(
  userId: string,
  investmentId: string
): Promise<void> {
  const path = `users/${userId}/investments/${investmentId}`;
  try {
    const docRef = doc(db, 'users', userId, 'investments', investmentId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- DEBTS ---
export function subscribeDebts(
  userId: string,
  callback: (debts: Debt[]) => void
) {
  const path = `users/${userId}/debts`;
  const q = query(
    collection(db, 'users', userId, 'debts'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const debts = snapshot.docs.map((doc) => doc.data() as Debt);
      callback(debts);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function addDebt(
  userId: string,
  debtData: Omit<Debt, 'id' | 'userId' | 'remainingAmount' | 'createdAt' | 'updatedAt'>
): Promise<Debt> {
  const path = `users/${userId}/debts`;
  try {
    const colRef = collection(db, 'users', userId, 'debts');
    const docRef = doc(colRef);
    const now = new Date().toISOString();
    const total = Number(debtData.totalAmount);
    const paid = Number(debtData.paidAmount) || 0;
    const remaining = Math.max(0, total - paid);

    let status = debtData.status;
    if (remaining === 0) status = 'paid';
    else if (paid > 0) status = 'partially_paid';

    const newDebt: Debt = {
      ...debtData,
      id: docRef.id,
      userId,
      totalAmount: total,
      paidAmount: paid,
      remainingAmount: remaining,
      status,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(docRef, cleanFirestoreData(newDebt));
    return newDebt;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function recordDebtPayment(
  userId: string,
  debtId: string,
  paymentAmount: number,
  accountId?: string
): Promise<void> {
  const path = `users/${userId}/debts/${debtId}`;
  try {
    const debtRef = doc(db, 'users', userId, 'debts', debtId);
    const now = new Date().toISOString();

    await runTransaction(db, async (fireTx) => {
      const debtSnap = await fireTx.get(debtRef);
      if (!debtSnap.exists()) throw new Error('Debt not found');

      const debt = debtSnap.data() as Debt;
      const newPaid = debt.paidAmount + paymentAmount;
      const newRemaining = Math.max(0, debt.totalAmount - newPaid);
      const newStatus = newRemaining === 0 ? 'paid' : 'partially_paid';

      fireTx.update(debtRef, cleanFirestoreData({
        paidAmount: newPaid,
        remainingAmount: newRemaining,
        status: newStatus,
        updatedAt: now,
      }));

      if (accountId) {
        const accRef = doc(db, 'users', userId, 'accounts', accountId);
        const accSnap = await fireTx.get(accRef);
        if (accSnap.exists()) {
          const accData = accSnap.data() as Account;
          // If borrowed debt: I am paying back -> deduct from account
          // If lent debt: someone pays me back -> add to account
          const balanceAdjustment = debt.type === 'borrowed' ? -paymentAmount : paymentAmount;
          fireTx.update(accRef, cleanFirestoreData({
            currentBalance: accData.currentBalance + balanceAdjustment,
            updatedAt: now,
          }));

          const txCol = collection(db, 'users', userId, 'transactions');
          const txDoc = doc(txCol);
          fireTx.set(txDoc, cleanFirestoreData({
            id: txDoc.id,
            userId,
            type: debt.type === 'borrowed' ? 'debt_payment' : 'income',
            amount: paymentAmount,
            currency: debt.currency,
            category: 'Debt',
            accountId,
            date: now.split('T')[0],
            description: `Payment for debt: ${debt.personOrOrg}`,
            relatedDebtId: debtId,
            createdAt: now,
            updatedAt: now,
          }));
        }
      }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateDebt(
  userId: string,
  debtId: string,
  updates: Partial<Omit<Debt, 'id' | 'userId' | 'createdAt'>>
): Promise<void> {
  const path = `users/${userId}/debts/${debtId}`;
  try {
    const docRef = doc(db, 'users', userId, 'debts', debtId);
    const now = new Date().toISOString();

    const patch: Record<string, any> = {
      ...updates,
      userId,
      updatedAt: now,
    };

    // Calculate remainingAmount and status if totalAmount or paidAmount are provided
    if (updates.totalAmount !== undefined || updates.paidAmount !== undefined) {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const currentData = snap.data() as Debt;
        const total = updates.totalAmount !== undefined ? Number(updates.totalAmount) : currentData.totalAmount;
        const paid = updates.paidAmount !== undefined ? Number(updates.paidAmount) : currentData.paidAmount;
        const remaining = Math.max(0, total - paid);
        let status = updates.status || currentData.status;
        if (remaining === 0) {
          status = 'paid';
        } else if (paid > 0) {
          status = 'partially_paid';
        } else {
          status = 'pending';
        }
        patch.totalAmount = total;
        patch.paidAmount = paid;
        patch.remainingAmount = remaining;
        patch.status = status;
      }
    }

    await updateDoc(docRef, cleanFirestoreData(patch));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function deleteDebt(userId: string, debtId: string): Promise<void> {
  const path = `users/${userId}/debts/${debtId}`;
  try {
    const docRef = doc(db, 'users', userId, 'debts', debtId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

// --- SETTINGS ---
export function subscribeSettings(
  userId: string,
  callback: (settings: UserSettings | null) => void
) {
  const path = `users/${userId}/settings/general`;
  const docRef = doc(db, 'users', userId, 'settings', 'general');
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as UserSettings);
      } else {
        callback(null);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function updateUserSettings(
  userId: string,
  updates: Partial<UserSettings>
): Promise<void> {
  const path = `users/${userId}/settings/general`;
  try {
    const docRef = doc(db, 'users', userId, 'settings', 'general');
    await setDoc(
      docRef,
      cleanFirestoreData({
        ...updates,
        userId,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
