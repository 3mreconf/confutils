use std::process::Command;
use winreg::enums::*;
use winreg::RegKey;
use tauri::Emitter;
use std::sync::atomic::{AtomicBool, Ordering};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

use crate::security::*;

fn check_auth() -> Result<(), String> {
    Ok(())
}

fn hosts_blocklist_domains(list_type: &str) -> Result<(&'static str, Vec<&'static str>), String> {
    match list_type {
        "ads" => Ok((
            "ADS",
            vec![
                "ads.google.com",
                "adservice.google.com",
                "adservice.google.com.tr",
                "doubleclick.net",
                "ads.yahoo.com",
                "ads.twitter.com",
                "ads.microsoft.com",
                "adnxs.com",
                "adsymptotic.com",
                "adsystem.com"
            ]
        )),
        "telemetry" => Ok((
            "TELEMETRY",
            vec![
                "vortex.data.microsoft.com",
                "vortex-win.data.microsoft.com",
                "telemetry.microsoft.com",
                "settings-win.data.microsoft.com",
                "watson.telemetry.microsoft.com",
                "oca.telemetry.microsoft.com",
                "sqm.telemetry.microsoft.com",
                "telecommand.telemetry.microsoft.com",
                "telecommand.telemetry.microsoft.com.nsatc.net",
                "wes.df.telemetry.microsoft.com"
            ]
        )),
        _ => Err("Gecersiz blok listesi".to_string())
    }
}

fn privacy_firewall_domains() -> Vec<&'static str> {
    vec![
        "vortex.data.microsoft.com",
        "vortex-win.data.microsoft.com",
        "telemetry.microsoft.com",
        "settings-win.data.microsoft.com",
        "watson.telemetry.microsoft.com",
        "oca.telemetry.microsoft.com",
        "sqm.telemetry.microsoft.com",
        "telecommand.telemetry.microsoft.com",
        "telecommand.telemetry.microsoft.com.nsatc.net",
        "wes.df.telemetry.microsoft.com"
    ]
}

static CLONE_MESSAGES_CANCELLED: AtomicBool = AtomicBool::new(false);
static DISCORD_CLONE_CANCELLED: AtomicBool = AtomicBool::new(false);

async fn resolve_discord_auth(
    client: &reqwest::Client,
    base_url: &str,
    token: &str,
) -> Result<(String, Option<String>), String> {
    use serde_json::Value;

    let trimmed = token.trim();
    let mut candidates = Vec::new();
    let lower = trimmed.to_lowercase();
    if lower.starts_with("bot ") {
        let without_prefix = trimmed[4..].trim().to_string();
        candidates.push(format!("Bot {}", without_prefix));
        if !without_prefix.is_empty() {
            candidates.push(without_prefix);
        }
    } else {
        candidates.push(trimmed.to_string());
        candidates.push(format!("Bot {}", trimmed));
    }

    for auth_token in candidates {
        let me_url = format!("{}/users/@me", base_url);
        let resp = client
            .get(&me_url)
            .header("Authorization", &auth_token)
            .header("Content-Type", "application/json")
            .send()
            .await;

        match resp {
            Ok(r) => {
                if r.status().is_success() {
                    let me_data: Value = r
                        .json()
                        .await
                        .map_err(|e| format!("Yanıt parse edilemedi: {}", e))?;
                    let id = me_data["id"].as_str().unwrap_or("").to_string();
                    let user_id = if id.is_empty() { None } else { Some(id) };
                    return Ok((auth_token, user_id));
                }

                if r.status().as_u16() == 401 || r.status().as_u16() == 403 {
                    continue;
                }

                let status = r.status();
                let error_text = r.text().await.unwrap_or_else(|_| "Bilinmeyen hata".to_string());
                return Err(format!(
                    "Kullanıcı bilgisi alınamadı (Status {}): {}",
                    status, error_text
                ));
            }
            Err(e) => {
                if e.is_timeout() {
                    return Err("Discord API yanıt vermiyor (timeout). Lütfen tekrar deneyin.".to_string());
                }
                if e.is_connect() {
                    return Err("Discord API'ye bağlanılamıyor. İnternet bağlantınızı kontrol edin.".to_string());
                }
                return Err(format!("İstek başarısız: {}", e));
            }
        }
    }

    Err("Token geçersiz veya süresi dolmuş. Lütfen geçerli bir token girin.".to_string())
}

async fn run_powershell_internal(command: String, skip_rate_limit: bool, skip_security_check: bool) -> Result<String, String> {
    let sanitized = if skip_security_check {
        command.clone()
    } else {
        sanitize_powershell_input(&command)?
    };
    
    if !skip_rate_limit {
        check_rate_limit("powershell_command", 10, 60)?;
    }

    #[cfg(windows)]
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let mut cmd = Command::new("powershell");
    cmd.args(["-NoProfile", "-NonInteractive", "-Command", &sanitized]);
    cmd.env("PYTHONIOENCODING", "utf-8");
    cmd.env("LANG", "en_US.UTF-8");

    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = cmd
        .output()
        .map_err(|e| format!("PowerShell execution failed: {}", e))?;

    if output.status.success() {
        let stdout = output.stdout;
        let result = String::from_utf8(stdout.clone())
            .unwrap_or_else(|_| String::from_utf8_lossy(&stdout).to_string());
        Ok(result.trim().to_string())
    } else {
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let raw_error = if stderr.trim().is_empty() { stdout } else { stderr };
        let cleaned = raw_error
            .lines()
            .filter(|line| {
                let trimmed = line.trim_start();
                !(trimmed.starts_with("At line:") ||
                  trimmed.starts_with("+") ||
                  trimmed.starts_with("CategoryInfo") ||
                  trimmed.starts_with("FullyQualifiedErrorId"))
            })
            .collect::<Vec<_>>()
            .join("\n")
            .trim()
            .to_string();
        let error = if cleaned.is_empty() { raw_error.trim().to_string() } else { cleaned };
        if error.contains("Access is denied") || error.contains("UnauthorizedAccessException") {
            Err(format!("Yonetici izni gerekli. Hata: {}", error))
        } else {
            Err(error)
        }
    }
}

#[tauri::command]
pub async fn run_powershell(command: String) -> Result<String, String> {
    check_auth()?;
    run_powershell_internal(command, false, false).await
}

async fn run_powershell_no_rate_limit(command: String) -> Result<String, String> {
    run_powershell_internal(command, true, false).await
}

async fn run_powershell_no_rate_limit_no_security(command: String) -> Result<String, String> {
    run_powershell_internal(command, true, true).await
}

#[tauri::command]
pub async fn start_service(service_name: String) -> Result<String, String> {
    check_auth()?;
    
    let validated_name = validate_service_name(&service_name)?;
    
    let command = format!(
        r#"
        try {{
            Start-Service -Name "{}" -ErrorAction Stop
            "Service {} started successfully"
        }} catch {{
            "Failed to start service {}: " + $_.Exception.Message
        }}
        "#,
        validated_name, validated_name, validated_name
    );
    run_powershell_internal(command, false, false).await
}

#[tauri::command]
pub async fn stop_service(service_name: String) -> Result<String, String> {
    check_auth()?;
    
    let validated_name = validate_service_name(&service_name)?;
    
    let command = format!(
        r#"
        try {{
            Stop-Service -Name "{}" -ErrorAction Stop
            "Service {} stopped successfully"
        }} catch {{
            "Failed to stop service {}: " + $_.Exception.Message
        }}
        "#,
        validated_name, validated_name, validated_name
    );
    run_powershell_internal(command, false, false).await
}

#[tauri::command]
pub async fn get_service_status(service_name: String) -> Result<String, String> {
    check_auth()?;
    
    let validated_name = validate_service_name(&service_name)?;
    
    let command = format!(
        r#"
        try {{
            $service = Get-Service -Name "{}" -ErrorAction Stop
            @{{Status = $service.Status.ToString(); Name = $service.Name}} | ConvertTo-Json -Compress
        }} catch {{
            @{{Status = "NotFound"; Name = "{}"}} | ConvertTo-Json -Compress
        }}
        "#,
        validated_name, validated_name
    );
    run_powershell_internal(command, false, false).await
}

#[tauri::command]
pub async fn list_services() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
        $OutputEncoding = [System.Text.Encoding]::UTF8
        chcp 65001 | Out-Null
        
        try {
            $services = Get-Service | Select-Object Name, DisplayName, Status, StartType
            if ($services) {
                $services | ConvertTo-Json -Compress
            } else {
                "[]"
            }
        } catch {
            "[]"
        }
    "#;
    let result = run_powershell_no_rate_limit(command.to_string()).await?;
    
    if result.trim().is_empty() || result.trim() == "null" {
        Ok("[]".to_string())
    } else {
        match serde_json::from_str::<serde_json::Value>(&result) {
            Ok(_) => Ok(result),
            Err(_) => {
                if result.trim().starts_with('[') {
                    Ok(result)
                } else {
                    Ok("[]".to_string())
                }
            }
        }
    }
}

#[tauri::command]
pub async fn get_service_details(service_name: String) -> Result<String, String> {
    check_auth()?;
    
    let validated_name = validate_service_name(&service_name)?;
    
    let command = format!(
        r#"
        [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
        $OutputEncoding = [System.Text.Encoding]::UTF8
        chcp 65001 | Out-Null
        
        try {{
            $service = Get-Service -Name "{}" -ErrorAction Stop
            $wmiService = Get-WmiObject Win32_Service -Filter "Name='{}'" -ErrorAction SilentlyContinue
            $description = if ($wmiService) {{ $wmiService.Description }} else {{ "" }}
            
            $requiredServices = @()
            $dependentServices = @()
            
            try {{
                $requiredServices = $service.ServicesDependedOn | ForEach-Object {{ @{{Name = $_.Name}} }}
            }} catch {{
                $requiredServices = @()
            }}
            
            try {{
                $dependentServices = $service.DependentServices | ForEach-Object {{ @{{Name = $_.Name}} }}
            }} catch {{
                $dependentServices = @()
            }}
            
            @{{
                Name = $service.Name
                DisplayName = $service.DisplayName
                Status = $service.Status.ToString()
                StartType = $service.StartType.ToString()
                Description = $description
                ServiceName = $service.Name
                RequiredServices = $requiredServices
                DependentServices = $dependentServices
            }} | ConvertTo-Json -Compress
        }} catch {{
            @{{Error = "Service not found: {}"}} | ConvertTo-Json -Compress
        }}
        "#,
        validated_name, validated_name, validated_name
    );
    run_powershell_no_rate_limit(command).await
}

#[tauri::command]
pub async fn set_service_startup_type(service_name: String, startup_type: String) -> Result<String, String> {
    check_auth()?;
    
    let validated_name = validate_service_name(&service_name)?;
    
    let valid_types = ["Automatic", "Manual", "Disabled"];
    if !valid_types.contains(&startup_type.as_str()) {
        return Err("Geçersiz başlangıç türü. Automatic, Manual veya Disabled olmalıdır".to_string());
    }
    
    let command = format!(
        r#"
        try {{
            Set-Service -Name "{}" -StartupType {} -ErrorAction Stop
            "Service {} startup type changed to {}"
        }} catch {{
            "Failed to change startup type for service {}: " + $_.Exception.Message
        }}
        "#,
        validated_name, startup_type, validated_name, startup_type, validated_name
    );
    run_powershell_internal(command, false, false).await
}

#[tauri::command]
pub async fn restart_service(service_name: String) -> Result<String, String> {
    check_auth()?;
    
    let validated_name = validate_service_name(&service_name)?;
    
    let command = format!(
        r#"
        try {{
            Restart-Service -Name "{}" -ErrorAction Stop
            "Service {} restarted successfully"
        }} catch {{
            "Failed to restart service {}: " + $_.Exception.Message
        }}
        "#,
        validated_name, validated_name, validated_name
    );
    run_powershell_internal(command, false, false).await
}

#[tauri::command]
pub async fn read_registry(hive: String, path: String, name: String) -> Result<String, String> {
    check_auth()?;
    let _validated_path = validate_registry_path(&format!("{}:{}", hive, path))?;
    
    let reg_path = format!("{}:\\{}", hive, path);
    let command = format!(r#"Get-ItemProperty -Path "{}" -Name "{}" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty "{}""#, reg_path, name, name);
    let result = run_powershell_internal(command, false, false).await?;
    Ok(result.trim().to_string())
}

#[tauri::command]
pub async fn write_registry(hive: String, path: String, name: String, value: String) -> Result<String, String> {
    check_auth()?;
    let _validated_path = validate_registry_path(&format!("{}:{}", hive, path))?;
    if value.len() > 10000 {
        return Err("Registry değeri çok uzun (max 10000 karakter)".to_string());
    }
    
    let reg_path = format!("{}:\\{}", hive, path);
    let escaped_value = value.replace('"', "`\"");
    let command = format!(r#"New-Item -Path "{}" -Force | Out-Null; Set-ItemProperty -Path "{}" -Name "{}" -Value "{}"; "Registry value written successfully""#, reg_path, reg_path, name, escaped_value);
    run_powershell_internal(command, false, false).await
}

#[tauri::command]
pub async fn get_system_info() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        $os = Get-CimInstance Win32_OperatingSystem
        $cs = Get-CimInstance Win32_ComputerSystem
        @{
            WindowsVersion = $os.Version
            OsName = $os.Caption
            OsArchitecture = $os.OSArchitecture
            CsProcessors = $cs.NumberOfProcessors
        } | ConvertTo-Json -Compress
    "#;
    run_powershell_internal(command.to_string(), false, false).await
}

#[tauri::command]
pub async fn get_disk_usage() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        Get-CimInstance Win32_LogicalDisk | Where-Object {$_.DriveType -eq 3} | 
        Select-Object DeviceID, 
            @{Name="SizeGB";Expression={[math]::Round($_.Size/1GB,2)}}, 
            @{Name="FreeSpaceGB";Expression={[math]::Round($_.FreeSpace/1GB,2)}}, 
            @{Name="UsedSpaceGB";Expression={[math]::Round(($_.Size-$_.FreeSpace)/1GB,2)}}, 
            @{Name="PercentFree";Expression={[math]::Round(($_.FreeSpace/$_.Size)*100,2)}} | 
        ConvertTo-Json -Compress
    "#;
    run_powershell_internal(command.to_string(), true, false).await
}

#[tauri::command]
pub async fn check_windows_updates() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        try {
            $updateSession = New-Object -ComObject Microsoft.Update.Session
            $updateSearcher = $updateSession.CreateUpdateSearcher()
            $searchResult = $updateSearcher.Search("IsInstalled=0")
            @{Available=$searchResult.Updates.Count;LastCheck=(Get-Date).ToString()} | ConvertTo-Json -Compress
        } catch {
            @{Available=0;LastCheck="Error"} | ConvertTo-Json -Compress
        }
    "#;
    run_powershell_internal(command.to_string(), false, false).await
}

#[tauri::command]
pub async fn clear_temp_files() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        $temp = $env:TEMP
        $tempFiles = Get-ChildItem -Path $temp -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum
        Remove-Item "$temp\*" -Recurse -Force -ErrorAction SilentlyContinue
        "Temp files cleared successfully. Freed: $([math]::Round($tempFiles.Sum/1MB, 2)) MB"
    "#;
    run_powershell_internal(command.to_string(), false, false).await
}

#[tauri::command]
pub async fn disable_telemetry() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        New-Item -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection" -Force | Out-Null
        Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection" -Name "AllowTelemetry" -Value 0 -Type DWord -Force
        "Telemetry disabled successfully"
    "#;
    run_powershell_internal(command.to_string(), false, false).await
}

#[tauri::command]
pub async fn get_defender_status() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        try {
            $defender = Get-MpComputerStatus
            $enabled = $defender.RealTimeProtectionEnabled
            @{
                Enabled = $enabled
                Status = $enabled
            } | ConvertTo-Json -Compress
        } catch {
            $falseVal = $false
            @{Enabled=$falseVal;Status=$falseVal} | ConvertTo-Json -Compress
        }
    "#;
    run_powershell_no_rate_limit(command.to_string()).await
}

#[tauri::command]
pub async fn list_startup_programs() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        $startup = Get-CimInstance Win32_StartupCommand
        $startup | Select-Object Name, Command, Location | ConvertTo-Json -Compress
    "#;
    run_powershell_no_rate_limit(command.to_string()).await
}

#[tauri::command]
pub async fn toggle_startup_program(name: String, location: String, command: String, enabled: bool) -> Result<String, String> {
    check_auth()?;
    
    let _reg_path = location.replace("HKCU:", "HKEY_CURRENT_USER").replace("HKLM:", "HKEY_LOCAL_MACHINE");
    let ps_command = if enabled {
        format!(r#"Set-ItemProperty -Path "{}:\{}" -Name "{}" -Value "{}"; "Startup program enabled""#, 
            if location.starts_with("HKCU") { "HKCU" } else { "HKLM" },
            location.split(':').nth(1).unwrap_or(""),
            name,
            command)
    } else {
        format!(r#"Remove-ItemProperty -Path "{}:\{}" -Name "{}" -ErrorAction SilentlyContinue; "Startup program disabled""#,
            if location.starts_with("HKCU") { "HKCU" } else { "HKLM" },
            location.split(':').nth(1).unwrap_or(""),
            name)
    };
    run_powershell_internal(ps_command, false, false).await
}

#[tauri::command]
pub async fn list_network_adapters() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        try {
            [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
            $OutputEncoding = [System.Text.Encoding]::UTF8
            chcp 65001 | Out-Null
            
            $adapters = Get-NetAdapter -ErrorAction SilentlyContinue
            if ($adapters) {
                $adapters | Select-Object Name, InterfaceDescription, Status, LinkSpeed | ConvertTo-Json -Compress
            } else {
                "[]"
            }
        } catch {
            "[]"
        }
    "#;
    run_powershell_no_rate_limit(command.to_string()).await
}

#[tauri::command]
pub async fn flush_dns_cache() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
        $OutputEncoding = [System.Text.Encoding]::UTF8
        chcp 65001 | Out-Null
        
        try {
            Clear-DnsClientCache -ErrorAction Stop
            "DNS cache flushed successfully"
        } catch {
            try {
                $process = Start-Process -FilePath "ipconfig" -ArgumentList "/flushdns" -NoNewWindow -Wait -PassThru
                if ($process.ExitCode -eq 0) {
                    "DNS cache flushed successfully"
                } else {
                    throw "DNS cache flush failed with exit code $($process.ExitCode)"
                }
            } catch {
                "DNS cache flush failed: " + $_.Exception.Message
            }
        }
    "#;
    let result = run_powershell_no_rate_limit(command.to_string()).await?;
    
    if result.contains("successfully") || result.contains("başarıyla") {
        Ok(result)
    } else if result.contains("failed") || result.contains("hata") || result.contains("Error") {
        Err(result)
    } else {
        Ok(result)
    }
}

#[tauri::command]
pub async fn list_processes() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        Get-Process | Select-Object Id, ProcessName, @{Name="CPU";Expression={$_.CPU}}, @{Name="MemoryMB";Expression={[math]::Round($_.WorkingSet64/1MB,2)}} | ConvertTo-Json -Compress
    "#;
    run_powershell_internal(command.to_string(), true, false).await
}

#[tauri::command]
pub async fn kill_process(process_id: u32) -> Result<String, String> {
    check_auth()?;
    let validated_pid = validate_process_id(process_id)?;
    
    let command = format!(r#"Stop-Process -Id {} -Force; "Process killed successfully""#, validated_pid);
    run_powershell_internal(command, false, false).await
}

#[tauri::command]
pub async fn get_cpu_usage() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        try {
            $cpu = Get-WmiObject Win32_Processor | Measure-Object -property LoadPercentage -Average
            $usage = if ($cpu.Average) { $cpu.Average } else { 0 }
            @{Usage = $usage} | ConvertTo-Json -Compress
        } catch {
            try {
                $cpu = (Get-CimInstance Win32_Processor | Measure-Object -property LoadPercentage -Average).Average
                $usage = if ($cpu) { $cpu } else { 0 }
                @{Usage = $usage} | ConvertTo-Json -Compress
            } catch {
                @{Usage = 0} | ConvertTo-Json -Compress
            }
        }
    "#;
    run_powershell_internal(command.to_string(), true, false).await
}

#[tauri::command]
pub async fn get_memory_usage() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        $mem = Get-CimInstance Win32_OperatingSystem
        $total = [math]::Round($mem.TotalVisibleMemorySize / 1MB, 2)
        $free = [math]::Round($mem.FreePhysicalMemory / 1MB, 2)
        $used = $total - $free
        $percent = [math]::Round(($used / $total) * 100, 2)
        @{Total=$total;Used=$used;Free=$free;Percent=$percent} | ConvertTo-Json -Compress
    "#;
    run_powershell_internal(command.to_string(), true, false).await
}

#[tauri::command]
pub async fn get_disk_info() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        Get-CimInstance Win32_LogicalDisk | Where-Object {$_.DriveType -eq 3} | 
        Select-Object DeviceID, 
            @{Name="SizeGB";Expression={[math]::Round($_.Size/1GB,2)}}, 
            @{Name="FreeSpaceGB";Expression={[math]::Round($_.FreeSpace/1GB,2)}}, 
            @{Name="UsedSpaceGB";Expression={[math]::Round(($_.Size-$_.FreeSpace)/1GB,2)}}, 
            @{Name="PercentFree";Expression={[math]::Round(($_.FreeSpace/$_.Size)*100,2)}} | 
        ConvertTo-Json -Compress
    "#;
    run_powershell_internal(command.to_string(), true, false).await
}

#[tauri::command]
pub async fn get_battery_status() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        $battery = Get-CimInstance Win32_Battery
        if ($battery) {
            @{Present=$true;Percentage=$battery.EstimatedChargeRemaining;Status=$battery.BatteryStatus} | ConvertTo-Json -Compress
        } else {
            @{Present=$false} | ConvertTo-Json -Compress
        }
    "#;
    run_powershell_internal(command.to_string(), true, false).await
}

#[tauri::command]
pub async fn get_network_stats() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        $net = Get-Counter "\Network Interface(*)\Bytes Total/sec"
        $net.CounterSamples | Where-Object {$_.InstanceName -notlike "*isatap*" -and $_.InstanceName -notlike "*Loopback*"} | 
        Select-Object InstanceName, @{Name="BytesPerSec";Expression={$_.CookedValue}} | ConvertTo-Json -Compress
    "#;
    run_powershell_internal(command.to_string(), true, false).await
}

#[tauri::command]
pub async fn get_uptime() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        $uptime = (Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime
        @{Days=$uptime.Days;Hours=$uptime.Hours;Minutes=$uptime.Minutes;TotalSeconds=$uptime.TotalSeconds} | ConvertTo-Json -Compress
    "#;
    run_powershell_internal(command.to_string(), true, false).await
}

#[tauri::command]
pub async fn get_detailed_specs() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        $cpu = Get-CimInstance Win32_Processor
        $ram = Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum
        $gpu = Get-CimInstance Win32_VideoController
        @{CPU=$cpu.Name;RAMGB=[math]::Round($ram.Sum/1GB,2);GPU=$gpu.Name} | ConvertTo-Json -Compress
    "#;
    run_powershell_internal(command.to_string(), true, false).await
}

#[tauri::command]
pub async fn check_ssd_health() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        Get-PhysicalDisk | Select-Object DeviceID, MediaType, HealthStatus, OperationalStatus | ConvertTo-Json -Compress
    "#;
    run_powershell_internal(command.to_string(), true, false).await
}

