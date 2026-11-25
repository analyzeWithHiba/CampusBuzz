// admin.js - Admin Portal Logic

// Protect route
function checkAuth() {
    const user = Store.getCurrentUser();
    if (!user || user.role !== 'admin') {
        window.location.href = 'index.html';
        return false;
    }

    // Set Header
    const avatarDiv = document.getElementById('adminInitial');
    if (avatarDiv) {
        const displayName = user.name || user.username || 'Admin';
        if (user.profilePicture) {
            avatarDiv.innerHTML = `<img src="${user.profilePicture}" alt="Profile" style="width:100%; height:100%; object-fit:cover;">`;
        } else {
            avatarDiv.innerHTML = displayName.charAt(0).toUpperCase();
        }
    }

    return true;
}

if (!checkAuth()) {
    // Stop execution if not auth
    throw new Error('Not authorized');
}

// Global modal helpers
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    const form = document.querySelector(`#${id} form`);
    if (form) form.reset();
}

// Navigation Logic
document.querySelectorAll('.nav-item[data-target]').forEach(async item => {
    item.addEventListener('click', async (e) => {
        e.preventDefault();
        // Update active class
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');

        // Show target section
        const targetId = item.getAttribute('data-target');
        document.querySelectorAll('.section-view').forEach(s => s.classList.remove('active'));
        document.getElementById(targetId).classList.add('active');

        // Refresh specific views
        if (targetId === 'dashboardView') renderDashboard();
        if (targetId === 'eventsView') renderEvents();
        if (targetId === 'departmentsView') renderDepartments();
        if (targetId === 'registrationsView') renderRegistrationsView();
        if (targetId === 'resultsView') renderResultsView();
        if (targetId === 'studentsView') renderStudents();
    });
});

// Render Dashboard
async function renderDashboard() {
    const events = await Store.getEvents();
    const regs = await Store.getRegistrations();
    const students = await Store.getStudents();

    const depts = await Store.getDepartments();

    document.getElementById('stat-events').textContent = events.length;
    document.getElementById('stat-regs').textContent = regs.length;
    document.getElementById('stat-depts').textContent = depts.length;
    document.getElementById('stat-students').textContent = students.length;

    // Recent events list
    const list = document.getElementById('recentEventsList');
    list.innerHTML = '';

    const sorted = [...events].sort((a, b) => {
        const statusWeight = (evt) => {
            const s = Store.getEventDynamicStatus(evt);
            if (s === 'Ongoing') return 1;
            if (s === 'Upcoming') return 2;
            return 3;
        };
        const weightDiff = statusWeight(a) - statusWeight(b);
        if (weightDiff !== 0) return weightDiff;
        return new Date(a.date) - new Date(b.date);
    }).slice(0, 3);

    if (sorted.length === 0) list.innerHTML = '<p class="text-gray">No events found.</p>';

    sorted.forEach(async evt => {
        const item = document.createElement('div');
        const status = Store.getEventDynamicStatus(evt);
        let badgeStyle = 'background-color: var(--tag-teal-bg); color: var(--tag-teal);'; // Upcoming
        if (status === 'Ongoing') badgeStyle = 'background-color: var(--tag-orange-bg); color: var(--tag-orange);';
        if (status === 'Completed') badgeStyle = 'background-color: var(--border-color); color: var(--text-gray);';

        item.className = 'list-item';
        item.innerHTML = `
            <div>
                <div class="font-semibold">${evt.title}</div>
                <div class="text-sm text-gray">${new Date(evt.date).toLocaleDateString()} | ${evt.type}</div>
            </div>
            <span class="badge" style="${badgeStyle}">${status}</span>
        `;
        list.appendChild(item);
    });
}

