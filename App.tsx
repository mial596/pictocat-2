import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

// Components
import Header from './hooks/Header.tsx';
import PhraseCard from './components/PhraseCard.tsx';
import FullDisplay from './components/FullDisplay.tsx';
import ImageSelector from './components/ImageSelector.tsx';
import ShopModal from './components/ShopModal.tsx';
import EnvelopeModal from './components/EnvelopeModal.tsx';
import Album from './components/Album.tsx';
import CustomPhraseModal from './components/CustomPhraseModal.tsx';
import GameModeSelector from './components/GameModeSelector.tsx';
import MouseHuntGame from './components/MouseHuntGame.tsx';
import CatMemoryGame from './components/CatMemoryGame.tsx';
import SimonSaysGame from './components/SimonSaysGame.tsx';
import CatTriviaGame from './components/CatTriviaGame.tsx';
import FelineRhythmGame from './components/FelineRhythmGame.tsx';
import Auth from './components/Auth.tsx';
import Toast from './components/Toast.tsx';
import AdminPanel from './components/AdminPanel.tsx';
import UserSearch from './components/UserSearch.tsx';
import PublicProfile from './components/PublicProfile.tsx';
import BottomNavBar from './components/BottomNavBar.tsx'; // New component for mobile navigation
import { PlusIcon, CatSilhouetteIcon, SpinnerIcon } from './hooks/Icons.tsx';

// Services
import { speak, soundService } from './services/audioService.ts';
import * as api from './services/apiService.ts';
import { useDebounce } from './hooks/useDebounce.ts';

// Types
import { 
  Phrase, CatImage, EnvelopeTypeId, UserProfile, UserData, GameMode, 
  CatMemoryMode, CatTriviaMode, FelineRhythmMode, PublicProfileData
} from './types.ts';
import { ENVELOPES, UPGRADES } from './shopData.ts';

