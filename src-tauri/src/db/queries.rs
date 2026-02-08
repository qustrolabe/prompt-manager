/// SQL queries for the Prompt Manager database (cache layer)

// ============================================================================
// TABLE CREATION
// ============================================================================

pub const CREATE_PROMPTS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS prompts (
    id TEXT PRIMARY KEY NOT NULL,
    created TEXT,
    text TEXT NOT NULL,
    title TEXT,
    description TEXT,
    file_path TEXT,
    file_hash TEXT
)
"#;

pub const CREATE_TAGS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE
)
"#;

pub const CREATE_VIEWS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS views (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'custom',
    config TEXT NOT NULL,
    created TEXT NOT NULL
)
"#;

pub const CREATE_PROMPT_TAGS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS prompt_tags (
    prompt_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    PRIMARY KEY (prompt_id, tag_id),
    FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
)
"#;

// ============================================================================
// INDEXES
// ============================================================================

pub const CREATE_PROMPT_TAGS_INDEX: &str = r#"
CREATE INDEX IF NOT EXISTS idx_prompt_tags_prompt_id ON prompt_tags(prompt_id)
"#;

// ============================================================================
// PROMPTS QUERIES
// ============================================================================

pub const SELECT_ALL_PROMPTS: &str = r#"
SELECT id, created, text, title, description, file_path, file_hash
FROM prompts
ORDER BY created DESC
"#;

pub const SELECT_PROMPT_BY_ID: &str = r#"
SELECT id, created, text, title, description, file_path, file_hash
FROM prompts
WHERE id = ?
"#;

pub const UPSERT_PROMPT: &str = r#"
INSERT INTO prompts (id, created, text, title, description, file_path, file_hash)
VALUES (?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
    text = excluded.text,
    title = excluded.title,
    description = excluded.description,
    file_path = excluded.file_path,
    file_hash = excluded.file_hash
"#;

pub const DELETE_PROMPT: &str = "DELETE FROM prompts WHERE id = ?";

// ============================================================================
// TAGS QUERIES
// ============================================================================

pub const SELECT_ALL_TAGS: &str = "SELECT id, name FROM tags ORDER BY name";

pub const SELECT_TAG_BY_NAME: &str = "SELECT id, name FROM tags WHERE name = ?";

pub const INSERT_TAG: &str = "INSERT INTO tags (id, name) VALUES (?, ?)";

pub const SELECT_TAGS_FOR_PROMPT: &str = r#"
SELECT t.name
FROM tags t
INNER JOIN prompt_tags pt ON t.id = pt.tag_id
WHERE pt.prompt_id = ?
ORDER BY t.name
"#;

pub const DELETE_PROMPT_TAGS: &str = "DELETE FROM prompt_tags WHERE prompt_id = ?";

pub const INSERT_PROMPT_TAG: &str = r#"
INSERT INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)
ON CONFLICT DO NOTHING
"#;

// ============================================================================
// VIEWS QUERIES
// ============================================================================

pub const SELECT_ALL_VIEWS: &str = r#"
SELECT id, name, type, config, created
FROM views
ORDER BY created DESC
"#;

pub const SELECT_VIEW_BY_ID: &str = r#"
SELECT id, name, type, config, created
FROM views
WHERE id = ?
"#;

pub const UPSERT_VIEW: &str = r#"
INSERT INTO views (id, name, type, config, created)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    config = excluded.config
"#;

pub const DELETE_VIEW: &str = "DELETE FROM views WHERE id = ?";

// ============================================================================
// DEBUG QUERIES
// ============================================================================

pub const SELECT_TABLE_NAMES: &str = r#"
SELECT name FROM sqlite_master
WHERE type='table' AND name NOT LIKE 'sqlite_%'
ORDER BY name
"#;

pub const SELECT_TABLE_INFO: &str = "PRAGMA table_info(?)";

pub const DELETE_ALL_FROM_TABLE: &str = "DELETE FROM ?";
