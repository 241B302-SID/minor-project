# Academic Timetable Generator
### Project Requirement (Software Requirements Specification)

---

## 1. Introduction

### 1.1 Purpose
This document specifies the functional and non-functional requirements for the Academic Timetable Generator — a desktop application that generates class timetables using a Genetic Algorithm (GA). It is the technical companion to **Project description.md**.

### 1.2 Document Scope
Covers: data/master requirements, functional requirements, GA engine requirements, hard/soft constraints, data model, non-functional requirements, export requirements, assumptions, dependencies, acceptance criteria, and open items needing confirmation.

### 1.3 Definitions & Abbreviations

| Term | Meaning |
|---|---|
| L | Lecture session |
| T | Tutorial session |
| P | Practical / Lab session |
| Batch | Top-level admitted class (e.g., "CSE 2024–28") |
| Sub-batch | Smallest scheduling unit within a batch (e.g., B1, B2, B21) |
| Batch Group | A named, course-specific set of sub-batches attending one session together |
| Credit | Numeric academic weight of a course |
| Slot | One fixed unit of time in the weekly grid |
| GA | Genetic Algorithm |
| Chromosome | One complete candidate timetable |
| Gene | One scheduled session within a chromosome (session-slot-room-faculty assignment) |
| HC | Hard Constraint |
| SC | Soft Constraint |
| FR | Functional Requirement |
| NFR | Non-Functional Requirement |

---

## 2. Overall Description

### 2.1 Product Perspective
A standalone desktop application (single active project/dataset at a time) consisting of a data-entry UI, a constraint-configuration UI, a GA scheduling engine, a timetable viewer/editor, and an export module.

### 2.2 User Classes
Admin/Coordinator (full access), Viewer (faculty/student — read-only), optionally a Reviewer/HoD role for approval — see FR-9 for whether roles are required in v1.

### 2.3 Reference Data Model (from supplied sample timetable)

The reference timetable illustrates the real-world scale and structure this system must support, and is used below as a worked example. A different admission batch (e.g., 2024–28) may instead have roughly **6 courses, 3 labs, 4 batches and 12–13 sub-batches** — the system must not hardcode either scale.

**Sub-batches (example, 14 total):** B1, B2, B3, B4, B5, B6, B7, B8, B9, B10, B11, B21, B22, B31

**Batch Groups actually used in the reference (note: overlapping, not one clean hierarchy):**

| Group name | Member sub-batches | Used for |
|---|---|---|
| BX | B1, B2, B3 | Combined Lecture (e.g., PTRP, ToC, CoE) |
| BY | B4, B5, B6 | Combined Lecture |
| BZ | B7, B8, B9 | Combined Lecture |
| BX1 | B10, B11, B21, B22, B31 | Combined Lecture |
| BATCH1 | B1–B5 | Combined Lecture (e.g., AI, Nano Science) |
| BATCH2 | B6–B9 | Combined Lecture |
| (individual) | B21, B22 | Specialization elective (e.g., Deep Learning) |
| (individual) | B31 | Specialization elective (e.g., Data Analysis & Visualization) |

Note that **BX and BATCH1 both contain B1–B3 but are different groupings used by different courses in the same week** — this is the key modelling challenge: groupings are defined **per course**, not as one fixed organizational tree.

**Sample course list (from reference legend):**

| Code | Course | Sessions | Notes |
|---|---|---|---|
| MA106 | Probability Theory & Random Processes | L + T | Taught to BX/BY/BZ/BX1 |
| CS109 | Computer Networks | L | Split faculty by group |
| CS110 | Theory of Computation | L + T | |
| HS301 | Concepts of Economics | L + T | |
| CS212 | Computer Networks Lab | P | 2 hrs/week |
| CS214 | Open Source Software Lab | P | 2 hrs/week |
| CS215 | Advanced Programming Lab-2 | P | 2 hrs/week |
| CS301 | Prompt Engineering & Generative AI | — | |
| PH302 | Introduction to Quantum Computing | L | |
| PH303 | Nano Science | L | |
| PH304 | Materials Science & Applications | L | |
| CS303 | Artificial Intelligence | L | BATCH1/BATCH2/BX1 |
| CS118 / CS223 | Data Analysis & Visualization + Lab | L / P | CSE(DS) elective — sub-batch B31 |
| CS120 / CS224 | Deep Learning + Lab | L / P | CSE(AI&ML) elective — sub-batches B21, B22 |

