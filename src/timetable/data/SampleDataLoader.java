package timetable.data;

import timetable.model.*;

import java.util.*;

public class SampleDataLoader {


    public static TimetableContext loadReferenceDataset() {
        // 1. Sub-batches (14 sub-batches as in reference documentation)
        List<SubBatch> subBatches = new ArrayList<>();
        String[] sbNames = {"B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9", "B10", "B11", "B21", "B22", "B31"};
        Map<String, SubBatch> sbMap = new HashMap<>();
        for (String name : sbNames) {
            SubBatch sb = new SubBatch(name, name, 25);
            subBatches.add(sb);
            sbMap.put(name, sb);
        }


        // 2. Batch Groups (overlapping, per-course groups)
        List<BatchGroup> batchGroups = new ArrayList<>();


        java.util.function.BiFunction<String, String[], BatchGroup> makeGroup = (name, members) -> {
            List<SubBatch> list = new ArrayList<>();
            for (String m : members) list.add(sbMap.get(m));
            BatchGroup bg = new BatchGroup(name, name, list);
            batchGroups.add(bg);
            return bg;
        };

        BatchGroup bgBX = makeGroup.apply("BX", new String[]{"B1", "B2", "B3"});
        BatchGroup bgBY = makeGroup.apply("BY", new String[]{"B4", "B5", "B6"});
        BatchGroup bgBZ = makeGroup.apply("BZ", new String[]{"B7", "B8", "B9"});
        BatchGroup bgBX1 = makeGroup.apply("BX1", new String[]{"B10", "B11", "B21", "B22", "B31"});


        // Overlapping groupings for different courses
        BatchGroup bgBATCH1 = makeGroup.apply("BATCH1", new String[]{"B1", "B2", "B3", "B4", "B5"});
        BatchGroup bgBATCH2 = makeGroup.apply("BATCH2", new String[]{"B6", "B7", "B8", "B9"});


        // Single sub-batch groups for tutorials / labs
        Map<String, BatchGroup> singleSbGroups = new HashMap<>();
        for (String name : sbNames) {
            BatchGroup sg = makeGroup.apply(name, new String[]{name});
            singleSbGroups.put(name, sg);
        }


        // 3. Faculty
        List<Faculty> facultyList = new ArrayList<>();
        Faculty f1 = new Faculty("FAC01", "Dr. Sharma", "CSE", 14);
        Faculty f2 = new Faculty("FAC02", "Prof. Verma", "CSE", 14);
        Faculty f3 = new Faculty("FAC03", "Dr. Gupta", "Math", 12);
        Faculty f4 = new Faculty("FAC04", "Prof. Rao", "HSS", 10);
        Faculty f5 = new Faculty("FAC05", "Dr. Patel", "CSE", 14);
        Faculty f6 = new Faculty("FAC06", "Prof. Singh", "Physics", 12);
        facultyList.addAll(Arrays.asList(f1, f2, f3, f4, f5, f6));


        // 4. Rooms
        List<Room> rooms = new ArrayList<>();
        rooms.add(new Room("LT1", Room.RoomType.LECTURE_THEATRE, 160));
        rooms.add(new Room("LT2", Room.RoomType.LECTURE_THEATRE, 160));
        rooms.add(new Room("CR11", Room.RoomType.CLASSROOM, 80));
        rooms.add(new Room("CR12", Room.RoomType.CLASSROOM, 80));
        rooms.add(new Room("CR13", Room.RoomType.CLASSROOM, 80));
        rooms.add(new Room("CL1", Room.RoomType.COMPUTER_LAB, 35));
        rooms.add(new Room("CL2", Room.RoomType.COMPUTER_LAB, 35));
        rooms.add(new Room("CL3", Room.RoomType.CLASSROOM, 35));


        // 5. Courses (with explicit L-T-P hours)
        List<Course> courses = new ArrayList<>();
        Course ma106 = new Course("MA106", "Probability Theory", 4, 3, 1, 0, false);
        Course cs109 = new Course("CS109", "Computer Networks", 3, 3, 0, 0, false);
        Course cs110 = new Course("CS110", "Theory of Computation", 4, 3, 1, 0, false);
        Course cs212 = new Course("CS212", "Computer Networks Lab", 2, 0, 0, 2, false);
        Course cs303 = new Course("CS303", "Artificial Intelligence", 3, 3, 0, 0, false);
        courses.addAll(Arrays.asList(ma106, cs109, cs110, cs212, cs303));


        // 6. Sessions to schedule
        List<Session> sessions = new ArrayList<>();
        int sId = 1;


        // MA106: 3 Lectures for BX; 1 Tutorial for B1, B2
        for (int l = 1; l <= ma106.getLectureHours(); l++) {
            sessions.add(new Session("S" + (sId++), ma106, SessionType.LECTURE, bgBX, f3, 1, l));
        }
        sessions.add(new Session("S" + (sId++), ma106, SessionType.TUTORIAL, singleSbGroups.get("B1"), f3, 1, 1));
        sessions.add(new Session("S" + (sId++), ma106, SessionType.TUTORIAL, singleSbGroups.get("B2"), f3, 1, 1));


        // CS109: 3 Lectures for BX

        for (int l = 1; l <= cs109.getLectureHours(); l++) {
            sessions.add(new Session("S" + (sId++), cs109, SessionType.LECTURE, bgBX, f1, 1, l));
        }


        // CS110: 3 Lectures for BY, 1 Tut for B4
        for (int l = 1; l <= cs110.getLectureHours(); l++) {
            sessions.add(new Session("S" + (sId++), cs110, SessionType.LECTURE, bgBY, f5, 1, l));
        }
        sessions.add(new Session("S" + (sId++), cs110, SessionType.TUTORIAL, singleSbGroups.get("B4"), f5, 1, 1));


        // CS303: Artificial Intelligence for BATCH1 (overlapping grouping B1--B5)
        for (int l = 1; l <= cs303.getLectureHours(); l++) {
            sessions.add(new Session("S" + (sId++), cs303, SessionType.LECTURE, bgBATCH1, f4, 1, l));
        }


        // CS212: Lab (2 contiguous slots) for B1, B2, B3
        sessions.add(new Session("S" + (sId++), cs212, SessionType.PRACTICAL, singleSbGroups.get("B1"), f1, 2, 1));
        sessions.add(new Session("S" + (sId++), cs212, SessionType.PRACTICAL, singleSbGroups.get("B2"), f2, 2, 1));
        sessions.add(new Session("S" + (sId++), cs212, SessionType.PRACTICAL, singleSbGroups.get("B3"), f5, 2, 1));


        // Weekly schedule dimensions: 6 days, 7 periods/day (Saturday: 4 periods)
        int daysCount = 6;
        int periodsPerDay = 7;
        int[] periodsPerDayArray = {7, 7, 7, 7, 7, 4};
        String[] dayNames = {"Mon", "Tue", "Wed", "Thu", "Fri", "Sat"};
        String[] periodTimes = {"9:00-9:55", "10:00-10:55", "11:00-11:55", "12:00-12:55", "2:00-2:55", "3:00-3:55", "4:00-4:55"};


        return new TimetableContext(
                courses, facultyList, rooms, subBatches, batchGroups, sessions,
                daysCount, periodsPerDay, periodsPerDayArray, dayNames, periodTimes
        );
    }
}
