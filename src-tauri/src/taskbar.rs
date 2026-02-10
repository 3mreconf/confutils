use serde::Deserialize;

#[cfg(windows)]
use std::ffi::OsStr;
#[cfg(windows)]
use std::iter::once;
#[cfg(windows)]
use std::os::windows::ffi::OsStrExt;
#[cfg(windows)]
use std::path::{Path, PathBuf};

#[cfg(windows)]
use winapi::ctypes::c_void;
#[cfg(windows)]
use winapi::shared::minwindef::{DWORD, LPARAM, UINT, WPARAM};
#[cfg(windows)]
use winapi::shared::windef::HWND;
#[cfg(windows)]
use winapi::um::dwmapi::DwmSetWindowAttribute;
#[cfg(windows)]
use winapi::um::libloaderapi::{GetProcAddress, LoadLibraryW};
#[cfg(windows)]
use winapi::um::winuser::{EnumChildWindows, FindWindowW, SendMessageW};

#[derive(Debug, Deserialize)]
struct TaskbarConfig {
    mode: String,
    color: String,
    opacity: u8,
}

#[cfg(windows)]
#[repr(C)]
struct AccentPolicy {
    accent_state: i32,
    accent_flags: u32,
    gradient_color: u32,
    animation_id: u32,
}

#[cfg(windows)]
#[repr(C)]
struct WindowCompositionAttribData {
    attribute: i32,
    data: *mut c_void,
    size_of_data: usize,
}

#[cfg(windows)]
type SetWindowCompositionAttributeFn =
    unsafe extern "system" fn(HWND, *mut WindowCompositionAttribData) -> i32;

#[cfg(windows)]
const WCA_ACCENT_POLICY: i32 = 19;
#[cfg(windows)]
const WM_DWMCOMPOSITIONCHANGED: UINT = 0x031E;

#[cfg(windows)]
const ACCENT_DISABLED: i32 = 0;
#[cfg(windows)]
const ACCENT_ENABLE_GRADIENT: i32 = 1;
#[cfg(windows)]
const ACCENT_ENABLE_TRANSPARENTGRADIENT: i32 = 2;
#[cfg(windows)]
const ACCENT_ENABLE_BLURBEHIND: i32 = 3;
#[cfg(windows)]
const ACCENT_ENABLE_ACRYLICBLURBEHIND: i32 = 4;
#[cfg(windows)]
const ACCENT_ENABLE_HOSTBACKDROP: i32 = 5;

#[cfg(windows)]
const DWMWA_SYSTEMBACKDROP_TYPE: DWORD = 38;
#[cfg(windows)]
const DWMSBT_NONE: DWORD = 0;
#[cfg(windows)]
const DWMSBT_TRANSIENTWINDOW: DWORD = 3;

#[cfg(windows)]
const TTB_SCHEMA: &str = "https://TranslucentTB.github.io/settings.schema.json";

#[cfg(windows)]
fn to_wide(value: &str) -> Vec<u16> {
    OsStr::new(value).encode_wide().chain(once(0)).collect()
}

#[cfg(windows)]
fn parse_hex_color(color: &str) -> (u8, u8, u8) {
    let hex = color.trim().trim_start_matches('#');
    if hex.len() == 3 {
        let r = u8::from_str_radix(&hex[0..1].repeat(2), 16).unwrap_or(0);
        let g = u8::from_str_radix(&hex[1..2].repeat(2), 16).unwrap_or(0);
        let b = u8::from_str_radix(&hex[2..3].repeat(2), 16).unwrap_or(0);
        return (r, g, b);
    }
    if hex.len() >= 6 {
        let r = u8::from_str_radix(&hex[0..2], 16).unwrap_or(0);
        let g = u8::from_str_radix(&hex[2..4], 16).unwrap_or(0);
        let b = u8::from_str_radix(&hex[4..6], 16).unwrap_or(0);
        return (r, g, b);
    }
    (0, 0, 0)
}

#[cfg(windows)]
fn to_abgr(color: &str, opacity: u8, force_opaque: bool) -> u32 {
    let (r, g, b) = parse_hex_color(color);
    let a = if force_opaque {
        255u8
    } else {
        ((opacity as f32 / 100.0) * 255.0).round().clamp(0.0, 255.0) as u8
    };
    (a as u32) | ((b as u32) << 8) | ((g as u32) << 16) | ((r as u32) << 24)
}

