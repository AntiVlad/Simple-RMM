"use client";

import React, { useState, useEffect } from 'react';

interface TaskFull {
  id: string;
  agent_id: string;
  package_id: string | null;
  command: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILED';
  logs: string | null;
  created_at: string | null;
  agent: {
    id: string;
    hostname: string;
    ip_address: string;
    os_version: string;
    last_seen: string;
  };
  package: {
    id: string;
    name: string;
    download_url: string;
    silent_args: string;
  } | null;
}

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  PENDING: { label: 'Pending', bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
  IN_PROGRESS: { label: 'In Progress', bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400' },
  SUCCESS: { label: 'Success', bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  FAILED: { label: 'Failed', bg: 'bg-rose-500/10', text: 'text-rose-400', dot: 'bg-rose-400' },
};

export default function HistoryPage() {
  const [tasks, setTasks] = useState<TaskFull[]>([]);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/web/tasks');
      if (res.ok) setTasks(await res.json());
    } catch (err) {
      console.error("Failed to load tasks", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredTasks = filter === 'ALL' ? tasks : tasks.filter(t => t.status === filter);

  const counts = {
    ALL: tasks.length,
    PENDING: tasks.filter(t => t.status === 'PENDING').length,
    IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    SUCCESS: tasks.filter(t => t.status === 'SUCCESS').length,
    FAILED: tasks.filter(t => t.status === 'FAILED').length,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
            Task History
          </h1>
          <p className="text-slate-400 text-lg">
            Track deployment results across all agents in real-time.
          </p>
        </header>

        <div className="flex gap-2 flex-wrap">
          {(['ALL', 'PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED'] as const).map(status => {
            const isActive = filter === status;
            const cfg = status === 'ALL' ? null : statusConfig[status];
            return (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-200
                  ${isActive
                    ? status === 'ALL'
                      ? 'bg-slate-700/50 border-slate-600 text-slate-200'
                      : `${cfg!.bg} border-current ${cfg!.text}`
                    : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                  }
                `}
              >
                {status === 'ALL' ? 'All' : cfg!.label}
                <span className="ml-2 opacity-60">{counts[status]}</span>
              </button>
            );
          })}
        </div>

        <section className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Deployment Log
            </h2>
            <div className="text-sm text-slate-500 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Auto-refresh 10s
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/40 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 font-medium">Agent</th>
                  <th className="px-5 py-4 font-medium">Package</th>
                  <th className="px-5 py-4 font-medium">Created</th>
                  <th className="px-5 py-4 font-medium">Logs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                      <span className="animate-spin inline-block h-5 w-5 border-2 border-slate-600 border-t-slate-300 rounded-full mr-2" />
                      Loading deployment history...
                    </td>
                  </tr>
                ) : filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-slate-500 italic">
                      {filter === 'ALL' ? 'No deployments yet. Go deploy some software!' : `No ${filter.toLowerCase().replace('_', ' ')} tasks.`}
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => {
                    const cfg = statusConfig[task.status];
                    const isExpanded = expandedTask === task.id;
                    return (
                      <React.Fragment key={task.id}>
                        <tr className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${cfg.bg} ${cfg.text} border border-current/20`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-medium text-sm text-slate-200">{task.agent.hostname}</p>
                            <p className="text-xs text-slate-500 font-mono">{task.agent.ip_address}</p>
                          </td>
                          <td className="px-5 py-4">
                            {task.package ? (
                              <>
                                <p className="text-sm text-slate-300 font-medium">{task.package.name}</p>
                                {task.package.silent_args && (
                                  <span className="text-xs font-mono text-cyan-400/60 bg-slate-950/50 px-1.5 py-0.5 rounded mt-0.5 inline-block">{task.package.silent_args}</span>
                                )}
                              </>
                            ) : task.command ? (
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold tracking-widest uppercase py-0.5 px-1.5 rounded bg-fuchsia-500/10 text-fuchsia-500 border border-fuchsia-500/20">Command</span>
                                <p className="text-sm text-fuchsia-300/80 font-mono truncate max-w-[200px]" title={task.command}>
                                  {task.command}
                                </p>
                              </div>
                            ) : (
                              <span className="text-slate-600 italic text-sm">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-500">
                            {task.created_at ? new Date(task.created_at).toLocaleString() : '—'}
                          </td>
                          <td className="px-5 py-4">
                            {task.logs ? (
                              <button
                                onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-200 border border-slate-700 transition-all"
                              >
                                {isExpanded ? 'Hide' : 'View'}
                              </button>
                            ) : (
                              <span className="text-xs text-slate-600 italic">—</span>
                            )}
                          </td>
                        </tr>
                        {isExpanded && task.logs && (
                          <tr>
                            <td colSpan={5} className="px-5 py-4 bg-slate-950/50">
                              <pre className="text-xs font-mono text-slate-400 whitespace-pre-wrap max-h-48 overflow-y-auto bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                                {task.logs}
                              </pre>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
