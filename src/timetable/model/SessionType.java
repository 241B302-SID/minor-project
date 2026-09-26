package timetable.model;

public enum SessionType {
    LECTURE("L"),
    TUTORIAL("T"),
    PRACTICAL("P");

    private final String code;

    SessionType(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
