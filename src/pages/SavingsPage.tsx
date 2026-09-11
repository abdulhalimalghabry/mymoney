import React, { useState } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { useAuth } from '../contexts/AuthContext';
import {
  addSavingsGoal,
  contributeToGoal,
  deleteSavingsGoal,
} from '../services/financialService';
import { Currency, SavingsGoal } from '../types';
import { formatCurrency, SUPPORTED_CURRENCIES } from '../utils/currencies';
import { StatCard } from '../components/common/StatCard';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import {
  PiggyBank,
  Plus,
  Trash2,
  CheckCircle2,
  TrendingUp,
  Loader2,
} from 'lucide-react';

export function SavingsPage() {
  const { currentUser } = useAuth();
  const { savingsGoals, accounts, baseCurrency, toBaseCurrency } = useFinance();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);

  // حالات إنشاء هدف جديد
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [initialAmount, setInitialAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>(baseCurrency);
  const [targetDate, setTargetDate] = useState('');
  const [category, setCategory] = useState('صندوق طوارئ');

  // حالات الإيداع في هدف
  const [depositAmount, setDepositAmount] = useState('');
  const [depositAccountId, setDepositAccountId] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // إحصاءات عامة
  const totalSavedInBase = savingsGoals.reduce(
    (sum, g) => sum + toBaseCurrency(g.currentAmount, g.currency),
    0
  );
  const totalTargetInBase = savingsGoals.reduce(
    (sum, g) => sum + toBaseCurrency(g.targetAmount, g.currency),
    0
  );
  const overallProgress =
    totalTargetInBase > 0 ? Math.round((totalSavedInBase / totalTargetInBase) * 100) : 0;

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setError(null);

    const target = parseFloat(targetAmount);
    if (isNaN(target) || target <= 0) {
      setError('يرجى إدخال مبلغ مستهدف صحيح أكبر من 0');
      return;
    }
    const current = parseFloat(initialAmount) || 0;

    setSubmitting(true);
    try {
      await addSavingsGoal(currentUser.uid, {
        goalName: goalName.trim(),
        targetAmount: target,
        currentAmount: current,
        currency,
        targetDate: targetDate || '',
        category,
        status: current >= target ? 'completed' : 'in_progress',
      });

      setShowAddModal(false);
      setGoalName('');
      setTargetAmount('');
      setInitialAmount('');
    } catch (err) {
      console.error(err);
      setError('تعذر إنشاء هدف الادخار.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedGoal) return;
    setError(null);

    const num = parseFloat(depositAmount);
    if (isNaN(num) || num <= 0) {
      setError('يرجى إدخال مبلغ إيداع صحيح أكبر من 0');
      return;
    }
    if (!depositAccountId) {
      setError('يرجى اختيار الحساب المراد خصم الإيداع منه');
      return;
    }

    const sourceAcc = accounts.find((a) => a.id === depositAccountId);
    if (sourceAcc && sourceAcc.currentBalance < num) {
      setError(`تنبيه: رصيد الحساب المالي هو ${sourceAcc.currentBalance.toLocaleString()} ${sourceAcc.currency} فقط`);
    }

    setSubmitting(true);
    try {
      await contributeToGoal(currentUser.uid, selectedGoal.id, num, depositAccountId);
      setShowDepositModal(false);
      setDepositAmount('');
      setSelectedGoal(null);
    } catch (err) {
      console.error(err);
      setError('فشلت عملية الإيداع في الهدف.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGoal = async (g: SavingsGoal) => {
    if (!currentUser) return;
    if (window.confirm(`هل أنت متأكد من حذف هدف الادخار "${g.goalName}"؟`)) {
      try {
        await deleteSavingsGoal(currentUser.uid, g.id);
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
            أهداف الادخار وصناديق التوفير
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            تحديد أهداف مالية مستقبلية، متابعة نسب الإنجاز وبناء رأس مال الأمان
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
          إنشاء هدف جديد
        </button>
      </div>

      {/* بطاقات الإحصاءات */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          id="stat-savings-accumulated"
          title="إجمالي المبالغ المدخرة"
          amount={formatCurrency(totalSavedInBase, baseCurrency)}
          subtitle="مجموع كل الأهداف المحققة حتى الآن"
          icon={PiggyBank}
          colorClass="bg-indigo-100 text-indigo-700"
        />
        <StatCard
          id="stat-savings-target"
          title="المستهدف الكلي للأهداف"
          amount={formatCurrency(totalTargetInBase, baseCurrency)}
          subtitle={`${savingsGoals.length} أهداف ادخارية مسجلة`}
          icon={TrendingUp}
          colorClass="bg-blue-100 text-blue-700"
        />
        <StatCard
          id="stat-savings-completion"
          title="نسبة الإنجاز الإجمالية"
          amount={`${overallProgress}%`}
          subtitle={
            overallProgress >= 100 ? 'تم تحقيق كل الأهداف بنجاح 🎉' : `متبقي ${100 - overallProgress}% للوصول للهدف الكامل`
          }
          icon={CheckCircle2}
          colorClass="bg-emerald-100 text-emerald-700"
        />
      </div>

      {/* شبكة أهداف الادخار */}
      {savingsGoals.length === 0 ? (
        <EmptyState
          id="savings-empty"
          icon={PiggyBank}
          title="لم تنشئ أهداف ادخار حتى الآن"
          description="ابنِ أمانك المالي بإنشاء صندوق طوارئ، ادخار لشراء سيارة، أو دفعة أولى لمنزل الأحلام."
          actionLabel="إنشاء أول هدف ادخاري"
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {savingsGoals.map((g) => {
            const pct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100) || 0);
            const remaining = Math.max(0, g.targetAmount - g.currentAmount);
            const isFinished = pct >= 100 || g.status === 'completed';

            return (
              <div
                key={g.id}
                className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700">
                        <PiggyBank className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-900 leading-tight">
                          {g.goalName}
                        </h4>
                        <span className="text-[11px] text-slate-400 font-medium">{g.category}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteGoal(g)}
                      title="حذف الهدف"
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* شريط التقدم */}
                  <div className="my-4">
                    <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                      <span className="text-slate-600">نسبة التقدم</span>
                      <span
                        className={`font-bold font-mono ${
                          isFinished ? 'text-emerald-600' : 'text-indigo-600'
                        }`}
                      >
                        {pct}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isFinished ? 'bg-emerald-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs font-medium">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">المدخر حالياً:</span>
                      <span className="font-bold text-slate-900 font-mono">
                        {formatCurrency(g.currentAmount, g.currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">المستهدف:</span>
                      <span className="font-bold text-slate-800 font-mono">
                        {formatCurrency(g.targetAmount, g.currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">المتبقي للإنجاز:</span>
                      <span className="font-bold text-emerald-700 font-mono">
                        {isFinished ? 'اكتمل بنجاح 🎉' : formatCurrency(remaining, g.currency)}
                      </span>
                    </div>
                    {g.targetDate && (
                      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                        <span>الموعد المستهدف:</span>
                        <span>{g.targetDate}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      isFinished
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    {isFinished ? 'مكتمل' : 'قيد الادخار'}
                  </span>

                  <button
                    onClick={() => {
                      setSelectedGoal(g);
                      setDepositAmount('');
                      setError(null);
                      setShowDepositModal(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    إيداع مبلغ
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* نافذة إنشاء هدف ادخار جديد */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="إنشاء هدف ادخاري جديد"
      >
        <form onSubmit={handleCreateGoal} className="space-y-4" dir="rtl">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 rounded-xl border border-rose-200 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              اسم الهدف الادخاري *
            </label>
            <input
              type="text"
              required
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              placeholder="مثال: صندوق الطوارئ، سيارة جديدة، دفعة أولى للمنزل..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                نوع أو تصنيف الهدف
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
              >
                <option value="صندوق طوارئ">صندوق طوارئ</option>
                <option value="شراء سيارة">شراء سيارة</option>
                <option value="دفعة منزل أو عقار">دفعة منزل أو عقار</option>
                <option value="سياحة وسفر">سياحة وسفر</option>
                <option value="صندوق استثماري">صندوق استثماري</option>
                <option value="تعليم وتطوير">تعليم وتطوير</option>
                <option value="هدف آخر">هدف آخر</option>
              </select>
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
                المبلغ المستهدف الوصول إليه *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="50000.00"
                className="w-full px-3 py-2 text-base font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                المبلغ المتوفر حالياً (رصيد بدائي)
              </label>
              <input
                type="number"
                step="0.01"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-base font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              تاريخ الإنجاز المستهدف (اختياري)
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
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
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              حفظ الهدف
            </button>
          </div>
        </form>
      </Modal>

      {/* نافذة إيداع مبلغ في هدف ادخاري */}
      <Modal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        title={`إيداع مبلغ في: ${selectedGoal?.goalName || 'الهدف'}`}
      >
        <form onSubmit={handleDeposit} className="space-y-4" dir="rtl">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 rounded-xl border border-rose-200 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              مبلغ الإيداع ({selectedGoal?.currency}) *
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 text-base font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              الحساب المالي المخصوم منه المبلغ *
            </label>
            <select
              required
              value={depositAccountId}
              onChange={(e) => setDepositAccountId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
            >
              <option value="">اختر الحساب</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.currentBalance.toLocaleString()} {acc.currency})
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 font-medium">
            سيتم خصم هذا المبلغ من الحساب المالي المختار وإضافته فوراً لرصيد هدفك الادخاري وتسجيل معاملة إيداع ادخار.
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowDepositModal(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              تأكيد الإيداع
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
