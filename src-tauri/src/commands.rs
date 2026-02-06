use crate::config::{self, AppConfig, ConfigError};
use crate::db::{queries::*, DbPool};
use crate::models::{self, *};
use crate::vault::{self, PromptFile, VaultError};
use crate::vault_watcher::{self, VaultWatcherState};
use log::info;
use specta::Type;
use sqlx::Row;
use std::collections::HashMap;
use std::collections::HashSet;
use std::path::Path;
use tauri::{AppHandle, State};
use uuid::Uuid;

#[derive(Debug, Clone, serde::Serialize, Type)]
pub struct SyncStats {
    pub found: usize,
    pub updated: usize,
    pub deleted: usize,
}

// ============================================================================
// PROMPTS (Cache Layer)
// ============================================================================

/// Get all prompts with their tags from cache
#[tauri::command]
#[specta::specta]
pub async fn get_prompts(
    db: State<'_, DbPool>,
    filter: Option<FilterConfig>,
    sort: Option<SortConfig>,
) -> Result<Vec<Prompt>, DbError> {
    info!("get_prompts called");

    // Auto-sync behavior?
    // For now, let's assume specific sync call is made, or we can trigger it here lazily if config allows.
    // Given the request "reads from DB (cache)", we just read. Sync is explicit.

    // Fetch all prompts from cache
    let prompt_rows = sqlx::query_as::<_, PromptRow>(SELECT_ALL_PROMPTS)
        .fetch_all(db.inner())
        .await?;

    // Build prompts with tags
    let mut prompts = Vec::new();
    for row in prompt_rows {
        let tags = get_tags_for_prompt(db.inner(), &row.id).await?;

        prompts.push(Prompt {
            id: row.id,
            created: row.created,
            text: row.text,
            tags,
            file_path: row.file_path,
            title: row.title,
        });
    }

    // Apply filters in memory
    if let Some(filter) = filter {
        // Filter by tags (AND logic + negative tags)
        if let Some(filter_tags) = &filter.tags {
            if !filter_tags.is_empty() {
                let mut positive_tags: Vec<String> = Vec::new();
                let mut negative_tags: Vec<String> = Vec::new();

                for tag in filter_tags {
                    let trimmed = tag.trim();
                    if trimmed.is_empty() {
                        continue;
                    }
                    if let Some(stripped) = trimmed.strip_prefix('-') {
                        let raw = stripped.trim();
                        if !raw.is_empty() {
                            negative_tags.push(raw.to_string());
                        }
                    } else {
                        positive_tags.push(trimmed.to_string());
                    }
                }

                if !positive_tags.is_empty() || !negative_tags.is_empty() {
                    prompts.retain(|p| {
                        let has_all_positive =
                            positive_tags.iter().all(|t| p.tags.contains(t));
                        let has_no_negative =
                            negative_tags.iter().all(|t| !p.tags.contains(t));
                        has_all_positive && has_no_negative
                    });
                }
            }
        }

        // Filter by search
        if let Some(search) = &filter.search {
            if !search.is_empty() {
                let lower_search = search.to_lowercase();
                prompts.retain(|p| p.text.to_lowercase().contains(&lower_search));
            }
        }
    }

    // Apply sort
    if let Some(sort) = sort {
        prompts.sort_by(|a, b| {
            let cmp = match sort.by.as_str() {
                "created" | _ => a.created.cmp(&b.created),
            };

            if sort.order == "desc" {
                cmp.reverse()
            } else {
                cmp
            }
        });
    }

    Ok(prompts)
}

