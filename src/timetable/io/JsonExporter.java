package timetable.io;

import timetable.ga.Chromosome;
import timetable.ga.Gene;
import timetable.model.*;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * Exports the GA result (Chromosome + TimetableContext) to a JSON file.
 * Pure Java implementation — no external libraries needed.
 */
public class JsonExporter {

    /**
     * Exports the timetable result to the specified file path.
     *
     * @param chromosome  The best chromosome from the GA run
     * @param context     The timetable context (courses, faculty, rooms, etc.)
     * @param metadata    Run metadata (generation count, elapsed time, etc.)
     * @param outputPath  The file path to write JSON to
     */
    public static void export(Chromosome chromosome, TimetableContext context,
                              Map<String, Object> metadata, String outputPath) throws IOException {

        StringBuilder sb = new StringBuilder();
        sb.append("{\n");

        // ── Metadata ──
        sb.append("  \"metadata\": {\n");
        sb.append("    \"hardViolations\": ").append(chromosome.getHardViolations()).append(",\n");
        sb.append("    \"softViolations\": ").append(chromosome.getSoftViolations()).append(",\n");
        sb.append("    \"fitness\": ").append(String.format("%.1f", chromosome.getFitness())).append(",\n");
        sb.append("    \"generationCount\": ").append(metadata.getOrDefault("generationCount", 0)).append(",\n");
        sb.append("    \"populationSize\": ").append(metadata.getOrDefault("populationSize", 0)).append(",\n");
        sb.append("    \"elapsedMs\": ").append(metadata.getOrDefault("elapsedMs", 0L)).append("\n");
        sb.append("  },\n");

        // ── Config ──
        sb.append("  \"config\": {\n");
        sb.append("    \"daysCount\": ").append(context.getDaysCount()).append(",\n");
        sb.append("    \"periodsPerDay\": ").append(context.getPeriodsPerDay()).append(",\n");
        sb.append("    \"periodsPerDayArray\": [");
        int[] perDay = context.getPeriodsPerDayArray();
        for (int i = 0; i < perDay.length; i++) {
            sb.append(perDay[i]);
            if (i < perDay.length - 1) sb.append(", ");
        }
        sb.append("],\n");
        sb.append("    \"dayNames\": ").append(toJsonArray(context.getDayNames())).append(",\n");
        sb.append("    \"periodTimes\": ").append(toJsonArray(context.getPeriodTimes())).append("\n");
        sb.append("  },\n");

        // ── Courses ──
        sb.append("  \"courses\": [\n");
        List<Course> courses = context.getCourses();
        for (int i = 0; i < courses.size(); i++) {
            Course c = courses.get(i);
            sb.append("    { ");
            sb.append("\"code\": ").append(q(c.getCode())).append(", ");
            sb.append("\"name\": ").append(q(c.getName())).append(", ");
            sb.append("\"credits\": ").append(c.getCredits()).append(", ");
            sb.append("\"lectureHours\": ").append(c.getLectureHours()).append(", ");
            sb.append("\"tutorialHours\": ").append(c.getTutorialHours()).append(", ");
            sb.append("\"labHours\": ").append(c.getLabHours()).append(", ");
            sb.append("\"isElective\": ").append(c.isElective());
            sb.append(" }");
            if (i < courses.size() - 1) sb.append(",");
            sb.append("\n");
        }
        sb.append("  ],\n");

        // ── Faculty ──
        sb.append("  \"faculty\": [\n");
        List<Faculty> fList = context.getFacultyList();
        for (int i = 0; i < fList.size(); i++) {
            Faculty f = fList.get(i);
            sb.append("    { ");
            sb.append("\"id\": ").append(q(f.getId())).append(", ");
            sb.append("\"name\": ").append(q(f.getName())).append(", ");
            sb.append("\"department\": ").append(q(f.getDepartment())).append(", ");
            sb.append("\"maxWeeklyLoad\": ").append(f.getMaxWeeklyLoad());
            sb.append(" }");
            if (i < fList.size() - 1) sb.append(",");
            sb.append("\n");
        }
        sb.append("  ],\n");

        // ── Rooms ──
        sb.append("  \"rooms\": [\n");
        List<Room> rooms = context.getRooms();
        for (int i = 0; i < rooms.size(); i++) {
            Room r = rooms.get(i);
            sb.append("    { ");
            sb.append("\"code\": ").append(q(r.getCode())).append(", ");
            sb.append("\"type\": ").append(q(r.getType().name())).append(", ");
            sb.append("\"capacity\": ").append(r.getCapacity());
            sb.append(" }");
            if (i < rooms.size() - 1) sb.append(",");
            sb.append("\n");
        }
        sb.append("  ],\n");

        // ── Sub-batches ──
        sb.append("  \"subBatches\": [\n");
        List<SubBatch> subs = context.getSubBatches();
        for (int i = 0; i < subs.size(); i++) {
            SubBatch s = subs.get(i);
            sb.append("    { ");
            sb.append("\"id\": ").append(q(s.getId())).append(", ");
            sb.append("\"name\": ").append(q(s.getName())).append(", ");
            sb.append("\"size\": ").append(s.getSize());
            sb.append(" }");
            if (i < subs.size() - 1) sb.append(",");
            sb.append("\n");
        }
        sb.append("  ],\n");

        // ── Batch Groups ──
        sb.append("  \"batchGroups\": [\n");
        List<BatchGroup> groups = context.getBatchGroups();
        for (int i = 0; i < groups.size(); i++) {
            BatchGroup bg = groups.get(i);
            sb.append("    { ");
            sb.append("\"id\": ").append(q(bg.getId())).append(", ");
            sb.append("\"name\": ").append(q(bg.getName())).append(", ");
            sb.append("\"subBatchIds\": [");
            List<SubBatch> members = bg.getSubBatches();
            for (int j = 0; j < members.size(); j++) {
                sb.append(q(members.get(j).getId()));
                if (j < members.size() - 1) sb.append(", ");
            }
            sb.append("]");
            sb.append(" }");
            if (i < groups.size() - 1) sb.append(",");
            sb.append("\n");
        }
        sb.append("  ],\n");

        // ── Schedule (the actual timetable assignments) ──
        sb.append("  \"schedule\": [\n");
        List<Gene> genes = chromosome.getGenes();
        for (int i = 0; i < genes.size(); i++) {
            Gene g = genes.get(i);
            Session s = g.getSession();
            sb.append("    {\n");
            sb.append("      \"sessionId\": ").append(q(s.getId())).append(",\n");
            sb.append("      \"courseCode\": ").append(q(s.getCourse().getCode())).append(",\n");
            sb.append("      \"courseName\": ").append(q(s.getCourse().getName())).append(",\n");
            sb.append("      \"type\": ").append(q(s.getType().name())).append(",\n");
            sb.append("      \"batchGroupId\": ").append(q(s.getBatchGroup().getId())).append(",\n");
            sb.append("      \"batchGroupName\": ").append(q(s.getBatchGroup().getName())).append(",\n");
            sb.append("      \"facultyId\": ").append(q(s.getFaculty().getId())).append(",\n");
            sb.append("      \"facultyName\": ").append(q(s.getFaculty().getName())).append(",\n");
            sb.append("      \"roomCode\": ").append(q(g.getRoom() != null ? g.getRoom().getCode() : "")).append(",\n");
            sb.append("      \"day\": ").append(g.getDay()).append(",\n");
            sb.append("      \"startSlot\": ").append(g.getStartSlot()).append(",\n");
            sb.append("      \"durationSlots\": ").append(s.getDurationSlots()).append(",\n");
            sb.append("      \"subBatchIds\": [");
            List<SubBatch> sbMembers = s.getBatchGroup().getSubBatches();
            for (int j = 0; j < sbMembers.size(); j++) {
                sb.append(q(sbMembers.get(j).getId()));
                if (j < sbMembers.size() - 1) sb.append(", ");
            }
            sb.append("]\n");
            sb.append("    }");
            if (i < genes.size() - 1) sb.append(",");
            sb.append("\n");
        }
        sb.append("  ]\n");

        sb.append("}\n");

        // Write to file
        File outFile = new File(outputPath);
        File parentDir = outFile.getParentFile();
        if (parentDir != null && !parentDir.exists()) {
            parentDir.mkdirs();
        }

        try (FileWriter writer = new FileWriter(outFile)) {
            writer.write(sb.toString());
        }

        System.out.println(">>> JSON exported to: " + outFile.getAbsolutePath());
    }


    /** Quote a string value for JSON */
    private static String q(String value) {
        if (value == null) return "\"\"";
        // Escape special JSON characters
        String escaped = value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
        return "\"" + escaped + "\"";
    }


    /** Convert a String[] to a JSON array */
    private static String toJsonArray(String[] arr) {
        if (arr == null) return "[]";
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < arr.length; i++) {
            sb.append(q(arr[i]));
            if (i < arr.length - 1) sb.append(", ");
        }
        sb.append("]");
        return sb.toString();
    }
}
