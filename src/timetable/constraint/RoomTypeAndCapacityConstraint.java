package timetable.constraint;

import timetable.ga.Chromosome;
import timetable.ga.Gene;
import timetable.model.Room;
import timetable.model.Session;
import timetable.model.TimetableContext;

/**
 * HC-5: Room type matches session type and room capacity is sufficient.
 */
public class RoomTypeAndCapacityConstraint implements Constraint {
    @Override
    public String getId() { return "HC-5"; }


    @Override
    public String getDescription() { return "Room type matches session type and capacity is sufficient"; }


    @Override
    public boolean isHard() { return true; }

    @Override
    public int getWeight() { return 1000; }


    @Override
    public int evaluate(Chromosome chromosome, TimetableContext context) {
        int violations = 0;
        for (Gene gene : chromosome.getGenes()) {
            Room room = gene.getRoom();
            Session session = gene.getSession();


            if (room == null) {
                violations++;
                continue;
            }

            int studentCount = session.getBatchGroup().getTotalStudentCount();
            if (!room.canAccommodate(session.getType(), studentCount)) {
                violations++;
            }
        }
        return violations;
    }
}
