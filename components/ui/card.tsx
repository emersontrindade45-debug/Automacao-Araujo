import type { HTMLAttributes } from "react";

function Card({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={[
        "bg-surface border border-border rounded-xl shadow-sm",
        className,
      ].join(" ")}
      {...props}
    />
  );
}

function CardHeader({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={["flex flex-col gap-1 px-5 pt-5 pb-3", className].join(" ")}
      {...props}
    />
  );
}

function CardTitle({
  className = "",
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={["text-base font-semibold text-foreground", className].join(
        " "
      )}
      {...props}
    />
  );
}

function CardDescription({
  className = "",
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={["text-sm text-muted", className].join(" ")}
      {...props}
    />
  );
}

function CardContent({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={["px-5 pb-4", className].join(" ")} {...props} />
  );
}

function CardFooter({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={[
        "flex items-center px-5 py-3 border-t border-border gap-3",
        className,
      ].join(" ")}
      {...props}
    />
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