**Room types observed:** Lecture Theatre (LT), Classroom (CR), shared large venue (DLC), Computer Lab (CL) — each with an implied capacity tier.

**Special rule observed:** any period where a sub-batch has no scheduled session defaults to **Minor Project** time.

---

## 3. Functional Requirements

### 3.1 Master Data Management

- **FR-1** The system shall allow creation/editing of a **Program/Batch** (e.g., "CSE 2024–28", Semester V).
- **FR-2** The system shall allow definition of **Sub-batches** under a batch (arbitrary count, e.g., 12–13).
- **FR-3** The system shall allow definition of **Batch Groups** as an arbitrary named union of sub-batches, and shall allow **different, independently-defined groups per course** (groups need not nest inside one another).
- **FR-4** The system shall allow creation/editing of **Courses**, each with: code, name, credit value, session types required (any of L/T/P), and which batch/sub-batch/group each session type applies to.
- **FR-5** The system shall support marking a course as an **elective/specialization course**, restricted to specific sub-batches only.
- **FR-6** The system shall allow creation/editing of **Faculty** records: name, department, subjects they can teach, weekly maximum teaching load, and unavailable slots.
- **FR-7** The system shall support a course being taught by **different faculty for different groups** of the same course.
- **FR-8** The system shall allow creation/editing of **Rooms/Labs**: name/code, type (Lecture Theatre, Classroom, Computer Lab, etc.), and capacity.
- **FR-9** The system shall allow configuration of the **weekly time structure**: working days, number of slots per day, slot start/end times, and which slots may be merged into a 2-hour block for labs.
- **FR-10** *(role support — confirm need)* The system may support Admin vs Viewer roles for a single shared project file.

### 3.2 Hour Computation Rules

- **FR-11** The system shall compute the required **weekly Lecture and Tutorial hours** for a course from its credit value, using a configurable credit-to-hours rule (default rule and confirmation needed — see Section 12, Open Item OI-1).
- **FR-12** The system shall assign a **fixed 2 contiguous hours per week** to every Lab (Practical) session, for every batch/sub-batch/group it applies to, regardless of course credit.
- **FR-13** The system shall allow an administrator to **override** the computed L/T hours for a specific course if needed.

### 3.3 Constraint Configuration

- **FR-14** The system shall provide a configuration screen listing all **Hard Constraints** (Section 4.1) — these shall always be enforced and shall not be disabled by the user.
- **FR-15** The system shall provide a configuration screen for all **Soft Constraints** (Section 4.2), allowing each to be enabled/disabled and weighted.
- **FR-16** The system shall allow entry of faculty and room **unavailability windows** (e.g., leave, maintenance) to be respected as hard constraints for that run.
- **FR-17** The system shall allow specific sessions to be **locked** to a fixed slot/room/faculty before a generation run, and shall treat locked sessions as fixed points the GA must build around.

### 3.4 Genetic Algorithm Scheduling

- **FR-18** The system shall generate a complete weekly timetable for a selected program/batch using the Genetic Algorithm engine described in Section 4.
- **FR-19** The system shall allow re-running generation (with a new random seed) to produce **alternative valid timetables** for comparison.
- **FR-20** If no zero-hard-violation solution is found within the configured limits, the system shall present the **best available candidate** and clearly flag remaining violations with their location and cause.
- **FR-21** The system shall allow **partial regeneration** — recomputing the schedule for a subset of batches/courses while keeping other already-approved sessions fixed, subject to global clash-checking.
- **FR-22** The system shall automatically label any slot left empty for a sub-batch as **"Minor Project"** (configurable label).

### 3.5 Viewing & Manual Editing

- **FR-23** The system shall display the generated timetable as a day × time-slot grid, matching the reference cell format `Group-Type-Course-Room` (e.g., `B3-T-CoE-CR11`).
- **FR-24** The system shall provide filtered views: by sub-batch/batch group, by faculty, and by room.
- **FR-25** The system shall allow manual drag-and-drop editing of a generated timetable, with **real-time re-validation** against all hard constraints, highlighting any new conflict immediately.
- **FR-26** The system shall support **undo/redo** of manual edits.

### 3.6 Export & Reporting

