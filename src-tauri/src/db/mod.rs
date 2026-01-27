use log::info;
use sqlx::{Pool, Sqlite, SqlitePool};
use std::path::PathBuf;
use tauri::Manager;

pub mod queries;
use queries::*;

pub type DbPool = Pool<Sqlite>;

/// Get the database path in the app data directory
fn get_db_path(app_handle: &tauri::AppHandle) -> PathBuf {
    let path = app_handle
        .path()
        .app_data_dir()
        .expect("failed to get app data dir")
        .join("prompt-manager.db");

    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    path
}

/// Initialize the database connection pool and create tables
pub async fn init_db(app_handle: &tauri::AppHandle) -> Result<DbPool, sqlx::Error> {
    let db_path = get_db_path(app_handle);
    info!("Initializing database at: {:?}", db_path);

    let db_url = format!("sqlite:{}?mode=rwc", db_path.display());
    let pool = SqlitePool::connect(&db_url).await?;

    // Enable foreign keys
    sqlx::query("PRAGMA foreign_keys = ON")
        .execute(&pool)
        .await?;

    // Create tables
    sqlx::query(CREATE_PROMPTS_TABLE).execute(&pool).await?;
    sqlx::query(CREATE_SNIPPETS_TABLE).execute(&pool).await?;
    sqlx::query(CREATE_TAGS_TABLE).execute(&pool).await?;
    sqlx::query(CREATE_VIEWS_TABLE).execute(&pool).await?;
    sqlx::query(CREATE_PROMPT_TAGS_TABLE).execute(&pool).await?;
    sqlx::query(CREATE_SNIPPET_TAGS_TABLE)
        .execute(&pool)
        .await?;
    sqlx::query(CREATE_PROMPT_TEMPLATE_VALUES_TABLE)
        .execute(&pool)
        .await?;

    // Create indexes
    sqlx::query(CREATE_PROMPT_TAGS_INDEX).execute(&pool).await?;
    sqlx::query(CREATE_SNIPPET_TAGS_INDEX)
        .execute(&pool)
        .await?;
    sqlx::query(CREATE_TEMPLATE_VALUES_INDEX)
        .execute(&pool)
        .await?;

    info!("Database initialized successfully");
    Ok(pool)
}
