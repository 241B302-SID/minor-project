/* ═══════════════════════════════════════════════════════════════════════
   TIMETABLE GENERATOR — Web UI Application Logic
   ═══════════════════════════════════════════════════════════════════════ */

// ── Global State ──
let timetableData = null;  // loaded output JSON
const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// P1–P4: 9:00–12:55, Lunch 1:00–2:00, P5–P7: 2:00–4:55
const DEFAULT_TIMES = ['9:00–9:55', '10:00–10:55', '11:00–11:55', '12:00–12:55', '2:00–2:55', '3:00–3:55', '4:00–4:55'];
// Lunch break is always shown between P4 (12:00–12:55) and P5 (2:00–2:55)
const LUNCH_AFTER_PERIOD = 3; // 0-indexed: show lunch after period index 3 (P4)
// Saturday max periods (half day — till 1 PM = 4 periods)
const SAT_MAX_PERIODS = 4;

// ═══════════════════════════════════════════════════════════════════
//  INITIALIZATION
// ═══════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initWizard();
    initDaysCheckboxes();
    initPeriodTimings();
    restoreFromLocalStorage();
    tryAutoLoadTimetable();
});


// ═══════════════════════════════════════════════════════════════════
//  TAB NAVIGATION
// ═══════════════════════════════════════════════════════════════════

function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('tab-' + tab).classList.add('active');
        });
    });
}


// ═══════════════════════════════════════════════════════════════════
//  WIZARD NAVIGATION
// ═══════════════════════════════════════════════════════════════════

function initWizard() {
    document.querySelectorAll('.wizard-step-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const step = btn.dataset.step;
            document.querySelectorAll('.wizard-step-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.wizard-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('step-' + step).classList.add('active');
        });
    });
}


// ═══════════════════════════════════════════════════════════════════
//  STEP 1: SCHEDULE CONFIG
// ═══════════════════════════════════════════════════════════════════

const DEFAULT_PERIODS_PER_DAY = [7, 7, 7, 7, 7, 4]; // Mon-Fri=7, Sat=4 (half day)

