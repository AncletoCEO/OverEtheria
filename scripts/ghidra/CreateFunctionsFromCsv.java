// Crea funciones en Ghidra a partir de un CSV Name,Start,End,Size y exporta el
// resultado en la misma pasada (el análisis posterior de Ghidra puede reajustar los
// cuerpos, así que el export va antes de que termine el postScript).
//
// Uso: -postScript CreateFunctionsFromCsv.java <starts.csv> [funciones.csv] [desasm.asm]

import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.address.AddressSet;
import ghidra.program.model.listing.Function;
import ghidra.program.model.listing.FunctionManager;
import ghidra.program.model.listing.Instruction;
import ghidra.program.model.symbol.SourceType;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.List;

public class CreateFunctionsFromCsv extends GhidraScript {
    @Override
    public void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length < 1) {
            println("uso: CreateFunctionsFromCsv.java <starts.csv> [funciones.csv] [desasm.asm]");
            return;
        }

        FunctionManager fm = currentProgram.getFunctionManager();
        List<String[]> created = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(new FileReader(args[0]))) {
            reader.readLine(); // header
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.trim().isEmpty()) continue;
                String[] cols = line.split(",");
                long startOffset = Long.parseLong(cols[1].replace("0x", ""), 16);
                long endOffset = Long.parseLong(cols[2].replace("0x", ""), 16);
                Address entry = toAddr(startOffset);
                Address last = toAddr(endOffset - 1);
                if (getInstructionAt(entry) == null) continue;

                Function existing = getFunctionAt(entry);
                if (existing != null) fm.removeFunction(entry);

                try {
                    Function f = fm.createFunction(cols[0], entry, new AddressSet(entry, last), SourceType.USER_DEFINED);
                    if (f != null && f.getBody().getNumAddresses() == endOffset - startOffset) {
                        created.add(new String[] { cols[0], cols[1], cols[2], Long.toString(endOffset - startOffset) });
                        println("  " + cols[0] + " " + entry + ".." + last + " (" + f.getBody().getNumAddresses() + " B)");
                    } else {
                        long got = f == null ? 0 : f.getBody().getNumAddresses();
                        println("  cuerpo inesperado en " + cols[0] + ": " + got + " B");
                    }
                } catch (Exception e) {
                    println("  error en " + cols[0] + ": " + e.getMessage());
                }
            }
        }

        if (args.length > 1) {
            try (PrintWriter out = new PrintWriter(new FileWriter(args[1]))) {
                out.println("Name,Start,End,Size");
                for (String[] row : created) {
                    out.println(String.join(",", row));
                }
            }
        }

        if (args.length > 2) {
            try (PrintWriter out = new PrintWriter(new FileWriter(args[2]))) {
                for (Instruction ins : currentProgram.getListing().getInstructions(true)) {
                    out.println(ins.getAddress() + "  " + ins.toString());
                }
            }
        }

        println("CreateFunctionsFromCsv: " + created.size() + " funciones creadas y exportadas");
    }
}
