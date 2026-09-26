package timetable.model;

public class Room {
    public enum RoomType {
        LECTURE_THEATRE, // LT
        CLASSROOM,       // CR
        COMPUTER_LAB,    // CL
        GENERAL_LAB      // Lab
    }

    private final String code;
    private final RoomType type;
    private final int capacity;

    public Room(String code, RoomType type, int capacity) {
        this.code = code;
        this.type = type;
        this.capacity = capacity;
    }

    public String getCode() { return code; }
    public RoomType getType() { return type; }
    public int getCapacity() { return capacity; }

    public boolean canAccommodate(SessionType sessionType, int studentCount) {
        if (studentCount > capacity) return false;
        if (sessionType == SessionType.PRACTICAL) {
            return type == RoomType.COMPUTER_LAB || type == RoomType.GENERAL_LAB;
        }
        return true;
    }

    @Override
    public String toString() {
        return code + " [" + type + "]";
    }
}
