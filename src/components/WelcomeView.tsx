import React from 'react';
import proteinHero from '../assets/images/dish_atelier_protein_1794529578370.jpg';
import { ArrowLeft, ArrowUpLeft, BadgeCheck, ChefHat, Clock3, ShieldCheck, Sparkles } from 'lucide-react';

interface WelcomeViewProps {
  onStart: () => void;
}

const principles = [
  { icon: BadgeCheck, title: 'محسوبة علمياً', detail: 'احتياجك الغذائي يُبنى على بياناتك، لا على التخمين.' },
  { icon: ChefHat, title: 'تُحضّر خصيصاً لك', detail: 'مكونات واضحة وأوزان دقيقة لكل وجبة.' },
  { icon: Clock3, title: 'تصل في وقتها', detail: 'تخطيط مسبق ينسّق الطلب والتحضير والتسليم.' },
  { icon: ShieldCheck, title: 'خصوصيتك أولاً', detail: 'ملفك وتفضيلاتك جزء من تجربتك الشخصية.' },
];

export const WelcomeView: React.FC<WelcomeViewProps> = ({ onStart }) => (
  <main dir="rtl" className="nf-welcome min-h-screen overflow-hidden bg-[#09090b] text-[#f3f1ec] relative">
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute -top-48 left-[-8rem] h-[34rem] w-[34rem] rounded-full bg-[#c8a96e]/10 blur-[110px]" />
    </div>

    <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-8 px-5 py-6 sm:px-8">
      <a href="#" className="text-base font-bold tracking-[.18em] text-[#e6d1a3] whitespace-nowrap shrink-0 no-underline" aria-label="NutriFit DZ">
        NUTRIFIT DZ
      </a>
      <nav className="hidden items-center gap-7 text-xs font-medium text-[#96938a] md:flex">
        <a href="#method" className="transition hover:text-[#e6d1a3] whitespace-nowrap shrink-0">منهجيتنا</a>
        <a href="#experience" className="transition hover:text-[#e6d1a3] whitespace-nowrap shrink-0">التجربة</a>
        <span className="text-[#66645e] whitespace-nowrap shrink-0">خدمة تغذية مخصصة</span>
      </nav>
      <button
        type="button"
        onClick={onStart}
        className="touch-press rounded-xl border border-[#c8a96e]/45 bg-[#111114] px-4 py-2 text-xs font-bold text-[#e6d1a3] hover:border-[#c8a96e] cursor-pointer whitespace-nowrap shrink-0"
      >
        ابدأ رحلتك <ArrowLeft className="mr-1 inline h-3.5 w-3.5" />
      </button>
    </header>

    <section className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-8 sm:px-8 md:pt-14 lg:grid-cols-[1.02fr_.98fr] lg:gap-16 lg:pb-24">
      <div className="max-w-2xl">
        <div className="mb-5 text-[11px] font-semibold tracking-wide text-[#c8a96e]">
          معاينة تفاعلية · لا تستقبل طلبات فعلية
        </div>
        <h1 className="max-w-xl text-[2.45rem] font-semibold leading-[1.28] text-[#f3f1ec] sm:text-5xl lg:text-[4rem] text-balance">
          أداؤك يستحق<br />
          <span className="font-light text-[#e6d1a3]">ما هو أدقّ من التخمين.</span>
        </h1>
        <p className="mt-6 max-w-lg text-[14px] leading-8 text-[#96938a] sm:text-[15px]">
          برنامج غذائي يُبنى على قياساتك وهدفك، ووجبات طازجة تُحضّر بمقادير موزونة لتعرف ما تأكله، ولماذا تأكله.
        </p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onStart}
            className="touch-press group inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-gradient-to-l from-[#e6d1a3] to-[#c8a96e] px-7 text-[13px] font-bold text-[#141108] hover:brightness-105 cursor-pointer"
          >
            صمّم برنامجي الغذائي
            <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
          </button>
          <a href="#method" className="touch-press inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border border-[#232329] bg-[#111114] px-6 text-[12px] text-[#f3f1ec] hover:border-[#c8a96e]/50">
            اكتشف المنهجية <ArrowUpLeft className="h-4 w-4" />
          </a>
        </div>
        <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[#232329] pt-6 text-[11px] text-[#96938a]">
          <span className="flex items-center gap-2"><BadgeCheck className="h-3.5 w-3.5 text-[#c8a96e]" /> حسابات قابلة للتفسير</span>
          <span className="flex items-center gap-2"><ChefHat className="h-3.5 w-3.5 text-[#c8a96e]" /> تحضير حسب الطلب</span>
          <span className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-[#c8a96e]" /> عناية بالتفاصيل</span>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-[590px]">
        <div className="relative overflow-hidden rounded-2xl border border-[#232329] bg-[#111114]">
          <img
            src={proteinHero}
            alt="وجبة رياضية محضرة بعناية"
            referrerPolicy="no-referrer"
            className="h-[340px] w-full object-cover sm:h-[440px]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/25 to-transparent" />
          <div className="absolute right-5 top-5 text-[10px] tracking-[.16em] text-[#e6d1a3] font-semibold">
            THE NUTRITION ATELIER
          </div>
          <div className="absolute inset-x-5 bottom-5">
            <p className="text-[10px] tracking-[.2em] text-[#c8a96e]">BUILT AROUND YOUR NUMBERS</p>
            <p className="mt-2 text-2xl font-medium text-[#f3f1ec] sm:text-3xl">كل غرام له غاية.</p>
            <p className="mt-1 text-[11px] text-[#96938a]">من الحساب الغذائي إلى الطبق الذي يصلك.</p>
          </div>
        </div>
      </div>
    </section>

    <section id="method" className="relative z-10 border-y border-[#232329] bg-[#111114]/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[.7fr_1.3fr] lg:py-16">
        <div>
          <p className="text-[10px] tracking-[.2em] text-[#c8a96e]">A MORE CONSIDERED APPROACH</p>
          <h2 className="mt-3 text-2xl font-medium leading-relaxed text-[#f3f1ec]">ليست وجبات جاهزة.<br />إنها منظومة مصممة لك.</h2>
          <p className="mt-3 max-w-sm text-[12px] leading-7 text-[#96938a]">نربط بين بياناتك، احتياجك، اختيارك، والتحضير الفعلي في مسار واحد واضح.</p>
        </div>
        <div id="experience" className="grid gap-3 sm:grid-cols-2">
          {principles.map(({ icon: Icon, title, detail }, index) => (
            <article key={title} className="rounded-2xl border border-[#232329] bg-[#111114] p-5 transition hover:border-[#c8a96e]/35">
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#18181c] border border-[#232329] text-[#e6d1a3]"><Icon size={17} strokeWidth={1.6} /></span>
                <span className="text-[10px] tracking-[.16em] text-[#66645e] tabular-nums">0{index + 1}</span>
              </div>
              <h3 className="mt-5 text-[14px] font-semibold text-[#f3f1ec]">{title}</h3>
              <p className="mt-2 text-[11px] leading-6 text-[#96938a]">{detail}</p>
            </article>
          ))}
        </div>
      </div>
    </section>

    <footer className="relative z-10 mx-auto flex max-w-6xl flex-col gap-3 px-5 py-7 text-[11px] text-[#66645e] sm:px-8 md:flex-row md:items-center md:justify-between">
      <span>© {new Date().getFullYear()} NutriFit DZ · Private Nutrition</span>
      <span>الدقة في التخطيط. العناية في التحضير.</span>
    </footer>
  </main>
);
