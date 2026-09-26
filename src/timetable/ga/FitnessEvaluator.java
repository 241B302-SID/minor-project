package timetable.ga;

import timetable.constraint.Constraint;
import timetable.model.TimetableContext;

import java.util.List;

public class FitnessEvaluator {
    private final List<Constraint> constraints;

    public FitnessEvaluator(List<Constraint> constraints) {
        this.constraints = constraints;
    }

    public void evaluate(Chromosome chromosome, TimetableContext context) {
        int hardViolations = 0;
        int softPenalty = 0;
        double fitness = 0.0;

        for (Constraint c : constraints) {
            int score = c.evaluate(chromosome, context);
            if (c.isHard()) {
                hardViolations += score;
                fitness -= (double) score * c.getWeight();
            } else {
                softPenalty += score;
                fitness -= (double) score * c.getWeight();
            }
        }

        chromosome.setHardViolations(hardViolations);
        chromosome.setSoftViolations(softPenalty);
        chromosome.setFitness(fitness);
    }
}
