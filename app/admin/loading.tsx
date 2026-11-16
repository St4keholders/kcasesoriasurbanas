import { KcLoader } from '@/components/ui/KcLoader';

export default function AdminLoading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 p-8">
      <div className="glass-surface px-8 py-6 rounded-2xl flex flex-col items-center gap-3">
        <KcLoader size={48} delayMs={150} label="Cargando módulo administrativo..." />
        <p className="text-xs font-medium text-[var(--fg-muted)]">Cargando información...</p>
      </div>
    </div>
  );
}
