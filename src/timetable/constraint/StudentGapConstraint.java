package timetable.constraint;

import timetable.ga.Chromosome;
import timetable.ga.Gene;
import timetable.model.SubBatch;
import timetable.model.TimetableContext;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * SC-1: Minimize free gaps within a sub-batch's daily schedule.
 */
public class StudentGapConstraint implements Constraint {
    @Override
    public String getId() { return "SC-1"; }

    @Override
    public String getDescription() { return "Minimize free gaps within a sub-batch's daily schedule"; }


    @Override
    public boolean isHard() { return false; }


    @Override
    public int getWeight() { return 10; }


    @Override
    public int evaluate(Chromosome chromosome, TimetableContext context) {
        int penalty = 0;
        int periodsPerDay = context.getPeriodsPerDay();
        int daysCount = context.getDaysCount();

        for (SubBatch sb : context.getSubBatches()) {
            for (int d = 0; d < daysCount; d++) {
                List<Integer> activePeriods = new ArrayList<>();


                for (Gene gene : chromosome.getGenes()) {
                    if (gene.getDay() == d && gene.getSession().getBatchGroup().containsSubBatch(sb)) {
                        for (int offset = 0; offset < gene.getSession().getDurationSlots(); offset++) {
                            activePeriods.add(gene.getStartSlot() + offset);
                        }
                    }
                }


                if (activePeriods.size() <= 1) continue;

                Collections.sort(activePeriods);
                int firstPeriod = activePeriods.get(0);
                int lastPeriod = activePeriods.get(activePeriods.size() - 1);
                int span = lastPeriod - firstPeriod + 1;
                int gaps = span - activePeriods.size();
                if (gaps > 0) {
                    penalty += gaps;
                }
            }
        }
        return penalty;
    }
}
