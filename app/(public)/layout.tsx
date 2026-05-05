export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center">
      {children}
    </div>
  );
}
