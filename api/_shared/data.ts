// api/_shared/data.ts
import { Phrase, PlayerStats, UpgradeId, UserData } from '../../types';

// Backend constants
const INITIAL_PHRASES: Phrase[] = [
  { id: 'yes', text: 'Sí', selectedImageId: null, isCustom: false, isPublic: false },
  { id: 'no', text: 'No', selectedImageId: null, isCustom: false, isPublic: false },
  { id: 'happy', text: 'Me siento feliz', selectedImageId: null, isCustom: false, isPublic: false },
  { id: 'sad', text: 'Me siento triste', selectedImageId: null, isCustom: false, isPublic: false },
  { id: 'help', text: 'Necesito ayuda', selectedImageId: null, isCustom: false, isPublic: false }
];

const INITIAL_UNLOCKED_IMAGE_IDS: number[] = [];

// Backend function to generate initial user data
export const getInitialUserData = (): UserData => ({
    phrases: INITIAL_PHRASES.map(p => ({ ...p })), // Ensure a fresh copy is returned
    coins: 500,
    unlockedImageIds: [...INITIAL_UNLOCKED_IMAGE_IDS],
    playerStats: { level: 1, xp: 0, xpToNextLevel: 100 },
    purchasedUpgrades: [],
});
