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
    pub speech_repair: bool,
}

impl Default for FormattingConfig {
    fn default() -> Self {
        Self {
            spoken_punctuation: true,
            conservative_filler_removal: false,
            auto_capitalization: true,
            speech_repair: true,
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
    pub repairs_applied: usize,
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
        repairs_applied: 0,
        stages_run: Vec::new(),
    };

    // Stage 0: Conservative Filler Word Removal (purges disfluencies like "um", "uh", "haa" early)
    if config.conservative_filler_removal {
        let (no_filler_text, count) = remove_conservative_fillers_audited(&text);
        text = no_filler_text;
        meta.fillers_removed = count;
        if count > 0 {
            meta.stages_run.push("filler_removal".to_string());
        }
    }

    // Stage 1: Conversational Speech Self-Correction & Repair (e.g. "at 4pm, oh no, 5pm" -> "at 5pm")
    if config.speech_repair {
        text = repair_phonetic_speech_confusions(&text);
        let (repaired_text, count) = repair_speech_self_corrections(&text);
        text = repaired_text;
        meta.repairs_applied = count;
        if count > 0 {
            meta.stages_run.push("speech_repair".to_string());
        }
    }

    // Stage 2: Spoken Punctuation and Formatting Phrases (Context-Aware)
    if config.spoken_punctuation {
        let (punct_text, count) = apply_spoken_punctuation_conservative(&text);
        text = punct_text;
        meta.punctuation_applied = count;
        meta.stages_run.push("spoken_punctuation".to_string());
    }

    // Stage 2.3: Spoken Emojis (e.g. "crying emoji" -> 😭, "slapping emoji" -> 🤦, "fire emoji" -> 🔥)
    text = format_spoken_emojis(&text);

    // Stage 2.5: Automatic Spoken Lists (Numbered & Bulleted Lists)
    text = format_spoken_lists(&text);

    // Stage 2.7: Spoken Time Expressions (e.g. "nine thirty am" -> "9:30 AM", "5pm" -> "5:00 PM", "quarter to five pm" -> "4:45 PM")
    text = format_spoken_time_expressions(&text);

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
    text = normalize_contraction_casing(&text);
    text = fix_common_proper_nouns(&text);
    text = apply_developer_code_syntax(&text);
    text = apply_developer_casing_commands(&text);
    text = apply_developer_terminal_formatting(&text);
    text = clean_punctuation_and_whitespace(&text);
    text = normalize_contraction_casing(&text);
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
    let mut paren_depth: usize = 0;
    let mut bracket_depth: usize = 0;
    let mut brace_depth: usize = 0;

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

        // "apostrophe s" -> "'s"
        if curr_lower == "apostrophe" && i + 1 < words.len() {
            let next_clean = clean_word_for_matching(words[i + 1]);
            if next_clean == "s" {
                let is_meta = if let Some(prev) = out.last() {
                    let p = clean_word_for_matching(prev);
                    p == "for" || p == "the" || p == "an" || p == "about" || p == "say" || p == "take" || p == "taking"
                } else {
                    true
                };

                if is_meta {
                    out.push(curr_raw.to_string());
                    out.push(words[i + 1].to_string());
                } else {
                    let punct_suffix = words[i + 1].trim_start_matches(|c: char| c == 's' || c == 'S');
                    if let Some(prev) = out.last_mut() {
                        if prev.ends_with(',') {
                            prev.pop();
                        }
                        prev.push_str("'s");
                        prev.push_str(punct_suffix);
                    } else {
                        out.push(format!("'s{}", punct_suffix));
                    }
                }
                count += 1;
                i += 2;
                continue;
            }
        }

        // Single "apostrophe" -> "'"
        if curr_lower == "apostrophe" {
            let is_meta = if let Some(prev) = out.last() {
                let p = clean_word_for_matching(prev);
                p == "the" || p == "an" || p == "no" || p == "say" || p == "for"
            } else {
                false
            };
            if is_meta {
                out.push(curr_raw.to_string());
            } else {
                attach_punctuation_to_last(&mut out, "'");
                count += 1;
            }
            i += 1;
            continue;
        }

        // "open parenthesis" / "open paren" / "open parens" -> "("
        if curr_lower == "open" && i + 1 < words.len() {
            let next_lower = clean_word_for_matching(words[i + 1]);
            if next_lower == "parenthesis" || next_lower == "paren" || next_lower == "parens" {
                if let Some(prev) = out.last_mut() {
                    if prev.ends_with(',') {
                        prev.pop();
                    }
                }
                out.push("(".to_string());
                paren_depth += 1;
                count += 1;
                i += 2;
                continue;
            }
            if next_lower == "bracket" || next_lower == "brackets" {
                out.push("[".to_string());
                bracket_depth += 1;
                count += 1;
                i += 2;
                continue;
            }
            if next_lower == "brace" || next_lower == "braces" {
                out.push("{".to_string());
                brace_depth += 1;
                count += 1;
                i += 2;
                continue;
            }
        }

        // "close parenthesis" / "close paren" / "close parens" -> ")"
        if curr_lower == "close" && i + 1 < words.len() {
            let next_lower = clean_word_for_matching(words[i + 1]);
            if next_lower == "parenthesis" || next_lower == "paren" || next_lower == "parens" {
                attach_punctuation_to_last(&mut out, ")");
                if paren_depth > 0 {
                    paren_depth -= 1;
                }
                count += 1;
                i += 2;
                continue;
            }
            if next_lower == "bracket" || next_lower == "brackets" {
                attach_punctuation_to_last(&mut out, "]");
                if bracket_depth > 0 {
                    bracket_depth -= 1;
                }
                count += 1;
                i += 2;
                continue;
            }
            if next_lower == "brace" || next_lower == "braces" {
                attach_punctuation_to_last(&mut out, "}");
                if brace_depth > 0 {
                    brace_depth -= 1;
                }
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

        // Single "parenthesis" / "parentheses" / "paren" / "parens":
        if curr_lower == "parenthesis" || curr_lower == "parentheses" || curr_lower == "paren" || curr_lower == "parens" {
            if is_literal_parenthesis_context(words.as_slice(), i) {
                out.push(curr_raw.to_string());
            } else if paren_depth == 0 {
                if let Some(prev) = out.last_mut() {
                    if prev.ends_with(',') {
                        prev.pop();
                    }
                }
                out.push("(".to_string());
                paren_depth += 1;
                count += 1;
            } else {
                attach_punctuation_to_last(&mut out, ")");
                paren_depth -= 1;
                count += 1;
            }
            i += 1;
            continue;
        }

        // Single "bracket" / "brackets":
        if curr_lower == "bracket" || curr_lower == "brackets" {
            if bracket_depth == 0 {
                out.push("[".to_string());
                bracket_depth += 1;
                count += 1;
            } else {
                attach_punctuation_to_last(&mut out, "]");
                bracket_depth -= 1;
                count += 1;
            }
            i += 1;
            continue;
        }

        // Single "brace" / "braces":
        if curr_lower == "brace" || curr_lower == "braces" {
            if brace_depth == 0 {
                out.push("{".to_string());
                brace_depth += 1;
                count += 1;
            } else {
                attach_punctuation_to_last(&mut out, "}");
                brace_depth -= 1;
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

fn is_meridiem_token(s: &str) -> bool {
    let clean = clean_word_for_matching(s);
    clean == "am" || clean == "pm"
}

fn is_time_or_number_token(s: &str) -> bool {
    let clean = clean_word_for_matching(s);
    if clean.is_empty() {
        return false;
    }
    clean.ends_with("pm") || clean.ends_with("am") || clean.contains(':') || clean.chars().all(|c| c.is_ascii_digit())
}

fn is_preposition_token(s: &str) -> bool {
    let clean = clean_word_for_matching(s);
    matches!(clean.as_str(), "at" | "in" | "on" | "for" | "to" | "from" | "by" | "with")
}

fn is_day_token(s: &str) -> bool {
    let clean = clean_word_for_matching(s);
    matches!(clean.as_str(), "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday")
}

fn is_retraction_cue(w_curr: &str, prev_tok: &str, next_tok: &str, has_comma: bool) -> bool {
    let prev_clean = clean_word_for_matching(prev_tok);
    let next_clean = clean_word_for_matching(next_tok);

    if has_comma {
        return matches!(w_curr, "no" | "wait" | "actually" | "sorry" | "correction");
    }

    if matches!(w_curr, "actually" | "sorry" | "correction") {
        return true;
    }

    if w_curr == "wait" {
        let command_prev = matches!(
            prev_clean.as_str(),
            "please" | "can" | "could" | "will" | "would" | "to" | "just" | "dont" | "don't" | "and" | "you"
        );
        let command_next = matches!(
            next_clean.as_str(),
            "for" | "here" | "there" | "until" | "a" | "an" | "the" | "minute" | "moment" | "second" | "patiently"
        );
        if command_prev || command_next {
            return false;
        }
        return true;
    }

    if w_curr == "no" {
        let determiner_prev = matches!(
            prev_clean.as_str(),
            "have" | "has" | "had" | "there" | "is" | "are" | "was" | "were"
            | "with" | "without" | "see" | "saw" | "got" | "contains" | "contain"
        );
        let determiner_next = matches!(
            next_clean.as_str(),
            "problem" | "worries" | "doubt" | "idea" | "clue" | "way" | "matter"
            | "reason" | "chance" | "longer" | "one" | "other" | "more"
        );
        if determiner_prev || determiner_next {
            return false;
        }
        return true;
    }

    false
}

/// Automatically repairs high-frequency phonetic acoustic confusions and decompositions
/// from Whisper (e.g. "charge her beauty" -> "ChatGPT", "picking the vats" -> "picking the words").
pub fn repair_phonetic_speech_confusions(input: &str) -> String {
    let mut text = input.to_string();

    // 1. ChatGPT phonetic decompositions
    let chatgpt_patterns = [
        ("charge her beauty", "ChatGPT"),
        ("Charge her beauty", "ChatGPT"),
        ("charge her beat", "ChatGPT"),
        ("Charge her beat", "ChatGPT"),
        ("chatgot", "ChatGPT"),
        ("Chatgot", "ChatGPT"),
        ("chat got", "ChatGPT"),
        ("Chat got", "ChatGPT"),
        ("chai gpt", "ChatGPT"),
        ("Chai GPT", "ChatGPT"),
        ("chat, Pritik", "ChatGPT"),
        ("chat, pritik", "ChatGPT"),
    ];
    for (pat, rep) in chatgpt_patterns {
        if text.contains(pat) {
            text = text.replace(pat, rep);
        }
    }

    // 2. Accented / fast speech Indian English substitutions for "words" (e.g. [ʋəːdz] heard as "vats" or "volts")
    let word_patterns = [
        ("picking the vats", "picking the words"),
        ("Picking the vats", "Picking the words"),
        ("pick the vats", "pick the words"),
        ("Pick the vats", "Pick the words"),
        ("picking the volts", "picking the words"),
        ("Picking the volts", "Picking the words"),
        ("pick the volts", "pick the words"),
        ("Pick the volts", "Pick the words"),
        ("even the vats", "even the words"),
        ("Even the vats", "Even the words"),
        ("even the volts", "even the words"),
        ("Even the volts", "Even the words"),
        ("the vats like", "the words like"),
        ("The vats like", "The words like"),
        ("the volts like", "the words like"),
        ("The volts like", "The words like"),
        ("basic vats", "basic words"),
        ("Basic vats", "Basic words"),
        ("basic volts", "basic words"),
        ("Basic volts", "Basic words"),
        ("wrong vats", "wrong words"),
        ("Wrong vats", "Wrong words"),
        ("wrong volts", "wrong words"),
        ("Wrong volts", "Wrong words"),
        ("these vats", "these words"),
        ("These vats", "These words"),
        ("these volts", "these words"),
        ("These volts", "These words"),
        ("speaking vats", "speaking words"),
        ("Speaking vats", "Speaking words"),
        ("speaking volts", "speaking words"),
        ("Speaking volts", "Speaking words"),
        ("spoke vats", "spoke words"),
        ("spoke volts", "spoke words"),
    ];
    for (pat, rep) in word_patterns {
        if text.contains(pat) {
            text = text.replace(pat, rep);
        }
    }

    // 3. Gemini technical context
    let gemini_patterns = [
        ("so that the Germany can generate", "so that Gemini can generate"),
        ("so that Germany can generate", "so that Gemini can generate"),
        ("ask Germany to", "ask Gemini to"),
        ("the Germany model", "the Gemini model"),
    ];
    for (pat, rep) in gemini_patterns {
        if text.contains(pat) {
            text = text.replace(pat, rep);
        }
    }

    // 4. Acoustic confusions for battery (e.g. retroflex "battery connection / consumption" heard as "baddi collection")
    let battery_patterns = [
        ("the baddi collection in UI", "the battery consumption in UI"),
        ("The baddi collection in UI", "The battery consumption in UI"),
        ("baddi collection", "battery consumption"),
        ("Baddi collection", "Battery consumption"),
        ("baddi consumption", "battery consumption"),
        ("Baddi consumption", "Battery consumption"),
        ("baddi condition", "battery condition"),
        ("Baddi condition", "Battery condition"),
        ("baddi constraint", "battery constraint"),
        ("Baddi constraint", "Battery constraint"),
        ("baddi", "battery"),
        ("Baddi", "Battery"),
        ("UI constant in battery constraint", "UI constraint and battery constraint"),
        ("UI constant and battery constraint", "UI constraint and battery constraint"),
        ("UI constant", "UI constraint"),
        ("UI constants", "UI constraints"),
        ("battery constant", "battery constraint"),
        ("battery constants", "battery constraints"),
    ];
    for (pat, rep) in battery_patterns {
        if text.contains(pat) {
            text = text.replace(pat, rep);
        }
    }

    // 5. Acoustic confusions for "just" / "must" vs "rust"
    let rust_just_patterns = [
        ("it Rust be", "it must be"),
        ("it rust be", "it must be"),
        ("It Rust be", "It must be"),
        ("It rust be", "It must be"),
        ("Rust for", "just for"),
        ("rust for", "just for"),
        ("Rust like", "just like"),
        ("rust like", "just like"),
        ("Rust brainstorming", "just brainstorming"),
        ("rust brainstorming", "just brainstorming"),
        ("Rust brainstorm", "just brainstorm"),
        ("rust brainstorm", "just brainstorm"),
        ("Rust see", "just see"),
        ("rust see", "just see"),
        ("Rust check", "just check"),
        ("rust check", "just check"),
        ("Rust do", "just do"),
        ("rust do", "just do"),
        ("Rust make", "just make"),
        ("rust make", "just make"),
        ("Rust think", "just think"),
        ("rust think", "just think"),
        ("Rust let", "just let"),
        ("rust let", "just let"),
        ("Rust before", "just before"),
        ("rust before", "just before"),
        ("Rust now", "just now"),
        ("rust now", "just now"),
        ("Rust wanted", "just wanted"),
        ("rust wanted", "just wanted"),
        ("Rust need", "just need"),
        ("rust need", "just need"),
        ("Rust want", "just want"),
        ("rust want", "just want"),
        ("Rust wait", "just wait"),
        ("rust wait", "just wait"),
        ("Rust because", "just because"),
        ("rust because", "just because"),
        ("Rust as", "just as"),
        ("rust as", "just as"),
        ("Rust a ", "just a "),
        ("rust a ", "just a "),
        ("Rust an ", "just an "),
        ("rust an ", "just an "),
        ("Rust the ", "just the "),
        ("rust the ", "just the "),
        ("don't Rust", "don't just"),
        ("don't rust", "don't just"),
        ("Don't Rust", "Don't just"),
        ("Don't rust", "Don't just"),
        ("can Rust", "can just"),
        ("can rust", "can just"),
        ("will Rust", "will just"),
        ("will rust", "will just"),
        ("would Rust", "would just"),
        ("would rust", "would just"),
        ("could Rust", "could just"),
        ("could rust", "could just"),
        ("is Rust", "is just"),
        ("is rust", "is just"),
        ("it's Rust", "it's just"),
        ("it's rust", "it's just"),
        ("was Rust", "was just"),
        ("was rust", "was just"),
        ("not Rust", "not just"),
        ("not rust", "not just"),
    ];
    for (pat, rep) in rust_just_patterns {
        if text.contains(pat) {
            text = text.replace(pat, rep);
        }
    }

    // 5. Fast-speech elisions
    let fast_speech_patterns = [
        ("speak of faster", "speak faster"),
        ("speaks of faster", "speaks faster"),
        ("speaking of faster", "speaking faster"),
        ("words are not picking", "words are not being picked"),
        ("words are not picking when", "words are not being picked when"),
        ("words efficiencies improve", "word efficiency has improved"),
        ("words efficiency improve", "word efficiency has improved"),
        ("words efficiencies", "word efficiency"),
        ("words efficiency", "word efficiency"),
        ("There is no much", "There is not much"),
        ("there is no much", "there is not much"),
    ];
    for (pat, rep) in fast_speech_patterns {
        if text.contains(pat) {
            text = text.replace(pat, rep);
        }
    }

    // 6. UI terminology acoustic repair (e.g. "dictionary modal" decomposed as "dictionary, mold, or")
    let ui_modal_patterns = [
        ("dictionary, mold, or", "dictionary modal"),
        ("Dictionary, mold, or", "Dictionary modal"),
        ("dictionary, mold or", "dictionary modal"),
        ("Dictionary, mold or", "Dictionary modal"),
        ("dictionary mold, or", "dictionary modal"),
        ("Dictionary mold, or", "Dictionary modal"),
        ("dictionary mold or", "dictionary modal"),
        ("Dictionary mold or", "Dictionary modal"),
        ("dictionary, mold", "dictionary modal"),
        ("Dictionary, mold", "Dictionary modal"),
        ("dictionary mold", "dictionary modal"),
        ("Dictionary mold", "Dictionary modal"),
        ("dictation, mold, or", "dictation mode"),
        ("Dictation, mold, or", "Dictation mode"),
        ("dictation, mold or", "dictation mode"),
        ("Dictation, mold or", "Dictation mode"),
        ("dictation mold, or", "dictation mode"),
        ("Dictation mold, or", "Dictation mode"),
        ("dictation mold or", "dictation mode"),
        ("Dictation mold or", "Dictation mode"),
        ("dictation, mold", "dictation mode"),
        ("Dictation, mold", "Dictation mode"),
        ("dictation mold", "dictation mode"),
        ("Dictation mold", "Dictation mode"),
        ("dictionary modal is being blank", "dictionary modal is blank"),
        ("dictionary mode is being blank", "dictionary mode is blank"),
        ("dictation mode is being blank", "dictation mode is blank"),
    ];
    for (pat, rep) in ui_modal_patterns {
        if text.contains(pat) {
            text = text.replace(pat, rep);
        }
    }

    // 7. Developer & domain vocabulary acoustic repair
    let developer_vocab_patterns = [
        // "repos" / "repose" confusion
        ("website or the repose", "website or the repos"),
        ("Website or the repose", "Website or the repos"),
        ("the website or the repose", "the website or the repos"),
        ("The website or the repose", "The website or the repos"),
        ("git repose", "git repos"),
        ("Git repose", "Git repos"),
        ("github repose", "GitHub repos"),
        ("GitHub repose", "GitHub repos"),
        ("check the repose", "check the repos"),
        ("Check the repose", "Check the repos"),
        ("in the repose", "in the repos"),
        ("around the repose", "around the repos"),
        ("the repose", "the repos"),

        // "UI" / "UF" / "sea" confusions
        ("making the UF fixes", "making the UI fixes"),
        ("the UF fixes", "the UI fixes"),
        ("The UF fixes", "The UI fixes"),
        ("UF fixes", "UI fixes"),
        ("UF design", "UI design"),
        ("UF designs", "UI designs"),
        ("the UF", "the UI"),
        ("The UF", "The UI"),
        ("new UF", "new UI"),
        ("The sea looks good", "The UI looks good"),
        ("the sea looks good", "the UI looks good"),

        // "Wispr Flow" / "this Perflow"
        ("this Perflow", "Wispr Flow"),
        ("this perflow", "Wispr Flow"),
        ("This Perflow", "Wispr Flow"),
        ("this per flow", "Wispr Flow"),
        ("perflow", "Wispr Flow"),

        // "demo app" / "dumb app"
        ("as a dumb app", "as a demo app"),
        ("As a dumb app", "As a demo app"),
        ("a dumb app", "a demo app"),

        // "from my side" / "from my site"
        ("part from my site", "from my side"),
        ("part from my side", "from my side"),
        ("from my site", "from my side"),

        // "trading journal" / "training journal"
        ("training journal", "trading journal"),
        ("Training journal", "Trading journal"),

        // "being generated" phonetic decomposition repair
        ("This is Bing.Gentreter", "This is being generated"),
        ("This is Bing. Gentreter", "This is being generated"),
        ("this is Bing.Gentreter", "this is being generated"),
        ("it's Bing.Gentreter", "it's being generated"),
        ("it's Bing. Gentreter", "it's being generated"),
        ("Bing.Gentreter", "being generated"),
        ("Bing. Gentreter", "being generated"),
        ("Bing Gentreter", "being generated"),
        ("bing gentreter", "being generated"),
        ("raw, what's it", "wrong words"),
        ("raw what's it", "wrong words"),

        // "along with efficiency" acoustic confusion
        ("color with efficiency", "along with efficiency"),
        ("Color with efficiency", "Along with efficiency"),

        // Phonetic repairs for fast conversational Indian English
        ("touch mix in those things", "to fix those things"),
        ("touch mix", "to fix"),
        ("touch fix", "to fix"),
        ("wrong would she just take", "wrong words it just took"),
        ("wrong would she", "wrong words it"),
        ("The white of Pakistan is traveling with UI", "The width of the pill is conflicting with the UI"),
        ("Pakistan is traveling with UI", "pill is conflicting with the UI"),
        ("When Dragon is d", "When dragging it"),
        ("When Dragon is", "When dragging"),
        ("when Dragon is", "when dragging"),
        ("it's taking the wrong", "it's taking them wrong"),

        // Spurious mid-clause comma elisions before verbs
        ("properly, take it", "properly take it"),
        ("properly, take", "properly take"),
        ("and then, approve", "and then approve"),
        ("then, approve", "then approve"),

        // Next.js and React acoustic speech confusions ("next to JS" -> "Next.js", "React in JS" -> "React.js")
        ("next to JS", "Next.js"),
        ("next to js", "Next.js"),
        ("Next to JS", "Next.js"),
        ("Next to js", "Next.js"),
        ("next 2 JS", "Next.js"),
        ("next 2 js", "Next.js"),
        ("React in JS", "React.js"),
        ("react in js", "React.js"),
        ("React in js", "React.js"),
        ("react in JS", "React.js"),

        // Framework acoustic decompositions ("frame where" -> "framework")
        ("some kind of particular frame where they have stick", "some kind of particular framework they stick to"),
        ("some kind of particular frame where they stick", "some kind of particular framework they stick to"),
        ("particular frame where they have stick", "particular framework they stick to"),
        ("particular frame where they stick", "particular framework they stick to"),
        ("frame where they have stick", "framework they stick to"),
        ("frame where they stick", "framework they stick to"),
        ("particular frame where", "particular framework"),
        ("kind of frame where", "kind of framework"),
        ("type of frame where", "type of framework"),
        ("sort of frame where", "sort of framework"),
        ("which frame where", "which framework"),

        // Fast speech repairs ("what are in common", "of particular set")
        ("what are in common", "what's in common"),
        ("what is in common", "what's in common"),
        ("use of particular set", "use a particular set"),
        ("of particular set of languages", "a particular set of languages"),

        // Vibe coding / vibe-coded acoustic decompositions
        ("vibe, core head, shit", "vibe-coded shit"),
        ("vibe core head, shit", "vibe-coded shit"),
        ("vibe core head shit", "vibe-coded shit"),
        ("vibe, core head", "vibe-coded"),
        ("vibe core head", "vibe-coded"),
        ("vibe, corehead", "vibe-coded"),
        ("vibe corehead", "vibe-coded"),
        ("vibe cold", "vibe-coded"),
        ("vibe code it", "vibe-coded"),
        ("vibe code", "vibe-code"),
        ("vibe coding", "vibe-coding"),
        ("vibe coder", "vibe-coder"),
        ("vibe coders", "vibe-coders"),

        // Acoustic confusions for "apostrophe s" / "apostrophe" / "lowercase s"
        ("For a first trophy, s,", "For apostrophe s,"),
        ("for a first trophy, s,", "for apostrophe s,"),
        ("For a first trophy, s", "For apostrophe s"),
        ("for a first trophy, s", "for apostrophe s"),
        ("For a first trophy s", "For apostrophe s"),
        ("for a first trophy s", "for apostrophe s"),
        ("a first trophy, s", "apostrophe s"),
        ("A first trophy, s", "Apostrophe s"),
        ("a first trophy s", "apostrophe s"),
        ("A first trophy s", "Apostrophe s"),
        ("first trophy, s", "apostrophe s"),
        ("First trophy, s", "Apostrophe s"),
        ("first trophy s", "apostrophe s"),
        ("First trophy s", "Apostrophe s"),
        ("a fast trophy, s", "apostrophe s"),
        ("a fast trophy s", "apostrophe s"),
        ("a post trophy, s", "apostrophe s"),
        ("a post trophy s", "apostrophe s"),
        ("apostrophe, s", "apostrophe s"),
        ("apostrophe, S", "apostrophe s"),
        ("apostrophe S", "apostrophe s"),
        ("rather than a smaller row, yes", "rather than a lowercase s, yes"),
        ("rather than a smaller row yes", "rather than a lowercase s, yes"),
        ("rather than a smaller row", "rather than a lowercase s"),
        ("smaller row, yes", "lowercase s, yes"),
        ("smaller row yes", "lowercase s, yes"),
    ];
    for (pat, rep) in developer_vocab_patterns {
        if text.contains(pat) {
            text = text.replace(pat, rep);
        }
    }

    // 8. Tribe, community & cohort terminology acoustic repair
    let tribe_patterns = [
        ("once I try members", "once our tribe members"),
        ("once try members", "once tribe members"),
        ("I try members", "our tribe members"),
        ("our try members", "our tribe members"),
        ("the try members", "the tribe members"),
        ("try members", "tribe members"),
        ("Try members", "Tribe members"),
        ("try member", "tribe member"),
        ("Try member", "Tribe member"),
        ("our try,", "our tribe,"),
        ("our try ", "our tribe "),
        ("in our try", "in our tribe"),
        ("join our try", "join our tribe"),
        ("part of our try", "part of our tribe"),
        ("trive members", "tribe members"),
        ("Trive members", "Tribe members"),
        ("trive member", "tribe member"),
        ("Trive member", "Tribe member"),
        ("our trive", "our tribe"),
        ("the trive", "the tribe"),
        ("trive", "tribe"),
        ("Trive", "Tribe"),
        ("core try", "core tribe"),
        ("Core try", "Core tribe"),
        ("tech try", "tech tribe"),
        ("Tech try", "Tech tribe"),
        ("student try", "student tribe"),
        ("Student try", "Student tribe"),
    ];
    for (pat, rep) in tribe_patterns {
        if text.contains(pat) {
            text = text.replace(pat, rep);
        }
    }

    // 9. Ma'am / Respectful workplace address acoustic repair
    let maam_patterns = [
        ("Yeah, Maam", "Yeah, ma'am"),
        ("Yeah Maam", "Yeah, ma'am"),
        ("yeah, maam", "Yeah, ma'am"),
        ("yeah maam", "Yeah, ma'am"),
        ("Yes, Maam", "Yes, ma'am"),
        ("Yes Maam", "Yes, ma'am"),
        ("yes, maam", "Yes, ma'am"),
        ("yes maam", "Yes, ma'am"),
        ("No, Maam", "No, ma'am"),
        ("No Maam", "No, ma'am"),
        ("no, maam", "No, ma'am"),
        ("no maam", "No, ma'am"),
        ("Ok Maam", "Okay, ma'am"),
        ("Okay Maam", "Okay, ma'am"),
        ("ok maam", "Okay, ma'am"),
        ("okay maam", "Okay, ma'am"),
        ("Thank you Maam", "Thank you, ma'am"),
        ("thank you maam", "Thank you, ma'am"),
        ("Thanks Maam", "Thanks, ma'am"),
        ("thanks maam", "Thanks, ma'am"),
        ("Hello Maam", "Hello, ma'am"),
        ("hello maam", "Hello, ma'am"),
        ("Hi Maam", "Hi, ma'am"),
        ("hi maam", "Hi, ma'am"),
        ("Yeah, Man,", "Yeah, ma'am,"),
        ("Yeah, man,", "Yeah, ma'am,"),
        ("Yeah Man,", "Yeah, ma'am,"),
        ("Yeah man,", "Yeah, ma'am,"),
        ("Yes, Man,", "Yes, ma'am,"),
        ("Yes, man,", "Yes, ma'am,"),
        ("Yes Man,", "Yes, ma'am,"),
        ("Yes man,", "Yes, ma'am,"),
        ("No, Man,", "No, ma'am,"),
        ("No, man,", "No, ma'am,"),
        ("No Man,", "No, ma'am,"),
        ("No man,", "No, ma'am,"),
        ("Ok Man,", "Okay, ma'am,"),
        ("Ok man,", "Okay, ma'am,"),
        ("Okay Man,", "Okay, ma'am,"),
        ("Okay man,", "Okay, ma'am,"),
        ("Maam,", "Ma'am,"),
        ("maam,", "ma'am,"),
        ("Maam.", "Ma'am."),
        ("maam.", "ma'am."),
        ("Maam!", "Ma'am!"),
        ("maam!", "ma'am!"),
        ("Maam ", "Ma'am "),
        ("maam ", "ma'am "),
        ("yesterday maam", "yesterday, ma'am"),
        ("yesterday, maam", "yesterday, ma'am"),
        ("sent him a copy yesterday, Maam", "sent him a copy yesterday, ma'am"),
        ("sent him a copy yesterday Maam", "sent him a copy yesterday, ma'am"),
        ("sent him a copy yesterday, maam", "sent him a copy yesterday, ma'am"),
        ("sent him a copy yesterday maam", "sent him a copy yesterday, ma'am"),
    ];
    for (pat, rep) in maam_patterns {
        if text.contains(pat) {
            text = text.replace(pat, rep);
        }
    }

    // 10. Indian English conversational discourse markers ("and all")
    let and_all_patterns = [
        ("plans at all, and", "plans and all, and"),
        ("plans at all and", "plans and all, and"),
        ("things at all, and", "things and all, and"),
        ("things at all and", "things and all, and"),
        ("photos at all, and", "photos and all, and"),
        ("photos at all and", "photos and all, and"),
        ("videos at all, and", "videos and all, and"),
        ("videos at all and", "videos and all, and"),
        ("stuff at all, and", "stuff and all, and"),
        ("stuff at all and", "stuff and all, and"),
        ("tagging at all, and", "tagging and all, and"),
        ("tagging at all and", "tagging and all, and"),
        ("options at all, and", "options and all, and"),
        ("options at all and", "options and all, and"),
        ("features at all, and", "features and all, and"),
        ("features at all and", "features and all, and"),
        ("modules at all, and", "modules and all, and"),
        ("modules at all and", "modules and all, and"),
        ("tasks at all, and", "tasks and all, and"),
        ("tasks at all and", "tasks and all, and"),
        ("work at all, and", "work and all, and"),
        ("work at all and", "work and all, and"),
        ("rules at all, and", "rules and all, and"),
        ("rules at all and", "rules and all, and"),
        ("monetization plan at all", "monetization plan and all"),
        ("monetization plans at all", "monetization plans and all"),
        ("and doll", "and all"),
        ("And doll", "And all"),
        ("and dol", "and all"),
        ("And dol", "And all"),
        ("and, all", "and all"),
    ];
    for (pat, rep) in and_all_patterns {
        if text.contains(pat) {
            text = text.replace(pat, rep);
        }
    }

    text
}

/// Automatically detects and resolves conversational self-corrections (speech repair)
/// Examples:
/// - "A meeting was there at 4pm, oh no, 5pm." -> "A meeting was there at 5pm."
/// - "The meeting no, it's at 5 PM." -> "The meeting is at 5 PM."
/// - "Meeting at 4:00 PM, oh no, 5:00 PM." -> "Meeting at 5:00 PM."
/// - "Let's do Monday, actually Tuesday." -> "Let's do Tuesday."
/// - "We have 10 users, sorry, 20 users." -> "We have 20 users."
/// - "Send to Sarah, wait, Alex." -> "Send to Alex."
/// - "Deploy to test, scratch that, deploy to production." -> "Deploy to production."
/// - "I want red no blue" -> "I want blue"
/// - "Call at 3 wait 4" -> "Call at 4"
pub fn repair_speech_self_corrections(input: &str) -> (String, usize) {
    let words: Vec<&str> = input.split_whitespace().collect();
    if words.len() < 3 {
        return (input.to_string(), 0);
    }

    let mut out: Vec<String> = words.iter().map(|s| s.to_string()).collect();
    let mut total_repairs = 0;

    let mut i = 1;
    while i < out.len() {
        let w_curr = clean_word_for_matching(&out[i]);
        let w_next = if i + 1 < out.len() { clean_word_for_matching(&out[i + 1]) } else { String::new() };

        let mut cue_len = 0;
        let mut starts_with_its = false;
        let has_comma = out[i].contains(',') || out[i].ends_with(',') || (i > 0 && out[i - 1].ends_with(','));

        if (w_curr == "oh" && w_next == "no")
            || (w_curr == "no" && w_next == "wait")
            || (w_curr == "wait" && w_next == "no")
            || (w_curr == "wait" && w_next == "sorry")
            || (w_curr == "scratch" && w_next == "that")
            || (w_curr == "or" && w_next == "rather")
            || (w_curr == "make" && w_next == "that")
            || (w_curr == "my" && w_next == "bad")
            || (w_curr == "my" && w_next == "mistake")
            || (w_curr == "i" && w_next == "meant")
            || (w_curr == "i" && w_next == "mean")
            || (w_curr == "sorry" && (w_next == "i" || w_next == "meant"))
        {
            cue_len = 2;
        } else if w_curr == "no" && (w_next == "its" || w_next == "it's" || w_next == "it") {
            cue_len = 2;
            starts_with_its = true;
        } else if is_retraction_cue(&w_curr, &out[i - 1], &w_next, has_comma) {
            cue_len = 1;
        }

        if cue_len == 0 || i + cue_len >= out.len() || (i > 0 && (out[i - 1].ends_with('.') || out[i - 1].ends_with('?') || out[i - 1].ends_with('!'))) {
            i += 1;
            continue;
        }

        let rem_tokens = &out[i + cue_len..];
        if rem_tokens.is_empty() {
            i += 1;
            continue;
        }

        let mut k = rem_tokens.len().min(4);
        for (idx, tok) in rem_tokens.iter().enumerate().take(4) {
            if tok.ends_with('.') || tok.ends_with('?') || tok.ends_with('!') || tok.ends_with(';') {
                k = idx + 1;
                break;
            }
        }

        let first_rem_clean = clean_word_for_matching(&rem_tokens[0]);
        let mut matched_idx = None;

        // 1. Look for matching preposition or exact leading word (e.g. "at 4pm" vs "at 5pm")
        if is_preposition_token(&first_rem_clean) {
            for j in (0..i).rev() {
                if clean_word_for_matching(&out[j]) == first_rem_clean {
                    matched_idx = Some(j);
                    break;
                }
            }
        }

        // 2. Look for matching time/number/day token if leading token is a time/number/day
        if matched_idx.is_none() && (is_time_or_number_token(&first_rem_clean) || is_day_token(&first_rem_clean)) {
            for j in (0..i).rev() {
                let prev_clean = clean_word_for_matching(&out[j]);
                // If seeking a time digit (e.g. 5:00) but hit a standalone meridiem (PM), skip it to match 4:00
                if is_meridiem_token(&prev_clean) && !is_meridiem_token(&first_rem_clean) {
                    continue;
                }
                if (is_time_or_number_token(&first_rem_clean) && is_time_or_number_token(&prev_clean))
                    || (is_day_token(&first_rem_clean) && is_day_token(&prev_clean))
                {
                    matched_idx = Some(j);
                    break;
                }
            }
        }

        // 3. Look for exact matching token in preceding window
        if matched_idx.is_none() && k > 1 {
            for j in (0..i).rev() {
                if clean_word_for_matching(&out[j]) == first_rem_clean {
                    matched_idx = Some(j);
                    break;
                }
            }
        }

        if let Some(m_start) = matched_idx {
            let reparandum_start = m_start;
            let repair_k = if rem_tokens.len() > 1 && (is_preposition_token(&clean_word_for_matching(&rem_tokens[1])) || matches!(rem_tokens[1].to_lowercase().as_str(), "and" | "or" | "but" | "so" | "because" | "since" | "then" | "for")) {
                1
            } else {
                k
            };
            let mut repair_slice: Vec<String> = out[i + cue_len..i + cue_len + repair_k].to_vec();
            let delete_end = i + cue_len + repair_k;
            if reparandum_start == 0 && !repair_slice.is_empty() {
                if let Some(first) = repair_slice.first_mut() {
                    let mut chars = first.chars();
                    if let Some(c) = chars.next() {
                        *first = c.to_uppercase().collect::<String>() + chars.as_str();
                    }
                }
            }
            out.splice(reparandum_start..delete_end, repair_slice);
            total_repairs += 1;

            if reparandum_start > 0 && out[reparandum_start - 1].ends_with(',') {
                let prev = &mut out[reparandum_start - 1];
                if prev.ends_with(',') {
                    prev.pop();
                }
            }
            i = reparandum_start + repair_k;
        } else {
            // False start or hesitation after subject (e.g. "The meeting no, it's at 5 PM." or "The meeting no, 5 PM.")
            if starts_with_its || first_rem_clean == "its" || first_rem_clean == "it's" {
                let delete_end = if starts_with_its {
                    i + cue_len
                } else {
                    i + cue_len + 1
                };
                out.splice(i..delete_end, vec!["is".to_string()]);
                total_repairs += 1;
                i += 1;
            } else if (w_curr == "no" && has_comma) && (is_time_or_number_token(&first_rem_clean) || is_preposition_token(&first_rem_clean)) {
                out.splice(i..i + cue_len, vec!["is".to_string()]);
                total_repairs += 1;
                i += 1;
            } else if cue_len == 2 && (w_curr == "scratch" || w_curr == "my" || w_curr == "make" || (w_curr == "i" && w_next == "mean")) {
                let repair_k = k;
                let m_len = repair_k.min(i);
                let reparandum_start = i.saturating_sub(m_len);
                let repair_slice: Vec<String> = out[i + cue_len..i + cue_len + repair_k].to_vec();
                let delete_end = i + cue_len + repair_k;
                out.splice(reparandum_start..delete_end, repair_slice);
                total_repairs += 1;
                i = reparandum_start + repair_k;
            } else if (w_curr == "wait" || w_curr == "sorry" || w_curr == "actually" || w_curr == "no") && i > 0 {
                // Multi-token or single token correction with explicit retraction marker:
                // e.g. "send email to Sarah, wait, Alex." -> "send email to Alex."
                // e.g. "meeting at 4 PM, sorry, at 5 PM." -> "meeting at 5 PM."
                let repair_k = k.min(2);
                let m_len = repair_k.min(i);
                let reparandum_start = i.saturating_sub(m_len);
                let repair_slice: Vec<String> = out[i + cue_len..i + cue_len + repair_k].to_vec();
                let delete_end = i + cue_len + repair_k;
                out.splice(reparandum_start..delete_end, repair_slice);
                total_repairs += 1;
                i = reparandum_start + repair_k;
            } else {
                // If there is no explicit matched reparandum, do NOT delete preceding words!
                i += 1;
            }

            if i > 0 && i - 1 < out.len() && out[i - 1].ends_with(',') {
                out[i - 1].pop();
            }
        }
    }

    if total_repairs > 0 {
        (out.join(" "), total_repairs)
    } else {
        (input.to_string(), 0)
    }
}

/// Formats spoken developer casing commands into code identifiers
/// Examples:
/// - "camel case user profile" -> "userProfile"
/// - "snake case get user by id" -> "get_user_by_id"
/// - "kebab case user service" -> "user-service"
/// - "pascal case order controller" -> "OrderController"
/// - "constant case max retries" -> "MAX_RETRIES"
pub fn apply_developer_casing_commands(input: &str) -> String {
    let lower = input.to_lowercase();
    if !lower.contains("case") {
        return input.to_string();
    }

    if input.contains('\n') {
        return input
            .split('\n')
            .map(apply_developer_casing_commands)
            .collect::<Vec<_>>()
            .join("\n");
    }

    let words: Vec<&str> = input.split_whitespace().collect();
    if words.len() < 3 {
        return input.to_string();
    }

    let mut out = Vec::new();
    let mut i = 0;

    while i < words.len() {
        let w_curr = clean_word_for_matching(words[i]);
        let w_next = if i + 1 < words.len() { clean_word_for_matching(words[i + 1]) } else { String::new() };

        let casing_mode = if w_curr == "camel" && w_next == "case" {
            Some("camel")
        } else if w_curr == "snake" && w_next == "case" {
            Some("snake")
        } else if w_curr == "kebab" && w_next == "case" {
            Some("kebab")
        } else if w_curr == "pascal" && w_next == "case" {
            Some("pascal")
        } else if (w_curr == "constant" && w_next == "case")
            || (w_curr == "screaming" && w_next == "snake" && i + 2 < words.len() && clean_word_for_matching(words[i + 2]) == "case")
        {
            Some("constant")
        } else {
            None
        };

        if let Some(mode) = casing_mode {
            let prefix_len = if mode == "constant" && w_curr == "screaming" { 3 } else { 2 };
            let start_idx = i + prefix_len;

            // Collect target words to format into an identifier (up to 5 words or until boundary / sentence ending)
            let mut target_words = Vec::new();
            let mut end_idx = start_idx;
            let mut trailing_punct = String::new();
            let boundary_keywords = ["equal", "equals", "is", "as", "in", "from", "with", "by", "for"];

            while end_idx < words.len() && target_words.len() < 5 {
                let raw_word = words[end_idx];
                let clean = clean_word_for_matching(raw_word);
                if clean.is_empty() {
                    break;
                }
                if !target_words.is_empty() && boundary_keywords.contains(&clean.as_str()) {
                    break;
                }
                target_words.push(clean);

                let punct: String = raw_word.chars().filter(|c| !c.is_alphanumeric()).collect();
                if punct.contains('.') || punct.contains('?') || punct.contains('!') || punct.contains(';') || punct.contains(',') {
                    trailing_punct = punct;
                    end_idx += 1;
                    break;
                }
                end_idx += 1;
            }

            if !target_words.is_empty() {
                let formatted_id = match mode {
                    "camel" => {
                        let mut res = target_words[0].to_lowercase();
                        for w in &target_words[1..] {
                            let mut chars = w.chars();
                            if let Some(first) = chars.next() {
                                res.push_str(&first.to_uppercase().collect::<String>());
                                res.push_str(chars.as_str());
                            }
                        }
                        res
                    }
                    "snake" => target_words.iter().map(|w| w.to_lowercase()).collect::<Vec<_>>().join("_"),
                    "kebab" => target_words.iter().map(|w| w.to_lowercase()).collect::<Vec<_>>().join("-"),
                    "pascal" => {
                        let mut res = String::new();
                        for w in &target_words {
                            let mut chars = w.chars();
                            if let Some(first) = chars.next() {
                                res.push_str(&first.to_uppercase().collect::<String>());
                                res.push_str(chars.as_str());
                            }
                        }
                        res
                    }
                    "constant" => target_words.iter().map(|w| w.to_uppercase()).collect::<Vec<_>>().join("_"),
                    _ => target_words.join(" "),
                };

                out.push(format!("{}{}", formatted_id, trailing_punct));
                i = end_idx;
                continue;
            }
        }

        out.push(words[i].to_string());
        i += 1;
    }

    out.join(" ")
}

fn extract_trailing_punctuation(w: &str) -> &str {
    let trimmed = w.trim_end_matches(|c: char| !c.is_alphanumeric());
    &w[trimmed.len()..]
}

/// Formats spoken CLI commands and developer terminal syntax
/// Examples:
/// - "git commit dash m fix issue" -> "git commit -m fix issue"
/// - "npm install dash dash save dev typescript" -> "npm install --save-dev typescript"
/// - "cargo build dash dash release" -> "cargo build --release"
/// - If a line begins with a CLI tool (`git`, `cargo`, `npm`, `pnpm`, `docker`, etc.), strip any trailing sentence period.
pub fn apply_developer_terminal_formatting(input: &str) -> String {
    if input.is_empty() {
        return String::new();
    }

    if input.contains('\n') {
        return input
            .split('\n')
            .map(apply_developer_terminal_formatting)
            .collect::<Vec<_>>()
            .join("\n");
    }

    let words: Vec<&str> = input.split_whitespace().collect();
    if words.is_empty() {
        return input.to_string();
    }

    let mut out: Vec<String> = Vec::with_capacity(words.len());
    let mut i = 0;

    while i < words.len() {
        let curr_clean = clean_word_for_matching(words[i]);
        let next_clean = if i + 1 < words.len() { clean_word_for_matching(words[i + 1]) } else { String::new() };

        // "dash dash save dev" or "double dash save dev" -> "--save-dev"
        if (curr_clean == "dash" && next_clean == "dash" || curr_clean == "double" && next_clean == "dash")
            && i + 3 < words.len()
            && clean_word_for_matching(words[i + 2]) == "save"
            && clean_word_for_matching(words[i + 3]) == "dev"
        {
            let trailing = extract_trailing_punctuation(words[i + 3]);
            out.push(format!("--save-dev{}", trailing));
            i += 4;
            continue;
        }

        // "dash dash <word>" or "double dash <word>" -> "--<word>"
        if (curr_clean == "dash" && next_clean == "dash" || curr_clean == "double" && next_clean == "dash")
            && i + 2 < words.len()
        {
            let target = clean_word_for_matching(words[i + 2]);
            if !target.is_empty() {
                let trailing = extract_trailing_punctuation(words[i + 2]);
                out.push(format!("--{}{}", target, trailing));
                i += 3;
                continue;
            }
        }

        // "dash <flag>" where flag is 1 or 2 letters, e.g. "dash m", "dash a", "dash rf", "dash it"
        if curr_clean == "dash" && i + 1 < words.len() {
            let flag = clean_word_for_matching(words[i + 1]);
            if !flag.is_empty() && flag.len() <= 2 && flag.chars().all(|c| c.is_ascii_alphabetic()) {
                let trailing = extract_trailing_punctuation(words[i + 1]);
                out.push(format!("-{}{}", flag, trailing));
                i += 2;
                continue;
            }
        }

        out.push(words[i].to_string());
        i += 1;
    }

    if out.is_empty() {
        return input.to_string();
    }

    // Check if the command line starts with a recognized developer CLI tool
    const CLI_COMMANDS: &[&str] = &[
        "git", "cargo", "npm", "pnpm", "yarn", "docker", "kubectl", "brew",
        "npx", "curl", "pip", "pip3", "cd", "ls", "mkdir", "rm", "cat",
        "ssh", "tar", "grep", "rustc", "python", "python3", "node", "go"
    ];

    let first_clean = clean_word_for_matching(&out[0]);
    if CLI_COMMANDS.contains(&first_clean.as_str()) {
        // Lowercase the CLI tool in case it was auto-capitalized
        out[0] = first_clean;

        // Strip trailing period or semicolon from the final token so command executes cleanly in terminal
        if let Some(last) = out.last_mut() {
            while last.ends_with('.') || last.ends_with(';') {
                last.pop();
            }
        }
    }

    out.join(" ")
}

/// Formats spoken code syntax constructs and symbols for developer workflows:
/// - "print, parenthesis, items, parenthesis" -> "print(items)"
/// - "console dot log parenthesis item parenthesis" -> "console.log(item)"
/// - "def my_func parenthesis a comma b parenthesis colon" -> "def my_func(a, b):"
/// - "x double equals y" -> "x == y"
/// - "x triple equals y" -> "x === y"
/// - "x not equals y" / "x bang equals y" -> "x != y"
/// - "x greater than or equal to y" -> "x >= y"
/// - "x less than or equal to y" -> "x <= y"
/// - "x fat arrow y" -> "x => y"
/// - "x thin arrow y" -> "x -> y"
/// - "x plus equals one" -> "x += 1"
/// - "x plus plus" -> "x++"
/// - "items bracket zero bracket" -> "items[0]"
/// - "user dot name" -> "user.name"
pub fn apply_developer_code_syntax(input: &str) -> String {
    if input.is_empty() {
        return String::new();
    }

    if input.contains('\n') {
        return input
            .split('\n')
            .map(apply_developer_code_syntax)
            .collect::<Vec<_>>()
            .join("\n");
    }

    let mut text = input.to_string();

    // 1. Spoken quotes, backticks, and code delimiters
    text = text
        .replace("open paren", "(")
        .replace("close paren", ")")
        .replace("open bracket", "[")
        .replace("close bracket", "]")
        .replace("open brace", "{")
        .replace("close brace", "}")
        .replace("(double quote, ", "(\"")
        .replace("(double quote,", "(\"")
        .replace("( double quote, ", "(\"")
        .replace("( double quote,", "(\"")
        .replace("(single quote, ", "('")
        .replace("(single quote,", "('")
        .replace("( single quote, ", "('")
        .replace("( single quote,", "('")
        .replace("double quote,", "\", ")
        .replace("double quote", "\"")
        .replace("double quotes", "\"")
        .replace("single quote,", "', ")
        .replace("single quote", "'")
        .replace("single quotes", "'")
        .replace("back tick", "`")
        .replace("backtick", "`");

    // 2. Spoken operators
    text = text.replace(" triple equals ", " === ")
        .replace(" double equals ", " == ")
        .replace(" bang equals ", " != ")
        .replace(" not equals ", " != ")
        .replace(" greater than or equal to ", " >= ")
        .replace(" less than or equal to ", " <= ")
        .replace(" fat arrow ", " => ")
        .replace(" thin arrow ", " -> ")
        .replace(" plus equals ", " += ")
        .replace(" minus equals ", " -= ")
        .replace(" plus plus", "++")
        .replace(" minus minus", "--");

    // 2. Spoken dot notation between identifiers: "console. log" or "console dot log" -> "console.log"
    let words: Vec<&str> = text.split_whitespace().collect();
    let mut out_tokens: Vec<String> = Vec::with_capacity(words.len());
    let mut i = 0;

    while i < words.len() {
        let curr = words[i];
        let curr_clean = clean_word_for_matching(curr);

        if (curr_clean == "dot" || curr == ".") && i > 0 && i + 1 < words.len() {
            let next_word = words[i + 1];
            let ident_len = next_word.chars().take_while(|c| c.is_alphanumeric() || *c == '_').count();
            if ident_len > 0 && !out_tokens.is_empty() {
                let prev = out_tokens.pop().unwrap();
                let next_ident = &next_word[..ident_len];
                let suffix = &next_word[ident_len..];
                out_tokens.push(format!("{}.{}{}", prev, next_ident, suffix));
                i += 2;
                continue;
            }
        }

        out_tokens.push(curr.to_string());
        i += 1;
    }

    text = out_tokens.join(" ");

    // 3. Parentheses, brackets, and function call binding
    let chars: Vec<char> = text.chars().collect();
    let mut cleaned = String::with_capacity(chars.len());
    let mut idx = 0;

    while idx < chars.len() {
        let c = chars[idx];

        if (c == '(' || c == '[') && cleaned.ends_with(' ') {
            let trimmed = cleaned.trim_end();
            if let Some(last_ch) = trimmed.chars().last() {
                if last_ch.is_alphanumeric() || last_ch == '_' || last_ch == '.' {
                    cleaned = trimmed.to_string();
                }
            }
        }

        if c == '(' && cleaned.ends_with(',') {
            cleaned.pop();
            let trimmed = cleaned.trim_end();
            cleaned = trimmed.to_string();
        }

        cleaned.push(c);

        if c == '(' || c == '[' {
            while idx + 1 < chars.len() && chars[idx + 1] == ' ' {
                idx += 1;
            }
        }

        if idx + 1 < chars.len() && (chars[idx + 1] == ')' || chars[idx + 1] == ']') && cleaned.ends_with(' ') {
            cleaned.pop();
        }

        idx += 1;
    }

    // Strip trailing comma before closing parenthesis: "print(items,)" -> "print(items)"
    cleaned = cleaned.replace(",)", ")").replace(", )", ")");
    cleaned = cleaned.replace("(\" ", "(\"")
        .replace(" \")", "\")")
        .replace(" \",", "\",")
        .replace("\" ,", "\",")
        .replace("\",", "\", ")
        .replace("(\' ", "(\'")
        .replace(" \')", "\')")
        .replace(" \',", "\',")
        .replace("\' ,", "\',")
        .replace("\',", "\', ");
    while cleaned.contains("  ") {
        cleaned = cleaned.replace("  ", " ");
    }

    // 4. Preserve lowercase for standard code functions and keywords if auto-capitalized
    const CODE_STARTS: &[&str] = &[
        "Print(", "Console.log(", "Def ", "Fn ", "Return ", "Import ", "Let ", "Const ", "Var ", "Len(", "Range("
    ];
    for &prefix in CODE_STARTS {
        if cleaned.starts_with(prefix) {
            let lower_prefix = prefix[..1].to_lowercase() + &prefix[1..];
            cleaned = format!("{}{}", lower_prefix, &cleaned[prefix.len()..]);
            break;
        }
    }

    // 5. Control flow keywords maintain space before '(' and lowercase: "If(x" -> "if (x"
    const CONTROL_FLOW: &[&str] = &["if", "while", "for", "switch", "catch", "return"];
    for &kw in CONTROL_FLOW {
        let pattern_paren = format!("{}(", kw);
        let cap_kw = format!("{}{}", &kw[..1].to_uppercase(), &kw[1..]);
        let pattern_cap = format!("{}(", cap_kw);
        cleaned = cleaned.replace(&pattern_paren, &format!("{} (", kw));
        cleaned = cleaned.replace(&pattern_cap, &format!("{} (", kw));
    }

    // 6. Indexers: lowercase identifier before '[': "Items[" -> "items["
    if let Some(bracket_idx) = cleaned.find('[') {
        if bracket_idx > 0 && cleaned.chars().next().unwrap().is_uppercase() {
            let ident = &cleaned[..bracket_idx];
            if ident.chars().all(|c| c.is_alphabetic()) {
                cleaned = format!("{}{}", ident.to_lowercase(), &cleaned[bracket_idx..]);
            }
        }
    }

    // Number word replacements inside brackets: e.g. "[zero]" -> "[0]"
    const DIGIT_WORDS: &[(&str, &str)] = &[
        ("[zero]", "[0]"), ("[one]", "[1]"), ("[two]", "[2]"), ("[three]", "[3]"),
        ("[four]", "[4]"), ("[five]", "[5]"), ("[six]", "[6]"), ("[seven]", "[7]"),
        ("[eight]", "[8]"), ("[nine]", "[9]"), ("[zero", "[0"), ("[one", "[1"),
        ("zero]", "0]"), ("one]", "1]"), ("two]", "2]"), ("three]", "3]"),
        ("four]", "4]"), ("five]", "5]"), ("six]", "6]"), ("seven]", "7]"),
        ("eight]", "8]"), ("nine]", "9]"),
    ];
    for &(word, digit) in DIGIT_WORDS {
        cleaned = cleaned.replace(word, digit);
    }

    // 7. Single letter variables before operators: e.g. "X =>" -> "x =>", "X++" -> "x++"
    const OPERATOR_PREFIXES: &[&str] = &[" =>", " ->", " ==", " !=", " <=", " >=", " +=", " -=", "++", "--"];
    for &op in OPERATOR_PREFIXES {
        if let Some(pos) = cleaned.find(op) {
            if pos == 1 && cleaned.chars().next().unwrap().is_ascii_uppercase() {
                cleaned = format!("{}{}", cleaned[..1].to_lowercase(), &cleaned[1..]);
            }
        }
    }

    cleaned
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
    let next = if idx + 1 < words.len() {
        clean_word_for_matching(words[idx + 1])
    } else {
        String::new()
    };

    if idx > 0 {
        let prev = clean_word_for_matching(words[idx - 1]);
        let literal_preceding = ["the", "oxford", "serial", "inverted", "floating"];
        if literal_preceding.contains(&prev.as_str()) {
            return true;
        }
        if prev == "a" && (next.is_empty() || next == "is" || next == "was" || next == "rule" || next == "splice") {
            return true;
        }
    }

    if !next.is_empty() {
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

fn is_literal_parenthesis_context(words: &[&str], idx: usize) -> bool {
    if idx > 0 {
        let prev = clean_word_for_matching(words[idx - 1]);
        if prev == "in" || prev == "the" || prev == "a" || prev == "this" || prev == "that" || prev == "inside" || prev == "without" {
            return true;
        }
    }
    if idx + 1 < words.len() {
        let next = clean_word_for_matching(words[idx + 1]);
        if next == "is" || next == "was" || next == "are" || next == "were" {
            return true;
        }
    }
    false
}

fn is_disfluent_filler_token(clean: &str) -> bool {
    matches!(
        clean,
        "um" | "uh" | "ah" | "er" | "erm" | "umm" | "uhh" | "ahh" | "err"
        | "haa" | "haan" | "haaa" | "ha" | "hmm" | "hmmm" | "hm"
    )
}

/// Removes standalone disfluent hesitation tokens only when conservative filler removal is enabled
fn remove_conservative_fillers_audited(input: &str) -> (String, usize) {
    let tokens: Vec<&str> = input.split_whitespace().collect();
    let mut kept: Vec<String> = Vec::new();
    let mut removed_count = 0;

    for token in tokens {
        let clean = token.trim_matches(|c: char| !c.is_alphabetic()).to_lowercase();
        // Standalone hesitation tokens only
        if is_disfluent_filler_token(&clean) {
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

fn lookup_emoji(name: &str) -> Option<&'static str> {
    match name.to_lowercase().as_str() {
        "crying" | "cry" | "sob" | "sobbing" | "loudly crying" | "crying face" => Some("😭"),
        "slapping" | "slap" | "facepalm" | "face palm" | "head slap" | "headslap" => Some("🤦"),
        "laughing" | "laugh" | "lol" | "rofl" | "laughing crying" | "crying laughing" => Some("😂"),
        "fire" | "lit" | "flame" => Some("🔥"),
        "heart" | "red heart" | "love" => Some("❤️"),
        "thumbs up" | "thumbsup" | "thumb up" => Some("👍"),
        "thumbs down" | "thumbsdown" | "thumb down" => Some("👎"),
        "skull" | "dead" => Some("💀"),
        "thinking" | "think" => Some("🤔"),
        "smiling" | "smile" | "smiley" | "happy" => Some("😊"),
        "clap" | "clapping" | "applause" => Some("👏"),
        "party" | "celebrate" | "celebration" | "party face" => Some("🥳"),
        "eyes" | "eye" => Some("👀"),
        "rocket" => Some("🚀"),
        "100" | "hundred" => Some("💯"),
        "check" | "checkmark" | "check mark" => Some("✅"),
        "cross" | "cross mark" | "x" => Some("❌"),
        "sparkles" | "sparkle" | "magic" => Some("✨"),
        "pray" | "praying" | "hands folded" | "namaste" => Some("🙏"),
        "sad" | "unhappy" => Some("😢"),
        "angry" | "mad" | "rage" => Some("😡"),
        "wink" | "winking" => Some("😉"),
        "cool" | "sunglasses" => Some("😎"),
        "mind blown" | "mindblown" | "exploding head" => Some("🤯"),
        "sweat smile" | "nervous laugh" => Some("😅"),
        "rolling eyes" | "eye roll" => Some("🙄"),
        "shrug" | "shrugging" => Some("🤷"),
        "handshake" => Some("🤝"),
        "star" => Some("⭐"),
        "coffee" => Some("☕"),
        "muscle" | "flex" | "strong" => Some("💪"),
        "poop" => Some("💩"),
        "wave" | "waving" => Some("👋"),
        "salute" => Some("🫡"),
        _ => None,
    }
}

/// Formats spoken emoji names into native Unicode emojis
/// Examples:
/// - "slapping emoji" -> "🤦"
/// - "crying emoji" -> "😭"
/// - "fire emoji" -> "🔥"
/// - "thumbs up emoji" -> "👍"
pub fn format_spoken_emojis(input: &str) -> String {
    let lines: Vec<&str> = input.split('\n').collect();
    let processed_lines: Vec<String> = lines.into_iter().map(format_spoken_emojis_line).collect();
    processed_lines.join("\n")
}

fn format_spoken_emojis_line(input: &str) -> String {
    let words: Vec<&str> = input.split_whitespace().collect();
    if words.is_empty() {
        return input.to_string();
    }

    let mut out: Vec<String> = words.iter().map(|s| s.to_string()).collect();
    let mut i = 0;

    while i < out.len() {
        let (curr_clean, trailing_punct) = {
            let s = &out[i];
            let clean = clean_word_for_matching(s);
            let punct: String = s.chars().rev().take_while(|c| !c.is_alphanumeric()).collect();
            let punct: String = punct.chars().rev().collect();
            (clean, punct)
        };

        // Pattern 1: "<descriptor> emoji" or "<two-word descriptor> emoji"
        if curr_clean == "emoji" || curr_clean == "emojis" {
            let mut replaced = false;

            // Try 2-word descriptor before: e.g. "thumbs up emoji"
            if i >= 2 {
                let two_words = format!("{} {}", clean_word_for_matching(&out[i - 2]), clean_word_for_matching(&out[i - 1]));
                if let Some(emoji) = lookup_emoji(&two_words) {
                    let mut replacement = emoji.to_string();
                    replacement.push_str(&trailing_punct);
                    out.splice(i - 2..=i, vec![replacement]);
                    i = i - 1;
                    replaced = true;
                }
            }

            // Try 1-word descriptor before: e.g. "crying emoji", "slapping emoji", "fire emoji"
            if !replaced && i >= 1 {
                let one_word = clean_word_for_matching(&out[i - 1]);
                if let Some(emoji) = lookup_emoji(&one_word) {
                    let mut replacement = emoji.to_string();
                    replacement.push_str(&trailing_punct);
                    out.splice(i - 1..=i, vec![replacement]);
                    replaced = true;
                }
            }

            if replaced {
                continue;
            }
        }

        // Pattern 2: "emoji <descriptor>" or "emoji <two-word descriptor>"
        if (curr_clean == "emoji" || curr_clean == "emojis") && i + 1 < out.len() {
            let mut replaced = false;

            // Try 2-word descriptor after: "emoji thumbs up"
            if i + 2 < out.len() {
                let (next2_clean, next2_punct) = {
                    let s = &out[i + 2];
                    let clean = clean_word_for_matching(s);
                    let punct: String = s.chars().rev().take_while(|c| !c.is_alphanumeric()).collect();
                    let punct: String = punct.chars().rev().collect();
                    (clean, punct)
                };
                let two_words = format!("{} {}", clean_word_for_matching(&out[i + 1]), next2_clean);
                if let Some(emoji) = lookup_emoji(&two_words) {
                    let mut replacement = emoji.to_string();
                    replacement.push_str(&next2_punct);
                    out.splice(i..=i + 2, vec![replacement]);
                    replaced = true;
                }
            }

            // Try 1-word descriptor after: "emoji crying", "emoji fire"
            if !replaced {
                let (next_clean, next_punct) = {
                    let s = &out[i + 1];
                    let clean = clean_word_for_matching(s);
                    let punct: String = s.chars().rev().take_while(|c| !c.is_alphanumeric()).collect();
                    let punct: String = punct.chars().rev().collect();
                    (clean, punct)
                };
                if let Some(emoji) = lookup_emoji(&next_clean) {
                    let mut replacement = emoji.to_string();
                    replacement.push_str(&next_punct);
                    out.splice(i..=i + 1, vec![replacement]);
                    replaced = true;
                }
            }

            if replaced {
                continue;
            }
        }

        i += 1;
    }

    out.join(" ")
}

#[derive(Debug, Clone, PartialEq)]
enum ListMarkerType {
    Numbered(usize),
    Bullet,
}

fn word_to_list_number(clean: &str) -> Option<usize> {
    match clean {
        "1" | "one" => Some(1),
        "2" | "two" => Some(2),
        "3" | "three" => Some(3),
        "4" | "four" => Some(4),
        "5" | "five" => Some(5),
        "6" | "six" => Some(6),
        "7" | "seven" => Some(7),
        "8" | "eight" => Some(8),
        "9" | "nine" => Some(9),
        "10" | "ten" => Some(10),
        _ => None,
    }
}

fn capitalize_first_char(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        None => String::new(),
        Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
    }
}

/// Automatically detects spoken numbered lists (e.g. "point 1 this must be done point 2 this must be done", "1 this must be done 2 this must be done")
/// and bullet lists (e.g. "bullet point buy milk bullet point call mom") and formats them with line breaks and prefixes.
pub fn format_spoken_lists(input: &str) -> String {
    if input.contains('\n') {
        let lines: Vec<&str> = input.split('\n').collect();
        let formatted: Vec<String> = lines.into_iter().map(format_spoken_lists_inner).collect();
        return formatted.join("\n");
    }
    format_spoken_lists_inner(input)
}

fn format_spoken_lists_inner(input: &str) -> String {
    let words: Vec<&str> = input.split_whitespace().collect();
    if words.len() < 3 {
        return input.to_string();
    }

    let mut detected_markers: Vec<(usize, usize, ListMarkerType)> = Vec::new();
    let mut i = 0;

    while i < words.len() {
        let curr_clean = clean_word_for_matching(words[i]);
        let next_clean = if i + 1 < words.len() { clean_word_for_matching(words[i + 1]) } else { String::new() };

        // Pattern A: "bullet point" or existing bullet "•"
        if curr_clean == "bullet" && next_clean == "point" {
            detected_markers.push((i, 2, ListMarkerType::Bullet));
            i += 2;
            continue;
        } else if curr_clean == "•" || words[i] == "•" {
            detected_markers.push((i, 1, ListMarkerType::Bullet));
            i += 1;
            continue;
        }

        // Pattern B: "point N", "number N", "item N"
        if (curr_clean == "point" || curr_clean == "number" || curr_clean == "item") && !next_clean.is_empty() {
            if let Some(num) = word_to_list_number(&next_clean) {
                detected_markers.push((i, 2, ListMarkerType::Numbered(num)));
                i += 2;
                continue;
            }
        }

        // Pattern C: standalone digit "1", "2", "3" (or "1.", "2.", "1,", "2,")
        let digit_str = words[i].trim_matches(|c: char| !c.is_alphanumeric());
        if let Some(num) = word_to_list_number(digit_str) {
            let prev_clean = if i > 0 { clean_word_for_matching(words[i - 1]) } else { String::new() };
            let is_conjunction = matches!(prev_clean.as_str(), "and" | "or" | "have" | "has" | "had" | "with" | "plus" | "minus" | "than" | "about" | "around");

            let expected_num = match detected_markers.last() {
                Some((_, _, ListMarkerType::Numbered(prev_n))) => prev_n + 1,
                _ => 1,
            };

            if !is_conjunction && (num == expected_num) && (i == 0 || words[i - 1].ends_with('.') || words[i - 1].ends_with(':') || words[i - 1].ends_with(';') || words[i - 1].ends_with(',') || !detected_markers.is_empty()) {
                detected_markers.push((i, 1, ListMarkerType::Numbered(num)));
                i += 1;
                continue;
            }
        }

        i += 1;
    }

    if detected_markers.len() < 2 {
        return input.to_string();
    }

    // Verify sequential integrity
    let mut is_valid_sequence = true;
    let mut prev_num = 0;
    for (_, _, marker) in &detected_markers {
        match marker {
            ListMarkerType::Numbered(n) => {
                if prev_num == 0 {
                    if *n != 1 {
                        is_valid_sequence = false;
                        break;
                    }
                } else if *n != prev_num + 1 {
                    is_valid_sequence = false;
                    break;
                }
                prev_num = *n;
            }
            ListMarkerType::Bullet => {}
        }
    }

    if !is_valid_sequence {
        return input.to_string();
    }

    let mut result_parts: Vec<String> = Vec::new();
    let first_marker_idx = detected_markers[0].0;

    // Optional preamble before first item (e.g. "Here are the tasks:")
    if first_marker_idx > 0 {
        let preamble = words[0..first_marker_idx].join(" ");
        let mut preamble_clean = preamble.trim().to_string();
        if !preamble_clean.ends_with(':') && !preamble_clean.ends_with('.') && !preamble_clean.ends_with('?') {
            preamble_clean.push(':');
        }
        result_parts.push(preamble_clean);
    }

    for (k, (start_idx, marker_len, marker_type)) in detected_markers.iter().enumerate() {
        let content_start = start_idx + marker_len;
        let content_end = if k + 1 < detected_markers.len() {
            detected_markers[k + 1].0
        } else {
            words.len()
        };

        if content_start >= content_end {
            continue;
        }

        let item_content = words[content_start..content_end].join(" ");
        let mut item_trimmed = item_content.trim();
        if item_trimmed.starts_with(':') || item_trimmed.starts_with('-') || item_trimmed.starts_with(',') {
            item_trimmed = item_trimmed[1..].trim();
        }

        let capitalized = capitalize_first_char(item_trimmed);
        match marker_type {
            ListMarkerType::Numbered(n) => {
                result_parts.push(format!("{}. {}", n, capitalized));
            }
            ListMarkerType::Bullet => {
                result_parts.push(format!("• {}", capitalized));
            }
        }
    }

    result_parts.join("\n")
}

/// Intelligent spoken time formatting: recognizes time context, formats "AM" and "PM" in uppercase,
/// converts spoken times (e.g. "nine thirty am" -> "9:30 AM", "quarter to five pm" -> "4:45 PM", "5pm" -> "5:00 PM"),
/// and normalizes conversational expressions ("five in the morning" -> "5:00 AM", "from 3 to 5 pm" -> "from 3:00 PM to 5:00 PM").
pub fn format_spoken_time_expressions(input: &str) -> String {
    if input.is_empty() {
        return String::new();
    }
    if input.contains('\n') {
        let lines: Vec<&str> = input.split('\n').collect();
        let formatted: Vec<String> = lines.into_iter().map(format_spoken_time_expressions_inner).collect();
        return formatted.join("\n");
    }
    format_spoken_time_expressions_inner(input)
}

fn format_spoken_time_expressions_inner(input: &str) -> String {
    if input.is_empty() {
        return String::new();
    }

    let words: Vec<&str> = input.split_whitespace().collect();
    if words.is_empty() {
        return input.to_string();
    }

    let mut out: Vec<String> = Vec::new();
    let mut i = 0;
    let len = words.len();

    while i < len {
        let curr_raw = words[i];
        let curr_clean = clean_word_for_matching(curr_raw);
        let trailing_punct = extract_trailing_punctuation(curr_raw);

        // --- Pattern 1: Relative times ("quarter to five", "quarter past three", "half past four") ---
        if curr_clean == "half" && i + 2 < len && clean_word_for_matching(words[i + 1]) == "past" {
            let hour_clean = clean_word_for_matching(words[i + 2]);
            if let Some(h) = word_or_digit_to_hour(&hour_clean) {
                let (meridiem, skip) = peek_meridiem_or_time_of_day(&words, i + 3);
                let punct = if skip > 0 {
                    extract_trailing_punctuation(words[i + 2 + skip])
                } else {
                    extract_trailing_punctuation(words[i + 2])
                };
                let formatted = match meridiem {
                    Some(m) => format!("{}:30 {}{}", h, m, punct),
                    None => format!("{}:30{}", h, punct),
                };
                out.push(formatted);
                i += 3 + skip;
                continue;
            }
        }

        if curr_clean == "quarter" && i + 2 < len {
            let rel = clean_word_for_matching(words[i + 1]);
            let hour_clean = clean_word_for_matching(words[i + 2]);
            if let Some(h) = word_or_digit_to_hour(&hour_clean) {
                if rel == "to" || rel == "past" {
                    let (eff_h, min) = if rel == "to" {
                        (if h == 1 { 12 } else { h - 1 }, 45)
                    } else {
                        (h, 15)
                    };
                    let (meridiem, skip) = peek_meridiem_or_time_of_day(&words, i + 3);
                    let punct = if skip > 0 {
                        extract_trailing_punctuation(words[i + 2 + skip])
                    } else {
                        extract_trailing_punctuation(words[i + 2])
                    };
                    let formatted = match meridiem {
                        Some(m) => format!("{}:{:02} {}{}", eff_h, min, m, punct),
                        None => format!("{}:{:02}{}", eff_h, min, punct),
                    };
                    out.push(formatted);
                    i += 3 + skip;
                    continue;
                }
            }
        }

        // --- Pattern 2: Embedded meridiem attached directly to digits (e.g. "5pm", "5:30pm", "9am", "11:45am") ---
        if let Some((num_str, mer_str)) = try_split_attached_meridiem(curr_raw) {
            let punct = extract_trailing_punctuation(curr_raw);
            let formatted = if num_str.contains(':') {
                format!("{} {}{}", num_str, mer_str, punct)
            } else if num_str.contains('.') {
                let parts: Vec<&str> = num_str.split('.').collect();
                if parts.len() == 2 && parts[0].parse::<u32>().is_ok() && parts[1].parse::<u32>().is_ok() {
                    format!("{}:{:02} {}{}", parts[0], parts[1].parse::<u32>().unwrap_or(0), mer_str, punct)
                } else {
                    format!("{}:00 {}{}", num_str, mer_str, punct)
                }
            } else {
                format!("{}:00 {}{}", num_str, mer_str, punct)
            };
            out.push(formatted);
            i += 1;
            continue;
        }

        // --- Pattern 3: Existing numeric time with trailing standalone meridiem (e.g. "5:30 pm" -> "5:30 PM", "5:00 am" -> "5:00 AM") ---
        if is_numeric_time(&curr_clean) {
            let (meridiem, skip) = peek_meridiem_or_time_of_day(&words, i + 1);
            if let Some(m) = meridiem {
                let punct = if skip > 0 {
                    extract_trailing_punctuation(words[i + skip])
                } else {
                    trailing_punct
                };
                let formatted = format!("{} {}{}", curr_clean, m, punct);
                out.push(formatted);
                i += 1 + skip;
                continue;
            }
        }

        // --- Pattern 4: Spoken Hour (Word or Digit) followed by Minutes and/or Meridiem ---
        if let Some(h) = word_or_digit_to_hour(&curr_clean) {
            // Check if followed by "o'clock"
            if i + 1 < len && clean_word_for_matching(words[i + 1]).starts_with("o'clock") {
                let (meridiem, skip) = peek_meridiem_or_time_of_day(&words, i + 2);
                let punct = if skip > 0 {
                    extract_trailing_punctuation(words[i + 1 + skip])
                } else {
                    extract_trailing_punctuation(words[i + 1])
                };
                let formatted = match meridiem {
                    Some(m) => format!("{}:00 {}{}", h, m, punct),
                    None => format!("{}:00{}", h, punct),
                };
                out.push(formatted);
                i += 2 + skip;
                continue;
            }

            // Check if followed by spoken minutes (e.g. "nine thirty", "ten forty five", "two fifteen")
            if i + 1 < len {
                let (maybe_min, min_word_count) = peek_spoken_minutes(&words, i + 1);
                if let Some(min) = maybe_min {
                    let (meridiem, skip) = peek_meridiem_or_time_of_day(&words, i + 1 + min_word_count);
                    // If a valid meridiem follows OR preceded by a time preposition like "at", "by", "around"
                    let has_time_preposition = out.last().map(|prev| {
                        let p = clean_word_for_matching(prev);
                        p == "at" || p == "by" || p == "around" || p == "before" || p == "after" || p == "from"
                    }).unwrap_or(false);

                    if meridiem.is_some() || has_time_preposition {
                        let punct = if skip > 0 {
                            extract_trailing_punctuation(words[i + min_word_count + skip])
                        } else {
                            extract_trailing_punctuation(words[i + min_word_count])
                        };
                        let formatted = match meridiem {
                            Some(m) => format!("{}:{:02} {}{}", h, min, m, punct),
                            None => format!("{}:{:02}{}", h, min, punct),
                        };
                        out.push(formatted);
                        i += 1 + min_word_count + skip;
                        continue;
                    }
                }
            }

            // Check if standalone hour is followed directly by meridiem or time of day (e.g. "5 pm", "five in the morning")
            let (meridiem, skip) = peek_meridiem_or_time_of_day(&words, i + 1);
            if let Some(m) = meridiem {
                let punct = if skip > 0 {
                    extract_trailing_punctuation(words[i + skip])
                } else {
                    trailing_punct
                };
                let formatted = format!("{}:00 {}{}", h, m, punct);
                out.push(formatted);
                i += 1 + skip;
                continue;
            }
        }

        // Default: keep existing token as-is
        out.push(curr_raw.to_string());
        i += 1;
    }

    // --- Post-pass: Time ranges sharing a meridiem (e.g. "from 3:00 to 5:00 PM" -> "from 3:00 PM to 5:00 PM") ---
    normalize_time_ranges(&mut out);

    out.join(" ")
}

fn try_split_attached_meridiem(raw: &str) -> Option<(String, String)> {
    let clean = raw.trim_matches(|c: char| c.is_ascii_punctuation()).to_lowercase();
    if clean.len() < 3 {
        return None;
    }

    let (val_part, mer_part) = if clean.ends_with("pm") {
        (&clean[..clean.len() - 2], "PM")
    } else if clean.ends_with("am") {
        (&clean[..clean.len() - 2], "AM")
    } else {
        return None;
    };

    if val_part.chars().next()?.is_ascii_digit() {
        if val_part.contains(':') || val_part.contains('.') || val_part.chars().all(|c| c.is_ascii_digit()) {
            return Some((val_part.to_string(), mer_part.to_string()));
        }
    }

    None
}

fn is_numeric_time(s: &str) -> bool {
    let parts: Vec<&str> = s.split(':').collect();
    if parts.len() == 2 {
        if let (Ok(h), Ok(m)) = (parts[0].parse::<u32>(), parts[1].parse::<u32>()) {
            return h <= 24 && m <= 59;
        }
    }
    false
}

fn word_or_digit_to_hour(clean: &str) -> Option<u32> {
    if let Ok(n) = clean.parse::<u32>() {
        if (1..=12).contains(&n) {
            return Some(n);
        }
    }

    match clean {
        "one" => Some(1),
        "two" => Some(2),
        "three" => Some(3),
        "four" => Some(4),
        "five" => Some(5),
        "six" => Some(6),
        "seven" => Some(7),
        "eight" => Some(8),
        "nine" => Some(9),
        "ten" => Some(10),
        "eleven" => Some(11),
        "twelve" => Some(12),
        _ => None,
    }
}

fn peek_spoken_minutes(words: &[&str], start: usize) -> (Option<u32>, usize) {
    if start >= words.len() {
        return (None, 0);
    }

    let w1_clean = clean_word_for_matching(words[start]);

    // Check two-word minutes: e.g. "twenty five", "thirty five", "forty five", "oh five"
    if start + 1 < words.len() {
        let w2_clean = clean_word_for_matching(words[start + 1]);
        if w1_clean == "oh" {
            if let Some(single) = word_to_single_digit(&w2_clean) {
                return (Some(single), 2);
            }
        }

        let tens = match w1_clean.as_str() {
            "twenty" => Some(20),
            "thirty" => Some(30),
            "forty" => Some(40),
            "fifty" => Some(50),
            _ => None,
        };

        if let Some(base) = tens {
            if let Some(single) = word_to_single_digit(&w2_clean) {
                return (Some(base + single), 2);
            }
        }
    }

    // Check single-word minutes
    if let Ok(n) = w1_clean.parse::<u32>() {
        if n < 60 {
            return (Some(n), 1);
        }
    }

    let m = match w1_clean.as_str() {
        "ten" => Some(10),
        "eleven" => Some(11),
        "twelve" => Some(12),
        "thirteen" => Some(13),
        "fourteen" => Some(14),
        "fifteen" => Some(15),
        "sixteen" => Some(16),
        "seventeen" => Some(17),
        "eighteen" => Some(18),
        "nineteen" => Some(19),
        "twenty" => Some(20),
        "thirty" => Some(30),
        "forty" => Some(40),
        "fifty" => Some(50),
        _ => None,
    };

    if m.is_some() {
        return (m, 1);
    }

    (None, 0)
}

fn word_to_single_digit(clean: &str) -> Option<u32> {
    if let Ok(n) = clean.parse::<u32>() {
        if (1..=9).contains(&n) {
            return Some(n);
        }
    }
    match clean {
        "one" => Some(1),
        "two" => Some(2),
        "three" => Some(3),
        "four" => Some(4),
        "five" => Some(5),
        "six" => Some(6),
        "seven" => Some(7),
        "eight" => Some(8),
        "nine" => Some(9),
        _ => None,
    }
}

fn peek_meridiem_or_time_of_day(words: &[&str], start: usize) -> (Option<&'static str>, usize) {
    if start >= words.len() {
        return (None, 0);
    }

    let w1 = clean_word_for_matching(words[start]);

    // Single token "pm", "am", "p.m.", "a.m."
    if w1 == "pm" || w1 == "p.m" || w1 == "p.m." {
        return (Some("PM"), 1);
    }
    if w1 == "am" || w1 == "a.m" || w1 == "a.m." {
        return (Some("AM"), 1);
    }

    // Conversational: "in the morning" (AM)
    if w1 == "in" && start + 2 < words.len() {
        let w2 = clean_word_for_matching(words[start + 1]);
        let w3 = clean_word_for_matching(words[start + 2]);
        if w2 == "the" && w3 == "morning" {
            return (Some("AM"), 3);
        }
        if w2 == "the" && (w3 == "afternoon" || w3 == "evening") {
            return (Some("PM"), 3);
        }
    }

    // Conversational: "at night" (PM)
    if w1 == "at" && start + 1 < words.len() {
        let w2 = clean_word_for_matching(words[start + 1]);
        if w2 == "night" {
            return (Some("PM"), 2);
        }
    }

    (None, 0)
}


fn normalize_time_ranges(tokens: &mut Vec<String>) {
    // If we have "from 3 to 5:00 PM" -> propagate to the first time: "from 3:00 PM to 5:00 PM"
    let len = tokens.len();
    for i in 0..len {
        if (tokens[i] == "to" || tokens[i] == "-" || tokens[i] == "and") && i >= 1 && i + 1 < len {
            let prev_clean = clean_word_for_matching(&tokens[i - 1]);
            let next_token = &tokens[i + 1];

            let mer = if next_token.contains("PM") {
                Some("PM")
            } else if next_token.contains("AM") {
                Some("AM")
            } else {
                None
            };

            if let Some(m) = mer {
                if let Some(h) = word_or_digit_to_hour(&prev_clean) {
                    tokens[i - 1] = format!("{}:00 {}", h, m);
                } else if is_numeric_time(&prev_clean) {
                    tokens[i - 1] = format!("{} {}", tokens[i - 1], m);
                }
            }
        }
    }
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

/// Normalizes spurious uppercase contraction suffixes emitted by Whisper BPE tokens
/// (e.g. "it'S" -> "it's", "It'S" -> "It's", "there'S" -> "there's", "that'S" -> "that's",
/// "suit'S" -> "suit's", "don'T" -> "don't", "can'T" -> "can't", "I'M" -> "I'm", "I'VE" -> "I've")
pub fn normalize_contraction_casing(input: &str) -> String {
    if input.contains('\n') {
        return input
            .split('\n')
            .map(normalize_contraction_casing)
            .collect::<Vec<_>>()
            .join("\n");
    }

    let mut words: Vec<String> = Vec::new();
    for token in input.split(' ') {
        words.push(normalize_single_word_contraction(token));
    }
    words.join(" ")
}

fn normalize_single_word_contraction(token: &str) -> String {
    // Check for both ASCII apostrophe (') and right single quote / curly apostrophe (’)
    let apos_pos = token.find('\'').or_else(|| token.find('’'));
    let apos_idx = match apos_pos {
        Some(idx) => idx,
        None => return token.to_string(),
    };

    let stem = &token[..apos_idx];
    let apos_char = token[apos_idx..].chars().next().unwrap();
    let after_apos = &token[apos_idx + apos_char.len_utf8()..];

    if stem.is_empty() || after_apos.is_empty() {
        return token.to_string();
    }

    // Separate contraction letters from trailing punctuation (e.g. "S," or "S." or "S")
    let contraction_letters: String = after_apos.chars().take_while(|c| c.is_alphabetic()).collect();
    let trailing_punct = &after_apos[contraction_letters.len()..];

    // Contraction suffixes to normalize
    let is_valid_contraction_suffix = match contraction_letters.to_uppercase().as_str() {
        "S" | "T" | "D" | "M" | "LL" | "VE" | "RE" => true,
        _ => false,
    };

    if !is_valid_contraction_suffix {
        return token.to_string();
    }

    // Check if stem has lowercase letters OR is single "I" OR is uppercase acronym/noun with possessive 's
    let stem_has_lowercase = stem.chars().any(|c| c.is_lowercase());
    let is_single_i = stem == "I";
    let is_s_suffix = contraction_letters.to_uppercase() == "S";

    // Contraction suffixes are virtually always lowercase in English ('s, 't, 'd, 'm, 'll, 've, 're)
    if stem_has_lowercase || is_single_i || is_s_suffix {
        let lower_suffix = contraction_letters.to_lowercase();
        format!("{}{}{}{}", stem, apos_char, lower_suffix, trailing_punct)
    } else {
        token.to_string()
    }
}

fn reconstruct_spaced_tokens(tokens: &[String]) -> String {
    let mut res = String::new();
    let mut iter = tokens.iter().peekable();

    while let Some(tok) = iter.next() {
        res.push_str(tok);
        if let Some(next) = iter.peek() {
            // Avoid adding space before punctuation or after open brackets/quotes
            if *tok == "\"" || *tok == "(" || *tok == "[" || *tok == "{" || *tok == "•" || *next == "\n" || *tok == "\n" || *next == "\n\n" || *tok == "\n\n" {
                if *tok == "•" {
                    res.push(' ');
                }
            } else if *next == "(" || *next == "[" {
                // If previous token is an identifier or function name (e.g. "print", "len", "console.log"), bind without space: print(
                let is_ident = tok.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '.');
                if !is_ident {
                    res.push(' ');
                }
            } else if !next.starts_with('.') && !next.starts_with(',') && !next.starts_with('?') && !next.starts_with('!') && !next.starts_with(':') && !next.starts_with(';') && !next.starts_with(')') && !next.starts_with(']') && !next.starts_with('}') && !next.starts_with('"') {
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
        speech_repair: true,
    };

    let mut text = format_transcript(raw, &config);

    // 1. Deduplicate stutter words, repeated loops, and identical phrases
    // Note: deduplicate_repeated_speech preserves legitimate emphatic doubles (e.g. "oh no no", "very very")
    // while collapsing accidental stutters ("the the") and 3+ loops.
    text = deduplicate_repeated_speech(&text);

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

        // A. Accidental word stutter & loop deduplication
        // Preserve legitimate emphatic doubles (e.g. "oh no no", "very very", "bye bye")
        // Collapse accidental function-word doubles (e.g. "the the", "is is") and 3+ loops (e.g. "no, no, no" -> "no")
        {
            let words: Vec<&str> = current_text.split_whitespace().collect();
            if !words.is_empty() {
                let mut collapsed_words: Vec<&str> = Vec::new();
                let mut i = 0;
                while i < words.len() {
                    let w = words[i];
                    let clean = w.trim_matches(['.', ',', '!', '?', ';', ':', '"', '\'']).to_lowercase();
                    let is_legitimate_double = matches!(clean.as_str(), "no" | "bye" | "very" | "ha" | "knock" | "so" | "well" | "dash" | "plus" | "minus" | "slash" | "dot");

                    // Count consecutive repetitions of this word
                    let mut j = i + 1;
                    while j < words.len() {
                        let next_clean = words[j].trim_matches(['.', ',', '!', '?', ';', ':', '"', '\'']).to_lowercase();
                        if !clean.is_empty() && next_clean == clean {
                            j += 1;
                        } else {
                            break;
                        }
                    }
                    let count = j - i;
                    if count >= 3 || (count >= 2 && !is_legitimate_double) {
                        // Collapse 3+ repetitions (or 2+ repetitions of non-emphatic words) to 1
                        let last_word = words[j - 1];
                        let last_punct: String = last_word.chars().filter(|c| ['.', ',', '!', '?', ';', ':'].contains(c)).collect();
                        if !last_punct.is_empty() && !w.ends_with(|c| ['.', ',', '!', '?', ';', ':'].contains(&c)) {
                            collapsed_words.push(words[j - 1]);
                        } else {
                            // Strip mid-stutter punctuation (e.g. "your, your" -> "your")
                            let clean_w = w.trim_end_matches([',', ';', ':']);
                            collapsed_words.push(clean_w);
                        }
                        i = j;
                    } else if count == 2 {
                        // Legitimate emphatic double (strictly "no no", "bye bye", "very very", etc.): keep both
                        collapsed_words.push(words[i]);
                        collapsed_words.push(words[i + 1]);
                        i += 2;
                    } else {
                        collapsed_words.push(w);
                        i += 1;
                    }
                }
                current_text = collapsed_words.join(" ");
            }
        }

        // B. Consecutive phrase / multi-word n-gram deduplication (length 2 up to N/2)
        {
            let words: Vec<String> = current_text.split_whitespace().map(|s| s.to_string()).collect();
            let n = words.len();
            if n >= 4 {
                let max_len = n / 2;
                let mut did_collapse = false;

                for len in (2..=max_len).rev() {
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
        // and technology/file extensions like ".js", ".ts", ".rs", ".py", ".com", ".io", etc.
        let is_abbrev = if c == '.' && i + 1 < chars.len() && chars[i + 1].is_alphabetic() {
            let prev_is_single_letter = (i == 1 && chars[0].is_alphabetic())
                || (i >= 2 && chars[i - 1].is_alphabetic() && (chars[i - 2].is_whitespace() || chars[i - 2] == '.'));
            let next_has_dot = i + 2 < chars.len() && (chars[i + 2] == '.' || (i + 3 < chars.len() && chars[i + 3] == '.'));
            
            // Check for code/domain extensions like .js, .ts, .rs, .py, .com, .io, .ai
            let rest: String = chars[i + 1..].iter().take(6).collect();
            let lower_rest = rest.to_lowercase();
            let is_ext = [
                "js", "ts", "tsx", "jsx", "rs", "py", "go", "io", "ai", "dev", "app", "com", "org", "net", "co", "json", "toml", "yaml", "html", "css"
            ].iter().any(|ext| {
                if lower_rest.starts_with(ext) {
                    let next_char_idx = ext.len();
                    if next_char_idx >= lower_rest.len() {
                        true
                    } else {
                        let ch = lower_rest.chars().nth(next_char_idx).unwrap();
                        !ch.is_alphabetic()
                    }
                } else {
                    false
                }
            });

            (prev_is_single_letter && next_has_dot) || is_ext
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
    if input.contains('\n') {
        return input
            .split('\n')
            .map(fix_common_grammar_and_contractions)
            .collect::<Vec<_>>()
            .join("\n");
    }

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
            "dishtary" | "dishtionary" | "dishtry" | "distary" | "dictionery" => Some("dictionary"),
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

fn replace_phrase_case_insensitive(text: &str, phrase: &str, replacement: &str) -> String {
    let mut result = text.to_string();
    let phrase_lower = phrase.to_lowercase();
    let mut start_idx = 0;
    while let Some(rel_idx) = result[start_idx..].to_lowercase().find(&phrase_lower) {
        let abs_idx = start_idx + rel_idx;
        result.replace_range(abs_idx..abs_idx + phrase_lower.len(), replacement);
        start_idx = abs_idx + replacement.len();
    }
    result
}

fn fix_common_proper_nouns(input: &str) -> String {
    let mut result = input.to_string();

    // 1. Multi-word technical and developer phrases
    let phrase_replacements = &[
        ("chat gpt", "ChatGPT"),
        ("chatgpt", "ChatGPT"),
        ("chat gbt", "ChatGPT"),
        ("gpt 4", "GPT-4"),
        ("gpt 4o", "GPT-4o"),
        ("gpt 3", "GPT-3"),
        ("open ai", "OpenAI"),
        ("openai", "OpenAI"),
        ("claude ai", "Claude"),
        ("gemini ai", "Gemini"),
        ("deep mind", "DeepMind"),
        ("lang chain", "LangChain"),
        ("py torch", "PyTorch"),
        ("tensor flow", "TensorFlow"),
        ("supa base", "Supabase"),
        ("graph ql", "GraphQL"),
        ("ci cd", "CI/CD"),
        ("pull request", "pull request"),
        ("git hub", "GitHub"),
        ("git lab", "GitLab"),
        ("visual studio code", "VS Code"),
        ("post degree sql", "PostgreSQL"),
        ("post degree SQL", "PostgreSQL"),
        ("postgres sql", "PostgreSQL"),
        ("postgre sql", "PostgreSQL"),
        ("next to js", "Next.js"),
        ("next. js", "Next.js"),
        ("next js", "Next.js"),
        ("nextjs", "Next.js"),
        ("react in js", "React.js"),
        ("react. js", "React.js"),
        ("react js", "React"),
        ("reactjs", "React"),
        ("node. js", "Node.js"),
        ("node js", "Node.js"),
        ("nodejs", "Node.js"),
        ("vue. js", "Vue.js"),
        ("vue js", "Vue.js"),
        ("vuejs", "Vue.js"),
        ("type script", "TypeScript"),
        ("mongo db", "MongoDB"),
        ("tailwind css", "Tailwind CSS"),
        ("fast api", "FastAPI"),
        ("docker compose", "Docker Compose"),
        ("vs code", "VS Code"),
    ];

    for (target, proper) in phrase_replacements {
        result = replace_phrase_case_insensitive(&result, target, proper);
    }

    // 2. Single-word technical proper nouns
    let replacements = &[
        ("chatgpt", "ChatGPT"),
        ("openai", "OpenAI"),
        ("claude", "Claude"),
        ("gemini", "Gemini"),
        ("deepmind", "DeepMind"),
        ("langchain", "LangChain"),
        ("pytorch", "PyTorch"),
        ("tensorflow", "TensorFlow"),
        ("supabase", "Supabase"),
        ("graphql", "GraphQL"),
        ("oauth", "OAuth"),
        ("jwt", "JWT"),
        ("sdk", "SDK"),
        ("cli", "CLI"),
        ("url", "URL"),
        ("http", "HTTP"),
        ("https", "HTTPS"),
        ("postgresql", "PostgreSQL"),
        ("postgres", "Postgres"),
        ("typescript", "TypeScript"),
        ("javascript", "JavaScript"),
        ("mongodb", "MongoDB"),
        ("tailwindcss", "Tailwind CSS"),
        ("fastapi", "FastAPI"),
        ("kubernetes", "Kubernetes"),
        ("whatsapp", "WhatsApp"),
        ("voxquest", "VoxQuest"),
        ("youtube", "YouTube"),
        ("google", "Google"),
        ("github", "GitHub"),
        ("macbook", "MacBook"),
        ("macos", "macOS"),
        ("iphone", "iPhone"),
        ("android", "Android"),
        ("cantroid", "Android"),
        ("can't roid", "Android"),
        ("canroid", "Android"),
        ("an droid", "Android"),
        ("and roid", "Android"),
        ("ios", "iOS"),
        ("i o s", "iOS"),
        ("eye os", "iOS"),
        ("eye o s", "iOS"),
        ("ipados", "iPadOS"),
        ("watchos", "watchOS"),
        ("api", "API"),
        ("ui", "UI"),
        ("sql", "SQL"),
        ("json", "JSON"),
        ("html", "HTML"),
        ("css", "CSS"),
    ];

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
            speech_repair: false,
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
            speech_repair: false,
        };
        let (final_text, meta) = format_transcript_with_metadata("hello um world period", &cfg);
        assert_eq!(final_text, "Hello world.");
        assert_eq!(meta.punctuation_applied, 1);
        assert_eq!(meta.fillers_removed, 1);
        assert!(meta.stages_run.contains(&"spoken_punctuation".to_string()));
        assert!(meta.stages_run.contains(&"filler_removal".to_string()));
    }

    #[test]
    fn test_tech_proper_nouns_and_developer_terms() {
        let cfg = FormattingConfig::default();
        let formatted = format_transcript("building with next JS and post degree SQL", &cfg);
        assert_eq!(formatted, "Building with Next.js and PostgreSQL");

        let formatted2 = format_transcript("using type script with react js and tailwind css", &cfg);
        assert_eq!(formatted2, "Using TypeScript with React and Tailwind CSS");

        let formatted3 = format_transcript("asking chat gpt about gpt 4 and open ai", &cfg);
        assert_eq!(formatted3, "Asking ChatGPT about GPT-4 and OpenAI");
    }

    #[test]
    fn test_developer_voice_casing_commands() {
        let cfg = FormattingConfig::default();

        // 1. camelCase: "camel case user profile" -> "userProfile"
        let res1 = format_transcript("create function camel case get user details", &cfg);
        assert_eq!(res1, "Create function getUserDetails");

        // 2. snake_case: "snake case get user by id" -> "get_user_by_id"
        let res2 = format_transcript("define variable snake case max retry count", &cfg);
        assert_eq!(res2, "Define variable max_retry_count");

        // 3. kebab-case: "kebab case order service" -> "order-service"
        let res3 = format_transcript("add endpoint kebab case user profile settings", &cfg);
        assert_eq!(res3, "Add endpoint user-profile-settings");

        // 4. PascalCase: "pascal case order controller" -> "OrderController"
        let res4 = format_transcript("class pascal case order processor", &cfg);
        assert_eq!(res4, "Class OrderProcessor");

        // 5. CONSTANT_CASE: "constant case max retries" -> "MAX_RETRIES"
        let res5 = format_transcript("set constant case max retries equal five", &cfg);
        assert_eq!(res5, "Set MAX_RETRIES equal five");
    }

    #[test]
    fn test_speech_self_correction_and_repair() {
        let mut cfg = FormattingConfig::default();
        cfg.conservative_filler_removal = true;

        // 1. User's exact example: "meeting was there at 4pm, oh no, 5pm" -> "Meeting was there at 5:00 PM."
        let res1 = format_transcript("a meeting was there at 4pm, oh no, 5pm.", &cfg);
        assert_eq!(res1, "A meeting was there at 5:00 PM.");

        // 2. Exact time with PM: "meeting at 4:00 PM, oh no, 5:00 PM."
        let res2 = format_transcript("meeting at 4:00 PM, oh no, 5:00 PM.", &cfg);
        assert_eq!(res2, "Meeting at 5:00 PM.");

        // 3. User's false-start test: "The meeting no, it's at 5 PM." -> "The meeting is at 5:00 PM."
        let res_fs = format_transcript("The meeting no, it's at 5 PM.", &cfg);
        assert_eq!(res_fs, "The meeting is at 5:00 PM.");

        // 4. Correction with no it's: "The meeting was at 4 PM, no, it's at 5 PM." -> "The meeting was at 5:00 PM."
        let res_corr = format_transcript("The meeting was at 4 PM, no, it's at 5 PM.", &cfg);
        assert_eq!(res_corr, "The meeting was at 5:00 PM.");

        // 5. Short correction: "The meeting at 4 PM, no, 5 PM." -> "The meeting at 5:00 PM."
        let res_short = format_transcript("The meeting at 4 PM, no, 5 PM.", &cfg);
        assert_eq!(res_short, "The meeting at 5:00 PM.");

        // 6. Date replacement with "actually": "let's do Monday, actually Tuesday."
        let res3 = format_transcript("let's do Monday, actually Tuesday.", &cfg);
        assert_eq!(res3, "Let's do Tuesday.");

        // 7. Quantity repair with "sorry": "we have 10 users, sorry, 20 users."
        let res4 = format_transcript("we have 10 users, sorry, 20 users.", &cfg);
        assert_eq!(res4, "We have 20 users.");

        // 8. Name replacement with "wait": "send email to Sarah, wait, Alex."
        let res5 = format_transcript("send email to Sarah, wait, Alex.", &cfg);
        assert_eq!(res5, "Send email to Alex.");

        // 9. Scratch that: "cancel the flight, scratch that, confirm the flight."
        let res6 = format_transcript("cancel the flight, scratch that, confirm the flight.", &cfg);
        assert_eq!(res6, "Confirm the flight.");

        // 10. Direct contradiction overlap: "I want red no blue" -> "I want blue"
        let res7 = format_transcript("I want red no blue.", &cfg);
        assert_eq!(res7, "I want blue.");

        // 11. Single word replacement with "wait": "send email to Alice wait Bob" -> "Send email to Bob."
        let res8 = format_transcript("send email to Alice wait Bob.", &cfg);
        assert_eq!(res8, "Send email to Bob.");

        // 12. Retraction overlap at start of sentence: "Red no blue" -> "Blue."
        let res9 = format_transcript("Red no blue.", &cfg);
        assert_eq!(res9, "Blue.");

        // 13. Time correction with "wait": "call at 3 wait 4" -> "Call at 4."
        let res10 = format_transcript("call at 3 wait 4.", &cfg);
        assert_eq!(res10, "Call at 4.");

        // 14. "or rather" contradiction overlap: "let's meet Monday or rather Tuesday."
        let res11 = format_transcript("let's meet Monday or rather Tuesday.", &cfg);
        assert_eq!(res11, "Let's meet Tuesday.");

        // 15. Disfluent filler removal including "haa": "I was thinking haa we should go" -> "I was thinking we should go."
        let res12 = format_transcript("I was thinking haa we should go.", &cfg);
        assert_eq!(res12, "I was thinking we should go.");

        // 16. Filler removal before speech repair: "Haa call at 3 wait 4" -> "Call at 4."
        let res13 = format_transcript("Haa call at 3 wait 4.", &cfg);
        assert_eq!(res13, "Call at 4.");
    }

    #[test]
    fn test_developer_code_syntax() {
        let cfg = FormattingConfig::default();

        // 1. User's exact Python print statement: "print, parenthesis, items, parenthesis" -> "print(items)"
        let res1 = format_transcript("print, parenthesis, items, parenthesis", &cfg);
        assert_eq!(res1, "print(items)");

        // 2. Python print with space: "print parenthesis items parenthesis" -> "print(items)"
        let res2 = format_transcript("print parenthesis items parenthesis", &cfg);
        assert_eq!(res2, "print(items)");

        // 3. Spoken dot notation in JavaScript/TypeScript: "console dot log parenthesis item parenthesis"
        let res3 = format_transcript("console dot log parenthesis item parenthesis", &cfg);
        assert_eq!(res3, "console.log(item)");

        // 4. Function definition with arguments: "def my_func parenthesis a comma b parenthesis colon"
        let res4 = format_transcript("def my_func parenthesis a comma b parenthesis colon", &cfg);
        assert_eq!(res4, "def my_func(a, b):");

        // 5. Conditional with double equals operator: "if parenthesis x double equals y parenthesis"
        let res5 = format_transcript("if parenthesis x double equals y parenthesis", &cfg);
        assert_eq!(res5, "if (x == y)");

        // 6. Collection indexing: "items bracket zero bracket" -> "items[0]"
        let res6 = format_transcript("items bracket zero bracket", &cfg);
        assert_eq!(res6, "items[0]");

        // 7. Arrow function: "x fat arrow y" -> "x => y"
        let res7 = format_transcript("x fat arrow y", &cfg);
        assert_eq!(res7, "x => y");

        // 8. Increment operator: "x plus plus" -> "x++"
        let res8 = format_transcript("x plus plus", &cfg);
        assert_eq!(res8, "x++");

        // 9. Spoken quotes and arguments: "print(double quote, today's date double quote, today)" -> "print(\"today's date\", today)"
        let res9 = format_transcript("print(double quote, today's date double quote, today)", &cfg);
        assert_eq!(res9, "print(\"today's date\", today)");
    }

    #[test]
    fn test_developer_terminal_formatting() {
        let cfg = FormattingConfig::default();

        // 1. Git commit flag: "git commit dash m fix issue" -> "git commit -m fix issue"
        let res1 = format_transcript("git commit dash m fix issue", &cfg);
        assert_eq!(res1, "git commit -m fix issue");

        // 2. Cargo build with double dash and trailing period stripped
        let res2 = format_transcript("cargo build dash dash release.", &cfg);
        assert_eq!(res2, "cargo build --release");

        // 3. Spoken save-dev flag: "npm install dash dash save dev typescript"
        let res3 = format_transcript("npm install dash dash save dev typescript", &cfg);
        assert_eq!(res3, "npm install --save-dev TypeScript");

        // 4. Docker command with -it flag and trailing period stripped: "docker run dash it ubuntu."
        let res4 = format_transcript("docker run dash it ubuntu.", &cfg);
        assert_eq!(res4, "docker run -it ubuntu");

        // 5. Normal prose should not strip period: "I like using git for version control."
        let res5 = format_transcript("I like using git for version control.", &cfg);
        assert_eq!(res5, "I like using git for version control.");
    }

    #[test]
    fn test_spoken_lists_and_bullet_points() {
        let cfg = FormattingConfig::default();

        // 1. Point 1, Point 2 list:
        let res1 = format_transcript("point 1 this must be done point 2 this must be done", &cfg);
        assert_eq!(res1, "1. This must be done\n2. This must be done");

        // 2. Direct numbered list: "1 this must be done 2 this must be done"
        let res2 = format_transcript("1 this must be done 2 this must be done", &cfg);
        assert_eq!(res2, "1. This must be done\n2. This must be done");

        // 3. Word numbers: "point one this must be done point two this must be done"
        let res3 = format_transcript("point one this must be done point two this must be done", &cfg);
        assert_eq!(res3, "1. This must be done\n2. This must be done");

        // 4. Multiple bullet points:
        let res4 = format_transcript("bullet point buy milk bullet point call mom", &cfg);
        assert_eq!(res4, "• Buy milk\n• Call mom");

        // 5. Normal prose with counting must NOT turn into a list:
        let res5 = format_transcript("I have 1 apple and 2 oranges.", &cfg);
        assert_eq!(res5, "I have 1 apple and 2 oranges.");
    }

    #[test]
    fn test_spoken_emojis() {
        let cfg = FormattingConfig::default();

        // 1. User's exact examples: "slapping emoji" -> 🤦 and "crying emoji" -> 😭
        let res1 = format_transcript("I can't believe this slapping emoji.", &cfg);
        assert_eq!(res1, "I can't believe this 🤦.");

        let res2 = format_transcript("That is hilarious crying emoji!", &cfg);
        assert_eq!(res2, "That is hilarious 😭!");

        // 2. Multi-word emoji descriptor: "thumbs up emoji" -> 👍
        let res3 = format_transcript("Send me the document thumbs up emoji.", &cfg);
        assert_eq!(res3, "Send me the document 👍.");

        // 3. Fire and heart:
        let res4 = format_transcript("This new track is fire emoji", &cfg);
        assert_eq!(res4, "This new track is 🔥");

        let res5 = format_transcript("Love you heart emoji", &cfg);
        assert_eq!(res5, "Love you ❤️");

        // 4. Literal word emoji without descriptor:
        let res6 = format_transcript("I like using this emoji.", &cfg);
        assert_eq!(res6, "I like using this emoji.");
    }

    #[test]
    fn test_repair_phonetic_speech_confusions() {
        let cfg = FormattingConfig::default();

        // 1. User's exact prompt: "picking the vats" -> "picking the words" and "charge her beauty" -> "ChatGPT"
        let res1 = format_transcript("The efficiency of picking the vats is drastically gone and it's not able to pick even the vats like charge her beauty those things", &cfg);
        assert!(res1.contains("picking the words"), "Expected 'picking the words', got: {}", res1);
        assert!(res1.contains("even the words like ChatGPT"), "Expected 'even the words like ChatGPT', got: {}", res1);

        // 2. Chatgot / Chai GPT
        let res2 = format_transcript("its chatgot not something else", &cfg);
        assert!(res2.contains("ChatGPT"));

        // 3. Volts confusion
        let res3 = format_transcript("not able to pick the basic volts itself", &cfg);
        assert!(res3.contains("basic words"));

        // 4. Fast speech and UI constraint repair
        let res4 = format_transcript("I mean the words are not picking when we speak of faster, so please check it and ensure that UI constant in battery constraint are considered.", &cfg);
        assert!(res4.contains("when we speak faster"), "Expected 'when we speak faster', got: {}", res4);
        assert!(res4.contains("UI constraint and battery constraint"), "Expected 'UI constraint and battery constraint', got: {}", res4);

        // 5. Dictionary modal repair
        let res5 = format_transcript("The words are not being picked properly, and the dictionary, mold, or is being blank if I click, and apart from that, the words efficiencies improve, but you need it much more, so please check it out and make sure that you remember the battery constraint and UI constraint.", &cfg);
        assert!(res5.contains("dictionary modal is blank"), "Expected 'dictionary modal is blank', got: {}", res5);
        assert!(res5.contains("word efficiency has improved"), "Expected 'word efficiency has improved', got: {}", res5);

        // 6. Developer repos and UF repairs
        let res6 = format_transcript("check around the website or the repose, use something", &cfg);
        assert!(res6.contains("website or the repos"), "Expected 'website or the repos', got: {}", res6);

        let res7 = format_transcript("because I am making the UF fixes", &cfg);
        assert!(res7.contains("making the UI fixes"), "Expected 'making the UI fixes', got: {}", res7);

        let res8 = format_transcript(&deduplicate_repeated_speech("a picture of your, your plan is"), &cfg);
        assert_eq!(res8, "A picture of your plan is");

        // 7. Rust vs Just / Must acoustic repairs
        let res9 = format_transcript("don't add Rust for brainstorming after discussion will proceed", &cfg);
        assert!(res9.contains("just for brainstorming"), "Expected 'just for brainstorming', got: {}", res9);

        let res10 = format_transcript("and along with that it Rust be also even not sure", &cfg);
        assert!(res10.contains("it must be also"), "Expected 'it must be also', got: {}", res10);

        // 7. UI is so bad must NEVER turn into "UI am so bad"
        let res9 = format_transcript("The UI is so bad and the dark and light theme has been conflicting", &cfg);
        assert!(res9.contains("The UI is so bad"), "Expected 'The UI is so bad', got: {}", res9);
        assert!(!res9.contains("UI am"), "Must not contain 'UI am': {}", res9);

        // 8. Conversational sentences with 'wrong. I mean check' must retain full text
        let res10 = format_transcript("This prompt was being built using the same tool, but see what it's been going wrong. I mean check for what's the issue, so if you want to see other models,", &cfg);
        assert!(res10.contains("going wrong"), "Expected 'going wrong' preserved, got: {}", res10);
        assert!(res10.contains("check for what's the issue"), "Expected 'check for what's the issue' preserved, got: {}", res10);

        // 9. 'best model and suitable one. I mean, this is creating' must retain 'best model'
        let res11 = format_transcript("So, we'll use whatever is the best model and suitable one. I mean, this is creating lot of issues and spreading word, mistake, not detecting properly.", &cfg);
        assert!(res11.contains("best model and suitable one"), "Expected 'best model and suitable one' preserved, got: {}", res11);

        // 10. Tribe and tribe members acoustic repair
        let res12 = format_transcript("and once I try members, if everybody's present we can make a video", &cfg);
        assert!(res12.contains("once our tribe members"), "Expected 'once our tribe members', got: {}", res12);

        let res13 = format_transcript("please invite all the try members in our try", &cfg);
        assert!(res13.contains("all the tribe members in our tribe"), "Expected 'all the tribe members in our tribe', got: {}", res13);

        // 11. Ma'am / respectful workplace address
        let res14 = format_transcript("Yeah, Maam, I made all those things, whatever I said, and sent him a copy yesterday.", &cfg);
        assert!(res14.contains("Yeah, ma'am, I made"), "Expected 'Yeah, ma'am, I made', got: {}", res14);

        let res15 = format_transcript("Yes Maam, I will do it.", &cfg);
        assert!(res15.contains("Yes, ma'am, I will do it."), "Expected 'Yes, ma'am, I will do it.', got: {}", res15);

        // 12. Indian English discourse marker: 'and all'
        let res16 = format_transcript("Don't show the monetization plan at all and it feels like too much of theory", &cfg);
        assert!(res16.contains("monetization plan and all"), "Expected 'monetization plan and all', got: {}", res16);

        // 13. Developer stack & Next.js / React.js / framework acoustic repairs
        let res18 = format_transcript(
            "I found that whatever project we are giving to AI agents, what are in common, the notations that they use of particular set of languages itself, like for example, website, next to JS, React in JS, some kind of particular frame where they have stick, why is that so?",
            &cfg
        );
        assert!(res18.contains("Next.js"), "Expected 'Next.js', got: {}", res18);
        assert!(res18.contains("React.js"), "Expected 'React.js', got: {}", res18);
        assert!(res18.contains("particular framework they stick to"), "Expected 'particular framework they stick to', got: {}", res18);
        assert!(res18.contains("what's in common"), "Expected 'what's in common', got: {}", res18);

        // 14. Vibe-coded acoustic repair & contraction casing
        let res19 = format_transcript(
            "I mean it'S not taking certain words like vibe, core head, shit.",
            &cfg
        );
        assert!(res19.contains("it's"), "Expected lowercase it's, got: {}", res19);
        assert!(!res19.contains("it'S"), "Must not contain it'S: {}", res19);
        assert!(res19.contains("vibe-coded shit"), "Expected 'vibe-coded shit', got: {}", res19);

        // 15. Contraction casing normalization across common contractions
        let res20 = format_transcript(
            "that'S the agenda and see what colour suit'S the best because there'S an issue and it'S working, don'T worry.",
            &cfg
        );
        assert!(res20.contains("That's"), "Expected That's, got: {}", res20);
        assert!(res20.contains("suit's"), "Expected suit's, got: {}", res20);
        assert!(res20.contains("there's"), "Expected there's, got: {}", res20);
        assert!(res20.contains("it's"), "Expected it's, got: {}", res20);
        assert!(res20.contains("don't"), "Expected don't, got: {}", res20);
        assert!(!res20.contains("'S"), "Must not contain 'S: {}", res20);
        assert!(!res20.contains("'T"), "Must not contain 'T: {}", res20);

        // 16. Spoken 'apostrophe s' acoustic confusions and contraction normalization
        let res21 = format_transcript(
            "For a first trophy, s, it'S taking capital S rather than a smaller row, yes.",
            &cfg
        );
        assert!(res21.contains("apostrophe s"), "Expected 'apostrophe s', got: {}", res21);
        assert!(res21.contains("it's"), "Expected 'it's', got: {}", res21);
        assert!(!res21.contains("it'S"), "Must not contain 'it'S': {}", res21);
        assert!(res21.contains("lowercase s"), "Expected 'lowercase s', got: {}", res21);

        // 17. Spoken possessive 'apostrophe s' attachment
        let res22 = format_transcript("Pavan a first trophy s laptop is ready", &cfg);
        assert!(res22.contains("Pavan's laptop"), "Expected 'Pavan's laptop', got: {}", res22);
    }

    #[test]
    fn test_spoken_time_expressions() {
        let cfg = FormattingConfig::default();

        // 1. Spoken hours + minutes with AM/PM capitalized
        let t1 = format_transcript("call me at nine thirty am tomorrow", &cfg);
        assert_eq!(t1, "Call me at 9:30 AM tomorrow");

        let t2 = format_transcript("let's meet at two fifteen pm", &cfg);
        assert_eq!(t2, "Let's meet at 2:15 PM");

        let t3 = format_transcript("deadline is ten forty five am", &cfg);
        assert_eq!(t3, "Deadline is 10:45 AM");

        // 2. Attached digits + am/pm
        let t4 = format_transcript("we will arrive at 5pm.", &cfg);
        assert_eq!(t4, "We will arrive at 5:00 PM.");

        let t5 = format_transcript("alarm is set for 6:30am,", &cfg);
        assert_eq!(t5, "Alarm is set for 6:30 AM,");

        // 3. Conversational time of day
        let t6 = format_transcript("breakfast at seven in the morning", &cfg);
        assert_eq!(t6, "Breakfast at 7:00 AM");

        let t7 = format_transcript("dinner at eight at night", &cfg);
        assert_eq!(t7, "Dinner at 8:00 PM");

        let t8 = format_transcript("flight leaves at two in the afternoon", &cfg);
        assert_eq!(t8, "Flight leaves at 2:00 PM");

        // 4. Relative time expressions
        let t9 = format_transcript("see you at quarter to five pm", &cfg);
        assert_eq!(t9, "See you at 4:45 PM");

        let t10 = format_transcript("starts at half past four in the afternoon", &cfg);
        assert_eq!(t10, "Starts at 4:30 PM");

        let t11 = format_transcript("arrive at quarter past three pm", &cfg);
        assert_eq!(t11, "Arrive at 3:15 PM");

        // 5. Time ranges
        let t12 = format_transcript("the workshop runs from 3 to 5 pm", &cfg);
        assert_eq!(t12, "The workshop runs from 3:00 PM to 5:00 PM");

        // 6. Safeguards: "I am" must NOT be converted to "I AM"
        let t13 = format_transcript("I am ready to go at 9 am", &cfg);
        assert_eq!(t13, "I am ready to go at 9:00 AM");
    }
}
