import React, { useState } from 'react';
import { Envelope, EnvelopeTypeId, PlayerStats, UpgradeId } from '../types.ts';
import { CoinIcon, EnvelopeIcon, LockIcon, MouseIcon, TimeIcon, StarIcon } from '../hooks/Icons.tsx';
import { ENVELOPES, UPGRADES, calculateEnvelopeCost } from '../shopData.ts';

interface ShopProps {
  coins: number;
  playerStats: PlayerStats;
  onPurchaseEnvelope: (envelopeId: EnvelopeTypeId) => void;
  onPurchaseUpgrade: (upgradeId: UpgradeId) => void;
  purchasedUpgrades: Set<UpgradeId>;
}

type Tab = 'envelopes' | 'upgrades';

const ShopModal: React.FC<ShopProps> = ({
  coins,
  playerStats,
  onPurchaseEnvelope,
  onPurchaseUpgrade,
  purchasedUpgrades
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('envelopes');

  const renderEnvelope = (envelope: Envelope) => {
    const cost = calculateEnvelopeCost(envelope, playerStats.level);
    const canAfford = coins >= cost;
    let colorClass = 'bg-buff';
    if(envelope.id === 'silver') colorClass = 'bg-uranian_blue';
    if(envelope.id === 'gold') colorClass = 'bg-yellow-400';

    return (
      <div key={envelope.id} className="card-cartoon p-4 flex flex-col items-center text-center">
        <div className={`w-24 h-24 mb-4 rounded-full flex items-center justify-center ${colorClass} border-4 border-liver`}>
          <EnvelopeIcon className="w-12 h-12 text-liver/80 drop-shadow-lg" />
        </div>
        <h3 className="text-xl font-black text-liver">{envelope.name}</h3>
        <p className="text-sm text-liver/80 flex-grow my-2">{envelope.description}</p>
        <div className="text-sm font-bold text-blue-600 mb-4 flex items-center gap-1">
            <StarIcon className="w-4 h-4" />
            <span>{envelope.xp} XP</span>
        </div>
        <button
          onClick={() => onPurchaseEnvelope(envelope.id)}
          disabled={!canAfford}
          className="w-full flex items-center justify-center gap-2 btn-cartoon btn-cartoon-primary"
        >
          <CoinIcon className="w-5 h-5" />
          <span>{cost}</span>
        </button>
      </div>
    );
  };
  
  const renderUpgrade = (upgrade: typeof UPGRADES[string]) => {
      const isPurchased = purchasedUpgrades.has(upgrade.id);
      const isLocked = playerStats.level < upgrade.levelRequired;
      const canAfford = coins >= upgrade.cost;
      const canPurchase = !isPurchased && !isLocked && canAfford;

      let Icon;
      if (upgrade.icon === 'coin') Icon = CoinIcon;
      else if (upgrade.icon === 'mouse') Icon = MouseIcon;
      else Icon = TimeIcon;

      return (
        <div key={upgrade.id} className="card-cartoon p-4 flex gap-4 items-center">
            <div className="bg-wheat p-3 rounded-full border-2 border-liver">
                <Icon className="w-8 h-8 text-liver" />
            </div>
            <div className="flex-grow">
                <h3 className="font-bold text-liver">{upgrade.name}</h3>
                <p className="text-sm text-liver/80">{upgrade.description}</p>
                 {isLocked && <p className="text-xs text-red-500 font-bold">Requiere nivel {upgrade.levelRequired}</p>}
            </div>
            {isPurchased ? (
                 <span className="font-bold text-green-600 text-sm">Comprado</span>
            ) : isLocked ? (
                <div className="flex items-center gap-2 text-slate-500 font-bold py-2 px-4 rounded-full bg-slate-300 border-2 border-slate-400">
                    <LockIcon className="w-5 h-5"/>
                    <span>{upgrade.cost}</span>
                </div>
            ) : (
                <button 
                    onClick={() => onPurchaseUpgrade(upgrade.id)} 
                    disabled={!canPurchase}
                    className="flex items-center gap-2 btn-cartoon btn-cartoon-primary"
                >
                    <CoinIcon className="w-5 h-5"/>
                    <span>{upgrade.cost}</span>
                </button>
            )}
        </div>
      )
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6">
        <header className="text-center mb-6">
          <h2 id="shop-title" className="text-3xl sm:text-4xl font-black text-liver">Tienda</h2>
          <p className="text-liver/80 mt-1">¡Gasta tus monedas para obtener nuevos gatos y mejoras!</p>
        </header>

        <div className="border-b-2 border-liver/20 mb-4 flex justify-center">
            <nav className="flex space-x-2 sm:space-x-6" role="tablist" aria-label="Categorías de la tienda">
                <button
                    onClick={() => setActiveTab('envelopes')}
                    className={`${activeTab === 'envelopes' ? 'border-buff text-liver' : 'border-transparent text-liver/60 hover:text-liver hover:border-liver/30'} whitespace-nowrap py-3 px-1 border-b-4 font-bold text-lg transition-colors`}
                    role="tab"
                    id="tab-envelopes"
                    aria-selected={activeTab === 'envelopes'}
                    aria-controls="panel-envelopes"
                >
                    Sobres de Gatos
                </button>
                 <button
                    onClick={() => setActiveTab('upgrades')}
                    className={`${activeTab === 'upgrades' ? 'border-buff text-liver' : 'border-transparent text-liver/60 hover:text-liver hover:border-liver/30'} whitespace-nowrap py-3 px-1 border-b-4 font-bold text-lg transition-colors`}
                    role="tab"
                    id="tab-upgrades"
                    aria-selected={activeTab === 'upgrades'}
                    aria-controls="panel-upgrades"
                 >
                    Mejoras
                </button>
            </nav>
        </div>

        <main className="bg-wheat rounded-lg p-3 border-2 border-liver/20">
            {activeTab === 'envelopes' && (
                <div
                    id="panel-envelopes"
                    role="tabpanel"
                    aria-labelledby="tab-envelopes"
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
                >
                    {Object.values(ENVELOPES).map(renderEnvelope)}
                </div>
            )}
             {activeTab === 'upgrades' && (
                <div
                    id="panel-upgrades"
                    role="tabpanel"
                    aria-labelledby="tab-upgrades"
                    className="flex flex-col gap-4"
                >
                    {Object.values(UPGRADES).map(renderUpgrade)}
                </div>
            )}
        </main>
    </div>
  );
};

export default ShopModal;
