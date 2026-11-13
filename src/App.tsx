import React, { useEffect, useState } from 'react';
import { createInitialState, STATE_VERSION } from './data/seed';
import { AppState, AppTab } from './types';
import { GlobalStatusBar } from './components/GlobalStatusBar';
import { WelcomeView } from './components/WelcomeView';
import { CalculatorWizard } from './components/CalculatorWizard';
import { TodayView } from './components/TodayView';
import { MealBuilder } from './components/MealBuilder';
import { CartView } from './components/CartView';
import { JournalView } from './components/JournalView';
import { AccountView } from './components/AccountView';
import { AdminView } from './components/AdminView';
import { AuthView } from './components/AuthView';
import { OperationsView } from './components/OperationsView';
import { API_ENABLED, apiRequest, ApiSession, ApiUser } from './services/api';
import {
  Home,
  ShoppingBag,
  Sliders,
  TrendingUp,
  User,
  UtensilsCrossed,
  Sun,
  Moon,
} from 'lucide-react';

const STORAGE_KEY = 'nutrifit_dz_state_v2';

interface ToastItem {
  id: number;
  msg: string;
  undo?: () => void;
}

function loadState(): AppState {
  const defaults = createInitialState();
  if (API_ENABLED) return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState>;
      if (parsed && parsed.ver === STATE_VERSION && Array.isArray(parsed.foods)) {
        return {
          ...defaults,
          ...parsed,
          // The local prototype has no server-side identity provider. Never
          // restore an operator session or expose the admin route to customers.
          tab:
            parsed.tab === 'home' ||
            parsed.tab === 'menu' ||
            parsed.tab === 'cart' ||
            parsed.tab === 'jr' ||
            parsed.tab === 'me'
              ? parsed.tab
              : defaults.tab,
          adminMode: false,
          zones:
            Array.isArray(parsed.zones) && parsed.zones.length > 0
              ? parsed.zones
              : defaults.zones,
          pricingConfig: parsed.pricingConfig
            ? { ...defaults.pricingConfig, ...parsed.pricingConfig }
            : defaults.pricingConfig,
          mealNames:
            Array.isArray(parsed.mealNames) && parsed.mealNames.length > 0
              ? parsed.mealNames
              : defaults.mealNames,
          activeSlot: typeof parsed.activeSlot === 'number' ? parsed.activeSlot : 0,
        };
      }
    }
  } catch {
    // ignore corrupted local storage
  }
  return defaults;
}

