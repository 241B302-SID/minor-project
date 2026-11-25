package timetable.ga;

import timetable.model.Room;
import timetable.model.Session;
import timetable.model.SessionType;
import timetable.model.SubBatch;
import timetable.model.TimetableContext;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

public class GeneticAlgorithm {
    private final TimetableContext context;
    private final FitnessEvaluator fitnessEvaluator;
    private final Random rand;

    private final int populationSize;
    private final int maxGenerations;
    private final int elitismCount;
    private final double mutationRate;
    private final double crossoverRate;

    public GeneticAlgorithm(TimetableContext context,
                            FitnessEvaluator fitnessEvaluator,
                            int populationSize,
                            int maxGenerations,
                            int elitismCount,
                            double mutationRate,
                            double crossoverRate,
                            Long seed) {
        this.context = context;
        this.fitnessEvaluator = fitnessEvaluator;
        this.populationSize = populationSize;
        this.maxGenerations = maxGenerations;
        this.elitismCount = elitismCount;
        this.mutationRate = mutationRate;
        this.crossoverRate = crossoverRate;
        this.rand = seed != null ? new Random(seed) : new Random();
    }

    public Chromosome run(ProgressCallback callback) {
        List<Chromosome> population = new ArrayList<>(populationSize);
        for (int i = 0; i < populationSize; i++) {
            Chromosome c = createRandomChromosome();
            fitnessEvaluator.evaluate(c, context);
            population.add(c);
        }

        Collections.sort(population);
        Chromosome bestSoFar = population.get(0).copy();
        if (bestSoFar.getHardViolations() > 0) {
            repairChromosome(bestSoFar, 30);
            fitnessEvaluator.evaluate(bestSoFar, context);
        }

        int noImprovementCount = 0;

        for (int gen = 0; gen < maxGenerations; gen++) {
            Collections.sort(population);
            Chromosome currentBest = population.get(0);

            if (currentBest.getHardViolations() > 0) {
                repairChromosome(currentBest, 15);
                fitnessEvaluator.evaluate(currentBest, context);
            }

            if (currentBest.getFitness() > bestSoFar.getFitness()) {
                bestSoFar = currentBest.copy();
                noImprovementCount = 0;
            } else {
                noImprovementCount++;
            }

            if (callback != null && (gen % 10 == 0 || gen == maxGenerations - 1 || bestSoFar.getHardViolations() == 0)) {
                callback.onGeneration(gen, bestSoFar);
            }

            // Early exit if 0 hard violations achieved and soft constraints stabilized
            if (bestSoFar.getHardViolations() == 0) {
                if (gen >= 60 && (noImprovementCount >= 25 || bestSoFar.getSoftViolations() <= 10)) {
                    break;
                }
            }

            List<Chromosome> nextGen = new ArrayList<>(populationSize);

            // Elitism: carry over top individuals
            for (int i = 0; i < elitismCount && i < population.size(); i++) {
                nextGen.add(population.get(i).copy());
            }

            while (nextGen.size() < populationSize) {
                Chromosome parent1 = tournamentSelect(population, 3);
                Chromosome parent2 = tournamentSelect(population, 3);

                Chromosome child;
                if (rand.nextDouble() < crossoverRate) {
                    child = crossover(parent1, parent2);
                } else {
                    child = parent1.copy();
                }

                mutate(child);
                fitnessEvaluator.evaluate(child, context);
                nextGen.add(child);
            }

            population = nextGen;
        }

        // Final polishing pass on best chromosome
        if (bestSoFar.getHardViolations() > 0) {
            repairChromosome(bestSoFar, 50);
            fitnessEvaluator.evaluate(bestSoFar, context);
        }

        return bestSoFar;
    }

    private Chromosome createRandomChromosome() {
        List<Gene> genes = new ArrayList<>();
        List<Room> allRooms = context.getRooms();

        for (Session session : context.getSessions()) {
            int duration = session.getDurationSlots();
            int day = pickValidDay(duration);
            int startSlot;
            if (duration == 2) {
                int[] labStarts = (day == 5) ? new int[]{0, 2} : new int[]{0, 2, 4};
                startSlot = labStarts[rand.nextInt(labStarts.length)];
            } else {
                int maxStart = context.getPeriodsForDay(day) - duration;
                startSlot = maxStart > 0 ? rand.nextInt(maxStart + 1) : 0;
            }

            List<Room> suitableRooms = getSuitableRooms(session, allRooms);
            Room chosenRoom = suitableRooms.isEmpty() ? allRooms.get(rand.nextInt(allRooms.size()))
                    : suitableRooms.get(rand.nextInt(suitableRooms.size()));

            genes.add(new Gene(session, day, startSlot, chosenRoom));
        }
        Chromosome c = new Chromosome(genes);
        repairChromosome(c, 20);
        return c;
    }

