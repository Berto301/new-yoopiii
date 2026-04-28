import { useEffect, useState } from "react";
import { cn } from "../../lib/utils/cn.js";
import { DEFAULT_AVATAR_URL, getInitials, resolveAvatarUrl } from "./avatar.utils.js";

const sizeClasses = {
  xs: "h-8 w-8 text-[10px]",
  sm: "h-10 w-10 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-base",
  xl: "h-28 w-28 text-2xl"
};

const frameClasses = {
  default: "border-white/10 bg-white/5",
  sidebar: "border-white/10 bg-black/20 shadow-[0_12px_24px_rgba(0,0,0,0.25)]",
  profile: "border-white/15 bg-white/10 p-2 shadow-[0_20px_60px_rgba(15,23,42,0.35)]",
  message: "border-white/10 bg-black/20",
  notification: "border-white/10 bg-white/[0.06]"
};

export const Avatar = ({
  src,
  alt = "Avatar",
  name = "",
  size = "md",
  variant = "default",
  editable = false,
  fallback = DEFAULT_AVATAR_URL,
  type = "user",
  className,
  imageClassName,
  badge,
  onEdit
}) => {
  const [imageErrored, setImageErrored] = useState(false);

  useEffect(() => {
    setImageErrored(false);
  }, [src]);

  const resolvedSource = resolveAvatarUrl(src, fallback);
  const currentSource = imageErrored ? fallback : resolvedSource;
  const initials = getInitials(name || alt, type);
  const sizeClassName = sizeClasses[size] || sizeClasses.md;
  const frameClassName = frameClasses[variant] || frameClasses.default;

  return (
    <div className={cn("relative inline-flex shrink-0 items-center justify-center", className)}>
      <div className={cn("inline-flex items-center justify-center overflow-hidden rounded-full border", frameClassName, variant === "profile" ? "p-2" : "p-0.5")}>
        <div className={cn("relative overflow-hidden rounded-full bg-stone-900/70 text-stone-200", sizeClassName)}>
          <img
            src={currentSource}
            alt={alt}
            className={cn("h-full w-full object-cover", imageClassName)}
            onError={() => setImageErrored(true)}
          />
          {imageErrored ? (
            <span className="absolute inset-0 flex items-center justify-center bg-stone-800 font-semibold uppercase tracking-[0.12em] text-stone-100">
              {initials}
            </span>
          ) : null}
        </div>
      </div>

      {editable ? (
        <button
          type="button"
          onClick={onEdit}
          className="absolute bottom-0 right-0 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-stone-950 text-xs font-semibold text-white shadow-lg transition hover:bg-stone-900"
          aria-label="Modifier la photo"
        >
          Edit
        </button>
      ) : null}

      {badge ? (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">{badge}</div>
      ) : null}
    </div>
  );
};
