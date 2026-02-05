use log::info;
use serde::{Deserialize, Serialize};
use specta::Type;
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

/// Application configuration stored in TOML format
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    /// Path to the vault directory containing prompt markdown files (as string for TypeScript)
    pub vault_path: Option<String>,
    /// UI theme name
    #[serde(default = "default_theme")]
    pub theme: String,
    /// View preferences
    #[serde(default)]
    pub view: ViewSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ViewSettings {
    #[serde(default = "default_show_prompt_titles")]
    pub show_prompt_titles: bool,
    #[serde(default = "default_show_full_prompt")]
    pub show_full_prompt: bool,
    #[serde(default = "default_show_prompt_tags")]
    pub show_prompt_tags: bool,
    #[serde(default = "default_show_created_date")]
    pub show_created_date: bool,
}

impl Default for ViewSettings {
    fn default() -> Self {
        Self {
            show_prompt_titles: default_show_prompt_titles(),
            show_full_prompt: default_show_full_prompt(),
            show_prompt_tags: default_show_prompt_tags(),
            show_created_date: default_show_created_date(),
        }
    }
}

fn default_theme() -> String {
    "dark".to_string()
}

fn default_show_prompt_titles() -> bool {
    true
}

fn default_show_full_prompt() -> bool {
    false
}

fn default_show_prompt_tags() -> bool {
    true
}

fn default_show_created_date() -> bool {
    true
}

/// Get the config file path using Tauri's app config directory
fn get_config_path(app: &AppHandle) -> Result<PathBuf, ConfigError> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| ConfigError::PathError(e.to_string()))?;

    Ok(config_dir.join("config.toml"))
}

/// Load configuration from disk
pub fn load_config(app: &AppHandle) -> Result<AppConfig, ConfigError> {
    let config_path = get_config_path(app)?;

    if !config_path.exists() {
        info!("Config file not found, using defaults");
        return Ok(AppConfig::default());
    }

    let content =
        fs::read_to_string(&config_path).map_err(|e| ConfigError::IoError(e.to_string()))?;

    let config: AppConfig =
        toml::from_str(&content).map_err(|e| ConfigError::ParseError(e.to_string()))?;

    info!("Loaded config from {:?}", config_path);
    Ok(config)
}

/// Save configuration to disk
pub fn save_config(app: &AppHandle, config: &AppConfig) -> Result<(), ConfigError> {
    let config_path = get_config_path(app)?;

    // Ensure config directory exists
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent).map_err(|e| ConfigError::IoError(e.to_string()))?;
    }

    let content =
        toml::to_string_pretty(config).map_err(|e| ConfigError::SerializeError(e.to_string()))?;

    fs::write(&config_path, content).map_err(|e| ConfigError::IoError(e.to_string()))?;

    info!("Saved config to {:?}", config_path);
    Ok(())
}

/// Configuration errors
#[derive(Debug, Clone, Serialize, thiserror::Error, specta::Type)]
pub enum ConfigError {
    #[error("Path error: {0}")]
    PathError(String),
    #[error("IO error: {0}")]
    IoError(String),
    #[error("Parse error: {0}")]
    ParseError(String),
    #[error("Serialize error: {0}")]
    SerializeError(String),
}
