import React from "react";
import UserNavbar from "./user-navbar";
import BackButton from "./back-button";

interface PageContainerProps {
  children: React.ReactNode;
  userName?: string;
  userRole?: string;
  showNavbar?: boolean;
  showBackButton?: boolean;
  backButtonHref?: string;
  backButtonLabel?: string;
  maxWidth?: "4xl" | "5xl" | "6xl" | "7xl";
}

/**
 * Unified page container for all user-facing pages
 * - Consistent background color
 * - Optional navbar
 * - Optional back button in top-left
 * - Responsive max-width
 */
export default function PageContainer({
  children,
  userName,
  userRole,
  showNavbar = false,
  showBackButton = false,
  backButtonHref = "/dashboard",
  backButtonLabel,
  maxWidth = "7xl",
}: PageContainerProps) {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {showNavbar && <UserNavbar userName={userName} userRole={userRole} />}

      <div className={`mx-auto max-w-${maxWidth} px-4 sm:px-6 py-6`}>
        {showBackButton && (
          <div className="mb-6">
            <BackButton href={backButtonHref} label={backButtonLabel} />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
