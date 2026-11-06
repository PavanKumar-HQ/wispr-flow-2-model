use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PersonalVocabularyEntry {
    pub id: i64,
    pub original_text: String,
    pub preferred_text: String,
    pub entry_type: String, // "name", "company", "product", "tech", "acronym", "slang", "general", "spelling"
    pub source: String,     // "manual" or "learned"
    pub context_domain: Option<String>,
    pub confidence: f32,
    pub positive_count: i32,
    pub negative_count: i32,
    pub status: String, // "candidate", "active", "disabled", "rejected"
    pub recognition_count: i32,
    pub correction_count: i32,
    pub application_count: i32,
    pub last_used_at: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CorrectionEvent {
    pub id: i64,
    pub session_id: Option<String>,
    pub original_text: String,
    pub final_text: String,
    pub created_at: i64,
    pub processed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormattingPreference {
    pub id: i64,
    pub preference_key: String,
    pub preference_value: String,
    pub evidence_count: i32,
    pub confidence: f32,
    pub enabled: bool,
    pub updated_at: i64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ExtractedCandidate {
    pub original_span: String,
    pub preferred_span: String,
    pub entry_type: String,
    pub context_left: Option<String>,
    pub context_right: Option<String>,
    pub confidence: f32,
    pub is_unambiguous: bool,
}

/// Tokenize text into words while keeping punctuation distinct
pub fn tokenize(text: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    let mut current = String::new();

    for ch in text.chars() {
        if ch.is_alphanumeric() || ch == '\'' || ch == '-' {
            current.push(ch);
        } else {
            if !current.is_empty() {
                tokens.push(current.clone());
                current.clear();
            }
            if !ch.is_whitespace() {
                tokens.push(ch.to_string());
            }
        }
    }
    if !current.is_empty() {
        tokens.push(current);
    }
    tokens
}

/// Computes Longest Common Subsequence (LCS) matrix for two token slices
fn compute_lcs(a: &[String], b: &[String]) -> Vec<Vec<usize>> {
    let n = a.len();
    let m = b.len();
    let mut dp = vec![vec![0; m + 1]; n + 1];

    for i in 1..=n {
        for j in 1..=m {
            if a[i - 1].eq_ignore_ascii_case(&b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = dp[i - 1][j].max(dp[i][j - 1]);
            }
        }
    }
    dp
}

/// Deterministically extracts conservative vocabulary and spelling correction candidates
/// from a comparison between original transcription and user-finalized edited text.
pub fn extract_correction_candidates(original: &str, edited: &str) -> Vec<ExtractedCandidate> {
    let orig_clean = original.trim();
    let edit_clean = edited.trim();

    // If identical, no candidate
    if orig_clean.eq_ignore_ascii_case(edit_clean) && orig_clean == edit_clean {
        return Vec::new();
    }

    let orig_tokens = tokenize(orig_clean);
    let edit_tokens = tokenize(edit_clean);

    if orig_tokens.is_empty() || edit_tokens.is_empty() {
        return Vec::new();
    }

    // Targeted single or double word edit (e.g. user selected one word from the dictation in an external app and edited it)
    if edit_tokens.len() <= 2 && orig_tokens.len() > edit_tokens.len() {
        let edit_word = &edit_tokens[0];
        let mut best_match: Option<(&String, usize)> = None;

        for orig_tok in &orig_tokens {
            let dist = edit_distance(&orig_tok.to_lowercase(), &edit_word.to_lowercase());
            let max_l = orig_tok.len().max(edit_word.len());
            // If identical except casing, or close typo/spelling edit distance
            if orig_tok.eq_ignore_ascii_case(edit_word) || (max_l >= 4 && dist <= 2) || (max_l >= 6 && dist <= 3) {
                if let Some((_, best_dist)) = best_match {
                    if dist < best_dist {
                        best_match = Some((orig_tok, dist));
                    }
                } else {
                    best_match = Some((orig_tok, dist));
                }
            }
        }

        if let Some((matched_orig, _)) = best_match {
            if matched_orig != edit_word {
                let is_casing = matched_orig.eq_ignore_ascii_case(edit_word);
                return vec![ExtractedCandidate {
                    original_span: matched_orig.clone(),
                    preferred_span: edit_word.clone(),
                    entry_type: if is_casing { "spelling".to_string() } else { "general".to_string() },
                    context_left: None,
                    context_right: None,
                    confidence: 0.95,
                    is_unambiguous: true,
                }];
            }
        }
    }

    // Safeguard: If length difference is drastic (>60% token delta),
    // this is a semantic rewrite / total replacement, NOT a vocabulary correction.
    let len_diff = (orig_tokens.len() as isize - edit_tokens.len() as isize).abs() as usize;
    let max_len = orig_tokens.len().max(edit_tokens.len());
    if max_len > 4 && len_diff as f32 / max_len as f32 > 0.60 {
        return Vec::new();
    }

    let dp = compute_lcs(&orig_tokens, &edit_tokens);
    let mut i = orig_tokens.len();
    let mut j = edit_tokens.len();

    // Backtrack to find aligned chunks
    let mut orig_spans: Vec<(usize, usize, usize, usize)> = Vec::new(); // (orig_start, orig_end, edit_start, edit_end)

    while i > 0 || j > 0 {
        if i > 0 && j > 0 && orig_tokens[i - 1].eq_ignore_ascii_case(&edit_tokens[j - 1]) {
            // If text differs only in casing (e.g. "api" vs "API"), record candidate!
            if orig_tokens[i - 1] != edit_tokens[j - 1] && orig_tokens[i - 1].chars().any(|c| c.is_alphabetic()) {
                orig_spans.push((i - 1, i, j - 1, j));
            }
            i -= 1;
            j -= 1;
        } else if j > 0 && (i == 0 || dp[i][j - 1] >= dp[i - 1][j]) {
            let edit_end = j;
            let mut edit_start = j - 1;
            let orig_end = i;
            let mut orig_start = i;

            while j > 0 && (i == 0 || dp[i][j - 1] >= dp[i - 1][j]) && !(i > 0 && orig_tokens[i - 1].eq_ignore_ascii_case(&edit_tokens[j - 1])) {
                j -= 1;
                edit_start = j;
            }

            while i > 0 && (j == 0 || dp[i - 1][j] >= dp[i][j - 1]) && !(j > 0 && orig_tokens[i - 1].eq_ignore_ascii_case(&edit_tokens[j - 1])) {
                i -= 1;
                orig_start = i;
            }

            if orig_start < orig_end || edit_start < edit_end {
                orig_spans.push((orig_start, orig_end, edit_start, edit_end));
            }
        } else if i > 0 {
            let orig_end = i;
            let orig_start = i - 1;
            orig_spans.push((orig_start, orig_end, j, j));
            i -= 1;
        }
    }

    let mut candidates = Vec::new();

    for (o_start, o_end, e_start, e_end) in orig_spans {
        let orig_slice = &orig_tokens[o_start..o_end];
        let edit_slice = &edit_tokens[e_start..e_end];

        // Filter out empty or single-punctuation diffs
        if orig_slice.is_empty() || edit_slice.is_empty() {
            continue;
        }

        // Bounded replacement: up to 3 words replaced by up to 3 words
        // e.g. "Brand X" -> "Brandex", "deep mind" -> "DeepMind"
        let orig_words: Vec<&String> = orig_slice.iter().filter(|t| t.chars().any(|c| c.is_alphanumeric())).collect();
        let edit_words: Vec<&String> = edit_slice.iter().filter(|t| t.chars().any(|c| c.is_alphanumeric())).collect();

        if orig_words.is_empty() || edit_words.is_empty() {
            continue;
        }

        if orig_words.len() > 3 || edit_words.len() > 3 {
            continue;
        }

        let orig_str = orig_words.iter().map(|s| s.as_str()).collect::<Vec<_>>().join(" ");
        let edit_str = edit_words.iter().map(|s| s.as_str()).collect::<Vec<_>>().join(" ");

        if orig_str.trim().is_empty() || edit_str.trim().is_empty() {
            continue;
        }

        if orig_str == edit_str {
            continue;
        }

        // Avoid creating dictionary rules from ordinary English stopword swaps (e.g. "a" <-> "the", "in" <-> "at")
        let stopwords = ["a", "an", "the", "in", "on", "at", "to", "for", "of", "with", "by", "is", "are", "was", "were"];
        if orig_words.len() == 1 && edit_words.len() == 1 {
            let w1 = orig_words[0].to_lowercase();
            let w2 = edit_words[0].to_lowercase();
            if stopwords.contains(&w1.as_str()) && stopwords.contains(&w2.as_str()) {
                continue;
            }
        }

        // Determine entry type heuristically
        let entry_type = if edit_str.chars().all(|c| !c.is_alphabetic() || c.is_uppercase()) && edit_str.len() <= 6 {
            "acronym".to_string()
        } else if edit_str.chars().next().map(|c| c.is_uppercase()).unwrap_or(false) && orig_str.chars().next().map(|c| c.is_lowercase()).unwrap_or(false) {
            "name".to_string()
        } else if edit_str.contains('-') || edit_str.chars().any(|c| c.is_numeric()) || edit_str.chars().skip(1).any(|c| c.is_uppercase()) {
            "tech".to_string()
        } else {
            "spelling".to_string()
        };

        // Determine confidence and unambiguous flag
        let (confidence, is_unambiguous) = if orig_str.eq_ignore_ascii_case(&edit_str) {
            // Case-only correction (e.g. "api" -> "API", "satoshi" -> "Satoshi", "react" -> "React")
            (0.95f32, true)
        } else if entry_type == "acronym" {
            (0.92f32, true)
        } else if orig_words.len() == 1 && edit_words.len() == 1 {
            (0.85f32, true)
        } else {
            // Multi-word phrase replacement: valid candidate, but requires user review
            (0.70f32, false)
        };

        let context_left = if o_start > 0 {
            Some(orig_tokens[o_start - 1].clone())
        } else {
            None
        };

        let context_right = if o_end < orig_tokens.len() {
            Some(orig_tokens[o_end].clone())
        } else {
            None
        };

        candidates.push(ExtractedCandidate {
            original_span: orig_str,
            preferred_span: edit_str,
            entry_type,
            context_left,
            context_right,
            confidence,
            is_unambiguous,
        });
    }

    candidates
}

/// Applies active personal vocabulary rules with strict word-boundary matching.
/// Never mutates substrings inside unrelated words (e.g. "art" -> "Art" does NOT touch "smart").
/// Returns (transformed_text, applied_descriptions, applied_rule_ids).
pub fn apply_vocabulary_rules(text: &str, rules: &[PersonalVocabularyEntry]) -> (String, Vec<String>, Vec<i64>) {
    let mut result = text.to_string();
    let mut applied_rules = Vec::new();
    let mut applied_ids = Vec::new();

    // Sort rules by length of original_text descending so multi-word phrases match before single words
    let mut sorted_rules: Vec<&PersonalVocabularyEntry> = rules
        .iter()
        .filter(|r| r.status == "active")
        .collect();
    sorted_rules.sort_by(|a, b| b.original_text.len().cmp(&a.original_text.len()));

    for rule in sorted_rules {
        let orig = rule.original_text.trim();
        let repl = rule.preferred_text.trim();

        if orig.is_empty() || repl.is_empty() || orig == repl {
            continue;
        }

        // Word-boundary aware flexible replacement
        if let Some(new_text) = replace_phrase_flexible(&result, orig, repl) {
            if new_text != result {
                applied_rules.push(format!("{} → {}", orig, repl));
                applied_ids.push(rule.id);
                result = new_text;
            }
        }
    }

    (result, applied_rules, applied_ids)
}

fn edit_distance(s1: &str, s2: &str) -> usize {
    let v1: Vec<char> = s1.chars().collect();
    let v2: Vec<char> = s2.chars().collect();
    let mut prev: Vec<usize> = (0..=v2.len()).collect();
    let mut curr = vec![0; v2.len() + 1];

    for i in 0..v1.len() {
        curr[0] = i + 1;
        for j in 0..v2.len() {
            let cost = if v1[i] == v2[j] { 0 } else { 1 };
            curr[j + 1] = (prev[j + 1] + 1)
                .min(curr[j] + 1)
                .min(prev[j] + cost);
        }
        prev.copy_from_slice(&curr);
    }
    prev[v2.len()]
}

/// Flexible phrase replacement supporting direct word-boundary matches, condensed/uncondensed variants,
/// and adjacent-token consolidation.
pub fn replace_phrase_flexible(text: &str, pattern: &str, replacement: &str) -> Option<String> {
    let p_clean = pattern.trim();
    if p_clean.is_empty() {
        return None;
    }

    // 1. Direct word-boundary aware match (e.g. "Satvik" -> "Sathvik", "my email" -> "...")
    if let Some(res) = replace_with_word_boundary(text, p_clean, replacement) {
        return Some(res);
    }

    // 2. Spaced pattern matching condensed text (e.g. pattern "Chat GPT" matching text "ChatGPT")
    if p_clean.contains(' ') || p_clean.contains('-') || p_clean.contains('_') {
        let condensed = p_clean.replace([' ', '-', '_', '\''], "");
        if !condensed.is_empty() {
            if let Some(res) = replace_with_word_boundary(text, &condensed, replacement) {
                return Some(res);
            }
        }
    }

    // 3. Condensed pattern matching multi-word sequence in text (e.g. pattern "Madanser" matching "Madan sir")
    let target_condensed = p_clean.to_lowercase().replace([' ', '-', '_', '\''], "");
    if !target_condensed.is_empty() {
        let words: Vec<&str> = text.split_whitespace().collect();
        // Check window sizes from 1 to 4 words
        for window_size in 1..=4.min(words.len()) {
            for i in 0..=words.len().saturating_sub(window_size) {
                let candidate_span = words[i..i + window_size].join(" ");
                let candidate_condensed = candidate_span.to_lowercase().replace([' ', '-', '_', '\'', '.', ',', '!', '?'], "");
                let is_match = if candidate_condensed == target_condensed {
                    true
                } else if target_condensed.len() >= 6 && candidate_condensed.len() >= 6 {
                    edit_distance(&target_condensed, &candidate_condensed) <= 1
                } else {
                    false
                };

                if is_match {
                    // Match found! Replace the candidate span with word boundary safety
                    if let Some(res) = replace_with_word_boundary(text, &candidate_span, replacement) {
                        return Some(res);
                    }
                }
            }
        }
    }

    None
}

/// Replaces whole words or phrases matching `pattern` (case-insensitive) with `replacement`,
/// strictly respecting Unicode word boundaries so substrings inside longer words are untouched.
pub fn replace_with_word_boundary(text: &str, pattern: &str, replacement: &str) -> Option<String> {
    let text_lower = text.to_lowercase();
    let pat_lower = pattern.to_lowercase();

    if !text_lower.contains(&pat_lower) {
        return None;
    }

    let text_chars: Vec<char> = text.chars().collect();
    let pat_chars: Vec<char> = pattern.chars().collect();
    let pat_len = pat_chars.len();

    let mut result = String::new();
    let mut i = 0;
    let mut replaced_any = false;

    while i < text_chars.len() {
        if i + pat_len <= text_chars.len() {
            let slice: String = text_chars[i..i + pat_len].iter().collect();
            if slice.eq_ignore_ascii_case(pattern) {
                // Check left word boundary:
                let left_boundary = if i == 0 {
                    true
                } else {
                    let prev_ch = text_chars[i - 1];
                    !prev_ch.is_alphanumeric()
                };

                // Check right word boundary:
                let right_boundary = if i + pat_len >= text_chars.len() {
                    true
                } else {
                    let next_ch = text_chars[i + pat_len];
                    !next_ch.is_alphanumeric()
                };

                if left_boundary && right_boundary {
                    result.push_str(replacement);
                    i += pat_len;
                    replaced_any = true;
                    continue;
                }
            }
        }

        result.push(text_chars[i]);
        i += 1;
    }

    if replaced_any {
        Some(result)
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_single_word_candidate() {
        let orig = "Brand X will send the report today.";
        let edit = "Brandex will send the report today.";
        let candidates = extract_correction_candidates(orig, edit);

        assert_eq!(candidates.len(), 1);
        assert_eq!(candidates[0].original_span, "Brand X");
        assert_eq!(candidates[0].preferred_span, "Brandex");
    }

    #[test]
    fn test_extract_case_acronym_candidate() {
        let orig = "We should query the api for data.";
        let edit = "We should query the API for data.";
        let candidates = extract_correction_candidates(orig, edit);

        assert_eq!(candidates.len(), 1);
        assert_eq!(candidates[0].original_span, "api");
        assert_eq!(candidates[0].preferred_span, "API");
        assert_eq!(candidates[0].entry_type, "acronym");
    }

    #[test]
    fn test_word_boundary_safety() {
        let rules = vec![
            PersonalVocabularyEntry {
                id: 1,
                original_text: "art".to_string(),
                preferred_text: "Art".to_string(),
                entry_type: "name".to_string(),
                context_domain: None,
                confidence: 0.9,
                positive_count: 3,
                negative_count: 0,
                status: "active".to_string(),
                recognition_count: 0,
                correction_count: 1,
                application_count: 0,
                last_used_at: None,
                created_at: 0,
                updated_at: 0,
                source: "manual".to_string(),
            }
        ];

        let text = "The smart artist made fine art.";
        let (output, applied, ids) = apply_vocabulary_rules(text, &rules);

        // "smart" and "artist" must remain untouched! Only the isolated word "art." should become "Art."
        assert_eq!(output, "The smart artist made fine Art.");
        assert_eq!(applied.len(), 1);
        assert_eq!(ids, vec![1]);
    }

    #[test]
    fn test_semantic_rewrite_not_extracted_as_spelling() {
        let orig = "I am going to the store to buy apples and oranges.";
        let edit = "Let's reschedule our afternoon sync call to tomorrow morning.";
        let candidates = extract_correction_candidates(orig, edit);

        // Because length and tokens diverge drastically, no bogus dictionary candidates are generated!
        assert!(candidates.is_empty());
    }

    #[test]
    fn test_targeted_selected_word_correction_extraction() {
        let orig = "I love working with wisper flow on my mac";
        let edit = "Wispr";
        let candidates = extract_correction_candidates(orig, edit);

        assert_eq!(candidates.len(), 1);
        assert_eq!(candidates[0].original_span, "wisper");
        assert_eq!(candidates[0].preferred_span, "Wispr");
    }

    #[test]
    fn test_unicode_name_replacement() {
        let rules = vec![
            PersonalVocabularyEntry {
                id: 1,
                original_text: "Rene".to_string(),
                preferred_text: "René".to_string(),
                entry_type: "name".to_string(),
                context_domain: None,
                confidence: 0.95,
                positive_count: 4,
                negative_count: 0,
                status: "active".to_string(),
                recognition_count: 0,
                correction_count: 1,
                application_count: 0,
                last_used_at: None,
                created_at: 0,
                updated_at: 0,
                source: "manual".to_string(),
            }
        ];

        let text = "Hello Rene, welcome back!";
        let (output, applied, ids) = apply_vocabulary_rules(text, &rules);
        assert_eq!(output, "Hello René, welcome back!");
        assert_eq!(applied.len(), 1);
        assert_eq!(ids, vec![1]);
    }

    #[test]
    fn test_replace_phrase_flexible_spaceless_and_names() {
        // 1. Spaceless rule matching spaced spoken words
        let res1 = replace_phrase_flexible("Please ask Madan sir if he is ready.", "Madanser", "Madhan Sir");
        assert_eq!(res1, Some("Please ask Madhan Sir if he is ready.".to_string()));

        // 2. Custom name spelling
        let res2 = replace_phrase_flexible("Hey satvik can you review this code?", "Satvik", "Sathvik");
        assert_eq!(res2, Some("Hey Sathvik can you review this code?".to_string()));

        // 3. Spaced rule matching condensed spoken word
        let res3 = replace_phrase_flexible("You should ask chatgpt for ideas.", "chat gpt", "ChatGPT");
        assert_eq!(res3, Some("You should ask ChatGPT for ideas.".to_string()));
    }
}

