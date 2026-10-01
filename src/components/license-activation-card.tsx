"use client";

import React, { useState } from "react";
import Button from "@/components/ui/button";
import { Key } from "lucide-react";

interface LicenseActivationCardProps {
  currentExpiresAt?: string | null;
}

export default function LicenseActivationCard({
  currentExpiresAt,
}: LicenseActivationCardProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(currentExpiresAt || null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!code.trim()) {
      setError("Vui lòng nhập mã license.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/license/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.message || "Không thể kích hoạt license.");
        return;
      }

      setExpiresAt(data.data.expiresAt);
      setMessage(data.data.message);
      setCode("");
    } catch {
      setError("Không thể gửi yêu cầu kích hoạt.");
    } finally {
      setLoading(false);
    }
  };

  const statusText = expiresAt
    ? `Hạn dùng đến ${new Date(expiresAt).toLocaleDateString("vi-VN")}`
    : "Chưa kích hoạt license";

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-subtle">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" strokeWidth={2} />
            <h2 className="text-lg font-bold text-foreground">License</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{statusText}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold border-2 ${
            expiresAt
              ? "border-success/30 bg-success/10 text-success"
              : "border-warning/30 bg-warning/10 text-warning"
          }`}
        >
          {expiresAt ? "Đã kích hoạt" : "Chưa mở khóa"}
        </span>
      </div>

      {error && (
        <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-3 text-sm text-destructive font-medium mb-3">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-lg border-2 border-success bg-success/10 p-3 text-sm text-success font-medium mb-3">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="w-full rounded-lg border-2 border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
          placeholder="VIC-XXXX-XXXX-XXXX"
        />
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={loading}
        >
          {loading ? "Đang kích hoạt..." : "Kích hoạt tài khoản"}
        </Button>
      </form>
    </div>
  );
}
