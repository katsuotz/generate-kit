use std::collections::HashMap;

use time::OffsetDateTime;

use super::model::{Achievement, CvData, Education, Experience, Project, SkillGroup};
use crate::error::AppError;

pub const DEFAULT_TEMPLATE_ID: &str = "editorial-v1";
pub const MAX_RENDER_DATA_BYTES: usize = 1_048_576;
pub const MAX_RENDER_SOURCE_BYTES: usize = 524_288;
pub const MAX_ENTRIES_PER_SECTION: usize = 100;
pub const MAX_STRING_CHARS: usize = 16_384;

pub fn normalize_template_id(value: &str) -> &str {
    if value == "default" || value == "legacy-default" || value.trim().is_empty() {
        DEFAULT_TEMPLATE_ID
    } else {
        value
    }
}

pub fn preview_asset(asset: &str) -> Option<(&'static [u8], &'static str)> {
    match asset {
        "editorial-v1.pdf" => Some((
            include_bytes!("templates/editorial-v1.pdf"),
            "application/pdf",
        )),
        "compact-v1.pdf" => Some((
            include_bytes!("templates/compact-v1.pdf"),
            "application/pdf",
        )),
        "modern-v1.pdf" => Some((include_bytes!("templates/modern-v1.pdf"), "application/pdf")),
        _ => None,
    }
}

pub fn source_asset(asset: &str) -> Option<&'static str> {
    match asset {
        "editorial-v1.tex" => Some(include_str!("templates/editorial-v1.tex")),
        "compact-v1.tex" => Some(include_str!("templates/compact-v1.tex")),
        "modern-v1.tex" => Some(include_str!("templates/modern-v1.tex")),
        _ => None,
    }
}

pub fn parse_cv_data(value: &serde_json::Value) -> Result<super::model::CvData, AppError> {
    let bytes = serde_json::to_vec(value)
        .map_err(|error| AppError::BadRequest(format!("invalid cv data: {error}")))?;
    if bytes.len() > MAX_RENDER_DATA_BYTES {
        return Err(AppError::BadRequest("cv data exceeds 1 MiB".into()));
    }
    if !value.is_object() {
        return Err(AppError::BadRequest("cv data must be a JSON object".into()));
    }
    let data: super::model::CvData = serde_json::from_value(value.clone())
        .map_err(|error| AppError::BadRequest(format!("invalid cv data: {error}")))?;
    validate_limits(&data)?;
    Ok(data)
}

pub fn render_template(
    template_id: &str,
    data: &CvData,
    generated_at: OffsetDateTime,
) -> Result<String, AppError> {
    let asset = format!("{template_id}.tex");
    render_template_asset(&asset, data, generated_at)
}

pub fn render_template_asset(
    asset: &str,
    data: &CvData,
    generated_at: OffsetDateTime,
) -> Result<String, AppError> {
    let source = source_asset(asset)
        .ok_or_else(|| AppError::BadRequest("template source is unavailable".into()))?;
    Ok(render_source(source, data, generated_at))
}

pub fn render_editorial(data: &CvData, generated_at: OffsetDateTime) -> String {
    render_template(DEFAULT_TEMPLATE_ID, data, generated_at).unwrap_or_default()
}

