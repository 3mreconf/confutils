#[cfg(windows)]
use std::path::{Path, PathBuf};
#[cfg(windows)]
use std::process::Command;

#[cfg(windows)]
fn build_taskbar_tap() {
    let src = PathBuf::from("native").join("taskbar_tap").join("taskbar_tap.cpp");
    println!("cargo:rerun-if-changed={}", src.display());
    let out_dir = PathBuf::from(std::env::var("OUT_DIR").expect("OUT_DIR not set"));
    let dll_out = out_dir.join("ConfUtilsTaskbarTap.dll");

    let vswhere = Path::new(r"C:\Program Files (x86)\Microsoft Visual Studio\Installer\vswhere.exe");
    if !vswhere.exists() {
        return;
    }

    let output = Command::new(vswhere)
        .args([
            "-latest",
            "-products",
            "*",
            "-requires",
            "Microsoft.Component.MSBuild",
            "-property",
            "installationPath",
        ])
        .output();
    let Ok(output) = output else { return };
    let install = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if install.is_empty() {
        return;
    }

    let vcvars = Path::new(&install)
        .join("VC")
        .join("Auxiliary")
        .join("Build")
        .join("vcvars64.bat");
    if !vcvars.exists() {
        return;
    }

    let cmd = format!(
        "\"{}\" && cl /nologo /EHsc /LD /O2 /std:c++17 /DUNICODE /D_UNICODE \"{}\" /link /OUT:\"{}\" user32.lib dwmapi.lib",
        vcvars.display(),
        src.display(),
        dll_out.display()
    );

    let _ = Command::new("cmd").args(["/C", &cmd]).status();

    if !dll_out.exists() {
        let fallback = PathBuf::from("native").join("taskbar_tap").join("ConfUtilsTaskbarTap.dll");
        if fallback.exists() {
            let _ = std::fs::copy(&fallback, &dll_out);
        }
    }
}

fn main() {
    #[cfg(windows)]
    build_taskbar_tap();

    // Ensure `tauri dev` picks up icon changes without requiring a manual clean.
    // Cargo only re-runs build scripts when inputs change (tracked via rerun-if-changed).
    println!("cargo:rerun-if-changed=app-icon.svg");
    println!("cargo:rerun-if-changed=icons/icon.ico");
    println!("cargo:rerun-if-changed=icons/icon.icns");
    println!("cargo:rerun-if-changed=icons/icon.png");
    println!("cargo:rerun-if-changed=icons/32x32.png");
    println!("cargo:rerun-if-changed=icons/128x128.png");
    println!("cargo:rerun-if-changed=icons/128x128@2x.png");

    let mut windows = tauri_build::WindowsAttributes::new();

    windows = windows.app_manifest(r#"<assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0">
  <trustInfo xmlns="urn:schemas-microsoft-com:asm.v3">
    <security>
      <requestedPrivileges>
        <requestedExecutionLevel level="requireAdministrator" uiAccess="false"/>
      </requestedPrivileges>
    </security>
  </trustInfo>
  <dependency>
    <dependentAssembly>
      <assemblyIdentity
        type="win32"
        name="Microsoft.Windows.Common-Controls"
        version="6.0.0.0"
        processorArchitecture="*"
        publicKeyToken="6595b64144ccf1df"
        language="*"
      />
    </dependentAssembly>
  </dependency>
</assembly>"#);

    let attrs = tauri_build::Attributes::new().windows_attributes(windows);
    tauri_build::try_build(attrs).expect("failed to run tauri build script");
}
