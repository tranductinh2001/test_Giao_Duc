import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendPasswordResetEmailParams {
  to: string;
  userName: string;
  resetUrl: string;
  expiresAt: Date;
}

interface SendAccountLockedEmailParams {
  to: string;
  userName: string;
  unlockUrl: string;
  lockReason: string;
}

interface SendPasswordChangedEmailParams {
  to: string;
  userName: string;
  ipAddress: string;
  userAgent: string;
}

interface SendWelcomeEmailParams {
  to: string;
  userName: string;
}

export async function sendPasswordResetEmail({
  to,
  userName,
  resetUrl,
  expiresAt,
}: SendPasswordResetEmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: "CivilPrep <noreply@civilprep.vn>",
      to,
      subject: "🔑 Đặt lại mật khẩu - CivilPrep",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0f1e;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0f1e; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1f2e; border-radius: 16px; overflow: hidden; border: 1px solid rgba(139, 92, 246, 0.2);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">🔑 Đặt lại mật khẩu</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #e2e8f0; font-size: 16px; line-height: 1.6;">
                Xin chào <strong style="color: white;">${userName}</strong>,
              </p>

              <p style="margin: 0 0 20px; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
                Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhấn vào nút bên dưới để tạo mật khẩu mới:
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);">
                      Đặt lại mật khẩu
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry Notice -->
              <div style="background-color: #2d1b69; border-left: 4px solid #7c3aed; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #c4b5fd; font-size: 14px;">
                  ⏰ Link này sẽ hết hạn vào <strong>${expiresAt.toLocaleString("vi-VN")}</strong> (1 giờ kể từ bây giờ).
                </p>
              </div>

              <!-- Alternative Link -->
              <p style="margin: 20px 0 0; color: #94a3b8; font-size: 13px; line-height: 1.6;">
                Nếu nút không hoạt động, copy và paste link sau vào trình duyệt:
              </p>
              <p style="margin: 10px 0 0; padding: 12px; background-color: #0f172a; border-radius: 8px; word-break: break-all;">
                <a href="${resetUrl}" style="color: #818cf8; text-decoration: none; font-size: 13px;">${resetUrl}</a>
              </p>

              <!-- Security Notice -->
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
                <p style="margin: 0 0 10px; color: #f87171; font-size: 14px; font-weight: 600;">
                  🔒 Lưu ý bảo mật:
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 13px; line-height: 1.8;">
                  <li>Nếu bạn KHÔNG yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này và liên hệ ngay với bộ phận hỗ trợ.</li>
                  <li>Không chia sẻ link này với bất kỳ ai.</li>
                  <li>CivilPrep sẽ không bao giờ yêu cầu mật khẩu qua email.</li>
                </ul>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 30px; text-align: center; border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="margin: 0 0 10px; color: #64748b; font-size: 13px;">
                Trân trọng,<br>
                <strong style="color: #94a3b8;">Đội ngũ CivilPrep</strong>
              </p>
              <p style="margin: 10px 0 0; color: #475569; font-size: 12px;">
                📧 support@civilprep.vn | 📱 1900-xxxx
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Send password reset email error:", error);
    return { success: false, error };
  }
}

export async function sendAccountLockedEmail({
  to,
  userName,
  unlockUrl,
  lockReason,
}: SendAccountLockedEmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: "CivilPrep Security <security@civilprep.vn>",
      to,
      subject: "⚠️ Tài khoản bị khóa - CivilPrep",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0f1e;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0f1e; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1f2e; border-radius: 16px; overflow: hidden; border: 1px solid rgba(239, 68, 68, 0.3);">
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">⚠️ Tài khoản bị khóa</h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #e2e8f0; font-size: 16px;">
                Xin chào <strong style="color: white;">${userName}</strong>,
              </p>

              <p style="margin: 0 0 20px; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
                Tài khoản của bạn đã bị khóa tạm thời vì lý do: <strong style="color: #fca5a5;">${lockReason}</strong>
              </p>

              <div style="background-color: #7f1d1d; border-left: 4px solid #dc2626; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #fecaca; font-size: 14px;">
                  🔒 Để bảo vệ tài khoản, chúng tôi đã khóa tạm thời quyền truy cập.
                </p>
              </div>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${unlockUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px;">
                      Mở khóa tài khoản
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0; color: #94a3b8; font-size: 13px;">
                Hoặc liên hệ hỗ trợ: <a href="mailto:support@civilprep.vn" style="color: #818cf8;">support@civilprep.vn</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color: #0f172a; padding: 30px; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 13px;">
                Trân trọng,<br><strong style="color: #94a3b8;">Bộ phận bảo mật CivilPrep</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Send account locked email error:", error);
    return { success: false, error };
  }
}

