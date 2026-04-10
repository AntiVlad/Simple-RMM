"use client";

import React, { useState, useEffect, useRef, FormEvent } from 'react';

interface SoftwarePackage {
  id: string;
  name: string;
  download_url: string;
  silent_args: string;
}

const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" x2="12" y1="3" y2="15"/>
  </svg>
);

const PackageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" x2="12" y1="22.08" y2="12"/>
  </svg>
);

export default function VaultPage() {
  const [packages, setPackages] = useState<SoftwarePackage[]>([]);
  const [name, setName] = useState("");
  const [silentArgs, setSilentArgs] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPackages = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/web/software");
      if (res.ok) setPackages(await res.json());
    } catch (err) {
      console.error("Failed to load packages");
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleUpdate = async (pkgId: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`http://localhost:8080/api/web/software/${pkgId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ silent_args: editValue }),
      });

      if (res.ok) {
        showToast("Arguments updated successfully", "success");
        setEditingId(null);
        fetchPackages();
      } else {
        showToast("Failed to update arguments", "error");
      }
    } catch (err) {
      showToast("Network error", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const startEditing = (pkg: SoftwarePackage) => {
    setEditingId(pkg.id);
    setEditValue(pkg.silent_args);
  };

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !file) return;

    setIsDeploying(true);
    setToast(null);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("silent_args", silentArgs);
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8080/api/web/software/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        showToast("Software uploaded successfully", "success");
        setName("");
        setSilentArgs("");
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        fetchPackages();
      } else {
        const errorData = await res.json();
        showToast(errorData.detail || "Upload failed", "error");
      }
    } catch (error) {
      showToast("Network error uploading file", "error");
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 font-sans selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto space-y-10">
        
        <header className="flex flex-col gap-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            Software Vault
          </h1>
          <p className="text-slate-400 text-lg">
            Upload payloads to your localized server. 
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-1 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl h-fit">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <UploadIcon /> Add to Vault
            </h2>
            
            <form onSubmit={handleUpload} className="space-y-5">
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Display Name</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. JQ Processor (Harmless)"
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all text-slate-200"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Default Silent Arguments</label>
                <input 
                  type="text" 
                  value={silentArgs}
                  onChange={(e) => setSilentArgs(e.target.value)}
                  placeholder="e.g. --version or /qn"
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all text-slate-200"
                />
                <p className="text-xs text-slate-500">Default flags used when deploying this package.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Physical Payload File</label>
                <div className="relative border-2 border-dashed border-slate-700 rounded-xl p-6 text-center hover:border-cyan-500/50 transition-colors bg-slate-950/30 group">
                  <input
                    type="file"
                    ref={fileInputRef}
                    required
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="text-slate-400 group-hover:text-cyan-400 transition-colors">
                    <UploadIcon />
                  </div>
                  <p className="mt-2 text-sm text-slate-300 font-medium">
                    {file ? file.name : "Click or drag file to upload"}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">.EXE, .MSI, .PS1, .BAT</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={!name || !file || isDeploying}
                className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all
                  ${!name || !file || isDeploying 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                    : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white hover:scale-[1.02] border border-cyan-500'
                  }`}
              >
                {isDeploying ? "Uploading..." : "Upload to Vault"}
              </button>

            </form>
          </div>
          <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 bg-slate-900/80">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <PackageIcon /> Vault Contents
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-900/40 text-slate-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-medium">Package Name</th>
                    <th className="px-6 py-4 font-medium">Default Arguments</th>
                    <th className="px-6 py-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {packages.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-slate-500 italic">
                        Your vault is empty. Upload your first package!
                      </td>
                    </tr>
                  ) : (
                    packages.map((pkg) => (
                      <tr key={pkg.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-200">
                          <div className="flex items-center gap-3">
                            <PackageIcon /> 
                            <div>
                                <p>{pkg.name}</p>
                                <p className="text-[10px] font-mono text-slate-500 truncate max-w-[150px]">{pkg.download_url}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {editingId === pkg.id ? (
                            <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                                <input 
                                    type="text"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="bg-slate-950 border border-cyan-500/50 rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-cyan-500/20 w-full font-mono"
                                    autoFocus
                                />
                                <button 
                                    onClick={() => handleUpdate(pkg.id)}
                                    disabled={isUpdating}
                                    className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                </button>
                                <button 
                                    onClick={() => setEditingId(null)}
                                    className="p-1 text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                </button>
                            </div>
                          ) : (
                            <div className="group flex items-center justify-between gap-4">
                                <span className={`font-mono text-sm ${pkg.silent_args ? 'text-cyan-400' : 'text-slate-600 italic'}`}>
                                    {pkg.silent_args || "No default arguments"}
                                </span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                           {editingId !== pkg.id && (
                                <button 
                                    onClick={() => startEditing(pkg)}
                                    className="p-2 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all flex items-center gap-2 text-xs font-bold"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                    Edit Default
                                </button>
                           )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {toast && (
          <div className={`fixed bottom-8 right-8 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300`}>
            <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border backdrop-blur-md
              ${toast.type === 'success' ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200' : 'bg-rose-950/80 border-rose-500 text-rose-200'}`}>
              <span className="font-medium">{toast.message}</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
