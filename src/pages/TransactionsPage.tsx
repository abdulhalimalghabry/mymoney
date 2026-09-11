import React, { useState, useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { useAuth } from '../contexts/AuthContext';
import { deleteTransaction } from '../services/financialService';
import { Transaction, TransactionType } from '../types';
import { formatCurrency } from '../utils/currencies';
import { exportTransactionsToCSV } from '../utils/export';
import { QuickAddModal } from '../components/common/QuickAddModal';
import { EmptyState } from '../components/common/EmptyState';
import {
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Search,
  Trash2,
  Plus,
  PiggyBank,
  TrendingUp,
  Scale,
} from 'lucide-react';

export function TransactionsPage() {
  const { currentUser } = useAuth();
  const { transactions, accounts, categories, baseCurrency, toBaseCurrency } = useFinance();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');
  const [showAddModal, setShowAddModal] = useState(false);

  // التصفية والفرز
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        if (filterType !== 'all' && t.type !== filterType) return false;
        if (filterAccount !== 'all' && t.accountId !== filterAccount && t.toAccountId !== filterAccount) {
          return false;
        }
        if (filterCategory !== 'all' && t.category !== filterCategory) return false;
        if (startDate && t.date < startDate) return false;
        if (endDate && t.date > endDate) return false;
        if (search) {
          const q = search.toLowerCase();
          const descMatch = t.description?.toLowerCase().includes(q);
          const notesMatch = t.notes?.toLowerCase().includes(q);
          const catMatch = t.category.toLowerCase().includes(q);
          if (!descMatch && !notesMatch && !catMatch) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (sortBy === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
        if (sortBy === 'amount-desc') return b.amount - a.amount;
        if (sortBy === 'amount-asc') return a.amount - b.amount;
        return 0;
      });
  }, [transactions, filterType, filterAccount, filterCategory, startDate, endDate, search, sortBy]);

  const handleDelete = async (tx: Transaction) => {
    if (!currentUser) return;
    if (
      window.confirm(
        `هل أنت متأكد من رغبتك في حذف هذه المعاملة بقيمة ${tx.amount} ${tx.currency}؟ سيتم تلقائياً التراجع عن تأثيرها في رصيد الحساب.`
      )
    ) {
      try {
        await deleteTransaction(currentUser.uid, tx);
      } catch (err) {
        console.error(err);
        alert('فشل حذف المعاملة.');
      }
    }
  };

  const handleExportCSV = () => {
    exportTransactionsToCSV(filteredTransactions, accounts, `سجل_المعاملات_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const getAccountName = (accId?: string) => {
    if (!accId) return '-';
    const acc = accounts.find((a) => a.id === accId);
    return acc ? acc.name : 'حساب غير معروف';
  };

  const getTypeBadge = (type: TransactionType) => {
    switch (type) {
      case 'income':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <ArrowDownLeft className="w-3 h-3" /> دخل
          </span>
        );
      case 'expense':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
            <ArrowUpRight className="w-3 h-3" /> مصروف
          </span>
        );
      case 'transfer':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
            <ArrowLeftRight className="w-3 h-3" /> تحويل
          </span>
        );
      case 'saving':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
            <PiggyBank className="w-3 h-3" /> ادخار
          </span>
        );
      case 'investment':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <TrendingUp className="w-3 h-3" /> استثمار
          </span>
        );
      case 'debt_payment':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
            <Scale className="w-3 h-3" /> سداد دين
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* ترويسة الصفحة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            سجل المعاملات المالية
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            سجل فوري وشامل لجميع عمليات الإيرادات، المصروفات، التحويلات وسداد الالتزامات
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            disabled={filteredTransactions.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-all shadow-xs disabled:opacity-40 cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            تصدير CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            معاملة جديدة
          </button>
        </div>
      </div>

      {/* شريط الفلاتر والبحث */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* البحث */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="ابحث في الوصف أو الملاحظات..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* نوع المعاملة */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
          >
            <option value="all">جميع الأنواع</option>
            <option value="expense">المصروفات فقط</option>
            <option value="income">الإيرادات والدخل فقط</option>
            <option value="transfer">التحويلات بين الحسابات</option>
            <option value="saving">إيداعات الادخار</option>
            <option value="investment">الاستثمارات</option>
            <option value="debt_payment">سداد الديون والالتزامات</option>
          </select>

          {/* تصفية الحساب */}
          <select
            value={filterAccount}
            onChange={(e) => setFilterAccount(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
          >
            <option value="all">جميع الحسابات</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          {/* تصفية الفئة */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
          >
            <option value="all">جميع التصنيفات</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          {/* الترتيب */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
          >
            <option value="date-desc">الأحدث تاريخاً أولاً</option>
            <option value="date-asc">الأقدم تاريخاً أولاً</option>
            <option value="amount-desc">الأعلى قيمة</option>
            <option value="amount-asc">الأقل قيمة</option>
          </select>
        </div>

        {/* نطاق التاريخ */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs text-slate-600 font-medium">
          <span className="font-bold text-slate-800">الفترة الزمنية:</span>
          <div className="flex items-center gap-1.5">
            <span>من</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span>إلى</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
            />
          </div>
          {(startDate || endDate || search || filterType !== 'all' || filterAccount !== 'all' || filterCategory !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setFilterType('all');
                setFilterAccount('all');
                setFilterCategory('all');
                setStartDate('');
                setEndDate('');
              }}
              className="text-emerald-700 hover:text-emerald-800 font-bold mr-auto cursor-pointer"
            >
              إعادة ضبط الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* جدول المعاملات */}
      {filteredTransactions.length === 0 ? (
        <EmptyState
          id="transactions-empty"
          icon={ArrowLeftRight}
          title="لم يتم العثور على معاملات"
          description="لا توجد معاملات تطابق شروط البحث أو الفلاتر المحددة."
          actionLabel="تسجيل معاملة جديدة"
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">التاريخ</th>
                  <th className="py-3 px-4">النوع</th>
                  <th className="py-3 px-4">التصنيف</th>
                  <th className="py-3 px-4">الحساب</th>
                  <th className="py-3 px-4">الوصف والبيان</th>
                  <th className="py-3 px-4 text-left">المبلغ</th>
                  <th className="py-3 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredTransactions.map((tx) => {
                  const isPositive = tx.type === 'income';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-500">
                        {tx.date}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">{getTypeBadge(tx.type)}</td>
                      <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-900">
                        {tx.category}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                        {tx.type === 'transfer' ? (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span>{getAccountName(tx.accountId)}</span>
                            <span className="text-slate-400">←</span>
                            <span>{getAccountName(tx.toAccountId)}</span>
                          </div>
                        ) : (
                          getAccountName(tx.accountId)
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-600">
                        {tx.description || tx.notes || '-'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-left font-bold text-sm font-mono" dir="ltr">
                        <span
                          className={
                            isPositive
                              ? 'text-emerald-600'
                              : tx.type === 'transfer'
                              ? 'text-blue-600'
                              : 'text-slate-900'
                          }
                        >
                          {isPositive ? '+' : tx.type === 'transfer' ? '⇄ ' : '- '}
                          {formatCurrency(tx.amount, tx.currency)}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleDelete(tx)}
                          title="حذف المعاملة وإرجاع الرصيد تلقائياً"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-600 flex items-center justify-between font-medium">
            <span>عدد المعاملات المعروضة: {filteredTransactions.length}</span>
            <span className="font-bold text-slate-800 font-mono">
              إجمالي المعروض بالعملة الأساسية: {formatCurrency(
                filteredTransactions.reduce(
                  (sum, t) => sum + (t.type === 'income' ? 1 : -1) * toBaseCurrency(t.amount, t.currency),
                  0
                ),
                baseCurrency
              )}
            </span>
          </div>
        </div>
      )}

      <QuickAddModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
    </div>
  );
}
