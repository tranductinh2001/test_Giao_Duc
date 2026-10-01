"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Check, X, ArrowLeft } from "lucide-react";

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError("Link không hợp lệ. Vui lòng yêu cầu link mới.");
        setValidating(false);
        return;
      }

      try {
        const res = await fetch("/api/auth/reset-password/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (data.success) {
          setTokenValid(true);
        } else {
          setError(data.message || "Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
        }
      } catch (err) {
        setError("Lỗi kết nối. Vui lòng thử lại.");
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (password.length < 12) {
      setError("Mật khẩu phải có ít nhất 12 ký tự");
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setError("Mật khẩu phải có ít nhất 1 chữ hoa");
      return;
    }

    if (!/[a-z]/.test(password)) {
      setError("Mật khẩu phải có ít nhất 1 chữ thường");
      return;
    }

    if (!/[0-9]/.test(password)) {
      setError("Mật khẩu phải có ít nhất 1 số");
      return;
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      setError("Mật khẩu phải có ít nhất 1 ký tự đặc biệt");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } else {
        setError(data.message || "Có lỗi xảy ra. Vui lòng thử lại.");
      }
    } catch (err) {
      setError("Lỗi kết nối. Vui lòng kiểm tra mạng.");
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12 bg-zinc-50 dark:bg-zinc-950">
        <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 lg:p-10 shadow-lg text-center dark:bg-zinc-900 dark:border-zinc-800">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-border border-t-primary mb-6"></div>
          <p className="text-base text-muted-foreground font-semibold">Đang xác thực link...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12 bg-zinc-50 dark:bg-zinc-950">
        <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 lg:p-10 shadow-lg animate-fade-in dark:bg-zinc-900 dark:border-zinc-800">
          <div className="text-center mb-8">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20 shadow-subtle">
              <X className="h-10 w-10 text-destructive" strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-4 tracking-tight">Link không hợp lệ</h1>
            <p className="text-base text-muted-foreground leading-relaxed">{error}</p>
          </div>

          <div className="space-y-3">
            <Link
              href="/auth/forgot-password"
              className="block w-full h-12 rounded-xl bg-primary text-primary-foreground px-6 py-3 text-center text-base font-semibold shadow-elevated hover:shadow-lifted hover:brightness-110 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              Yêu cầu link mới
            </Link>
            <Link
              href="/login"
              className="block w-full h-12 rounded-xl border border-border bg-card text-foreground px-6 py-3 text-center text-base font-semibold hover:bg-accent/50 hover:border-primary/40 transition-all duration-200"
            >
              Về trang đăng nhập
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12 bg-zinc-50 dark:bg-zinc-950">
        <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 lg:p-10 shadow-lg animate-fade-in dark:bg-zinc-900 dark:border-zinc-800">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-success/10 border border-success/20 shadow-subtle">
              <Check className="h-10 w-10 text-success" strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-4 tracking-tight">Đặt lại mật khẩu thành công!</h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              Mật khẩu của bạn đã được cập nhật. Đang chuyển về trang đăng nhập...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 lg:p-10 shadow-lg animate-fade-in dark:bg-zinc-900 dark:border-zinc-800">
        <div className="text-center mb-8">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shadow-subtle">
            <Lock className="h-8 w-8 text-primary" strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3 tracking-tight">Đặt lại mật khẩu</h1>
          <p className="text-base text-muted-foreground leading-relaxed">Nhập mật khẩu mới của bạn</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-xl border border-destructive bg-destructive/10 p-4 text-sm text-destructive font-semibold flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="password" className="mb-2.5 block text-sm font-semibold text-foreground">
              Mật khẩu mới
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ít nhất 12 ký tự"
              required
              className="w-full h-12 px-4 text-base rounded-xl border border-border bg-background text-foreground transition-all duration-200 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none placeholder:text-muted-foreground"
            />
            <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
              Phải có: 12+ ký tự, chữ hoa, chữ thường, số, ký tự đặc biệt
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-2.5 block text-sm font-semibold text-foreground">
              Xác nhận mật khẩu
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu"
              required
              className="w-full h-12 px-4 text-base rounded-xl border border-border bg-background text-foreground transition-all duration-200 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none placeholder:text-muted-foreground"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground px-6 py-3 text-base font-semibold shadow-elevated hover:shadow-lifted hover:brightness-110 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? "Đang cập nhật..." : "Đặt lại mật khẩu"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center px-4 bg-zinc-50 dark:bg-zinc-950">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-border border-t-primary"></div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
