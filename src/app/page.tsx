const steps = [
  { n: "01", title: "نعرف احتياجك", body: "تدخل بياناتك وهدفك ونشاطك. نحسب الطاقة والماكروز بمعادلات موثقة وافتراضات واضحة." },
  { n: "02", title: "تختار وجباتك", body: "تشاهد المكونات والكميات والقيم الغذائية قبل الطلب، وتختار ما يناسب يومك." },
  { n: "03", title: "نحضّر بعد التأكيد", body: "نؤكد طلبك أولاً، ثم تُوزن المكونات وتُحضّر وجبتك لتوصيلها في الموعد المتفق عليه." }
];

const meals = [
  { icon: "🍗", name: "دجاج بالأرز", detail: "صدر دجاج · أرز · خضار موسمية", tag: "بروتين مرتفع" },
  { icon: "🥩", name: "لحم وبطاطا", detail: "لحم قليل الدهن · بطاطا · سلطة", tag: "وجبة متوازنة" },
  { icon: "🥚", name: "بيض وشوفان", detail: "بيض · شوفان · فاكهة", tag: "اختيار للفطور" }
];

export default function HomePage() {
  return (
    <main>
      <header className="hero-shell">
        <nav className="nav container">
          <a className="brand" href="#">NutriFit <span>DZ.</span></a>
          <div className="nav-links"><a href="#how">كيف نعمل؟</a><a href="#meals">الوجبات</a><a href="#principles">مبادئنا</a></div>
          <a className="button button-small" href="#meals">اكتشف الوجبات</a>
        </nav>
        <section className="hero container">
          <div className="hero-copy">
            <span className="eyebrow">تغذية رياضية محسوبة — الجزائر</span>
            <h1>وجبتك ليست عشوائية.<br />كل غرام له حساب.</h1>
            <p>نحسب احتياجك الغذائي أولاً، ثم نجهّز وجباتك حسب أهدافك وبمكونات موزونة بدقة. لا طبخ مسبق — نحضّر بعد تأكيد طلبك.</p>
            <div className="hero-actions"><a className="button" href="#how">اكتشف طريقتنا</a><a className="text-link" href="#principles">كيف نضمن الدقة؟ ←</a></div>
          </div>
          <div className="dish-card">
            <div className="dish-art"><span>🥗</span></div>
            <div className="macro-grid">
              <div><b>42g</b><small>بروتين</small></div><div><b>58g</b><small>كربوهيدرات</small></div><div><b>16g</b><small>دهون</small></div>
            </div>
            <p className="dish-caption">مثال توضيحي لوجبة — القيم الفعلية تُحسب من الوصفة المعتمدة.</p>
          </div>
        </section>
      </header>
      <section className="section container" id="how">
        <div className="section-heading"><span className="eyebrow dark">الطريقة</span><h2>من بياناتك إلى طبقك</h2><p>ثلاث خطوات واضحة، دون تخمين أو وعود سحرية.</p></div>
        <div className="steps">{steps.map(s => <article className="step-card" key={s.n}><span className="step-number">{s.n}</span><h3>{s.title}</h3><p>{s.body}</p></article>)}</div>
      </section>
      <section className="section menu-section" id="meals">
        <div className="container">
          <div className="section-heading"><span className="eyebrow dark">قائمة تجريبية</span><h2>وجبات تُبنى حول احتياجك</h2><p>هذه أمثلة أولية للعرض وليست قائمة بيع نهائية.</p></div>
          <div className="meal-grid">{meals.map(m => <article className="meal-card" key={m.name}><div className="meal-art">{m.icon}</div><h3>{m.name}</h3><p>{m.detail}</p><div className="meal-meta"><b>قابلة للتخصيص</b><span>{m.tag}</span></div></article>)}</div>
        </div>
      </section>
      <section className="section container principles" id="principles">
        <div><span className="eyebrow dark">مبادئ NutriFit</span><h2>الدقة قبل التحضير</h2><p>كل قيمة غذائية مرتبطة بمصدر وحالة تحضير. كل حساب قابل للمراجعة. وأي تعديل ناتج عن متابعة الوزن يبقى اقتراحاً يحتاج موافقتك.</p></div>
        <ul><li>معادلات ومراجع علمية موثقة</li><li>وزن المكونات بالغرام</li><li>لا تحضير قبل تأكيد الطلب</li><li>لا تغييرات تلقائية في خطتك</li></ul>
      </section>
      <footer className="footer"><div className="container footer-inner"><b>NutriFit <span>DZ.</span></b><small>مشروع قيد التطوير — الجزائر</small><small>نحسب بدقة. نُحضّر بعد الطلب.</small></div></footer>
    </main>
  );
}
