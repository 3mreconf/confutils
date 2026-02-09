#include <windows.h>
#include <dwmapi.h>
#include <string>
#include <vector>

#pragma comment(lib, "dwmapi.lib")

// {5E9C8D50-7A6B-4B8C-9E2E-7F8F6F4B8A21}
static const GUID CLSID_ConfUtilsTaskbarTap =
    {0x5e9c8d50, 0x7a6b, 0x4b8c, {0x9e, 0x2e, 0x7f, 0x8f, 0x6f, 0x4b, 0x8a, 0x21}};

struct AccentPolicy {
  int AccentState;
  int AccentFlags;
  int GradientColor;
  int AnimationId;
};

struct WindowCompositionAttributeData {
  int Attribute;
  void* Data;
  int SizeOfData;
};

using SetWindowCompositionAttributeFn = BOOL(WINAPI*)(HWND, WindowCompositionAttributeData*);

static const int WCA_ACCENT_POLICY = 19;
static const int ACCENT_DISABLED = 0;
static const int ACCENT_ENABLE_GRADIENT = 1;
static const int ACCENT_ENABLE_TRANSPARENTGRADIENT = 2;
static const int ACCENT_ENABLE_BLURBEHIND = 3;
static const int ACCENT_ENABLE_ACRYLICBLURBEHIND = 4;
static const int ACCENT_ENABLE_HOSTBACKDROP = 5;

#ifndef DWMWA_SYSTEMBACKDROP_TYPE
#define DWMWA_SYSTEMBACKDROP_TYPE 38
#endif
#ifndef DWMSBT_NONE
#define DWMSBT_NONE 0
#endif
#ifndef DWMSBT_TRANSIENTWINDOW
#define DWMSBT_TRANSIENTWINDOW 3
#endif

struct Packet {
  DWORD mode;
  DWORD color;
  DWORD opacity;
};

static std::wstring GetLogPath() {
  wchar_t buffer[MAX_PATH] = {0};
  DWORD len = GetTempPathW(MAX_PATH, buffer);
  if (len == 0 || len >= MAX_PATH) {
    return L"C:\\\\Windows\\\\Temp\\\\confutils_taskbar_tap.log";
  }
  std::wstring path(buffer);
  if (!path.empty() && path.back() != L'\\') {
    path += L"\\";
  }
  path += L"confutils_taskbar_tap.log";
  return path;
}

static void LogLine(const std::wstring& line) {
  const auto path = GetLogPath();
  HANDLE file = CreateFileW(path.c_str(), FILE_APPEND_DATA, FILE_SHARE_READ, nullptr, OPEN_ALWAYS, FILE_ATTRIBUTE_NORMAL, nullptr);
  if (file == INVALID_HANDLE_VALUE) return;
  std::wstring lineWithNewline = line + L"\\r\\n";
  DWORD written = 0;
  WriteFile(file, lineWithNewline.c_str(), static_cast<DWORD>(lineWithNewline.size() * sizeof(wchar_t)), &written, nullptr);
  CloseHandle(file);
}

class ConfUtilsTap : public IUnknown {
 public:
  ConfUtilsTap() : ref_count_(1) {
    LogLine(L"ConfUtilsTap instance created");
  }

  HRESULT __stdcall QueryInterface(REFIID riid, void** ppvObject) override {
    if (!ppvObject) return E_POINTER;
    if (riid == IID_IUnknown) {
      *ppvObject = static_cast<IUnknown*>(this);
      AddRef();
      return S_OK;
    }
    *ppvObject = nullptr;
    return E_NOINTERFACE;
  }

  ULONG __stdcall AddRef() override { return InterlockedIncrement(&ref_count_); }
  ULONG __stdcall Release() override {
    ULONG value = InterlockedDecrement(&ref_count_);
    if (value == 0) {
      delete this;
    }
    return value;
  }

 private:
  ~ConfUtilsTap() = default;
  LONG ref_count_;
};

