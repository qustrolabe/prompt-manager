use notify::{Event, RecommendedWatcher, RecursiveMode, Result as NotifyResult, Watcher};
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::AppHandle;
use tauri::Emitter;

pub struct VaultWatcherState {
    pub watcher: Mutex<Option<RecommendedWatcher>>,
    pub path: Mutex<Option<String>>,
    pub last_emit: Arc<Mutex<Instant>>,
}

impl Default for VaultWatcherState {
    fn default() -> Self {
        Self {
            watcher: Mutex::new(None),
            path: Mutex::new(None),
            last_emit: Arc::new(Mutex::new(Instant::now() - Duration::from_secs(60))),
        }
    }
}

pub fn start_vault_watch(
    app: AppHandle,
    state: &VaultWatcherState,
    vault_path: String,
) -> Result<(), String> {
    let mut watcher_guard = state
        .watcher
        .lock()
        .map_err(|_| "Watcher lock poisoned".to_string())?;
    let mut path_guard = state
        .path
        .lock()
        .map_err(|_| "Path lock poisoned".to_string())?;

    if path_guard.as_deref() == Some(&vault_path) && watcher_guard.is_some() {
        return Ok(());
    }

    let last_emit = state.last_emit.clone();
    let app_handle = app.clone();

    let mut watcher = notify::recommended_watcher(move |res: NotifyResult<Event>| {
        if res.is_err() {
            return;
        }
        let mut last = match last_emit.lock() {
            Ok(lock) => lock,
            Err(_) => return,
        };
        if last.elapsed() < Duration::from_millis(250) {
            return;
        }
        *last = Instant::now();
        let _ = app_handle.emit("vault-changed", ());
    })
    .map_err(|e| e.to_string())?;

    watcher
        .watch(Path::new(&vault_path), RecursiveMode::NonRecursive)
        .map_err(|e| e.to_string())?;

    *path_guard = Some(vault_path);
    *watcher_guard = Some(watcher);

    Ok(())
}
