"use client";

import React, { useState } from "react";
import { signOut } from "next-auth/react";
import Button from "@/components/ui/button";

interface LogoutButtonProps {
  callbackUrl?: string;
  variant?: "danger" | "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function LogoutButton({
  callbackUrl = "/login",
  variant = "danger",
  size = "sm",
  className,
}: LogoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setLoading(true);
      await signOut({ callbackUrl, redirect: true });
    } catch (err) {
      console.error("SignOut error:", err);
      window.location.href = callbackUrl;
    }
  };

  return (
    <Button
      onClick={handleLogout}
      disabled={loading}
      variant={variant}
      size={size}
      className={className}
    >
      {loading ? "Đang đăng xuất..." : "Đăng xuất"}
    </Button>
  );
}
