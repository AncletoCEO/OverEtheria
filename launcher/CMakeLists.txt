cmake_minimum_required(VERSION 3.20)

project(overetheria_launcher LANGUAGES C CXX)

option(OE_CONSOLE "Build the console variant used by CI and smoke tests" OFF)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

include(FetchContent)

# SDL2: reuse the copy the recomp runtime already downloaded, else fetch the source.
list(APPEND CMAKE_PREFIX_PATH "${CMAKE_CURRENT_SOURCE_DIR}/../tools/ps2-native-recomp/third_party/sdl2")
# SDL2's config adds -mwindows on its own; the subsystem is chosen below per target.
set(SDL2_NO_MWINDOWS ON)
find_package(SDL2 QUIET)
if(NOT SDL2_FOUND)
    message(STATUS "SDL2 not found: fetching SDL2 2.32.10")
    FetchContent_Declare(SDL2
        URL https://github.com/libsdl-org/SDL/releases/download/release-2.32.10/SDL2-2.32.10.tar.gz
        DOWNLOAD_EXTRACT_TIMESTAMP TRUE)
    set(SDL2_TEST OFF CACHE BOOL "" FORCE)
    FetchContent_MakeAvailable(SDL2)
endif()

# Dear ImGui (MIT). It has no CMakeLists of its own, so the target is declared here.
FetchContent_Declare(imgui
    GIT_REPOSITORY https://github.com/ocornut/imgui.git
    GIT_TAG v1.91.8
    GIT_SHALLOW TRUE)
FetchContent_MakeAvailable(imgui)

add_library(imgui STATIC
    ${imgui_SOURCE_DIR}/imgui.cpp
    ${imgui_SOURCE_DIR}/imgui_draw.cpp
    ${imgui_SOURCE_DIR}/imgui_tables.cpp
    ${imgui_SOURCE_DIR}/imgui_widgets.cpp
    ${imgui_SOURCE_DIR}/backends/imgui_impl_sdl2.cpp
    ${imgui_SOURCE_DIR}/backends/imgui_impl_sdlrenderer2.cpp)
target_include_directories(imgui PUBLIC ${imgui_SOURCE_DIR} ${imgui_SOURCE_DIR}/backends)
target_link_libraries(imgui PUBLIC SDL2::SDL2)

add_executable(overetheria-launcher
    src/main.cpp
    src/config.cpp
    src/platform.cpp)
target_link_libraries(overetheria-launcher PRIVATE imgui SDL2::SDL2)
if(TARGET SDL2::SDL2main AND NOT OE_CONSOLE)
    target_link_libraries(overetheria-launcher PRIVATE SDL2::SDL2main)
endif()
set_target_properties(overetheria-launcher PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin")
if(OE_CONSOLE)
    set_target_properties(overetheria-launcher PROPERTIES WIN32_EXECUTABLE FALSE)
elseif(WIN32)
    set_target_properties(overetheria-launcher PROPERTIES WIN32_EXECUTABLE TRUE)
endif()
if(WIN32)
    target_link_libraries(overetheria-launcher PRIVATE comdlg32 shell32)
endif()
if(OE_CONSOLE)
    target_compile_definitions(overetheria-launcher PRIVATE OE_CONSOLE)
endif()
if(MSVC)
    target_compile_options(overetheria-launcher PRIVATE /W4 /utf-8)
else()
    target_compile_options(overetheria-launcher PRIVATE -Wall -Wextra)
    if(WIN32)
        # A release copy must run without tools/llvm-mingw/bin in PATH: the C++ runtime goes inside.
        target_link_options(overetheria-launcher PRIVATE -static)
    endif()
endif()

# SDL2 as a shared library from the runtime's copy must sit next to the launcher.
if(SDL2_FOUND AND TARGET SDL2::SDL2)
    add_custom_command(TARGET overetheria-launcher POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy_if_different $<TARGET_FILE:SDL2::SDL2> $<TARGET_FILE_DIR:overetheria-launcher>)
endif()
