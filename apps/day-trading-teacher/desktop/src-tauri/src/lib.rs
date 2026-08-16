use chrono::{DateTime, Duration, SecondsFormat, Utc};
use lesson_plan_import::ValidationReport;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;
#[cfg(target_os = "windows")]
use std::sync::OnceLock;
use teacher_calculations::{
    ExpectancyRequest, ExpectancyResult, PositionSizeRequest, PositionSizeResult, TradeResult,
    TradeResultRequest,
};

#[tauri::command]
fn calculate_position_size(request: PositionSizeRequest) -> Result<PositionSizeResult, String> {
    teacher_calculations::position_size(&request).map_err(|error| error.to_string())
}

#[tauri::command]
fn calculate_trade_result(request: TradeResultRequest) -> Result<TradeResult, String> {
    teacher_calculations::trade_result(&request).map_err(|error| error.to_string())
}

#[tauri::command]
fn calculate_expectancy(request: ExpectancyRequest) -> Result<ExpectancyResult, String> {
    teacher_calculations::expectancy(&request).map_err(|error| error.to_string())
}

#[tauri::command]
fn validate_lesson_plan(raw: String, allowed_skill_ids: Vec<String>) -> ValidationReport {
    lesson_plan_import::validate_lesson_plan(&raw, &allowed_skill_ids)
}

fn sibling_path(path: &Path, suffix: &str) -> PathBuf {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| format!("{value}.{suffix}"))
        .unwrap_or_else(|| suffix.to_string());
    path.with_extension(extension)
}

fn atomic_write(path: &Path, raw: &[u8], retain_backup: bool) -> Result<(), String> {
    let temporary = sibling_path(path, "tmp");
    let backup = sibling_path(path, "backup");
    if temporary.exists() {
        fs::remove_file(&temporary)
            .map_err(|_| "A stale temporary data file could not be removed.".to_string())?;
    }
    let mut file = fs::File::create(&temporary)
        .map_err(|_| "The temporary data file could not be created.".to_string())?;
    file.write_all(raw)
        .map_err(|_| "The temporary data file could not be written.".to_string())?;
    file.sync_all()
        .map_err(|_| "The temporary data file could not be synchronized.".to_string())?;
    drop(file);

    if path.exists() {
        if backup.exists() {
            fs::remove_file(&backup)
                .map_err(|_| "The previous backup could not be replaced.".to_string())?;
        }
        if let Err(error) = fs::rename(path, &backup) {
            let _ = fs::remove_file(&temporary);
            return Err(format!(
                "The existing data file could not be protected before saving: {error}"
            ));
        }
    }

    if let Err(error) = fs::rename(&temporary, path) {
        if backup.exists() {
            let _ = fs::rename(&backup, path);
        }
        let _ = fs::remove_file(&temporary);
        return Err(format!(
            "The new data file could not replace the previous copy: {error}"
        ));
    }
    if !retain_backup && backup.exists() {
        fs::remove_file(backup)
            .map_err(|_| "The temporary credential backup could not be removed.".to_string())?;
    }
    Ok(())
}

fn read_json_file(path: &Path) -> Result<Value, String> {
    let raw = fs::read_to_string(path)
        .map_err(|_| "The saved data file could not be read.".to_string())?;
    serde_json::from_str(&raw).map_err(|_| "The saved data file is not valid JSON.".to_string())
}

const NATIVE_STORAGE_FIELD: &str = "_nativeStorage";
const STATE_COLLECTIONS: [&str; 6] = [
    "trades",
    "customLessonPlans",
    "marketDataSets",
    "dailySessions",
    "paperTradingSessions",
    "tradeLearningSystem",
];
const CORE_STATE_LIMIT_BYTES: usize = 64_000_000;
const COLLECTION_LIMIT_BYTES: usize = 384_000_000;

fn storage_revision() -> String {
    format!(
        "{}-{}",
        Utc::now().timestamp_nanos_opt().unwrap_or_default(),
        std::process::id()
    )
}

fn collection_path(root: &Path, key: &str) -> PathBuf {
    root.join("collections").join(format!("{key}.json"))
}

fn collection_value_for_revision(root: &Path, key: &str, revision: &str) -> Result<Value, String> {
    let primary = collection_path(root, key);
    let backup = sibling_path(&primary, "backup");
    for candidate in [&primary, &backup] {
        if !candidate.exists() {
            continue;
        }
        let Ok(envelope) = read_json_file(candidate) else {
            continue;
        };
        if envelope.get("storageVersion").and_then(Value::as_u64) == Some(1)
            && envelope.get("revision").and_then(Value::as_str) == Some(revision)
            && envelope.get("key").and_then(Value::as_str) == Some(key)
            && let Some(value) = envelope.get("value")
        {
            return Ok(value.clone());
        }
    }
    Err(format!(
        "The saved {key} collection does not match this app-state recovery point. No data was overwritten."
    ))
}

fn hydrate_partitioned_state(root: &Path, mut state: Value) -> Result<Value, String> {
    let Some(metadata) = state.get(NATIVE_STORAGE_FIELD).cloned() else {
        return Ok(state);
    };
    let revision = metadata
        .get("revision")
        .and_then(Value::as_str)
        .ok_or_else(|| "The saved app-state storage manifest is incomplete.".to_string())?;
    let collections = metadata
        .get("collections")
        .and_then(Value::as_array)
        .ok_or_else(|| "The saved app-state storage manifest is incomplete.".to_string())?;
    let object = state
        .as_object_mut()
        .ok_or_else(|| "The saved app data is not a JSON object.".to_string())?;
    object.remove(NATIVE_STORAGE_FIELD);
    for item in collections {
        let key = item
            .as_str()
            .filter(|key| STATE_COLLECTIONS.contains(key))
            .ok_or_else(|| {
                "The saved app-state storage manifest has an unknown collection.".to_string()
            })?;
        let value = collection_value_for_revision(root, key, revision)?;
        if value.is_null() {
            object.remove(key);
        } else {
            object.insert(key.to_string(), value);
        }
    }
    Ok(state)
}

fn load_app_state_at_root(root: &Path) -> Result<Option<Value>, String> {
    let path = root.join("state.json");
    let backup = sibling_path(&path, "backup");
    if !path.exists() && !backup.exists() {
        return Ok(None);
    }
    for candidate in [&path, &backup] {
        if !candidate.exists() {
            continue;
        }
        let Ok(state) = read_json_file(candidate) else {
            continue;
        };
        if let Ok(hydrated) = hydrate_partitioned_state(root, state) {
            return Ok(Some(hydrated));
        }
    }
    Err(
        "The saved app data and its coordinated recovery copy are unreadable. No files were overwritten."
            .to_string(),
    )
}

