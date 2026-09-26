package timetable.model;

import java.util.Objects;

public class TimeSlot {
    private final int slotIndex; // 0 to (totalDays * periodsPerDay - 1)
    private final int day;       // 0=Mon, 1=Tue, ...
    private final int period;
    private final String timeLabel;


    public TimeSlot(int slotIndex, int day, int period, String timeLabel) {
        this.slotIndex = slotIndex;
        this.day = day;
        this.period = period;
        this.timeLabel = timeLabel;
    }


    public int getSlotIndex() { return slotIndex; }
    public int getDay() { return day; }
    public int getPeriod() { return period; }
    public String getTimeLabel() { return timeLabel; }


    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof TimeSlot)) return false;
        TimeSlot timeSlot = (TimeSlot) o;
        return slotIndex == timeSlot.slotIndex;
    }


    @Override
    public int hashCode() { return Objects.hash(slotIndex); }


    @Override
    public String toString() {
        return "Day" + day + "-P" + period + " (" + timeLabel + ")";
    }
}
