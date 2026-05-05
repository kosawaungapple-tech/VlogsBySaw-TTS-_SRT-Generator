import React from 'react';
import { Mic2, Globe, Settings } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface HeaderProps {
  isAccessGranted: boolean;
  isAdmin: boolean;
  apiKeyStatus: { state: 'admin' | 'personal' | 'none'; label: string };
  userControl?: import('../types').VBSUserControl | null;
  activeTab: string;
  setActiveTab: (tab: any) => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  isAccessGranted,
  isAdmin,
  apiKeyStatus,
  userControl,
  activeTab: _activeTab,
  setActiveTab
}) => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-2xl transition-all duration-300">
      <div className="container mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => {
            window.history.pushState({}, '', '/');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
        >
          <div className="w-11 h-11 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl group-hover:scale-105 group-hover:border-amber-400/50 transition-all duration-500 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <Mic2 className="text-amber-400 w-6 h-6 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tight text-white leading-none">
              Vlogs <span className="text-amber-400">By Saw</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-500 leading-none">
                AI STUDIO
              </p>
              
              {/* API Key Status Dot */}
              {isAccessGranted && (
                <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    apiKeyStatus.state !== 'none' ? 'bg-amber-400 shadow-[0_0_8px_rgba(234,179,8,0.5)]' : 
                    'bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                  }`} />
                  <span className={`text-[8px] font-black uppercase tracking-wider hidden xs:inline ${
                    apiKeyStatus.state !== 'none' ? 'text-amber-400' : 
                    'text-rose-500'
                  }`}>
                    {apiKeyStatus.state === 'none' ? 'OFFLINE' : apiKeyStatus.state === 'admin' ? 'SYSTEM' : 'PERSONAL'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Credits Display */}
          {isAccessGranted && userControl && (
            <div className="hidden sm:flex items-center gap-2 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CREDITS</span>
              <span className={`text-sm font-black font-mono ${
                (userControl.credits || 0) > 0 ? 'text-amber-400' : 'text-rose-500'
              }`}>
                {userControl.credits || 0}
              </span>
            </div>
          )}

          <button
            onClick={() => setLanguage(language === 'mm' ? 'en' : 'mm')}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-2xl border transition-all text-xs font-black uppercase tracking-widest h-11 shadow-sm shrink-0 min-w-[120px] ${
              language === 'mm' 
                ? 'bg-amber-400/10 text-amber-500 border-amber-400/20 hover:bg-amber-400/20' 
                : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
            }`}
          >
            <Globe size={14} className="shrink-0" />
            <span>{language === 'mm' ? 'Burmese' : 'English'}</span>
          </button>

          <button
            onClick={() => setActiveTab('tools')}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-amber-400 hover:bg-white/10 transition-all shadow-sm"
            title={t('nav.settings')}
          >
            <Settings size={20} />
          </button>

          {isAccessGranted && isAdmin && (
            <button 
              onClick={() => {
                window.history.pushState({}, '', '/vbs-admin');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="px-6 py-2 bg-amber-400 text-black rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-amber-400/20"
            >
              ADMIN
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
