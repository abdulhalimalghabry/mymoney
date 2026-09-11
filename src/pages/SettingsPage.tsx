import React, { useState } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { useAuth } from '../contexts/AuthContext';
import {
  updateUserSettings,
  addCategory,
  deleteCategory,
} from '../services/financialService';
import { Currency } from '../types';
import { SUPPORTED_CURRENCIES } from '../utils/currencies';
import { Modal } from '../components/common/Modal';
import {
  Globe,
  Tag,
  DollarSign,
  Download,
  Trash2,
  Plus,
  CheckCircle2,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

export function SettingsPage() {
  const { currentUser } = useAuth();
  const {
    baseCurrency,
    exchangeRates,
    categories,
    accounts,
    transactions,
    budgets,
    savingsGoals,
    investments,
    debts,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'general' | 'categories' | 'rates' | 'backup'>('general');

  // إعدادات عامة
  const [selectedBaseCurr, setSelectedBaseCurr] = useState<Currency>(baseCurrency);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [generalSuccess, setGeneralSuccess] = useState(false);

  // إضافة تصنيف جديد
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'income' | 'expense'>('expense');
  const [catColor, setCatColor] = useState('#10B981');
  const [catSubmitting, setCatSubmitting] = useState(false);

  // أسعار الصرف
  const [localRates, setLocalRates] = useState<Record<Currency, number>>({
    ...exchangeRates,
  });
  const [savingRates, setSavingRates] = useState(false);
  const [ratesSuccess, setRatesSuccess] = useState(false);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSavingGeneral(true);
    try {
      await updateUserSettings(currentUser.uid, {
        baseCurrency: selectedBaseCurr,
        language: 'ar',
        theme: 'light',
      });
      setGeneralSuccess(true);
      setTimeout(() => setGeneralSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !catName.trim()) return;
    setCatSubmitting(true);
    try {
      await addCategory(currentUser.uid, {
        name: catName.trim(),
        type: catType,
        color: catColor,
        icon: 'tag',
      });
      setShowAddCatModal(false);
      setCatName('');
    } catch (err) {
      console.error(err);
    } finally {
      setCatSubmitting(false);
    }
  };

  const handleDeleteCategory = async (catId: string, name: string) => {
    if (!currentUser) return;
    if (window.confirm(`هل أنت متأكد من حذف تصنيف "${name}"؟`)) {
      try {
        await deleteCategory(currentUser.uid, catId);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSaveRates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSavingRates(true);
    try {
      await updateUserSettings(currentUser.uid, {
        exchangeRates: localRates,
      });
      setRatesSuccess(true);
      setTimeout(() => setRatesSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingRates(false);
    }
  };

  const handleExportJSON = () => {
    const backupData = {
      exportDate: new Date().toISOString(),
      user: currentUser?.email,
      baseCurrency,
      exchangeRates,
      accounts,
      transactions,
      categories,
      budgets,
      savingsGoals,
      investments,
      debts,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `نسخة_احتياطية_أموالي_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* ترويسة الصفحة */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          إعدادات النظام وتخصيص الحساب
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          التحكم في العملة الأساسية، إدارة تصنيفات الدخل والمصروف، أسعار التحويل والنسخ الاحتياطي
        </p>
      </div>

      {/* التبويبات */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'general'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          الإعدادات العامة
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          التصنيفات ({categories.length})
        </button>
        <button
          onClick={() => setActiveTab('rates')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'rates'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          أسعار الصرف والتحويل
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'backup'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          النسخ الاحتياطي والأمان
        </button>
      </div>

      {/* التبويب 1: الإعدادات العامة */}
      {activeTab === 'general' && (
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs max-w-2xl">
          <form onSubmit={handleSaveGeneral} className="space-y-5" dir="rtl">
            {generalSuccess && (
              <div className="p-3 text-xs text-emerald-800 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>تم تحديث الإعدادات بنجاح!</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                العملة الأساسية للنظام (Base Currency)
              </label>
              <p className="text-xs text-slate-500 mb-2">
                يتم تحويل وتوحيد كافة أرصدة الحسابات وصافي الثروة والتقارير المالية وإجمالي المصروفات إلى هذه العملة تلقائياً.
              </p>
              <select
                value={selectedBaseCurr}
                onChange={(e) => setSelectedBaseCurr(e.target.value as Currency)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold cursor-pointer"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name} ({c.code} - {c.symbol})
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-800 block">لغة الواجهة والمظهر</span>
                <span className="text-slate-500">اللغة العربية فقط (RTL) • الثيم الأبيض النقي</span>
              </div>
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-[11px]">
                مفعل دائماً
              </span>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={savingGeneral}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {savingGeneral && <Loader2 className="w-4 h-4 animate-spin" />}
                حفظ الإعدادات العامة
              </button>
            </div>
          </form>
        </div>
      )}

      {/* التبويب 2: إدارة التصنيفات */}
      {activeTab === 'categories' && (
        <div className="space-y-4" dir="rtl">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">
              تخصيص تصنيفات الدخل والمصروفات لتسهيل الرقابة المالية وإعداد الميزانيات بدقة
            </p>
            <button
              onClick={() => setShowAddCatModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              إضافة تصنيف جديد
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color || '#10B981' }}
                  />
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">
                      {cat.name}
                    </h5>
                    <span
                      className={`text-[10px] font-bold ${
                        cat.type === 'income' ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {cat.type === 'income' ? 'دخل / إيراد' : 'مصروف'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteCategory(cat.id, cat.name)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer"
                  title="حذف التصنيف"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* التبويب 3: أسعار الصرف */}
      {activeTab === 'rates' && (
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs max-w-3xl" dir="rtl">
          <form onSubmit={handleSaveRates} className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                أسعار الصرف والتحويل اليدوية
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                معدلات الصرف بالنسبة لـ 1 دولار أمريكي (USD). يمكنك تعديل الأسعار يدparamياً لتطابق أسعار البنك أو السوق المحلي.
              </p>
            </div>

            {ratesSuccess && (
              <div className="p-3 text-xs text-emerald-800 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>تم حفظ وتفعيل أسعار الصرف الجديدة!</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {SUPPORTED_CURRENCIES.map((c) => (
                <div
                  key={c.code}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                >
                  <span className="text-xs font-bold text-slate-700">
                    1 دولار =
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.0001"
                      required
                      value={localRates[c.code] ?? 1}
                      onChange={(e) =>
                        setLocalRates({
                          ...localRates,
                          [c.code]: parseFloat(e.target.value) || 1,
                        })
                      }
                      className="w-24 px-2.5 py-1 text-xs font-bold bg-white border border-slate-200 rounded-lg text-left font-mono"
                    />
                    <span className="text-xs font-bold text-slate-600">{c.code}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={savingRates}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {savingRates && <Loader2 className="w-4 h-4 animate-spin" />}
                حفظ أسعار الصرف
              </button>
            </div>
          </form>
        </div>
      )}

      {/* التبويب 4: النسخ الاحتياطي والأمان */}
      {activeTab === 'backup' && (
        <div className="space-y-5 max-w-2xl" dir="rtl">
          <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
            <h4 className="text-sm font-bold text-slate-900">
              تصدير نسخة احتياطية شاملة (JSON Backup)
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              تحميل نسخة كاملة من بياناتك المالية (الحسابات، الدخل، المصروفات، الاستثمارات، الديون والميزانيات) في ملف JSON قياسي للاحتفاظ به بأمان في جهازك.
            </p>
            <button
              onClick={handleExportJSON}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              تنزيل النسخة الاحتياطية الكاملة (JSON)
            </button>
          </div>

          <div className="p-6 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>خصوصية البيانات والحماية الصارمة</span>
            </div>
            <p className="text-xs text-emerald-900 leading-relaxed font-medium">
              كافة سجلاتك المالية معزولة ومشفرة في قاعدة بيانات Firebase Firestore السحابية تحت معرف الحساب الخاص بك فقط (UID: <code>{currentUser?.uid}</code>). ولا يمكن لأي طرف آخر الوصول إليها أو الاطلاع على أرقامك.
            </p>
          </div>
        </div>
      )}

      {/* نافذة إضافة تصنيف جديد */}
      <Modal
        isOpen={showAddCatModal}
        onClose={() => setShowAddCatModal(false)}
        title="إضافة تصنيف مالي جديد"
      >
        <form onSubmit={handleAddCategory} className="space-y-4" dir="rtl">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              اسم التصنيف *
            </label>
            <input
              type="text"
              required
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="مثال: رعاية الحيوانات، اشتراكات رقمية، صيانة..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                النوع
              </label>
              <select
                value={catType}
                onChange={(e) => setCatType(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
              >
                <option value="expense">تصنيف مصروفات</option>
                <option value="income">تصنيف دخل وإيرادات</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                لون التمييز
              </label>
              <input
                type="color"
                value={catColor}
                onChange={(e) => setCatColor(e.target.value)}
                className="w-full h-9.5 p-1 bg-white border border-slate-200 rounded-xl cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddCatModal(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={catSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 rounded-xl shadow-xs cursor-pointer"
            >
              {catSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              حفظ التصنيف
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
