package timetable.io;

import timetable.model.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.function.BiFunction;

/**
 * Reads timetable input data from a JSON file and constructs a TimetableContext.
 * Pure Java implementation — uses a simple recursive-descent JSON parser.
 * No external libraries needed.
 */
public class JsonInputReader {

    /**
     * Reads the input JSON file and builds a TimetableContext.
     */
    public static TimetableContext read(String inputPath) throws IOException {
        String json = Files.readString(Path.of(inputPath));
        Map<String, Object> root = parseJsonObject(json.trim());

        // ── Config ──
        @SuppressWarnings("unchecked")
        Map<String, Object> config = (Map<String, Object>) root.get("config");
        int daysCount = toInt(config.get("daysCount"));
        int periodsPerDay = toInt(config.get("periodsPerDay"));
        String[] dayNames = toStringArray(config.get("dayNames"));
        String[] periodTimes = toStringArray(config.get("periodTimes"));

        int[] periodsPerDayArray = null;
        if (config.containsKey("periodsPerDayArray") && config.get("periodsPerDayArray") instanceof List) {
            @SuppressWarnings("unchecked")
            List<Object> arr = (List<Object>) config.get("periodsPerDayArray");
            periodsPerDayArray = new int[arr.size()];
            for (int i = 0; i < arr.size(); i++) {
                periodsPerDayArray[i] = toInt(arr.get(i));
            }
        }

        // ── Courses ──
        List<Course> courses = new ArrayList<>();
        Map<String, Course> courseMap = new HashMap<>();
        @SuppressWarnings("unchecked")
        List<Object> courseList = (List<Object>) root.get("courses");
        for (Object obj : courseList) {
            @SuppressWarnings("unchecked")
            Map<String, Object> cm = (Map<String, Object>) obj;
            String code = str(cm.get("code"));
            Course c = new Course(
                    code,
                    str(cm.get("name")),
                    toInt(cm.get("credits")),
                    toInt(cm.get("lectureHours")),
                    toInt(cm.get("tutorialHours")),
                    toInt(cm.get("labHours")),
                    toBool(cm.get("isElective"))
            );
            courses.add(c);
            courseMap.put(code, c);
        }

        // ── Faculty ──
        List<Faculty> facultyList = new ArrayList<>();
        Map<String, Faculty> facultyMap = new HashMap<>();
        @SuppressWarnings("unchecked")
        List<Object> facList = (List<Object>) root.get("faculty");
        for (Object obj : facList) {
            @SuppressWarnings("unchecked")
            Map<String, Object> fm = (Map<String, Object>) obj;
            String id = str(fm.get("id"));
            Faculty f = new Faculty(id, str(fm.get("name")), str(fm.get("department")), toInt(fm.get("maxWeeklyLoad")));
            facultyList.add(f);
            facultyMap.put(id, f);
        }

        // ── Rooms ──
        List<Room> rooms = new ArrayList<>();
        @SuppressWarnings("unchecked")
        List<Object> roomList = (List<Object>) root.get("rooms");
        for (Object obj : roomList) {
            @SuppressWarnings("unchecked")
            Map<String, Object> rm = (Map<String, Object>) obj;
            rooms.add(new Room(
                    str(rm.get("code")),
                    Room.RoomType.valueOf(str(rm.get("type"))),
                    toInt(rm.get("capacity"))
            ));
        }

        // ── Sub-batches ──
        List<SubBatch> subBatches = new ArrayList<>();
        Map<String, SubBatch> sbMap = new HashMap<>();
        @SuppressWarnings("unchecked")
        List<Object> sbList = (List<Object>) root.get("subBatches");
        for (Object obj : sbList) {
            @SuppressWarnings("unchecked")
            Map<String, Object> sm = (Map<String, Object>) obj;
            String id = str(sm.get("id"));
            SubBatch sb = new SubBatch(id, str(sm.get("name")), toInt(sm.get("size")));
            subBatches.add(sb);
            sbMap.put(id, sb);
        }

        // ── Batch Groups ──
        List<BatchGroup> batchGroups = new ArrayList<>();
        Map<String, BatchGroup> bgMap = new HashMap<>();
        @SuppressWarnings("unchecked")
        List<Object> bgList = (List<Object>) root.get("batchGroups");
        for (Object obj : bgList) {
            @SuppressWarnings("unchecked")
            Map<String, Object> bgm = (Map<String, Object>) obj;
            String id = str(bgm.get("id"));
            String name = str(bgm.get("name"));
            String[] memberIds = toStringArray(bgm.get("subBatchIds"));
            List<SubBatch> members = new ArrayList<>();
            for (String mid : memberIds) {
                SubBatch sb = sbMap.get(mid);
                if (sb != null) members.add(sb);
            }
            BatchGroup bg = new BatchGroup(id, name, members);
            batchGroups.add(bg);
            bgMap.put(id, bg);
        }

        // ── Session Mappings → Generate Sessions ──
        List<Session> sessions = new ArrayList<>();
        int sId = 1;
        @SuppressWarnings("unchecked")
        List<Object> mappings = (List<Object>) root.get("sessionMappings");
        if (mappings != null) {
            for (Object obj : mappings) {
                @SuppressWarnings("unchecked")
                Map<String, Object> m = (Map<String, Object>) obj;
                String courseCode = str(m.get("courseCode"));
                String typeStr = str(m.get("type"));
                String bgId = str(m.get("batchGroupId"));
                String facId = str(m.get("facultyId"));
                int count = toInt(m.get("count"));

                Course course = courseMap.get(courseCode);
                Faculty faculty = facultyMap.get(facId);
                BatchGroup bg = bgMap.get(bgId);
                SessionType type = SessionType.valueOf(typeStr);
                int duration = (type == SessionType.PRACTICAL) ? 2 : 1;

                if (course == null || faculty == null || bg == null) {
                    System.err.println("WARNING: Skipping invalid mapping — course=" + courseCode
                            + " faculty=" + facId + " batchGroup=" + bgId);
                    continue;
                }

                for (int i = 1; i <= count; i++) {
                    sessions.add(new Session("S" + (sId++), course, type, bg, faculty, duration, i));
                }
            }
        }

        // ── GA Params (optional, stored for Main.java to read) ──
        // GA params are read separately by Main.java; not part of TimetableContext.

        return new TimetableContext(
                courses, facultyList, rooms, subBatches, batchGroups, sessions,
                daysCount, periodsPerDay, periodsPerDayArray, dayNames, periodTimes
        );
    }


