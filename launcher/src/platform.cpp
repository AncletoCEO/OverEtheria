#include "app.hpp"

#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <filesystem>
#include <fstream>
#include <system_error>

#ifdef _WIN32
#include <windows.h>
#include <commdlg.h>
#include <shellapi.h>
#else
#include <spawn.h>
#include <sys/wait.h>
#include <unistd.h>
extern char **environ;
#endif

namespace fs = std::filesystem;

namespace oe {
namespace {

#ifdef _WIN32
std::wstring wide(const std::string &utf8);
std::string narrow(const std::wstring &w);
#endif

std::string exe_dir() {
#ifdef _WIN32
    wchar_t buffer[32768];
    const DWORD n = GetModuleFileNameW(nullptr, buffer, 32768);
    if (!n) return ".";
    return narrow(fs::path(std::wstring(buffer, n)).parent_path().wstring());
#else
    std::error_code ec;
    const fs::path p = fs::read_symlink("/proc/self/exe", ec);
    return ec ? "." : p.parent_path().string();
#endif
}

bool writable(const fs::path &dir) {
    std::error_code ec;
    fs::create_directories(dir, ec);
    const fs::path probe = dir / ".write-test";
    std::ofstream out(probe);
    if (!out) return false;
    out.close();
    fs::remove(probe, ec);
    return true;
}

std::string find_repo() {
    fs::path dir = exe_dir();
    for (int i = 0; i < 5; ++i) {
        if (fs::exists(dir / "scripts" / "prepare-game.ps1")) return dir.string();
        if (!dir.has_parent_path() || dir.parent_path() == dir) break;
        dir = dir.parent_path();
    }
    return exe_dir();
}

std::uint32_t le32(const std::uint8_t *p) {
    return static_cast<std::uint32_t>(p[0]) | (static_cast<std::uint32_t>(p[1]) << 8) |
           (static_cast<std::uint32_t>(p[2]) << 16) | (static_cast<std::uint32_t>(p[3]) << 24);
}

#ifdef _WIN32
std::wstring wide(const std::string &utf8) {
    if (utf8.empty()) return {};
    const int n = MultiByteToWideChar(CP_UTF8, 0, utf8.c_str(), -1, nullptr, 0);
    std::wstring out(static_cast<std::size_t>(n ? n - 1 : 0), L'\0');
    if (n > 1) MultiByteToWideChar(CP_UTF8, 0, utf8.c_str(), -1, out.data(), n);
    return out;
}

std::string narrow(const std::wstring &w) {
    if (w.empty()) return {};
    const int n = WideCharToMultiByte(CP_UTF8, 0, w.c_str(), -1, nullptr, 0, nullptr, nullptr);
    std::string out(static_cast<std::size_t>(n ? n - 1 : 0), '\0');
    if (n > 1) WideCharToMultiByte(CP_UTF8, 0, w.c_str(), -1, out.data(), n, nullptr, nullptr);
    return out;
}

std::wstring quote(const std::string &path) { return L"\"" + wide(path) + L"\""; }

std::ifstream open_file(const std::string &path) { return std::ifstream(fs::path(wide(path)), std::ios::binary); }

PROCESS_INFORMATION g_game{};
PROCESS_INFORMATION g_prepare{};
#else
std::ifstream open_file(const std::string &path) { return std::ifstream(path, std::ios::binary); }
#endif

#ifndef _WIN32
pid_t g_game_pid = -1;
#endif

}  // namespace

std::string data_dir() {
    static const std::string dir = [] {
        const fs::path portable = fs::path(exe_dir()) / "data";
        if (writable(portable)) return portable.string();
        if (const char *appdata = std::getenv("APPDATA")) {
            const fs::path p = fs::path(appdata) / "OverEtheria";
            if (writable(p)) return p.string();
        }
        const fs::path home = fs::path(std::getenv("HOME") ? std::getenv("HOME") : ".");
        const fs::path p = home / ".local" / "share" / "OverEtheria";
        writable(p);
        return p.string();
    }();
    return dir;
}

std::string config_path() { return (fs::path(data_dir()) / "launcher.ini").string(); }
std::string default_memcard() { return (fs::path(data_dir()) / "memcard.ps2").string(); }
std::string default_assets() { return (fs::path(data_dir()) / "game" / "disc").string(); }
bool assets_ready(const Config &c) {
    std::error_code ec;
    return !c.assets.empty() && fs::exists(fs::path(c.assets) / ".extracted", ec);
}
std::string quick_dir() { return (fs::path(data_dir()) / "quick").string(); }
std::string game_id(const Config &c) { return c.serial == "SLPM_660.33" ? "oz" : "sword"; }
std::string elf_name(const Config &c) { return c.serial == "SLPM_660.33" ? "SLPM_660.33" : "SLES_537.68"; }
std::string game_exe(const Config &c) { return (fs::path(c.game) / "build" / ("native-" + game_id(c)) / "ps2run.exe").string(); }
std::string game_elf(const Config &c) {
    return (fs::path(c.game) / "games" / game_id(c) / "disc" / elf_name(c)).string();
}

void apply_environment(const Config &c) {
#ifdef _WIN32
    SetEnvironmentVariableW(L"PS2_SCALE", wide(std::to_string(c.scale)).c_str());
#else
    setenv("PS2_SCALE", std::to_string(c.scale).c_str(), 1);
#endif
}

IsoCheck check_iso(const std::string &path) {
    IsoCheck check;
    std::error_code ec;
    if (!fs::exists(path, ec)) {
        check.message = "No existe el archivo indicado.";
        return check;
    }
    const auto size = fs::file_size(path, ec);
    if (ec || size < 1u << 20) {
        check.message = "El archivo es demasiado pequeño para ser un ISO de PS2.";
        return check;
    }
    std::ifstream in = open_file(path);
    if (!in) {
        check.message = "No se puede abrir el archivo (¿permisos?).";
        return check;
    }
    std::uint8_t pvd[2048] = {};
    in.seekg(16 * 2048);
    in.read(reinterpret_cast<char *>(pvd), sizeof pvd);
    if (!in || std::memcmp(pvd + 1, "CD001", 5) != 0) {
        check.message = "No parece un ISO 9660 (falta el volumen descriptor).";
        return check;
    }
    const std::uint8_t *root = pvd + 156;
    const std::uint32_t extent = le32(root + 2);
    const std::uint32_t length = le32(root + 10);
    std::vector<std::uint8_t> dir(std::min<std::uint32_t>(length, 1u << 20));
    in.clear();
    in.seekg(static_cast<std::streamoff>(extent) * 2048);
    in.read(reinterpret_cast<char *>(dir.data()), static_cast<std::streamsize>(dir.size()));
    if (!in) {
        check.message = "No se puede leer el directorio raíz del ISO.";
        return check;
    }
    for (std::size_t at = 0; at < dir.size();) {
        const std::uint8_t len = dir[at];
        if (!len || at + len > dir.size()) break;
        const std::uint8_t name_len = dir[at + 32];
        const std::string name(reinterpret_cast<const char *>(dir.data() + at + 33), name_len);
        if (name.rfind("SYSTEM.CNF", 0) == 0) {
            const std::uint32_t file_extent = le32(dir.data() + at + 2);
            const std::uint32_t file_size = le32(dir.data() + at + 10);
            std::string cnf(std::min<std::uint32_t>(file_size, 4096), '\0');
            in.clear();
            in.seekg(static_cast<std::streamoff>(file_extent) * 2048);
            in.read(cnf.data(), static_cast<std::streamsize>(cnf.size()));
            if (!in) {
                check.message = "No se puede leer SYSTEM.CNF del ISO.";
                return check;
            }
            if (cnf.find("SLES_537.68") != std::string::npos || cnf.find("SLPM_660.33") != std::string::npos) {
                check.ok = true;
                check.serial = cnf.find("SLPM_660.33") != std::string::npos ? "SLPM_660.33" : "SLES_537.68";
                check.message = check.serial == "SLPM_660.33" ? "Oz / The Sword of Etheria (Japón) reconocido."
                                                             : "Sword of Etheria (PAL) reconocido.";
            } else {
                check.message = "El ISO es de otro juego (SYSTEM.CNF no nombra SLES_537.68 ni SLPM_660.33).";
            }
            return check;
        }
        at += len;
    }
    check.message = "El ISO no tiene SYSTEM.CNF; no parece un disco de PS2.";
    return check;
}

bool game_built(const Config &c) {
    std::error_code ec;
    return fs::exists(game_exe(c), ec) && fs::exists(game_elf(c), ec);
}

bool prepare_game(const Config &c, const std::string &log_path) {
    const fs::path repo = find_repo();
#ifdef _WIN32
    const fs::path script = repo / "scripts" / "prepare-game.ps1";
    if (!fs::exists(script)) return false;
    // The script writes its own log (the launcher only reads it): a GUI parent has no console to pass on.
    const std::string inner = "-NoProfile -ExecutionPolicy Bypass -File \"" + script.string() + "\" -Iso \"" + c.iso +
                              "\" -Game \"" + c.game + "\" -GameId \"" + game_id(c) + "\" -Data \"" + data_dir() +
                              "\" -Log \"" + log_path + "\"";
    const std::wstring cmd = L"powershell " + wide(inner);
    STARTUPINFOW si{};
    si.cb = sizeof si;
    PROCESS_INFORMATION pi{};
    if (!CreateProcessW(nullptr, const_cast<wchar_t *>(cmd.c_str()), nullptr, nullptr, FALSE, CREATE_NO_WINDOW, nullptr, nullptr, &si, &pi))
        return false;
    CloseHandle(pi.hThread);
    if (g_prepare.hProcess) CloseHandle(g_prepare.hProcess);
    g_prepare = pi;
    return true;
#else
    const fs::path script = repo / "scripts" / "prepare-game.sh";
    if (!fs::exists(script)) return false;
    // Same arguments as the Windows path: the AppImage mount is read-only, so the data
    // folder (content, log, cloned runtime) must be the writable one of the user.
    const std::string cmd = "bash '" + script.string() + "' --iso '" + c.iso + "' --game '" + c.game + "' --game-id '" +
                            game_id(c) + "' --data '" + data_dir() + "' --log '" + log_path + "' > /dev/null 2>&1 &";
    return std::system(cmd.c_str()) == 0;
#endif
}

bool prepare_running() {
#ifdef _WIN32
    return g_prepare.hProcess && WaitForSingleObject(g_prepare.hProcess, 0) == WAIT_TIMEOUT;
#else
    return false;
#endif
}

int prepare_wait() {
#ifdef _WIN32
    if (!g_prepare.hProcess) return -1;
    WaitForSingleObject(g_prepare.hProcess, INFINITE);
    DWORD code = 1;
    GetExitCodeProcess(g_prepare.hProcess, &code);
    CloseHandle(g_prepare.hProcess);
    g_prepare.hProcess = nullptr;
    return static_cast<int>(code);
#else
    return 0;
#endif
}

bool spawn_game(const Config &c, std::string &error) {
    if (!game_built(c)) {
        error = "El juego no está construido todavía: usá «Preparar juego».";
        return false;
    }
    apply_environment(c);
    const std::string disc = assets_ready(c) ? c.assets : c.iso;
    std::vector<std::string> args = {
        game_exe(c), game_elf(c),
        "--disc", disc,
        "--memcard", c.memcard,
        "--quick-dir", quick_dir(),
        c.fullscreen ? "--fullscreen" : "--window",
        c.ntsc ? "--ntsc" : "--pal",
    };
    if (c.widescreen) args.push_back("--widescreen");
#ifdef _WIN32
    std::wstring cmd;
    for (const auto &a : args) cmd += (cmd.empty() ? L"" : L" ") + quote(a);
    STARTUPINFOW si{};
    si.cb = sizeof si;
    PROCESS_INFORMATION pi{};
    if (!CreateProcessW(nullptr, cmd.data(), nullptr, nullptr, FALSE, 0, nullptr, nullptr, &si, &pi)) {
        error = "No se pudo iniciar ps2run.exe.";
        return false;
    }
    CloseHandle(pi.hThread);
    if (g_game.hProcess) CloseHandle(g_game.hProcess);
    g_game = pi;
    return true;
#else
    std::vector<char *> argv;
    for (auto &a : args) argv.push_back(a.data());
    argv.push_back(nullptr);
    pid_t pid = fork();
    if (pid == 0) {
        execv(argv[0], argv.data());
        _exit(127);
    }
    if (pid < 0) {
        error = "No se pudo iniciar ps2run.";
        return false;
    }
    g_game_pid = pid;
    return true;
#endif
}

bool game_running() {
#ifdef _WIN32
    return g_game.hProcess && WaitForSingleObject(g_game.hProcess, 0) == WAIT_TIMEOUT;
#else
    return g_game_pid > 0 && waitpid(g_game_pid, nullptr, WNOHANG) == 0;
#endif
}

void wait_game() {
#ifdef _WIN32
    if (g_game.hProcess) {
        WaitForSingleObject(g_game.hProcess, 0);
        CloseHandle(g_game.hProcess);
        g_game.hProcess = nullptr;
    }
#else
    if (g_game_pid > 0) {
        int status = 0;
        waitpid(g_game_pid, &status, WNOHANG);
        g_game_pid = -1;
    }
#endif
}

void stop_game() {
#ifdef _WIN32
    if (g_game.hProcess) {
        TerminateProcess(g_game.hProcess, 0);
        CloseHandle(g_game.hProcess);
        g_game.hProcess = nullptr;
    }
#else
    if (g_game_pid > 0) {
        kill(g_game_pid, SIGTERM);
        g_game_pid = -1;
    }
#endif
}

std::string pick_file(const char *title, const char *filter) {
    (void)title;
    (void)filter;
#ifdef _WIN32
    wchar_t name[MAX_PATH] = {};
    OPENFILENAMEW ofn{};
    ofn.lStructSize = sizeof ofn;
    ofn.lpstrFilter = L"Imagen de disco (*.iso)\0*.iso\0Todos los archivos\0*.*\0";
    ofn.lpstrFile = name;
    ofn.nMaxFile = MAX_PATH;
    ofn.lpstrTitle = L"Elegí tu copia de Sword of Etheria";
    ofn.Flags = OFN_FILEMUSTEXIST | OFN_PATHMUSTEXIST;
    if (!GetOpenFileNameW(&ofn)) return {};
    return narrow(name);
#else
    const std::string cmd = "zenity --file-selection --title='Elegí tu copia de Sword of Etheria' --file-filter='*.iso' 2>/dev/null";
    FILE *p = popen(cmd.c_str(), "r");
    if (!p) return {};
    char buf[4096] = {};
    if (!fgets(buf, sizeof buf, p)) {
        pclose(p);
        return {};
    }
    pclose(p);
    std::string out(buf);
    while (!out.empty() && (out.back() == '\n' || out.back() == '\r')) out.pop_back();
    return out;
#endif
}

void open_path(const std::string &path) {
#ifdef _WIN32
    ShellExecuteW(nullptr, L"open", wide(path).c_str(), nullptr, nullptr, SW_SHOWNORMAL);
#else
    const std::string cmd = "xdg-open '" + path + "' >/dev/null 2>&1 &";
    std::system(cmd.c_str());
#endif
}

}  // namespace oe