function initDaysCheckboxes(daysConfig) {
    const tbody = document.getElementById('daysConfigBody');
    tbody.innerHTML = '';
    ALL_DAYS.forEach((day, i) => {
        const config = daysConfig ? daysConfig[i] : null;
        const checked = config ? config.enabled : true;
        const periods = config ? config.periods : DEFAULT_PERIODS_PER_DAY[i];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="text-align:center; width:60px;">
                <input type="checkbox" ${checked ? 'checked' : ''} data-day-index="${i}" onchange="onDayConfigChange()">
            </td>
            <td style="font-weight:600; color: var(--text-primary);">${day}</td>
            <td style="width:80px;">
                <input type="number" min="1" max="12" value="${periods}" data-day-periods="${i}" 
                    style="width:60px;" onchange="onDayConfigChange()" ${checked ? '' : 'disabled'}>
            </td>`;
        tbody.appendChild(row);
    });
}

function onDayConfigChange() {
    // Enable/disable period inputs based on checkbox
    ALL_DAYS.forEach((_, i) => {
        const cb = document.querySelector(`[data-day-index="${i}"]`);
        const periodInput = document.querySelector(`[data-day-periods="${i}"]`);
        if (cb && periodInput) {
            periodInput.disabled = !cb.checked;
        }
    });
    // Re-render period timings based on new max
    renderPeriodTimings(getMaxPeriods());
    saveToLocalStorage();
}

function initPeriodTimings() {
    renderPeriodTimings(getMaxPeriods());
}

function renderPeriodTimings(count) {
    const container = document.getElementById('periodTimings');
    // Preserve existing values
    const existing = Array.from(document.querySelectorAll('.period-time-input')).map(inp => inp.value);
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const defaultTime = existing[i] || DEFAULT_TIMES[i] || `${9 + i}:00-${9 + i}:55`;
        container.innerHTML += `
            <div class="period-timing-row">
                <span class="period-label">P${i + 1}</span>
                <input type="text" class="period-time-input" value="${defaultTime}" placeholder="e.g. 9:00-9:55" onchange="saveToLocalStorage()">
            </div>`;
    }
}

function getSelectedDays() {
    const days = [];
    ALL_DAYS.forEach((day, i) => {
        const cb = document.querySelector(`[data-day-index="${i}"]`);
        if (cb && cb.checked) days.push(day);
    });
    return days;
}

function getPeriodsPerDayArray() {
    const arr = [];
    ALL_DAYS.forEach((day, i) => {
        const cb = document.querySelector(`[data-day-index="${i}"]`);
        const periodInput = document.querySelector(`[data-day-periods="${i}"]`);
        if (cb && cb.checked && periodInput) {
            arr.push(parseInt(periodInput.value) || 6);
        }
    });
    return arr;
}

function getMaxPeriods() {
    const arr = getPeriodsPerDayArray();
    return arr.length > 0 ? Math.max(...arr) : 6;
}

function getPeriodTimes() {
    return Array.from(document.querySelectorAll('.period-time-input')).map(inp => inp.value);
}


// ═══════════════════════════════════════════════════════════════════
//  STEP 2: COURSES
// ═══════════════════════════════════════════════════════════════════

function addCourseRow(data) {
    const tbody = document.getElementById('coursesBody');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="text" value="${data?.code || ''}" placeholder="CS101" onchange="saveToLocalStorage()"></td>
        <td><input type="text" value="${data?.name || ''}" placeholder="Course Name" onchange="saveToLocalStorage()"></td>
        <td><input type="number" value="${data?.credits ?? 3}" min="1" max="10" onchange="saveToLocalStorage()"></td>
        <td><input type="number" value="${data?.lectureHours ?? 3}" min="0" max="10" onchange="saveToLocalStorage()"></td>
        <td><input type="number" value="${data?.tutorialHours ?? 0}" min="0" max="10" onchange="saveToLocalStorage()"></td>
        <td><input type="number" value="${data?.labHours ?? 0}" min="0" max="10" onchange="saveToLocalStorage()"></td>
        <td style="text-align:center;"><input type="checkbox" ${data?.isElective ? 'checked' : ''} onchange="saveToLocalStorage()"></td>
        <td><button class="btn btn-danger btn-icon btn-sm" onclick="this.closest('tr').remove(); saveToLocalStorage();">✕</button></td>`;
    tbody.appendChild(row);
    saveToLocalStorage();
}

function getCourses() {
    const rows = document.querySelectorAll('#coursesBody tr');
    return Array.from(rows).map(row => {
        const inputs = row.querySelectorAll('input');
        return {
            code: inputs[0].value.trim(),
            name: inputs[1].value.trim(),
            credits: parseInt(inputs[2].value) || 0,
            lectureHours: parseInt(inputs[3].value) || 0,
            tutorialHours: parseInt(inputs[4].value) || 0,
            labHours: parseInt(inputs[5].value) || 0,
            isElective: inputs[6].checked
        };
    }).filter(c => c.code);
}


// ═══════════════════════════════════════════════════════════════════
//  STEP 3: FACULTY
// ═══════════════════════════════════════════════════════════════════

let facultyIdCounter = 1;

function addFacultyRow(data) {
    const tbody = document.getElementById('facultyBody');
    const row = document.createElement('tr');
    const id = data?.id || `FAC${String(facultyIdCounter++).padStart(2, '0')}`;
    row.innerHTML = `
        <td><input type="text" value="${id}" class="code-text" style="width:80px;" onchange="saveToLocalStorage()"></td>
        <td><input type="text" value="${data?.name || ''}" placeholder="Dr. Name" onchange="saveToLocalStorage()"></td>
        <td><input type="text" value="${data?.department || ''}" placeholder="CSE" onchange="saveToLocalStorage()"></td>
        <td><input type="number" value="${data?.maxWeeklyLoad ?? 14}" min="1" max="40" onchange="saveToLocalStorage()"></td>
        <td><button class="btn btn-danger btn-icon btn-sm" onclick="this.closest('tr').remove(); saveToLocalStorage();">✕</button></td>`;
    tbody.appendChild(row);
    saveToLocalStorage();
}

function getFaculty() {
    const rows = document.querySelectorAll('#facultyBody tr');
    return Array.from(rows).map(row => {
        const inputs = row.querySelectorAll('input');
        return {
            id: inputs[0].value.trim(),
            name: inputs[1].value.trim(),
            department: inputs[2].value.trim(),
            maxWeeklyLoad: parseInt(inputs[3].value) || 14
        };
    }).filter(f => f.id && f.name);
}


// ═══════════════════════════════════════════════════════════════════
//  STEP 4: ROOMS
// ═══════════════════════════════════════════════════════════════════

function addRoomRow(data) {
    const tbody = document.getElementById('roomsBody');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="text" value="${data?.code || ''}" placeholder="LT1" onchange="saveToLocalStorage()"></td>
        <td>
            <select onchange="saveToLocalStorage()">
                <option value="LECTURE_THEATRE" ${data?.type === 'LECTURE_THEATRE' ? 'selected' : ''}>Lecture Theatre</option>
                <option value="CLASSROOM" ${data?.type === 'CLASSROOM' ? 'selected' : ''}>Classroom</option>
                <option value="COMPUTER_LAB" ${data?.type === 'COMPUTER_LAB' ? 'selected' : ''}>Computer Lab</option>
                <option value="GENERAL_LAB" ${data?.type === 'GENERAL_LAB' ? 'selected' : ''}>General Lab</option>
            </select>
        </td>
        <td><input type="number" value="${data?.capacity ?? 80}" min="1" max="500" onchange="saveToLocalStorage()"></td>
        <td><button class="btn btn-danger btn-icon btn-sm" onclick="this.closest('tr').remove(); saveToLocalStorage();">✕</button></td>`;
    tbody.appendChild(row);
    saveToLocalStorage();
}

function getRooms() {
    const rows = document.querySelectorAll('#roomsBody tr');
    return Array.from(rows).map(row => {
        const inputs = row.querySelectorAll('input');
        const selects = row.querySelectorAll('select');
        return {
            code: inputs[0].value.trim(),
            type: selects[0].value,
            capacity: parseInt(inputs[1].value) || 0
        };
    }).filter(r => r.code);
}


// ═══════════════════════════════════════════════════════════════════
//  STEP 5: BATCHES & GROUPS
// ═══════════════════════════════════════════════════════════════════

function addSubBatchRow(data) {
    const tbody = document.getElementById('subBatchBody');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="text" value="${data?.id || ''}" placeholder="B1" onchange="saveToLocalStorage()"></td>
        <td><input type="number" value="${data?.size ?? 25}" min="1" max="500" onchange="saveToLocalStorage()"></td>
        <td><button class="btn btn-danger btn-icon btn-sm" onclick="this.closest('tr').remove(); saveToLocalStorage();">✕</button></td>`;
    tbody.appendChild(row);
    saveToLocalStorage();
}

function getSubBatches() {
    const rows = document.querySelectorAll('#subBatchBody tr');
    return Array.from(rows).map(row => {
        const inputs = row.querySelectorAll('input');
        const id = inputs[0].value.trim();
        return { id, name: id, size: parseInt(inputs[1].value) || 25 };
    }).filter(s => s.id);
}

function addBatchGroupRow(data) {
    const tbody = document.getElementById('batchGroupBody');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="text" value="${data?.id || ''}" placeholder="BX" onchange="saveToLocalStorage()"></td>
        <td><input type="text" value="${data?.subBatchIds?.join(', ') || ''}" placeholder="B1, B2, B3" onchange="saveToLocalStorage()"></td>
        <td><button class="btn btn-danger btn-icon btn-sm" onclick="this.closest('tr').remove(); saveToLocalStorage();">✕</button></td>`;
    tbody.appendChild(row);
    saveToLocalStorage();
}

function getBatchGroups() {
    const rows = document.querySelectorAll('#batchGroupBody tr');
    return Array.from(rows).map(row => {
        const inputs = row.querySelectorAll('input');
        const id = inputs[0].value.trim();
        const subs = inputs[1].value.split(',').map(s => s.trim()).filter(Boolean);
        return { id, name: id, subBatchIds: subs };
    }).filter(g => g.id && g.subBatchIds.length > 0);
}


// ═══════════════════════════════════════════════════════════════════
//  STEP 6: SESSION MAPPINGS
// ═══════════════════════════════════════════════════════════════════

function addSessionRow(data) {
    const courses = getCourses();
    const faculty = getFaculty();
    const batchGroups = getBatchGroups();

    const tbody = document.getElementById('sessionsBody');
    const row = document.createElement('tr');

    let courseOptions = courses.map(c =>
        `<option value="${c.code}" ${data?.courseCode === c.code ? 'selected' : ''}>${c.code} - ${c.name}</option>`
    ).join('');

    let typeOptions = ['LECTURE', 'TUTORIAL', 'PRACTICAL'].map(t =>
        `<option value="${t}" ${data?.type === t ? 'selected' : ''}>${t}</option>`
    ).join('');

    let bgOptions = batchGroups.map(bg =>
        `<option value="${bg.id}" ${data?.batchGroupId === bg.id ? 'selected' : ''}>${bg.name}</option>`
    ).join('');

    let facOptions = faculty.map(f =>
        `<option value="${f.id}" ${data?.facultyId === f.id ? 'selected' : ''}>${f.name} (${f.id})</option>`
    ).join('');

    row.innerHTML = `
        <td><select onchange="saveToLocalStorage()">${courseOptions}</select></td>
        <td><select onchange="saveToLocalStorage()">${typeOptions}</select></td>
        <td><select onchange="saveToLocalStorage()">${bgOptions}</select></td>
        <td><select onchange="saveToLocalStorage()">${facOptions}</select></td>
        <td><input type="number" value="${data?.count ?? 1}" min="1" max="10" style="width:60px;" onchange="saveToLocalStorage()"></td>
        <td><button class="btn btn-danger btn-icon btn-sm" onclick="this.closest('tr').remove(); saveToLocalStorage();">✕</button></td>`;
    tbody.appendChild(row);
    saveToLocalStorage();
}

function getSessionMappings() {
    const rows = document.querySelectorAll('#sessionsBody tr');
    return Array.from(rows).map(row => {
        const selects = row.querySelectorAll('select');
        const inputs = row.querySelectorAll('input');
        return {
            courseCode: selects[0].value,
            type: selects[1].value,
            batchGroupId: selects[2].value,
            facultyId: selects[3].value,
            count: parseInt(inputs[0].value) || 1
        };
    });
}


// ═══════════════════════════════════════════════════════════════════
//  EXPORT INPUT JSON
// ═══════════════════════════════════════════════════════════════════

function exportInputJson() {
    const perDayArr = getPeriodsPerDayArray();
    const data = {
        config: {
            daysCount: getSelectedDays().length,
            periodsPerDay: getMaxPeriods(),
            periodsPerDayArray: perDayArr,
            dayNames: getSelectedDays(),
            periodTimes: getPeriodTimes()
        },
        courses: getCourses(),
        faculty: getFaculty(),
        rooms: getRooms(),
        subBatches: getSubBatches(),
        batchGroups: getBatchGroups(),
        sessionMappings: getSessionMappings(),
        gaParams: {
            populationSize: 100,
            maxGenerations: 300,
            elitismCount: 6,
            mutationRate: 0.15,
            crossoverRate: 0.85
        }
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timetable_input.json';
    a.click();
    URL.revokeObjectURL(url);

    showNotification('✅ Input JSON exported! Now click "⚡ Generate Timetable" to schedule.');
}


// ═══════════════════════════════════════════════════════════════════
//  IN-BROWSER GENETIC ALGORITHM ENGINE
// ═══════════════════════════════════════════════════════════════════

function generateTimetable() {
    const courses = getCourses();
    const faculty = getFaculty();
    const rooms = getRooms();
    const subBatches = getSubBatches();
    const batchGroups = getBatchGroups();
    const sessionMappings = getSessionMappings();
    const dayNames = getSelectedDays();
    const periodsPerDayArr = getPeriodsPerDayArray();
    const maxPeriods = getMaxPeriods();
    const periodTimes = getPeriodTimes();

    if (!courses.length || !faculty.length || !rooms.length || !subBatches.length || !batchGroups.length || !sessionMappings.length) {
        showNotification('⚠️ Please fill in all sections (Courses, Faculty, Rooms, Batches, Sessions) first.');
        return;
    }

    const numDays = dayNames.length;

    // Build lookup maps
    const courseMap = {};
    courses.forEach(c => courseMap[c.code] = c);
    const facultyMap = {};
    faculty.forEach(f => facultyMap[f.id] = f);
    const roomMap = {};
    rooms.forEach(r => roomMap[r.code] = r);
    const bgMap = {};
    batchGroups.forEach(bg => bgMap[bg.id] = bg);

    // Expand session mappings into session objects
    const sessions = [];
    sessionMappings.forEach((sm, idx) => {
        const count = sm.count || 1;
        const bg = bgMap[sm.batchGroupId];
        const course = courseMap[sm.courseCode];
        if (!bg || !course) return;
        const subBatchIds = bg.subBatchIds || [];
        const totalSize = subBatchIds.reduce((sum, sbId) => {
            const sb = subBatches.find(s => s.id === sbId);
            return sum + (sb ? sb.size : 0);
        }, 0);
        const durationSlots = sm.type === 'PRACTICAL' ? 2 : 1;
        for (let i = 0; i < count; i++) {
            sessions.push({
                sessionId: `S${sessions.length + 1}`,
                courseCode: sm.courseCode,
                courseName: course.name,
                type: sm.type,
                batchGroupId: sm.batchGroupId,
                batchGroupName: bg.name || sm.batchGroupId,
                facultyId: sm.facultyId,
                facultyName: facultyMap[sm.facultyId] ? facultyMap[sm.facultyId].name : sm.facultyId,
                roomCode: null, // assigned by GA
                day: -1,
                startSlot: -1,
                durationSlots,
                subBatchIds,
                totalSize
            });
        }
    });

    if (!sessions.length) {
        showNotification('⚠️ No valid sessions to schedule. Check session mappings.');
        return;
    }

    // Show progress overlay
    showGeneratingOverlay();

    // Run GA asynchronously so UI can update
    setTimeout(() => {
        try {
            const result = runGA(sessions, rooms, numDays, maxPeriods, periodsPerDayArr, 120, 400);
            hideGeneratingOverlay();

            // Build output JSON
            const hardV = countHardViolations(result.schedule, numDays, maxPeriods, periodsPerDayArr);
            const softV = countSoftViolations(result.schedule, numDays, maxPeriods, periodsPerDayArr);

            timetableData = {
                metadata: {
                    hardViolations: hardV,
                    softViolations: softV,
                    fitness: -(hardV * 1000 + softV * 5),
                    generationCount: result.generations,
                    populationSize: 120,
                    elapsedMs: result.elapsedMs
                },
                config: {
                    daysCount: numDays,
                    periodsPerDay: maxPeriods,
                    periodsPerDayArray: periodsPerDayArr,
                    dayNames,
                    periodTimes
                },
                courses,
                faculty,
                rooms,
                subBatches,
                batchGroups,
                schedule: result.schedule
            };

            onTimetableLoaded();
            showNotification(`🎉 Timetable generated! Hard violations: ${hardV}, Soft penalty: ${softV}`);
        } catch(e) {
            hideGeneratingOverlay();
            showNotification('❌ Error generating timetable: ' + e.message);
            console.error(e);
        }
    }, 50);
}

function runGA(sessions, rooms, numDays, maxPeriods, periodsPerDayArr, popSize, maxGen) {
    const startTime = Date.now();

    // Build candidate room lists per session type
    function candidateRooms(session) {
        const needed = session.totalSize || 0;
        return rooms.filter(r => {
            if (session.type === 'PRACTICAL') return r.type === 'COMPUTER_LAB' || r.type === 'GENERAL_LAB';
            if (session.type === 'TUTORIAL') return r.capacity >= needed || true; // relaxed
            return true; // any room for lectures
        });
    }

    // Build a valid slot list for a session (day, slot) pairs where session fits
    function validSlots(session) {
        const slots = [];
        for (let d = 0; d < numDays; d++) {
            const dayPeriods = periodsPerDayArr[d] || maxPeriods;
            for (let p = 0; p <= dayPeriods - session.durationSlots; p++) {
                slots.push([d, p]);
            }
        }
        return slots;
    }

    // Create a random chromosome: array of {day, startSlot, roomCode} per session
    function randomChromosome() {
        return sessions.map(session => {
            const slots = validSlots(session);
            const slot = slots[Math.floor(Math.random() * slots.length)];
            const cRooms = candidateRooms(session);
            const room = cRooms.length > 0 ? cRooms[Math.floor(Math.random() * cRooms.length)] : rooms[0];
            return { day: slot[0], startSlot: slot[1], roomCode: room ? room.code : (rooms[0] ? rooms[0].code : '') };
        });
    }

    // Fitness: lower is better (0 = perfect)
    function fitness(chromo) {
        let hard = 0;
        let soft = 0;

        // Check each pair of sessions for hard conflicts
        for (let i = 0; i < sessions.length; i++) {
            for (let j = i + 1; j < sessions.length; j++) {
                const a = sessions[i], ga = chromo[i];
                const b = sessions[j], gb = chromo[j];
                if (ga.day !== gb.day) continue;

                // Time overlap
                const aEnd = ga.startSlot + a.durationSlots;
                const bEnd = gb.startSlot + b.durationSlots;
                const overlap = ga.startSlot < bEnd && gb.startSlot < aEnd;
                if (!overlap) continue;

                // HC-1: Faculty clash
                if (a.facultyId === b.facultyId) hard++;
                // HC-2: Room clash
                if (ga.roomCode === gb.roomCode) hard++;
                // HC-3: Sub-batch clash
                const aSet = new Set(a.subBatchIds);
                if (b.subBatchIds.some(sb => aSet.has(sb))) hard++;
            }
        }

        // HC-4: Practical must not cross day boundary (already ensured by validSlots)
        // HC-5: Room capacity
        sessions.forEach((s, i) => {
            const g = chromo[i];
            const room = rooms.find(r => r.code === g.roomCode);
            if (room && room.capacity < (s.totalSize || 0)) hard++;
        });

        // Soft: spread sessions across days
        const facultyDayLoad = {};
        sessions.forEach((s, i) => {
            const key = s.facultyId + '_' + chromo[i].day;
            facultyDayLoad[key] = (facultyDayLoad[key] || 0) + 1;
        });
        Object.values(facultyDayLoad).forEach(v => { if (v > 3) soft += (v - 3); });

        return hard * 1000 + soft * 5;
    }

    // Tournament selection
    function tournamentSelect(pop, fitArr, k = 4) {
        let best = -1, bestFit = Infinity;
        for (let i = 0; i < k; i++) {
            const idx = Math.floor(Math.random() * pop.length);
            if (fitArr[idx] < bestFit) { bestFit = fitArr[idx]; best = idx; }
        }
        return pop[best];
    }

    // Crossover: uniform per-session
    function crossover(p1, p2) {
        return p1.map((g, i) => Math.random() < 0.5 ? { ...g } : { ...p2[i] });
    }

    // Mutation: randomly reassign some sessions
    function mutate(chromo, rate = 0.15) {
        return chromo.map((g, i) => {
            if (Math.random() < rate) {
                const session = sessions[i];
                const slots = validSlots(session);
                const slot = slots[Math.floor(Math.random() * slots.length)];
                const cRooms = candidateRooms(session);
                const room = cRooms.length > 0 ? cRooms[Math.floor(Math.random() * cRooms.length)] : rooms[0];
                return { day: slot[0], startSlot: slot[1], roomCode: room ? room.code : g.roomCode };
            }
            return { ...g };
        });
    }

    // Initialize population
    let population = Array.from({ length: popSize }, () => randomChromosome());
    let fitArr = population.map(fitness);
    let bestIdx = fitArr.indexOf(Math.min(...fitArr));
    let bestChromo = population[bestIdx];
    let bestFit = fitArr[bestIdx];
    let genReached = 0;

    for (let gen = 0; gen < maxGen; gen++) {
        genReached = gen;
        if (bestFit === 0) break;

        // Sort by fitness
        const indexed = fitArr.map((f, i) => [f, i]).sort((a, b) => a[0] - b[0]);
        const elitism = 6;
        const nextPop = indexed.slice(0, elitism).map(([, i]) => population[i].map(g => ({ ...g })));

        while (nextPop.length < popSize) {
            const p1 = tournamentSelect(population, fitArr);
            const p2 = tournamentSelect(population, fitArr);
            let child = crossover(p1, p2);
            child = mutate(child, 0.15);
            nextPop.push(child);
        }

        population = nextPop;
        fitArr = population.map(fitness);
        const minFit = Math.min(...fitArr);
        if (minFit < bestFit) {
            bestFit = minFit;
            bestChromo = population[fitArr.indexOf(minFit)];
        }
    }

    // Build schedule from best chromosome
    const schedule = sessions.map((s, i) => ({
        ...s,
        day: bestChromo[i].day,
        startSlot: bestChromo[i].startSlot,
        roomCode: bestChromo[i].roomCode
    }));

    return { schedule, generations: genReached, elapsedMs: Date.now() - startTime };
}

function countHardViolations(schedule, numDays, maxPeriods, periodsPerDayArr) {
    let hard = 0;
    for (let i = 0; i < schedule.length; i++) {
        for (let j = i + 1; j < schedule.length; j++) {
            const a = schedule[i], b = schedule[j];
            if (a.day !== b.day) continue;
            const aEnd = a.startSlot + a.durationSlots;
            const bEnd = b.startSlot + b.durationSlots;
            if (!(a.startSlot < bEnd && b.startSlot < aEnd)) continue;
            if (a.facultyId === b.facultyId) hard++;
            if (a.roomCode === b.roomCode) hard++;
            const aSet = new Set(a.subBatchIds);
            if (b.subBatchIds.some(sb => aSet.has(sb))) hard++;
        }
    }
    return hard;
}

function countSoftViolations(schedule, numDays, maxPeriods, periodsPerDayArr) {
    let soft = 0;
    const facultyDayLoad = {};
    schedule.forEach(s => {
        const key = s.facultyId + '_' + s.day;
        facultyDayLoad[key] = (facultyDayLoad[key] || 0) + 1;
    });
    Object.values(facultyDayLoad).forEach(v => { if (v > 3) soft += (v - 3); });
    return soft;
}

function showGeneratingOverlay() {
    let overlay = document.getElementById('gaOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'gaOverlay';
        overlay.style.cssText = `
            position: fixed; inset: 0; background: hsla(222,50%,4%,0.85);
            backdrop-filter: blur(10px); display: flex; flex-direction: column;
            align-items: center; justify-content: center; z-index: 99999;
            font-family: 'Inter', sans-serif; color: white; gap: 20px;
        `;
        overlay.innerHTML = `
            <div style="font-size: 3rem;">⚙️</div>
            <div style="font-size: 1.4rem; font-weight: 700; letter-spacing: -0.02em;">Running Genetic Algorithm...</div>
            <div style="font-size: 0.9rem; opacity: 0.7;">Optimizing timetable — this may take a few seconds</div>
            <div style="width: 280px; height: 6px; background: hsla(222,30%,20%,0.8); border-radius: 99px; overflow: hidden; margin-top: 10px;">
                <div id="gaProgressBar" style="height:100%; background: linear-gradient(90deg, hsl(217,91%,60%), hsl(258,90%,66%));
                    border-radius: 99px; animation: gaProgressAnim 2.5s ease-in-out infinite;"></div>
            </div>
        `;
        const style = document.createElement('style');
        style.textContent = `@keyframes gaProgressAnim {
            0% { width: 5%; transform: translateX(0); }
            50% { width: 60%; }
            100% { width: 95%; }
        }`;
        document.head.appendChild(style);
        document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
}

function hideGeneratingOverlay() {
    const overlay = document.getElementById('gaOverlay');
    if (overlay) overlay.style.display = 'none';
}


// ═══════════════════════════════════════════════════════════════════
//  LOAD OUTPUT JSON & DISPLAY TIMETABLE
// ═══════════════════════════════════════════════════════════════════

async function tryAutoLoadTimetable() {
    try {
        const resp = await fetch('timetable_output.json?t=' + Date.now());
        if (resp.ok) {
            timetableData = await resp.json();
            onTimetableLoaded();
        }
    } catch (e) {
        // Silently skip if file not found or running on file://
    }
}

async function reloadServerOutput() {
    try {
        const resp = await fetch('timetable_output.json?t=' + Date.now());
        if (resp.ok) {
            timetableData = await resp.json();
            onTimetableLoaded();
            showNotification('✅ Successfully reloaded latest generated timetable!');
            // Switch to dashboard tab
            document.querySelector('[data-tab="dashboard"]').click();
        } else {
            showNotification('⚠️ Could not find timetable_output.json on server.');
        }
    } catch (e) {
        showNotification('⚠️ Error loading timetable: ' + e.message);
    }
}

function loadOutputJson() {
    // Try to load from file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                timetableData = JSON.parse(ev.target.result);
                onTimetableLoaded();
            } catch (err) {
                showNotification('❌ Invalid JSON file: ' + err.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function onTimetableLoaded() {
    // Show output tabs
    ['tabDashboard', 'tabCombined', 'tabSubBatch', 'tabFaculty', 'tabRoom', 'tabMaster'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = '';
    });

    // Update status badge
    const badge = document.getElementById('statusBadge');
    const statusText = document.getElementById('statusText');
    badge.style.display = '';
    if (timetableData.metadata.hardViolations === 0) {
        badge.className = 'status-badge success';
        statusText.textContent = '0 Conflicts — Perfect Schedule';
    } else {
        badge.className = 'status-badge warning';
        statusText.textContent = timetableData.metadata.hardViolations + ' Hard Violations';
    }

    // Render dashboard stats
    renderDashboard();

    // Populate dropdowns
    populateDropdowns();

    // Auto-select first sub-batch
    const sbSelect = document.getElementById('subBatchSelect');
    if (sbSelect && timetableData.subBatches.length > 0) {
        sbSelect.value = timetableData.subBatches[0].id;
        renderSubBatchGrid();
    }

    // Render combined grid and master table
    renderCombinedGrid();
    renderMasterTable();

    // Switch to Combined tab — most useful first view
    const combinedTab = document.querySelector('[data-tab="combined"]');
    if (combinedTab) combinedTab.click();
    else document.querySelector('[data-tab="master"]').click();

    showNotification('🎉 Timetable ready! Combined view shows all batches. Lunch 1–2 PM auto-blocked. 📄 Download PDF to save.');
}


// ═══════════════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════════════

function renderDashboard() {
    const d = timetableData;
    const grid = document.getElementById('statsGrid');
    const stats = [
        { label: 'Fitness Score', value: d.metadata.fitness.toFixed(1), sub: `Gen ${d.metadata.generationCount}`, color: 'blue' },
        { label: 'Hard Violations', value: d.metadata.hardViolations, sub: d.metadata.hardViolations === 0 ? 'All constraints satisfied' : 'Conflicts remain', color: d.metadata.hardViolations === 0 ? 'green' : 'red' },
        { label: 'Soft Penalty', value: d.metadata.softViolations, sub: 'Optimization score', color: 'amber' },
        { label: 'Courses', value: d.courses.length, sub: d.courses.map(c => c.code).join(', '), color: 'purple' },
        { label: 'Faculty', value: d.faculty.length, sub: d.faculty.map(f => f.name).join(', '), color: 'cyan' },
        { label: 'Sessions Scheduled', value: d.schedule.length, sub: `in ${d.metadata.elapsedMs}ms`, color: 'green' },
        { label: 'Rooms', value: d.rooms.length, sub: d.rooms.map(r => r.code).join(', '), color: 'amber' },
        { label: 'Sub-Batches', value: d.subBatches.length, sub: `Pop size: ${d.metadata.populationSize}`, color: 'blue' }
    ];
    grid.innerHTML = stats.map(s => `
        <div class="stat-card ${s.color}">
            <div class="stat-label">${s.label}</div>
            <div class="stat-value">${s.value}</div>
            <div class="stat-sub">${s.sub}</div>
        </div>`).join('');
}


// ═══════════════════════════════════════════════════════════════════
//  DROPDOWN POPULATION
// ═══════════════════════════════════════════════════════════════════

function populateDropdowns() {
    const d = timetableData;
    const sbSelect = document.getElementById('subBatchSelect');
    sbSelect.innerHTML = '<option value="">— Choose Sub-Batch —</option>';
    d.subBatches.forEach(sb => {
        sbSelect.innerHTML += `<option value="${sb.id}">${sb.name} (${sb.size} students)</option>`;
    });
    const facSelect = document.getElementById('facultySelect');
    facSelect.innerHTML = '<option value="">— Choose Faculty —</option>';
    d.faculty.forEach(f => {
        facSelect.innerHTML += `<option value="${f.id}">${f.name} (${f.department})</option>`;
    });
    const roomSelect = document.getElementById('roomSelect');
    roomSelect.innerHTML = '<option value="">— Choose Room —</option>';
    d.rooms.forEach(r => {
        const typeLabel = r.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
        roomSelect.innerHTML += `<option value="${r.code}">${r.code} — ${typeLabel} (cap: ${r.capacity})</option>`;
    });
}


// ═══════════════════════════════════════════════════════════════════
//  WEEKLY GRID RENDERER
// ═══════════════════════════════════════════════════════════════════

// Batch colour palette for combined view
const BATCH_COLORS = [
    { bg: 'hsla(217,90%,55%,0.18)', border: 'hsl(217,90%,60%)', text: 'hsl(217,100%,78%)' },
    { bg: 'hsla(280,85%,60%,0.18)', border: 'hsl(280,85%,68%)', text: 'hsl(280,100%,80%)' },
    { bg: 'hsla(152,70%,45%,0.18)', border: 'hsl(152,70%,52%)', text: 'hsl(152,80%,70%)' },
    { bg: 'hsla(38,95%,55%,0.18)',  border: 'hsl(38,95%,62%)',  text: 'hsl(38,100%,74%)' },
    { bg: 'hsla(187,85%,48%,0.18)', border: 'hsl(187,85%,55%)', text: 'hsl(187,90%,72%)' },
    { bg: 'hsla(340,85%,58%,0.18)', border: 'hsl(340,85%,65%)', text: 'hsl(340,100%,78%)' },
    { bg: 'hsla(25,90%,55%,0.18)',  border: 'hsl(25,90%,62%)',  text: 'hsl(25,100%,74%)' },
    { bg: 'hsla(195,80%,50%,0.18)', border: 'hsl(195,80%,57%)', text: 'hsl(195,90%,72%)' },
];

function buildWeeklyGrid(filterFn, container, title = '') {
    const d = timetableData;
    const days = d.config.dayNames;
    const maxPeriods = d.config.periodsPerDay;
    const perDayArr = d.config.periodsPerDayArray || new Array(days.length).fill(maxPeriods);
    const times = d.config.periodTimes;
    const lunchAfter = LUNCH_AFTER_PERIOD;

    // Build 2D grid
    const grid = [];
    for (let day = 0; day < days.length; day++) grid[day] = new Array(maxPeriods).fill(null);
    d.schedule.filter(filterFn).forEach(s => {
        for (let slot = 0; slot < s.durationSlots; slot++) {
            const period = s.startSlot + slot;
            if (period < maxPeriods) grid[s.day][period] = { ...s, isContSlot: slot > 0 };
        }
    });

    // Determine if we need the lunch column at all
    const showLunch = maxPeriods > lunchAfter + 1;

    // Build total columns for colgroup
    const totalCols = 1 + maxPeriods + (showLunch ? 1 : 0);

    // ── Header ──
    let html = `<div class="timetable-wrapper tt-vibrant">`;
    if (title) html += `<div class="tt-section-title">${title}</div>`;
    html += `<table class="timetable-grid tg-premium"><thead><tr>`;
    html += `<th class="day-header-v2"><span>Day</span></th>`;
    for (let p = 0; p < maxPeriods; p++) {
        const time = times[p] || `P${p + 1}`;
        // Determine period colour class (cycle)
        const pCol = ['th-p1','th-p2','th-p3','th-p4','th-p5','th-p6'][p % 6];
        html += `<th class="period-header-v2 ${pCol}">`;
        html += `<span class="period-pill">P${p + 1}</span>`;
        html += `<span class="period-time-v2">${time}</span>`;
        html += `</th>`;
        if (p === lunchAfter && showLunch) {
            html += `<th class="lunch-header-v2"><div class="lunch-th-inner">🍽️<span class="lunch-th-time">1:00 – 2:00</span><span class="lunch-th-label">Lunch Break</span></div></th>`;
        }
    }
    html += `</tr></thead><tbody>`;

    const DAY_GRADIENTS = [
        'linear-gradient(135deg,hsl(217,80%,55%),hsl(217,80%,45%))',   // Mon – blue
        'linear-gradient(135deg,hsl(265,75%,62%),hsl(265,75%,52%))',   // Tue – purple
        'linear-gradient(135deg,hsl(152,65%,48%),hsl(152,65%,38%))',   // Wed – green
        'linear-gradient(135deg,hsl(38,90%,55%),hsl(38,90%,45%))',     // Thu – amber
        'linear-gradient(135deg,hsl(187,80%,48%),hsl(187,80%,38%))',   // Fri – teal
        'linear-gradient(135deg,hsl(340,80%,55%),hsl(340,80%,45%))',   // Sat – pink
    ];

    for (let day = 0; day < days.length; day++) {
        const dayPeriods = perDayArr[day] || maxPeriods;
        const isSat = days[day] === 'Sat' || days[day] === 'Saturday';
        const dayGrad = DAY_GRADIENTS[day % DAY_GRADIENTS.length];
        html += `<tr class="tg-row">`;
        html += `<td class="day-cell-v2" style="background:${dayGrad};">`;
        html += `<span class="day-name-v2">${days[day]}</span>`;
        if (isSat) html += `<span class="half-day-badge-v2">Half Day</span>`;
        html += `</td>`;

        let p = 0;
        while (p < maxPeriods) {
            if (p >= dayPeriods) {
                const lunchRemaining = (showLunch && p <= lunchAfter + 1) ? 1 : 0;
                const rem = (maxPeriods - p) + lunchRemaining;
                html += `<td colspan="${rem}" class="blocked-cell-v2"><div class="blocked-inner-v2">${isSat ? '🌅 Half Day — Afternoon Off' : '🚫 No Class'}</div></td>`;
                break;
            }
            // Insert lunch column at the right place
            if (p === lunchAfter + 1 && showLunch) {
                html += `<td class="lunch-cell-v2"><div class="lunch-inner-v2"><span class="lunch-emoji">🍽️</span><span class="lunch-text">Lunch<br>Break</span><span class="lunch-time">1:00–2:00</span></div></td>`;
            }
            const entry = grid[day][p];
            if (entry && !entry.isContSlot) {
                const colspan = Math.min(entry.durationSlots, dayPeriods - p);
                const typeClass = entry.type.toLowerCase();
                const typeEmoji = entry.type === 'PRACTICAL' ? '🔬' : entry.type === 'TUTORIAL' ? '📝' : '📖';
                const typeLabel = entry.type === 'PRACTICAL' ? 'Lab' : entry.type === 'TUTORIAL' ? 'Tutorial' : 'Lecture';
                const slotTime = times[p] || `P${p + 1}`;
                html += `<td colspan="${colspan}" class="session-td-v2">`;
                html += `<div class="session-card ${typeClass}"
                    onmouseenter="showTooltip(event, ${JSON.stringify(entry).replace(/"/g, '&quot;')})"
                    onmouseleave="hideTooltip()" onmousemove="moveTooltip(event)">`;
                html += `<div class="sc-header"><span class="sc-time-chip">${slotTime}</span><span class="sc-type-chip ${typeClass}">${typeEmoji} ${typeLabel}</span></div>`;
                html += `<div class="sc-course-code">${entry.courseCode}</div>`;
                html += `<div class="sc-course-name">${entry.courseName}</div>`;
                html += `<div class="sc-details"><span class="sc-detail-item">👨‍🏫 ${entry.facultyName}</span><span class="sc-detail-item">🏫 ${entry.roomCode}</span></div>`;
                html += `<div class="sc-batch-tag">${entry.batchGroupName}</div>`;
                html += `</div></td>`;
                p += colspan;
            } else if (entry && entry.isContSlot) {
                p++;
            } else {
                html += `<td class="empty-td-v2"><div class="empty-cell-v2"><span>—</span></div></td>`;
                p++;
            }
        }
        html += `</tr>`;
    }
    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  COMBINED ALL-BATCHES TIMETABLE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function renderCombinedGrid() {
    if (!timetableData) return;
    const d         = timetableData;
    const container = document.getElementById('combinedGridContainer');
    if (!container) return;

    const days       = d.config.dayNames;
    const maxPeriods = d.config.periodsPerDay;
    const perDayArr  = d.config.periodsPerDayArray || new Array(days.length).fill(maxPeriods);
    const times      = d.config.periodTimes;
    const showLunch  = maxPeriods > LUNCH_AFTER_PERIOD + 1;

    const cellMap = {};
    d.schedule.forEach(s => {
        for (let slot = 0; slot < s.durationSlots; slot++) {
            const key = `${s.day}_${s.startSlot + slot}`;
            if (!cellMap[key]) cellMap[key] = [];
            cellMap[key].push({ ...s, isContSlot: slot > 0 });
        }
    });

    const bgColorMap = {};
    d.batchGroups.forEach((bg, i) => { bgColorMap[bg.id] = BATCH_COLORS[i % BATCH_COLORS.length]; });

    const legendEl = document.getElementById('combinedLegend');
    if (legendEl) {
        legendEl.innerHTML = d.batchGroups.map((bg, i) => {
            const col = BATCH_COLORS[i % BATCH_COLORS.length];
            return `<div class="legend-item">` +
                `<span class="legend-dot" style="background:${col.border};box-shadow:0 0 6px ${col.border};"></span>` +
                `<span class="legend-label" style="color:${col.text}">${bg.name || bg.id}</span>` +
                `</div>`;
        }).join('');
    }

    const DAY_GRADS = [
        'linear-gradient(180deg,hsl(217,80%,50%),hsl(217,80%,38%))',
        'linear-gradient(180deg,hsl(265,75%,57%),hsl(265,75%,45%))',
        'linear-gradient(180deg,hsl(152,65%,43%),hsl(152,65%,31%))',
        'linear-gradient(180deg,hsl(38,90%,50%),hsl(38,90%,38%))',
        'linear-gradient(180deg,hsl(187,80%,43%),hsl(187,80%,31%))',
        'linear-gradient(180deg,hsl(340,80%,50%),hsl(340,80%,38%))',
    ];
    const PCOLS = [
        {bg:'hsla(217,80%,50%,0.25)',text:'hsl(217,100%,78%)'},
        {bg:'hsla(265,75%,57%,0.25)',text:'hsl(265,100%,80%)'},
        {bg:'hsla(152,65%,43%,0.25)',text:'hsl(152,80%,70%)'},
        {bg:'hsla(38,90%,50%,0.25)', text:'hsl(38,100%,74%)'},
        {bg:'hsla(187,80%,43%,0.25)',text:'hsl(187,90%,72%)'},
        {bg:'hsla(340,80%,50%,0.25)',text:'hsl(340,100%,78%)'},
    ];

    let html = `<div class="tt-scroll-wrapper"><table class="tt-premium"><thead><tr>`;
    html += `<th class="tt-th-day">Day / Time</th>`;
    for (let p = 0; p < maxPeriods; p++) {
        const time = times[p] || `P${p + 1}`;
        const pc   = PCOLS[p % PCOLS.length];
        html += `<th class="tt-th-period" style="background:${pc.bg};">` +
            `<span class="tt-period-num" style="color:${pc.text};">P${p + 1}</span>` +
            `<span class="tt-period-time">${time}</span></th>`;
        if (p === LUNCH_AFTER_PERIOD && showLunch) {
            html += `<th class="tt-th-lunch">` +
                `<span class="tt-lunch-icon">&#127869;&#65039;</span>` +
                `<span class="tt-lunch-label">Lunch<br>Break</span>` +
                `<span class="tt-lunch-time">1:00&#8211;2:00</span></th>`;
        }
    }
    html += `</tr></thead><tbody>`;

    for (let day = 0; day < days.length; day++) {
        const dayPeriods = perDayArr[day] || maxPeriods;
        const isSat      = days[day] === 'Sat' || days[day] === 'Saturday';
        const grad       = DAY_GRADS[day % DAY_GRADS.length];
        html += `<tr class="tt-row"><td class="tt-td-day" style="background:${grad};">` +
            `<span class="tt-day-name">${days[day]}</span>` +
            (isSat ? `<span class="tt-half-badge">&#189; Day</span>` : ``) +
            `</td>`;

        let p = 0;
        while (p < maxPeriods) {
            if (p >= dayPeriods) {
                const lunchRemaining = (showLunch && p <= LUNCH_AFTER_PERIOD + 1) ? 1 : 0;
                const rem = (maxPeriods - p) + lunchRemaining;
                html += `<td colspan="${rem}" class="tt-td-blocked"><div class="tt-blocked-inner">` +
                    (isSat ? `&#127749;&#65039; Half Day &#8212; Afternoon Off` : `&#128683; No Class`) +
                    `</div></td>`;
                break;
            }
            if (p === LUNCH_AFTER_PERIOD + 1 && showLunch) {
                html += `<td class="tt-td-lunch"><div class="tt-lunch-cell">` +
                    `<span class="lunch-big-icon">&#127869;&#65039;</span>` +
                    `<span class="lunch-cell-label">Lunch Break</span>` +
                    `<span class="lunch-cell-time">1:00 &#8211; 2:00 PM</span></div></td>`;
            }
            const key      = `${day}_${p}`;
            const sessions = cellMap[key] || [];
            const slotTime = times[p] || `P${p + 1}`;
            if (sessions.length > 0) {
                html += `<td class="tt-td-session">`;
                sessions.forEach(s => {
                    const col       = bgColorMap[s.batchGroupId] || BATCH_COLORS[0];
                    const isCont    = s.isContSlot;
                    const typeLabel = isCont ? 'Lab (Cont.)' : (s.type === 'PRACTICAL' ? 'Lab' : s.type === 'TUTORIAL' ? 'Tutorial' : 'Lecture');
                    const typeEmoji = s.type === 'PRACTICAL' ? '&#128300;' : s.type === 'TUTORIAL' ? '&#128221;' : '&#128214;';
                    const tc        = s.type.toLowerCase();
                    html += `<div class="tt-session-card ${tc}" ` +
                        `style="border-left:4px solid ${col.border};background:${col.bg};" ` +
                        `onmouseenter="showTooltip(event,${JSON.stringify(s).replace(/"/g,'&quot;')})" ` +
                        `onmouseleave="hideTooltip()" onmousemove="moveTooltip(event)">` +
                        `<div class="ttsc-header"><span class="ttsc-time">${slotTime}</span>` +
                        `<span class="ttsc-type ${tc}">${typeEmoji} ${typeLabel}</span></div>` +
                        `<div class="ttsc-code" style="color:${col.text};">${s.courseCode}</div>` +
                        `<div class="ttsc-name">${s.courseName}</div>` +
                        `<div class="ttsc-batch" style="background:${col.border};">${s.batchGroupName}</div>` +
                        `<div class="ttsc-faculty">&#128104;&#8205;&#127979; ${s.facultyName}</div>` +
                        `<div class="ttsc-room">&#127979; ${s.roomCode}</div>` +
                        `</div>`;
                });
                html += `</td>`;
                p++;
            } else {
                html += `<td class="tt-td-empty"><div class="tt-empty-cell">&#8212;</div></td>`;
                p++;
            }
        }
        html += `</tr>`;
    }
    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════════
