#pragma once

#include <array>
#include <cstdint>
#include <string>
#include <vector>

namespace oe {

// One game controller button and the keys that press it (keys.ini of ps2-native-recomp).
struct Binding {
    const char *name;                 // the word keys.ini uses
    const char *label;                // what the launcher shows
    std::vector<std::string> keys;    // SDL key names, "Left Mouse", ...
};

constexpr int kActionCount = 26;
using Bindings = std::array<Binding, kActionCount>;

Bindings default_bindings();

struct Config {
    std::string iso;        // the user's disc image (only needed to prepare)
    std::string game;       // the ps2-native-recomp checkout (built game lives inside)
    std::string memcard;    // memory card file (created on first save)
    std::string assets;     // the ISO extracted to a folder; the game reads this, not the ISO
    std::string serial;     // SLES_537.68 (Europe) or SLPM_660.33 (Japan)
    int scale = 1;          // inner resolution: 1, 2 or 3
    bool fullscreen = false;
    bool widescreen = false;
    bool ntsc = false;      // false: PAL (50 Hz), true: NTSC (60 Hz)
    Bindings bindings = default_bindings();
};

struct IsoCheck {
    bool ok = false;
    std::string serial;     // "SLES_537.68" when the image is the expected game
    std::string message;    // what to show the user
};

std::string data_dir();                 // where settings, the card and saves live
std::string config_path();              // <data>/launcher.ini
std::string default_memcard();          // <data>/memcard.ps2
std::string default_assets();           // <data>/game/disc (the ISO extracted)
bool assets_ready(const Config &c);     // the extraction finished
std::string quick_dir();                // <data>/quick (keys.ini, quick saves)
std::string game_exe(const Config &c);  // build/native-sword/ps2run.exe
std::string game_elf(const Config &c);  // games/sword/disc/SLES_537.68

bool load_config(Config &c);
bool save_config(const Config &c);
void apply_environment(const Config &c);
IsoCheck check_iso(const std::string &path);
std::string pick_file(const char *title, const char *filter);
void open_path(const std::string &path);
bool write_keys_ini(const Config &c);
bool read_keys_ini(Config &c);

bool prepare_game(const Config &c, const std::string &log_path);  // starts the build script
bool prepare_running();
int prepare_wait();
bool game_built(const Config &c);
bool spawn_game(const Config &c, std::string &error);
void wait_game();            // poll the game process
bool game_running();
void stop_game();

}  // namespace oe
