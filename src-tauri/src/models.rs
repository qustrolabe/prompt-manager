use serde::{Deserialize, Serialize};
use specta::Type;
use sqlx::FromRow;
use std::collections::HashMap;

// ============================================================================
// DATABASE ROW TYPES (for SQLx FromRow)
// ============================================================================

/// Prompt row from database (cache)
#[derive(Debug, Clone, FromRow)]
pub struct PromptRow {
    pub id: String,
    pub created: Option<String>,
    pub text: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub file_path: Option<String>,
    pub file_hash: Option<String>,
}

/// Tag row from database
#[derive(Debug, Clone, FromRow)]
pub struct TagRow {
    pub id: String,
    pub name: String,
}

/// View row from database
#[derive(Debug, Clone, FromRow)]
pub struct ViewRow {
    pub id: String,
    pub name: String,
    #[sqlx(rename = "type")]
    pub view_type: String,
    pub config: String, // JSON string
    pub created: String,
}

/// Tag name row (for simple queries)
#[derive(Debug, Clone, FromRow)]
pub struct TagNameRow {
    pub name: String,
}

// ============================================================================
// API TYPES (for Tauri commands with Specta)
// ============================================================================

/// Prompt with tags - returned to frontend (legacy, for cache-based queries)
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Prompt {
    pub id: String,
    pub created: Option<String>,
    pub text: String,
    pub tags: Vec<String>,
    pub file_path: Option<String>,
    pub title: Option<String>,
    pub description: Option<String>,
}

/// Input for saving a prompt (legacy, for cache-based operations)
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PromptInput {
    pub id: String,
    pub created: Option<String>,
    pub text: String,
    pub tags: Vec<String>,
    pub file_path: Option<String>,
    pub previous_file_path: Option<String>,
    pub title: Option<String>,
    pub description: Option<String>,
}

/// View configuration for filtering and sorting
#[derive(Debug, Clone, Serialize, Deserialize, Type, Default)]
#[serde(rename_all = "camelCase")]
pub struct ViewConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub filter: Option<FilterConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sort: Option<SortConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type, Default)]
#[serde(rename_all = "camelCase")]
pub struct FilterConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub search: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub favorite: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SortConfig {
    pub by: String,    // "created" | "title" | "usage_count"
    pub order: String, // "asc" | "desc"
}

/// View - returned to frontend
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct View {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub view_type: String, // "system" | "custom"
    pub config: ViewConfig,
    pub created: String,
}

/// Input for saving a view
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ViewInput {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub view_type: String,
    pub config: ViewConfig,
    pub created: String,
}

// ============================================================================
// ERROR TYPE
// ============================================================================

#[derive(Debug, Clone, Serialize, Type, thiserror::Error)]
pub enum DbError {
    #[error("Database error: {0}")]
    Database(String),
    #[error("Not found: {0}")]
    NotFound(String),
    #[error("Serialization error: {0}")]
    Serialization(String),
}

impl From<sqlx::Error> for DbError {
    fn from(e: sqlx::Error) -> Self {
        DbError::Database(e.to_string())
    }
}

impl From<serde_json::Error> for DbError {
    fn from(e: serde_json::Error) -> Self {
        DbError::Serialization(e.to_string())
    }
}

// ============================================================================
// DEBUG TYPES
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, Type, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct TableColumn {
    pub cid: i32,
    pub name: String,
    #[serde(rename = "type")]
    #[sqlx(rename = "type")]
    pub type_: String,
    pub notnull: i32,
    #[serde(default)]
    pub dflt_value: Option<String>,
    pub pk: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct TableRow {
    #[serde(flatten)]
    pub data: HashMap<String, String>,
}

impl TableRow {
    pub fn new(data: HashMap<String, String>) -> Self {
        Self { data }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ExportedTable {
    pub schema: Vec<TableColumn>,
    pub rows: Vec<TableRow>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ExportedDatabase {
    pub tables: HashMap<String, ExportedTable>,
}
