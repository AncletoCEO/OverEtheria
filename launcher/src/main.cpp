#include "app.hpp"

#include "imgui.h"
#include "imgui_impl_sdl2.h"
#include "imgui_impl_sdlrenderer2.h"

#ifdef OE_CONSOLE
#define SDL_MAIN_HANDLED
#endif
#include <SDL.h>

#ifdef _WIN32
#include <windows.h>
#endif

#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <filesystem>
#include <fstream>
#include <string>
#include <vector>

namespace fs = std::filesystem;

namespace {

constexpr const char *kTitle = "OverEtheria";
constexpr const char *kVersion = "0.1.0";

std::string clean(const std::string &text) {
    // The log can hold a UTF-16 line from an older run: keep printable UTF-8, drop the rest.
    std::string out;
    out.reserve(text.size());
    for (std::size_t i = 0; i < text.size();) {
        const unsigned char c = static_cast<unsigned char>(text[i]);
        if (c == 0) {
            ++i;
            continue;
        }
        if (c < 0x20 && c != '\n' && c != '\t' && c != '\r') {
            ++i;
            continue;
        }
        if (c < 0x80) {
            out += static_cast<char>(c);
            ++i;
            continue;
        }
        int extra = (c >> 5) == 0x6 ? 1 : (c >> 4) == 0xE ? 2 : (c >> 3) == 0x1E ? 3 : -1;
        bool valid = extra > 0 && i + static_cast<std::size_t>(extra) < text.size();
        for (int k = 1; valid && k <= extra; ++k)
            if ((static_cast<unsigned char>(text[i + static_cast<std::size_t>(k)]) & 0xC0) != 0x80) valid = false;
        if (valid) {
            out.append(text, i, static_cast<std::size_t>(extra) + 1);
            i += static_cast<std::size_t>(extra) + 1;
        } else {
            out += '.';
            ++i;
        }
    }
    return out;
}

std::string tail(const std::string &path, std::size_t lines) {
    std::ifstream in(path);
    if (!in) return {};
    std::vector<std::string> all;
    std::string line;
    while (std::getline(in, line)) all.push_back(clean(line));
    std::string out;
    const std::size_t first = all.size() > lines ? all.size() - lines : 0;
    for (std::size_t i = first; i < all.size(); ++i) out += all[i] + "\n";
    return out;
}

std::pair<std::size_t, std::uint64_t> dir_stats(const std::string &dir) {
    std::size_t files = 0;
    std::uint64_t bytes = 0;
    std::error_code ec;
    if (dir.empty()) return {0, 0};
    for (fs::recursive_directory_iterator it(fs::u8path(dir), fs::directory_options::skip_permission_denied, ec), end; it != end;
         it.increment(ec)) {
        if (ec) break;
        std::error_code file_error;
        if (it->is_regular_file(file_error) && !file_error) {
            const auto size = fs::file_size(*it, file_error);
            if (!file_error) {
                ++files;
                bytes += size;
            }
        }
    }
    return {files, bytes};
}

struct Progress {
    int percent = 0;
    std::string text;
    bool found = false;
};

Progress read_progress(const std::string &path) {
    Progress progress;
    std::ifstream in(path);
    if (!in) return progress;
    std::string line;
    while (std::getline(in, line)) {
        std::string clean_line = clean(line);
        if (clean_line.rfind("\xEF\xBB\xBF", 0) == 0) clean_line.erase(0, 3);  // BOM del registro
        if (clean_line.rfind("[progress] ", 0) != 0) continue;
        const std::size_t space = clean_line.find(' ', 11);
        const std::string number = clean_line.substr(11, space == std::string::npos ? std::string::npos : space - 11);
        const int percent = std::atoi(number.c_str());
        if (percent < 0 || percent > 100) continue;
        progress.percent = percent;
        progress.text = space == std::string::npos ? std::string{} : clean_line.substr(space + 1);
        progress.found = true;
    }
    return progress;
}

std::string suggested_game_dir() {
    // <repo>/tools/ps2-native-recomp when the launcher lives inside the repo; otherwise a
    // writable folder in the data directory (the release package ships no runtime).
    fs::path dir = fs::current_path();
    for (int i = 0; i < 5; ++i) {
        const fs::path candidate = dir / "tools" / "ps2-native-recomp";
        if (fs::exists(candidate)) return candidate.string();
        if (!dir.has_parent_path() || dir.parent_path() == dir) break;
        dir = dir.parent_path();
    }
    return (fs::path(oe::data_dir()) / "runtime" / "ps2-native-recomp").string();
}

}  // namespace