- **FR-27** The system shall export the timetable to **PDF** and **Excel**, in a print-ready grid layout similar to the reference format.
- **FR-28** The system shall generate a **faculty workload report** (hours/week per faculty, courses taught).
- **FR-29** The system shall generate a **room utilization report**.
- **FR-30** The system shall support **importing** course/faculty/room master lists from Excel/CSV.
- **FR-31** The system shall support saving/loading a full project (all master data, constraints, and generated timetables) as a local file.

---

## 4. Constraints

### 4.1 Hard Constraints (must never be violated)

| ID | Constraint |
|---|---|
| HC-1 | No faculty is scheduled for two sessions in the same time slot |
| HC-2 | No room is scheduled for two sessions in the same time slot |
| HC-3 | No sub-batch is a member of two different sessions in the same time slot (checked across overlapping batch groups, not just identical group names) |
| HC-4 | Every Lab (P) session occupies **two contiguous slots** in the **same room** |
| HC-5 | A session's room type matches its session type (e.g., Lab sessions only in Computer/Dept Labs) and the room's capacity is sufficient for the attending group size |
| HC-6 | A session is not scheduled in a faculty/room's declared unavailable window |
| HC-7 | Locked/fixed sessions (FR-17) are never moved or overwritten |
| HC-8 | An elective/specialization session only appears for its designated sub-batches |

### 4.2 Soft Constraints (optimized, not mandatory)

| ID | Constraint | Default weight |
|---|---|---|
| SC-1 | Minimize free gaps within a sub-batch's daily schedule | High |
| SC-2 | Minimize idle gaps in a faculty member's day | Medium |
| SC-3 | Balance total teaching load evenly across the week (avoid heavy/light day skew) | Medium |
| SC-4 | Avoid scheduling more than one Lab for the same sub-batch on the same day | Medium |
| SC-5 | Respect stated faculty slot/day preferences | Low–Medium |
| SC-6 | Avoid placing a course's only weekly session in the first or last slot of the day | Low |
| SC-7 | Keep a course's Lecture and Tutorial on different days where possible | Low |

---

## 5. Genetic Algorithm Engine Requirements

