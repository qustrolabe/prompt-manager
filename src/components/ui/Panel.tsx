export default function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="box-border h-full w-full rounded-2xl border border-panel-border bg-panel p-2">
      {children}
    </div>
  );
}