export async function sendPasswordChangedEmail({
  to,
  userName,
  ipAddress,
  userAgent,
}: SendPasswordChangedEmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: "CivilPrep Security <security@civilprep.vn>",
      to,
      subject: "✅ Mật khẩu đã được thay đổi - CivilPrep",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0f1e;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0f1e; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1f2e; border-radius: 16px; overflow: hidden; border: 1px solid rgba(34, 197, 94, 0.2);">
          <tr>
            <td style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">✅ Mật khẩu đã thay đổi</h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #e2e8f0; font-size: 16px;">
                Xin chào <strong style="color: white;">${userName}</strong>,
              </p>

              <p style="margin: 0 0 20px; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
                Mật khẩu tài khoản của bạn đã được thay đổi thành công.
              </p>

              <div style="background-color: #14532d; border-left: 4px solid #22c55e; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px; color: #bbf7d0; font-size: 14px; font-weight: 600;">
                  📍 Thông tin đăng nhập:
                </p>
                <p style="margin: 5px 0; color: #86efac; font-size: 13px;">
                  IP: ${ipAddress}<br>
                  Thiết bị: ${userAgent.substring(0, 80)}...
                </p>
              </div>

              <div style="background-color: #7f1d1d; border-left: 4px solid #dc2626; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #fecaca; font-size: 14px;">
                  ⚠️ Nếu KHÔNG phải bạn thực hiện thao tác này, vui lòng liên hệ ngay: <a href="mailto:security@civilprep.vn" style="color: #fca5a5;">security@civilprep.vn</a>
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="background-color: #0f172a; padding: 30px; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 13px;">
                Trân trọng,<br><strong style="color: #94a3b8;">Bộ phận bảo mật CivilPrep</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Send password changed email error:", error);
    return { success: false, error };
  }
}

export async function sendWelcomeEmail({
  to,
  userName,
}: SendWelcomeEmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: "CivilPrep <noreply@civilprep.vn>",
      to,
      subject: "🎉 Chào mừng đến với CivilPrep!",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0f1e;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0f1e; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1f2e; border-radius: 16px; overflow: hidden; border: 1px solid rgba(139, 92, 246, 0.2);">
          <tr>
            <td style="background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 700;">🎉 Chào mừng!</h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #e2e8f0; font-size: 18px;">
                Xin chào <strong style="color: white;">${userName}</strong>,
              </p>

              <p style="margin: 0 0 20px; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
                Cảm ơn bạn đã đăng ký tài khoản tại <strong style="color: #a78bfa;">CivilPrep</strong>! 🚀
              </p>

              <p style="margin: 0 0 30px; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
                Bạn đã sẵn sàng để bắt đầu hành trình ôn luyện của mình. Hãy khám phá các tính năng:
              </p>

              <div style="background-color: #2d1b69; padding: 20px; border-radius: 12px; margin: 20px 0;">
                <p style="margin: 0 0 15px; color: #c4b5fd; font-size: 15px;">✨ <strong>Tính năng nổi bật:</strong></p>
                <ul style="margin: 0; padding-left: 20px; color: #ddd6fe; font-size: 14px; line-height: 2;">
                  <li>📝 Hàng nghìn câu hỏi ôn tập</li>
                  <li>📊 Theo dõi tiến độ học tập</li>
                  <li>🎯 Đề thi mô phỏng thực tế</li>
                  <li>📈 Phân tích kết quả chi tiết</li>
                </ul>
              </div>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${process.env.NEXTAUTH_URL}/dashboard" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px;">
                      Bắt đầu ngay
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background-color: #0f172a; padding: 30px; text-align: center;">
              <p style="margin: 0 0 10px; color: #64748b; font-size: 13px;">
                Chúc bạn học tập hiệu quả!<br>
                <strong style="color: #94a3b8;">Đội ngũ CivilPrep</strong>
              </p>
              <p style="margin: 10px 0 0; color: #475569; font-size: 12px;">
                📧 support@civilprep.vn | 📱 1900-xxxx
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Send welcome email error:", error);
    return { success: false, error };
  }
}
