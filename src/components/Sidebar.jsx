import React from 'react';
import { Users, UserPlus } from 'lucide-react';
import clsx from 'clsx';

export const Sidebar = ({ activeTab, setActiveTab }) => {
  return (
    <div className="w-64 bg-white h-full flex flex-col p-4 shadow-xl border-r border-slate-200 z-10 relative">
      <div className="mb-10 mt-4 px-2 flex flex-col items-center">
        {/* Placeholder for actual logo.png, falling back to SVG if not present */}
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

      <div className="mt-auto px-2 pb-4 text-center">
        <div className="text-xs text-slate-400 font-medium">Sistema de Registro</div>
      </div>
    </div>
  );
};
