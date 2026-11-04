import React, { createContext, useContext, useState } from 'react';

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'zh', name: 'Chinese', nativeName: '简体中文', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
];

export const translations: Record<string, Record<string, string>> = {
  en: {
    appTitle: 'VaultKey',
    appSubtitle: 'Zero-Knowledge Security Manager',
    searchPlaceholder: 'Search vault items...',
    allItems: 'All Items',
    logins: 'Logins',
    cards: 'Credit Cards',
    bankAccounts: 'Bank Accounts',
    secureNotes: 'Secure Notes',
    folders: 'Folders',
    favorites: 'Favorites',
    generator: 'Password Generator',
    security: 'Security Health',
    backup: 'Backup & Restore',
    settings: 'Settings',
    unlock: 'Unlock Vault',
    enterMasterPass: 'Enter Master Password',
    setupVault: 'Create Master Password',
    setupSubtitle: 'Your master password derives the AES-256 zero-knowledge encryption key. It is never sent over any network.',
    confirmMasterPass: 'Confirm Master Password',
    lock: 'Lock',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    copy: 'Copy',
    copied: 'Copied to clipboard',
    title: 'Title',
    username: 'Username / Email',
    password: 'Password',
    website: 'Website URL',
    notes: 'Notes',
    cardholderName: 'Cardholder Name',
    cardNumber: 'Card Number',
    expiry: 'Expiry',
    cvv: 'CVV / CVC',
    pin: 'Card PIN',
    bankName: 'Bank Name',
    accountHolder: 'Account Holder',
    accountNumber: 'Account Number',
    routingNumber: 'Routing Number',
    swiftBic: 'SWIFT / BIC',
    iban: 'IBAN',
    theme: 'Theme & Appearance',
    language: 'Language',
    createBackup: 'Create Backup Archive (.vkb)',
    restoreBackup: 'Restore Backup Archive',
    browseFile: 'Browse Backup File',
    weak: 'Weak',
    medium: 'Medium',
    strong: 'Strong',
    backgroundAndStartup: 'Background & Startup',
    runInBackground: 'Keep Running in Background',
    runInBackgroundDesc: 'When you close the window, VaultKey stays active in the system tray so Chrome/Edge can auto-save and autofill passwords.',
    startAtLogin: 'Launch on Windows Startup',
    startAtLoginDesc: 'Automatically start VaultKey in the background when your computer turns on.',
    autoLockTimer: 'Auto-Lock Inactivity Timer',
    autoLockDesc: 'Automatically lock the vault after being away from your computer.',
    minutes1: '1 Minute',
    minutes5: '5 Minutes',
    minutes15: '15 Minutes',
    minutes30: '30 Minutes',
    hours1: '1 Hour',
    never: 'Never',
    screenSecurity: 'Screen Capture & Share Protection',
    screenSecurityDesc: 'Blocks screenshots, screen recording, and screen sharing (OBS, Zoom, Discord, Snipping Tool) — the app renders as a black screen to protect your passwords.',
  },
  bn: {
    appTitle: 'ভল্টকি',
    appSubtitle: 'জিরো-নলেজ সিকিউরিটি ম্যানেজার',
    searchPlaceholder: 'ভল্ট অনুসন্ধান করুন...',
    allItems: 'সব আইটেম',
    logins: 'লগইনসমূহ',
    cards: 'ক্রেডিট কার্ড',
    bankAccounts: 'ব্যাংক একাউন্ট',
    secureNotes: 'গোপনীয় নোট',
    folders: 'ফোল্ডারসমূহ',
    favorites: 'পছন্দের তালিকা',
    generator: 'পাসওয়ার্ড জেনারেটর',
    security: 'নিরাপত্তা স্বাস্থ্য',
    backup: 'ব্যাকআপ ও রিস্টোর',
    settings: 'সেটিংস',
    unlock: 'ভল্ট আনলক করুন',
    enterMasterPass: 'মাস্টার পাসওয়ার্ড দিন',
    setupVault: 'মাস্টার পাসওয়ার্ড তৈরি করুন',
    setupSubtitle: 'আপনার মাস্টার পাসওয়ার্ড থেকে AES-256 এনক্রিপশন কী তৈরি হয়। এটি কখনো নেটওয়ার্কে যায় না।',
    confirmMasterPass: 'মাস্টার পাসওয়ার্ড নিশ্চিত করুন',
    lock: 'লক',
    save: 'সংরক্ষণ করুন',
    cancel: 'বাতিল',
    delete: 'মুছুন',
    edit: 'সম্পাদনা',
    copy: 'কপি',
    copied: 'ক্লিপবোর্ডে কপি হয়েছে',
    title: 'শিরোনাম',
    username: 'ইউজারনেম / ইমেইল',
    password: 'পাসওয়ার্ড',
    website: 'ওয়েবসাইট লিঙ্ক',
    notes: 'নোট',
    cardholderName: 'কার্ডধারীর নাম',
    cardNumber: 'কার্ড নম্বর',
    expiry: 'মেয়াদ',
    cvv: 'সিভিভি (CVV)',
    pin: 'পিন কোড',
    bankName: 'ব্যাংকের নাম',
    accountHolder: 'একাউন্টধারীর নাম',
    accountNumber: 'একাউন্ট নম্বর',
    routingNumber: 'রাউটিং নম্বর',
    swiftBic: 'সুইফট (SWIFT) কোড',
    iban: 'আইবান (IBAN)',
    theme: 'থিম ও প্রদর্শন',
    language: 'ভাষা',
    createBackup: 'ব্যাকআপ তৈরি করুন (.vkb)',
    restoreBackup: 'ব্যাকআপ রিস্টোর করুন',
    browseFile: 'ব্যাকআপ ফাইল বাছুন',
    weak: 'দুর্বল',
    medium: 'মাঝারি',
    strong: 'শক্তিশালী',
    backgroundAndStartup: 'ব্যাকগ্রাউন্ড ও স্টার্টআপ',
    runInBackground: 'ব্যাকগ্রাউন্ডে চালু রাখুন',
    runInBackgroundDesc: 'উইন্ডো বন্ধ করে দিলেও অ্যাপটি সিস্টেম ট্রেতে চালু থাকবে যাতে ক্রোম এক্সটেনশন দিয়ে পাসওয়ার্ড অটো-সেভ ও অটো-ফিল করা যায়।',
    startAtLogin: 'উইন্ডোজের সাথে স্বয়ংক্রিয়ভাবে চালু হোক',
    startAtLoginDesc: 'কম্পিউটার অন করার সাথে সাথে ভল্টকি ব্যাকগ্রাউন্ডে চালু হয়ে থাকবে।',
    autoLockTimer: 'স্বয়ংক্রিয় লক হওয়ার সময়',
    autoLockDesc: 'কম্পিউটার নির্দিষ্ট সময় নিষ্ক্রিয় থাকলে ভল্ট নিজে থেকেই লক হয়ে যাবে।',
    minutes1: '১ মিনিট',
    minutes5: '৫ মিনিট',
    minutes15: '১৫ মিনিট',
    minutes30: '৩০ মিনিট',
    hours1: '১ ঘণ্টা',
    never: 'কখনোই নয়',
    screenSecurity: 'স্ক্রিনশট ও স্ক্রিন শেয়ারিং সুরক্ষা',
    screenSecurityDesc: 'স্ক্রিনশট, ভিডিও রেকর্ডিং এবং স্ক্রিন শেয়ারিং (OBS, Zoom, Discord, Snipping Tool)-এ অ্যাপ সম্পূর্ণ কালো (Black screen) দেখাবে যাতে পাসওয়ার্ড সুরক্ষিত থাকে।',
  },
};

interface I18nContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (k) => k,
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<string>('en');

  const t = (key: string): string => {
    const dict = translations[language] || translations.en;
    return dict[key] || translations.en[key] || key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useTranslation = () => useContext(I18nContext);
