//! VoxQuest Prompt Detection & Enhancement Service
//!
//! Intelligently detects whether dictated speech represents an AI prompt
//! (e.g., instructions, coding requests, questions, or speech directed at AI tools)
//! and provides instant 1-click prompt enhancement into articulate, high-potency
//! instructions without boilerplate condition checklists.

use serde::{Deserialize, Serialize};

/// Checks whether a given transcript or destination context represents an AI prompt.
pub fn is_ai_prompt(text: &str, target_app: Option<&str>) -> bool {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return false;
    }

    let lower = trimmed.to_lowercase();

    // 1. Target application check: if spoken directly into an AI assistant, IDE, or chat tool
    if let Some(app) = target_app {
        let app_lower = app.to_lowercase();
        let ai_apps = [
            "chatgpt", "claude", "cursor", "antigravity", "copilot", "perplexity",
            "poe", "groq", "gemini", "ollama", "code", "vscode", "vscodium",
            "zed", "sublime", "pycharm", "intellij", "webstorm"
        ];
        if ai_apps.iter().any(|&ai| app_lower.contains(ai)) {
            // In an AI app or editor, even short instructions or queries are prompts
            if lower.contains('?') || lower.len() >= 5 {
                return true;
            }
        }
    }

    // 2. Contains explicit keyword 'prompt' anywhere in speech
    if lower.contains("prompt") {
        return true;
    }

    // 3. Strip leading conversational fillers before checking directive starters
    let cleaned = clean_conversational_filler(trimmed);
    let lower_cleaned = cleaned.to_lowercase();

    // 4. Explicit prompt prefixes
    if lower_cleaned.starts_with("instruction:")
        || lower_cleaned.starts_with("system:")
        || lower_cleaned.starts_with("act as")
    {
        return true;
    }

    // 5. Directive action verbs at the beginning of speech
    let directive_verbs = [
        "write", "explain", "how to", "how do i", "how can i", "create", "generate",
        "summarize", "refactor", "fix", "debug", "what is", "can you", "could you",
        "build", "implement", "compose", "draft", "suggest", "give me", "tell me",
        "design", "rewrite", "convert", "translate", "find the issue", "help me",
        "compare", "analyze", "review", "optimize", "list the", "step by step",
        "make a", "develop a", "code a"
    ];

    for verb in &directive_verbs {
        if lower_cleaned.starts_with(verb) {
            return true;
        }
    }

    // 6. Question sentence structure
    if lower_cleaned.ends_with('?') {
        let question_words = ["why", "how", "what", "which", "when", "who", "where", "is there", "can"];
        for q in &question_words {
            if lower_cleaned.starts_with(q) {
                return true;
            }
        }
    }

    // 7. Common prompt phrases in the body
    let prompt_body_phrases = [
        "in python", "in javascript", "in rust", "in typescript", "in react",
        "as a senior engineer", "unit test", "step by step", "without explanation",
        "in json format", "in markdown", "bullet points", "for website", "website prompt"
    ];
    for phrase in &prompt_body_phrases {
        if lower_cleaned.contains(phrase) {
            return true;
        }
    }

    false
}

/// Enhances a dictated prompt into a well-structured, production-ready AI prompt.
/// Elevates conversational speech into precise, professional instructions
/// directly on the text itself—never appending generic condition checklists.
pub fn enhance_ai_prompt(raw_text: &str) -> String {
    let trimmed = raw_text.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    // 0. Clean speech disfluencies, stuttering, and spoken false starts
    let disfluency_cleaned = crate::enhancement_service::clean_speech_disfluencies(trimmed);

    // Feature 018: Check for explicit Prompt Architect invocation
    let lower = disfluency_cleaned.to_lowercase();
    if lower.contains("prompt architect") || lower.starts_with("structure as prompt") || lower.starts_with("format as prompt") {
        return format_as_prompt_architect(&disfluency_cleaned);
    }

    // 1. Strip spoken conversational fluff and pleasantries
    let cleaned = clean_conversational_filler(&disfluency_cleaned);
    if cleaned.is_empty() {
        return trimmed.to_string();
    }

    // 2. Elevate weak initial phrasing to strong directives
    let elevated = elevate_directive_phrasing(&cleaned);

    // 3. Expand colloquial contractions
    let expanded = expand_spoken_colloquialisms(&elevated);

    // 4. Proper capitalization for programming languages, tech frameworks & tools
    let cased = apply_technical_casing(&expanded);

    // 5. Ensure final punctuation and capitalization
    finalize_prompt_structure(&cased)
}

