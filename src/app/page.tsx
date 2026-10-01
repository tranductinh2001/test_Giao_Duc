import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ProfessionalHeader } from "@/components/landing/ProfessionalHeader";
import HeroSection from "@/components/landing/sections/HeroSection";
import StatsSection from "@/components/landing/sections/StatsSection";
import FeaturedExamsSection from "@/components/landing/sections/FeaturedExamsSection";
import WhyUsSection from "@/components/landing/sections/WhyUsSection";
import CategoriesSection from "@/components/landing/sections/CategoriesSection";
import TestimonialsSection from "@/components/landing/sections/TestimonialsSection";
import FAQSection from "@/components/landing/sections/FAQSection";
import CTASection from "@/components/landing/sections/CTASection";
import { ModernFooter } from "@/components/landing/modern-footer";

export default async function Home() {
  const session = await auth();

  if (session) {
    if (session.user.role === "ADMIN") {
      redirect("/admin");
    } else {
      redirect("/dashboard");
    }
  }

  return (
    <div className="min-h-screen">
      <ProfessionalHeader />
      <main>
        <HeroSection />
        <StatsSection />
        <FeaturedExamsSection />
        <WhyUsSection />
        <CategoriesSection />
        <TestimonialsSection />
        <FAQSection />
        <CTASection />
      </main>
      <ModernFooter />
    </div>
  );
}
