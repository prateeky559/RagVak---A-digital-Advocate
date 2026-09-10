import React from 'react';
import { Scale, Database, ShieldAlert, Activity, User as UserIcon, LogOut, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../types.js';

interface NavbarProps {
  activeTab: 'chat' | 'documents' | 'admin' | 'metrics';
  setActiveTab: (tab: 'chat' | 'documents' | 'admin' | 'metrics') => void;
  currentUser: UserProfile | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  readyStatus: any;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onOpenAuthModal,
  onLogout,
  readyStatus,
}) => {
  return (
    <header className="sticky top-0 z-40 liquid-glass border-b border-white/70 text-zinc-900 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center gap-2.5 cursor-pointer shrink-0" onClick={() => setActiveTab('chat')}>
          <div className="w-9 h-9 rounded-xl liquid-glass-dark flex items-center justify-center text-white shadow-md ring-1 ring-white/20">
            <Scale className="w-4 h-4 text-white stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-zinc-900">LexiRAG</span>
              <span className="text-[10px] font-mono font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full liquid-glass-pill text-zinc-800">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 hidden sm:block">Liquid Legal Intelligence</p>
          </div>
        </div>

        {/* Navigation Tabs (Accessible on Desktop) */}
        <nav className="hidden sm:flex items-center gap-1.5 liquid-glass-subtle p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'chat'
                ? 'liquid-glass-card text-zinc-950 font-semibold shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-white/40'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Legal Q&A</span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'documents'
                ? 'liquid-glass-card text-zinc-950 font-semibold shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-white/40'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Corpus Library</span>
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'admin'
                ? 'liquid-glass-card text-zinc-950 font-semibold shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-white/40'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Ingestion</span>
            {currentUser?.role === 'ADMIN' && (
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-900"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('metrics')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'metrics'
                ? 'liquid-glass-card text-zinc-950 font-semibold shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-white/40'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Observability</span>
          </button>
        </nav>

        {/* Right Section: System Status & User Auth */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Readiness Status Pill (Visible on Desktop) */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full liquid-glass-pill text-xs text-zinc-700 font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-900 opacity-30"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-900"></span>
            </span>
            <span>
              {readyStatus?.checks?.indexed_vectors !== undefined
                ? `${readyStatus.checks.indexed_vectors} Chunks`
                : 'Engine Ready'}
            </span>
          </div>

          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-white/60">
              <div className="flex flex-col items-end">
                <span className="text-xs font-semibold text-zinc-900">{currentUser.full_name}</span>
                <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                  {currentUser.role === 'ADMIN' ? (
                    <>
                      <ShieldCheck className="w-3 h-3 text-zinc-900" /> ADMIN
                    </>
                  ) : (
                    'COUNSEL'
                  )}
                </span>
              </div>
              <button
                onClick={onLogout}
                title="Sign Out"
                className="p-1.5 rounded-xl text-zinc-500 hover:text-zinc-950 hover:bg-white/70 liquid-glass-subtle transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl liquid-glass-dark text-white text-xs font-semibold transition shadow-sm hover:scale-[1.02] active:scale-[0.98]"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile/Compact navigation row */}
      <div className="flex sm:hidden px-3 py-2 liquid-glass-subtle border-t border-white/50 gap-1.5 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-3 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition ${
            activeTab === 'chat' ? 'liquid-glass-dark text-white font-semibold' : 'text-zinc-700 bg-white/70 border border-white/80'
          }`}
        >
          Legal Q&A
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`px-3 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition ${
            activeTab === 'documents' ? 'liquid-glass-dark text-white font-semibold' : 'text-zinc-700 bg-white/70 border border-white/80'
          }`}
        >
          Corpus
        </button>
        <button
          onClick={() => setActiveTab('admin')}
          className={`px-3 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition ${
            activeTab === 'admin' ? 'liquid-glass-dark text-white font-semibold' : 'text-zinc-700 bg-white/70 border border-white/80'
          }`}
        >
          Ingestion
        </button>
        <button
          onClick={() => setActiveTab('metrics')}
          className={`px-3 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition ${
            activeTab === 'metrics' ? 'liquid-glass-dark text-white font-semibold' : 'text-zinc-700 bg-white/70 border border-white/80'
          }`}
        >
          Observability
        </button>
      </div>
    </header>
  );
};
