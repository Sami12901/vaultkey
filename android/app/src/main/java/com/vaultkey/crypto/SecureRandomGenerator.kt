package com.vaultkey.crypto

import java.security.SecureRandom
import kotlin.math.ln
import kotlin.math.min

data class PasswordGeneratorOptions(
    val length: Int = 20,
    val includeUppercase: Boolean = true,
    val includeLowercase: Boolean = true,
    val includeNumbers: Boolean = true,
    val includeSymbols: Boolean = true,
    val excludeAmbiguous: Boolean = true,
    val avoidRepeat: Boolean = false
)

data class PassphraseOptions(
    val wordCount: Int = 4,
    val separator: String = "-",
    val capitalize: Boolean = true,
    val includeNumber: Boolean = true
)

data class PasswordStrength(
    val score: Int, // 0 to 4 (Very Weak, Weak, Fair, Good, Strong)
    val entropyBits: Double,
    val feedback: List<String>,
    val isWeak: Boolean
)

object SecureRandomGenerator {

    private val secureRandom = SecureRandom()

    private const val UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    private const val LOWERCASE = "abcdefghijklmnopqrstuvwxyz"
    private const val NUMBERS = "0123456789"
    private const val SYMBOLS = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    private const val AMBIGUOUS = "O0l1I{}[];:'\"/\\~|,.<>"

    // Curated high-entropy EFF Diceware list subset (300 memorable distinct words)
    val WORDLIST = listOf(
        "abacus", "abbey", "abstract", "academic", "account", "acid", "acquire", "across",
        "action", "actor", "actress", "actual", "adapt", "address", "advance", "advice",
        "aerobic", "affair", "afford", "afraid", "again", "agency", "agent", "agree",
        "ahead", "airport", "album", "alert", "algebra", "alien", "allow", "almost",
        "alone", "alpha", "already", "alter", "always", "amateur", "amazing", "amber",
        "ambition", "among", "amount", "amuse", "analyst", "anchor", "ancient", "angel",
        "anger", "animal", "ankle", "announce", "annual", "another", "answer", "antenna",
        "antique", "anxiety", "anyway", "apart", "apology", "appear", "apple", "approve",
        "apron", "arcade", "arch", "arctic", "area", "arena", "argue", "armor",
        "arrange", "arrest", "arrive", "arrow", "artist", "artwork", "aspect", "assault",
        "asset", "assist", "assume", "asthma", "athlete", "atom", "attack", "attend",
        "attitude", "attract", "auction", "audit", "august", "aunt", "author", "auto",
        "autumn", "average", "avocado", "avoid", "awake", "aware", "awesome", "awful",
        "awkward", "axis", "baby", "bachelor", "bacon", "badge", "baggage", "balance",
        "balcony", "ball", "bamboo", "banana", "banner", "barber", "bargain", "barrel",
        "barrier", "basket", "battery", "beach", "beacon", "bean", "beauty", "because",
        "become", "before", "begin", "behave", "behind", "belief", "belong", "below",
        "bench", "benefit", "best", "betray", "better", "between", "beyond", "bicycle",
        "binary", "biology", "bird", "birth", "biscuit", "blade", "blame", "blanket",
        "blast", "bleak", "bless", "blind", "blood", "blossom", "blouse", "board",
        "boat", "body", "boiler", "bomb", "bonus", "book", "border", "boring",
        "borrow", "boss", "bottom", "bounce", "boundary", "bracket", "brain", "brand",
        "brass", "brave", "bread", "breeze", "brick", "bridge", "brief", "bright",
        "bring", "brisk", "broccoli", "broken", "bronze", "broom", "brother", "brown",
        "bubble", "budget", "buffalo", "build", "bulb", "bulk", "bullet", "bundle",
        "bunker", "burden", "burger", "burst", "bus", "business", "busy", "butter",
        "buyer", "cabin", "cable", "cactus", "cage", "cake", "calendar", "calm",
        "camera", "camp", "can", "canal", "cancel", "candy", "cannon", "canvas",
        "canyon", "capable", "capital", "captain", "capture", "carbon", "card", "care",
        "cargo", "carpet", "carry", "cart", "cascade", "case", "cash", "castle",
        "casual", "cat", "catalog", "catch", "category", "cattle", "cause", "caution",
        "cave", "ceiling", "celery", "cement", "census", "century", "cereal", "certain",
        "chair", "chalk", "champion", "change", "chapter", "charge", "chase", "cheap",
        "check", "cheese", "cherry", "chest", "chicken", "chief", "child", "chimney",
        "choice", "choose", "chronic", "chuckle", "chunk", "circle", "citizen", "city",
        "civil", "claim", "clap", "clarify", "claw", "clay", "clean", "clerk",
        "clever", "click", "client", "climate", "climb", "clinic", "clip", "clock",
        "close", "cloth", "cloud", "clown", "club", "clump", "cluster", "coach",
        "coast", "coconut", "coffee", "coil", "coin", "collect", "color", "column"
    )

