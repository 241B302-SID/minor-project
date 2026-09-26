package timetable.model;

import java.util.Objects;

public class Session {
    private final String id;
    private final Course course;
    private final SessionType type;
    private final BatchGroup batchGroup;
    private final Faculty faculty;
    private final int durationSlots; // 1 for Lecture/Tutorial, 2 for Lab
    private final int sessionIndex;  // 1 st lecture, 2nd lecture, etc.


    public Session(String id, Course course, SessionType type, BatchGroup batchGroup, Faculty faculty, int durationSlots, int sessionIndex) {
        this.id = id;
        this.course = course;
        this.type = type;
        this.batchGroup = batchGroup;
        this.faculty = faculty;
        this.durationSlots = durationSlots;
        this.sessionIndex = sessionIndex;
    }


    public String getId() { return id; }
    public Course getCourse() { return course; }
    public SessionType getType() { return type; }
    public BatchGroup getBatchGroup() { return batchGroup; }
    public Faculty getFaculty() { return faculty; }
    public int getDurationSlots() { return durationSlots; }
    public int getSessionIndex() { return sessionIndex; }


    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Session)) return false;
        Session session = (Session) o;
        return Objects.equals(id, session.id);
    }


    @Override
    public int hashCode() { return Objects.hash(id); }


    @Override
    public String toString() {
        return batchGroup.getName() + "-" + type.getCode() + "-" + course.getCode();
    }
}
