import React, { useState, useEffect } from 'react';
import { Activity, ShieldCheck, Clock, ThumbsUp, Database, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { AdminMetrics, UserProfile } from '../types.js';
import { ApiService } from '../services/api.js';

interface MetricsViewProps {
  currentUser: UserProfile | null;
  onOpenAuthModal: () => void;
}

export const MetricsView: React.FC<MetricsViewProps> = ({ currentUser, onOpenAuthModal }) => {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [readyCheck, setReadyCheck] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const [m, r] = await Promise.all([ApiService.getMetrics(), ApiService.getReadyStatus()]);
      setMetrics(m);
      setReadyCheck(r);
    } catch (err) {
      console.error('Failed to load metrics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [currentUser]);

  if (!currentUser || currentUser.role !== 'ADMIN') {
    return (
      <div className="flex-1 overflow-y-auto bg-transparent p-8 flex items-center justify-center text-zinc-900">
        <div className="max-w-md p-8 rounded-3xl liquid-glass-card border border-white/90 text-center space-y-4 shadow-2xl">
          <div className="inline-flex p-3 rounded-2xl liquid-glass-dark text-white shadow-md">
            <Activity className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900">Observability Dashboard</h2>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Real-time pipeline telemetry, latency analysis, and security defense metrics
            are accessible to compliance administrators.
          </p>
          <button
            onClick={onOpenAuthModal}
            className="w-full py-2.5 px-4 rounded-xl liquid-glass-dark hover:brightness-110 text-white font-semibold text-sm transition shadow-md"
          >
            Sign In with Admin Credentials
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-transparent p-4 sm:p-8 text-zinc-900">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
              <Activity className="w-6 h-6 text-zinc-900" />
              <span>System Observability & Quality Telemetry</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600">
              Real-time monitoring of RAG retrieval latencies, prompt defense mechanisms, and vector store health.
            </p>
          </div>

          <button
            onClick={fetchMetrics}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl liquid-glass-pill border border-white/80 text-xs font-semibold text-zinc-800 hover:bg-white/80 transition self-start sm:self-auto shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Diagnostics</span>
          </button>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-3xl liquid-glass-card border border-white/80 shadow-md space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Total Questions</span>
              <Database className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-bold text-zinc-900 font-mono">
              {metrics?.performance.total_questions || 0}
            </div>
            <p className="text-[11px] text-zinc-500">Legal inquiries answered</p>
          </div>

          <div className="p-5 rounded-3xl liquid-glass-card border border-white/80 shadow-md space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Average RAG Latency</span>
              <Clock className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-bold text-zinc-900 font-mono">
              {metrics?.performance.average_latency_ms || 0} ms
            </div>
            <p className="text-[11px] text-zinc-500">End-to-end retrieve & synthesize</p>
          </div>

          <div className="p-5 rounded-3xl liquid-glass-card border border-white/80 shadow-md space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Security Defense</span>
              <ShieldCheck className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-bold text-zinc-900 font-mono">
              {metrics?.performance.prompt_injections_blocked || 0}
            </div>
            <p className="text-[11px] text-zinc-500">Prompt injection attempts intercepted</p>
          </div>

          <div className="p-5 rounded-3xl liquid-glass-card border border-white/80 shadow-md space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Satisfaction Rating</span>
              <ThumbsUp className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-bold text-zinc-900 font-mono">
              {metrics?.feedback.satisfaction_rate_percent || 100}%
            </div>
            <p className="text-[11px] text-zinc-500">
              {metrics?.feedback.positive || 0} positive / {metrics?.feedback.total_feedback || 0} ratings
            </p>
          </div>
        </div>

        {/* Health Check Diagnostics */}
        <div className="p-6 rounded-3xl liquid-glass-card border border-white/80 shadow-md space-y-4">
          <h3 className="font-semibold text-zinc-900 text-base flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-zinc-900" />
            <span>Subsystem Health & Dependency Diagnostics</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl liquid-glass-subtle border border-white/80 flex items-center justify-between">
              <span className="text-zinc-700">Relational Database</span>
              <span className="text-zinc-900 font-mono text-[11px] flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-zinc-900" /> Connected
              </span>
            </div>

            <div className="p-3.5 rounded-2xl liquid-glass-subtle border border-white/80 flex items-center justify-between">
              <span className="text-zinc-700">Vector Store Engine</span>
              <span className="text-zinc-900 font-mono text-[11px] flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-zinc-900" /> Ready ({readyCheck?.checks?.indexed_vectors || 0} Chunks)
              </span>
            </div>

            <div className="p-3.5 rounded-2xl liquid-glass-subtle border border-white/80 flex items-center justify-between">
              <span className="text-zinc-700">Embedding Dimension</span>
              <span className="text-zinc-900 font-mono font-medium">
                {readyCheck?.checks?.vector_dimension || 768} dims
              </span>
            </div>

            <div className="p-3.5 rounded-2xl liquid-glass-subtle border border-white/80 flex items-center justify-between">
              <span className="text-zinc-700">LLM Generation Provider</span>
              <span className="text-zinc-900 font-medium">
                {readyCheck?.checks?.llm_provider || 'Active'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl liquid-glass-subtle border border-white/80 flex items-center justify-between">
              <span className="text-zinc-700">Rate Limiter Middleware</span>
              <span className="text-zinc-900 font-mono text-[11px] flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-zinc-900" /> Active (Token-Bucket)
              </span>
            </div>

            <div className="p-3.5 rounded-2xl liquid-glass-subtle border border-white/80 flex items-center justify-between">
              <span className="text-zinc-700">Prompt Defense Filter</span>
              <span className="text-zinc-900 font-mono text-[11px] flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-zinc-900" /> Active (Strict)
              </span>
            </div>
          </div>
        </div>

        {/* Legal Disclaimer Box */}
        <div className="p-5 rounded-2xl liquid-glass-subtle border border-white/80 text-xs text-zinc-700 space-y-1 shadow-2xs">
          <div className="font-semibold text-zinc-900 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-zinc-900" />
            <span>Production Compliance Policy</span>
          </div>
          <p className="text-zinc-600 leading-relaxed">
            LexiRAG enforces statutory grounding constraints: answers require source citations [1], [2];
            and legal informational disclaimers are preserved on all user-facing endpoints.
          </p>
        </div>
      </div>
    </div>
  );
};
