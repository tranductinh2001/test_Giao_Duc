'use client';

import { useEffect, useState } from 'react';
import { ProfessionalHeader } from './ProfessionalHeader';
import { ModernFooter } from './modern-footer';

interface LandingLayoutProps {
  children: React.ReactNode;
}

export function LandingLayout({ children }: LandingLayoutProps) {
  const [hasAnnouncement, setHasAnnouncement] = useState(false);

  useEffect(() => {
    // Check if announcement bar is shown (not dismissed)
    const dismissed = localStorage.getItem('recruitment_banner_dismissed');
    if (dismissed !== 'true') {
      // Fetch to check if there are recruitment posts
      fetch('/api/admin/recruitment?active=true')
        .then(r => r.json())
        .then(data => {
          if (data.success && data.data.length > 0) {
            setHasAnnouncement(true);
          }
        })
        .catch(() => {});
    }
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        maxWidth: '100vw',
        overflowX: 'hidden',
      }}
    >
      <ProfessionalHeader />
      <main
        className="flex-1 w-full"
        style={{
          paddingTop: hasAnnouncement ? 'calc(3rem + 56px)' : '56px',
          maxWidth: '100%',
          overflowX: 'hidden',
        }}
      >
        <div style={{ maxWidth: '100vw', overflowX: 'hidden' }}>
          {children}
        </div>
      </main>
      <ModernFooter />
    </div>
  );
}
