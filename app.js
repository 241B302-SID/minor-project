/* ═══════════════════════════════════════════════════════════════════════
   TIMETABLE GENERATOR — Web UI Application Logic
   ═══════════════════════════════════════════════════════════════════════ */

// ── Global State ──
let timetableData = null;  // loaded output JSON
const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DEFAULT_TIMES = ['9:00-9:55', '10:00-10:55', '11:00-11:55', '12:00-12:55', '2:00-2:55', '3:00-3:55'];

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

const DEFAULT_PERIODS_PER_DAY = [6, 6, 6, 6, 6, 4]; // Mon-Fri=6, Sat=4

function initDaysCheckboxes(daysConfig) {
    const tbody = document.getElementById('daysConfigBody');
    tbody.innerHTML = '';
    ALL_DAYS.forEach((day, i) => {
        const config = daysConfig ? daysConfig[i] : null;
        const checked = config ? config.enabled : (i < 5);
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
            populationSize: 120,
            maxGenerations: 500,
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

    // Also show a success message
    showNotification('✅ Input JSON exported! Save it to input/timetable_input.json and run Java.');
}


// ═══════════════════════════════════════════════════════════════════
//  LOAD OUTPUT JSON & DISPLAY TIMETABLE
// ═══════════════════════════════════════════════════════════════════

async function tryAutoLoadTimetable() {
    try {
        const resp = await fetch('timetable_output.json');
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
    ['tabDashboard', 'tabSubBatch', 'tabFaculty', 'tabRoom', 'tabMaster'].forEach(id => {
        document.getElementById(id).style.display = '';
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

    // Render dashboard
    renderDashboard();

    // Populate dropdowns
    populateDropdowns();

    // Switch to dashboard tab
    document.querySelector('[data-tab="dashboard"]').click();

    showNotification('🎉 Timetable loaded successfully!');
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

    // Sub-batches
    const sbSelect = document.getElementById('subBatchSelect');
    sbSelect.innerHTML = '<option value="">— Choose Sub-Batch —</option>';
    d.subBatches.forEach(sb => {
        sbSelect.innerHTML += `<option value="${sb.id}">${sb.name} (${sb.size} students)</option>`;
    });

    // Faculty
    const facSelect = document.getElementById('facultySelect');
    facSelect.innerHTML = '<option value="">— Choose Faculty —</option>';
    d.faculty.forEach(f => {
        facSelect.innerHTML += `<option value="${f.id}">${f.name} (${f.department})</option>`;
    });

    // Rooms
    const roomSelect = document.getElementById('roomSelect');
    roomSelect.innerHTML = '<option value="">— Choose Room —</option>';
    d.rooms.forEach(r => {
        const typeLabel = r.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
        roomSelect.innerHTML += `<option value="${r.code}">${r.code} — ${typeLabel} (cap: ${r.capacity})</option>`;
    });
}


// ═══════════════════════════════════════════════════════════════════
//  WEEKLY GRID RENDERER (shared by sub-batch, faculty, room views)
// ═══════════════════════════════════════════════════════════════════

function buildWeeklyGrid(filterFn, container) {
    const d = timetableData;
    const days = d.config.dayNames;
    const maxPeriods = d.config.periodsPerDay; // max across all days
    const perDayArr = d.config.periodsPerDayArray || new Array(days.length).fill(maxPeriods);
    const times = d.config.periodTimes;

    // Build a 2D grid: [day][maxPeriods] = session or null
    const grid = [];
    for (let day = 0; day < days.length; day++) {
        grid[day] = new Array(maxPeriods).fill(null);
    }

    // Fill the grid
    const matching = d.schedule.filter(filterFn);
    matching.forEach(s => {
        for (let slot = 0; slot < s.durationSlots; slot++) {
            const period = s.startSlot + slot;
            if (period < maxPeriods) {
                grid[s.day][period] = { ...s, isContSlot: slot > 0 };
            }
        }
    });

    // Build HTML
    let html = '<div class="timetable-wrapper"><table class="timetable-grid"><thead><tr>';
    html += '<th>Day</th>';
    for (let p = 0; p < maxPeriods; p++) {
        const time = times[p] || `P${p + 1}`;
        html += `<th>P${p + 1}<br><span style="font-weight:400; font-size: 0.68rem; opacity:0.7;">${time}</span></th>`;
    }
    html += '</tr></thead><tbody>';

    for (let day = 0; day < days.length; day++) {
        const dayPeriods = perDayArr[day] || maxPeriods;
        html += `<tr><td>${days[day]}</td>`;

        let p = 0;
        while (p < maxPeriods) {
            if (p >= dayPeriods) {
                // This day has fewer periods — show greyed-out blocked cell
                const remaining = maxPeriods - p;
                html += `<td colspan="${remaining}" style="padding: 6px;">`;
                html += `<div class="empty-cell" style="opacity:0.2; background: hsla(222,30%,20%,0.3); border-style:solid; font-style:italic;">No class</div>`;
                html += '</td>';
                break;
            }

            const entry = grid[day][p];
            if (entry && !entry.isContSlot) {
                const colspan = Math.min(entry.durationSlots, dayPeriods - p);
                const typeClass = entry.type.toLowerCase();
                const typeLabel = entry.type === 'PRACTICAL' ? 'Lab' : entry.type.charAt(0) + entry.type.slice(1).toLowerCase();

                html += `<td colspan="${colspan}" style="padding: 6px;">`;
                html += `<div class="session-cell ${typeClass}" 
                    onmouseenter="showTooltip(event, ${JSON.stringify(entry).replace(/"/g, '&quot;')})" 
                    onmouseleave="hideTooltip()" 
                    onmousemove="moveTooltip(event)">`;
                html += `<div class="course-code">${entry.courseCode}</div>`;
                html += `<div class="session-type-badge">${typeLabel}</div>`;
                html += `<div class="session-detail">${entry.facultyName} @ ${entry.roomCode}</div>`;
                html += `<div class="session-detail">${entry.batchGroupName}</div>`;
                html += '</div></td>';

                p += colspan;
            } else if (entry && entry.isContSlot) {
                // skip — already handled by colspan
                p++;
            } else {
                html += '<td><div class="empty-cell">—</div></td>';
                p++;
            }
        }
        html += '</tr>';
    }

    html += '</tbody></table></div>';
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

    // Config — Mon-Fri=6, Sat off (but with 4 as default if enabled)
    initDaysCheckboxes([
        { enabled: true, periods: 6 },  // Mon
        { enabled: true, periods: 6 },  // Tue
        { enabled: true, periods: 6 },  // Wed
        { enabled: true, periods: 6 },  // Thu
        { enabled: true, periods: 6 },  // Fri
        { enabled: false, periods: 4 }, // Sat (off by default)
    ]);
    renderPeriodTimings(getMaxPeriods());

    // Courses
    [
        { code: 'MA106', name: 'Probability Theory', credits: 4, lectureHours: 3, tutorialHours: 1, labHours: 0, isElective: false },
        { code: 'CS109', name: 'Computer Networks', credits: 3, lectureHours: 3, tutorialHours: 0, labHours: 0, isElective: false },
        { code: 'CS110', name: 'Theory of Computation', credits: 4, lectureHours: 3, tutorialHours: 1, labHours: 0, isElective: false },
        { code: 'CS212', name: 'Computer Networks Lab', credits: 2, lectureHours: 0, tutorialHours: 0, labHours: 2, isElective: false },
        { code: 'CS303', name: 'Artificial Intelligence', credits: 3, lectureHours: 3, tutorialHours: 0, labHours: 0, isElective: false },
    ].forEach(c => addCourseRow(c));

    // Faculty
    facultyIdCounter = 7;
    [
        { id: 'FAC01', name: 'Dr. Sharma', department: 'CSE', maxWeeklyLoad: 14 },
        { id: 'FAC02', name: 'Prof. Verma', department: 'CSE', maxWeeklyLoad: 14 },
        { id: 'FAC03', name: 'Dr. Gupta', department: 'Math', maxWeeklyLoad: 12 },
        { id: 'FAC04', name: 'Prof. Rao', department: 'HSS', maxWeeklyLoad: 10 },
        { id: 'FAC05', name: 'Dr. Patel', department: 'CSE', maxWeeklyLoad: 14 },
        { id: 'FAC06', name: 'Prof. Singh', department: 'Physics', maxWeeklyLoad: 12 },
    ].forEach(f => addFacultyRow(f));

    // Rooms
    [
        { code: 'LT1', type: 'LECTURE_THEATRE', capacity: 160 },
        { code: 'LT2', type: 'LECTURE_THEATRE', capacity: 160 },
        { code: 'CR11', type: 'CLASSROOM', capacity: 80 },
        { code: 'CR12', type: 'CLASSROOM', capacity: 80 },
        { code: 'CR13', type: 'CLASSROOM', capacity: 80 },
        { code: 'CL1', type: 'COMPUTER_LAB', capacity: 35 },
        { code: 'CL2', type: 'COMPUTER_LAB', capacity: 35 },
        { code: 'CL3', type: 'CLASSROOM', capacity: 35 },
    ].forEach(r => addRoomRow(r));

    // Sub-batches
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
        // Single sub-batch groups
        { id: 'B1', subBatchIds: ['B1'] },
        { id: 'B2', subBatchIds: ['B2'] },
        { id: 'B3', subBatchIds: ['B3'] },
        { id: 'B4', subBatchIds: ['B4'] },
    ].forEach(bg => addBatchGroupRow(bg));

    // Session Mappings — needs to rebuild session dropdowns after adding data
    setTimeout(() => {
        [
            { courseCode: 'MA106', type: 'LECTURE', batchGroupId: 'BX', facultyId: 'FAC03', count: 3 },
            { courseCode: 'MA106', type: 'TUTORIAL', batchGroupId: 'B1', facultyId: 'FAC03', count: 1 },
            { courseCode: 'MA106', type: 'TUTORIAL', batchGroupId: 'B2', facultyId: 'FAC03', count: 1 },
            { courseCode: 'CS109', type: 'LECTURE', batchGroupId: 'BX', facultyId: 'FAC01', count: 3 },
            { courseCode: 'CS110', type: 'LECTURE', batchGroupId: 'BY', facultyId: 'FAC05', count: 3 },
            { courseCode: 'CS110', type: 'TUTORIAL', batchGroupId: 'B4', facultyId: 'FAC05', count: 1 },
            { courseCode: 'CS303', type: 'LECTURE', batchGroupId: 'BATCH1', facultyId: 'FAC04', count: 3 },
            { courseCode: 'CS212', type: 'PRACTICAL', batchGroupId: 'B1', facultyId: 'FAC01', count: 1 },
            { courseCode: 'CS212', type: 'PRACTICAL', batchGroupId: 'B2', facultyId: 'FAC02', count: 1 },
            { courseCode: 'CS212', type: 'PRACTICAL', batchGroupId: 'B3', facultyId: 'FAC05', count: 1 },
        ].forEach(s => addSessionRow(s));

        saveToLocalStorage();
        showNotification('📥 Sample data loaded! Review and modify as needed.');
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
