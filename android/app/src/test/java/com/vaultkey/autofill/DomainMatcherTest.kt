package com.vaultkey.autofill

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DomainMatcherTest {

    @Test
    fun testCanonicalEtldPlusOneExtraction() {
        assertEquals("google.com", DomainMatcher.normalizeDomain("google.com"))
        assertEquals("google.com", DomainMatcher.normalizeDomain("https://google.com"))
        assertEquals("google.com", DomainMatcher.normalizeDomain("https://www.google.com"))
        assertEquals("github.com", DomainMatcher.normalizeDomain("https://auth.github.com/login"))
        assertEquals("github.com", DomainMatcher.normalizeDomain("https://deep.sub.level.domain.github.com"))
    }

    @Test
    fun testTwoPartTldHandling() {
        // e.g. .co.uk, .com.bd, .co.jp, .org.uk
        assertEquals("bbc.co.uk", DomainMatcher.normalizeDomain("https://news.bbc.co.uk"))
        assertEquals("bbc.co.uk", DomainMatcher.normalizeDomain("bbc.co.uk"))
        assertEquals("amazon.co.jp", DomainMatcher.normalizeDomain("https://www.amazon.co.jp/orders"))
        assertEquals("bank.com.bd", DomainMatcher.normalizeDomain("https://portal.bank.com.bd/login"))
    }

    @Test
    fun testSubdomainMatchingMatchesParentEtld() {
        assertTrue(DomainMatcher.isDomainMatch("github.com", "https://api.github.com"))
        assertTrue(DomainMatcher.isDomainMatch("https://accounts.google.com", "https://mail.google.com"))
        assertTrue(DomainMatcher.isDomainMatch("facebook.com", "https://m.facebook.com/messages"))
        assertTrue(DomainMatcher.isDomainMatch("https://signin.aws.amazon.com", "https://console.aws.amazon.com"))
    }

    @Test
    fun testPortHandlingNormalization() {
        assertEquals("example.com", DomainMatcher.normalizeDomain("https://example.com:8443/login"))
        assertEquals("localhost", DomainMatcher.normalizeDomain("http://localhost:3000"))
        assertEquals("localhost", DomainMatcher.normalizeDomain("http://localhost:8080"))
        assertTrue(DomainMatcher.isDomainMatch("http://localhost:3000", "http://localhost:8080"))
    }

    @Test
    fun testUserinfoAuthorityStrippingAndAntiPhishingRejection() {
        // Attacker creates a URL with legitimate domain in userinfo authority before '@'
        val phishingTarget = "https://google.com@evil-phishing.com"
        val normalizedPhishing = DomainMatcher.normalizeDomain(phishingTarget)

        assertEquals("evil-phishing.com", normalizedPhishing)
        assertFalse(
            "Userinfo spoofing must be rejected: google.com must NOT match google.com@evil-phishing.com",
            DomainMatcher.isDomainMatch("google.com", phishingTarget)
        )

        // Subdomain trickery: paypal.com.attacker.com
        val prefixSpoof = "https://paypal.com.attacker.com"
        assertEquals("attacker.com", DomainMatcher.normalizeDomain(prefixSpoof))
        assertFalse(
            "Subdomain spoofing must be rejected: paypal.com must NOT match paypal.com.attacker.com",
            DomainMatcher.isDomainMatch("paypal.com", prefixSpoof)
        )

        // Lookalike domain
        val fakeDomain = "https://google-secure-login.com"
        assertFalse(DomainMatcher.isDomainMatch("google.com", fakeDomain))
    }

    @Test
    fun testAndroidPackageUriNormalization() {
        // Format: android://hash@packageName
        val androidAppWithHash = "android://k9f02d...hash@com.paypal.android.p2pmobile"
        assertEquals("com.paypal.android.p2pmobile", DomainMatcher.normalizeDomain(androidAppWithHash))

        // Format: android://packageName/path
        val androidAppDirect = "android://com.twitter.android/timeline"
        assertEquals("com.twitter.android", DomainMatcher.normalizeDomain(androidAppDirect))
    }

    @Test
    fun testEmptyOrInvalidInputs() {
        assertEquals("", DomainMatcher.normalizeDomain(null))
        assertEquals("", DomainMatcher.normalizeDomain(""))
        assertEquals("", DomainMatcher.normalizeDomain("   "))

        assertFalse(DomainMatcher.isDomainMatch("", "https://google.com"))
        assertFalse(DomainMatcher.isDomainMatch("https://google.com", ""))
        assertFalse(DomainMatcher.isDomainMatch("", ""))
    }

    @Test
    fun testExtractDomainName() {
        assertEquals("netflix", DomainMatcher.extractDomainName("https://netflix.com/browse"))
        assertEquals("google", DomainMatcher.extractDomainName("https://accounts.google.co.uk"))
        assertEquals("Website", DomainMatcher.extractDomainName(""))
    }
}
