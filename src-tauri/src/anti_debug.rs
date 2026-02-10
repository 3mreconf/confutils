use std::time::{Duration, Instant};
use sysinfo::{System, ProcessRefreshKind, RefreshKind, ProcessesToUpdate};

#[cfg(windows)]
use winapi::um::debugapi::IsDebuggerPresent;
#[cfg(windows)]
use winapi::um::debugapi::CheckRemoteDebuggerPresent;
#[cfg(windows)]
use winapi::um::processthreadsapi::GetCurrentProcess;

#[cfg(windows)]
pub fn is_debugger_present() -> bool {
    let mut is_remote_debugger_present = 0;
    unsafe {
        let current_process = GetCurrentProcess();
        CheckRemoteDebuggerPresent(current_process, &mut is_remote_debugger_present);
        IsDebuggerPresent() != 0 || is_remote_debugger_present != 0
    }
}

#[cfg(not(windows))]
pub fn is_debugger_present() -> bool {
    false
}

pub fn check_timing_anomaly() -> bool {
    let iterations = 1000;
    let start = Instant::now();

    let mut sum = 0u64;
    for i in 0..iterations {
        sum = sum.wrapping_add(i);
    }

    let elapsed = start.elapsed();

    if elapsed > Duration::from_millis(10) {
        return true;
    }

    if sum == 0 {
        return true;
    }

    false
}

pub fn check_parent_process(system: &System) -> bool {
    let current_pid = std::process::id();

    if let Some(current_process) = system.process(sysinfo::Pid::from(current_pid as usize)) {
        if let Some(parent_pid) = current_process.parent() {
            if let Some(parent_process) = system.process(parent_pid) {
                let parent_name = parent_process.name().to_string_lossy().to_lowercase();

                let suspicious_processes = [
                    "cheatengine",
                    "x64dbg",
                    "x32dbg",
                    "ollydbg",
                    "windbg",
                    "ida",
                    "ida64",
                    "idaq",
                    "idaq64",
                    "idaw",
                    "idaw64",
                    "scylla",
                    "protection_id",
                    "reshacker",
                    "importrec",
                    "immunitydebugger",
                    "devenv",
                ];

                for suspicious in &suspicious_processes {
                    if parent_name.contains(suspicious) {
                        return true;
                    }
                }
            }
        }
    }

    false
}

pub fn check_suspicious_processes(system: &System) -> bool {
    let suspicious_processes = [
        "cheatengine-x86_64.exe",
        "cheatengine-x86_64-sse4-avx2.exe",
        "cheatengine.exe",
        "x64dbg.exe",
        "x32dbg.exe",
        "ollydbg.exe",
        "windbg.exe",
        "ida.exe",
        "ida64.exe",
        "idaq.exe",
        "idaq64.exe",
        "scylla_x64.exe",
        "scylla_x86.exe",
        "protection_id.exe",
        "reshacker.exe",
        "importrec.exe",
        "immunitydebugger.exe",
        "fiddler.exe",
        "wireshark.exe",
        "processhacker.exe",
        "procexp.exe",
        "procexp64.exe",
    ];

    for process in system.processes().values() {
        let process_name = process.name().to_string_lossy().to_lowercase();

        for suspicious in &suspicious_processes {
            if process_name == suspicious.to_lowercase() {
                return true;
            }
        }
    }

    false
}

#[cfg(windows)]
pub fn check_hardware_breakpoints() -> bool {
    use winapi::um::winnt::CONTEXT;
    use winapi::um::winnt::CONTEXT_DEBUG_REGISTERS;
    use winapi::um::processthreadsapi::GetCurrentThread;
    use winapi::um::processthreadsapi::GetThreadContext;

    unsafe {
        let mut context: CONTEXT = std::mem::zeroed();
        context.ContextFlags = CONTEXT_DEBUG_REGISTERS;

        let thread_handle = GetCurrentThread();

        if GetThreadContext(thread_handle, &mut context) != 0 {
            if context.Dr0 != 0 || context.Dr1 != 0 || context.Dr2 != 0 || context.Dr3 != 0 {
                return true;
            }
        }
    }

    false
}

#[cfg(not(windows))]
pub fn check_hardware_breakpoints() -> bool {
    false
}

pub fn is_vm(system: &System) -> bool {
    let vm_indicators = [
        "vmware",
        "vbox",
        "virtualbox",
        "qemu",
        "xen",
        "hyper-v",
        "parallels",
    ];

    for process in system.processes().values() {
        let name = process.name().to_string_lossy().to_lowercase();
        for indicator in &vm_indicators {
            if name.contains(indicator) {
                return true;
            }
        }
    }

    #[cfg(windows)]
    {
        use winreg::enums::*;
        use winreg::RegKey;

        let hkcu = RegKey::predef(HKEY_LOCAL_MACHINE);
        if let Ok(bios) = hkcu.open_subkey("HARDWARE\\Description\\System\\BIOS") {
            if let Ok(vendor) = bios.get_value::<String, &str>("SystemManufacturer") {
                let vendor = vendor.to_lowercase();
                for indicator in &vm_indicators {
                    if vendor.contains(indicator) {
                        return true;
                    }
                }
            }
        }
    }

    false
}

pub fn is_being_debugged() -> bool {
    if is_debugger_present() {
        return true;
    }

    if check_timing_anomaly() {
        return true;
    }

    let mut system = System::new_with_specifics(
        RefreshKind::new().with_processes(ProcessRefreshKind::new())
    );
    system.refresh_processes(ProcessesToUpdate::All);


    if check_parent_process(&system) {
        return true;
    }

    if check_suspicious_processes(&system) {
        return true;
    }

    if check_hardware_breakpoints() {
        return true;
    }

    if is_vm(&system) {
        return true;
    }

    false
}

pub struct DebugCheckResult {
    pub is_debugged: bool,
    pub debugger_present: bool,
    pub timing_anomaly: bool,
    pub suspicious_parent: bool,
    pub suspicious_process: bool,
    pub hardware_breakpoint: bool,
}

pub fn detailed_debug_check() -> DebugCheckResult {
    let mut system = System::new_with_specifics(
        RefreshKind::new().with_processes(ProcessRefreshKind::new())
    );
    system.refresh_processes(ProcessesToUpdate::All);


    DebugCheckResult {
        is_debugged: is_being_debugged(),
        debugger_present: is_debugger_present(),
        timing_anomaly: check_timing_anomaly(),
        suspicious_parent: check_parent_process(&system),
        suspicious_process: check_suspicious_processes(&system),
        hardware_breakpoint: check_hardware_breakpoints(),
    }
}