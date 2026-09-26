package timetable.ga;

import timetable.model.Room;
import timetable.model.Session;
import timetable.model.SessionType;
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


        for (int gen = 0; gen < maxGenerations; gen++) {
            Collections.sort(population);
            Chromosome currentBest = population.get(0);


            if (currentBest.getFitness() > bestSoFar.getFitness()) {
                bestSoFar = currentBest.copy();
            }


            if (callback != null && (gen % 10 == 0 || gen == maxGenerations - 1 || bestSoFar.getHardViolations() == 0)) {
                callback.onGeneration(gen, bestSoFar);
            }


            if (bestSoFar.getHardViolations() == 0 && bestSoFar.getSoftViolations() == 0) {
                break;
            }


            List<Chromosome> nextGen = new ArrayList<>(populationSize);


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


        return bestSoFar;
    }


    private Chromosome createRandomChromosome() {
        List<Gene> genes = new ArrayList<>();
        List<Room> allRooms = context.getRooms();


        for (Session session : context.getSessions()) {
            int duration = session.getDurationSlots();
            int day = pickValidDay(duration);
            int maxStart = context.getPeriodsForDay(day) - duration;
            int startSlot = maxStart > 0 ? rand.nextInt(maxStart + 1) : 0;


            List<Room> suitableRooms = getSuitableRooms(session, allRooms);
            Room chosenRoom = suitableRooms.isEmpty() ? allRooms.get(rand.nextInt(allRooms.size()))
                    : suitableRooms.get(rand.nextInt(suitableRooms.size()));


            genes.add(new Gene(session, day, startSlot, chosenRoom));
        }
        return new Chromosome(genes);
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


    private Chromosome crossover(Chromosome p1, Chromosome p2) {
        List<Gene> childGenes = new ArrayList<>(p1.getGenes().size());
        int cut = rand.nextInt(p1.getGenes().size());
        for (int i = 0; i < p1.getGenes().size(); i++) {
            if (i < cut) {
                childGenes.add(p1.getGenes().get(i).copy());
            } else {
                childGenes.add(p2.getGenes().get(i).copy());
            }
        }
        return new Chromosome(childGenes);
    }


    private void mutate(Chromosome c) {
        List<Room> allRooms = context.getRooms();
        for (Gene gene : c.getGenes()) {
            if (rand.nextDouble() < mutationRate) {
                int duration = gene.getSession().getDurationSlots();
                int day = pickValidDay(duration);
                int maxStart = context.getPeriodsForDay(day) - duration;
                gene.setDay(day);
                gene.setStartSlot(maxStart > 0 ? rand.nextInt(maxStart + 1) : 0);


                if (rand.nextDouble() < 0.5) {
                    List<Room> suitable = getSuitableRooms(gene.getSession(), allRooms);
                    if (!suitable.isEmpty()) {
                        gene.setRoom(suitable.get(rand.nextInt(suitable.size())));
                    }
                }
            }
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


    public interface ProgressCallback {
        void onGeneration(int generation, Chromosome best);
    }
}
