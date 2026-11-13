import React, { useEffect, useMemo, useState } from 'react';
import { ApiSession, apiRequest } from '../services/api';
import { ChefHat, Plus, RefreshCw, ShieldCheck, Truck, Users, History } from 'lucide-react';

interface OperationsViewProps {
  session: ApiSession;
  onLogout: () => void;
}
type Tab = 'orders' | 'foods' | 'dishes' | 'zones' | 'settings' | 'users' | 'audit';
const basisLabels: Record<string, string> = {
  raw: 'وزن نيء',
  cooked: 'وزن مطبوخ',
  as_sold: 'كما يباع',
  unspecified: 'حالة وزن غير محددة',
};
const stageLabels: Record<string, string> = {
  queued: 'بانتظار التحضير',
  preparing: 'قيد التحضير',
  packed: 'تم الوزن والتعبئة',
  out_for_delivery: 'خرج للتوصيل',
  delivered: 'تم التسليم',
};
const roleLabels: Record<string, string> = {
  customer: 'عميل',
  kitchen: 'مطبخ',
  delivery: 'توصيل',
  admin: 'إدارة',
};

export const OperationsView: React.FC<OperationsViewProps> = ({ session, onLogout }) => {
  const role = session.user.role;
  const isAdmin = role === 'admin';
  const isDelivery = role === 'delivery';
  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<any[]>([]);
  const [foods, setFoods] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [dishes, setDishes] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({
    handling_pct: 7,
    service_fee_per_meal: 200,
    cutoff_hour: 16,
    daily_capacity_boxes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [food, setFood] = useState<any>({
    name: '',
    nameFr: '',
    nameEn: '',
    category: 'protein',
    kcal: '',
    protein: '',
    carbs: '',
    fat: '',
    fiber: '0',
    priceDzdPer100: '',
    nutritionBasis: 'raw',
    nutritionSource: '',
    sourceRecordId: '',
    ediblePortionPct: '',
    cookingYield: '',
    allergens: [],
  });
  const [dishName, setDishName] = useState('');
  const [dishFoodId, setDishFoodId] = useState('');
  const [dishGrams, setDishGrams] = useState('100');
  const [dishIngredients, setDishIngredients] = useState<Array<{ foodId: string; grams: number }>>([]);
  const [zone, setZone] = useState({ title: '', areas: '', serviceHours: '', feeDzd: '0' });
  const [driverIds, setDriverIds] = useState<Record<string, string>>({});

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      if (isDelivery) {
        const data = await apiRequest<{ orders: any[] }>('/api/delivery/orders', session.token);
        setOrders(data.orders);
      } else {
        const data = await apiRequest<{ orders: any[] }>(
          isAdmin ? '/api/admin/orders' : '/api/kitchen/orders',
          session.token
        );
        setOrders(data.orders);
      }
      if (isAdmin) {
        const [foodData, zoneData, dishData, settingsData, staffData, customersData, auditData] = await Promise.all([
          apiRequest<{ foods: any[] }>('/api/admin/foods', session.token),
          apiRequest<{ zones: any[] }>('/api/admin/zones', session.token),
          apiRequest<{ dishes: any[] }>('/api/admin/dishes', session.token),
          apiRequest<{ settings: any }>('/api/admin/settings', session.token),
          apiRequest<{ staff: any[] }>('/api/admin/staff', session.token),
          apiRequest<{ customers: any[] }>('/api/admin/customers', session.token),
          apiRequest<{ logs: any[] }>('/api/admin/audit', session.token),
        ]);
        setFoods(foodData.foods);
        setZones(zoneData.zones);
        setDishes(dishData.dishes);
        setStaff(staffData.staff);
        setCustomers(customersData.customers);
        setAuditLogs(auditData.logs);
        if (settingsData.settings) setSettings(settingsData.settings);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل بيانات العمليات.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [session.token]);

  const kitchenPrepSummary = useMemo(() => {
    if (isDelivery) return [];
    const map = new Map<string, { name: string; basis: string; source: string; grams: number }>();
    for (const order of orders) {
      if (isAdmin && order.order_status !== 'confirmed') continue;
      if (!Array.isArray(order.items)) continue;
      for (const item of order.items) {
        if (!Array.isArray(item.ingredients)) continue;
        for (const ing of item.ingredients) {
          const basis = ing.basis || 'unspecified';
          const source = ing.source || '';
          const key = `${ing.name}__${basis}__${source}`;
          const prev = map.get(key) ?? { name: ing.name, basis, source, grams: 0 };
          prev.grams += Number(ing.grams || 0);
          map.set(key, prev);
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.grams - a.grams);
  }, [orders, isAdmin, isDelivery]);

  const run = async (task: () => Promise<void>, success: string) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await task();
      setNotice(success);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إكمال العملية.');
    } finally {
      setBusy(false);
    }
  };

  const createFood = () =>
    run(async () => {
      await apiRequest('/api/admin/foods', session.token, {
        method: 'POST',
        body: JSON.stringify({
          ...food,
          kcal: Number(food.kcal),
          protein: Number(food.protein),
          carbs: Number(food.carbs),
          fat: Number(food.fat),
          fiber: Number(food.fiber),
          priceDzdPer100: Number(food.priceDzdPer100),
          ediblePortionPct: food.ediblePortionPct === '' ? null : Number(food.ediblePortionPct),
          cookingYield: food.cookingYield === '' ? null : Number(food.cookingYield),
        }),
      });
      setFood({
        name: '',
        nameFr: '',
        nameEn: '',
        category: 'protein',
        kcal: '',
        protein: '',
        carbs: '',
        fat: '',
        fiber: '0',
        priceDzdPer100: '',
        nutritionBasis: 'raw',
        nutritionSource: '',
        sourceRecordId: '',
        ediblePortionPct: '',
        cookingYield: '',
        allergens: [],
      });
    }, 'حُفظ المكوّن كمسودة غير موثقة وغير نشطة.');

  const verifyFood = (item: any, verified: boolean) =>
    run(async () => {
      await apiRequest('/api/admin/foods/' + item.id + '/verification', session.token, {
        method: 'PATCH',
        body: JSON.stringify({
          verified,
          nutritionBasis: item.nutrition_basis,
          nutritionSource: item.nutrition_source ?? '',
          sourceRecordId: item.source_record_id ?? '',
        }),
      });
    }, verified ? 'تم اعتماد سجل التوثيق.' : 'تم إلغاء اعتماد التوثيق وإيقاف المكوّن.');

  const toggleFood = (item: any) =>
    run(async () => {
      await apiRequest('/api/admin/foods/' + item.id + '/active', session.token, {
        method: 'PATCH',
        body: JSON.stringify({ active: !item.active }),
      });
    }, 'تم تحديث حالة المكوّن.');

  const addDishIngredient = () => {
    if (!dishFoodId || Number(dishGrams) <= 0) return;
    setDishIngredients((prev) => [...prev, { foodId: dishFoodId, grams: Number(dishGrams) }]);
  };

  const createDish = () =>
    run(async () => {
      await apiRequest('/api/admin/dishes', session.token, {
        method: 'POST',
        body: JSON.stringify({ name: dishName, ingredients: dishIngredients }),
      });
      setDishName('');
      setDishIngredients([]);
    }, 'أُضيف الطبق كمسودة غير نشطة.');

  const toggleDish = (dish: any) =>
    run(async () => {
      await apiRequest('/api/admin/dishes/' + dish.id + '/active', session.token, {
        method: 'PATCH',
        body: JSON.stringify({ active: !dish.active }),
      });
    }, 'تم تحديث حالة الطبق.');

  const createZone = () =>
    run(async () => {
      await apiRequest('/api/admin/zones', session.token, {
        method: 'POST',
        body: JSON.stringify({ ...zone, feeDzd: Number(zone.feeDzd) }),
      });
      setZone({ title: '', areas: '', serviceHours: '', feeDzd: '0' });
    }, 'أُضيف نطاق الخدمة بحالة متوقفة.');

  const toggleZone = (item: any) =>
    run(async () => {
      await apiRequest('/api/admin/zones/' + item.id, session.token, {
        method: 'PATCH',
        body: JSON.stringify({ active: !item.active }),
      });
    }, 'تم تحديث نطاق الخدمة.');

  const saveSettings = () =>
    run(async () => {
      await apiRequest('/api/admin/settings', session.token, {
        method: 'PATCH',
        body: JSON.stringify({
          handlingPct: Number(settings.handling_pct),
          serviceFeePerMeal: Number(settings.service_fee_per_meal),
          cutoffHour: Number(settings.cutoff_hour),
          dailyCapacityBoxes: Number(settings.daily_capacity_boxes),
        }),
      });
    }, 'حُفظت إعدادات التشغيل.');

  const updateStage = (order: any, stage: string) =>
    run(async () => {
      await apiRequest('/api/kitchen/orders/' + order.id + '/stage', session.token, {
        method: 'PATCH',
        body: JSON.stringify({ stage }),
      });
    }, 'تم تحديث مرحلة الطلب.');

  const assignDriver = (order: any) =>
    run(async () => {
      await apiRequest('/api/admin/orders/' + order.id + '/assign-delivery', session.token, {
        method: 'POST',
        body: JSON.stringify({ deliveryUserId: driverIds[order.id] }),
      });
    }, 'تم إسناد الطلب إلى حساب التوصيل.');

  const confirmWaitlist = (order: any) =>
    run(async () => {
      await apiRequest('/api/admin/orders/' + order.id + '/confirm', session.token, { method: 'POST' });
    }, 'تم تأكيد الطلب بعد التحقق من السعة.');

  const cancelAdminOrder = (order: any) =>
    run(async () => {
      await apiRequest('/api/admin/orders/' + order.id + '/cancel', session.token, {
        method: 'POST',
        body: JSON.stringify({ reason: 'إلغاء إداري' }),
      });
    }, 'تم إلغاء الطلب.');

  const updateUserRole = (userId: string, nextRole: string) =>
    run(async () => {
      await apiRequest('/api/admin/staff/' + userId + '/role', session.token, {
        method: 'PATCH',
        body: JSON.stringify({ role: nextRole }),
      });
    }, 'تم تحديث صلاحية الحساب.');

  const field = (label: string, value: string, onChange: (value: string) => void, type = 'text', placeholder = '') => (
    <label className="block space-y-1">
      <span className="text-[11px] text-[#aaa79b]">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[#34372e] bg-[#0c100d] px-3 py-2.5 text-xs text-[#f4f1e9] outline-none focus:border-[#c9a85c]"
      />
    </label>
  );

  return (
    <main dir="rtl" className="min-h-screen bg-[#0b0e0c] text-[#f4f1e9] px-3 py-5 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#3b3a2d] bg-[#121612] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c9a85c]/10 text-[#d8c18b]">
              {isDelivery ? <Truck size={19} /> : <ChefHat size={19} />}
            </div>
            <div>
              <div className="text-[10px] tracking-[.2em] text-[#c9b783]">NUTRIFIT · OPERATIONS</div>
              <h1 className="mt-1 text-lg font-bold">
                {isAdmin ? 'مركز إدارة التشغيل' : isDelivery ? 'مسار التسليم' : 'لوحة إنتاج المطبخ'}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => void refresh()} className="rounded-lg border border-[#34372e] p-2 text-[#c9b783] cursor-pointer" aria-label="تحديث">
              <RefreshCw size={16} />
            </button>
            <button onClick={onLogout} className="rounded-lg border border-[#34372e] px-3 py-2 text-xs text-[#c9b783] cursor-pointer">
              تسجيل الخروج
            </button>
          </div>
        </header>

        {isAdmin && (
          <nav className="flex gap-1 overflow-x-auto rounded-xl border border-[#292d25] bg-[#121612] p-1">
            {(['orders', 'foods', 'dishes', 'zones', 'settings', 'users', 'audit'] as Tab[]).map((key) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={
                  'shrink-0 rounded-lg px-4 py-2.5 text-xs font-bold cursor-pointer ' +
                  (tab === key ? 'bg-[#2b2619] text-[#e5cf94]' : 'text-[#929084]')
                }
              >
                {
                  (
                    {
                      orders: 'الطلبات والمطبخ',
                      foods: 'قاعدة الأغذية',
                      dishes: 'وصفات الشيف',
                      zones: 'مناطق الخدمة',
                      settings: 'التشغيل والأسعار',
                      users: 'العملاء والموظفون',
                      audit: 'سجل التدقيق',
                    } as Record<Tab, string>
                  )[key]
                }
              </button>
            ))}
          </nav>
        )}

        {error && (
          <div role="alert" className="rounded-xl border border-[#a64d42]/50 bg-[#281714] p-3 text-xs leading-5 text-[#efb9ad]">
            {error}
          </div>
        )}
        {notice && (
          <div role="status" className="rounded-xl border border-[#517b60]/50 bg-[#142219] p-3 text-xs leading-5 text-[#b8d4bd]">
            {notice}
          </div>
        )}
        {loading && <div className="py-10 text-center text-sm text-[#c9b783]">جارٍ تحميل بيانات التشغيل…</div>}

        {!loading && (tab === 'orders' || !isAdmin) && (
          <section className="space-y-4">
            {!isDelivery && kitchenPrepSummary.length > 0 && (
              <div className="rounded-2xl border border-[#c9a85c]/35 bg-[#121612] p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-[#e5cf94]">ملخص المكونات الإجمالي للتحضير (الطلبات المؤكدة)</h2>
                  <span className="text-[11px] text-[#aaa79b] tabular-nums">{kitchenPrepSummary.length} صنف</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {kitchenPrepSummary.map((row, idx) => (
                    <div key={idx} className="rounded-xl border border-[#292d25] bg-[#0c100d] p-3 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <div className="font-bold text-[#f4f1e9] truncate">{row.name}</div>
                        <div className="text-[10px] text-[#88877b] truncate">
                          {basisLabels[row.basis] ?? row.basis}
                          {row.source ? ` · ${row.source}` : ''}
                        </div>
                      </div>
                      <span className="font-bold text-[#e5cf94] tabular-nums shrink-0">{Math.round(row.grams)} غ</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">قائمة العمل · {orders.length} طلب</h2>
              <span className="text-[10px] text-[#88877b]">بيانات الخادم</span>
            </div>
            {orders.length === 0 && (
              <div className="rounded-xl border border-[#292d25] bg-[#121612] p-6 text-center text-xs text-[#88877b]">
                لا توجد طلبات مخصصة لهذا اليوم أو لهذا الحساب.
              </div>
            )}
            {orders.map((order) => (
              <article key={order.id} className="rounded-2xl border border-[#303329] bg-[#121612] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-[#e5cf94]">{order.order_number}</div>
                    <div className="mt-1 text-[11px] text-[#aaa79b]">
                      {order.customer_name} · {order.delivery_zone_title}
                      {order.meal_count ? ` · ${order.meal_count} وجبات` : ''}
                      {order.delivery_date ? ` · ${String(order.delivery_date).slice(0, 10)}` : ''}
                      {order.total_dzd !== undefined ? ` · ${Number(order.total_dzd)} دج` : ''}
                      {order.delivery_user_name ? ` · الموصّل: ${order.delivery_user_name}` : ''}
                    </div>
                    {order.customer_note && (
                      <div className="mt-1 text-[11px] text-[#d4a24c]">ملاحظة العميل: {order.customer_note}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isDelivery && order.total_dzd !== undefined && (
                      <span className="rounded-full border border-[#5aa882]/40 bg-[#142219] px-3 py-1 text-[10px] font-bold text-[#b8d4bd] tabular-nums">
                        تحصيل: {Number(order.total_dzd)} دج ({order.payment_status === 'paid' ? 'مدفوع' : 'عند الاستلام'})
                      </span>
                    )}
                    <span className="rounded-full border border-[#c9a85c]/30 px-3 py-1 text-[10px] text-[#d8c18b]">
                      {order.order_status === 'cancelled'
                        ? 'ملغى'
                        : stageLabels[order.production_stage ?? 'queued'] ?? order.order_status}
                    </span>
                  </div>
                </div>
                {Array.isArray(order.items) && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {order.items.map((item: any, index: number) => (
                      <div key={index} className="rounded-lg bg-[#0c100d] p-3 text-xs">
                        <div className="font-bold">{item.label}</div>
                        <div className="mt-1 text-[#aaa79b] tabular-nums">
                          {item.slot_name} · {Math.round(Number(item.grams))}غ
                        </div>
                        {item.ingredients?.length > 0 && (
                          <div className="mt-1 text-[10px] leading-5 text-[#aaa79b]">
                            {item.ingredients
                              .map(
                                (x: any) =>
                                  `${x.name} ${Math.round(Number(x.grams))}غ · ${basisLabels[x.basis] ?? 'حالة غير معروفة'}${x.source ? ` · ${x.source}` : ''}`
                              )
                              .join(' | ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {!isDelivery && order.production_stage && order.order_status === 'confirmed' && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-[#292d25] pt-3">
                    <label className="text-[11px] text-[#aaa79b]">تحديث المرحلة</label>
                    <select
                      value={order.production_stage}
                      onChange={(e) => void updateStage(order, e.target.value)}
                      disabled={busy}
                      className="min-w-0 flex-1 rounded-lg border border-[#34372e] bg-[#0c100d] px-3 py-2 text-xs"
                    >
                      {(isAdmin
                        ? ['queued', 'preparing', 'packed', 'out_for_delivery', 'delivered']
                        : ['queued', 'preparing', 'packed']
                      ).map((stage) => (
                        <option key={stage} value={stage}>
                          {stageLabels[stage]}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {isDelivery && (
                  <div className="flex items-center justify-between border-t border-[#292d25] pt-3 text-xs">
                    <span className="text-[#aaa79b]">
                      {order.production_stage === 'packed'
                        ? 'استلام الطلب من المطبخ'
                        : order.production_stage === 'out_for_delivery'
                          ? 'تسليم الطلب للعميل'
                          : 'بانتظار تجهيز المطبخ'}
                    </span>
                    {order.production_stage === 'packed' && (
                      <button
                        onClick={() => void updateStage(order, 'out_for_delivery')}
                        disabled={busy}
                        className="rounded-lg bg-[#c9a85c] px-4 py-2 font-bold text-[#17140d] disabled:opacity-40 cursor-pointer"
                      >
                        بدء التوصيل
                      </button>
                    )}
                    {order.production_stage === 'out_for_delivery' && (
                      <button
                        onClick={() => void updateStage(order, 'delivered')}
                        disabled={busy}
                        className="rounded-lg bg-[#c9a85c] px-4 py-2 font-bold text-[#17140d] disabled:opacity-40 cursor-pointer"
                      >
                        تأكيد التسليم
                      </button>
                    )}
                  </div>
                )}
                {isAdmin && order.order_status !== 'cancelled' && (
                  <div className="flex flex-wrap gap-2 border-t border-[#292d25] pt-3">
                    {order.order_status === 'waitlisted' && (
                      <button
                        onClick={() => void confirmWaitlist(order)}
                        disabled={busy}
                        className="rounded-lg bg-[#c9a85c] px-3 py-2 text-[11px] font-bold text-[#17140d] disabled:opacity-40 cursor-pointer"
                      >
                        تأكيد من قائمة الانتظار
                      </button>
                    )}
                    {order.order_status === 'confirmed' && (
                      <>
                        <select
                          value={driverIds[order.id] ?? order.delivery_user_id ?? ''}
                          onChange={(e) => setDriverIds((prev) => ({ ...prev, [order.id]: e.target.value }))}
                          className="min-w-0 flex-1 rounded-lg border border-[#34372e] bg-[#0c100d] px-3 py-2 text-[11px]"
                        >
                          <option value="">اختر الموصّل</option>
                          {staff
                            .filter((person) => person.role === 'delivery')
                            .map((person) => (
                              <option key={person.id} value={person.id}>
                                {person.name} · {person.email}
                              </option>
                            ))}
                        </select>
                        <button
                          onClick={() => void assignDriver(order)}
                          disabled={busy || !driverIds[order.id]}
                          className="rounded-lg border border-[#c9a85c]/40 px-3 py-2 text-[11px] text-[#e5cf94] disabled:opacity-40 cursor-pointer"
                        >
                          إسناد التوصيل
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => void cancelAdminOrder(order)}
                      disabled={busy}
                      className="rounded-lg border border-[#a64d42]/50 bg-[#281714] px-3 py-2 text-[11px] text-[#efb9ad] disabled:opacity-40 cursor-pointer"
                    >
                      إلغاء الطلب
                    </button>
                  </div>
                )}
              </article>
            ))}
          </section>
        )}

        {!loading && isAdmin && tab === 'foods' && (
          <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void createFood();
              }}
              className="rounded-2xl border border-[#303329] bg-[#121612] p-4 space-y-3"
            >
              <h2 className="text-sm font-bold">إضافة مكوّن غذائي</h2>
              {field('اسم المكوّن (بالعربية)', food.name, (v) => setFood({ ...food, name: v }))}
              <div className="grid grid-cols-2 gap-2">
                {field('الاسم بالفرنسية (اختياري)', food.nameFr, (v) => setFood({ ...food, nameFr: v }))}
                {field('الاسم بالإنجليزية (اختياري)', food.nameEn, (v) => setFood({ ...food, nameEn: v }))}
              </div>
              <label className="block text-[11px] text-[#aaa79b]">
                التصنيف
                <select
                  value={food.category}
                  onChange={(e) => setFood({ ...food, category: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[#34372e] bg-[#0c100d] p-2.5 text-xs"
                >
                  <option value="protein">بروتين</option>
                  <option value="carb">كربوهيدرات</option>
                  <option value="fat">دهون</option>
                  <option value="veg">خضروات</option>
                  <option value="juice">مشروبات</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {field('kcal / 100غ', food.kcal, (v) => setFood({ ...food, kcal: v }), 'number')}
                {field('بروتين غ', food.protein, (v) => setFood({ ...food, protein: v }), 'number')}
                {field('كربوهيدرات غ', food.carbs, (v) => setFood({ ...food, carbs: v }), 'number')}
                {field('دهون غ', food.fat, (v) => setFood({ ...food, fat: v }), 'number')}
                {field('ألياف غ', food.fiber, (v) => setFood({ ...food, fiber: v }), 'number')}
                {field('السعر دج / 100غ', food.priceDzdPer100, (v) => setFood({ ...food, priceDzdPer100: v }), 'number')}
                {field('النسبة القابلة للأكل %', food.ediblePortionPct, (v) => setFood({ ...food, ediblePortionPct: v }), 'number', '100')}
                {field('معامل مردود الطهي', food.cookingYield, (v) => setFood({ ...food, cookingYield: v }), 'number', '0.75')}
              </div>
              <label className="block text-[11px] text-[#aaa79b]">
                حالة الوزن
                <select
                  value={food.nutritionBasis}
                  onChange={(e) => setFood({ ...food, nutritionBasis: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[#34372e] bg-[#0c100d] p-2.5 text-xs"
                >
                  <option value="raw">نيء</option>
                  <option value="cooked">مطبوخ</option>
                  <option value="as_sold">كما يباع</option>
                  <option value="unspecified">غير محدد</option>
                </select>
              </label>
              {field('المصدر العلمي', food.nutritionSource, (v) => setFood({ ...food, nutritionSource: v }), 'text', 'USDA FoodData Central')}
              {field('معرّف المصدر (إن توفر)', food.sourceRecordId, (v) => setFood({ ...food, sourceRecordId: v }), 'text', 'FDC 171077')}
              <div className="space-y-2">
                <div className="text-[11px] text-[#aaa79b]">مسببات الحساسية الموجودة</div>
                <div className="flex flex-wrap gap-3 text-[11px]">
                  {(['gluten', 'eggs', 'fish', 'milk', 'nuts'] as string[]).map((key) => (
                    <label key={key} className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={food.allergens.includes(key)}
                        onChange={(e) =>
                          setFood({
                            ...food,
                            allergens: e.target.checked
                              ? [...food.allergens, key]
                              : food.allergens.filter((x: string) => x !== key),
                          })
                        }
                      />
                      {({ gluten: 'غلوتين', eggs: 'بيض', fish: 'سمك', milk: 'حليب', nuts: 'مكسرات' } as Record<string, string>)[key]}
                    </label>
                  ))}
                </div>
              </div>
              <button disabled={busy} className="w-full rounded-xl bg-[#c9a85c] py-3 text-xs font-extrabold text-[#17140d] disabled:opacity-40 cursor-pointer">
                <Plus className="ml-1 inline h-4 w-4" />
                حفظ كمسودة غير موثقة
              </button>
            </form>
            <div className="space-y-2">
              <h2 className="text-sm font-bold">سجل المكوّنات · {foods.length}</h2>
              {foods.map((item) => (
                <div key={item.id} className="rounded-xl border border-[#303329] bg-[#121612] p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold">
                        {item.name_ar}
                        {(item.name_fr || item.name_en) && (
                          <span className="text-[10px] font-normal text-[#88877b]">
                            {' '}
                            ({[item.name_fr, item.name_en].filter(Boolean).join(' / ')})
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-[10px] text-[#88877b]">
                        {item.category} · {basisLabels[item.nutrition_basis] ?? item.nutrition_basis} · {item.nutrition_verified ? 'موثق' : 'غير موثق'} · {item.active ? 'نشط' : 'متوقف'}
                        {item.nutrition_source ? ` · ${item.nutrition_source}` : ''}
                        {item.source_record_id ? ` (#${item.source_record_id})` : ''}
                        {item.cooking_yield ? ` · مردود الطهي ${item.cooking_yield}` : ''}
                      </div>
                    </div>
                    <div className="text-left text-[10px] text-[#c9b783] tabular-nums">{item.price_dzd_per_100} دج/100غ</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!item.nutrition_verified && (
                      <button
                        disabled={busy || !item.nutrition_source || item.nutrition_basis === 'unspecified'}
                        onClick={() => void verifyFood(item, true)}
                        className="rounded-lg border border-[#c9a85c]/40 px-3 py-2 text-[10px] text-[#e5cf94] disabled:opacity-40 cursor-pointer"
                      >
                        اعتماد التوثيق
                      </button>
                    )}
                    {item.nutrition_verified && (
                      <>
                        <button
                          disabled={busy}
                          onClick={() => void toggleFood(item)}
                          className="rounded-lg border border-[#5c9270]/40 px-3 py-2 text-[10px] text-[#a9d0b2] cursor-pointer"
                        >
                          {item.active ? 'إيقاف' : 'تفعيل'}
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => void verifyFood(item, false)}
                          className="rounded-lg border border-[#a64d42]/40 px-3 py-2 text-[10px] text-[#efb9ad] cursor-pointer"
                        >
                          إلغاء الاعتماد
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!loading && isAdmin && tab === 'dishes' && (
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#303329] bg-[#121612] p-4 space-y-3">
              <h2 className="text-sm font-bold">بناء وصفة</h2>
              {field('اسم الطبق', dishName, setDishName)}
              <div className="grid grid-cols-[1fr_100px_auto] items-end gap-2">
                <label className="block text-[11px] text-[#aaa79b]">
                  المكوّن
                  <select value={dishFoodId} onChange={(e) => setDishFoodId(e.target.value)} className="mt-1 w-full rounded-lg border border-[#34372e] bg-[#0c100d] p-2.5 text-xs">
                    <option value="">اختر مكوّناً نشطاً</option>
                    {foods
                      .filter((x) => x.active && x.nutrition_verified)
                      .map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name_ar}
                        </option>
                      ))}
                  </select>
                </label>
                {field('الوزن غ', dishGrams, setDishGrams, 'number')}
                <button type="button" onClick={addDishIngredient} className="rounded-lg border border-[#c9a85c]/40 p-2.5 text-[#e5cf94] cursor-pointer">
                  <Plus size={15} />
                </button>
              </div>
              <div className="space-y-1">
                {dishIngredients.map((item, index) => (
                  <div key={index} className="flex items-center justify-between rounded-lg bg-[#0c100d] p-2 text-[11px]">
                    <span>
                      {foods.find((x) => x.id === item.foodId)?.name_ar ?? 'مكوّن'} · {item.grams}غ
                    </span>
                    <button type="button" onClick={() => setDishIngredients((prev) => prev.filter((_, i) => i !== index))} className="text-[#d48d7f] cursor-pointer">
                      حذف
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => void createDish()}
                disabled={busy || !dishName.trim() || dishIngredients.length === 0}
                className="w-full rounded-xl bg-[#c9a85c] py-3 text-xs font-bold text-[#17140d] disabled:opacity-40 cursor-pointer"
              >
                حفظ الوصفة كمسودة
              </button>
            </div>
            <div className="space-y-2">
              <h2 className="text-sm font-bold">الوصفات المسجلة · {dishes.length}</h2>
              {dishes.map((dish) => (
                <div key={dish.id} className="rounded-xl border border-[#303329] bg-[#121612] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold">{dish.name_ar}</span>
                    <button onClick={() => void toggleDish(dish)} disabled={busy} className="text-[10px] text-[#e5cf94] cursor-pointer">
                      {dish.active ? 'إيقاف' : 'تفعيل بعد المراجعة'}
                    </button>
                  </div>
                  <div className="mt-2 text-[10px] text-[#88877b]">{(dish.ingredients ?? []).map((x: any) => x.name + ' ' + x.grams + 'غ').join(' · ')}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!loading && isAdmin && tab === 'zones' && (
          <section className="grid gap-4 lg:grid-cols-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void createZone();
              }}
              className="rounded-2xl border border-[#303329] bg-[#121612] p-4 space-y-3"
            >
              <h2 className="text-sm font-bold">إضافة منطقة خدمة</h2>
              {field('اسم المنطقة', zone.title, (v) => setZone({ ...zone, title: v }))}
              {field('الأحياء المشمولة', zone.areas, (v) => setZone({ ...zone, areas: v }))}
              {field('ساعات الخدمة الفعلية', zone.serviceHours, (v) => setZone({ ...zone, serviceHours: v }))}
              {field('رسوم التوصيل دج', zone.feeDzd, (v) => setZone({ ...zone, feeDzd: v }), 'number')}
              <button disabled={busy} className="w-full rounded-xl bg-[#c9a85c] py-3 text-xs font-bold text-[#17140d] cursor-pointer">
                إضافة كنطاق متوقف
              </button>
            </form>
            <div className="space-y-2">
              <h2 className="text-sm font-bold">نطاقات الخدمة · {zones.length}</h2>
              {zones.map((item) => (
                <div key={item.id} className="rounded-xl border border-[#303329] bg-[#121612] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold">{item.title}</span>
                    <button onClick={() => void toggleZone(item)} disabled={busy} className="text-[10px] text-[#e5cf94] cursor-pointer">
                      {item.active ? 'إيقاف' : 'تفعيل'}
                    </button>
                  </div>
                  <div className="mt-1 text-[10px] text-[#88877b]">
                    {item.areas} · {item.service_hours} · {item.fee_dzd} دج
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!loading && isAdmin && tab === 'settings' && (
          <section className="max-w-xl rounded-2xl border border-[#303329] bg-[#121612] p-4 space-y-3">
            <h2 className="text-sm font-bold">إعدادات التسعير والطاقة اليومية</h2>
            {field('المناولة %', String(settings.handling_pct), (v) => setSettings({ ...settings, handling_pct: v }), 'number')}
            {field('أجر الخدمة لكل وجبة دج', String(settings.service_fee_per_meal), (v) => setSettings({ ...settings, service_fee_per_meal: v }), 'number')}
            {field('موعد الإغلاق بالساعة 0–23', String(settings.cutoff_hour), (v) => setSettings({ ...settings, cutoff_hour: v }), 'number')}
            {field('سعة العلب اليومية (0 = إيقاف الطلبات)', String(settings.daily_capacity_boxes), (v) => setSettings({ ...settings, daily_capacity_boxes: v }), 'number')}
            <button onClick={() => void saveSettings()} disabled={busy} className="w-full rounded-xl bg-[#c9a85c] py-3 text-xs font-bold text-[#17140d] cursor-pointer">
              حفظ الإعدادات
            </button>
          </section>
        )}

        {!loading && isAdmin && tab === 'users' && (
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#303329] bg-[#121612] p-4 space-y-3">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Users size={16} className="text-[#c9a85c]" />
                فريق التشغيل ({staff.length})
              </h2>
              <div className="space-y-2">
                {staff.map((person) => (
                  <div key={person.id} className="rounded-xl border border-[#292d25] bg-[#0c100d] p-3 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="font-bold text-[#f4f1e9] truncate">{person.name}</div>
                      <div className="text-[10px] text-[#88877b] truncate">{person.email}</div>
                    </div>
                    <select
                      value={person.role}
                      disabled={busy || person.id === session.user.id}
                      onChange={(e) => void updateUserRole(person.id, e.target.value)}
                      className="rounded-lg border border-[#34372e] bg-[#121612] px-2.5 py-1.5 text-[11px] text-[#e5cf94] disabled:opacity-50"
                    >
                      {(['admin', 'kitchen', 'delivery', 'customer'] as string[]).map((r) => (
                        <option key={r} value={r}>
                          {roleLabels[r]}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-[#303329] bg-[#121612] p-4 space-y-3">
              <h2 className="text-sm font-bold">العملاء المسجلون ({customers.length})</h2>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {customers.map((cust) => (
                  <div key={cust.id} className="rounded-xl border border-[#292d25] bg-[#0c100d] p-3 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="font-bold text-[#f4f1e9] truncate">{cust.name}</div>
                      <div className="text-[10px] text-[#88877b] truncate">
                        {cust.email} · {cust.orders_count ?? 0} طلبات
                        {cust.goal ? ` · هدف: ${cust.goal}` : ''}
                      </div>
                    </div>
                    <select
                      value={cust.role}
                      disabled={busy}
                      onChange={(e) => void updateUserRole(cust.id, e.target.value)}
                      className="rounded-lg border border-[#34372e] bg-[#121612] px-2.5 py-1.5 text-[11px] text-[#aaa79b]"
                    >
                      {(['customer', 'kitchen', 'delivery', 'admin'] as string[]).map((r) => (
                        <option key={r} value={r}>
                          {roleLabels[r]}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {!loading && isAdmin && tab === 'audit' && (
          <section className="rounded-2xl border border-[#303329] bg-[#121612] p-4 space-y-3">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <History size={16} className="text-[#c9a85c]" />
              سجل التدقيق الأمني والتشغيلي ({auditLogs.length})
            </h2>
            {auditLogs.length === 0 ? (
              <div className="text-xs text-[#88877b]">لا توجد سجلات بعد.</div>
            ) : (
              <div className="divide-y divide-[#222520] max-h-[65vh] overflow-y-auto text-xs">
                {auditLogs.map((log) => (
                  <div key={log.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-[#e5cf94]">{log.action}</span>{' '}
                      <span className="text-[#aaa79b]">
                        ({log.entity_type} · {String(log.entity_id).slice(0, 8)})
                      </span>
                      <div className="text-[10px] text-[#88877b] mt-0.5">
                        بواسطة: {log.actor_name || log.actor_email || 'النظام'}
                      </div>
                    </div>
                    <div className="text-[10px] text-[#88877b] tabular-nums">
                      {new Date(log.created_at).toLocaleString('ar-DZ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <footer className="border-t border-[#292d25] pt-4 text-[10px] leading-5 text-[#77786e]">
          <ShieldCheck className="ml-1 inline h-3.5 w-3.5" />
          كل إجراء يُرسل إلى الخادم ويُسجل في سجل التدقيق. لا تُفعّل غذاءً أو منطقة قبل مراجعة بياناتها واعتمادها.
        </footer>
      </div>
    </main>
  );
};
