"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Save,
  Key,
  CheckCircle,
  AlertCircle,
  TestTube,
  Eye,
  EyeOff,
  X,
  Settings as SettingsIcon,
  Globe,
  Cpu,
  Clock,
  ExternalLink,
} from "lucide-react";
import Button from "@/components/ui/button";

export default function SettingsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (authStatus !== "loading" && session?.user?.role !== "ADMIN") {
      router.replace("/admin");
    }
  }, [session, authStatus, router]);

  // Beeknoee API Config State
  const [beeApiKey, setBeeApiKey] = useState("");
  const [beeBaseUrl, setBeeBaseUrl] = useState("https://platform.beeknoee.com/api/v1");
  const [beeModel, setBeeModel] = useState("gemini-3.1-flash-lite");
  const [beeTimeout, setBeeTimeout] = useState(120000);

  const [currentKey, setCurrentKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const maskApiKey = (key: string) => {
    if (!key || key === "your-beeknoee-api-key-here" || key.length < 10) return "";
    return key.substring(0, 8) + "..." + key.substring(key.length - 4);
  };

  const fetchCurrentSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      const result = await res.json();
      if (result.success && result.data) {
        if (result.data.beeApiKey) {
          setCurrentKey(maskApiKey(result.data.beeApiKey));
        }
        if (result.data.beeBaseUrl) {
          setBeeBaseUrl(result.data.beeBaseUrl);
        }
        if (result.data.beeModel) {
          setBeeModel(result.data.beeModel);
        }
        if (result.data.beeTimeout) {
          setBeeTimeout(result.data.beeTimeout);
        }
      }
    } catch (err) {
      console.error("Error fetching Beeknoee settings:", err);
    }
  };

  useEffect(() => {
    fetchCurrentSettings();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beeApiKey: beeApiKey.trim() || undefined,
          beeBaseUrl: beeBaseUrl.trim(),
          beeModel: beeModel.trim(),
          beeTimeout,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage("Đã lưu cấu hình API Beeknoee thành công");
        if (beeApiKey.trim()) {
          setCurrentKey(maskApiKey(beeApiKey.trim()));
          setBeeApiKey("");
        }
      } else {
        setError(data.message || "Lỗi khi lưu cấu hình");
      }
    } catch {
      setError("Không thể kết nối đến máy chủ để lưu cấu hình");
    } finally {
      setLoading(false);
    }
  };

  const handleTestApiKey = async () => {
    setTesting(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beeApiKey: beeApiKey.trim() || undefined,
          beeBaseUrl: beeBaseUrl.trim(),
          beeModel: beeModel.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage(data.message || "Kết nối API Beeknoee thành công!");
      } else {
        setError(data.message || "Kết nối API Beeknoee thất bại");
      }
    } catch {
      setError("Lỗi kết nối khi kiểm tra API Beeknoee");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              Cài Đặt Hệ Thống & Cấu Hình API
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Thiết lập kết nối API nhà cung cấp Beeknoee cho module thẩm định giáo án và đề thi
            </p>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="flex items-center justify-between rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:bg-destructive/20 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {message && (
        <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage(null)} className="p-1 hover:bg-emerald-500/20 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Configuration Card */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                Cấu Hình API Beeknoee
              </h2>
              <p className="text-xs text-muted-foreground">
                Khóa truy cập, Endpoint và Mô hình xử lý nghiệp vụ
              </p>
            </div>
          </div>

          <a
            href="https://platform.beeknoee.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <span>Trang quản trị Beeknoee</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Current Key Status */}
        {currentKey ? (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span className="text-emerald-700 dark:text-emerald-300 font-medium">Khóa API đang hoạt động:</span>
              <code className="font-mono bg-card px-2 py-0.5 rounded border border-border text-foreground font-semibold">
                {currentKey}
              </code>
            </div>
            <span className="text-[11px] text-muted-foreground">Đã xác thực</span>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Chưa thiết lập API Key Beeknoee. Vui lòng nhập khóa để hệ thống kích hoạt tính năng thẩm định.</span>
          </div>
        )}

        {/* Config Inputs Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {/* API Key */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="block text-xs font-bold text-foreground uppercase tracking-wide">
              Beeknoee API Key (BEE_API_KEY)
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={beeApiKey}
                onChange={(e) => setBeeApiKey(e.target.value)}
                placeholder={currentKey ? "Nhập khóa mới nếu muốn thay đổi (để trống nếu giữ nguyên)" : "sk-bee-..."}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 pr-10 text-sm font-mono text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Base URL */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-foreground uppercase tracking-wide">
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span>Base URL (BEE_BASE_URL)</span>
            </label>
            <input
              type="text"
              value={beeBaseUrl}
              onChange={(e) => setBeeBaseUrl(e.target.value)}
              placeholder="https://platform.beeknoee.com/api/v1"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-mono text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-2xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Mặc định: https://platform.beeknoee.com/api/v1
            </p>
          </div>

          {/* Model Selection */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-foreground uppercase tracking-wide">
              <Cpu className="w-3.5 h-3.5 text-primary" />
              <span>Mô Hình AI (BEE_MODEL)</span>
            </label>
            <input
              type="text"
              value={beeModel}
              onChange={(e) => setBeeModel(e.target.value)}
              placeholder="gemini-3.1-flash-lite"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-mono text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-2xs"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {["gemini-3.1-flash-lite", "gemini-2.5-flash-lite", "brightone-standard"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setBeeModel(m)}
                  className={
                    "text-[10px] px-2 py-0.5 rounded-md border transition-all " +
                    (beeModel === m
                      ? "bg-primary text-primary-foreground border-primary font-bold"
                      : "bg-muted text-muted-foreground border-border hover:text-foreground")
                  }
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Timeout */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-foreground uppercase tracking-wide">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>Thời Gian Timeout (BEEKNOEE_TIMEOUT - ms)</span>
            </label>
            <input
              type="number"
              value={beeTimeout}
              onChange={(e) => setBeeTimeout(parseInt(e.target.value, 10) || 120000)}
              step={5000}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-mono text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-2xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Mặc định: 120000ms (2 phút cho tài liệu dài)
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={handleTestApiKey}
            disabled={testing || (!beeApiKey.trim() && !currentKey)}
            isLoading={testing}
            className="rounded-xl text-xs font-semibold"
          >
            <TestTube className="w-4 h-4 mr-1.5" />
            Kiểm Tra Kết Nối (Test API)
          </Button>

          <Button
            onClick={handleSave}
            disabled={loading}
            isLoading={loading}
            className="rounded-xl text-xs font-semibold"
          >
            <Save className="w-4 h-4 mr-1.5" />
            Lưu Cấu Hình
          </Button>
        </div>
      </div>
    </div>
  );
}
