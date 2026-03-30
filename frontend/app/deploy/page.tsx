"use client";

import React, { useState, useEffect, FormEvent } from 'react';

interface Agent {
  id: string;
  hostname: string;
  os_version: string;
  ip_address: string;
  last_seen: string;
  is_online: boolean;
}

interface SoftwarePackage {
  id: string;
  name: string;
  download_url: string;
  silent_args: string;
}

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" x2="11" y1="2" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const AlertCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </svg>
);

export default function DeployPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [packages, setPackages] = useState<SoftwarePackage[]>([]);
  
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedPackage, setSelectedPackage] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [agentsRes, packagesRes] = await Promise.all([
          fetch('http://localhost:8000/api/web/agents'),
          fetch('http://localhost:8000/api/web/software')
        ]);
        
        if (agentsRes.ok) setAgents(await agentsRes.json());
        if (packagesRes.ok) setPackages(await packagesRes.json());
      } catch (err) {
        console.error("Failed to load deploy data", err);
        showToast("Failed to connect to backend", "error");
      }
    }
    loadData();
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleDeploy = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedAgent || !selectedPackage) return;

    setIsSubmitting(true);
    setToast(null);

    try {
      const res = await fetch('http://localhost:8000/api/web/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: selectedAgent,
          package_id: selectedPackage
        })
      });

      if (res.ok) {
        showToast("Task successfully queued for deployment!", "success");
        setSelectedAgent(''); 
        setSelectedPackage('');
      } else {
        const errorData = await res.json();
        showToast(errorData.detail || "Deployment failed", "error");
      }
    } catch (error) {
      showToast("Network error occurred during deployment", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 font-sans selection:bg-indigo-500/30 relative overflow-hidden">

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-3xl mx-auto space-y-10 relative z-10">

        <header className="flex flex-col gap-2 pt-10">
          <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400">
            Task Deployment
          </h1>
          <p className="text-slate-400 text-lg">
            Select a registered agent and deploy software instantly.
          </p>
        </header>
        <section className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleDeploy} className="space-y-6">
            <div className="space-y-3">
              <label htmlFor="agent" className="block text-sm font-semibold text-slate-300">
                Target Agent
              </label>
              <div className="relative group">
                <select
                  id="agent"
                  required
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="w-full appearance-none bg-slate-950/50 border border-slate-800 text-slate-200 rounded-xl px-4 py-4 pr-10 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all cursor-pointer group-hover:border-slate-700"
                >
                  <option value="" disabled className="text-slate-500 bg-slate-900">
                    -- Select an Agent --
                  </option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id} className="bg-slate-900">
                      {agent.hostname} ({agent.is_online ? 'Online' : 'Offline'}) - {agent.ip_address}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-500 group-hover:text-slate-400 transition-colors">
                  ▼
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <label htmlFor="package" className="block text-sm font-semibold text-slate-300">
                Software Package
              </label>
              <div className="relative group">
                <select
                  id="package"
                  required
                  value={selectedPackage}
                  onChange={(e) => setSelectedPackage(e.target.value)}
                  className="w-full appearance-none bg-slate-950/50 border border-slate-800 text-slate-200 rounded-xl px-4 py-4 pr-10 outline-none focus:ring-2 focus:ring-fuchsia-500/50 focus:border-fuchsia-500 transition-all cursor-pointer group-hover:border-slate-700"
                >
                  <option value="" disabled className="text-slate-500 bg-slate-900">
                    -- Select Software Package --
                  </option>
                  {packages.map(pkg => (
                    <option key={pkg.id} value={pkg.id} className="bg-slate-900">
                      {pkg.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-500 group-hover:text-slate-400 transition-colors">
                  ▼
                </div>
              </div>
            </div>
            <div className="pt-4">
              <button
                type="submit"
                disabled={!selectedAgent || !selectedPackage || isSubmitting}
                className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-white shadow-lg transition-all duration-300
                  ${!selectedAgent || !selectedPackage || isSubmitting 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                    : 'bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-400 hover:to-fuchsia-400 hover:scale-[1.01] active:scale-[0.98] border border-transparent shadow-indigo-500/25 cursor-pointer'
                  }
                `}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-5 w-5 border-2 border-white/20 border-t-white rounded-full" />
                    Deploying...
                  </span>
                ) : (
                  <>
                    <SendIcon />
                    Deploy Software Task
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
        {toast && (
          <div className={`fixed bottom-8 right-8 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300`}>
            <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border backdrop-blur-md
              ${toast.type === 'success' 
                ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-200' 
                : 'bg-rose-950/80 border-rose-500/30 text-rose-200'
              }
            `}>
              {toast.type === 'success' ? <CheckCircleIcon /> : <AlertCircleIcon />}
              <span className="font-medium">{toast.message}</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
