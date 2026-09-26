package timetable;

import timetable.constraint.*;
import timetable.data.SampleDataLoader;
import timetable.ga.Chromosome;
import timetable.ga.FitnessEvaluator;
import timetable.ga.GeneticAlgorithm;
import timetable.io.JsonExporter;
import timetable.io.JsonInputReader;
import timetable.model.Faculty;
import timetable.model.SubBatch;
import timetable.model.TimetableContext;
import timetable.view.TimetablePrinter;

import java.io.File;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Main {
    public static void main(String[] args) {
        System.out.println("========================================================================");
        System.out.println("              ACADEMIC TIMETABLE GENERATOR - GA ENGINE (MVP)             ");
        System.out.println("========================================================================");

        // 1. Load context — from input JSON if available, otherwise sample data
        TimetableContext context;
        int populationSize = 120;
        int maxGenerations = 500;
        int elitismCount = 6;
        double mutationRate = 0.15;
        double crossoverRate = 0.85;

        String inputPath = "input/timetable_input.json";
        File inputFile = new File(inputPath);

        if (inputFile.exists()) {
            System.out.println(">>> Found input file: " + inputFile.getAbsolutePath());
            try {
                context = JsonInputReader.read(inputPath);

                // Read GA params from input if available
                Map<String, Object> gaParams = JsonInputReader.readGaParams(inputPath);
                if (!gaParams.isEmpty()) {
                    populationSize = (int) gaParams.getOrDefault("populationSize", populationSize);
                    maxGenerations = (int) gaParams.getOrDefault("maxGenerations", maxGenerations);
                    elitismCount = (int) gaParams.getOrDefault("elitismCount", elitismCount);
                    mutationRate = (double) gaParams.getOrDefault("mutationRate", mutationRate);
                    crossoverRate = (double) gaParams.getOrDefault("crossoverRate", crossoverRate);
                }
                System.out.println(">>> Input loaded successfully.\n");
            } catch (Exception e) {
                System.err.println("ERROR reading input file: " + e.getMessage());
                System.err.println("Falling back to sample dataset.\n");
                context = SampleDataLoader.loadReferenceDataset();
            }
        } else {
            System.out.println(">>> No input file found at '" + inputPath + "'. Using sample dataset.\n");
            context = SampleDataLoader.loadReferenceDataset();
        }

        System.out.printf("Loaded dataset: %d courses, %d sessions to schedule across %d sub-batches.%n",
                context.getCourses().size(), context.getSessions().size(), context.getSubBatches().size());
        System.out.printf("Time structure: %d working days, %d periods/day (%d total slots per week).%n%n",
                context.getDaysCount(), context.getPeriodsPerDay(), context.getTotalSlots());


        // 2. Setup constraints
        List<Constraint> constraints = new ArrayList<>();
        constraints.add(new FacultyClashConstraint());           // HC-1
        constraints.add(new RoomClashConstraint());              // HC-2
        constraints.add(new SubBatchClashConstraint());          // HC-3 (Overlapping batch groups)
        constraints.add(new LabContiguityConstraint());          // HC-4 (2 contiguous slots)
        constraints.add(new RoomTypeAndCapacityConstraint());    // HC-5 (Room type and capacity)
        constraints.add(new StudentGapConstraint());             // SC-1 (Minimize gaps)
        constraints.add(new DailyLoadBalanceConstraint());       // SC-3 (Balance load across days)

        FitnessEvaluator evaluator = new FitnessEvaluator(constraints);


        // 3. Configure Genetic Algorithm
        Long seed = 42L; // Reproducible seed

        System.out.println("Initializing GA with Population=" + populationSize + ", MaxGenerations=" + maxGenerations);
        GeneticAlgorithm ga = new GeneticAlgorithm(
                context, evaluator, populationSize, maxGenerations, elitismCount,
                mutationRate, crossoverRate, seed
        );

        long startTime = System.currentTimeMillis();

        Chromosome bestTimetable = ga.run((generation, best) -> {
            System.out.printf("Generation %4d | Best Fitness: %8.1f | Hard Violations: %2d | Soft Penalty: %3d%n",
                    generation, best.getFitness(), best.getHardViolations(), best.getSoftViolations());
        });


        long elapsedTime = System.currentTimeMillis() - startTime;
        System.out.println("\n--------------------------------------------------------------------------");
        System.out.printf("GA Optimization finished in %d ms.%n", elapsedTime);
        System.out.printf("Result: Hard Violations = %d | Soft Penalty = %d | Fitness = %.1f%n",
                bestTimetable.getHardViolations(), bestTimetable.getSoftViolations(), bestTimetable.getFitness());
        System.out.println("--------------------------------------------------------------------------");

        if (bestTimetable.getHardViolations() == 0) {
            System.out.println(">>> SUCCESS: 100% Conflict-free timetable generated! All hard constraints satisfied.\n");
        } else {
            System.out.println(">>> WARNING: Zero hard violation solution was not reached. Review remaining conflicts.\n");
        }


        // 4. Export to JSON for Web UI
        try {
            Map<String, Object> metadata = new HashMap<>();
            metadata.put("generationCount", maxGenerations);
            metadata.put("populationSize", populationSize);
            metadata.put("elapsedMs", elapsedTime);

            String outputPath = "output/timetable_output.json";
            JsonExporter.export(bestTimetable, context, metadata, outputPath);
            File webDir = new File("web");
            if (webDir.exists()) {
                JsonExporter.export(bestTimetable, context, metadata, "web/timetable_output.json");
            }
        } catch (Exception e) {
            System.err.println("ERROR exporting JSON: " + e.getMessage());
        }


        // 5. Print timetable views for ALL sub-batches (console output)
        System.out.println("\n##########################################################################################################");
        System.out.println("                               TIMETABLES FOR ALL " + context.getSubBatches().size() + " SUB-BATCHES");
        System.out.println("##########################################################################################################");
        for (SubBatch sb : context.getSubBatches()) {
            TimetablePrinter.printSubBatchGrid(bestTimetable, context, sb);
        }

        // Print Faculty Schedules
        System.out.println("\n##########################################################################################################");
        System.out.println("                               FACULTY SCHEDULES");
        System.out.println("##########################################################################################################");
        for (Faculty f : context.getFacultyList()) {
            TimetablePrinter.printFacultyGrid(bestTimetable, context, f);
        }
    }
}
