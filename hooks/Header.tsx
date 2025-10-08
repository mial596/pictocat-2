import React from 'react';
import { CoinIcon, GameIcon, GiftIcon, StarIcon, AdminIcon, UsersIcon, EditIcon } from './Icons.tsx';
import { LOGO_URL } from '../constants.ts';

type ViewType = 'main' | 'games' | 'shop' | 'community' | 'admin' | 'gameplay';

interface HeaderProps {
  coins: number;
  playerLevel: number;
  playerXp: number;
  xpToNextLevel: number;
  onNavigate: (view: ViewType) => void;
  currentUser: string | null;
  onLogout: () => void;
  isAdmin: boolean;
  activeView: ViewType;
}

const Header: React.FC<HeaderProps> = ({ 
    coins, playerLevel, playerXp, xpToNextLevel, 
    onNavigate,
    onLogout, isAdmin, activeView
}) => {
  const xpPercentage = xpToNextLevel > 0 ? (playerXp / xpToNextLevel) * 100 : 0;
  
  const mainActiveViews = new Set(['main', 'admin']);
  const gamesActiveViews = new Set(['games', 'gameplay']);

  const getNavButtonClass = (view: ViewType) => {
    let isActive = false;
    if (view === 'main') isActive = mainActiveViews.has(activeView);
    else if (view === 'games') isActive = gamesActiveViews.has(activeView);
    else isActive = activeView === view;
    
    return `relative transition-colors duration-200 px-4 py-2 rounded-lg font-bold
            ${isActive ? 'bg-wheat text-liver' : 'text-liver/70 hover:bg-wheat/50 hover:text-liver'}`;
  };
  
  return (
    <header className="glass-nav top-0 left-0 right-0 z-40 flex items-center justify-between p-2 border-b-2">
      {/* Left side: Logo, Level and XP */}
      <div className="flex items-center gap-3">
        <button onClick={() => onNavigate('main')} className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-buff rounded-lg">
            <img src={LOGO_URL} alt="PictoCat Logo" className="w-12 h-12" />
        </button>
        <div className="flex items-center gap-3">
            <div className="flex items-center justify-center gap-1 bg-seasalt/80 w-12 h-12 rounded-full border-2 border-liver">
              <StarIcon className="w-6 h-6 text-yellow-400" />
              <span className="text-xl font-black">{playerLevel}</span>
            </div>
            <div className="w-32 md:w-40 hidden sm:block">
              <div className="h-4 bg-wheat rounded-full overflow-hidden border-2 border-liver shadow-inner">
                <div
                  className="h-full bg-buff transition-all duration-500"
                  style={{ width: `${xpPercentage}%` }}
                ></div>
              </div>
              <div className="text-xs text-center mt-1 font-medium text-liver/70 tracking-wider">{playerXp} / {xpToNextLevel} XP</div>
            </div>
        </div>
      </div>
      
      {/* Right side: Actions, Coins, User */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-2 bg-seasalt/60 p-1 rounded-xl border border-liver/20">
            <button onClick={() => onNavigate('main')} className={getNavButtonClass('main')}>
                <EditIcon className="w-5 h-5 inline-block mr-1 -mt-1" />
                <span>Mis Frases</span>
            </button>
            <button onClick={() => onNavigate('shop')} className={getNavButtonClass('shop')}>
                <GiftIcon className="w-5 h-5 inline-block mr-1 -mt-1" />
                <span>Tienda</span>
            </button>
            <button onClick={() => onNavigate('games')} className={getNavButtonClass('games')}>
                <GameIcon className="w-5 h-5 inline-block mr-1 -mt-1" />
                <span>Juegos</span>
            </button>
             <button onClick={() => onNavigate('community')} className={getNavButtonClass('community')}>
                <UsersIcon className="w-5 h-5 inline-block mr-1 -mt-1" />
                <span>Comunidad</span>
            </button>
            {isAdmin && (
                <button onClick={() => onNavigate('admin')} className={getNavButtonClass('admin')}>
                    <AdminIcon className="w-5 h-5 inline-block mr-1 -mt-1" />
                    <span>Admin</span>
                </button>
            )}
        </div>

        <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-seasalt/80 px-3 py-2 rounded-full h-10 border-2 border-liver">
                <CoinIcon className="w-6 h-6 text-yellow-500" />
                <span className="text-lg">{coins}</span>
            </div>
            <div className="h-8 w-px bg-liver/20 hidden sm:block"></div>
            <button onClick={onLogout} className="btn-cartoon btn-cartoon-danger text-sm px-3 py-2 h-10">
                Salir
            </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