//  SUB-BATCH VIEW
// ═══════════════════════════════════════════════════════════════════

function renderSubBatchGrid() {
    const sbId = document.getElementById('subBatchSelect').value;
    const container = document.getElementById('subBatchGridContainer');
    if (!sbId) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">🧑‍🎓</div><h3>Select a sub-batch above</h3></div>';
        return;
    }

    buildWeeklyGrid(s => s.subBatchIds.includes(sbId), container);
}


// ═══════════════════════════════════════════════════════════════════
//  FACULTY VIEW
// ═══════════════════════════════════════════════════════════════════

function renderFacultyGrid() {
    const facId = document.getElementById('facultySelect').value;
    const container = document.getElementById('facultyGridContainer');
    if (!facId) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">👨‍🏫</div><h3>Select a faculty member above</h3></div>';
        return;
    }

    buildWeeklyGrid(s => s.facultyId === facId, container);
}


// ═══════════════════════════════════════════════════════════════════
//  ROOM VIEW
// ═══════════════════════════════════════════════════════════════════

function renderRoomGrid() {
    const roomCode = document.getElementById('roomSelect').value;
    const container = document.getElementById('roomGridContainer');
    if (!roomCode) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">🏫</div><h3>Select a room above</h3></div>';
        return;
    }

    buildWeeklyGrid(s => s.roomCode === roomCode, container);
}


