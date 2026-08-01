use serde::Serialize;
use serde_json::Value;
use std::collections::HashSet;

const MAX_FILE_CHARACTERS: usize = 500_000;
const MAX_LESSONS: usize = 24;

#[derive(Debug, Clone, Serialize)]
pub struct ValidationReport {
    pub valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
    pub lesson_count: usize,
}

fn find_unsafe_text(value: &Value, path: &str, errors: &mut Vec<String>) {
    match value {
        Value::String(text) => {
            let lower = text.to_lowercase();
            if lower.contains("<script")
                || lower.contains("javascript:")
                || lower.contains("data:text/html")
            {
                errors.push(format!("Unsafe executable content at {path}"));
            }
        }
        Value::Array(items) => {
            for (index, item) in items.iter().enumerate() {
                find_unsafe_text(item, &format!("{path}[{index}]"), errors);
            }
        }
        Value::Object(map) => {
            for (key, item) in map {
                find_unsafe_text(item, &format!("{path}.{key}"), errors);
            }
        }
        _ => {}
    }
}

fn find_facilitator_only_keys(value: &Value, path: &str, errors: &mut Vec<String>) {
    match value {
        Value::Array(items) => {
            for (index, item) in items.iter().enumerate() {
                find_facilitator_only_keys(item, &format!("{path}[{index}]"), errors);
            }
        }
        Value::Object(map) => {
            for (key, item) in map {
                if matches!(
                    key.to_ascii_lowercase().as_str(),
                    "capstone_blueprint"
                        | "required_outcome"
                        | "accepted_decision"
                        | "outcome_class"
                        | "scoring_key"
                        | "answer_key"
                        | "reveal_material"
                ) {
                    errors.push(format!(
                        "Facilitator-only outcome or scoring field at {path}.{key}"
                    ));
                }
                find_facilitator_only_keys(item, &format!("{path}.{key}"), errors);
            }
        }
        _ => {}
    }
}

pub fn validate_lesson_plan(raw: &str, allowed_skill_ids: &[String]) -> ValidationReport {
    let mut errors = Vec::new();
    let mut warnings = Vec::new();

    if raw.len() > MAX_FILE_CHARACTERS {
        errors.push("Lesson plan exceeds the 500,000 character limit".to_string());
    }

    let value: Value = match serde_json::from_str(raw) {
        Ok(value) => value,
        Err(error) => {
            return ValidationReport {
                valid: false,
                errors: vec![format!("Invalid JSON: {error}")],
                warnings,
                lesson_count: 0,
            };
        }
    };

    if value.get("schema_version").and_then(Value::as_str) != Some("1.0") {
        errors.push("schema_version must be 1.0".to_string());
    }
    for field in ["plan_id", "version", "title", "lessons"] {
        if value.get(field).is_none() {
            errors.push(format!("Missing required field: {field}"));
        }
    }

    let lessons = value.get("lessons").and_then(Value::as_array);
    let lesson_count = lessons.map_or(0, Vec::len);
    if lesson_count == 0 {
        errors.push("A lesson plan must contain at least one lesson".to_string());
    }
    if lesson_count > MAX_LESSONS {
        errors.push(format!(
            "A lesson plan may contain at most {MAX_LESSONS} lessons"
        ));
    }

    let allowed: HashSet<&str> = allowed_skill_ids.iter().map(String::as_str).collect();
    if let Some(lessons) = lessons {
        let mut lesson_ids = HashSet::new();
        for (index, lesson) in lessons.iter().enumerate() {
            let location = format!("lessons[{index}]");
            for field in [
                "lesson_id",
                "title",
                "skill_ids",
                "objective",
                "sections",
                "mastery_criteria",
            ] {
                if lesson.get(field).is_none() {
                    errors.push(format!("{location} is missing {field}"));
                }
            }
            if let Some(id) = lesson.get("lesson_id").and_then(Value::as_str)
                && !lesson_ids.insert(id.to_string())
            {
                errors.push(format!("Duplicate lesson_id: {id}"));
            }
            if let Some(skill_ids) = lesson.get("skill_ids").and_then(Value::as_array) {
                for skill_id in skill_ids.iter().filter_map(Value::as_str) {
                    if !allowed.contains(skill_id) {
                        errors.push(format!("Unknown skill ID {skill_id} in {location}"));
                    }
                }
            }
        }
    }

    find_unsafe_text(&value, "$", &mut errors);
    find_facilitator_only_keys(&value, "$", &mut errors);

    if value
        .pointer("/origin/provider")
        .and_then(Value::as_str)
        .is_none()
    {
        warnings
            .push("No origin provider was supplied; provenance will be marked unknown".to_string());
    }
    if value
        .get("sources")
        .and_then(Value::as_array)
        .is_none_or(Vec::is_empty)
    {
        warnings.push(
            "No sources were supplied; current-rule claims must remain unavailable".to_string(),
        );
    }

    ValidationReport {
        valid: errors.is_empty(),
        errors,
        warnings,
        lesson_count,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_executable_content() {
        let raw = r#"{
          "schema_version":"1.0","plan_id":"x","version":"1.0.0","title":"X",
          "lessons":[{"lesson_id":"L1","title":"X","skill_ids":["RM-004"],
          "objective":"<script>alert(1)</script>","sections":[],"mastery_criteria":[]}]
        }"#;
        let report = validate_lesson_plan(raw, &["RM-004".to_string()]);
        assert!(!report.valid);
        assert!(report.errors.iter().any(|error| error.contains("Unsafe")));
    }

    #[test]
    fn rejects_facilitator_only_outcomes_from_learner_plans() {
        let raw = r#"{
          "schema_version":"1.0","plan_id":"learner-plan","version":"1.0.0","title":"Learner plan",
          "origin":{"type":"external_generated","provider":"Test"},
          "target_skill_ids":["RM-004"],"prerequisites":[],"sources":[],
          "created_at":"2026-07-26T10:00:00.000Z",
          "lessons":[{"lesson_id":"lesson-1","version":"1.0.0","title":"Practice",
          "skill_ids":["RM-004"],"objective":"Practice a bounded risk decision.",
          "estimated_minutes":10,"sections":[{"type":"practice","title":"Try","body":"Try it."}],
          "mastery_criteria":["States the boundary"],
          "capstone_blueprint":[{"required_outcome":"PROCEED"}]}]
        }"#;
        let report = validate_lesson_plan(raw, &["RM-004".to_string()]);
        assert!(!report.valid);
        assert!(
            report
                .errors
                .iter()
                .any(|error| error.contains("Facilitator-only"))
        );
    }
}
