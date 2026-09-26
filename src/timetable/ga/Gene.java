package timetable.ga;

import timetable.model.Room;
import timetable.model.Session;


public class Gene {
    private final Session session;
    private int day;        // 0 to daysCount - 1
    private int startSlot;  // 0 to periodsPerDay - 1
    private Room room;

    public Gene(Session session, int day, int startSlot, Room room) {
        this.session = session;
        this.day = day;
        this.startSlot = startSlot;
        this.room = room;
    }

    public Gene copy() {
        return new Gene(session, day, startSlot, room);
    }

    public Session getSession() { return session; }
    public int getDay() { return day; }
    public void setDay(int day) { this.day = day; }
    public int getStartSlot() { return startSlot; }
    public void setStartSlot(int startSlot) { this.startSlot = startSlot; }
    public Room getRoom() { return room; }
    public void setRoom(Room room) { this.room = room; }


    public int getGlobalStartSlot(int periodsPerDay) {
        return day * periodsPerDay + startSlot;
    }


    public boolean occupiesGlobalSlot(int globalSlot, int periodsPerDay) {
        int start = getGlobalStartSlot(periodsPerDay);
        return globalSlot >= start && globalSlot < (start + session.getDurationSlots());
    }


    @Override
    public String toString() {
        return session.toString() + " -> Day " + day + " Period " + startSlot + " @ " + (room != null ? room.getCode() : "null");
    }
}
