pub fn sanitize_powershell_input(input: &str) -> Result<String, String> {
    let mut sanitized = input.trim().to_string();
    
    if sanitized.contains("`") {
        return Err("Güvenlik: Tehlikeli karakter tespit edildi: `".to_string());
    }
    
    let command_separators = ["&&", "||"];
    for separator in &command_separators {
        let mut in_single_quote = false;
        let mut in_double_quote = false;
        let mut in_dollar_paren = 0;
        
        for (i, ch) in sanitized.char_indices() {
            if ch == '\'' && (i == 0 || sanitized.chars().nth(i - 1) != Some('\\')) {
                in_single_quote = !in_single_quote;
            } else if ch == '"' && (i == 0 || sanitized.chars().nth(i - 1) != Some('\\')) {
                in_double_quote = !in_double_quote;
            } else if ch == '$' && i + 1 < sanitized.len() && sanitized.chars().nth(i + 1) == Some('(') {
                in_dollar_paren += 1;
            } else if ch == ')' && in_dollar_paren > 0 {
                in_dollar_paren -= 1;
            } else if !in_single_quote && !in_double_quote && in_dollar_paren == 0 {
                if sanitized[i..].starts_with(separator) {
                    return Err(format!("Güvenlik: Tehlikeli karakter tespit edildi: {}", separator));
                }
            }
        }
    }
    
    if !sanitized.contains("'") && !sanitized.contains("\"") {
        if sanitized.contains("&") && !sanitized.contains("$(") {
            return Err("Güvenlik: Tehlikeli karakter tespit edildi: &".to_string());
        }
    }
    
    for pattern in &["<", ">"] {
        if sanitized.contains(pattern) {
            return Err(format!("Güvenlik: Tehlikeli karakter tespit edildi: {}", pattern));
        }
    }
    
    if sanitized.len() > 20000 {
        return Err("Güvenlik: Girdi çok uzun (max 20000 karakter)".to_string());
    }
    
    sanitized = sanitized.replace("'", "''");
    
    Ok(sanitized)
}

pub fn validate_service_name(name: &str) -> Result<String, String> {
    let sanitized = name.trim().to_string();
    
    if !sanitized.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_' || c == ' ') {
        return Err("Geçersiz servis adı: Sadece harf, rakam, tire, alt çizgi ve boşluk kullanılabilir".to_string());
    }
    
    if sanitized.is_empty() || sanitized.len() > 256 {
        return Err("Servis adı boş olamaz veya 256 karakterden uzun olamaz".to_string());
    }
    
    Ok(sanitized)
}

pub fn validate_process_id(pid: u32) -> Result<u32, String> {
    if pid == 0 {
        return Err("Geçersiz process ID: 0 olamaz".to_string());
    }
    
    if pid <= 4 {
        return Err("Güvenlik: Sistem process'leri sonlandırılamaz".to_string());
    }
    
    Ok(pid)
}

pub fn validate_file_path(path: &str) -> Result<String, String> {
    use std::path::Path;
    
    let path_obj = Path::new(path);
    
    if path.contains("..") || path.contains("//") {
        return Err("Güvenlik: Path traversal tespit edildi".to_string());
    }
    
    if path_obj.is_absolute() {
        let allowed_prefixes = [
            "C:\\Users",
            "C:\\ProgramData",
            "C:\\Windows\\Temp",
        ];
        
        let path_str = path_obj.to_string_lossy();
        let is_allowed = allowed_prefixes.iter().any(|prefix| path_str.starts_with(prefix));
        
        if !is_allowed {
            return Err("Güvenlik: İzin verilmeyen dizin".to_string());
        }
    }
    
    Ok(path.to_string())
}

pub fn validate_discord_token(token: &str) -> Result<String, String> {
    let sanitized = token.trim().to_string();
    
    if sanitized.is_empty() {
        return Err("Token boş olamaz".to_string());
    }
    
    if sanitized.len() < 50 || sanitized.len() > 200 {
        return Err("Geçersiz token formatı".to_string());
    }
    
    if sanitized.contains('\n') || sanitized.contains('\r') || sanitized.contains('\0') {
        return Err("Güvenlik: Token'da geçersiz karakter tespit edildi".to_string());
    }
    
    Ok(sanitized)
}

pub fn validate_discord_id(id: &str) -> Result<String, String> {
    let sanitized = id.trim().to_string();
    
    if !sanitized.chars().all(|c| c.is_ascii_digit()) {
        return Err("Geçersiz ID formatı: Sadece rakam içermeli".to_string());
    }
    
    if sanitized.is_empty() || sanitized.len() > 20 {
        return Err("ID boş olamaz veya 20 karakterden uzun olamaz".to_string());
    }
    
    Ok(sanitized)
}

pub fn validate_registry_path(path: &str) -> Result<String, String> {
    let sanitized = path.trim().to_string();
    
    if sanitized.contains("..") || sanitized.contains("//") {
        return Err("Güvenlik: Path traversal tespit edildi".to_string());
    }
    
    let valid_prefixes = ["HKLM:", "HKCU:", "HKCR:", "HKU:", "HKCC:"];
    if !valid_prefixes.iter().any(|prefix| sanitized.starts_with(prefix)) {
        return Err("Geçersiz registry path: HKLM, HKCU, HKCR, HKU veya HKCC ile başlamalı".to_string());
    }
    
    Ok(sanitized)
}

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

lazy_static::lazy_static! {
    static ref RATE_LIMIT_MAP: Mutex<HashMap<String, Vec<u64>>> = Mutex::new(HashMap::new());
}

pub fn check_rate_limit(
    _key: &str,
    _max_requests: u32,
    _window_seconds: u64,
) -> Result<(), String> {
    // Rate limit logic removed due to user request
    Ok(())
}