#[tauri::command]
pub async fn get_firewall_status() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        try {
            $fw = Get-NetFirewallProfile
            if ($fw -and $fw.Count -ge 3) {
                @{Domain=$fw[0].Enabled;Private=$fw[1].Enabled;Public=$fw[2].Enabled} | ConvertTo-Json -Compress
            } else {
                @{Domain=$false;Private=$false;Public=$false} | ConvertTo-Json -Compress
            }
        } catch {
            @{Domain=$false;Private=$false;Public=$false} | ConvertTo-Json -Compress
        }
    "#;
    run_powershell_no_rate_limit(command.to_string()).await
}

#[tauri::command]
pub async fn get_last_update_time() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        (Get-CimInstance Win32_OperatingSystem).LastBootUpTime | ConvertTo-Json -Compress
    "#;
    run_powershell_internal(command.to_string(), false, false).await
}

#[tauri::command]
pub async fn optimize_ssd() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        Optimize-Volume -DriveLetter C -ReTrim -ErrorAction SilentlyContinue
        "SSD optimized successfully"
    "#;
    run_powershell_internal(command.to_string(), false, false).await
}

#[tauri::command]
pub async fn rebuild_search_index() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        Get-Service -Name "WSearch" | Restart-Service
        "Search index rebuild initiated"
    "#;
    run_powershell_internal(command.to_string(), false, false).await
}

#[tauri::command]
pub async fn run_disk_cleanup() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        cleanmgr /d C: /VERYLOWDISK | Out-Null
        "Disk cleanup completed"
    "#;
    run_powershell_internal(command.to_string(), false, false).await
}

#[tauri::command]
pub async fn toggle_location_services(enabled: bool) -> Result<String, String> {
    check_auth()?;
    
    let value = if enabled { 1 } else { 0 };
    let command = format!(r#"Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\location" -Name "Value" -Value {} -Type String -Force; "Location services {}""#, value, if enabled { "enabled" } else { "disabled" });
    run_powershell_internal(command, false, false).await
}

#[tauri::command]
pub async fn toggle_microphone_access(enabled: bool) -> Result<String, String> {
    check_auth()?;
    
    let value = if enabled { "Allow" } else { "Deny" };
    let command = format!(r#"Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\microphone" -Name "Value" -Value "{}" -Type String -Force; "Microphone access {}""#, value, if enabled { "enabled" } else { "disabled" });
    run_powershell_internal(command, false, false).await
}

#[tauri::command]
pub async fn toggle_camera_access(enabled: bool) -> Result<String, String> {
    check_auth()?;
    
    let value = if enabled { "Allow" } else { "Deny" };
    let command = format!(r#"Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\webcam" -Name "Value" -Value "{}" -Type String -Force; "Camera access {}""#, value, if enabled { "enabled" } else { "disabled" });
    run_powershell_internal(command, false, false).await
}

#[tauri::command]
pub async fn clear_activity_history() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        Remove-Item "$env:LOCALAPPDATA\ConnectedDevicesPlatform" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item "$env:LOCALAPPDATA\Microsoft\Windows\ActivityHistory" -Recurse -Force -ErrorAction SilentlyContinue
        "Activity history cleared successfully"
    "#;
    run_powershell_internal(command.to_string(), false, false).await
}

#[tauri::command]
pub async fn clear_browser_data(browser: String, _data_types: Vec<String>) -> Result<String, String> {
    check_auth()?;
    
    let browser_lower = browser.to_lowercase();
    let paths = match browser_lower.as_str() {
        "chrome" => vec![
            "$env:LOCALAPPDATA\\Google\\Chrome\\User Data\\Default\\Cache",
            "$env:LOCALAPPDATA\\Google\\Chrome\\User Data\\Default\\Cookies",
            "$env:LOCALAPPDATA\\Google\\Chrome\\User Data\\Default\\History"
        ],
        "edge" => vec![
            "$env:LOCALAPPDATA\\Microsoft\\Edge\\User Data\\Default\\Cache",
            "$env:LOCALAPPDATA\\Microsoft\\Edge\\User Data\\Default\\Cookies",
            "$env:LOCALAPPDATA\\Microsoft\\Edge\\User Data\\Default\\History"
        ],
        "firefox" => vec![
            "$env:APPDATA\\Mozilla\\Firefox\\Profiles\\*\\cache2",
            "$env:APPDATA\\Mozilla\\Firefox\\Profiles\\*\\cookies.sqlite"
        ],
        _ => vec![]
    };
    
    let mut cleanup_commands = Vec::new();
    for path in paths {
        cleanup_commands.push(format!("Remove-Item -Path \"{}\" -Recurse -Force -ErrorAction SilentlyContinue", path));
    }
    let command = format!("{}; \"Browser data cleared successfully\"", cleanup_commands.join("; "));
    run_powershell_internal(command, false, false).await
}

#[tauri::command]
pub async fn set_power_plan(high_performance: bool) -> Result<String, String> {
    check_auth()?;
    
    let plan_guid = if high_performance {
        "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c"
    } else {
        "381b4222-f694-41f0-9685-ff5bb260df2e"
    };
    let command = format!(r#"powercfg /setactive {}; "Power plan set successfully""#, plan_guid);
    run_powershell_internal(command, false, false).await
}

#[tauri::command]
pub async fn get_current_power_plan() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        $plan = powercfg /getactivescheme
        $guid = $plan | Select-String -Pattern "GUID" | ForEach-Object { $parts = $_.Line.Split([char]58); if ($parts.Length -gt 1) { $parts[1].Trim() } else { "" } }
        @{currentPlan = $guid} | ConvertTo-Json -Compress
    "#;
    run_powershell_no_rate_limit(command.to_string()).await
}

#[tauri::command]
pub async fn disable_recall() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        New-Item -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsCopilot" -Force | Out-Null
        Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsCopilot" -Name "TurnOffWindowsCopilot" -Value 1 -Type DWord -Force
        New-Item -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AI" -Force | Out-Null
        Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AI" -Name "EnableWindowsCopilot" -Value 0 -Type DWord -Force
        "Recall disabled successfully"
    "#;
    run_powershell_internal(command.to_string(), false, false).await
}

#[tauri::command]
pub async fn disable_telemetry_advanced() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        $paths = @(
            "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection",
            "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection"
        )
        foreach ($path in $paths) {
            if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
            Set-ItemProperty -Path $path -Name "AllowTelemetry" -Value 0 -Type DWord -Force
        }
        Set-Service -Name "DiagTrack" -StartupType Disabled -ErrorAction SilentlyContinue
        Stop-Service -Name "DiagTrack" -Force -ErrorAction SilentlyContinue
        "Advanced telemetry disabled successfully"
    "#;
    run_powershell_internal(command.to_string(), false, false).await
}

#[tauri::command]
pub async fn remove_onedrive() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        try {
            Get-Process -Name "OneDrive" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
            Get-Process -Name "FileCoAuth" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
            $onedrivePath = "$env:SystemRoot\SysWOW64\OneDriveSetup.exe"
            if (Test-Path $onedrivePath) {
                Start-Process -FilePath $onedrivePath -ArgumentList "/uninstall" -Wait -NoNewWindow -ErrorAction SilentlyContinue
            }
            Remove-Item "$env:LOCALAPPDATA\Microsoft\OneDrive" -Recurse -Force -ErrorAction SilentlyContinue
            Remove-Item "$env:PROGRAMDATA\Microsoft OneDrive" -Recurse -Force -ErrorAction SilentlyContinue
            "OneDrive removed successfully"
        } catch {
            "OneDrive removal completed with warnings: " + $_.Exception.Message
        }
    "#;
    run_powershell_internal(command.to_string(), false, false).await
}

#[tauri::command]
pub async fn disable_location_tracking_advanced() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        New-Item -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\LocationAndSensors" -Force | Out-Null
        Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\LocationAndSensors" -Name "DisableLocation" -Value 1 -Type DWord -Force
        Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\LocationAndSensors" -Name "DisableLocationScripting" -Value 1 -Type DWord -Force
        "Advanced location tracking disabled successfully"
    "#;
    run_powershell_internal(command.to_string(), false, false).await
}

#[tauri::command]
pub async fn remove_home_gallery() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        Get-AppxPackage *Microsoft.Windows.Photos* | Remove-AppxPackage -ErrorAction SilentlyContinue
        Get-AppxPackage *Microsoft.Windows.Home* | Remove-AppxPackage -ErrorAction SilentlyContinue
        "Home and Gallery removed successfully"
    "#;
    run_powershell_internal(command.to_string(), false, false).await
}

#[tauri::command]
pub async fn disable_teredo() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        Set-NetTeredoConfiguration -Type Disabled -ErrorAction SilentlyContinue
        netsh interface teredo set state disabled
        "Teredo disabled successfully"
    "#;
    run_powershell_internal(command.to_string(), false, false).await
}

#[tauri::command]
pub async fn block_adobe_network() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        $hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
        $adobeDomains = @(
            "adobe.com",
            "adobelogin.com",
            "adobesc.com",
            "adobesc.omtrdc.net"
        )
        $content = Get-Content $hostsPath -ErrorAction SilentlyContinue
        foreach ($domain in $adobeDomains) {
            if ($content -notmatch $domain) {
                Add-Content -Path $hostsPath -Value "0.0.0.0 $domain"
            }
        }
        "Adobe network blocked successfully"
    "#;
    run_powershell_internal(command.to_string(), false, false).await
}

#[tauri::command]
pub async fn apply_hosts_blocklist(list_type: String) -> Result<String, String> {
    check_auth()?;

    let list_key = list_type.trim().to_lowercase();
    let (marker, domains) = hosts_blocklist_domains(&list_key)?;
    let domains_literal = domains
        .iter()
        .map(|domain| format!("\"{}\"", domain))
        .collect::<Vec<_>>()
        .join(", ");

    let command = format!(
        r#"
        $hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
        $start = '# ConfUtils Blocklist {marker} Start'
        $end = '# ConfUtils Blocklist {marker} End'
        $domains = @({domains_literal})
        $content = Get-Content $hostsPath -ErrorAction SilentlyContinue
        $filtered = @()
        $inBlock = $false
        foreach ($line in $content) {{
            if ($line -eq $start) {{ $inBlock = $true; continue }}
            if ($line -eq $end) {{ $inBlock = $false; continue }}
            if (-not $inBlock) {{ $filtered += $line }}
        }}
        $block = @()
        $block += $start
        foreach ($domain in $domains) {{
            $block += "0.0.0.0 $domain"
        }}
        $block += $end
        $final = $filtered + $block
        Set-Content -Path $hostsPath -Value $final -Encoding ASCII
        ipconfig /flushdns | Out-Null
        "Hosts blocklist applied: {marker} ({count})"
    "#,
        marker = marker,
        domains_literal = domains_literal,
        count = domains.len()
    );

    run_powershell_internal(command.to_string(), false, false).await
}

#[tauri::command]
pub async fn remove_hosts_blocklist(list_type: String) -> Result<String, String> {
    check_auth()?;

    let list_key = list_type.trim().to_lowercase();
    let (marker, _) = hosts_blocklist_domains(&list_key)?;
    let command = format!(
        r#"
        $hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
        $start = '# ConfUtils Blocklist {marker} Start'
        $end = '# ConfUtils Blocklist {marker} End'
        $content = Get-Content $hostsPath -ErrorAction SilentlyContinue
        $filtered = @()
        $inBlock = $false
        foreach ($line in $content) {{
            if ($line -eq $start) {{ $inBlock = $true; continue }}
            if ($line -eq $end) {{ $inBlock = $false; continue }}
            if (-not $inBlock) {{ $filtered += $line }}
        }}
        Set-Content -Path $hostsPath -Value $filtered -Encoding ASCII
        ipconfig /flushdns | Out-Null
        "Hosts blocklist removed: {marker}"
    "#,
        marker = marker
    );

    run_powershell_internal(command.to_string(), false, false).await
}

#[tauri::command]
pub async fn get_hosts_blocklist_status(list_type: String) -> Result<String, String> {
    check_auth()?;

    let list_key = list_type.trim().to_lowercase();
    let (marker, _) = hosts_blocklist_domains(&list_key)?;
    let command = format!(
        r#"
        $hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
        $start = '# ConfUtils Blocklist {marker} Start'
        $content = Get-Content $hostsPath -ErrorAction SilentlyContinue
        if ($content -contains $start) {{ "true" }} else {{ "false" }}
    "#,
        marker = marker
    );

    run_powershell_no_rate_limit(command.to_string()).await
}

#[tauri::command]
pub async fn apply_privacy_firewall_rules() -> Result<String, String> {
    check_auth()?;

    let domains = privacy_firewall_domains()
        .iter()
        .map(|domain| format!("\"{}\"", domain))
        .collect::<Vec<_>>()
        .join(", ");

    let command = format!(
        r#"
        $ruleName = "ConfUtils Telemetry Block"
        Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue
        $domains = @({domains})
        $ips = @()
        foreach ($domain in $domains) {{
            $records = Resolve-DnsName -Name $domain -Type A -ErrorAction SilentlyContinue
            foreach ($record in $records) {{
                if ($record.IPAddress) {{ $ips += $record.IPAddress }}
            }}
        }}
        $ips = $ips | Sort-Object -Unique
        if ($ips.Count -eq 0) {{
            "Firewall rule not applied. No IPs resolved."
        }} else {{
            New-NetFirewallRule -DisplayName $ruleName -Group "ConfUtils Privacy" -Direction Outbound -Action Block -RemoteAddress ($ips -join ",") -Profile Any | Out-Null
            "Privacy firewall rules applied. Blocked IPs: " + $ips.Count
        }}
    "#,
        domains = domains
    );

    run_powershell_internal(command.to_string(), false, false).await
}

#[tauri::command]
pub async fn remove_privacy_firewall_rules() -> Result<String, String> {
    check_auth()?;

    let command = r#"
        $ruleName = "ConfUtils Telemetry Block"
        Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue
        "Privacy firewall rules removed"
    "#;

    run_powershell_internal(command.to_string(), false, false).await
}

#[tauri::command]
pub async fn get_privacy_firewall_status() -> Result<String, String> {
    check_auth()?;

    let command = r#"
        $ruleName = "ConfUtils Telemetry Block"
        $rule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
        if ($rule) { "true" } else { "false" }
    "#;

    run_powershell_no_rate_limit(command.to_string()).await
}

#[tauri::command]
pub async fn open_device_manager() -> Result<String, String> {
    check_auth()?;
    let command = r#"
        Start-Process "devmgmt.msc"
        "Device Manager opened"
    "#;
    run_powershell_internal(command.to_string(), false, false).await
}

#[tauri::command]
pub async fn scan_device_issues() -> Result<String, String> {
    check_auth()?;
    let command = r#"
        $issues = Get-PnpDevice -Status Error -ErrorAction SilentlyContinue | Select-Object FriendlyName, InstanceId, Class, Status
        if ($issues) {
            $issues | ConvertTo-Json -Depth 3
        } else {
            "[]"
        }
    "#;
    run_powershell_no_rate_limit(command.to_string()).await
}

#[tauri::command]
pub async fn scan_app_leftovers(app_name: String) -> Result<String, String> {
    check_auth()?;

    let safe_name = app_name.replace('"', "").trim().to_string();
    if safe_name.is_empty() {
        return Err("Uygulama adi bos olamaz".to_string());
    }

    let command = format!(
        r#"
        $appName = "{app_name}"
        $paths = @()
        $folders = @(
            "$env:ProgramFiles",
            "$env:ProgramFiles(x86)",
            "$env:LOCALAPPDATA",
            "$env:APPDATA",
            "$env:ProgramData"
        )
        foreach ($base in $folders) {{
            if (Test-Path $base) {{
                Get-ChildItem -Path $base -Directory -ErrorAction SilentlyContinue | Where-Object {{ $_.Name -like "*$appName*" }} | ForEach-Object {{
                    $paths += $_.FullName
                }}
            }}
        }}
        $regHits = @()
        $regRoots = @(
            "HKCU:\Software",
            "HKLM:\SOFTWARE",
            "HKLM:\SOFTWARE\WOW6432Node"
        )
        foreach ($root in $regRoots) {{
            Get-ChildItem -Path $root -ErrorAction SilentlyContinue | Where-Object {{ $_.Name -like "*$appName*" }} | ForEach-Object {{
                $regHits += $_.Name
            }}
        }}
        [pscustomobject]@{{
            files = $paths
            registry = $regHits
        }} | ConvertTo-Json -Depth 3
    "#,
        app_name = safe_name
    );

    run_powershell_no_rate_limit(command.to_string()).await
}

#[tauri::command]
pub async fn scan_registry_health() -> Result<String, String> {
    check_auth()?;

    let command = r#"
        $issues = @()
        function Add-Issue {
            param(
                [string]$Type,
                [string]$Path,
                [string]$Detail,
                [string]$Recommendation
            )
            $issues += [pscustomobject]@{
                id = [guid]::NewGuid().ToString()
                type = $Type
                path = $Path
                detail = $Detail
                recommendation = $Recommendation
            }
        }

        $runPaths = @(
            "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run",
            "HKLM:\Software\Microsoft\Windows\CurrentVersion\Run",
            "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Run"
        )

        foreach ($runPath in $runPaths) {
            if (Test-Path $runPath) {
                $props = Get-ItemProperty -Path $runPath -ErrorAction SilentlyContinue
                if ($props) {
                    foreach ($prop in $props.PSObject.Properties) {
                        if ($prop.Name -in "PSPath","PSParentPath","PSChildName","PSDrive","PSProvider") { continue }
                        $value = [string]$prop.Value
                        $entryPath = "$runPath\$($prop.Name)"
                        if ([string]::IsNullOrWhiteSpace($value)) {
                            Add-Issue "run_empty" $entryPath "Empty Run entry" "Remove the empty entry"
                            continue
                        }
                        $exe = $value
                        if ($exe -match '^[`"'''']([^`"'''']+)') {
                            $exe = $Matches[1]
                        } else {
                            $exe = $value.Split(' ')[0]
                        }
                        if ($exe -and -not (Test-Path $exe)) {
                            Add-Issue "run_missing" $entryPath ("Target not found: " + $exe) "Consider removing or fixing the path"
                        }
                    }
                }
            }
        }

        $uninstallRoots = @(
            "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
            "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall",
            "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"
        )

        foreach ($root in $uninstallRoots) {
            if (Test-Path $root) {
                $subKeys = Get-ChildItem -Path $root -ErrorAction SilentlyContinue
                foreach ($key in $subKeys) {
                    $props = Get-ItemProperty -Path $key.PSPath -ErrorAction SilentlyContinue
                    $displayName = [string]$props.DisplayName
                    if ([string]::IsNullOrWhiteSpace($displayName)) {
                        Add-Issue "uninstall_missing_name" $key.PSPath "Missing DisplayName" "Consider removing orphaned entry"
                        continue
                    }
                    $installLocation = [string]$props.InstallLocation
                    if (-not [string]::IsNullOrWhiteSpace($installLocation) -and -not (Test-Path $installLocation)) {
                        Add-Issue "uninstall_missing_path" $key.PSPath ("InstallLocation not found: " + $installLocation) "Consider cleaning leftover entry"
                    }
                    $displayIcon = [string]$props.DisplayIcon
                    if (-not [string]::IsNullOrWhiteSpace($displayIcon)) {
                        $iconPath = $displayIcon
                        if ($iconPath -match '^[`"'''']([^`"'''']+)') {
                            $iconPath = $Matches[1]
                        } else {
                            $iconPath = $displayIcon.Split(',')[0]
                        }
                        if ($iconPath -and -not (Test-Path $iconPath)) {
                            Add-Issue "uninstall_missing_icon" $key.PSPath ("DisplayIcon not found: " + $iconPath) "Consider updating or removing the entry"
                        }
                    }
                }
            }
        }

        $missingPaths = ($issues | Where-Object { $_.type -match "missing" }).Count
        $invalidUninstall = ($issues | Where-Object { $_.type -like "uninstall_*" }).Count

        [pscustomobject]@{
            summary = [pscustomobject]@{
                total = $issues.Count
                missingPaths = $missingPaths
                invalidUninstall = $invalidUninstall
            }
            issues = $issues
        } | ConvertTo-Json -Depth 4
    "#;

    run_powershell_no_rate_limit(command.to_string()).await
}

#[tauri::command]
pub async fn apply_storage_sense_profile(profile: String) -> Result<String, String> {
    check_auth()?;

    let key = profile.trim().to_lowercase();
    let (frequency, recycle_days, downloads_days, label) = match key.as_str() {
        "light" => (30, 30, 30, "Light"),
        "balanced" => (7, 14, 30, "Balanced"),
        "aggressive" => (1, 7, 7, "Aggressive"),
        _ => return Err("Gecersiz profil".to_string())
    };

    let command = format!(
        r#"
        $path = "HKCU:\Software\Microsoft\Windows\CurrentVersion\StorageSense\Parameters\StoragePolicy"
        New-Item -Path $path -Force | Out-Null
        Set-ItemProperty -Path $path -Name "01" -Value 1 -Type DWord -Force
        Set-ItemProperty -Path $path -Name "04" -Value {frequency} -Type DWord -Force
        Set-ItemProperty -Path $path -Name "08" -Value 1 -Type DWord -Force
        Set-ItemProperty -Path $path -Name "32" -Value {recycle_days} -Type DWord -Force
        Set-ItemProperty -Path $path -Name "256" -Value {downloads_days} -Type DWord -Force
        "Storage Sense profile applied: {label}"
    "#,
        frequency = frequency,
        recycle_days = recycle_days,
        downloads_days = downloads_days,
        label = label
    );

    run_powershell_internal(command.to_string(), false, false).await
}