fn save_app_state_at_root(root: &Path, state: Value) -> Result<(), String> {
    let mut object = state
        .as_object()
        .cloned()
        .ok_or_else(|| "Application state must be a JSON object".to_string())?;
    fs::create_dir_all(root).map_err(|error| error.to_string())?;
    fs::create_dir_all(root.join("collections")).map_err(|error| error.to_string())?;

    let revision = storage_revision();
    object.remove(NATIVE_STORAGE_FIELD);
    for key in STATE_COLLECTIONS {
        let value = object.remove(key).unwrap_or(Value::Null);
        let envelope = serde_json::json!({
            "storageVersion": 1,
            "revision": revision,
            "key": key,
            "value": value,
        });
        let raw = serde_json::to_vec_pretty(&envelope).map_err(|error| error.to_string())?;
        if raw.len() > COLLECTION_LIMIT_BYTES {
            return Err(format!(
                "The local {key} collection exceeds its 384 MB safety limit. Export or remove large attachments before continuing."
            ));
        }
        atomic_write(&collection_path(root, key), &raw, true)?;
    }

    object.insert(
        NATIVE_STORAGE_FIELD.to_string(),
        serde_json::json!({
            "version": 1,
            "revision": revision,
            "collections": STATE_COLLECTIONS,
        }),
    );
    let raw =
        serde_json::to_vec_pretty(&Value::Object(object)).map_err(|error| error.to_string())?;
    if raw.len() > CORE_STATE_LIMIT_BYTES {
        return Err("The core local data file exceeds its 64 MB safety limit.".to_string());
    }
    atomic_write(&root.join("state.json"), &raw, true)
}

#[tauri::command]
fn load_app_state() -> Result<Option<Value>, String> {
    load_app_state_at_root(&portable_data_root()?)
}

#[tauri::command]
fn save_app_state(state: Value) -> Result<(), String> {
    let root = portable_data_root()?;
    save_app_state_at_root(&root, state)
}

fn portable_root() -> Result<PathBuf, String> {
    let executable = std::env::current_exe().map_err(|error| error.to_string())?;
    executable
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| "The portable application folder could not be determined.".to_string())
}

fn portable_data_root() -> Result<PathBuf, String> {
    let root = portable_root()?.join("data");
    fs::create_dir_all(&root).map_err(|error| error.to_string())?;
    Ok(root)
}

fn ensure_portable_layout() -> Result<(), String> {
    let root = portable_root()?;
    for directory in ["config", "data", "logs", "cache"] {
        fs::create_dir_all(root.join(directory)).map_err(|error| error.to_string())?;
    }
    Ok(())
}

const LEGACY_MARKET_DATA_KEY_FILE: &str = "market-data-provider.key";

#[derive(Clone, Copy)]
struct ProviderSpec {
    id: &'static str,
    label: &'static str,
    credential_file: &'static str,
    signup_url: &'static str,
    requires_secret: bool,
}

