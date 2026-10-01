import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { ErrorBoundary } from "@/components/error-boundary";
import { Inter } from "next/font/google";

// Load Inter font for all text
const inter = Inter({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VCGo Education | Nền tảng giáo dục ứng dụng AI",
  description: "VCGo Education là nền tảng AI hỗ trợ ôn thi viên chức, công chức, phân tích giáo án, ngân hàng câu hỏi và học tập trực tuyến.",
  keywords: ["VCGo Education", "ôn thi viên chức", "ôn thi công chức", "giáo dục AI", "ngân hàng câu hỏi", "phân tích giáo án"],
  openGraph: {
    title: "VCGo Education | Nền tảng giáo dục ứng dụng AI",
    description: "VCGo Education là nền tảng AI hỗ trợ ôn thi viên chức, công chức, phân tích giáo án, ngân hàng câu hỏi và học tập trực tuyến.",
    type: "website",
    locale: "vi_VN",
  },
  twitter: {
    card: "summary_large_image",
    title: "VCGo Education | Nền tảng giáo dục ứng dụng AI",
    description: "VCGo Education là nền tảng AI hỗ trợ ôn thi viên chức, công chức, phân tích giáo án, ngân hàng câu hỏi và học tập trực tuyến.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${inter.variable}`} suppressHydrationWarning>
      <body className="min-h-screen antialiased bg-[var(--background)]" suppressHydrationWarning>
        <ErrorBoundary>
          <SessionProvider>
            {children}
          </SessionProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