// Render Events Management
async function renderEvents() {
    const events = await Store.getEvents();
    const depts = await Store.getDepartments();
    const list = document.getElementById('adminEventsList');
    list.innerHTML = '';

    if (events.length === 0) {
        list.innerHTML = '<div class="card"><p class="text-gray text-center py-8">No events. Create one to get started.</p></div>';
        return;
    }

    // Sort events by status (Ongoing -> Upcoming -> Completed) then date ascending
    events.sort((a, b) => {
        const statusWeight = (evt) => {
            const s = Store.getEventDynamicStatus(evt);
            if (s === 'Ongoing') return 1;
            if (s === 'Upcoming') return 2;
            return 3;
        };
        const weightDiff = statusWeight(a) - statusWeight(b);
        if (weightDiff !== 0) return weightDiff;
        return new Date(a.date) - new Date(b.date);
    });

    events.forEach(async evt => {
        const deptId = evt.department ? (evt.department.id || evt.department._id || evt.department) : null;
        const dept = depts.find(d => d.id === deptId);
        const status = Store.getEventDynamicStatus(evt);
        let badgeStyle = 'background-color: var(--tag-teal-bg); color: var(--tag-teal);'; // Upcoming
        if (status === 'Ongoing') badgeStyle = 'background-color: var(--tag-orange-bg); color: var(--tag-orange);';
        if (status === 'Completed') badgeStyle = 'background-color: var(--border-color); color: var(--text-gray);';

        const bannerHTML = evt.bannerImage ? `<img src="${evt.bannerImage}" alt="Event Banner" class="event-banner" style="margin-bottom: 1rem;">` : '';

        const card = document.createElement('div');
        card.className = 'card';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.height = '100%';
        card.innerHTML = `
            ${bannerHTML}
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="text-lg font-bold">${evt.title}</h3>
                    <div class="text-sm text-gray mt-1">
                        ${dept ? dept.name : 'Unknown Dept'} | ${evt.type} | ${new Date(evt.date).toLocaleDateString()} ${evt.time}
                    </div>
                </div>
                <span class="badge" style="${badgeStyle}">${status}</span>
            </div>
            <p class="text-sm mt-4">${evt.description}</p>
            <div class="flex justify-end gap-2 pt-4 border-t" style="border-top: 1px solid var(--border-color); margin-top: auto;">
                <button class="btn btn-secondary text-sm" onclick="toggleResultStatus('${evt.id}')">Results: ${evt.resultStatus || 'Published'}</button>
                <button class="btn btn-secondary text-sm" onclick="editEvent('${evt.id}')">Edit</button>
                <button class="btn btn-danger text-sm" onclick="deleteEvent('${evt.id}')">Delete</button>
            </div>
        `;
        list.appendChild(card);
    });
}