fn provider_spec(provider: &str) -> Result<ProviderSpec, String> {
    match provider.trim().to_ascii_lowercase().as_str() {
        "massive" => Ok(ProviderSpec {
            id: "massive",
            label: "Massive",
            credential_file: "market-data-massive.json",
            signup_url: "https://massive.com/dashboard/signup",
            requires_secret: false,
        }),
        "alpaca" => Ok(ProviderSpec {
            id: "alpaca",
            label: "Alpaca",
            credential_file: "market-data-alpaca.json",
            signup_url: "https://app.alpaca.markets/signup",
            requires_secret: true,
        }),
        "tradier" => Ok(ProviderSpec {
            id: "tradier",
            label: "Tradier",
            credential_file: "market-data-tradier.json",
            signup_url: "https://onboarding.tradier.com/signup",
            requires_secret: false,
        }),
        "alpha_vantage" => Ok(ProviderSpec {
            id: "alpha_vantage",
            label: "Alpha Vantage",
            credential_file: "market-data-alpha-vantage.json",
            signup_url: "https://www.alphavantage.co/support/#api-key",
            requires_secret: false,
        }),
        _ => Err("Choose a supported market-data provider.".to_string()),
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MarketDataProviderStatus {
    configured: bool,
    provider: String,
    message: String,
}

#[derive(Serialize, Deserialize)]
struct ProviderCredentials {
    api_key: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    api_secret: String,
}

const CREDENTIAL_SERVICE: &str = "Day-Trading Teacher market data";

#[cfg(target_os = "windows")]
static CREDENTIAL_STORE_INITIALIZED: OnceLock<Result<(), String>> = OnceLock::new();

#[cfg(target_os = "windows")]
fn initialize_credential_store() -> Result<(), String> {
    CREDENTIAL_STORE_INITIALIZED
        .get_or_init(|| {
            windows_native_keyring_store::Store::new()
                .map(|store| keyring_core::set_default_store(store))
                .map_err(|_| {
                    "Windows Credential Manager could not be opened for market-data credentials."
                        .to_string()
                })
        })
        .clone()
}

#[cfg(target_os = "windows")]
fn secure_credential_entry(spec: ProviderSpec) -> Result<keyring_core::Entry, String> {
    use std::collections::HashMap;

    initialize_credential_store()?;
    let modifiers = HashMap::from([("persistence", "Local")]);
    keyring_core::Entry::new_with_modifiers(CREDENTIAL_SERVICE, spec.id, &modifiers).map_err(|_| {
        format!(
            "Windows Credential Manager could not create the {} credential entry.",
            spec.label
        )
    })
}

#[cfg(target_os = "windows")]
fn read_secure_provider_credentials(
    spec: ProviderSpec,
) -> Result<Option<ProviderCredentials>, String> {
    let entry = secure_credential_entry(spec)?;
    match entry.get_password() {
        Ok(raw) => {
            let credentials = serde_json::from_str::<ProviderCredentials>(&raw).map_err(|_| {
                format!(
                    "The protected {} credential entry is unreadable. Remove and add it again.",
                    spec.label
                )
            })?;
            if !valid_provider_credential(&credentials.api_key)
                || (spec.requires_secret && !valid_provider_credential(&credentials.api_secret))
            {
                return Err(format!(
                    "The protected {} credential entry is invalid. Remove and add it again.",
                    spec.label
                ));
            }
            Ok(Some(credentials))
        }
        Err(keyring_core::Error::NoEntry) => Ok(None),
        Err(_) => Err(format!(
            "Windows Credential Manager could not read the {} credentials.",
            spec.label
        )),
    }
}

#[cfg(not(target_os = "windows"))]
fn read_secure_provider_credentials(
    spec: ProviderSpec,
) -> Result<Option<ProviderCredentials>, String> {
    Err(format!(
        "{} credentials require the Windows desktop application.",
        spec.label
    ))
}

#[cfg(target_os = "windows")]
fn write_secure_provider_credentials(
    spec: ProviderSpec,
    credentials: &ProviderCredentials,
) -> Result<(), String> {
    let entry = secure_credential_entry(spec)?;
    let raw = serde_json::to_string(credentials).map_err(|_| {
        format!(
            "The {} credentials could not be prepared for protected storage.",
            spec.label
        )
    })?;
    entry.set_password(&raw).map_err(|_| {
        format!(
            "Windows Credential Manager could not save the {} credentials.",
            spec.label
        )
    })
}

#[cfg(not(target_os = "windows"))]
fn write_secure_provider_credentials(
    spec: ProviderSpec,
    _credentials: &ProviderCredentials,
) -> Result<(), String> {
    Err(format!(
        "{} credentials require the Windows desktop application.",
        spec.label
    ))
}

#[cfg(target_os = "windows")]
fn delete_secure_provider_credentials(spec: ProviderSpec) -> Result<(), String> {
    let entry = secure_credential_entry(spec)?;
    match entry.delete_credential() {
        Ok(()) | Err(keyring_core::Error::NoEntry) => Ok(()),
        Err(_) => Err(format!(
            "Windows Credential Manager could not remove the {} credentials.",
            spec.label
        )),
    }
}

#[cfg(not(target_os = "windows"))]
fn delete_secure_provider_credentials(spec: ProviderSpec) -> Result<(), String> {
    Err(format!(
        "{} credentials require the Windows desktop application.",
        spec.label
    ))
}

fn provider_credentials_path(spec: ProviderSpec) -> Result<PathBuf, String> {
    let config = portable_root()?.join("config");
    fs::create_dir_all(&config).map_err(|error| error.to_string())?;
    Ok(config.join(spec.credential_file))
}

fn legacy_market_data_key_path() -> Result<PathBuf, String> {
    Ok(portable_root()?
        .join("config")
        .join(LEGACY_MARKET_DATA_KEY_FILE))
}

fn valid_provider_credential(value: &str) -> bool {
    (8..=512).contains(&value.len())
        && value
            .chars()
            .all(|character| character.is_ascii_graphic() && !character.is_ascii_whitespace())
}

fn read_legacy_provider_credentials(
    spec: ProviderSpec,
) -> Result<Option<ProviderCredentials>, String> {
    let path = provider_credentials_path(spec)?;
    let backup = sibling_path(&path, "backup");
    let mut found_unreadable_file = false;
    for candidate in [&path, &backup] {
        if !candidate.exists() {
            continue;
        }
        let Ok(raw) = fs::read_to_string(candidate) else {
            found_unreadable_file = true;
            continue;
        };
        let Ok(credentials) = serde_json::from_str::<ProviderCredentials>(&raw) else {
            found_unreadable_file = true;
            continue;
        };
        if valid_provider_credential(&credentials.api_key)
            && (!spec.requires_secret || valid_provider_credential(&credentials.api_secret))
        {
            return Ok(Some(credentials));
        }
        found_unreadable_file = true;
    }
    if spec.id == "alpha_vantage"
        && let Ok(value) = fs::read_to_string(legacy_market_data_key_path()?)
        && valid_provider_credential(value.trim())
    {
        return Ok(Some(ProviderCredentials {
            api_key: value.trim().to_string(),
            api_secret: String::new(),
        }));
    }
    if found_unreadable_file {
        return Err(format!(
            "The saved {} credentials and their recovery copy are unreadable. Remove and add them again.",
            spec.label
        ));
    }
    Ok(None)
}

fn remove_legacy_provider_credentials(spec: ProviderSpec) -> Result<(), String> {
    let path = provider_credentials_path(spec)?;
    let temporary = sibling_path(&path, "tmp");
    let backup = sibling_path(&path, "backup");
    for candidate in [&path, &temporary, &backup] {
        if candidate.exists() {
            fs::remove_file(candidate).map_err(|error| error.to_string())?;
        }
    }
    if spec.id == "alpha_vantage" {
        let legacy = legacy_market_data_key_path()?;
        if legacy.exists() {
            fs::remove_file(legacy).map_err(|error| error.to_string())?;
        }
    }
    Ok(())
}

fn read_provider_credentials(spec: ProviderSpec) -> Result<ProviderCredentials, String> {
    if let Some(credentials) = read_secure_provider_credentials(spec)? {
        return Ok(credentials);
    }
    if let Some(credentials) = read_legacy_provider_credentials(spec)? {
        write_secure_provider_credentials(spec, &credentials)?;
        remove_legacy_provider_credentials(spec)?;
        return Ok(credentials);
    }
    Err(format!(
        "Add {} credentials before downloading chart data.",
        spec.label
    ))
}

fn provider_status(spec: ProviderSpec, configured: bool) -> MarketDataProviderStatus {
    MarketDataProviderStatus {
        configured,
        provider: spec.id.to_string(),
        message: if configured {
            format!(
                "{} credentials are protected by Windows Credential Manager for this Windows user.",
                spec.label
            )
        } else {
            format!(
                "Add your own {} credentials to enable automatic chart downloads.",
                spec.label
            )
        },
    }
}

fn valid_market_symbol(value: &str) -> bool {
    (1..=16).contains(&value.len())
        && value
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || matches!(character, '.' | '-'))
}

fn checked_market_data_csv(raw: String) -> Result<String, String> {
    if raw.len() > 12_000_000 {
        return Err("The provider response exceeded the 12 MB safety limit.".to_string());
    }
    let trimmed = raw.trim_start();
    if trimmed.starts_with('{') {
        let response: Value = serde_json::from_str(trimmed)
            .map_err(|_| "The market-data provider returned an unreadable response.".to_string())?;
        if response.get("Error Message").is_some() {
            return Err("The provider did not recognize that symbol or request.".to_string());
        }
        if response.get("Note").is_some() || response.get("Information").is_some() {
            return Err("The provider declined this refresh. Check the API key, plan access, or daily request limit, then try again later.".to_string());
        }
        return Err("The provider returned data in an unexpected format.".to_string());
    }
    let header = trimmed
        .lines()
        .next()
        .unwrap_or_default()
        .to_ascii_lowercase();
    if !header.contains("timestamp")
        || !header.contains("open")
        || !header.contains("high")
        || !header.contains("low")
        || !header.contains("close")
    {
        return Err("The provider response did not contain supported OHLCV bars.".to_string());
    }
    Ok(raw)
}

#[tauri::command]
fn market_data_provider_status(provider: String) -> Result<MarketDataProviderStatus, String> {
    let spec = provider_spec(&provider)?;
    Ok(provider_status(
        spec,
        read_provider_credentials(spec).is_ok(),
    ))
}

#[tauri::command]
fn save_market_data_provider_credentials(
    provider: String,
    api_key: String,
    api_secret: String,
) -> Result<MarketDataProviderStatus, String> {
    let spec = provider_spec(&provider)?;
    let api_key = api_key.trim();
    let api_secret = api_secret.trim();
    if !valid_provider_credential(api_key) {
        return Err(format!(
            "Enter a valid {} API key or access token.",
            spec.label
        ));
    }
    if spec.requires_secret && !valid_provider_credential(api_secret) {
        return Err(format!(
            "Enter the {} secret key as well as the key ID.",
            spec.label
        ));
    }
    let credentials = ProviderCredentials {
        api_key: api_key.to_string(),
        api_secret: api_secret.to_string(),
    };
    write_secure_provider_credentials(spec, &credentials)?;
    remove_legacy_provider_credentials(spec)?;
    Ok(provider_status(spec, true))
}

#[tauri::command]
fn clear_market_data_provider_credentials(
    provider: String,
) -> Result<MarketDataProviderStatus, String> {
    let spec = provider_spec(&provider)?;
    delete_secure_provider_credentials(spec)?;
    remove_legacy_provider_credentials(spec)?;
    Ok(provider_status(spec, false))
}

#[derive(Clone, Copy)]
enum ProviderInterval {
    Daily,
    OneMinute,
}

impl ProviderInterval {
    fn parse(value: &str) -> Result<Self, String> {
        match value {
            "daily" => Ok(Self::Daily),
            "1min" => Ok(Self::OneMinute),
            _ => Err("Choose daily or one-minute bars.".to_string()),
        }
    }

    fn label(self) -> &'static str {
        match self {
            Self::Daily => "daily",
            Self::OneMinute => "one-minute",
        }
    }
}

