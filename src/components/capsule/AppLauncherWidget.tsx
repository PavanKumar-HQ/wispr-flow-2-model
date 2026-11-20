import React, { useState } from 'react';
import { ExternalLink, Terminal, Globe, MessageSquare, Compass, Database, Bot, Play, FileCode } from 'lucide-react';
import { safeInvoke } from '../../lib/ipc';

interface AppShortcut {
  id: string;
  name: string;
  target: string;
  icon: React.ReactNode;
  category: string;
}

export const AppLauncherWidget: React.FC = () => {
  const [customInput, setCustomInput] = useState<string>('');
  const [launchStatus, setLaunchStatus] = useState<string | null>(null);

  const shortcuts: AppShortcut[] = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      target: 'whatsapp',
      icon: <MessageSquare className="w-4 h-4 text-emerald-600" />,
      category: 'Chat',
    },
    {
      id: 'brave',
      name: 'Brave Browser',
      target: 'brave',
      icon: <Compass className="w-4 h-4 text-orange-600" />,
      category: 'Browser',
    },
    {
      id: 'safari',
      name: 'Safari',
      target: 'safari',
      icon: <Globe className="w-4 h-4 text-blue-500" />,
      category: 'Browser',
    },
    {
      id: 'pgadmin',
      name: 'pgAdmin 4',
      target: 'pgadmin',
      icon: <Database className="w-4 h-4 text-darkTeal" />,
      category: 'Database',
    },
    {
      id: 'antigravity',
      name: 'Antigravity',
      target: 'antigravity',
      icon: <Bot className="w-4 h-4 text-purple-600" />,
      category: 'Agent AI',
    },
    {
      id: 'youtube',
      name: 'YouTube',
      target: 'youtube',
      icon: <Play className="w-4 h-4 text-red-600" />,
      category: 'Media',
    },
    {
      id: 'terminal',
      name: 'Terminal',
      target: 'terminal',
      icon: <Terminal className="w-4 h-4 text-charcoal" />,
      category: 'Dev',
    },
    {
      id: 'vscode',
      name: 'VS Code',
      target: 'vscode',
      icon: <FileCode className="w-4 h-4 text-sky-600" />,
      category: 'Editor',
    },
  ];

  const handleLaunch = async (target: string, name: string) => {
    try {
      setLaunchStatus(`Opening ${name}...`);
      await safeInvoke('launch_app_or_url_cmd', { target });
      setTimeout(() => setLaunchStatus(null), 2500);
    } catch (e) {
      setLaunchStatus(`Failed to open: ${e}`);
      setTimeout(() => setLaunchStatus(null), 3500);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    handleLaunch(customInput.trim(), customInput.trim());
    setCustomInput('');
  };

  return (
    <div data-tauri-no-drag className="space-y-3 font-sans select-none text-charcoal">
      {/* Status banner */}
      {launchStatus && (
        <div className="p-2.5 rounded-xl bg-darkTeal text-white text-xs font-bold text-center animate-fadeIn shadow-xs">
          {launchStatus}
        </div>
      )}

      {/* Grid of Shortcuts */}
      <div className="bg-white rounded-2xl p-3.5 border border-charcoal/15 shadow-xs space-y-2.5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-charcoal/50 flex items-center justify-between">
          <span>Quick Launcher</span>
          <span className="text-[9px] text-charcoal/40">Say "open &lt;app&gt;" or click</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {shortcuts.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => handleLaunch(app.target, app.name)}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-stone-50 hover:bg-stone-100 border border-charcoal/10 transition-all text-left active:scale-95 cursor-pointer"
            >
              <div className="p-1.5 rounded-lg bg-white border border-charcoal/10 shadow-2xs">
                {app.icon}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-charcoal truncate">{app.name}</div>
                <div className="text-[10px] text-charcoal/50">{app.category}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom URL or App Input */}
      <div className="bg-white rounded-2xl p-3 border border-charcoal/15 shadow-xs space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-charcoal/50">
          Open Any App or Website
        </div>
        <form onSubmit={handleCustomSubmit} className="flex gap-1.5">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="e.g. google.com or Slack"
            className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-charcoal/20 bg-stone-50 focus:outline-none focus:border-darkTeal"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-darkTeal text-white rounded-xl text-xs font-bold hover:bg-darkTeal/90 transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Open</span>
          </button>
        </form>
      </div>
    </div>
  );
};