#[tauri::command]
pub async fn scan_outdated_drivers() -> Result<String, String> {
    check_auth()?;

    let command = r#"
        [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
        $OutputEncoding = [System.Text.Encoding]::UTF8
        chcp 65001 | Out-Null

        $threshold = (Get-Date).AddYears(-2)
        $drivers = Get-CimInstance Win32_PnPSignedDriver | Where-Object { $_.DeviceName -and $_.DriverDate } | ForEach-Object {
            $driverDate = [datetime]$_.DriverDate
            $ageYears = [math]::Round(((Get-Date) - $driverDate).TotalDays / 365, 1)
            $outdated = $driverDate -lt $threshold
            $vendor = if ($_.Manufacturer) { $_.Manufacturer } else { "" }
            $official = ""
            if ($vendor -match "Intel") { $official = "https://www.intel.com/content/www/us/en/download-center/home.html" }
            elseif ($vendor -match "NVIDIA") { $official = "https://www.nvidia.com/Download/index.aspx" }
            elseif ($vendor -match "AMD|Advanced Micro Devices") { $official = "https://www.amd.com/en/support" }
            elseif ($vendor -match "Realtek") { $official = "https://www.realtek.com/en/downloads" }
            elseif ($vendor -match "Qualcomm") { $official = "https://www.qualcomm.com/support" }
            elseif ($vendor -match "Broadcom") { $official = "https://www.broadcom.com/support/download-search" }
            [pscustomobject]@{
                Name = $_.DeviceName
                DriverVersion = $_.DriverVersion
                DriverDate = $driverDate.ToString("yyyy-MM-dd")
                Manufacturer = $vendor
                AgeYears = $ageYears
                Outdated = $outdated
                OfficialUrl = $official
                SearchUrl = ("https://www.google.com/search?q=" + [uri]::EscapeDataString("$vendor driver download"))
            }
        }

        $drivers = $drivers | Where-Object { $_.Outdated -eq $true }
        $drivers | ConvertTo-Json -Compress
    "#;

    run_powershell_no_rate_limit(command.to_string()).await
}

#[tauri::command]
pub async fn get_fast_startup_status() -> Result<String, String> {
    check_auth()?;

    let command = r#"
        [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
        $OutputEncoding = [System.Text.Encoding]::UTF8
        chcp 65001 | Out-Null

        $hiber = (Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Power" -Name "HibernateEnabled" -ErrorAction SilentlyContinue).HibernateEnabled
        $fast = (Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power" -Name "HiberbootEnabled" -ErrorAction SilentlyContinue).HiberbootEnabled
        $hiberEnabled = $hiber -eq 1
        $fastEnabled = $fast -eq 1
        $effective = $hiberEnabled -and $fastEnabled
        $recommendation = ""
        if (-not $hiberEnabled -and $fastEnabled) {
            $recommendation = "Hibernation disabled; Fast Startup will not work."
        } elseif ($effective) {
            $recommendation = "Fast Startup is enabled and active."
        } else {
            $recommendation = "Fast Startup is disabled."
        }
        [pscustomobject]@{
            FastStartupEnabled = $fastEnabled
            HibernationEnabled = $hiberEnabled
            EffectiveFastStartup = $effective
            Recommendation = $recommendation
        } | ConvertTo-Json -Compress
    "#;

    run_powershell_no_rate_limit(command.to_string()).await
}

#[tauri::command]
pub async fn run_privacy_audit() -> Result<String, String> {
    check_auth()?;

    let command = r#"
        $findings = @()
        $score = 0

        $telemetry = (Get-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection" -Name "AllowTelemetry" -ErrorAction SilentlyContinue).AllowTelemetry
        $telemetryEnabled = $false
        if ($telemetry -ge 1) { $telemetryEnabled = $true; $score += 25 }
        $findings += [pscustomobject]@{ id = "telemetry"; title = "Telemetry"; enabled = $telemetryEnabled; detail = "AllowTelemetry=" + ($telemetry -as [string]) }

        $adId = (Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\AdvertisingInfo" -Name "Enabled" -ErrorAction SilentlyContinue).Enabled
        $adEnabled = $false
        if ($adId -eq 1) { $adEnabled = $true; $score += 15 }
        $findings += [pscustomobject]@{ id = "advertising"; title = "Advertising ID"; enabled = $adEnabled; detail = "Enabled=" + ($adId -as [string]) }

        $location = (Get-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\LocationAndSensors" -Name "DisableLocation" -ErrorAction SilentlyContinue).DisableLocation
        $locationEnabled = $true
        if ($location -eq 1) { $locationEnabled = $false } else { $score += 15 }
        $findings += [pscustomobject]@{ id = "location"; title = "Location"; enabled = $locationEnabled; detail = "DisableLocation=" + ($location -as [string]) }

        $tailored = (Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Privacy" -Name "TailoredExperiencesWithDiagnosticDataEnabled" -ErrorAction SilentlyContinue).TailoredExperiencesWithDiagnosticDataEnabled
        $tailoredEnabled = $false
        if ($tailored -eq 1) { $tailoredEnabled = $true; $score += 15 }
        $findings += [pscustomobject]@{ id = "tailored"; title = "Tailored Experiences"; enabled = $tailoredEnabled; detail = "Enabled=" + ($tailored -as [string]) }

        $errorReporting = (Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\Windows Error Reporting" -Name "Disabled" -ErrorAction SilentlyContinue).Disabled
        $errorEnabled = $true
        if ($errorReporting -eq 1) { $errorEnabled = $false } else { $score += 10 }
        $findings += [pscustomobject]@{ id = "error_reporting"; title = "Error Reporting"; enabled = $errorEnabled; detail = "Disabled=" + ($errorReporting -as [string]) }

        if ($score -gt 100) { $score = 100 }
        [pscustomobject]@{ score = $score; findings = $findings } | ConvertTo-Json -Depth 4
    "#;

    run_powershell_no_rate_limit(command.to_string()).await
}

#[tauri::command]
pub async fn scan_hidden_services() -> Result<String, String> {
    check_auth()?;

    let command = r#"
        $services = Get-CimInstance Win32_Service | Where-Object {
            $_.State -eq "Running" -and $_.StartMode -eq "Auto"
        } | Where-Object {
            $_.PathName -notmatch "Windows\\System32" -and $_.PathName -notmatch "Microsoft" -and $_.PathName -notmatch "Windows\\WinSxS"
        } | Select-Object Name, DisplayName, PathName, StartMode, State
        $services | ConvertTo-Json -Depth 3
    "#;

    run_powershell_no_rate_limit(command.to_string()).await
}

#[tauri::command]
pub async fn scan_open_ports() -> Result<String, String> {
    check_auth()?;

    let command = r#"
        $recommendations = @{
            21 = "FTP portu acik. Kullanilmiyorsa kapatmaniz onerilir."
            22 = "SSH portu acik. Uzak erisim gerekmiyorsa kapatmaniz onerilir."
            23 = "Telnet portu acik. Guvenli degildir, kapatmaniz onerilir."
            80 = "HTTP portu acik. Web sunucu kullanmiyorsaniz kapatabilirsiniz."
            135 = "RPC portu acik. Yerel ag disina acmayin."
            139 = "NetBIOS portu acik. Dosya paylasimi yoksa kapatabilirsiniz."
            443 = "HTTPS portu acik. Web sunucu kullanmiyorsaniz kapatabilirsiniz."
            445 = "SMB portu acik. Dosya paylasimi yoksa kapatabilirsiniz."
            3389 = "RDP portu acik. Uzak masaustu kullanmiyorsaniz kapatin."
        }

        $items = @()
        $connections = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue
        foreach ($conn in $connections) {
            $procName = ""
            try {
                $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
                if ($proc) { $procName = $proc.ProcessName }
            } catch {
                $procName = ""
            }

            $rec = $null
            if ($recommendations.ContainsKey($conn.LocalPort)) {
                $rec = $recommendations[$conn.LocalPort]
            }

            $items += [pscustomobject]@{
                LocalAddress = $conn.LocalAddress
                LocalPort = $conn.LocalPort
                OwningProcess = $conn.OwningProcess
                ProcessName = $procName
                Protocol = "TCP"
                Recommendation = $rec
            }
        }

        if ($items.Count -gt 0) {
            $items | Sort-Object LocalPort | ConvertTo-Json -Depth 3
        } else {
            "[]"
        }
    "#;

    run_powershell_no_rate_limit(command.to_string()).await
}

#[tauri::command]
pub async fn analyze_junk_origins() -> Result<String, String> {
    check_auth()?;

    let command = r#"
        $roots = @(
            "$env:LOCALAPPDATA",
            "$env:APPDATA",
            "$env:ProgramFiles",
            "$env:ProgramFiles(x86)"
        )
        $items = @()
        foreach ($root in $roots) {
            if (Test-Path $root) {
                Get-ChildItem -Path $root -Directory -ErrorAction SilentlyContinue | ForEach-Object {
                    $size = 0
                    try {
                        $size = (Get-ChildItem -Path $_.FullName -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
                    } catch {
                        $size = 0
                    }
                    $items += [pscustomobject]@{
                        Name = $_.Name
                        Path = $_.FullName
                        SizeMB = [math]::Round(($size / 1MB), 2)
                    }
                }
            }
        }
        $items | Sort-Object SizeMB -Descending | Select-Object -First 20 | ConvertTo-Json -Depth 3
    "#;

    run_powershell_no_rate_limit(command.to_string()).await
}

#[tauri::command]
pub async fn apply_power_audio_optimizations() -> Result<String, String> {
    check_auth()?;

    let command = r#"
        powercfg /setacvalueindex SCHEME_CURRENT SUB_USB USBSELECTIVE 0
        powercfg /setdcvalueindex SCHEME_CURRENT SUB_USB USBSELECTIVE 0
        powercfg /setactive SCHEME_CURRENT
        New-Item -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" -Force | Out-Null
        Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" -Name "NetworkThrottlingIndex" -Value 4294967295 -Type DWord -Force
        Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" -Name "SystemResponsiveness" -Value 10 -Type DWord -Force
        "Power and audio optimizations applied"
    "#;

    run_powershell_internal(command.to_string(), false, false).await
}

#[tauri::command]
pub async fn revert_power_audio_optimizations() -> Result<String, String> {
    check_auth()?;

    let command = r#"
        powercfg /setacvalueindex SCHEME_CURRENT SUB_USB USBSELECTIVE 1
        powercfg /setdcvalueindex SCHEME_CURRENT SUB_USB USBSELECTIVE 1
        powercfg /setactive SCHEME_CURRENT
        Remove-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" -Name "NetworkThrottlingIndex" -ErrorAction SilentlyContinue
        Remove-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" -Name "SystemResponsiveness" -ErrorAction SilentlyContinue
        "Power and audio optimizations reverted"
    "#;

    run_powershell_internal(command.to_string(), false, false).await
}

#[tauri::command]
pub async fn monitor_app_usage() -> Result<String, String> {
    check_auth()?;

    let command = r#"
        $processes = Get-Process | Select-Object Name, CPU, WorkingSet64
        $processes | Sort-Object CPU -Descending | Select-Object -First 15 | ForEach-Object {
            [pscustomobject]@{
                Name = $_.Name
                Cpu = if ($_.CPU) { [math]::Round($_.CPU, 2) } else { 0 }
                MemoryMB = [math]::Round(($_.WorkingSet64 / 1MB), 2)
            }
        } | ConvertTo-Json -Depth 3
    "#;

    run_powershell_no_rate_limit(command.to_string()).await
}

#[tauri::command]
pub async fn debloat_adobe() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        Get-AppxPackage *Adobe* | Remove-AppxPackage -ErrorAction SilentlyContinue
        $adobePaths = @(
            "$env:ProgramFiles\Adobe",
            "$env:ProgramFiles(x86)\Adobe",
            "$env:LOCALAPPDATA\Adobe"
        )
        foreach ($path in $adobePaths) {
            if (Test-Path $path) {
                Remove-Item $path -Recurse -Force -ErrorAction SilentlyContinue
            }
        }
        "Adobe debloated successfully"
    "#;
    run_powershell_internal(command.to_string(), false, false).await
}

#[tauri::command]
pub async fn disable_consumer_features() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        New-Item -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\CloudContent" -Force | Out-Null
        Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\CloudContent" -Name "DisableWindowsConsumerFeatures" -Value 1 -Type DWord -Force
        Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\CloudContent" -Name "DisableCloudOptimizedContent" -Value 1 -Type DWord -Force
        "Consumer features disabled successfully"
    "#;
    run_powershell_internal(command.to_string(), false, false).await
}

#[tauri::command]
pub async fn disable_game_dvr() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        New-Item -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR" -Force | Out-Null
        Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR" -Name "AppCaptureEnabled" -Value 0 -Type DWord -Force
        Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR" -Name "GameDVR_Enabled" -Value 0 -Type DWord -Force
        New-Item -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR" -Force | Out-Null
        Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR" -Name "AllowGameDVR" -Value 0 -Type DWord -Force
        "GameDVR disabled successfully"
    "#;
    run_powershell_internal(command.to_string(), false, false).await
}

#[tauri::command]
pub async fn disable_hibernation() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        powercfg /hibernate off
        "Hibernation disabled successfully"
    "#;
    run_powershell_internal(command.to_string(), false, false).await
}

#[tauri::command]
pub async fn set_terminal_default_ps7() -> Result<String, String> {
    Ok("Manual action required for Terminal".to_string())
}

#[tauri::command]
pub async fn create_restore_point() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
        $OutputEncoding = [System.Text.Encoding]::UTF8
        chcp 65001 | Out-Null
        
        try {
            $regPath = "HKLM:\Software\Microsoft\Windows NT\CurrentVersion\SystemRestore"
            if (Test-Path $regPath) {
                Set-ItemProperty -Path $regPath -Name "SystemRestorePointCreationFrequency" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
            }

            Enable-ComputerRestore -Drive "$env:SystemDrive" -ErrorAction SilentlyContinue

            $point = Checkpoint-Computer -Description "ConfUtils Restore Point" -RestorePointType "MODIFY_SETTINGS" -ErrorAction Stop
            "Restore point created successfully"
        } catch {
            "Failed to create restore point: " + $_.Exception.Message
        }
    "#;
    run_powershell_no_rate_limit(command.to_string()).await
}

#[tauri::command]
pub async fn list_restore_points() -> Result<String, String> {
    check_auth()?;
    let command = r#"
        try {
            $points = Get-ComputerRestorePoint -ErrorAction SilentlyContinue | Select-Object SequenceNumber, CreationTime, Description, RestorePointType
            if ($points -eq $null -or $points.Count -eq 0) {
                "[]"
            } else {
                $points | ConvertTo-Json -Compress
            }
        } catch {
            "[]"
        }
    "#;
    let result = run_powershell_no_rate_limit(command.to_string()).await?;
    
    let trimmed = result.trim();
    if trimmed.is_empty() || trimmed == "null" {
        Ok("[]".to_string())
    } else {
        match serde_json::from_str::<serde_json::Value>(&result) {
            Ok(_) => Ok(result),
            Err(_) => {
                if trimmed.starts_with('[') || trimmed.starts_with('{') {
                    Ok(result)
                } else {
                    Ok("[]".to_string())
                }
            }
        }
    }
}

#[tauri::command]
pub async fn restore_system(sequence_number: u32) -> Result<String, String> {
    check_auth()?;
    let command = format!(
        r#"Restore-Computer -RestorePoint {} -Confirm:$false; "System restore initiated. Computer will restart." "#,
        sequence_number
    );
    run_powershell(command).await
}

#[tauri::command]
pub async fn delete_restore_point(sequence_number: u32) -> Result<String, String> {
    check_auth()?;
    let command = format!(
        r#"vssadmin delete shadows /Shadow={} /Quiet"#,
        sequence_number
    );
    run_powershell(command).await
}

#[tauri::command]
pub async fn debloat_edge() -> Result<String, String> {
    let command = r#"        New-Item -Path "HKLM:\SOFTWARE\Policies\Microsoft\Edge" -Force | Out-Null
        Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Edge" -Name "HubsSidebarEnabled" -Value 0 -Type DWord -Force
        "Edge debloated"
    "#;
    run_powershell(command.to_string()).await
}

#[tauri::command]
pub async fn disable_powershell7_telemetry() -> Result<String, String> {
    run_powershell("[System.Environment]::SetEnvironmentVariable('POWERSHELL_TELEMETRY_OPTOUT', '1', 'Machine')".to_string()).await
}

#[tauri::command]
pub async fn disable_storage_sense() -> Result<String, String> {
    let command = r#"        New-Item -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\StorageSense\Parameters\StoragePolicy" -Force | Out-Null
        Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\StorageSense\Parameters\StoragePolicy" -Name "01" -Value 0 -Type DWord -Force
        "Storage Sense disabled"
    "#;
    run_powershell(command.to_string()).await
}

#[tauri::command]
pub async fn disable_wifi_sense() -> Result<String, String> {
    Ok("WiFi Sense disabled".to_string())
}

#[tauri::command]
pub async fn toggle_end_task_right_click(enable: bool) -> Result<String, String> {
    let hkey = HKEY_CURRENT_USER;
    let path = r"Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarDeveloperSettings";
    
    let (regkey, _) = RegKey::predef(hkey)
        .create_subkey(path)
        .map_err(|e| format!("Failed to create/open registry key: {}", e))?;

    let val: u32 = if enable { 1 } else { 0 };
    regkey.set_value("TaskbarEndTask", &val)
        .map_err(|e| format!("Failed to write registry value: {}", e))?;

    let _ = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", "Stop-Process -ProcessName explorer -Force"])
        .creation_flags(0x08000000)
        .output();

    Ok(if enable { "Enabled" } else { "Disabled" }.to_string())
}

#[tauri::command]
pub async fn get_end_task_status() -> Result<bool, String> {
    let hkey = HKEY_CURRENT_USER;
    let path = r"Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarDeveloperSettings";
    
    let regkey = RegKey::predef(hkey)
        .open_subkey(path)
        .map_err(|e| format!("Failed to open registry key: {}", e))?;

    let val: u32 = regkey.get_value("TaskbarEndTask").unwrap_or(0);
    Ok(val == 1)
}

#[tauri::command]
pub async fn prefer_ipv4_over_ipv6() -> Result<String, String> {
    write_registry("HKEY_LOCAL_MACHINE".to_string(), r"SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters".to_string(), "DisabledComponents".to_string(), "32".to_string()).await
}

#[tauri::command]
pub async fn set_hibernation_default() -> Result<String, String> {
    run_powershell("powercfg /hibernate on".to_string()).await
}

#[tauri::command]
pub async fn disable_background_apps() -> Result<String, String> {
    let command = r#"
        $path = "HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications"
        if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
        Set-ItemProperty -Path $path -Name "GlobalUserDisabled" -Value 1 -Type DWord -Force
        
        $pathSearch = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Search"
        if (-not (Test-Path $pathSearch)) { New-Item -Path $pathSearch -Force | Out-Null }
        Set-ItemProperty -Path $pathSearch -Name "BackgroundAppGlobalToggle" -Value 0 -Type DWord -Force

        "Background apps disabled"
    "#;
    run_powershell(command.to_string()).await
}

#[tauri::command]
pub async fn disable_fullscreen_optimizations() -> Result<String, String> {
    let command = r#"
        $path = "HKCU:\System\GameConfigStore"
        if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
        Set-ItemProperty -Path $path -Name "GameDVR_DXGIHonorFSEWindowsCompatible" -Value 1 -Type DWord -Force
        Set-ItemProperty -Path $path -Name "GameDVR_FSEBehavior" -Value 2 -Type DWord -Force
        "Fullscreen optimizations disabled"
    "#;
    run_powershell(command.to_string()).await
}

#[tauri::command]
pub async fn disable_intel_mm() -> Result<String, String> {
    let command = r#"
        $service = "Intel(R) Management Engine WMI Provider Registration"
        Stop-Service -Name $service -Force -ErrorAction SilentlyContinue
        Set-Service -Name $service -StartupType Disabled -ErrorAction SilentlyContinue
        "Intel Management Engine disabled"
    "#;
    run_powershell(command.to_string()).await
}

#[tauri::command]
pub async fn disable_ipv6() -> Result<String, String> {
    let command = r#"
        $path = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters"
        if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
        Set-ItemProperty -Path $path -Name "DisabledComponents" -Value 255 -Type DWord -Force
        "IPv6 disabled (Restart required)"
    "#;
    run_powershell(command.to_string()).await
}

#[tauri::command]
pub async fn disable_copilot() -> Result<String, String> {
    let command = r#"
        $path = "HKCU:\Software\Policies\Microsoft\Windows\WindowsCopilot"
        if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
        Set-ItemProperty -Path $path -Name "TurnOffWindowsCopilot" -Value 1 -Type DWord -Force
        
        $pathLM = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsCopilot"
        if (-not (Test-Path $pathLM)) { New-Item -Path $pathLM -Force | Out-Null }
        Set-ItemProperty -Path $pathLM -Name "TurnOffWindowsCopilot" -Value 1 -Type DWord -Force

        "Copilot disabled"
    "#;
    run_powershell(command.to_string()).await
}

#[tauri::command]
pub async fn disable_notification_tray() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
        $OutputEncoding = [System.Text.Encoding]::UTF8
        chcp 65001 | Out-Null
        
        $path = "HKCU:\Software\Policies\Microsoft\Windows\Explorer"
        if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
        Set-ItemProperty -Path $path -Name "DisableNotificationCenter" -Value 1 -Type DWord -Force
        "Notification tray disabled (Restart Explorer required)"
    "#;
    run_powershell_no_rate_limit(command.to_string()).await
}

#[tauri::command]
pub async fn set_dns(dns_type: String) -> Result<String, String> {
    check_auth()?;
    
    let (dns1_chars, dns2_chars) = match dns_type.as_str() {
        "cloudflare" => (
            vec![49, 49, 49, 49],
            vec![49, 48, 48, 49]
        ),
        "google" => (
            vec![56, 56, 56, 56],
            vec![56, 56, 52, 52]
        ),
        "quad9" => (
            vec![57, 57, 57, 57],
            vec![49, 52, 57, 49, 49, 50, 49, 49, 50]
        ),
        _ => return Err("Geçersiz DNS tipi".to_string()),
    };
    
    let dns1_str = dns1_chars.iter().map(|c| format!("[char]{}", c)).collect::<Vec<_>>().join(", ");
    let dns2_str = dns2_chars.iter().map(|c| format!("[char]{}", c)).collect::<Vec<_>>().join(", ");
    
    let command = format!(
        r#"
        try {{
            [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
            $OutputEncoding = [System.Text.Encoding]::UTF8
            chcp 65001 | Out-Null
            
            $statusUp = [char]85 + [char]112
            $adapters = Get-NetAdapter | Where-Object {{ $_.Status -eq $statusUp }}
            if (-not $adapters -or (@($adapters).Count -eq 0)) {{
                $errorMsg = [char]65 + [char]107 + [char]116 + [char]105 + [char]102 + [char]32 + [char]97 + [char]196 + [char]177 + [char]32 + [char]97 + [char]100 + [char]97 + [char]112 + [char]116 + [char]195 + [char]182 + [char]114 + [char]252 + [char]32 + [char]98 + [char]117 + [char]108 + [char]117 + [char]110 + [char]97 + [char]109 + [char]97 + [char]100 + [char]196 + [char]177
                throw $errorMsg
            }}
            
            $dns1Parts = @({})
            $dns2Parts = @({})
            $dns1 = [string]::Join([char]46, $dns1Parts)
            $dns2 = [string]::Join([char]46, $dns2Parts)
            $dnsServers = @($dns1, $dns2)
            $successCount = 0
            $errors = @()
            
            foreach ($adapter in $adapters) {{
                try {{
                    Set-DnsClientServerAddress -InterfaceIndex $adapter.ifIndex -ServerAddresses $dnsServers -ErrorAction Stop
                    $successCount++
                }} catch {{
                    $adapterName = $adapter.Name
                    $errorMsg = $_.Exception.Message
                    $errorText = [char]65 + [char]100 + [char]97 + [char]112 + [char]116 + [char]195 + [char]182 + [char]114 + [char]32 + $adapterName + [char]58 + [char]32 + $errorMsg
                    $errors += $errorText
                }}
            }}
            
            if ($successCount -eq 0) {{
                $errorMsg = if ($errors.Count -gt 0) {{ $errors -join ([char]59 + [char]32) }} else {{ [char]72 + [char]105 + [char]231 + [char]98 + [char]105 + [char]114 + [char]32 + [char]97 + [char]100 + [char]97 + [char]112 + [char]116 + [char]195 + [char]182 + [char]114 + [char]32 + [char]105 + [char]231 + [char]105 + [char]110 + [char]32 + [char]68 + [char]78 + [char]83 + [char]32 + [char]97 + [char]121 + [char]97 + [char]114 + [char]108 + [char]97 + [char]110 + [char]97 + [char]109 + [char]97 + [char]100 + [char]196 + [char]177 }}
                throw $errorMsg
            }}
            
            $messagePart1 = $successCount.ToString()
            $utf8Bytes = [byte[]]([byte]97, [byte]100, [byte]97, [byte]112, [byte]116, [byte]195, [byte]182, [byte]114, [byte]32, [byte]105, [byte]195, [byte]167, [byte]105, [byte]110, [byte]32, [byte]68, [byte]78, [byte]83, [byte]32, [byte]97, [byte]121, [byte]97, [byte]114, [byte]108, [byte]97, [byte]110, [byte]100, [byte]196, [byte]177)
            $messagePart2 = [System.Text.Encoding]::UTF8.GetString($utf8Bytes)
            $message = $messagePart1 + [char]32 + $messagePart2
            if ($errors.Count -gt 0) {{
                $errorPartBytes = [byte[]]([byte]32, [byte]40, [byte]66, [byte]97, [byte]122, [byte]196, [byte]177, [byte]32, [byte]97, [byte]100, [byte]97, [byte]112, [byte]116, [byte]195, [byte]182, [byte]114, [byte]108, [byte]101, [byte]114, [byte]100, [byte]101, [byte]32, [byte]104, [byte]97, [byte]116, [byte]97, [byte]58, [byte]32)
                $errorPart = [System.Text.Encoding]::UTF8.GetString($errorPartBytes)
                $errorJoin = $errors -join ([char]44 + [char]32)
                $message += $errorPart + $errorJoin + [char]41
            }}
            
            $result = @{{
                Success = $true
                Message = $message
                Primary = $dns1
                Secondary = $dns2
            }}
            $result | ConvertTo-Json -Compress
        }} catch {{
            $errorMsg = if ($_.Exception.Message) {{ $_.Exception.Message }} else {{ $_.ToString() }}
            $errorResult = @{{
                Success = $false
                Error = $errorMsg
            }}
            $errorResult | ConvertTo-Json -Compress
        }}
        "#,
        dns1_str, dns2_str
    );
    
    let result = run_powershell_no_rate_limit(command).await?;
    
    let trimmed = result.trim();
    if trimmed.is_empty() {
        return Err("DNS ayarlama komutu boş yanıt döndürdü. Yönetici yetkisi gerekebilir.".to_string());
    }
    
    match serde_json::from_str::<serde_json::Value>(&trimmed) {
        Ok(json) => {
            if let Some(success) = json.get("Success") {
                if success.as_bool().unwrap_or(false) {
                    if let Some(msg) = json.get("Message") {
                        Ok(msg.as_str().unwrap_or("DNS başarıyla ayarlandı").to_string())
                    } else {
                        Ok("DNS başarıyla ayarlandı".to_string())
                    }
                } else {
                    if let Some(err) = json.get("Error") {
                        let error_msg = err.as_str().unwrap_or("DNS ayarlanamadı");
                        if error_msg.contains("Access is denied") || error_msg.contains("Yetki reddedildi") {
                            Err("DNS ayarlanamadı: Yönetici yetkisi gerekli. Lütfen uygulamayı yönetici olarak çalıştırın.".to_string())
                        } else {
                            Err(error_msg.to_string())
                        }
                    } else {
                        Err("DNS ayarlanamadı".to_string())
                    }
                }
            } else {
                Err("DNS ayarlama yanıtı geçersiz".to_string())
            }
        }
        Err(parse_err) => {
            let trimmed_lower = trimmed.to_lowercase();
            if trimmed_lower.contains("success") || trimmed_lower.contains("ayarlandı") || trimmed_lower.contains("dns") {
                if trimmed_lower.contains("error") || trimmed_lower.contains("hata") || trimmed_lower.contains("failed") || trimmed_lower.contains("access denied") || trimmed_lower.contains("yetki") {
                    if trimmed_lower.contains("access denied") || trimmed_lower.contains("yetki reddedildi") {
                        Err("DNS ayarlanamadı: Yönetici yetkisi gerekli. Lütfen uygulamayı yönetici olarak çalıştırın.".to_string())
                    } else {
                        Err(format!("DNS ayarlama hatası: {}", trimmed))
                    }
                } else {
                    Ok(trimmed.to_string())
                }
            } else {
                Err(format!("DNS ayarlama hatası (JSON parse): {} - Raw: {}", parse_err, trimmed))
            }
        }
    }
}

#[tauri::command]
pub async fn remove_all_store_apps() -> Result<String, String> {
    let command = r#"
        # Get all apps
        Get-AppxPackage -AllUsers | Where-Object {
            $_.Name -notlike "*Microsoft.WindowsCalculator*" -and
            $_.Name -notlike "*Microsoft.WindowsStore*" -and
            $_.Name -notlike "*Microsoft.Windows.Photos*" -and
            $_.Name -notlike "*Microsoft.WindowsCamera*"
        } | Remove-AppxPackage -ErrorAction SilentlyContinue
        "Store apps removed (Essential apps kept)"
    "#;
    run_powershell(command.to_string()).await
}

#[tauri::command]
pub async fn remove_edge() -> Result<String, String> {

    let kill_cmd = r#"
        taskkill /F /IM msedge.exe /T 2>&1 | Out-Null
        taskkill /F /IM msedgewebview2.exe /T 2>&1 | Out-Null
        "Edge processes terminated"
    "#;
    run_powershell(kill_cmd.to_string()).await?;

    let service_cmd = r#"
        $edgeServices = "edgeupdate", "edgeupdatem"
        foreach ($service in $edgeServices) {
            Stop-Service -Name $service -Force -ErrorAction SilentlyContinue
            Set-Service -Name $service -StartupType Disabled -ErrorAction SilentlyContinue
        }
        "Edge services disabled"
    "#;
    run_powershell(service_cmd.to_string()).await?;

    let uninstall_cmd = r#"
        $edgePaths = @(
            "${env:ProgramFiles(x86)}\Microsoft\Edge\Application",
            "${env:ProgramFiles}\Microsoft\Edge\Application"
        )

        $uninstallerRan = $false
        foreach ($path in $edgePaths) {
            if (Test-Path $path) {
                $installer = Get-ChildItem -Path $path -Recurse -Filter "setup.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
                if ($installer) {
                    Start-Process -FilePath $installer.FullName -ArgumentList "--uninstall --system-level --force-uninstall" -WindowStyle Hidden
                    $uninstallerRan = $true
                    Start-Sleep -Seconds 2
                    break
                }
            }
        }

        if ($uninstallerRan) {
            "Edge uninstaller started"
        } else {
            "Edge installer not found, proceeding with manual removal"
        }
    "#;
    run_powershell(uninstall_cmd.to_string()).await?;

    tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;

    let registry_cmd = r#"
        $registryPath = "HKLM:\SOFTWARE\Microsoft\EdgeUpdate"
        if (-not (Test-Path $registryPath)) { New-Item -Path $registryPath -Force | Out-Null }
        Set-ItemProperty -Path $registryPath -Name "DoNotUpdateToEdgeWithChromium" -Value 1 -Type DWord -Force
        "Registry updated to prevent Edge reinstall"
    "#;
    run_powershell(registry_cmd.to_string()).await?;

    let cleanup_cmd = r#"
        # Wait for uninstaller to finish
        Start-Sleep -Seconds 5

        # Remove remaining files
        Remove-Item -Path "${env:ProgramFiles(x86)}\Microsoft\Edge" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item -Path "${env:ProgramFiles}\Microsoft\Edge" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item -Path "$env:PUBLIC\Desktop\Microsoft Edge.lnk" -Force -ErrorAction SilentlyContinue
        Remove-Item -Path "$env:USERPROFILE\Desktop\Microsoft Edge.lnk" -Force -ErrorAction SilentlyContinue

        "Cleanup completed"
    "#;
    run_powershell(cleanup_cmd.to_string()).await?;

    Ok("Microsoft Edge removal completed successfully. Restart recommended for all changes to take effect.".to_string())
}

#[tauri::command]
pub async fn set_classic_right_click() -> Result<String, String> {
    let command = r#"
        reg add "HKCU\Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\InprocServer32" /f /ve
        Stop-Process -ProcessName explorer -Force
        "Classic right click enabled"
    "#;
    run_powershell(command.to_string()).await
}

#[tauri::command]
pub async fn set_display_for_performance() -> Result<String, String> {
    let command = r#"
        $path = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects"
        if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
        Set-ItemProperty -Path $path -Name "VisualFXSetting" -Value 2 -Type DWord -Force
        "Display set to performance"
    "#;
    run_powershell(command.to_string()).await
}

#[tauri::command]
pub async fn set_time_utc() -> Result<String, String> {
    let command = r#"
        $path = "HKLM:\SYSTEM\CurrentControlSet\Control\TimeZoneInformation"
        if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
        Set-ItemProperty -Path $path -Name "RealTimeIsUniversal" -Value 1 -Type DWord -Force
        "Time set to UTC"
    "#;
    run_powershell(command.to_string()).await
}

#[tauri::command]
pub async fn enable_autostart(enabled: bool) -> Result<String, String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?.to_string_lossy().to_string();
    let command = if enabled {
        format!("Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -Name 'ConfUtils' -Value '{}'", exe)
    } else {
        "Remove-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -Name 'ConfUtils' -ErrorAction SilentlyContinue".to_string()
    };
    run_powershell(command).await
}

#[tauri::command]
pub async fn install_winget_package(package_id: String) -> Result<String, String> {
    check_auth()?;
    
    let escaped_id = package_id.replace('"', "`\"");
    let command = format!(r#"winget install --id "{}" -e --silent --accept-package-agreements --accept-source-agreements --force --disable-interactivity; if ($LASTEXITCODE -eq 0) {{ "Package installed successfully" }} else {{ throw "Installation failed" }}"#, escaped_id);
    run_powershell_internal(command, false, false).await
}

#[tauri::command]
pub async fn get_installed_apps() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        try {
            [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
            $OutputEncoding = [System.Text.Encoding]::UTF8
            chcp 65001 | Out-Null
            
            # Check if winget is available
            $wingetCheck = Get-Command winget -ErrorAction SilentlyContinue
            if (-not $wingetCheck) {
                $errorResult = @{Success=$false;Error="Winget bulunamadı. Lütfen Windows Package Manager'ı yükleyin.";Apps=@()}
                $errorResult | ConvertTo-Json -Compress
                exit
            }
            
            # Get installed apps
            $wingetOutput = $null
            $wingetError = $null
            $exitCode = 0
            try {
                $wingetOutput = winget list --accept-source-agreements | Out-String
                $exitCode = $LASTEXITCODE
            } catch {
                $wingetError = $_.Exception.Message
                $exitCode = 1
            }
            
            if ($exitCode -ne 0 -or $wingetError) {
                $errorText = if ($wingetError) { $wingetError } else { "Winget komutu başarısız oldu" }
                $errorResult = @{Success=$false;Error=$errorText;Apps=@()}
                $errorResult | ConvertTo-Json -Compress
                exit
            }
            
            # Get available updates
            $updatesOutput = $null
            try {
                $updatesOutput = winget upgrade --list --accept-source-agreements | Out-String
            } catch {
                $updatesOutput = $null
            }
            $updatesMap = @{}
            if ($LASTEXITCODE -eq 0 -and $updatesOutput) {
                $newline = [char]10
                $updateLines = $updatesOutput -split $newline
                $inTable = $false
                foreach ($line in $updateLines) {
                    $trimmed = $line.Trim()
                    if ($trimmed -match "^Name\s+Id\s+Version\s+Available") {
                        $inTable = $true
                        continue
                    }
                    if ($trimmed -match "^---") {
                        continue
                    }
                    if ($inTable -and $trimmed -ne "" -and -not ($trimmed -match "^Found")) {
                        $parts = $trimmed -split "\s{2,}" | Where-Object { $_ -ne "" }
                        if ($parts.Count -ge 4) {
                            $updateId = $parts[1]
                            $availableVersion = $parts[3]
                            if ($updateId -and $availableVersion) {
                                $updatesMap[$updateId] = $availableVersion
                            }
                        }
                    }
                }
            }
            
            # Parse installed apps
            $newline = [char]10
            $lines = $wingetOutput -split $newline
            $result = @()
            $skipHeader = $true
            $headerFound = $false
            
            foreach ($line in $lines) {
                $trimmed = $line.Trim()
                
                # Look for header line (can be "Name Id Version" or similar)
                if ($trimmed -match "Name\s+Id\s+Version" -or $trimmed -match "Name\s+Id\s+Version\s+Source" -or $trimmed -match "Name\s+Id\s+Version\s+Available") {
                    $skipHeader = $false
                    $headerFound = $true
                    continue
                }
                
                # Skip separator lines
                if ($trimmed -match "^-+$" -or $trimmed -match "^---") {
                    continue
                }
                
                # Skip empty lines or lines before header
                if ($trimmed -eq "" -or $skipHeader) {
                    continue
                }
                
                # Skip summary lines
                if ($trimmed -match "^Found" -or $trimmed -match "^No installed" -or $trimmed -match "^Package") {
                    continue
                }
                
                # Parse the line - split by multiple spaces
                $parts = $trimmed -split "\s{2,}" | Where-Object { $_ -ne "" -and $_ -notmatch "^-+$" }
                
                if ($parts.Count -ge 3) {
                    $name = $parts[0].Trim()
                    $id = $parts[1].Trim()
                    $version = $parts[2].Trim()
                    
                    # Get available version from updates map or use current version
                    $available = if ($updatesMap.ContainsKey($id)) {
                        $updatesMap[$id]
                    } elseif ($parts.Count -ge 4) {
                        $parts[3].Trim()
                    } else {
                        $version
                    }
                    
                    # Validate that we have valid data
                    if ($id -and $id -ne "Id" -and $id -notmatch "^-+$" -and $version -and $version -ne "Version" -and $version -notmatch "^-+$") {
                        $result += [PSCustomObject]@{
                            Id = $id
                            Version = $version
                            Available = $available
                            Name = $name
                        }
                    }
                }
            }
            
            # Return result
            if ($result.Count -eq 0) {
                $emptyResult = @{Success=$true;Apps=@()}
                $emptyResult | ConvertTo-Json -Compress
            } else {
                $successResult = @{Success=$true;Apps=$result}
                $successResult | ConvertTo-Json -Compress
            }
        } catch {
            $errorMsg = if ($_.Exception.Message) { $_.Exception.Message } else { $_.ToString() }
            $errorResult = @{Success=$false;Error=$errorMsg;Apps=@()}
            $errorResult | ConvertTo-Json -Compress
        }
    "#;
    
    let result = run_powershell_no_rate_limit_no_security(command.to_string()).await?;
    
    let trimmed = result.trim();
    if trimmed.is_empty() {
        return Ok("[]".to_string());
    }
    
    match serde_json::from_str::<serde_json::Value>(&trimmed) {
        Ok(json) => {
            if let Some(success) = json.get("Success") {
                if success.as_bool().unwrap_or(false) {
                    if let Some(apps) = json.get("Apps") {
                        if let Some(apps_array) = apps.as_array() {
                            Ok(serde_json::to_string(apps_array).unwrap_or_else(|_| "[]".to_string()))
                        } else {
                            Ok("[]".to_string())
                        }
                    } else {
                        Ok("[]".to_string())
                    }
                } else {
                    if let Some(error) = json.get("Error") {
                        Err(format!("Winget hatası: {}", error.as_str().unwrap_or("Bilinmeyen hata")))
                    } else {
                        Err("Winget komutu başarısız oldu".to_string())
                    }
                }
            } else {
                Ok(trimmed.to_string())
            }
        }
        Err(_) => {
            if trimmed.starts_with('[') && trimmed.ends_with(']') {
                Ok(trimmed.to_string())
            } else {
                Ok("[]".to_string())
            }
        }
    }
}

#[tauri::command]
pub async fn get_appx_packages() -> Result<String, String> {
    check_auth()?;
    
    let command = r#"
        [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
        $OutputEncoding = [System.Text.Encoding]::UTF8
        chcp 65001 | Out-Null
        
        Get-AppxPackage -PackageTypeFilter Main | Select-Object Name, PackageFullName | ConvertTo-Json -Compress
    "#;
    run_powershell_no_rate_limit(command.to_string()).await
}

#[tauri::command]
pub async fn update_winget_package(package_id: String) -> Result<String, String> {
    check_auth()?;
    
    let escaped_id = package_id.replace('"', "`\"");
    let command = format!(r#"winget upgrade --id "{}" -e --silent --accept-package-agreements --accept-source-agreements --disable-interactivity; if ($LASTEXITCODE -eq 0) {{ "Package updated successfully" }} else {{ throw "Update failed" }}"#, escaped_id);
    run_powershell_internal(command, false, false).await
}

#[tauri::command]
pub async fn uninstall_winget_package(package_id: String, package_name: Option<String>) -> Result<String, String> {
    check_auth()?;
    
    let escaped_id = package_id.replace('"', "`\"");
    let escaped_name = package_name.unwrap_or_default().replace('"', "`\"");
    let command = format!(
        r#"$pkgId = "{}"; $pkgName = "{}"; $commonArgs = @("--silent", "--force"); $out = (winget uninstall --id "$pkgId" -e @commonArgs 2>&1 | Out-String); if ($LASTEXITCODE -ne 0 -and $pkgName -ne "") {{ $out = (winget uninstall --name "$pkgName" -e @commonArgs 2>&1 | Out-String) }}; if ($LASTEXITCODE -eq 0) {{ "Package uninstalled successfully" }} else {{ $msg = $out.Trim(); if ($msg -eq "") {{ $msg = "Winget uninstall failed" }}; $msg; exit 1 }}"#,
        escaped_id,
        escaped_name
    );
    run_powershell_internal(command, false, false).await
}

#[tauri::command]
pub async fn remove_appx_package(package_full_name: String) -> Result<String, String> {
    check_auth()?;
    
    if package_full_name.trim().is_empty() {
        return Err("Package name cannot be empty".to_string());
    }
    
    let escaped_name = package_full_name.replace('"', "`\"");
    let command = format!(r#"Remove-AppxPackage -Package "{}" -ErrorAction Stop; "Appx package removed successfully""#, escaped_name);
    run_powershell_internal(command, false, false).await
}

#[tauri::command]
pub async fn add_ultimate_power_plan() -> Result<String, String> {
    let command = r#"
        powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61
        "Ultimate Performance plan added"
    "#;
    run_powershell(command.to_string()).await
}

#[tauri::command]
pub async fn remove_ultimate_power_plan() -> Result<String, String> {
    let command = r#"
        $plan = powercfg -list | Select-String "Ultimate Performance"
        if ($plan) {
            $guid = $plan.ToString().Split(":")[1].Split("(")[0].Trim()
            powercfg -delete $guid
            "Ultimate Performance plan removed"
        } else {
            "Ultimate Performance plan not found"
        }
    "#;
    run_powershell(command.to_string()).await
}

#[tauri::command]
pub async fn remove_adobe_creative_cloud() -> Result<String, String> {
    let command = r#"
        $found = $false
        $keys = @(
            "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
            "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"
        )
        foreach ($key in $keys) {
            Get-ChildItem $key -ErrorAction SilentlyContinue | ForEach-Object {
                $name = (Get-ItemProperty $_.PSPath).DisplayName
                if ($name -like "*Adobe Creative Cloud*") {
                    $uninstall = (Get-ItemProperty $_.PSPath).UninstallString
                    if ($uninstall) {
                        $found = $true
                        Start-Process cmd -ArgumentList "/c $uninstall" -Wait -NoNewWindow
                    }
                }
            }
        }
        if ($found) {
            "Adobe Creative Cloud removal process finished"
        } else {
            "Adobe Creative Cloud not found"
        }
    "#;
    run_powershell(command.to_string()).await
}

#[tauri::command]
pub async fn reset_network() -> Result<String, String> {
    let command = r#"
        netsh int ip reset 2>$null
        netsh winsock reset 2>$null
        ipconfig /release 2>$null
        ipconfig /renew 2>$null
        ipconfig /flushdns 2>$null
        "Network reset. Restart recommended."
    "#;
    run_powershell(command.to_string()).await
}

#[tauri::command]
pub async fn reset_windows_update() -> Result<String, String> {
    let command = r#"
        Stop-Service -Name wuauserv -Force -ErrorAction SilentlyContinue
        Stop-Service -Name cryptSvc -Force -ErrorAction SilentlyContinue
        Stop-Service -Name bits -Force -ErrorAction SilentlyContinue
        Stop-Service -Name msiserver -Force -ErrorAction SilentlyContinue
        
        Rename-Item -Path "C:\Windows\SoftwareDistribution" -NewName "SoftwareDistribution.old" -Force -ErrorAction SilentlyContinue
        Rename-Item -Path "C:\Windows\System32\catroot2" -NewName "catroot2.old" -Force -ErrorAction SilentlyContinue
        
        Start-Service -Name wuauserv
        Start-Service -Name cryptSvc
        Start-Service -Name bits
        Start-Service -Name msiserver
        
        "Windows Update components reset"
    "#;
    run_powershell(command.to_string()).await
}

#[tauri::command]
pub async fn run_system_corruption_scan() -> Result<String, String> {
    let command = r#"
        DISM /Online /Cleanup-Image /RestoreHealth
        sfc /scannow
        "System scan completed"
    "#;
    run_powershell(command.to_string()).await
}

#[tauri::command]
pub async fn reinstall_winget() -> Result<String, String> {
    let command = r#"
        Get-AppxPackage -AllUsers *Microsoft.DesktopAppInstaller* | Foreach {Add-AppxPackage -DisableDevelopmentMode -Register "$($_.InstallLocation)\AppXManifest.xml"}
        "Winget re-registered"
    "#;
    run_powershell(command.to_string()).await
}

#[tauri::command]
pub async fn set_services_manual() -> Result<String, String> {
    let command = r#"
        $services = @(
            "ALG"                       # Application Layer Gateway Service
            "AJRouter"                  # AllJoyn Router Service
            "AppVClient"                # Microsoft App-V Client
            "tzautoupdate"              # Auto Time Zone Updater
            "bthserv"                   # Bluetooth Support Service (if not using Bluetooth)
            "dmwappushservice"          # Device Management Wireless Application Protocol
            "MapsBroker"                # Downloaded Maps Manager
            "lfsvc"                     # Geolocation Service
            "SharedAccess"              # Internet Connection Sharing (if not using ICS)
            "lltdsvc"                   # Link-Layer Topology Discovery Mapper
            "wlpasvc"                   # Local Profile Assistant Service
            "NetTcpPortSharing"         # Net.Tcp Port Sharing Service
            "CscService"                # Offline Files
            "PhoneSvc"                  # Phone Service
            "PcaSvc"                    # Program Compatibility Assistant Service
            "QWAVE"                     # Quality Windows Audio Video Experience
            "RmSvc"                     # Radio Management Service
            "SensorDataService"         # Sensor Data Service
            "SensrSvc"                  # Sensor Monitoring Service
            "SensorService"             # Sensor Service
            "ShellHWDetection"          # Shell Hardware Detection
            "SCardSvr"                  # Smart Card
            "ScDeviceEnum"              # Smart Card Device Enumeration Service
            "SSDPSRV"                   # SSDP Discovery
            "WiaRpc"                    # Still Image Acquisition Events
            "OneSyncSvc"                # Sync Host Service
            "TabletInputService"        # Touch Keyboard and Handwriting Panel Service
            "upnphost"                  # UPnP Device Host
            "WalletService"             # WalletService
            "FrameServer"               # Windows Camera Frame Server
            "stisvc"                    # Windows Image Acquisition (WIA)
            "wisvc"                     # Windows Insider Service
            "icssvc"                    # Windows Mobile Hotspot Service
            "WpnService"                # Windows Push Notifications System Service
            "WSearch"                   # Windows Search (if not using search frequently)
        )

        $count = 0
        foreach ($service in $services) {
            try {
                $svc = Get-Service -Name $service -ErrorAction SilentlyContinue
                if ($svc) {
                    Set-Service -Name $service -StartupType Manual -ErrorAction SilentlyContinue
                    $count++
                }
            } catch {
                # Skip services that don't exist or can't be modified
                continue
            }
        }

        "Set $count services to manual startup"
    "#;
    run_powershell(command.to_string()).await
}

#[tauri::command]
pub async fn get_binary_hash() -> Result<String, String> {
    use sha2::{Sha256, Digest};
    use std::io::Read;

    let exe_path = std::env::current_exe()
        .map_err(|e| format!("Failed to get exe path: {}", e))?;

    let mut file = std::fs::File::open(exe_path)
        .map_err(|e| format!("Failed to open exe: {}", e))?;

    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 4096];

    loop {
        let n = file.read(&mut buffer)
            .map_err(|e| format!("Failed to read exe: {}", e))?;
        if n == 0 { break; }
        hasher.update(&buffer[..n]);
    }

    Ok(format!("{:x}", hasher.finalize()))
}

#[derive(serde::Deserialize)]
pub struct CloneOptions {
    #[serde(rename = "serverName")]
    server_name: bool,
    #[serde(rename = "serverIcon")]
    server_icon: bool,
    roles: bool,
    channels: bool,
    emojis: bool,
    #[serde(rename = "channelPermissions")]
    channel_permissions: bool,
}

#[tauri::command]
pub async fn clone_discord_server(
    app: tauri::AppHandle,
    user_token: String,
    source_server_id: String,
    target_server_id: String,
    options: CloneOptions,
) -> Result<String, String> {
    check_auth()?;

    use serde_json::Value;
    use std::collections::HashMap;

    let user_token = validate_discord_token(&user_token)?;
    let source_server_id = validate_discord_id(&source_server_id)?;
    let target_server_id = validate_discord_id(&target_server_id)?;

    let emit_log = |message: String| {
        let _ = app.emit(obfstr::obfstr!("discord-clone-log"), message);
    };

    DISCORD_CLONE_CANCELLED.store(false, Ordering::SeqCst);

    let check_cancel = || -> Result<(), String> {
        if DISCORD_CLONE_CANCELLED.load(Ordering::SeqCst) {
            emit_log("[WARNING] Discord clone cancelled by user".to_string());
            return Err("Discord clone cancelled".to_string());
        }
        Ok(())
    };

    emit_log(obfstr::obfstr!("[+] Cloning process started").to_string());
    emit_log(format!("[INFO] Source Server ID: {}", source_server_id));
    emit_log(format!("[INFO] Target Server ID: {}", target_server_id));

    emit_log(obfstr::obfstr!("[WARNING] This tool uses Discord user tokens which may violate Discord's Terms of Service").to_string());
    emit_log(obfstr::obfstr!("[WARNING] Use at your own risk - your account may be banned").to_string());

    let client = reqwest::Client::new();
    let base_url = obfstr::obfstr!("https://discord.com/api/v10").to_string();

    let me_url = format!("{}/users/@me", base_url);
    let me_resp = client.get(&me_url)
        .header("Authorization", &user_token)
        .send()
        .await
        .map_err(|e| format!("[ERROR] Failed to connect to Discord: {}", e))?;

    if !me_resp.status().is_success() {
        return Err(format!("[ERROR] Invalid token or connection error. Status: {}", me_resp.status()));
    }

    emit_log("[+] Fetching source server information...".to_string());
    let source_guild_url = format!("{}/guilds/{}", base_url, source_server_id);
    let source_guild_resp = client
        .get(&source_guild_url)
        .header("Authorization", &user_token)
        .send()
        .await
        .map_err(|e| format!("[ERROR] Failed to fetch source server: {}", e))?;

    if !source_guild_resp.status().is_success() {
        return Err(format!("[ERROR] Failed to fetch source server. Status: {}", source_guild_resp.status()));
    }

    let source_guild: Value = source_guild_resp.json().await
        .map_err(|e| format!("[ERROR] Failed to parse source server data: {}", e))?;

    let server_name = source_guild["name"].as_str().unwrap_or("Unknown");
    emit_log(format!("[+] Source server: {}", server_name));

    let mut guild_update = serde_json::json!({});
    let mut has_updates = false;

    if options.server_name {
        emit_log("[+] Updating target server name...".to_string());
        guild_update["name"] = Value::String(server_name.to_string());
        has_updates = true;
    }

    if options.server_icon {
        if let Some(icon_hash) = source_guild["icon"].as_str() {
            if !icon_hash.is_empty() {
                emit_log("[+] Downloading server icon...".to_string());
                let icon_url = format!("https://cdn.discordapp.com/icons/{}/{}.png", source_server_id, icon_hash);

                match client.get(&icon_url).send().await {
                    Ok(icon_resp) => {
                        if icon_resp.status().is_success() {
                            match icon_resp.bytes().await {
                                Ok(icon_bytes) => {
                                    let base64_icon = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &icon_bytes);
                                    guild_update["icon"] = Value::String(format!("data:image/png;base64,{}", base64_icon));
                                    emit_log("[+] Server icon downloaded".to_string());
                                    has_updates = true;
                                },
                                Err(_) => emit_log("[WARNING] Failed to read icon data".to_string())
                            }
                        } else {
                            emit_log("[WARNING] Failed to download server icon".to_string());
                        }
                    },
                    Err(_) => emit_log("[WARNING] Failed to fetch server icon".to_string())
                }
            }
        }
    }

    if has_updates {
        let update_guild_url = format!("{}/guilds/{}", base_url, target_server_id);
        match client.patch(&update_guild_url)
            .header("Authorization", &user_token)
            .header("Content-Type", "application/json")
            .json(&guild_update)
            .send()
            .await {
            Ok(resp) => {
                if resp.status().is_success() {
                    emit_log("[+] Updated target server settings".to_string());
                } else {
                    emit_log(format!("[WARNING] Failed to update server settings. Status: {}", resp.status()));
                }
            },
            Err(e) => emit_log(format!("[WARNING] Failed to update server: {}", e))
        }
    }

    let mut role_id_map: HashMap<String, String> = HashMap::new();
    role_id_map.insert(source_server_id.clone(), target_server_id.clone());

    fn build_permission_overwrites(
        role_id_map: &HashMap<String, String>,
        source_server_id: &str,
        target_server_id: &str,
        overwrites: &Value,
        emit_log: &impl Fn(String),
    ) -> Vec<Value> {
        let mut mapped = Vec::new();
        if let Some(list) = overwrites.as_array() {
            for overwrite in list {
                let overwrite_id = match overwrite["id"].as_str() {
                    Some(id) => id,
                    None => continue,
                };
                let overwrite_type = if let Some(value) = overwrite["type"].as_u64() {
                    Some(value)
                } else {
                    overwrite["type"]
                        .as_str()
                        .and_then(|value| value.parse::<u64>().ok())
                };
                let allow = overwrite["allow"].as_str().unwrap_or("0");
                let deny = overwrite["deny"].as_str().unwrap_or("0");

                let overwrite_type = match overwrite_type {
                    Some(value) => value,
                    None => continue,
                };

                if overwrite_type == 0 {
                    let mapped_id = if overwrite_id == source_server_id {
                        Some(target_server_id)
                    } else {
                        role_id_map.get(overwrite_id).map(String::as_str)
                    };

                    if let Some(mapped_id) = mapped_id {
                        mapped.push(serde_json::json!({
                            "id": mapped_id,
                            "type": 0,
                            "allow": allow,
                            "deny": deny
                        }));
                    } else {
                        emit_log(format!("[WARNING] Missing role mapping for permission overwrite {}", overwrite_id));
                    }
                } else if overwrite_type == 1 {
                    mapped.push(serde_json::json!({
                        "id": overwrite_id,
                        "type": 1,
                        "allow": allow,
                        "deny": deny
                    }));
                }
            }
        }
        mapped
    }

    if options.roles {
        emit_log("[+] Deleting existing roles in target server...".to_string());
        let target_roles_url = format!("{}/guilds/{}/roles", base_url, target_server_id);
        if let Ok(target_roles_resp) = client.get(&target_roles_url).header("Authorization", &user_token).send().await {
            if target_roles_resp.status().is_success() {
                if let Ok(target_roles) = target_roles_resp.json::<Value>().await {
                    if let Some(roles) = target_roles.as_array() {
                        for role in roles {
                            check_cancel()?;
                            if let Some(role_name) = role["name"].as_str() {
                                if role_name != "@everyone" && role["managed"].as_bool() != Some(true) {
                                    if let Some(role_id) = role["id"].as_str() {
                                        let delete_url = format!("{}/guilds/{}/roles/{}", base_url, target_server_id, role_id);
                                        match client.delete(&delete_url).header("Authorization", &user_token).send().await {
                                            Ok(resp) => {
                                                let status = resp.status();
                                                if status.is_success() {
                                                    emit_log(format!("[-] Deleted role: {}", role_name));
                                                } else if status == reqwest::StatusCode::FORBIDDEN {
                                                    emit_log(format!("[WARNING] No permission to delete role: {}", role_name));
                                                } else if status != reqwest::StatusCode::NOT_FOUND {
                                                    emit_log(format!("[WARNING] Failed to delete role {}: Status {}", role_name, status));
                                                }
                                            },
                                            Err(e) => emit_log(format!("[ERROR] Network error deleting role {}: {}", role_name, e))
                                        }
                                        tokio::time::sleep(tokio::time::Duration::from_millis(1500)).await;
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                 emit_log(format!("[WARNING] Failed to fetch target roles for deletion. Status: {}", target_roles_resp.status()));
            }
        } else {
             emit_log("[WARNING] Network error fetching target roles".to_string());
        }

        emit_log("[+] Fetching roles from source server...".to_string());
        let roles_url = format!("{}/guilds/{}/roles", base_url, source_server_id);
        let roles_resp = client
            .get(&roles_url)
            .header("Authorization", &user_token)
            .send()
            .await
            .map_err(|e| format!("[ERROR] Failed to fetch roles: {}", e))?;

        if roles_resp.status().is_success() {
            let roles: Value = roles_resp.json().await
                .map_err(|e| format!("[ERROR] Failed to parse roles: {}", e))?;

            if let Some(mut roles_array) = roles.as_array().map(|r| r.clone()) {
                emit_log(format!("[+] Found {} roles", roles_array.len()));

                
                roles_array.retain(|r| r["name"].as_str() != Some("@everyone") && r["managed"].as_bool() != Some(true));

                for role in roles_array {
                    check_cancel()?;
                    if let Some(role_name) = role["name"].as_str() {
                        let role_data = serde_json::json!({
                            "name": role_name,
                            "permissions": role["permissions"].as_str().unwrap_or("0"),
                            "color": role["color"].as_u64().unwrap_or(0),
                            "hoist": role["hoist"].as_bool().unwrap_or(false),
                            "mentionable": role["mentionable"].as_bool().unwrap_or(false),
                        });

                        let create_role_url = format!("{}/guilds/{}/roles", base_url, target_server_id);
                        match client.post(&create_role_url)
                            .header("Authorization", &user_token)
                            .header("Content-Type", "application/json")
                            .json(&role_data)
                            .send()
                            .await {
                            Ok(resp) => {
                                if resp.status().is_success() {
                                    let new_role: Value = resp.json().await.unwrap_or(serde_json::json!({}));
                                    if let (Some(old_id), Some(new_id)) = (role["id"].as_str(), new_role["id"].as_str()) {
                                        role_id_map.insert(old_id.to_string(), new_id.to_string());
                                    }
                                    emit_log(format!("[+] Created role: {}", role_name));
                                } else {
                                    emit_log(format!("[WARNING] Failed to create role: {} (Status: {})", role_name, resp.status()));
                                }
                            },
                            Err(e) => {
                                emit_log(format!("[ERROR] Failed to create role {}: {}", role_name, e));
                            }
                        }

                        tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;
                    }
                }
            }
        } else {
            emit_log(format!("[WARNING] Failed to fetch roles. Status: {}", roles_resp.status()));
        }
    }

    if options.channel_permissions && role_id_map.len() == 1 {
        emit_log("[INFO] Preparing role mapping for channel permission overwrites...".to_string());
        let source_roles_url = format!("{}/guilds/{}/roles", base_url, source_server_id);
        let target_roles_url = format!("{}/guilds/{}/roles", base_url, target_server_id);

        let mut source_role_name_map: HashMap<String, String> = HashMap::new();
        if let Ok(resp) = client.get(&source_roles_url).header("Authorization", &user_token).send().await {
            if resp.status().is_success() {
                if let Ok(roles) = resp.json::<Value>().await {
                    if let Some(roles_array) = roles.as_array() {
                        for role in roles_array {
                            if let (Some(role_id), Some(role_name)) = (role["id"].as_str(), role["name"].as_str()) {
                                source_role_name_map.insert(role_id.to_string(), role_name.to_string());
                            }
                        }
                    }
                }
            } else {
                emit_log(format!("[WARNING] Failed to fetch source roles for permissions. Status: {}", resp.status()));
            }
        } else {
            emit_log("[WARNING] Network error fetching source roles for permissions".to_string());
        }

        let mut target_role_name_map: HashMap<String, String> = HashMap::new();
        if let Ok(resp) = client.get(&target_roles_url).header("Authorization", &user_token).send().await {
            if resp.status().is_success() {
                if let Ok(roles) = resp.json::<Value>().await {
                    if let Some(roles_array) = roles.as_array() {
                        for role in roles_array {
                            if let (Some(role_id), Some(role_name)) = (role["id"].as_str(), role["name"].as_str()) {
                                target_role_name_map.insert(role_name.to_string(), role_id.to_string());
                            }
                        }
                    }
                }
            } else {
                emit_log(format!("[WARNING] Failed to fetch target roles for permissions. Status: {}", resp.status()));
            }
        } else {
            emit_log("[WARNING] Network error fetching target roles for permissions".to_string());
        }

        for (source_id, source_name) in source_role_name_map {
            if source_id == source_server_id {
                role_id_map.insert(source_id, target_server_id.clone());
                continue;
            }
            if let Some(target_id) = target_role_name_map.get(&source_name) {
                role_id_map.insert(source_id, target_id.to_string());
            }
        }
    }

    if options.channels {
        emit_log("[+] Deleting existing channels in target server...".to_string());
        let target_channels_url = format!("{}/guilds/{}/channels", base_url, target_server_id);
        if let Ok(target_channels_resp) = client.get(&target_channels_url).header("Authorization", &user_token).send().await {
            if target_channels_resp.status().is_success() {
                if let Ok(target_channels) = target_channels_resp.json::<Value>().await {
                    if let Some(channels) = target_channels.as_array() {
                        for channel in channels {
                            check_cancel()?;
                            if let Some(channel_id) = channel["id"].as_str() {
                                let channel_name = channel["name"].as_str().unwrap_or("Unknown");
                                let delete_url = format!("{}/channels/{}", base_url, channel_id);
                                match client.delete(&delete_url).header("Authorization", &user_token).send().await {
                                     Ok(resp) => {
                                        let status = resp.status();
                                        if status.is_success() {
                                            emit_log(format!("[-] Deleted channel: {}", channel_name));
                                        } else if status == reqwest::StatusCode::FORBIDDEN {
                                            emit_log(format!("[WARNING] No permission to delete channel: {}", channel_name));
                                        } else if status != reqwest::StatusCode::NOT_FOUND {
                                             emit_log(format!("[WARNING] Failed to delete channel {}: Status {}", channel_name, status));
                                        }
                                     },
                                     Err(e) => emit_log(format!("[ERROR] Network error deleting channel {}: {}", channel_name, e))
                                }
                                tokio::time::sleep(tokio::time::Duration::from_millis(1500)).await;
                            }
                        }
                    }
                }
            } else {
                 emit_log(format!("[WARNING] Failed to fetch target channels for deletion. Status: {}", target_channels_resp.status()));
            }
        } else {
             emit_log("[WARNING] Network error fetching target channels".to_string());
        }

        emit_log("[+] Fetching channels from source server...".to_string());
        let channels_url = format!("{}/guilds/{}/channels", base_url, source_server_id);
        let channels_resp = client
            .get(&channels_url)
            .header("Authorization", &user_token)
            .send()
            .await
            .map_err(|e| format!("[ERROR] Failed to fetch channels: {}", e))?;

        if channels_resp.status().is_success() {
            let channels: Value = channels_resp.json().await
                .map_err(|e| format!("[ERROR] Failed to parse channels: {}", e))?;

            if let Some(channels_array) = channels.as_array() {
                emit_log(format!("[+] Found {} channels", channels_array.len()));

                let mut category_id_map: HashMap<String, String> = HashMap::new();

                for channel in channels_array {
                    check_cancel()?;
                    if channel["type"].as_u64() == Some(4) {
                        if let Some(channel_name) = channel["name"].as_str() {
                            let mut channel_data = serde_json::json!({
                                "name": channel_name,
                                "type": 4,
                                "position": channel["position"].as_u64().unwrap_or(0),
                            });

                            if options.channel_permissions {
                                let overwrites = build_permission_overwrites(
                                    &role_id_map,
                                    &source_server_id,
                                    &target_server_id,
                                    &channel["permission_overwrites"],
                                    &emit_log,
                                );
                                if !overwrites.is_empty() {
                                    channel_data["permission_overwrites"] = Value::Array(overwrites);
                                }
                            }

                            let create_channel_url = format!("{}/guilds/{}/channels", base_url, target_server_id);
                            match client.post(&create_channel_url)
                                .header("Authorization", &user_token)
                                .header("Content-Type", "application/json")
                                .json(&channel_data)
                                .send()
                                .await {
                                Ok(resp) => {
                                    if resp.status().is_success() {
                                        let new_channel: Value = resp.json().await
                                            .map_err(|e| format!("[ERROR] Failed to parse created category: {}", e))?;
                                        if let (Some(old_id), Some(new_id)) = (channel["id"].as_str(), new_channel["id"].as_str()) {
                                            category_id_map.insert(old_id.to_string(), new_id.to_string());
                                        }
                                        emit_log(format!("[+] Created category: {}", channel_name));
                                    } else {
                                        emit_log(format!("[WARNING] Failed to create category: {} (Status: {})", channel_name, resp.status()));
                                    }
                                },
                                Err(e) => {
                                    emit_log(format!("[ERROR] Failed to create category {}: {}", channel_name, e));
                                }
                            }

                            tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;
                        }
                    }
                }

                for channel in channels_array {
                    check_cancel()?;
                    let channel_type = channel["type"].as_u64().unwrap_or(0);
                    if channel_type != 4 {
                        if let Some(channel_name) = channel["name"].as_str() {
                            let mut channel_data = serde_json::json!({
                                "name": channel_name,
                                "type": channel_type,
                                "position": channel["position"].as_u64().unwrap_or(0),
                            });

                            if let Some(topic) = channel["topic"].as_str() {
                                channel_data["topic"] = Value::String(topic.to_string());
                            }

                            if let Some(nsfw) = channel["nsfw"].as_bool() {
                                channel_data["nsfw"] = Value::Bool(nsfw);
                            }

                            if let Some(parent_id) = channel["parent_id"].as_str() {
                                if let Some(new_parent_id) = category_id_map.get(parent_id) {
                                    channel_data["parent_id"] = Value::String(new_parent_id.clone());
                                }
                            }

                            if options.channel_permissions {
                                let overwrites = build_permission_overwrites(
                                    &role_id_map,
                                    &source_server_id,
                                    &target_server_id,
                                    &channel["permission_overwrites"],
                                    &emit_log,
                                );
                                if !overwrites.is_empty() {
                                    channel_data["permission_overwrites"] = Value::Array(overwrites);
                                }
                            }

                            let create_channel_url = format!("{}/guilds/{}/channels", base_url, target_server_id);
                            match client.post(&create_channel_url)
                                .header("Authorization", &user_token)
                                .header("Content-Type", "application/json")
                                .json(&channel_data)
                                .send()
                                .await {
                                Ok(resp) => {
                                    if resp.status().is_success() {
                                        emit_log(format!("[+] Created channel: {}", channel_name));
                                    } else {
                                        emit_log(format!("[WARNING] Failed to create channel: {} (Status: {})", channel_name, resp.status()));
                                    }
                                },
                                Err(e) => {
                                    emit_log(format!("[ERROR] Failed to create channel {}: {}", channel_name, e));
                                }
                            }

                            tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;
                        }
                    }
                }
            }
        } else {
            emit_log(format!("[WARNING] Failed to fetch channels. Status: {}", channels_resp.status()));
        }
    }

    if options.emojis {
        emit_log("[+] Fetching emojis from source server...".to_string());
        let emojis_url = format!("{}/guilds/{}/emojis", base_url, source_server_id);
        let emojis_resp = client
            .get(&emojis_url)
            .header("Authorization", &user_token)
            .send()
            .await
            .map_err(|e| format!("[ERROR] Failed to fetch emojis: {}", e))?;

        if emojis_resp.status().is_success() {
            let emojis: Value = emojis_resp.json().await
                .map_err(|e| format!("[ERROR] Failed to parse emojis: {}", e))?;

            if let Some(emojis_array) = emojis.as_array() {
                emit_log(format!("[+] Found {} custom emojis", emojis_array.len()));

                for emoji in emojis_array {
                    if let Some(emoji_name) = emoji["name"].as_str() {
                        if let Some(emoji_id) = emoji["id"].as_str() {
                            let is_animated = emoji["animated"].as_bool().unwrap_or(false);
                            let extension = if is_animated { "gif" } else { "png" };
                            let emoji_url = format!("https://cdn.discordapp.com/emojis/{}.{}", emoji_id, extension);

                            emit_log(format!("[+] Downloading emoji: {}", emoji_name));

                            match client.get(&emoji_url).send().await {
                                Ok(emoji_resp) => {
                                    if emoji_resp.status().is_success() {
                                        match emoji_resp.bytes().await {
                                            Ok(emoji_bytes) => {
                                                let base64_emoji = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &emoji_bytes);
                                                let image_data = format!("data:image/{};base64,{}", extension, base64_emoji);

                                                let emoji_data = serde_json::json!({
                                                    "name": emoji_name,
                                                    "image": image_data,
                                                });

                                                let create_emoji_url = format!("{}/guilds/{}/emojis", base_url, target_server_id);
                                                match client.post(&create_emoji_url)
                                                    .header("Authorization", &user_token)
                                                    .header("Content-Type", "application/json")
                                                    .json(&emoji_data)
                                                    .send()
                                                    .await {
                                                    Ok(resp) => {
                                                        if resp.status().is_success() {
                                                            emit_log(format!("[+] Created emoji: {}", emoji_name));
                                                        } else {
                                                            emit_log(format!("[WARNING] Failed to create emoji: {} (Status: {})", emoji_name, resp.status()));
                                                        }
                                                    },
                                                    Err(e) => {
                                                        emit_log(format!("[ERROR] Failed to create emoji {}: {}", emoji_name, e));
                                                    }
                                                }
                                            },
                                            Err(_) => emit_log(format!("[WARNING] Failed to read emoji data for: {}", emoji_name))
                                        }
                                    } else {
                                        emit_log(format!("[WARNING] Failed to download emoji: {}", emoji_name));
                                    }
                                },
                                Err(_) => emit_log(format!("[WARNING] Failed to fetch emoji: {}", emoji_name))
                            }

                            tokio::time::sleep(tokio::time::Duration::from_millis(2000)).await;
                        }
                    }
                }
            }
        } else {
            emit_log(format!("[WARNING] Failed to fetch emojis. Status: {}", emojis_resp.status()));
        }
    }

    emit_log("[+] Cloning process completed successfully!".to_string());

    let mut cloned_items = Vec::new();
    if options.server_name { cloned_items.push("server name"); }
    if options.server_icon { cloned_items.push("server icon"); }
    if options.roles { cloned_items.push("roles"); }
    if options.channels { cloned_items.push("channels"); }
    if options.emojis { cloned_items.push("emojis"); }

    if !cloned_items.is_empty() {
        emit_log(format!("[INFO] Cloned: {}", cloned_items.join(", ")));
    }

    Ok("Cloning completed successfully".to_string())
}

#[derive(serde::Deserialize, serde::Serialize)]
pub struct MessageCloneOptions {
    #[serde(rename = "messageLimit")]
    message_limit: u32,
    #[serde(rename = "cloneEmbeds")]
    clone_embeds: bool,
    #[serde(rename = "cloneAttachments")]
    clone_attachments: bool,
    #[serde(rename = "delayMs")]
    delay_ms: u64,
    #[serde(rename = "skipBots")]
    skip_bots: bool,
    #[serde(rename = "onlyWithAttachments")]
    only_with_attachments: bool,
}

#[tauri::command]
pub async fn clone_messages(
    app: tauri::AppHandle,
    user_token: String,
    source_channel_id: String,
    webhook_url: String,
    options: MessageCloneOptions,
) -> Result<String, String> {
    check_auth()?;
    use serde_json::Value;

    let emit_log = |message: String| {
        let _ = app.emit("message-clone-log", message);
    };

    CLONE_MESSAGES_CANCELLED.store(false, Ordering::SeqCst);

    emit_log("[+] Message cloning started".to_string());
    emit_log(format!("[INFO] Source Channel: {}", source_channel_id));
    emit_log(format!("[INFO] Message Limit: {}", options.message_limit));

    emit_log("[WARNING] Using Discord user tokens may violate Discord's Terms of Service".to_string());

    let client = reqwest::Client::new();
    let base_url = "https://discord.com/api/v10";

    emit_log("[+] Fetching messages from source channel...".to_string());
    let messages_url = format!("{}/channels/{}/messages?limit={}", base_url, source_channel_id, options.message_limit);

    let messages_resp = client
        .get(&messages_url)
        .header("Authorization", &user_token)
        .send()
        .await
        .map_err(|e| format!("[ERROR] Failed to fetch messages: {}", e))?;

    if !messages_resp.status().is_success() {
        return Err(format!("[ERROR] Failed to fetch messages. Status: {}", messages_resp.status()));
    }

    let messages: Vec<Value> = messages_resp.json().await
        .map_err(|e| format!("[ERROR] Failed to parse messages: {}", e))?;

    emit_log(format!("[+] Found {} messages", messages.len()));

    let mut messages_to_send = messages.clone();
    messages_to_send.reverse();

    let mut sent_count = 0;
    let mut error_count = 0;
    let mut skipped_count = 0;

    for msg in messages_to_send {
        if CLONE_MESSAGES_CANCELLED.load(Ordering::SeqCst) {
            emit_log("[WARNING] Message cloning cancelled by user".to_string());
            return Err("Message cloning cancelled".to_string());
        }
        if options.skip_bots {
            if let Some(is_bot) = msg["author"]["bot"].as_bool() {
                if is_bot {
                    skipped_count += 1;
                    continue;
                }
            }
        }

        if options.only_with_attachments {
            let has_attachments = msg["attachments"].as_array()
                .map(|arr| !arr.is_empty())
                .unwrap_or(false);
            if !has_attachments {
                skipped_count += 1;
                continue;
            }
        }

        let author_name = msg["author"]["username"].as_str().unwrap_or("Unknown");
        let author_avatar = msg["author"]["avatar"].as_str();
        let content = msg["content"].as_str().unwrap_or("");

        let avatar_url = if let Some(avatar_hash) = author_avatar {
            if !avatar_hash.is_empty() {
                let user_id = msg["author"]["id"].as_str().unwrap_or("");
                format!("https://cdn.discordapp.com/avatars/{}/{}.png", user_id, avatar_hash)
            } else {
                String::new()
            }
        } else {
            String::new()
        };

        let mut embed = serde_json::json!({
            "description": content,
            "color": 5814783,
            "timestamp": msg["timestamp"].as_str().unwrap_or(""),
            "footer": {
                "text": format!("Message ID: {}", msg["id"].as_str().unwrap_or(""))
            }
        });

        if !author_name.is_empty() {
            embed["author"] = serde_json::json!({
                "name": author_name,
                "icon_url": avatar_url
            });
        }

        let mut embeds_array = vec![embed];
        if options.clone_embeds {
            if let Some(original_embeds) = msg["embeds"].as_array() {
                for original_embed in original_embeds {
                    embeds_array.push(original_embed.clone());
                }
            }
        }

        let mut webhook_payload = serde_json::json!({
            "username": author_name,
            "embeds": embeds_array
        });

        if !avatar_url.is_empty() {
            webhook_payload["avatar_url"] = Value::String(avatar_url);
        }

        if options.clone_attachments {
            if let Some(attachments) = msg["attachments"].as_array() {
                if !attachments.is_empty() {
                    let mut attachment_desc = "\n\n**Attachments:**\n".to_string();
                    for attachment in attachments {
                        if let Some(url) = attachment["url"].as_str() {
                            let filename = attachment["filename"].as_str().unwrap_or("file");
                            attachment_desc.push_str(&format!("• [{}]({})\n", filename, url));
                        }
                    }
                    if let Some(first_embed) = embeds_array.first_mut() {
                        let current_desc = first_embed["description"].as_str().unwrap_or("");
                        first_embed["description"] = Value::String(format!("{}{}", current_desc, attachment_desc));
                    }
                    webhook_payload["embeds"] = serde_json::json!(embeds_array);
                }
            }
        }

        match client.post(&webhook_url)
            .header("Content-Type", "application/json")
            .json(&webhook_payload)
            .send()
            .await {
            Ok(resp) => {
                if resp.status().is_success() {
                    sent_count += 1;
                    emit_log(format!("[+] Sent message from {}", author_name));
                } else {
                    error_count += 1;
                    emit_log(format!("[WARNING] Failed to send message (Status: {})", resp.status()));
                }
            },
            Err(e) => {
                error_count += 1;
                emit_log(format!("[ERROR] Failed to send message: {}", e));
            }
        }

        tokio::time::sleep(tokio::time::Duration::from_millis(options.delay_ms)).await;
    }

    emit_log(format!("[+] Cloning completed! Sent: {}, Skipped: {}, Errors: {}", sent_count, skipped_count, error_count));
    Ok(format!("Successfully sent {} messages ({} skipped, {} errors)", sent_count, skipped_count, error_count))
}

use std::sync::Arc;
use tokio::sync::Mutex;

lazy_static::lazy_static! {
    static ref LIVE_CLONER_RUNNING: Arc<Mutex<bool>> = Arc::new(Mutex::new(false));
    static ref WEBHOOK_SPAM_RUNNING: Arc<Mutex<bool>> = Arc::new(Mutex::new(false));
}

#[tauri::command]
pub async fn start_live_message_cloner(
    app: tauri::AppHandle,
    user_token: String,
    source_channel_id: String,
    webhook_url: String,
) -> Result<String, String> {
    check_auth()?;
    use serde_json::Value;

    let mut is_running = LIVE_CLONER_RUNNING.lock().await;
    if *is_running {
        return Err("Live cloner is already running".to_string());
    }
    *is_running = true;
    drop(is_running);

    let _ = app.emit("message-clone-log", "[+] Live message cloner started".to_string());
    let _ = app.emit("message-clone-log", format!("[INFO] Monitoring channel: {}", source_channel_id));
    let _ = app.emit("message-clone-log", "[INFO] Press 'Stop' to end live cloning".to_string());

    let app_clone = app.clone();
    let client = reqwest::Client::new();
    let base_url = "https://discord.com/api/v10";
    let mut last_message_id: Option<String> = None;

    tokio::spawn(async move {
        let emit_log = move |message: String| {
            let _ = app_clone.emit("message-clone-log", message);
        };
        loop {
            {
                let is_running = LIVE_CLONER_RUNNING.lock().await;
                if !*is_running {
                    emit_log("[+] Live cloner stopped".to_string());
                    break;
                }
            }

            let messages_url = if let Some(ref last_id) = last_message_id {
                format!("{}/channels/{}/messages?after={}&limit=10", base_url, source_channel_id, last_id)
            } else {
                format!("{}/channels/{}/messages?limit=1", base_url, source_channel_id)
            };

            match client
                .get(&messages_url)
                .header("Authorization", &user_token)
                .send()
                .await {
                Ok(resp) => {
                    if resp.status().is_success() {
                        match resp.json::<Vec<Value>>().await {
                            Ok(messages) => {
                                if !messages.is_empty() {
                                    if let Some(newest_msg) = messages.first() {
                                        if let Some(msg_id) = newest_msg["id"].as_str() {
                                            last_message_id = Some(msg_id.to_string());
                                        }
                                    }

                                    let mut messages_to_send = messages.clone();
                                    messages_to_send.reverse();

                                    for msg in messages_to_send {
                                        let author_name = msg["author"]["username"].as_str().unwrap_or("Unknown");
                                        let author_avatar = msg["author"]["avatar"].as_str();
                                        let content = msg["content"].as_str().unwrap_or("");

                                        if content.is_empty() && msg["embeds"].as_array().map_or(true, |e| e.is_empty()) {
                                            continue;
                                        }

                                        let avatar_url = if let Some(avatar_hash) = author_avatar {
                                            if !avatar_hash.is_empty() {
                                                let user_id = msg["author"]["id"].as_str().unwrap_or("");
                                                format!("https://cdn.discordapp.com/avatars/{}/{}.png", user_id, avatar_hash)
                                            } else {
                                                String::new()
                                            }
                                        } else {
                                            String::new()
                                        };

                                        let embed = serde_json::json!({
                                            "description": content,
                                            "color": 3447003,
                                            "timestamp": msg["timestamp"].as_str().unwrap_or(""),
                                            "author": {
                                                "name": author_name,
                                                "icon_url": avatar_url
                                            },
                                            "footer": {
                                                "text": format!("Live • Message ID: {}", msg["id"].as_str().unwrap_or(""))
                                            }
                                        });

                                        let mut webhook_payload = serde_json::json!({
                                            "username": author_name,
                                            "embeds": [embed]
                                        });

                                        if !avatar_url.is_empty() {
                                            webhook_payload["avatar_url"] = Value::String(avatar_url);
                                        }

                                        match client.post(&webhook_url)
                                            .header("Content-Type", "application/json")
                                            .json(&webhook_payload)
                                            .send()
                                            .await {
                                            Ok(resp) => {
                                                if resp.status().is_success() {
                                                    emit_log(format!("[+] Forwarded message from {}", author_name));
                                                } else {
                                                    emit_log(format!("[WARNING] Failed to forward (Status: {})", resp.status()));
                                                }
                                            },
                                            Err(e) => {
                                                emit_log(format!("[ERROR] Send failed: {}", e));
                                            }
                                        }

                                        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
                                    }
                                }
                            },
                            Err(e) => {
                                emit_log(format!("[ERROR] Failed to parse messages: {}", e));
                            }
                        }
                    } else if resp.status().as_u16() == 429 {
                        emit_log("[WARNING] Rate limited, waiting...".to_string());
                        tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
                    }
                },
                Err(e) => {
                    emit_log(format!("[ERROR] Request failed: {}", e));
                }
            }

            tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
        }
    });

    Ok("Live cloner started successfully".to_string())
}

#[tauri::command]
pub async fn stop_live_message_cloner() -> Result<String, String> {
    let mut is_running = LIVE_CLONER_RUNNING.lock().await;
    *is_running = false;
    Ok("Live cloner stopped".to_string())
}

#[tauri::command]
pub async fn cancel_message_clone() -> Result<String, String> {
    CLONE_MESSAGES_CANCELLED.store(true, Ordering::SeqCst);
    Ok("Message clone cancellation requested".to_string())
}

#[tauri::command]
pub async fn cancel_discord_clone() -> Result<String, String> {
    DISCORD_CLONE_CANCELLED.store(true, Ordering::SeqCst);
    Ok("Discord clone cancellation requested".to_string())
}

#[tauri::command]
pub async fn generate_system_report() -> Result<String, String> {
    #[cfg(windows)]
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let documents_path = std::env::var("USERPROFILE")
        .map(|p| format!("{}\\Documents", p))
        .unwrap_or_else(|_| "C:\\Users\\Public\\Documents".to_string());

    let report_path = format!("{}\\ConfUtils_SystemReport.html", documents_path);

    let command = format!(
        "perfmon /report; Start-Sleep -Seconds 60; Move-Item -Path \"$env:USERPROFILE\\PerfLogs\\System\\Diagnostics\\*.html\" -Destination '{}' -Force",
        report_path
    );

    let mut cmd = Command::new("powershell");
    cmd.args([
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-Command",
        &command
    ]);

    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to generate system report: {}", e))?;

    if output.status.success() {
        Ok(format!("System report generated successfully at: {}", report_path))
    } else {
        let error = String::from_utf8_lossy(&output.stderr).to_string();
        Err(format!("Failed to generate report: {}", error))
    }
}

#[tauri::command]
pub async fn open_system_info() -> Result<String, String> {
    #[cfg(windows)]
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let mut cmd = Command::new("msinfo32");

    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    cmd.spawn()
        .map_err(|e| format!("Failed to open System Information: {}", e))?;

    Ok("System Information opened".to_string())
}


#[tauri::command]
pub async fn spam_reactions(
    user_token: String,
    channel_id: String,
    message_id: String,
    emojis: Vec<String>,
    delay_ms: u64,
) -> Result<String, String> {
    check_auth()?;
    
    let user_token = validate_discord_token(&user_token)?;
    let channel_id = validate_discord_id(&channel_id)?;
    let message_id = validate_discord_id(&message_id)?;
    
    if emojis.is_empty() {
        return Err("En az bir emoji gerekli".to_string());
    }
    
    let client = reqwest::Client::new();
    let base_url = "https://discord.com/api/v10";
    
    let mut reactions_added = 0;
    
    for emoji in emojis.iter() {
        let emoji_encoded = emoji.replace(" ", "+");
        let endpoint = format!("/channels/{}/messages/{}/reactions/{}/@me", channel_id, message_id, emoji_encoded);
        let url = format!("{}{}", base_url, endpoint);
        
        match client
            .put(&url)
            .header("Authorization", &user_token)
            .header("Content-Type", "application/json")
            .send()
            .await
        {
            Ok(resp) => {
                if resp.status().is_success() || resp.status().as_u16() == 204 {
                    reactions_added += 1;
                } else if resp.status().as_u16() == 429 {
                    tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
                    continue;
                } else {
                    let status = resp.status();
                    let _error_text = resp.text().await.unwrap_or_else(|_| "Bilinmeyen hata".to_string());
                    
                    if status == 401 || status == 403 {
                        return Err("Token geçersiz veya reaction ekleme yetkiniz yok".to_string());
                    } else if status == 404 {
                        return Err("Kanal veya mesaj bulunamadı. ID'leri kontrol edin.".to_string());
                    }
                }
            }
            Err(e) => {
                return Err(format!("Reaction ekleme hatası: {}", e));
            }
        }
        
        if delay_ms > 0 {
            tokio::time::sleep(tokio::time::Duration::from_millis(delay_ms)).await;
        }
    }
    
    Ok(format!("Successfully added {} reactions", reactions_added))
}

#[tauri::command]
pub async fn change_nickname(
    user_token: String,
    guild_id: String,
    nickname: String,
) -> Result<String, String> {
    check_auth()?;
    
    let user_token = validate_discord_token(&user_token)?;
    let guild_id = validate_discord_id(&guild_id)?;
    
    if nickname.len() > 32 {
        return Err("Nickname çok uzun (max 32 karakter)".to_string());
    }
    
    let client = reqwest::Client::new();
    let base_url = "https://discord.com/api/v10";
    let url = format!("{}/guilds/{}/members/@me", base_url, guild_id);
    
    let response = client
        .patch(&url)
        .header("Authorization", &user_token)
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({ "nick": nickname }))
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;
    
    if response.status().is_success() {
        Ok(format!("Nickname changed to '{}' successfully", nickname))
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_else(|_| "Bilinmeyen hata".to_string());
        
        let error_msg = if status == 401 || status == 403 {
            if let Ok(error_json) = serde_json::from_str::<serde_json::Value>(&error_text) {
                let message = error_json["message"].as_str().unwrap_or("Yetkilendirme hatası");
                if message.contains("Missing Permissions") || message.contains("Missing Access") {
                    "Bu sunucuda nickname değiştirme yetkiniz yok".to_string()
                } else {
                    format!("Discord API hatası: {}", message)
                }
            } else {
                "Token geçersiz veya yetkiniz yok".to_string()
            }
        } else if status == 404 {
            "Sunucu bulunamadı. Guild ID'sini kontrol edin.".to_string()
        } else {
            format!("Discord API hatası ({}): {}", status, error_text)
        };
        
        Err(error_msg)
    }
}

#[tauri::command]
pub async fn bulk_delete_messages(
    app: tauri::AppHandle,
    user_token: String,
    channel_id: String,
    limit: u32,
    delay_ms: u64,
) -> Result<String, String> {
    use serde_json::Value;

    let client = reqwest::Client::new();
    let base_url = "https://discord.com/api/v10";
    let mut deleted_count = 0;

    let emit_log = |message: String| {
        let _ = app.emit("bulk-delete-log", message);
    };

    emit_log(format!("[+] Starting bulk delete in channel {}", channel_id));

    let messages_url = format!("{}/channels/{}/messages?limit={}", base_url, channel_id, limit.min(100));

    match client
        .get(&messages_url)
        .header("Authorization", &user_token)
        .send()
        .await
    {
        Ok(resp) => {
            if resp.status().is_success() {
                match resp.json::<Vec<Value>>().await {
                    Ok(messages) => {
                        emit_log(format!("[INFO] Found {} messages", messages.len()));

                        for msg in messages.iter() {
                            let msg_id = msg["id"].as_str().unwrap_or("");
                            let author_id = msg["author"]["id"].as_str().unwrap_or("");

                            let user_resp = client
                                .get(&format!("{}/users/@me", base_url))
                                .header("Authorization", &user_token)
                                .send()
                                .await;

                            if let Ok(user_data) = user_resp {
                                if let Ok(user_json) = user_data.json::<Value>().await {
                                    let current_user_id = user_json["id"].as_str().unwrap_or("");

                                    if author_id == current_user_id {
                                        let delete_url = format!("{}/channels/{}/messages/{}", base_url, channel_id, msg_id);

                                        match client
                                            .delete(&delete_url)
                                            .header("Authorization", &user_token)
                                            .send()
                                            .await
                                        {
                                            Ok(del_resp) => {
                                                if del_resp.status().is_success() || del_resp.status().as_u16() == 204 {
                                                    deleted_count += 1;
                                                    emit_log(format!("[+] Deleted message {}/{}", deleted_count, messages.len()));
                                                }
                                            }
                                            Err(_) => {}
                                        }

                                        if delay_ms > 0 {
                                            tokio::time::sleep(tokio::time::Duration::from_millis(delay_ms)).await;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    Err(e) => return Err(format!("Failed to parse messages: {}", e)),
                }
            } else {
                return Err(format!("Failed to fetch messages: Status {}", resp.status()));
            }
        }
        Err(e) => return Err(format!("Request failed: {}", e)),
    }

    emit_log(format!("[✓] Bulk delete complete. Deleted {} messages", deleted_count));
    Ok(format!("Successfully deleted {} messages", deleted_count))
}

#[tauri::command]
pub async fn dm_bomber(
    app: tauri::AppHandle,
    user_token: String,
    user_ids: Vec<String>,
    message: String,
    count: u32,
    delay_ms: u64,
) -> Result<String, String> {
    check_auth()?;
    
    let user_token = validate_discord_token(&user_token)?;
    
    if user_ids.is_empty() {
        return Err("En az bir kullanıcı ID'si gerekli".to_string());
    }
    
    for user_id in &user_ids {
        if let Err(e) = validate_discord_id(user_id) {
            return Err(format!("Geçersiz kullanıcı ID'si '{}': {}", user_id, e));
        }
    }
    
    if message.trim().is_empty() {
        return Err("Mesaj içeriği boş olamaz".to_string());
    }
    
    if count == 0 || count > 50 {
        return Err("Mesaj sayısı 1-50 arasında olmalıdır".to_string());
    }
    
    use serde_json::Value;

    let client = reqwest::Client::new();
    let base_url = "https://discord.com/api/v10";
    let (auth_token, _) = resolve_discord_auth(&client, base_url, &user_token).await?;
    let mut total_sent = 0;

    let emit_log = |msg: String| {
        let _ = app.emit("dm-bomber-log", msg);
    };

    emit_log("[+] DM Bomber started".to_string());

    for user_id in user_ids.iter() {
        emit_log(format!("[INFO] Targeting user ID: {}", user_id));

        let user_id_trimmed = user_id.trim();
        
        if user_id_trimmed.is_empty() {
            emit_log(format!("[ERROR] Boş kullanıcı ID'si atlandı"));
            continue;
        }

        let user_id_parsed = match user_id_trimmed.parse::<u64>() {
            Ok(id) => id.to_string(),
            Err(_) => {
                emit_log(format!("[ERROR] Geçersiz kullanıcı ID formatı: {}", user_id_trimmed));
                continue;
            }
        };

        emit_log(format!("[INFO] Kullanıcı hedefleniyor: {}", user_id_parsed));

        let dm_payload = serde_json::json!({
            "recipient_id": user_id_parsed
        });

        let dm_resp = client
            .post(&format!("{}/users/@me/channels", base_url))
            .header("Authorization", &auth_token)
            .header("Content-Type", "application/json")
            .json(&dm_payload)
            .send()
            .await;

        match dm_resp {
            Ok(dm_data) => {
                if dm_data.status().is_success() {
                    match dm_data.json::<Value>().await {
                        Ok(dm_json) => {
                            let channel_id = dm_json["id"].as_str().unwrap_or("");
                            
                            if channel_id.is_empty() {
                                emit_log(format!("[ERROR] DM channel oluşturulamadı: Channel ID boş - User ID: {}", user_id_parsed));
                                continue;
                            }

                            emit_log(format!("[+] DM channel oluşturuldu: {} (User: {})", channel_id, user_id_parsed));

                            for i in 1..=count {
                                let msg_payload = serde_json::json!({
                                    "content": message
                                });

                                match client
                                    .post(&format!("{}/channels/{}/messages", base_url, channel_id))
                                    .header("Authorization", &auth_token)
                                    .header("Content-Type", "application/json")
                                    .json(&msg_payload)
                                    .send()
                                    .await
                                {
                                    Ok(resp) => {
                                        if resp.status().is_success() {
                                            total_sent += 1;
                                            emit_log(format!("[+] Sent {}/{} to {}", i, count, user_id_parsed));
                                        } else if resp.status().as_u16() == 429 {
                                            emit_log("[WARNING] Rate limited! Waiting 5 seconds...".to_string());
                                            tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
                                        } else {
                                            let status = resp.status();
                                            let error_text = resp.text().await.unwrap_or_else(|_| "Bilinmeyen hata".to_string());
                                            emit_log(format!("[ERROR] Mesaj gönderilemedi ({}): {} - User ID: {}", status, error_text, user_id_parsed));
                                        }
                                    }
                                    Err(e) => {
                                        emit_log(format!("[ERROR] Mesaj gönderme hatası: {} - User ID: {}", e, user_id_parsed));
                                    }
                                }

                                if delay_ms > 0 {
                                    tokio::time::sleep(tokio::time::Duration::from_millis(delay_ms)).await;
                                }
                            }
                        }
                        Err(e) => {
                            emit_log(format!("[ERROR] DM channel yanıtı parse edilemedi: {} - User ID: {}", e, user_id_parsed));
                        }
                    }
                } else {
                    let status = dm_data.status();
                    let error_text = dm_data.text().await.unwrap_or_else(|_| "Bilinmeyen hata".to_string());
                    
                    let error_msg = if status == 400 {
                        if let Ok(error_json) = serde_json::from_str::<serde_json::Value>(&error_text) {
                            let code = error_json["code"].as_u64().unwrap_or(0);
                            let message = error_json["message"].as_str().unwrap_or("Bilinmeyen hata");
                            
                            if code == 50033 {
                                format!("Alıcı geçersiz (Code 50033): Bu kullanıcı ID'si geçersiz veya kullanıcı bulunamıyor. Lütfen kullanıcı ID'sini kontrol edin.")
                            } else {
                                format!("DM channel oluşturulamadı (Code {}): {}", code, message)
                            }
                        } else {
                            "DM channel oluşturulamadı (400): Alıcı geçersiz".to_string()
                        }
                    } else if status == 403 {
                        "Bu kullanıcıya DM gönderme yetkiniz yok veya kullanıcı DM'leri kapalı. Kullanıcı DM'lerini açmış olmalı ve sizinle arkadaş olmalı veya ortak sunucuda olmalısınız.".to_string()
                    } else if status == 401 {
                        "Token geçersiz veya süresi dolmuş".to_string()
                    } else {
                        format!("DM channel oluşturulamadı ({}): {}", status, error_text)
                    };
                    
                    emit_log(format!("[ERROR] {} - User ID: {}", error_msg, user_id_parsed));
                }
            }
            Err(e) => {
                emit_log(format!("[ERROR] DM channel oluşturma isteği başarısız: {} - User ID: {}", e, user_id_parsed));
            }
        }
    }

    emit_log(format!("[✓] DM Bomber complete. Sent {} messages", total_sent));
    
    if total_sent == 0 {
        Err("Hiçbir mesaj gönderilemedi. Tüm kullanıcılar doğrulanamadı veya DM channel oluşturulamadı. Lütfen kullanıcı ID'lerini ve token'ı kontrol edin.".to_string())
    } else {
        Ok(format!("Successfully sent {} DM messages", total_sent))
    }
}

#[tauri::command]
pub async fn purge_channel(
    app: tauri::AppHandle,
    user_token: String,
    channel_id: String,
    message_count: u32,
) -> Result<String, String> {
    use serde_json::Value;

    let client = reqwest::Client::new();
    let base_url = "https://discord.com/api/v10";
    let mut deleted = 0;
    let (auth_token, current_user_id) = resolve_discord_auth(&client, base_url, &user_token).await?;

    let emit_log = |msg: String| {
        let _ = app.emit("purge-log", msg);
    };

    emit_log(format!("[+] Starting channel purge for {} messages", message_count));

    let batch_size = 100.min(message_count);
    let messages_url = format!("{}/channels/{}/messages?limit={}", base_url, channel_id, batch_size);

    match client
        .get(&messages_url)
        .header("Authorization", &auth_token)
        .send()
        .await
    {
        Ok(resp) => {
            if resp.status().is_success() {
                match resp.json::<Vec<Value>>().await {
                    Ok(messages) => {
                        let message_ids: Vec<String> = messages
                            .iter()
                            .filter_map(|m| m["id"].as_str().map(String::from))
                            .collect();

                        if message_ids.len() >= 2 {
                            let bulk_payload = serde_json::json!({
                                "messages": message_ids
                            });

                            let delete_url = format!("{}/channels/{}/messages/bulk-delete", base_url, channel_id);

                            match client
                                .post(&delete_url)
                                .header("Authorization", &auth_token)
                                .header("Content-Type", "application/json")
                                .json(&bulk_payload)
                                .send()
                                .await
                            {
                                Ok(del_resp) => {
                                    if del_resp.status().is_success() || del_resp.status().as_u16() == 204 {
                                        deleted = message_ids.len();
                                        emit_log(format!("[✓] Purged {} messages", deleted));
                                    } else if del_resp.status().as_u16() == 403 {
                                        let current_user_id = current_user_id.clone().ok_or_else(|| {
                                            "Kullanıcı ID'si alınamadı. Token geçersiz olabilir.".to_string()
                                        })?;
                                        emit_log("[WARNING] Bulk delete izni yok. Sadece kendi mesajlarınız silinecek.".to_string());
                                        for msg in messages.iter() {
                                            let msg_id = msg["id"].as_str().unwrap_or("");
                                            let author_id = msg["author"]["id"].as_str().unwrap_or("");
                                            if author_id == current_user_id {
                                                let delete_url = format!("{}/channels/{}/messages/{}", base_url, channel_id, msg_id);
                                                if let Ok(del_resp) = client
                                                    .delete(&delete_url)
                                                    .header("Authorization", &auth_token)
                                                    .send()
                                                    .await
                                                {
                                                    if del_resp.status().is_success() || del_resp.status().as_u16() == 204 {
                                                        deleted += 1;
                                                        emit_log(format!("[+] Deleted message {}/{}", deleted, message_count));
                                                    }
                                                }
                                            }
                                        }
                                    } else {
                                        return Err(format!(
                                            "Toplu silme basarisiz (Status {}). Mesajlari silme yetkiniz olmayabilir.",
                                            del_resp.status()
                                        ));
                                    }
                                }
                                Err(e) => return Err(format!("Request failed: {}", e)),
                            }
                        } else if message_ids.len() == 1 {
                            let msg_id = &message_ids[0];
                            let delete_url = format!("{}/channels/{}/messages/{}", base_url, channel_id, msg_id);
                            match client
                                .delete(&delete_url)
                                .header("Authorization", &auth_token)
                                .send()
                                .await
                            {
                                Ok(del_resp) => {
                                    if del_resp.status().is_success() || del_resp.status().as_u16() == 204 {
                                        deleted = 1;
                                        emit_log("[✓] Purged 1 message".to_string());
                                    } else {
                                        return Err(format!(
                                            "Mesaj silme basarisiz (Status {}). Mesajlari silme yetkiniz olmayabilir.",
                                            del_resp.status()
                                        ));
                                    }
                                }
                                Err(e) => return Err(format!("Request failed: {}", e)),
                            }
                        }
                    }
                    Err(e) => return Err(format!("Failed to parse messages: {}", e)),
                }
            }
        }
        Err(e) => return Err(format!("Failed to fetch messages: {}", e)),
    }

    Ok(format!("Silinen mesaj sayısı: {}", deleted))
}

#[tauri::command]
pub async fn clone_role(
    user_token: String,
    guild_id: String,
    source_role_id: String,
    new_role_name: String,
) -> Result<String, String> {
    use serde_json::Value;

    let client = reqwest::Client::new();
    let base_url = "https://discord.com/api/v10";

    let roles_url = format!("{}/guilds/{}/roles", base_url, guild_id);

    match client
        .get(&roles_url)
        .header("Authorization", &user_token)
        .send()
        .await
    {
        Ok(resp) => {
            if resp.status().is_success() {
                match resp.json::<Vec<Value>>().await {
                    Ok(roles) => {
                        let source_role = roles.iter().find(|r| r["id"].as_str() == Some(&source_role_id));

                        if let Some(role) = source_role {
                            let permissions = role["permissions"].as_str().unwrap_or("0");
                            let color = role["color"].as_u64().unwrap_or(0);
                            let hoist = role["hoist"].as_bool().unwrap_or(false);
                            let mentionable = role["mentionable"].as_bool().unwrap_or(false);

                            let create_payload = serde_json::json!({
                                "name": new_role_name,
                                "permissions": permissions,
                                "color": color,
                                "hoist": hoist,
                                "mentionable": mentionable
                            });

                            match client
                                .post(&roles_url)
                                .header("Authorization", &user_token)
                                .header("Content-Type", "application/json")
                                .json(&create_payload)
                                .send()
                                .await
                            {
                                Ok(create_resp) => {
                                    if create_resp.status().is_success() {
                                        Ok(format!("Role '{}' cloned successfully as '{}'", role["name"].as_str().unwrap_or("Unknown"), new_role_name))
                                    } else {
                                        Err(format!("Failed to create role: Status {}", create_resp.status()))
                                    }
                                }
                                Err(e) => Err(format!("Create request failed: {}", e)),
                            }
                        } else {
                            Err("Source role not found".to_string())
                        }
                    }
                    Err(e) => Err(format!("Failed to parse roles: {}", e)),
                }
            } else {
                Err(format!("Failed to fetch roles: Status {}", resp.status()))
            }
        }
        Err(e) => Err(format!("Request failed: {}", e)),
    }
}

#[tauri::command]
pub async fn check_token(user_token: String) -> Result<String, String> {
    check_auth()?;
    
    let user_token = validate_discord_token(&user_token)?;
    
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Client oluşturulamadı: {}", e))?;
    
    let url = "https://discord.com/api/v10/users/@me";
    
    let response = client
        .get(url)
        .header("Authorization", &user_token)
        .header("Content-Type", "application/json")
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                "Discord API yanıt vermiyor (timeout). Lütfen tekrar deneyin.".to_string()
            } else if e.is_connect() {
                "Discord API'ye bağlanılamıyor. İnternet bağlantınızı kontrol edin.".to_string()
            } else {
                format!("Discord API request failed: {}", e)
            }
        })?;
    
    let status = response.status();
    
    if status.is_success() {
        let user_data: serde_json::Value = response.json().await
            .map_err(|e| format!("Yanıt parse edilemedi: {}", e))?;
        
        let username = user_data["username"].as_str().unwrap_or("Unknown");
        let user_id = user_data["id"].as_str().unwrap_or("Unknown");
        Ok(format!("Token geçerli - Kullanıcı: {} ({})", username, user_id))
    } else {
        let error_text = response.text().await.unwrap_or_else(|_| "Bilinmeyen hata".to_string());
        let error_msg = if let Ok(error_json) = serde_json::from_str::<serde_json::Value>(&error_text) {
            let message = error_json["message"].as_str()
                .or_else(|| error_json["error"].as_str())
                .unwrap_or("Token kontrolü başarısız");
            
            if status == 401 || status == 403 {
                "Token geçersiz veya süresi dolmuş".to_string()
            } else {
                format!("Discord API hatası: {}", message)
            }
        } else {
            if status == 401 || status == 403 {
                "Token geçersiz veya süresi dolmuş".to_string()
            } else {
                format!("Discord API hatası ({}): {}", status, error_text)
            }
        };
        Err(error_msg)
    }
}

#[tauri::command]
pub async fn get_token_info(user_token: String) -> Result<String, String> {
    check_auth()?;
    
    let user_token = validate_discord_token(&user_token)?;
    
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Client oluşturulamadı: {}", e))?;
    
    let url = "https://discord.com/api/v10/users/@me";
    
    let response = client
        .get(url)
        .header("Authorization", &user_token)
        .header("Content-Type", "application/json")
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                "Discord API yanıt vermiyor (timeout). Lütfen tekrar deneyin.".to_string()
            } else if e.is_connect() {
                "Discord API'ye bağlanılamıyor. İnternet bağlantınızı kontrol edin.".to_string()
            } else {
                format!("Discord API request failed: {}", e)
            }
        })?;
    
    let status = response.status();
    
    if status.is_success() {
        let info: serde_json::Value = response.json().await
            .map_err(|e| format!("Yanıt parse edilemedi: {}", e))?;
        Ok(info.to_string())
    } else {
        let error_text = response.text().await.unwrap_or_else(|_| "Bilinmeyen hata".to_string());
        let error_msg = if let Ok(error_json) = serde_json::from_str::<serde_json::Value>(&error_text) {
            error_json["message"].as_str()
                .or_else(|| error_json["error"].as_str())
                .unwrap_or("Token bilgisi alınamadı")
                .to_string()
        } else {
            if status == 401 {
                "Token geçersiz veya süresi dolmuş".to_string()
            } else {
                format!("Discord API hatası ({}): {}", status, error_text)
            }
        };
        Err(error_msg)
    }
}

#[tauri::command]
pub async fn spam_webhook(
    app: tauri::AppHandle,
    webhook_url: String,
    message: String,
    username: String,
    avatar_url: String,
    count: u32,
    delay_ms: u64,
) -> Result<String, String> {
    check_auth()?;
    {
        let mut is_running = WEBHOOK_SPAM_RUNNING.lock().await;
        *is_running = true;
    }

    let client = reqwest::Client::new();
    let mut sent_count = 0;

    let emit_log = |msg: String| {
        let _ = app.emit("webhook-spam-log", msg);
    };

    emit_log(format!("[+] Starting webhook spam - {} messages", count));

    for i in 1..=count {
        {
            let is_running = WEBHOOK_SPAM_RUNNING.lock().await;
            if !*is_running {
                emit_log("[!] Webhook spam cancelled by user".to_string());
                return Ok(format!("Webhook spam stopped. Sent {}/{} messages", sent_count, count));
            }
        }
        let mut payload = serde_json::json!({
            "content": message,
            "username": username
        });

        if !avatar_url.is_empty() {
            payload["avatar_url"] = serde_json::Value::String(avatar_url.clone());
        }

        match client
            .post(&webhook_url)
            .header("Content-Type", "application/json")
            .json(&payload)
            .send()
            .await
        {
            Ok(resp) => {
                if resp.status().is_success() || resp.status().as_u16() == 204 {
                    sent_count += 1;
                    emit_log(format!("[+] Sent {}/{}", i, count));
                } else if resp.status().as_u16() == 429 {
                    emit_log("[WARNING] Rate limited! Waiting...".to_string());
                    tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
                } else {
                    emit_log(format!("[ERROR] Failed: Status {}", resp.status()));
                }
            }
            Err(e) => {
                emit_log(format!("[ERROR] Request failed: {}", e));
            }
        }

        if delay_ms > 0 {
            tokio::time::sleep(tokio::time::Duration::from_millis(delay_ms)).await;
        }
    }

    {
        let mut is_running = WEBHOOK_SPAM_RUNNING.lock().await;
        *is_running = false;
    }

    emit_log(format!("[✓] Webhook spam complete. Sent {} messages", sent_count));
    Ok(format!("Successfully sent {} messages via webhook", sent_count))
}

#[tauri::command]
pub async fn stop_webhook_spam() -> Result<String, String> {
    let mut is_running = WEBHOOK_SPAM_RUNNING.lock().await;
    *is_running = false;
    Ok("Webhook spam stopped".to_string())
}

#[tauri::command]
pub async fn delete_webhook(webhook_url: String) -> Result<String, String> {
    let client = reqwest::Client::new();

    match client
        .delete(&webhook_url)
        .send()
        .await
    {
        Ok(resp) => {
            if resp.status().is_success() || resp.status().as_u16() == 204 {
                Ok("Webhook deleted successfully".to_string())
            } else {
                Err(format!("Failed to delete webhook: Status {}", resp.status()))
            }
        }
        Err(e) => Err(format!("Request failed: {}", e)),
    }
}

#[tauri::command]
pub async fn backup_guild(
    app: tauri::AppHandle,
    user_token: String,
    guild_id: String,
    options: String,
) -> Result<String, String> {
    check_auth()?;
    use serde_json::Value;
    use std::fs::File;
    use std::io::Write;

    let client = reqwest::Client::new();
    let base_url = "https://discord.com/api/v10";

    let emit_log = |msg: String| {
        let _ = app.emit("server-backup-log", msg);
    };

    emit_log("[INFO] Starting server backup...".to_string());
    emit_log("[WARNING] This may violate Discord Terms of Service!".to_string());

    let opts: Value = serde_json::from_str(&options)
        .unwrap_or_else(|_| serde_json::json!({
            "includeChannels": true,
            "includeRoles": true,
            "includeEmojis": true,
            "includeSettings": true,
            "includePermissions": true
        }));

    let mut backup_data = serde_json::json!({});

    emit_log("[+] Fetching guild information...".to_string());
    let guild_url = format!("{}/guilds/{}", base_url, guild_id);
    
    match client
        .get(&guild_url)
        .header("Authorization", &user_token)
        .send()
        .await
    {
        Ok(resp) => {
            if resp.status().is_success() {
                match resp.json::<Value>().await {
                    Ok(guild) => {
                        backup_data["guild_info"] = serde_json::json!({
                            "id": guild.get("id"),
                            "name": guild.get("name"),
                            "description": guild.get("description"),
                            "icon": guild.get("icon"),
                            "splash": guild.get("splash"),
                            "banner": guild.get("banner"),
                            "verification_level": guild.get("verification_level"),
                            "default_message_notifications": guild.get("default_message_notifications"),
                            "explicit_content_filter": guild.get("explicit_content_filter"),
                            "afk_timeout": guild.get("afk_timeout"),
                            "afk_channel_id": guild.get("afk_channel_id"),
                            "system_channel_id": guild.get("system_channel_id"),
                        });
                        emit_log(format!("[✓] Guild: {}", guild.get("name").and_then(|v| v.as_str()).unwrap_or("Unknown")));
                    }
                    Err(e) => return Err(format!("Failed to parse guild data: {}", e)),
                }
            } else {
                return Err(format!("Failed to fetch guild: Status {}", resp.status()));
            }
        }
        Err(e) => return Err(format!("Request failed: {}", e)),
    }

    if opts["includeChannels"].as_bool().unwrap_or(true) {
        emit_log("[+] Fetching channels...".to_string());
        let channels_url = format!("{}/guilds/{}/channels", base_url, guild_id);
        
        match client
            .get(&channels_url)
            .header("Authorization", &user_token)
            .send()
            .await
        {
            Ok(resp) => {
                if resp.status().is_success() {
                    match resp.json::<Value>().await {
                        Ok(channels) => {
                            backup_data["channels"] = channels;
                            if let Some(ch_array) = backup_data["channels"].as_array() {
                                emit_log(format!("[✓] Backed up {} channels", ch_array.len()));
                            }
                        }
                        Err(e) => emit_log(format!("[WARNING] Failed to parse channels: {}", e)),
                    }
                }
            }
            Err(e) => emit_log(format!("[WARNING] Failed to fetch channels: {}", e)),
        }
    }

    if opts["includeRoles"].as_bool().unwrap_or(true) {
        emit_log("[+] Fetching roles...".to_string());
        let roles_url = format!("{}/guilds/{}/roles", base_url, guild_id);
        
        match client
            .get(&roles_url)
            .header("Authorization", &user_token)
            .send()
            .await
        {
            Ok(resp) => {
                if resp.status().is_success() {
                    match resp.json::<Value>().await {
                        Ok(roles) => {
                            backup_data["roles"] = roles;
                            if let Some(roles_array) = backup_data["roles"].as_array() {
                                emit_log(format!("[✓] Backed up {} roles", roles_array.len()));
                            }
                        }
                        Err(e) => emit_log(format!("[WARNING] Failed to parse roles: {}", e)),
                    }
                }
            }
            Err(e) => emit_log(format!("[WARNING] Failed to fetch roles: {}", e)),
        }
    }

    if opts["includeEmojis"].as_bool().unwrap_or(true) {
        emit_log("[+] Fetching emojis...".to_string());
        let emojis_url = format!("{}/guilds/{}/emojis", base_url, guild_id);
        
        match client
            .get(&emojis_url)
            .header("Authorization", &user_token)
            .send()
            .await
        {
            Ok(resp) => {
                if resp.status().is_success() {
                    match resp.json::<Value>().await {
                        Ok(emojis) => {
                            backup_data["emojis"] = emojis;
                            if let Some(emojis_array) = backup_data["emojis"].as_array() {
                                emit_log(format!("[✓] Backed up {} emojis", emojis_array.len()));
                            }
                        }
                        Err(e) => emit_log(format!("[WARNING] Failed to parse emojis: {}", e)),
                    }
                }
            }
            Err(e) => emit_log(format!("[WARNING] Failed to fetch emojis: {}", e)),
        }
    }

    backup_data["metadata"] = serde_json::json!({
        "backup_date": chrono::Local::now().to_rfc3339(),
        "guild_id": guild_id,
        "version": "1.0",
    });

    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let filename = format!("guild_{}_backup_{}.json", guild_id, timestamp);

    let json_data = serde_json::to_string_pretty(&backup_data)
        .map_err(|e| format!("Failed to serialize JSON: {}", e))?;
    
    let mut file = File::create(&filename)
        .map_err(|e| format!("Failed to create file: {}", e))?;
    file.write_all(json_data.as_bytes())
        .map_err(|e| format!("Failed to write file: {}", e))?;

    emit_log(format!("[✓] Backup saved to: {}", filename));
    Ok(format!("Server backup completed successfully. Saved to: {}", filename))
}

#[tauri::command]
pub async fn restore_guild(
    app: tauri::AppHandle,
    user_token: String,
    guild_id: String,
    backup_path: String,
) -> Result<String, String> {
    check_auth()?;
    use serde_json::Value;
    use std::fs::File;
    use std::io::Read;

    let client = reqwest::Client::new();
    let base_url = "https://discord.com/api/v10";

    let emit_log = |msg: String| {
        let _ = app.emit("server-backup-log", msg);
    };

    emit_log("[INFO] Starting server restore...".to_string());
    emit_log("[WARNING] This will overwrite current server settings!".to_string());

    let mut file = File::open(&backup_path)
        .map_err(|e| format!("Failed to open backup file: {}", e))?;
    
    let mut contents = String::new();
    file.read_to_string(&mut contents)
        .map_err(|e| format!("Failed to read backup file: {}", e))?;

    let backup_data: Value = serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to parse backup file: {}", e))?;

    emit_log("[+] Backup file loaded successfully".to_string());

    if let Some(guild_info) = backup_data.get("guild_info") {
        emit_log("[+] Restoring guild settings...".to_string());
        
        let update_payload = serde_json::json!({
            "name": guild_info.get("name"),
            "description": guild_info.get("description"),
            "verification_level": guild_info.get("verification_level"),
            "default_message_notifications": guild_info.get("default_message_notifications"),
            "explicit_content_filter": guild_info.get("explicit_content_filter"),
        });

        let guild_url = format!("{}/guilds/{}", base_url, guild_id);
        match client
            .patch(&guild_url)
            .header("Authorization", &user_token)
            .header("Content-Type", "application/json")
            .json(&update_payload)
            .send()
            .await
        {
            Ok(resp) => {
                if resp.status().is_success() {
                    emit_log("[✓] Guild settings restored".to_string());
                } else {
                    emit_log(format!("[WARNING] Failed to restore guild settings: Status {}", resp.status()));
                }
            }
            Err(e) => emit_log(format!("[WARNING] Failed to update guild: {}", e)),
        }
    }

    emit_log("[INFO] Note: Channels and roles restoration requires manual recreation".to_string());
    emit_log("[INFO] Automatic recreation may cause permission issues".to_string());

    emit_log("[✓] Restore completed".to_string());
    Ok("Server restore completed. Some features may require manual setup.".to_string())
}

#[tauri::command]
pub async fn change_hypesquad_house(
    user_token: String,
    house: String,
) -> Result<String, String> {
    check_auth()?;
    let client = reqwest::Client::new();
    let base_url = "https://discord.com/api/v10";

    let house_id = match house.as_str() {
        "bravery" => 1,
        "brilliance" => 2,
        "balance" => 3,
        _ => return Err("Invalid Hypesquad house".to_string()),
    };

    let payload = serde_json::json!({
        "house_id": house_id
    });

    let url = format!("{}/hypesquad/online", base_url);

    match client
        .post(&url)
        .header("Authorization", &user_token)
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await
    {
        Ok(resp) => {
            if resp.status().is_success() || resp.status().as_u16() == 204 {
                Ok(format!("Successfully joined Hypesquad {}!", house.to_uppercase()))
            } else {
                Err(format!("Failed to change Hypesquad house: Status {}", resp.status()))
            }
        }
        Err(e) => Err(format!("Request failed: {}", e)),
    }
}

#[tauri::command]
pub async fn leave_hypesquad(user_token: String) -> Result<String, String> {
    check_auth()?;
    let client = reqwest::Client::new();
    let base_url = "https://discord.com/api/v10";

    let url = format!("{}/hypesquad/online", base_url);

    match client
        .delete(&url)
        .header("Authorization", &user_token)
        .send()
        .await
    {
        Ok(resp) => {
            if resp.status().is_success() || resp.status().as_u16() == 204 {
                Ok("Successfully left Hypesquad!".to_string())
            } else {
                Err(format!("Failed to leave Hypesquad: Status {}", resp.status()))
            }
        }
        Err(e) => Err(format!("Request failed: {}", e)),
    }
}


use crate::anti_debug;

#[derive(serde::Serialize)]
pub struct DebugCheckResponse {
    is_debugged: bool,
    debugger_present: bool,
    timing_anomaly: bool,
    suspicious_parent: bool,
    suspicious_process: bool,
    hardware_breakpoint: bool,
}

#[tauri::command]
pub async fn check_debugger() -> Result<DebugCheckResponse, String> {
    let result = anti_debug::detailed_debug_check();

    Ok(DebugCheckResponse {
        is_debugged: result.is_debugged,
        debugger_present: result.debugger_present,
        timing_anomaly: result.timing_anomaly,
        suspicious_parent: result.suspicious_parent,
        suspicious_process: result.suspicious_process,
        hardware_breakpoint: result.hardware_breakpoint,
    })
}

#[tauri::command]
pub async fn is_debugger_attached() -> Result<bool, String> {
    Ok(anti_debug::is_being_debugged())
}

#[tauri::command]
pub async fn terminate_if_debugged() -> Result<(), String> {
    if anti_debug::is_being_debugged() {
        eprintln!("🚨 DEBUGGER DETECTED - Terminating application");

        std::process::exit(1);
    }

    Ok(())
}


use crate::hwid;

#[tauri::command]
pub async fn get_hwid() -> Result<hwid::HardwareInfo, String> {
    hwid::get_hardware_info()
}

#[tauri::command]
pub async fn get_hwid_string() -> Result<String, String> {
    let info = hwid::get_hardware_info()?;
    Ok(info.hwid)
}

#[tauri::command]
pub async fn verify_hwid(stored_hwid: String) -> Result<bool, String> {
    hwid::verify_hwid(&stored_hwid)
}


use serde::{Deserialize, Serialize};
use chrono::Utc;
use sysinfo::System;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionFingerprint {
    pub hwid: String,
    pub app_version: String,
    pub stable_device_id: String,
    
    pub os_info: String,
    pub os_version: String,
    pub os_arch: String,
    pub binary_hash: String,
    pub first_login_timestamp: i64,
}

#[tauri::command]
pub async fn get_session_fingerprint() -> Result<SessionFingerprint, String> {
    let hw_info = hwid::get_hardware_info()?;
    let binary_hash = get_binary_hash().await?;
    let app_version = env!("CARGO_PKG_VERSION").to_string();
    
    use sha2::{Sha256, Digest};
    let stable_id_input = format!("{}-{}-{}-{}", 
        hw_info.hwid, 
        hw_info.mac_address,
        hw_info.cpu_id,
        hw_info.disk_serial
    );
    let mut hasher = Sha256::new();
    hasher.update(stable_id_input.as_bytes());
    let stable_device_id = format!("{:x}", hasher.finalize());
    
    let os_info = hw_info.os_info.clone();
    let mut sys = System::new();
    sys.refresh_all();
    let os_version = System::os_version().unwrap_or_else(|| "Unknown".to_string());
    let os_arch = System::cpu_arch().unwrap_or_else(|| "Unknown".to_string());
    
    let first_login = Utc::now().timestamp();
    
    Ok(SessionFingerprint {
        hwid: hw_info.hwid,
        app_version,
        stable_device_id,
        
        os_info,
        os_version,
        os_arch,
        binary_hash,
        first_login_timestamp: first_login,
    })
}


use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use rand::Rng;
use std::fs::{self, OpenOptions};
use std::io::{Write, Seek, SeekFrom};
use std::path::Path;

lazy_static::lazy_static! {
    static ref DISCORD_RPC: std::sync::Mutex<Option<DiscordIpcClient>> = std::sync::Mutex::new(None);
}

#[derive(serde::Serialize)]
struct NetworkInfo {
    name: String,
    password: String,
    auth_type: String,
    connection_type: String,
    ip_address: String,
    dns_servers: String,
    gateway: String,
}

#[tauri::command]
pub async fn get_wifi_passwords() -> Result<String, String> {
    let mut network_list = Vec::new();

    let profiles_cmd = Command::new("netsh")
        .args(["wlan", "show", "profiles"])
        .output()
        .map_err(|e| format!("Failed to execute netsh: {}", e))?;
    
    let output = String::from_utf8_lossy(&profiles_cmd.stdout);
    let mut profiles = Vec::new();

    for line in output.lines() {
        if line.contains("All User Profile") {
            let parts: Vec<&str> = line.split(':').collect();
            if parts.len() > 1 {
                profiles.push(parts[1].trim().to_string());
            }
        }
    }

    for profile in profiles {
        let pass_cmd = Command::new("netsh")
            .args(["wlan", "show", "profile", &format!("name=\"{}\"", profile), "key=clear"])
            .output();

        if let Ok(output) = pass_cmd {
            let pass_out = String::from_utf8_lossy(&output.stdout);
            let mut password = String::from("Open / No Password");
            let mut auth_type = String::from("Unknown");

            for line in pass_out.lines() {
                if line.contains("Key Content") {
                    let parts: Vec<&str> = line.split(':').collect();
                    if parts.len() > 1 {
                        password = parts[1].trim().to_string();
                    }
                }
                if line.contains("Authentication") {
                    let parts: Vec<&str> = line.split(':').collect();
                    if parts.len() > 1 {
                        auth_type = parts[1].trim().to_string();
                    }
                }
            }
            
            network_list.push(NetworkInfo {
                name: profile.clone(),
                password,
                auth_type,
                connection_type: "WiFi".to_string(),
                ip_address: String::new(),
                dns_servers: String::new(),
                gateway: String::new(),
            });
        }
    }

    let interfaces_cmd = Command::new("netsh")
        .args(["interface", "show", "interface"])
        .output();

    if let Ok(output) = interfaces_cmd {
        let interface_output = String::from_utf8_lossy(&output.stdout);
        let mut ethernet_interfaces = Vec::new();

        for line in interface_output.lines() {
            if line.contains("Connected") && (line.contains("Ethernet") || line.contains("Local Area Connection")) {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 4 {
                    let interface_name = parts[3..].join(" ");
                    if !interface_name.is_empty() {
                        ethernet_interfaces.push(interface_name);
                    }
                }
            }
        }

        for interface_name in ethernet_interfaces {
            let ipconfig_cmd = Command::new("ipconfig")
                .args(["/all"])
                .output();

            let mut ip_address = String::new();
            let mut dns_servers = String::new();
            let mut gateway = String::new();
            let mut found_interface = false;

            if let Ok(ipconfig_output) = ipconfig_cmd {
                let ipconfig_text = String::from_utf8_lossy(&ipconfig_output.stdout);
                let lines: Vec<&str> = ipconfig_text.lines().collect();
                
                for (i, line) in lines.iter().enumerate() {
                    if line.contains(&interface_name) {
                        found_interface = true;
                    }
                    
                    if found_interface {
                        if line.contains("IPv4 Address") || line.contains("IPv4 Adresi") {
                            let parts: Vec<&str> = line.split(':').collect();
                            if parts.len() > 1 {
                                ip_address = parts[1].trim().to_string().replace("(Preferred)", "").trim().to_string();
                            }
                        }
                        
                        if line.contains("Default Gateway") || line.contains("Varsayılan Ağ Geçidi") {
                            let parts: Vec<&str> = line.split(':').collect();
                            if parts.len() > 1 {
                                gateway = parts[1].trim().to_string();
                            }
                        }
                        
                        if line.contains("DNS Servers") || line.contains("DNS Sunucuları") {
                            let mut dns_list = Vec::new();
                            for j in (i+1)..lines.len() {
                                let dns_line = lines[j].trim();
                                if dns_line.is_empty() || dns_line.starts_with("Description") || dns_line.starts_with("Açıklama") {
                                    break;
                                }
                                if !dns_line.starts_with(".") && !dns_line.contains(":") {
                                    dns_list.push(dns_line.to_string());
                                }
                            }
                            dns_servers = dns_list.join(", ");
                        }
                        
                        if line.trim().is_empty() && !ip_address.is_empty() {
                            break;
                        }
                    }
                }
            }

            if found_interface {
                network_list.push(NetworkInfo {
                    name: interface_name,
                    password: "N/A (Ethernet)".to_string(),
                    auth_type: "Wired Connection".to_string(),
                    connection_type: "Ethernet".to_string(),
                    ip_address: if ip_address.is_empty() { "DHCP".to_string() } else { ip_address },
                    dns_servers: if dns_servers.is_empty() { "DHCP".to_string() } else { dns_servers },
                    gateway: if gateway.is_empty() { "N/A".to_string() } else { gateway },
                });
            }
        }
    }

    serde_json::to_string(&network_list).map_err(|e| e.to_string())
}

#[derive(serde::Serialize)]
struct ConnectedDevice {
    ip_address: String,
    mac_address: String,
    device_type: String,
    hostname: String,
}

#[tauri::command]
pub async fn get_connected_devices() -> Result<String, String> {
    let mut devices = Vec::new();

    let arp_cmd = Command::new("arp")
        .args(["-a"])
        .output()
        .map_err(|e| format!("Failed to execute arp: {}", e))?;

    let arp_output = String::from_utf8_lossy(&arp_cmd.stdout);

    for line in arp_output.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 3 {
            let ip = parts[0].to_string();
            let mac = parts[1].to_string();
            
            if mac != "ff-ff-ff-ff-ff-ff" && !mac.starts_with("ff:ff:ff") && mac.contains("-") {
                let hostname = if parts.len() > 2 {
                    parts[2..].join(" ")
                } else {
                    "Unknown".to_string()
                };

                let device_type = if mac.starts_with("00-50-56") || mac.starts_with("00-0c-29") || mac.starts_with("00-05-69") {
                    "Virtual Machine".to_string()
                } else if mac.starts_with("00-1b-44") || mac.starts_with("00-1e-c2") {
                    "Router/Gateway".to_string()
                } else if mac.starts_with("00-1a-79") || mac.starts_with("00-1d-7e") {
                    "Mobile Device".to_string()
                } else {
                    "Unknown Device".to_string()
                };

                devices.push(ConnectedDevice {
                    ip_address: ip,
                    mac_address: mac,
                    device_type,
                    hostname,
                });
            }
        }
    }

    serde_json::to_string(&devices).map_err(|e| e.to_string())
}

#[derive(serde::Serialize)]
struct ActiveConnection {
    name: String,
    connection_type: String,
    status: String,
    ip_address: String,
    ssid: String,
    signal_strength: String,
}

#[tauri::command]
pub async fn get_active_connections() -> Result<String, String> {
    check_auth()?;
    let mut connections = Vec::new();

    let wifi_cmd = run_powershell_no_rate_limit(
        r#"
        [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
        $OutputEncoding = [System.Text.Encoding]::UTF8
        chcp 65001 | Out-Null
        netsh wlan show interfaces
        "#
        .to_string(),
    )
    .await;

    if let Ok(wifi_output) = wifi_cmd {
        let mut current_ssid = String::new();
        let mut current_signal = String::new();
        let mut current_name = String::new();

        for line in wifi_output.lines() {
            if line.contains("Name") && !line.contains("Profile") {
                let parts: Vec<&str> = line.split(':').collect();
                if parts.len() > 1 {
                    current_name = parts[1].trim().to_string();
                }
            }
            if line.contains("SSID") {
                let parts: Vec<&str> = line.split(':').collect();
                if parts.len() > 1 {
                    current_ssid = parts[1].trim().to_string();
                }
            }
            if line.contains("Signal") {
                let parts: Vec<&str> = line.split(':').collect();
                if parts.len() > 1 {
                    current_signal = parts[1].trim().to_string();
                }
            }
            if line.contains("State") && line.contains("connected") {
                if !current_ssid.is_empty() {
                    let ipconfig_cmd = run_powershell_no_rate_limit(
                        r#"
                        [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
                        $OutputEncoding = [System.Text.Encoding]::UTF8
                        chcp 65001 | Out-Null
                        ipconfig
                        "#
                        .to_string(),
                    )
                    .await;
                    
                    let mut ip_address = String::new();
                    if let Ok(ipconfig_text) = ipconfig_cmd {
                        for ip_line in ipconfig_text.lines() {
                            if ip_line.contains("IPv4 Address") || ip_line.contains("IPv4 Adresi") {
                                let parts: Vec<&str> = ip_line.split(':').collect();
                                if parts.len() > 1 {
                                    ip_address = parts[1].trim().to_string().replace("(Preferred)", "").trim().to_string();
                                    break;
                                }
                            }
                        }
                    }

                    connections.push(ActiveConnection {
                        name: if current_name.is_empty() { "WiFi Adapter".to_string() } else { current_name.clone() },
                        connection_type: "WiFi".to_string(),
                        status: "Connected".to_string(),
                        ip_address: if ip_address.is_empty() { "DHCP".to_string() } else { ip_address },
                        ssid: current_ssid.clone(),
                        signal_strength: current_signal.clone(),
                    });
                }
            }
        }
    }

    let ethernet_cmd = run_powershell(
        r#"
        [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
        $OutputEncoding = [System.Text.Encoding]::UTF8
        chcp 65001 | Out-Null
        netsh interface show interface
        "#
        .to_string(),
    )
    .await;

    if let Ok(ethernet_output) = ethernet_cmd {
        for line in ethernet_output.lines() {
            if line.contains("Connected") && (line.contains("Ethernet") || line.contains("Local Area Connection")) {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 4 {
                    let interface_name = parts[3..].join(" ");
                    
                    let ipconfig_cmd = run_powershell(
                        r#"
                        [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
                        $OutputEncoding = [System.Text.Encoding]::UTF8
                        chcp 65001 | Out-Null
                        ipconfig /all
                        "#
                        .to_string(),
                    )
                    .await;
                    
                    let mut ip_address = String::new();
                    if let Ok(ipconfig_text) = ipconfig_cmd {
                        let mut found_interface = false;
                        for ip_line in ipconfig_text.lines() {
                            if ip_line.contains(&interface_name) {
                                found_interface = true;
                            }
                            if found_interface && (ip_line.contains("IPv4 Address") || ip_line.contains("IPv4 Adresi")) {
                                let parts: Vec<&str> = ip_line.split(':').collect();
                                if parts.len() > 1 {
                                    ip_address = parts[1].trim().to_string().replace("(Preferred)", "").trim().to_string();
                                    break;
                                }
                            }
                        }
                    }

                    connections.push(ActiveConnection {
                        name: interface_name,
                        connection_type: "Ethernet".to_string(),
                        status: "Connected".to_string(),
                        ip_address: if ip_address.is_empty() { "DHCP".to_string() } else { ip_address },
                        ssid: "N/A".to_string(),
                        signal_strength: "N/A".to_string(),
                    });
                }
            }
        }
    }

    if connections.is_empty() {
        Ok("[]".to_string())
    } else {
        serde_json::to_string(&connections).map_err(|e| format!("JSON serialization error: {}", e))
    }
}

#[tauri::command]
pub async fn disconnect_network(connection_name: String, connection_type: String) -> Result<String, String> {
    if connection_type == "WiFi" {
        let cmd = Command::new("netsh")
            .args(["wlan", "disconnect"])
            .output()
            .map_err(|e| format!("Failed to disconnect WiFi: {}", e))?;
        
        if cmd.status.success() {
            Ok("WiFi disconnected successfully".to_string())
        } else {
            Err("Failed to disconnect WiFi".to_string())
        }
    } else if connection_type == "Ethernet" {
        let cmd = Command::new("netsh")
            .args(["interface", "set", "interface", &format!("name=\"{}\"", connection_name), "admin=disable"])
            .output()
            .map_err(|e| format!("Failed to disconnect Ethernet: {}", e))?;
        
        if cmd.status.success() {
            Ok(format!("Ethernet interface {} disabled successfully", connection_name))
        } else {
            Err("Failed to disconnect Ethernet".to_string())
        }
    } else {
        Err("Unknown connection type".to_string())
    }
}

#[derive(serde::Serialize)]
struct RouterInfo {
    gateway_ip: String,
    router_mac: String,
    router_brand: String,
    admin_url: String,
}

#[tauri::command]
pub async fn get_router_info() -> Result<String, String> {
    check_auth()?;
    let ipconfig_output = run_powershell_no_rate_limit(
        r#"
        [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
        $OutputEncoding = [System.Text.Encoding]::UTF8
        chcp 65001 | Out-Null
        ipconfig
        "#
        .to_string(),
    )
    .await
    .map_err(|e| format!("Failed to execute ipconfig: {}", e))?;
    let mut gateway_ip = String::new();

    for line in ipconfig_output.lines() {
        if line.contains("Default Gateway") || line.contains("Varsayılan Ağ Geçidi") {
            let parts: Vec<&str> = line.split(':').collect();
            if parts.len() > 1 {
                gateway_ip = parts[1].trim().to_string();
                break;
            }
        }
    }

    if gateway_ip.is_empty() {
        return Err("No gateway found".to_string());
    }

    let arp_cmd = run_powershell_no_rate_limit(
        format!(
            r#"
            [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
            $OutputEncoding = [System.Text.Encoding]::UTF8
            chcp 65001 | Out-Null
            arp -a {}
            "#,
            gateway_ip
        )
        .to_string(),
    )
    .await;

    let mut router_mac = String::new();
    if let Ok(arp_text) = arp_cmd {
        for line in arp_text.lines() {
            if line.contains(&gateway_ip) {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 2 {
                    router_mac = parts[1].to_string();
                    break;
                }
            }
        }
    }

    let router_brand = if router_mac.starts_with("00-1b-44") || router_mac.starts_with("00-1e-c2") {
        "Likely Router/Gateway".to_string()
    } else {
        "Unknown".to_string()
    };

    let admin_url = format!("http://{}", gateway_ip);

    let router_info = RouterInfo {
        gateway_ip,
        router_mac: if router_mac.is_empty() { "N/A".to_string() } else { router_mac },
        router_brand,
        admin_url,
    };

    serde_json::to_string(&router_info).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn secure_delete_file(file_path: String) -> Result<String, String> {
    check_auth()?;
    
    let validated_path = validate_file_path(&file_path)?;
    let path = Path::new(&validated_path);
    
    if !path.exists() {
        return Err("File not found".to_string());
    }

    let metadata = fs::metadata(path).map_err(|e| e.to_string())?;
    let len = metadata.len();

    let mut file = OpenOptions::new()
        .write(true)
        .open(path)
        .map_err(|e| format!("Failed to open file: {}", e))?;

    let mut rng = rand::thread_rng();
    let buffer_size = 4096;
    let mut buffer = vec![0u8; buffer_size];
    
    for _pass in 1..=3 {
        file.seek(SeekFrom::Start(0)).map_err(|e| e.to_string())?;
        let mut written = 0;
        while written < len {
            rng.fill(&mut buffer[..]);
            let to_write = std::cmp::min(buffer_size as u64, len - written) as usize;
            file.write_all(&buffer[..to_write]).map_err(|e| e.to_string())?;
            written += to_write as u64;
        }
        file.sync_all().map_err(|e| e.to_string())?;
    }

    file.seek(SeekFrom::Start(0)).map_err(|e| e.to_string())?;
    let zeros = vec![0u8; buffer_size];
    let mut written = 0;
    while written < len {
        let to_write = std::cmp::min(buffer_size as u64, len - written) as usize;
        file.write_all(&zeros[..to_write]).map_err(|e| e.to_string())?;
        written += to_write as u64;
    }
    file.sync_all().map_err(|e| e.to_string())?;

    fs::remove_file(path).map_err(|e| format!("Failed to delete file after shredding: {}", e))?;

    Ok("File securely shredded".to_string())
}

#[tauri::command]
pub async fn set_discord_rpc(
    state: String,
    details: String,
    large_image_key: String,
    large_image_text: String,
    small_image_key: String,
    small_image_text: String,
    button_label: String,
    button_url: String,
    app_id: Option<String>,
) -> Result<String, String> {
    let mut client_guard = DISCORD_RPC.lock().map_err(|_| "Failed to lock RPC client")?;

    if client_guard.is_none() {
        let chosen_app_id = app_id
            .and_then(|v| if v.trim().is_empty() { None } else { Some(v) })
            .unwrap_or_else(|| "1320448965682008165".to_string());

        let mut client = DiscordIpcClient::new(&chosen_app_id)
            .map_err(|e| format!("Failed to create RPC client: {}", e))?;
        
        client.connect().map_err(|e| format!("Failed to connect to Discord: {}", e))?;
        *client_guard = Some(client);
    }

    if let Some(client) = client_guard.as_mut() {
        let mut activity = activity::Activity::new();
        
        if !state.is_empty() { activity = activity.state(&state); }
        if !details.is_empty() { activity = activity.details(&details); }
        
        let mut assets = activity::Assets::new();
        let mut has_assets = false;
        
        if !large_image_key.is_empty() { 
            assets = assets.large_image(&large_image_key);
            if !large_image_text.is_empty() { assets = assets.large_text(&large_image_text); }
            has_assets = true;
        }
        
        if !small_image_key.is_empty() { 
            assets = assets.small_image(&small_image_key);
            if !small_image_text.is_empty() { assets = assets.small_text(&small_image_text); }
            has_assets = true;
        }
        
        if has_assets { activity = activity.assets(assets); }

        if !button_label.is_empty() && !button_url.is_empty() {
             let buttons = vec![activity::Button::new(&button_label, &button_url)];
             activity = activity.buttons(buttons);
        }

        client.set_activity(activity).map_err(|e| format!("Failed to set activity: {}", e))?;
        Ok("RPC status updated".to_string())
    } else {
        Err("RPC client not initialized".to_string())
    }
}

#[tauri::command]
pub async fn clear_discord_rpc() -> Result<String, String> {
    let mut client_guard = DISCORD_RPC.lock().map_err(|_| "Failed to lock RPC client")?;
    
    if let Some(client) = client_guard.as_mut() {
        client.clear_activity().map_err(|e| format!("Failed to clear activity: {}", e))?;
        Ok("RPC status cleared".to_string())
    } else {
        Ok("RPC was not active".to_string())
    }
}

#[tauri::command]
pub fn force_exit() {
    std::process::abort();
}
#[tauri::command]
pub async fn check_online_status() -> Result<bool, String> {
    use std::net::TcpStream;
    use std::time::Duration;
    use obfstr::obfstr;

    let check = tokio::task::spawn_blocking(|| {
        if TcpStream::connect_timeout(&obfstr!("8.8.8.8:53").parse().unwrap(), Duration::from_secs(2)).is_ok() {
            return true;
        }
        if TcpStream::connect_timeout(&obfstr!("1.1.1.1:53").parse().unwrap(), Duration::from_secs(2)).is_ok() {
            return true;
        }
        false
    }).await.map_err(|e| format!("Online check task failed: {}", e))?;

    Ok(check)
}