fn market_data_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|_| "The secure market-data client could not be initialized.".to_string())
}

async fn checked_json_response(
    response: reqwest::Response,
    provider: &str,
) -> Result<Value, String> {
    let status = response.status();
    if matches!(status.as_u16(), 401 | 403) {
        return Err(format!(
            "{} rejected the saved credentials or account entitlement.",
            provider
        ));
    }
    if !status.is_success() {
        return Err(format!("{} returned HTTP {}.", provider, status.as_u16()));
    }
    if response
        .content_length()
        .is_some_and(|length| length > 16_000_000)
    {
        return Err("The provider response exceeded the 16 MB safety limit.".to_string());
    }
    let raw = response
        .text()
        .await
        .map_err(|_| "The market-data response could not be read.".to_string())?;
    let parsed: Value = serde_json::from_str(&raw)
        .map_err(|_| format!("{} returned an unreadable response.", provider))?;
    if parsed.get("error").is_some_and(|value| !value.is_null())
        || parsed.get("errors").is_some_and(|value| !value.is_null())
        || parsed.get("fault").is_some_and(|value| !value.is_null())
    {
        return Err(format!(
            "{} declined the request. Check the credentials, symbol, entitlement, or request limit.",
            provider
        ));
    }
    Ok(parsed)
}

fn csv_value(value: Option<&Value>) -> Option<String> {
    match value? {
        Value::Number(number) => Some(number.to_string()),
        Value::String(text) if !text.trim().is_empty() => Some(text.trim().to_string()),
        _ => None,
    }
}

fn csv_timestamp(value: Option<&Value>) -> Option<String> {
    let raw = csv_value(value)?;
    let epoch = raw.parse::<i64>().ok()?;
    let epoch_millis = if epoch >= 1_000_000_000_000_000 {
        epoch / 1_000_000
    } else if epoch >= 1_000_000_000_000 {
        epoch
    } else if epoch >= 1_000_000_000 {
        epoch * 1_000
    } else {
        return Some(raw);
    };
    DateTime::<Utc>::from_timestamp_millis(epoch_millis)
        .map(|timestamp| timestamp.to_rfc3339_opts(SecondsFormat::Secs, true))
}

fn bars_to_csv<'a>(
    bars: impl IntoIterator<Item = &'a Value>,
    timestamp_keys: &[&str],
) -> Result<String, String> {
    let mut csv = String::from("timestamp,open,high,low,close,volume\n");
    let mut count = 0usize;
    for bar in bars {
        let timestamp = timestamp_keys.iter().find_map(|key| {
            let value = bar.get(*key);
            csv_timestamp(value).or_else(|| csv_value(value))
        });
        let open = csv_value(bar.get("o").or_else(|| bar.get("open")));
        let high = csv_value(bar.get("h").or_else(|| bar.get("high")));
        let low = csv_value(bar.get("l").or_else(|| bar.get("low")));
        let close = csv_value(
            bar.get("c")
                .or_else(|| bar.get("close"))
                .or_else(|| bar.get("price")),
        );
        let volume = csv_value(bar.get("v").or_else(|| bar.get("volume"))).unwrap_or_default();
        if let (Some(timestamp), Some(open), Some(high), Some(low), Some(close)) =
            (timestamp, open, high, low, close)
        {
            csv.push_str(&format!(
                "{timestamp},{open},{high},{low},{close},{volume}\n"
            ));
            count += 1;
        }
    }
    if count < 3 {
        return Err(
            "The provider did not return at least three supported price bars for that request."
                .to_string(),
        );
    }
    Ok(csv)
}

async fn fetch_alpha_vantage_series(
    symbol: String,
    interval: ProviderInterval,
) -> Result<String, String> {
    let normalized = symbol.trim().to_ascii_uppercase();
    if !valid_market_symbol(&normalized) {
        return Err(
            "Use a valid symbol containing letters, numbers, a period, or a hyphen.".to_string(),
        );
    }
    let credentials = read_provider_credentials(provider_spec("alpha_vantage")?)?;
    let api_key = credentials.api_key;
    let client = market_data_client()?;
    let mut query = vec![
        (
            "function",
            match interval {
                ProviderInterval::Daily => "TIME_SERIES_DAILY",
                ProviderInterval::OneMinute => "TIME_SERIES_INTRADAY",
            },
        ),
        ("symbol", normalized.as_str()),
        ("outputsize", "compact"),
        ("datatype", "csv"),
        ("apikey", api_key.as_str()),
    ];
    if matches!(interval, ProviderInterval::OneMinute) {
        query.push(("interval", "1min"));
        query.push(("adjusted", "false"));
        query.push(("extended_hours", "true"));
    }
    let series_label = if matches!(interval, ProviderInterval::OneMinute) {
        "1-minute"
    } else {
        "daily"
    };
    let response = client
        .get("https://www.alphavantage.co/query")
        .query(&query)
        .send()
        .await
        .map_err(|_| format!("The {series_label} chart download could not reach Alpha Vantage. Check the connection and try again."))?;
    if !response.status().is_success() {
        return Err(format!(
            "The market-data provider returned HTTP {}.",
            response.status().as_u16()
        ));
    }
    if response
        .content_length()
        .is_some_and(|length| length > 12_000_000)
    {
        return Err("The provider response exceeded the 12 MB safety limit.".to_string());
    }
    let raw = response
        .text()
        .await
        .map_err(|_| "The market-data response could not be read.".to_string())?;
    checked_market_data_csv(raw)
}

async fn fetch_massive_series(
    symbol: String,
    interval: ProviderInterval,
) -> Result<String, String> {
    let normalized = symbol.trim().to_ascii_uppercase();
    if !valid_market_symbol(&normalized) {
        return Err(
            "Use a valid symbol containing letters, numbers, a period, or a hyphen.".to_string(),
        );
    }
    let credentials = read_provider_credentials(provider_spec("massive")?)?;
    let now = Utc::now();
    let start = (now
        - Duration::days(if matches!(interval, ProviderInterval::OneMinute) {
            20
        } else {
            730
        }))
    .format("%Y-%m-%d")
    .to_string();
    let end = now.format("%Y-%m-%d").to_string();
    let timespan = if matches!(interval, ProviderInterval::OneMinute) {
        "minute"
    } else {
        "day"
    };
    let url = format!(
        "https://api.massive.com/v2/aggs/ticker/{normalized}/range/1/{timespan}/{start}/{end}"
    );
    let response = market_data_client()?.get(url).query(&[
        ("adjusted", "true"), ("sort", "asc"), ("limit", "50000"), ("apiKey", credentials.api_key.as_str()),
    ]).send().await.map_err(|_| format!("The {} chart download could not reach Massive. Check the connection and try again.", interval.label()))?;
    let parsed = checked_json_response(response, "Massive").await?;
    let bars = parsed.get("results").and_then(Value::as_array).ok_or_else(|| "Massive did not return bars for that symbol and date range. Free minute data is available after the trading day ends.".to_string())?;
    bars_to_csv(bars.iter(), &["t"])
}