/// Save a prompt to cache (upsert)
/// STRICT VAULT-FIRST:
/// 1. Check if vault is configured
/// 2. Write to filesystem (Master)
/// 3. Update database (Cache)
#[tauri::command]
#[specta::specta]
pub async fn save_prompt(
    app: AppHandle,
    db: State<'_, DbPool>,
    prompt: PromptInput,
) -> Result<(), DbError> {
    info!("save_prompt called for id: {}", prompt.id);

    // 1. Load config to check vault path
    let config = config::load_config(&app)
        .map_err(|e| DbError::Database(format!("Failed to load config: {}", e)))?; // reusing DbError for now or should genericize

    let vault_path_str = config
        .vault_path
        .ok_or_else(|| DbError::Database("Vault path not configured".to_string()))?;

    let vault_path = Path::new(&vault_path_str);

    // 2. Prepare PromptFile for vault write
    let file_path_raw = match prompt.file_path.clone() {
        Some(path) if !path.trim().is_empty() => path,
        _ => vault::generate_unique_file_path(vault_path)
            .map_err(|e| DbError::Database(format!("Failed to generate filename: {}", e)))?,
    };
    let file_path = vault::normalize_relative_path(&file_path_raw)
        .map_err(|e| DbError::Database(format!("Invalid file path: {}", e)))?;

    let previous_file_path = prompt
        .previous_file_path
        .clone()
        .filter(|p| !p.trim().is_empty())
        .map(|p| vault::normalize_relative_path(&p))
        .transpose()
        .map_err(|e| DbError::Database(format!("Invalid previous path: {}", e)))?;

    if let Some(prev_path) = &previous_file_path {
        if prev_path != &file_path {
            let target_path = vault_path.join(&file_path);
            if target_path.exists() {
                return Err(DbError::Database(format!(
                    "File name already exists: {}",
                    file_path
                )));
            }
        }
    } else if vault_path.join(&file_path).exists() {
        return Err(DbError::Database(format!(
            "File name already exists: {}",
            file_path
        )));
    }

    let prompt_file = vault::PromptFile {
        id: file_path.clone(),
        // We calculate relative path just for completeness, but write_prompt_file uses ID for filename
        file_path: file_path.clone(),
        tags: prompt.tags.clone(),
        created: prompt.created.clone(),
        content: prompt.text.clone(),
        file_hash: None,
        title: prompt.title.clone(),
    };

    // 3. Write to Filesystem
    vault::write_prompt_file(vault_path, &prompt_file, &config.frontmatter)
        .map_err(|e| DbError::Database(format!("Failed to write to vault: {}", e)))?;

    // 4. Update Database (Cache)
    // Use a transaction for atomicity
    let mut tx = db.inner().begin().await?;

    // Remove old prompt row if file was renamed
    if let Some(ref prev_path) = previous_file_path {
        if prev_path != &file_path {
            sqlx::query(DELETE_PROMPT)
                .bind(prev_path)
                .execute(&mut *tx)
                .await?;
        }
    }

    let file_hash = vault::compute_file_hash_from_path(&vault_path.join(&file_path))
        .ok();

    // Upsert the prompt
    sqlx::query(UPSERT_PROMPT)
        .bind(&file_path)
        .bind(prompt.created)
        .bind(&prompt.text)
        .bind(prompt.title.clone())
        .bind(Some(file_path.clone())) // Store the relative path
        .bind(file_hash) // file_hash placeholder
        .execute(&mut *tx)
        .await?;

    // Delete existing tags
    sqlx::query(DELETE_PROMPT_TAGS)
        .bind(&file_path)
        .execute(&mut *tx)
        .await?;

    // Insert new tags
    for tag_name in &prompt.tags {
        let tag_id = get_or_create_tag(&mut tx, tag_name).await?;
        sqlx::query(INSERT_PROMPT_TAG)
            .bind(&file_path)
            .bind(&tag_id)
            .execute(&mut *tx)
            .await?;
    }

    tx.commit().await?;
    if let Some(prev_path) = previous_file_path {
        if prev_path != file_path {
            let _ = vault::delete_prompt_file(vault_path, &prev_path);
        }
    }

    info!("save_prompt completed successfully (Vault and DB updated)");
    Ok(())
}

/// Delete a prompt from cache
/// STRICT VAULT-FIRST:
/// 1. Check if vault is configured
/// 2. Delete from filesystem (Master)
/// 3. Delete from database (Cache)
#[tauri::command]
#[specta::specta]
pub async fn delete_prompt(
    app: AppHandle,
    db: State<'_, DbPool>,
    id: String,
) -> Result<(), DbError> {
    info!("delete_prompt called for id: {}", id);

    // 1. Load config
    let config = config::load_config(&app)
        .map_err(|e| DbError::Database(format!("Failed to load config: {}", e)))?;

    let vault_path_str = config
        .vault_path
        .ok_or_else(|| DbError::Database("Vault path not configured".to_string()))?;

    // 2. Delete from Filesystem
    // We try to delete, but if file is already gone, we proceed to ensure DB is clean
    let row = sqlx::query_as::<_, PromptRow>(SELECT_PROMPT_BY_ID)
        .bind(&id)
        .fetch_optional(db.inner())
        .await?;
    let file_path = row.as_ref().and_then(|r| r.file_path.clone());

    if let Err(e) = vault::delete_prompt_file(
        Path::new(&vault_path_str),
        file_path.as_deref().unwrap_or(&id),
    ) {
        match e {
            VaultError::PathNotFound(_) => {
                info!(
                    "File for prompt {} not found in vault, proceeding to delete from DB",
                    id
                );
            }
            _ => {
                return Err(DbError::Database(format!(
                    "Failed to delete from vault: {}",
                    e
                )))
            }
        }
    }

    // 3. Delete from Database (Cache)
    sqlx::query(DELETE_PROMPT)
        .bind(&id)
        .execute(db.inner())
        .await?;

    Ok(())
}

