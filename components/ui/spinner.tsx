type SpinnerSize = "sm" | "md" | "lg";

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  label?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-9 w-9 border-[3px]",
};

function Spinner({ size = "md", className = "", label = "Carregando..." }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className={["inline-flex", className].join(" ")}>
      <span
        className={[
          "rounded-full border-border border-t-brand animate-spin",
          sizeClasses[size],
        ].join(" ")}
      />
    </span>
  );
}

function FullPageSpinner() {
  return (
    <div className="flex h-full min-h-[400px] items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

export { Spinner, FullPageSpinner };
export type { SpinnerProps, SpinnerSize };
