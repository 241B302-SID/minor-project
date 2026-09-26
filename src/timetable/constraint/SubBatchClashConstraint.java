package timetable.constraint;

import timetable.ga.Chromosome;
import timetable.ga.Gene;
import timetable.model.BatchGroup;
import timetable.model.SubBatch;
import timetable.model.TimetableContext;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * HC-3: No sub-batch is a member of two different sessions in the same time slot.
 * Checked across arbitrary, overlapping batch groups (e.g. BX vs BATCI1).
 */
public class SubBatchClashConstraint implements Constraint {
    @Override
    public String getId() { return "HC-3"; }


    @Override
    public String getDescription() { return "No sub-batch is scheduled for two different sessions in the same slot"; }


    @Override
    public boolean isHard() { return true; }

    @Override
    public int getWeight() { return 1000; }


    @Override
    public int evaluate(Chromosome chromosome, TimetableContext context) {
        int violations = 0;
        int periodsPerDay = context.getPeriodsPerDay();
        Map<Integer, Set<String>> slotSubBatchMap = new HashMap<>();

        for (Gene gene : chromosome.getGenes()) {
            BatchGroup group = gene.getSession().getBatchGroup();
            if (group == null) continue;


            int duration = gene.getSession().getDurationSlots();
            int baseSlot = gene.getGlobalStartSlot(periodsPerDay);

            for (int offset = 0; offset < duration; offset++) {
                int slot = baseSlot + offset;
                slotSubBatchMap.putIfAbsent(slot, new HashSet<>());
                Set<String> activeInSlot = slotSubBatchMap.get(slot);

                for (SubBatch sb : group.getSubBatches()) {
                    if (!activeInSlot.add(sb.getId())) {
                        violations++;
                    }
                }
            }
        }
        return violations;
    }
}
