#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod anti_debug;
mod hwid;
mod security;

use tauri::Manager;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use obfstr::obfstr;

fn main() {
    if anti_debug::is_being_debugged() {
        std::process::exit(0);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window(obfstr!("main")) {
                let _ = window.show();
                let _ = window.set_focus();
                let _ = window.unminimize();
            }
        }))
        .setup(|app| {
            std::thread::spawn(|| {
                loop {
                    if anti_debug::is_being_debugged() {
                        std::process::exit(0);
                    }
                    std::thread::sleep(std::time::Duration::from_secs(60));
                }
            });

            let show_i = MenuItem::with_id(app, obfstr!("show"), obfstr!("Show ConfUtils"), true, None::<&str>)?;
            let hide_i = MenuItem::with_id(app, obfstr!("hide"), obfstr!("Hide to Tray"), true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, obfstr!("quit"), obfstr!("Quit"), true, None::<&str>)?;

            let menu = Menu::with_items(app, &[&show_i, &hide_i, &quit_i])?;

            let _tray = TrayIconBuilder::with_id(obfstr!("main"))
                .menu(&menu)
                .icon(app.default_window_icon().unwrap().clone())
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button, .. } = event {
                        if button == tauri::tray::MouseButton::Left {
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window(obfstr!("main")) {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window(obfstr!("main")) {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "hide" => {
                            if let Some(window) = app.get_webview_window(obfstr!("main")) {
                                let _ = window.hide();
                            }
                        }
                        "quit" => {
                            std::process::exit(0);
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::check_online_status,
            commands::run_powershell,
            commands::start_service,
            commands::stop_service,
            commands::get_service_status,
            commands::list_services,
            commands::get_service_details,
            commands::set_service_startup_type,
            commands::restart_service,
            commands::read_registry,
            commands::write_registry,
            commands::get_system_info,
            commands::get_disk_usage,
            commands::check_windows_updates,
            commands::clear_temp_files,
            commands::disable_telemetry,
            commands::get_defender_status,
            commands::list_startup_programs,
            commands::toggle_startup_program,
            commands::list_network_adapters,
            commands::flush_dns_cache,
            commands::list_processes,
            commands::kill_process,
            commands::get_cpu_usage,
            commands::get_memory_usage,
            commands::get_disk_info,
            commands::get_battery_status,
            commands::get_network_stats,
            commands::get_uptime,
            commands::get_detailed_specs,
            commands::check_ssd_health,
            commands::get_firewall_status,
            commands::get_last_update_time,
            commands::optimize_ssd,
            commands::rebuild_search_index,
            commands::run_disk_cleanup,
            commands::toggle_location_services,
            commands::toggle_microphone_access,
            commands::toggle_camera_access,
            commands::clear_activity_history,
            commands::clear_browser_data,
            commands::disable_recall,
            commands::disable_telemetry_advanced,
            commands::remove_onedrive,
            commands::disable_location_tracking_advanced,
            commands::remove_home_gallery,
            commands::disable_teredo,
            commands::block_adobe_network,
            commands::debloat_adobe,
            commands::disable_consumer_features,
            commands::disable_game_dvr,
            commands::disable_hibernation,
            commands::apply_hosts_blocklist,
            commands::remove_hosts_blocklist,
            commands::get_hosts_blocklist_status,
            commands::apply_privacy_firewall_rules,
            commands::remove_privacy_firewall_rules,
            commands::get_privacy_firewall_status,
            commands::open_device_manager,
            commands::scan_device_issues,
            commands::scan_outdated_drivers,
            commands::scan_app_leftovers,
            commands::scan_registry_health,
            commands::apply_storage_sense_profile,
            commands::run_privacy_audit,
            commands::scan_hidden_services,
            commands::scan_open_ports,
            commands::analyze_junk_origins,
            commands::apply_power_audio_optimizations,
            commands::revert_power_audio_optimizations,
            commands::monitor_app_usage,
            commands::get_fast_startup_status,
            commands::set_power_plan,
            commands::get_current_power_plan,
            commands::set_terminal_default_ps7,
            commands::create_restore_point,
            commands::list_restore_points,
            commands::restore_system,
            commands::delete_restore_point,
            commands::debloat_edge,
            commands::disable_powershell7_telemetry,
            commands::disable_storage_sense,
            commands::disable_wifi_sense,
            commands::toggle_end_task_right_click,
            commands::get_end_task_status,
            commands::prefer_ipv4_over_ipv6,
            commands::set_hibernation_default,
            commands::disable_background_apps,
            commands::disable_fullscreen_optimizations,
            commands::disable_intel_mm,
            commands::disable_ipv6,
            commands::disable_copilot,
            commands::disable_notification_tray,
            commands::set_dns,
            commands::remove_all_store_apps,
            commands::remove_edge,
            commands::set_classic_right_click,
            commands::set_display_for_performance,
            commands::set_time_utc,
            commands::enable_autostart,
            commands::install_winget_package,
            commands::get_installed_apps,
            commands::get_appx_packages,
            commands::update_winget_package,
            commands::uninstall_winget_package,
            commands::remove_appx_package,
            commands::add_ultimate_power_plan,
            commands::remove_ultimate_power_plan,
            commands::remove_adobe_creative_cloud,
            commands::reset_network,
            commands::reset_windows_update,
            commands::run_system_corruption_scan,
            commands::reinstall_winget,
            commands::set_services_manual,
            commands::clone_discord_server,
            commands::clone_messages,
            commands::start_live_message_cloner,
            commands::stop_live_message_cloner,
            commands::cancel_message_clone,
            commands::cancel_discord_clone,
            commands::spam_reactions,
            commands::change_nickname,
            commands::bulk_delete_messages,
            commands::dm_bomber,
            commands::purge_channel,
            commands::clone_role,
            commands::check_token,
            commands::get_token_info,
            commands::spam_webhook,
            commands::stop_webhook_spam,
            commands::delete_webhook,
            commands::backup_guild,
            commands::restore_guild,
            commands::change_hypesquad_house,
            commands::leave_hypesquad,
            commands::generate_system_report,
            commands::open_system_info,
            commands::get_binary_hash,
            commands::check_debugger,
            commands::is_debugger_attached,
            commands::terminate_if_debugged,
            commands::get_hwid,
            commands::get_hwid_string,
            commands::verify_hwid,
            commands::get_session_fingerprint,
            commands::force_exit,
            commands::get_wifi_passwords,
            commands::get_connected_devices,
            commands::get_active_connections,
            commands::disconnect_network,
            commands::get_router_info,
            commands::secure_delete_file,
            commands::set_discord_rpc,
            commands::clear_discord_rpc,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}