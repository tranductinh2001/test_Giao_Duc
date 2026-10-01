"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface GlassHeaderProps {
  title?: string;
  showBack?: boolean;
  actions?: React.ReactNode;
}

export default function GlassHeader({ title, showBack, actions }: GlassHeaderProps) {
  return (
    <header className="sticky top-0 z-50 navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side */}
          <div className="flex items-center gap-4">
            {showBack && (
              <Link
                href="/dashboard"
                className="p-2 rounded-lg hover:bg-accent transition-colors duration-200"
              >
                <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={2} />
              </Link>
            )}

            {title && (
              <h1 className="text-xl font-bold text-foreground">
                {title}
              </h1>
            )}
          </div>

          {/* Right side - Actions */}
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
      </div>
    </header>
  );
}