async fn fetch_alpaca_series(symbol: String, interval: ProviderInterval) -> Result<String, String> {
    let normalized = symbol.trim().to_ascii_uppercase();
    if !valid_market_symbol(&normalized) {
        return Err(
            "Use a valid symbol containing letters, numbers, a period, or a hyphen.".to_string(),
        );
    }
    let credentials = read_provider_credentials(provider_spec("alpaca")?)?;
    let now = Utc::now();
    let start = (now
        - Duration::days(if matches!(interval, ProviderInterval::OneMinute) {
            30
        } else {
            730
        }))
    .to_rfc3339_opts(SecondsFormat::Secs, true);
    let end = (now - Duration::minutes(16)).to_rfc3339_opts(SecondsFormat::Secs, true);
    let timeframe = if matches!(interval, ProviderInterval::OneMinute) {
        "1Min"
    } else {
        "1Day"
    };
    let url = format!("https://data.alpaca.markets/v2/stocks/{normalized}/bars");
    let response = market_data_client()?
        .get(url)
        .header("APCA-API-KEY-ID", credentials.api_key)
        .header("APCA-API-SECRET-KEY", credentials.api_secret)
        .query(&[
            ("timeframe", timeframe),
            ("start", start.as_str()),
            ("end", end.as_str()),
            ("limit", "10000"),
            ("adjustment", "split"),
            ("feed", "iex"),
            ("sort", "desc"),
        ])
        .send()
        .await
        .map_err(|_| {
            format!(
                "The {} chart download could not reach Alpaca. Check the connection and try again.",
                interval.label()
            )
        })?;
    let parsed = checked_json_response(response, "Alpaca").await?;
    let bars = parsed
        .get("bars")
        .and_then(Value::as_array)
        .ok_or_else(|| {
            "Alpaca did not return IEX bars for that symbol and date range.".to_string()
        })?;
    bars_to_csv(bars.iter(), &["t"])
}

fn value_items(value: &Value) -> Vec<&Value> {
    if let Some(items) = value.as_array() {
        items.iter().collect()
    } else if value.is_object() {
        vec![value]
    } else {
        Vec::new()
    }
}

async fn fetch_tradier_series(
    symbol: String,
    interval: ProviderInterval,
) -> Result<String, String> {
    let normalized = symbol.trim().to_ascii_uppercase();
    if !valid_market_symbol(&normalized) {
        return Err(
            "Use a valid symbol containing letters, numbers, a period, or a hyphen.".to_string(),
        );
    }
    let credentials = read_provider_credentials(provider_spec("tradier")?)?;
    let now = Utc::now();
    let client = market_data_client()?;
    let intraday_start = (now - Duration::days(10))
        .format("%Y-%m-%d %H:%M")
        .to_string();
    let intraday_end = now.format("%Y-%m-%d %H:%M").to_string();
    let daily_start = (now - Duration::days(730)).format("%Y-%m-%d").to_string();
    let daily_end = now.format("%Y-%m-%d").to_string();
    let request = match interval {
        ProviderInterval::OneMinute => client
            .get("https://api.tradier.com/v1/markets/timesales")
            .query(&[
                ("symbol", normalized.as_str()),
                ("interval", "1min"),
                ("start", intraday_start.as_str()),
                ("end", intraday_end.as_str()),
                ("session_filter", "all"),
            ]),
        ProviderInterval::Daily => client
            .get("https://api.tradier.com/v1/markets/history")
            .query(&[
                ("symbol", normalized.as_str()),
                ("interval", "daily"),
                ("start", daily_start.as_str()),
                ("end", daily_end.as_str()),
            ]),
    };
    let response = request.header("Authorization", format!("Bearer {}", credentials.api_key)).header("Accept", "application/json")
        .send().await.map_err(|_| format!("The {} chart download could not reach Tradier. Check the connection and try again.", interval.label()))?;
    let parsed = checked_json_response(response, "Tradier").await?;
    let value = match interval {
        ProviderInterval::OneMinute => parsed.pointer("/series/data"),
        ProviderInterval::Daily => parsed.pointer("/history/day"),
    }
    .ok_or_else(|| "Tradier did not return bars for that symbol and date range.".to_string())?;
    let items = value_items(value);
    let timestamp_keys: &[&str] = if matches!(interval, ProviderInterval::OneMinute) {
        &["time", "timestamp"]
    } else {
        &["date"]
    };
    bars_to_csv(items, timestamp_keys)
}

#[tauri::command]
async fn fetch_market_data(
    provider: String,
    symbol: String,
    interval: String,
) -> Result<String, String> {
    let spec = provider_spec(&provider)?;
    let interval = ProviderInterval::parse(&interval)?;
    match spec.id {
        "massive" => fetch_massive_series(symbol, interval).await,
        "alpaca" => fetch_alpaca_series(symbol, interval).await,
        "tradier" => fetch_tradier_series(symbol, interval).await,
        "alpha_vantage" => fetch_alpha_vantage_series(symbol, interval).await,
        _ => Err("Choose a supported market-data provider.".to_string()),
    }
}

