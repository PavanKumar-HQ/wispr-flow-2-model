//! VoxQuest Deterministic Dictation Formatting Pipeline
//!
//! Strict non-negotiable contract:
//! - VoxQuest transforms speech into text. It NEVER executes operating system commands,
//!   shell actions, application controls, or side effects based on dictated words.
//! - Words like "open settings", "delete history", and "send message" remain pure text.
//! - Punctuation and formatting transformations are conservative and context-aware.
//! - Literal uses (e.g., "the period lasted two years") are strictly preserved.
//! - Filler-word removal is opt-in, defaulting to OFF.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormattingConfig {
    pub spoken_punctuation: bool,
    pub conservative_filler_removal: bool,
    pub auto_capitalization: bool,
}

impl Default for FormattingConfig {
    fn default() -> Self {
        Self {
            spoken_punctuation: true,
            conservative_filler_removal: false,
            auto_capitalization: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FormattingMetadata {
    pub raw_text: String,
    pub final_text: String,
    pub punctuation_applied: usize,
    pub fillers_removed: usize,
    pub capitalization_applied: usize,
    pub stages_run: Vec<String>,
}

/// Authoritative deterministic formatting entry point
pub fn format_transcript(raw: &str, config: &FormattingConfig) -> String {
    let (final_text, _) = format_transcript_with_metadata(raw, config);
    final_text
}

/// Deterministic formatting pipeline returning both transformed text and audit metadata
pub fn format_transcript_with_metadata(raw: &str, config: &FormattingConfig) -> (String, FormattingMetadata) {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return (String::new(), FormattingMetadata::default());
    }

    let mut text = trimmed.to_string();
    let mut meta = FormattingMetadata {
        raw_text: raw.to_string(),
        final_text: String::new(),
        punctuation_applied: 0,
        fillers_removed: 0,
        capitalization_applied: 0,
        stages_run: Vec::new(),
    };

    // Stage 1: Spoken Punctuation and Formatting Phrases (Context-Aware)
    if config.spoken_punctuation {
        let (punct_text, count) = apply_spoken_punctuation_conservative(&text);
        text = punct_text;
        meta.punctuation_applied = count;
        meta.stages_run.push("spoken_punctuation".to_string());
    }

    // Stage 2: Conservative Filler Word Removal (strictly opt-in, disabled by default)
    if config.conservative_filler_removal {
        let (no_filler_text, count) = remove_conservative_fillers_audited(&text);
        text = no_filler_text;
        meta.fillers_removed = count;
        meta.stages_run.push("filler_removal".to_string());
    }

    // Stage 3: Conservative Sentence Capitalization
    if config.auto_capitalization {
        let (cap_text, count) = capitalize_sentences_conservative(&text);
        text = cap_text;
        meta.capitalization_applied = count;
        meta.stages_run.push("auto_capitalization".to_string());
    }

    // Stage 4: Whitespace and Punctuation Spacing Cleanliness
    text = fix_punctuation_spacing(&text);
    text = fix_common_grammar_and_contractions(&text);
    text = fix_common_proper_nouns(&text);
    text = clean_punctuation_and_whitespace(&text);
    meta.final_text = text.clone();

    (text, meta)
}

/// Applies spoken punctuation while protecting literal uses of terms like "period", "comma", etc.
fn apply_spoken_punctuation_conservative(input: &str) -> (String, usize) {
    let words: Vec<&str> = input.split_whitespace().collect();
    if words.is_empty() {
        return (String::new(), 0);
    }

    let mut out: Vec<String> = Vec::with_capacity(words.len());
    let mut i = 0;
    let mut count = 0;

    while i < words.len() {
        let curr_raw = words[i];
        let curr_lower = clean_word_for_matching(curr_raw);

        // --- Multi-word phrases ---

        // "new paragraph" -> "\n\n"
        if curr_lower == "new" && i + 1 < words.len() && clean_word_for_matching(words[i + 1]) == "paragraph" {
            out.push("\n\n".to_string());
            count += 1;
            i += 2;
            continue;
        }

        // "new line" or "newline" -> "\n"
        if (curr_lower == "new" && i + 1 < words.len() && clean_word_for_matching(words[i + 1]) == "line")
            || curr_lower == "newline"
        {
            out.push("\n".to_string());
            count += 1;
            i += if curr_lower == "new" { 2 } else { 1 };
            continue;
        }

        // "question mark" -> "?"
        if curr_lower == "question" && i + 1 < words.len() && clean_word_for_matching(words[i + 1]) == "mark" {
            attach_punctuation_to_last(&mut out, "?");
            count += 1;
            i += 2;
            continue;
        }

        // "exclamation mark" or "exclamation point" -> "!"
        if curr_lower == "exclamation" && i + 1 < words.len() {
            let next_lower = clean_word_for_matching(words[i + 1]);
            if next_lower == "mark" || next_lower == "point" {
                attach_punctuation_to_last(&mut out, "!");
                count += 1;
                i += 2;
                continue;
            }
        }

        // "bullet point" -> "• "
        if curr_lower == "bullet" && i + 1 < words.len() && clean_word_for_matching(words[i + 1]) == "point" {
            out.push("•".to_string());
            count += 1;
            i += 2;
            continue;
        }

        // "open quote" -> "\""
        if curr_lower == "open" && i + 1 < words.len() && clean_word_for_matching(words[i + 1]) == "quote" {
            out.push("\"".to_string());
            count += 1;
            i += 2;
            continue;
        }

        // "close quote" -> "\""
        if curr_lower == "close" && i + 1 < words.len() && clean_word_for_matching(words[i + 1]) == "quote" {
            attach_punctuation_to_last(&mut out, "\"");
            count += 1;
            i += 2;
            continue;
        }

        // "open parenthesis" / "open paren" -> "("
        if curr_lower == "open" && i + 1 < words.len() {
            let next_lower = clean_word_for_matching(words[i + 1]);
            if next_lower == "parenthesis" || next_lower == "paren" {
                out.push("(".to_string());
                count += 1;
                i += 2;
                continue;
            }
        }

        // "close parenthesis" / "close paren" -> ")"
        if curr_lower == "close" && i + 1 < words.len() {
            let next_lower = clean_word_for_matching(words[i + 1]);
            if next_lower == "parenthesis" || next_lower == "paren" {
                attach_punctuation_to_last(&mut out, ")");
                count += 1;
                i += 2;
                continue;
            }
        }

        // "full stop" -> "."
        if curr_lower == "full" && i + 1 < words.len() && clean_word_for_matching(words[i + 1]) == "stop" {
            attach_punctuation_to_last(&mut out, ".");
            count += 1;
            i += 2;
            continue;
        }

        // --- Single-word tokens with strict literal-use protection ---

        // Single "period":
        // DO NOT replace if used literally:
        // - "the period lasted two years"
        // - "during that time period"
        // - "a period of growth"
        // - "first period", "grace period", "gestation period", "trial period"
        if curr_lower == "period" {
            if is_literal_period_context(words.as_slice(), i) {
                out.push(curr_raw.to_string());
            } else {
                attach_punctuation_to_last(&mut out, ".");
                count += 1;
            }
            i += 1;
            continue;
        }

        // Single "comma":
        // DO NOT replace if used literally:
        // - "the comma is a punctuation mark"
        // - "oxford comma", "serial comma", "comma splice", "inverted comma"
        if curr_lower == "comma" {
            if is_literal_comma_context(words.as_slice(), i) {
                out.push(curr_raw.to_string());
            } else {
                attach_punctuation_to_last(&mut out, ",");
                count += 1;
            }
            i += 1;
            continue;
        }

        // Single "colon":
        // DO NOT replace if used literally: "part of the colon", "colon cancer", "the colon"
        if curr_lower == "colon" {
            if is_literal_colon_context(words.as_slice(), i) {
                out.push(curr_raw.to_string());
            } else {
                attach_punctuation_to_last(&mut out, ":");
                count += 1;
            }
            i += 1;
            continue;
        }

        // Single "semicolon":
        if curr_lower == "semicolon" {
            if is_literal_semicolon_context(words.as_slice(), i) {
                out.push(curr_raw.to_string());
            } else {
                attach_punctuation_to_last(&mut out, ";");
                count += 1;
            }
            i += 1;
            continue;
        }

        // Default: keep existing token as-is
        out.push(curr_raw.to_string());
        i += 1;
    }

    (reconstruct_spaced_tokens(&out), count)
}

fn clean_word_for_matching(w: &str) -> String {
    w.trim_matches(|c: char| !c.is_alphanumeric()).to_lowercase()
}

fn attach_punctuation_to_last(out: &mut Vec<String>, punct: &str) {
    if let Some(last) = out.last_mut() {
        if !last.ends_with(punct) {
            last.push_str(punct);
        }
    } else {
        out.push(punct.to_string());
    }
}

fn is_literal_period_context(words: &[&str], idx: usize) -> bool {
    // Check preceding words
    if idx > 0 {
        let prev = clean_word_for_matching(words[idx - 1]);
        let literal_preceding = [
            "the", "a", "this", "that", "time", "grace", "waiting", "gestation",
            "cooling-off", "cooling", "trial", "orbital", "menstrual", "class",
            "school", "first", "second", "third", "fourth", "extended", "brief",
            "short", "long", "same", "one", "two", "three", "another", "any"
        ];
        if literal_preceding.contains(&prev.as_str()) {
            return true;
        }
    }

    // Check following words
    if idx + 1 < words.len() {
        let next = clean_word_for_matching(words[idx + 1]);
        let literal_following = [
            "lasted", "lasts", "of", "in", "ended", "ends", "began", "begins",
            "is", "was", "between", "during", "for", "starts", "will"
        ];
        if literal_following.contains(&next.as_str()) {
            return true;
        }
    }

    false
}

fn is_literal_comma_context(words: &[&str], idx: usize) -> bool {
    if idx > 0 {
        let prev = clean_word_for_matching(words[idx - 1]);
        let literal_preceding = ["the", "a", "oxford", "serial", "inverted", "floating"];
        if literal_preceding.contains(&prev.as_str()) {
            return true;
        }
    }

    if idx + 1 < words.len() {
        let next = clean_word_for_matching(words[idx + 1]);
        let literal_following = ["splice", "separated", "delimited", "is", "was", "rule", "operator"];
        if literal_following.contains(&next.as_str()) {
            return true;
        }
    }

    false
}

fn is_literal_colon_context(words: &[&str], idx: usize) -> bool {
    if idx > 0 {
        let prev = clean_word_for_matching(words[idx - 1]);
        let literal_preceding = ["the", "my", "your", "his", "her", "large", "human"];
        if literal_preceding.contains(&prev.as_str()) {
            return true;
        }
    }

    if idx + 1 < words.len() {
        let next = clean_word_for_matching(words[idx + 1]);
        let literal_following = ["cancer", "polyps", "surgery", "disease", "is", "was"];
        if literal_following.contains(&next.as_str()) {
            return true;
        }
    }

    false
}

fn is_literal_semicolon_context(words: &[&str], idx: usize) -> bool {
    if idx > 0 {
        let prev = clean_word_for_matching(words[idx - 1]);
        if prev == "the" || prev == "a" || prev == "this" {
            return true;
        }
    }
    if idx + 1 < words.len() {
        let next = clean_word_for_matching(words[idx + 1]);
        if next == "is" || next == "was" || next == "operator" {
            return true;
        }
    }
    false
}

/// Removes standalone disfluent hesitation tokens only when conservative filler removal is enabled
fn remove_conservative_fillers_audited(input: &str) -> (String, usize) {
    let tokens = input.split(' ');
    let mut kept: Vec<String> = Vec::new();
    let mut removed_count = 0;

    for token in tokens {
        let clean = token.trim_matches(|c: char| !c.is_alphabetic()).to_lowercase();
        // Standalone hesitation tokens only
        if clean == "um" || clean == "uh" || clean == "ah" || clean == "er" {
            // Check if there is attached punctuation we need to preserve
            let trailing_punct: String = token.chars().rev().take_while(|c| !c.is_alphanumeric()).collect();
            let trailing_punct: String = trailing_punct.chars().rev().collect();
            if !trailing_punct.is_empty() {
                if let Some(prev) = kept.last_mut() {
                    let mut prev_str: String = prev.to_string();
                    prev_str.push_str(&trailing_punct);
                    *prev = prev_str;
                }
            }
            removed_count += 1;
            continue;
        }
        kept.push(token.to_string());
    }

    (kept.join(" "), removed_count)
}

/// Capitalizes sentence starts following recognized sentence-ending punctuation and paragraph breaks,
/// while protecting abbreviations (Mr., Dr., e.g., i.e.), decimals (3.14), and acronyms.
fn capitalize_sentences_conservative(input: &str) -> (String, usize) {
    let chars: Vec<char> = input.chars().collect();
    let mut result = String::with_capacity(input.len());
    let mut capitalize_next = true;
    let mut cap_count = 0;

    let len = chars.len();
    let mut i = 0;

    while i < len {
        let c = chars[i];

        if capitalize_next && c.is_alphabetic() {
            let upper = c.to_uppercase().collect::<String>();
            result.push_str(&upper);
            cap_count += 1;
            capitalize_next = false;
        } else {
            result.push(c);

            // Trigger capitalization on sentence boundaries: '?', '!', '\n'
            if c == '?' || c == '!' || c == '\n' {
                capitalize_next = true;
            } else if c == '.' {
                // Check if this period is an abbreviation, decimal point, or ellipsis
                if is_abbreviation_or_decimal(&chars, i) {
                    capitalize_next = false;
                } else {
                    capitalize_next = true;
                }
            }
        }

        i += 1;
    }

    (result, cap_count)
}

fn is_abbreviation_or_decimal(chars: &[char], dot_idx: usize) -> bool {
    // Check if surrounded by digits: e.g. "3.14"
    let prev_is_digit = dot_idx > 0 && chars[dot_idx - 1].is_ascii_digit();
    let next_is_digit = dot_idx + 1 < chars.len() && chars[dot_idx + 1].is_ascii_digit();
    if prev_is_digit && next_is_digit {
        return true;
    }

    // Multi-dot initialisms / abbreviations: e.g. "e.g.", "i.e.", "a.m.", "p.m."
    // 1. Next char is immediately another letter: "e.g." at first dot
    if dot_idx + 1 < chars.len() && chars[dot_idx + 1].is_alphabetic() {
        return true;
    }
    // 2. Preceded by letter + dot + letter: "e.g." at second dot
    if dot_idx >= 3 && chars[dot_idx - 2] == '.' && chars[dot_idx - 3].is_alphabetic() {
        return true;
    }

    // Extract word preceding the dot
    let mut start = dot_idx;
    while start > 0 && chars[start - 1].is_alphabetic() {
        start -= 1;
    }
    let word: String = chars[start..dot_idx].iter().collect();
    let lower = word.to_lowercase();

    // Standard English abbreviations that do not end a sentence
    let abbreviations = [
        "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "vs", "etc",
        "eg", "ie", "approx", "apt", "dept", "est", "misc", "fig", "vol",
        "inc", "corp", "co", "ltd"
    ];

    abbreviations.contains(&lower.as_str())
}

/// Cleans punctuation spacing (e.g., "word ." -> "word.", "word , " -> "word, ")
fn clean_punctuation_and_whitespace(text: &str) -> String {
    let mut result = text.to_string();

    // Close quote alignment: "word \"" -> "word\""
    result = result.replace(" \"", " \"");

    // Common punctuation leading space removal
    result = result.replace(" .", ".")
        .replace(" ,", ",")
        .replace(" ?", "?")
        .replace(" !", "!")
        .replace(" :", ":")
        .replace(" ;", ";");

    // Bullet point normalization
    result = result.replace("• ", "• ").replace("\n•", "\n• ");

    // Clean multiple contiguous spaces per line while preserving newlines
    let lines: Vec<&str> = result.split('\n').collect();
    let cleaned_lines: Vec<String> = lines.into_iter().map(|line| {
        line.split_whitespace().collect::<Vec<_>>().join(" ")
    }).collect();

    cleaned_lines.join("\n").trim().to_string()
}

fn reconstruct_spaced_tokens(tokens: &[String]) -> String {
    let mut res = String::new();
    let mut iter = tokens.iter().peekable();

    while let Some(tok) = iter.next() {
        res.push_str(tok);
        if let Some(next) = iter.peek() {
            // Avoid adding space before punctuation or after open brackets/quotes
            if *tok == "\"" || *tok == "(" || *tok == "•" || *next == "\n" || *tok == "\n" || *next == "\n\n" || *tok == "\n\n" {
                if *tok == "•" {
                    res.push(' ');
                }
            } else if !next.starts_with('.') && !next.starts_with(',') && !next.starts_with('?') && !next.starts_with('!') && !next.starts_with(':') && !next.starts_with(';') && !next.starts_with(')') && !next.starts_with('"') {
                res.push(' ');
            }
        }
    }

    res
}

/// Standalone polish text function for 1-click cleanups
pub fn polish_text(raw: &str) -> String {
    let config = FormattingConfig {
        spoken_punctuation: true,
        conservative_filler_removal: true,
        auto_capitalization: true,
    };

    let mut text = format_transcript(raw, &config);

    // 1. Deduplicate stutter words, repeated loops, and identical phrases
    text = deduplicate_repeated_speech(&text);
    text = deduplicate_stutter_words(&text);

    // 2. Spacing and punctuation normalization
    text = fix_punctuation_spacing(&text);

    // 3. Grammar, contractions, and common spoken agreement fixes
    text = fix_common_grammar_and_contractions(&text);

    // 4. Proper nouns and technical vocabulary
    text = fix_common_proper_nouns(&text);

    // 5. Question mark detection for interrogative sentences
    text = fix_question_punctuation(&text);

    // 6. Ensure closing sentence punctuation
    if !text.is_empty() {
        let last_ch = text.chars().last().unwrap();
        if last_ch.is_alphanumeric() {
            text.push('.');
        }
    }

    text
}

pub fn deduplicate_repeated_speech(text: &str) -> String {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    // 1. Normalize punctuation spacing: e.g. "good.I hope" -> "good. I hope"
    let mut normalized = String::new();
    let chars: Vec<char> = trimmed.chars().collect();
    for i in 0..chars.len() {
        normalized.push(chars[i]);
        if (chars[i] == '.' || chars[i] == '!' || chars[i] == '?' || chars[i] == ',')
            && i + 1 < chars.len()
            && !chars[i + 1].is_whitespace()
            && chars[i + 1].is_alphabetic()
        {
            normalized.push(' ');
        }
    }

    // 2. Multi-pass loop collapse until stable
    let mut current_text = normalized;
    for _ in 0..5 {
        let prev_text = current_text.clone();

        // A. Consecutive single-word deduplication (e.g. "no no no" -> "no", "is is" -> "is")
        {
            let words: Vec<&str> = current_text.split_whitespace().collect();
            if !words.is_empty() {
                let mut collapsed_words: Vec<&str> = Vec::new();
                for w in words {
                    let clean = w.trim_matches(['.', ',', '!', '?', ';', ':', '"', '\'']);
                    let is_dup = collapsed_words.last().map(|prev| {
                        let prev_clean = prev.trim_matches(['.', ',', '!', '?', ';', ':', '"', '\'']);
                        !clean.is_empty() && clean.eq_ignore_ascii_case(prev_clean)
                    }).unwrap_or(false);

                    if !is_dup {
                        collapsed_words.push(w);
                    }
                }
                current_text = collapsed_words.join(" ");
            }
        }

        // B. Consecutive phrase / n-gram deduplication (length 1 up to N/2)
        {
            let words: Vec<String> = current_text.split_whitespace().map(|s| s.to_string()).collect();
            let n = words.len();
            if n >= 2 {
                let max_len = n / 2;
                let mut did_collapse = false;

                for len in (1..=max_len).rev() {
                    let mut i = 0;
                    while i + 2 * len <= words.len() {
                        let chunk1 = &words[i..i + len];
                        let chunk2 = &words[i + len..i + 2 * len];
                        let matches = chunk1.iter().zip(chunk2.iter()).all(|(w1, w2)| {
                            let c1 = w1.trim_matches(['.', ',', '!', '?', ';', ':', '"', '\'']);
                            let c2 = w2.trim_matches(['.', ',', '!', '?', ';', ':', '"', '\'']);
                            c1.eq_ignore_ascii_case(c2)
                        });

                        if matches {
                            let mut collapsed: Vec<String> = Vec::new();
                            collapsed.extend_from_slice(&words[..i + len]);
                            let mut next_idx = i + 2 * len;
                            while next_idx + len <= words.len() {
                                let next_chunk = &words[next_idx..next_idx + len];
                                let next_matches = chunk1.iter().zip(next_chunk.iter()).all(|(w1, w2)| {
                                    let c1 = w1.trim_matches(['.', ',', '!', '?', ';', ':', '"', '\'']);
                                    let c2 = w2.trim_matches(['.', ',', '!', '?', ';', ':', '"', '\'']);
                                    c1.eq_ignore_ascii_case(c2)
                                });
                                if next_matches {
                                    next_idx += len;
                                } else {
                                    break;
                                }
                            }
                            collapsed.extend_from_slice(&words[next_idx..]);
                            current_text = collapsed.join(" ");
                            did_collapse = true;
                            break;
                        }
                        i += 1;
                    }
                    if did_collapse {
                        break;
                    }
                }
            }
        }

        // C. Sentence-level deduplication
        {
            let mut sentences: Vec<String> = Vec::new();
            let mut cur_sentence = String::new();
            for c in current_text.chars() {
                cur_sentence.push(c);
                if c == '.' || c == '?' || c == '!' {
                    let s = cur_sentence.trim().to_string();
                    if !s.is_empty() {
                        sentences.push(s);
                    }
                    cur_sentence.clear();
                }
            }
            let rest = cur_sentence.trim().to_string();
            if !rest.is_empty() {
                sentences.push(rest);
            }

            if sentences.len() > 1 {
                let mut deduped: Vec<String> = Vec::new();
                for s in sentences {
                    let clean = s.trim();
                    if clean.is_empty() {
                        continue;
                    }
                    let is_duplicate = deduped.last().map(|prev| {
                        let p = prev.trim().trim_matches(['.', '!', '?', ',', ' ']).to_lowercase();
                        let c = clean.trim().trim_matches(['.', '!', '?', ',', ' ']).to_lowercase();
                        p == c
                    }).unwrap_or(false);

                    if !is_duplicate {
                        deduped.push(clean.to_string());
                    }
                }
                current_text = deduped.join(" ");
            }
        }

        if current_text == prev_text {
            break;
        }
    }

    let last_punct = trimmed.chars().last().filter(|c| *c == '.' || *c == '!' || *c == '?');
    let mut res = current_text.trim().to_string();
    while res.ends_with(',') || res.ends_with(';') || res.ends_with(':') {
        res.pop();
    }
    if let Some(punct) = last_punct {
        if !res.ends_with('.') && !res.ends_with('!') && !res.ends_with('?') {
            res.push(punct);
        }
    }
    res.trim().to_string()
}

fn fix_punctuation_spacing(input: &str) -> String {
    let mut out = String::new();
    let chars: Vec<char> = input.trim().chars().collect();
    let mut i = 0;
    while i < chars.len() {
        let c = chars[i];
        // Remove space before punctuation: "hello , world" -> "hello, world"
        if (c == ',' || c == '.' || c == '?' || c == '!' || c == ';' || c == ':') && out.ends_with(' ') {
            out.pop();
        }
        out.push(c);

        // Ensure space after punctuation: "word.word" -> "word. word", but protect abbreviations like "e.g.", "i.e.", "U.S."
        let is_abbrev = if c == '.' && i + 1 < chars.len() && chars[i + 1].is_alphabetic() {
            let prev_is_single_letter = (i == 1 && chars[0].is_alphabetic())
                || (i >= 2 && chars[i - 1].is_alphabetic() && (chars[i - 2].is_whitespace() || chars[i - 2] == '.'));
            let next_has_dot = i + 2 < chars.len() && (chars[i + 2] == '.' || (i + 3 < chars.len() && chars[i + 3] == '.'));
            prev_is_single_letter && next_has_dot
        } else {
            false
        };

        if (c == ',' || c == '.' || c == '?' || c == '!' || c == ';' || c == ':')
            && !is_abbrev
            && i + 1 < chars.len()
            && !chars[i + 1].is_whitespace()
            && chars[i + 1].is_alphabetic()
        {
            out.push(' ');
        }
        i += 1;
    }
    out
}

fn fix_common_grammar_and_contractions(input: &str) -> String {
    let words = input.split(' ');
    let mut out = Vec::new();

    for w in words {
        let clean: String = w.chars().filter(|c| c.is_alphabetic()).collect();
        let clean_lower = clean.to_lowercase();

        let replacement = match clean_lower.as_str() {
            "dont" => Some("don't"),
            "doesnt" => Some("doesn't"),
            "didnt" => Some("didn't"),
            "cant" => Some("can't"),
            "couldnt" => Some("couldn't"),
            "wont" => Some("won't"),
            "wouldnt" => Some("wouldn't"),
            "shouldnt" => Some("shouldn't"),
            "isnt" => Some("isn't"),
            "arent" => Some("aren't"),
            "wasnt" => Some("wasn't"),
            "werent" => Some("weren't"),
            "hasnt" => Some("hasn't"),
            "havent" => Some("haven't"),
            "hadnt" => Some("hadn't"),
            "thats" => Some("that's"),
            "whats" => Some("what's"),
            "theres" => Some("there's"),
            "heres" => Some("here's"),
            "lets" => Some("let's"),
            "aint" => Some("isn't"),
            "im" => Some("I'm"),
            "ive" => Some("I've"),
            "itll" => Some("it'll"),
            "wouldve" => Some("would've"),
            "couldve" => Some("could've"),
            "shouldve" => Some("should've"),
            "mightve" => Some("might've"),
            "mustve" => Some("must've"),
            "ill" if clean_lower == "ill" && (w.starts_with('i') || w.starts_with('I')) => Some("I'll"),
            "id" if clean_lower == "id" && w == "i" => Some("I'd"),
            "youre" => Some("you're"),
            "youve" => Some("you've"),
            "youll" => Some("you'll"),
            "theyre" => Some("they're"),
            "theyve" => Some("they've"),
            "theyll" => Some("they'll"),
            "weve" => Some("we've"),
            "gonna" => Some("going to"),
            "wanna" => Some("want to"),
            "gotta" => Some("need to"),
            "kinda" => Some("kind of"),
            "sorta" => Some("sort of"),
            "lemme" => Some("let me"),
            "gimme" => Some("give me"),
            "dunno" => Some("don't know"),
            "cuz" | "cause" => Some("because"),
            "imma" | "ima" => Some("I'm going to"),
            "tryna" => Some("trying to"),
            "i" => Some("I"),
            _ => None,
        };

        if let Some(rep) = replacement {
            let prefix: String = w.chars().take_while(|c| !c.is_alphanumeric()).collect();
            let suffix: String = w.chars().rev().take_while(|c| !c.is_alphanumeric()).collect();
            let suffix: String = suffix.chars().rev().collect();
            
            // Preserve capital first letter if original was capitalized
            let is_cap = w.chars().find(|c| c.is_alphabetic()).map(|c| c.is_uppercase()).unwrap_or(false);
            if is_cap && !rep.starts_with('I') {
                let mut c = rep.chars();
                let first = c.next().unwrap().to_uppercase().collect::<String>();
                out.push(format!("{}{}{}{}", prefix, first, c.as_str(), suffix));
            } else {
                out.push(format!("{}{}{}", prefix, rep, suffix));
            }
        } else {
            out.push(w.to_string());
        }
    }

    let joined = out.join(" ");
    
    // Fix common phrase-level grammar agreements
    joined
        .replace("These stuff is", "This stuff is")
        .replace("these stuff is", "this stuff is")
        .replace("These stuff", "This stuff")
        .replace("these stuff", "this stuff")
        .replace("A apple", "An apple")
        .replace("a apple", "an apple")
        .replace("A hour", "An hour")
        .replace("a hour", "an hour")
        .replace("An user", "A user")
        .replace("an user", "a user")
        .replace("could of ", "could have ")
        .replace("Could of ", "Could have ")
        .replace("should of ", "should have ")
        .replace("Should of ", "Should have ")
        .replace("would of ", "would have ")
        .replace("Would of ", "Would have ")
        .replace("their is ", "there is ")
        .replace("Their is ", "There is ")
        .replace("their are ", "there are ")
        .replace("Their are ", "There are ")
        .replace("your welcome", "you're welcome")
        .replace("Your welcome", "You're welcome")
        .replace("its a ", "it's a ")
        .replace("Its a ", "It's a ")
        .replace("its an ", "it's an ")
        .replace("Its an ", "It's an ")
        .replace("its the ", "it's the ")
        .replace("Its the ", "It's the ")
        .replace("its not ", "it's not ")
        .replace("Its not ", "It's not ")
        .replace("its going ", "it's going ")
        .replace("Its going ", "It's going ")
        .replace("its okay", "it's okay")
        .replace("Its okay", "It's okay")
        .replace("its been ", "it's been ")
        .replace("Its been ", "It's been ")
        .replace("its time ", "it's time ")
        .replace("Its time ", "It's time ")
        .replace("they is ", "they are ")
        .replace("They is ", "They are ")
        .replace("we is ", "we are ")
        .replace("We is ", "We are ")
        .replace("i is ", "I am ")
        .replace("I is ", "I am ")
        .replace("he don't", "he doesn't")
        .replace("He don't", "He doesn't")
        .replace("she don't", "she doesn't")
        .replace("She don't", "She doesn't")
        .replace("it don't", "it doesn't")
        .replace("It don't", "It doesn't")
        .replace("they was ", "they were ")
        .replace("They was ", "They were ")
        .replace("we was ", "we were ")
        .replace("We was ", "We were ")
}

fn fix_question_punctuation(input: &str) -> String {
    let mut sentences: Vec<String> = Vec::new();
    let mut current = String::new();

    for c in input.chars() {
        current.push(c);
        if c == '.' || c == '?' || c == '!' {
            sentences.push(current.trim().to_string());
            current.clear();
        }
    }
    if !current.trim().is_empty() {
        sentences.push(current.trim().to_string());
    }

    let question_starters = [
        "what", "why", "how", "where", "when", "who", "which",
        "can you", "could you", "is there", "do you", "are you",
        "will you", "would you", "should we", "shall we", "is it", "what about"
    ];

    let mut out: Vec<String> = Vec::new();
    for mut s in sentences {
        let clean = s.trim_end_matches(['.', '!', '?']).trim().to_lowercase();
        let is_question = question_starters.iter().any(|q| clean.starts_with(q));
        if is_question {
            s = format!("{}?", s.trim_end_matches(['.', '!', '?']).trim());
        }
        out.push(s);
    }
    out.join(" ")
}

fn deduplicate_stutter_words(input: &str) -> String {
    let tokens: Vec<&str> = input.split_whitespace().collect();
    let mut out: Vec<&str> = Vec::new();

    for t in tokens {
        if let Some(last) = out.last() {
            if last.eq_ignore_ascii_case(t) {
                continue;
            }
        }
        out.push(t);
    }
    out.join(" ")
}

fn fix_common_proper_nouns(input: &str) -> String {
    let replacements = &[
        ("whatsapp", "WhatsApp"),
        ("voxquest", "VoxQuest"),
        ("youtube", "YouTube"),
        ("google", "Google"),
        ("github", "GitHub"),
        ("macbook", "MacBook"),
        ("macos", "macOS"),
        ("iphone", "iPhone"),
        ("android", "Android"),
        ("api", "API"),
        ("ui", "UI"),
        ("sql", "SQL"),
        ("json", "JSON"),
        ("html", "HTML"),
        ("css", "CSS"),
    ];

    let mut result = input.to_string();
    for (lower, proper) in replacements {
        let re_pattern = format!(r"(?i)\b{}\b", lower);
        if let Ok(_) = regex_lite_simple(&re_pattern) {
            result = re_replace(&result, lower, proper);
        }
    }
    result
}

fn regex_lite_simple(_pattern: &str) -> Result<(), ()> {
    Ok(())
}

fn re_replace(text: &str, target_lower: &str, replacement: &str) -> String {
    let words = text.split(' ');
    let mut out = Vec::new();
    for w in words {
        let clean = w.trim_matches(|c: char| !c.is_alphanumeric()).to_lowercase();
        if clean == target_lower {
            // Preserve surrounding punctuation
            let prefix: String = w.chars().take_while(|c| !c.is_alphanumeric()).collect();
            let suffix: String = w.chars().rev().take_while(|c| !c.is_alphanumeric()).collect();
            let suffix: String = suffix.chars().rev().collect();
            out.push(format!("{}{}{}", prefix, replacement, suffix));
        } else {
            out.push(w.to_string());
        }
    }
    out.join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user_table_cases() {
        let default_cfg = FormattingConfig::default();

        // 1. "hello comma how are you question mark" -> "Hello, how are you?"
        assert_eq!(
            format_transcript("hello comma how are you question mark", &default_cfg),
            "Hello, how are you?"
        );

        // 2. "first sentence period second sentence" -> "First sentence. Second sentence"
        assert_eq!(
            format_transcript("first sentence period second sentence", &default_cfg),
            "First sentence. Second sentence"
        );

        // 3. "new line" -> Insert a newline
        let res_nl = format_transcript("first line new line second line", &default_cfg);
        assert_eq!(res_nl, "First line\nSecond line");

        // 4. "new paragraph" -> Insert a paragraph break
        let res_np = format_transcript("first paragraph new paragraph second paragraph", &default_cfg);
        assert_eq!(res_np, "First paragraph\n\nSecond paragraph");

        // 5. "open quote hello close quote" -> "\"Hello\""
        assert_eq!(
            format_transcript("open quote hello close quote", &default_cfg),
            "\"Hello\""
        );

        // 6. "bullet point buy milk" -> "• Buy milk"
        assert_eq!(
            format_transcript("bullet point buy milk", &default_cfg),
            "• Buy milk"
        );

        // 7. "I uh think this is fine" -> "I uh think this is fine" by default (filler removal OFF)
        assert_eq!(
            format_transcript("I uh think this is fine", &default_cfg),
            "I uh think this is fine"
        );

        // 8. Same sentence with filler removal enabled -> "I think this is fine"
        let filler_on_cfg = FormattingConfig {
            spoken_punctuation: true,
            conservative_filler_removal: true,
            auto_capitalization: true,
        };
        assert_eq!(
            format_transcript("I uh think this is fine", &filler_on_cfg),
            "I think this is fine"
        );
    }

    #[test]
    fn test_literal_words_protection() {
        let cfg = FormattingConfig::default();

        // "The period lasted two years" must NOT turn into "The . lasted two years"
        assert_eq!(
            format_transcript("The period lasted two years", &cfg),
            "The period lasted two years"
        );

        // "during that time period we grew"
        assert_eq!(
            format_transcript("during that time period we grew", &cfg),
            "During that time period we grew"
        );

        // "the comma is a punctuation mark" must not turn into "The , is a punctuation mark"
        assert_eq!(
            format_transcript("the comma is a punctuation mark", &cfg),
            "The comma is a punctuation mark"
        );
    }

    #[test]
    fn test_strict_no_action_boundary() {
        let cfg = FormattingConfig::default();

        // Words such as "open settings", "delete history", and "send message" remain pure text!
        assert_eq!(
            format_transcript("open settings", &cfg),
            "Open settings"
        );
        assert_eq!(
            format_transcript("delete history", &cfg),
            "Delete history"
        );
        assert_eq!(
            format_transcript("send message to John", &cfg),
            "Send message to John"
        );
    }

    #[test]
    fn test_abbreviations_and_decimals() {
        let cfg = FormattingConfig::default();

        // Abbreviations shouldn't trigger sentence capitalization for the next word
        assert_eq!(
            format_transcript("Dr. smith prescribed 3.14 mg", &cfg),
            "Dr. smith prescribed 3.14 mg"
        );

        assert_eq!(
            format_transcript("e.g. this is an example", &cfg),
            "E.g. this is an example"
        );
    }

    #[test]
    fn test_metadata_auditing() {
        let cfg = FormattingConfig {
            spoken_punctuation: true,
            conservative_filler_removal: true,
            auto_capitalization: true,
        };
        let (final_text, meta) = format_transcript_with_metadata("hello um world period", &cfg);
        assert_eq!(final_text, "Hello world.");
        assert_eq!(meta.punctuation_applied, 1);
        assert_eq!(meta.fillers_removed, 1);
        assert!(meta.stages_run.contains(&"spoken_punctuation".to_string()));
        assert!(meta.stages_run.contains(&"filler_removal".to_string()));
    }
}
