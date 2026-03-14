import { 
  LayoutDashboard, Users, Contact, Activity, Package, Megaphone, 
  TrendingUp, Sparkles, Settings, Bug, Plug, Download, 
  ChevronDown, ChevronLeft, Sun, Moon, LogOut, BarChart3, 
  MousePointerClick, Radio, Link2, Eye, Layers, 
  Zap, FileText, Server, Building2, Code2, Upload,
  Heart, ShoppingCart, Gauge, Bell, Signal, Lightbulb,
  PieChart, GitBranch, DollarSign, Crosshair, LayoutList
} from "lucide-react";
import FunnelIQLogo from "@/components/FunnelIQLogo";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type AdminTab = 
  | "dashboard" 
  | "leads" | "crm" 
  | "tracking" | "rastreios" 
  | "ads" 
  | "analytics" 
  | "ai" 
  | "clients" | "tiktok" | "logs";

interface NavItem {
  tab: AdminTab;
  label: string;
  icon: React.ReactNode;
}

interface NavGroup {
  key: string;
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
  separator?: boolean;
}

const NAV_GROUPS: NavGroup[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-[18px] w-[18px]" />,
    items: [
      { tab: "dashboard", label: "Overview", icon: <Gauge className="h-3.5 w-3.5" /> },
    ],
  },
  {
    key: "crm",
    label: "CRM",
    icon: <Contact className="h-[18px] w-[18px]" />,
    items: [
      { tab: "crm", label: "Pipeline & Funil", icon: <Layers className="h-3.5 w-3.5" /> },
      { tab: "leads", label: "Leads", icon: <Users className="h-3.5 w-3.5" /> },
    ],
  },
  {
    key: "tracking",
    label: "Tracking",
    icon: <Activity className="h-[18px] w-[18px]" />,
    items: [
      { tab: "tracking", label: "Events & Sessions", icon: <Activity className="h-3.5 w-3.5" /> },
      { tab: "rastreios", label: "Rastreios", icon: <Package className="h-3.5 w-3.5" /> },
    ],
  },
  {
    key: "ads",
    label: "Ads",
    icon: <Megaphone className="h-[18px] w-[18px]" />,
    items: [
      { tab: "ads", label: "Campaigns & Creatives", icon: <Megaphone className="h-3.5 w-3.5" /> },
    ],
  },
  {
    key: "analytics",
    label: "Analytics",
    icon: <BarChart3 className="h-[18px] w-[18px]" />,
    items: [
      { tab: "analytics", label: "Performance & Reports", icon: <PieChart className="h-3.5 w-3.5" /> },
    ],
  },
  {
    key: "ai",
    label: "AI",
    icon: <Sparkles className="h-[18px] w-[18px]" />,
    items: [
      { tab: "ai", label: "Diagnosis & Insights", icon: <Lightbulb className="h-3.5 w-3.5" /> },
    ],
    separator: true,
  },
  {
    key: "settings",
    label: "Settings",
    icon: <Settings className="h-[18px] w-[18px]" />,
    items: [
      { tab: "clients", label: "Clients", icon: <Building2 className="h-3.5 w-3.5" /> },
      { tab: "tiktok", label: "Integrations", icon: <Plug className="h-3.5 w-3.5" /> },
      { tab: "logs", label: "Logs & Debug", icon: <Bug className="h-3.5 w-3.5" /> },
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

  // Auto-expand group when tab changes externally
  useEffect(() => {
    const group = getGroupForTab(currentTab);
    setExpandedGroups(prev => {
      if (prev.has(group)) return prev;
      return new Set(prev).add(group);
    });
  }, [currentTab]);

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

  const renderNavItem = (group: NavGroup) => {
    const isExpanded = expandedGroups.has(group.key);
    const isActive = group.items.some(i => i.tab === currentTab);
    const isSingle = group.items.length === 1;

    if (collapsed) {
      return (
        <Tooltip key={group.key} delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              onClick={() => handleTabClick(group.items[0].tab, group.key)}
              className={cn(
                "w-full h-9 rounded-md flex items-center justify-center transition-all duration-150",
                isActive
                  ? "bg-foreground/[0.08] text-foreground"
                  : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
              )}
            >
              {group.icon}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            <p className="text-xs font-medium">{group.label}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    if (isSingle) {
      const item = group.items[0];
      return (
        <button
          key={group.key}
          onClick={() => handleTabClick(item.tab, group.key)}
          className={cn(
            "w-full h-8 rounded-md flex items-center gap-2.5 px-2.5 text-[13px] font-medium transition-all duration-150",
            currentTab === item.tab
              ? "bg-foreground/[0.08] text-foreground"
              : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
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
            "w-full h-8 rounded-md flex items-center gap-2.5 px-2.5 text-[13px] font-medium transition-all duration-150",
            isActive
              ? "text-foreground"
              : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
          )}
        >
          {group.icon}
          <span className="flex-1 text-left">{group.label}</span>
          <ChevronDown className={cn(
            "h-3 w-3 text-muted-foreground/60 transition-transform duration-200",
            isExpanded && "rotate-180"
          )} />
        </button>
        <div className={cn(
          "overflow-hidden transition-all duration-200",
          isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}>
          <div className="ml-[18px] pl-2.5 border-l border-border/40 mt-px space-y-px py-0.5">
            {group.items.map(item => (
              <button
                key={item.tab}
                onClick={() => handleTabClick(item.tab, group.key)}
                className={cn(
                  "w-full h-7 rounded-md flex items-center gap-2 px-2 text-xs transition-all duration-150",
                  currentTab === item.tab
                    ? "bg-foreground/[0.06] text-foreground font-medium"
                    : "text-muted-foreground hover:bg-foreground/[0.03] hover:text-foreground"
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Split groups into main and settings (after separator)
  const separatorIdx = NAV_GROUPS.findIndex(g => g.separator);
  const mainGroups = separatorIdx >= 0 ? NAV_GROUPS.slice(0, separatorIdx + 1) : NAV_GROUPS;
  const settingsGroups = separatorIdx >= 0 ? NAV_GROUPS.slice(separatorIdx + 1) : [];

  return (
    <aside className={cn(
      "h-screen sticky top-0 flex flex-col bg-card border-r border-border/60 transition-all duration-300 z-40 select-none",
      collapsed ? "w-[52px]" : "w-[220px]"
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center h-12 border-b border-border/60 shrink-0",
        collapsed ? "justify-center px-1" : "px-3 justify-between"
      )}>
        {!collapsed && <FunnelIQLogo size={22} showText />}
        {collapsed && <FunnelIQLogo size={22} />}
        {!collapsed && (
          <button
            onClick={onToggleCollapse}
            className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-0.5">
        {mainGroups.map(renderNavItem)}

        {/* Separator */}
        {settingsGroups.length > 0 && (
          <div className="py-2">
            <div className="h-px bg-border/60 mx-1" />
          </div>
        )}

        {settingsGroups.map(renderNavItem)}
      </nav>

      {/* Footer */}
      <div className={cn(
        "border-t border-border/60 shrink-0",
        collapsed ? "p-1 space-y-0.5" : "p-1.5 space-y-0.5"
      )}>
        {!collapsed && (
          <button
            onClick={onExportCSV}
            className="w-full h-7 rounded-md flex items-center gap-2 px-2.5 text-xs text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        )}

        <div className={cn("flex gap-0.5", collapsed ? "flex-col" : "")}>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleDarkMode}
                className={cn(
                  "h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground transition-colors",
                  collapsed ? "w-full" : "flex-1"
                )}
              >
                {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side={collapsed ? "right" : "top"} sideOffset={8}>
              <p className="text-xs">{darkMode ? "Light mode" : "Dark mode"}</p>
            </TooltipContent>
          </Tooltip>

          {collapsed && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={onToggleCollapse}
                  className="w-full h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground transition-colors"
                >
                  <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                <p className="text-xs">Expand sidebar</p>
              </TooltipContent>
            </Tooltip>
          )}

          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={onLogout}
                className={cn(
                  "h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors",
                  collapsed ? "w-full" : "flex-1"
                )}
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side={collapsed ? "right" : "top"} sideOffset={8}>
              <p className="text-xs">Logout</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}
