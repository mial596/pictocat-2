import React from 'react';
import { EditIcon, GameIcon, GiftIcon, UsersIcon, CatSilhouetteIcon } from '../hooks/Icons.tsx';

type ViewType = 'main' | 'games' | 'shop' | 'community' | 'admin' | 'gameplay';

interface BottomNavBarProps {
  activeView: ViewType;
  onNavigate: (view: ViewType) => void;
  onOpenAlbum: () => void;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeView, onNavigate, onOpenAlbum }) => {
  const navItems = [
    { view: 'main' as ViewType, label: 'Frases', icon: EditIcon },
    { view: 'games' as ViewType, label: 'Juegos', icon: GameIcon },
    { view: 'album' as 'album', label: 'Álbum', icon: CatSilhouetteIcon },
    { view: 'shop' as ViewType, label: 'Tienda', icon: GiftIcon },
    { view: 'community' as ViewType, label: 'Comunidad', icon: UsersIcon },
  ];

  const handleItemClick = (item: typeof navItems[0]) => {
    if (item.view === 'album') {
      onOpenAlbum();
    } else {
      onNavigate(item.view);
    }
  };
  
  // A set of views where the main navigation is considered active
  const mainActiveViews = new Set(['main', 'admin']);
  const gamesActiveViews = new Set(['games', 'gameplay']);


  return (
    <nav className="bottom-nav md:hidden">
      {navItems.map(item => {
        let isActive = false;
        if (item.view === 'main') isActive = mainActiveViews.has(activeView);
        else if (item.view === 'games') isActive = gamesActiveViews.has(activeView);
        else if (item.view !== 'album') isActive = activeView === item.view;

        return (
          <button 
            key={item.label}
            onClick={() => handleItemClick(item)} 
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon className="w-7 h-7 icon" />
            <span className="text-xs">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNavBar;
