"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface PaymentPackage {
  id: string;
  name: string;
  price: number;
  duration: number;
  features: string[];
  popular?: boolean;
}

const PACKAGES: PaymentPackage[] = [
  {
    id: "basic",
    name: "Gói Cơ bản",
    price: 99000,
    duration: 30,
    features: [
      "500 câu hỏi trắc nghiệm",
      "20 đề thi thử",
      "Báo cáo cơ bản",
      "Hỗ trợ email",
    ],
  },
  {
    id: "pro",
    name: "Gói Pro",
    price: 199000,
    duration: 30,
    features: [
      "Không giới hạn câu hỏi",
      "Không giới hạn đề thi",
      "Báo cáo chi tiết",
      "Lưu câu sai, bookmark",
      "AI giải thích (beta)",
      "Hỗ trợ ưu tiên",
    ],
    popular: true,
  },
  {
    id: "premium",
    name: "Gói Premium",
    price: 499000,
    duration: 90,
    features: [
      "Tất cả tính năng Pro",
      "90 ngày sử dụng",
      "Tài liệu PDF độc quyền",
      "Video bài giảng",
      "Hỗ trợ 1-1 với giảng viên",
      "Cam kết đậu hoặc hoàn tiền",
    ],
  },
];

export default function PaymentPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [selectedPackage, setSelectedPackage] = useState<PaymentPackage | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"bank" | "momo" | "zalo">("bank");
  const [showQR, setShowQR] = useState(false);

  const handleSelectPackage = (pkg: PaymentPackage) => {
    setSelectedPackage(pkg);
    setShowQR(false);
  };

  const generateQRContent = () => {
    if (!selectedPackage || !session?.user) return "";

    const content = `CIVILPREP ${selectedPackage.id.toUpperCase()} ${session.user.email}`;
    const amount = selectedPackage.price;

    // Format cho VietQR (chuẩn Napas)
    if (paymentMethod === "bank") {
      // VietQR format: bank_id, account_number, template, amount, description
      const bankId = "970422"; // MB Bank (thay bằng bank của bạn)
      const accountNo = "0325911750"; // Số tài khoản của bạn
      const template = "compact";

      return `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${amount}&addInfo=${encodeURIComponent(content)}`;
    }

    // Format cho MoMo
    if (paymentMethod === "momo") {
      const phone = "0325911750";
      return `https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(`2|99|${phone}|||0|0|${amount}|${content}|transfer_p2p`)}`;
    }

    return "";
  };

  const handleShowQR = () => {
    if (!session) {
      router.push("/login");
      return;
    }
    setShowQR(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Đã sao chép!");
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-[#f8fafc] py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Link href="/" className="inline-block mb-6 text-xl font-semibold tracking-[0.2em] text-transparent bg-gradient-to-r from-violet-300 via-indigo-300 to-sky-300 bg-clip-text">
            CIVILPREP
          </Link>
          <h1 className="text-4xl font-bold mb-4">Chọn gói học phù hợp với bạn</h1>
          <p className="text-slate-400 text-lg">Đầu tư vào tương lai với chi phí hợp lý</p>
        </div>

        {/* Packages Grid */}
        {!selectedPackage && (
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative rounded-3xl p-8 border transition-all cursor-pointer ${
                  pkg.popular
                    ? "border-violet-500 bg-violet-500/5 scale-105"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
                onClick={() => handleSelectPackage(pkg)}
              >
                {pkg.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-violet-600 text-white text-xs font-semibold rounded-full">
                    PHỔ BIẾN NHẤT
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2">{pkg.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-violet-400">
                      {pkg.price.toLocaleString("vi-VN")}
                    </span>
                    <span className="text-slate-400">₫</span>
                  </div>
                  <p className="text-sm text-slate-400 mt-2">{pkg.duration} ngày sử dụng</p>
                </div>

                <ul className="space-y-3 mb-8">
                  {pkg.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <svg className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full py-3 rounded-xl font-semibold transition ${
                    pkg.popular
                      ? "bg-violet-600 hover:bg-violet-500 text-white"
                      : "bg-white/10 hover:bg-white/20 text-slate-100"
                  }`}
                >
                  Chọn gói này
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Payment Section */}
        {selectedPackage && (
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => setSelectedPackage(null)}
              className="mb-6 text-slate-400 hover:text-white flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Quay lại chọn gói khác
            </button>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Left: Package Summary */}
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
                <h2 className="text-2xl font-bold mb-6">Thông tin gói đã chọn</h2>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Gói:</span>
                    <span className="font-semibold">{selectedPackage.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Thời hạn:</span>
                    <span className="font-semibold">{selectedPackage.duration} ngày</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Email:</span>
                    <span className="font-semibold text-sm">{session?.user?.email || "Chưa đăng nhập"}</span>
                  </div>
                  <div className="border-t border-white/10 pt-4 flex justify-between text-xl">
                    <span className="font-bold">Tổng thanh toán:</span>
                    <span className="font-bold text-violet-400">
                      {selectedPackage.price.toLocaleString("vi-VN")}₫
                    </span>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-200">
                  <strong>Lưu ý:</strong> Sau khi chuyển khoản, vui lòng chờ 5-10 phút để hệ thống xác nhận.
                  Hoặc gửi ảnh bill cho Zalo <strong>0325911750</strong> để được kích hoạt nhanh hơn.
                </div>
              </div>

              {/* Right: Payment Methods */}
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
                <h2 className="text-2xl font-bold mb-6">Phương thức thanh toán</h2>

                {/* Payment Method Tabs */}
                <div className="flex gap-2 mb-6">
                  <button
                    onClick={() => setPaymentMethod("bank")}
                    className={`flex-1 py-3 px-4 rounded-xl font-semibold transition ${
                      paymentMethod === "bank"
                        ? "bg-violet-600 text-white"
                        : "bg-white/10 text-slate-400 hover:bg-white/20"
                    }`}
                  >
                    Ngân hàng
                  </button>
                  <button
                    onClick={() => setPaymentMethod("momo")}
                    className={`flex-1 py-3 px-4 rounded-xl font-semibold transition ${
                      paymentMethod === "momo"
                        ? "bg-violet-600 text-white"
                        : "bg-white/10 text-slate-400 hover:bg-white/20"
                    }`}
                  >
                    MoMo
                  </button>
                  <button
                    onClick={() => setPaymentMethod("zalo")}
                    className={`flex-1 py-3 px-4 rounded-xl font-semibold transition ${
                      paymentMethod === "zalo"
                        ? "bg-violet-600 text-white"
                        : "bg-white/10 text-slate-400 hover:bg-white/20"
                    }`}
                  >
                    Zalo
                  </button>
                </div>

                {/* Bank Transfer */}
                {paymentMethod === "bank" && (
                  <div className="space-y-4">
                    <div className="bg-slate-950/60 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Ngân hàng:</span>
                        <span className="font-semibold">MB Bank (Quân đội)</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Số tài khoản:</span>
                        <button
                          onClick={() => copyToClipboard("0325911750")}
                          className="font-mono font-bold text-violet-400 hover:text-violet-300"
                        >
                          0325911750 📋
                        </button>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Chủ tài khoản:</span>
                        <span className="font-semibold">TRAN DUC TINH</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Nội dung:</span>
                        <button
                          onClick={() => copyToClipboard(`CIVILPREP ${selectedPackage.id.toUpperCase()} ${session?.user?.email || ""}`)}
                          className="font-mono text-sm font-bold text-violet-400 hover:text-violet-300"
                        >
                          CIVILPREP {selectedPackage.id.toUpperCase()} 📋
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleShowQR}
                      className="w-full py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-semibold transition"
                    >
                      Hiển thị mã QR
                    </button>

                    {showQR && (
                      <div className="text-center">
                        <img
                          src={generateQRContent()}
                          alt="QR Code"
                          className="mx-auto rounded-xl border border-white/10"
                        />
                        <p className="text-sm text-slate-400 mt-4">
                          Quét mã QR bằng app ngân hàng để thanh toán
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* MoMo */}
                {paymentMethod === "momo" && (
                  <div className="space-y-4">
                    <div className="bg-slate-950/60 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Số điện thoại:</span>
                        <button
                          onClick={() => copyToClipboard("0325911750")}
                          className="font-mono font-bold text-violet-400 hover:text-violet-300"
                        >
                          0325911750 📋
                        </button>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Tên:</span>
                        <span className="font-semibold">TRAN DUC TINH</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Nội dung:</span>
                        <button
                          onClick={() => copyToClipboard(`CIVILPREP ${selectedPackage.id.toUpperCase()}`)}
                          className="font-mono text-sm font-bold text-violet-400 hover:text-violet-300"
                        >
                          CIVILPREP {selectedPackage.id.toUpperCase()} 📋
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleShowQR}
                      className="w-full py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-semibold transition"
                    >
                      Hiển thị mã QR MoMo
                    </button>

                    {showQR && (
                      <div className="text-center">
                        <img
                          src={generateQRContent()}
                          alt="MoMo QR Code"
                          className="mx-auto rounded-xl border border-white/10 w-64 h-64"
                        />
                        <p className="text-sm text-slate-400 mt-4">
                          Quét mã QR bằng app MoMo để thanh toán
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Zalo */}
                {paymentMethod === "zalo" && (
                  <div className="space-y-4">
                    <div className="bg-slate-950/60 rounded-xl p-4 space-y-4">
                      <p className="text-slate-300 text-sm leading-relaxed">
                        Thanh toán qua Zalo giúp bạn được kích hoạt tài khoản nhanh nhất (trong vòng 5 phút).
                      </p>

                      <div className="border-t border-white/10 pt-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Số Zalo:</span>
                          <button
                            onClick={() => copyToClipboard("0325911750")}
                            className="font-mono font-bold text-violet-400 hover:text-violet-300"
                          >
                            0325911750 📋
                          </button>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Tên:</span>
                          <span className="font-semibold">CIVILPREP Support</span>
                        </div>
                      </div>

                      <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4">
                        <p className="text-sm text-violet-200 mb-2">
                          <strong>Tin nhắn mẫu:</strong>
                        </p>
                        <button
                          onClick={() => copyToClipboard(
                            `Xin chào! Tôi muốn mua ${selectedPackage.name} (${selectedPackage.price.toLocaleString("vi-VN")}₫). Email: ${session?.user?.email || "[email của bạn]"}`
                          )}
                          className="w-full text-left bg-slate-950/60 rounded-lg p-3 text-sm text-slate-300 hover:bg-slate-950/80 transition"
                        >
                          Xin chào! Tôi muốn mua {selectedPackage.name} ({selectedPackage.price.toLocaleString("vi-VN")}₫).
                          Email: {session?.user?.email || "[email của bạn]"} 📋
                        </button>
                      </div>
                    </div>

                    <a
                      href="https://zalo.me/0325911750"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold text-center transition"
                    >
                      Mở Zalo để nhắn tin
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* FAQ */}
        <div className="max-w-4xl mx-auto mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">Câu hỏi thường gặp</h2>
          <div className="space-y-4">
            <details className="bg-white/5 border border-white/10 rounded-xl p-6">
              <summary className="font-semibold cursor-pointer">Sau khi thanh toán bao lâu được kích hoạt?</summary>
              <p className="mt-3 text-slate-400 text-sm">
                Thường trong vòng 5-10 phút. Nếu quá 15 phút chưa được kích hoạt, vui lòng nhắn tin Zalo 0325911750 kèm ảnh bill.
              </p>
            </details>
            <details className="bg-white/5 border border-white/10 rounded-xl p-6">
              <summary className="font-semibold cursor-pointer">Tôi có thể hoàn tiền không?</summary>
              <p className="mt-3 text-slate-400 text-sm">
                Có, trong vòng 7 ngày nếu bạn chưa sử dụng quá 20% câu hỏi. Liên hệ qua Zalo để được hỗ trợ.
              </p>
            </details>
            <details className="bg-white/5 border border-white/10 rounded-xl p-6">
              <summary className="font-semibold cursor-pointer">License hết hạn thì sao?</summary>
              <p className="mt-3 text-slate-400 text-sm">
                Dữ liệu học tập của bạn vẫn được lưu. Bạn chỉ cần gia hạn để tiếp tục sử dụng.
              </p>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
