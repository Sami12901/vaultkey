import {
  SUPPORTED_LANGUAGES,
  translations,
  en,
  setLanguage,
  getLanguage,
  t,
  Language,
} from '../src/i18n';

describe('Global Multi-Language (i18n) Support', () => {
  const allLanguageCodes: Language[] = [
    'en',
    'bn',
    'es',
    'fr',
    'de',
    'ar',
    'hi',
    'pt',
    'ru',
    'zh',
    'ja',
    'tr',
    'it',
    'ur',
    'id',
  ];

  it('supports all 15 global languages in metadata', () => {
    expect(SUPPORTED_LANGUAGES.length).toBe(15);
    const codes = SUPPORTED_LANGUAGES.map(l => l.code);
    allLanguageCodes.forEach(code => {
      expect(codes).toContain(code);
    });
  });

  it('contains all required translation keys across all 15 languages', () => {
    const requiredKeys = Object.keys(en) as Array<keyof typeof en>;
    expect(requiredKeys.length).toBeGreaterThan(50);

    allLanguageCodes.forEach(langCode => {
      const dict = translations[langCode];
      expect(dict).toBeDefined();

      requiredKeys.forEach(key => {
        expect(dict[key]).toBeDefined();
        expect(typeof dict[key]).toBe('string');
        expect(dict[key].length).toBeGreaterThan(0);
      });
    });
  });

  it('dynamically switches language and returns correct translated text', () => {
    setLanguage('es');
    expect(getLanguage()).toBe('es');
    expect(t('save')).toBe('Guardar');

    setLanguage('fr');
    expect(getLanguage()).toBe('fr');
    expect(t('save')).toBe('Enregistrer');

    setLanguage('de');
    expect(getLanguage()).toBe('de');
    expect(t('save')).toBe('Speichern');

    setLanguage('bn');
    expect(getLanguage()).toBe('bn');
    expect(t('save')).toBe('সংরক্ষণ করুন');

    setLanguage('ar');
    expect(getLanguage()).toBe('ar');
    expect(t('save')).toBe('حفظ');

    setLanguage('ja');
    expect(getLanguage()).toBe('ja');
    expect(t('save')).toBe('保存');

    setLanguage('en');
    expect(getLanguage()).toBe('en');
    expect(t('save')).toBe('Save');
  });
});
