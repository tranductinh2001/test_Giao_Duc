import React from "react";
import Link from "next/link";
import UserNavbar from "@/components/user-navbar";
import { auth } from "@/auth";
import Button from "@/components/ui/button";
import { HelpCircle, MessageSquare, ChevronDown } from "lucide-react";

const faqs = [
  {
    category: "🎯 Về nền tảng",
    questions: [
      {
        q: "VCGo Education là gì?",
        a: "VCGo Education là nền tảng giáo dục ứng dụng AI thế hệ mới với lộ trình học tập cá nhân hóa dựa trên thuật toán thông minh. Hệ thống hỗ trợ ôn thi viên chức, công chức, phân tích giáo án và quản lý ngân hàng câu hỏi.",
      },
      {
        q: "Tôi cần chuẩn bị gì để bắt đầu?",
        a: "Bạn chỉ cần đăng ký tài khoản miễn phí, sau đó kích hoạt license để truy cập đầy đủ ngân hàng câu hỏi và đề thi. License có thể mua qua chuyển khoản hoặc liên hệ admin.",
      },
      {
        q: "App có trên mobile không?",
        a: "Hiện tại VCGo Education hoạt động trên trình duyệt web (Chrome, Safari, Firefox) và tối ưu cho cả desktop lẫn mobile. Bạn có thể học mọi lúc mọi nơi chỉ cần có kết nối internet.",
      },
    ],
  },
  {
    category: "🔑 License & Thanh toán",
    questions: [
      {
        q: "Làm sao để kích hoạt license?",
        a: "Sau khi mua license, bạn sẽ nhận được mã kích hoạt (dạng VIC-XXXX-XXXX-XXXX). Vào Dashboard > phần License > nhập mã và click 'Kích hoạt tài khoản'. License sẽ có hiệu lực ngay lập tức.",
      },
      {
        q: "License có thời hạn bao lâu?",
        a: "Mỗi license có thời hạn khác nhau (30 ngày, 90 ngày, 365 ngày) tùy gói bạn chọn. Thời hạn được hiển thị ngay trên Dashboard và bạn có thể gia hạn bằng cách kích hoạt thêm license mới.",
      },
      {
        q: "License đã kích hoạt có dùng cho tài khoản khác được không?",
        a: "Không. Mỗi mã license chỉ dùng được 1 lần và gắn với 1 tài khoản duy nhất. Không thể chuyển nhượng hoặc chia sẻ license.",
      },
      {
        q: "Thanh toán như thế nào?",
        a: "Hiện tại hỗ trợ chuyển khoản ngân hàng hoặc Momo. Sau khi chuyển khoản, quét mã QR hoặc liên hệ admin để nhận mã license trong vòng 5-10 phút.",
      },
    ],
  },
  {
    category: "📚 Học tập & Thi thử",
    questions: [
      {
        q: "Chế độ 'Luyện tập' và 'Thi thử' khác nhau thế nào?",
        a: "Luyện tập: không giới hạn thời gian, xem đáp án ngay, phù hợp để học kiến thức mới. Thi thử: có bấm giờ, chấm điểm tự động, giống thi thật để đánh giá năng lực.",
      },
      {
        q: "Câu hỏi được chọn theo thuật toán gì?",
        a: "Hệ thống dùng thuật toán Spaced Repetition và Weighted Random: ưu tiên câu chưa làm, câu sai nhiều, câu lâu chưa ôn. Giúp bạn tập trung vào kiến thức yếu thay vì lặp lại câu đã thành thạo.",
      },
      {
        q: "Bookmark là gì? Dùng để làm gì?",
        a: "Bookmark là lưu lại câu hỏi quan trọng hoặc khó. Trong phòng thi, nhấn nút 'Lưu câu này' hoặc phím Space. Các câu bookmark sẽ hiển thị trong Dashboard để bạn ôn lại.",
      },
      {
        q: "Nếu làm dở bài thi, tắt trình duyệt thì sao?",
        a: "Hệ thống tự động lưu tiến độ mỗi 30 giây. Tuy nhiên, nếu bạn tắt trình duyệt, lần vào lại sẽ phải làm bài mới. Đang phát triển tính năng phục hồi bài thi.",
      },
      {
        q: "Điểm số được tính như thế nào?",
        a: "Điểm = (Số câu đúng / Tổng số câu) × 100. Ví dụ: 40/50 câu đúng = 80 điểm. Điểm đạt yêu cầu từ 50 trở lên.",
      },
    ],
  },
  {
    category: "🎮 Gamification",
    questions: [
      {
        q: "XP và Level là gì?",
        a: "XP (Experience Points) là điểm kinh nghiệm bạn nhận được khi làm bài. Càng làm nhiều, XP càng cao, Level càng tăng. Level phản ánh sự tiến bộ của bạn.",
      },
      {
        q: "Làm sao để nhận XP?",
        a: "Mỗi câu đúng: +10 XP, mỗi câu sai: +5 XP, hoàn thành 1 đề thi: +50 XP. Nếu đạt điểm 100: thêm bonus XP. Streak 7 ngày liên tiếp: +100 XP.",
      },
      {
        q: "Streak là gì? Làm sao duy trì?",
        a: "Streak là số ngày bạn học liên tục. Mỗi ngày làm ít nhất 1 bài thi hoặc luyện tập để giữ streak. Nếu nghỉ 1 ngày, streak về 0. Bonus XP khi đạt mốc 7 hoặc 30 ngày.",
      },
      {
        q: "Huy hiệu (Badge) có tác dụng gì?",
        a: "Badge là thành tựu bạn đạt được (ví dụ: 'Hoàn hảo' khi đạt 100 điểm, 'Siêng năng' khi làm 10 đề). Badge thể hiện quá trình học tập và tạo động lực.",
      },
    ],
  },
  {
    category: "⚙️ Tài khoản & Cài đặt",
    questions: [
      {
        q: "Làm sao để đổi mật khẩu?",
        a: "Vào Dashboard > Click avatar góc phải > Hồ sơ > nhập mật khẩu hiện tại và mật khẩu mới. Mật khẩu phải có ít nhất 8 ký tự.",
      },
      {
        q: "Quên mật khẩu thì làm sao?",
        a: "Hiện tại vui lòng liên hệ admin qua email để reset mật khẩu. Tính năng 'Quên mật khẩu' tự động đang được phát triển.",
      },
      {
        q: "Tài khoản bị khóa vì sao?",
        a: "Tài khoản có thể bị khóa nếu vi phạm điều khoản sử dụng (gian lận, spam, chia sẻ tài khoản). Liên hệ admin để được hỗ trợ mở khóa nếu bạn cho rằng đây là nhầm lẫn.",
      },
    ],
  },
  {
    category: "🆘 Hỗ trợ & Liên hệ",
    questions: [
      {
        q: "Gặp lỗi kỹ thuật thì làm sao?",
        a: "Thử refresh trang (Ctrl+R hoặc Cmd+R) hoặc xóa cache trình duyệt. Nếu vẫn lỗi, chụp màn hình và gửi về zalo 0352911750 hoặc dùng mục 'Góp ý' trên Dashboard.",
      },
      {
        q: "Làm sao để liên hệ admin?",
        a: "Zalo: 0352911750 hoặc dùng form 'Góp ý' trong Dashboard. Thời gian phản hồi: trong ngày làm việc (9h-18h).",
      },
      {
        q: "Có hỗ trợ khóa học offline không?",
        a: "Hiện tại chỉ hỗ trợ học online qua nền tảng web. Đang nghiên cứu tổ chức các buổi workshop offline trong tương lai.",
      },
    ],
  },
];

