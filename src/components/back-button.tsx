"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  href: string;
  label?: string;
}

export default function BackButton({ href, label = "Quay lại" }: BackButtonProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-lg border-2 border-primary bg-background px-4 py-2 text-sm font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200 shadow-subtle hover:shadow-elevated"
    >
      <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
      <span>{label}</span>
    </Link>
  );
}
