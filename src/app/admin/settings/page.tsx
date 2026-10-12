"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Save, Key, CheckCircle, AlertCircle, FileText, TestTube, Eye, EyeOff, X, Settings as SettingsIcon, Info } from "lucide-react";
import Button from "@/components/ui/button";

export default function SettingsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (authStatus !== "loading" && session?.user?.role !== "ADMIN") {
      router.replace("/admin");
    }
  }, [session, authStatus, router]);
  const [beeApiKey, setBeeApiKey] = useState("");
  const [currentKey, setCurrentKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentKey = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (data.success && data.data.beeApiKey) {
        setCurrentKey(maskApiKey(data.data.beeApiKey));
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    }
  };

  useEffect(() => {
    fetchCurrentKey();
  }, []);

  const maskApiKey = (key: string) => {
    if (!key || key === "your-beeknoee-api-key-here" || key.length < 10) return "";
    return key.substring(0, 8) + "..." + key.substring(key.length - 4);
  };

  const handleSave = async () => {
    if (!beeApiKey.trim()) {
      setError("Vui lòng nhập API key");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beeApiKey: beeApiKey.trim() }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage("Đã lưu API key");
        setCurrentKey(maskApiKey(beeApiKey));
        setBeeApiKey("");
      } else {
        setError(data.message || "Lỗi khi lưu");
      }
    } catch {
      setError("Lỗi khi lưu cài đặt");
    } finally {
      setLoading(false);
    }
  };

  const handleTestApiKey = async () => {
    if (!beeApiKey.trim()) {
      setError("Vui lòng nhập API key để test");
      return;
    }

    setTesting(true);
    try {
      const res = await fetch("/api/admin/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beeApiKey: beeApiKey.trim() }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage("API key hợp lệ!");
      } else {
        setError(data.message || "API key không hợp lệ");
      }
    } catch {
      setError("Lỗi khi test API key");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <SettingsIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Cài Đặt Hệ Thống
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Cấu hình hệ thống và API
            </p>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {message && (
        <div className="flex items-center justify-between rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* AI API Key Configuration */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Cấu Hình AI
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              API Key cho các chức năng AI (Review, Sinh Rule, Tạo câu hỏi...)
            </p>
          </div>
        </div>

        {/* Current Key Status */}
        {currentKey ? (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">API key đã lưu:</span>
              <code className="font-mono text-zinc-600 dark:text-zinc-300">{currentKey}</code>
            </div>
          </div>
        ) : (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-amber-700 dark:text-amber-400 font-medium">
                Chưa có API key. Các chức năng AI sẽ không hoạt động.
              </span>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              API Key Mới
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={beeApiKey}
                onChange={(e) => setBeeApiKey(e.target.value)}
                placeholder="sk-bee-..."
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 pr-10 text-sm font-mono focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Lấy key tại:{" "}
              <a href="https://platform.beeknoee.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Beeknoee Platform
              </a>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleTestApiKey} disabled={testing || !beeApiKey.trim()} isLoading={testing}>
              <TestTube className="w-4 h-4 mr-2" />
              Test
            </Button>
            <Button onClick={handleSave} disabled={loading || !beeApiKey.trim()} isLoading={loading}>
              <Save className="w-4 h-4 mr-2" />
              Lưu
            </Button>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
            <Info className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Thông Tin Hệ Thống
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Thông tin cấu hình và modules
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800">
            <div className="text-zinc-500 dark:text-zinc-400 mb-1">Module</div>
            <div className="font-medium">Education Platform</div>
          </div>
          <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800">
            <div className="text-zinc-500 dark:text-zinc-400 mb-1">AI Provider</div>
            <div className="font-medium">Google Gemini</div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          Hướng Dẫn Lấy Beeknoee API Key
        </h3>
        <ol className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1.5 list-decimal list-inside">
          <li>Truy cập <a href="https://platform.beeknoee.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Beeknoee Platform</a></li>
          <li>Đăng nhập hoặc tạo tài khoản</li>
          <li>Vào phần "API Keys" hoặc "Settings"</li>
          <li>Click "Create API Key" (bắt đầu với "sk-bee-")</li>
          <li>Paste vào ô trên và click "Test" để kiểm tra</li>
        </ol>
        <div className="mt-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-700 dark:text-blue-400">
            💡 <strong>Models:</strong> gemini-3.1-flash-lite (miễn phí), gemini-2.5-flash, gemini-3.1-pro-preview
          </p>
        </div>
      </div>
    </div>
  );
}
