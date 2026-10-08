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