#[cfg(windows)]
fn is_windows_11() -> bool {
    #[repr(C)]
    struct OsVersionInfoExW {
        dw_os_version_info_size: DWORD,
        dw_major_version: DWORD,
        dw_minor_version: DWORD,
        dw_build_number: DWORD,
        dw_platform_id: DWORD,
        sz_csd_version: [u16; 128],
        w_service_pack_major: u16,
        w_service_pack_minor: u16,
        w_suite_mask: u16,
        w_product_type: u8,
        w_reserved: u8,
    }

    type RtlGetVersionFn = unsafe extern "system" fn(*mut OsVersionInfoExW) -> i32;

    unsafe {
        let ntdll = LoadLibraryW(to_wide("ntdll.dll").as_ptr());
        if ntdll.is_null() {
            return false;
        }
        let proc = GetProcAddress(ntdll, "RtlGetVersion\0".as_ptr() as *const i8);
        if proc.is_null() {
            return false;
        }
        let rtl_get_version: RtlGetVersionFn = std::mem::transmute(proc);
        let mut info = OsVersionInfoExW {
            dw_os_version_info_size: std::mem::size_of::<OsVersionInfoExW>() as u32,
            dw_major_version: 0,
            dw_minor_version: 0,
            dw_build_number: 0,
            dw_platform_id: 0,
            sz_csd_version: [0; 128],
            w_service_pack_major: 0,
            w_service_pack_minor: 0,
            w_suite_mask: 0,
            w_product_type: 0,
            w_reserved: 0,
        };
        if rtl_get_version(&mut info) != 0 {
            return false;
        }
        info.dw_major_version == 10 && info.dw_build_number >= 22000
    }
}

#[cfg(windows)]
fn resolve_accent_state(mode: &str) -> i32 {
    match mode {
        "opaque" => ACCENT_ENABLE_GRADIENT,
        "transparent" => {
            if is_windows_11() {
                ACCENT_ENABLE_HOSTBACKDROP
            } else {
                ACCENT_ENABLE_TRANSPARENTGRADIENT
            }
        }
        "blur" => ACCENT_ENABLE_BLURBEHIND,
        "acrylic" => ACCENT_ENABLE_ACRYLICBLURBEHIND,
        _ => ACCENT_DISABLED,
    }
}

#[cfg(windows)]
fn get_set_window_composition_attribute() -> Result<SetWindowCompositionAttributeFn, String> {
    unsafe {
        let user32 = LoadLibraryW(to_wide("user32.dll").as_ptr());
        if user32.is_null() {
            return Err("Failed to load user32.dll".to_string());
        }
        let proc = GetProcAddress(
            user32,
            "SetWindowCompositionAttribute\0".as_ptr() as *const i8,
        );
        if proc.is_null() {
            return Err("SetWindowCompositionAttribute not available".to_string());
        }
        Ok(std::mem::transmute(proc))
    }
}

#[cfg(windows)]
fn apply_to_window(hwnd: HWND, accent: i32, color: u32) -> Result<(), String> {
    if hwnd.is_null() {
        return Ok(());
    }
    unsafe {
        if accent == ACCENT_DISABLED {
            SendMessageW(
                hwnd,
                WM_DWMCOMPOSITIONCHANGED,
                1 as WPARAM,
                0 as LPARAM,
            );
            return Ok(());
        }

        if accent == ACCENT_ENABLE_HOSTBACKDROP {
            let backdrop: DWORD = DWMSBT_TRANSIENTWINDOW;
            let _ = DwmSetWindowAttribute(
                hwnd,
                DWMWA_SYSTEMBACKDROP_TYPE,
                &backdrop as *const _ as *const c_void,
                std::mem::size_of::<DWORD>() as u32,
            );
        } else {
            let backdrop: DWORD = DWMSBT_NONE;
            let _ = DwmSetWindowAttribute(
                hwnd,
                DWMWA_SYSTEMBACKDROP_TYPE,
                &backdrop as *const _ as *const c_void,
                std::mem::size_of::<DWORD>() as u32,
            );
        }

        let set_wca = get_set_window_composition_attribute()?;
        let is_acrylic = accent == ACCENT_ENABLE_ACRYLICBLURBEHIND;
        let flags = if is_acrylic { 0 } else { 2 };
        let mut policy = AccentPolicy {
            accent_state: accent,
            accent_flags: flags,
            gradient_color: color,
            animation_id: 0,
        };
        let mut data = WindowCompositionAttribData {
            attribute: WCA_ACCENT_POLICY,
            data: &mut policy as *mut _ as *mut c_void,
            size_of_data: std::mem::size_of::<AccentPolicy>(),
        };
        let result = set_wca(hwnd, &mut data);
        if result == 0 {
            return Err("SetWindowCompositionAttribute failed".to_string());
        }
    }
    Ok(())
}

