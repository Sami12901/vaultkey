import { extractDomain, getDomainInitial, getDomainColor, getFaviconUrl } from '../src/utils/domainUtils';

describe('domainUtils', () => {
  it('extracts domain from full URLs', () => {
    expect(extractDomain('https://github.com/facebook/react-native')).toBe('github.com');
    expect(extractDomain('http://www.google.com/search?q=test')).toBe('google.com');
    expect(extractDomain('https://subdomain.example.co.uk:8080/path#hash')).toBe('subdomain.example.co.uk');
  });

  it('extracts domain from JSON urls array strings', () => {
    expect(extractDomain('["https://netflix.com/login"]')).toBe('netflix.com');
  });

  it('recognizes known brand names without URL prefix', () => {
    expect(extractDomain('Google')).toBe('google.com');
    expect(extractDomain('GitHub Personal')).toBe('github.com');
    expect(extractDomain('Spotify Premium')).toBe('spotify.com');
    expect(extractDomain('Discord')).toBe('discord.com');
    expect(extractDomain('Amazon Web Services')).toBe('amazon.com');
  });

  it('returns initial and consistent brand colors', () => {
    expect(getDomainInitial('https://github.com')).toBe('G');
    expect(getDomainInitial('Netflix')).toBe('N');
    expect(getDomainColor('https://google.com')).toBe('#4285F4');
    expect(getDomainColor('https://spotify.com')).toBe('#1DB954');
    expect(getFaviconUrl('github.com')).toContain('https://www.google.com/s2/favicons?domain=github.com');
  });
});