fn clean_conversational_filler(text: &str) -> String {
    let mut working = text.trim();
    let prefixes = [
        "hey, can you please ", "hey can you please ", "hey, can you ", "hey can you ",
        "can you please ", "can you ", "could you please ", "could you ",
        "would you please ", "would you ", "will you please ", "will you ",
        "i want you to please ", "i want you to ", "i need you to please ", "i need you to ",
        "i'd like you to ", "i would like you to ", "i was wondering if you could ",
        "please help me to ", "please help me ", "help me to ", "help me ",
        "and then ", "and ", "then ", "also ",
        "so basically ", "basically ", "so like ", "so, ", "so ",
        "um, ", "um ", "uh, ", "uh ", "er, ", "er ",
        "hey, ", "hey ", "hello, ", "hello ", "hi, ", "hi ",
        "yeah, ", "yeah ", "okay, ", "okay ", "well, ", "well ",
        "please ", "just "
    ];

    let mut changed = true;
    while changed {
        changed = false;
        let lower = working.to_lowercase();
        for &prefix in &prefixes {
            if lower.starts_with(prefix) {
                working = working[prefix.len()..].trim_start();
                changed = true;
                break;
            }
        }
    }

    working.to_string()
}

fn elevate_directive_phrasing(text: &str) -> String {
    let lower = text.to_lowercase();
    let trimmed_lower = lower.trim().trim_end_matches('.');

    // 1. Direct website prompt generation
    if trimmed_lower == "generate prompt for website"
        || trimmed_lower == "generate a prompt for website"
        || trimmed_lower == "generate a prompt for a website"
        || trimmed_lower == "generate prompt for a website"
        || trimmed_lower == "prompt for website"
        || trimmed_lower == "prompt for a website"
        || trimmed_lower == "website prompt"
        || trimmed_lower == "generate website prompt"
        || trimmed_lower == "create website prompt"
        || trimmed_lower == "write a prompt for a website"
    {
        return "Act as an expert full-stack developer and UI/UX designer. Create a comprehensive, production-ready specification and implementation plan for a modern, responsive website, including information architecture, modern Tailwind CSS design tokens, key user flows, component hierarchy, and SEO/performance best practices.".to_string();
    }

    // 2. Direct topic prompt generation ("generate prompt for [X]", "prompt for [X]")
    let prompt_gen_prefixes = [
        "generate prompt for ",
        "generate a prompt for ",
        "generate prompt to ",
        "generate a prompt to ",
        "create a prompt for ",
        "create prompt for ",
        "create a prompt to ",
        "create prompt to ",
        "write a prompt for ",
        "write prompt for ",
        "write a prompt to ",
        "write prompt to ",
        "prompt for ",
        "prompt to ",
        "give me a prompt for ",
        "give me a prompt to ",
    ];

    for prefix in &prompt_gen_prefixes {
        if lower.starts_with(prefix) {
            let topic = text[prefix.len()..].trim().trim_end_matches('.');
            return format!("Act as a principal expert on {}. Provide a detailed, production-ready prompt and step-by-step implementation guide covering core architecture, key requirements, error handling, performance considerations, and actionable code examples.", topic);
        }
    }

    // 3. Website creation directives ("make a website for [X]")
    let website_prefixes = [
        "make a website for ",
        "build a website for ",
        "create a website for ",
        "design a website for ",
        "develop a website for ",
    ];
    for prefix in &website_prefixes {
        if lower.starts_with(prefix) {
            let topic = text[prefix.len()..].trim().trim_end_matches('.');
            return format!("Act as an expert web designer and developer. Design and implement a modern, responsive website for {}. Detail the site structure, user journeys, responsive Tailwind layout, and production deployment considerations.", topic);
        }
    }

    // 4. Map colloquial openings to punchy directives
    let replacements = [
        ("write a python function to ", "Implement a Python function to "),
        ("write a python script to ", "Develop a Python script to "),
        ("write a python function ", "Implement a Python function "),
        ("write a python script ", "Develop a Python script "),
        ("write a function to ", "Implement a function to "),
        ("write a function that ", "Implement a function that "),
        ("write a script to ", "Develop a script to "),
        ("write code to ", "Implement code to "),
        ("write code for ", "Implement code for "),
        ("make a python function to ", "Implement a Python function to "),
        ("make a python script to ", "Develop a Python script to "),
        ("make a react component to ", "Develop a reusable React component to "),
        ("make a react component for ", "Develop a reusable React component for "),
        ("make a react component that ", "Develop a reusable React component that "),
        ("make a component that ", "Develop a reusable component that "),
        ("make an app that ", "Develop an application that "),
        ("make a script that ", "Develop a script that "),
        ("make a script to ", "Develop a script to "),
        ("fix this bug where ", "Debug and resolve the issue where "),
        ("fix the bug where ", "Debug and resolve the issue where "),
        ("fix bug where ", "Debug and resolve the issue where "),
        ("find out why ", "Diagnose and explain why "),
        ("figure out why ", "Diagnose and resolve why "),
        ("tell me how to ", "Explain how to "),
        ("tell me what is ", "Explain what is "),
        ("tell me about ", "Provide a comprehensive overview of "),
        ("talk about ", "Provide an overview of "),
        ("tell me the difference between ", "Compare and contrast "),
        ("what is the difference between ", "Compare and contrast the difference between "),
        ("draft an email to ", "Draft a professional email to "),
        ("write an email to ", "Draft a professional email to "),
        ("verify audit claims against reality", "Verify and validate all audit claims against real implementation evidence, identify discrepancies, and fix the highest-risk gaps"),
        ("verify and fix", "Verify and validate all components, and fix the remaining issues"),
        ("verify the", "Verify and validate the"),
        ("verify all", "Verify and validate all"),
        ("verify that", "Verify and validate that"),
        ("verify if", "Verify and validate whether"),
        ("verify ", "Verify and validate "),
        ("check if", "Examine and verify whether"),
        ("check that", "Examine and verify that"),
        ("check the", "Review and check the"),
        ("polish this prompt", "Act as an expert prompt engineer. Refine and optimize this prompt for maximum accuracy:"),
        ("polish the prompt", "Act as an expert prompt engineer. Refine and optimize this prompt for maximum accuracy:"),
        ("polish it and generate or convert to proper prompt", "Act as a prompt engineer and convert this into a high-potency, structured prompt:"),
        ("give me some ideas for ", "Brainstorm strategic ideas for "),
        ("give me ideas for ", "Brainstorm strategic ideas for "),
    ];

    for &(prefix, replacement) in &replacements {
        if lower.starts_with(prefix) {
            let remainder = &text[prefix.len()..];
            return format!("{}{}", replacement, remainder);
        }
    }

    text.to_string()
}