    private List<Room> getSuitableRooms(Session session, List<Room> allRooms) {
        int studentCount = session.getBatchGroup().getTotalStudentCount();
        List<Room> suitable = new ArrayList<>();
        for (Room r : allRooms) {
            if (r.canAccommodate(session.getType(), studentCount)) {
                suitable.add(r);
            }
        }
        return suitable;
    }

    private Chromosome tournamentSelect(List<Chromosome> population, int tournamentSize) {
        Chromosome best = null;
        for (int i = 0; i < tournamentSize; i++) {
            Chromosome contestant = population.get(rand.nextInt(population.size()));
            if (best == null || contestant.getFitness() > best.getFitness()) {
                best = contestant;
            }
        }
        return best;
    }

    /**
     * Uniform crossover — each gene is inherited independently from parent 1 or parent 2.
     */
    private Chromosome crossover(Chromosome p1, Chromosome p2) {
        List<Gene> childGenes = new ArrayList<>(p1.getGenes().size());
        for (int i = 0; i < p1.getGenes().size(); i++) {
            childGenes.add(rand.nextBoolean() ? p1.getGenes().get(i).copy() : p2.getGenes().get(i).copy());
        }
        return new Chromosome(childGenes);
    }

    private void mutate(Chromosome c) {
        List<Room> allRooms = context.getRooms();
        boolean mutated = false;

        for (Gene gene : c.getGenes()) {
            if (rand.nextDouble() < mutationRate) {
                mutated = true;
                int duration = gene.getSession().getDurationSlots();
                int day = pickValidDay(duration);
                int startSlot;
                if (duration == 2) {
                    int[] labStarts = (day == 5) ? new int[]{0, 2} : new int[]{0, 2, 4};
                    startSlot = labStarts[rand.nextInt(labStarts.length)];
                } else {
                    int maxStart = context.getPeriodsForDay(day) - duration;
                    startSlot = maxStart > 0 ? rand.nextInt(maxStart + 1) : 0;
                }
                gene.setDay(day);
                gene.setStartSlot(startSlot);

                if (rand.nextDouble() < 0.6) {
                    List<Room> suitable = getSuitableRooms(gene.getSession(), allRooms);
                    if (!suitable.isEmpty()) {
                        gene.setRoom(suitable.get(rand.nextInt(suitable.size())));
                    }
                }
            }
        }

        if (mutated && rand.nextDouble() < 0.6) {
            repairChromosome(c, 5);
        }
    }