    fun generatePassword(options: PasswordGeneratorOptions): String {
        val length = options.length.coerceIn(8, 128)
        val pools = mutableListOf<String>()

        if (options.includeUppercase) pools.add(UPPERCASE)
        if (options.includeLowercase) pools.add(LOWERCASE)
        if (options.includeNumbers) pools.add(NUMBERS)
        if (options.includeSymbols) pools.add(SYMBOLS)

        if (pools.isEmpty()) {
            pools.add(LOWERCASE)
            pools.add(NUMBERS)
        }

        var fullPool = pools.joinToString("")
        if (options.excludeAmbiguous) {
            fullPool = fullPool.filter { it !in AMBIGUOUS }
        }

        val chars = CharArray(length)
        val usedChars = mutableSetOf<Char>()

        // Guarantee at least one character from each selected category
        var idx = 0
        for (pool in pools) {
            var candidatePool = if (options.excludeAmbiguous) pool.filter { it !in AMBIGUOUS } else pool
            if (candidatePool.isEmpty()) candidatePool = pool
            if (idx < length) {
                val char = candidatePool[secureRandom.nextInt(candidatePool.length)]
                chars[idx++] = char
                usedChars.add(char)
            }
        }

        // Fill remaining length
        while (idx < length) {
            val char = fullPool[secureRandom.nextInt(fullPool.length)]
            if (options.avoidRepeat && char in usedChars && usedChars.size < fullPool.length) {
                continue
            }
            chars[idx++] = char
            usedChars.add(char)
        }

        // Fisher-Yates shuffle with SecureRandom
        for (i in chars.indices.reversed()) {
            val j = secureRandom.nextInt(i + 1)
            val temp = chars[i]
            chars[i] = chars[j]
            chars[j] = temp
        }

        return String(chars)
    }

    fun generatePassphrase(options: PassphraseOptions): String {
        val count = options.wordCount.coerceIn(3, 10)
        val words = (0 until count).map {
            var word = WORDLIST[secureRandom.nextInt(WORDLIST.size)]
            if (options.capitalize) {
                word = word.replaceFirstChar { it.uppercase() }
            }
            word
        }.toMutableList()

        if (options.includeNumber) {
            val randomNum = secureRandom.nextInt(90) + 10 // 2 digit number
            val insertIdx = secureRandom.nextInt(words.size)
            words[insertIdx] = words[insertIdx] + randomNum
        }

        return words.joinToString(options.separator)
    }

    fun generatePin(length: Int = 6): String {
        val len = length.coerceIn(4, 12)
        val sb = java.lang.StringBuilder(len)
        repeat(len) {
            sb.append(secureRandom.nextInt(10))
        }
        return sb.toString()
    }

    fun calculateStrength(password: String): PasswordStrength {
        val feedback = mutableListOf<String>()
        if (password.isEmpty()) {
            return PasswordStrength(0, 0.0, listOf("Password cannot be empty"), true)
        }

        var poolSize = 0
        val hasLower = password.any { it in LOWERCASE }
        val hasUpper = password.any { it in UPPERCASE }
        val hasDigit = password.any { it in NUMBERS }
        val hasSymbol = password.any { it in SYMBOLS }

        if (hasLower) poolSize += 26
        if (hasUpper) poolSize += 26
        if (hasDigit) poolSize += 10
        if (hasSymbol) poolSize += 32

        if (poolSize == 0) poolSize = 10

        val entropy = password.length * (ln(poolSize.toDouble()) / ln(2.0))

        // Check common sequences & patterns
        val lowerPass = password.lowercase()
        val commonPatterns = listOf(
            "1234", "password", "qwerty", "admin", "welcome", "letmein", "abcdef", "pass123"
        )
        val containsCommonPattern = commonPatterns.any { lowerPass.contains(it) }

        val hasRepeatedChars = (0 until password.length - 2).any {
            password[it] == password[it + 1] && password[it] == password[it + 2]
        }

        if (password.length < 12) {
            feedback.add("Password is short (recommend at least 14 characters)")
        }
        if (!hasUpper || !hasLower) {
            feedback.add("Add a mix of uppercase and lowercase letters")
        }
        if (!hasDigit) {
            feedback.add("Include numbers for greater complexity")
        }
        if (!hasSymbol) {
            feedback.add("Include symbols to maximize strength")
        }
        if (containsCommonPattern) {
            feedback.add("Contains common predictable dictionary pattern")
        }
        if (hasRepeatedChars) {
            feedback.add("Avoid repeating characters consecutively")
        }

        var score = when {
            entropy < 35 -> 0
            entropy < 50 -> 1
            entropy < 65 -> 2
            entropy < 80 -> 3
            else -> 4
        }

        if (password.length < 8) score = 0
        if (containsCommonPattern && score > 1) score = 1
        if (hasRepeatedChars && score > 2) score -= 1

        val isWeak = score < 2 || password.length < 12 || containsCommonPattern

        return PasswordStrength(
            score = score,
            entropyBits = Math.round(entropy * 10.0) / 10.0,
            feedback = feedback,
            isWeak = isWeak
        )
    }
}