    /**
     * Reads GA parameters from the input JSON.
     * Returns a map with keys: populationSize, maxGenerations, elitismCount, mutationRate, crossoverRate
     */
    public static Map<String, Object> readGaParams(String inputPath) throws IOException {
        String json = Files.readString(Path.of(inputPath));
        Map<String, Object> root = parseJsonObject(json.trim());

        Map<String, Object> result = new HashMap<>();
        @SuppressWarnings("unchecked")
        Map<String, Object> gaParams = (Map<String, Object>) root.get("gaParams");
        if (gaParams != null) {
            result.put("populationSize", toInt(gaParams.get("populationSize")));
            result.put("maxGenerations", toInt(gaParams.get("maxGenerations")));
            result.put("elitismCount", toInt(gaParams.get("elitismCount")));
            result.put("mutationRate", toDouble(gaParams.get("mutationRate")));
            result.put("crossoverRate", toDouble(gaParams.get("crossoverRate")));
        }
        return result;
    }


    // ═══════════════════════════════════════════════════════════════════
    //  SIMPLE RECURSIVE-DESCENT JSON PARSER
    //  Supports: objects, arrays, strings, numbers, booleans, null
    // ═══════════════════════════════════════════════════════════════════

    private static int pos; // current parse position

    private static Map<String, Object> parseJsonObject(String json) {
        pos = 0;
        return parseObject(json);
    }

    private static void skipWhitespace(String json) {
        while (pos < json.length() && Character.isWhitespace(json.charAt(pos))) pos++;
    }

