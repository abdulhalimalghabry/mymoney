import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, Loader2, ShieldCheck, AlertCircle, UserPlus } from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const { loginWithEmail, loginWithGoogle, registerInitialOwner, currentUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isOwnerSetupMode, setIsOwnerSetupMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQuickRegister, setShowQuickRegister] = useState(false);

  useEffect(() => {
    if (currentUser) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  const handleEmailSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور.');
      return;
    }

    setError(null);
    setShowQuickRegister(false);
    setLoading(true);

    try {
      if (isOwnerSetupMode) {
        await registerInitialOwner(email, password);
      } else {
        await loginWithEmail(email, password);
      }
      navigate('/', { replace: true });
    } catch (err: any) {
      console.error('Authentication error:', err);
      const code = err?.code || '';

      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/user-not-found' ||
        code === 'auth/wrong-password'
      ) {
        setError(
          'البيانات المدخلة غير صحيحة أو الحساب غير مسجل بعد. إذا كانت هذه أول مرة تستخدم فيها التطبيق، اضغط على زر "إنشاء وتفعيل الحساب بالبيانات المدخلة" أدناه أو سجل الدخول مباشرة بحساب Google.'
        );
        setShowQuickRegister(true);
      } else if (code === 'auth/weak-password') {
        setError('يجب ألا تقل كلمة المرور عن 6 خانات.');
      } else if (code === 'auth/email-already-in-use') {
        setError('هذا البريد الإلكتروني مسجل بالفعل. يرجى التبديل لوضع تسجيل الدخول المباشر.');
        setIsOwnerSetupMode(false);
      } else if (code === 'auth/operation-not-allowed') {
        setError(
          'تسجيل الدخول بالبريد الإلكتروني غير مفعّل في لوحة Firebase. يرجى استخدام زر "الدخول المباشر بحساب Google" بالأعلى (المفعّل تلقائياً) أو تفعيل البريد في لوحة تحكم Firebase.'
        );
      } else if (code === 'auth/popup-closed-by-user') {
        setError('تم إغلاق نافذة المصادقة قبل الاكتمال.');
      } else {
        setError(err.message || 'فشلت المصادقة. يرجى التحقق من صحة البيانات أو استخدام حساب Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRegister = async () => {
    setError(null);
    setShowQuickRegister(false);
    setLoading(true);

    try {
      await registerInitialOwner(email, password);
      navigate('/', { replace: true });
    } catch (err: any) {
      console.error(err);
      if (err?.code === 'auth/operation-not-allowed') {
        setError(
          'تسجيل الدخول بالبريد الإلكتروني غير مفعّل في لوحة Firebase. يمكنك تسجيل الدخول بنقرة واحدة عبر زر Google.'
        );
      } else {
        setError(err.message || 'تعذر إنشاء الحساب. جرب تسجيل الدخول بحساب Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setShowQuickRegister(false);
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate('/', { replace: true });
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      if (err?.code === 'auth/popup-closed-by-user') {
        setError('تم إلغاء عملية تسجيل الدخول بحساب Google.');
      } else {
        setError(
          err.message ||
            'حدث خطأ أثناء المصادقة بحساب Google. يرجى التأكد من السماح بالنوافذ المنبثقة (Popups).'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200/90 p-8">
        {/* الترويسة والشعار */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-600 rounded-3xl flex items-center justify-center text-white text-3xl mx-auto mb-3 shadow-md shadow-emerald-500/20">
            💰
          </div>
          <h1 className="text-2xl font-bold text-slate-900">مدير أموالي الشخصية</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            نظام شخصي وآمن لإدارة النفقات والدخل والمدخرات والاستثمارات
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-3 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>نظام شخصي خاص بالمالك فقط</span>
          </div>
        </div>

        {/* تنبيه الأخطاء والإجراء السريع */}
        {error && (
          <div className="mb-5 p-4 text-xs text-rose-800 bg-rose-50 rounded-2xl border border-rose-200 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span className="leading-relaxed font-medium">{error}</span>
            </div>

            {showQuickRegister && (
              <div className="pt-2 border-t border-rose-200 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleQuickRegister}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  إنشاء وتفعيل الحساب بالبيانات المدخلة
                </button>
              </div>
            )}
          </div>
        )}

        {/* زر تسجيل الدخول عبر Google */}
        <button
          id="google-signin-btn"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full mb-5 flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-700 shadow-xs transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.58-5.17 3.58-9.15z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.92 0 12s.45 3.85 1.24 5.42l4.04-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.93 6.72-4.93z"
            />
          </svg>
          الدخول المباشر بحساب Google (بنقرة واحدة)
        </button>

        <div className="relative my-5 flex items-center justify-center">
          <div className="w-full border-t border-slate-200"></div>
          <span className="absolute px-3 bg-white text-xs text-slate-400 font-medium">
            أو عبر البريد الإلكتروني وكلمة المرور
          </span>
        </div>

        {/* نموذج البريد وكلمة المرور */}
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              البريد الإلكتروني
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
              <input
                id="login-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mygke818@gmail.com"
                className="w-full pr-10 pl-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-hidden transition-all text-left"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                كلمة المرور
              </label>
              {!isOwnerSetupMode && (
                <Link
                  to="/forgot-password"
                  className="text-xs text-emerald-600 hover:text-emerald-700 hover:underline font-semibold"
                >
                  نسيت كلمة المرور؟
                </Link>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
              <input
                id="login-password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pr-10 pl-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-hidden transition-all text-left"
                dir="ltr"
              />
            </div>
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-sm font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isOwnerSetupMode ? 'إنشاء حساب المالك' : 'تسجيل الدخول'}
          </button>
        </form>

        {/* التبديل بين إنشاء الحساب والدخول */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={() => {
              setIsOwnerSetupMode(!isOwnerSetupMode);
              setError(null);
              setShowQuickRegister(false);
            }}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
          >
            {isOwnerSetupMode
              ? '← لديك حساب بالفعل؟ اضغط لتسجيل الدخول'
              : 'أول مرة تستخدم التطبيق؟ اضغط هنا لإنشاء حساب المالك'}
          </button>
        </div>
      </div>
    </div>
  );
}