#[tauri::command]
fn open_market_data_provider_page(provider: String) -> Result<(), String> {
    let spec = provider_spec(&provider)?;
    #[cfg(target_os = "windows")]
    {
        start_hidden(Path::new("explorer.exe"), Some(spec.signup_url))
    }
    #[cfg(not(target_os = "windows"))]
    Err(format!("Open {} in your browser.", spec.signup_url))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FidelityStatus {
    installed: bool,
    source: String,
    message: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FidelityExportFile {
    name: String,
    relative_path: String,
    modified_at: u64,
    size_bytes: u64,
    fingerprint: String,
    kind: String,
    folder_date: Option<String>,
    content: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FidelityFolderProbe {
    discovery_key: String,
    discovered_csv_count: usize,
    latest_modified_at: Option<u64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FidelityExportScan {
    files: Vec<FidelityExportFile>,
    discovered_csv_count: usize,
    unsupported_csv_count: usize,
    oversized_csv_count: usize,
    unreadable_csv_count: usize,
    truncated_csv_count: usize,
    total_bytes: u64,
    warnings: Vec<String>,
}

#[derive(Clone)]
struct FidelityCsvCandidate {
    modified_at: u64,
    size_bytes: u64,
    path: PathBuf,
}

fn collect_fidelity_csv_candidates(
    folder: &Path,
    root: &Path,
    depth: usize,
    candidates: &mut Vec<FidelityCsvCandidate>,
) {
    if depth == 0 {
        return;
    }
    let Ok(entries) = fs::read_dir(folder) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        let Ok(metadata) = entry.metadata() else {
            continue;
        };
        if metadata.is_dir() {
            if let Ok(canonical) = path.canonicalize()
                && canonical.starts_with(root)
            {
                collect_fidelity_csv_candidates(&canonical, root, depth - 1, candidates);
            }
            continue;
        }
        let is_csv = path
            .extension()
            .and_then(|value| value.to_str())
            .is_some_and(|value| value.eq_ignore_ascii_case("csv"));
        if !metadata.is_file() || !is_csv {
            continue;
        }
        let Ok(canonical) = path.canonicalize() else {
            continue;
        };
        if !canonical.starts_with(root) {
            continue;
        }
        let Some(modified) = metadata
            .modified()
            .ok()
            .and_then(|value| value.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|value| value.as_secs())
        else {
            continue;
        };
        candidates.push(FidelityCsvCandidate {
            modified_at: modified,
            size_bytes: metadata.len(),
            path: canonical,
        });
    }
}

fn fidelity_csv_kind(content: &str) -> Option<&'static str> {
    let sample: String = content.chars().take(65_536).collect();
    let normalized = sample.replace(['"', '\r'], "").to_ascii_lowercase();
    let is_orders = normalized.contains("symbol,action,amount,order type,status,filled")
        && normalized.contains("order time");
    if is_orders {
        return Some("orders");
    }
    let is_chart = normalized.contains("date,open,high,low,close")
        || normalized.contains("timestamp,open,high,low,close")
        || normalized.contains("datetime,open,high,low,close");
    is_chart.then_some("chart")
}

fn dated_parent(relative_path: &Path) -> Option<String> {
    relative_path.parent()?.components().find_map(|component| {
        let value = component.as_os_str().to_string_lossy();
        let bytes = value.as_bytes();
        let valid = bytes.len() == 10
            && bytes[4] == b'-'
            && bytes[7] == b'-'
            && bytes
                .iter()
                .enumerate()
                .all(|(index, byte)| index == 4 || index == 7 || byte.is_ascii_digit());
        valid.then(|| value.to_string())
    })
}

fn fidelity_candidate_fingerprint(
    relative_path: &Path,
    candidate: &FidelityCsvCandidate,
) -> String {
    format!(
        "{}:{}:{}",
        relative_path.to_string_lossy(),
        candidate.modified_at,
        candidate.size_bytes
    )
}

#[tauri::command]
fn probe_fidelity_exports(folder_path: String) -> Result<FidelityFolderProbe, String> {
    const MAX_FILES: usize = 500;
    let requested = PathBuf::from(folder_path);
    let folder = requested
        .canonicalize()
        .map_err(|_| "The selected Fidelity export folder is no longer available.".to_string())?;
    if !folder.is_dir() {
        return Err("The selected Fidelity export location is not a folder.".to_string());
    }
    let mut candidates = Vec::new();
    collect_fidelity_csv_candidates(&folder, &folder, 8, &mut candidates);
    let discovered_csv_count = candidates.len();
    candidates.sort_by(|left, right| left.path.cmp(&right.path));
    if candidates.len() > MAX_FILES {
        candidates = candidates.split_off(candidates.len() - MAX_FILES);
    }
    let latest_modified_at = candidates.iter().map(|item| item.modified_at).max();
    let discovery_key = candidates
        .iter()
        .filter_map(|candidate| {
            candidate
                .path
                .strip_prefix(&folder)
                .ok()
                .map(|relative| fidelity_candidate_fingerprint(relative, candidate))
        })
        .collect::<Vec<_>>()
        .join("\n");
    Ok(FidelityFolderProbe {
        discovery_key,
        discovered_csv_count,
        latest_modified_at,
    })
}

#[tauri::command]
fn scan_fidelity_exports(folder_path: String) -> Result<FidelityExportScan, String> {
    const MAX_FILE_BYTES: u64 = 12_000_000;
    const MAX_TOTAL_BYTES: u64 = 64_000_000;
    const MAX_FILES: usize = 500;
    let requested = PathBuf::from(folder_path);
    let folder = requested
        .canonicalize()
        .map_err(|_| "The selected Fidelity export folder is no longer available.".to_string())?;
    if !folder.is_dir() {
        return Err("The selected Fidelity export location is not a folder.".to_string());
    }
    let mut candidates = Vec::new();
    collect_fidelity_csv_candidates(&folder, &folder, 8, &mut candidates);
    candidates.sort_by(|left, right| {
        left.modified_at
            .cmp(&right.modified_at)
            .then_with(|| left.path.cmp(&right.path))
    });
    let discovered_csv_count = candidates.len();
    let truncated_csv_count = discovered_csv_count.saturating_sub(MAX_FILES);
    if truncated_csv_count > 0 {
        candidates = candidates.split_off(truncated_csv_count);
    }
    let mut exports = Vec::new();
    let mut unsupported_csv_count = 0;
    let mut oversized_csv_count = 0;
    let mut unreadable_csv_count = 0;
    let mut total_bytes = 0_u64;
    for candidate in candidates {
        if candidate.size_bytes > MAX_FILE_BYTES
            || total_bytes.saturating_add(candidate.size_bytes) > MAX_TOTAL_BYTES
        {
            oversized_csv_count += 1;
            continue;
        }
        let Ok(content) = fs::read_to_string(&candidate.path) else {
            unreadable_csv_count += 1;
            continue;
        };
        let Some(kind) = fidelity_csv_kind(&content) else {
            unsupported_csv_count += 1;
            continue;
        };
        let canonical = candidate
            .path
            .canonicalize()
            .map_err(|error| error.to_string())?;
        if !canonical.starts_with(&folder) {
            continue;
        }
        let relative = canonical
            .strip_prefix(&folder)
            .map_err(|_| "A scanned export escaped the selected folder.".to_string())?;
        total_bytes = total_bytes.saturating_add(candidate.size_bytes);
        exports.push(FidelityExportFile {
            name: canonical
                .file_name()
                .and_then(|value| value.to_str())
                .unwrap_or("Fidelity export.csv")
                .to_string(),
            relative_path: relative.to_string_lossy().to_string(),
            modified_at: candidate.modified_at,
            size_bytes: candidate.size_bytes,
            fingerprint: fidelity_candidate_fingerprint(relative, &candidate),
            kind: kind.to_string(),
            folder_date: dated_parent(relative),
            content,
        });
    }
    let mut warnings = Vec::new();
    if truncated_csv_count > 0 {
        warnings.push(format!(
            "Only the newest {MAX_FILES} CSV files were considered; {truncated_csv_count} older files were left untouched."
        ));
    }
    if oversized_csv_count > 0 {
        warnings.push(format!(
            "{oversized_csv_count} CSV file(s) exceeded the per-file or combined 64 MB reading limit."
        ));
    }
    if unreadable_csv_count > 0 {
        warnings.push(format!(
            "{unreadable_csv_count} CSV file(s) could not be read and were left untouched."
        ));
    }
    Ok(FidelityExportScan {
        files: exports,
        discovered_csv_count,
        unsupported_csv_count,
        oversized_csv_count,
        unreadable_csv_count,
        truncated_csv_count,
        total_bytes,
        warnings,
    })
}

fn find_trading_records_folder(start: &Path) -> Option<PathBuf> {
    start.ancestors().take(10).find_map(|ancestor| {
        let candidate = ancestor.join("Trading_Records");
        candidate
            .is_dir()
            .then(|| candidate.canonicalize().ok())
            .flatten()
    })
}

#[tauri::command]
fn detect_trading_records_folder() -> Option<String> {
    let from_executable = std::env::current_exe()
        .ok()
        .and_then(|path| find_trading_records_folder(path.parent()?));
    let detected = from_executable.or_else(|| {
        std::env::current_dir()
            .ok()
            .and_then(|path| find_trading_records_folder(&path))
    });
    detected.map(|path| path.to_string_lossy().to_string())
}

#[cfg(target_os = "windows")]
fn find_named_file(root: &Path, depth: usize) -> Option<PathBuf> {
    if depth == 0 || !root.is_dir() {
        return None;
    }
    let entries = fs::read_dir(root).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            if let Some(found) = find_named_file(&path, depth - 1) {
                return Some(found);
            }
            continue;
        }
        let name = path.file_name()?.to_string_lossy().to_ascii_lowercase();
        let fidelity_name = name.contains("fidelity")
            && (name.contains("trader") || name.contains("active trader"));
        let extension = path
            .extension()
            .and_then(|value| value.to_str())
            .unwrap_or_default()
            .to_ascii_lowercase();
        if fidelity_name && matches!(extension.as_str(), "exe" | "lnk") {
            return Some(path);
        }
    }
    None
}

