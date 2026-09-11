import React, { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { useAuth } from '../../contexts/AuthContext';
import { Menu, Plus, Bell, Calendar, ChevronDown, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { SUPPORTED_CURRENCIES } from '../../utils/currencies';
import { updateUserSettings } from '../../services/financialService';
import { Currency } from '../../types';

interface NavbarProps {
  onToggleSidebar: () => void;
  onOpenQuickAdd: () => void;
}

export function Navbar({ onToggleSidebar, onOpenQuickAdd }: NavbarProps) {
  const { currentUser } = useAuth();
  const { baseCurrency, selectedMonth, setSelectedMonth, alerts } = useFinance();
  const [showAlerts, setShowAlerts] = useState(false);
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);

  // تحية ترحيبية حسب وقت اليوم
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'صباح الخير' : hour < 17 ? 'أهلاً بك' : 'مساء الخير';

  const handleCurrencyChange = async (newCurr: Currency) => {
    if (!currentUser) return;
    try {
      await updateUserSettings(currentUser.uid, { baseCurrency: newCurr });
      setShowCurrencyMenu(false);
    } catch (err) {
      console.error(err);
    }
  };

  // توليد خيارات الـ 12 شهراً الأخيرة باللغة العربية
  const monthOptions = [];
  const curr = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(curr.getFullYear(), curr.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('ar-EG', { month: 'long', year: 'numeric' });
    monthOptions.push({ value: val, label });
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-8 bg-white border-b border-slate-200 shadow-xs">
      {/* القسم الأيمن: زر القائمة للشاشات الصغيرة والترحيب */}
      <div className="flex items-center gap-3">
        <button
          id="mobile-sidebar-toggle"
          onClick={onToggleSidebar}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl lg:hidden cursor-pointer"
          title="القائمة"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-1.5">
            {greeting} <span className="text-xl">👋</span>
          </h2>
          <p className="text-xs text-slate-500 hidden sm:block">
            لوحة التحكم المالي الشخصي الخاصة بك
          </p>
        </div>
      </div>

      {/* القسم الأيسر: الأدوات والعملة والعمليات */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* اختيار الشهر */}
        <div className="relative flex items-center">
          <Calendar className="w-4 h-4 text-slate-400 absolute right-2.5 pointer-events-none" />
          <select
            id="navbar-month-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="pr-8 pl-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-700 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
          >
            {monthOptions.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* اختيار العملة الأساسية */}
        <div className="relative">
          <button
            id="navbar-currency-btn"
            onClick={() => setShowCurrencyMenu(!showCurrencyMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <span>العملة: {baseCurrency}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </button>

          {showCurrencyMenu && (
            <div className="absolute left-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1 text-[11px] font-bold text-slate-400 border-b border-slate-100 mb-1">
                تغيير العملة الأساسية للعرض
              </div>
              {SUPPORTED_CURRENCIES.map((curr) => (
                <button
                  key={curr.code}
                  onClick={() => handleCurrencyChange(curr.code)}
                  className={`w-full text-right px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 cursor-pointer ${
                    curr.code === baseCurrency ? 'font-bold text-emerald-600 bg-emerald-50/50' : 'text-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{curr.flag}</span>
                    <span>{curr.name}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">({curr.code})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* التنبيهات والإشعارات */}
        <div className="relative">
          <button
            id="navbar-notifications-btn"
            onClick={() => setShowAlerts(!showAlerts)}
            className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="التنبيهات"
          >
            <Bell className="w-5 h-5" />
            {alerts.length > 0 && (
              <span className="absolute top-1.5 left-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
            )}
          </button>

          {showAlerts && (
            <div className="absolute left-0 mt-2 w-80 md:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
                <h4 className="text-sm font-bold text-slate-900">
                  التنبيهات المالية النشطة
                </h4>
                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                  {alerts.length}
                </span>
              </div>

              {alerts.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-2 opacity-80" />
                  وضعك المالي ممتاز! لا توجد تنبيهات أو ميزانيات متجاوزة حالياً.
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-2">
                  {alerts.map((al) => (
                    <div
                      key={al.id}
                      className={`p-3 rounded-xl text-xs border ${
                        al.type === 'warning'
                          ? 'bg-rose-50 border-rose-200 text-rose-900'
                          : al.type === 'success'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-blue-50 border-blue-200 text-blue-900'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {al.type === 'warning' ? (
                          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                        ) : al.type === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                        ) : (
                          <Info className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                        )}
                        <div>
                          <div className="font-bold">{al.title}</div>
                          <div className="opacity-90 mt-0.5">{al.message}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* زر الإضافة السريعة */}
        <button
          id="navbar-quick-add-btn"
          onClick={onOpenQuickAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs md:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">إضافة معاملة</span>
          <span className="sm:hidden">إضافة</span>
        </button>
      </div>
    </header>
  );
}
