import { Loader2, Lock } from 'lucide-react';

export function CrmLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
      <Loader2 className="w-7 h-7 animate-spin mb-3 text-blue-600" />
      <p className="text-sm font-mono tracking-widest animate-pulse">CARREGANDO CRM...</p>
    </div>
  );
}

export function CrmNoAccess() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center mb-4">
        <Lock className="w-5 h-5 text-zinc-400" />
      </div>
      <h2 className="text-lg font-bold text-navy dark:text-white">Sem acesso ao CRM</h2>
      <p className="text-sm text-zinc-500 mt-1 max-w-sm">
        Sua conta ainda não está vinculada a nenhuma empresa no CRM. Peça a um
        administrador para incluí-lo.
      </p>
    </div>
  );
}
