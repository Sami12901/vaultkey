package com.vaultkey.autofill

import java.net.URI
import java.util.Locale

object DomainMatcher {

    fun normalizeDomain(rawUrlOrDomain: String?): String {
        if (rawUrlOrDomain.isNullOrBlank()) return ""
        val trimmed = rawUrlOrDomain.trim().lowercase(Locale.ROOT)

        // Handle Android package URI (e.g., android://hash@com.example.app)
        if (trimmed.startsWith("android://")) {
            val atIdx = trimmed.indexOf('@')
            return if (atIdx != -1 && atIdx + 1 < trimmed.length) {
                trimmed.substring(atIdx + 1).split("/")[0]
            } else {
                trimmed.removePrefix("android://").split("/")[0]
            }
        }

        val urlWithScheme = if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
            "https://$trimmed"
        } else {
            trimmed
        }

        return try {
            val uri = URI(urlWithScheme)
            val host = uri.host ?: trimmed
            canonicalizeHost(host)
        } catch (e: Exception) {
            canonicalizeHost(trimmed)
        }
    }

    private fun canonicalizeHost(host: String): String {
        var cleanHost = host.lowercase(Locale.ROOT).trim()
        cleanHost = cleanHost.removePrefix("www.")
        val colonIdx = cleanHost.indexOf(':')
        if (colonIdx != -1) {
            cleanHost = cleanHost.substring(0, colonIdx)
        }

        // Basic eTLD+1 extraction
        val parts = cleanHost.split(".")
        if (parts.size <= 2) {
            return cleanHost
        }

        // Check common two-part TLDs (e.g. .co.uk, .com.bd, .co.jp)
        val secondLast = parts[parts.size - 2]
        val last = parts[parts.size - 1]
        val isDoubleTld = (secondLast == "co" || secondLast == "com" || secondLast == "org" || secondLast == "edu") && last.length == 2

        return if (isDoubleTld && parts.size >= 3) {
            "${parts[parts.size - 3]}.$secondLast.$last"
        } else {
            "${parts[parts.size - 2]}.$last"
        }
    }

    fun isDomainMatch(targetDomain: String, savedUrlOrDomain: String): Boolean {
        val normalizedTarget = normalizeDomain(targetDomain)
        val normalizedSaved = normalizeDomain(savedUrlOrDomain)

        if (normalizedTarget.isEmpty() || normalizedSaved.isEmpty()) return false
        return normalizedTarget == normalizedSaved
    }

    fun extractDomainName(domain: String): String {
        val normalized = normalizeDomain(domain)
        val firstPart = normalized.split(".").firstOrNull() ?: normalized
        return firstPart.ifBlank { "Website" }
    }
}
