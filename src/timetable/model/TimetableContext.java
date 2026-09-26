package timetable.model;

import java.util.List;

public class TimetableContext {
    private final List<Course> courses;
    private final List<Faculty> facultyList;
    private final List<Room> rooms;
    private final List<SubBatch> subBatches;
    private final List<BatchGroup> batchGroups;
    private final List<Session> sessions;
    private final int daysCount;
    private final int periodsPerDay;
    private final int[] periodsPerDayArray;
    private final String[] dayNames;
    private final String[] periodTimes;

    public TimetableContext(List<Course> courses,
                            List<Faculty> facultyList,
                            List<Room> rooms,
                            List<SubBatch> subBatches,
                            List<BatchGroup> batchGroups,
                            List<Session> sessions,
                            int daysCount,
                            int periodsPerDay,
                            String[] dayNames,
                            String[] periodTimes) {
        this(courses, facultyList, rooms, subBatches, batchGroups, sessions,
             daysCount, periodsPerDay, null, dayNames, periodTimes);
    }

    public TimetableContext(List<Course> courses,
                            List<Faculty> facultyList,
                            List<Room> rooms,
                            List<SubBatch> subBatches,
                            List<BatchGroup> batchGroups,
                            List<Session> sessions,
                            int daysCount,
                            int periodsPerDay,
                            int[] periodsPerDayArray,
                            String[] dayNames,
                            String[] periodTimes) {
        this.courses = courses;
        this.facultyList = facultyList;
        this.rooms = rooms;
        this.subBatches = subBatches;
        this.batchGroups = batchGroups;
        this.sessions = sessions;
        this.daysCount = daysCount;
        this.periodsPerDay = periodsPerDay;
        if (periodsPerDayArray != null && periodsPerDayArray.length == daysCount) {
            this.periodsPerDayArray = periodsPerDayArray;
        } else {
            this.periodsPerDayArray = new int[daysCount];
            java.util.Arrays.fill(this.periodsPerDayArray, periodsPerDay);
        }
        this.dayNames = dayNames;
        this.periodTimes = periodTimes;
    }

    public List<Course> getCourses() { return courses; }
    public List<Faculty> getFacultyList() { return facultyList; }
    public List<Room> getRooms() { return rooms; }
    public List<SubBatch> getSubBatches() { return subBatches; }
    public List<BatchGroup> getBatchGroups() { return batchGroups; }
    public List<Session> getSessions() { return sessions; }
    public int getDaysCount() { return daysCount; }
    public int getPeriodsPerDay() { return periodsPerDay; }
    public int[] getPeriodsPerDayArray() { return periodsPerDayArray; }
    public int getPeriodsForDay(int day) {
        if (day >= 0 && day < periodsPerDayArray.length) {
            return periodsPerDayArray[day];
        }
        return periodsPerDay;
    }
    public int getTotalSlots() { return daysCount * periodsPerDay; }
    public String[] getDayNames() { return dayNames; }
    public String[] getPeriodTimes() { return periodTimes; }

    public int getSlotIndex(int day, int period) {
        return day * periodsPerDay + period;
    }

    public int getDayFromSlot(int slotIndex) {
        return slotIndex / periodsPerDay;
    }

    public int getPeriodFromSlot(int slotIndex) {
        return slotIndex % periodsPerDay;
    }
}
