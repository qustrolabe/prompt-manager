use chrono::{Local, Utc};
use crate::config::FrontmatterSettings;
use gray_matter::{engine::YAML, Matter};
use log::info;
use serde::{Deserialize, Serialize};
use serde_yaml::{Mapping, Value as YamlValue};
use sha2::{Digest, Sha256};
use specta::Type;
use std::fs;
use std::path::Path;
use uuid::Uuid;

/// A prompt file representation (parsed from markdown)
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PromptFile {
    /// File identifier (relative file path)
    pub id: String,
    /// File path relative to vault root
    pub file_path: String,
    /// Tags from frontmatter
    pub tags: Vec<String>,
    /// Created timestamp from frontmatter (ISO string)
    pub created: Option<String>,
    /// The prompt content (from code block)
    pub content: String,
    /// Hash of the full file contents
    #[serde(default)]
    pub file_hash: Option<String>,
    /// Optional prompt title from frontmatter
    pub title: Option<String>,
    /// Optional prompt description from frontmatter
    pub description: Option<String>,
}

/// Vault operation errors
#[derive(Debug, Clone, Serialize, thiserror::Error, Type)]
pub enum VaultError {
    #[error("Vault path not configured")]
    NotConfigured,
    #[error("Prompt not found: {0}")]
    NotFound(String),
    #[error("Vault path does not exist: {0}")]
    PathNotFound(String),
    #[error("IO error: {0}")]
    IoError(String),
    #[error("Parse error: {0}")]
    ParseError(String),
    #[error("Serialize error: {0}")]
    SerializeError(String),
    #[error("Invalid filename: {0}")]
    InvalidFilename(String),
    #[error("Invalid file path: {0}")]
    InvalidFilePath(String),
    #[error("File name already exists: {0}")]
    FileAlreadyExists(String),
    #[error("Invalid prompt content: {0}")]
    InvalidContent(String),
}

/// Scan vault directory and return all prompt files
pub fn scan_vault(
    vault_path: &Path,
    frontmatter_settings: &FrontmatterSettings,
) -> Result<Vec<PromptFile>, VaultError> {
    if !vault_path.exists() {
        return Err(VaultError::PathNotFound(vault_path.display().to_string()));
    }

    let mut prompts = Vec::new();

    let entries = fs::read_dir(vault_path)
        .map_err(|e| VaultError::IoError(e.to_string()))?;

    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|ext| ext.to_str()) != Some("md") {
            continue;
        }
        match read_prompt_file(vault_path, &path, frontmatter_settings) {
            Ok(prompt) => prompts.push(prompt),
            Err(e) => {
                info!("Skipping file {:?}: {}", path, e);
            }
        }
    }

    info!("Scanned vault, found {} prompts", prompts.len());
    Ok(prompts)
}

pub fn find_prompt_by_id(
    vault_path: &Path,
    id: &str,
    frontmatter_settings: &FrontmatterSettings,
) -> Result<PromptFile, VaultError> {
    if !vault_path.exists() {
        return Err(VaultError::PathNotFound(vault_path.display().to_string()));
    }

    let relative_path = normalize_relative_path(id)?;
    let file_path = vault_path.join(&relative_path);
    read_prompt_file(vault_path, &file_path, frontmatter_settings)
        .map_err(|_| VaultError::NotFound(id.to_string()))
}

/// Read and parse a single prompt markdown file
pub fn read_prompt_file(
    vault_path: &Path,
    file_path: &Path,
    frontmatter_settings: &FrontmatterSettings,
) -> Result<PromptFile, VaultError> {
    // Read file content
    let content = fs::read_to_string(file_path).map_err(|e| VaultError::IoError(e.to_string()))?;
    let file_hash = Some(compute_file_hash(&content));

    // Parse frontmatter
    let matter = Matter::<YAML>::new();
    let parsed = matter.parse(&content);

    let frontmatter_map: Mapping = parsed
        .data
        .and_then(|d| d.deserialize().ok())
        .unwrap_or_else(Mapping::new);

    let prompt_tags_property = normalize_frontmatter_key(&frontmatter_settings.prompt_tags_property);
    let tags = extract_tags(&frontmatter_map, &prompt_tags_property);
    let created = extract_string(&frontmatter_map, "created");
    let title = extract_string(&frontmatter_map, "title");
    let description = extract_string(&frontmatter_map, "description");

    // Extract content from code block
    let prompt_content = extract_code_block_content(&parsed.content);

    // Get relative path
    let relative_path = file_path
        .strip_prefix(vault_path)
        .unwrap_or(file_path)
        .display()
        .to_string();

    Ok(PromptFile {
        id: relative_path.clone(),
        file_path: relative_path,
        tags,
        created,
        content: prompt_content,
        file_hash,
        title,
        description,
    })
}

