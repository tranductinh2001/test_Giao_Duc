"use client";

import React, { useEffect, useState } from "react";

interface ExamTimerProps {
  expiresAt: Date | string;
  onTimeUp?: () => void;
}

export default function ExamTimer({ expiresAt, onTimeUp }: ExamTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(expiresAt).getTime();
      const diff = Math.max(0, end - now);
      return Math.floor(diff / 1000); // seconds
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);

      if (newTimeLeft === 0) {
        clearInterval(interval);
        onTimeUp?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onTimeUp]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  // Pulse warning khi còn dưới 5 phút (300 giây) - theo 19-ui-design.md
  const isWarning = timeLeft > 0 && timeLeft <= 300;
  const isDanger = timeLeft > 0 && timeLeft <= 60;

  return (
    <div className="flex items-center gap-2">
      <svg
        className="w-5 h-5 text-card-foreground"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>

      <span
        className={`font-mono text-lg font-bold ${
          isDanger
            ? "timer-warning text-2xl text-destructive" // Pulse + larger + red when < 1 min
            : isWarning
            ? "timer-warning text-destructive" // Pulse + red when < 5 min
            : "text-card-foreground"
        }`}
      >
        {timeLeft === 0 ? "Hết giờ!" : formatTime(timeLeft)}
      </span>

      {isWarning && (
        <span className="text-xs text-destructive font-bold animate-pulse">
          {isDanger ? "Sắp hết giờ!" : "Còn ít thời gian"}
        </span>
      )}
    </div>
  );
}