// Event Form Submission
document.getElementById('eventForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('eventId').value;
    const bannerInput = document.getElementById('eventBanner');

    let existingBanner = null;
    if (id) {
        const oldEvt = (await Store.getEvents()).find(e => e.id === id);
        if (oldEvt) existingBanner = oldEvt.bannerImage || null;
    }

    const submitData = async (bannerImageBase64) => {
        // Parse the native 24-hr time input (e.g. "14:30") into a physical 12-hr AM/PM string for exact database saving
        // Construct the 12-hour AM/PM string explicitly from the new text input + dropdown
        const hmInput = document.getElementById('eventHm').value || "12:00";
        const ampm = document.getElementById('eventAmpm').value;

        let formattedTime = `${hmInput} ${ampm}`;
        if (hmInput.includes(':')) {
            const [h, m] = hmInput.split(':').map(s => s.trim());
            formattedTime = `${h.padStart(2, '0')}:${m.padStart(2, '0')} ${ampm}`;
        }

        const data = {
            id: id || undefined, // Explicitly pass the ID if updating
            title: document.getElementById('eventTitle').value,
            department: document.getElementById('eventDepartment').value,
            type: document.getElementById('eventType').value,
            date: document.getElementById('eventDate').value,
            time: formattedTime, // Pass the newly formatted string
            venue: document.getElementById('eventVenue').value,
            description: document.getElementById('eventDesc').value,
            maxParticipants: document.getElementById('eventMaxParticipants').value ? parseInt(document.getElementById('eventMaxParticipants').value) : null,
            status: 'Published', // Auto publish for simplicity
            resultStatus: id ? (await Store.getEvents()).find(e => e.id === id).resultStatus : 'Draft', // Default new events results to Draft
            bannerImage: bannerImageBase64
        };

        if (id) {
            const oldEvt = (await Store.getEvents()).find(e => e.id === id);
            await Store.updateEvent(id, data);

            // Check for rescheduling
            if (oldEvt && (oldEvt.date !== data.date || oldEvt.time !== data.time)) {
                const regs = (await Store.getRegistrations()).filter(r => r.eventId === id);
                regs.forEach(async r => {
                    const dateStr = new Date(data.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
                    await Store.addNotification(
                        r.studentId,
                        `${data.title} has been rescheduled to ${dateStr} at ${data.time}.`,
                        'Event Rescheduled',
                        'action'
                    );
                });
            }
        } else {
            const newEvt = await Store.addEvent(data);
            
            // Notify all students about the new event
            const students = await Store.getStudents();
            const dateStr = new Date(data.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
            students.forEach(async s => {
                await Store.addNotification(
                    s.id,
                    `A new event "${data.title}" has been published for ${dateStr}. Check it out!`,
                    'New Event Published',
                    'info',
                    newEvt.id
                );
            });
        }

        closeModal('createEventModal');
        renderEvents();
        renderDashboard();
    };

    if (bannerInput && bannerInput.files && bannerInput.files.length > 0) {
        const reader = new FileReader();
        reader.onload = (e) => submitData(e.target.result);
        reader.onerror = () => { alert('Failed to read image'); submitData(existingBanner); };
        reader.readAsDataURL(bannerInput.files[0]);
    } else {
        submitData(existingBanner);
    }
});

async function editEvent(id) {
    const evt = (await Store.getEvents()).find(e => e.id === id);
    if (!evt) return;

    document.getElementById('eventId').value = evt.id;
    document.getElementById('eventTitle').value = evt.title;

    populateDeptDropdown('eventDepartment');
    document.getElementById('eventDepartment').value = evt.department ? (evt.department.id || evt.department._id || evt.department) : '';

    document.getElementById('eventType').value = evt.type;
    document.getElementById('eventDate').value = evt.date;

    // Parse existing time string (e.g. "02:30 PM") and slot it back into the inputs
    if (evt.time && evt.time.includes(':')) {
        try {
            const timeParts = evt.time.split(' ');
            document.getElementById('eventHm').value = timeParts[0]; // e.g., "02:30"
            document.getElementById('eventAmpm').value = timeParts[1] || 'AM'; // e.g., "PM"
        } catch (e) {
            console.error("Error parsing existing time strictly:", e);
        }
    }

    document.getElementById('eventMaxParticipants').value = evt.maxParticipants || '';
    document.getElementById('eventVenue').value = evt.venue;
    document.getElementById('eventDesc').value = evt.description;
    document.getElementById('eventBanner').value = ''; // Reset file input

    document.getElementById('eventModalTitle').textContent = 'Edit Event';
    openModal('createEventModal');
}

async function deleteEvent(id) {
    if (confirm('Are you sure you want to delete this event? This will also remove related registrations.')) {
        await Store.deleteEvent(id);
        renderEvents();
        renderDashboard();
    }
}

// Render Departments
async function renderDepartments() {
    const depts = await Store.getDepartments();
    const list = document.getElementById('departmentsList');
    list.innerHTML = '';

    depts.forEach(async d => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <span class="font-semibold">${d.name}</span>
            <div class="flex gap-2">
                <button class="btn btn-secondary text-sm" onclick="editDept('${d.id}', '${d.name}')">Edit</button>
                <button class="btn btn-danger text-sm" onclick="deleteDept('${d.id}')">Delete</button>
            </div>
        `;
        list.appendChild(item);
    });
}

document.getElementById('deptForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('deptId').value;
    const name = document.getElementById('deptName').value;
    try {
        if (id) {
            await Store.updateDepartment(id, name);
        } else {
            await Store.addDepartment(name);
        }
        closeModal('createDeptModal');
        renderDepartments();
    } catch (err) {
        alert(err.message || 'Failed to save department');
    }
});

async function editDept(id, name) {
    document.getElementById('deptId').value = id;
    document.getElementById('deptName').value = name;
    document.getElementById('deptModalTitle').textContent = 'Edit Department';
    openModal('createDeptModal');
}

// Reset form when clicking "Add Department"
document.querySelectorAll('[onclick="openModal(\'createDeptModal\')"]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById('deptForm').reset();
        document.getElementById('deptId').value = '';
        document.getElementById('deptModalTitle').textContent = 'Add Department';
    });
});

async function deleteDept(id) {
    if (confirm('Are you sure?')) {
        try {
            await Store.deleteDepartment(id);
            renderDepartments();
        } catch (err) {
            alert(err.message || 'Failed to delete department');
        }
    }
}

// Helpers
async function populateDeptDropdown(elementId) {
    const select = document.getElementById(elementId);
    select.innerHTML = '<option value="">Select Department...</option>';
    (await Store.getDepartments()).forEach(async d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = d.name;
        select.appendChild(opt);
    });
}

async function toggleResultStatus(id) {
    const evt = (await Store.getEvents()).find(e => e.id === id);
    if (!evt) return;

    const statuses = ['Draft', 'Published', 'Hidden'];
    let currentIdx = statuses.indexOf(evt.resultStatus || 'Published');
    let nextIdx = (currentIdx + 1) % statuses.length;

    await Store.updateEvent(id, { resultStatus: statuses[nextIdx] });
    renderEvents();
}

// Initialize Dropdowns before opening Modals
document.querySelectorAll('[onclick="openModal(\'createEventModal\')"]').forEach(btn => {
    btn.addEventListener('click', async () => {
        document.getElementById('eventForm').reset();
        document.getElementById('eventId').value = '';
        document.getElementById('eventModalTitle').textContent = 'Create Event';
        populateDeptDropdown('eventDepartment');
    });
});

// Render Registrations
async function renderRegistrationsView() {
    const eventSelect = document.getElementById('regEventFilter');
    const deptSelect = document.getElementById('regDeptFilter');

    eventSelect.innerHTML = '<option value="all">All Events</option>';
    (await Store.getEvents()).forEach(async e => {
        const opt = document.createElement('option');
        opt.value = e.id;
        opt.textContent = e.title;
        eventSelect.appendChild(opt);
    });

    deptSelect.innerHTML = '<option value="all">All Departments</option>';
    (await Store.getDepartments()).forEach(async d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = d.name;
        deptSelect.appendChild(opt);
    });

    renderRegistrations();
}

async function renderRegistrations() {
    const eventFilter = document.getElementById('regEventFilter').value;
    const deptFilter = document.getElementById('regDeptFilter').value;
    const statusFilter = document.getElementById('regStatusFilter').value;
    const dateFilter = document.getElementById('regDateFilter').value;
    const searchFilter = document.getElementById('regSearchInput').value.toLowerCase();

    const allRegs = await Store.getRegistrations();
    const events = await Store.getEvents();

    // Reset Select All checkbox
    document.getElementById('selectAllRegs').checked = false;

    let filtered = allRegs.filter(r => {
        const evt = events.find(e => String(e.id) === String(r.eventId));
        if (!evt) return false;

        const matchesEvent = eventFilter === 'all' || String(r.eventId) === String(eventFilter);
        const deptId = evt.department ? (evt.department.id || evt.department._id || evt.department) : null;
        const matchesDept = deptFilter === 'all' || String(deptId) === String(deptFilter);
        const matchesStatus = statusFilter === 'all' || r.status === statusFilter;

        let matchesDate = true;
        if (dateFilter) {
            const regDate = new Date(r.createdAt).toISOString().split('T')[0];
            matchesDate = regDate === dateFilter;
        }

        const matchesSearch = !searchFilter ||
            r.studentName.toLowerCase().includes(searchFilter) ||
            r.studentId.toLowerCase().includes(searchFilter);

        return matchesEvent && matchesDept && matchesStatus && matchesDate && matchesSearch;
    });

    const tbody = document.getElementById('registrationsTableBody');
    tbody.innerHTML = '';

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="padding: 1rem; text-align: center; color: var(--text-gray);">No registrations found.</td></tr>';
        return;
    }

    filtered.forEach(async r => {
        const evt = events.find(e => e.id === r.eventId);
        const evtTitle = evt ? evt.title : 'Deleted Event';

        let statusColor = 'var(--text-gray)';
        if (r.status === 'Pending') statusColor = 'var(--tag-orange)';
        if (r.status === 'Approved') statusColor = 'var(--primary-blue)';
        if (r.status === 'Attended') statusColor = 'var(--success)';
        if (r.status === 'Rejected' || r.status === 'Absent') statusColor = 'var(--danger)';

        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-color)';
        tr.innerHTML = `
            <td style="padding: 1rem;">
                <input type="checkbox" class="reg-checkbox" value="${r.id}" onchange="updateSelectAllState()">
            </td>
            <td style="padding: 1rem;">
                <div class="font-semibold text-primary cursor-pointer hover:underline" onclick="showMiniProfile('${r.studentId}')">${r.studentName}</div>
                <div class="text-sm text-gray">${r.studentId}</div>
            </td>
            <td style="padding: 1rem;">${evtTitle}</td>
            <td style="padding: 1rem; color: ${statusColor}; font-weight: 500;">
                ${r.status}
            </td>
            <td style="padding: 1rem; text-sm text-gray">${new Date(r.createdAt).toLocaleDateString()}</td>
            <td style="padding: 1rem; text-align: right;">
                <div class="flex justify-end gap-2">
                    ${['Pending', 'Rejected'].includes(r.status) ? `<button class="btn btn-secondary text-sm" style="padding: 0.25rem 0.5rem;" onclick="updateSingleRegStatus('${r.id}', 'Approved', '${r.studentId}')">Approve</button>` : ''}
                    ${['Pending', 'Approved'].includes(r.status) ? `<button class="btn btn-secondary text-sm" style="color:var(--danger); border-color:var(--danger); padding: 0.25rem 0.5rem;" onclick="updateSingleRegStatus('${r.id}', 'Rejected', '${r.studentId}')">Reject</button>` : ''}
                    ${r.status === 'Approved' ? `<button class="btn btn-primary text-sm" style="padding: 0.25rem 0.5rem;" onclick="updateSingleRegStatus('${r.id}', 'Attended', '${r.studentId}')">Mark Attended</button>` : ''}
                    ${r.status === 'Approved' ? `<button class="btn btn-secondary text-sm" style="padding: 0.25rem 0.5rem;" onclick="updateSingleRegStatus('${r.id}', 'Absent', '${r.studentId}')">Mark Absent</button>` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function updateSingleRegStatus(regId, newStatus, studentId) {
    await Store.updateRegistrationStatus(regId, newStatus);

    // Notifications for Approve/Reject
    if (newStatus === 'Approved') {
        await Store.addNotification(studentId, 'Your registration has been approved.', 'Registration Approved', 'info');
    } else if (newStatus === 'Rejected') {
        await Store.addNotification(studentId, 'Your registration has been rejected.', 'Registration Rejected', 'info');
    }

    renderRegistrations();
}

async function toggleSelectAllRegs() {
    const selectAll = document.getElementById('selectAllRegs').checked;
    document.querySelectorAll('.reg-checkbox').forEach(async cb => {
        cb.checked = selectAll;
    });
}

async function updateSelectAllState() {
    const checkboxes = document.querySelectorAll('.reg-checkbox');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    const anyChecked = Array.from(checkboxes).some(cb => cb.checked);

    const selectAllCb = document.getElementById('selectAllRegs');
    selectAllCb.checked = allChecked;
    selectAllCb.indeterminate = anyChecked && !allChecked;
}

async function bulkActionRegistrations(action) {
    const selectedIds = Array.from(document.querySelectorAll('.reg-checkbox:checked')).map(cb => cb.value);

    if (selectedIds.length === 0) {
        alert('Please select at least one registration.');
        return;
    }

    if (confirm(`Are you sure you want to mark ${selectedIds.length} registration(s) as ${action}?`)) {
        selectedIds.forEach(async id => {
            const reg = (await Store.getRegistrations()).find(r => r.id === id);
            if (reg) {
                await updateSingleRegStatus(id, action, reg.studentId);
            }
        });
        document.getElementById('selectAllRegs').checked = false;
        renderRegistrations();
    }
}

async function exportRegistrations(format) {
    const filteredRegs = [];
    document.querySelectorAll('#registrationsTableBody tr').forEach(async tr => {
        // Skip "No registrations found" row
        if (tr.cells.length === 1) return;

        filteredRegs.push({
            Student: tr.cells[1].innerText.replace(/\n/g, ' - '),
            Event: tr.cells[2].innerText,
            Status: tr.cells[3].innerText.trim(),
            Date: tr.cells[4].innerText
        });
    });

    if (filteredRegs.length === 0) {
        alert("No data to export.");
        return;
    }

    if (format === 'csv') {
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Student,Event,Status,Date\n";
        filteredRegs.forEach(async row => {
            csvContent += `"${row.Student}","${row.Event}","${row.Status}","${row.Date}"\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "registrations_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else {
        alert("Excel export would use a library like SheetJS in a real app. Generating CSV instead.");
        exportRegistrations('csv');
    }
}

// Mini Profile Stub
async function showMiniProfile(studentId) {
    const student = (await Store.getStudents()).find(s => s.id === studentId);
    if (student) {
        const pastRegs = (await Store.getRegistrations()).filter(r => r.studentId === studentId);
        alert(`Mini Profile:\nName: ${student.name}\nID: ${student.id}\nEmail: ${student.email || 'N/A'}\nTotal Registrations: ${pastRegs.length}`);
    }
}

// === RESULTS MANAGEMENT ===

async function renderResultsView() {
    // Populate Event Dropdowns
    const manualEventSelect = document.getElementById('manualResultEvent');
    const bulkEventSelect = document.getElementById('bulkResultEvent');
    const leaderboardEventSelect = document.getElementById('leaderboardEventSelect');

    const events = await Store.getEvents();
    const eventOptionsHTML = '<option value="">Select Event...</option>' +
        events.map(e => `<option value="${e.id}">${e.title} (${e.type})</option>`).join('');

    manualEventSelect.innerHTML = eventOptionsHTML;
    bulkEventSelect.innerHTML = eventOptionsHTML;
    leaderboardEventSelect.innerHTML = '<option value="all">All Events</option>' +
        events.map(e => `<option value="${e.id}">${e.title}</option>`).join('');

    // Setup Listeners
    manualEventSelect.removeEventListener('change', populateManualStudentDropdown);
    leaderboardEventSelect.removeEventListener('change', renderLeaderboard);
    manualEventSelect.addEventListener('change', populateManualStudentDropdown);
    leaderboardEventSelect.addEventListener('change', renderLeaderboard);

    // Initial renders
    updateResultAnalytics();
    renderLeaderboard();
}

async function populateManualStudentDropdown() {
    const eventId = document.getElementById('manualResultEvent').value;
    const studentSelect = document.getElementById('manualResultStudent');
    studentSelect.innerHTML = '<option value="">Select Student...</option>';

    if (!eventId) {
        studentSelect.disabled = true;
        return;
    }

    studentSelect.disabled = false;
    // Allow both 'Attended' and 'Approved' (in case admin forgot to explicitly mark them attended first)
    const regs = (await Store.getRegistrations()).filter(r => r.eventId === eventId && (r.status === 'Attended' || r.status === 'Approved'));

    if (regs.length === 0) {
        studentSelect.innerHTML = '<option value="">No attended students found</option>';
        studentSelect.disabled = true;
        return;
    }

    const uniqueStudentIds = new Set();

    regs.forEach(r => {
        if (!uniqueStudentIds.has(r.studentId)) {
            uniqueStudentIds.add(r.studentId);
            const opt = document.createElement('option');
            opt.value = r.studentId;
            opt.dataset.regId = r.id; // Store reg ID for easy updates
            opt.textContent = `${r.studentName} (${r.studentId})`;
            studentSelect.appendChild(opt);
        }
    });
}

async function submitManualResult() {
    const eventId = document.getElementById('manualResultEvent').value;
    const studentSelect = document.getElementById('manualResultStudent');
    const studentId = studentSelect.value;
    const score = document.getElementById('manualResultScore').value;
    const position = document.getElementById('manualResultPosition').value;
    const remarks = document.getElementById('manualResultRemarks').value;

    if (!eventId || !studentId) {
        alert("Please select Event and Student.");
        return;
    }

    const regId = studentSelect.options[studentSelect.selectedIndex].dataset.regId;

    try {
        // Update Store
        await Store.updateRegistrationStatus(regId, 'Result Published');
        
        // Find MongoDB user ID from admission number
        const students = await Store.getStudents();
        const student = students.find(s => s.id === studentId);
        if (!student || !student._id) { alert("Student not found locally."); return; }

        await Store.addResult(eventId, student._id, score !== '' ? parseFloat(score) : null, position || null, remarks || null);

        await Store.updateEvent(eventId, { resultStatus: 'Published' });

        // Notify Student
        let msg = `Your result is published.`;
        if (position) msg += ` Placed: ${position}.`;
        if (score) msg += ` Score: ${score}.`;
        
        await Store.addNotification(studentId, msg, 'Result Published', 'info', eventId);

        alert("Result saved successfully.");
        document.getElementById('manualResultForm').reset();
        document.getElementById('manualResultStudent').disabled = true;

        // Refresh panels
        updateResultAnalytics();
        renderLeaderboard();
    } catch (err) {
        alert("Error saving result: " + err.message);
    }
}

async function updateResultAnalytics() {
    // Basic analytics implementation
    const results = await Store.getResults();

    document.getElementById('analyticsParticipants').innerText = results.length;

    // Because 'score' was removed from the schema per user request, we lack it for averages.
    // We will display placeholders as requested by the simplified schema.
    document.getElementById('analyticsHighestScore').innerText = "-";
    document.getElementById('analyticsAvgScore').innerText = "-";
    document.getElementById('analyticsPassRate').innerText = results.length > 0 ? "100%" : "-";
}

async function renderLeaderboard() {
    const eventFilter = document.getElementById('leaderboardEventSelect').value;
    const tbody = document.getElementById('leaderboardTableBody');

    let results = await Store.getResults();

    if (eventFilter !== 'all') {
        results = results.filter(r => r.eventid && String(r.eventid._id) === String(eventFilter));
    }

    tbody.innerHTML = '';

    if (results.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-gray); padding: 1rem;">No results found.</td></tr>';
        return;
    }

    // Sort first by event ID to group them, then heavily by position number, then score descending
    results.sort((a, b) => {
        const eventIdA = a.eventid ? String(a.eventid._id) : '';
        const eventIdB = b.eventid ? String(b.eventid._id) : '';

        // Group by event
        if (eventIdA !== eventIdB) return eventIdA.localeCompare(eventIdB);

        // Then by rank/position within the event
        const posA = a.position ? parseInt(a.position) : 999;
        const posB = b.position ? parseInt(b.position) : 999;
        if (posA !== posB) return posA - posB;

        const scoreA = a.score || 0;
        const scoreB = b.score || 0;
        return scoreB - scoreA;
    });

    results.forEach(async (r, index) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-color)';

        const posNum = r.position ? parseInt(r.position) : null;
        let rankBadge = r.position ? r.position : '-';
        if (posNum === 1) rankBadge = '🥇 ' + r.position;
        else if (posNum === 2) rankBadge = '🥈 ' + r.position;
        else if (posNum === 3) rankBadge = '🥉 ' + r.position;

        tr.innerHTML = `
            <td style="padding: 1rem; font-weight: bold; color: var(--primary-blue);">${rankBadge}</td>
            <td style="padding: 1rem;">
                <div class="font-semibold">${r.userid ? r.userid.name : 'Unknown'}</div>
                <div class="text-sm text-gray">${r.userid ? r.userid.uid : 'Unknown'}</div>
            </td>
            <td style="padding: 1rem;">
                <div class="font-semibold" style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${r.eventid ? r.eventid.title : 'Unknown Event'}">${r.eventid ? r.eventid.title : 'Unknown Event'}</div>
            </td>
            <td style="padding: 1rem; font-weight: bold;">${r.score !== null && r.score !== undefined ? r.score : '-'}</td>
            <td style="padding: 1rem;">${r.remarks || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function handleBulkUpload() {
    const eventId = document.getElementById('bulkResultEvent').value;
    const fileInput = document.getElementById('bulkResultFile');

    if (!eventId) {
        alert("Please select an Event.");
        return;
    }

    if (!fileInput.files || fileInput.files.length === 0) {
        alert("Please select a CSV file to upload.");
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
        const text = e.target.result;
        processCSVData(eventId, text);
    };

    reader.onerror = function () {
        alert("Error reading file.");
    };

    reader.readAsText(file);
}

async function processCSVData(eventId, csvText) {
    const lines = csvText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length < 2) {
        alert("CSV file is empty or missing data rows.");
        return;
    }

    // Assume header: Student ID, Score, Position, Remarks
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    const idIdx = headers.findIndex(h => h.includes('id'));
    const scoreIdx = headers.findIndex(h => h.includes('score'));
    const posIdx = headers.findIndex(h => h.includes('position'));
    const remarksIdx = headers.findIndex(h => h.includes('remarks'));

    if (idIdx === -1) {
        alert("CSV must contain a 'Student ID' column.");
        return;
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    const allRegs = await Store.getRegistrations();

    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim());
        const studentId = parts[idIdx];

        if (!studentId) continue;

        // Find the registration for this student and event
        const reg = allRegs.find(r => r.eventId === eventId && r.studentId === studentId && (r.status === 'Attended' || r.status === 'Approved' || r.status === 'Pending'));

        if (!reg) {
            errorCount++;
            errors.push(`Row ${i + 1}: Registration not found or invalid status for Student ID ${studentId}`);
            continue;
        }

        // Find MongoDB user ID from admission number
        const students = await Store.getStudents();
        const student = students.find(s => s.id === studentId);

        if (!student) {
            errorCount++;
            errors.push(`Row ${i + 1}: Student with ID ${studentId} not found in system.`);
            continue;
        }

        const score = scoreIdx !== -1 && parts[scoreIdx] ? parseFloat(parts[scoreIdx]) : null;
        const position = posIdx !== -1 ? parts[posIdx] : '';
        const remarks = remarksIdx !== -1 ? parts[remarksIdx] : '';

        // Save Result via API
        try {
            await Store.addResult(eventId, student._id, score, position || null, remarks || null);
            // Crucial: Update the Registration itself so the Student can actually see the result!
            await Store.updateRegistrationStatus(reg.id || reg._id, 'Result Published');
        } catch (err) {
            errorCount++;
            errors.push(`Row ${i + 1}: Failed to save result. Maybe they are not registered?`);
            continue;
        }

        // Notify
        let msg = `Your result is published.`;
        if (position) msg += ` Placed: ${position}.`;
        if (score !== null) msg += ` Score: ${score}.`; // Kept in notification text for backwards compat
        await Store.addNotification(studentId, msg, 'Result Published', 'info', eventId);

        successCount++;
    }

    // Ensure the event matches the Manual Form behavior by marking it explicitly Published
    if (successCount > 0) {
        await Store.updateEvent(eventId, { resultStatus: 'Published' });
    }

    let summary = `Bulk upload complete.\nSuccessfully updated: ${successCount} records.\nFailed: ${errorCount} records.`;
    if (errors.length > 0) {
        summary += `\n\nErrors:\n` + errors.slice(0, 5).join('\n');
        if (errors.length > 5) summary += `\n...and ${errors.length - 5} more.`;
    }

    alert(summary);
    document.getElementById('bulkResultForm').reset();

    updateResultAnalytics();
    renderLeaderboard();
    renderDashboard();
}

// Students View
async function renderStudents() {
    const students = await Store.getStudents();
    const tbody = document.getElementById('studentsTableBody');
    tbody.innerHTML = '';

    students.forEach(async s => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-color)';
        tr.innerHTML = `
            <td style="padding: 1rem; font-family: monospace;">${s.id}</td>
            <td style="padding: 1rem; font-weight: 500;">${s.name}</td>
            <td style="padding: 1rem; text-align: right;">
                <button class="btn btn-secondary text-sm" onclick="notifyStudent('${s.id}')">Send Notification</button>
                <button class="btn btn-danger text-sm" onclick="removeStudent('${s.id}')">Remove</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function notifyStudent(id) {
    const msg = prompt("Enter notification message for this student:");
    if (msg && msg.trim()) {
        await Store.addNotification(id, msg.trim());
        alert("Notification sent");
    }
}

async function removeStudent(id) {
    if (confirm("Remove student? This will permanently delete their account, their registrations, and their notifications.")) {
        try {
            await Store.deleteStudent(id);
            renderStudents();
            renderRegistrations(); // Instantly update the registrations table
            renderDashboard(); // Update counts
        } catch (err) {
            alert(err.message || 'Failed to remove student');
        }
    }
}

// Notifications
async function checkNotifications() {
    const notifs = await Store.getAdminNotifications();
    const unread = notifs.filter(n => !n.read).length;

    if (unread > 0) {
        document.getElementById('notifBadge').style.display = 'block';
    } else {
        document.getElementById('notifBadge').style.display = 'none';
    }

    const list = document.getElementById('notifList');
    list.innerHTML = '';

    if (notifs.length === 0) {
        list.innerHTML = '<div class="text-sm text-gray p-4 text-center">No new notifications</div>';
    } else {
        // Sort newest first
        notifs.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)).forEach(async (n) => {
            const item = document.createElement('a');
            item.href = "#";
            item.className = `notif-item ${n.read ? '' : 'unread'}`;

            // Determine Icon based on type (default to info)
            let iconSvg = '';
            let iconClass = 'info';

            if (n.type === 'action') {
                iconClass = 'action';
                iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;
            } else if (n.type === 'task') {
                iconClass = 'task';
                iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
            } else {
                iconClass = 'info';
                iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`;
            }

            const timeString = (() => {
                let sentDate = new Date(n.createdAt || n.date);
                if (isNaN(sentDate.getTime())) sentDate = new Date();

                const diffMs = new Date() - sentDate;
                const diffSecs = Math.floor(diffMs / 1000);
                const diffMins = Math.floor(diffSecs / 60);
                const diffHrs = Math.floor(diffMins / 60);
                const diffDays = Math.floor(diffHrs / 24);

                if (diffMins < 1) return 'Just now';
                if (diffHrs < 1) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
                if (diffDays < 1) return `${diffHrs} hour${diffHrs > 1 ? 's' : ''} ago`;
                return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            })();

            item.innerHTML = `
                <div class="notif-icon-wrapper notif-icon ${iconClass}">
                    ${iconSvg}
                </div>
                <div class="notif-content">
                    <div class="notif-header" style="font-weight: bold;">${n.title || 'System'}</div>
                    <div class="notif-title" style="display: none;"></div>
                    <div class="notif-desc">${n.message}</div>
                    <div class="notif-time">${timeString}</div>
                </div>
            `;

            // Prevent default link behavior
            item.onclick = (e) => e.preventDefault();

            list.appendChild(item);
        });
    }
}

// Toggle Notif Dropdown
document.getElementById('notifBtn').addEventListener('click', async () => {
    const dropdown = document.getElementById('notifDropdown');
    dropdown.classList.toggle('hidden');

    // Mark as read when opened
    if (!dropdown.classList.contains('hidden')) {
        await Store.markNotificationsRead();
        document.getElementById('notifBadge').style.display = 'none';
        // Visually mark items as read
        document.querySelectorAll('#notifList .notif-item').forEach(el => el.classList.remove('unread'));
    }
});

// Click outside to close notifs
document.addEventListener('click', async (e) => {
    if (!e.target.closest('#notifBtn') && !e.target.closest('#notifDropdown')) {
        document.getElementById('notifDropdown').classList.add('hidden');
    }
});

// Profile View
async function renderProfile() {
    const card = document.getElementById('adminProfileCard');
    if (!card) return;

    // Use placeholder admin info since admin user isn't fully robust in this mock
    const adminUser = {
        name: 'Admin User',
        role: 'Administrator',
        email: 'admin@college.edu'
    };

    const currentUser = Store.getCurrentUser();
    if (currentUser && currentUser.role === 'admin') {
        adminUser.name = currentUser.name || currentUser.username || adminUser.name;
        adminUser.email = currentUser.email || adminUser.email;
        adminUser.profilePicture = currentUser.profilePicture || null;
    }

    card.innerHTML = `
        <div class="profile-header">
            <div class="profile-avatar" style="${adminUser.profilePicture ? 'overflow:hidden;' : ''}">
                ${adminUser.profilePicture
            ? `<img src="${adminUser.profilePicture}" alt="Profile" style="width:100%; height:100%; object-fit:cover;">`
            : adminUser.name.charAt(0).toUpperCase()}
            </div>
            <div class="profile-details">
                <h2>${adminUser.name}</h2>
                <p>${adminUser.role} Account</p>
            </div>
        </div>
        
        <div class="profile-info-row">
            <div class="profile-info-label">Access Level</div>
            <div class="profile-info-value">Full System Access</div>
        </div>
        <div class="profile-info-row">
            <div class="profile-info-label">Full Name</div>
            <div class="profile-info-value">${adminUser.name}</div>
        </div>
        <div class="profile-info-row">
            <div class="profile-info-label">Email Address</div>
            <div class="profile-info-value">${adminUser.email}</div>
        </div>
        <div class="flex justify-end mt-8">
            <button class="btn btn-secondary" style="color: var(--danger); border-color: var(--danger);" onclick="Store.logout()">Logout out of Account</button>
        </div>
    `;
}

// Initial render
document.addEventListener('DOMContentLoaded', async () => {
    renderDashboard();
    checkNotifications();
});