fn expand_spoken_colloquialisms(input: &str) -> String {
    let mut text = input.to_string();
    let pairs = [
        (" gonna ", " going to "),
        (" wanna ", " want to "),
        (" gotta ", " need to "),
        (" kinda ", " kind of "),
        (" sorta ", " sort of "),
        (" lemme ", " let me "),
        (" gimme ", " give me "),
        (" dunno ", " don't know "),
        (" cause ", " because "),
        (" cuz ", " because "),
        (" could of ", " could have "),
        (" should of ", " should have "),
        (" would of ", " would have "),
        (" dont ", " don't "),
        (" cant ", " can't "),
        (" wont ", " won't "),
        (" isnt ", " isn't "),
        (" arent ", " aren't "),
        (" didnt ", " didn't "),
        (" doesnt ", " doesn't "),
        (" thats ", " that's "),
        (" whats ", " what's "),
        (" im ", " I'm "),
        (" ive ", " I've "),
        (" id ", " I'd "),
    ];

    for &(from, to) in &pairs {
        text = text.replace(from, to);
    }

    text
}

fn apply_technical_casing(input: &str) -> String {
    let mut words: Vec<String> = input.split(' ').map(|s| s.to_string()).collect();

    for w in &mut words {
        let clean = w.trim_matches(['.', ',', '!', '?', ';', ':', '"', '\'', '(', ')', '[', ']']).to_lowercase();
        let replacement = match clean.as_str() {
            "python" => Some("Python"),
            "javascript" => Some("JavaScript"),
            "typescript" => Some("TypeScript"),
            "react" => Some("React"),
            "rust" => Some("Rust"),
            "golang" => Some("Go"),
            "html" => Some("HTML"),
            "css" => Some("CSS"),
            "sql" => Some("SQL"),
            "postgresql" | "postgres" => Some("PostgreSQL"),
            "mysql" => Some("MySQL"),
            "sqlite" => Some("SQLite"),
            "mongodb" => Some("MongoDB"),
            "redis" => Some("Redis"),
            "docker" => Some("Docker"),
            "kubernetes" => Some("Kubernetes"),
            "aws" => Some("AWS"),
            "gcp" => Some("GCP"),
            "azure" => Some("Azure"),
            "api" => Some("API"),
            "apis" => Some("APIs"),
            "graphql" => Some("GraphQL"),
            "json" => Some("JSON"),
            "jwt" => Some("JWT"),
            "oauth" => Some("OAuth"),
            "linux" => Some("Linux"),
            "macos" => Some("macOS"),
            "git" => Some("Git"),
            "github" => Some("GitHub"),
            "nodejs" | "node" => Some("Node.js"),
            "nextjs" => Some("Next.js"),
            "vue" | "vuejs" => Some("Vue.js"),
            "angular" => Some("Angular"),
            "tailwind" => Some("Tailwind CSS"),
            "websockets" | "websocket" => Some("WebSockets"),
            _ => None,
        };

        if let Some(rep) = replacement {
            let prefix: String = w.chars().take_while(|c| !c.is_alphanumeric()).collect();
            let suffix: String = w.chars().rev().take_while(|c| !c.is_alphanumeric()).collect();
            let suffix: String = suffix.chars().rev().collect();
            *w = format!("{}{}{}", prefix, rep, suffix);
        }
    }

    words.join(" ")
}

