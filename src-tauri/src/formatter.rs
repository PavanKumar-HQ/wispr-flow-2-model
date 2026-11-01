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

pub fn format_transcript(raw: &str, config: &FormattingConfig) -> String {
    let mut text = raw.trim().to_string();
    if text.is_empty() {
        return text;
    }

    if config.spoken_punctuation {
        text = apply_spoken_punctuation(&text);
    }

    if config.conservative_filler_removal {
        text = remove_conservative_fillers(&text);
    }

    if config.auto_capitalization {
        text = capitalize_sentences(&text);
    }

    clean_whitespace(&text)
}

fn apply_spoken_punctuation(input: &str) -> String {
    // Multi-word phrase replacements first, followed by single-word tokens
    let phrase_rules: &[(&str, &str)] = &[
        ("question mark", "?"),
        ("exclamation mark", "!"),
        ("exclamation point", "!"),
        ("full stop", "."),
        ("new paragraph", "\n\n"),
        ("new line", "\n"),
        ("newline", "\n"),
        ("open quote", "\""),
        ("close quote", "\""),
        ("open parenthesis", "("),
        ("close parenthesis", ")"),
        ("period", "."),
        ("comma", ","),
        ("colon", ":"),
        ("semicolon", ";"),
    ];

    let mut result = input.to_string();

    for (cmd, punct) in phrase_rules {
        result = replace_case_insensitive_word_sequence(&result, cmd, punct);
    }

    // Fix spacing before punctuation marks: "word ." -> "word."
    result = result.replace(" .", ".")
                   .replace(" ,", ",")
                   .replace(" ?", "?")
                   .replace(" !", "!")
                   .replace(" :", ":")
                   .replace(" ;", ";");

    result
}

fn replace_case_insensitive_word_sequence(text: &str, phrase: &str, replacement: &str) -> String {
    let phrase_words: Vec<&str> = phrase.split_whitespace().collect();
    if phrase_words.is_empty() {
        return text.to_string();
    }

    // Split preserving explicit newlines
    let tokens: Vec<&str> = text.split(' ').collect();
    let mut output: Vec<String> = Vec::new();
    let mut i = 0;

    while i < tokens.len() {
        if i + phrase_words.len() <= tokens.len() {
            let mut matches = true;
            for j in 0..phrase_words.len() {
                let clean_input = tokens[i + j].trim_matches(|c: char| !c.is_alphanumeric()).to_lowercase();
                let target = phrase_words[j].to_lowercase();
                if clean_input != target {
                    matches = false;
                    break;
                }
            }
            if matches {
                output.push(replacement.to_string());
                i += phrase_words.len();
                continue;
            }
        }
        output.push(tokens[i].to_string());
        i += 1;
    }

    output.join(" ")
}

fn remove_conservative_fillers(input: &str) -> String {
    let words = input.split_whitespace();
    let mut kept = Vec::new();

    for w in words {
        let clean = w.to_lowercase().replace(|c: char| !c.is_alphabetic(), "");
        if clean == "um" || clean == "uh" || clean == "er" {
            continue;
        }
        kept.push(w);
    }
    kept.join(" ")
}

fn capitalize_sentences(input: &str) -> String {
    let mut result = String::with_capacity(input.len());
    let mut capitalize_next = true;

    for c in input.chars() {
        if capitalize_next && c.is_alphabetic() {
            result.extend(c.to_uppercase());
            capitalize_next = false;
        } else {
            result.push(c);
            if c == '.' || c == '?' || c == '!' || c == '\n' {
                capitalize_next = true;
            }
        }
    }

    result
}

fn clean_whitespace(text: &str) -> String {
    let lines: Vec<&str> = text.split('\n').collect();
    let cleaned_lines: Vec<String> = lines.into_iter().map(|line| {
        line.split_whitespace().collect::<Vec<_>>().join(" ")
    }).collect();
    cleaned_lines.join("\n")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_faithful_formatting() {
        let cfg = FormattingConfig::default();
        let raw = "hello world period this is a test comma right question mark";
        let formatted = format_transcript(raw, &cfg);
        assert_eq!(formatted, "Hello world. This is a test, right?");
    }

    #[test]
    fn test_new_line_command() {
        let cfg = FormattingConfig::default();
        let raw = "first line newline second line";
        let formatted = format_transcript(raw, &cfg);
        assert!(formatted.contains('\n'));
        assert_eq!(formatted, "First line\nSecond line");
    }

    #[test]
    fn test_conservative_fillers() {
        let cfg = FormattingConfig {
            spoken_punctuation: true,
            conservative_filler_removal: true,
            auto_capitalization: true,
        };
        let raw = "I think um this is uh working";
        let formatted = format_transcript(raw, &cfg);
        assert_eq!(formatted, "I think this is working");
    }
}
