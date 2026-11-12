import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NutriFit DZ — تغذيتك محسوبة بدقة",
  description: "وجبات رياضية مخصصة تُحضّر بعد تأكيد الطلب، وفق احتياجات غذائية محسوبة."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
