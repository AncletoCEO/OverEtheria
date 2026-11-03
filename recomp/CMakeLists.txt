# Juego: Sword of Etheria (SLES_537.68) recompilado con PS2Recomp.
# Une el C++ generado (work/generated/main) con ps2_runtime en sword_etheria.
#
# Uso (toolchain portable de tools/):
#   cmake -S recomp -B work/build-game -G "MinGW Makefiles" \
#     -DCMAKE_BUILD_TYPE=Release \
#     -DCMAKE_MAKE_PROGRAM=<repo>/tools/w64devkit/bin/make.exe
#   cmake --build work/build-game --target sword_etheria -j4
#
# Derivado del CMakeLists.txt del repo legado (MIT), adaptado a este layout.

cmake_minimum_required(VERSION 3.21)

if(NOT DEFINED REPO_ROOT)
    get_filename_component(REPO_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/.." ABSOLUTE)
endif()
if(WIN32)
    file(TO_CMAKE_PATH "${REPO_ROOT}" REPO_ROOT)
endif()

project(sword_etheria_recomp LANGUAGES C CXX)

set(PS2RECOMP_DIR "${REPO_ROOT}/tools/PS2Recomp")
set(GENERATED_DIR "${REPO_ROOT}/work/generated/main")

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(PS2X_DEFAULT_BOOT_ELF "${REPO_ROOT}/work/elf/SLES_537.68" CACHE STRING "" FORCE)

# Solo los submódulos necesarios (el árbol completo arrastra ps2xStudio).
add_subdirectory("${PS2RECOMP_DIR}/ps2xIOP" "${CMAKE_BINARY_DIR}/ps2xIOP" EXCLUDE_FROM_ALL)
add_subdirectory("${PS2RECOMP_DIR}/ps2xRuntime" "${CMAKE_BINARY_DIR}/ps2xRuntime" EXCLUDE_FROM_ALL)

# SSE4.1 para el runtime y el generado (GCC/Clang en x86).
if(CMAKE_SYSTEM_PROCESSOR MATCHES "x86_64|AMD64|x86" AND
   CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
    target_compile_options(ps2_runtime PRIVATE -msse4.1)
    target_compile_options(ps2_iop PRIVATE -msse4.1)
endif()

file(GLOB GAME_SOURCES "${GENERATED_DIR}/*.cpp")

add_executable(sword_etheria
    game_main.cpp
    ${GAME_SOURCES}
)

target_include_directories(sword_etheria PRIVATE "${GENERATED_DIR}")
target_link_libraries(sword_etheria PRIVATE ps2_runtime)

# Sin unity: los .cpp generados son grandes y en GCC un batch alto agota la RAM.
set_target_properties(sword_etheria PROPERTIES UNITY_BUILD OFF)

# La tabla de registro se compila sola.
set_source_files_properties("${GENERATED_DIR}/register_functions.cpp" PROPERTIES
    SKIP_UNITY_BUILD_INCLUSION TRUE
)

# Funciones "monstruo": fuera de unity (y sin optimizar) por tamaño.
set(BIG_SOURCES "")
foreach(src IN LISTS GAME_SOURCES)
    file(SIZE "${src}" src_size)
    if(src_size GREATER 2000000)
        list(APPEND BIG_SOURCES "${src}")
    endif()
endforeach()
set_source_files_properties(${BIG_SOURCES} PROPERTIES
    SKIP_UNITY_BUILD_INCLUSION TRUE
)

if(MSVC)
    target_compile_options(sword_etheria PRIVATE /bigobj /FS /Od /Ob0 /GS-)
    target_link_options(sword_etheria PRIVATE /MAP)
elseif(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
    # -O0/-fno-inline: el build optimizado no termina en esta máquina.
    target_compile_options(sword_etheria PRIVATE -O0 -fno-inline -fno-stack-protector -g0)
    if(CMAKE_SYSTEM_PROCESSOR MATCHES "x86_64|AMD64|x86")
        target_compile_options(sword_etheria PRIVATE -msse4.1)
    endif()
endif()
