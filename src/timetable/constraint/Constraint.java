package timetable.constraint;

import timetable.ga.Chromosome;
import timetable.model.TimetableContext;

public interface Constraint {
    String getId();
    String getDescription();
    boolean isHard();
    int getWeight();
    int evaluate(Chromosome chromosome, TimetableContext context);
}