class ConfUtilsTapFactory : public IClassFactory {
 public:
  ConfUtilsTapFactory() : ref_count_(1) {}
  HRESULT __stdcall QueryInterface(REFIID riid, void** ppvObject) override {
    if (!ppvObject) return E_POINTER;
    if (riid == IID_IUnknown || riid == IID_IClassFactory) {
      *ppvObject = static_cast<IClassFactory*>(this);
      AddRef();
      return S_OK;
    }
    *ppvObject = nullptr;
    return E_NOINTERFACE;
  }
  ULONG __stdcall AddRef() override { return InterlockedIncrement(&ref_count_); }
  ULONG __stdcall Release() override {
    ULONG value = InterlockedDecrement(&ref_count_);
    if (value == 0) {
      delete this;
    }
    return value;
  }
  HRESULT __stdcall CreateInstance(IUnknown* pUnkOuter, REFIID riid, void** ppvObject) override {
    if (pUnkOuter) return CLASS_E_NOAGGREGATION;
    auto* obj = new (std::nothrow) ConfUtilsTap();
    if (!obj) return E_OUTOFMEMORY;
    HRESULT hr = obj->QueryInterface(riid, ppvObject);
    obj->Release();
    return hr;
  }
  HRESULT __stdcall LockServer(BOOL) override { return S_OK; }

 private:
  ~ConfUtilsTapFactory() = default;
  LONG ref_count_;
};

static bool IsWindows11() {
  typedef LONG(WINAPI* RtlGetVersionPtr)(PRTL_OSVERSIONINFOW);
  HMODULE hMod = GetModuleHandleW(L"ntdll.dll");
  if (!hMod) return false;
  auto rtlGetVersion = reinterpret_cast<RtlGetVersionPtr>(GetProcAddress(hMod, "RtlGetVersion"));
  if (!rtlGetVersion) return false;
  RTL_OSVERSIONINFOW info = {0};
  info.dwOSVersionInfoSize = sizeof(info);
  if (rtlGetVersion(&info) != 0) return false;
  return info.dwMajorVersion == 10 && info.dwBuildNumber >= 22000;
}

static int ResolveAccentState(DWORD mode) {
  switch (mode) {
    case 1: return ACCENT_ENABLE_GRADIENT;
    case 2: return IsWindows11() ? ACCENT_ENABLE_HOSTBACKDROP : ACCENT_ENABLE_TRANSPARENTGRADIENT;
    case 3: return ACCENT_ENABLE_BLURBEHIND;
    case 4: return ACCENT_ENABLE_ACRYLICBLURBEHIND;
    default: return ACCENT_DISABLED;
  }
}

static int ToAbgr(DWORD color, DWORD opacity, bool forceOpaque) {
  int r = (color >> 16) & 0xFF;
  int g = (color >> 8) & 0xFF;
  int b = color & 0xFF;
  int a = forceOpaque ? 255 : (int)((opacity / 100.0) * 255.0 + 0.5);
  if (a < 0) a = 0;
  if (a > 255) a = 255;
  return (a) | (b << 8) | (g << 16) | (r << 24);
}

static void ApplyBackdrop(HWND hwnd, bool enable) {
  if (!hwnd) return;
  DWORD value = enable ? DWMSBT_TRANSIENTWINDOW : DWMSBT_NONE;
  DwmSetWindowAttribute(hwnd, DWMWA_SYSTEMBACKDROP_TYPE, &value, sizeof(value));
}

static void ApplyAccent(HWND hwnd, int accent, int color) {
  if (!hwnd) return;
  if (accent == ACCENT_DISABLED) {
    SendMessageW(hwnd, WM_DWMCOMPOSITIONCHANGED, 1, 0);
    return;
  }
  HMODULE user32 = GetModuleHandleW(L"user32.dll");
  if (!user32) return;
  auto setAttr = reinterpret_cast<SetWindowCompositionAttributeFn>(
      GetProcAddress(user32, "SetWindowCompositionAttribute"));
  if (!setAttr) return;

  const bool isAcrylic = accent == ACCENT_ENABLE_ACRYLICBLURBEHIND;
  AccentPolicy policy = {accent, isAcrylic ? 0 : 2, color, 0};
  WindowCompositionAttributeData data = {WCA_ACCENT_POLICY, &policy, sizeof(policy)};
  setAttr(hwnd, &data);
}