- **GA-1 (Representation):** A chromosome is the full set of session assignments for the run; each gene = {course, session type, group/sub-batch(es), faculty, room, day, slot(s)}.
- **GA-2 (Initialization):** Generate an initial population of randomized-but-structurally-valid chromosomes (correct slot counts and lab-block sizes; hard-constraint clashes allowed here and resolved via evolution).
- **GA-3 (Fitness Function):** `Fitness = W_hard × (hard violations) + Σ (SC weight × SC violations)`, where hard-violation weight is large enough to always dominate soft scores, driving the search toward zero-hard-violation solutions first.
- **GA-4 (Selection):** Tournament or roulette-wheel selection (configurable) favoring lower-penalty chromosomes.
- **GA-5 (Crossover):** A crossover operator that exchanges session-block groups between two parent chromosomes while preserving structural validity (e.g., swap a full day or a full course's assignments).
- **GA-6 (Mutation):** A mutation operator that reassigns a randomly chosen session to a new valid slot/room/faculty combination, at a configurable mutation rate.
- **GA-7 (Elitism):** Carry the best N chromosomes unchanged into the next generation.
- **GA-8 (Termination):** Stop when hard violations reach zero and soft-score improvement stagnates for a configurable number of generations, or a maximum generation count is reached.
- **GA-9 (Configurability):** Population size, mutation rate, crossover rate, elitism count, and max generations shall be adjustable by an advanced user; sensible defaults shall be pre-set.
- **GA-10 (Reproducibility):** A run shall accept an optional random seed so a specific result can be reproduced.

---

## 6. Data Model (Entities)

| Entity | Key Attributes | Relationships |
|---|---|---|
| Program/Batch | id, name, year range, semester | has many Sub-batches |
| Sub-batch | id, name, size | belongs to Batch; member of many Batch Groups |
| Batch Group | id, name, course reference | composed of Sub-batches |
| Course | id, code, name, credits, session types, elective flag | linked to Faculty, Batch Groups |
| Faculty | id, name, department, max load, unavailability | teaches Courses |
| Room | id, code, type, capacity | hosts Sessions |
| Time Slot | id, day, start time, end time, mergeable flag | used by Sessions |
| Session (Gene) | course, type (L/T/P), group/sub-batch(es), faculty, room, slot(s) | central scheduling unit |
| Constraint | id, type (hard/soft), rule, weight | applied during fitness evaluation |
| Timetable (Chromosome) | id, generation run id, sessions[], fitness score | output of GA engine |

---

## 7. Non-Functional Requirements

| Category | Requirement |
|---|---|
| NFR-1 Platform | Cross-platform or Windows-first desktop application (framework decision — see Section 10) |
| NFR-2 Performance | A dataset of the reference scale (≈14 sub-batches, ≈16 course/session lines) should reach a valid timetable within a few minutes on a standard laptop |
| NFR-3 Usability | GUI-driven data entry; no manual file editing required for normal use |
| NFR-4 Data Storage | Local storage (e.g., SQLite or structured project file); no mandatory internet connection |
| NFR-5 Scalability | Must handle both a small dataset (6 courses/3 labs/4 batches/12–13 sub-batches) and a larger one (reference scale) without redesign |
| NFR-6 Reliability | Autosave of in-progress edits; no silent data loss on crash |
| NFR-7 Maintainability | GA engine decoupled from UI so the algorithm can be improved independently |
| NFR-8 Portability | Project files can be moved between installations of the app |

---

## 8. Export & Reporting Requirements

- Grid export matching the reference layout convention: `Group-Type-Course-Room` per cell, days as rows, slots as columns.
- PDF export suitable for printing/notice-board posting.
- Excel export suitable for further filtering/sorting by faculty or room.
- Faculty workload and room utilization summary reports (Section 3.6).

---

## 9. Assumptions

- One semester/program is generated per run; multiple runs can be saved and compared.
- Slot length is uniform (e.g., 55–60 minutes) across the week unless configured otherwise.
- A lab's 2-hour block is always two consecutive slots in the same room with no other session in between.
- Faculty who teach the same course to different groups are treated as independent teaching assignments for load and clash checking.
- The exact credit → weekly L/T hours formula will be confirmed with the institution (Section 12, OI-1); the system is designed so this rule is configurable rather than hardcoded.

---

## 10. Dependencies / Suggested Technology Stack

| Layer | Suggested option(s) |
|---|---|
| Desktop UI | Electron + React/TypeScript, or Java (JavaFX), or Python (PyQt/Tkinter) |
| GA Engine | Custom implementation, or existing libraries as reference (DEAP for Python, Jenetics for Java, GeneticSharp for .NET) |
| Local storage | SQLite, or JSON/XML project files |
| PDF export | e.g., a PDF-generation library appropriate to the chosen stack |
| Excel export | e.g., a spreadsheet-generation library appropriate to the chosen stack |

*(Final stack choice is a design decision to be made with the team; not fixed by this requirement document.)*

---

## 11. Acceptance Criteria

1. Master data (courses, faculty, rooms, sub-batches, batch groups) can be entered and edited entirely through the UI.
2. A generated timetable contains **zero hard-constraint violations** for a well-specified input dataset.
3. Lab sessions always occupy two contiguous slots in the same room.
4. Elective sessions appear only for their designated sub-batches.
5. The generated timetable can be viewed by sub-batch, by faculty, and by room.
6. A generated timetable can be manually edited, with any new hard-constraint violation flagged immediately.
7. The timetable can be exported to PDF and Excel in a grid layout equivalent to the reference format.
8. Re-running generation on the same input (same seed) reproduces the same result.
9. The system correctly handles at least two independently-scaled sample datasets (a small one, ~6 courses/3 labs/4 batches, and one at the reference's scale).

---

## 12. Open Items / Clarifications Needed

- **OI-1:** Confirm the exact formula used to convert course **credits** into weekly Lecture/Tutorial hours (e.g., a direct L-T-P specification per course vs. a credit-to-hours lookup table).
- **OI-2:** Confirm whether **multi-user/role-based access** (FR-9/FR-10) is required for v1, or whether a single-coordinator desktop tool is sufficient.
- **OI-3:** Confirm the target **desktop platform(s)** (Windows-only vs. cross-platform) to finalize the technology stack in Section 10.
- **OI-4:** Confirm whether **faculty preference weighting** (SC-5) needs to be collected from faculty directly or set centrally by the coordinator.
- **OI-5:** Confirm maximum expected dataset size (courses × sub-batches × faculty × rooms) to size GA performance targets (NFR-2) appropriately.
