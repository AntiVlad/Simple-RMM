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

export default function DeployPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [packages, setPackages] = useState<SoftwarePackage[]>([]);
  
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'software' | 'command'>('software');
  const [command, setCommand] = useState("");
  const [customArgs, setCustomArgs] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const presets = [
    { label: 'MSI (Quiet)', value: '/qn /norestart' },
    { label: 'InstallShield (Silent)', value: '/S' },
    { label: 'Inno Setup (Very Silent)', value: '/verysilent' },
    { label: 'Standard (Silent)', value: '/silent' },
  ];

  useEffect(() => {
    async function loadData() {
      try {
        const [agentsRes, packagesRes] = await Promise.all([
          fetch('http://localhost:8080/api/web/agents'),
          fetch('http://localhost:8080/api/web/software')
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
    setTimeout(() => setToast(null), 5000);
  };

  const toggleAgent = (id: string) => {
    setSelectedAgents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllAgents = () => {
    if (selectedAgents.size === agents.length) {
      setSelectedAgents(new Set());
    } else {
      setSelectedAgents(new Set(agents.map(a => a.id)));
    }
  };

  const togglePackage = (id: string) => {
    setSelectedPackages(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllPackages = () => {
    if (selectedPackages.size === packages.length) {
      setSelectedPackages(new Set());
    } else {
      setSelectedPackages(new Set(packages.map(p => p.id)));
    }
  };

  const canDeploy = selectedAgents.size > 0 && (activeTab === 'software' ? selectedPackages.size > 0 : command.trim() !== "");
  const totalTasks = activeTab === 'software' ? (selectedAgents.size * selectedPackages.size) : selectedAgents.size;

  const handleDeploy = async (e: FormEvent) => {
    e.preventDefault();
    if (!canDeploy) return;

    setIsSubmitting(true);
    setToast(null);

    try {
      const url = activeTab === 'software' 
        ? 'http://localhost:8080/api/web/tasks/bulk' 
        : 'http://localhost:8080/api/web/commands/bulk';
      
      const body = activeTab === 'software'
        ? { 
            agent_ids: Array.from(selectedAgents), 
            package_ids: Array.from(selectedPackages),
            custom_args: customArgs.trim() || null
          }
        : { agent_ids: Array.from(selectedAgents), command };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`Successfully queued ${data.tasks_created} tasks!`, "success");
        if (activeTab === 'command') setCommand("");
        if (activeTab === 'software') {
          setSelectedPackages(new Set());
          setCustomArgs("");
        }
        setSelectedAgents(new Set());
      } else {
        const errorData = await res.json();
        showToast(errorData.detail || "Deployment failed", "error");
      }
    } catch {
      showToast("Network error occurred during deployment", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 font-sans relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-indigo-500/8 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400">
            Task Deployment
          </h1>
          <p className="text-slate-400 text-lg">
            Deploy software or execute shell commands across your fleet.
          </p>
        </header>

        <div className="flex gap-1 p-1 bg-slate-900/80 border border-slate-800 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('software')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'software' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Software Packages
          </button>
          <button
            onClick={() => setActiveTab('command')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'command' ? 'bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Remote Command
          </button>
        </div>

        <form onSubmit={handleDeploy} className="space-y-8">
          <section className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400">
                    <rect width="20" height="14" x="2" y="3" rx="2" />
                    <line x1="8" x2="16" y1="21" y2="21" />
                    <line x1="12" x2="12" y1="17" y2="21" />
                  </svg>
                  Target Agents
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {selectedAgents.size} of {agents.length} selected
                </p>
              </div>
              <button
                type="button"
                onClick={toggleAllAgents}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-indigo-500/20 hover:text-indigo-300 border border-slate-700 hover:border-indigo-500/30 transition-all"
              >
                {selectedAgents.size === agents.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            
            {agents.length === 0 ? (
              <p className="text-slate-500 italic text-sm py-4 text-center">No agents registered yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {agents.map(agent => (
                  <label key={agent.id} className="checkbox-card group">
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={selectedAgents.has(agent.id)}
                      onChange={() => toggleAgent(agent.id)}
                    />
                    <div className={`card-body flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${selectedAgents.has(agent.id) ? 'bg-indigo-500/10 border-indigo-500/50 shadow-lg shadow-indigo-500/5' : 'bg-slate-900/50 border-slate-800 hover:bg-slate-800/50'}`}>
                      <div className={`check-indicator mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${selectedAgents.has(agent.id) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600'}`}>
                        {selectedAgents.has(agent.id) && (
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${agent.is_online ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]' : 'bg-slate-600'}`} />
                          <span className="font-semibold text-sm text-slate-200 truncate">{agent.hostname}</span>
                        </div>
                        <p className="text-xs text-slate-500 font-mono">{agent.ip_address}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{agent.os_version}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </section>

          {activeTab === 'software' ? (
            <section className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl animate-fadeIn">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                      <line x1="12" x2="12" y1="22.08" y2="12"/>
                    </svg>
                    Software Packages
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {selectedPackages.size} of {packages.length} selected
                  </p>
                </div>
                <button
                  type="button"
                  onClick={toggleAllPackages}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-indigo-500/20 hover:text-indigo-300 border border-slate-700 hover:border-indigo-500/30 transition-all"
                >
                  {selectedPackages.size === packages.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {packages.length === 0 ? (
                <p className="text-slate-500 italic text-sm py-4 text-center">No packages in the vault. Upload some first.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {packages.map(pkg => (
                    <label key={pkg.id} className="checkbox-card group">
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={selectedPackages.has(pkg.id)}
                        onChange={() => togglePackage(pkg.id)}
                      />
                      <div className={`card-body flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${selectedPackages.has(pkg.id) ? 'bg-indigo-500/10 border-indigo-500/50 shadow-lg shadow-indigo-500/5' : 'bg-slate-900/50 border-slate-800 hover:bg-slate-800/50'}`}>
                        <div className={`check-indicator mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${selectedPackages.has(pkg.id) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600'}`}>
                          {selectedPackages.has(pkg.id) && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-slate-200">{pkg.name}</p>
                          {pkg.silent_args && (
                            <p className="text-xs text-indigo-400/70 font-mono mt-1 bg-slate-950/50 px-1.5 py-0.5 rounded inline-block">{pkg.silent_args}</p>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {selectedPackages.size > 0 && (
                <div className="mt-8 pt-8 border-t border-slate-800 space-y-6 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400">
                        <polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-md font-bold text-slate-200">Execution Configuration</h3>
                      <p className="text-xs text-slate-500">Override the default arguments stored in the Vault.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Custom Arguments</label>
                      <input 
                        type="text"
                        value={customArgs}
                        onChange={(e) => setCustomArgs(e.target.value)}
                        placeholder="Defaulting to Vault settings..."
                        className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-indigo-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Common Presets</label>
                      <div className="flex flex-wrap gap-2">
                        {presets.map(p => (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() => setCustomArgs(p.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${customArgs === p.value ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'}`}
                          >
                            {p.label}
                          </button>
                        ))}
                        {customArgs && (
                          <button
                            type="button"
                            onClick={() => setCustomArgs("")}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 border border-slate-800 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          ) : (
            <section className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl animate-fadeIn">
              <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2 mb-5">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-fuchsia-400">
                  <polyline points="4 17 10 11 4 5" />
                  <line x1="12" x2="20" y1="19" y2="19" />
                </svg>
                Remote Command Engine
              </h2>
              <div className="space-y-4">
                <div className="relative group">
                  <textarea
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    placeholder="Enter shell command to execute (e.g. dir, ipconfig, or powershell scripts)..."
                    className="w-full h-32 bg-slate-950 border border-slate-800 focus:border-fuchsia-500/50 focus:ring-4 focus:ring-fuchsia-500/5 rounded-xl p-4 font-mono text-sm text-fuchsia-300 placeholder:text-slate-700 outline-none transition-all resize-none shadow-inner"
                  />
                  <div className="absolute top-3 right-3 flex gap-2">
                    <span className="text-[10px] font-bold tracking-widest uppercase py-1 px-2 rounded bg-fuchsia-500/10 text-fuchsia-500 border border-fuchsia-500/20">WinShell v1</span>
                  </div>
                </div>
                <div className="p-4 bg-fuchsia-500/5 border border-fuchsia-500/10 rounded-xl">
                  <p className="text-xs text-fuchsia-400/70 leading-relaxed italic">
                    Tip: Commands are executed via <code className="font-bold bg-fuchsia-500/10 px-1 rounded">cmd.exe /C</code> on target machines. To run PowerShell, prefix your command with <code className="font-bold bg-fuchsia-500/10 px-1 rounded">powershell -Command "..."</code>.
                  </p>
                </div>
              </div>
            </section>
          )}

          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="text-sm text-slate-400 space-y-1">
                {canDeploy ? (
                  <>
                    <p className="text-slate-200 font-semibold text-base">
                      {activeTab === 'software' 
                        ? `Deploying ${selectedPackages.size} package${selectedPackages.size !== 1 ? 's' : ''} to ${selectedAgents.size} agent${selectedAgents.size !== 1 ? 's' : ''}`
                        : `Executing remote command on ${selectedAgents.size} agent${selectedAgents.size !== 1 ? 's' : ''}`
                      }
                    </p>
                    <p className={activeTab === 'software' ? "text-indigo-400" : "text-fuchsia-400"}>
                      {totalTasks} total task{totalTasks !== 1 ? 's' : ''} will be created
                    </p>
                  </>
                ) : (
                  <p>Select at least one agent and {activeTab === 'software' ? 'one package' : 'provide a command'} to proceed.</p>
                )}
              </div>
              <button
                type="submit"
                disabled={!canDeploy || isSubmitting}
                className={`flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-bold text-white shadow-lg transition-all duration-300
                  ${!canDeploy || isSubmitting
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : activeTab === 'software'
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-400 hover:from-indigo-500 hover:to-indigo-300 hover:scale-[1.01] active:scale-[0.98] border border-transparent shadow-indigo-500/25 cursor-pointer'
                      : 'bg-gradient-to-r from-fuchsia-600 to-fuchsia-400 hover:from-fuchsia-500 hover:to-fuchsia-300 hover:scale-[1.01] active:scale-[0.98] border border-transparent shadow-fuchsia-500/25 cursor-pointer'
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" x2="11" y1="2" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                    {activeTab === 'software' ? `Deploy ${totalTasks} Tasks` : `Run Command`}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {toast && (
          <div className="fixed bottom-8 right-8 z-50 animate-fadeIn">
            <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border backdrop-blur-md
              ${toast.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-200'
                : 'bg-rose-950/80 border-rose-500/30 text-rose-200'
              }
            `}>
              {toast.type === 'success' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" x2="12" y1="8" y2="12" />
                  <line x1="12" x2="12.01" y1="16" y2="16" />
                </svg>
              )}
              <span className="font-medium">{toast.message}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