/// Write a prompt to a markdown file
pub fn write_prompt_file(
    vault_path: &Path,
    prompt: &PromptFile,
    frontmatter_settings: &FrontmatterSettings,
) -> Result<(), VaultError> {
    if prompt.content.contains("```") || prompt.content.contains("~~~") {
        return Err(VaultError::InvalidContent(
            "Prompt content cannot include ``` or ~~~".to_string(),
        ));
    }

    let relative_path = normalize_relative_path(&prompt.file_path)?;
    let file_path = vault_path.join(&relative_path);

    let existing = fs::read_to_string(&file_path).ok();
    let (mut frontmatter_map, existing_body) = parse_existing_prompt(&existing)?;

    // Build frontmatter
    let created = prompt
        .created
        .clone()
        .or_else(|| {
            frontmatter_map
                .get(&YamlValue::String("created".to_string()))
                .and_then(|v| v.as_str().map(|s| s.to_string()))
        })
        .unwrap_or_else(|| Utc::now().format("%Y-%m-%dT%H:%M:%S").to_string());

    frontmatter_map.insert(
        YamlValue::String("created".to_string()),
        YamlValue::String(created),
    );
    let prompt_tags_property = normalize_frontmatter_key(&frontmatter_settings.prompt_tags_property);
    set_tags(
        &mut frontmatter_map,
        &prompt_tags_property,
        &prompt.tags,
    );
    if frontmatter_settings.add_prompts_tag_to_tags {
        let mut existing_tags = extract_tags(&frontmatter_map, "tags");
        if !existing_tags.iter().any(|t| t == "prompts") {
            existing_tags.push("prompts".to_string());
        }
        set_tags(&mut frontmatter_map, "tags", &existing_tags);
    }
    if let Some(title) = prompt.title.clone().filter(|t| !t.trim().is_empty()) {
        frontmatter_map.insert(
            YamlValue::String("title".to_string()),
            YamlValue::String(title),
        );
    } else {
        frontmatter_map.remove(&YamlValue::String("title".to_string()));
    }
    if let Some(description) = prompt
        .description
        .clone()
        .filter(|d| !d.trim().is_empty())
    {
        frontmatter_map.insert(
            YamlValue::String("description".to_string()),
            YamlValue::String(description),
        );
    } else {
        frontmatter_map.remove(&YamlValue::String("description".to_string()));
    }

    frontmatter_map.remove(&YamlValue::String("id".to_string()));
    let frontmatter = render_frontmatter(&frontmatter_map)?;
    let updated_body = update_prompt_block(&existing_body, &prompt.content);
    let content = format!("{}{}", frontmatter, updated_body);

    fs::write(&file_path, content).map_err(|e| VaultError::IoError(e.to_string()))?;

    info!("Wrote prompt file: {:?}", file_path);
    Ok(())
}

/// Delete a prompt file
pub fn delete_prompt_file(vault_path: &Path, id: &str) -> Result<(), VaultError> {
    let relative_path = normalize_relative_path(id)?;
    let file_path = vault_path.join(relative_path);

    if !file_path.exists() {
        return Err(VaultError::PathNotFound(file_path.display().to_string()));
    }

    fs::remove_file(&file_path).map_err(|e| VaultError::IoError(e.to_string()))?;

    info!("Deleted prompt file: {:?}", file_path);
    Ok(())
}

/// Extract content from a markdown code block with language "prompt"
fn extract_code_block_content(markdown: &str) -> String {
    let lines: Vec<&str> = markdown.lines().collect();
    let mut in_block = false;
    let mut fence = "";
    let mut content_lines = Vec::new();

    for line in lines {
        let trimmed = line.trim_start();
        if trimmed.starts_with("```prompt") || trimmed.starts_with("~~~prompt") {
            in_block = true;
            fence = if trimmed.starts_with("~~~") { "~~~" } else { "```" };
            continue;
        }
        if in_block && line.trim_start().starts_with(fence) {
            break;
        }
        if in_block {
            content_lines.push(line);
        }
    }

    content_lines.join("\n")
}

pub fn generate_unique_file_path(vault_path: &Path) -> Result<String, VaultError> {
    let date = Local::now().format("%Y-%m-%d").to_string();
    for _ in 0..20 {
        let random = Uuid::new_v4()
            .simple()
            .to_string()
            .chars()
            .take(6)
            .collect::<String>();
        let candidate = format!("{}-{}.md", date, random);
        let path = vault_path.join(&candidate);
        if !path.exists() {
            return Ok(candidate);
        }
    }
    Err(VaultError::FileAlreadyExists(
        "Failed to generate unique filename".to_string(),
    ))
}

pub fn normalize_relative_path(path: &str) -> Result<String, VaultError> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err(VaultError::InvalidFilePath("empty path".to_string()));
    }
    if trimmed.contains("..") {
        return Err(VaultError::InvalidFilePath("path traversal".to_string()));
    }
    if trimmed.starts_with('/') || trimmed.starts_with('\\') {
        return Err(VaultError::InvalidFilePath("absolute path".to_string()));
    }
    if trimmed.contains('/') || trimmed.contains('\\') {
        return Err(VaultError::InvalidFilePath(
            "subfolders are not supported".to_string(),
        ));
    }

    let with_ext = if trimmed.ends_with(".md") {
        trimmed.to_string()
    } else {
        format!("{}.md", trimmed)
    };

    Ok(with_ext)
}