/// Duplicate a prompt
/// STRICT VAULT-FIRST:
/// 1. Check if vault is configured
/// 2. Write new file to filesystem (Master)
/// 3. Update database (Cache)
#[tauri::command]
#[specta::specta]
pub async fn duplicate_prompt(
    app: AppHandle,
    db: State<'_, DbPool>,
    id: String,
) -> Result<Option<Prompt>, DbError> {
    info!("duplicate_prompt called for id: {}", id);

    // 0. Load Config
    let config = config::load_config(&app)
        .map_err(|e| DbError::Database(format!("Failed to load config: {}", e)))?;

    let vault_path_str = config
        .vault_path
        .ok_or_else(|| DbError::Database("Vault path not configured".to_string()))?;
    let vault_path = Path::new(&vault_path_str);

    // Get the original prompt
    let row = sqlx::query_as::<_, PromptRow>(SELECT_PROMPT_BY_ID)
        .bind(&id)
        .fetch_optional(db.inner())
        .await?;

    let row = match row {
        Some(r) => r,
        None => return Ok(None),
    };

    let tags = get_tags_for_prompt(db.inner(), &row.id).await?;

    let new_created = chrono::Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();

    let file_path = vault::generate_unique_file_path(vault_path)
        .map_err(|e| DbError::Database(format!("Failed to generate filename: {}", e)))?;

    let new_prompt = PromptInput {
        id: file_path.clone(),
        created: Some(new_created.clone()),
        text: row.text.clone(),
        tags: tags.clone(),
        file_path: None, // New file will be created
        previous_file_path: None,
        title: row.title.clone(),
    };

    // 1. Prepare PromptFile for vault write
    let prompt_file = vault::PromptFile {
        id: file_path.clone(),
        file_path: file_path.clone(),
        tags: new_prompt.tags.clone(),
        created: new_prompt.created.clone(),
        content: new_prompt.text.clone(),
        file_hash: None,
        title: new_prompt.title.clone(),
    };

    // 2. Write to Filesystem
    vault::write_prompt_file(vault_path, &prompt_file, &config.frontmatter)
        .map_err(|e| DbError::Database(format!("Failed to write to vault: {}", e)))?;

    // 3. Save the new prompt using the existing function logic (upsert to DB)
    let mut tx = db.inner().begin().await?;

    sqlx::query(UPSERT_PROMPT)
        .bind(&file_path)
        .bind(new_prompt.created)
        .bind(&new_prompt.text)
        .bind(new_prompt.title.clone())
        .bind(Some(file_path.clone()))
        .bind::<Option<String>>(None)
        .execute(&mut *tx)
        .await?;

    for tag_name in &new_prompt.tags {
        let tag_id = get_or_create_tag(&mut tx, tag_name).await?;
        sqlx::query(INSERT_PROMPT_TAG)
            .bind(&file_path)
            .bind(&tag_id)
            .execute(&mut *tx)
            .await?;
    }

    tx.commit().await?;

    Ok(Some(Prompt {
        id: file_path.clone(),
        created: Some(new_created),
        text: row.text,
        tags,
        file_path: Some(file_path),
        title: row.title,
    }))
}

// ============================================================================
// VIEWS
// ============================================================================

/// Get all views
#[tauri::command]
#[specta::specta]
pub async fn get_views(db: State<'_, DbPool>) -> Result<Vec<View>, DbError> {
    info!("get_views called");

    let rows = sqlx::query_as::<_, ViewRow>(SELECT_ALL_VIEWS)
        .fetch_all(db.inner())
        .await?;

    let mut views = Vec::new();
    for row in rows {
        let config: ViewConfig = serde_json::from_str(&row.config)?;
        views.push(View {
            id: row.id,
            name: row.name,
            view_type: row.view_type,
            config,
            created: row.created,
        });
    }

    Ok(views)
}

