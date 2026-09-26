package timetable.constraint;

import timetable.ga.Chromosome;
import timetable.ga.Gene;
import timetable.model.Faculty;
import timetable.model.TimetableContext;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * HC-1: No faculty is scheduled for two sessions in the same time slot.
 */
public class FacultyClashConstraint implements Constraint {
    @Override
    public String getId() { return "HC-1"; }

    @Override
    public String getDescription() { return "No faculty scheduled for two sessions in the same slot"; }

    @Override
    public boolean isHard() { return true; }

    @Override
    public int getWeight() { return 1000; }

    @Override
    public int evaluate(Chromosome chromosome, TimetableContext context) {
        int violations = 0;
        int periodsPerDay = context.getPeriodsPerDay();
        Map<Integer, Set<String>> slotFacultyMap = new HashMap<>();

        for (Gene gene : chromosome.getGenes()) {
            Faculty faculty = gene.getSession().getFaculty();
            if (faculty == null) continue;

            int duration = gene.getSession().getDurationSlots();
            int baseSlot = gene.getGlobalStartSlot(periodsPerDay);

            for (int offset = 0; offset < duration; offset++) {
                int slot = baseSlot + offset;
                slotFacultyMap.putIfAbsent(slot, new HashSet<>());
                if (!slotFacultyMap.get(slot).add(faculty.getId())) {
                    violations++;
                }
            }
        }
        return violations;
    }
}
