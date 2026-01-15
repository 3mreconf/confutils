use serde::{Deserialize, Serialize};
use sysinfo::{System};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HardwareInfo {
    pub hwid: String,
    pub cpu_id: String,
    pub motherboard_serial: String,
    pub disk_serial: String,
    pub mac_address: String,
    pub os_info: String,
}

fn generate_hwid(cpu: &str, motherboard: &str, disk: &str, mac: &str) -> String {
    use sha2::{Sha256, Digest};
    let combined = format!("{}-{}-{}-{}", cpu, motherboard, disk, mac);
    let mut hasher = Sha256::new();
    hasher.update(combined.as_bytes());
    let result = hasher.finalize();
    format!("{:x}", result)
}

pub fn get_hardware_info() -> Result<HardwareInfo, String> {
    let cpu_id = "unknown-cpu".to_string();
    let motherboard_serial = "unknown-mb".to_string();
    let disk_serial = "unknown-disk".to_string();
    let mac_address = "unknown-mac".to_string();

    let os_info = format!(
        "{} (Kernel {})",
        System::name().unwrap_or_else(|| "Unknown OS".to_string()),
        System::kernel_version().unwrap_or_else(|| "N/A".to_string())
    );

    let hwid = generate_hwid(&cpu_id, &motherboard_serial, &disk_serial, &mac_address);

    Ok(HardwareInfo {
        hwid,
        cpu_id,
        motherboard_serial,
        disk_serial,
        mac_address,
        os_info,
    })
}

pub fn verify_hwid(stored_hwid: &str) -> Result<bool, String> {
    let current_info = get_hardware_info()?;
    Ok(current_info.hwid == stored_hwid)
}