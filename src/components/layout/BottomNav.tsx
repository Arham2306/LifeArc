import React from 'react'
import { Baby, GraduationCap, Briefcase, Store, LayoutGrid } from 'lucide-react'

export type TabType = 'life' | 'school' | 'careers' | 'business' | 'menu';

interface BottomNavProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
}

interface NavItem {
  id: TabType;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { id: 'life', label: 'Life', icon: <Baby className="w-4 h-4 stroke-[2.5]" /> },
  { id: 'school', label: 'School', icon: <GraduationCap className="w-4 h-4 stroke-[2.5]" /> },
  { id: 'careers', label: 'Careers', icon: <Briefcase className="w-4 h-4 stroke-[2.5]" /> },
  { id: 'business', label: 'Business', icon: <Store className="w-4 h-4 stroke-[2.5]" /> },
  { id: 'menu', label: 'Menu', icon: <LayoutGrid className="w-4 h-4 stroke-[2.5]" /> },
];

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onTabChange,
}) => {
  return (
    <nav className="bg-slate-100 border-t-[3px] border-slate-900 px-4 py-2.5 flex items-center justify-around">
      {navItems.map((item) => {
        const isActive = currentTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`
              flex flex-col items-center gap-1 transition-all
              ${isActive ? 'text-slate-950 scale-105' : 'text-slate-500 hover:text-slate-800'}
            `}
          >
            <div
              className={`
                w-8 h-8 rounded-xl border-2 border-slate-900 flex items-center justify-center transition-all
                ${isActive ? 'bg-amber-400 shadow-[1.5px_1.5px_0_#0f172a]' : 'bg-white border-slate-400'}
              `}
            >
              {item.icon}
            </div>
            <span className={`text-[10px] ${isActive ? 'font-black' : 'font-bold'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

