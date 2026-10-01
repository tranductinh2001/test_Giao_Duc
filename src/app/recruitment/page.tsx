"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import UserNavbar from "@/components/user-navbar";
import Button from "@/components/ui/button";
import { Briefcase, Search, MapPin, Calendar, Users, ExternalLink, AlertCircle, Building2, BookOpen, Target } from "lucide-react";

interface Recruitment {
  id: string;
  title: string;
  field: string | null;
  recruitmentType: string | null;
  province: string;
  district: string | null;
  ward: string | null;
  organization: string;
  applicationAddress: string | null;
  totalQuota: number;
  quotaDetails: any;
  round1Format: string | null;
  round2Format: string | null;
  applicationStartDate: string | null;
  applicationEndDate: string | null;
  notes: string | null;
  status: string;
}

const STATUS: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Đang tuyển", color: "success" },
  UPCOMING: { label: "Sắp mở", color: "info" },
  CLOSED: { label: "Đã đóng", color: "secondary" },
};

export default function RecruitmentPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Recruitment[]>([]);
  const [filtered, setFiltered] = useState<Recruitment[]>([]);
  const [provinceFilter, setProvinceFilter] = useState("Tất cả");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/recruitment")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setData(d.data);
          setFiltered(d.data);
        }
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let result = data;
    if (provinceFilter !== "Tất cả") result = result.filter((r) => r.province === provinceFilter);
    if (search)
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(search.toLowerCase()) ||
          r.organization.toLowerCase().includes(search.toLowerCase())
      );
    setFiltered(result);
  }, [data, provinceFilter, search]);

  const daysLeft = (deadline: string | null) =>
    deadline ? Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000) : 999;

  const provinces = [...new Set(data.map((r) => r.province))];

  return (
    <div className="min-h-screen bg-background">
      <UserNavbar userName={session?.user?.name ?? undefined} userRole={session?.user?.role ?? undefined} />

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-6 lg:p-8 shadow-subtle text-center mb-4 sm:mb-6 lg:mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 rounded-full border-2 border-warning bg-warning/10 px-3 sm:px-4 py-1.5 sm:py-2 mb-3 sm:mb-4">
            <Briefcase className="w-4 h-4 text-warning" aria-hidden="true" />
            <span className="text-[10px] sm:text-xs font-bold tracking-wider text-warning uppercase">
              Tuyển Dụng
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2 sm:mb-4">
            Thông Tin Tuyển Dụng
          </h1>
          <p className="text-sm sm:text-lg text-muted-foreground">
            Cập nhật thông tin tuyển dụng mới nhất
          </p>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 lg:p-6 shadow-subtle mb-4 sm:mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label htmlFor="search-input" className="block text-xs sm:text-sm font-bold text-foreground mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" aria-hidden="true" />
                <span className="hidden sm:inline">Tìm Kiếm</span>
                <span className="sm:hidden">Tìm</span>
              </label>
              <input
                id="search-input"
                name="search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tiêu đề, đơn vị..."
                className="w-full h-10 sm:h-11 px-3 sm:px-4 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground hover:border-primary/50 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none transition-colors duration-200 text-sm sm:text-base"
              />
            </div>
            <div>
              <label htmlFor="province-select" className="block text-xs sm:text-sm font-bold text-foreground mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" aria-hidden="true" />
                Tỉnh/TP
              </label>
              <select
                id="province-select"
                name="province"
                value={provinceFilter}
                onChange={(e) => setProvinceFilter(e.target.value)}
                className="w-full h-10 sm:h-11 px-3 sm:px-4 rounded-lg border border-border bg-background text-foreground hover:border-primary/50 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none transition-colors duration-200 text-sm sm:text-base"
              >
                <option>Tất cả</option>
                {provinces.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs sm:text-sm font-bold text-muted-foreground mt-3 sm:mt-4">
            Tìm thấy <span className="text-primary tabular-nums">{filtered.length}</span> tin tuyển dụng
          </p>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 sm:p-12 shadow-subtle text-center">
            <Search className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground/50 mx-auto mb-4" aria-hidden="true" />
            <p className="text-base sm:text-lg font-bold text-foreground">
              Không Tìm Thấy Tin Tuyển Dụng
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
            </p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filtered.map((item) => {
              const days = daysLeft(item.applicationEndDate);
              const isUrgent = days <= 15 && days > 0;
              const isExpired = days < 0;
              const fullAddress = [item.province, item.district, item.ward].filter(Boolean).join(", ");

              return (
                <div
                  key={item.id}
                  className="bg-card border border-border rounded-xl p-3 sm:p-4 lg:p-6 shadow-subtle hover:shadow-elevated hover:border-primary transition-all"
                >
                  <div className="flex flex-col md:flex-row gap-3 sm:gap-4 lg:gap-6">
                    {/* Left: Main Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <div className="flex h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-primary/10 border border-primary/20">
                          <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-primary" aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-base lg:text-lg font-bold text-foreground mb-0.5 line-clamp-2">
                            {item.title}
                          </h3>
                          <p className="text-xs sm:text-sm font-semibold text-muted-foreground truncate">
                            {item.organization}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-lg flex-shrink-0 text-[10px] sm:text-xs font-semibold ${
                            STATUS[item.status]?.color === "success" ? "bg-success/10 text-success" :
                            STATUS[item.status]?.color === "info" ? "bg-info/10 text-info" :
                            "bg-muted text-muted-foreground"
                          }`}
                        >
                          {STATUS[item.status]?.label || item.status}
                        </span>
                      </div>

                      {/* Meta tags */}
                      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                        {item.field && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-medium bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                            <BookOpen className="w-3 h-3" aria-hidden="true" />
                            {item.field}
                          </span>
                        )}
                        {item.recruitmentType && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-medium bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                            <Target className="w-3 h-3" aria-hidden="true" />
                            {item.recruitmentType}
                          </span>
                        )}
                        {item.round1Format && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            V1: {item.round1Format}
                          </span>
                        )}
                        {item.round2Format && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            V2: {item.round2Format}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-xs sm:text-sm">
                        <div>
                          <p className="text-muted-foreground text-[10px] sm:text-xs font-semibold mb-0.5">Đơn vị</p>
                          <p className="font-bold text-foreground truncate">{item.organization}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-[10px] sm:text-xs font-semibold mb-0.5">Chỉ tiêu</p>
                          <p className="font-bold text-primary tabular-nums">{item.totalQuota}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-[10px] sm:text-xs font-semibold mb-0.5">Địa điểm</p>
                          <p className="font-bold text-foreground flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" aria-hidden="true" />
                            <span className="truncate">{fullAddress || item.province}</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-[10px] sm:text-xs font-semibold mb-0.5">Hạn nộp</p>
                          <p
                            className={`font-bold flex items-center gap-1 tabular-nums text-[10px] sm:text-xs ${
                              isExpired
                                ? "text-destructive"
                                : isUrgent
                                ? "text-warning"
                                : "text-success"
                            }`}
                          >
                            {isUrgent && <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" aria-hidden="true" />}
                            {isExpired ? "Hết hạn" : days === 0 ? "Hôm nay" : `${days} ngày`}
                          </p>
                        </div>
                      </div>

                      {/* Notes */}
                      {item.notes && (
                        <p className="mt-2 sm:mt-3 text-[10px] sm:text-xs text-muted-foreground italic line-clamp-1">
                          {item.notes}
                        </p>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-row sm:flex-col gap-2 sm:gap-3 md:w-40 mt-2 sm:mt-0">
                      {item.applicationAddress && (
                        <div className="rounded-lg sm:rounded-xl border border-info/20 bg-info/5 p-2 sm:p-3 flex-1 sm:flex-none text-center">
                          <p className="text-[10px] sm:text-xs font-semibold text-info mb-0.5 flex items-center justify-center gap-1">
                            <Building2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
                            <span className="hidden sm:inline">Nơi nhận HS</span>
                            <span className="sm:hidden">Nhận HS</span>
                          </p>
                          <p className="text-[9px] sm:text-xs text-foreground line-clamp-2">
                            {item.applicationAddress}
                          </p>
                        </div>
                      )}
                      {item.applicationStartDate && (
                        <div className="rounded-lg sm:rounded-xl border border-primary/20 bg-primary/5 p-2 sm:p-3 text-center flex-1 sm:flex-none">
                          <p className="text-[10px] sm:text-xs font-semibold text-primary mb-0.5 flex items-center justify-center gap-1">
                            <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
                            <span className="hidden sm:inline">Bắt đầu</span>
                            <span className="sm:hidden">Từ</span>
                          </p>
                          <time className="text-[10px] sm:text-xs font-bold text-foreground tabular-nums block" dateTime={item.applicationStartDate}>
                            {new Date(item.applicationStartDate).toLocaleDateString("vi-VN")}
                          </time>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
