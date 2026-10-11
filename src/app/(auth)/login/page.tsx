"use client";

import React, { useState, Suspense, useEffect, useSyncExternalStore } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import Button from "@/components/ui/button";
import { GraduationCap, BookOpen, BarChart3, Trophy, Sparkles } from "lucide-react";

function useReducedMotion() {
  const reducedMotion = useSyncExternalStore(
    () => () => {},
    () => false,
    () => true
  );
  return reducedMotion;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const shouldReduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const authError = searchParams.get("error");
    if (authError) {
      switch (authError) {
        case "OAuthAccountNotLinked":
          setError("Email của tài khoản Google này đã được liên kết với một phương thức đăng nhập khác.");
          break;
        case "OAuthCallback":
        case "OAuthCallbackError":
          setError("Đã xảy ra lỗi khi hoàn tất xác thực tài khoản Google. Vui lòng thử lại.");
          break;
        case "OAuthSignin":
          setError("Không thể khởi tạo phiên đăng nhập Google. Vui lòng thử lại.");
          break;
        case "OAuthCreateAccount":
          setError("Không thể tạo hồ sơ người dùng từ Google. Vui lòng liên hệ hỗ trợ.");
          break;
        case "AccessDenied":
          setError("Quyền truy cập bị từ chối hoặc tài khoản đã bị khóa.");
          break;
        case "Verification":
          setError("Phiên xác thực đã hết hạn hoặc không hợp lệ.");
          break;
        case "Configuration":
          setError("Cấu hình xác thực Google gặp sự cố. Vui lòng kiểm tra lại thiết lập.");
          break;
        default:
          setError(`Đăng nhập không thành công (${authError}). Vui lòng thử lại.`);
          break;
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: callbackUrl || "/dashboard",
      });

      if (res?.error) {
        if (res.error === "CredentialsSignin") {
          setError("Email hoặc mật khẩu không chính xác.");
        } else if (res.error === "ACCOUNT_LOCKED") {
          setError("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.");
        } else {
          setError("Có lỗi xảy ra. Vui lòng thử lại.");
        }
      } else {
        const sessionResponse = await fetch("/api/auth/session");
        const session = await sessionResponse.json();
        let nextUrl = callbackUrl;
        if (!nextUrl) {
          if (session?.user?.role === "ADMIN") {
            nextUrl = "/admin";
          } else if (session?.user?.role === "TEACHER") {
            nextUrl = "/lesson-plans/review";
          } else {
            nextUrl = "/dashboard";
          }
        }

        window.location.href = nextUrl;
      }
    } catch {
      setError("Không thể kết nối đến máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setError(null);
      await signIn("google", {
        callbackUrl: callbackUrl || "/dashboard",
      });
    } catch (err) {
      console.error("[Google Login] Error:", err);
      setError("Không thể kết nối đến dịch vụ Google OAuth. Vui lòng thử lại.");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-x-hidden px-4 py-8 bg-gradient-to-br from-background via-background to-primary/5">
      {/* Animated Background Orbs - only render after mount to avoid hydration mismatch */}
      {mounted && (
        <motion.div
          className="absolute top-0 -left-32 w-[500px] h-[500px] rounded-full mix-blend-multiply filter blur-3xl opacity-40"
          style={{ background: "radial-gradient(circle, rgba(var(--color-primary-rgb), 0.3) 0%, transparent 70%)" }}
          animate={shouldReduceMotion ? {} : {
            x: [0, 100, 0],
            y: [0, 50, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden="true"
        />
      )}

      {mounted && (
        <motion.div
          className="absolute bottom-0 -right-32 w-[600px] h-[600px] rounded-full mix-blend-multiply filter blur-3xl opacity-30"
          style={{ background: "radial-gradient(circle, rgba(var(--color-primary-rgb), 0.25) 0%, transparent 70%)" }}
          animate={shouldReduceMotion ? {} : {
            x: [0, -80, 0],
          y: [0, -60, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden="true"
      />
      )}

      {/* Floating Sparkles */}
      {mounted && !shouldReduceMotion && [1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute hidden sm:block"
          style={{
            left: `${20 + i * 25}%`,
            top: `${15 + i * 20}%`,
          }}
          animate={{
            y: [0, -30, 0],
            rotate: [0, 180, 360],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: 4 + i,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.5,
          }}
        >
          <Sparkles className="w-6 h-6 text-primary/30" />
        </motion.div>
      ))}

      <div className="relative z-10 grid w-full max-w-5xl gap-8 lg:gap-12 lg:grid-cols-2">
        {/* Left Column - Branding */}
        <motion.div
          initial={!mounted || shouldReduceMotion ? { opacity: 0 } : {
            opacity: 0,
            rotateY: -30,
            x: -100,
          }}
          animate={{ opacity: 1, rotateY: 0, x: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20, duration: 0.8 }}
          style={{ perspective: 1000, transformStyle: "preserve-3d" }}
          className="hidden lg:flex lg:items-center"
        >
          <motion.div
            className="relative bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-8 lg:p-12 shadow-xl overflow-hidden"
            whileHover={!mounted || shouldReduceMotion ? {} : { scale: 1.02, y: -8 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">VCGo Education</h2>
                <p className="text-sm text-muted-foreground">Nền tảng giáo dục AI</p>
              </div>
            </div>

            {/* Headline */}
            <motion.h1
              className="text-3xl lg:text-4xl font-bold leading-tight mb-6 text-foreground"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              Chào Mừng Trở Lại
            </motion.h1>

            <motion.p
              className="text-base leading-relaxed text-muted-foreground mb-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              Đăng nhập để tiếp tục ôn luyện, làm đề thi thử và xem báo cáo năng lực.
            </motion.p>

            {/* Feature List */}
            <div className="space-y-5">
              {[
                { icon: BookOpen, title: "10,000+ Câu Hỏi", desc: "Ngân Hàng Đề Thi Phong Phú" },
                { icon: BarChart3, title: "Báo Cáo Chi Tiết", desc: "Theo Dõi Tiến Độ Học Tập" },
                { icon: Trophy, title: "95% Đỗ Đầu Ra", desc: "Tỷ Lệ Thành Công Cao" },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  className="flex items-center gap-4"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.15, type: "spring", stiffness: 100, damping: 20 }}
                  whileHover={!mounted || shouldReduceMotion ? {} : { x: 10 }}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 flex-shrink-0 shadow-md">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground mb-0.5">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Right Column - Login Form */}
        <motion.div
          initial={!mounted || shouldReduceMotion ? { opacity: 0 } : { opacity: 0, rotateY: 30, x: 100 }}
          animate={{ opacity: 1, rotateY: 0, x: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20, duration: 0.8, delay: 0.1 }}
          style={{ perspective: 1000, transformStyle: "preserve-3d" }}
        >
          <motion.div
            className="relative bg-card/90 backdrop-blur-sm border border-border rounded-2xl p-6 sm:p-8 shadow-xl overflow-hidden"
            whileHover={!mounted || shouldReduceMotion ? {} : { scale: 1.02, y: -8 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="relative z-10">
              {/* Mobile Logo */}
              <div className="flex items-center gap-3 mb-6 lg:hidden">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">VCGo Education</h2>
                  <p className="text-xs text-muted-foreground">Nền tảng giáo dục AI</p>
                </div>
              </div>

              <motion.div
                className="mb-6"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
                  Đăng Nhập Tài Khoản
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Chỉ cần vài thao tác là vào được hệ thống.
                </p>
              </motion.div>

              {/* Quick Role Selection for Demo / Testing */}
              <div className="mb-5 rounded-xl border border-primary/20 bg-primary/5 p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> 3 Nhóm Tài Khoản Mẫu
                  </span>
                  <span className="text-[11px] text-muted-foreground">Bấm để chọn nhanh</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail("admin@gmail.com");
                      setPassword("admin12345");
                    }}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      email === "admin@gmail.com"
                        ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                        : "bg-card hover:bg-muted text-foreground border-border"
                    }`}
                  >
                    <span className="text-sm mb-0.5">👑</span>
                    <span className="truncate w-full text-center font-bold">Admin</span>
                    <span className="text-[10px] opacity-80 font-normal">Vô hạn lượt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEmail("nhanvien@gmail.com");
                      setPassword("staff12345");
                    }}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      email === "nhanvien@gmail.com"
                        ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                        : "bg-card hover:bg-muted text-foreground border-border"
                    }`}
                  >
                    <span className="text-sm mb-0.5">👩‍🏫</span>
                    <span className="truncate w-full text-center font-bold">Nhân Viên</span>
                    <span className="text-[10px] opacity-80 font-normal">Thẩm định GA</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEmail("khachhang@gmail.com");
                      setPassword("user12345");
                    }}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      email === "khachhang@gmail.com"
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-card hover:bg-muted text-foreground border-border"
                    }`}
                  >
                    <span className="text-sm mb-0.5">🎓</span>
                    <span className="truncate w-full text-center font-bold">Khách Hàng</span>
                    <span className="text-[10px] opacity-80 font-normal">Thi Online</span>
                  </button>
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="mb-5 rounded-xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30 p-4 text-sm text-red-700 dark:text-red-300 font-medium flex items-start gap-3 shadow-lg"
                  role="alert"
                  aria-live="polite"
                >
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{error}</span>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <label htmlFor="email-input" className="mb-2 block text-sm font-semibold text-foreground">
                    Email
                  </label>
                  <input
                    id="email-input"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-12 px-4 text-base rounded-xl border border-border bg-background text-foreground transition-all duration-200 hover:border-primary/50 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none placeholder:text-muted-foreground shadow-sm"
                    placeholder="ten@gmail.com"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  <label htmlFor="password-input" className="mb-2 block text-sm font-semibold text-foreground">
                    Mật Khẩu
                  </label>
                  <input
                    id="password-input"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-12 px-4 text-base rounded-xl border border-border bg-background text-foreground transition-all duration-200 hover:border-primary/50 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none placeholder:text-muted-foreground shadow-sm"
                    placeholder="••••••••"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  />
                  <div className="mt-3 text-right">
                    <Link
                      href="/auth/forgot-password"
                      className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      Quên Mật Khẩu?
                    </Link>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                >
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={loading}
                    className="w-full shadow-lg hover:shadow-xl transition-shadow"
                  >
                    {loading ? "Đang Xử Lý…" : "Đăng Nhập"}
                  </Button>
                </motion.div>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-border" />
                </div>
                <span className="relative flex justify-center bg-transparent px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Hoặc Tiếp Tục Với
                </span>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <Button
                  onClick={handleGoogleLogin}
                  variant="secondary"
                  size="lg"
                  isLoading={googleLoading}
                  disabled={loading || googleLoading}
                  className="w-full shadow-md hover:shadow-lg transition-shadow"
                  leftIcon={
                    !googleLoading ? (
                      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                    ) : undefined
                  }
                  aria-label="Đăng nhập bằng Google"
                >
                  {googleLoading ? "Đang chuyển hướng Google..." : "Google"}
                </Button>
              </motion.div>

              <motion.p
                className="mt-6 text-center text-sm sm:text-base text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                Chưa có tài khoản?{" "}
                <Link
                  href="/register"
                  className="font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Đăng Ký Ngay
                </Link>
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <motion.div
          className="h-12 w-12 rounded-full border-4 border-border border-t-primary"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          role="status"
          aria-label="Đang tải…"
        />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