fn finalize_prompt_structure(text: &str) -> String {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    // Capitalize first character
    let mut chars = trimmed.chars();
    let mut result = match chars.next() {
        None => String::new(),
        Some(f) => f.to_uppercase().collect::<String>() + chars.as_str(),
    };

    // Punctuation check: question mark if interrogative, else period
    let lower = result.to_lowercase();
    let is_question = lower.starts_with("how ")
        || lower.starts_with("why ")
        || lower.starts_with("what ")
        || lower.starts_with("which ")
        || lower.starts_with("when ")
        || lower.starts_with("who ")
        || lower.starts_with("where ")
        || lower.starts_with("can ")
        || lower.starts_with("could ")
        || lower.starts_with("is ");

    if !result.ends_with('.') && !result.ends_with('?') && !result.ends_with('!') {
        if is_question {
            result.push('?');
        } else {
            result.push('.');
        }
    }

    result
}

/// Feature 018: Prompt Architect Mode
/// Structures natural spoken technical directives into structured, high-potency
/// prompt specifications with Goal, Context, Requirements, and Constraints.
pub fn format_as_prompt_architect(input: &str) -> String {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    let mut working = trimmed.to_string();
    let cues = [
        "prompt architect:", "prompt architect", "act as prompt architect",
        "format as prompt:", "format as prompt", "structure as prompt:",
        "structure as prompt",
    ];
    let lower = working.to_lowercase();
    for cue in cues {
        if lower.starts_with(cue) {
            working = working[cue.len()..].trim().trim_start_matches(':').trim().to_string();
            break;
        }
    }

    let elevated = enhance_ai_prompt(&working);

    // Identify detected technologies for Context
    let known_tech = [
        "Rust", "Python", "TypeScript", "JavaScript", "React", "Next.js",
        "PostgreSQL", "Docker", "Kubernetes", "FastAPI", "MongoDB", "GraphQL",
        "Supabase", "PyTorch", "Redis", "SQLite", "Tailwind CSS", "Node.js", "VS Code"
    ];
    let mut detected_tech = Vec::new();
    for tech in known_tech {
        if elevated.to_lowercase().contains(&tech.to_lowercase()) {
            detected_tech.push(tech);
        }
    }
    let context_line = if !detected_tech.is_empty() {
        format!("Technical Stack: {}", detected_tech.join(", "))
    } else {
        "Production environment with strict adherence to best practices.".to_string()
    };

    // Extract potential constraints (e.g. phrases containing "don't", "preserve", "ensure", "without")
    let sentences: Vec<&str> = elevated.split(&['.', '!', '?'][..]).map(|s| s.trim()).filter(|s| !s.is_empty()).collect();
    let mut requirements = Vec::new();
    let mut constraints = Vec::new();

    for s in &sentences {
        let s_lower = s.to_lowercase();
        if s_lower.contains("don't") || s_lower.contains("do not") || s_lower.contains("never") || s_lower.contains("preserve") || s_lower.contains("without") || s_lower.contains("must not") {
            constraints.push(format!("- {}", s));
        } else {
            requirements.push(format!("- {}", s));
        }
    }

    if requirements.is_empty() {
        requirements.push(format!("- {}", elevated));
    }
    if constraints.is_empty() {
        constraints.push("- Preserve backward compatibility and existing data integrity.".to_string());
    }

    format!(
        "### Goal\n{}\n\n### Context\n{}\n\n### Requirements\n{}\n\n### Constraints\n{}",
        elevated.lines().next().unwrap_or(&elevated),
        context_line,
        requirements.join("\n"),
        constraints.join("\n")
    )
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TechnicalSpec {
    pub raw_thinking: String,
    pub objective: String,
    pub assumptions: Vec<String>,
    pub decisions: Vec<String>,
    pub constraints: Vec<String>,
    pub acceptance_criteria: Vec<String>,
    pub open_questions: Vec<String>,
    pub markdown: String,
}

/// Feature: Thought-to-Spec
/// Parses unstructured conversational thinking, isolates verbal self-corrections
/// ("actually", "instead", "don't create", "keep existing"), and builds a structured,
/// verified technical specification with Objectives, Assumptions, Decisions, Constraints, and Criteria.
pub fn compose_thought_to_spec(input: &str) -> TechnicalSpec {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return TechnicalSpec {
            raw_thinking: String::new(),
            objective: "No objective specified.".to_string(),
            assumptions: vec![],
            decisions: vec![],
            constraints: vec![],
            acceptance_criteria: vec![],
            open_questions: vec![],
            markdown: String::new(),
        };
    }

    let sentences: Vec<&str> = trimmed
        .split(|c| c == '.' || c == '\n' || c == ';')
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .collect();

    let mut objective = String::new();
    let mut assumptions = Vec::new();
    let mut decisions = Vec::new();
    let mut constraints = Vec::new();
    let mut acceptance_criteria = Vec::new();
    let mut open_questions = Vec::new();

    for s in &sentences {
        let lower = s.to_lowercase();

        if s.contains('?') || lower.starts_with("wondering") || lower.starts_with("not sure") || lower.contains("should we") {
            open_questions.push(format!("❓ {}", s));
            continue;
        }

        if lower.contains("actually") || lower.contains("instead") || lower.contains("rather than") || lower.contains("changed my mind") {
            decisions.push(format!("🔄 Revision: {}", s));
        }

        if lower.contains("already have") || lower.contains("existing") || lower.contains("currently") || lower.contains("assuming") {
            assumptions.push(format!("Existing System: {}", s));
        }

        if lower.contains("don't") || lower.contains("do not") || lower.contains("never") || lower.contains("keep the") || lower.contains("must not") || lower.contains("avoid") {
            constraints.push(format!("🛡️ Invariant: {}", s));
        }

        if lower.contains("add test") || lower.contains("tests") || lower.contains("verify") || lower.contains("ensure") || lower.contains("acceptance") || lower.contains("make sure") {
            acceptance_criteria.push(format!("[ ] {}", s));
        }

        if objective.is_empty() {
            if lower.contains("need") || lower.contains("want") || lower.contains("goal") || lower.contains("issue is") || lower.contains("create") || lower.contains("build") || lower.contains("fix") {
                objective = enhance_ai_prompt(s);
            }
        }
    }

    if objective.is_empty() && !sentences.is_empty() {
        objective = enhance_ai_prompt(sentences[0]);
    }

    if assumptions.is_empty() {
        assumptions.push("Existing technical architecture and dependencies remain intact.".to_string());
    }
    if constraints.is_empty() {
        constraints.push("🛡️ Invariant: Preserve backward compatibility and existing data schema integrity.".to_string());
    }
    if acceptance_criteria.is_empty() {
        acceptance_criteria.push("[ ] Verify functionality with automated unit and integration tests.".to_string());
    }

    let mut md = String::new();
    md.push_str("# Technical Specification\n\n");
    md.push_str(&format!("### 1. Objective\n{}\n\n", objective));

    md.push_str("### 2. System Assumptions\n");
    for a in &assumptions {
        md.push_str(&format!("- {}\n", a));
    }
    md.push('\n');

    if !decisions.is_empty() {
        md.push_str("### 3. Decisions & Revisions\n");
        for d in &decisions {
            md.push_str(&format!("- {}\n", d));
        }
        md.push('\n');
    }

    md.push_str("### 4. Constraints & Invariants\n");
    for c in &constraints {
        md.push_str(&format!("- {}\n", c));
    }
    md.push('\n');

    md.push_str("### 5. Acceptance Criteria\n");
    for ac in &acceptance_criteria {
        md.push_str(&format!("- {}\n", ac));
    }

    if !open_questions.is_empty() {
        md.push_str("\n### 6. Open Questions\n");
        for q in &open_questions {
            md.push_str(&format!("- {}\n", q));
        }
    }

    TechnicalSpec {
        raw_thinking: trimmed.to_string(),
        objective,
        assumptions,
        decisions,
        constraints,
        acceptance_criteria,
        open_questions,
        markdown: md,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_ai_prompt_detection() {
        assert!(is_ai_prompt("write a python script to parse logs", None));
        assert!(is_ai_prompt("explain how rust ownership works", None));
        assert!(is_ai_prompt("how do I configure nginx for websockets?", None));
        assert!(is_ai_prompt("hello there", Some("ChatGPT")));
        assert!(is_ai_prompt("Can you fix this error?", None));
        assert!(!is_ai_prompt("the weather was nice yesterday", Some("Notes")));
    }

    #[test]
    fn test_enhance_ai_prompt_code() {
        let enhanced = enhance_ai_prompt("can you write a python function to validate email addresses");
        // Must NOT append boilerplate condition checklists
        assert!(!enhanced.contains("Requirements:"));
        assert!(!enhanced.contains("Please include:"));
        assert!(!enhanced.contains("Guidelines:"));
        // Must elevate directive and properly case technologies
        assert!(enhanced.starts_with("Implement a Python function to validate email addresses."));
    }

    #[test]
    fn test_enhance_ai_prompt_explanation() {
        let enhanced = enhance_ai_prompt("explain the difference between async and sync in nodejs");
        // Must NOT append boilerplate condition checklists
        assert!(!enhanced.contains("Requirements:"));
        assert!(!enhanced.contains("Please include:"));
        assert!(!enhanced.contains("Guidelines:"));
        assert!(enhanced.contains("Node.js"));
    }

    #[test]
    fn test_enhance_ai_prompt_bug_fix() {
        let enhanced = enhance_ai_prompt("hey can you please fix this bug where the react button doesn't submit");
        assert!(!enhanced.contains("Requirements:"));
        assert!(enhanced.starts_with("Debug and resolve the issue where the React button doesn't submit."));
    }

    #[test]
    fn test_enhance_website_prompt_with_fillers() {
        assert!(is_ai_prompt("and generate prompt for website", None));
        let enhanced = enhance_ai_prompt("and generate prompt for website");
        assert!(enhanced.contains("Act as an expert full-stack developer"));
        assert!(enhanced.contains("modern, responsive website"));

        assert!(is_ai_prompt("prompt for website", None));
        let p2 = enhance_ai_prompt("prompt for website");
        assert!(p2.contains("Act as an expert full-stack developer"));
    }

    #[test]
    fn test_enhance_generalized_topic_prompt() {
        assert!(is_ai_prompt("generate prompt for python web scraper", None));
        let enhanced = enhance_ai_prompt("generate prompt for python web scraper");
        assert!(enhanced.contains("Act as a principal expert on"));
        assert!(enhanced.to_lowercase().contains("python web scraper"));
    }

    #[test]
    fn test_prompt_architect_mode_formatting() {
        let input = "prompt architect: build a Next.js app with PostgreSQL. Preserve existing migrations and don't remove authentication.";
        let res = enhance_ai_prompt(input);
        assert!(res.contains("### Goal"));
        assert!(res.contains("### Context"));
        assert!(res.contains("### Requirements"));
        assert!(res.contains("### Constraints"));
        assert!(res.contains("Next.js"));
        assert!(res.contains("PostgreSQL"));
        assert!(res.contains("authentication"));
    }

    #[test]
    fn test_thought_to_spec_generation() {
        let input = "I need a login page. Actually, we already have one, so don't create another. The issue is session expiry. Keep the existing API and add tests.";
        let spec = compose_thought_to_spec(input);
        assert!(!spec.objective.is_empty());
        assert!(!spec.constraints.is_empty());
        assert!(spec.constraints.iter().any(|c| c.to_lowercase().contains("don't create another") || c.to_lowercase().contains("keep the existing api")));
        assert!(!spec.decisions.is_empty());
        assert!(spec.markdown.contains("# Technical Specification"));
        assert!(spec.markdown.contains("### 1. Objective"));
        assert!(spec.markdown.contains("### 4. Constraints & Invariants"));
    }
}