    private static Map<String, Object> parseObject(String json) {
        skipWhitespace(json);
        if (json.charAt(pos) != '{') throw new RuntimeException("Expected '{' at pos " + pos);
        pos++; // skip '{'

        Map<String, Object> map = new LinkedHashMap<>();
        skipWhitespace(json);
        if (json.charAt(pos) == '}') { pos++; return map; }

        while (true) {
            skipWhitespace(json);
            String key = parseString(json);
            skipWhitespace(json);
            if (json.charAt(pos) != ':') throw new RuntimeException("Expected ':' at pos " + pos);
            pos++; // skip ':'
            skipWhitespace(json);
            Object value = parseValue(json);
            map.put(key, value);
            skipWhitespace(json);
            if (json.charAt(pos) == ',') { pos++; continue; }
            if (json.charAt(pos) == '}') { pos++; break; }
            throw new RuntimeException("Expected ',' or '}' at pos " + pos);
        }
        return map;
    }

    private static List<Object> parseArray(String json) {
        pos++; // skip '['
        List<Object> list = new ArrayList<>();
        skipWhitespace(json);
        if (json.charAt(pos) == ']') { pos++; return list; }

        while (true) {
            skipWhitespace(json);
            list.add(parseValue(json));
            skipWhitespace(json);
            if (json.charAt(pos) == ',') { pos++; continue; }
            if (json.charAt(pos) == ']') { pos++; break; }
            throw new RuntimeException("Expected ',' or ']' at pos " + pos);
        }
        return list;
    }

    private static Object parseValue(String json) {
        skipWhitespace(json);
        char c = json.charAt(pos);
        if (c == '"') return parseString(json);
        if (c == '{') return parseObject(json);
        if (c == '[') return parseArray(json);
        if (c == 't') { pos += 4; return true; }      // true
        if (c == 'f') { pos += 5; return false; }     // false
        if (c == 'n') { pos += 4; return null; }      // null
        return parseNumber(json);
    }

    private static String parseString(String json) {
        if (json.charAt(pos) != '"') throw new RuntimeException("Expected '\"' at pos " + pos);
        pos++; // skip opening quote
        StringBuilder sb = new StringBuilder();
        while (pos < json.length()) {
            char c = json.charAt(pos);
            if (c == '\\') {
                pos++;
                char next = json.charAt(pos);
                switch (next) {
                    case '"': sb.append('"'); break;
                    case '\\': sb.append('\\'); break;
                    case '/': sb.append('/'); break;
                    case 'n': sb.append('\n'); break;
                    case 'r': sb.append('\r'); break;
                    case 't': sb.append('\t'); break;
                    default: sb.append(next);
                }
                pos++;
            } else if (c == '"') {
                pos++; // skip closing quote
                return sb.toString();
            } else {
                sb.append(c);
                pos++;
            }
        }
        throw new RuntimeException("Unterminated string");
    }

    private static Number parseNumber(String json) {
        int start = pos;
        boolean isFloat = false;
        if (json.charAt(pos) == '-') pos++;
        while (pos < json.length() && (Character.isDigit(json.charAt(pos)) || json.charAt(pos) == '.')) {
            if (json.charAt(pos) == '.') isFloat = true;
            pos++;
        }
        String numStr = json.substring(start, pos);
        return isFloat ? Double.parseDouble(numStr) : Long.parseLong(numStr);
    }


    // ── Helper conversions ──

    private static String str(Object o) {
        return o != null ? o.toString() : "";
    }

    private static int toInt(Object o) {
        if (o instanceof Number) return ((Number) o).intValue();
        return Integer.parseInt(o.toString());
    }

    private static double toDouble(Object o) {
        if (o instanceof Number) return ((Number) o).doubleValue();
        return Double.parseDouble(o.toString());
    }

    private static boolean toBool(Object o) {
        if (o instanceof Boolean) return (Boolean) o;
        return Boolean.parseBoolean(o.toString());
    }

    @SuppressWarnings("unchecked")
    private static String[] toStringArray(Object o) {
        if (o instanceof List) {
            List<Object> list = (List<Object>) o;
            String[] arr = new String[list.size()];
            for (int i = 0; i < list.size(); i++) arr[i] = str(list.get(i));
            return arr;
        }
        return new String[0];
    }
}