// Main App Component
const App: React.FC = () => {
    // Auth State from Auth0
    const { isAuthenticated, isLoading: isAuthLoading, getAccessTokenSilently, logout } = useAuth0();

    // App State
    const [isAppLoading, setIsAppLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const pollingIntervalRef = useRef<number | null>(null);
    const pollCountRef = useRef(0);
    const [catCatalog, setCatCatalog] = useState<CatImage[]>([]);
    const [initError, setInitError] = useState<string | null>(null);

    // UI State
    type ModalType = 'envelope' | 'imageSelector' | 'album' | 'customPhrase' | null;
    const [activeModal, setActiveModal] = useState<ModalType>(null);
    type ViewType = 'main' | 'games' | 'shop' | 'community' | 'admin' | 'gameplay';
    const [activeView, setActiveView] = useState<ViewType>('main');
    
    const [displayedPhrase, setDisplayedPhrase] = useState<{ phrase: Phrase; image: CatImage | null } | null>(null);
    const [phraseToSelectImageFor, setPhraseToSelectImageFor] = useState<Phrase | null>(null);
    const [phraseToEdit, setPhraseToEdit] = useState<Phrase | null>(null);
    const [newlyUnlockedImages, setNewlyUnlockedImages] = useState<CatImage[]>([]);
    const [openedEnvelopeName, setOpenedEnvelopeName] = useState('');
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
    const [activeGameMode, setActiveGameMode] = useState<GameMode | null>(null);

    // Community State
    const [viewingUsername, setViewingUsername] = useState<string | null>(null);
    const [publicProfileData, setPublicProfileData] = useState<PublicProfileData | null>(null);
    const [profileError, setProfileError] = useState('');
    const [isProfileLoading, setIsProfileLoading] = useState(false);
    
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToastMessage(message);
        setToastType(type);
    };

    // Derived State
    const unlockedImages = useMemo(() => {
        if (!userProfile?.data || catCatalog.length === 0) return [];
        const unlockedIds = new Set(userProfile.data.unlockedImageIds);
        return catCatalog.filter(img => unlockedIds.has(img.id));
    }, [userProfile?.data, catCatalog]);

    const getImageForPhrase = useCallback((phrase: Phrase): CatImage | null => {
        if (!phrase.selectedImageId) return null;
        return catCatalog.find(img => img.id === phrase.selectedImageId) || null;
    }, [catCatalog]);
    
    const purchasedUpgrades = useMemo(() => new Set(userProfile?.data.purchasedUpgrades || []), [userProfile]);

    const handleLogout = () => {
        console.log("Logout triggered. Redirecting to Auth0 to clear session.");
        logout({ logoutParams: { returnTo: window.location.origin } });
    };

    const fetchInitialData = useCallback(async () => {
        if (!isAuthenticated) {
            setIsAppLoading(false);
            return;
        }
        setIsAppLoading(true);
        setInitError(null);
        try {
            const token = await getAccessTokenSilently();
            const catalog = await api.getCatCatalog();
            setCatCatalog(catalog);

            const profile = await api.getUserProfile(token);
            if (profile) {
                setUserProfile(profile);
            } else {
                console.warn("User is logged in, but profile not found on initial load.");
            }
        } catch (error) {
            console.error("Failed to fetch initial data.", error);
            setInitError("No se pudieron cargar tus datos. Por favor, intenta refrescar la página o inicia sesión de nuevo.");
            showToast('Error al cargar datos iniciales.', 'error');
        } finally {
            setIsAppLoading(false);
        }
    }, [isAuthenticated, getAccessTokenSilently]);

    useEffect(() => {
        soundService.init();
        fetchInitialData();
    }, [fetchInitialData]);
    
    useEffect(() => {
        const stopPolling = () => {
             if (pollingIntervalRef.current) {
                console.log("Stopping polling.");
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        }

        if (isAuthenticated && !userProfile && !isAuthLoading && !isAppLoading && !initError) {
            stopPolling();
            pollCountRef.current = 0;
            console.log("User logged in, but profile is missing. Starting to poll.");
            pollingIntervalRef.current = window.setInterval(async () => {
                pollCountRef.current += 1;
                console.log(`Polling for user profile... (Attempt ${pollCountRef.current})`);

                if (pollCountRef.current > 10) {
                    console.error("Polling timed out. Could not fetch user profile.");
                    setInitError("No se pudo configurar tu perfil. Por favor, intenta iniciar sesión de nuevo.");
                    stopPolling();
                    return;
                }

                try {
                    const token = await getAccessTokenSilently();
                    const profile = await api.getUserProfile(token);
                    if (profile) {
                        console.log("Profile found!");
                        setUserProfile(profile);
                        stopPolling();
                    }
                } catch (error) {
                    console.error("Polling error:", error);
                    setInitError("Hubo un problema al configurar tu cuenta. Por favor, intenta iniciar sesión de nuevo.");
                    stopPolling();
                }
            }, 3000);
        }

        return stopPolling;
    }, [isAuthenticated, userProfile, isAuthLoading, isAppLoading, getAccessTokenSilently, initError]);

    const saveProfileData = useCallback(async (data: UserData) => {
        try {
            const token = await getAccessTokenSilently();
            await api.saveUserData(token, data);
        } catch (error) {
            console.error("Failed to save user data", error);
            showToast("Error al guardar tu progreso.", 'error');
        }
    }, [getAccessTokenSilently]);

    useDebounce(() => {
        if (userProfile?.data) {
            saveProfileData(userProfile.data);
        }
    }, 1500, [userProfile?.data, saveProfileData]);
    
    const updateUserData = (updater: (draft: UserData) => UserData | void) => {
        setUserProfile(currentProfile => {
            if (!currentProfile || !currentProfile.data) return currentProfile;
            const draft = JSON.parse(JSON.stringify(currentProfile.data));
            const result = updater(draft);
            return { ...currentProfile, data: result || draft };
        });
    };

    const handleDisplayPhrase = (phrase: Phrase, image: CatImage | null) => setDisplayedPhrase({ phrase, image });

    const handleSelectImageForPhrase = (phraseId: string) => {
        const phrase = userProfile?.data.phrases.find(p => p.id === phraseId);
        if (phrase) {
            setPhraseToSelectImageFor(phrase);
            setActiveModal('imageSelector');
        }
    };
    
    const handleEditPhrase = (phraseId: string) => {
        const phrase = userProfile?.data.phrases.find(p => p.id === phraseId);
        if (phrase) {
            setPhraseToEdit(phrase);
            setActiveModal('customPhrase');
        }
    }

    const handleSaveImageSelection = (phraseId: string, imageId: number | null) => {
        soundService.play('select');
        updateUserData(draft => {
            const phrase = draft.phrases.find(p => p.id === phraseId);
            if (phrase) phrase.selectedImageId = imageId;
        });
        setActiveModal(null);
    };

    const handlePurchaseEnvelope = (envelopeId: EnvelopeTypeId) => {
        if (!userProfile?.data) return;
        const envelope = ENVELOPES[envelopeId];
        const cost = envelope.baseCost + ((userProfile.data.playerStats.level - 1) * envelope.costIncreasePerLevel);

        if (userProfile.data.coins < cost) {
            showToast('¡No tienes suficientes monedas!', 'error');
            return;
        }
        const currentUnlockedIds = new Set(userProfile.data.unlockedImageIds);
        const lockedImages = catCatalog.filter(img => !currentUnlockedIds.has(img.id));
        if(lockedImages.length === 0) {
            showToast("¡Ya has desbloqueado todos los gatos!", 'info');
            return;
        }
        const newImages: CatImage[] = [];
        for (let i = 0; i < envelope.imageCount; i++) {
            if (lockedImages.length > newImages.length) {
                const availableToUnlock = lockedImages.filter(img => !newImages.some(nImg => nImg.id === img.id));
                if (availableToUnlock.length > 0) {
                    const randomIndex = Math.floor(Math.random() * availableToUnlock.length);
                    newImages.push(availableToUnlock[randomIndex]);
                }
            }
        }
        if (newImages.length > 0) {
            soundService.play('purchase');
            updateUserData(draft => {
                draft.coins -= cost;
                draft.unlockedImageIds.push(...newImages.map(img => img.id));
                draft.playerStats.xp += envelope.xp;
                if (draft.playerStats.xp >= draft.playerStats.xpToNextLevel) {
                    draft.playerStats.level += 1;
                    draft.playerStats.xp -= draft.playerStats.xpToNextLevel;
                    draft.playerStats.xpToNextLevel = Math.floor(draft.playerStats.xpToNextLevel * 1.5);
                    showToast(`¡Subiste al nivel ${draft.playerStats.level}!`, 'success');
                }
            });
            setNewlyUnlockedImages(newImages);
            setOpenedEnvelopeName(envelope.name);
            setActiveModal('envelope');
            setActiveView('main');
        }
    };
    
    const handlePurchaseUpgrade = (upgradeId: string) => {
        const upgrade = UPGRADES[upgradeId];
        if (!upgrade || !userProfile?.data) return;
        if (userProfile.data.coins >= upgrade.cost && 
            userProfile.data.playerStats.level >= upgrade.levelRequired &&
            !purchasedUpgrades.has(upgrade.id as any)) {
            soundService.play('purchase');
            updateUserData(draft => {
                draft.coins -= upgrade.cost;
                draft.purchasedUpgrades.push(upgrade.id as any);
            });
            showToast(`¡Mejora "${upgrade.name}" comprada!`, 'success');
        }
    };
    
    const handleSaveCustomPhrase = async (data: { text: string; selectedImageId: number | null; isPublic: boolean }) => {
        soundService.play('select');
        const phrase = phraseToEdit ? { ...phraseToEdit, ...data } : {
            id: `custom_${Date.now()}`,
            text: data.text,
            selectedImageId: data.selectedImageId,
            isCustom: true,
            isPublic: data.isPublic
        };
        updateUserData(draft => {
            if (phraseToEdit) {
                const index = draft.phrases.findIndex(p => p.id === phraseToEdit.id);
                if (index > -1) draft.phrases[index] = phrase;
            } else {
                draft.phrases.push(phrase);
            }
        });
        const image = catCatalog.find(img => img.id === data.selectedImageId);
        if (image) {
            const token = await getAccessTokenSilently();
            await api.publishPhrase(token, phrase, image, data.isPublic);
        }
        setActiveModal(null);
        setPhraseToEdit(null);
    };
    
    const handleDeleteCustomPhrase = async (phraseId: string) => {
         soundService.play('favoriteOff');
         const phraseToDelete = userProfile?.data.phrases.find(p => p.id === phraseId);
         updateUserData(draft => {
            draft.phrases = draft.phrases.filter(p => p.id !== phraseId);
         });
         if (phraseToDelete?.isPublic) {
            const image = catCatalog.find(img => img.id === phraseToDelete.selectedImageId);
            if (image) {
                 const token = await getAccessTokenSilently();
                 await api.publishPhrase(token, phraseToDelete, image, false);
            }
         }
         setActiveModal(null);
         setPhraseToEdit(null);
    };

    const handleSelectGameMode = (mode: GameMode) => {
        setActiveGameMode(mode);
        setActiveView('gameplay');
    };
    
    const handleGameEnd = (results: { score: number, coinsEarned: number, xpEarned: number }) => {
        let finalCoins = results.coinsEarned;
        if (purchasedUpgrades.has('goldenPaw')) {
            finalCoins = Math.ceil(finalCoins * 1.5);
        }
        showToast(`¡Ganaste ${finalCoins} monedas y ${results.xpEarned} XP!`, 'success');
        updateUserData(draft => {
            draft.coins += finalCoins;
            draft.playerStats.xp += results.xpEarned;
            if (draft.playerStats.xp >= draft.playerStats.xpToNextLevel) {
                draft.playerStats.level += 1;
                draft.playerStats.xp -= draft.playerStats.xpToNextLevel;
                draft.playerStats.xpToNextLevel = Math.floor(draft.playerStats.xpToNextLevel * 1.5);
                showToast(`¡Subiste al nivel ${draft.playerStats.level}!`, 'success');
            }
        });
        setActiveGameMode(null);
        setActiveView('games');
    };

    const handleSelectUser = async (username: string) => {
        setIsProfileLoading(true);
        setViewingUsername(username);
        setProfileError('');
        setPublicProfileData(null);
        try {
            const token = await getAccessTokenSilently();
            const data = await api.getPublicProfile(token, username);
            setPublicProfileData(data);
        } catch (error) {
            console.error("Failed to load profile", error);
            setProfileError('No se pudo cargar el perfil de este usuario.');
        } finally {
            setIsProfileLoading(false);
        }
    };

    const handleBackToSearch = () => {
        setViewingUsername(null);
        setPublicProfileData(null);
        setProfileError('');
    };
    
    if (isAuthLoading || isAppLoading) {
        return <div className="fixed inset-0 flex items-center justify-center text-2xl font-bold text-liver bg-seasalt">Cargando...</div>;
    }
    
    if (initError) {
        return (
            <div className="fixed inset-0 flex flex-col items-center justify-center p-4 bg-wheat text-center">
                <h1 className="text-2xl font-bold text-liver mb-4">¡Oops! Algo salió mal</h1>
                <p className="text-liver/80 mb-6 max-w-md">{initError}</p>
                <button
                    onClick={handleLogout}
                    className="btn-cartoon btn-cartoon-danger"
                >
                    Cerrar Sesión
                </button>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Auth />;
    }

    if (!userProfile) {
        return (
            <div className="fixed inset-0 flex flex-col items-center justify-center p-4 bg-seasalt">
                 <div className="text-center">
                    <SpinnerIcon className="w-12 h-12 animate-spin text-liver mx-auto" />
                    <h1 className="text-2xl font-bold text-liver mt-4">Configurando tu cuenta...</h1>
                    <p className="text-liver/80 mt-2">Esto puede tardar unos segundos. ¡Gracias por tu paciencia!</p>
                </div>
            </div>
        );
    }
    
    const renderGame = () => {
        if (!activeGameMode) return null;
        switch(activeGameMode.gameId) {
            case 'mouseHunt':
                return <MouseHuntGame mode={activeGameMode} upgrades={{ betterBait: purchasedUpgrades.has('betterBait'), extraTime: purchasedUpgrades.has('extraTime') }} onGameEnd={handleGameEnd} />;
            case 'catMemory':
                return <CatMemoryGame mode={activeGameMode as CatMemoryMode} images={unlockedImages} onGameEnd={handleGameEnd} />;
            case 'simonSays':
                return <SimonSaysGame mode={activeGameMode} onGameEnd={handleGameEnd} />;
            case 'catTrivia':
                 return <CatTriviaGame mode={activeGameMode as CatTriviaMode} images={unlockedImages} onGameEnd={handleGameEnd} />;
            case 'felineRhythm':
                return <FelineRhythmGame mode={activeGameMode as FelineRhythmMode} onGameEnd={handleGameEnd} />;
            default:
                return null;
        }
    }
    
    const renderView = () => {
        switch(activeView) {
            case 'gameplay':
                return <div className="flex-grow flex items-center justify-center p-4">{renderGame()}</div>;
            case 'games':
                return <GameModeSelector onSelectMode={handleSelectGameMode} unlockedImagesCount={unlockedImages.length} />;
            case 'shop':
                return <ShopModal coins={userProfile.data.coins} playerStats={userProfile.data.playerStats} onPurchaseEnvelope={handlePurchaseEnvelope} onPurchaseUpgrade={handlePurchaseUpgrade} purchasedUpgrades={purchasedUpgrades} />;
            case 'community':
                if (viewingUsername) {
                    return <PublicProfile profileData={publicProfileData} error={profileError} onBack={handleBackToSearch} />;
                }
                return <UserSearch onSelectUser={handleSelectUser} />;
            case 'admin':
                return <AdminPanel />;
            case 'main':
            default:
                return (
                     <main className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {userProfile.data.phrases.map(phrase => (
                            <PhraseCard
                                key={phrase.id}
                                phrase={phrase}
                                image={getImageForPhrase(phrase)}
                                onSelectImage={handleSelectImageForPhrase}
                                onDisplay={handleDisplayPhrase}
                                onSpeak={speak}
                                onEditPhrase={handleEditPhrase}
                            />
                        ))}
                        <button 
                            onClick={() => { setPhraseToEdit(null); setActiveModal('customPhrase'); }}
                            className="card-cartoon-add group"
                        >
                            <PlusIcon className="w-12 h-12 text-liver/30 group-hover:text-buff transition-colors" />
                            <span className="font-bold text-liver/50 group-hover:text-liver transition-colors">Nueva Frase</span>
                        </button>
                    </main>
                );
        }
    }

    return (
        <div className="flex flex-col min-h-screen bg-seasalt pt-[80px] pb-20 md:pb-0">
            <Header
                coins={userProfile.data.coins}
                playerLevel={userProfile.data.playerStats.level}
                playerXp={userProfile.data.playerStats.xp}
                xpToNextLevel={userProfile.data.playerStats.xpToNextLevel}
                onNavigate={setActiveView}
                currentUser={userProfile.email}
                onLogout={handleLogout}
                isAdmin={userProfile.role === 'admin'}
                activeView={activeView}
            />

            <div className="flex-grow">
              {renderView()}
            </div>
            
            <BottomNavBar activeView={activeView} onNavigate={setActiveView} onOpenAlbum={() => setActiveModal('album')} />

            {/* Modals */}
            {displayedPhrase && (
                <FullDisplay
                    phrase={displayedPhrase.phrase}
                    image={displayedPhrase.image}
                    onClose={() => setDisplayedPhrase(null)}
                />
            )}
            <ImageSelector
                isOpen={activeModal === 'imageSelector'}
                onClose={() => setActiveModal(null)}
                onSelectImage={handleSaveImageSelection}
                phrase={phraseToSelectImageFor}
                unlockedImages={unlockedImages}
            />
            <EnvelopeModal
                isOpen={activeModal === 'envelope'}
                onClose={() => { setActiveModal(null); soundService.play('openEnvelope'); }}
                newImages={newlyUnlockedImages}
                envelopeName={openedEnvelopeName}
            />
             <Album
                isOpen={activeModal === 'album'}
                onClose={() => setActiveModal(null)}
                unlockedImages={unlockedImages}
            />
            <CustomPhraseModal 
                isOpen={activeModal === 'customPhrase'}
                onClose={() => { setActiveModal(null); setPhraseToEdit(null); }}
                onSave={handleSaveCustomPhrase}
                onDelete={handleDeleteCustomPhrase}
                phraseToEdit={phraseToEdit}
                unlockedImages={unlockedImages}
            />
            
            {toastMessage && <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage('')} />}
        </div>
    );
};

export default App;
