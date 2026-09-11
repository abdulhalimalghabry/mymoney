import React, { useState, useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { useAuth } from '../contexts/AuthContext';
import { setBudget, deleteBudget } from '../services/financialService';
import { Budget, Currency } from '../types';
import { formatCurrency, SUPPORTED_CURRENCIES } from '../utils/currencies';
import { StatCard } from '../components/common/StatCard';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import {
  PieChart as PieIcon,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Calendar,
} from 'lucide-react';

export function BudgetPage() {
  const { currentUser } = useAuth();
  const {
    budgets,
    categories,
    transactions,
    selectedMonth,
    baseCurrency,
    toBaseCurrency,
  } = useFinance();

  const [showAddModal, setShowAddModal] = useState(false);
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>(baseCurrency);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expenseCategories = categories.filter((c) => c.type === 'expense');

  // حساب المصروف لكل تصنيف في الشهر المحدد
  const categorySpending = useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter((t) => t.type === 'expense' && t.date && t.date.startsWith(selectedMonth))
      .forEach((t) => {
        const inBase = toBaseCurrency(t.amount, t.currency);
        map[t.category.toLowerCase()] = (map[t.category.toLowerCase()] || 0) + inBase;
      });
    return map;
  }, [transactions, selectedMonth, toBaseCurrency]);

  // إجمالي الميزانية المحددة مقابل المصروف الفعلي
  const { totalBudgeted, totalSpent } = useMemo(() => {
    let bSum = 0;
    let sSum = 0;

    budgets.forEach((b) => {
      const budgetInBase = toBaseCurrency(b.amount, b.currency);
      bSum += budgetInBase;
      const spent = categorySpending[b.category.toLowerCase()] || 0;
      sSum += spent;
    });

    return { totalBudgeted: bSum, totalSpent: sSum };
  }, [budgets, categorySpending, toBaseCurrency]);

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setError(null);

    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setError('يرجى إدخال حد ميزانية صحيح أكبر من 0');
      return;
    }
    const cat = category || (expenseCategories[0]?.name || 'مصروفات متنوعة');

    setSubmitting(true);
    try {
      await setBudget(currentUser.uid, {
        month: selectedMonth,
        category: cat,
        amount: num,
        currency,
      });

      setShowAddModal(false);
      setAmount('');
    } catch (err) {
      console.error(err);
      setError('تعذر حفظ الميزانية. يرجى المحاولة لاحقاً.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBudget = async (b: Budget) => {
    if (!currentUser) return;
    if (window.confirm(`هل أنت متأكد من إزالة حد الميزانية لتصنيف "${b.category}"؟`)) {
      try {
        await deleteBudget(currentUser.uid, b.id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* ترويسة الصفحة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            الميزانيات الشهرية
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            تحديد سقوف الإنفاق للتصنيفات ومراقبة وتيرة الاستهلاك وتفادي تجاوز الميزانية
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
          تحديد ميزانية لتصنيف
        </button>
      </div>

      {/* بطاقات الملخص */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          id="stat-total-budget"
          title={`إجمالي الميزانية المحددة (${selectedMonth})`}
          amount={formatCurrency(totalBudgeted, baseCurrency)}
          subtitle="سقف الإنفاق المخطط له"
          icon={Calendar}
          colorClass="bg-blue-100 text-blue-700"
        />
        <StatCard
          id="stat-total-spent"
          title="المصروف الفعلي حتى الآن"
          amount={formatCurrency(totalSpent, baseCurrency)}
          subtitle={
            totalBudgeted > 0
              ? `تم استهلاك ${Math.round((totalSpent / totalBudgeted) * 100)}% من الميزانية الكلية`
              : 'لم يتم تحديد ميزانية بعد'
          }
          icon={PieIcon}
          colorClass="bg-rose-100 text-rose-700"
        />
        <StatCard
          id="stat-budget-remaining"
          title="المتبقي من الميزانية"
          amount={formatCurrency(Math.max(0, totalBudgeted - totalSpent), baseCurrency)}
          subtitle={totalSpent > totalBudgeted ? '⚠️ تم تجاوز سقف الميزانية' : 'ضمن الحدود الآمنة'}
          icon={CheckCircle2}
          colorClass={
            totalSpent > totalBudgeted
              ? 'bg-rose-100 text-rose-700'
              : 'bg-emerald-100 text-emerald-700'
          }
        />
      </div>

      {/* شبكة ميزانيات التصنيفات */}
      {budgets.length === 0 ? (
        <EmptyState
          id="budgets-empty"
          icon={PieIcon}
          title="لم يتم تحديد ميزانيات لهذا الشهر"
          description="حدد سقف إنفاق للبقالة، الفواتير، المطاعم أو المواصلات للتحكم في مصاريفك بذكاء."
          actionLabel="تحديد أول ميزانية"
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {budgets.map((b) => {
            const spentInBase = categorySpending[b.category.toLowerCase()] || 0;
            const limitInBase = toBaseCurrency(b.amount, b.currency);
            const remaining = Math.max(0, limitInBase - spentInBase);
            const percent = limitInBase > 0 ? Math.round((spentInBase / limitInBase) * 100) : 0;

            const isOver = spentInBase > limitInBase;
            const isWarning = !isOver && percent >= 80;

            return (
              <div
                key={b.id}
                className={`p-5 rounded-2xl bg-white border transition-all shadow-xs ${
                  isOver
                    ? 'border-rose-300 ring-1 ring-rose-500/20'
                    : isWarning
                    ? 'border-amber-300 ring-1 ring-amber-500/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-base font-bold text-slate-900">
                      {b.category}
                    </h4>
                    <span className="text-[11px] text-slate-400 font-medium">الشهر: {b.month}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isOver ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                        <AlertTriangle className="w-3 h-3" /> تجاوز الميزانية
                      </span>
                    ) : isWarning ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                        <Clock className="w-3 h-3" /> قارب على الانتهاء ({percent}%)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3" /> ممتاز (ضمن المخطط)
                      </span>
                    )}

                    <button
                      onClick={() => handleDeleteBudget(b)}
                      title="إزالة الميزانية"
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* شريط التقدم */}
                <div className="space-y-1.5 my-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-600">
                      المصروف: {formatCurrency(spentInBase, baseCurrency)}
                    </span>
                    <span
                      className={`font-bold font-mono ${
                        isOver
                          ? 'text-rose-600'
                          : isWarning
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {percent}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, percent)}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-500">
                    الحد الأقصى: {formatCurrency(b.amount, b.currency)}
                  </span>
                  <span className="font-bold text-slate-900 font-mono">
                    {isOver ? (
                      <span className="text-rose-600 font-bold">
                        تجاوز بـ +{formatCurrency(spentInBase - limitInBase, baseCurrency)}
                      </span>
                    ) : (
                      <span>متبقي {formatCurrency(remaining, baseCurrency)}</span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* نافذة تحديد ميزانية جديدة */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="تحديد ميزانية شهرية لتصنيف"
      >
        <form onSubmit={handleSaveBudget} className="space-y-4" dir="rtl">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 rounded-xl border border-rose-200 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              التصنيف *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
            >
              <option value="">اختر التصنيف</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الحد الأقصى للميزانية *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1500.00"
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
              حفظ الميزانية
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
