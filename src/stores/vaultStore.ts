import { useState, useEffect } from 'react';
import {
  VaultItemSummary,
  Folder,
  Tag,
  SecurityAnalysis,
  AppSettings,
} from '../types';
import { vaultNative, biometricNative } from '../services/nativeBridge';
import { setLanguage } from '../i18n';
import { setTheme } from '../theme/colors';

export type VaultLockState = 'CHECKING' | 'UNINITIALIZED' | 'LOCKED' | 'UNLOCKED';

interface VaultStoreState {
  lockState: VaultLockState;
  summaries: VaultItemSummary[];
  folders: Folder[];
  tags: Tag[];
  securityAnalysis: SecurityAnalysis | null;
  settings: AppSettings;
  isBiometricSupported: boolean;
  isBiometricAvailable: boolean;
  activeFilterType: string;
  activeFolderId: string | null;
  favoritesOnly: boolean;
  searchQuery: string;
  sortOrder: string;
  isLoading: boolean;
  errorMessage: string | null;
}

let state: VaultStoreState = {
  lockState: 'CHECKING',
  summaries: [],
  folders: [],
  tags: [],
  securityAnalysis: null,
  settings: {
    autoLockSeconds: 300,
    biometricEnabled: false,
    screenSecurity: true,
    clipboardClearSeconds: 30,
    language: 'en',
    theme: 'dark',
    showWebsiteIcons: true,
  },
  isBiometricSupported: false,
  isBiometricAvailable: false,
  activeFilterType: 'ALL',
  activeFolderId: null,
  favoritesOnly: false,
  searchQuery: '',
  sortOrder: 'updated_desc',
  isLoading: false,
  errorMessage: null,
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(cb => cb());
}

function updateState(partial: Partial<VaultStoreState>) {
  state = { ...state, ...partial };
  notify();
}