// ═══════════════════════════════════════════════════════════════════
//  MASTER GRID
// ═══════════════════════════════════════════════════════════════════

function renderMasterTable() {
    if (!timetableData) return;
    const d = timetableData;
    const filter = (document.getElementById('masterFilter').value || '').toLowerCase();
    const container = document.getElementById('masterTableContainer');

    let schedule = d.schedule;
    if (filter) {
        schedule = schedule.filter(s =>
            s.courseCode.toLowerCase().includes(filter) ||
            s.courseName.toLowerCase().includes(filter) ||
            s.facultyName.toLowerCase().includes(filter) ||
            s.roomCode.toLowerCase().includes(filter) ||
            s.batchGroupName.toLowerCase().includes(filter) ||
            s.type.toLowerCase().includes(filter)
        );
    }

    // Sort by day, then start slot
    schedule.sort((a, b) => a.day !== b.day ? a.day - b.day : a.startSlot - b.startSlot);

    let html = '<div class="master-table-wrapper"><table class="master-table"><thead><tr>';
    html += '<th>Day</th><th>Period</th><th>Course</th><th>Type</th><th>Batch</th><th>Faculty</th><th>Room</th><th>Duration</th>';
    html += '</tr></thead><tbody>';

    schedule.forEach(s => {
        const dayName = d.config.dayNames[s.day] || `Day ${s.day}`;
        const typeClass = s.type.toLowerCase();
        const typeLabel = s.type === 'PRACTICAL' ? 'Lab' : s.type.charAt(0) + s.type.slice(1).toLowerCase();

        html += '<tr>';
        html += `<td style="font-weight:600;">${dayName}</td>`;
        html += `<td class="code-text">P${s.startSlot + 1}</td>`;
        html += `<td><span class="code-text">${s.courseCode}</span> <span style="color: var(--text-muted); font-size: 0.75rem;">${s.courseName}</span></td>`;
        html += `<td><span class="type-badge ${typeClass}">${typeLabel}</span></td>`;
        html += `<td>${s.batchGroupName}</td>`;
        html += `<td>${s.facultyName}</td>`;
        html += `<td class="code-text">${s.roomCode}</td>`;
        html += `<td class="code-text">${s.durationSlots} slot${s.durationSlots > 1 ? 's' : ''}</td>`;
        html += '</tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
}


// ═══════════════════════════════════════════════════════════════════
//  PDF DOWNLOAD
// ═══════════════════════════════════════════════════════════════════

function downloadPdf() {
    if (!timetableData) {
        showNotification('⚠️ Generate a timetable first before downloading PDF.');
        return;
    }

    const d = timetableData;
    const days = d.config.dayNames;
    const maxPeriods = d.config.periodsPerDay;
    const perDayArr = d.config.periodsPerDayArray || new Array(days.length).fill(maxPeriods);
    const times = d.config.periodTimes;

    // Build a grid for a given filterFn
    function buildGrid(filterFn) {
        const grid = [];
        for (let day = 0; day < days.length; day++) grid[day] = new Array(maxPeriods).fill(null);
        d.schedule.filter(filterFn).forEach(s => {
            for (let slot = 0; slot < s.durationSlots; slot++) {
                const period = s.startSlot + slot;
                if (period < maxPeriods) grid[s.day][period] = { ...s, isContSlot: slot > 0 };
            }
        });
        return grid;
    }

    function buildTableHtml(grid, title) {
        let html = `<div class="pdf-section">
            <h2 class="pdf-section-title">${title}</h2>
            <table class="pdf-table">
                <thead><tr><th>Day</th>`;
        for (let p = 0; p < maxPeriods; p++) {
            html += `<th>P${p + 1}<br><small>${times[p] || ''}</small></th>`;
        }
        html += `</tr></thead><tbody>`;

        for (let day = 0; day < days.length; day++) {
            const dayPeriods = perDayArr[day] || maxPeriods;
            html += `<tr><td class="day-cell">${days[day]}</td>`;
            let p = 0;
            while (p < maxPeriods) {
                if (p >= dayPeriods) {
                    html += `<td colspan="${maxPeriods - p}" class="blocked-cell">–</td>`;
                    break;
                }
                const entry = grid[day][p];
                if (entry && !entry.isContSlot) {
                    const colspan = Math.min(entry.durationSlots, dayPeriods - p);
                    const typeLabel = entry.type === 'PRACTICAL' ? 'Lab' : entry.type.charAt(0) + entry.type.slice(1).toLowerCase();
                    html += `<td colspan="${colspan}" class="session-cell-pdf ${entry.type.toLowerCase()}">
                        <strong>${entry.courseCode}</strong><br>
                        <span class="type-lbl">${typeLabel}</span><br>
                        <span>${entry.facultyName}</span><br>
                        <span>${entry.roomCode}</span>
                    </td>`;
                    p += colspan;
                } else if (entry && entry.isContSlot) {
                    p++;
                } else {
                    html += `<td class="empty-cell-pdf">—</td>`;
                    p++;
                }
            }
            html += `</tr>`;
        }
        html += `</tbody></table></div>`;
        return html;
    }

    // Build full HTML for printing
    let sectionsHtml = '';

    // Section: All Sub-Batches
    d.subBatches.forEach(sb => {
        const grid = buildGrid(s => s.subBatchIds.includes(sb.id));
        const hasAny = d.schedule.some(s => s.subBatchIds.includes(sb.id));
        if (hasAny) sectionsHtml += buildTableHtml(grid, `Sub-Batch: ${sb.name}`);
    });

    // Section: All Faculty
    d.faculty.forEach(f => {
        const grid = buildGrid(s => s.facultyId === f.id);
        const hasAny = d.schedule.some(s => s.facultyId === f.id);
        if (hasAny) sectionsHtml += buildTableHtml(grid, `Faculty: ${f.name} (${f.department})`);
    });

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Timetable — Academic Scheduler</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #111; background: #fff; padding: 20px; }
  h1.main-title { font-size: 20px; font-weight: 800; color: #1a1a2e; text-align: center; margin-bottom: 4px; }
  p.meta { text-align: center; font-size: 10px; color: #555; margin-bottom: 24px; }
  .pdf-section { page-break-inside: avoid; margin-bottom: 32px; }
  .pdf-section-title { font-size: 13px; font-weight: 700; color: #1a237e; border-left: 4px solid #3949ab; padding-left: 10px; margin-bottom: 10px; }
  .pdf-table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
  .pdf-table th { background: #1a237e; color: #fff; padding: 5px 4px; text-align: center; font-weight: 600; border: 1px solid #3949ab; }
  .pdf-table th small { font-weight: 400; opacity: 0.85; font-size: 8px; }
  .pdf-table td { border: 1px solid #c5cae9; padding: 4px; vertical-align: middle; text-align: center; }
  .day-cell { font-weight: 700; background: #e8eaf6; color: #1a237e; white-space: nowrap; min-width: 36px; }
  .blocked-cell { background: #f5f5f5; color: #aaa; font-style: italic; }
  .empty-cell-pdf { color: #bbb; }
  .session-cell-pdf { vertical-align: middle; text-align: center; padding: 5px 4px; }
  .session-cell-pdf strong { display: block; font-size: 10px; margin-bottom: 2px; }
  .session-cell-pdf span { display: block; font-size: 8.5px; color: #444; line-height: 1.3; }
  .type-lbl { font-weight: 600; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
  .lecture { background: #e3f2fd; border-left: 3px solid #1976d2; }
  .lecture strong { color: #1565c0; }
  .lecture .type-lbl { color: #1976d2; }
  .tutorial { background: #fff8e1; border-left: 3px solid #f57c00; }
  .tutorial strong { color: #e65100; }
  .tutorial .type-lbl { color: #f57c00; }
  .practical { background: #e8f5e9; border-left: 3px solid #388e3c; }
  .practical strong { color: #2e7d32; }
  .practical .type-lbl { color: #388e3c; }
  .stats-box { display: flex; gap: 16px; justify-content: center; margin-bottom: 24px; flex-wrap: wrap; }
  .stat { text-align: center; padding: 10px 18px; border: 1px solid #c5cae9; border-radius: 8px; }
  .stat-val { font-size: 22px; font-weight: 800; color: #1a237e; }
  .stat-lbl { font-size: 9px; color: #555; margin-top: 2px; }
  @media print {
    body { padding: 10px; }
    .pdf-section { page-break-inside: avoid; margin-bottom: 20px; }
    @page { size: A4 landscape; margin: 1.2cm; }
  }
</style>
</head>
<body>
<h1 class="main-title">📅 Academic Timetable</h1>
<p class="meta">Generated by Timetable Generator GA Engine &nbsp;|&nbsp; Hard Violations: ${d.metadata.hardViolations} &nbsp;|&nbsp; Soft Penalty: ${d.metadata.softViolations} &nbsp;|&nbsp; Generated in ${d.metadata.elapsedMs}ms &nbsp;|&nbsp; ${new Date().toLocaleDateString('en-IN', {day:'numeric',month:'long',year:'numeric'})}</p>
<div class="stats-box">
  <div class="stat"><div class="stat-val">${d.schedule.length}</div><div class="stat-lbl">Sessions Scheduled</div></div>
  <div class="stat"><div class="stat-val">${d.courses.length}</div><div class="stat-lbl">Courses</div></div>
  <div class="stat"><div class="stat-val">${d.faculty.length}</div><div class="stat-lbl">Faculty</div></div>
  <div class="stat"><div class="stat-val">${d.subBatches.length}</div><div class="stat-lbl">Sub-Batches</div></div>
  <div class="stat"><div class="stat-val" style="color:${d.metadata.hardViolations===0?'#2e7d32':'#c62828'}">${d.metadata.hardViolations}</div><div class="stat-lbl">Hard Violations</div></div>
</div>
${sectionsHtml}
<script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`);
    printWindow.document.close();
}


// ═══════════════════════════════════════════════════════════════════
//  DOWNLOAD OUTPUT JSON
// ═══════════════════════════════════════════════════════════════════

function downloadOutputJson() {
    if (!timetableData) {
        showNotification('⚠️ Generate a timetable first before downloading.');
        return;
    }
    const json = JSON.stringify(timetableData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timetable_output.json';
    a.click();
    URL.revokeObjectURL(url);
    showNotification('✅ Timetable JSON downloaded as timetable_output.json');
}


// ═══════════════════════════════════════════════════════════════════
//  TOOLTIP
// ═══════════════════════════════════════════════════════════════════

function showTooltip(event, session) {
    const tooltip = document.getElementById('tooltip');
    const typeLabel = session.type === 'PRACTICAL' ? 'Lab' : session.type.charAt(0) + session.type.slice(1).toLowerCase();
    const dayName = timetableData.config.dayNames[session.day] || `Day ${session.day}`;
    const time = timetableData.config.periodTimes[session.startSlot] || `P${session.startSlot + 1}`;

    tooltip.innerHTML = `
        <div class="tt-title">${session.courseName}</div>
        <div class="tt-row"><span class="tt-label">Code</span><span class="tt-value">${session.courseCode}</span></div>
        <div class="tt-row"><span class="tt-label">Type</span><span class="tt-value">${typeLabel}</span></div>
        <div class="tt-row"><span class="tt-label">Faculty</span><span class="tt-value">${session.facultyName}</span></div>
        <div class="tt-row"><span class="tt-label">Room</span><span class="tt-value">${session.roomCode}</span></div>
        <div class="tt-row"><span class="tt-label">Batch</span><span class="tt-value">${session.batchGroupName}</span></div>
        <div class="tt-row"><span class="tt-label">Day/Time</span><span class="tt-value">${dayName} ${time}</span></div>
        <div class="tt-row"><span class="tt-label">Duration</span><span class="tt-value">${session.durationSlots} slot(s)</span></div>
        <div class="tt-row"><span class="tt-label">Sub-batches</span><span class="tt-value">${session.subBatchIds.join(', ')}</span></div>`;

    tooltip.classList.add('visible');
    moveTooltip(event);
}

function moveTooltip(event) {
    const tooltip = document.getElementById('tooltip');
    const x = event.clientX + 16;
    const y = event.clientY + 16;
    // Keep tooltip in viewport
    const maxX = window.innerWidth - tooltip.offsetWidth - 20;
    const maxY = window.innerHeight - tooltip.offsetHeight - 20;
    tooltip.style.left = Math.min(x, maxX) + 'px';
    tooltip.style.top = Math.min(y, maxY) + 'px';
}

function hideTooltip() {
    document.getElementById('tooltip').classList.remove('visible');
}


// ═══════════════════════════════════════════════════════════════════
//  SAMPLE DATA LOADER
// ═══════════════════════════════════════════════════════════════════

function loadSampleData() {
    clearAllData(true); // silent clear

    // Config — Mon-Fri=7, Sat=4 (half day)
    initDaysCheckboxes([
        { enabled: true, periods: 7 },  // Mon
        { enabled: true, periods: 7 },  // Tue
        { enabled: true, periods: 7 },  // Wed
        { enabled: true, periods: 7 },  // Thu
        { enabled: true, periods: 7 },  // Fri
        { enabled: true, periods: 4 },  // Sat (half day: 4 periods)
    ]);
    renderPeriodTimings(getMaxPeriods());

    // Courses (16 courses — BTech Sem V July-Dec 2026)
    [
        { code: 'MA106', name: 'Probability Theory and Random Processes (PTRP)', credits: 4, lectureHours: 3, tutorialHours: 1, labHours: 0, isElective: false },
        { code: 'CS109', name: 'Computer Networks (CN)',                          credits: 3, lectureHours: 3, tutorialHours: 1, labHours: 0, isElective: false },
        { code: 'CS110', name: 'Theory of Computation (ToC)',                     credits: 4, lectureHours: 3, tutorialHours: 1, labHours: 0, isElective: false },
        { code: 'HS301', name: 'Concepts of Economics (CoE)',                     credits: 3, lectureHours: 2, tutorialHours: 1, labHours: 0, isElective: false },
        { code: 'CS212', name: 'Computer Networks Lab',                           credits: 2, lectureHours: 0, tutorialHours: 0, labHours: 2, isElective: false },
        { code: 'CS214', name: 'Open Source Software Lab (OSS Lab)',              credits: 2, lectureHours: 0, tutorialHours: 0, labHours: 2, isElective: false },
        { code: 'CS215', name: 'Advanced Programming Lab-2 (AP Lab-2)',           credits: 2, lectureHours: 0, tutorialHours: 0, labHours: 2, isElective: false },
        { code: 'CS301', name: 'Prompt Engg & Generative AI Systems (PEGAI)',     credits: 2, lectureHours: 2, tutorialHours: 0, labHours: 0, isElective: true  },
        { code: 'PH302', name: 'Intro to Quantum Computing (IQC)',                credits: 2, lectureHours: 2, tutorialHours: 0, labHours: 0, isElective: true  },
        { code: 'PH303', name: 'Nano Science (NANO)',                             credits: 3, lectureHours: 3, tutorialHours: 0, labHours: 0, isElective: false },
        { code: 'PH304', name: 'Materials Science & Applications (MSA)',          credits: 2, lectureHours: 2, tutorialHours: 0, labHours: 0, isElective: true  },
        { code: 'CS303', name: 'Artificial Intelligence (AI)',                    credits: 3, lectureHours: 3, tutorialHours: 0, labHours: 0, isElective: false },
        { code: 'CS118', name: 'Data Analysis and Visualization (DAV)',           credits: 3, lectureHours: 3, tutorialHours: 0, labHours: 0, isElective: true  },
        { code: 'CS223', name: 'Data Analysis and Visualization Lab',             credits: 2, lectureHours: 0, tutorialHours: 0, labHours: 2, isElective: true  },
        { code: 'CS120', name: 'Deep Learning (DL)',                              credits: 3, lectureHours: 3, tutorialHours: 0, labHours: 0, isElective: true  },
        { code: 'CS224', name: 'Deep Learning Lab',                               credits: 2, lectureHours: 0, tutorialHours: 0, labHours: 2, isElective: true  }
    ].forEach(c => addCourseRow(c));

    // Faculty (18 faculty — maxWeeklyLoad updated for extra sessions)
    facultyIdCounter = 19;
    [
        { id: 'FAC01', name: 'Dr. Dilip Kumar Sharma',    department: 'Math',    maxWeeklyLoad: 16 },
        { id: 'FAC02', name: 'Dr. Vaibhav Bisht',         department: 'Math',    maxWeeklyLoad: 14 },
        { id: 'FAC03', name: 'Mr. Mahakant Sharma',       department: 'CSE',     maxWeeklyLoad: 20 },
        { id: 'FAC04', name: 'Dr. Gaurav Saxena',         department: 'CSE',     maxWeeklyLoad: 20 },
        { id: 'FAC05', name: 'Dr. Ajay Kumar',            department: 'CSE',     maxWeeklyLoad: 16 },
        { id: 'FAC06', name: 'Prof. Sanjay Garg',         department: 'CSE',     maxWeeklyLoad: 14 },
        { id: 'FAC07', name: 'Mr. Sourabh Bhaskar',       department: 'CSE',     maxWeeklyLoad: 14 },
        { id: 'FAC08', name: 'Ms. Sarita Sahni',          department: 'CSE',     maxWeeklyLoad: 14 },
        { id: 'FAC09', name: 'Dr. Sandeep Arya',          department: 'HSS',     maxWeeklyLoad: 14 },
        { id: 'FAC10', name: 'Dr. Shekhar Singh',         department: 'HSS',     maxWeeklyLoad: 16 },
        { id: 'FAC11', name: 'Dr. Animesh Kumar Dubey',   department: 'CSE',     maxWeeklyLoad: 14 },
        { id: 'FAC12', name: 'Dr. Prateek Pandey',        department: 'CSE',     maxWeeklyLoad: 16 },
        { id: 'FAC13', name: 'Dr. Rajnees Atre',          department: 'Physics', maxWeeklyLoad: 12 },
        { id: 'FAC14', name: 'Dr. Mukesh Chandra',        department: 'Physics', maxWeeklyLoad: 14 },
        { id: 'FAC15', name: 'Dr. Santosh Bobade',        department: 'Physics', maxWeeklyLoad: 12 },
        { id: 'FAC16', name: 'Dr. Amit Sharma',           department: 'Physics', maxWeeklyLoad: 16 },
        { id: 'FAC17', name: 'Dr. Amit Rathi',            department: 'CSE',     maxWeeklyLoad: 20 },
        { id: 'FAC18', name: 'Dr. Rahul Pachauri',        department: 'CSE',     maxWeeklyLoad: 14 }
    ].forEach(f => addFacultyRow(f));

    // Rooms (16 rooms)
    [
        { code: 'LT1', type: 'LECTURE_THEATRE', capacity: 180 },
        { code: 'LT2', type: 'LECTURE_THEATRE', capacity: 180 },
        { code: 'LT3', type: 'LECTURE_THEATRE', capacity: 180 },
        { code: 'LT4', type: 'LECTURE_THEATRE', capacity: 180 },
        { code: 'DLC', type: 'LECTURE_THEATRE', capacity: 180 },
        { code: 'CR1', type: 'CLASSROOM', capacity: 90 },
        { code: 'CR5', type: 'CLASSROOM', capacity: 90 },
        { code: 'CR11', type: 'CLASSROOM', capacity: 90 },
        { code: 'CR12', type: 'CLASSROOM', capacity: 90 },
        { code: 'CR13', type: 'CLASSROOM', capacity: 90 },
        { code: 'CR16', type: 'CLASSROOM', capacity: 90 },
        { code: 'CL1', type: 'COMPUTER_LAB', capacity: 120 },
        { code: 'CL2', type: 'COMPUTER_LAB', capacity: 70 },
        { code: 'CL3', type: 'COMPUTER_LAB', capacity: 70 },
        { code: 'CL5', type: 'COMPUTER_LAB', capacity: 70 },
        { code: 'CL7', type: 'COMPUTER_LAB', capacity: 70 }
    ].forEach(r => addRoomRow(r));

    // Sub-batches (14 sub-batches)
    ['B1','B2','B3','B4','B5','B6','B7','B8','B9','B10','B11','B21','B22','B31'].forEach(id => {
        addSubBatchRow({ id, size: 25 });
    });

    // Batch Groups
    [
        { id: 'BX', subBatchIds: ['B1','B2','B3'] },
        { id: 'BY', subBatchIds: ['B4','B5','B6'] },
        { id: 'BZ', subBatchIds: ['B7','B8','B9'] },
        { id: 'BX1', subBatchIds: ['B10','B11','B21','B22','B31'] },
        { id: 'BATCH1', subBatchIds: ['B1','B2','B3','B4','B5'] },
        { id: 'BATCH2', subBatchIds: ['B6','B7','B8','B9'] },
        { id: 'B1B2', subBatchIds: ['B1','B2'] },
        { id: 'B3B4', subBatchIds: ['B3','B4'] },
        { id: 'B5B6', subBatchIds: ['B5','B6'] },
        { id: 'B7B8', subBatchIds: ['B7','B8'] },
        { id: 'B9B10', subBatchIds: ['B9','B10'] },
        { id: 'B10B11', subBatchIds: ['B10','B11'] },
        { id: 'B11B21B22B31', subBatchIds: ['B11','B21','B22','B31'] },
        { id: 'B21B22', subBatchIds: ['B21','B22'] },
        { id: 'B31', subBatchIds: ['B31'] },
        { id: 'B1', subBatchIds: ['B1'] },
        { id: 'B2', subBatchIds: ['B2'] },
        { id: 'B3', subBatchIds: ['B3'] },
        { id: 'B4', subBatchIds: ['B4'] },
        { id: 'B5', subBatchIds: ['B5'] },
        { id: 'B6', subBatchIds: ['B6'] },
        { id: 'B7', subBatchIds: ['B7'] },
        { id: 'B8', subBatchIds: ['B8'] },
        { id: 'B9', subBatchIds: ['B9'] },
        { id: 'B10', subBatchIds: ['B10'] },
        { id: 'B11', subBatchIds: ['B11'] }
    ].forEach(bg => addBatchGroupRow(bg));

    // Session Mappings — full 88 mappings (all 14 sub-batches × 31 slots = 8 free periods each)
    setTimeout(() => {
        [
            // ── MA106 Probability Theory & Random Processes ──────────────────────
            { courseCode: 'MA106', type: 'LECTURE',  batchGroupId: 'BX',           facultyId: 'FAC01', count: 3 },
            { courseCode: 'MA106', type: 'LECTURE',  batchGroupId: 'BY',           facultyId: 'FAC01', count: 3 },
            { courseCode: 'MA106', type: 'LECTURE',  batchGroupId: 'BZ',           facultyId: 'FAC01', count: 3 },
            { courseCode: 'MA106', type: 'LECTURE',  batchGroupId: 'BX1',          facultyId: 'FAC02', count: 3 },
            { courseCode: 'MA106', type: 'TUTORIAL', batchGroupId: 'B1',           facultyId: 'FAC01', count: 1 },
            { courseCode: 'MA106', type: 'TUTORIAL', batchGroupId: 'B2',           facultyId: 'FAC01', count: 1 },
            { courseCode: 'MA106', type: 'TUTORIAL', batchGroupId: 'B3',           facultyId: 'FAC01', count: 1 },
            { courseCode: 'MA106', type: 'TUTORIAL', batchGroupId: 'B4',           facultyId: 'FAC01', count: 1 },
            { courseCode: 'MA106', type: 'TUTORIAL', batchGroupId: 'B5',           facultyId: 'FAC01', count: 1 },
            { courseCode: 'MA106', type: 'TUTORIAL', batchGroupId: 'B6',           facultyId: 'FAC01', count: 1 },
            { courseCode: 'MA106', type: 'TUTORIAL', batchGroupId: 'B7',           facultyId: 'FAC01', count: 1 },
            { courseCode: 'MA106', type: 'TUTORIAL', batchGroupId: 'B8',           facultyId: 'FAC01', count: 1 },
            { courseCode: 'MA106', type: 'TUTORIAL', batchGroupId: 'B9',           facultyId: 'FAC01', count: 1 },
            { courseCode: 'MA106', type: 'TUTORIAL', batchGroupId: 'B10B11',       facultyId: 'FAC02', count: 1 },
            { courseCode: 'MA106', type: 'TUTORIAL', batchGroupId: 'B21B22',       facultyId: 'FAC02', count: 1 },
            { courseCode: 'MA106', type: 'TUTORIAL', batchGroupId: 'B31',          facultyId: 'FAC02', count: 1 },
            // ── CS109 Computer Networks ──────────────────────────────────────────
            { courseCode: 'CS109', type: 'LECTURE',  batchGroupId: 'B1B2',         facultyId: 'FAC03', count: 3 },
            { courseCode: 'CS109', type: 'LECTURE',  batchGroupId: 'B3B4',         facultyId: 'FAC03', count: 3 },
            { courseCode: 'CS109', type: 'LECTURE',  batchGroupId: 'B5B6',         facultyId: 'FAC03', count: 3 },
            { courseCode: 'CS109', type: 'LECTURE',  batchGroupId: 'B7B8',         facultyId: 'FAC04', count: 3 },
            { courseCode: 'CS109', type: 'LECTURE',  batchGroupId: 'B9B10',        facultyId: 'FAC04', count: 3 },
            { courseCode: 'CS109', type: 'LECTURE',  batchGroupId: 'B11B21B22B31', facultyId: 'FAC04', count: 3 },
            { courseCode: 'CS109', type: 'TUTORIAL', batchGroupId: 'B1B2',         facultyId: 'FAC03', count: 1 },
            { courseCode: 'CS109', type: 'TUTORIAL', batchGroupId: 'B3B4',         facultyId: 'FAC03', count: 1 },
            { courseCode: 'CS109', type: 'TUTORIAL', batchGroupId: 'B5B6',         facultyId: 'FAC03', count: 1 },
            { courseCode: 'CS109', type: 'TUTORIAL', batchGroupId: 'B7B8',         facultyId: 'FAC04', count: 1 },
            { courseCode: 'CS109', type: 'TUTORIAL', batchGroupId: 'B9B10',        facultyId: 'FAC04', count: 1 },
            { courseCode: 'CS109', type: 'TUTORIAL', batchGroupId: 'B11B21B22B31', facultyId: 'FAC04', count: 1 },
            // ── CS110 Theory of Computation ──────────────────────────────────────
            { courseCode: 'CS110', type: 'LECTURE',  batchGroupId: 'BX',           facultyId: 'FAC05', count: 3 },
            { courseCode: 'CS110', type: 'LECTURE',  batchGroupId: 'BY',           facultyId: 'FAC05', count: 3 },
            { courseCode: 'CS110', type: 'LECTURE',  batchGroupId: 'BZ',           facultyId: 'FAC08', count: 3 },
            { courseCode: 'CS110', type: 'LECTURE',  batchGroupId: 'BX1',          facultyId: 'FAC07', count: 3 },
            { courseCode: 'CS110', type: 'TUTORIAL', batchGroupId: 'B1B2',         facultyId: 'FAC05', count: 1 },
            { courseCode: 'CS110', type: 'TUTORIAL', batchGroupId: 'B3B4',         facultyId: 'FAC05', count: 1 },
            { courseCode: 'CS110', type: 'TUTORIAL', batchGroupId: 'B5B6',         facultyId: 'FAC05', count: 1 },
            { courseCode: 'CS110', type: 'TUTORIAL', batchGroupId: 'B7B8',         facultyId: 'FAC08', count: 1 },
            { courseCode: 'CS110', type: 'TUTORIAL', batchGroupId: 'B9B10',        facultyId: 'FAC07', count: 1 },
            { courseCode: 'CS110', type: 'TUTORIAL', batchGroupId: 'B11B21B22B31', facultyId: 'FAC06', count: 1 },
            // ── HS301 Concepts of Economics ──────────────────────────────────────
            { courseCode: 'HS301', type: 'LECTURE',  batchGroupId: 'BX',           facultyId: 'FAC09', count: 2 },
            { courseCode: 'HS301', type: 'LECTURE',  batchGroupId: 'BY',           facultyId: 'FAC09', count: 2 },
            { courseCode: 'HS301', type: 'LECTURE',  batchGroupId: 'BZ',           facultyId: 'FAC10', count: 2 },
            { courseCode: 'HS301', type: 'LECTURE',  batchGroupId: 'BX1',          facultyId: 'FAC10', count: 2 },
            { courseCode: 'HS301', type: 'TUTORIAL', batchGroupId: 'B1B2',         facultyId: 'FAC09', count: 1 },
            { courseCode: 'HS301', type: 'TUTORIAL', batchGroupId: 'B3B4',         facultyId: 'FAC09', count: 1 },
            { courseCode: 'HS301', type: 'TUTORIAL', batchGroupId: 'B5B6',         facultyId: 'FAC09', count: 1 },
            { courseCode: 'HS301', type: 'TUTORIAL', batchGroupId: 'B7B8',         facultyId: 'FAC10', count: 1 },
            { courseCode: 'HS301', type: 'TUTORIAL', batchGroupId: 'B9',           facultyId: 'FAC10', count: 1 },
            { courseCode: 'HS301', type: 'TUTORIAL', batchGroupId: 'B10B11',       facultyId: 'FAC10', count: 1 },
            { courseCode: 'HS301', type: 'TUTORIAL', batchGroupId: 'B21B22',       facultyId: 'FAC10', count: 1 },
            { courseCode: 'HS301', type: 'TUTORIAL', batchGroupId: 'B31',          facultyId: 'FAC10', count: 1 },
            // ── CS303 Artificial Intelligence ─────────────────────────────────────
            { courseCode: 'CS303', type: 'LECTURE',  batchGroupId: 'BATCH1',       facultyId: 'FAC17', count: 3 },
            { courseCode: 'CS303', type: 'LECTURE',  batchGroupId: 'BATCH2',       facultyId: 'FAC17', count: 3 },
            { courseCode: 'CS303', type: 'LECTURE',  batchGroupId: 'BX1',          facultyId: 'FAC18', count: 3 },
            // ── PH303 Nano Science ────────────────────────────────────────────────
            { courseCode: 'PH303', type: 'LECTURE',  batchGroupId: 'BATCH1',       facultyId: 'FAC14', count: 3 },
            { courseCode: 'PH303', type: 'LECTURE',  batchGroupId: 'BATCH2',       facultyId: 'FAC14', count: 3 },
            { courseCode: 'PH303', type: 'LECTURE',  batchGroupId: 'BX1',          facultyId: 'FAC15', count: 3 },
            // ── Electives: CS301 / PH302 / PH304 ─────────────────────────────────
            { courseCode: 'CS301', type: 'LECTURE',  batchGroupId: 'BATCH1',       facultyId: 'FAC07', count: 2 },
            { courseCode: 'PH302', type: 'LECTURE',  batchGroupId: 'BATCH2',       facultyId: 'FAC13', count: 2 },
            { courseCode: 'PH302', type: 'LECTURE',  batchGroupId: 'B21B22',       facultyId: 'FAC13', count: 1 },
            { courseCode: 'PH302', type: 'LECTURE',  batchGroupId: 'B31',          facultyId: 'FAC13', count: 1 },
            { courseCode: 'PH302', type: 'LECTURE',  batchGroupId: 'B10',          facultyId: 'FAC13', count: 1 },
            { courseCode: 'PH304', type: 'LECTURE',  batchGroupId: 'BATCH1',       facultyId: 'FAC16', count: 2 },
            { courseCode: 'PH304', type: 'LECTURE',  batchGroupId: 'BATCH2',       facultyId: 'FAC16', count: 2 },
            // ── BX1 Electives: CS118 / CS120 ─────────────────────────────────────
            { courseCode: 'CS118', type: 'LECTURE',  batchGroupId: 'B31',          facultyId: 'FAC17', count: 3 },
            { courseCode: 'CS120', type: 'LECTURE',  batchGroupId: 'B21B22',       facultyId: 'FAC12', count: 3 },
            { courseCode: 'CS120', type: 'LECTURE',  batchGroupId: 'B10',          facultyId: 'FAC17', count: 3 },
            { courseCode: 'CS120', type: 'LECTURE',  batchGroupId: 'B11',          facultyId: 'FAC17', count: 2 },
            // ── CS212 Computer Networks Lab ───────────────────────────────────────
            { courseCode: 'CS212', type: 'PRACTICAL', batchGroupId: 'B1B2',         facultyId: 'FAC03', count: 1 },
            { courseCode: 'CS212', type: 'PRACTICAL', batchGroupId: 'B3B4',         facultyId: 'FAC03', count: 1 },
            { courseCode: 'CS212', type: 'PRACTICAL', batchGroupId: 'B5B6',         facultyId: 'FAC03', count: 1 },
            { courseCode: 'CS212', type: 'PRACTICAL', batchGroupId: 'B7B8',         facultyId: 'FAC04', count: 1 },
            { courseCode: 'CS212', type: 'PRACTICAL', batchGroupId: 'B9B10',        facultyId: 'FAC04', count: 1 },
            { courseCode: 'CS212', type: 'PRACTICAL', batchGroupId: 'B11B21B22B31', facultyId: 'FAC04', count: 1 },
            // ── CS214 OSS Lab ─────────────────────────────────────────────────────
            { courseCode: 'CS214', type: 'PRACTICAL', batchGroupId: 'B1B2',         facultyId: 'FAC11', count: 1 },
            { courseCode: 'CS214', type: 'PRACTICAL', batchGroupId: 'B3B4',         facultyId: 'FAC11', count: 1 },
            { courseCode: 'CS214', type: 'PRACTICAL', batchGroupId: 'B5B6',         facultyId: 'FAC11', count: 1 },
            { courseCode: 'CS214', type: 'PRACTICAL', batchGroupId: 'B7B8',         facultyId: 'FAC11', count: 1 },
            { courseCode: 'CS214', type: 'PRACTICAL', batchGroupId: 'B9B10',        facultyId: 'FAC11', count: 1 },
            { courseCode: 'CS214', type: 'PRACTICAL', batchGroupId: 'B11',          facultyId: 'FAC11', count: 1 },
            // ── CS215 AP Lab-2 ────────────────────────────────────────────────────
            { courseCode: 'CS215', type: 'PRACTICAL', batchGroupId: 'B1B2',         facultyId: 'FAC12', count: 1 },
            { courseCode: 'CS215', type: 'PRACTICAL', batchGroupId: 'B3B4',         facultyId: 'FAC12', count: 1 },
            { courseCode: 'CS215', type: 'PRACTICAL', batchGroupId: 'B5B6',         facultyId: 'FAC12', count: 1 },
            { courseCode: 'CS215', type: 'PRACTICAL', batchGroupId: 'B7B8',         facultyId: 'FAC12', count: 1 },
            { courseCode: 'CS215', type: 'PRACTICAL', batchGroupId: 'B9B10',        facultyId: 'FAC12', count: 1 },
            { courseCode: 'CS215', type: 'PRACTICAL', batchGroupId: 'B11B21B22B31', facultyId: 'FAC12', count: 1 },
            // ── CS223 DAV Lab / CS224 DL Lab ─────────────────────────────────────
            { courseCode: 'CS223', type: 'PRACTICAL', batchGroupId: 'B11',          facultyId: 'FAC17', count: 1 },
            { courseCode: 'CS223', type: 'PRACTICAL', batchGroupId: 'B31',          facultyId: 'FAC17', count: 1 },
            { courseCode: 'CS224', type: 'PRACTICAL', batchGroupId: 'B21B22',       facultyId: 'FAC12', count: 1 }
        ].forEach(s => addSessionRow(s));

        saveToLocalStorage();
        showNotification('📥 BTech Sem V dataset loaded! 16 courses · 18 faculty · 14 sub-batches · 88 session mappings · 8 free periods/batch guaranteed.');
    }, 50);
}


// ═══════════════════════════════════════════════════════════════════
//  CLEAR ALL DATA
// ═══════════════════════════════════════════════════════════════════

function clearAllData(silent) {
    document.getElementById('coursesBody').innerHTML = '';
    document.getElementById('facultyBody').innerHTML = '';
    document.getElementById('roomsBody').innerHTML = '';
    document.getElementById('subBatchBody').innerHTML = '';
    document.getElementById('batchGroupBody').innerHTML = '';
    document.getElementById('sessionsBody').innerHTML = '';
    facultyIdCounter = 1;
    localStorage.removeItem('timetable_draft');
    if (!silent) showNotification('🗑️ All data cleared.');
}


// ═══════════════════════════════════════════════════════════════════
//  LOCAL STORAGE PERSISTENCE
// ═══════════════════════════════════════════════════════════════════

function saveToLocalStorage() {
    try {
        const perDayArr = getPeriodsPerDayArray();
        // Build daysConfig for all days (including unchecked)
        const daysConfig = ALL_DAYS.map((day, i) => {
            const cb = document.querySelector(`[data-day-index="${i}"]`);
            const periodInput = document.querySelector(`[data-day-periods="${i}"]`);
            return {
                enabled: cb ? cb.checked : false,
                periods: periodInput ? parseInt(periodInput.value) || 6 : DEFAULT_PERIODS_PER_DAY[i]
            };
        });
        const data = {
            config: {
                daysCount: getSelectedDays().length,
                periodsPerDay: getMaxPeriods(),
                periodsPerDayArray: perDayArr,
                dayNames: getSelectedDays(),
                periodTimes: getPeriodTimes(),
                daysConfig: daysConfig
            },
            courses: getCourses(),
            faculty: getFaculty(),
            rooms: getRooms(),
            subBatches: getSubBatches(),
            batchGroups: getBatchGroups(),
            sessionMappings: getSessionMappings()
        };
        localStorage.setItem('timetable_draft', JSON.stringify(data));
    } catch (e) {
        // silently fail
    }
}

function restoreFromLocalStorage() {
    try {
        const saved = localStorage.getItem('timetable_draft');
        if (!saved) return;
        const data = JSON.parse(saved);

        // Restore config
        if (data.config) {
            // Restore per-day config
            if (data.config.daysConfig) {
                initDaysCheckboxes(data.config.daysConfig);
            }

            renderPeriodTimings(getMaxPeriods());

            // Restore period times
            if (data.config.periodTimes) {
                const inputs = document.querySelectorAll('.period-time-input');
                data.config.periodTimes.forEach((time, i) => {
                    if (inputs[i]) inputs[i].value = time;
                });
            }
        }

        // Restore data tables
        if (data.courses) data.courses.forEach(c => addCourseRow(c));
        if (data.faculty) {
            data.faculty.forEach(f => addFacultyRow(f));
            // Update counter
            const maxId = data.faculty.reduce((max, f) => {
                const num = parseInt(f.id.replace(/\D/g, '')) || 0;
                return Math.max(max, num);
            }, 0);
            facultyIdCounter = maxId + 1;
        }
        if (data.rooms) data.rooms.forEach(r => addRoomRow(r));
        if (data.subBatches) data.subBatches.forEach(s => addSubBatchRow(s));
        if (data.batchGroups) data.batchGroups.forEach(bg => addBatchGroupRow(bg));
        if (data.sessionMappings) {
            setTimeout(() => {
                data.sessionMappings.forEach(s => addSessionRow(s));
            }, 50);
        }
    } catch (e) {
        console.warn('Failed to restore from localStorage:', e);
    }
}


// ═══════════════════════════════════════════════════════════════════
//  NOTIFICATION TOAST
// ═══════════════════════════════════════════════════════════════════

function showNotification(message) {
    // Remove any existing notification
    const existing = document.querySelector('.notification-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        padding: 14px 24px;
        background: hsl(222, 45%, 12%);
        border: 1px solid var(--border-medium);
        border-radius: 12px;
        color: var(--text-primary);
        font-family: 'Inter', sans-serif;
        font-size: 0.85rem;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 12px 40px hsla(222, 50%, 4%, 0.6);
        backdrop-filter: blur(20px);
        animation: slideUp 0.3s ease;
        max-width: 500px;
    `;

    // Add slideUp animation
    const style = document.createElement('style');
    style.textContent = `@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`;
    document.head.appendChild(style);

    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.transition = 'opacity 0.3s ease';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
