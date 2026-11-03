// Exporta funciones y (opcionalmente) el listado de instrucciones de un programa.
//
// Uso: -postScript ExportFunctionsCsv.java <funciones.csv> [desasm.asm]
// CSV: Name,Start,End,Size

import ghidra.app.script.GhidraScript;
import ghidra.program.model.listing.Function;
import ghidra.program.model.listing.Instruction;

import java.io.FileWriter;
import java.io.PrintWriter;

public class ExportFunctionsCsv extends GhidraScript {
    @Override
    public void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length < 1) {
            println("uso: ExportFunctionsCsv.java <funciones.csv> [desasm.asm]");
            return;
        }

        int count = 0;
        try (PrintWriter out = new PrintWriter(new FileWriter(args[0]))) {
            out.println("Name,Start,End,Size");
            for (Function f : currentProgram.getFunctionManager().getFunctions(true)) {
                long start = f.getEntryPoint().getOffset();
                long end = f.getBody().getMaxAddress().getOffset() + 1;
                out.printf("%s,0x%08X,0x%08X,%d%n", f.getName(), start, end, end - start);
                count++;
            }
        }

        if (args.length > 1) {
            try (PrintWriter out = new PrintWriter(new FileWriter(args[1]))) {
                for (Instruction ins : currentProgram.getListing().getInstructions(true)) {
                    out.println(ins.getAddress() + "  " + ins.toString());
                }
            }
        }

        println("ExportFunctionsCsv: " + count + " funciones -> " + args[0]);
    }
}
