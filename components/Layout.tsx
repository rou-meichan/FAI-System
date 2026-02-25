
import React, { useState } from 'react';
import { User, UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  onProfileClick: () => void;
  onLogoClick: () => void;
  currentView: string;
  onViewChange: (view: any) => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  user, 
  onLogout, 
  onProfileClick, 
  onLogoClick,
  currentView,
  onViewChange
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isIQA = user.role === 'IQA';

  const navItems = isIQA ? [
    { id: 'DASHBOARD', label: 'Dashboard', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    )},
    { id: 'FAI_REQUESTS', label: 'FAI Requests', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    )},
    { id: 'SUPPLIERS', label: 'Account Management', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )},
  ] : [];

  const handleNavClick = (viewId: string) => {
    onViewChange(viewId);
    setIsSidebarOpen(false);
  };

  const handleSidebarProfileClick = () => {
    onProfileClick();
    setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 h-16 sticky top-0 z-40 flex items-center px-4 sm:px-8 shadow-sm">
        <div className="flex items-center gap-4">
          {/* Menu Icon - ONLY visible for IQA role */}
          {isIQA && (
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-slate-600 hover:bg-slate-100 hover:text-indigo-600 rounded-xl transition-all active:scale-95"
              aria-label="Open Menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
          )}
          
          <div className="flex items-center gap-2 cursor-pointer" onClick={onLogoClick}>
            <div className="bg-indigo-600 p-1.5 rounded-lg shadow-md shadow-indigo-100">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="hidden sm:inline-block font-black text-slate-900 tracking-tight text-lg">FAI Agent</span>
          </div>
        </div>

        <div className="flex-1"></div>

        <div className="flex items-center gap-3 md:gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100">
            <span className={`w-2 h-2 rounded-full ${isIQA ? 'bg-amber-400' : 'bg-indigo-400'}`}></span>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">{user.organization}</span>
          </div>
          
          <div className="relative group">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black cursor-pointer group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm overflow-hidden">
              {user.name[0]}
            </div>
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[60]">
              <button 
                onClick={onProfileClick}
                className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile Settings
              </button>
              <button 
                onClick={onLogout}
                className="w-full text-left px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar Overlay - Unified for all screen sizes (Drawer behavior) - ONLY for IQA */}
      {isIQA && (
        <div 
          className={`fixed inset-0 z-50 transition-all duration-300 ${
            isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Blurred Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          ></div>

          {/* The Sidebar Itself */}
          <aside 
            className={`absolute left-0 top-0 h-full w-72 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            {/* Sidebar Header */}
            <div className="p-6 flex items-center justify-between border-b border-slate-50">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-100">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <span className="text-xl font-bold tracking-tight text-slate-900">FAI Agent</span>
                  <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.2em]">Compliance v2.0</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
              <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Navigation</p>
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-black transition-all group ${
                    currentView === item.id 
                      ? 'bg-indigo-50 text-indigo-600 shadow-sm' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                  }`}
                >
                  <span className={`transition-colors ${currentView === item.id ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-500'}`}>
                    {item.icon}
                  </span>
                  {item.label}
                  {currentView === item.id && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
                  )}
                </button>
              ))}
            </nav>

            {/* Sidebar Footer / User Profile Card */}
            <div className="p-4 border-t border-slate-50 bg-slate-50/50">
              <button 
                onClick={handleSidebarProfileClick}
                className="w-full bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:border-indigo-600 hover:shadow-md transition-all group text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  {user.name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{user.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">View Account</p>
                </div>
                <svg className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button 
                onClick={onLogout}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black text-rose-600 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7" />
                </svg>
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">© 2024 FAI Digital Agent System</p>
          <div className="flex gap-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <a href="#" className="hover:text-indigo-600">Documentation</a>
            <a href="#" className="hover:text-indigo-600">Compliance Standards</a>
            <a href="#" className="hover:text-indigo-600">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
