// Crea funciones desde un CSV y exporta su decompilación de Ghidra a un .c.
// Se hace todo en una pasada para que el análisis posterior no achique los cuerpos.
//
// Uso: -postScript DecompileModule.java <starts.csv> <salida.c>

import ghidra.app.decompiler.DecompInterface;
import ghidra.app.decompiler.DecompileResults;
import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.address.AddressSet;
import ghidra.program.model.listing.Function;
import ghidra.program.model.listing.FunctionManager;
import ghidra.program.model.symbol.SourceType;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.List;

public class DecompileModule extends GhidraScript {
    @Override
    public void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length < 2) {
            println("uso: DecompileModule.java <starts.csv> <salida.c>");
            return;
        }

        FunctionManager fm = currentProgram.getFunctionManager();
        DecompInterface ifc = new DecompInterface();
        ifc.openProgram(currentProgram);

        int count = 0;
        try (BufferedReader reader = new BufferedReader(new FileReader(args[0]));
             PrintWriter out = new PrintWriter(new FileWriter(args[1]))) {

            out.println("// Decompilacion de Ghidra - pseudocodigo anotado, NO compilable tal cual.");
            out.println("// Programa: " + currentProgram.getName());
            out.println("// Generado por scripts/ghidra/DecompileModule.java");
            out.println();

            reader.readLine(); // header
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.trim().isEmpty()) continue;
                String[] cols = line.split(",");
                long start = Long.parseLong(cols[1].replace("0x", ""), 16);
                long end = Long.parseLong(cols[2].replace("0x", ""), 16);
                Address entry = toAddr(start);
                Address last = toAddr(end - 1);
                if (getInstructionAt(entry) == null) continue;

                // Limpiar cualquier función de Ghidra que se solape con [entry, last].
                List<Function> conflicts = new ArrayList<>();
                for (Function f : fm.getFunctions(true)) {
                    if (f.getEntryPoint().compareTo(last) <= 0
                            && f.getBody().getMaxAddress().compareTo(entry) >= 0) {
                        conflicts.add(f);
                    }
                }
                for (Function f : conflicts) {
                    fm.removeFunction(f.getEntryPoint());
                }

                Function f = fm.createFunction(cols[0], entry, new AddressSet(entry, last), SourceType.USER_DEFINED);
                if (f == null) {
                    println("  no se pudo crear " + cols[0]);
                    continue;
                }

                DecompileResults res = ifc.decompileFunction(f, 60, monitor);
                out.println("// ============================================================");
                out.println("// " + f.getName() + "  " + entry + ".." + last + "  (" + (end - start) + " B)");
                out.println("// ============================================================");
                if (res != null && res.decompileCompleted() && res.getDecompiledFunction() != null) {
                    out.println(res.getDecompiledFunction().getC());
                } else {
                    out.println("// ERROR de decompilación: " + (res == null ? "sin resultado" : res.getErrorMessage()));
                }
                out.println();
                count++;
            }
        }

        println("DecompileModule: " + count + " funciones -> " + args[1]);
    }
}
