"use client";

import React, { useState } from "react";

interface UserAvatarProps {
  avatarUrl?: string | null;
  name?: string;
  userId: string;
  size?: string;
  textSize?: string;
  className?: string;
}

export const getInitials = (name?: string) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
};

export const getAvatarGradient = (name?: string) => {
  if (!name) return "from-indigo-500 to-purple-600";
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const gradients = [
    "from-indigo-500 to-purple-600",
    "from-teal-400 to-emerald-600",
    "from-blue-500 to-cyan-600",
    "from-orange-400 to-rose-600",
    "from-pink-500 to-rose-600",
    "from-purple-500 to-fuchsia-600"
  ];
  return gradients[Math.abs(hash) % gradients.length];
};

export function UserAvatar({
  avatarUrl,
  name,
  userId,
  size = "w-8 h-8",
  textSize = "text-[10px]",
  className = "",
}: UserAvatarProps) {
  const [avatarError, setAvatarError] = useState(false);

  if (avatarUrl && !avatarError) {
    return (
      <img
        src={avatarUrl}
        className={`${size} rounded-full object-cover ${className}`}
        alt={name || "User Avatar"}
        onError={() => setAvatarError(true)}
      />
    );
  }

  return (
    <div
      className={`${size} rounded-full bg-gradient-to-br ${getAvatarGradient(name)} flex items-center justify-center ${textSize} font-black text-white uppercase select-none ${className}`}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
}