export default async function FAQPage() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-background">
      <UserNavbar userName={session?.user?.name ?? undefined} userRole={session?.user?.role ?? undefined} />

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-5xl">
        {/* Header */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-6 lg:p-8 shadow-subtle text-center mb-4 sm:mb-6 animate-fade-in">
          <div className="inline-flex items-center gap-2 rounded-full border-2 border-info bg-info/10 px-3 sm:px-4 py-1.5 sm:py-2 mb-3 sm:mb-4">
            <HelpCircle className="w-4 h-4 text-info" aria-hidden="true" />
            <span className="text-[10px] sm:text-xs font-bold tracking-wider text-info uppercase">
              Trợ Giúp
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2 sm:mb-4">
            Câu Hỏi Thường Gặp
          </h1>
          <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Tìm câu trả lời nhanh cho các thắc mắc phổ biến về nền tảng, tính năng và&nbsp;cách&nbsp;sử&nbsp;dụng
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
          {faqs.map((category, idx) => (
            <a
              key={idx}
              href={`#category-${idx}`}
              className="bg-card border border-border rounded-xl p-3 sm:p-4 lg:p-6 shadow-subtle text-center hover:shadow-elevated hover:border-primary transition-all group"
            >
              <div className="text-xl sm:text-2xl mb-1 sm:mb-2">{category.category.split(" ")[0]}</div>
              <p className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                {category.category.split(" ").slice(1).join(" ")}
              </p>
            </a>
          ))}
        </div>

        {/* FAQ Sections */}
        <div className="space-y-6 sm:space-y-8">
          {faqs.map((category, catIdx) => (
            <div key={catIdx} id={`category-${catIdx}`} className="scroll-mt-16 sm:scroll-mt-20">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
                <span>{category.category}</span>
              </h2>
              <div className="space-y-3 sm:space-y-4">
                {category.questions.map((faq, qIdx) => (
                  <details
                    key={qIdx}
                    className="bg-card border border-border rounded-xl p-3 sm:p-4 lg:p-6 shadow-subtle group hover:shadow-elevated transition-all"
                  >
                    <summary className="cursor-pointer list-none flex items-start justify-between gap-2 sm:gap-4 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg">
                      <h3 className="flex-1 font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors">
                        {faq.q}
                      </h3>
                      <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-open:rotate-180 transition-transform flex-shrink-0 mt-0.5" aria-hidden="true" />
                    </summary>
                    <p className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t-2 border-border text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {faq.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-br from-primary/10 to-info/10 border-2 border-primary rounded-xl p-4 sm:p-6 lg:p-8 shadow-subtle mt-8 sm:mt-12 text-center">
          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground mb-2">
            Không Tìm Thấy Câu Trả Lời?
          </h3>
          <p className="text-muted-foreground mb-4 sm:mb-6">
            Hãy liên hệ với chúng tôi để được hỗ trợ nhanh&nbsp;nhất
          </p>
          <div className="flex gap-2 sm:gap-3 justify-center flex-wrap">
            <Link href="/feedback">
              <Button variant="primary" size="sm">
                <MessageSquare className="w-4 h-4 mr-1 sm:mr-2" aria-hidden="true" />
                <span className="hidden sm:inline">Gửi Góp Ý</span>
                <span className="sm:hidden">Góp Ý</span>
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="secondary" size="sm">
                Về Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
