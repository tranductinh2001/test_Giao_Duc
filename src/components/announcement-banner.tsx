"use client";

import React, { useState, useEffect } from "react";
import { Megaphone } from "lucide-react";

interface Announcement {
  id: string;
  content: string;
  priority: number;
}

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data.length > 0) {
          setAnnouncements(data.data);
        }
      })
      .catch((err) => console.error("Error loading announcements:", err));
  }, []);

  useEffect(() => {
    if (announcements.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 8000);

    return () => clearInterval(timer);
  }, [announcements.length]);

  if (announcements.length === 0) return null;

  return (
    <div className="rounded-xl border-2 border-primary/30 bg-primary/10 p-4 shadow-subtle overflow-hidden animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Megaphone className="h-4 w-4" strokeWidth={2} />
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <div
            className="transition-all duration-500 ease-in-out"
            style={{
              transform: `translateY(-${currentIndex * 100}%)`,
            }}
          >
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="h-8 flex items-center text-sm font-semibold text-foreground"
              >
                {announcement.content}
              </div>
            ))}
          </div>
        </div>
        {announcements.length > 1 && (
          <div className="flex-shrink-0 flex items-center gap-1">
            {announcements.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-2 rounded-full transition-all duration-200 ${
                  idx === currentIndex
                    ? "w-6 bg-primary"
                    : "w-2 bg-border"
                }`}
                aria-label={`Xem thông báo ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
