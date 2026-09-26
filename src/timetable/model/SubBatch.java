package timetable.model;

import java.util.Objects;

public class SubBatch {
    private final String id;
    private final String name;
    private final int size;


    public SubBatch(String id, String name, int size) {
        this.id = id;
        this.name = name;
        this.size = size;
    }


    public String getId() { return id; }
    public String getName() { return name; }
    public int getSize() { return size; }


    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof SubBatch)) return false;
        SubBatch subBatch = (SubBatch) o;
        return Objects.equals(id, subBatch.id);
    }


    @Override
    public int hashCode() {
        return Objects.hash(id);
    }


    @Override
    public String toString() {
        return name;
    }
}
