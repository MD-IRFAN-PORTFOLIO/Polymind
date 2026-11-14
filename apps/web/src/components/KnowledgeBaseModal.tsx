"use client";

import { Check, Database, FolderPlus, Loader2, Trash2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import type { KnowledgeBaseDetail } from "@/lib/types";

interface KnowledgeBaseModalProps {
  open: boolean;
  knowledgeBases: KnowledgeBaseDetail[];
  activeKbIds: string[];
  onClose: () => void;
  onToggleKb: (id: string) => void;
  onCreateKb: (name: string, description: string) => Promise<void>;
  onDeleteKb: (id: string) => Promise<void>;
  onUploadFile: (kbId: string, file: File) => Promise<void>;
  onDeleteDoc: (docId: string) => Promise<void>;
}

export function KnowledgeBaseModal({
  open,
  knowledgeBases,
  activeKbIds,
  onClose,
  onToggleKb,
  onCreateKb,
  onDeleteKb,
  onUploadFile,
  onDeleteDoc,
}: KnowledgeBaseModalProps) {
  const [newKbName, setNewKbName] = useState("");
  const [newKbDesc, setNewKbDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [uploadingKbId, setUploadingKbId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [targetKbId, setTargetKbId] = useState<string | null>(null);

  if (!open) return null;

  const handleCreate = async () => {
    if (!newKbName.trim()) return;
    setIsCreating(true);
    try {
      await onCreateKb(newKbName.trim(), newKbDesc.trim());
      setNewKbName("");
      setNewKbDesc("");
    } finally {
      setIsCreating(false);
    }
  };

  const handleTriggerUpload = (kbId: string) => {
    setTargetKbId(kbId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetKbId) return;
    setUploadingKbId(targetKbId);
    try {
      await onUploadFile(targetKbId, file);
    } finally {
      setUploadingKbId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.md,.markdown,.csv,.json"
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-700 bg-surface-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-indigo-400" />
            <div>
              <h2 className="text-base font-semibold text-white">Knowledge Bases & Grounded RAG</h2>
              <p className="text-xs text-slate-400">
                Upload documents to retrieve citations automatically across all selected LLMs.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-surface-800 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {/* Create new KB form */}
          <div className="rounded-xl border border-slate-800 bg-surface-950/70 p-4">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300">
              <FolderPlus className="h-3.5 w-3.5 text-indigo-400" />
              Create Knowledge Base
            </h3>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <input
                value={newKbName}
                onChange={(e) => setNewKbName(e.target.value)}
                placeholder="Collection name (e.g. Product Specs, HR Handbook)"
                className="flex-1 rounded-lg border border-slate-700 bg-surface-900 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              <input
                value={newKbDesc}
                onChange={(e) => setNewKbDesc(e.target.value)}
                placeholder="Optional description"
                className="flex-1 rounded-lg border border-slate-700 bg-surface-900 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              <button
                onClick={handleCreate}
                disabled={isCreating || !newKbName.trim()}
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-40"
              >
                {isCreating ? "Creating..." : "Add Collection"}
              </button>
            </div>
          </div>

          {/* List KBs */}
          <div className="space-y-3">
            {knowledgeBases.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-500">
                No Knowledge Bases created yet. Add one above to start uploading documents.
              </p>
            ) : (
              knowledgeBases.map((kb) => {
                const isAttached = activeKbIds.includes(kb.id);
                const isUploading = uploadingKbId === kb.id;

                return (
                  <div
                    key={kb.id}
                    className={`rounded-xl border p-4 transition ${
                      isAttached ? "border-indigo-500/70 bg-indigo-500/5 ring-1 ring-indigo-500/20" : "border-slate-800 bg-surface-950/60"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => onToggleKb(kb.id)}
                          className={`flex h-5 w-5 items-center justify-center rounded border transition ${
                            isAttached
                              ? "border-indigo-500 bg-indigo-500 text-white"
                              : "border-slate-700 bg-surface-800 hover:border-slate-500"
                          }`}
                          title={isAttached ? "Attached to current chat" : "Attach to current chat"}
                        >
                          {isAttached && <Check className="h-3.5 w-3.5" />}
                        </button>
                        <div>
                          <span className="text-sm font-semibold text-white">{kb.name}</span>
                          {kb.description && <p className="text-xs text-slate-400">{kb.description}</p>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTriggerUpload(kb.id)}
                          disabled={isUploading}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-surface-800 px-2.5 py-1 text-xs font-medium text-slate-200 transition hover:border-indigo-500 hover:text-white disabled:opacity-50"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Parsing...
                            </>
                          ) : (
                            <>
                              <Upload className="h-3.5 w-3.5" />
                              Upload File
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => onDeleteKb(kb.id)}
                          className="rounded p-1 text-slate-400 hover:bg-red-500/15 hover:text-red-400"
                          title="Delete collection"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Uploaded Documents List */}
                    {kb.documents.length > 0 && (
                      <div className="mt-3 divide-y divide-slate-800/80 rounded-lg border border-slate-800 bg-surface-900/60">
                        {kb.documents.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between px-3 py-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-200">{doc.filename}</span>
                              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                                {doc.total_chunks} chunks
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {(doc.file_size_bytes / 1024).toFixed(1)} KB
                              </span>
                            </div>
                            <button
                              onClick={() => onDeleteDoc(doc.id)}
                              className="text-slate-400 hover:text-red-400"
                              title="Delete file"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
