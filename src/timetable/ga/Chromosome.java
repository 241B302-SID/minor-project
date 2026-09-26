package timetable.ga;

import java.util.ArrayList;
import java.util.List;

public class Chromosome implements Comparable<Chromosome> {
    private final List<Gene> genes;
    private double fitness;
    private int hardViolations;
    private int softViolations;

    public Chromosome(List<Gene> genes) {
        this.genes = genes;
        this.fitness = Double.NEGATIVE_INFINITY;
    }

    public List<Gene> getGenes() { return genes; }
    public double getFitness() { return fitness; }
    public void setFitness(double fitness) { this.fitness = fitness; }
    public int getHardViolations() { return hardViolations; }
    public void setHardViolations(int hardViolations) { this.hardViolations = hardViolations; }
    public int getSoftViolations() { return softViolations; }
    public void setSoftViolations(int softViolations) { this.softViolations = softViolations; }


    public Chromosome copy() {
        List<Gene> clonedGenes = new ArrayList<>(genes.size());
        for (Gene g : genes) {
            clonedGenes.add(g.copy());
        }
        Chromosome clone = new Chromosome(clonedGenes);
        clone.fitness = this.fitness;
        clone.hardViolations = this.hardViolations;
        clone.softViolations = this.softViolations;
        return clone;
    }


    @Override
    public int compareTo(Chromosome other) {
        return Double.compare(other.fitness, this.fitness);
    }
}
