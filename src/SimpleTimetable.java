
    import java.util.Random;

public class SimpleTimetable {

    static String[] batches = {"A", "B", "C", "D", "E", "F"};
    static String[] days = {"Mon", "Tue", "Wed", "Thu", "Fri"};
    static int periodsPerDay = 4;
    static int totalSlots = days.length * periodsPerDay;

    static int classesPerWeek = 12;

    static int HARD_WEIGHT = 50;
    static int SOFT_WEIGHT = 5;

    static Random rand = new Random();

    public static void main(String[] args) {

        int populationSize = 60;
        int generations = 300;
        int elitism = 2;
        int chromosomeLength = batches.length * totalSlots;

        boolean[][] population = new boolean[populationSize][];
        for (int i = 0; i < populationSize; i++) {
            population[i] = randomChromosome(chromosomeLength);
        }

        boolean[] best = population[0];

        for (int gen = 0; gen < generations; gen++) {

            sortByFitness(population);
            best = population[0];
            int bestFitness = fitness(best);

            if (gen % 25 == 0 || bestFitness == 0) {
                System.out.println("Generation " + gen + "  ->  best fitness = " + bestFitness);
            }

            if (bestFitness == 0) {
                System.out.println("\nPerfect distribution found at generation " + gen + ".");
                break;
            }

            boolean[][] nextGen = new boolean[populationSize][];
            for (int i = 0; i < elitism; i++) {
                nextGen[i] = population[i];
            }

            for (int i = elitism; i < populationSize; i++) {
                boolean[] parent1 = tournamentSelect(population);
                boolean[] parent2 = tournamentSelect(population);
                boolean[] child = crossover(parent1, parent2);
                mutate(child);
                nextGen[i] = child;
            }

            population = nextGen;
        }

        System.out.println("\nFinal fitness: " + fitness(best) + "  (0 = no rules broken)");
        printSchedule(best);
    }

    static boolean[] randomChromosome(int length) {
        boolean[] chromo = new boolean[length];

        for (int b = 0; b < batches.length; b++) {
            int[] slotIndexes = new int[totalSlots];
            for (int i = 0; i < totalSlots; i++) slotIndexes[i] = i;

            for (int i = totalSlots - 1; i > 0; i--) {
                int j = rand.nextInt(i + 1);
                int temp = slotIndexes[i];
                slotIndexes[i] = slotIndexes[j];
                slotIndexes[j] = temp;
            }

            for (int i = 0; i < classesPerWeek; i++) {
                int slot = slotIndexes[i];
                chromo[b * totalSlots + slot] = true;
            }
        }
        return chromo;
    }

    static int fitness(boolean[] chromosome) {
        int hardViolations = 0;
        int softViolations = 0;

        for (int b = 0; b < batches.length; b++) {

            int totalClasses = 0;
            int[] perDayCount = new int[days.length];

            for (int d = 0; d < days.length; d++) {
                for (int p = 0; p < periodsPerDay; p++) {
                    int slot = d * periodsPerDay + p;
                    if (chromosome[b * totalSlots + slot]) {
                        totalClasses++;
                        perDayCount[d]++;
                    }
                }
            }

            hardViolations += Math.abs(totalClasses - classesPerWeek);

            for (int d = 0; d < days.length; d++) {
                if (perDayCount[d] == 0) softViolations += 3;
            }

            int max = perDayCount[0];
            int min = perDayCount[0];
            for (int count : perDayCount) {
                if (count > max) max = count;
                if (count < min) min = count;
            }
            softViolations += (max - min);
        }

        return -(HARD_WEIGHT * hardViolations + SOFT_WEIGHT * softViolations);
    }

    static void sortByFitness(boolean[][] population) {
        for (int i = 0; i < population.length - 1; i++) {
            int maxIndex = i;
            for (int j = i + 1; j < population.length; j++) {
                if (fitness(population[j]) > fitness(population[maxIndex])) {
                    maxIndex = j;
                }
            }
            boolean[] temp = population[i];
            population[i] = population[maxIndex];
            population[maxIndex] = temp;
        }
    }

    static boolean[] tournamentSelect(boolean[][] population) {
        boolean[] best = null;
        int bestFitness = Integer.MIN_VALUE;

        for (int i = 0; i < 3; i++) {
            boolean[] candidate = population[rand.nextInt(population.length)];
            int f = fitness(candidate);
            if (f > bestFitness) {
                bestFitness = f;
                best = candidate;
            }
        }
        return best;
    }

    static boolean[] crossover(boolean[] parent1, boolean[] parent2) {
        boolean[] child = new boolean[parent1.length];
        int cut = 1 + rand.nextInt(parent1.length - 1);

        for (int i = 0; i < cut; i++) child[i] = parent1[i];
        for (int i = cut; i < parent1.length; i++) child[i] = parent2[i];

        return child;
    }

    static void mutate(boolean[] chromosome) {
        for (int b = 0; b < batches.length; b++) {
            if (rand.nextDouble() < 0.3) {
                int slot1 = b * totalSlots + rand.nextInt(totalSlots);
                int slot2 = b * totalSlots + rand.nextInt(totalSlots);
                boolean temp = chromosome[slot1];
                chromosome[slot1] = chromosome[slot2];
                chromosome[slot2] = temp;
            }
        }
    }

    static void printSchedule(boolean[] chromosome) {
        for (int b = 0; b < batches.length; b++) {
            System.out.println("\n=== Batch " + batches[b] + " ===");

            System.out.print("      ");
            for (int p = 0; p < periodsPerDay; p++)
                System.out.printf("%-10s", "P" + (p + 1));
            System.out.println();

            for (int d = 0; d < days.length; d++) {
                System.out.printf("%-5s ", days[d]);
                for (int p = 0; p < periodsPerDay; p++) {
                    int slot = d * periodsPerDay + p;
                    boolean hasClass = chromosome[b * totalSlots + slot];
                    System.out.printf("%-10s", hasClass ? "Class" : "-");
                }
                System.out.println();
            }
        }
    }
}