/// Get a view by ID
#[tauri::command]
#[specta::specta]
pub async fn get_view_by_id(db: State<'_, DbPool>, id: String) -> Result<Option<View>, DbError> {
    info!("get_view_by_id called for id: {}", id);

    let row = sqlx::query_as::<_, ViewRow>(SELECT_VIEW_BY_ID)
        .bind(&id)
        .fetch_optional(db.inner())
        .await?;

    match row {
        Some(row) => {
            let config: ViewConfig = serde_json::from_str(&row.config)?;
            Ok(Some(View {
                id: row.id,
                name: row.name,
                view_type: row.view_type,
                config,
                created: row.created,
            }))
        }
        None => Ok(None),
    }
}

/// Save a view (upsert)
#[tauri::command]
#[specta::specta]
pub async fn save_view(db: State<'_, DbPool>, view: ViewInput) -> Result<(), DbError> {
    info!("save_view called for id: {}", view.id);

    let config_json = serde_json::to_string(&view.config)?;

    sqlx::query(UPSERT_VIEW)
        .bind(&view.id)
        .bind(&view.name)
        .bind(&view.view_type)
        .bind(&config_json)
        .bind(view.created)
        .execute(db.inner())
        .await?;

    Ok(())
}

/// Delete a view
#[tauri::command]
#[specta::specta]
pub async fn delete_view(db: State<'_, DbPool>, id: String) -> Result<(), DbError> {
    info!("delete_view called for id: {}", id);

    sqlx::query(DELETE_VIEW)
        .bind(&id)
        .execute(db.inner())
        .await?;

    Ok(())
}

// ============================================================================
// TAGS
// ============================================================================

/// Get all tag names
#[tauri::command]
#[specta::specta]
pub async fn get_all_tags(db: State<'_, DbPool>) -> Result<Vec<String>, DbError> {
    info!("get_all_tags called");

    let rows = sqlx::query_as::<_, TagRow>(SELECT_ALL_TAGS)
        .fetch_all(db.inner())
        .await?;

    Ok(rows.into_iter().map(|r| r.name).collect())
}

// ============================================================================
// DEBUG
// ============================================================================

/// Get all table names (for debugging)
#[tauri::command]
#[specta::specta]
pub async fn get_table_names(db: State<'_, DbPool>) -> Result<Vec<String>, DbError> {
    info!("get_table_names called");

    let rows = sqlx::query(SELECT_TABLE_NAMES)
        .fetch_all(db.inner())
        .await?;

    Ok(rows.iter().map(|r| r.get::<String, _>("name")).collect())
}

/// Get table schema information
#[tauri::command]
#[specta::specta]
pub async fn get_table_info(
    db: State<'_, DbPool>,
    table_name: String,
) -> Result<Vec<models::TableColumn>, DbError> {
    info!("get_table_info called for table: {}", table_name);

    let query = format!("PRAGMA table_info({})", sanitize_identifier(&table_name));
    let rows = sqlx::query_as::<_, models::TableColumn>(&query)
        .fetch_all(db.inner())
        .await?;

    Ok(rows)
}

/// Get all rows from a table (for debugging)
#[tauri::command]
#[specta::specta]
pub async fn get_table_rows(
    db: State<'_, DbPool>,
    table_name: String,
) -> Result<Vec<models::TableRow>, DbError> {
    info!("get_table_rows called for table: {}", table_name);

    let query = format!("SELECT * FROM {}", sanitize_identifier(&table_name));

    let rows = sqlx::query(&query).fetch_all(db.inner()).await?;

    let columns_query = format!("PRAGMA table_info({})", sanitize_identifier(&table_name));
    let column_rows = sqlx::query(&columns_query).fetch_all(db.inner()).await?;

    // Extract column names
    let col_names: Vec<String> = column_rows.iter().map(|r| r.get("name")).collect();

    let mut results = Vec::new();
    for row in rows {
        let mut map = HashMap::new();

        for col_name in &col_names {
            let value = extract_column_value(&row, col_name);
            map.insert(col_name.clone(), value);
        }

        results.push(models::TableRow::new(map));
    }

    Ok(results)
}

/// Clear all rows from a table (for debugging)
#[tauri::command]
#[specta::specta]
pub async fn clear_table(db: State<'_, DbPool>, table_name: String) -> Result<(), DbError> {
    info!("clear_table called for table: {}", table_name);

    let query = format!("DELETE FROM {}", sanitize_identifier(&table_name));
    sqlx::query(&query).execute(db.inner()).await?;

    Ok(())
}

