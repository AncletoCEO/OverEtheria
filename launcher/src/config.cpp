#include "app.hpp"

#include <algorithm>
#include <cctype>
#include <filesystem>
#include <fstream>
#include <sstream>

namespace fs = std::filesystem;

namespace oe {
namespace {

std::string join(const std::vector<std::string> &keys) {
    std::string out;
    for (const auto &k : keys) out += (out.empty() ? "" : ", ") + k;
    return out;
}

std::vector<std::string> split(const std::string &text) {
    std::vector<std::string> out;
    std::string item;
    for (char c : text) {
        if (c == ',') {
            if (!item.empty()) out.push_back(item);
            item.clear();
        } else if (!std::isspace(static_cast<unsigned char>(c))) {
            item += c;
        }
    }
    if (!item.empty()) out.push_back(item);
    return out;
}

std::string trim(const std::string &s) {
    std::size_t a = 0, b = s.size();
    while (a < b && std::isspace(static_cast<unsigned char>(s[a]))) ++a;
    while (b > a && std::isspace(static_cast<unsigned char>(s[b - 1]))) --b;
    return s.substr(a, b - a);
}

std::string lower(std::string s) {
    std::transform(s.begin(), s.end(), s.begin(), [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
    return s;
}

}  // namespace

Bindings default_bindings() {
    Bindings b{};
    const auto set = [&](int i, const char *name, const char *label, std::vector<std::string> keys) {
        b[i] = Binding{name, label, std::move(keys)};
    };
    set(0, "dpad_up", "D-pad arriba", {"Up"});
    set(1, "dpad_down", "D-pad abajo", {"Down"});
    set(2, "dpad_left", "D-pad izquierda", {"Left"});
    set(3, "dpad_right", "D-pad derecha", {"Right"});
    set(4, "left_up", "Stick izq. arriba", {"W"});
    set(5, "left_down", "Stick izq. abajo", {"S"});
    set(6, "left_left", "Stick izq. izquierda", {"A"});
    set(7, "left_right", "Stick izq. derecha", {"D"});
    set(8, "right_up", "Stick der. arriba", {"I"});
    set(9, "right_down", "Stick der. abajo", {"K"});
    set(10, "right_left", "Stick der. izquierda", {"J"});
    set(11, "right_right", "Stick der. derecha", {"L"});
    set(12, "cross", "Cruz (confirmar, saltar)", {"Space", "Return", "Keypad Enter"});
    set(13, "circle", "Círculo", {"E", "Middle Mouse"});
    set(14, "square", "Cuadrado (ataque)", {"Left Mouse"});
    set(15, "triangle", "Triángulo", {"Right Mouse"});
    set(16, "l1", "L1", {"Left Shift", "Mouse X2"});
    set(17, "r1", "R1", {"F"});
    set(18, "l2", "L2", {"Q"});
    set(19, "r2", "R2", {"R"});
    set(20, "l3", "L3 (stick pulsado)", {"X"});
    set(21, "r3", "R3 (stick pulsado)", {"C"});
    set(22, "start", "Start (pausa)", {"Esc"});
    set(23, "select", "Select", {"Tab", "Backspace"});
    set(24, "roll", "Esquivar (mantener)", {"Left Ctrl", "Mouse X1"});
    set(25, "rage", "Furia (L3+R3)", {"V"});
    return b;
}

bool load_config(Config &c) {
    c = Config{};
    c.memcard = default_memcard();
    std::ifstream in(config_path());
    if (!in) return false;
    std::string line;
    bool first = true;
    while (std::getline(in, line)) {
        if (first) {
            first = false;
            if (line.rfind("\xEF\xBB\xBF", 0) == 0) line.erase(0, 3);  // BOM from another editor
        }
        line = trim(line);
        if (line.empty() || line[0] == '#' || line[0] == ';') continue;
        const auto eq = line.find('=');
        if (eq == std::string::npos) continue;
        const std::string key = lower(trim(line.substr(0, eq)));
        const std::string value = trim(line.substr(eq + 1));
        if (key == "iso") c.iso = value;
        else if (key == "game") c.game = value;
        else if (key == "memcard") c.memcard = value;
        else if (key == "scale") c.scale = std::clamp(std::atoi(value.c_str()), 1, 3);
        else if (key == "fullscreen") c.fullscreen = value == "1" || lower(value) == "true";
        else if (key == "widescreen") c.widescreen = value == "1" || lower(value) == "true";
        else if (key == "video") c.ntsc = lower(value) == "ntsc";
        else if (key.rfind("bind.", 0) == 0) {
            const std::string name = key.substr(5);
            for (auto &b : c.bindings)
                if (name == b.name) b.keys = split(value);
        }
    }
    return true;
}

bool save_config(const Config &c) {
    std::error_code ec;
    fs::create_directories(data_dir(), ec);
    std::ofstream out(config_path(), std::ios::binary);
    if (!out) return false;
    out << "# OverEtheria launcher: ajustes locales. No contiene datos del juego.\n";
    out << "iso = " << c.iso << "\n";
    out << "game = " << c.game << "\n";
    out << "memcard = " << c.memcard << "\n";
    out << "scale = " << c.scale << "\n";
    out << "fullscreen = " << (c.fullscreen ? 1 : 0) << "\n";
    out << "widescreen = " << (c.widescreen ? 1 : 0) << "\n";
    out << "video = " << (c.ntsc ? "ntsc" : "pal") << "\n";
    for (const auto &b : c.bindings) out << "bind." << b.name << " = " << join(b.keys) << "\n";
    return true;
}

bool read_keys_ini(Config &c) {
    std::ifstream in(fs::path(quick_dir()) / "keys.ini");
    if (!in) return false;
    std::string line;
    while (std::getline(in, line)) {
        line = trim(line);
        if (line.empty() || line[0] == '#' || line[0] == ';') continue;
        const auto eq = line.find('=');
        if (eq == std::string::npos) continue;
        const std::string key = lower(trim(line.substr(0, eq)));
        for (auto &b : c.bindings)
            if (key == b.name) b.keys = split(line.substr(eq + 1));
    }
    return true;
}

// Writes keys.ini for ps2-native-recomp. Existing lines (comments included) stay;
// the action lines are replaced and missing ones are appended.
bool write_keys_ini(const Config &c) {
    std::error_code ec;
    fs::create_directories(quick_dir(), ec);
    const fs::path path = fs::path(quick_dir()) / "keys.ini";
    std::vector<std::string> lines;
    {
        std::ifstream in(path);
        std::string line;
        while (std::getline(in, line)) lines.push_back(line);
    }
    for (const auto &b : c.bindings) {
        const std::string prefix = std::string(b.name);
        bool replaced = false;
        for (auto &line : lines) {
            const std::string t = trim(line);
            if (t.empty() || t[0] == '#' || t[0] == ';') continue;
            const auto eq = t.find('=');
            if (eq == std::string::npos) continue;
            if (lower(trim(t.substr(0, eq))) == prefix) {
                line = prefix + std::string(23 - std::min<std::size_t>(22, prefix.size()), ' ') + "= " + join(b.keys);
                replaced = true;
                break;
            }
        }
        if (!replaced) lines.push_back(prefix + std::string(23 - std::min<std::size_t>(22, prefix.size()), ' ') + "= " + join(b.keys));
    }
    std::ofstream out(path, std::ios::binary);
    if (!out) return false;
    for (const auto &line : lines) out << line << "\n";
    return true;
}

}  // namespace oe