#[cfg(target_os = "windows")]
fn find_in_vendor_directories(root: &Path) -> Option<PathBuf> {
    let entries = fs::read_dir(root).ok()?;
    entries.flatten().find_map(|entry| {
        let path = entry.path();
        let name = path.file_name()?.to_string_lossy().to_ascii_lowercase();
        if path.is_dir() && (name.contains("fidelity") || name.contains("trader")) {
            find_named_file(&path, 4)
        } else {
            None
        }
    })
}

#[cfg(target_os = "windows")]
fn fidelity_launch_target() -> Option<PathBuf> {
    let mut roots: Vec<(PathBuf, usize)> = Vec::new();
    if let Some(local) = std::env::var_os("LOCALAPPDATA") {
        roots.push((PathBuf::from(local).join("Programs"), 4));
    }
    if let Some(app_data) = std::env::var_os("APPDATA") {
        roots.push((
            PathBuf::from(app_data).join("Microsoft\\Windows\\Start Menu\\Programs"),
            5,
        ));
    }
    if let Some(program_data) = std::env::var_os("ProgramData") {
        roots.push((
            PathBuf::from(program_data).join("Microsoft\\Windows\\Start Menu\\Programs"),
            5,
        ));
    }
    if let Some(user_profile) = std::env::var_os("USERPROFILE") {
        let profile = PathBuf::from(user_profile);
        roots.push((profile.join("Desktop"), 2));
        roots.push((profile.join("OneDrive\\Desktop"), 2));
    }
    if let Some(public_profile) = std::env::var_os("PUBLIC") {
        roots.push((PathBuf::from(public_profile).join("Desktop"), 2));
    }
    let standard_target = roots
        .into_iter()
        .find_map(|(root, depth)| find_named_file(&root, depth));
    if standard_target.is_some() {
        return standard_target;
    }
    ["ProgramFiles", "ProgramFiles(x86)"]
        .into_iter()
        .filter_map(std::env::var_os)
        .find_map(|root| find_in_vendor_directories(&PathBuf::from(root)))
}

#[tauri::command]
fn detect_fidelity_trader_plus() -> FidelityStatus {
    #[cfg(target_os = "windows")]
    {
        if let Some(target) = fidelity_launch_target() {
            let source = if target.extension().and_then(|value| value.to_str()) == Some("lnk") {
                "Start menu shortcut"
            } else {
                "Desktop installation"
            };
            return FidelityStatus {
                installed: true,
                source: source.to_string(),
                message: "Fidelity Trader+ Desktop is ready to open.".to_string(),
            };
        }
        FidelityStatus {
            installed: false,
            source: "Not detected".to_string(),
            message: "Trader+ was not found in the standard Windows install locations.".to_string(),
        }
    }
    #[cfg(not(target_os = "windows"))]
    FidelityStatus {
        installed: false,
        source: "Windows only".to_string(),
        message: "Fidelity Trader+ Desktop detection is available on Windows.".to_string(),
    }
}

#[cfg(target_os = "windows")]
fn start_hidden(program: &Path, argument: Option<&str>) -> Result<(), String> {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;
    let mut command = Command::new(program);
    if let Some(value) = argument {
        command.arg(value);
    }
    command
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn launch_fidelity_trader_plus() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let target = fidelity_launch_target().ok_or_else(|| {
            "Fidelity Trader+ Desktop was not detected. Install it, then use Recheck.".to_string()
        })?;
        if target.extension().and_then(|value| value.to_str()) == Some("lnk") {
            start_hidden(Path::new("explorer.exe"), target.to_str())?;
        } else {
            start_hidden(&target, None)?;
        }
        Ok("Fidelity Trader+ Desktop is opening.".to_string())
    }
    #[cfg(not(target_os = "windows"))]
    Err("Fidelity Trader+ Desktop is supported on Windows.".to_string())
}

#[tauri::command]
fn open_fidelity_setup_page() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        start_hidden(
            Path::new("explorer.exe"),
            Some("https://www.fidelity.com/trading/trading-platforms"),
        )
    }
    #[cfg(not(target_os = "windows"))]
    Err("Open https://www.fidelity.com/trading/trading-platforms in your browser.".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            ensure_portable_layout().map_err(std::io::Error::other)?;
            let window_config = app.config().app.windows.first().ok_or_else(|| {
                std::io::Error::other("The main window configuration is missing.")
            })?;
            let webview_data = portable_root()
                .map_err(std::io::Error::other)?
                .join("cache")
                .join("webview2");
            tauri::WebviewWindowBuilder::from_config(app.handle(), window_config)?
                .data_directory(webview_data)
                .build()?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            calculate_position_size,
            calculate_trade_result,
            calculate_expectancy,
            validate_lesson_plan,
            load_app_state,
            save_app_state,
            detect_fidelity_trader_plus,
            launch_fidelity_trader_plus,
            open_fidelity_setup_page,
            scan_fidelity_exports,
            probe_fidelity_exports,
            detect_trading_records_folder,
            market_data_provider_status,
            save_market_data_provider_credentials,
            clear_market_data_provider_credentials,
            fetch_market_data,
            open_market_data_provider_page
        ])
        .run(tauri::generate_context!())
        .expect("error while running Day-Trading Teacher");
}