/// Export entire database as JSON (for debugging)
#[tauri::command]
#[specta::specta]
pub async fn export_database_as_json(
    db: State<'_, DbPool>,
) -> Result<models::ExportedDatabase, DbError> {
    info!("export_database_as_json called");

    let table_names = get_table_names(State::clone(&db)).await?;

    let mut tables = HashMap::new();

    for table_name in table_names {
        let schema = get_table_info(State::clone(&db), table_name.clone()).await?;
        let rows = get_table_rows(State::clone(&db), table_name.clone()).await?;

        tables.insert(table_name.clone(), models::ExportedTable { schema, rows });
    }

    Ok(models::ExportedDatabase { tables })
}

/// Get the database file path
#[tauri::command]
#[specta::specta]
pub async fn get_database_path(db: State<'_, DbPool>) -> Result<String, DbError> {
    info!("get_database_path called");

    let path = sqlx::query("PRAGMA database_list")
        .fetch_one(db.inner())
        .await?;

    let db_path: String = path.try_get("file")?;

    Ok(db_path)
}

// ============================================================================
// CONFIG COMMANDS
// ============================================================================

/// Get application configuration
#[tauri::command]
#[specta::specta]
pub fn get_config(app: AppHandle) -> Result<AppConfig, ConfigError> {
    info!("get_config called");
    config::load_config(&app)
}

/// Save application configuration
#[tauri::command]
#[specta::specta]
pub fn save_config(app: AppHandle, config: AppConfig) -> Result<(), ConfigError> {
    info!("save_config called");
    config::save_config(&app, &config)
}

// ============================================================================
// VAULT COMMANDS
// ============================================================================

/// Scan vault and return all prompt files
#[tauri::command]
#[specta::specta]
pub fn scan_vault(app: AppHandle) -> Result<Vec<PromptFile>, VaultError> {
    info!("scan_vault called");

    let config = config::load_config(&app).map_err(|e| VaultError::IoError(e.to_string()))?;

    let vault_path = config.vault_path.ok_or(VaultError::NotConfigured)?;

    vault::scan_vault(Path::new(&vault_path), &config.frontmatter)
}

/// Sync vault files to database cache
/// STRICT VAULT-FIRST:
/// 1. Scan filesystem
/// 2. Upsert all found files to DB
/// 3. Remove DB entries that are not in the scan
#[tauri::command]
#[specta::specta]
pub async fn sync_vault(app: AppHandle, db: State<'_, DbPool>) -> Result<SyncStats, DbError> {
    info!("sync_vault called");

    let config = config::load_config(&app)
        .map_err(|e| DbError::Database(format!("Failed to load config: {}", e)))?;

    let vault_path_str = config
        .vault_path
        .ok_or_else(|| DbError::Database("Vault path not configured".to_string()))?;

    let vault_path = Path::new(&vault_path_str);

    // 1. Scan Vault
    let files = vault::scan_vault(vault_path, &config.frontmatter)
        .map_err(|e| DbError::Database(format!("Failed to scan vault: {}", e)))?;

    let mut tx = db.inner().begin().await?;
    let mut found_ids = HashSet::new();
    let found_count = files.len();

    // 2. Upsert all files
    for file in files {
        found_ids.insert(file.file_path.clone());

        // Upsert prompt
        sqlx::query(UPSERT_PROMPT)
            .bind(&file.file_path)
            .bind(file.created)
            .bind(&file.content)
            .bind(file.title.clone())
            .bind(Some(&file.file_path))
            .bind(file.file_hash.clone())
            .execute(&mut *tx)
            .await?;

        // Replace tags
        sqlx::query(DELETE_PROMPT_TAGS)
            .bind(&file.file_path)
            .execute(&mut *tx)
            .await?;

        for tag_name in &file.tags {
            let tag_id = get_or_create_tag(&mut tx, tag_name).await?;
            sqlx::query(INSERT_PROMPT_TAG)
                .bind(&file.file_path)
                .bind(&tag_id)
                .execute(&mut *tx)
                .await?;
        }
    }

    // 3. Prune DB entries not in Vault
    let all_db_rows = sqlx::query("SELECT id FROM prompts")
        .fetch_all(&mut *tx)
        .await?;

    let mut deleted_count = 0;
    for row in all_db_rows {
        let id: String = row.get("id");
        if !found_ids.contains(&id) {
            // Delete
            sqlx::query(DELETE_PROMPT)
                .bind(&id)
                .execute(&mut *tx)
                .await?;
            deleted_count += 1;
        }
    }

    tx.commit().await?;

    info!(
        "sync_vault completed. Found: {}, Deleted: {}",
        found_count, deleted_count
    );

    Ok(SyncStats {
        found: found_count,
        updated: found_count, // Effectively all found are "updated" via upsert
        deleted: deleted_count,
    })
}

