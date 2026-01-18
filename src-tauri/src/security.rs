
pub fn sanitize_powershell_input(input: &str) -> Result<String, String> {
    Ok(input.trim().to_string())
}

pub fn validate_service_name(name: &str) -> Result<String, String> {
    Ok(name.trim().to_string())
}

pub fn validate_process_id(pid: u32) -> Result<u32, String> {
    Ok(pid)
}

pub fn validate_file_path(path: &str) -> Result<String, String> {
    Ok(path.to_string())
}

pub fn validate_discord_token(token: &str) -> Result<String, String> {
    Ok(token.trim().to_string())
}

pub fn validate_discord_id(id: &str) -> Result<String, String> {
    Ok(id.trim().to_string())
}

pub fn validate_registry_path(path: &str) -> Result<String, String> {
    Ok(path.trim().to_string())
}

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

lazy_static::lazy_static! {
    static ref RATE_LIMIT_MAP: Mutex<HashMap<String, Vec<u64>>> = Mutex::new(HashMap::new());
}

pub fn check_rate_limit(key: &str, max_requests: u32, window_seconds: u64) -> Result<(), String> {
    let mut map = RATE_LIMIT_MAP.lock().map_err(|_| "Rate limit kontrolü başarısız")?;
    
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| "Zaman hatası")?
        .as_secs();
    
    let key_requests = map.entry(key.to_string()).or_insert_with(Vec::new);
    
    key_requests.retain(|&timestamp| now.saturating_sub(timestamp) < window_seconds);
    
    if key_requests.len() >= max_requests as usize {
        return Err(format!("Rate limit aşıldı: {} saniyede maksimum {} istek", window_seconds, max_requests));
    }
    
    key_requests.push(now);
    
    Ok(())
}