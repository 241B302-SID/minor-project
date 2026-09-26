package timetable.constraint;

import timetable.ga.Chromosome;
import timetable.ga.Gene;
import timetable.model.Room;
import timetable.model.TimetableContext;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * HC-2: No room is scheduled for two sessions in the same time slot.
 */
public class RoomClashConstraint implements Constraint {
    @Override
    public String getId() { return "HC-2"; }

    @Override
    public String getDescription() { return "No room scheduled for two sessions in the same slot"; }

    @Override
    public boolean isHard() { return true; }

    @Override
    public int getWeight() { return 1000; }

    @Override
    public int evaluate(Chromosome chromosome, TimetableContext context) {
        int violations = 0;
        int periodsPerDay = context.getPeriodsPerDay();
        Map<Integer, Set<String>> slotRoomMap = new HashMap<>();

        for (Gene gene : chromosome.getGenes()) {
            Room room = gene.getRoom();
            if (room == null) continue;


            int duration = gene.getSession().getDurationSlots();
            int baseSlot = gene.getGlobalStartSlot(periodsPerDay);

            for (int offset = 0; offset < duration; offset++) {
                int slot = baseSlot + offset;
                slotRoomMap.putIfAbsent(slot, new HashSet<>());
                if (!slotRoomMap.get(slot).add(room.getCode())) {
                    violations++;
                }
            }
        }
        return violations;
    }
}