/// Read a single prompt file by ID
#[tauri::command]
#[specta::specta]
pub fn read_prompt_file(app: AppHandle, id: String) -> Result<PromptFile, VaultError> {
    info!("read_prompt_file called for id: {}", id);

    let config = config::load_config(&app).map_err(|e| VaultError::IoError(e.to_string()))?;

    let vault_path = config.vault_path.ok_or(VaultError::NotConfigured)?;

    vault::find_prompt_by_id(Path::new(&vault_path), &id, &config.frontmatter)
}

/// Write a prompt file
#[tauri::command]
#[specta::specta]
pub fn write_prompt_file(app: AppHandle, prompt: PromptFile) -> Result<(), VaultError> {
    info!("write_prompt_file called for id: {}", prompt.id);

    let config = config::load_config(&app).map_err(|e| VaultError::IoError(e.to_string()))?;

    let vault_path = config.vault_path.ok_or(VaultError::NotConfigured)?;

    vault::write_prompt_file(Path::new(&vault_path), &prompt, &config.frontmatter)
}

/// Delete a prompt file
#[tauri::command]
#[specta::specta]
pub fn delete_prompt_file(app: AppHandle, id: String) -> Result<(), VaultError> {
    info!("delete_prompt_file called for id: {}", id);

    let config = config::load_config(&app).map_err(|e| VaultError::IoError(e.to_string()))?;

    let vault_path = config.vault_path.ok_or(VaultError::NotConfigured)?;

    vault::delete_prompt_file(Path::new(&vault_path), &id)
}

/// Start watching the vault for external changes
#[tauri::command]
#[specta::specta]
pub fn start_vault_watch(app: AppHandle, state: State<'_, VaultWatcherState>) -> Result<(), VaultError> {
    info!("start_vault_watch called");

    let config = config::load_config(&app).map_err(|e| VaultError::IoError(e.to_string()))?;
    let vault_path = config.vault_path.ok_or(VaultError::NotConfigured)?;
    if !Path::new(&vault_path).exists() {
        return Err(VaultError::PathNotFound(vault_path));
    }

    vault_watcher::start_vault_watch(app, &state, vault_path)
        .map_err(|e| VaultError::IoError(e))?;
    Ok(())
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async fn get_tags_for_prompt(
    pool: &sqlx::Pool<sqlx::Sqlite>,
    prompt_id: &str,
) -> Result<Vec<String>, DbError> {
    let rows = sqlx::query_as::<_, TagNameRow>(SELECT_TAGS_FOR_PROMPT)
        .bind(prompt_id)
        .fetch_all(pool)
        .await?;

    Ok(rows.into_iter().map(|r| r.name).collect())
}

async fn get_or_create_tag<'c>(
    tx: &mut sqlx::Transaction<'c, sqlx::Sqlite>,
    tag_name: &str,
) -> Result<String, DbError> {
    // Try to find existing tag
    let existing = sqlx::query_as::<_, TagRow>(SELECT_TAG_BY_NAME)
        .bind(tag_name)
        .fetch_optional(&mut **tx)
        .await?;

    if let Some(tag) = existing {
        return Ok(tag.id);
    }

    // Create new tag
    let id = Uuid::new_v4().to_string();
    sqlx::query(INSERT_TAG)
        .bind(&id)
        .bind(tag_name)
        .execute(&mut **tx)
        .await?;

    Ok(id)
}

// ============================================================================
// DEBUG HELPER FUNCTIONS
// ============================================================================

fn sanitize_identifier(name: &str) -> String {
    let escaped = name.replace('"', "\"\"");
    format!("\"{}\"", escaped)
}

fn extract_column_value(row: &sqlx::sqlite::SqliteRow, col_name: &str) -> String {
    if let Ok(value) = row.try_get::<Option<i64>, _>(col_name) {
        return match value {
            Some(v) => v.to_string(),
            None => String::from("NULL"),
        };
    }

    if let Ok(value) = row.try_get::<Option<f64>, _>(col_name) {
        return match value {
            Some(v) => v.to_string(),
            None => String::from("NULL"),
        };
    }

    if let Ok(value) = row.try_get::<Option<String>, _>(col_name) {
        return match value {
            Some(v) => v,
            None => String::from("NULL"),
        };
    }

    String::from("NULL")
}