int main(int argc, char **argv) {
#if defined(_WIN32) && !defined(OE_CONSOLE)
    // A GUI program has no console: give the command line modes the parent's one.
    if (argc > 1 && AttachConsole(ATTACH_PARENT_PROCESS)) {
        std::freopen("CONOUT$", "w", stdout);
        std::freopen("CONOUT$", "w", stderr);
    }
#endif
    bool demo_progress = false;
    for (int i = 1; i < argc; ++i) {
        const std::string arg = argv[i];
        if (arg == "--progress-demo") {
            demo_progress = true;  // sólo para capturas: muestra la barra con el registro actual
            continue;
        }
        if (arg == "--version") {
            std::printf("%s launcher %s\n", kTitle, kVersion);
            return 0;
        }
        if (arg == "--data-dir") {
            std::printf("%s\n", oe::data_dir().c_str());
            return 0;
        }
        if (arg == "--check-iso" && i + 1 < argc) {
            const oe::IsoCheck check = oe::check_iso(argv[i + 1]);
            std::printf("%s %s\n", check.ok ? "ok" : "error", check.message.c_str());
            return check.ok ? 0 : 1;
        }
        if (arg == "--last-progress" && i + 1 < argc) {
            const Progress progress = read_progress(argv[i + 1]);
            std::printf("%d %s\n", progress.percent, progress.text.c_str());
            return progress.found ? 0 : 1;
        }
        if (arg == "--print-paths") {
            oe::Config paths;
            if (!oe::load_config(paths)) paths = oe::Config{};
            if (paths.game.empty()) paths.game = suggested_game_dir();
            if (paths.memcard.empty()) paths.memcard = oe::default_memcard();
            if (paths.assets.empty()) paths.assets = oe::default_assets();
            if (paths.serial.empty()) paths.serial = "SLES_537.68";
            std::printf("game=%s\nexe=%s\nelf=%s\nassets=%s\nmemcard=%s\n", paths.game.c_str(),
                        oe::game_exe(paths).c_str(), oe::game_elf(paths).c_str(), paths.assets.c_str(),
                        paths.memcard.c_str());
            return 0;
        }
        if (arg == "--play") {
            oe::Config play_config;
            if (!oe::load_config(play_config)) play_config = oe::Config{};
            if (play_config.game.empty()) play_config.game = suggested_game_dir();
            if (play_config.memcard.empty()) play_config.memcard = oe::default_memcard();
            std::string error;
            if (!oe::spawn_game(play_config, error)) {
                std::printf("%s\n", error.c_str());
                return 1;
            }
            std::printf("juego iniciado\n");
            return 0;
        }
        if (arg == "--prepare" && i + 1 < argc) {
            oe::Config prepare_config;
            if (!oe::load_config(prepare_config)) prepare_config = oe::Config{};
            if (prepare_config.game.empty()) prepare_config.game = suggested_game_dir();
            if (prepare_config.memcard.empty()) prepare_config.memcard = oe::default_memcard();
            if (i + 3 < argc && std::string(argv[i + 2]) == "--game") prepare_config.game = argv[i + 3];
            prepare_config.iso = argv[i + 1];
            const oe::IsoCheck check = oe::check_iso(prepare_config.iso);
            std::printf("%s\n", check.message.c_str());
            if (!check.ok) return 2;
            const std::string log = (fs::path(oe::data_dir()) / "prepare.log").string();
            if (!oe::prepare_game(prepare_config, log)) {
                std::printf("no se pudo lanzar la preparación\n");
                return 3;
            }
            const int code = oe::prepare_wait();
            std::printf("%s", tail(log, 40).c_str());
            return code;
        }
    }

    oe::Config config;
    const bool had_config = oe::load_config(config);
    if (config.game.empty()) config.game = suggested_game_dir();
    if (config.memcard.empty()) config.memcard = oe::default_memcard();
    if (config.assets.empty()) config.assets = oe::default_assets();
    if (config.serial.empty()) config.serial = "SLES_537.68";
    if (had_config) oe::read_keys_ini(config);

    if (SDL_Init(SDL_INIT_VIDEO | SDL_INIT_TIMER) != 0) {
        std::fprintf(stderr, "SDL_Init: %s\n", SDL_GetError());
        return 1;
    }
#ifdef OE_CONSOLE
    std::fprintf(stderr, "[launcher] SDL_Init ok\n");
#endif
    SDL_Window *window = SDL_CreateWindow(kTitle, SDL_WINDOWPOS_CENTERED, SDL_WINDOWPOS_CENTERED, 1120, 780,
                                          SDL_WINDOW_RESIZABLE | SDL_WINDOW_ALLOW_HIGHDPI);
#ifdef OE_CONSOLE
    if (!window) {
        std::fprintf(stderr, "SDL_CreateWindow: %s\n", SDL_GetError());
        return 1;
    }
#endif
    SDL_Renderer *renderer = SDL_CreateRenderer(window, -1, SDL_RENDERER_ACCELERATED | SDL_RENDERER_PRESENTVSYNC);
    if (!renderer) renderer = SDL_CreateRenderer(window, -1, SDL_RENDERER_SOFTWARE);

    IMGUI_CHECKVERSION();
    ImGui::CreateContext();
    ImGuiIO &io = ImGui::GetIO();
    io.ConfigFlags |= ImGuiConfigFlags_NavEnableKeyboard;
    io.IniFilename = nullptr;
    ImGui::StyleColorsDark();
    ImGui::GetStyle().ScaleAllSizes(1.25f);
    io.FontGlobalScale = 1.25f;
    ImGui_ImplSDL2_InitForSDLRenderer(window, renderer);
    ImGui_ImplSDLRenderer2_Init(renderer);

    bool iso_ok = false;
    oe::IsoCheck iso;
    if (!config.iso.empty()) {
        iso = oe::check_iso(config.iso);
        iso_ok = iso.ok;
    }

    int capturing = -1;
    bool dirty = false;
    bool confirm_card_reset = false;
    std::string prepare_log = (fs::path(oe::data_dir()) / "prepare.log").string();
    std::string prepare_message;
    bool preparing = demo_progress;

    bool running = false;
    std::string play_error;
    bool quit = false;
    while (!quit) {
        SDL_Event event;
        while (SDL_PollEvent(&event)) {
            ImGui_ImplSDL2_ProcessEvent(&event);
            if (event.type == SDL_QUIT) quit = true;
            if (event.type == SDL_WINDOWEVENT && event.window.event == SDL_WINDOWEVENT_CLOSE &&
                event.window.windowID == SDL_GetWindowID(window))
                quit = true;
            if (capturing >= 0) {
                std::string name;
                if (event.type == SDL_KEYDOWN) name = SDL_GetScancodeName(event.key.keysym.scancode);
                else if (event.type == SDL_MOUSEBUTTONDOWN) {
                    switch (event.button.button) {
                    case SDL_BUTTON_LEFT: name = "Left Mouse"; break;
                    case SDL_BUTTON_RIGHT: name = "Right Mouse"; break;
                    case SDL_BUTTON_MIDDLE: name = "Middle Mouse"; break;
                    case SDL_BUTTON_X1: name = "Mouse X1"; break;
                    case SDL_BUTTON_X2: name = "Mouse X2"; break;
                    default: break;
                    }
                } else if (event.type == SDL_MOUSEWHEEL) {
                    name = event.wheel.y > 0 ? "Wheel Up" : "Wheel Down";
                }
                if (!name.empty()) {
                    config.bindings[capturing].keys = {name};
                    capturing = -1;
                    dirty = true;
                }
            }
        }
        if (running && !oe::game_running()) {
            running = false;
            oe::wait_game();
        }
        if (!demo_progress && preparing && !oe::prepare_running()) {
            preparing = false;
            const int code = oe::prepare_wait();
            if (code == 0 && oe::game_built(config)) {
                prepare_message = "Listo: el juego está preparado.";
            } else if (code == 0) {
                prepare_message = "La preparación terminó pero falta el ejecutable del juego. Revisá el registro.";
            } else {
                prepare_message = "La preparación no terminó (código " + std::to_string(code) +
                                  "). Revisá el registro para ver qué pasó.";
            }
        }

        ImGui_ImplSDLRenderer2_NewFrame();
        ImGui_ImplSDL2_NewFrame();
        ImGui::NewFrame();

        const ImGuiViewport *vp = ImGui::GetMainViewport();
        ImGui::SetNextWindowPos(vp->WorkPos);
        ImGui::SetNextWindowSize(vp->WorkSize);
        ImGui::Begin("##root", nullptr,
                     ImGuiWindowFlags_NoTitleBar | ImGuiWindowFlags_NoResize | ImGuiWindowFlags_NoMove |
                         ImGuiWindowFlags_NoBringToFrontOnFocus | ImGuiWindowFlags_NoScrollbar);

        ImGui::TextColored(ImVec4(0.72f, 0.86f, 1.0f, 1.0f), "%s", kTitle);
        ImGui::SameLine();
        ImGui::TextDisabled("launcher %s · Sword of Etheria (SLES_537.68)", kVersion);
        ImGui::SameLine();
        const bool ready = (iso_ok || oe::assets_ready(config)) && oe::game_built(config);
        ImGui::TextColored(ready ? ImVec4(0.4f, 0.9f, 0.5f, 1.0f) : ImVec4(0.95f, 0.75f, 0.3f, 1.0f),
                           ready ? "listo para jugar" : "falta preparar");
        ImGui::Separator();

        if (ImGui::BeginTabBar("##tabs")) {
            if (ImGui::BeginTabItem("Juego")) {
                ImGui::Spacing();
                ImGui::TextWrapped("Elegí tu copia de Sword of Etheria. Comprobamos el disco y preparamos el juego en tu "
                                   "equipo: el ISO no se sube a ningún lado y, cuando termina, ya no lo necesitás.");
                ImGui::Spacing();
                char iso_buffer[1024];
                std::snprintf(iso_buffer, sizeof iso_buffer, "%s", config.iso.c_str());
                ImGui::SetNextItemWidth(-1);
                if (ImGui::InputText("##iso", iso_buffer, sizeof iso_buffer)) config.iso = iso_buffer;
                if (ImGui::Button("Elegir ISO...")) {
                    const std::string picked = oe::pick_file("ISO", "*.iso");
                    if (!picked.empty()) config.iso = picked;
                }
                ImGui::SameLine();
                if (ImGui::Button("Comprobar")) {
                    iso = oe::check_iso(config.iso);
                    iso_ok = iso.ok;
                    if (iso.ok) config.serial = iso.serial;
                }
                ImGui::SameLine();
                ImGui::TextDisabled("%s", config.iso.empty() ? "ningún archivo elegido" : config.iso.c_str());
                ImGui::TextColored(iso_ok ? ImVec4(0.4f, 0.9f, 0.5f, 1.0f) : ImVec4(0.9f, 0.55f, 0.45f, 1.0f),
                                   "%s", iso.message.empty() ? "Elegí el archivo y pulsá «Comprobar»." : iso.message.c_str());

                ImGui::Spacing();
                ImGui::Separator();
                ImGui::Text("Carpeta del motor del juego");
                char game_buffer[1024];
                std::snprintf(game_buffer, sizeof game_buffer, "%s", config.game.c_str());
                ImGui::SetNextItemWidth(-1);
                if (ImGui::InputText("##game", game_buffer, sizeof game_buffer)) config.game = game_buffer;
                ImGui::TextColored(oe::game_built(config) ? ImVec4(0.4f, 0.9f, 0.5f, 1.0f) : ImVec4(0.9f, 0.55f, 0.45f, 1.0f),
                                   "%s", oe::game_built(config) ? "El juego está preparado."
                                                                : "Todavía falta preparar el juego.");
                ImGui::BeginDisabled(!iso_ok || preparing);
                if (ImGui::Button("Preparar juego")) {
                    std::error_code ec;
                    fs::create_directories(oe::data_dir(), ec);
                    std::ofstream(prepare_log, std::ios::trunc).close();  // cada preparación empieza limpia
                    preparing = oe::prepare_game(config, prepare_log);
                    prepare_message = preparing ? "Preparando el juego: puede tardar varios minutos."
                                                : "No se pudo empezar la preparación (revisá el registro).";
                }
                ImGui::EndDisabled();
                if (preparing) {
                    const Progress progress = read_progress(prepare_log);
                    const std::string label = std::to_string(progress.percent) + "%  " +
                                              (progress.text.empty() ? "preparando el juego" : progress.text);
                    ImGui::ProgressBar(static_cast<float>(progress.percent) / 100.0f, ImVec2(-1, 0), label.c_str());
                } else if (!prepare_message.empty()) {
                    ImGui::TextWrapped("%s", prepare_message.c_str());
                }
                ImGui::SameLine();
                if (ImGui::Button("Abrir registro")) oe::open_path(prepare_log);
                if (ImGui::CollapsingHeader("Registro de la preparación")) {
                    const std::string log = tail(prepare_log, 200);
                    ImGui::BeginChild("##log", ImVec2(0, 240), true);
                    ImGui::TextUnformatted(log.empty() ? "Sin registros todavía." : log.c_str());
                    ImGui::EndChild();
                }

                ImGui::Spacing();
                ImGui::Separator();
                ImGui::Text("Contenido del juego (el ISO extraído)");
                char assets_buffer[1024];
                std::snprintf(assets_buffer, sizeof assets_buffer, "%s", config.assets.c_str());
                ImGui::SetNextItemWidth(-1);
                if (ImGui::InputText("##assets", assets_buffer, sizeof assets_buffer)) config.assets = assets_buffer;
                const bool extracted = oe::assets_ready(config);
                if (extracted) {
                    const auto [files, bytes] = dir_stats(config.assets);
                    ImGui::TextColored(ImVec4(0.4f, 0.9f, 0.5f, 1.0f), "Extraído: %zu archivos, %.1f GB (el ISO ya no hace falta).",
                                       files, static_cast<double>(bytes) / 1e9);
                } else {
                    ImGui::TextColored(ImVec4(0.95f, 0.75f, 0.3f, 1.0f),
                                       "Sin extraer: «Preparar juego» copia el contenido del ISO una sola vez.");
                }
                if (ImGui::Button("Abrir carpeta del contenido")) oe::open_path(config.assets);
                ImGui::EndTabItem();
            }

            if (ImGui::BeginTabItem("Video")) {
                ImGui::Spacing();
                ImGui::Text("Resolución interna");
                for (int s = 1; s <= 3; ++s) {
                    if (ImGui::RadioButton(std::to_string(s).append("x").c_str(), config.scale == s)) {
                        config.scale = s;
                        dirty = true;
                    }
                    if (s < 3) ImGui::SameLine();
                }
                ImGui::TextDisabled("1x es la resolución de la consola; 2x y 3x se ven más nítidos y piden más GPU.");
                ImGui::Spacing();
                if (ImGui::Checkbox("Pantalla completa", &config.fullscreen)) dirty = true;
                if (ImGui::Checkbox("Panorámico (16:9)", &config.widescreen)) dirty = true;
                ImGui::TextDisabled("Por ahora el panorámico estira la imagen; el ajuste Hor+ está planificado.");
                ImGui::Spacing();
                ImGui::Text("Formato de video");
                if (ImGui::RadioButton("PAL (50 Hz)", !config.ntsc)) {
                    config.ntsc = false;
                    dirty = true;
                }
                ImGui::SameLine();
                if (ImGui::RadioButton("NTSC (60 Hz)", config.ntsc)) {
                    config.ntsc = true;
                    dirty = true;
                }
                ImGui::TextDisabled("El juego también lo pregunta la primera vez; esta opción manda.");
                ImGui::EndTabItem();
            }

            if (ImGui::BeginTabItem("Controles")) {
                ImGui::Spacing();
                ImGui::TextWrapped("Pulsá «Cambiar» y después la tecla o el botón del mouse. Se guarda para el juego; "
                                   "también podés reasignar con F1 dentro del juego.");
                ImGui::Spacing();
                if (ImGui::BeginTable("##bindings", 3, ImGuiTableFlags_RowBg | ImGuiTableFlags_BordersInnerH | ImGuiTableFlags_SizingStretchProp)) {
                    ImGui::TableSetupColumn("Acción", ImGuiTableColumnFlags_WidthStretch, 0.45f);
                    ImGui::TableSetupColumn("Teclas", ImGuiTableColumnFlags_WidthStretch, 0.55f);
                    ImGui::TableSetupColumn("", ImGuiTableColumnFlags_WidthFixed, 90);
                    ImGui::TableHeadersRow();
                    for (int i = 0; i < oe::kActionCount; ++i) {
                        ImGui::TableNextRow();
                        ImGui::TableSetColumnIndex(0);
                        ImGui::TextUnformatted(config.bindings[i].label);
                        ImGui::TableSetColumnIndex(1);
                        std::string keys;
                        for (const auto &k : config.bindings[i].keys) keys += (keys.empty() ? "" : ", ") + k;
                        ImGui::TextUnformatted(keys.empty() ? "(ninguna)" : keys.c_str());
                        ImGui::TableSetColumnIndex(2);
                        if (capturing == i) {
                            ImGui::TextColored(ImVec4(1.0f, 0.8f, 0.3f, 1.0f), "pulsá una tecla");
                        } else if (ImGui::Button((std::string("Cambiar##") + std::to_string(i)).c_str())) {
                            capturing = i;
                        }
                    }
                    ImGui::EndTable();
                }
                ImGui::Spacing();
                if (ImGui::Button("Restaurar originales")) {
                    config.bindings = oe::default_bindings();
                    dirty = true;
                }
                ImGui::SameLine();
                if (ImGui::Button("Guardar controles")) {
                    if (oe::write_keys_ini(config))
                        prepare_message = "Controles guardados para el juego.";
                    else
                        prepare_message = "No se pudieron guardar los controles.";
                }
                ImGui::SameLine();
                if (ImGui::Button("Ver archivo de controles")) oe::open_path((fs::path(oe::quick_dir()) / "keys.ini").string());
                ImGui::EndTabItem();
            }

            if (ImGui::BeginTabItem("Guardado")) {
                ImGui::Spacing();
                ImGui::TextWrapped("El juego guarda en una memory card de 8 MB. Si el archivo no existe, el juego la "
                                   "formatea al guardar por primera vez; las partidas quedan en tu equipo.");
                ImGui::Spacing();
                char card_buffer[1024];
                std::snprintf(card_buffer, sizeof card_buffer, "%s", config.memcard.c_str());
                ImGui::SetNextItemWidth(-1);
                if (ImGui::InputText("##card", card_buffer, sizeof card_buffer)) config.memcard = card_buffer;
                std::error_code ec;
                const bool exists = fs::exists(config.memcard, ec);
                ImGui::TextColored(exists ? ImVec4(0.4f, 0.9f, 0.5f, 1.0f) : ImVec4(0.95f, 0.75f, 0.3f, 1.0f),
                                   "%s", exists ? "La tarjeta existe." : "Todavía no hay tarjeta: se crea al guardar.");
                if (ImGui::Button("Abrir carpeta de guardado")) oe::open_path(fs::path(config.memcard).parent_path().string());
                ImGui::SameLine();
                ImGui::BeginDisabled(!exists);
                if (ImGui::Button("Restablecer tarjeta")) confirm_card_reset = true;
                ImGui::EndDisabled();
                if (confirm_card_reset) {
                    ImGui::TextColored(ImVec4(0.95f, 0.55f, 0.45f, 1.0f), "Se borran las partidas de esa tarjeta.");
                    if (ImGui::Button("Sí, borrar")) {
                        fs::remove(config.memcard, ec);
                        confirm_card_reset = false;
                    }
                    ImGui::SameLine();
                    if (ImGui::Button("Cancelar")) confirm_card_reset = false;
                }
                ImGui::Spacing();
                ImGui::TextDisabled("Las partidas rápidas (F5/F8) son aparte y quedan en la carpeta de datos.");
                ImGui::EndTabItem();
            }

            ImGui::EndTabBar();
        }

        ImGui::Separator();
        ImGui::BeginDisabled(running || !ready);
        if (ImGui::Button("Jugar", ImVec2(160, 40))) {
            play_error.clear();
            if (oe::save_config(config)) dirty = false;
            oe::write_keys_ini(config);
            if (oe::spawn_game(config, play_error)) running = true;
        }
        ImGui::EndDisabled();
        ImGui::SameLine();
        ImGui::BeginDisabled(!running);
        if (ImGui::Button("Detener", ImVec2(120, 40))) {
            oe::stop_game();
            running = false;
        }
        ImGui::EndDisabled();
        if (!play_error.empty()) {
            ImGui::SameLine();
            ImGui::TextColored(ImVec4(0.95f, 0.55f, 0.45f, 1.0f), "%s", play_error.c_str());
        }
        if (running) {
            ImGui::SameLine();
            ImGui::TextDisabled("El juego está abierto en su propia ventana.");
        }
        ImGui::End();

        if (dirty) {
            if (oe::save_config(config)) dirty = false;
        }

        ImGui::Render();
        SDL_SetRenderDrawColor(renderer, 18, 20, 26, 255);
        SDL_RenderClear(renderer);
        ImGui_ImplSDLRenderer2_RenderDrawData(ImGui::GetDrawData(), renderer);
        SDL_RenderPresent(renderer);
    }

    if (running) oe::stop_game();
    ImGui_ImplSDLRenderer2_Shutdown();
    ImGui_ImplSDL2_Shutdown();
    ImGui::DestroyContext();
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    return 0;
}
