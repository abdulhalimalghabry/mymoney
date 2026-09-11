import React, { useState } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { useAuth } from '../contexts/AuthContext';
import {
  addInvestment,
  updateInvestment,
  deleteInvestment,
} from '../services/financialService';
import { Currency, Investment, InvestmentType } from '../types';
import { formatCurrency, SUPPORTED_CURRENCIES } from '../utils/currencies';
import { StatCard } from '../components/common/StatCard';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import {
  TrendingUp,
  Plus,
  Trash2,
  Edit2,
  DollarSign,
  Percent,
  Layers,
  Loader2,
  Coins,
  Building,
  CandlestickChart,
  Briefcase,
} from 'lucide-react';

const INVESTMENT_TYPE_LABELS: Record<InvestmentType, string> = {
  stocks: 'أسهم وصناديق مؤشرات',
  crypto: 'عملات رقمية مشفرة',
  real_estate: 'عقارات وأراضٍ',
  gold: 'ذهب ومعادن ثمينة',
  mutual_funds: 'صناديق استثمارية',
  business: 'مشاريع وشركات خاصة',
  other: 'أصول واستثمارات أخرى',
};

export function InvestmentsPage() {
  const { currentUser } = useAuth();
  const { investments, accounts, baseCurrency, toBaseCurrency } = useFinance();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingInv, setEditingInv] = useState<Investment | null>(null);

  // حالات النموذج
  const [name, setName] = useState('');
  const [type, setType] = useState<InvestmentType>('stocks');
  const [amountInvested, setAmountInvested] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [currency, setCurrency] = useState<Currency>(baseCurrency);
  const [platform, setPlatform] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // نافذة تحديث القيمة السوقية الحالية
  const [quickUpdateInv, setQuickUpdateInv] = useState<Investment | null>(null);
  const [newVal, setNewVal] = useState('');

  // الحسابات الإجمالية بالعملة الأساسية
  const totalInvestedInBase = investments.reduce(
    (sum, inv) => sum + toBaseCurrency(inv.amountInvested, inv.currency),
    0
  );
  const totalCurrentValInBase = investments.reduce(
    (sum, inv) => sum + toBaseCurrency(inv.currentValue, inv.currency),
    0
  );
  const totalProfitLoss = totalCurrentValInBase - totalInvestedInBase;
  const overallROI =
    totalInvestedInBase > 0
      ? ((totalProfitLoss / totalInvestedInBase) * 100).toFixed(2)
      : '0.00';

  const handleSaveInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setError(null);

    const invested = parseFloat(amountInvested);
    const current = parseFloat(currentValue || amountInvested);
    if (isNaN(invested) || invested <= 0) {
      setError('يرجى إدخال مبلغ استثمار صحيح أكبر من 0');
      return;
    }

    setSubmitting(true);
    try {
      if (editingInv) {
        await updateInvestment(currentUser.uid, editingInv.id, {
          investmentName: name.trim(),
          type,
          amountInvested: invested,
          currentValue: current,
          currency,
          platform: platform.trim() || '',
          date,
          notes: notes.trim() || '',
        });
      } else {
        await addInvestment(
          currentUser.uid,
          {
            investmentName: name.trim(),
            type,
            amountInvested: invested,
            currentValue: current,
            currency,
            platform: platform.trim() || '',
            date,
            notes: notes.trim() || '',
          },
          sourceAccountId || undefined
        );
      }

      setShowAddModal(false);
      setName('');
      setAmountInvested('');
      setCurrentValue('');
      setPlatform('');
      setNotes('');
      setSourceAccountId('');
    } catch (err) {
      console.error(err);
      setError('تعذر حفظ بيانات الأصل الاستثماري.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateValue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !quickUpdateInv) return;

    const num = parseFloat(newVal);
    if (isNaN(num) || num < 0) return;

    setSubmitting(true);
    try {
      await updateInvestment(currentUser.uid, quickUpdateInv.id, {
        currentValue: num,
      });
      setQuickUpdateInv(null);
      setNewVal('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (inv: Investment) => {
    if (!currentUser) return;
    if (window.confirm(`هل أنت متأكد من حذف سجل الأصل "${inv.investmentName}"؟`)) {
      try {
        await deleteInvestment(currentUser.uid, inv.id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const getTypeIcon = (t: InvestmentType) => {
    switch (t) {
      case 'stocks':
        return CandlestickChart;
      case 'crypto':
        return Coins;
      case 'real_estate':
        return Building;
      case 'gold':
        return DollarSign;
      default:
        return Briefcase;
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* ترويسة الصفحة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            محفظة الاستثمارات والأصول
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            متابعة الأسهم، العملات الرقمية، العقارات، الذهب والمشاريع، وحساب العائد على الاستثمار
          </p>
        </div>

        <button
          onClick={() => {
            setEditingInv(null);
            setName('');
            setAmountInvested('');
            setCurrentValue('');
            setPlatform('');
            setNotes('');
            setSourceAccountId('');
            setError(null);
            setShowAddModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          إضافة أصل استثماري
        </button>
      </div>

      {/* بطاقات الإحصاءات */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          id="stat-total-invested"
          title="رأس المال المستثمر (التكلفة)"
          amount={formatCurrency(totalInvestedInBase, baseCurrency)}
          subtitle="مجموع تكلفة الشراء الأساسية"
          icon={Layers}
          colorClass="bg-slate-100 text-slate-700"
        />
        <StatCard
          id="stat-current-portfolio-val"
          title="القيمة السوقية الحالية"
          amount={formatCurrency(totalCurrentValInBase, baseCurrency)}
          subtitle="تقييم المحفظة بالأسعار الراهنة"
          icon={TrendingUp}
          colorClass="bg-blue-100 text-blue-700"
        />
        <StatCard
          id="stat-total-profit-loss"
          title="صافي الأرباح / الخسائر"
          amount={`${totalProfitLoss >= 0 ? '+' : ''}${formatCurrency(
            totalProfitLoss,
            baseCurrency
          )}`}
          subtitle="الربح غير المحقق"
          icon={DollarSign}
          colorClass={
            totalProfitLoss >= 0
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-rose-100 text-rose-700'
          }
        />
        <StatCard
          id="stat-total-roi"
          title="العائد على الاستثمار (ROI)"
          amount={`${Number(overallROI) >= 0 ? '+' : ''}${overallROI}%`}
          subtitle="نسبة العائد الإجمالية للمحفظة"
          icon={Percent}
          colorClass={
            Number(overallROI) >= 0
              ? 'bg-teal-100 text-teal-700'
              : 'bg-rose-100 text-rose-700'
          }
        />
      </div>

      {/* شبكة الأصول الاستثمارية */}
      {investments.length === 0 ? (
        <EmptyState
          id="investments-empty"
          icon={TrendingUp}
          title="لا توجد أصول استثمارية مسجلة"
          description="أضف أسهمك، عملاتك الرقمية، سبائك الذهب أو العقارات لمتابعة أدائها وحساب أرباحك دورياً."
          actionLabel="إضافة أول أصل استثماري"
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {investments.map((inv) => {
            const Icon = getTypeIcon(inv.type);
            const profitLoss = inv.currentValue - inv.amountInvested;
            const roi =
              inv.amountInvested > 0
                ? ((profitLoss / inv.amountInvested) * 100).toFixed(2)
                : '0.00';
            const isGain = profitLoss >= 0;

            return (
              <div
                key={inv.id}
                className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-900 leading-tight">
                          {inv.investmentName}
                        </h4>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {INVESTMENT_TYPE_LABELS[inv.type] || inv.type} • {inv.platform || 'مباشر'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingInv(inv);
                          setName(inv.investmentName);
                          setType(inv.type);
                          setAmountInvested(String(inv.amountInvested));
                          setCurrentValue(String(inv.currentValue));
                          setCurrency(inv.currency);
                          setPlatform(inv.platform || '');
                          setDate(inv.date || '');
                          setNotes(inv.notes || '');
                          setShowAddModal(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                        title="تعديل الأصل"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(inv)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                        title="حذف الأصل"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="my-3 p-3 rounded-xl bg-slate-50 space-y-2 text-xs font-medium">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">مبلغ الاستثمار الأصلي:</span>
                      <span className="font-bold text-slate-800 font-mono">
                        {formatCurrency(inv.amountInvested, inv.currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">القيمة الحالية:</span>
                      <span className="font-bold text-slate-900 font-mono">
                        {formatCurrency(inv.currentValue, inv.currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                      <span className="text-slate-500">الربح / الخسارة:</span>
                      <span
                        className={`font-bold font-mono ${
                          isGain ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {isGain ? '+' : ''}
                        {formatCurrency(profitLoss, inv.currency)} ({isGain ? '+' : ''}
                        {roi}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono">{inv.date}</span>
                  <button
                    onClick={() => {
                      setQuickUpdateInv(inv);
                      setNewVal(String(inv.currentValue));
                    }}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                  >
                    تحديث السعر الحالي ←
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* نافذة إضافة / تعديل أصل استثماري */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editingInv ? 'تعديل بيانات الأصل الاستثماري' : 'إضافة أصل استثماري جديد'}
      >
        <form onSubmit={handleSaveInvestment} className="space-y-4" dir="rtl">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 rounded-xl border border-rose-200 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              اسم الأصل الاستثماري *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: أسهم أرامكو (2222)، بيتكوين (BTC)، شقة دبي..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                نوع الأصل الاستثماري *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as InvestmentType)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
              >
                <option value="stocks">أسهم وصناديق مؤشرات</option>
                <option value="crypto">عملات رقمية مشفرة</option>
                <option value="real_estate">عقارات وأراضٍ</option>
                <option value="gold">ذهب ومعادن ثمينة</option>
                <option value="mutual_funds">صناديق استثمارية ومرابحة</option>
                <option value="business">مشاريع وحصص شركات خاصة</option>
                <option value="other">أصول واستثمارات أخرى</option>
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
                مبلغ الاستثمار (سعر الشراء الكلي) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={amountInvested}
                onChange={(e) => setAmountInvested(e.target.value)}
                placeholder="10000.00"
                className="w-full px-3 py-2 text-base font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                القيمة السوقية الحالية
              </label>
              <input
                type="number"
                step="0.01"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                placeholder="افتراضياً نفس مبلغ الشراء"
                className="w-full px-3 py-2 text-base font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                المنصة أو الوسيط
              </label>
              <input
                type="text"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                placeholder="مثال: دراية، بينانس، الراجحي كابيتال، مباشر..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تاريخ الشراء أو البدء
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          {!editingInv && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                خصم قيمة الشراء من حساب مالي (اختياري)
              </label>
              <select
                value={sourceAccountId}
                onChange={(e) => setSourceAccountId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
              >
                <option value="">لا تخصم من الحسابات (الأصل ممول مسبقاً)</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currentBalance.toLocaleString()} {acc.currency})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ملاحظات أو استراتيجية الاستثمار
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: استثمار طويل الأجل، توزيع أرباح سنوي..."
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
              {editingInv ? 'تحديث الأصل' : 'إضافة إلى المحفظة'}
            </button>
          </div>
        </form>
      </Modal>

      {/* نافذة التحديث السريع للقيمة السوقية */}
      <Modal
        isOpen={!!quickUpdateInv}
        onClose={() => setQuickUpdateInv(null)}
        title={`تحديث القيمة السوقية: ${quickUpdateInv?.investmentName || ''}`}
      >
        <form onSubmit={handleUpdateValue} className="space-y-4" dir="rtl">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              القيمة السوقية الجديدة ({quickUpdateInv?.currency}) *
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={newVal}
              onChange={(e) => setNewVal(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 text-base font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setQuickUpdateInv(null)}
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
              حفظ القيمة الجديدة
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
