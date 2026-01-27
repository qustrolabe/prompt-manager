/// SQL queries for the Prompt Manager database

// ============================================================================
// TABLE CREATION
// ============================================================================

pub const CREATE_PROMPTS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS prompts (
    id TEXT PRIMARY KEY NOT NULL,
    created_at INTEGER,
    title TEXT,
    text TEXT NOT NULL,
    description TEXT,
    mode TEXT NOT NULL DEFAULT 'raw'
)
"#;

pub const CREATE_SNIPPETS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS snippets (
    id TEXT PRIMARY KEY NOT NULL,
    created_at INTEGER,
    value TEXT NOT NULL,
    description TEXT
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
    created_at INTEGER NOT NULL
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

pub const CREATE_SNIPPET_TAGS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS snippet_tags (
    snippet_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    PRIMARY KEY (snippet_id, tag_id),
    FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
)
"#;

pub const CREATE_PROMPT_TEMPLATE_VALUES_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS prompt_template_values (
    prompt_id TEXT NOT NULL,
    keyword TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (prompt_id, keyword),
    FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE
)
"#;

// ============================================================================
// INDEXES
// ============================================================================

pub const CREATE_PROMPT_TAGS_INDEX: &str = r#"
CREATE INDEX IF NOT EXISTS idx_prompt_tags_prompt_id ON prompt_tags(prompt_id)
"#;

pub const CREATE_SNIPPET_TAGS_INDEX: &str = r#"
CREATE INDEX IF NOT EXISTS idx_snippet_tags_snippet_id ON snippet_tags(snippet_id)
"#;

pub const CREATE_TEMPLATE_VALUES_INDEX: &str = r#"
CREATE INDEX IF NOT EXISTS idx_template_values_prompt_id ON prompt_template_values(prompt_id)
"#;

// ============================================================================
// PROMPTS QUERIES
// ============================================================================

pub const SELECT_ALL_PROMPTS: &str = r#"
SELECT id, created_at, title, text, description, mode
FROM prompts
ORDER BY created_at DESC
"#;

pub const SELECT_PROMPT_BY_ID: &str = r#"
SELECT id, created_at, title, text, description, mode
FROM prompts
WHERE id = ?
"#;

pub const UPSERT_PROMPT: &str = r#"
INSERT INTO prompts (id, created_at, title, text, description, mode)
VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
    title = excluded.title,
    text = excluded.text,
    description = excluded.description,
    mode = excluded.mode
"#;

pub const DELETE_PROMPT: &str = "DELETE FROM prompts WHERE id = ?";

// ============================================================================
// SNIPPETS QUERIES
// ============================================================================

pub const SELECT_ALL_SNIPPETS: &str = r#"
SELECT id, created_at, value, description
FROM snippets
ORDER BY created_at DESC
"#;

pub const SELECT_SNIPPET_BY_ID: &str = r#"
SELECT id, created_at, value, description
FROM snippets
WHERE id = ?
"#;

pub const UPSERT_SNIPPET: &str = r#"
INSERT INTO snippets (id, created_at, value, description)
VALUES (?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
    value = excluded.value,
    description = excluded.description
"#;

pub const DELETE_SNIPPET: &str = "DELETE FROM snippets WHERE id = ?";

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

pub const SELECT_TAGS_FOR_SNIPPET: &str = r#"
SELECT t.name
FROM tags t
INNER JOIN snippet_tags st ON t.id = st.tag_id
WHERE st.snippet_id = ?
ORDER BY t.name
"#;

pub const DELETE_PROMPT_TAGS: &str = "DELETE FROM prompt_tags WHERE prompt_id = ?";

pub const INSERT_PROMPT_TAG: &str = r#"
INSERT INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)
ON CONFLICT DO NOTHING
"#;

pub const DELETE_SNIPPET_TAGS: &str = "DELETE FROM snippet_tags WHERE snippet_id = ?";

pub const INSERT_SNIPPET_TAG: &str = r#"
INSERT INTO snippet_tags (snippet_id, tag_id) VALUES (?, ?)
ON CONFLICT DO NOTHING
"#;

// ============================================================================
// TEMPLATE VALUES QUERIES
// ============================================================================

pub const SELECT_TEMPLATE_VALUES_FOR_PROMPT: &str = r#"
SELECT keyword, value
FROM prompt_template_values
WHERE prompt_id = ?
"#;

pub const DELETE_TEMPLATE_VALUES: &str = "DELETE FROM prompt_template_values WHERE prompt_id = ?";

pub const INSERT_TEMPLATE_VALUE: &str = r#"
INSERT INTO prompt_template_values (prompt_id, keyword, value)
VALUES (?, ?, ?)
"#;

// ============================================================================
// VIEWS QUERIES
// ============================================================================

pub const SELECT_ALL_VIEWS: &str = r#"
SELECT id, name, type, config, created_at
FROM views
ORDER BY created_at DESC
"#;

pub const SELECT_VIEW_BY_ID: &str = r#"
SELECT id, name, type, config, created_at
FROM views
WHERE id = ?
"#;

pub const UPSERT_VIEW: &str = r#"
INSERT INTO views (id, name, type, config, created_at)
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