    private int pickValidDay(int duration) {
        List<Integer> validDays = new ArrayList<>();
        for (int d = 0; d < context.getDaysCount(); d++) {
            if (context.getPeriodsForDay(d) >= duration) {
                validDays.add(d);
            }
        }
        if (validDays.isEmpty()) {
            return rand.nextInt(context.getDaysCount());
        }
        return validDays.get(rand.nextInt(validDays.size()));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Min-Conflicts Local Search & Conflict-Directed Repair
    // ─────────────────────────────────────────────────────────────────────────────

    private static class Placement {
        final int day;
        final int slot;
        final Room room;
        final int penalty;

        Placement(int day, int slot, Room room, int penalty) {
            this.day = day;
            this.slot = slot;
            this.room = room;
            this.penalty = penalty;
        }
    }

    public boolean repairChromosome(Chromosome c, int maxIterations) {
        List<Gene> genes = c.getGenes();
        List<Room> allRooms = context.getRooms();

        for (int iter = 0; iter < maxIterations; iter++) {
            List<Gene> clashingGenes = findClashingGenes(genes);
            if (clashingGenes.isEmpty()) {
                return true;
            }

            Collections.shuffle(clashingGenes, rand);
            boolean improvedAny = false;

            for (Gene g : clashingGenes) {
                int currentClashes = countGeneClashes(g, genes);
                if (currentClashes == 0) continue;

                int duration = g.getSession().getDurationSlots();
                List<Room> suitableRooms = getSuitableRooms(g.getSession(), allRooms);
                if (suitableRooms.isEmpty()) suitableRooms = allRooms;

                int bestClashes = currentClashes;
                int bestPenalty = Integer.MAX_VALUE;
                List<Placement> candidates = new ArrayList<>();

                for (int day = 0; day < context.getDaysCount(); day++) {
                    int dayPeriods = context.getPeriodsForDay(day);
                    if (dayPeriods < duration) continue;

                    int[] validSlots;
                    if (duration == 2) {
                        validSlots = (day == 5) ? new int[]{0, 2} : new int[]{0, 2, 4};
                    } else {
                        validSlots = new int[dayPeriods - duration + 1];
                        for (int s = 0; s < validSlots.length; s++) validSlots[s] = s;
                    }

                    for (int slot : validSlots) {
                        for (Room r : suitableRooms) {
                            int clashes = countCandidateClashes(g, day, slot, duration, r, genes);
                            if (clashes > bestClashes) continue;

                            int penalty = computeSecondaryPenalty(g, day, genes);
                            if (clashes < bestClashes) {
                                bestClashes = clashes;
                                bestPenalty = penalty;
                                candidates.clear();
                                candidates.add(new Placement(day, slot, r, penalty));
                            } else if (clashes == bestClashes) {
                                if (penalty < bestPenalty) {
                                    bestPenalty = penalty;
                                    candidates.clear();
                                    candidates.add(new Placement(day, slot, r, penalty));
                                } else if (penalty == bestPenalty) {
                                    candidates.add(new Placement(day, slot, r, penalty));
                                }
                            }
                        }
                    }
                }

                if (!candidates.isEmpty() && bestClashes < currentClashes) {
                    Placement chosen = candidates.get(rand.nextInt(candidates.size()));
                    g.setDay(chosen.day);
                    g.setStartSlot(chosen.slot);
                    g.setRoom(chosen.room);
                    improvedAny = true;
                } else if (!candidates.isEmpty() && bestClashes == currentClashes && rand.nextDouble() < 0.20) {
                    Placement chosen = candidates.get(rand.nextInt(candidates.size()));
                    g.setDay(chosen.day);
                    g.setStartSlot(chosen.slot);
                    g.setRoom(chosen.room);
                }
            }

            if (!improvedAny && rand.nextDouble() < 0.25) {
                Gene g = clashingGenes.get(rand.nextInt(clashingGenes.size()));
                int dur = g.getSession().getDurationSlots();
                int d = pickValidDay(dur);
                int s;
                if (dur == 2) {
                    int[] ls = (d == 5) ? new int[]{0, 2} : new int[]{0, 2, 4};
                    s = ls[rand.nextInt(ls.length)];
                } else {
                    int maxStart = context.getPeriodsForDay(d) - dur;
                    s = maxStart > 0 ? rand.nextInt(maxStart + 1) : 0;
                }
                g.setDay(d);
                g.setStartSlot(s);
            }
        }

        return findClashingGenes(genes).isEmpty();
    }

    private List<Gene> findClashingGenes(List<Gene> allGenes) {
        List<Gene> clashing = new ArrayList<>();
        for (Gene g : allGenes) {
            if (countGeneClashes(g, allGenes) > 0) {
                clashing.add(g);
            }
        }
        return clashing;
    }

    private int countGeneClashes(Gene g, List<Gene> allGenes) {
        return countCandidateClashes(g, g.getDay(), g.getStartSlot(), g.getSession().getDurationSlots(), g.getRoom(), allGenes);
    }

    private int countCandidateClashes(Gene targetGene, int day, int startSlot, int duration, Room room, List<Gene> allGenes) {
        int dayPeriods = context.getPeriodsForDay(day);
        if (startSlot + duration > dayPeriods) {
            return 9999;
        }

        int studentCount = targetGene.getSession().getBatchGroup().getTotalStudentCount();
        if (room == null || !room.canAccommodate(targetGene.getSession().getType(), studentCount)) {
            return 9999;
        }

        int clashes = 0;
        int endSlot = startSlot + duration;

        for (Gene other : allGenes) {
            if (other == targetGene || other.getDay() != day) continue;

            int otherStart = other.getStartSlot();
            int otherEnd = otherStart + other.getSession().getDurationSlots();

            if (startSlot < otherEnd && otherStart < endSlot) {
                // Room clash
                if (room.equals(other.getRoom())) {
                    clashes += 2;
                }

                // Faculty clash
                if (targetGene.getSession().getFaculty() != null &&
                        targetGene.getSession().getFaculty().equals(other.getSession().getFaculty())) {
                    clashes += 2;
                }

                // Sub-batch clash
                if (targetGene.getSession().getBatchGroup().sharesAnySubBatch(other.getSession().getBatchGroup())) {
                    int shared = 0;
                    for (SubBatch sb : targetGene.getSession().getBatchGroup().getSubBatches()) {
                        if (other.getSession().getBatchGroup().containsSubBatch(sb)) {
                            shared++;
                        }
                    }
                    clashes += (shared > 0 ? shared : 1);
                }
            }
        }
        return clashes;
    }

    private int computeSecondaryPenalty(Gene targetGene, int day, List<Gene> allGenes) {
        int penalty = 0;
        for (Gene other : allGenes) {
            if (other == targetGene) continue;
            if (other.getDay() == day) {
                if (targetGene.getSession().getCourse().equals(other.getSession().getCourse()) &&
                        targetGene.getSession().getBatchGroup().sharesAnySubBatch(other.getSession().getBatchGroup())) {
                    penalty += 3;
                }
            }
        }
        return penalty;
    }

    public interface ProgressCallback {
        void onGeneration(int generation, Chromosome best);
    }
}
