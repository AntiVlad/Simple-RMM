import React from 'react';

export interface Agent {
  id: string;
  hostname: string;
  os_version: string;
  ip_address: string;
  last_seen: string;
  is_online: boolean;
}

async function getAgents(): Promise<Agent[]> {
  try {
    const res = await fetch('http://localhost:8000/api/web/agents', {
      cache: 'no-store', 
    });
    
    if (!res.ok) {
      console.error('Failed to fetch agents:', res.statusText);
      return [];
    }
    
    return res.json();
  } catch (error) {
    console.error('Network error fetching agents:', error);
    return [];
  }
}

const MonitorIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="14" x="2" y="3" rx="2" />
    <line x1="8" x2="16" y1="21" y2="21" />
    <line x1="12" x2="12" y1="17" y2="21" />
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

export default async function DashboardPage() {
  const agents = await getAgents();

  const totalAgents = agents.length;
  const onlineAgents = agents.filter(a => a.is_online).length;
  const offlineAgents = totalAgents - onlineAgents;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 font-sans selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
            Endpoint Control Center
          </h1>
          <p className="text-slate-400 text-lg">
            Monitor and manage your fleet of registered remote agents.
          </p>
        </header>
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-500/30 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 font-medium">Total Agents</h3>
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg group-hover:scale-110 transition-transform">
                <MonitorIcon />
              </div>
            </div>
            <p className="text-4xl font-bold text-slate-100">{totalAgents}</p>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-500/30 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 font-medium">Agents Online</h3>
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg group-hover:scale-110 transition-transform">
                <CheckCircleIcon />
              </div>
            </div>
            <div className="flex items-end gap-3">
              <p className="text-4xl font-bold text-emerald-400">{onlineAgents}</p>
              <p className="text-sm text-slate-500 mb-1">active heartbeat</p>
            </div>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl hover:shadow-rose-500/10 hover:border-rose-500/30 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 font-medium">Agents Offline</h3>
              <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg group-hover:scale-110 transition-transform">
                <AlertCircleIcon />
              </div>
            </div>
            <div className="flex items-end gap-3">
              <p className="text-4xl font-bold text-rose-400">{offlineAgents}</p>
              <p className="text-sm text-slate-500 mb-1">needs attention</p>
            </div>
          </div>
        </section>
        <section className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
            <h2 className="text-xl font-semibold text-slate-200">Deployed Agents Feed</h2>
            <div className="text-sm font-medium px-3 py-1 bg-slate-800 text-slate-300 rounded-full flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Live Sync
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/40 text-slate-400 text-sm uppercase tracking-wider">
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Hostname</th>
                  <th className="px-6 py-4 font-medium">OS Version</th>
                  <th className="px-6 py-4 font-medium">IP Address</th>
                  <th className="px-6 py-4 font-medium">Last Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {agents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                      No agents registered yet. Deploy your Go agent to see it appear here!
                    </td>
                  </tr>
                ) : (
                  agents.map((agent) => (
                    <tr 
                      key={agent.id} 
                      className="hover:bg-slate-800/40 transition-colors duration-200 group"
                    >
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {agent.is_online ? (
                            <>
                              <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                              </span>
                              <span className="text-sm font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">Online</span>
                            </>
                          ) : (
                            <>
                              <span className="relative flex h-3 w-3">
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"></span>
                              </span>
                              <span className="text-sm font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">Offline</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap font-medium text-slate-200 group-hover:text-indigo-300 transition-colors">
                        {agent.hostname}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-slate-400">
                        {agent.os_version}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap font-mono text-sm text-slate-400 bg-slate-900/50 rounded inline-block mt-3 px-2 py-1">
                        {agent.ip_address}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-500">
                        {new Date(agent.last_seen).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}
