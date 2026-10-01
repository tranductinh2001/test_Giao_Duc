"use client";

import React from "react";
import { signOut } from "next-auth/react";
import Button from "@/components/ui/button";

export default function LogoutButton() {
  return (
    <Button
      onClick={() => signOut({ callbackUrl: "/" })}
      variant="danger"
      size="sm"
    >
      Đăng xuất
    </Button>
  );
}