#[cfg(test)]
mod tests {
    use super::{
        atomic_write, bars_to_csv, checked_market_data_csv, find_trading_records_folder,
        load_app_state_at_root, probe_fidelity_exports, provider_spec, read_json_file,
        save_app_state_at_root, scan_fidelity_exports, sibling_path, valid_market_symbol,
        valid_provider_credential,
    };
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn validates_provider_inputs_without_network_access() {
        assert!(valid_provider_credential("ABCD1234"));
        assert!(valid_provider_credential("token-with-safe-punctuation_123"));
        assert!(!valid_provider_credential("short"));
        assert!(!valid_provider_credential("contains secret space"));
        assert!(valid_market_symbol("BRK.B"));
        assert!(!valid_market_symbol("SPY/USD"));
        assert_eq!(provider_spec("massive").unwrap().label, "Massive");
        assert!(provider_spec("unknown").is_err());
    }

    #[test]
    fn accepts_csv_and_sanitizes_provider_errors() {
        let csv = "timestamp,open,high,low,close,volume\n2026-07-18,1,2,1,2,100\n";
        assert_eq!(checked_market_data_csv(csv.to_string()).unwrap(), csv);
        let limited =
            checked_market_data_csv(r#"{"Information":"request limit reached"}"#.to_string())
                .unwrap_err();
        assert!(limited.contains("daily request limit"));
        let invalid =
            checked_market_data_csv(r#"{"Error Message":"bad symbol"}"#.to_string()).unwrap_err();
        assert!(invalid.contains("recognize"));
    }

    #[test]
    fn normalizes_json_bars_without_exposing_provider_payloads() {
        let payload = serde_json::json!([
            {"t": 1_721_312_200_000i64, "o": 100.0, "h": 101.0, "l": 99.0, "c": 100.5, "v": 1500},
            {"t": 1_721_312_260_000i64, "o": 100.5, "h": 102.0, "l": 100.0, "c": 101.5, "v": 1700},
            {"t": 1_721_312_320_000i64, "o": 101.5, "h": 103.0, "l": 101.0, "c": 102.5, "v": 1900}
        ]);
        let csv = bars_to_csv(payload.as_array().unwrap().iter(), &["t"]).unwrap();
        assert!(csv.starts_with("timestamp,open,high,low,close,volume"));
        assert_eq!(csv.lines().count(), 4);
        assert!(csv.contains("2024-07-18T"));
        assert!(!csv.contains("1721312200000"));
    }

    #[test]
    fn atomically_replaces_state_and_retains_a_recovery_copy() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let directory = std::env::temp_dir().join(format!(
            "day-trading-teacher-atomic-{}-{unique}",
            std::process::id()
        ));
        fs::create_dir(&directory).unwrap();
        let primary = directory.join("state.json");
        let backup = sibling_path(&primary, "backup");

        atomic_write(&primary, br#"{"version":1}"#, true).unwrap();
        atomic_write(&primary, br#"{"version":2}"#, true).unwrap();
        assert_eq!(read_json_file(&primary).unwrap()["version"], 2);
        assert_eq!(read_json_file(&backup).unwrap()["version"], 1);

        fs::remove_file(primary).unwrap();
        fs::remove_file(backup).unwrap();
        fs::remove_dir(directory).unwrap();
    }

    #[test]
    fn partitions_large_collections_and_recovers_them_as_one_state() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let directory = std::env::temp_dir().join(format!(
            "day-trading-teacher-partitioned-{}-{unique}",
            std::process::id()
        ));
        fs::create_dir(&directory).unwrap();

        let first = serde_json::json!({
            "schemaVersion": 1,
            "profile": {"displayName": "First"},
            "trades": [{"id": "trade-one"}],
            "marketDataSets": [{"id": "bars-one"}],
        });
        save_app_state_at_root(&directory, first.clone()).unwrap();
        let on_disk = read_json_file(&directory.join("state.json")).unwrap();
        assert!(on_disk.get("trades").is_none());
        assert!(on_disk.get("marketDataSets").is_none());
        assert!(on_disk.get("_nativeStorage").is_some());
        assert_eq!(
            load_app_state_at_root(&directory).unwrap(),
            Some(first.clone())
        );

        let second = serde_json::json!({
            "schemaVersion": 1,
            "profile": {"displayName": "Second"},
            "trades": [{"id": "trade-two"}],
            "marketDataSets": [{"id": "bars-two"}],
        });
        save_app_state_at_root(&directory, second.clone()).unwrap();
        assert_eq!(load_app_state_at_root(&directory).unwrap(), Some(second));

        fs::write(
            directory.join("collections").join("marketDataSets.json"),
            b"not-json",
        )
        .unwrap();
        assert_eq!(
            load_app_state_at_root(&directory).unwrap(),
            Some(first),
            "the core recovery point and every matching collection recover together"
        );

        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn scans_supported_fidelity_exports_in_dated_subfolders() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let directory = std::env::temp_dir().join(format!(
            "day-trading-teacher-fidelity-scan-{}-{unique}",
            std::process::id()
        ));
        let dated = directory.join("2026-07-27");
        fs::create_dir_all(&dated).unwrap();
        let header = "Symbol,Action,Amount,Order Type,Status,Filled,Order Time,Account\n";
        fs::write(directory.join("Orders.csv"), header).unwrap();
        fs::write(dated.join("Orders2.csv"), header).unwrap();
        fs::write(
            dated.join("Chart.csv"),
            "Date,Open,High,Low,Close\n2026-07-27,1,2,1,2\n",
        )
        .unwrap();

        let exports = scan_fidelity_exports(directory.to_string_lossy().to_string()).unwrap();
        let probe = probe_fidelity_exports(directory.to_string_lossy().to_string()).unwrap();
        assert_eq!(exports.files.len(), 3);
        assert_eq!(exports.discovered_csv_count, 3);
        assert_eq!(probe.discovered_csv_count, 3);
        assert!(!probe.discovery_key.is_empty());
        assert!(
            exports
                .files
                .iter()
                .all(|export| !export.fingerprint.is_empty())
        );
        assert_eq!(
            exports
                .files
                .iter()
                .filter(|export| export.kind == "orders")
                .count(),
            2
        );
        assert_eq!(
            exports
                .files
                .iter()
                .filter(|export| export.kind == "chart")
                .count(),
            1
        );
        assert!(
            exports
                .files
                .iter()
                .any(|export| export.relative_path.contains("2026-07-27"))
        );

        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn detects_a_project_root_trading_records_folder_from_active_build() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let directory = std::env::temp_dir().join(format!(
            "day-trading-teacher-record-detection-{}-{unique}",
            std::process::id()
        ));
        let active_build = directory.join("active-build");
        let records = directory.join("Trading_Records");
        fs::create_dir_all(&active_build).unwrap();
        fs::create_dir_all(&records).unwrap();

        assert_eq!(
            find_trading_records_folder(&active_build),
            records.canonicalize().ok()
        );

        fs::remove_dir_all(directory).unwrap();
    }
}
