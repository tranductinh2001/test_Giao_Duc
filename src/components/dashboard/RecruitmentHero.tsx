"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Briefcase, MapPin, Calendar, AlertCircle, TrendingUp } from "lucide-react";

interface Recruitment {
  id: string;
  title: string;
  field: string | null;
  recruitmentType: string | null;
  province: string;
  organization: string;
  totalQuota: number;
  round1Format: string | null;
  round2Format: string | null;
  applicationEndDate: string | null;
  status: string;
}

export default function RecruitmentHero() {
  const [data, setData] = useState<Recruitment | null>(null);

  useEffect(() => {
    fetch("/api/recruitment?limit=1")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data && d.data.length > 0) {
          setData(d.data[0]);
        }
      });
  }, []);

  if (!data) return null;

  const daysLeft = data.applicationEndDate
    ? Math.ceil((new Date(data.applicationEndDate).getTime() - Date.now()) / 86400000)
    : 999;
  const isUrgent = daysLeft <= 15 && daysLeft > 0;
  const isExpired = daysLeft < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileTap={{ scale: 0.99 }}
    >
      <Link
        href="/recruitment"
        className="block bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 text-white rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
        style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
      >

        <div className="relative flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <motion.div
              className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-2 sm:px-2.5 py-0.5 mb-2 sm:mb-2.5"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Briefcase className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-200" aria-hidden="true" />
              <span className="text-[10px] sm:text-xs font-semibold opacity-90">Tin tuyen dung</span>
              {isUrgent && (
                <span className="flex items-center gap-0.5 bg-red-500 text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  <AlertCircle className="w-2.5 h-2.5" aria-hidden="true" />
                  Gap! {daysLeft} ngay
                </span>
              )}
            </motion.div>

            <h2 className="text-base sm:text-lg lg:text-xl font-bold mb-1 tracking-tight line-clamp-1">
              {data.title}
            </h2>

            <p className="text-xs text-white/80 font-medium mb-1 truncate">
              {data.organization}
            </p>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-white/70">
              <span className="flex items-center gap-0.5">
                <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
                {data.province}
              </span>
              <span className="flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
                {data.totalQuota} chi tieu
              </span>
              {data.field && (
                <span className="bg-white/15 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium">
                  {data.field}
                </span>
              )}
            </div>
          </div>

          <motion.div
            className="flex-shrink-0 p-2.5 sm:p-3 rounded-lg bg-white/15 transition-transform duration-300 flex flex-col items-center gap-1"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
          >
            <Briefcase className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" aria-hidden="true" />
            <span className="text-[9px] sm:text-[10px] font-semibold opacity-80">
              {isExpired ? "Da dong" : `${daysLeft} ngay`}
            </span>
          </motion.div>
        </div>
      </Link>
    </motion.div>
  );
}
