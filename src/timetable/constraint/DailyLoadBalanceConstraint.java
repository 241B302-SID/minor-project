package timetable.constraint;

import timetable.ga.Chromosome;
import timetable.ga.Gene;
import timetable.model.SubBatch;
import timetable.model.TimetableContext;

/**
 * SC-3: Balance total daily load evenly across days for each sub-batch.
 */
public class DailyLoadBalanceConstraint implements Constraint {
    @Override
    public String getId() { return "SC-3"; }

    @Override
    public String getDescription() { return "Balance total teaching load evenly across the week"; }


    @Override
    public boolean isHard() { return false; }


    @Override
    public int getWeight() { return 5; }


    @Override
    public int evaluate(Chromosome chromosome, TimetableContext context) {
        int penalty = 0;
        int daysCount = context.getDaysCount();

        for (SubBatch sb : context.getSubBatches()) {
            int[] dayLoads = new int[daysCount];


            for (Gene gene : chromosome.getGenes()) {
                if (gene.getSession().getBatchGroup().containsSubBatch(sb)) {
                    dayLoads[gene.getDay()] += gene.getSession().getDurationSlots();
                }
            }

            int min = dayLoads[0];
            int max = dayLoads[0];
            for (int load : dayLoads) {
                if (load < min) min = load;
                if (load > max) max = load;
            }
            penalty += (max - min);
        }
        return penalty;
    }
}
