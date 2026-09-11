import React, { useState, useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { useAuth } from '../contexts/AuthContext';
import { addTransaction, deleteTransaction } from '../services/financialService';
import { Currency, Transaction } from '../types';
import { formatCurrency, SUPPORTED_CURRENCIES } from '../utils/currencies';
import { StatCard } from '../components/common/StatCard';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import {
  ArrowUpRight,
  Plus,
  Trash2,
  Calendar,
  TrendingDown,
  Loader2,
  Receipt,
} from 'lucide-react';

export function ExpensesPage() {
  const { currentUser } = useAuth();
  const { transactions, accounts, categories, baseCurrency, toBaseCurrency, selectedMonth } =
    useFinance();

  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>(baseCurrency);
  const [accountId, setAccountId] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<'monthly' | 'weekly' | 'yearly'>('monthly');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // تصفية فئات المصروفات
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  // تصفية معاملات المصروفات
  const expenseTransactions = useMemo(() => {
    return transactions.filter((t) => t.type === 'expense');
  }, [transactions]);

  const currentYear = useMemo(() => new Date().getFullYear().toString(), []);

  // إحصائيات: مصروفات الشهر والسنة
  const { monthTotal, yearTotal } = useMemo(() => {
    let m = 0;
    let y = 0;
    expenseTransactions.forEach((tx) => {
      const val = toBaseCurrency(tx.amount, tx.currency);
      if (tx.date && tx.date.startsWith(selectedMonth)) {
        m += val;
      }
      if (tx.date && tx.date.startsWith(currentYear)) {
        y += val;
      }
    });
    return { monthTotal: m, yearTotal: y };
  }, [expenseTransactions, selectedMonth, currentYear, toBaseCurrency]);

  // أعلى تصنيفات الإنفاق لهذا الشهر
  const topCategories = useMemo(() => {
    const map: Record<string, number> = {};
    expenseTransactions
      .filter((t) => t.date && t.date.startsWith(selectedMonth))
      .forEach((t) => {
        const val = toBaseCurrency(t.amount, t.currency);
        map[t.category] = (map[t.category] || 0) + val;
      });

    return Object.entries(map)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [expenseTransactions, selectedMonth, toBaseCurrency]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setError(null);

    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setError('يرجى إدخال مبلغ صحيح أكبر من 0');
      return;
    }
    if (!accountId) {
      setError('يرجى اختيار الحساب المراد الخصم منه');
      return;
    }
    if (!category) {
      setError('يرجى اختيار تصنيف المصروف');
      return;
    }

    setSubmitting(true);
    try {
      await addTransaction(currentUser.uid, {
        type: 'expense',
        amount: num,
        currency,
        accountId,
        category,
        subcategory: subcategory.trim() || '',
        date,
        isRecurring,
        ...(isRecurring ? { recurringFrequency } : {}),
        description: title.trim(),
        notes: notes.trim() || '',
      });

      setShowAddModal(false);
      setAmount('');
      setTitle('');
      setSubcategory('');
      setNotes('');
    } catch (err) {
      console.error(err);
      setError('تعذر تسجيل المصروف. يرجى المحاولة لاحقاً.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (tx: Transaction) => {
    if (!currentUser) return;
    if (
      window.confirm(
        `هل تريد بالتأكيد حذف هذا المصروف بقيمة ${tx.amount} ${tx.currency}؟ سيتم استرجاع المبلغ لحسابك تلقائياً.`
      )
    ) {
      try {
        await deleteTransaction(currentUser.uid, tx);
      } catch (err) {
        console.error(err);
        alert('فشل حذف المصروف.');
      }
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
            إدارة المصروفات والنفقات
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            مراقبة تكاليف المعيشة، الفواتير، الاشتراكات والمصروفات اليومية
          </p>
        </div>

        <button
          onClick={() => {
            setError(null);
            setShowAddModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          تسجيل مصروف جديد
        </button>
      </div>

      {/* بطاقات الإحصاءات */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          id="stat-month-expense"
          title={`مصروفات الشهر الحالي (${selectedMonth})`}
          amount={formatCurrency(monthTotal, baseCurrency)}
          subtitle="إجمالي النفقات للشهر"
          icon={Calendar}
          colorClass="bg-rose-100 text-rose-700"
        />
        <StatCard
          id="stat-year-expense"
          title={`إجمالي مصروفات العام (${currentYear})`}
          amount={formatCurrency(yearTotal, baseCurrency)}
          subtitle="تراكمي المصروفات خلال السنة"
          icon={TrendingDown}
          colorClass="bg-amber-100 text-amber-700"
        />
        <StatCard
          id="stat-top-cat"
          title="أعلى تصنيف إنفاق"
          amount={topCategories[0]?.name || 'لا يوجد'}
          subtitle={
            topCategories[0]
              ? formatCurrency(topCategories[0].total, baseCurrency)
              : 'لم يتم تسجيل مصروفات بعد'
          }
          icon={Receipt}
          colorClass="bg-purple-100 text-purple-700"
        />
      </div>

      {/* شريط توزيع أعلى التصنيفات */}
      {topCategories.length > 0 && (
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <h4 className="text-base font-bold text-slate-900 mb-1">
            أعلى تصنيفات الإنفاق لشهر ({selectedMonth})
          </h4>
          <p className="text-xs text-slate-500 mb-4">أكثر المجالات استهلاكاً للميزانية</p>
          <div className="space-y-3">
            {topCategories.slice(0, 5).map((cat) => {
              const pct = monthTotal > 0 ? Math.round((cat.total / monthTotal) * 100) : 0;
              return (
                <div key={cat.name}>
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span className="text-slate-800">{cat.name}</span>
                    <span className="text-slate-900 font-mono">
                      {formatCurrency(cat.total, baseCurrency)} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* جدول سجلات المصروفات */}
      {expenseTransactions.length === 0 ? (
        <EmptyState
          id="expenses-empty"
          icon={ArrowUpRight}
          title="لم تسجل أي مصروفات حتى الآن"
          description="سجل مشترياتك اليومية، فواتيرك أو اشتراكاتك لمراقبة أين تذهب أموالك."
          actionLabel="تسجيل أول مصروف"
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900">سجل النفقات والمصروفات</h4>
            <span className="text-xs text-slate-500 font-medium">{expenseTransactions.length} عملية مسجلة</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">التاريخ</th>
                  <th className="py-3 px-4">البند / البيان</th>
                  <th className="py-3 px-4">التصنيف</th>
                  <th className="py-3 px-4">التصنيف الفرعي</th>
                  <th className="py-3 px-4">خُصم من</th>
                  <th className="py-3 px-4">نوع المصروف</th>
                  <th className="py-3 px-4 text-left">المبلغ</th>
                  <th className="py-3 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {expenseTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-medium">{tx.date}</td>
                    <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-900">
                      {tx.description || tx.category}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                        {tx.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                      {tx.subcategory || '-'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-medium">
                      {getAccountName(tx.accountId)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                      {tx.isRecurring
                        ? `دوري (${tx.recurringFrequency === 'monthly' ? 'شهرياً' : tx.recurringFrequency === 'weekly' ? 'أسبوعياً' : 'سنوياً'})`
                        : 'مرة واحدة'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-left font-bold text-slate-900 text-sm font-mono" dir="ltr">
                      -{formatCurrency(tx.amount, tx.currency)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleDelete(tx)}
                        title="حذف المصروف واسترجاع الرصيد للحساب"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* نافذة تسجيل مصروف جديد */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="تسجيل مصروف جديد"
      >
        <form onSubmit={handleAddExpense} className="space-y-4" dir="rtl">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 rounded-xl border border-rose-200 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              عنوان المصروف أو البند *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: بقالة السوبرماركت، وقود سيارة، فاتورة كهرباء..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
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
                className="w-full px-3 py-2 text-base font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                العملة
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-full px-3 py-2 text-sm font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-hidden cursor-pointer"
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
                الحساب المخصوم منه *
              </label>
              <select
                required
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-hidden cursor-pointer"
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
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-hidden cursor-pointer"
              >
                <option value="">اختر التصنيف</option>
                {expenseCategories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تصنيف فرعي (اختياري)
              </label>
              <input
                type="text"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                placeholder="مثال: خضروات، بنزين، صيانة..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تاريخ الصرف *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* خيار المصروف الدوري */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isExpenseRecurring"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-4 h-4 text-rose-600 rounded-sm focus:ring-rose-500 cursor-pointer"
              />
              <label htmlFor="isExpenseRecurring" className="text-xs font-bold text-slate-800 cursor-pointer">
                مصروف دوري / اشتراك متكرر
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
                  <option value="monthly">شهرياً (فاتورة أو اشتراك)</option>
                  <option value="weekly">أسبوعياً</option>
                  <option value="yearly">سنوياً</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ملاحظات أو رقم الفاتورة (اختياري)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: فاتورة رقم 1024، المتجر المركزي..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
            />
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
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 disabled:opacity-50 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              حفظ المصروف
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
