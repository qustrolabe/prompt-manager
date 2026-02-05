use log::info;
use sqlx::{Pool, Row, Sqlite, SqlitePool};
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
        .join("cache.db");

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
    sqlx::query(CREATE_TAGS_TABLE).execute(&pool).await?;
    sqlx::query(CREATE_VIEWS_TABLE).execute(&pool).await?;
    sqlx::query(CREATE_PROMPT_TAGS_TABLE).execute(&pool).await?;

    // Create indexes
    sqlx::query(CREATE_PROMPT_TAGS_INDEX).execute(&pool).await?;

    ensure_prompt_columns(&pool).await?;

    info!("Database initialized successfully");
    Ok(pool)
}

async fn ensure_prompt_columns(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    let columns = sqlx::query("PRAGMA table_info(prompts)")
        .fetch_all(pool)
        .await?;
    let mut has_title = false;
    for row in columns {
        let name: String = row.get("name");
        if name == "title" {
            has_title = true;
        }
    }

    if !has_title {
        sqlx::query("ALTER TABLE prompts ADD COLUMN title TEXT")
            .execute(pool)
            .await?;
    }

    Ok(())
}