export const vaultStore = {
  getState: () => state,

  checkInitialStatus: async () => {
    updateState({ isLoading: true });
    try {
      const isInit = await vaultNative.isInitialized();
      if (!isInit) {
        updateState({ lockState: 'UNINITIALIZED', isLoading: false });
        return;
      }

      const rawState = await vaultNative.getVaultState();
      const bioAuth = await biometricNative.canAuthenticate();
      const bioAvailable = await biometricNative.isBiometricUnlockAvailable();

      updateState({
        lockState: rawState === 'UNLOCKED' ? 'UNLOCKED' : 'LOCKED',
        isBiometricSupported: bioAuth.isSupported,
        isBiometricAvailable: bioAvailable,
        isLoading: false,
      });

      if (rawState === 'UNLOCKED') {
        await vaultStore.refreshVaultData();
      } else {
        try {
          const settings = await vaultNative.getSettings();
          if (settings?.theme) {
            setTheme(settings.theme);
          }
          if (settings?.language) {
            setLanguage(settings.language);
          }
          if (settings) {
            updateState({ settings });
          }
        } catch {
          // Ignored
        }
      }
    } catch (e: any) {
      updateState({ lockState: 'LOCKED', isLoading: false, errorMessage: e?.message });
    }
  },


  initializeVault: async (masterPassword: string) => {
    updateState({ isLoading: true, errorMessage: null });
    try {
      await vaultNative.initializeVault(masterPassword);
      updateState({ lockState: 'UNLOCKED', isLoading: false });
      await vaultStore.refreshVaultData();
      return true;
    } catch (e: any) {
      updateState({ isLoading: false, errorMessage: e?.message || 'Setup failed' });
      throw e;
    }
  },

  unlock: async (masterPassword: string) => {
    updateState({ isLoading: true, errorMessage: null });
    try {
      const success = await vaultNative.unlock(masterPassword);
      if (success) {
        updateState({ lockState: 'UNLOCKED', isLoading: false });
        await vaultStore.refreshVaultData();
        return true;
      }
      return false;
    } catch (e: any) {
      updateState({ isLoading: false, errorMessage: e?.message || 'Authentication failed' });
      throw e;
    }
  },

  unlockWithBiometrics: async () => {
    updateState({ isLoading: true, errorMessage: null });
    try {
      const success = await biometricNative.authenticate();
      if (success) {
        updateState({ lockState: 'UNLOCKED', isLoading: false });
        await vaultStore.refreshVaultData();
        return true;
      }
      updateState({ isLoading: false });
      return false;
    } catch (e: any) {
      updateState({ isLoading: false, errorMessage: e?.message });
      throw e;
    }
  },

  enableBiometrics: async (masterPassword: string) => {
    updateState({ isLoading: true, errorMessage: null });
    try {
      const success = await biometricNative.enableBiometricsWithPassword(masterPassword);
      if (success) {
        updateState({ isBiometricAvailable: true, isLoading: false });
        await vaultStore.refreshVaultData();
        return true;
      }
      updateState({ isLoading: false });
      return false;
    } catch (e: any) {
      updateState({ isLoading: false, errorMessage: e?.message });
      throw e;
    }
  },

  disableBiometrics: async () => {
    updateState({ isLoading: true, errorMessage: null });
    try {
      const success = await biometricNative.disableBiometrics();
      if (success) {
        updateState({ isBiometricAvailable: false, isLoading: false });
        await vaultStore.refreshVaultData();
        return true;
      }
      updateState({ isLoading: false });
      return false;
    } catch (e: any) {
      updateState({ isLoading: false, errorMessage: e?.message });
      throw e;
    }
  },

  lock: async () => {
    try {
      await vaultNative.lock();
    } finally {
      const bioAvailable = await biometricNative.isBiometricUnlockAvailable().catch(() => false);
      updateState({
        lockState: 'LOCKED',
        isBiometricAvailable: bioAvailable,
        summaries: [],
        securityAnalysis: null,
      });
    }
  },

  refreshVaultData: async () => {
    try {
      const [summaries, folders, tags, settings, analysis] = await Promise.all([
        vaultNative.getItemSummaries({
          type: state.activeFilterType === 'ALL' ? undefined : state.activeFilterType,
          folderId: state.activeFolderId || undefined,
          favoritesOnly: state.favoritesOnly,
          query: state.searchQuery || undefined,
          sort: state.sortOrder,
        }),
        vaultNative.getFolders(),
        vaultNative.getTags(),
        vaultNative.getSettings(),
        vaultNative.getSecurityAnalysis().catch(() => null),
      ]);

      if (settings?.language) {
        setLanguage(settings.language);
      }
      if (settings?.theme) {
        setTheme(settings.theme);
      }


      updateState({
        summaries,
        folders,
        tags,
        settings: settings || state.settings,
        securityAnalysis: analysis,
      });
    } catch {
      // Ignored if locked
    }
  },

  setFilterType: (type: string) => {
    updateState({ activeFilterType: type });
    vaultStore.refreshVaultData();
  },

  setFolderFilter: (folderId: string | null) => {
    updateState({ activeFolderId: folderId });
    vaultStore.refreshVaultData();
  },

  setFavoritesOnly: (favOnly: boolean) => {
    updateState({ favoritesOnly: favOnly });
    vaultStore.refreshVaultData();
  },

  setSearchQuery: (query: string) => {
    updateState({ searchQuery: query });
    vaultStore.refreshVaultData();
  },

  setSortOrder: (sort: string) => {
    updateState({ sortOrder: sort });
    vaultStore.refreshVaultData();
  },

  toggleFavorite: async (id: string) => {
    const newFav = await vaultNative.toggleFavorite(id);
    updateState({
      summaries: state.summaries.map(s => s.id === id ? { ...s, isFavorite: newFav } : s),
    });
  },

  deleteItem: async (id: string) => {
    await vaultNative.deleteItem(id, false);
    updateState({
      summaries: state.summaries.filter(s => s.id !== id),
    });
    vaultStore.refreshVaultData();
  },
};

export function useVaultStore() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const handler = () => setTick(t => t + 1);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return {
    ...state,
    ...vaultStore,
  };
}