#[cfg(windows)]
struct ApplyPayload {
    accent: i32,
    color: u32,
}

#[cfg(windows)]
unsafe extern "system" fn enum_child_proc(hwnd: HWND, lparam: LPARAM) -> i32 {
    if lparam == 0 {
        return 1;
    }
    let payload = &*(lparam as *const ApplyPayload);
    let _ = apply_to_window(hwnd, payload.accent, payload.color);
    1
}

#[cfg(windows)]
fn apply_to_children(parent: HWND, accent: i32, color: u32) {
    if parent.is_null() {
        return;
    }
    let payload = ApplyPayload { accent, color };
    unsafe {
        EnumChildWindows(parent, Some(enum_child_proc), &payload as *const _ as LPARAM);
    }
}

#[cfg(windows)]
fn apply_taskbar_appearance(mode: &str, color: &str, opacity: u8) -> Result<(), String> {
    let accent = resolve_accent_state(mode);

    let mut opacity = opacity;
    if accent == ACCENT_ENABLE_ACRYLICBLURBEHIND && opacity == 0 {
        opacity = 1;
    }
    let force_opaque = accent == ACCENT_ENABLE_GRADIENT;
    let abgr = to_abgr(color, opacity, force_opaque);

    let primary = unsafe { FindWindowW(to_wide("Shell_TrayWnd").as_ptr(), std::ptr::null()) };
    let secondary =
        unsafe { FindWindowW(to_wide("Shell_SecondaryTrayWnd").as_ptr(), std::ptr::null()) };

    apply_to_window(primary, accent, abgr)?;
    apply_to_children(primary, accent, abgr);
    apply_to_window(secondary, accent, abgr)?;
    apply_to_children(secondary, accent, abgr);
    Ok(())
}

#[cfg(windows)]
fn find_translucenttb_appx() -> Option<(String, PathBuf)> {
    let local = std::env::var("LOCALAPPDATA").ok()?;
    let packages = Path::new(&local).join("Packages");
    let entries = std::fs::read_dir(packages).ok()?;
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if !name.to_lowercase().contains("translucenttb") {
            continue;
        }
        let roaming = entry.path().join("RoamingState");
        if roaming.exists() {
            let config = roaming.join("settings.json");
            return Some((name, config));
        }
    }
    None
}

#[cfg(windows)]
fn find_translucenttb_exe() -> Option<(PathBuf, PathBuf)> {
    let local = std::env::var("LOCALAPPDATA").ok();
    let pf = std::env::var("ProgramFiles").ok();
    let pfx = std::env::var("ProgramFiles(x86)").ok();

    let mut candidates = Vec::new();
    if let Some(local) = local {
        candidates.push(PathBuf::from(local).join("Programs").join("TranslucentTB").join("TranslucentTB.exe"));
    }
    if let Some(pf) = pf {
        candidates.push(PathBuf::from(pf).join("TranslucentTB").join("TranslucentTB.exe"));
    }
    if let Some(pfx) = pfx {
        candidates.push(PathBuf::from(pfx).join("TranslucentTB").join("TranslucentTB.exe"));
    }

    for exe in candidates {
        if exe.exists() {
            let config = exe.parent().unwrap_or_else(|| Path::new(".")).join("settings.json");
            return Some((exe, config));
        }
    }
    None
}

#[cfg(windows)]
fn launch_translucenttb_appx(family: &str) {
    let aumid = format!("{}!TranslucentTB", family);
    let _ = std::process::Command::new("explorer.exe")
        .arg(format!("shell:AppsFolder\\{}", aumid))
        .status();
}

#[cfg(windows)]
fn launch_translucenttb_exe(exe: &Path) {
    let _ = std::process::Command::new(exe).spawn();
}

