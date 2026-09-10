import React, { useState, useEffect } from 'react';
import { ShieldAlert, Upload, RefreshCw, Trash2, CheckCircle2, Clock, AlertOctagon, FileUp, Database } from 'lucide-react';
import { UserProfile, IngestionJobItem, LegalDocItem } from '../types.js';
import { ApiService } from '../services/api.js';

interface AdminViewProps {
  currentUser: UserProfile | null;
  onOpenAuthModal: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ currentUser, onOpenAuthModal }) => {
  const [jobs, setJobs] = useState<IngestionJobItem[]>([]);
  const [documents, setDocuments] = useState<LegalDocItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isReindexing, setIsReindexing] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [jurisdiction, setJurisdiction] = useState('United States (Federal)');
  const [documentType, setDocumentType] = useState('STATUTE');
  const [version, setVersion] = useState('1.0');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [rawText, setRawText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [jobsData, docsData] = await Promise.all([
        ApiService.getIngestionJobs(),
        ApiService.getDocuments(),
      ]);
      setJobs(jobsData);
      setDocuments(docsData);
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [currentUser]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFeedbackMsg({ text: 'Document Title is required', type: 'error' });
      return;
    }
    if (!selectedFile && !rawText.trim()) {
      setFeedbackMsg({ text: 'Please select a file or enter document text', type: 'error' });
      return;
    }

    setIsUploading(true);
    setFeedbackMsg(null);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('source', source || 'Official Legal Source');
      formData.append('jurisdiction', jurisdiction);
      formData.append('document_type', documentType);
      formData.append('version', version);
      formData.append('effective_date', effectiveDate);

      if (selectedFile) {
        formData.append('file', selectedFile);
      } else {
        formData.append('raw_text', rawText);
      }

      const res = await ApiService.uploadDocument(formData);
      setFeedbackMsg({ text: res.message || 'Document successfully ingested!', type: 'success' });

      // Reset form
      setTitle('');
      setSource('');
      setRawText('');
      setSelectedFile(null);

      // Refresh list
      loadAdminData();
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'Failed to ingest document', type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleReindex = async () => {
    setIsReindexing(true);
    setFeedbackMsg(null);
    try {
      const res = await ApiService.reindexDocuments();
      setFeedbackMsg({ text: res.message || 'Vector re-indexing completed', type: 'success' });
      loadAdminData();
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'Re-indexing failed', type: 'error' });
    } finally {
      setIsReindexing(false);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (!confirm('Are you sure you want to delete this legal document and all its indexed embeddings?')) return;
    try {
      await ApiService.deleteDocument(id);
      loadAdminData();
      setFeedbackMsg({ text: 'Document removed from knowledge repository', type: 'success' });
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'Failed to delete document', type: 'error' });
    }
  };

  if (!currentUser || currentUser.role !== 'ADMIN') {
    return (
      <div className="flex-1 overflow-y-auto bg-transparent p-8 flex items-center justify-center text-zinc-900">
        <div className="max-w-md p-8 rounded-3xl liquid-glass-card border border-white/90 text-center space-y-4 shadow-2xl">
          <div className="inline-flex p-3 rounded-2xl liquid-glass-dark text-white shadow-md">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900">Administrator Access Required</h2>
          <p className="text-xs text-zinc-600 leading-relaxed">
            The document ingestion pipeline and vector re-indexing tools are restricted
            to compliance administrators.
          </p>
          <button
            onClick={onOpenAuthModal}
            className="w-full py-2.5 px-4 rounded-xl liquid-glass-dark hover:brightness-110 text-white font-semibold text-sm transition shadow-md"
          >
            Sign In with Admin Credentials
          </button>
          <p className="text-[11px] text-zinc-500 font-mono">
            Demo: <code className="text-zinc-800 font-semibold">admin@legalrag.internal</code> /{' '}
            <code className="text-zinc-800 font-semibold">AdminPass123!</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-transparent p-4 sm:p-8 text-zinc-900">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-zinc-900" />
              <span>Admin Ingestion & Indexing Console</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600">
              Ingest new legal statutes, inspect ingestion jobs, and trigger vector re-indexing.
            </p>
          </div>

          <button
            onClick={handleReindex}
            disabled={isReindexing}
            className="flex items-center gap-2 px-4 py-2 liquid-glass-pill border border-white/80 hover:bg-white/80 text-zinc-800 rounded-xl text-xs font-semibold disabled:opacity-50 transition shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReindexing ? 'animate-spin' : ''}`} />
            <span>{isReindexing ? 'Re-indexing Vectors...' : 'Re-index All Vectors'}</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            className={`p-4 rounded-2xl text-xs font-medium border flex items-center justify-between ${
              feedbackMsg.type === 'success'
                ? 'liquid-glass-dark border-white/20 text-white shadow-md'
                : 'liquid-glass-card border-white/80 text-zinc-800'
            }`}
          >
            <span>{feedbackMsg.text}</span>
            <button onClick={() => setFeedbackMsg(null)} className="text-zinc-400 hover:text-white p-1">
              ✕
            </button>
          </div>
        )}

        {/* Ingestion Form */}
        <div className="p-6 rounded-3xl liquid-glass-card border border-white/80 shadow-md space-y-6">
          <div className="border-b border-zinc-200/60 pb-3">
            <h3 className="font-semibold text-zinc-900 text-base flex items-center gap-2">
              <FileUp className="w-5 h-5 text-zinc-900" />
              <span>Ingest Legal Document</span>
            </h3>
            <p className="text-xs text-zinc-600">
              Upload PDF, TXT, or Markdown documents to chunk, embed, and index into the persistent vector database.
            </p>
          </div>

          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Sarbanes-Oxley Act Title III"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full text-xs liquid-glass-input rounded-xl p-2.5 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 border border-white/80"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700">Source Organization / URL</label>
                <input
                  type="text"
                  placeholder="e.g., US Congress / GovInfo"
                  value={source}
                  onChange={e => setSource(e.target.value)}
                  className="w-full text-xs liquid-glass-input rounded-xl p-2.5 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 border border-white/80"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700">Jurisdiction</label>
                <select
                  value={jurisdiction}
                  onChange={e => setJurisdiction(e.target.value)}
                  className="w-full text-xs liquid-glass-subtle rounded-xl p-2.5 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 border border-white/80"
                >
                  <option value="United States (Federal)">United States (Federal)</option>
                  <option value="United States (California)">United States (California)</option>
                  <option value="United States (New York)">United States (New York)</option>
                  <option value="United States (Uniform State Law)">United States (Uniform State Law)</option>
                  <option value="European Union">European Union</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="International">International</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700">Document Type</label>
                <select
                  value={documentType}
                  onChange={e => setDocumentType(e.target.value)}
                  className="w-full text-xs liquid-glass-subtle rounded-xl p-2.5 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 border border-white/80"
                >
                  <option value="STATUTE">STATUTE (Legislative Act)</option>
                  <option value="REGULATION">REGULATION (Agency Rule)</option>
                  <option value="CASE_LAW">CASE LAW (Judicial Precedent)</option>
                  <option value="CONTRACT">CONTRACT (Agreement / Terms)</option>
                  <option value="GUIDANCE">GUIDANCE (Advisory Opinion)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700">Version Identifier</label>
                <input
                  type="text"
                  placeholder="e.g., Pub. L. 107-204"
                  value={version}
                  onChange={e => setVersion(e.target.value)}
                  className="w-full text-xs liquid-glass-input rounded-xl p-2.5 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 font-mono border border-white/80"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700">Effective Date</label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={e => setEffectiveDate(e.target.value)}
                  className="w-full text-xs liquid-glass-input rounded-xl p-2.5 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 font-mono border border-white/80"
                />
              </div>
            </div>

            {/* File Upload or Raw Text */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-medium text-zinc-700">Document File (PDF / TXT / MD)</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2.5 liquid-glass-subtle border border-dashed border-white/90 hover:border-zinc-400 rounded-2xl cursor-pointer text-xs text-zinc-700 transition">
                  <Upload className="w-4 h-4 text-zinc-900" />
                  <span>{selectedFile ? selectedFile.name : 'Choose file to upload'}</span>
                  <input
                    type="file"
                    accept=".pdf,.txt,.md"
                    onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
                {selectedFile && (
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-xs text-zinc-500 hover:text-zinc-900 underline"
                  >
                    Remove file
                  </button>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-600">Or Paste Raw Legal Text Directly:</label>
                <textarea
                  rows={4}
                  placeholder="Paste legal provisions, articles, and statutory sections here..."
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  className="w-full text-xs liquid-glass-input rounded-2xl p-3 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 font-mono resize-y border border-white/80"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isUploading}
                className="px-5 py-2.5 liquid-glass-dark hover:brightness-110 text-white font-bold rounded-xl text-xs transition shadow-md disabled:opacity-50 flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Chunking & Vectorizing...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Ingest into Vector Store</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Existing Documents Management */}
        <div className="p-6 rounded-3xl liquid-glass-card border border-white/80 shadow-md space-y-4">
          <h3 className="font-semibold text-zinc-900 text-base flex items-center gap-2">
            <Database className="w-5 h-5 text-zinc-900" />
            <span>Active Knowledge Base Records ({documents.length})</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-700">
              <thead className="liquid-glass-subtle text-zinc-600 font-medium uppercase text-[10px] tracking-wider border-b border-white/60">
                <tr>
                  <th className="py-2.5 px-3">Title</th>
                  <th className="py-2.5 px-3">Jurisdiction</th>
                  <th className="py-2.5 px-3">Version</th>
                  <th className="py-2.5 px-3">Chunks</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/50">
                {documents.map(doc => (
                  <tr key={doc.id} className="hover:bg-white/40 transition">
                    <td className="py-3 px-3 font-medium text-zinc-900">{doc.title}</td>
                    <td className="py-3 px-3 text-zinc-600">{doc.jurisdiction}</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-zinc-500">{doc.version}</td>
                    <td className="py-3 px-3 font-mono text-zinc-800">{doc.chunk_count || 0}</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="p-1 text-zinc-400 hover:text-zinc-900 rounded-lg hover:bg-white/60 transition"
                        title="Delete document and embeddings"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Ingestion Jobs */}
        <div className="p-6 rounded-3xl liquid-glass-card border border-white/80 shadow-md space-y-4">
          <h3 className="font-semibold text-zinc-900 text-base flex items-center gap-2">
            <Clock className="w-5 h-5 text-zinc-900" />
            <span>Ingestion Job History</span>
          </h3>

          <div className="space-y-2">
            {jobs.length === 0 ? (
              <div className="text-center py-6 text-xs text-zinc-500">No recent ingestion jobs found.</div>
            ) : (
              jobs.map(job => (
                <div
                  key={job.id}
                  className="p-3.5 rounded-2xl liquid-glass-subtle border border-white/80 flex items-center justify-between text-xs"
                >
                  <div className="space-y-1">
                    <div className="font-medium text-zinc-900">{job.document_title || job.document_id}</div>
                    <div className="text-[11px] text-zinc-500 flex items-center gap-3 font-mono">
                      <span>ID: {job.id}</span>
                      <span>Started: {new Date(job.started_at).toLocaleTimeString()}</span>
                      <span>Chunks: {job.chunk_count}</span>
                    </div>
                  </div>

                  <span
                    className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold tracking-wide uppercase border border-white/80 liquid-glass-pill text-zinc-800 flex items-center gap-1 shadow-2xs"
                  >
                    {job.status === 'COMPLETED' ? (
                      <CheckCircle2 className="w-3 h-3 text-zinc-900" />
                    ) : job.status === 'FAILED' ? (
                      <AlertOctagon className="w-3 h-3 text-zinc-500" />
                    ) : (
                      <RefreshCw className="w-3 h-3 animate-spin text-zinc-900" />
                    )}
                    {job.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
