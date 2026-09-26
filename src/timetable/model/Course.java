package timetable.model;

public class Course {
    private final String code;
    private final String name;
    private final int credits;
    private final int lectureHours;   // L
    private final int tutorialHours;  // T
    private final int labHours;       // P (typically 2 if lab exists)
    private final boolean isElective;

    public Course(String code, String name, int credits, int lectureHours, int tutorialHours, int labHours, boolean isElective) {
        this.code = code;
        this.name = name;
        this.credits = credits;
        this.lectureHours = lectureHours;
        this.tutorialHours = tutorialHours;
        this.labHours = labHours;
        this.isElective = isElective;
    }

    public String getCode() { return code; }
    public String getName() { return name; }
    public int getCredits() { return credits; }
    public int getLectureHours() { return lectureHours; }
    public int getTutorialHours() { return tutorialHours; }
    public int getLabHours() { return labHours; }
    public boolean isElective() { return isElective; }

    @Override
    public String toString() {
        return code + " (" + name + ")";
    }
}
