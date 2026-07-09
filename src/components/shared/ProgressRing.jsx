import React from "react";

export default function ProgressRing({ percentage, size = 72, strokeWidth = 6, color = "stroke-primary" }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          className="stroke-muted"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${color} transition-all duration-500`}
        />
      </svg>
      <span className="absolute text-sm font-bold">{Math.round(percentage)}%</span>
    </div>
  );
}