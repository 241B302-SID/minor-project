package timetable.constraint;

import timetable.ga.Chromosome;
import timetable.ga.Gene;
import timetable.model.SessionType;
import timetable.model.TimetableContext;

/**
 * HC-4: Every Lab (P) session occupies two contiguous slots in the same room on the same day.
 */
public class LabContiguityConstraint implements Constraint {
    @Override
    public String getId() { return "HC-4"; }


    @Override
    public String getDescription() { return "Lab sessions must occupy contiguous slots within the same day"; }


    @Override
    public boolean isHard() { return true; }


    @Override
    public int getWeight() { return 1000; }



    @Override
    public int evaluate(Chromosome chromosome, TimetableContext context) {
        int violations = 0;

        for (Gene gene : chromosome.getGenes()) {
            int dayPeriods = context.getPeriodsForDay(gene.getDay());
            if (gene.getStartSlot() + gene.getSession().getDurationSlots() > dayPeriods) {
                violations++;
            }
        }
        return violations;
    }
}
