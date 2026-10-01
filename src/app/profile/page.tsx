"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import UserNavbar from "@/components/user-navbar";
import Button from "@/components/ui/button";
import { AnimatedContainer, AnimatedCard, FadeInWhenVisible } from "@/components/motion";
import { User, Lock, CheckCircle, XCircle, Calendar } from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  licenseExpiresAt: string | null;
  createdAt: string;
}

export default function ProfilePage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (sessionStatus === "authenticated") {
      fetchProfile();
    }
  }, [sessionStatus, router]);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/user/profile");
      const data = await res.json();

      if (data.success) {
        setProfile(data.data);
        setName(data.data.name);
      } else {
        setError(data.message || "Không thể tải thông tin tài khoản");
      }
    } catch {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword || currentPassword) {
      if (!currentPassword) {
        setError("Vui lòng nhập mật khẩu hiện tại");
        return;
      }
      if (!newPassword) {
        setError("Vui lòng nhập mật khẩu mới");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("Mật khẩu xác nhận không khớp");
        return;
      }
      if (newPassword.length < 8) {
        setError("Mật khẩu mới phải có ít nhất 8 ký tự");
        return;
      }
    }

    setSaving(true);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setProfile(data.data);
        setSuccess("Cập nhật thông tin thành công!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setError(data.message || "Không thể cập nhật thông tin");
      }
    } catch {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <UserNavbar userName={session?.user?.name ?? undefined} userRole={session?.user?.role ?? undefined} />
        <div className="container mx-auto py-20">
          <div className="flex items-center justify-center">
            <div className="spinner" />
          </div>
        </div>
      </div>
    );
  }

  const isLicenseActive = profile?.licenseExpiresAt && new Date(profile.licenseExpiresAt) > new Date();
  const daysRemaining = profile?.licenseExpiresAt
    ? Math.ceil((new Date(profile.licenseExpiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <UserNavbar userName={profile?.name} userRole={profile?.role} />

      <div className="container mx-auto space-y-6 py-6">
        {/* Header */}
        <AnimatedContainer animation="fadeInDown">
        <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-xl p-6 shadow-subtle border border-border">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <User className="w-8 h-8 text-primary" aria-hidden="true" />
            Thông Tin Tài Khoản
          </h1>
          <p className="mt-2 text-sm font-medium text-muted-foreground">Quản lý thông tin cá nhân và&nbsp;bảo&nbsp;mật</p>
        </div>
        </AnimatedContainer>

        {error && (
          <div className="rounded-xl p-4 bg-error/10 border-2 border-error text-error text-sm font-semibold animate-fade-in">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl p-4 bg-success/10 border-2 border-success text-success text-sm font-semibold animate-fade-in">
            {success}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left: Profile Info Card */}
          <div className="md:col-span-1 space-y-6">
            <AnimatedCard delay={0.1}>
            <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-xl p-6 shadow-subtle border border-border">
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-3xl font-bold text-primary-foreground mb-4 mx-auto shadow-elevated">
                {profile?.name.charAt(0).toUpperCase()}
              </div>

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-foreground">{profile?.name}</h3>
                <p className="text-sm font-medium text-muted-foreground mt-1">{profile?.email}</p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b-2 border-border">
                  <span className="font-semibold text-muted-foreground">Vai&nbsp;trò:</span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold ${
                    profile?.role === "ADMIN" ? "bg-warning/10 text-warning" : "bg-info/10 text-info"
                  }`}>
                    {profile?.role === "ADMIN" ? "Quản Trị Viên" : "Học Viên"}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b-2 border-border">
                  <span className="font-semibold text-muted-foreground">Trạng thái:</span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold ${
                    profile?.status === "ACTIVE" ? "bg-success/10 text-success" : "bg-error/10 text-error"
                  }`}>
                    {profile?.status === "ACTIVE" ? "Hoạt động" : "Bị khóa"}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b-2 border-border">
                  <span className="font-semibold text-muted-foreground">Tham gia:</span>
                  <span className="font-bold text-foreground">
                    {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("vi-VN") : "N/A"}
                  </span>
                </div>
              </div>
            </div>
            </AnimatedCard>

            {/* License Status Card */}
            {profile?.role === "LEARNER" && (
              <AnimatedCard delay={0.2}>
              <div className={`bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-xl p-6 shadow-subtle border-2 ${
                isLicenseActive
                  ? "border-success"
                  : "border-destructive"
              }`}>
                <h4 className={`font-bold text-base flex items-center gap-2 ${isLicenseActive ? "text-success" : "text-error"}`}>
                  {isLicenseActive ? (
                    <>
                      <CheckCircle className="w-5 h-5" aria-hidden="true" />
                      License Đang Hoạt Động
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5" aria-hidden="true" />
                      License Đã Hết Hạn
                    </>
                  )}
                </h4>

                {isLicenseActive ? (
                  <div className="space-y-2 text-sm mt-3">
                    <p className="font-semibold text-foreground">
                      Còn <strong className="text-success tabular-nums">{daysRemaining}&nbsp;ngày</strong> sử&nbsp;dụng
                    </p>
                    <p className="font-medium text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" aria-hidden="true" />
                      Hết hạn: <time className="tabular-nums">{new Date(profile.licenseExpiresAt!).toLocaleDateString("vi-VN")}</time>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 mt-3">
                    <p className="text-sm font-semibold text-muted-foreground">
                      {profile.licenseExpiresAt
                        ? `Đã hết hạn từ ${new Date(profile.licenseExpiresAt).toLocaleDateString("vi-VN")}`
                        : "Chưa kích hoạt license"
                      }
                    </p>
                    <Link href="/payment">
                      <Button variant="primary" size="md" className="w-full">
                        Gia hạn ngay
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
              </AnimatedCard>
            )}
          </div>

          {/* Right: Edit Form */}
          <div className="md:col-span-2">
            <AnimatedCard delay={0.3}>
            <form onSubmit={handleUpdateProfile} className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-xl p-6 shadow-subtle border border-border space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-foreground">Chỉnh Sửa Thông Tin</h3>
              </div>

              <div>
                <label htmlFor="name-input" className="block text-sm font-semibold text-foreground mb-2">
                  Họ và&nbsp;Tên
                </label>
                <input
                  id="name-input"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full"
                  placeholder="Nhập họ tên"
                />
              </div>

              <div className="pt-4 border-t-2 border-border">
                <h4 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-primary" aria-hidden="true" />
                  Đổi Mật Khẩu
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Để đổi mật khẩu, vui lòng điền đầy đủ các trường bên dưới. Nếu không muốn đổi, để&nbsp;trống.
                </p>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="current-password" className="block text-sm font-semibold text-foreground mb-2">
                      Mật Khẩu Hiện Tại
                    </label>
                    <input
                      id="current-password"
                      name="current-password"
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full"
                      placeholder="Nhập mật khẩu hiện tại"
                    />
                  </div>

                  <div>
                    <label htmlFor="new-password" className="block text-sm font-semibold text-foreground mb-2">
                      Mật Khẩu Mới
                    </label>
                    <input
                      id="new-password"
                      name="new-password"
                      type="password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full"
                      placeholder="Nhập mật khẩu mới (ít nhất 8 ký tự)"
                    />
                  </div>

                  <div>
                    <label htmlFor="confirm-password" className="block text-sm font-semibold text-foreground mb-2">
                      Xác Nhận Mật Khẩu Mới
                    </label>
                    <input
                      id="confirm-password"
                      name="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full"
                      placeholder="Nhập lại mật khẩu mới"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={saving}
                  className="flex-1"
                >
                  {saving ? "Đang lưu…" : "Lưu Thay Đổi"}
                </Button>
                <Link href="/dashboard">
                  <Button variant="secondary" size="lg">
                    Hủy
                  </Button>
                </Link>
              </div>
            </form>
            </AnimatedCard>
          </div>
        </div>
      </div>
    </div>
  );
}
