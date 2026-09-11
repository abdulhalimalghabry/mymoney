import React, { useState } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { useAuth } from '../contexts/AuthContext';
import {
  addAccount,
  updateAccount,
  deleteAccount,
  addTransaction,
} from '../services/financialService';
import { Account, AccountType, Currency } from '../types';
import { formatCurrency, SUPPORTED_CURRENCIES } from '../utils/currencies';
import { ACCOUNT_TYPE_LABELS } from '../utils/constants';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import {
  Wallet,
  Plus,
  ArrowLeftRight,
  Edit2,
  Trash2,
  Landmark,
  PiggyBank,
  Banknote,
  TrendingUp,
  Smartphone,
  CreditCard,
  Loader2,
} from 'lucide-react';

export function AccountsPage() {
  const { currentUser } = useAuth();
  const { accounts, baseCurrency, toBaseCurrency } = useFinance();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // حالات نموذج الإضافة والتعديل
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [currency, setCurrency] = useState<Currency>(baseCurrency);
  const [balance, setBalance] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // حالات التحويل
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDescription, setTransferDescription] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);

  const openAddModal = () => {
    setName('');
    setType('bank');
    setCurrency(baseCurrency);
    setBalance('');
    setDescription('');
    setIsActive(true);
    setError(null);
    setEditingAccount(null);
    setShowAddModal(true);
  };

  const openEditModal = (acc: Account) => {
    setEditingAccount(acc);
    setName(acc.name);
    setType(acc.type);
    setCurrency(acc.currency);
    setBalance(String(acc.currentBalance));
    setDescription(acc.description || '');
    setIsActive(acc.isActive);
    setError(null);
    setShowAddModal(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setError(null);

    const numBalance = parseFloat(balance);
    if (isNaN(numBalance)) {
      setError('يرجى إدخال رصيد صحيح');
      return;
    }

    setSubmitting(true);
    try {
      if (editingAccount) {
        await updateAccount(currentUser.uid, editingAccount.id, {
          name: name.trim(),
          type,
          currency,
          currentBalance: numBalance,
          description: description.trim() || '',
          isActive,
        });
      } else {
        await addAccount(currentUser.uid, {
          name: name.trim(),
          type,
          currency,
          currentBalance: numBalance,
          initialBalance: numBalance,
          description: description.trim() || '',
          isActive,
        });
      }
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
      setError('تعذر حفظ بيانات الحساب. يرجى المحاولة مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (acc: Account) => {
    if (!currentUser) return;
    if (
      window.confirm(
        `هل أنت متأكد من رغبتك في حذف "${acc.name}"؟ ستبقى سجلات المعاملات المرتبطة به محفوظة في النظام.`
      )
    ) {
      try {
        await deleteAccount(currentUser.uid, acc.id);
      } catch (err) {
        console.error(err);
        alert('تعذر حذف الحساب حالياً.');
      }
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setError(null);

    const num = parseFloat(transferAmount);
    if (isNaN(num) || num <= 0) {
      setError('يرجى إدخال مبلغ تحويل صحيح أكبر من 0');
      return;
    }

    if (!fromAccountId || !toAccountId) {
      setError('يرجى تحديد كلاً من الحساب المصدر والحساب المستلم');
      return;
    }

    if (fromAccountId === toAccountId) {
      setError('لا يمكن التحويل لنفس الحساب');
      return;
    }

    const sourceAcc = accounts.find((a) => a.id === fromAccountId);
    if (sourceAcc && sourceAcc.currentBalance < num) {
      setError(`تنبيه: رصيد الحساب المصدر حالياً هو ${sourceAcc.currentBalance.toLocaleString()} ${sourceAcc.currency}`);
    }

    setSubmitting(true);
    try {
      await addTransaction(currentUser.uid, {
        type: 'transfer',
        amount: num,
        currency: sourceAcc ? sourceAcc.currency : baseCurrency,
        accountId: fromAccountId,
        toAccountId,
        category: 'تحويل بين الحسابات',
        date: transferDate,
        description: transferDescription.trim() || 'تحويل مالي بين الحسابات',
      });

      setShowTransferModal(false);
      setTransferAmount('');
      setTransferDescription('');
    } catch (err) {
      console.error(err);
      setError('فشلت عملية التحويل، يرجى التحقق من الاتصال.');
    } finally {
      setSubmitting(false);
    }
  };

  const getAccountIcon = (accType: AccountType) => {
    switch (accType) {
      case 'cash':
        return Banknote;
      case 'bank':
        return Landmark;
      case 'savings':
        return PiggyBank;
      case 'investment':
        return TrendingUp;
      case 'ewallet':
        return Smartphone;
      default:
        return CreditCard;
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* ترويسة الصفحة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            الحسابات والمحافظ المالية
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            إدارة الحسابات البنكية، النقدية، المحافظ الإلكترونية وحسابات التوفير
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="open-transfer-btn"
            onClick={() => {
              setError(null);
              setShowTransferModal(true);
            }}
            disabled={accounts.length < 2}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-all shadow-xs disabled:opacity-40 cursor-pointer"
          >
            <ArrowLeftRight className="w-4 h-4 text-blue-600" />
            تحويل بين الحسابات
          </button>

          <button
            id="open-add-account-btn"
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            إضافة حساب جديد
          </button>
        </div>
      </div>

      {/* شبكة بطاقات الحسابات */}
      {accounts.length === 0 ? (
        <EmptyState
          id="accounts-empty"
          icon={Wallet}
          title="لم تقم بإضافة حسابات مالية بعد"
          description="أضف حسابك البنكي أو محفظتك النقدية لتبدأ في إدارة وتتبع حركة أموالك بكل سهولة."
          actionLabel="إضافة أول حساب"
          onAction={openAddModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {accounts.map((acc) => {
            const Icon = getAccountIcon(acc.type);
            const inBaseVal = toBaseCurrency(acc.currentBalance, acc.currency);

            return (
              <div
                key={acc.id}
                className={`p-5 rounded-2xl bg-white border transition-all shadow-xs hover:shadow-md flex flex-col justify-between ${
                  acc.isActive
                    ? 'border-slate-200'
                    : 'border-slate-200 opacity-60 bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-900 leading-tight">
                          {acc.name}
                        </h4>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {ACCOUNT_TYPE_LABELS[acc.type]?.label || acc.type}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(acc)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="تعديل الحساب"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(acc)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="حذف الحساب"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {acc.description && (
                    <p className="text-xs text-slate-600 mb-3 line-clamp-2 leading-relaxed">
                      {acc.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-baseline justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">الرصيد المتوفر</span>
                    <span className="text-xl font-bold text-slate-900 font-mono">
                      {formatCurrency(acc.currentBalance, acc.currency)}
                    </span>
                  </div>
                  {acc.currency !== baseCurrency && (
                    <span className="text-xs font-bold text-slate-500 font-mono">
                      ≈ {formatCurrency(inBaseVal, baseCurrency)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* نافذة إضافة / تعديل الحساب */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editingAccount ? 'تعديل بيانات الحساب' : 'إضافة حساب مالي جديد'}
      >
        <form onSubmit={handleSaveAccount} className="space-y-4" dir="rtl">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 rounded-xl border border-rose-200 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              اسم الحساب أو المحفظة *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: حساب مصرف الراجحي، محفظة كاش، حساب توفير..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                نوع الحساب *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AccountType)}
                className="w-full px-3 py-2 text-sm font-medium bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
              >
                <option value="bank">حساب بنكي جاري</option>
                <option value="cash">محفظة كاش ونقود</option>
                <option value="savings">حساب توفير وادخار</option>
                <option value="investment">محفظة استثمارية</option>
                <option value="ewallet">محفظة إلكترونية</option>
                <option value="other">حساب آخر</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                العملة *
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-full px-3 py-2 text-sm font-medium bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              الرصيد الحالي *
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 text-base font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              الوصف أو ملاحظة (اختياري)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثال: مخصص لمصروفات المنزل الشهرية..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500 cursor-pointer"
            />
            <label htmlFor="isActive" className="text-xs text-slate-700 font-bold cursor-pointer">
              حساب نشط ومتاح في العمليات
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingAccount ? 'حفظ التعديلات' : 'إنشاء الحساب'}
            </button>
          </div>
        </form>
      </Modal>

      {/* نافذة التحويل بين الحسابات */}
      <Modal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        title="التحويل المالي بين حساباتك"
      >
        <form onSubmit={handleTransfer} className="space-y-4" dir="rtl">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 rounded-xl border border-rose-200 font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                من حساب (المصدر) *
              </label>
              <select
                required
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
              >
                <option value="">اختر الحساب</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currentBalance.toLocaleString()} {acc.currency})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                إلى حساب (المستلم) *
              </label>
              <select
                required
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
              >
                <option value="">اختر الحساب</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currentBalance.toLocaleString()} {acc.currency})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              مبلغ التحويل *
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 text-base font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تاريخ التحويل *
              </label>
              <input
                type="date"
                required
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                بيان أو ملاحظة
              </label>
              <input
                type="text"
                value={transferDescription}
                onChange={(e) => setTransferDescription(e.target.value)}
                placeholder="مثال: سحب نقدي من الصراف"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowTransferModal(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              تنفيذ التحويل
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
