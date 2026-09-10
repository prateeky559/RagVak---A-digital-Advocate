import React, { useState, useEffect } from 'react';
import { Database, Search, FileText, CheckCircle2, Layers, Eye, X, Calendar, MapPin } from 'lucide-react';
import { LegalDocItem } from '../types.js';
import { ApiService } from '../services/api.js';

export const DocumentsView: React.FC = () => {
  const [documents, setDocuments] = useState<LegalDocItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string>('');
  const [inspectDoc, setInspectDoc] = useState<any | null>(null);
  const [inspectLoading, setInspectLoading] = useState<boolean>(false);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getDocuments();
      setDocuments(data);
    } catch (err) {
      console.error('Failed to load documents', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleInspect = async (id: string) => {
    setInspectLoading(true);
    try {
      const detail = await ApiService.getDocumentDetail(id);
      setInspectDoc(detail);
    } catch (err) {
      console.error('Failed to inspect document', err);
    } finally {
      setInspectLoading(false);
    }
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.version.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesJurisdiction = !selectedJurisdiction || doc.jurisdiction === selectedJurisdiction;
    return matchesSearch && matchesJurisdiction;
  });

  return (
    <div className="flex-1 overflow-y-auto bg-transparent p-4 sm:p-8 text-zinc-900">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-zinc-900" />
              <span>Controlled Legal Corpus</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600">
              Authoritative statutes and regulatory frameworks currently indexed in the vector store.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-800 liquid-glass-pill border border-white/80 px-3 py-1.5 rounded-xl font-mono shadow-xs">
              Total Indexed: <strong className="text-zinc-950">{documents.length}</strong>
            </span>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by statute title, version, or source..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm liquid-glass-input border border-white/80 text-zinc-900 placeholder-zinc-500 rounded-2xl focus:outline-none focus:ring-1 focus:ring-zinc-900 shadow-xs"
            />
          </div>

          <select
            value={selectedJurisdiction}
            onChange={e => setSelectedJurisdiction(e.target.value)}
            className="text-sm liquid-glass-subtle border border-white/80 text-zinc-800 rounded-2xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-zinc-900 shadow-xs"
          >
            <option value="">All Jurisdictions</option>
            <option value="European Union">European Union</option>
            <option value="United States (California)">United States (California)</option>
            <option value="United States (Uniform State Law)">United States (Uniform State Law)</option>
            <option value="United States (Federal)">United States (Federal)</option>
          </select>
        </div>

        {/* Documents Table / Grid */}
        {loading ? (
          <div className="p-12 text-center text-sm text-zinc-500">Loading indexed legal documents...</div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-12 rounded-3xl liquid-glass-card border border-white/80 text-center text-sm text-zinc-500 shadow-xs">
            No legal documents match your search criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDocs.map(doc => (
              <div
                key={doc.id}
                className="p-5 rounded-3xl liquid-glass-card border border-white/80 hover:border-white transition-all flex flex-col justify-between shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md liquid-glass-pill text-zinc-800 border border-white/80">
                        {doc.document_type}
                      </span>
                      <h3 className="font-semibold text-base text-zinc-900 leading-snug">
                        {doc.title}
                      </h3>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-zinc-900 liquid-glass-pill border border-white/80 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3 text-zinc-900" />
                      Indexed
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500 pt-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span className="truncate text-zinc-700">{doc.jurisdiction}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate font-mono text-[11px]">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span className="text-zinc-700">Eff. {doc.effective_date}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl liquid-glass-subtle border border-white/80 text-[11px] font-mono text-zinc-600 space-y-1">
                    <div className="truncate">Source: <span className="text-zinc-900 font-medium">{doc.source}</span></div>
                    <div className="truncate">Version: <span className="text-zinc-900 font-medium">{doc.version}</span></div>
                    <div className="truncate text-zinc-500">Checksum: {doc.checksum.slice(0, 16)}...</div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-200/60 flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-600 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-zinc-900" />
                    <strong className="text-zinc-900">{doc.chunk_count || 0}</strong> Chunks
                  </span>

                  <button
                    onClick={() => handleInspect(doc.id)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 hover:text-black liquid-glass-pill px-3 py-1.5 rounded-xl transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect Chunks</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Inspect Chunks */}
        {inspectDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md">
            <div className="liquid-glass-card border border-white/90 rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
              <div className="p-5 border-b border-white/60 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-zinc-900 text-base sm:text-lg">{inspectDoc.title}</h3>
                  <p className="text-xs text-zinc-500">{inspectDoc.jurisdiction} • {inspectDoc.chunks?.length || 0} Embedded Chunks</p>
                </div>
                <button
                  onClick={() => setInspectDoc(null)}
                  className="p-2 text-zinc-500 hover:text-zinc-900 rounded-xl liquid-glass-pill border border-white/80"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-3 flex-1">
                {inspectDoc.chunks?.map((chunk: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-2xl liquid-glass-subtle border border-white/80 text-xs space-y-2">
                    <div className="flex items-center justify-between text-zinc-900 font-semibold">
                      <span>Chunk #{chunk.chunk_index} — {chunk.section || 'General'}</span>
                      <span className="text-zinc-500 font-mono text-[11px]">Page {chunk.page_number || '1'}</span>
                    </div>
                    <p className="text-zinc-800 font-mono text-[11px] leading-relaxed whitespace-pre-wrap bg-white/80 backdrop-blur-xs p-3 rounded-xl border border-white/80">
                      {chunk.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
