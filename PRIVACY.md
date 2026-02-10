# ConfUtils - Privacy Policy

**Last Updated:** 2025-02-07
**Version:** 2.1.21

## Introduction

ConfUtils ("Application", "We") is a Windows system utilities toolkit. This privacy policy explains how ConfUtils collects, uses, and protects user data.

**ConfUtils is a local-first application. All system operations are performed entirely on your device.**

---

## 1. Data Collection

### 1.1 Data We Do NOT Collect
- No personal information (name, email, address)
- No usage analytics or telemetry
- No crash reports sent to external servers
- No advertising identifiers
- No browsing history or search queries
- No keystroke logging
- No screenshots or screen recordings

### 1.2 Locally Stored Data
The following data is stored **only on your device** and is never transmitted:

| Data | Location | Purpose |
|------|----------|---------|
| Application settings | Windows Registry (`HKCU\SOFTWARE\ConfUtils`) | Store user preferences |
| Taskbar style preferences | Registry (`HKCU\SOFTWARE\ConfUtils\TaskbarStyle`) | TranslucentTB mode persistence |
| System restore points | Windows System Restore | Backup before system changes |

### 1.3 Hardware Identifier (HWID)
- ConfUtils generates a hardware-based identifier using CPU, motherboard, disk serial, and MAC address
- This identifier is computed **locally** using SHA-256 hashing
- The HWID is **never transmitted** to any server

---

## 2. Network Communications

### 2.1 Outbound Connections
ConfUtils may make the following network requests:

| Connection | Purpose | Data Sent |
|------------|---------|-----------|
| `discord.com` API | Discord Rich Presence (optional) | Application name, current activity status |
| Windows Update servers | Check for Windows updates (user-initiated) | Standard Windows Update telemetry |
| `winget` package sources | Software installation (user-initiated) | Package search queries |
| Discord API | Discord utility features (user-initiated, requires user token) | User-provided authentication token |

### 2.2 No Background Network Activity
- ConfUtils does **not** make any network requests without explicit user action
- No "phone home" or update-check connections
- No data is sent to ConfUtils developers or third parties

### 2.3 Discord Rich Presence
- When enabled, ConfUtils communicates with the local Discord client via IPC
- Only the application name and activity status are shared with Discord
- This feature is **optional** and can be disabled

---

## 3. System Modifications

ConfUtils performs system-level operations **only when explicitly requested** by the user:

### 3.1 Registry Modifications
- Privacy settings (telemetry, advertising ID, location services)
- Power plan configurations
- Visual effect settings
- Taskbar appearance settings
- Startup program management

### 3.2 Service Management
- Starting, stopping, and configuring Windows services
- Modifying service startup types

### 3.3 File System Operations
- Clearing temporary files and caches
- Managing hosts file entries (ad/telemetry blocking)
- System restore point creation/management

### 3.4 Network Configuration
- DNS cache flushing
- DNS server configuration
- Firewall rule management (privacy rules)
- IPv4/IPv6 preference settings

**All system modifications are reversible** through Windows System Restore or through the application's built-in restore functionality.

---

## 4. Third-Party Services

| Service | Usage | Data Shared |
|---------|-------|-------------|
| Discord (IPC) | Rich Presence display | App name, activity status |
| Discord API | Discord utilities (user-initiated) | User-provided token |
| winget / Microsoft Store | Package installation | Package search queries |

No other third-party services, SDKs, analytics platforms, or advertising networks are used.

---

## 5. Data Security

- All operations are performed with the user's existing Windows permissions
- No data is encrypted or stored by ConfUtils itself (beyond standard Windows Registry)
- Administrative operations require explicit UAC elevation
- The application does not store passwords, credentials, or sensitive personal data

---

## 6. Children's Privacy

ConfUtils does not knowingly collect personal information from children under the age of 13. The application performs local system operations only and does not collect or transmit personal data from any user.

---

## 7. Open Source

ConfUtils is open-source software licensed under AGPL-3.0. The source code is publicly available for review:
- **Source Code:** [github.com/3mreconf/confutils](https://github.com/3mreconf/confutils)
- **License:** GNU Affero General Public License v3.0

This allows independent verification of our privacy practices.

---

## 8. User Rights

Users have full control over their data:
- **Access:** All settings are stored in standard Windows Registry locations
- **Deletion:** Uninstalling the application removes all application data
- **Portability:** Settings can be exported via Windows Registry export
- **Reversal:** System changes can be reversed through System Restore

---

## 9. Policy Changes

This privacy policy may be updated periodically. Changes will be:
- Published on the GitHub repository
- Reflected in the "Last Updated" date
- Noted in release changelogs for significant changes

---

## 10. Contact

For privacy-related questions:
- **Developer:** 3mreconf
- **GitHub:** [github.com/3mreconf/confutils](https://github.com/3mreconf/confutils)
- **Issues:** [github.com/3mreconf/confutils/issues](https://github.com/3mreconf/confutils/issues)
- **Email:** emre.conf@gmail.com

---

## 11. Legal Compliance

This privacy policy is prepared in compliance with:
- **GDPR** (General Data Protection Regulation - EU)
- **KVKK** (Personal Data Protection Law - Turkey)
- **CCPA** (California Consumer Privacy Act - USA)

---

> **Summary:** ConfUtils is a local-first system utility that performs all operations on your device. No personal data is collected, stored, or transmitted to external servers. Discord Rich Presence is the only optional network feature, and it communicates only with your local Discord client. The application is open-source, allowing full transparency and independent verification.