fn parse_existing_prompt(existing: &Option<String>) -> Result<(Mapping, String), VaultError> {
    if let Some(content) = existing {
        let matter = Matter::<YAML>::new();
        let parsed = matter.parse(content);
        let frontmatter_map: Mapping = parsed
            .data
            .and_then(|d| d.deserialize().ok())
            .unwrap_or_else(Mapping::new);
        Ok((frontmatter_map, parsed.content))
    } else {
        Ok((Mapping::new(), String::new()))
    }
}

fn render_frontmatter(map: &Mapping) -> Result<String, VaultError> {
    let mut yaml = serde_yaml::to_string(map).map_err(|e| VaultError::SerializeError(e.to_string()))?;
    if yaml.starts_with("---") {
        yaml = yaml.trim_start_matches("---\n").to_string();
    }
    if !yaml.ends_with('\n') {
        yaml.push('\n');
    }
    Ok(format!("---\n{}---\n\n", yaml))
}

fn normalize_frontmatter_key(key: &str) -> String {
    let trimmed = key.trim();
    if trimmed.is_empty() {
        return "tags".to_string();
    }
    trimmed.to_string()
}

fn normalize_tag(tag: &str) -> Option<String> {
    let normalized = tag.trim().trim_start_matches('#').trim();
    if normalized.is_empty() {
        None
    } else {
        Some(normalized.to_string())
    }
}

fn extract_string(map: &Mapping, key: &str) -> Option<String> {
    map.get(&YamlValue::String(key.to_string()))
        .and_then(|v| v.as_str().map(|s| s.to_string()))
}

fn extract_tags(map: &Mapping, key: &str) -> Vec<String> {
    let key_value = YamlValue::String(key.to_string());
    let value = match map.get(&key_value) {
        Some(val) => val,
        None => return Vec::new(),
    };

    let mut tags = Vec::new();
    match value {
        YamlValue::Sequence(seq) => {
            for item in seq {
                if let YamlValue::String(tag) = item {
                    if let Some(normalized) = normalize_tag(tag) {
                        tags.push(normalized);
                    }
                }
            }
        }
        YamlValue::String(text) => {
            let parts = text.split(|c: char| c == ',' || c.is_whitespace());
            for part in parts {
                if let Some(normalized) = normalize_tag(part) {
                    tags.push(normalized);
                }
            }
        }
        _ => {}
    }

    tags
}

fn set_tags(map: &mut Mapping, key: &str, tags: &[String]) {
    let normalized_tags: Vec<YamlValue> = tags
        .iter()
        .filter_map(|tag| normalize_tag(tag))
        .map(YamlValue::String)
        .collect();
    map.insert(
        YamlValue::String(key.to_string()),
        YamlValue::Sequence(normalized_tags),
    );
}

fn update_prompt_block(body: &str, new_content: &str) -> String {
    let mut lines: Vec<String> = body.lines().map(|l| l.to_string()).collect();
    let mut start = None;
    let mut end = None;
    let mut fence = "```";

    for (i, line) in lines.iter().enumerate() {
        let trimmed = line.trim_start();
        if trimmed.starts_with("```prompt") || trimmed.starts_with("~~~prompt") {
            start = Some(i);
            fence = if trimmed.starts_with("~~~") { "~~~" } else { "```" };
            break;
        }
    }

    if let Some(start_idx) = start {
        for i in (start_idx + 1)..lines.len() {
            if lines[i].trim_start().starts_with(fence) {
                end = Some(i);
                break;
            }
        }

        if let Some(end_idx) = end {
            let mut replacement: Vec<String> = Vec::new();
            if !new_content.is_empty() {
                replacement = new_content.lines().map(|l| l.to_string()).collect();
            }
            lines.splice((start_idx + 1)..end_idx, replacement);
            return lines.join("\n");
        }
    }

    let mut output = body.trim_end().to_string();
    if !output.is_empty() {
        output.push_str("\n\n");
    }
    output.push_str("```prompt\n");
    output.push_str(new_content);
    output.push_str("\n```\n");
    output
}

fn compute_file_hash(content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    format!("{:x}", hasher.finalize())
}

pub fn compute_file_hash_from_path(file_path: &Path) -> Result<String, VaultError> {
    let content = fs::read_to_string(file_path).map_err(|e| VaultError::IoError(e.to_string()))?;
    Ok(compute_file_hash(&content))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_code_block() {
        let markdown = r#"Some text

```prompt
This is the prompt content
with multiple lines
```

More text"#;

        let content = extract_code_block_content(markdown);
        assert_eq!(content, "This is the prompt content\nwith multiple lines");
    }
}
