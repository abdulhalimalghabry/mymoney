import React, { useMemo, useState } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { formatCurrency } from '../utils/currencies';
import { StatCard } from '../components/common/StatCard';
import { EmptyState } from '../components/common/EmptyState';
import { QuickAddModal } from '../components/common/QuickAddModal';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  PiggyBank,
  TrendingUp,
  Scale,
  DollarSign,
  AlertTriangle,
  ArrowLeft,
  Plus,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';

export function DashboardPage() {
  const {
    baseCurrency,
    totalBalance,
    monthlyIncome,
    monthlyExpenses,
    totalSavings,
    totalInvestments,
    totalDebts,
    netWorth,
    savingsGoals,
    transactions,
    selectedMonth,
    toBaseCurrency,
    alerts,
  } = useFinance();

  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // أحدث المعاملات (آخر 5 معاملات)
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions]);

  // مقارنة الدخل والمصروف لآخر 6 أشهر
  const monthlyComparisonData = useMemo(() => {
    const dataMap: Record<string, { month: string; income: number; expense: number }> = {};
    const d = new Date();

    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const key = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
      const label = targetDate.toLocaleString('ar-EG', { month: 'short' });
      dataMap[key] = { month: label, income: 0, expense: 0 };
    }

    transactions.forEach((tx) => {
      if (tx.date) {
        const key = tx.date.substring(0, 7);
        if (dataMap[key]) {
          const val = toBaseCurrency(tx.amount, tx.currency);
          if (tx.type === 'income') {
            dataMap[key].income += val;
          } else if (tx.type === 'expense') {
            dataMap[key].expense += val;
          }
        }
      }
    });

    return Object.values(dataMap);
  }, [transactions, toBaseCurrency]);

  // توزيع المصروفات حسب التصنيف للشهر المحدد
  const categoryExpensesData = useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter((t) => t.type === 'expense' && t.date.startsWith(selectedMonth))
      .forEach((t) => {
        const val = toBaseCurrency(t.amount, t.currency);
        map[t.category] = (map[t.category] || 0) + val;
      });

    const colors = [
      '#059669',
      '#2563EB',
      '#D97706',
      '#DC2626',
      '#7C3AED',
      '#DB2777',
      '#0891B2',
      '#0D9488',
      '#475569',
    ];

    return Object.entries(map)
      .map(([name, value], idx) => ({
        name,
        value,
        color: colors[idx % colors.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, selectedMonth, toBaseCurrency]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* شريط التنبيهات والتحذيرات إن وجدت */}
      {alerts.filter((a) => a.type === 'warning').length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">تنبيه مالي مهم: </span>
              {alerts.find((a) => a.type === 'warning')?.message}
            </div>
          </div>
          <Link
            to={alerts.find((a) => a.type === 'warning')?.link || '/budget'}
            className="shrink-0 font-bold underline hover:text-amber-950 flex items-center gap-1"
          >
            <span>التفاصيل</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* بطاقات الإحصائيات الرئيسية */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-700 tracking-wide">
            الملخص المالي الشامل ({baseCurrency})
          </h3>
          <span className="text-xs text-slate-500 font-medium">القيم محسوبة بالعملة الأساسية</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            id="stat-net-worth"
            title="صافي الثروة"
            amount={formatCurrency(netWorth, baseCurrency)}
            subtitle="الأصول مخصوماً منها الالتزامات"
            icon={DollarSign}
            colorClass="bg-emerald-100 text-emerald-700"
          />

          <StatCard
            id="stat-total-balance"
            title="إجمالي الأرصدة المتوفرة"
            amount={formatCurrency(totalBalance, baseCurrency)}
            subtitle="في كافة حساباتك ومحافظك المالية"
            icon={Wallet}
            colorClass="bg-blue-100 text-blue-700"
          />

          <StatCard
            id="stat-monthly-income"
            title="الدخل الشهري"
            amount={formatCurrency(monthlyIncome, baseCurrency)}
            subtitle={`إجمالي الواردات لشهر ${selectedMonth}`}
            icon={ArrowDownLeft}
            colorClass="bg-teal-100 text-teal-700"
          />

          <StatCard
            id="stat-monthly-expenses"
            title="المصروفات الشهرية"
            amount={formatCurrency(monthlyExpenses, baseCurrency)}
            subtitle={`إجمالي النفقات لشهر ${selectedMonth}`}
            icon={ArrowUpRight}
            colorClass="bg-rose-100 text-rose-700"
          />

          <StatCard
            id="stat-savings"
            title="إجمالي المدخرات"
            amount={formatCurrency(totalSavings, baseCurrency)}
            subtitle={`${savingsGoals.length} أهداف ادخار مفعلة`}
            icon={PiggyBank}
            colorClass="bg-indigo-100 text-indigo-700"
          />

          <StatCard
            id="stat-investments"
            title="المحفظة الاستثمارية"
            amount={formatCurrency(totalInvestments, baseCurrency)}
            subtitle="إجمالي القيمة السوقية الحالية"
            icon={TrendingUp}
            colorClass="bg-amber-100 text-amber-700"
          />

          <StatCard
            id="stat-debts"
            title="الديون والالتزامات"
            amount={formatCurrency(totalDebts, baseCurrency)}
            subtitle="المبالغ المتبقية للوفاء بها"
            icon={Scale}
            colorClass="bg-purple-100 text-purple-700"
          />

          <div className="p-5 bg-gradient-to-bl from-emerald-700 to-teal-800 rounded-2xl text-white flex flex-col justify-between shadow-xs">
            <div>
              <span className="text-xs font-bold text-emerald-200">
                إجراء فوري
              </span>
              <h4 className="text-base font-bold mt-1">تسجيل معاملة مالية</h4>
              <p className="text-xs text-emerald-100/90 mt-1 leading-relaxed">
                سجل إيراداً أو مصروفاً أو تحويلاً مع تحديث تلقائي وفوري للأرصدة.
              </p>
            </div>
            <button
              onClick={() => setShowQuickAdd(true)}
              className="mt-4 flex items-center justify-center gap-1.5 py-2 px-3 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              إضافة معاملة جديدة
            </button>
          </div>
        </div>
      </div>

      {/* الرسوم البيانية الإحصائية */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* رسم بياني لمقارنة الدخل والمصروف */}
        <div className="lg:col-span-2 p-6 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-base font-bold text-slate-900">
                مقارنة الدخل بالمصروفات
              </h4>
              <p className="text-xs text-slate-500">المسار الشهري خلال آخر 6 أشهر</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                الدخل
              </span>
              <span className="flex items-center gap-1.5 text-rose-700">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                المصروف
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(Number(value) || 0, baseCurrency), '']}
                  contentStyle={{
                    borderRadius: '12px',
                    fontSize: '12px',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Bar dataKey="income" name="الدخل" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="المصروف" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* توزيع المصروفات حسب الفئة */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <h4 className="text-base font-bold text-slate-900">
              المصروفات حسب التصنيف
            </h4>
            <p className="text-xs text-slate-500">توزيع نفقات شهر {selectedMonth}</p>

            {categoryExpensesData.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                لا توجد معاملات نفقات مسجلة في هذا الشهر حتى الآن.
              </div>
            ) : (
              <>
                <div className="h-44 w-full my-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryExpensesData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                      >
                        {categoryExpensesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => [formatCurrency(Number(val) || 0, baseCurrency), '']}
                        contentStyle={{
                          borderRadius: '12px',
                          fontSize: '11px',
                          backgroundColor: '#ffffff',
                          color: '#0f172a',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-1.5 max-h-28 overflow-y-auto pl-1">
                  {categoryExpensesData.slice(0, 4).map((c) => (
                    <div key={c.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: c.color }}
                        />
                        <span className="truncate text-slate-700 font-medium">{c.name}</span>
                      </div>
                      <span className="font-bold text-slate-900 font-mono">
                        {formatCurrency(c.value, baseCurrency)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* قسم أهداف الادخار وأحدث المعاملات */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* أهداف الادخار */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-base font-bold text-slate-900">
                أهداف الادخار
              </h4>
              <p className="text-xs text-slate-500">متابعة الإنجاز والوصول للأهداف المرجوة</p>
            </div>
            <Link
              to="/savings"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <span>عرض الكل</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          {savingsGoals.length === 0 ? (
            <EmptyState
              id="dashboard-savings-empty"
              icon={PiggyBank}
              title="لم تحدد أهداف ادخار بعد"
              description="حدد هدفاً مالياً (مثل صندوق طوارئ، أو سيارة، أو رحلة) لتبدأ بمتابعة مسار التوفير."
              actionLabel="إضافة هدف ادخاري"
              onAction={() => window.location.assign('/savings')}
            />
          ) : (
            <div className="space-y-3">
              {savingsGoals.slice(0, 3).map((goal) => {
                const progress = Math.min(
                  100,
                  Math.round((goal.currentAmount / goal.targetAmount) * 100) || 0
                );
                return (
                  <div
                    key={goal.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-slate-800">
                        {goal.goalName}
                      </span>
                      <span className="font-bold text-emerald-700 font-mono">{progress}%</span>
                    </div>
                    {/* شريط التقدم */}
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-1.5">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>تم ادخار: {formatCurrency(goal.currentAmount, goal.currency)}</span>
                      <span>الهدف: {formatCurrency(goal.targetAmount, goal.currency)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* أحدث العمليات والمعاملات */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-base font-bold text-slate-900">
                أحدث المعاملات المالية
              </h4>
              <p className="text-xs text-slate-500">آخر التحركات والقيود في حساباتك</p>
            </div>
            <Link
              to="/transactions"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <span>عرض السجل كاملاً</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentTransactions.length === 0 ? (
            <EmptyState
              id="dashboard-transactions-empty"
              icon={Wallet}
              title="لا توجد معاملات مسجلة بعد"
              description="أضف أول معاملة دخل أو نفقة لتبدأ رحلتك في إدارة أموالك بدقة."
              actionLabel="إضافة معاملة"
              onAction={() => setShowQuickAdd(true)}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {recentTransactions.map((tx) => {
                const isIncome = tx.type === 'income';
                return (
                  <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                          isIncome
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {isIncome ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">
                          {tx.description || tx.category}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {tx.date} • {tx.category}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-bold text-sm font-mono ${
                        isIncome ? 'text-emerald-600' : 'text-slate-900'
                      }`}
                    >
                      {isIncome ? '+' : '-'} {formatCurrency(tx.amount, tx.currency)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <QuickAddModal isOpen={showQuickAdd} onClose={() => setShowQuickAdd(false)} />
    </div>
  );
}
