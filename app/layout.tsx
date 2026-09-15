import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { DEFAULT_DATE_FROM, DEFAULT_DATE_TO } from "@/lib/constants";
import { DATE_RANGE_COOKIE, parseDateRangeToken } from "@/lib/date-range-storage";
import { Providers } from "./providers";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "UPI Guard | Fraud Analytics Platform",
  description: "AI-powered fraud detection and merchant risk analytics for a safer UPI ecosystem.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const initialDate =
    parseDateRangeToken(jar.get(DATE_RANGE_COOKIE)?.value) ?? {
      from: DEFAULT_DATE_FROM,
      to: DEFAULT_DATE_TO,
    };

  return (
    <html lang="en">
      <body className={`${plusJakarta.variable} font-sans`}>
        <Providers initialDate={initialDate}>{children}</Providers>
      </body>
    </html>
  );
}
