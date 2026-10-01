"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Key, Check, AlertCircle, Calendar } from "lucide-react";

export default function ActivateLicensePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [activating, setActivating] = useState(false);
  const [licenseStatus, setLicenseStatus] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    checkLicenseStatus();
  }, []);

  const checkLicenseStatus = async () => {
    try {
      const res = await fetch("/api/licenses/check");
      const data = await res.json();

      if (data.success) {
        setLicenseStatus(data.data);
      }
    } catch (error) {
      console.error("Error checking license:", error);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim()) {
      toast.error("Vui lòng nhập mã license");
      return;
    }

    try {
      setActivating(true);
      const res = await fetch("/api/licenses/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        setCode("");
        checkLicenseStatus();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Lỗi khi kích hoạt license");
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Key className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Kích hoạt License</h1>
          <p className="text-gray-600 mt-2">
            Nhập mã license để gia hạn hoặc kích hoạt tài khoản
          </p>
        </div>

        {/* Current License Status */}
        {!loadingStatus && licenseStatus && (
          <div className="bg-white rounded-lg border p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Trạng thái hiện tại
            </h2>

            {licenseStatus.isActive ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-green-600">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">License đang hoạt động</span>
                </div>

                <div className="flex items-center gap-3 text-gray-700">
                  <Calendar className="w-5 h-5" />
                  <span>
                    Hết hạn:{" "}
                    {new Date(licenseStatus.expiresAt).toLocaleDateString("vi-VN")}
                  </span>
                </div>

                <div className="text-sm text-gray-600">
                  Còn lại: <span className="font-medium">{licenseStatus.daysRemaining} ngày</span>
                </div>

                {licenseStatus.activeLicense && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Mã license hiện tại</div>
                    <code className="text-sm font-mono">{licenseStatus.activeLicense.code}</code>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-orange-600">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">
                    {licenseStatus.hasLicense && licenseStatus.isExpired
                      ? "License đã hết hạn"
                      : "Chưa có license"}
                  </span>
                </div>

                {licenseStatus.hasLicense && licenseStatus.isExpired && (
                  <div className="text-sm text-gray-600">
                    Đã hết hạn từ:{" "}
                    {new Date(licenseStatus.expiresAt).toLocaleDateString("vi-VN")}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Activation Form */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Kích hoạt mã mới
          </h2>

          <form onSubmit={handleActivate} className="space-y-4">
            <div>
              <label
                htmlFor="code"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Mã License
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center text-lg"
                disabled={activating}
              />
              <p className="mt-2 text-xs text-gray-500">
                Nhập mã license bạn đã nhận từ admin
              </p>
            </div>

            <button
              type="submit"
              disabled={activating || !code.trim()}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {activating ? "Đang kích hoạt..." : "Kích hoạt ngay"}
            </button>
          </form>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            Lưu ý:
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Mỗi mã license chỉ có thể sử dụng 1 lần</li>
            <li>• License mới sẽ được cộng thêm vào thời hạn hiện tại</li>
            <li>• Liên hệ admin nếu có vấn đề khi kích hoạt</li>
          </ul>
        </div>

        {/* Back Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Quay lại
          </button>
        </div>
      </div>
    </div>
  );
}
