import React from 'react';
import { Library, Disc, Search, User, LogIn, LogOut, Sun, Moon, Film } from 'lucide-react';
import { View } from '../types';

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  user?: { username: string; isAdmin?: boolean; avatar_url?: string } | null;
  onLogin?: () => void;
  onLogout?: () => void;
  onOpenSettings?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  theme,
  onToggleTheme,
  user,
  onLogin,
  onLogout,
  onOpenSettings,
}) => {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-suno-sidebar border-r border-zinc-200 dark:border-white/5 flex-shrink-0 w-[72px] items-center py-4 z-30 transition-colors duration-300 overflow-y-auto scrollbar-hide">
      {/* Strands Logo */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center mb-6 cursor-pointer hover:scale-105 transition-transform overflow-hidden"
        onClick={() => onNavigate('create')}
        title="Strands SoundWave"
      >
        <img
          src={typeof window !== 'undefined' && window.location.pathname.startsWith('/stepstudio') ? '/stepstudio/strands-logo.svg' : '/strands-logo.svg'}
          alt="Strands"
          className="w-10 h-10 object-contain"
        />
      </div>

      <nav className="flex-1 flex flex-col gap-4 w-full px-3">
        <NavItem
          icon={<Disc size={24} />}
          label="Create"
          active={currentView === 'create'}
          onClick={() => onNavigate('create')}
        />
        <NavItem
          icon={<Library size={24} />}
          label="Library"
          active={currentView === 'library'}
          onClick={() => onNavigate('library')}
        />
        <NavItem
          icon={<Search size={24} />}
          label="Search"
          active={currentView === 'search'}
          onClick={() => onNavigate('search')}
        />

        {/* Video Studio — local use only, hidden in demo/iframe */}
        {typeof window !== 'undefined' && !window.location.pathname.startsWith('/stepstudio') && window.parent === window && (
          <NavItem
            icon={<Film size={24} />}
            label="Video"
            active={currentView === 'video-studio'}
            onClick={() => onNavigate('video-studio')}
          />
        )}

        <div className="mt-auto flex flex-col gap-4">
          <button
            onClick={onToggleTheme}
            className="w-10 h-10 rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors mx-auto"
            title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {user ? (
            <div className="flex flex-col items-center gap-2">
              <div
                onClick={onOpenSettings}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold cursor-pointer border border-white/20 hover:scale-110 transition-transform overflow-hidden"
                title={`${user.username} - Settings`}
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                  user.username.charAt(0).toUpperCase()
                )}
              </div>
              <button
                onClick={onLogout}
                className="w-8 h-8 rounded-full hover:bg-red-500/20 flex items-center justify-center text-zinc-500 hover:text-red-500 transition-colors"
                title="Sign Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={onLogin}
              className="w-10 h-10 rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-accent-500 transition-colors mx-auto"
              title="Sign In"
            >
              <LogIn size={20} />
            </button>
          )}
        </div>
      </nav>
    </div>
  );
};

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`
      w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200 group relative
      ${active ? 'bg-zinc-100 dark:bg-white/10 text-black dark:text-white' : 'text-zinc-500 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5'}
    `}
    title={label}
  >
    {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-accent-500 rounded-r-full"></div>}
    {icon}
  </button>
);
