import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useFinance } from '../../contexts/FinanceContext';
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  PieChart,
  PiggyBank,
  TrendingUp,
  Scale,
  FileBarChart,
  Settings,
  LogOut,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { currentUser, logout } = useAuth();
  const { alerts, debts } = useFinance();

  const overdueDebtsCount = debts.filter(
    (d) => d.status !== 'paid' && d.remainingAmount > 0 && d.type === 'borrowed'
  ).length;

  const warningCount = alerts.filter((a) => a.type === 'warning').length;

  const navItems = [
    { to: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
    { to: '/accounts', label: 'الحسابات المالية', icon: Wallet },
    { to: '/transactions', label: 'سجل المعاملات', icon: ArrowLeftRight },
    { to: '/income', label: 'الدخل المالي', icon: ArrowDownLeft },
    { to: '/expenses', label: 'المصروفات والنفقات', icon: ArrowUpRight },
    {
      to: '/budget',
      label: 'الميزانية الشهرية',
      icon: PieChart,
      badge: warningCount > 0 ? `${warningCount} تنبيه` : undefined,
      badgeColor: 'bg-amber-100 text-amber-800 border border-amber-200',
    },
    { to: '/savings', label: 'أهداف الادخار', icon: PiggyBank },
    { to: '/investments', label: 'المحفظة الاستثمارية', icon: TrendingUp },
    {
      to: '/debts',
      label: 'الديون والالتزامات',
      icon: Scale,
      badge: overdueDebtsCount > 0 ? `${overdueDebtsCount}` : undefined,
      badgeColor: 'bg-rose-100 text-rose-800 border border-rose-200',
    },
    { to: '/reports', label: 'التقارير المالية', icon: FileBarChart },
    { to: '/settings', label: 'الإعدادات والتخصيص', icon: Settings },
  ];

  return (
    <>
      {/* خلفية الشاشات الصغيرة */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 right-0 z-40 w-68 bg-white border-l border-slate-200 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* ترويسة التطبيق */}
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs font-bold text-lg">
              💰
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                مدير أموالي
              </h1>
              <p className="text-xs text-slate-500 font-medium">النظام المالي الشخصي</p>
            </div>
          </div>
        </div>

        {/* عناصر التنقل */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 font-bold shadow-xs border border-emerald-100/60'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* معلومات المستخدم والخروج */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/60">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                {currentUser?.email ? currentUser.email[0].toUpperCase() : 'ح'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-800 truncate">
                  {currentUser?.displayName || 'حساب المالك'}
                </p>
                <p className="text-[10px] text-slate-500 truncate" dir="ltr">{currentUser?.email}</p>
              </div>
            </div>
            <button
              id="sidebar-logout-btn"
              onClick={() => logout()}
              title="تسجيل الخروج"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 text-center flex items-center justify-center gap-1 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>بياناتك مشفرة ومحفوظة سحابياً</span>
          </div>
        </div>
      </aside>
    </>
  );
}
