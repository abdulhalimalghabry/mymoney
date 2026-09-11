import React, { useState, useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { useAuth } from '../contexts/AuthContext';
import { addTransaction, updateTransaction, deleteTransaction } from '../services/financialService';
import { Currency, Transaction } from '../types';
import { formatCurrency, SUPPORTED_CURRENCIES } from '../utils/currencies';
import { StatCard } from '../components/common/StatCard';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import {
  ArrowDownLeft,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  DollarSign,
  TrendingUp,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export function IncomePage() {
  const { currentUser } = useAuth();
  const { transactions, accounts, baseCurrency, toBaseCurrency, selectedMonth } =
    useFinance();

  const [showAddModal, setShowAddModal] = useState(false);
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>(baseCurrency);
  const [accountId, setAccountId] = useState('');
  const [category, setCategory] = useState('راتب شهري');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<'monthly' | 'weekly' | 'yearly'>('monthly');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // حالات تأكيد حذف سجل الدخل
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // حالات تعديل سجل الدخل
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editSource, setEditSource] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCurrency, setEditCurrency] = useState<Currency>(baseCurrency);
  const [editAccountId, setEditAccountId] = useState('');
  const [editCategory, setEditCategory] = useState('راتب شهري');
  const [editDate, setEditDate] = useState('');
  const [editIsRecurring, setEditIsRecurring] = useState(false);
  const [editRecurringFrequency, setEditRecurringFrequency] = useState<'monthly' | 'weekly' | 'yearly'>('monthly');
  const [editDescription, setEditDescription] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // تصفية معاملات الدخل
  const incomeTransactions = useMemo(() => {
    return transactions.filter((t) => t.type === 'income');
  }, [transactions]);

  const currentYear = useMemo(() => new Date().getFullYear().toString(), []);

  // إحصائيات: دخل الشهر والسنة
  const { monthTotal, yearTotal } = useMemo(() => {
    let m = 0;
    let y = 0;
    incomeTransactions.forEach((tx) => {
      const val = toBaseCurrency(tx.amount, tx.currency);
      if (tx.date && tx.date.startsWith(selectedMonth)) {
        m += val;
      }
      if (tx.date && tx.date.startsWith(currentYear)) {
        y += val;
      }
    });
    return { monthTotal: m, yearTotal: y };
  }, [incomeTransactions, selectedMonth, currentYear, toBaseCurrency]);

  // توزيع الدخل حسب الفئة
  const incomeCategoryData = useMemo(() => {
    const map: Record<string, number> = {};
    incomeTransactions.forEach((t) => {
      const val = toBaseCurrency(t.amount, t.currency);
      map[t.category] = (map[t.category] || 0) + val;
    });

    return Object.entries(map).map(([name, amount]) => ({
      name,
      amount,
    }));
  }, [incomeTransactions, toBaseCurrency]);

  const handleAddIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setError(null);

    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setError('يرجى إدخال مبلغ صحيح أكبر من 0');
      return;
    }
    if (!accountId) {
      setError('يرجى اختيار الحساب المستلم');
      return;
    }

    setSubmitting(true);
    try {
      await addTransaction(currentUser.uid, {
        type: 'income',
        amount: num,
        currency,
        accountId,
        category,
        source: source.trim() || category,
        date,
        isRecurring,
        ...(isRecurring ? { recurringFrequency } : {}),
        description: description.trim() || source.trim() || '',
        notes: notes.trim() || '',
      });

      setShowAddModal(false);
      setAmount('');
      setSource('');
      setDescription('');
      setNotes('');
    } catch (err) {
      console.error(err);
      setError('تعذر تسجيل الإيراد. يرجى التحقق من الاتصال.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setEditSource(tx.source || tx.description || '');
    setEditAmount(tx.amount.toString());
    setEditCurrency(tx.currency);
    setEditAccountId(tx.accountId || '');
    setEditCategory(tx.category);
    setEditDate(tx.date);
    setEditIsRecurring(!!tx.isRecurring);
    setEditRecurringFrequency(tx.recurringFrequency || 'monthly');
    setEditDescription(tx.description || '');
    setEditNotes(tx.notes || '');
    setEditError(null);
  };

  const handleUpdateIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !editingTx) return;
    setEditError(null);

    const num = parseFloat(editAmount);
    if (isNaN(num) || num <= 0) {
      setEditError('يرجى إدخال مبلغ صحيح أكبر من 0');
      return;
    }
    if (!editAccountId) {
      setEditError('يرجى اختيار الحساب المستلم');
      return;
    }

    setEditSubmitting(true);
    try {
      await updateTransaction(
        currentUser.uid,
        editingTx.id,
        {
          amount: num,
          currency: editCurrency,
          accountId: editAccountId,
          category: editCategory,
          source: editSource.trim() || editCategory,
          date: editDate,
          isRecurring: editIsRecurring,
          recurringFrequency: editIsRecurring ? editRecurringFrequency : undefined,
          description: editDescription.trim() || editSource.trim() || '',
          notes: editNotes.trim() || '',
        },
        editingTx
      );
      setEditingTx(null);
    } catch (err) {
      console.error(err);
      setEditError('تعذر تحديث سجل الدخل. يرجى المحاولة مرة أخرى.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!currentUser || !txToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteTransaction(currentUser.uid, txToDelete);
      setTxToDelete(null);
    } catch (err) {
      console.error(err);
      setDeleteError('فشل حذف سجل الدخل. يرجى المحاولة مرة أخرى.');
    } finally {
      setDeleting(false);
    }
  };

  const getAccountName = (accId?: string) => {
    return accounts.find((a) => a.id === accId)?.name || 'غير معروف';
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* ترويسة الصفحة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            إدارة الدخل والإيرادات
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            تتبع الرواتب، العقود المستقلة، عوائد الاستثمار والتدفقات النقدية الواردة
          </p>
        </div>

        <button
          onClick={() => {
            setError(null);
            setShowAddModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          تسجيل دخل جديد
        </button>
      </div>

      {/* بطاقات الإحصاءات */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          id="stat-month-income"
          title={`دخل الشهر الحالي (${selectedMonth})`}
          amount={formatCurrency(monthTotal, baseCurrency)}
          subtitle="إجمالي التدفقات الواردة للشهر"
          icon={Calendar}
          colorClass="bg-emerald-100 text-emerald-700"
        />
        <StatCard
          id="stat-year-income"
          title={`إجمالي دخل العام (${currentYear})`}
          amount={formatCurrency(yearTotal, baseCurrency)}
          subtitle="تراكمي الإيرادات خلال السنة"
          icon={TrendingUp}
          colorClass="bg-teal-100 text-teal-700"
        />
        <StatCard
          id="stat-total-records"
          title="عدد عمليات الدخل المسجلة"
          amount={String(incomeTransactions.length)}
          subtitle="إجمالي السجلات المدخلة"
          icon={DollarSign}
          colorClass="bg-blue-100 text-blue-700"
        />
      </div>

      {/* رسم بياني لمصادر وتصنيفات الدخل */}
      {incomeCategoryData.length > 0 && (
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <h4 className="text-base font-bold text-slate-900 mb-1">
            الدخل حسب التصنيف
          </h4>
          <p className="text-xs text-slate-500 mb-4">توزيع الإيرادات الكلية محسوبة بـ ({baseCurrency})</p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incomeCategoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val) || 0, baseCurrency), 'المبلغ']}
                  contentStyle={{
                    borderRadius: '12px',
                    fontSize: '12px',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Bar dataKey="amount" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* جدول سجلات الدخل */}
      {incomeTransactions.length === 0 ? (
        <EmptyState
          id="income-empty"
          icon={ArrowDownLeft}
          title="لم تقم بتسجيل أي دخل بعد"
          description="سجل راتبك الشهري أو أرباح عملك لتبدأ بمتابعة مصادر دخلك بوضوح."
          actionLabel="تسجيل أول دخل"
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900">سجل الإيرادات والواردات</h4>
            <span className="text-xs text-slate-500 font-medium">{incomeTransactions.length} عملية مسجلة</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">التاريخ</th>
                  <th className="py-3 px-4">المصدر / البيان</th>
                  <th className="py-3 px-4">التصنيف</th>
                  <th className="py-3 px-4">الحساب المستلم</th>
                  <th className="py-3 px-4">تكرار الإيراد</th>
                  <th className="py-3 px-4 text-left">المبلغ</th>
                  <th className="py-3 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {incomeTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-medium">{tx.date}</td>
                    <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-900">
                      {tx.source || tx.description || tx.category}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                        {tx.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                      {getAccountName(tx.accountId)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                      {tx.isRecurring
                        ? `متكرر (${tx.recurringFrequency === 'monthly' ? 'شهرياً' : tx.recurringFrequency === 'weekly' ? 'أسبوعياً' : 'سنوياً'})`
                        : 'مرة واحدة'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-left font-bold text-emerald-600 text-sm font-mono" dir="ltr">
                      +{formatCurrency(tx.amount, tx.currency)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          id={`income-edit-${tx.id}`}
                          onClick={() => handleStartEdit(tx)}
                          title="تعديل سجل الدخل"
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`income-delete-${tx.id}`}
                          onClick={() => {
                            setDeleteError(null);
                            setTxToDelete(tx);
                          }}
                          title="حذف سجل الدخل"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* نافذة إضافة دخل جديد */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="تسجيل دخل مالي جديد"
      >
        <form onSubmit={handleAddIncome} className="space-y-4" dir="rtl">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 rounded-xl border border-rose-200 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              مصدر الدخل / العنوان *
            </label>
            <input
              type="text"
              required
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="مثال: راتب شركة، مكافأة مشروع حر، عائد إيجار عقار..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                المبلغ *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-base font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                العملة
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-full px-3 py-2 text-sm font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الحساب المالي المستقبل *
              </label>
              <select
                required
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
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
                التصنيف *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
              >
                <option value="راتب شهري">راتب شهري</option>
                <option value="عمل حر واستشارات">عمل حر واستشارات</option>
                <option value="أرباح تجارة واستثمار">أرباح تجارة واستثمار</option>
                <option value="عوائد إيجار عقار">عوائد إيجار عقار</option>
                <option value="مكافآت وهدايا">مكافآت وهدايا</option>
                <option value="إيرادات أخرى">إيرادات أخرى</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تاريخ الاستلام *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                وصف أو بيان إضافي
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ملاحظة اختيارية..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* خيار الدخل المتكرر */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isIncomeRecurring"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="isIncomeRecurring" className="text-xs font-bold text-slate-800 cursor-pointer">
                دخل دوري متكرر
              </label>
            </div>

            {isRecurring && (
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  معدل التكرار
                </label>
                <select
                  value={recurringFrequency}
                  onChange={(e) => setRecurringFrequency(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl cursor-pointer"
                >
                  <option value="monthly">شهرياً (راتب أو اشتراك دوري)</option>
                  <option value="weekly">أسبوعياً</option>
                  <option value="yearly">سنوياً</option>
                </select>
              </div>
            )}
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
              حفظ الإيراد
            </button>
          </div>
        </form>
      </Modal>

      {/* نافذة تعديل سجل الدخل */}
      <Modal
        isOpen={!!editingTx}
        onClose={() => {
          if (!editSubmitting) setEditingTx(null);
        }}
        title={`تعديل سجل الدخل: ${editingTx?.source || editingTx?.category || ''}`}
      >
        <form onSubmit={handleUpdateIncome} className="space-y-4" dir="rtl">
          {editError && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 rounded-xl border border-rose-200 font-medium">
              {editError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              مصدر الدخل / العنوان *
            </label>
            <input
              type="text"
              required
              value={editSource}
              onChange={(e) => setEditSource(e.target.value)}
              placeholder="مثال: راتب شركة، استشارات، مكافأة..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                المبلغ *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-base font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                العملة
              </label>
              <select
                value={editCurrency}
                onChange={(e) => setEditCurrency(e.target.value as Currency)}
                className="w-full px-3 py-2 text-sm font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الحساب المالي المستقبل *
              </label>
              <select
                required
                value={editAccountId}
                onChange={(e) => setEditAccountId(e.target.value)}
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
                التصنيف *
              </label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
              >
                <option value="راتب شهري">راتب شهري</option>
                <option value="عمل حر واستشارات">عمل حر واستشارات</option>
                <option value="أرباح تجارة واستثمار">أرباح تجارة واستثمار</option>
                <option value="عوائد إيجار عقار">عوائد إيجار عقار</option>
                <option value="مكافآت وهدايا">مكافآت وهدايا</option>
                <option value="إيرادات أخرى">إيرادات أخرى</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تاريخ الاستلام *
              </label>
              <input
                type="date"
                required
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                وصف أو بيان إضافي
              </label>
              <input
                type="text"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="ملاحظة اختيارية..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isEditIncomeRecurring"
                checked={editIsRecurring}
                onChange={(e) => setEditIsRecurring(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="isEditIncomeRecurring" className="text-xs font-bold text-slate-800 cursor-pointer">
                دخل دوري متكرر
              </label>
            </div>

            {editIsRecurring && (
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  معدل التكرار
                </label>
                <select
                  value={editRecurringFrequency}
                  onChange={(e) => setEditRecurringFrequency(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl cursor-pointer"
                >
                  <option value="monthly">شهرياً (راتب أو اشتراك دوري)</option>
                  <option value="weekly">أسبوعياً</option>
                  <option value="yearly">سنوياً</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={editSubmitting}
              onClick={() => setEditingTx(null)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={editSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {editSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              حفظ التعديلات
            </button>
          </div>
        </form>
      </Modal>

      {/* نافذة تأكيد حذف سجل الدخل */}
      <Modal
        isOpen={!!txToDelete}
        onClose={() => {
          if (!deleting) setTxToDelete(null);
        }}
        title="تأكيد حذف سجل الدخل"
        maxWidth="sm"
      >
        <div className="space-y-4 text-right" dir="rtl">
          {deleteError && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 rounded-xl border border-rose-200 font-medium">
              {deleteError}
            </div>
          )}

          <div className="flex items-start gap-3 p-3.5 bg-rose-50/70 border border-rose-100 rounded-2xl">
            <div className="p-2 bg-rose-100 text-rose-600 rounded-xl shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                هل أنت متأكد من رغبتك في حذف هذا الإيراد؟
              </p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                سيتم حذف سجل الدخل الخاص بـ{' '}
                <strong className="text-slate-900 font-semibold">
                  {txToDelete?.source || txToDelete?.category}
                </strong>{' '}
                بمبلغ{' '}
                <span className="font-bold font-mono text-emerald-700">
                  {txToDelete && formatCurrency(txToDelete.amount, txToDelete.currency)}
                </span>
                . سيتم خصم هذا المبلغ تلقائياً من رصيد حساب{' '}
                <strong className="text-slate-800">
                  ({txToDelete ? getAccountName(txToDelete.accountId) : ''})
                </strong>{' '}
                للحفاظ على دقة الأرصدة.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              id="cancel-delete-income-btn"
              disabled={deleting}
              onClick={() => setTxToDelete(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="button"
              id="confirm-delete-income-btn"
              disabled={deleting}
              onClick={handleConfirmDelete}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 disabled:opacity-50 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              نعم، حذف سجل الدخل
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
