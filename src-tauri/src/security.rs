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
