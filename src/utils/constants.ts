import { Category } from '../types';

export const DEFAULT_EXPENSE_CATEGORIES: Omit<Category, 'id' | 'userId' | 'createdAt'>[] = [
  { name: 'طعام ومشروبات', type: 'expense', color: '#EF4444', icon: 'Utensils' },
  { name: 'سكن وإيجار وفواتير منزلية', type: 'expense', color: '#F97316', icon: 'Home' },
  { name: 'مواصلات ومحروقات', type: 'expense', color: '#F59E0B', icon: 'Car' },
  { name: 'فواتير واتصالات وإنترنت', type: 'expense', color: '#10B981', icon: 'Zap' },
  { name: 'صحة وعلاج وأدوية', type: 'expense', color: '#06B6D4', icon: 'HeartPulse' },
  { name: 'تعليم ودورات وكتب', type: 'expense', color: '#3B82F6', icon: 'GraduationCap' },
  { name: 'عائلة ومصاريف منزلية', type: 'expense', color: '#6366F1', icon: 'Users' },
  { name: 'تسوق وملابس', type: 'expense', color: '#8B5CF6', icon: 'ShoppingBag' },
  { name: 'ترفيه ومطاعم وسياحة', type: 'expense', color: '#EC4899', icon: 'Film' },
  { name: 'أعمال وتطوير ومشاريع', type: 'expense', color: '#14B8A6', icon: 'Briefcase' },
  { name: 'مصاريف وسفر', type: 'expense', color: '#F43F5E', icon: 'Plane' },
  { name: 'مصاريف أخرى ونثريات', type: 'expense', color: '#64748B', icon: 'MoreHorizontal' },
];

export const DEFAULT_INCOME_CATEGORIES: Omit<Category, 'id' | 'userId' | 'createdAt'>[] = [
  { name: 'راتب شهري', type: 'income', color: '#10B981', icon: 'Wallet' },
  { name: 'أرباح تجارة ومشاريع', type: 'income', color: '#3B82F6', icon: 'Building' },
  { name: 'عمل حر واستشارات', type: 'income', color: '#8B5CF6', icon: 'Laptop' },
  { name: 'عوائد استثمارية وأرباح أسهم', type: 'income', color: '#F59E0B', icon: 'TrendingUp' },
  { name: 'هدايا ومكافآت', type: 'income', color: '#EC4899', icon: 'Gift' },
  { name: 'دخل إضافي ومصادر أخرى', type: 'income', color: '#64748B', icon: 'PlusCircle' },
];

export const ACCOUNT_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  cash: { label: 'نقدي (كاش)', icon: 'Banknote' },
  bank: { label: 'حساب بنكي', icon: 'Landmark' },
  savings: { label: 'حساب ادخار وتوفير', icon: 'PiggyBank' },
  investment: { label: 'محفظة استثمارية', icon: 'TrendingUp' },
  ewallet: { label: 'محفظة إلكترونية', icon: 'Smartphone' },
  other: { label: 'حساب مالي آخر', icon: 'CreditCard' },
};
