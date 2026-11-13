import React, { useState } from 'react';
import { apiRequest, ApiSession } from '../services/api';
import { ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react';

interface AuthViewProps {
  onAuthenticated: (session: ApiSession) => Promise<void>;
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthenticated }) => {
  const [mode,setMode] = useState<'login'|'register'>('login');
  const [name,setName] = useState('');
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await apiRequest<ApiSession>(
        mode === 'register' ? '/api/auth/register' : '/api/auth/login',
        undefined,
        { method:'POST', body:JSON.stringify({name,email,password}) }
      );
      await onAuthenticated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إكمال العملية.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main dir="rtl" className="min-h-screen bg-[#09090b] text-[#f3f1ec] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#c8a96e]/35 bg-[#c8a96e]/10 text-[#e6d1a3]">
            <Sparkles size={21} />
          </div>
          <div className="text-xs tracking-[.24em] text-[#c8a96e]">NUTRIFIT PRIVATE NUTRITION · DZ</div>
          <h1 className="mt-4 text-2xl font-semibold text-balance">مساحتك الغذائية الخاصة</h1>
          <p className="mt-2 text-sm leading-6 text-[#96938a]">سجّل الدخول لمتابعة ملفك وخطط وجباتك وطلباتك.</p>
        </div>

        <form onSubmit={submit} className="rounded-3xl border border-[#232329] bg-[#111114] p-5 sm:p-7 space-y-4 shadow-2xl">
          <div className="flex rounded-xl bg-[#09090b] border border-[#232329] p-1">
            <button type="button" onClick={() => {setMode('login');setError('');}} className={'touch-press flex-1 rounded-lg py-2.5 text-xs font-bold cursor-pointer ' + (mode==='login'?'bg-[#1c1a15] text-[#e6d1a3]':'text-[#96938a] hover:text-[#f3f1ec]')}>تسجيل الدخول</button>
            <button type="button" onClick={() => {setMode('register');setError('');}} className={'touch-press flex-1 rounded-lg py-2.5 text-xs font-bold cursor-pointer ' + (mode==='register'?'bg-[#1c1a15] text-[#e6d1a3]':'text-[#96938a] hover:text-[#f3f1ec]')}>إنشاء حساب</button>
          </div>

          {mode === 'register' && (
            <label className="block space-y-1.5">
              <span className="text-xs text-[#f3f1ec]">الاسم الذي سيظهر في ملفك</span>
              <input value={name} onChange={(e)=>setName(e.target.value)} required minLength={2} maxLength={100} autoComplete="name" className="w-full rounded-xl border border-[#232329] bg-[#18181c] px-3 py-3 text-sm text-[#f3f1ec] outline-none focus:border-[#c8a96e]" placeholder="اسمك" />
            </label>
          )}
          <label className="block space-y-1.5">
            <span className="text-xs text-[#f3f1ec]">البريد الإلكتروني</span>
            <input value={email} onChange={(e)=>setEmail(e.target.value)} required type="email" autoComplete="email" className="w-full rounded-xl border border-[#232329] bg-[#18181c] px-3 py-3 text-sm text-[#f3f1ec] outline-none focus:border-[#c8a96e]" placeholder="name@example.com" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-[#f3f1ec]">كلمة المرور</span>
            <input value={password} onChange={(e)=>setPassword(e.target.value)} required minLength={mode==='register'?12:1} maxLength={128} type="password" autoComplete={mode==='register'?'new-password':'current-password'} className="w-full rounded-xl border border-[#232329] bg-[#18181c] px-3 py-3 text-sm text-[#f3f1ec] outline-none focus:border-[#c8a96e]" placeholder={mode==='register'?'12 حرفاً على الأقل':'كلمة المرور'} />
            {mode === 'register' && <span className="block text-[10px] text-[#66645e]">استخدم كلمة مرور طويلة وفريدة لا تستعملها في خدمة أخرى.</span>}
          </label>

          {error && <div role="alert" className="rounded-xl border border-[#b86157]/40 bg-[#1a1111] p-3 text-xs leading-5 text-[#efb9ad]">{error}</div>}

          <button disabled={busy} type="submit" className="touch-press w-full rounded-xl bg-gradient-to-l from-[#e6d1a3] to-[#c8a96e] py-3.5 text-sm font-extrabold text-[#141108] disabled:opacity-50 cursor-pointer">
            {busy ? 'جارٍ التحقق…' : mode==='register'?'إنشاء حساب خاص':'الدخول إلى حسابي'}
            {!busy && <ArrowLeft className="mr-1 inline h-4 w-4" />}
          </button>

          <div className="flex items-start gap-2 border-t border-[#232329] pt-4 text-[10px] leading-5 text-[#96938a]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#c8a96e]" />
            بيانات الحساب والملف الصحي تُرسل إلى خادم الخدمة عبر اتصال HTTPS عند تفعيل النسخة المتصلة. لا تدخل بيانات طبية غير لازمة.
          </div>
        </form>
      </div>
    </main>
  );
};