static void ApplyToWindow(HWND hwnd, int accent, int color) {
  if (!hwnd) return;
  ApplyBackdrop(hwnd, accent == ACCENT_ENABLE_HOSTBACKDROP);
  ApplyAccent(hwnd, accent, color);
}

struct ApplyPayload {
  int accent;
  int color;
};

static void ApplyToChildren(HWND hwnd, int accent, int color) {
  if (!hwnd) return;
  ApplyPayload payload{accent, color};
  EnumChildWindows(
      hwnd,
      [](HWND child, LPARAM lparam) -> BOOL {
        const auto* payload = reinterpret_cast<ApplyPayload*>(lparam);
        ApplyToWindow(child, payload->accent, payload->color);
        return TRUE;
      },
      reinterpret_cast<LPARAM>(&payload));
}

static void ApplyTaskbar(int accent, int color) {
  HWND primary = FindWindowW(L"Shell_TrayWnd", nullptr);
  HWND secondary = FindWindowW(L"Shell_SecondaryTrayWnd", nullptr);
  ApplyToWindow(primary, accent, color);
  ApplyToChildren(primary, accent, color);
  ApplyToWindow(secondary, accent, color);
  ApplyToChildren(secondary, accent, color);
}

static void HandlePacket(const Packet& pkt) {
  int accent = ResolveAccentState(pkt.mode);
  DWORD opacity = pkt.opacity;
  if (accent == ACCENT_ENABLE_ACRYLICBLURBEHIND && opacity == 0) {
    opacity = 1;
  }
  bool forceOpaque = accent == ACCENT_ENABLE_GRADIENT;
  int color = ToAbgr(pkt.color, opacity, forceOpaque);
  ApplyTaskbar(accent, color);
}

static DWORD WINAPI PipeThread(LPVOID) {
  const wchar_t* pipeName = L"\\\\.\\pipe\\ConfUtilsTaskbarTap";
  LogLine(L"Pipe thread started");
  while (true) {
    HANDLE pipe = CreateNamedPipeW(
        pipeName,
        PIPE_ACCESS_INBOUND,
        PIPE_TYPE_MESSAGE | PIPE_READMODE_MESSAGE | PIPE_WAIT,
        1,
        sizeof(Packet),
        sizeof(Packet),
        0,
        nullptr);
    if (pipe == INVALID_HANDLE_VALUE) {
        LogLine(L"CreateNamedPipe failed");
        Sleep(500);
        continue;
    }
    BOOL connected = ConnectNamedPipe(pipe, nullptr) ? TRUE : (GetLastError() == ERROR_PIPE_CONNECTED);
    if (connected) {
      Packet pkt = {};
      DWORD read = 0;
      if (ReadFile(pipe, &pkt, sizeof(pkt), &read, nullptr) && read == sizeof(pkt)) {
        LogLine(L"Packet received");
        HandlePacket(pkt);
      } else {
        LogLine(L"ReadFile failed");
      }
    }
    FlushFileBuffers(pipe);
    DisconnectNamedPipe(pipe);
    CloseHandle(pipe);
  }
  return 0;
}

BOOL APIENTRY DllMain(HMODULE hModule, DWORD reason, LPVOID) {
  if (reason == DLL_PROCESS_ATTACH) {
    DisableThreadLibraryCalls(hModule);
    LogLine(L"DllMain attach");
    HANDLE thread = CreateThread(nullptr, 0, PipeThread, nullptr, 0, nullptr);
    if (!thread) {
      LogLine(L"CreateThread failed");
    } else {
      CloseHandle(thread);
    }
  }
  return TRUE;
}

extern "C" HRESULT __stdcall DllGetClassObject(REFCLSID rclsid, REFIID riid, void** ppv) {
  if (!ppv) return E_POINTER;
  if (rclsid != CLSID_ConfUtilsTaskbarTap) return CLASS_E_CLASSNOTAVAILABLE;
  auto* factory = new (std::nothrow) ConfUtilsTapFactory();
  if (!factory) return E_OUTOFMEMORY;
  HRESULT hr = factory->QueryInterface(riid, ppv);
  factory->Release();
  return hr;
}

extern "C" HRESULT __stdcall DllCanUnloadNow() {
  return S_FALSE;
}
