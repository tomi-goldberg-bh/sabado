import { useState, useEffect } from 'react';
import { Users, UserPlus, Wifi, WifiOff } from 'lucide-react';
import { syncService } from '../services/syncService';
import clsx from 'clsx';

export const Sidebar = ({ activeTab, setActiveTab }) => {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const unsub = syncService.subscribe((event, data) => {
      if (event === 'status') setConnected(data);
    });
    setConnected(syncService.isConnected());
    return unsub;
  }, []);
  return (
    <>
      <div className="hidden md:flex w-64 bg-white h-full flex-col p-4 shadow-xl border-r border-slate-200 z-10 relative">
        <div className="mb-10 mt-4 px-2 flex flex-col items-center">
          <div className="relative w-full flex justify-center mb-4">
             <svg width="80" height="80" viewBox="0 0 100 100" className="drop-shadow-sm">
              <path d="M25 15 L75 15 L100 50 L75 85 L25 85 L0 50 Z" fill="#11527D" />
              <path d="M40 35 L60 35 L53 45 L53 85 L47 85 L47 45 Z" fill="#FFFFFF" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-brand-grey tracking-tight">
            Bet Hilel
          </h1>
        </div>

        <nav className="flex flex-col gap-3">
          <button
            onClick={() => setActiveTab('socios')}
            className={clsx(
              "flex items-center gap-3 px-4 py-4 rounded-xl font-medium transition-all duration-300 relative overflow-hidden group",
              activeTab === 'socios'
                ? "bg-brand-blue text-white shadow-md shadow-brand-blue/30"
                : "text-brand-grey hover:bg-slate-100"
            )}
          >
            <Users className={clsx(
              "w-5 h-5 transition-transform duration-300",
              activeTab === 'socios' ? "scale-110" : "group-hover:scale-110"
            )} />
            <span className="z-10">SOCIOS</span>
            {activeTab === 'socios' && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-accent rounded-l-xl"></div>
            )}
          </button>

          <button
            onClick={() => setActiveTab('nosocios')}
            className={clsx(
              "flex items-center gap-3 px-4 py-4 rounded-xl font-medium transition-all duration-300 relative overflow-hidden group",
              activeTab === 'nosocios'
                ? "bg-brand-blue text-white shadow-md shadow-brand-blue/30"
                : "text-brand-grey hover:bg-slate-100"
            )}
          >
            <UserPlus className={clsx(
              "w-5 h-5 transition-transform duration-300",
              activeTab === 'nosocios' ? "scale-110" : "group-hover:scale-110"
            )} />
            <span className="z-10">NO SOCIOS</span>
            {activeTab === 'nosocios' && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-accent rounded-l-xl"></div>
            )}
          </button>
        </nav>

        <div className="mt-auto px-2 pb-4 text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-xs font-medium">
            {connected ? (
              <><Wifi className="w-3 h-3 text-green-500" /><span className="text-green-600">Sincronizado</span></>
            ) : (
              <><WifiOff className="w-3 h-3 text-slate-400" /><span className="text-slate-400">Sin conexión</span></>
            )}
          </div>
          <div className="text-xs text-slate-400 font-medium">Sistema de Registro</div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          {connected ? (
            <span className="flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full"><Wifi className="w-2.5 h-2.5" />Sync</span>
          ) : (
            <span className="flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full"><WifiOff className="w-2.5 h-2.5" />Off</span>
          )}
        </div>
        <button
          onClick={() => setActiveTab('socios')}
          className={clsx(
            "flex-1 flex flex-col items-center justify-center py-3 gap-1 font-bold text-xs transition-all duration-200",
            activeTab === 'socios'
              ? "text-brand-blue"
              : "text-slate-400 hover:text-slate-600"
          )}
        >
          <Users className={clsx("w-5 h-5", activeTab === 'socios' && "scale-110")} />
          <span>SOCIOS</span>
        </button>
        <button
          onClick={() => setActiveTab('nosocios')}
          className={clsx(
            "flex-1 flex flex-col items-center justify-center py-3 gap-1 font-bold text-xs transition-all duration-200",
            activeTab === 'nosocios'
              ? "text-brand-blue"
              : "text-slate-400 hover:text-slate-600"
          )}
        >
          <UserPlus className={clsx("w-5 h-5", activeTab === 'nosocios' && "scale-110")} />
          <span>NO SOCIOS</span>
        </button>
      </div>
    </>
  );
};
