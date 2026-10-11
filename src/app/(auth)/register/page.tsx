"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { motion, useReducedMotion } from "framer-motion";
import Button from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-field";
import { parseValidationError } from "@/lib/form-utils";
import { UserPlus, GraduationCap } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const validationError = parseValidationError(data);
        setError(validationError.message);
        if (validationError.details) {
          setFieldErrors(validationError.details);
        }
        setLoading(false);
        return;
      }

      const loginRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (loginRes?.error) {
        window.location.href = "/login?registered=true";
      } else {
        window.location.href = "/dashboard";
      }
    } catch {
      setError("Không thể kết nối đến máy chủ.");
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-x-hidden px-4 py-12 bg-zinc-50 dark:bg-zinc-950">
      <motion.div
        className="relative z-10 w-full max-w-md rounded-2xl p-6 sm:p-8 shadow-xl bg-card/90 backdrop-blur-sm border border-border"
        initial={!mounted || shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          duration: 0.5,
          ease: [0.25, 0.1, 0.25, 1],
        }}
        whileHover={!mounted || shouldReduceMotion ? {} : {
          scale: 1.01,
          y: -4,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        }}
      >
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
              <GraduationCap className="h-6 w-6" />
            </div>
          </div>

          <motion.div
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 mb-4"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 15,
              delay: 0.3,
            }}
            whileHover={{ scale: 1.05 }}
          >
            <UserPlus className="w-4 h-4 text-primary" aria-hidden="true" />
            <span className="text-xs font-bold tracking-wider text-primary uppercase">
              Tạo Tài Khoản
            </span>
          </motion.div>

          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Bắt Đầu Ngay Hôm Nay
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground">
            Đăng ký để tham gia ôn luyện và làm đề&nbsp;thi&nbsp;thử.
          </p>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="mb-6 rounded-xl border border-destructive bg-destructive/10 p-4 text-sm text-destructive font-semibold flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <FormInput
            label="Họ Và Tên"
            type="text"
            name="name"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nguyễn Văn A"
            error={fieldErrors.name}
          />

          <FormInput
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ten@gmail.com"
            error={fieldErrors.email}
          />

          <FormInput
            label="Mật Khẩu"
            type="password"
            name="new-password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            error={fieldErrors.password}
            helpText="Tối thiểu 8 ký tự, bao gồm cả chữ cái và chữ số"
          />

          <FormInput
            label="Xác Nhận Mật Khẩu"
            type="password"
            name="new-password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            whileHover={!mounted || shouldReduceMotion ? {} : { scale: 1.02 }}
            whileTap={!mounted || shouldReduceMotion ? {} : { scale: 0.98 }}
          >
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={loading}
            className="w-full mt-6 shadow-xl hover:shadow-2xl transition-shadow"
          >
            {loading ? "Đang Xử Lý…" : "Đăng Ký"}
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
          transition={{ delay: 0.45, duration: 0.5 }}
        >
          <Button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            type="button"
            variant="secondary"
            size="lg"
            className="w-full shadow-md hover:shadow-lg transition-shadow"
            leftIcon={
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            }
          >
            Google
          </Button>
        </motion.div>

        <motion.p
          className="mt-8 text-center text-base text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          Đã có tài&nbsp;khoản?{" "}
          <Link
            href="/login"
            className="font-semibold text-primary hover:text-primary/80 transition-colors underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
          >
            Đăng Nhập Ngay
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
