package timetable.model;

import java.util.Collections;
import java.util.List;

public class BatchGroup {
    private final String id;
    private final String name;
    private final List<SubBatch> subBatches;

    public BatchGroup(String id, String name, List<SubBatch> subBatches) {
        this.id = id;
        this.name = name;
        this.subBatches = subBatches;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public List<SubBatch> getSubBatches() { return Collections.unmodifiableList(subBatches); }

    public int getTotalStudentCount() {
        int count = 0;
        for (SubBatch sb : subBatches) {
            count += sb.getSize();
        }
        return count;
    }

    public boolean containsSubBatch(SubBatch sb) {
        return subBatches.contains(sb);
    }

    public boolean sharesAnySubBatch(BatchGroup other) {
        for (SubBatch sb : subBatches) {
            if (other.containsSubBatch(sb)) {
                return true;
            }
        }
        return false;
    }

    @Override
    public String toString() {
        return name;
    }
}
