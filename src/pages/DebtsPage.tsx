import React, { useState, useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { useAuth } from '../contexts/AuthContext';
import { addDebt, updateDebt, recordDebtPayment, deleteDebt } from '../services/financialService';
import { Currency, Debt, DebtType, DebtStatus } from '../types';
import { formatCurrency, SUPPORTED_CURRENCIES } from '../utils/currencies';
import { StatCard } from '../components/common/StatCard';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import {
  Scale,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
} from 'lucide-react';

export function DebtsPage() {
  const { currentUser } = useAuth();
  const { debts, accounts, baseCurrency, toBaseCurrency } = useFinance();

  const [activeTab, setActiveTab] = useState<'all' | 'borrowed' | 'lent'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);

  // حالات تسجيل دين جديد
  const [personOrOrg, setPersonOrOrg] = useState('');
  const [type, setType] = useState<DebtType>('borrowed');
  const [totalAmount, setTotalAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('0');
  const [currency, setCurrency] = useState<Currency>(baseCurrency);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  // حالات تعديل دين قائم
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [editPersonOrOrg, setEditPersonOrOrg] = useState('');
  const [editType, setEditType] = useState<DebtType>('borrowed');
  const [editTotalAmount, setEditTotalAmount] = useState('');
  const [editPaidAmount, setEditPaidAmount] = useState('0');
  const [editCurrency, setEditCurrency] = useState<Currency>(baseCurrency);
  const [editDueDate, setEditDueDate] = useState('');
  const [editStatus, setEditStatus] = useState<DebtStatus>('pending');
  const [editNotes, setEditNotes] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // حالات حذف دين مع نافذة تأكيد داخلية
  const [debtToDelete, setDebtToDelete] = useState<Debt | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // حالات سداد دين
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ملخص إجمالي بالعملة الأساسية
  const totalIOwe = useMemo(() => {
    return debts
      .filter((d) => d.type === 'borrowed' && d.status !== 'paid')
      .reduce((sum, d) => sum + toBaseCurrency(d.remainingAmount, d.currency), 0);
  }, [debts, toBaseCurrency]);

  const totalOwedToMe = useMemo(() => {
    return debts
      .filter((d) => d.type === 'lent' && d.status !== 'paid')
      .reduce((sum, d) => sum + toBaseCurrency(d.remainingAmount, d.currency), 0);
  }, [debts, toBaseCurrency]);

  const netDebtPosition = totalOwedToMe - totalIOwe;

  const filteredDebts = useMemo(() => {
    if (activeTab === 'borrowed') return debts.filter((d) => d.type === 'borrowed');
    if (activeTab === 'lent') return debts.filter((d) => d.type === 'lent');
    return debts;
  }, [debts, activeTab]);

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setError(null);

    const total = parseFloat(totalAmount);
    const paid = parseFloat(paidAmount) || 0;
    if (isNaN(total) || total <= 0) {
      setError('يرجى إدخال إجمالي مبلغ صحيح أكبر من 0');
      return;
    }

    setSubmitting(true);
    try {
      await addDebt(currentUser.uid, {
        personOrOrg: personOrOrg.trim(),
        type,
        totalAmount: total,
        paidAmount: paid,
        currency,
        dueDate: dueDate || '',
        status: paid >= total ? 'paid' : paid > 0 ? 'partially_paid' : 'pending',
        notes: notes.trim() || '',
      });

      setShowAddModal(false);
      setPersonOrOrg('');
      setTotalAmount('');
      setPaidAmount('0');
      setDueDate('');
      setNotes('');
    } catch (err) {
      console.error(err);
      setError('تعذر تسجيل الدين.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedDebt) return;
    setError(null);

    const num = parseFloat(paymentAmount);
    if (isNaN(num) || num <= 0) {
      setError('يرجى إدخال مبلغ سداد صحيح أكبر من 0');
      return;
    }

    if (num > selectedDebt.remainingAmount) {
      setError(`المبلغ المدخل يتجاوز المتبقي من الدين (${selectedDebt.remainingAmount.toLocaleString()} ${selectedDebt.currency})`);
      return;
    }

    setSubmitting(true);
    try {
      await recordDebtPayment(
        currentUser.uid,
        selectedDebt.id,
        num,
        paymentAccountId || undefined
      );
      setShowPaymentModal(false);
      setPaymentAmount('');
      setSelectedDebt(null);
    } catch (err) {
      console.error(err);
      setError('تعذر تسجيل عملية السداد.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (d: Debt) => {
    setEditingDebt(d);
    setEditPersonOrOrg(d.personOrOrg);
    setEditType(d.type);
    setEditTotalAmount(d.totalAmount.toString());
    setEditPaidAmount(d.paidAmount.toString());
    setEditCurrency(d.currency);
    setEditDueDate(d.dueDate || '');
    setEditStatus(d.status);
    setEditNotes(d.notes || '');
    setEditError(null);
  };

  const handleUpdateDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !editingDebt) return;
    setEditError(null);

    const total = parseFloat(editTotalAmount);
    const paid = parseFloat(editPaidAmount) || 0;
    if (isNaN(total) || total <= 0) {
      setEditError('يرجى إدخال إجمالي مبلغ صحيح أكبر من 0');
      return;
    }
    if (paid < 0) {
      setEditError('المبلغ المسدد لا يمكن أن يكون سالباً');
      return;
    }

    setSubmitting(true);
    try {
      const remaining = Math.max(0, total - paid);
      let status: DebtStatus = editStatus;
      if (remaining === 0) status = 'paid';
      else if (paid > 0) status = 'partially_paid';
      else status = 'pending';

      await updateDebt(currentUser.uid, editingDebt.id, {
        personOrOrg: editPersonOrOrg.trim(),
        type: editType,
        totalAmount: total,
        paidAmount: paid,
        remainingAmount: remaining,
        currency: editCurrency,
        dueDate: editDueDate || '',
        status,
        notes: editNotes.trim() || '',
      });

      setEditingDebt(null);
    } catch (err) {
      console.error(err);
      setEditError('تعذر تحديث بيانات الدين. يرجى المحاولة مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!currentUser || !debtToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteDebt(currentUser.uid, debtToDelete.id);
      setDebtToDelete(null);
    } catch (err: any) {
      console.error(err);
      setDeleteError('تعذر حذف سجل الدين. يرجى المحاولة مرة أخرى.');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: DebtStatus) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> تم السداد بالكامل
          </span>
        );
      case 'partially_paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3" /> سداد جزئي
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
            <AlertTriangle className="w-3 h-3" /> مستحق السداد
          </span>
        );
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* ترويسة الصفحة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            الديون والالتزامات المالية
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            إدارة الديون المستحقة عليك للآخرين والأموال المستحقة لك، ومتابعة مواعيد السداد
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
          تسجيل دين جديد
        </button>
      </div>

      {/* بطاقات النظرة العامة */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          id="stat-total-i-owe"
          title="ديون عليّ (التزامات للآخرين)"
          amount={formatCurrency(totalIOwe, baseCurrency)}
          subtitle="مبالغ مستحقة الدفع للبنوك أو الأشخاص"
          icon={ArrowUpRight}
          colorClass="bg-rose-100 text-rose-700"
        />
        <StatCard
          id="stat-total-owed-to-me"
          title="أموال لي (مستحقات عند الآخرين)"
          amount={formatCurrency(totalOwedToMe, baseCurrency)}
          subtitle="مبالغ متوقع تحصيلها واستردادها"
          icon={ArrowDownLeft}
          colorClass="bg-emerald-100 text-emerald-700"
        />
        <StatCard
          id="stat-net-debt"
          title="صافي المركز المالي للديون"
          amount={`${netDebtPosition >= 0 ? '+' : ''}${formatCurrency(
            netDebtPosition,
            baseCurrency
          )}`}
          subtitle={
            netDebtPosition >= 0
              ? 'إيجابي: ما لك أكثر مما عليك'
              : 'سلبي: ما عليك أكثر مما لك'
          }
          icon={Scale}
          colorClass={
            netDebtPosition >= 0
              ? 'bg-blue-100 text-blue-700'
              : 'bg-amber-100 text-amber-700'
          }
        />
      </div>

      {/* التبويبات الفلترة */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          كل السجلات ({debts.length})
        </button>
        <button
          onClick={() => setActiveTab('borrowed')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'borrowed'
              ? 'bg-rose-50 text-rose-800 shadow-xs border border-rose-200'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          ديون عليّ ({debts.filter((d) => d.type === 'borrowed').length})
        </button>
        <button
          onClick={() => setActiveTab('lent')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'lent'
              ? 'bg-emerald-50 text-emerald-800 shadow-xs border border-emerald-200'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          أموال لي ({debts.filter((d) => d.type === 'lent').length})
        </button>
      </div>

      {/* قائمة السجلات */}
      {filteredDebts.length === 0 ? (
        <EmptyState
          id="debts-empty"
          icon={Scale}
          title="لا توجد سجلات ديون في هذا التبويب"
          description="سجل الديون أو السلف المالية لضمان التتبع الدقيق ومواعيد السداد دون نسيان."
          actionLabel="تسجيل دين جديد"
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDebts.map((d) => {
            const isBorrowed = d.type === 'borrowed';
            const progress =
              d.totalAmount > 0 ? Math.round((d.paidAmount / d.totalAmount) * 100) : 0;
            const isPaid = d.status === 'paid' || d.remainingAmount === 0;

            const isOverdue =
              !isPaid && d.dueDate && new Date(d.dueDate).getTime() < new Date().getTime();

            return (
              <div
                key={d.id}
                className={`p-5 rounded-2xl bg-white border transition-all shadow-xs flex flex-col justify-between ${
                  isOverdue
                    ? 'border-rose-300 ring-1 ring-rose-500/20'
                    : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md ${
                          isBorrowed
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isBorrowed ? 'دين عليّ (مستحق دفعه)' : 'أموال لي (مستحق تحصيله)'}
                      </span>
                      <h4 className="text-base font-bold text-slate-900 mt-1.5">
                        {d.personOrOrg}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        id={`debt-edit-${d.id}`}
                        onClick={() => handleStartEdit(d)}
                        title="تعديل سجل الدين"
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        id={`debt-delete-${d.id}`}
                        onClick={() => {
                          setDeleteError(null);
                          setDebtToDelete(d);
                        }}
                        title="حذف سجل الدين"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="my-3 space-y-1 text-xs font-medium">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">إجمالي المبلغ:</span>
                      <span className="font-bold text-slate-800 font-mono">
                        {formatCurrency(d.totalAmount, d.currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">تم سداده حتى الآن:</span>
                      <span className="font-bold text-emerald-700 font-mono">
                        {formatCurrency(d.paidAmount, d.currency)} ({progress}%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="text-slate-500 font-bold">المتبقي:</span>
                      <span
                        className={`text-base font-bold font-mono ${
                          isPaid
                            ? 'text-emerald-700'
                            : isBorrowed
                            ? 'text-rose-600'
                            : 'text-blue-600'
                        }`}
                      >
                        {formatCurrency(d.remainingAmount, d.currency)}
                      </span>
                    </div>
                  </div>

                  {/* شريط التقدم للسداد */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isPaid ? 'bg-emerald-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {d.dueDate && (
                    <div className="text-[11px] flex items-center justify-between text-slate-500 font-medium">
                      <span>تاريخ الاستحقاق:</span>
                      <span className={isOverdue ? 'text-rose-600 font-bold font-mono' : 'font-mono'}>
                        {d.dueDate} {isOverdue ? '(تجاوز الموعد!)' : ''}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                  {getStatusBadge(d.status)}

                  {!isPaid && (
                    <button
                      onClick={() => {
                        setSelectedDebt(d);
                        setPaymentAmount('');
                        setError(null);
                        setShowPaymentModal(true);
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs cursor-pointer"
                    >
                      تسجيل دفعة سداد
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* نافذة تسجيل دين جديد */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="تسجيل دين أو قرض جديد"
      >
        <form onSubmit={handleAddDebt} className="space-y-4" dir="rtl">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 rounded-xl border border-rose-200 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              اسم الشخص أو الجهة المعنية *
            </label>
            <input
              type="text"
              required
              value={personOrOrg}
              onChange={(e) => setPersonOrOrg(e.target.value)}
              placeholder="مثال: البنك الأهلي، محمد، مالك العقار..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                نوع الالتزام *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as DebtType)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
              >
                <option value="borrowed">دين عليّ (مستحق دفعه للآخرين)</option>
                <option value="lent">أموال لي (مستحق استردادها من الآخرين)</option>
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
                إجمالي مبلغ الدين *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="5000.00"
                className="w-full px-3 py-2 text-base font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                المبلغ المسدد مسبقاً (إن وجد)
              </label>
              <input
                type="number"
                step="0.01"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-base font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              تاريخ الاستحقاق (اختياري)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ملاحظات أو شروط إضافية
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="شروط الاتفاق، دفعات شهرية، إلخ..."
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
              حفظ سجل الدين
            </button>
          </div>
        </form>
      </Modal>

      {/* نافذة تسجيل دفعة سداد */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title={`تسجيل دفعة سداد: ${selectedDebt?.personOrOrg || 'الدين'}`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4" dir="rtl">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 rounded-xl border border-rose-200 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              مبلغ الدفعة ({selectedDebt?.currency}) * (المتبقي:{' '}
              {selectedDebt?.remainingAmount.toLocaleString()})
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 text-base font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ربط بحساب مالي (اختياري لتعديل رصيدك تلقائياً)
            </label>
            <select
              value={paymentAccountId}
              onChange={(e) => setPaymentAccountId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
            >
              <option value="">عدم تعديل رصيد أي حساب مالي</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.currentBalance.toLocaleString()} {acc.currency})
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 font-medium">
            {selectedDebt?.type === 'borrowed'
              ? 'سيؤدي هذا إلى خفض الدين المستحق عليك وخصم المبلغ من الحساب المالي المحدد.'
              : 'سيؤدي هذا إلى تقليل المستحق لك وإيداع المبلغ في حسابك المالي المحدد.'}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowPaymentModal(false)}
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
              تأكيد السداد
            </button>
          </div>
        </form>
      </Modal>

      {/* نافذة تعديل سجل الدين */}
      <Modal
        isOpen={!!editingDebt}
        onClose={() => {
          if (!submitting) setEditingDebt(null);
        }}
        title={`تعديل سجل الدين: ${editingDebt?.personOrOrg || ''}`}
      >
        <form onSubmit={handleUpdateDebt} className="space-y-4" dir="rtl">
          {editError && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 rounded-xl border border-rose-200 font-medium">
              {editError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              اسم الشخص أو الجهة المعنية *
            </label>
            <input
              type="text"
              required
              value={editPersonOrOrg}
              onChange={(e) => setEditPersonOrOrg(e.target.value)}
              placeholder="مثال: البنك الأهلي، محمد، مالك العقار..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                نوع الالتزام *
              </label>
              <select
                value={editType}
                onChange={(e) => setEditType(e.target.value as DebtType)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
              >
                <option value="borrowed">دين عليّ (مستحق دفعه للآخرين)</option>
                <option value="lent">أموال لي (مستحق استردادها من الآخرين)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                العملة *
              </label>
              <select
                value={editCurrency}
                onChange={(e) => setEditCurrency(e.target.value as Currency)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} - {c.name} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                إجمالي المبلغ *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={editTotalAmount}
                onChange={(e) => setEditTotalAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                المبلغ المسدد حتى الآن
              </label>
              <input
                type="number"
                step="0.01"
                value={editPaidAmount}
                onChange={(e) => setEditPaidAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تاريخ الاستحقاق (اختياري)
              </label>
              <input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                حالة الدين
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as DebtStatus)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
              >
                <option value="pending">مستحق السداد (معلق)</option>
                <option value="partially_paid">مسدد جزئياً</option>
                <option value="paid">تم السداد بالكامل</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ملاحظات أو شروط إضافية
            </label>
            <input
              type="text"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="شروط الاتفاق، دفعات شهرية، إلخ..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setEditingDebt(null)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              حفظ التعديلات
            </button>
          </div>
        </form>
      </Modal>

      {/* نافذة تأكيد حذف سجل الدين */}
      <Modal
        isOpen={!!debtToDelete}
        onClose={() => {
          if (!deleting) setDebtToDelete(null);
        }}
        title="تأكيد حذف سجل الدين"
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
                هل أنت متأكد من رغبتك في حذف هذا السجل؟
              </p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                سيتم حذف سجل الدين الخاص بـ{' '}
                <strong className="text-slate-900 font-semibold">{debtToDelete?.personOrOrg}</strong>{' '}
                بمبلغ{' '}
                <span className="font-bold font-mono">
                  {debtToDelete && formatCurrency(debtToDelete.totalAmount, debtToDelete.currency)}
                </span>
                . هذا الإجراء نهائي ولا يمكن التراجع عنه.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              id="cancel-delete-debt-btn"
              disabled={deleting}
              onClick={() => setDebtToDelete(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="button"
              id="confirm-delete-debt-btn"
              disabled={deleting}
              onClick={handleConfirmDelete}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 disabled:opacity-50 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              نعم، حذف سجل الدين
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
