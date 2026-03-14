import { 
  LayoutDashboard, Users, Contact, Activity, Package, Megaphone, 
  TrendingUp, Sparkles, Settings, Bug, Plug, Download, 
  ChevronDown, Sun, Moon, LogOut, Target, BarChart3, 
  MousePointerClick, Radio, Link2, Eye, Layers, Bot,
  ArrowUpDown, Palette, FileText, Server
} from "lucide-react";
import FunnelIQLogo from "@/components/FunnelIQLogo";
import { cn } from "@/lib/utils";
import { useState } from "react";

export type AdminTab = 
  | "dashboard" 
  | "leads" | "crm" 
  | "tracking" | "rastreios" 
  | "ads" 
  | "analytics" 
  | "ai" 
  | "clients" | "tiktok" | "logs";

interface NavGroup {
  key: string;
  label: string;
  icon: React.ReactNode;
  items: { tab: AdminTab; label: string; icon: React.ReactNode }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
    items: [
      { tab: "dashboard", label: "Visão Geral", icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
    ],
  },
  {
    key: "crm",
    label: "CRM",
    icon: <Contact className="h-4 w-4" />,
    items: [
      { tab: "crm", label: "Pipeline & Funil", icon: <Layers className="h-3.5 w-3.5" /> },
      { tab: "leads", label: "Leads", icon: <Users className="h-3.5 w-3.5" /> },
    ],
  },
  {
    key: "tracking",
    label: "Tracking",
    icon: <Activity className="h-4 w-4" />,
    items: [
      { tab: "tracking", label: "Tracking Hub", icon: <Activity className="h-3.5 w-3.5" /> },
      { tab: "rastreios", label: "Rastreios", icon: <Package className="h-3.5 w-3.5" /> },
    ],
  },
  {
    key: "ads",
    label: "Ads",
    icon: <Megaphone className="h-4 w-4" />,
    items: [
      { tab: "ads", label: "Campanhas & Criativos", icon: <Megaphone className="h-3.5 w-3.5" /> },
    ],
  },
  {
    key: "analytics",
    label: "Analytics",
    icon: <TrendingUp className="h-4 w-4" />,
    items: [
      { tab: "analytics", label: "Performance & Relatórios", icon: <BarChart3 className="h-3.5 w-3.5" /> },
    ],
  },
  {
    key: "ai",
    label: "AI",
    icon: <Sparkles className="h-4 w-4" />,
    items: [
      { tab: "ai", label: "Diagnóstico & Insights", icon: <Sparkles className="h-3.5 w-3.5" /> },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    icon: <Settings className="h-4 w-4" />,
    items: [
      { tab: "clients", label: "Client Hub", icon: <Users className="h-3.5 w-3.5" /> },
      { tab: "tiktok", label: "Integrações", icon: <Plug className="h-3.5 w-3.5" /> },
      { tab: "logs", label: "Logs Técnicos", icon: <Bug className="h-3.5 w-3.5" /> },
    ],
  },
];

function getGroupForTab(tab: AdminTab): string {
  for (const g of NAV_GROUPS) {
    if (g.items.some(i => i.tab === tab)) return g.key;
  }
  return "dashboard";
}

interface AdminSidebarProps {
  currentTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onExportCSV: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function AdminSidebar({
  currentTab, onTabChange, onExportCSV, darkMode, onToggleDarkMode, onLogout, collapsed, onToggleCollapse
}: AdminSidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    return new Set([getGroupForTab(currentTab)]);
  });

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleTabClick = (tab: AdminTab, groupKey: string) => {
    onTabChange(tab);
    setExpandedGroups(prev => new Set(prev).add(groupKey));
  };

  return (
    <aside className={cn(
      "h-screen sticky top-0 flex flex-col border-r border-border/50 bg-card/95 backdrop-blur-xl transition-all duration-300 z-40",
      collapsed ? "w-16" : "w-60"
    )}>
      {/* Logo */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-border/50">
        {!collapsed && <FunnelIQLogo size={28} showText />}
        {collapsed && <FunnelIQLogo size={28} />}
        <button
          onClick={onToggleCollapse}
          className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", collapsed ? "rotate-[-90deg]" : "rotate-90")} />
        </button>
      </div>

      {/* Nav Groups */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
        {NAV_GROUPS.map(group => {
          const isExpanded = expandedGroups.has(group.key);
          const isActive = group.items.some(i => i.tab === currentTab);
          const isSingle = group.items.length === 1;

          if (collapsed) {
            // In collapsed mode, show only group icon, click first item
            return (
              <button
                key={group.key}
                onClick={() => handleTabClick(group.items[0].tab, group.key)}
                title={group.label}
                className={cn(
                  "w-full h-10 rounded-lg flex items-center justify-center transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {group.icon}
              </button>
            );
          }

          if (isSingle) {
            const item = group.items[0];
            return (
              <button
                key={group.key}
                onClick={() => handleTabClick(item.tab, group.key)}
                className={cn(
                  "w-full h-9 rounded-lg flex items-center gap-2.5 px-3 text-sm font-medium transition-colors",
                  currentTab === item.tab
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {group.icon}
                <span>{group.label}</span>
              </button>
            );
          }

          return (
            <div key={group.key}>
              <button
                onClick={() => toggleGroup(group.key)}
                className={cn(
                  "w-full h-9 rounded-lg flex items-center gap-2.5 px-3 text-sm font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {group.icon}
                <span className="flex-1 text-left">{group.label}</span>
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-180")} />
              </button>
              {isExpanded && (
                <div className="ml-4 pl-3 border-l border-border/50 mt-0.5 space-y-0.5">
                  {group.items.map(item => (
                    <button
                      key={item.tab}
                      onClick={() => handleTabClick(item.tab, group.key)}
                      className={cn(
                        "w-full h-8 rounded-md flex items-center gap-2 px-2.5 text-xs font-medium transition-colors",
                        currentTab === item.tab
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className={cn("border-t border-border/50 p-2 space-y-1", collapsed && "px-1")}>
        <button
          onClick={onExportCSV}
          title="Exportar CSV"
          className={cn(
            "w-full h-8 rounded-lg flex items-center gap-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
            collapsed ? "justify-center" : "px-3"
          )}
        >
          <Download className="h-3.5 w-3.5" />
          {!collapsed && <span>Exportar CSV</span>}
        </button>
        <button
          onClick={onToggleDarkMode}
          title={darkMode ? "Modo Claro" : "Modo Escuro"}
          className={cn(
            "w-full h-8 rounded-lg flex items-center gap-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
            collapsed ? "justify-center" : "px-3"
          )}
        >
          {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          {!collapsed && <span>{darkMode ? "Modo Claro" : "Modo Escuro"}</span>}
        </button>
        <button
          onClick={onLogout}
          title="Sair"
          className={cn(
            "w-full h-8 rounded-lg flex items-center gap-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors",
            collapsed ? "justify-center" : "px-3"
          )}
        >
          <LogOut className="h-3.5 w-3.5" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}
