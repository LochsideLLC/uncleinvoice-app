export function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-[88rem] flex-col gap-10 px-6 py-16 text-ink">
      {children}
    </div>
  );
}