fn render_source(source: &str, data: &CvData, generated_at: OffsetDateTime) -> String {
    let contacts = [
        non_empty(&data.identity.location)
            .map(|value| format!("\\mbox{{\\faMapMarker*\\hspace{{0.13cm}}{value}}}")),
        non_empty(&data.identity.email).map(|value| {
            format!(
                "\\mbox{{\\href{{mailto:{0}}}{{\\faEnvelope[regular]\\hspace{{0.13cm}}{0}}}}}",
                value
            )
        }),
        non_empty(&data.identity.phone)
            .map(|value| format!("\\mbox{{\\faPhone*\\hspace{{0.13cm}}{value}}}")),
    ]
    .into_iter()
    .flatten()
    .chain(data.identity.profiles.iter().filter_map(|profile| {
        let url = non_empty(&profile.url)?;
        let label = non_empty(&profile.label)
            .or_else(|| non_empty(&profile.r#type))
            .unwrap_or_else(|| url.clone());
        Some(format!(
            "\\mbox{{\\href{{{url}}}{{\\fa{}\\hspace{{0.13cm}}{label}}}}}",
            icon_for(&profile.r#type)
        ))
    }))
    .collect::<Vec<_>>()
    .join("\\kern 0.25cm\\AND\\kern 0.25cm");
    let professional_titles = non_empty(&data.identity.professional_titles)
        .map(|value| format!("{{\\fontsize{{12pt}}{{14pt}}\\selectfont {value}}}"))
        .unwrap_or_default();
    let mut replacements = HashMap::new();
    replacements.insert("FULL_NAME", escape_latex(&data.identity.full_name));
    replacements.insert("GENERATED_DATE", generated_at.date().to_string());
    replacements.insert("PROFESSIONAL_TITLES", professional_titles);
    replacements.insert("CONTACTS", contacts);
    replacements.insert("SECTIONS", render_sections(data));

    let mut source = source.to_owned();
    for (key, value) in replacements {
        source = source.replace(&format!("{{{{{key}}}}}"), &value);
    }
    source
}

fn render_sections(data: &CvData) -> String {
    let sections = [
        ("Summary", render_summary(&data.summary)),
        ("Experience", render_experience(&data.experience)),
        ("Achievements", render_achievements(&data.achievements)),
        ("Skills", render_skills(&data.skills)),
        ("Education", render_education(&data.education)),
        ("Certificates", render_certificates(&data.certificates)),
        ("Projects", render_projects(&data.projects)),
    ];
    sections
        .into_iter()
        .filter_map(|(title, body)| {
            (!body.is_empty()).then(|| format!("\\section{{{title}}}\n{body}\n"))
        })
        .collect()
}

fn render_summary(value: &str) -> String {
    non_empty(value).map_or_else(String::new, |value| onecol(&value))
}

fn render_experience(entries: &[Experience]) -> String {
    entries
        .iter()
        .filter(|entry| !entry.role.trim().is_empty() || !entry.organization.trim().is_empty())
        .map(|entry| {
            let title = format!(
                "\\textbf{{{}}}, {}{}",
                escape_latex(&entry.role),
                escape_latex(&entry.organization),
                optional_suffix(&entry.location)
            );
            format!(
                "{}\n{}\n{}\n{}",
                twocol(&dates(&entry.start, &entry.end, entry.current), &title),
                optional_onecol(&entry.description),
                optional_highlights(&entry.highlights),
                optional_tools(&entry.tools)
            )
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn render_achievements(entries: &[Achievement]) -> String {
    entries
        .iter()
        .filter(|entry| !entry.title.trim().is_empty())
        .map(|entry| {
            let title = format!(
                "\\textbf{{{}}}{}",
                escape_latex(&entry.title),
                optional_suffix_with_separator(&entry.category)
            );
            format!(
                "{}\n{}",
                twocol(&escape_latex(&entry.date), &title),
                optional_onecol(&entry.description)
            )
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn render_skills(entries: &[SkillGroup]) -> String {
    entries
        .iter()
        .filter(|entry| !entry.category.trim().is_empty() || !entry.skills.trim().is_empty())
        .map(|entry| {
            onecol(&format!(
                "\\textbf{{{}:}} {}",
                escape_latex(&entry.category),
                escape_latex(&entry.skills)
            ))
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn render_education(entries: &[Education]) -> String {
    entries
        .iter()
        .filter(|entry| {
            !entry.institution.trim().is_empty() || !entry.qualification.trim().is_empty()
        })
        .map(|entry| {
            let title = format!(
                "\\textbf{{{}}}, {}{}",
                escape_latex(&entry.institution),
                escape_latex(&entry.qualification),
                optional_suffix(&entry.location)
            );
            format!(
                "{}{}",
                twocol(&dates(&entry.start, &entry.end, false), &title),
                optional_onecol_prefixed("GPA: ", &entry.gpa)
            )
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn render_certificates(entries: &[super::model::Certificate]) -> String {
    entries
        .iter()
        .filter(|entry| !entry.name.trim().is_empty() || !entry.issuer.trim().is_empty())
        .map(|entry| {
            let credential = non_empty(&entry.credential_url)
                .map(|url| format!(" -- \\href{{{url}}}{{Credential}}"))
                .unwrap_or_default();
            twocol(
                &escape_latex(&entry.date),
                &format!(
                    "\\textbf{{{}}}, {}{}",
                    escape_latex(&entry.name),
                    escape_latex(&entry.issuer),
                    credential
                ),
            )
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn render_projects(entries: &[Project]) -> String {
    entries
        .iter()
        .filter(|entry| !entry.name.trim().is_empty())
        .map(|entry| {
            let role = optional_suffix_with_separator(&entry.role);
            let url = non_empty(&entry.url)
                .map(|url| format!(" -- \\href{{{url}}}{{Project link}}"))
                .unwrap_or_default();
            format!(
                "{}\n{}\n{}\n{}",
                twocol(
                    &escape_latex(&entry.dates),
                    &format!("\\textbf{{{}}}{role}{url}", escape_latex(&entry.name))
                ),
                optional_onecol(&entry.description),
                optional_highlights(&entry.highlights),
                optional_tools(&entry.tools)
            )
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn validate_limits(data: &CvData) -> Result<(), AppError> {
    if data.identity.profiles.len() > MAX_ENTRIES_PER_SECTION
        || data.experience.len() > MAX_ENTRIES_PER_SECTION
        || data.achievements.len() > MAX_ENTRIES_PER_SECTION
        || data.skills.len() > MAX_ENTRIES_PER_SECTION
        || data.education.len() > MAX_ENTRIES_PER_SECTION
        || data.certificates.len() > MAX_ENTRIES_PER_SECTION
        || data.projects.len() > MAX_ENTRIES_PER_SECTION
    {
        return Err(AppError::BadRequest(
            "cv data contains too many entries".into(),
        ));
    }
    let identity_strings = [
        &data.identity.full_name,
        &data.identity.professional_titles,
        &data.identity.location,
        &data.identity.email,
        &data.identity.phone,
        &data.summary,
    ];
    let bounded = |values: &[&String]| {
        values
            .iter()
            .any(|value| value.chars().count() > MAX_STRING_CHARS)
    };
    let entries_bounded = data
        .identity
        .profiles
        .iter()
        .any(|item| bounded(&[&item.id, &item.r#type, &item.label, &item.url]))
        || data.experience.iter().any(|item| {
            bounded(&[
                &item.id,
                &item.role,
                &item.organization,
                &item.location,
                &item.start,
                &item.end,
                &item.description,
                &item.highlights,
                &item.tools,
            ])
        })
        || data.achievements.iter().any(|item| {
            bounded(&[
                &item.id,
                &item.title,
                &item.category,
                &item.date,
                &item.description,
            ])
        })
        || data
            .skills
            .iter()
            .any(|item| bounded(&[&item.id, &item.category, &item.skills]))
        || data.education.iter().any(|item| {
            bounded(&[
                &item.id,
                &item.institution,
                &item.qualification,
                &item.location,
                &item.start,
                &item.end,
                &item.gpa,
            ])
        })
        || data.certificates.iter().any(|item| {
            bounded(&[
                &item.id,
                &item.name,
                &item.issuer,
                &item.date,
                &item.credential_url,
            ])
        })
        || data.projects.iter().any(|item| {
            bounded(&[
                &item.id,
                &item.name,
                &item.role,
                &item.url,
                &item.dates,
                &item.description,
                &item.highlights,
                &item.tools,
            ])
        });
    if bounded(&identity_strings) || entries_bounded {
        return Err(AppError::BadRequest(
            "cv data contains an oversized string".into(),
        ));
    }
    Ok(())
}

fn escape_latex(value: &str) -> String {
    value
        .chars()
        .filter(|character| {
            let code = *character as u32;
            code >= 32 || *character == '\n' || *character == '\t'
        })
        .map(|character| match character {
            '\\' => "\\textbackslash{}".into(),
            '{' => "\\{".into(),
            '}' => "\\}".into(),
            '$' => "\\$".into(),
            '&' => "\\&".into(),
            '#' => "\\#".into(),
            '_' => "\\_".into(),
            '%' => "\\%".into(),
            '~' => "\\textasciitilde{}".into(),
            '^' => "\\textasciicircum{}".into(),
            character => character.to_string(),
        })
        .collect()
}

fn non_empty(value: &str) -> Option<String> {
    let value = value.trim();
    (!value.is_empty()).then(|| escape_latex(value))
}

fn onecol(body: &str) -> String {
    format!("\\begin{{onecolentry}}\n{body}\n\\end{{onecolentry}}")
}
fn twocol(date: &str, body: &str) -> String {
    format!("\\begin{{twocolentry}}{{{date}}}\n{body}\n\\end{{twocolentry}}")
}
fn optional_onecol(value: &str) -> String {
    non_empty(value).map_or_else(String::new, |value| onecol(&value))
}
fn optional_onecol_prefixed(prefix: &str, value: &str) -> String {
    non_empty(value).map_or_else(String::new, |value| {
        onecol(&format!("{}{}", escape_latex(prefix), value))
    })
}
fn optional_highlights(value: &str) -> String {
    let lines = value
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(escape_latex)
        .collect::<Vec<_>>();
    if lines.is_empty() {
        String::new()
    } else {
        onecol(&format!(
            "\\begin{{highlights}}\n{}\n\\end{{highlights}}",
            lines
                .into_iter()
                .map(|line| format!("\\item {line}"))
                .collect::<Vec<_>>()
                .join("\n")
        ))
    }
}
fn optional_tools(value: &str) -> String {
    non_empty(value).map_or_else(String::new, |value| {
        onecol(&format!("\\textit{{Tools: {value}}}"))
    })
}
fn optional_suffix(value: &str) -> String {
    non_empty(value).map_or_else(String::new, |value| format!(" -- {value}"))
}
fn optional_suffix_with_separator(value: &str) -> String {
    non_empty(value).map_or_else(String::new, |value| format!(" -- {value}"))
}
fn dates(start: &str, end: &str, current: bool) -> String {
    [
        non_empty(start),
        current.then(|| "Present".into()),
        (!current).then(|| non_empty(end)).flatten(),
    ]
    .into_iter()
    .flatten()
    .collect::<Vec<_>>()
    .join(" -- ")
}
fn icon_for(value: &str) -> &'static str {
    match value.to_ascii_lowercase().as_str() {
        "github" => "Github",
        "linkedin" => "Linkedin",
        "website" | "portfolio" => "Globe",
        "x" => "Twitter",
        _ => "Link",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn escapes_latex_metacharacters_and_discards_controls() {
        assert_eq!(escape_latex(r#"Ada & {Co}_50%"#), r#"Ada \& \{Co\}\_50\%"#);
        assert_eq!(escape_latex("safe\u{0} text"), "safe text");
    }

    #[test]
    fn renders_typed_data_without_interpreting_latex() {
        let data = parse_cv_data(&serde_json::json!({
            "identity": {"fullName": "Ada & Co", "email": "ada@example.com"},
            "summary": "Builds {safe} systems"
        }))
        .unwrap();
        let source = render_editorial(&data, OffsetDateTime::UNIX_EPOCH);
        assert!(source.contains("Ada \\& Co"));
        assert!(source.contains("Builds \\{safe\\} systems"));
        assert!(!source.contains("{{FULL_NAME}}"));
    }

    #[test]
    fn rejects_unknown_fields_and_entry_limits() {
        assert!(parse_cv_data(&serde_json::json!({"unknown": true})).is_err());
        let profiles = (0..=MAX_ENTRIES_PER_SECTION)
            .map(|_| serde_json::json!({}))
            .collect::<Vec<_>>();
        assert!(parse_cv_data(&serde_json::json!({"identity": {"profiles": profiles}})).is_err());
    }

    #[test]
    fn renders_all_catalog_templates_and_rejects_unknown_assets() {
        let data = parse_cv_data(&serde_json::json!({
            "identity": {"fullName": "Ada", "email": "ada@example.com"}
        }))
        .unwrap();
        for template_id in ["editorial-v1", "compact-v1", "modern-v1"] {
            let source = render_template(template_id, &data, OffsetDateTime::UNIX_EPOCH).unwrap();
            assert!(source.contains(&format!("CV_BUILDER_TEMPLATE:{template_id}")));
            assert!(!source.contains("{{FULL_NAME}}"));
        }
        assert!(render_template("unknown-v1", &data, OffsetDateTime::UNIX_EPOCH).is_err());
    }

    #[test]
    fn ships_valid_pdf_preview_assets_for_each_template() {
        for asset in ["editorial-v1.pdf", "compact-v1.pdf", "modern-v1.pdf"] {
            let (bytes, media_type) = preview_asset(asset).unwrap();
            assert_eq!(media_type, "application/pdf");
            assert!(bytes.starts_with(b"%PDF-"));
            assert!(bytes.len() > 10_000, "preview asset is unexpectedly small");
        }
    }

    #[test]
    fn escapes_command_injection_in_urls_and_text() {
        let data = parse_cv_data(&serde_json::json!({
            "identity": {
                "fullName": "Ada \\input{evil}",
                "email": "ada@example.com",
                "profiles": [{"type": "website", "url": "https://example.com/a_b?x=1&y=2"}]
            },
            "summary": "Safe % text"
        }))
        .unwrap();
        let source = render_template("modern-v1", &data, OffsetDateTime::UNIX_EPOCH).unwrap();
        assert!(!source.contains("\\input{evil}"));
        assert!(source.contains("\\textbackslash{}input"));
        assert!(source.contains("a\\_b?x=1\\&y=2"));
    }

    #[test]
    fn rejects_data_over_the_render_limit() {
        let oversized = "x".repeat(MAX_RENDER_DATA_BYTES);
        assert!(parse_cv_data(&serde_json::json!({"summary": oversized})).is_err());
    }
}