#[cfg(windows)]
fn write_translucenttb_config(path: &Path, mode: &str, color: &str, opacity: u8) -> Result<(), String> {
    let accent = match mode {
        "opaque" => "opaque",
        "transparent" => "clear",
        "blur" => "blur",
        "acrylic" => "acrylic",
        _ => "normal",
    };

    let (r, g, b) = parse_hex_color(color);
    let alpha = ((opacity as f32 / 100.0) * 255.0).round().clamp(0.0, 255.0) as u8;
    let rgba = format!("#{:02X}{:02X}{:02X}{:02X}", r, g, b, alpha);

    let appearance = serde_json::json!({
        "accent": accent,
        "color": rgba,
        "show_peek": true,
        "show_line": true,
        "blur_radius": 9.0
    });

    let config = serde_json::json!({
        "$schema": TTB_SCHEMA,
        "desktop_appearance": appearance,
        "visible_window_appearance": {
            "enabled": true,
            "accent": accent,
            "color": appearance["color"],
            "show_peek": true,
            "show_line": true,
            "blur_radius": 9.0
        },
        "maximized_window_appearance": {
            "enabled": true,
            "accent": accent,
            "color": appearance["color"],
            "show_peek": true,
            "show_line": true,
            "blur_radius": 9.0
        },
        "start_opened_appearance": { "enabled": false },
        "search_opened_appearance": { "enabled": false },
        "task_view_opened_appearance": { "enabled": false },
        "battery_saver_appearance": { "enabled": false }
    });

    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    std::fs::write(path, serde_json::to_string_pretty(&config).unwrap())
        .map_err(|e| format!("Failed to write settings.json: {}", e))?;
    Ok(())
}

#[cfg(windows)]
fn apply_via_translucenttb(mode: &str, color: &str, opacity: u8) -> Result<(), String> {
    if let Some((family, config)) = find_translucenttb_appx() {
        write_translucenttb_config(&config, mode, color, opacity)?;
        launch_translucenttb_appx(&family);
        return Ok(());
    }
    if let Some((exe, config)) = find_translucenttb_exe() {
        write_translucenttb_config(&config, mode, color, opacity)?;
        launch_translucenttb_exe(&exe);
        return Ok(());
    }
    Err("TranslucentTB is not installed. Please install it first.".to_string())
}

pub fn apply_from_config() -> Result<(), String> {
    #[cfg(not(windows))]
    {
        return Err("Taskbar appearance is supported on Windows only".to_string());
    }
    #[cfg(windows)]
    {
        let local = std::env::var("LOCALAPPDATA").map_err(|_| "LOCALAPPDATA not set")?;
        let path = std::path::Path::new(&local).join("ConfUtils").join("taskbar.json");
        let raw = std::fs::read_to_string(&path)
            .map_err(|_| format!("Taskbar config not found at {}", path.display()))?;
        let cfg: TaskbarConfig =
            serde_json::from_str(&raw).map_err(|_| "Invalid taskbar config".to_string())?;
        if apply_via_translucenttb(&cfg.mode, &cfg.color, cfg.opacity).is_ok() {
            return Ok(());
        }
        apply_taskbar_appearance(&cfg.mode, &cfg.color, cfg.opacity)
    }
}

pub fn handle_cli_apply() -> bool {
    let args: Vec<String> = std::env::args().collect();
    if args.iter().any(|arg| arg == "--taskbar-apply") {
        let _ = apply_from_config();
        std::process::exit(0);
    }
    false
}

pub fn set_taskbar_appearance(mode: String, color: String, opacity: u8) -> Result<(), String> {
    #[cfg(not(windows))]
    {
        return Err("Taskbar appearance is supported on Windows only".to_string());
    }
    #[cfg(windows)]
    {
        if apply_via_translucenttb(&mode, &color, opacity).is_ok() {
            return Ok(());
        }
        apply_taskbar_appearance(&mode, &color, opacity)
    }
}

#[cfg(windows)]
pub fn install_translucenttb() -> Result<String, String> {
    let status = std::process::Command::new("winget")
        .args([
            "install",
            "--id",
            "CharlesMilette.TranslucentTB",
            "--exact",
            "--silent",
        ])
        .status()
        .map_err(|e| format!("Failed to run winget: {}", e))?;
    if status.success() {
        Ok("TranslucentTB installed".to_string())
    } else {
        Err("Winget failed to install TranslucentTB".to_string())
    }
}
