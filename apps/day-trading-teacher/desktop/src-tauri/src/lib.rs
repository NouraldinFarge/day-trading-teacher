use chrono::{DateTime, Duration, SecondsFormat, Utc};
use lesson_plan_import::ValidationReport;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;
use teacher_calculations::{
    PositionSizeRequest, PositionSizeResult, TradeResult, TradeResultRequest,
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

#[tauri::command]
fn load_app_state() -> Result<Option<Value>, String> {
    let path = portable_data_root()?.join("state.json");
    let backup = sibling_path(&path, "backup");
    if !path.exists() && !backup.exists() {
        return Ok(None);
    }
    if path.exists()
        && let Ok(state) = read_json_file(&path)
    {
        return Ok(Some(state));
    }
    read_json_file(&backup).map(Some).map_err(|_| {
        "The saved app data and its recovery copy are unreadable. Neither file was overwritten."
            .to_string()
    })
}

#[tauri::command]
fn save_app_state(state: Value) -> Result<(), String> {
    if !state.is_object() {
        return Err("Application state must be a JSON object".to_string());
    }
    let root = portable_data_root()?;
    fs::create_dir_all(&root).map_err(|error| error.to_string())?;
    let path = root.join("state.json");
    let raw = serde_json::to_vec_pretty(&state).map_err(|error| error.to_string())?;
    if raw.len() > 512_000_000 {
        return Err("The local data file exceeds the 512 MB safety limit. Export or remove large screenshot attachments before continuing.".to_string());
    }
    atomic_write(&path, &raw, true)
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

fn read_provider_credentials(spec: ProviderSpec) -> Result<ProviderCredentials, String> {
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
            return Ok(credentials);
        }
        found_unreadable_file = true;
    }
    if spec.id == "alpha_vantage"
        && let Ok(value) = fs::read_to_string(legacy_market_data_key_path()?)
        && valid_provider_credential(value.trim())
    {
        return Ok(ProviderCredentials {
            api_key: value.trim().to_string(),
            api_secret: String::new(),
        });
    }
    if found_unreadable_file {
        return Err(format!(
            "The saved {} credentials and their recovery copy are unreadable. Remove and add them again.",
            spec.label
        ));
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
                "{} credentials are stored only in this portable app's config folder.",
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
    let path = provider_credentials_path(spec)?;
    let raw = serde_json::to_vec_pretty(&credentials).map_err(|error| error.to_string())?;
    atomic_write(&path, &raw, false)?;
    Ok(provider_status(spec, true))
}

#[tauri::command]
fn clear_market_data_provider_credentials(
    provider: String,
) -> Result<MarketDataProviderStatus, String> {
    let spec = provider_spec(&provider)?;
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
    path: String,
    modified_at: u64,
    content: String,
}

fn collect_fidelity_csv_candidates(
    folder: &Path,
    root: &Path,
    depth: usize,
    candidates: &mut Vec<(u64, PathBuf)>,
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
        if !metadata.is_file() || !is_csv || metadata.len() > 10_000_000 {
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
        candidates.push((modified, canonical));
    }
}

#[tauri::command]
fn scan_fidelity_exports(folder_path: String) -> Result<Vec<FidelityExportFile>, String> {
    let requested = PathBuf::from(folder_path);
    let folder = requested
        .canonicalize()
        .map_err(|_| "The selected Fidelity export folder is no longer available.".to_string())?;
    if !folder.is_dir() {
        return Err("The selected Fidelity export location is not a folder.".to_string());
    }
    let mut candidates = Vec::new();
    collect_fidelity_csv_candidates(&folder, &folder, 4, &mut candidates);
    candidates.sort_by_key(|candidate| candidate.0);
    let mut exports = Vec::new();
    for (modified_at, path) in candidates.into_iter().rev().take(100).rev() {
        let content = fs::read_to_string(&path).map_err(|error| error.to_string())?;
        if !content.contains("Symbol,Action,Amount,Order Type,Status,Filled")
            || !content.contains("Order Time")
        {
            continue;
        }
        let canonical = path.canonicalize().map_err(|error| error.to_string())?;
        if !canonical.starts_with(&folder) {
            continue;
        }
        exports.push(FidelityExportFile {
            name: canonical
                .file_name()
                .and_then(|value| value.to_str())
                .unwrap_or("Fidelity export.csv")
                .to_string(),
            path: canonical.to_string_lossy().to_string(),
            modified_at,
            content,
        });
    }
    Ok(exports)
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
            validate_lesson_plan,
            load_app_state,
            save_app_state,
            detect_fidelity_trader_plus,
            launch_fidelity_trader_plus,
            open_fidelity_setup_page,
            scan_fidelity_exports,
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
        atomic_write, bars_to_csv, checked_market_data_csv, provider_spec, read_json_file,
        scan_fidelity_exports, sibling_path, valid_market_symbol, valid_provider_credential,
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
        assert_eq!(exports.len(), 2);
        assert!(
            exports
                .iter()
                .all(|export| export.content.contains("Order Time"))
        );

        fs::remove_dir_all(directory).unwrap();
    }
}
