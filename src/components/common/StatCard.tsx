import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  id?: string;
  title: string;
  amount: string;
  subtitle?: string;
  icon: LucideIcon;
  colorClass: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export function StatCard({
  id,
  title,
  amount,
  subtitle,
  icon: Icon,
  colorClass,
  trend,
}: StatCardProps) {
  return (
    <div
      id={id}
      className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-slate-600">{title}</span>
        <div className={`p-2.5 rounded-xl ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
          {amount}
        </div>
        {(subtitle || trend) && (
          <div className="mt-1 flex items-center gap-2 text-xs">
            {trend && (
              <span
                className={`font-bold ${
                  trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
            )}
            {subtitle && <span className="text-slate-500 font-medium">{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
