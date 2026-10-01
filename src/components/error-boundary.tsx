"use client";

import React from "react";
import Link from "next/link";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    console.error("React Error Boundary caught an error:", error, errorInfo);

    // TODO: In production, send to error monitoring service (Sentry, LogRocket, etc.)
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
          <div className="w-full max-w-md space-y-6 rounded-3xl border border-white/10 bg-slate-900/50 p-8 text-center backdrop-blur-xl">
            {/* Error Icon */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-rose-950/40">
              <svg
                className="h-10 w-10 text-rose-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-white">Đã xảy ra lỗi</h1>
              <p className="text-sm text-slate-400">
                Ứng dụng gặp sự cố không mong muốn. Vui lòng tải lại trang để tiếp tục.
              </p>
            </div>

            {/* Error Details (collapsed by default) */}
            {this.state.error && (
              <details className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-left">
                <summary className="cursor-pointer text-xs font-medium text-slate-400 hover:text-slate-300">
                  Chi tiết lỗi (dành cho developer)
                </summary>
                <pre className="mt-3 overflow-auto text-xs text-rose-400">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReset}
                className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
              >
                🔄 Tải lại trang
              </button>
              <Link
                href="/"
                className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                ← Về trang chủ
              </Link>
            </div>

            {/* Support */}
            <p className="text-xs text-slate-500">
              Nếu lỗi tiếp tục xảy ra, vui lòng liên hệ{" "}
              <span className="text-violet-400">support@civilprep.vn</span>
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