export default function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [theme, setTheme] = useState<'light'|'dark'>(() => (localStorage.getItem('nf_theme') as 'light'|'dark') || 'light');
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('nf_theme', theme); }, [theme]);
  const [showWelcome, setShowWelcome] = useState(() => state.ob === 0);
  const [session, setSession] = useState<ApiSession | null>(null);
  const [sessionReady, setSessionReady] = useState(!API_ENABLED);

  const hydrateRemoteWorkspace = async (token: string, user: ApiUser) => {
    const [profileResponse, foodsResponse, dishesResponse, zonesResponse, ordersResponse] = await Promise.all([
      apiRequest<{ profile: any }>('/api/profile', token),
      apiRequest<{ foods: any[] }>('/api/foods', token),
      apiRequest<{ dishes: any[] }>('/api/dishes', token),
      apiRequest<{ zones: any[] }>('/api/zones', token),
      apiRequest<{ orders: any[] }>('/api/orders', token),
    ]);
    const profile = profileResponse.profile;
    const foods = foodsResponse.foods.map((food) => ({
      id: food.id,
      emoji: food.category === 'protein' ? '🍗' : food.category === 'carb' ? '🍚' : food.category === 'fat' ? '🫒' : food.category === 'veg' ? '🥦' : '🥤',
      name: food.name_ar,
      nameFr: food.name_fr || undefined,
      nameEn: food.name_en || undefined,
      cat: food.category,
      unitLabel: food.category === 'juice' ? '100مل' : undefined,
      per100: {
        kcal: Number(food.kcal_per_100), p: Number(food.protein_per_100),
        c: Number(food.carbs_per_100), f: Number(food.fat_per_100), fiber: Number(food.fiber_per_100),
      },
      price: Number(food.price_dzd_per_100),
      al: food.allergens ?? [],
      available: true,
      nutritionDataStatus: 'verified' as const,
      nutritionBasis: food.nutrition_basis,
      nutritionSource: food.nutrition_source,
      sourceRecordId: food.source_record_id || undefined,
      ediblePortionPct: food.edible_portion_pct !== null && food.edible_portion_pct !== undefined ? Number(food.edible_portion_pct) : undefined,
      cookingYield: food.cooking_yield !== null && food.cooking_yield !== undefined ? Number(food.cooking_yield) : undefined,
    }));
    const dishes = dishesResponse.dishes.map((dish) => ({
      id: dish.id,
      emoji: '🍽️',
      name: dish.name_ar,
      ing: (dish.ingredients ?? []).map((ingredient: any) => [ingredient.foodId, Number(ingredient.grams)] as [string, number]),
      available: true,
    }));
    const zones = zonesResponse.zones.map((zone) => ({
      id: zone.id, title: zone.title, areas: zone.areas, hours: zone.service_hours,
      fee: Number(zone.fee_dzd), active: true,
    }));
    const orders = ordersResponse.orders.map((order) => ({
      id: order.id,
      createdAt: order.created_at,
      date: String(order.delivery_date).slice(0,10),
      n: Number(order.meal_count),
      zoneTitle: order.delivery_zone_title,
      zoneFee: Number(order.delivery_fee_dzd),
      note: order.customer_note ?? '',
      ingCost: Number(order.ingredient_cost_dzd),
      handling: Number(order.handling_fee_dzd),
      service: Number(order.service_fee_dzd),
      total: Number(order.total_dzd),
      kcal: Number(order.kcal_total),
      p: Number(order.protein_total),
      c: Number(order.carbs_total),
      f: Number(order.fat_total),
      status: order.order_status === 'confirmed' ? 'C' as const : order.order_status === 'waitlisted' ? 'W' as const : 'X' as const,
      productionStage: order.production_stage ?? undefined,
      items: (order.items ?? []).map((item: any) => ({
        label: item.label,
        grams: Number(item.grams),
        kcal: Number(item.kcal),
        p: Number(item.protein),
        slot: Number(item.slot),
        slotName: item.slot_name,
        rawIngredients: Array.isArray(item.ingredients)
          ? item.ingredients.map((ing: any) => [String(ing.name ?? ''), Number(ing.grams ?? 0)] as [string, number])
          : [],
      })),
    }));
    const hasProfile = Boolean(profile?.age);
    setState((prev) => ({
      ...prev,
      name: profile?.name || user.name,
      sex: profile?.sex || prev.sex,
      age: Number(profile?.age) || prev.age,
      h: Number(profile?.height_cm) || prev.h,
      w: Number(profile?.weight_kg) || prev.w,
      targetWeight: Number(profile?.target_weight_kg) || prev.targetWeight,
      lbm: Number(profile?.lbm_kg) || 0,
      rel: Number(profile?.lbm_reliability_pct) || 0,
      lbmMethod: profile?.lbm_method || 'none',
      band: profile?.activity_band || prev.band,
      pal: Number(profile?.pal) || prev.pal,
      goal: profile?.goal || prev.goal,
      pct: Number(profile?.goal_adjustment_pct) || 0,
      al: profile?.allergens ?? [],
      fl: profile?.health_flags ?? { preg:false,kid:false,dia:false,ed:false },
      foods,
      dishes,
      zones,
      zoneId: zones[0]?.id ?? '',
      meals: [],
      ord: orders,
      jr: [],
      photos: [],
      ob: hasProfile ? 6 : 0,
      tab: 'home',
      adminMode: false,
    }));
    setShowWelcome(!hasProfile);
  };

  const handleAuthenticated = async (nextSession: ApiSession) => {
    localStorage.setItem('nf_auth_token', nextSession.token);
    setSessionReady(false);
    setSession(nextSession);
    try {
      if (nextSession.user.role === 'customer') {
        await hydrateRemoteWorkspace(nextSession.token, nextSession.user);
      }
      setSessionReady(true);
    } catch (error) {
      localStorage.removeItem('nf_auth_token');
      setSession(null);
      setSessionReady(true);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('nf_auth_token');
    setSession(null);
    setState(createInitialState());
    setShowWelcome(true);
  };

  useEffect(() => {
    if (!API_ENABLED) return;
    let cancelled = false;
    const token = localStorage.getItem('nf_auth_token');
    if (!token) {
      setSessionReady(true);
      return;
    }
    apiRequest<{ user: ApiUser }>('/api/auth/me', token)
      .then(async ({ user }) => {
        if (cancelled) return;
        const restored = { token, user };
        setSession(restored);
        if (user.role === 'customer') {
          await hydrateRemoteWorkspace(token, user);
        }
      })
      .catch(() => {
        localStorage.removeItem('nf_auth_token');
        if (!cancelled) setSession(null);
      })
      .finally(() => {
        if (!cancelled) setSessionReady(true);
      });
    return () => { cancelled = true; };
  }, []);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pickerRequest, setPickerRequest] = useState<{ slot: number; seq: number } | null>(null);
  const [cartPulseSeq, setCartPulseSeq] = useState(0);
  const [cartAnimating, setCartAnimating] = useState(false);

  const triggerCartPulse = () => {
    setCartPulseSeq((s) => s + 1);
  };

  useEffect(() => {
    if (cartPulseSeq === 0) return;
    setCartAnimating(true);
    const id = window.setTimeout(() => setCartAnimating(false), 440);
    return () => window.clearTimeout(id);
  }, [cartPulseSeq]);

  useEffect(() => {
    if (API_ENABLED) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage quota errors
    }
  }, [state]);

  const showToast = (msg: string, undo?: () => void) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, msg, undo }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, undo ? 5000 : 2500);
  };

  useEffect(() => {
    if (!API_ENABLED || !session || session.user.role !== 'customer' || state.ob < 6) return;
    const timeout = window.setTimeout(() => {
      void apiRequest('/api/profile', session.token, {
        method: 'PUT',
        body: JSON.stringify({
          sex: state.sex, age: state.age, heightCm: state.h, weightKg: state.w,
          targetWeightKg: state.targetWeight, lbmKg: state.lbm,
          lbmReliabilityPct: state.rel, lbmMethod: state.lbmMethod ?? 'none',
          activityBand: state.band, pal: state.pal, goal: state.goal,
          goalAdjustmentPct: state.pct, allergens: state.al, healthFlags: state.fl,
        }),
      }).catch((error) => showToast(error instanceof Error ? error.message : 'تعذر مزامنة الملف الصحي.'));
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [API_ENABLED, session?.token, session?.user.role, state.ob, state.sex, state.age, state.h, state.w,
      state.targetWeight, state.lbm, state.rel, state.lbmMethod, state.band, state.pal, state.goal,
      state.pct, state.al.join(','), state.fl.preg, state.fl.kid, state.fl.dia, state.fl.ed]);

  const navigate = (tab: AppTab) => {
    setPickerRequest(null);
    setState((prev) => ({ ...prev, tab }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const enterOwnerWorkspace = () => {
    setPickerRequest(null);
    setState((prev) => ({ ...prev, adminMode: true, tab: 'admin' }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const exitOwnerWorkspace = () => {
    setState((prev) => ({ ...prev, tab: 'home' }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectMealSlotAndGoMenu = (slotIdx: number) => {
    const safeIdx = Math.max(0, Math.min(state.n - 1, slotIdx));
    setState((prev) => ({
      ...prev,
      activeSlot: safeIdx,
      tab: 'menu',
    }));
    setPickerRequest((prev) => ({ slot: safeIdx, seq: (prev?.seq ?? 0) + 1 }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetAll = () => {
    const fresh = createInitialState();
    setState(fresh);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    showToast('تم تصفير جميع البيانات');
  };

  const navItems: { id: AppTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'home', label: 'اليوم', icon: <Home className="w-5 h-5" /> },
    { id: 'menu', label: 'الوجبات', icon: <UtensilsCrossed className="w-5 h-5" /> },
    {
      id: 'cart',
      label: 'السلة',
      icon: <ShoppingBag className="w-5 h-5" />,
      badge: state.meals.length > 0 ? state.meals.length : undefined,
    },
    { id: 'jr', label: 'تطوري', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'me', label: 'حسابي', icon: <User className="w-5 h-5" /> },
  ];

  if (API_ENABLED && !sessionReady) {
    return <div className="min-h-screen bg-[var(--nf-bg)] text-[var(--nf-ink)] flex items-center justify-center text-sm">جارٍ التحقق من الجلسة وتحميل ملفك…</div>;
  }
  if (API_ENABLED && !session) {
    return <AuthView onAuthenticated={handleAuthenticated} />;
  }
  if (API_ENABLED && session && session.user.role !== 'customer') {
    return <OperationsView session={session} onLogout={logout} />;
  }

  // Onboarding / Scientific Calculator Wizard
  if (state.ob < 6 && state.tab !== 'admin') {
    if (showWelcome) {
      return <WelcomeView onStart={() => setShowWelcome(false)} />;
    }
    return (
      <div className="min-h-screen">
        <CalculatorWizard
          state={state}
          onUpdate={setState}
          onFinish={() => {
            if (API_ENABLED && session) {
              const payload = {
                sex: state.sex, age: state.age, heightCm: state.h, weightKg: state.w,
                targetWeightKg: state.targetWeight, lbmKg: state.lbm,
                lbmReliabilityPct: state.rel, lbmMethod: state.lbmMethod ?? 'none',
                activityBand: state.band, pal: state.pal, goal: state.goal,
                goalAdjustmentPct: state.pct, allergens: state.al, healthFlags: state.fl,
              };
              void apiRequest('/api/profile', session.token, {
                method: 'PUT', body: JSON.stringify(payload),
              }).then(() => setState((prev) => ({ ...prev, ob: 6, tab: 'home' })))
                .catch((error) => showToast(error instanceof Error ? error.message : 'تعذر حفظ الملف على الخادم.'));
            } else {
              setState((prev) => ({ ...prev, ob: 6, tab: 'home' }));
            }
          }}
        />
      </div>
    );
  }

  // DEDICATED OWNER WORKSPACE (Completely separate interface from Client App)
  if (import.meta.env.DEV && state.tab === 'admin') {
    return (
      <div className="min-h-screen pb-12">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 pt-4">
          <AdminView
            state={state}
            onUpdate={setState}
            onExitOwner={exitOwnerWorkspace}
            onToast={showToast}
          />
        </div>

        {toasts.length > 0 && (
          <div className="fixed bottom-6 left-4 right-4 max-w-md mx-auto z-50 space-y-2 pointer-events-none">
            {toasts.map((t) => (
              <div
                key={t.id}
                className="pointer-events-auto bg-[#111114] border border-[#c8a96e]/60 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs font-semibold text-[#f3f1ec] shadow-2xl"
              >
                <span>{t.msg}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Customer workspace — editorial dashboard and task-oriented navigation
  return (
    <div className="min-h-screen bg-[var(--nf-bg)] pb-24 lg:pb-10">
      <GlobalStatusBar state={state} />
      <div className="mx-auto max-w-[1440px] px-4 pt-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 border-b border-[var(--nf-border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--nf-green)] text-sm font-bold tracking-tight text-white">NF</div>
            <div><div className="text-sm font-bold tracking-[.08em] text-[var(--nf-ink)]">NUTRIFIT <span className="font-normal text-[var(--nf-sage)]">ATELIER</span></div><div className="mt-0.5 text-[10px] text-[var(--nf-muted)]">تغذية دقيقة · تحضير مخصص</div></div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-[var(--nf-border)] bg-[var(--nf-surface)] px-3 py-2 text-[10px] font-semibold text-[var(--nf-muted)] sm:inline-flex">مساحة العميل</span>
            <button type="button" onClick={() => setTheme(t => t === "light" ? "dark" : "light")} aria-label={theme === "light" ? "تفعيل الوضع الداكن" : "تفعيل الوضع الفاتح"} className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface)] text-[var(--nf-ink)]">{theme === "light" ? <Moon size={16}/> : <Sun size={16}/>}</button>
            {API_ENABLED && session && <button type="button" onClick={logout} className="min-h-10 rounded-xl px-3 text-xs font-bold text-[var(--nf-muted)] hover:bg-[var(--nf-surface-2)]">خروج</button>}
            {import.meta.env.DEV && <button type="button" onClick={enterOwnerWorkspace} className="min-h-10 rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface)] px-3 text-[11px] font-bold text-[var(--nf-green)]"><Sliders className="ml-1 inline h-3.5 w-3.5"/> الإدارة</button>}
          </div>
        </header>

        <div className="grid gap-6 pt-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-8">
          <aside className="hidden lg:block">
            <div className="sticky top-6 rounded-[24px] border border-[var(--nf-border)] bg-[var(--nf-surface)] p-3">
              <div className="px-3 pb-3 pt-2"><div className="text-[10px] font-bold tracking-[.16em] text-[var(--nf-dim)]">YOUR WORKSPACE</div><div className="mt-1 text-sm font-semibold text-[var(--nf-ink)]">القائمة الرئيسية</div></div>
              <nav aria-label="التنقل الرئيسي" className="space-y-1">
                {navItems.map((item) => {
                  const active = state.tab === item.id;
                  const isCart = item.id === 'cart';
                  return <button key={item.id} type="button" data-cart-target={isCart ? 'true' : undefined} onClick={() => navigate(item.id)} className={`touch-press flex min-h-12 w-full items-center justify-between rounded-xl px-3 text-xs font-bold transition-colors ${active ? 'bg-[var(--nf-green-soft)] text-[var(--nf-green)]' : 'text-[var(--nf-muted)] hover:bg-[var(--nf-surface-2)]'} ${isCart && cartAnimating ? 'animate-cart-land' : ''}`}>
                    <span className="flex items-center gap-3">{item.icon}<span>{item.label}</span></span>
                    {item.badge !== undefined && <span className="min-w-5 rounded-full bg-[var(--nf-green)] px-1.5 py-1 text-center text-[10px] text-white tabular-nums">{item.badge}</span>}
                  </button>;
                })}
              </nav>
              <div className="mt-4 border-t border-[var(--nf-border)] px-3 pt-4"><div className="text-[10px] leading-5 text-[var(--nf-muted)]">خطتك، مكوناتك، وطلباتك في مساحة واحدة.</div></div>
            </div>
          </aside>

          <main className="min-w-0">
            {state.tab === 'home' && <TodayView state={state} onNavigate={navigate} onSelectMealSlot={selectMealSlotAndGoMenu} onReopenCalc={() => setState(prev => ({...prev, ob:1}))}/>}
            {state.tab === 'menu' && <MealBuilder state={state} onUpdate={setState} onNavigate={navigate} onToast={showToast} onCartPulse={triggerCartPulse} pickerRequest={pickerRequest}/>}
            {state.tab === 'cart' && <CartView state={state} onUpdate={setState} onNavigate={navigate} onSelectMealSlot={selectMealSlotAndGoMenu} onToast={showToast} apiEnabled={API_ENABLED} authToken={session?.token}/>}
            {state.tab === 'jr' && <JournalView state={state} onUpdate={setState} onToast={showToast}/>}
            {state.tab === 'me' && <AccountView state={state} onReopenCalc={() => setState(prev => ({...prev, ob:1}))} onResetAll={resetAll} onToast={showToast}/>}
          </main>
        </div>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav
        aria-label="التنقل الرئيسي"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--nf-border)] bg-[var(--nf-surface)]/95 px-2 pt-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(32,39,34,.07)] backdrop-blur-xl"
      >
        <div className="mx-auto flex max-w-lg items-center justify-around gap-1">
          {navItems.map((item) => {
            const active = state.tab === item.id;
            const isCart = item.id === 'cart';
            return (
              <button
                key={item.id}
                type="button"
                data-cart-target={isCart ? 'true' : undefined}
                onClick={() => navigate(item.id)}
                className={`touch-press relative flex-1 min-h-[52px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors cursor-pointer ${
                  active ? 'text-[var(--nf-green)]' : 'text-[var(--nf-muted)] hover:text-[var(--nf-ink)]'
                } ${isCart && cartAnimating ? 'animate-cart-land text-[#e6d1a3]' : ''}`}
              >
                {item.icon}
                <span className="whitespace-nowrap">{item.label}</span>
                {item.badge !== undefined && (
                  <span className="absolute top-1 left-1/2 translate-x-2 text-[9px] bg-[var(--nf-green)] text-white font-bold rounded-full px-1.5 leading-tight tabular-nums">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Toast Stack */}
      {toasts.length > 0 && (
        <div className="fixed bottom-20 lg:bottom-6 left-4 right-4 max-w-md mx-auto z-50 space-y-2 pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="pointer-events-auto bg-[#111114] border border-[#c8a96e]/60 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs font-semibold text-[#f3f1ec] shadow-2xl"
            >
              <span>{t.msg}</span>
              {t.undo && (
                <button
                  type="button"
                  onClick={() => {
                    t.undo?.();
                    setToasts((prev) => prev.filter((x) => x.id !== t.id));
                  }}
                  className="touch-press text-[#c8a96e] font-bold cursor-pointer shrink-0"
                >
                  تراجع
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
