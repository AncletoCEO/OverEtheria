// Prepara un módulo raw (texto de overlay) para el análisis de Ghidra.
// Barre linealmente el bloque cargado y decodifica una instrucción por slot de 4 B.
// Luego el análisis estándar de Ghidra crea funciones a partir de llamadas/branches.
//
// Uso: -preScript PrepareRawModule.java

import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.mem.MemoryBlock;

public class PrepareRawModule extends GhidraScript {
    @Override
    public void run() throws Exception {
        MemoryBlock block = null;
        for (MemoryBlock b : currentProgram.getMemory().getBlocks()) {
            if (b.isInitialized() && b.isLoaded()) { block = b; break; }
        }
        if (block == null) {
            println("PrepareRawModule: no hay bloque cargado");
            return;
        }

        Address blockStart = block.getStart();
        Address end = block.getEnd();
        int prefix = 0;
        while (blockStart.add(prefix).compareTo(end) <= 0 && getByte(blockStart.add(prefix)) == 0) {
            prefix++;
        }
        prefix &= ~3;
        Address start = blockStart.add(prefix);

        int decoded = 0;
        for (Address a = start; a.compareTo(end) <= 0; a = a.add(4)) {
            if (getInstructionAt(a) != null) continue;
            try {
                disassemble(a);
                decoded++;
            } catch (Exception ignored) {
                // instrucción inválida: se sigue con la próxima
            }
        }

        if (getFunctionAt(start) == null) {
            try { createFunction(start, null); } catch (Exception ignored) { }
        }

        println("PrepareRawModule: prefijo=" + prefix + " B, " + decoded + " instrucciones desde " + start);
    }
}
