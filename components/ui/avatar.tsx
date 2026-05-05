type AvatarSize = "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  name: string;
  src?: string;
  size?: AvatarSize;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-11 w-11 text-base",
  xl: "h-14 w-14 text-lg",
};

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

function Avatar({ name, src, size = "md", className = "" }: AvatarProps) {
  const initials = getInitials(name);

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={[
          "rounded-full object-cover shrink-0",
          sizeClasses[size],
          className,
        ].join(" ")}
      />
    );
  }

  return (
    <span
      aria-label={name}
      className={[
        "inline-flex items-center justify-center rounded-full bg-brand-100 text-brand-700 font-semibold shrink-0 select-none",
        sizeClasses[size],
        className,
      ].join(" ")}
    >
      {initials}
    </span>
  );
}

export { Avatar };
export type { AvatarProps, AvatarSize };
