import { NavLink } from "react-router-dom";

export interface MobileTab {
  icon: React.ReactNode;
  label: string;
  to: string;
  end?: boolean;
}

// Barra de abas fixa inferior, visível só abaixo de lg (a sidebar assume no desktop).
export default function MobileTabBar({ tabs }: { tabs: MobileTab[] }) {
  return (
    <nav
      aria-label="Navegação principal"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-navy-light/95 backdrop-blur-md border-t border-zinc-200 dark:border-white/10 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex h-14">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive ? "text-primary" : "text-zinc-500 dark:text-zinc-400"
              }`
            }
          >
            {tab.icon}
            <span className="text-[10px] font-medium leading-none">{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
