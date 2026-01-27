use crate::db::{queries::*, DbPool};
use crate::models::{self, *};
use log::info;
use sqlx::Row;
use std::collections::HashMap;
use tauri::State;
use uuid::Uuid;

// ============================================================================
// PROMPTS
// ============================================================================

/// Get all prompts with their tags and template values
#[tauri::command]
#[specta::specta]
pub async fn get_prompts(
    db: State<'_, DbPool>,
    filter: Option<FilterConfig>,
    sort: Option<SortConfig>,
) -> Result<Vec<Prompt>, DbError> {
    info!("get_prompts called");

    // Fetch all prompts
    let prompt_rows = sqlx::query_as::<_, PromptRow>(SELECT_ALL_PROMPTS)
        .fetch_all(db.inner())
        .await?;

    // Build prompts with tags and template values
    let mut prompts = Vec::new();
    for row in prompt_rows {
        let tags = get_tags_for_prompt(db.inner(), &row.id).await?;
        let template_values = get_template_values(db.inner(), &row.id).await?;

        prompts.push(Prompt {
            id: row.id,
            created_at: row.created_at,
            title: row.title,
            text: row.text,
            description: row.description,
            mode: row.mode,
            tags,
            template_values: if template_values.is_empty() {
                None
            } else {
                Some(template_values)
            },
        });
    }

    // Apply filters in memory
    if let Some(filter) = filter {
        // Filter by tags (AND logic)
        if let Some(filter_tags) = &filter.tags {
            if !filter_tags.is_empty() {
                prompts.retain(|p| filter_tags.iter().all(|t| p.tags.contains(t)));
            }
        }

        // Filter by search
        if let Some(search) = &filter.search {
            if !search.is_empty() {
                let lower_search = search.to_lowercase();
                prompts.retain(|p| {
                    p.text.to_lowercase().contains(&lower_search)
                        || p.title
                            .as_ref()
                            .map(|t| t.to_lowercase().contains(&lower_search))
                            .unwrap_or(false)
                        || p.description
                            .as_ref()
                            .map(|d| d.to_lowercase().contains(&lower_search))
                            .unwrap_or(false)
                });
            }
        }
    }

    // Apply sort
    if let Some(sort) = sort {
        prompts.sort_by(|a, b| {
            let cmp = match sort.by.as_str() {
                "title" => {
                    let a_title = a.title.as_deref().unwrap_or("");
                    let b_title = b.title.as_deref().unwrap_or("");
                    a_title.cmp(b_title)
                }
                "created_at" | _ => a.created_at.cmp(&b.created_at),
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

/// Save a prompt (upsert)
#[tauri::command]
#[specta::specta]
pub async fn save_prompt(db: State<'_, DbPool>, prompt: PromptInput) -> Result<(), DbError> {
    info!("save_prompt called for id: {}", prompt.id);

    // Use a transaction for atomicity
    let mut tx = db.inner().begin().await?;

    // Upsert the prompt
    sqlx::query(UPSERT_PROMPT)
        .bind(&prompt.id)
        .bind(prompt.created_at)
        .bind(&prompt.title)
        .bind(&prompt.text)
        .bind(&prompt.description)
        .bind(&prompt.mode)
        .execute(&mut *tx)
        .await?;

    // Delete existing tags
    sqlx::query(DELETE_PROMPT_TAGS)
        .bind(&prompt.id)
        .execute(&mut *tx)
        .await?;

    // Insert new tags
    for tag_name in &prompt.tags {
        let tag_id = get_or_create_tag(&mut tx, tag_name).await?;
        sqlx::query(INSERT_PROMPT_TAG)
            .bind(&prompt.id)
            .bind(&tag_id)
            .execute(&mut *tx)
            .await?;
    }

    // Delete existing template values
    sqlx::query(DELETE_TEMPLATE_VALUES)
        .bind(&prompt.id)
        .execute(&mut *tx)
        .await?;

    // Insert new template values
    if let Some(template_values) = &prompt.template_values {
        for (keyword, value) in template_values {
            sqlx::query(INSERT_TEMPLATE_VALUE)
                .bind(&prompt.id)
                .bind(keyword)
                .bind(value)
                .execute(&mut *tx)
                .await?;
        }
    }

    tx.commit().await?;
    info!("save_prompt completed successfully");
    Ok(())
}

/// Delete a prompt
#[tauri::command]
#[specta::specta]
pub async fn delete_prompt(db: State<'_, DbPool>, id: String) -> Result<(), DbError> {
    info!("delete_prompt called for id: {}", id);

    sqlx::query(DELETE_PROMPT)
        .bind(&id)
        .execute(db.inner())
        .await?;

    Ok(())
}

/// Duplicate a prompt
#[tauri::command]
#[specta::specta]
pub async fn duplicate_prompt(
    db: State<'_, DbPool>,
    id: String,
) -> Result<Option<Prompt>, DbError> {
    info!("duplicate_prompt called for id: {}", id);

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
    let template_values = get_template_values(db.inner(), &row.id).await?;

    // Create new prompt with new ID
    let new_id = Uuid::new_v4().to_string();
    let new_created_at = chrono::Utc::now().timestamp_millis();
    let new_title = row.title.map(|t| format!("{} (Copy)", t));

    let new_prompt = PromptInput {
        id: new_id.clone(),
        created_at: Some(new_created_at),
        title: new_title.clone(),
        text: row.text.clone(),
        description: row.description.clone(),
        mode: row.mode.clone(),
        tags: tags.clone(),
        template_values: if template_values.is_empty() {
            None
        } else {
            Some(template_values.clone())
        },
    };

    // Save the new prompt using the existing function logic
    let mut tx = db.inner().begin().await?;

    sqlx::query(UPSERT_PROMPT)
        .bind(&new_prompt.id)
        .bind(new_prompt.created_at)
        .bind(&new_prompt.title)
        .bind(&new_prompt.text)
        .bind(&new_prompt.description)
        .bind(&new_prompt.mode)
        .execute(&mut *tx)
        .await?;

    for tag_name in &new_prompt.tags {
        let tag_id = get_or_create_tag(&mut tx, tag_name).await?;
        sqlx::query(INSERT_PROMPT_TAG)
            .bind(&new_prompt.id)
            .bind(&tag_id)
            .execute(&mut *tx)
            .await?;
    }

    if let Some(template_values) = &new_prompt.template_values {
        for (keyword, value) in template_values {
            sqlx::query(INSERT_TEMPLATE_VALUE)
                .bind(&new_prompt.id)
                .bind(keyword)
                .bind(value)
                .execute(&mut *tx)
                .await?;
        }
    }

    tx.commit().await?;

    Ok(Some(Prompt {
        id: new_id,
        created_at: Some(new_created_at),
        title: new_title,
        text: row.text,
        description: row.description,
        mode: row.mode,
        tags,
        template_values: if template_values.is_empty() {
            None
        } else {
            Some(template_values)
        },
    }))
}

// ============================================================================
// SNIPPETS
// ============================================================================

/// Get all snippets with their tags
#[tauri::command]
#[specta::specta]
pub async fn get_snippets(db: State<'_, DbPool>) -> Result<Vec<Snippet>, DbError> {
    info!("get_snippets called");

    let snippet_rows = sqlx::query_as::<_, SnippetRow>(SELECT_ALL_SNIPPETS)
        .fetch_all(db.inner())
        .await?;

    let mut snippets = Vec::new();
    for row in snippet_rows {
        let tags = get_tags_for_snippet(db.inner(), &row.id).await?;

        snippets.push(Snippet {
            id: row.id,
            created_at: row.created_at,
            value: row.value,
            description: row.description,
            tags,
        });
    }

    Ok(snippets)
}

/// Save a snippet (upsert)
#[tauri::command]
#[specta::specta]
pub async fn save_snippet(db: State<'_, DbPool>, snippet: SnippetInput) -> Result<(), DbError> {
    info!("save_snippet called for id: {}", snippet.id);

    let mut tx = db.inner().begin().await?;

    sqlx::query(UPSERT_SNIPPET)
        .bind(&snippet.id)
        .bind(snippet.created_at)
        .bind(&snippet.value)
        .bind(&snippet.description)
        .execute(&mut *tx)
        .await?;

    // Delete existing tags
    sqlx::query(DELETE_SNIPPET_TAGS)
        .bind(&snippet.id)
        .execute(&mut *tx)
        .await?;

    // Insert new tags
    for tag_name in &snippet.tags {
        let tag_id = get_or_create_tag(&mut tx, tag_name).await?;
        sqlx::query(INSERT_SNIPPET_TAG)
            .bind(&snippet.id)
            .bind(&tag_id)
            .execute(&mut *tx)
            .await?;
    }

    tx.commit().await?;
    info!("save_snippet completed successfully");
    Ok(())
}

/// Delete a snippet
#[tauri::command]
#[specta::specta]
pub async fn delete_snippet(db: State<'_, DbPool>, id: String) -> Result<(), DbError> {
    info!("delete_snippet called for id: {}", id);

    sqlx::query(DELETE_SNIPPET)
        .bind(&id)
        .execute(db.inner())
        .await?;

    Ok(())
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
            created_at: row.created_at,
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
                created_at: row.created_at,
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
        .bind(view.created_at)
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

async fn get_tags_for_snippet(
    pool: &sqlx::Pool<sqlx::Sqlite>,
    snippet_id: &str,
) -> Result<Vec<String>, DbError> {
    let rows = sqlx::query_as::<_, TagNameRow>(SELECT_TAGS_FOR_SNIPPET)
        .bind(snippet_id)
        .fetch_all(pool)
        .await?;

    Ok(rows.into_iter().map(|r| r.name).collect())
}

async fn get_template_values(
    pool: &sqlx::Pool<sqlx::Sqlite>,
    prompt_id: &str,
) -> Result<HashMap<String, String>, DbError> {
    let rows = sqlx::query_as::<_, TemplateValueRow>(SELECT_TEMPLATE_VALUES_FOR_PROMPT)
        .bind(prompt_id)
        .fetch_all(pool)
        .await?;

    Ok(rows.into_iter().map(|r| (r.keyword, r.value)).collect())
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
