"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, ArrowLeft, Check } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.message || "Có lỗi xảy ra. Vui lòng thử lại.");
      }
    } catch (err) {
      setError("Lỗi kết nối. Vui lòng kiểm tra mạng.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12 bg-zinc-50 dark:bg-zinc-950">
        <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 lg:p-10 shadow-lg dark:bg-zinc-900 dark:border-zinc-800">
          <div className="text-center mb-8">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-success/10 border border-success/20 shadow-subtle">
              <Check className="h-10 w-10 text-success" strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-4 tracking-tight">Email đã được gửi</h1>
            <p className="text-base text-muted-foreground mb-3 leading-relaxed">
              Chúng tôi đã gửi link đặt lại mật khẩu đến email{' '}
              <strong className="font-semibold text-foreground">{email}</strong>
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Link có hiệu lực trong 1 giờ. Kiểm tra cả thư mục spam nếu không thấy email.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/login"
              className="block w-full h-12 rounded-xl bg-primary text-primary-foreground px-6 py-3 text-center text-base font-semibold shadow-elevated hover:shadow-lifted hover:brightness-110 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              Về trang đăng nhập
            </Link>
            <button
              onClick={() => {
                setSuccess(false);
                setEmail("");
              }}
              className="block w-full h-12 rounded-xl border border-border bg-card text-foreground px-6 py-3 text-center text-base font-semibold hover:bg-accent/50 hover:border-primary/40 transition-all duration-200"
            >
              Gửi lại email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 lg:p-10 shadow-lg dark:bg-zinc-900 dark:border-zinc-800">
        <div className="text-center mb-8">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shadow-subtle">
            <Mail className="h-8 w-8 text-primary" strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3 tracking-tight">Quên mật khẩu?</h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            Nhập email của bạn, chúng tôi sẽ gửi link đặt lại mật khẩu
          </p>
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
            <label htmlFor="email" className="mb-2.5 block text-sm font-semibold text-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@gmail.com"
              required
              className="w-full h-12 px-4 text-base rounded-xl border border-border bg-background text-foreground transition-all duration-200 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none placeholder:text-muted-foreground"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground px-6 py-3 text-base font-semibold shadow-elevated hover:shadow-lifted hover:brightness-110 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? "Đang gửi..." : "Gửi link đặt lại mật khẩu"}
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
