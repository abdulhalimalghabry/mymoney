import React, { useState, useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { formatCurrency } from '../utils/currencies';
import { exportTransactionsToCSV } from '../utils/export';
import { StatCard } from '../components/common/StatCard';
import {
  Printer,
  Download,
  DollarSign,
  TrendingUp,
  Percent,
  Calendar,
  Wallet,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

export function ReportsPage() {
  const {
    transactions,
    accounts,
    baseCurrency,
    toBaseCurrency,
    totalBalance,
    totalInvestments,
    totalSavings,
    totalDebts,
    netWorth,
  } = useFinance();

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  // الأعوام المتاحة من المعاملات
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    set.add(new Date().getFullYear().toString());
    transactions.forEach((tx) => {
      if (tx.date) set.add(tx.date.substring(0, 4));
    });
    return Array.from(set).sort().reverse();
  }, [transactions]);

  // التوزيع الشهري للسنة المختارة
  const annualMonthlyData = useMemo(() => {
    const arabicMonths = [
      'يناير',
      'فبراير',
      'مارس',
      'أبريل',
      'مايو',
      'يونيو',
      'يوليو',
      'أغسطس',
      'سبتمبر',
      'أكتوبر',
      'نوفمبر',
      'ديسمبر',
    ];

    const data = arabicMonths.map((m, idx) => {
      const monthNum = String(idx + 1).padStart(2, '0');
      const prefix = `${selectedYear}-${monthNum}`;
      return {
        month: m,
        prefix,
        income: 0,
        expense: 0,
        net: 0,
      };
    });

    transactions.forEach((tx) => {
      if (tx.date && tx.date.startsWith(selectedYear)) {
        const mIdx = parseInt(tx.date.substring(5, 7), 10) - 1;
        if (mIdx >= 0 && mIdx < 12) {
          const val = toBaseCurrency(tx.amount, tx.currency);
          if (tx.type === 'income') {
            data[mIdx].income += val;
          } else if (tx.type === 'expense') {
            data[mIdx].expense += val;
          }
        }
      }
    });

    data.forEach((d) => {
      d.net = d.income - d.expense;
    });

    return data;
  }, [transactions, selectedYear, toBaseCurrency]);

  // إجماليات السنة
  const { yearIncome, yearExpense } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    annualMonthlyData.forEach((d) => {
      inc += d.income;
      exp += d.expense;
    });
    return { yearIncome: inc, yearExpense: exp };
  }, [annualMonthlyData]);

  const yearNet = yearIncome - yearExpense;
  const yearSavingsRate = yearIncome > 0 ? Math.round((yearNet / yearIncome) * 100) : 0;

  // توزيع المصروفات حسب التصنيفات للسنة المختارة
  const categoryDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter((t) => t.type === 'expense' && t.date && t.date.startsWith(selectedYear))
      .forEach((t) => {
        const val = toBaseCurrency(t.amount, t.currency);
        map[t.category] = (map[t.category] || 0) + val;
      });

    const colors = [
      '#10B981',
      '#3B82F6',
      '#F59E0B',
      '#EF4444',
      '#8B5CF6',
      '#EC4899',
      '#06B6D4',
      '#14B8A6',
      '#64748B',
    ];

    return Object.entries(map)
      .map(([name, value], idx) => ({
        name,
        value,
        color: colors[idx % colors.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, selectedYear, toBaseCurrency]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const yearTxs = transactions.filter((t) => t.date && t.date.startsWith(selectedYear));
    exportTransactionsToCSV(yearTxs, accounts, `تقرير_سنوي_${selectedYear}.csv`);
  };

  return (
    <div className="space-y-6 print:m-0 print:p-0" dir="rtl">
      {/* الترويسة وأزرار الإجراءات */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            التقارير المالية والتحليلات
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            بيانات الأداء المالي، التدفقات النقدية وقائمة المركز المالي وصافي الثروة
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* اختيار السنة */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs text-xs font-bold text-slate-700">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent border-none focus:outline-hidden font-bold cursor-pointer"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  عام {yr}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            تصدير ملف CSV
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            طباعة التقرير
          </button>
        </div>
      </div>

      {/* المؤشرات السنوية الرئيسية */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          id="stat-report-inc"
          title={`إجمالي الإيرادات (${selectedYear})`}
          amount={formatCurrency(yearIncome, baseCurrency)}
          subtitle="مجموع التدفقات المالية الداخلة"
          icon={TrendingUp}
          colorClass="bg-emerald-100 text-emerald-700"
        />
        <StatCard
          id="stat-report-exp"
          title={`إجمالي المصروفات (${selectedYear})`}
          amount={formatCurrency(yearExpense, baseCurrency)}
          subtitle="مجموع الإنفاق والمصروفات الخارجة"
          icon={DollarSign}
          colorClass="bg-rose-100 text-rose-700"
        />
        <StatCard
          id="stat-report-net"
          title="صافي التدفق النقدي"
          amount={`${yearNet >= 0 ? '+' : ''}${formatCurrency(yearNet, baseCurrency)}`}
          subtitle="الفائض / العجز السنوي"
          icon={Wallet}
          colorClass={
            yearNet >= 0
              ? 'bg-blue-100 text-blue-700'
              : 'bg-rose-100 text-rose-700'
          }
        />
        <StatCard
          id="stat-report-savings-rate"
          title="معدل الادخار السنوي"
          amount={`${Math.max(0, yearSavingsRate)}%`}
          subtitle="نسبة الفائض من إجمالي الدخل"
          icon={Percent}
          colorClass="bg-purple-100 text-purple-700"
        />
      </div>

      {/* الرسوم البيانية التحليلية */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* مخطط مقارنة الدخل بالمصروفات شهرياً */}
        <div className="lg:col-span-2 p-6 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <h4 className="text-base font-bold text-slate-900 mb-1">
            مقارنة الدخل والمصروفات شهرياً ({selectedYear})
          </h4>
          <p className="text-xs text-slate-500 mb-4">تتبع التدفقات المالية وتفاوتها شهر بشهر</p>
          <div className="h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={annualMonthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => formatCurrency(Number(val) || 0, baseCurrency)}
                  contentStyle={{
                    borderRadius: '12px',
                    fontSize: '12px',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Legend />
                <Bar dataKey="income" name="الدخل" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="المصروفات" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* توزيع المصروفات على التصنيفات */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <h4 className="text-base font-bold text-slate-900 mb-1">
              تصنيفات الإنفاق ({selectedYear})
            </h4>
            <p className="text-xs text-slate-500 mb-2">توزيع المصروفات السنوية بحسب البنود</p>
            {categoryDistribution.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400 font-medium">
                لا توجد مصروفات مسجلة في عام {selectedYear}
              </div>
            ) : (
              <>
                <div className="h-44 w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryDistribution}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                      >
                        {categoryDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => formatCurrency(Number(val) || 0, baseCurrency)}
                        contentStyle={{
                          borderRadius: '12px',
                          fontSize: '11px',
                          backgroundColor: '#ffffff',
                          color: '#0f172a',
                          border: '1px solid #e2e8f0',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto mt-2">
                  {categoryDistribution.slice(0, 5).map((c) => (
                    <div key={c.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: c.color }}
                        />
                        <span className="truncate text-slate-600 font-medium">{c.name}</span>
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

      {/* قائمة المركز المالي: الأصول والخصوم وصافي الثروة */}
      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs">
        <h4 className="text-base font-bold text-slate-900 mb-1">
          قائمة المركز المالي وصافي الثروة
        </h4>
        <p className="text-xs text-slate-500 mb-6">الوضع المالي الشامل حالياً بـ {baseCurrency}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* تفصيل الأصول */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-700">
                إجمالي الأصول (Assets)
              </span>
              <span className="text-sm font-bold text-emerald-700 font-mono">
                {formatCurrency(totalBalance + totalInvestments, baseCurrency)}
              </span>
            </div>
            <div className="space-y-2 text-xs font-medium">
              <div className="flex items-center justify-between text-slate-600">
                <span>أرصدة الحسابات البنكية والنقدية</span>
                <span className="font-bold text-slate-900 font-mono">
                  {formatCurrency(totalBalance, baseCurrency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>المحفظة الاستثمارية (أسهم، عقار، ذهب)</span>
                <span className="font-bold text-slate-900 font-mono">
                  {formatCurrency(totalInvestments, baseCurrency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>أهداف الادخار المخصصة</span>
                <span className="font-bold text-slate-900 font-mono">
                  {formatCurrency(totalSavings, baseCurrency)}
                </span>
              </div>
            </div>
          </div>

          {/* تفصيل الخصوم والالتزامات */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-700">
                إجمالي الخصوم والالتزامات (Liabilities)
              </span>
              <span className="text-sm font-bold text-rose-600 font-mono">
                {formatCurrency(totalDebts, baseCurrency)}
              </span>
            </div>
            <div className="space-y-2 text-xs font-medium">
              <div className="flex items-center justify-between text-slate-600">
                <span>الديون والالتزامات المستحقة عليك</span>
                <span className="font-bold text-slate-900 font-mono">
                  {formatCurrency(totalDebts, baseCurrency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>التزامات مستقبلية أخرى</span>
                <span className="font-bold text-slate-900 font-mono">
                  {formatCurrency(0, baseCurrency)}
                </span>
              </div>
            </div>
          </div>

          {/* صافي الثروة */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                <span className="text-xs font-bold text-emerald-800">
                  صافي الثروة (Net Worth)
                </span>
                <span className="text-lg font-extrabold text-emerald-700 font-mono">
                  {formatCurrency(netWorth, baseCurrency)}
                </span>
              </div>
              <p className="text-xs text-emerald-800 mt-2 font-medium leading-relaxed">
                المعادلة المحاسبية: إجمالي الأصول ({formatCurrency(totalBalance + totalInvestments, baseCurrency)}) مطروحاً منه إجمالي الخصوم ({formatCurrency(totalDebts, baseCurrency)}).
              </p>
            </div>
            <div className="text-[11px] text-emerald-700 font-bold">
              ✓ محدث بشكل حي ومتزامن مع أرصدتك في Firebase.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
