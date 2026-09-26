package timetable.view;

import timetable.ga.Chromosome;
import timetable.ga.Gene;
import timetable.model.*;

public class TimetablePrinter {

    public static void printSubBatchGrid(Chromosome chromosome, TimetableContext context, SubBatch subBatch) {
        System.out.println("\n==========================================================================================================");
        System.out.println("                        WEEKLY TIMETABLE FOR SUB-BATCH: " + subBatch.getName());
        System.out.println("==========================================================================================================");

        int daysCount = context.getDaysCount();
        int periodsPerDay = context.getPeriodsPerDay();
        String[] dayNames = context.getDayNames();
        String[] periodTimes = context.getPeriodTimes();

        System.out.printf("%-10s |", "Day/Period");
        for (int p = 0; p < periodsPerDay; p++) {
            String time = (periodTimes != null && p < periodTimes.length) ? periodTimes[p] : ("P" + (p + 1));
            System.out.printf(" %-22s |", "P" + (p + 1) + " (" + time + ")");
        }
        System.out.println();
        System.out.println("-".repeat(12 + periodsPerDay * 25));

        for (int d = 0; d < daysCount; d++) {
            System.out.printf("%-10s |", dayNames[d]);

            int dayPeriods = context.getPeriodsForDay(d);
            for (int p = 0; p < periodsPerDay; p++) {
                if (p >= dayPeriods) {
                    System.out.printf(" %-22s |", "[No Class]");
                    continue;
                }
                Gene matchingGene = null;


                for (Gene g : chromosome.getGenes()) {
                    if (g.getDay() == d && g.getSession().getBatchGroup().containsSubBatch(subBatch)) {
                        int start = g.getStartSlot();
                        int end = start + g.getSession().getDurationSlots();
                        if (p >= start && p < end) {
                            matchingGene = g;
                            break;
                        }
                    }
                }


                if (matchingGene != null) {
                    Session s = matchingGene.getSession();
                    String cell = s.getBatchGroup().getName() + "-" + s.getType().getCode() + "-" + s.getCourse().getCode() + "-" + matchingGene.getRoom().getCode();
                    System.out.printf(" %-22s |", truncate(cell, 22));
                } else {
                    System.out.printf(" %-22s |", "[Minor Project]");
                }
            }
            System.out.println();
        }
    }


    public static void printFacultyGrid(Chromosome chromosome, TimetableContext context, Faculty faculty) {
        System.out.println("\n==========================================================================================================");
        System.out.println("                        FACULTY SCHEDULE: " + faculty.getName() + " (" + faculty.getId() + ")");
        System.out.println("=========================================================================================================");


        int daysCount = context.getDaysCount();
        int periodsPerDay = context.getPeriodsPerDay();
        String[] dayNames = context.getDayNames();


        System.out.printf("%-10s |", "Day");
        for (int p = 0; p < periodsPerDay; p++) {
            System.out.printf(" %-22s |", "P" + (p + 1));
        }
        System.out.println();
        System.out.println("-".repeat(12 + periodsPerDay * 25));


        for (int d = 0; d < daysCount; d++) {
            System.out.printf("%-10s |", dayNames[d]);


            int dayPeriods = context.getPeriodsForDay(d);
            for (int p = 0; p < periodsPerDay; p++) {
                if (p >= dayPeriods) {
                    System.out.printf(" %-22s |", "[No Class]");
                    continue;
                }
                Gene match = null;
                for (Gene g : chromosome.getGenes()) {
                    if (g.getDay() == d && g.getSession().getFaculty().getId().equals(faculty.getId())) {
                        int start = g.getStartSlot();
                        int end = start + g.getSession().getDurationSlots();
                        if (p >= start && p < end) {
                            match = g;
                            break;
                        }
                    }
                }


                if (match != null) {
                    Session s = match.getSession();
                    String cell = s.getCourse().getCode() + " (" + s.getBatchGroup().getName() + ") @" + match.getRoom().getCode();
                    System.out.printf(" %-22s |", truncate(cell, 22));
                } else {
                    System.out.printf(" %-22s |", "-");
                }
            }
            System.out.println();
        }
    }


    private static String truncate(String s, int len) {
        if (s.length() <= len) return s;
        return s.substring(0, len - 2) + "..";
    }
}
