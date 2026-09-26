package timetable.model;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

public class Faculty {
    private final String id;
    private final String name;
    private final String department;
    private final int maxWeeklyLoad;
    private final Set<Integer> unavailableSlots;

    public Faculty(String id, String name, String department, int maxWeeklyLoad) {
        this.id = id;
        this.name = name;
        this.department = department;
        this.maxWeeklyLoad = maxWeeklyLoad;
        this.unavailableSlots = new HashSet<>();
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getDepartment() { return department; }
    public int getMaxWeeklyLoad() { return maxWeeklyLoad; }
    public Set<Integer> getUnavailableSlots() { return Collections.unmodifiableSet(unavailableSlots); }

    public void addUnavailableSlot(int slotIndex) {
        unavailableSlots.add(slotIndex);
    }

    @Override
    public String toString() {
        return name + " (" + id + ")";
    }
}
