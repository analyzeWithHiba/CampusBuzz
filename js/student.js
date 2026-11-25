// student.js - Student Portal Logic

let currentUser = null;

// Protect Route
function checkAuth() {
    currentUser = Store.getCurrentUser();
    if (!currentUser || currentUser.role !== 'student') {
        window.location.href = 'index.html';
        return false;
    }

    // Set Header
    updateHeaderAvatar();

    // Pre-fill Registration Form readonly fields
    document.getElementById('regFormName').value = currentUser.name;
    document.getElementById('regFormId').value = currentUser.id;

    return true;
}

if (!checkAuth()) throw new Error('Not authorized');

// Helper to Update Header Avatar
async function updateHeaderAvatar() {
    currentUser = Store.getCurrentUser();
    const avatarDiv = document.getElementById('studentInitial');
    if (avatarDiv) {
        if (currentUser && currentUser.profilePicture) {
            avatarDiv.innerHTML = `<img src="${currentUser.profilePicture}" alt="Profile" style="width:100%; height:100%; object-fit:cover;">`;
        } else {
            avatarDiv.innerHTML = currentUser ? currentUser.name.charAt(0).toUpperCase() : 'S';
        }
    }
}

async function updateDashboardStats() {
    if (!currentUser) return;
    const allEvents = await Store.getEvents();
    const myRegs = (await Store.getRegistrations()).filter(r => r.studentId === currentUser.uid);
    const statTotalEvents = document.getElementById('statTotalEvents');
    const statRegisteredCount = document.getElementById('statRegisteredCount');

    if (statTotalEvents) {
        const upcoming = allEvents.filter(e => Store.getEventDynamicStatus(e) !== 'Completed').length;
        statTotalEvents.textContent = upcoming;
    }
    if (statRegisteredCount) {
        statRegisteredCount.textContent = myRegs.length;
    }
}

// Global View Switcher
async function switchTab(tabId) {
    // Hide all sections
    document.querySelectorAll('.section-view').forEach(s => s.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');

    // Manage visually active tabs (desktop row)
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    if (tabId === 'eventsTab') document.getElementById('tab-events').classList.add('active');
    if (tabId === 'calendarTab') document.getElementById('tab-calendar').classList.add('active');
    if (tabId === 'myRegsTab') document.getElementById('tab-myregs').classList.add('active');
    if (tabId === 'resultsTab') document.getElementById('tab-results').classList.add('active');

    // Sidebar sync
    document.querySelectorAll('.sidebar .nav-item').forEach(n => n.classList.remove('active'));
    const links = document.querySelectorAll('.sidebar .nav-item');
    if (tabId === 'eventsTab') links[0].classList.add('active');
    if (tabId === 'myRegsTab') links[1].classList.add('active');
    if (tabId === 'resultsTab') links[2].classList.add('active');
    if (tabId === 'calendarTab') links[3].classList.add('active');

    // Toggle Main Tabs visibility
    const mainTabs = document.getElementById('mainTabs');
    if (mainTabs) {
        if (tabId === 'profileTab') {
            mainTabs.style.display = 'none';
        } else {
            mainTabs.style.display = '';
        }
    }

    // Call specific renders
    if (tabId === 'eventsTab') renderEventsGrid();
    if (tabId === 'myRegsTab') renderMyRegistrations();
    if (tabId === 'resultsTab') renderResults();

    updateDashboardStats();
}

// Global Modals
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// Init Filters
async function initFilters() {
    const deptSelect = document.getElementById('filterDept');
    deptSelect.innerHTML = '<option value="all">All Departments</option>';
    (await Store.getDepartments()).forEach(async d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = d.name;
        deptSelect.appendChild(opt);
    });

    const typeSelect = document.getElementById('filterType');
    typeSelect.innerHTML = '<option value="all">All Types</option>';

    // Populate with Event Statuses instead of Types
    const statusOpts = [
        { value: 'upcoming', label: 'Upcoming events' },
        { value: 'completed', label: 'Completed events' }
    ];
    statusOpts.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.value;
        opt.textContent = t.label;
        typeSelect.appendChild(opt);
    });

    ['searchEvents', 'filterDept', 'filterType'].forEach(async id => {
        document.getElementById(id).addEventListener('input', renderEventsGrid);
        document.getElementById(id).addEventListener('change', renderEventsGrid);
    });
}

async function clearFilters() {
    document.getElementById('searchEvents').value = '';
    document.getElementById('filterDept').value = 'all';
    document.getElementById('filterType').value = 'all';
    await renderEventsGrid();
}

// Render Events Catalog
async function renderEventsGrid() {
    const search = document.getElementById('searchEvents').value.toLowerCase();
    const deptFilter = document.getElementById('filterDept').value;
    const typeFilter = document.getElementById('filterType').value;

    const allEvents = await Store.getEvents();
    const depts = await Store.getDepartments();
    const allRegs = await Store.getRegistrations();
    const myRegs = allRegs.filter(r => r.studentId === currentUser.uid);

    let filtered = allEvents.filter(e => {
        const matchSearch = e.title.toLowerCase().includes(search) || e.description.toLowerCase().includes(search);
        const deptId = e.department ? (e.department.id || e.department._id || e.department) : null;
        const matchDept = deptFilter === 'all' || String(deptId) === String(deptFilter);

        const status = Store.getEventDynamicStatus(e);
        let matchType = true;
        if (typeFilter === 'upcoming') {
            matchType = status === 'Upcoming' || status === 'Ongoing' || status === 'Registration Open' || status === 'Registration Closed';
        } else if (typeFilter === 'completed') {
            matchType = status === 'Completed' || status === 'Result Published';
        }

        return matchSearch && matchDept && matchType;
    });

    // Sort events by status (Ongoing -> Upcoming -> Completed) then date ascending
    filtered.sort((a, b) => {
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

    // Update filter tags
    const activeFilters = document.getElementById('activeFilters');
    const tagsDiv = document.getElementById('filterTags');
    const tags = [];
    if (deptFilter !== 'all') tags.push(depts.find(d => String(d.id) === String(deptFilter))?.name || 'Department');
    if (typeFilter !== 'all') {
        tags.push(typeFilter === 'upcoming' ? 'Upcoming Events' : 'Completed Events');
    }
    if (search) tags.push(`"${search}"`);

    if (tags.length > 0) {
        activeFilters.style.display = 'flex';
        tagsDiv.innerHTML = tags.map(t => `<span class="badge badge-blue">${t}</span>`).join('');
    } else {
        activeFilters.style.display = 'none';
        tagsDiv.innerHTML = '';
    }

    const grid = document.getElementById('studentEventsGrid');
    grid.innerHTML = '';

    if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1;" class="text-center text-gray py-8">No events match your criteria.</div>';
        return;
    }

    filtered.forEach(async evt => {
        const deptId = evt.department ? (evt.department.id || evt.department._id || evt.department) : null;
        const dept = depts.find(d => String(d.id) === String(deptId));
        const isRegistered = myRegs.find(r => String(r.eventId) === String(evt.id));

        const currentRegs = allRegs.filter(r => String(r.eventId) === String(evt.id) && r.status !== 'Rejected');
        const isFull = evt.maxParticipants && currentRegs.length >= evt.maxParticipants;

        const status = Store.getEventDynamicStatus(evt);
        let badgeStyle = 'background-color: var(--tag-teal-bg); color: var(--tag-teal);';
        if (status === 'Ongoing') badgeStyle = 'background-color: var(--tag-orange-bg); color: var(--tag-orange);';
        if (status === 'Completed') badgeStyle = 'background-color: var(--border-color); color: var(--text-gray);';

        const desc = evt.description || 'Join us for this exciting event!';
        const isLong = desc.length > 100;
        const descHTML = isLong ? `
            <div class="mb-4">
                <p class="text-sm text-gray flex-grow clamp-2" id="desc-${evt.id}" style="transition: all 0.2s ease;">${desc}</p>
                <a href="javascript:void(0)" onclick="toggleDesc('${evt.id}')" id="btn-desc-${evt.id}" style="font-size: 13px; color: var(--primary-blue); font-weight: 500;">Read More</a>
            </div>
        ` : `
            <p class="text-sm text-gray mb-4 flex-grow">${desc}</p>
        `;

        const card = document.createElement('div');
        card.className = 'event-card';

        let actionHTML = '';
        if (isRegistered) {
            actionHTML = `<button class="btn w-full" style="width:100%; pointer-events:none; border: 1px solid var(--success); color: var(--success); background-color: var(--success-bg); font-weight: 600;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-2" style="margin-right: 4px; display:inline-block; vertical-align:text-bottom;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Registered</button>`;
        } else if (status === 'Completed') {
            actionHTML = `<button class="btn w-full" style="width:100%; pointer-events:none; border: 1px solid var(--border-color); color: var(--text-gray); background-color: var(--sidebar-bg); font-weight: 600;">
                        Event Completed</button>`;
        } else if (isFull) {
            actionHTML = `<button class="btn btn-secondary w-full" style="width:100%; pointer-events:none; border-color: var(--danger); color: var(--danger);">Registration Closed</button>`;
        } else {
            actionHTML = `<button class="btn btn-primary" style="width:100%" onclick="openRegistrationModal('${evt.id}')">Register</button>`;
        }

        const bannerHTML = evt.bannerImage ? `<img src="${evt.bannerImage}" alt="Event Banner" class="event-banner">` : '';

        card.innerHTML = `
            ${bannerHTML}
            <div class="flex flex-col gap-2 mb-4">
                <div class="flex flex-wrap gap-2">
                    <span class="badge" style="background-color: var(--tag-blue-bg); color: var(--tag-blue);">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                        ${dept ? dept.name : 'College Event'}
                    </span>
                    <span class="badge" style="background-color: var(--tag-orange-bg); color: var(--tag-orange);">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 21h8"></path><path d="M12 17v4"></path><path d="M7 4h10v6c0 3-4 7-4 7s-4-4-4-7V4z"></path></svg>
                        ${evt.type}
                    </span>
                    <span class="badge" style="${badgeStyle}">${status}</span>
                </div>
            </div>
            
            <h3 class="text-xl font-bold mb-2">${evt.title}</h3>
            ${descHTML}
            
            <div class="text-sm text-gray flex flex-col gap-2 mb-4">
                <div class="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    ${new Date(evt.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
                <div class="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    ${evt.time}
                </div>
                <div class="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    ${evt.venue}
                </div>
                ${evt.maxParticipants ? `<div class="flex items-center gap-2" style="color: ${isFull ? 'var(--danger)' : 'var(--text-gray)'}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    ${currentRegs.length}/${evt.maxParticipants} Spots Filled
                </div>` : ''}
            </div>
            
            <div class="mt-auto pt-4 border-t" style="border-top: 1px solid var(--border-color);">
                ${actionHTML}
            </div>
        `;
        grid.appendChild(card);
    });
}

// Registration Flow
async function openRegistrationModal(eventId) {
    const evt = (await Store.getEvents()).find(e => e.id === eventId);
    if (!evt) return;

    document.getElementById('regFormEventId').value = eventId;
    document.getElementById('regEventTitle').textContent = evt.title;
    document.getElementById('regEventType').textContent = evt.type;
    document.getElementById('regEventDate').textContent = new Date(evt.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    document.getElementById('regEventTime').textContent = evt.time;
    document.getElementById('regEventVenue').textContent = evt.venue;

    try {
        const fullProfile = await Store.getMyProfile();
        document.getElementById('regFormName').value = fullProfile.name || currentUser.name;
        document.getElementById('regFormId').value = fullProfile.uid || currentUser.uid || '';
        document.getElementById('regFormEmail').value = fullProfile.email || '';
        document.getElementById('regFormDept').value = fullProfile.department || '';
        document.getElementById('regFormYear').value = fullProfile.yearOfStudy || '';
    } catch (e) {
        console.error("Failed to prepopulate register modal fields", e);
    }

    openModal('registerModal');
}

document.getElementById('studentRegistrationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        eventId: document.getElementById('regFormEventId').value,
        studentId: currentUser.uid,
        studentName: currentUser.name,
        email: document.getElementById('regFormEmail').value
    };

    const result = await Store.registerForEvent(data);

    if (result && result.success === false) {
        alert(result.message || 'Registration failed.');
        closeModal('registerModal');
    } else {
        closeModal('registerModal');
        // Refresh view
        await Store.addNotification(currentUser.id, "You successfully registered for an event.");
        checkNotifications();
        renderEventsGrid();

        // Switch to my regs implicitly (optional, but good UX)
        switchTab('myRegsTab');
    }

    // Clear dynamic inputs
    document.getElementById('regFormEmail').value = '';
    document.getElementById('regFormPhone').value = '';
});

// My Registrations View
async function renderMyRegistrations() {
    const list = document.getElementById('studentRegsList');
    list.innerHTML = '';

    const myRegs = (await Store.getRegistrations()).filter(r => r.studentId === currentUser.uid);
    const events = await Store.getEvents();

    // Sort registrations by event status then date ascending
    myRegs.sort((a, b) => {
        const evtA = events.find(e => String(e.id) === String(a.eventId));
        const evtB = events.find(e => String(e.id) === String(b.eventId));
        if (!evtA || !evtB) return 0;

        const statusWeight = (evt) => {
            const s = Store.getEventDynamicStatus(evt);
            if (s === 'Ongoing') return 1;
            if (s === 'Upcoming') return 2;
            return 3;
        };
        const weightDiff = statusWeight(evtA) - statusWeight(evtB);
        if (weightDiff !== 0) return weightDiff;
        return new Date(evtA.date) - new Date(evtB.date);
    });

    if (myRegs.length === 0) {
        list.innerHTML = '<div class="card text-center text-gray py-8">You have not registered for any events yet.</div>';
        return;
    }

    myRegs.forEach(async r => {
        const evt = events.find(e => String(e.id) === String(r.eventId));
        if (!evt) return; // Skip if event deleted

        const card = document.createElement('div');
        card.className = 'card flex justify-between items-center';

        let color = 'var(--text-gray)';
        if (r.status === 'Registered') color = 'var(--primary-blue)';
        if (r.status === 'Attended') color = 'var(--success)';
        if (r.status === 'Result Published') color = 'var(--warning)';

        card.innerHTML = `
            <div>
                <h3 class="font-bold text-lg">${evt.title}</h3>
                <div class="text-sm text-gray mt-1">${new Date(evt.date).toLocaleDateString()} | ${evt.type}</div>
            </div>
            <div class="text-right">
                <div class="font-bold mb-1" style="color: ${color};">${r.status}</div>
                <button class="btn btn-secondary btn-sm text-sm" onclick="showEventDetails('${r.eventId}', '${r.id}')">View Details</button>
            </div>
        `;
        list.appendChild(card);
    });
}

async function showEventDetails(eventId, regId) {
    const evt = (await Store.getEvents()).find(e => e.id === eventId);
    const reg = (await Store.getRegistrations()).find(r => r.id === regId);
    if (!evt || !reg) return;

    document.getElementById('detailTitle').textContent = evt.title;
    document.getElementById('detailDesc').textContent = evt.description;

    let color = 'var(--text-dark)';
    if (reg.status === 'Registered') color = 'var(--primary-blue)';
    if (reg.status === 'Attended') color = 'var(--success)';

    const statusSpan = document.getElementById('detailStatus');
    statusSpan.textContent = reg.status;
    statusSpan.style.color = color;

    const resultDiv = document.getElementById('detailResult');
    if (reg.status === 'Result Published' && reg.result) {
        resultDiv.classList.remove('hidden');
        document.getElementById('detailResultText').textContent = reg.result;
    } else {
        resultDiv.classList.add('hidden');
    }

    openModal('eventDetailModal');
}

// Global state for results to allow sorting
let currentEventResults = [];
let currentResultSort = { key: 'score', desc: true };

async function renderResults() {
    const select = document.getElementById('studentResultEventSelect');
    const contentDiv = document.getElementById('studentResultsContent');

    const allEvents = await Store.getEvents();
    const allResults = await Store.getResults();

    // We want events that actually exist, their global resultStatus is Published,
    // AND they have at least one result in the results collection.
    const validEvents = allEvents.filter(e => {
        if ((e.resultStatus || 'Published') !== 'Published') return false;

        // Check if there's any result for this event
        const hasResults = allResults.some(res => {
            const resEventIdStr = String(res.eventid?._id || res.eventid?.id || res.eventid).trim();
            return resEventIdStr === String(e.id).trim();
        });

        return hasResults;
    });

    if (validEvents.length === 0) {
        select.innerHTML = '<option value="">No published results available</option>';
        select.disabled = true;
        contentDiv.style.display = 'none';
        const errorDiv = document.getElementById('studentResultsError');
        if (errorDiv) errorDiv.style.display = 'none';
        return;
    }

    select.disabled = false;

    // Check if current selection is valid, otherwise set to first
    let currentVal = select.value;
    if (!validEvents.find(e => e.id === currentVal)) {
        currentVal = validEvents[0].id;
    }

    select.innerHTML = validEvents.map(e => `<option value="${e.id}">${e.title}</option>`).join('');
    select.value = currentVal;

    renderSpecificEventResults();
}

async function renderSpecificEventResults() {
    const eventId = document.getElementById('studentResultEventSelect').value;
    const contentDiv = document.getElementById('studentResultsContent');
    const errorDiv = document.getElementById('studentResultsError');

    if (errorDiv) errorDiv.style.display = 'none';
    contentDiv.style.display = 'none';

    if (!eventId) {
        return;
    }

    const evt = (await Store.getEvents()).find(e => String(e.id) === String(eventId));
    if (!evt) return;

    // Get ALL published regs for this event 
    let eventRegs = (await Store.getRegistrations()).filter(r => String(r.eventId) === String(eventId) && r.status === 'Result Published');

    // Fetch Results and merge them in
    const allResults = await Store.getResults();
    console.log("student.js - eventId selected:", eventId);
    console.log("student.js - eventRegs:", eventRegs);
    console.log("student.js - allResults:", allResults);
    currentEventResults = eventRegs.map(r => {
        // Match Result by eventId and either userid object ID or admission number (uid)
        const resObj = allResults.find(res => {
            const resEventIdStr = String(res.eventid?._id || res.eventid?.id || res.eventid).trim();
            const matchEvent = resEventIdStr === String(eventId).trim();

            // Result schema stores 'userid', registration has 'studentId' (uid) and reference 'userid'
            const rUidStr = String(r.studentId).trim(); // This is admission number (e.g. CS2023111)
            const rUserIdStr = String(r.userid?._id || r.userid?.id || r.userid).trim(); // This is the mongo Object ID

            const resUserIdStr = String(res.userid?._id || res.userid?.id || res.userid).trim(); // mongo Object ID
            const resUidStr = String(res.userid?.uid || '').trim(); // admission number

            // Match backend Object ID or the student admission number if available
            const matchUser = (resUserIdStr === rUserIdStr && resUserIdStr !== 'undefined') ||
                (resUidStr && resUidStr === rUidStr);

            return matchEvent && matchUser;
        });

        if (resObj) {
            r.score = resObj.score;
            r.position = resObj.position;
            r.result = resObj.remarks; // Map backend 'remarks' to frontend 'result'
            // Use Admin's calculated rank if provided, otherwise fallback to score sorting
            if (resObj.position && !isNaN(parseInt(resObj.position))) {
                r.calculatedRank = parseInt(resObj.position);
            }
        }
        return r;
    });

    // Calculate global ranks for all participants based on score if not explicitly set by admin
    currentEventResults.sort((a, b) => {
        if (a.calculatedRank && b.calculatedRank) return a.calculatedRank - b.calculatedRank;
        return (b.score || 0) - (a.score || 0);
    });

    currentEventResults.forEach((r, idx) => {
        if (!r.calculatedRank) r.calculatedRank = idx + 1;
    });

    // Get the specific student's reg with robust fallback matching
    const myReg = currentEventResults.find(r => {
        const matchUid = r.studentId && currentUser.uid && String(r.studentId).trim() === String(currentUser.uid).trim();

        const rUserIdStr = String(r.userid?._id || r.userid?.id || r.userid).trim(); // Mongo object ID
        const cUserIdStr = String(currentUser._id || currentUser.id).trim(); // Mongo object ID

        const matchObjId = rUserIdStr && cUserIdStr && rUserIdStr !== 'undefined' && cUserIdStr !== 'undefined' && rUserIdStr === cUserIdStr;
        return matchUid || matchObjId;
    });

    // We no longer block non-participants from seeing results.
    // They won't have a highlight card and stats will show '-' for their own score.
    // If the whole event has no winners, the table will show "No winners announced".

    // Render Page Header
    renderResultPageHeader(evt, myReg);

    // Render Stat Cards
    renderResultStatCards(evt, myReg, currentEventResults);

    // Render 1: Rank Highlight
    renderRankHighlightCard(myReg, evt);

    // Render 3: Full Table
    // Init sort state so that calling sort toggles it to ascending by rank (desc: false)
    currentResultSort = { key: 'rank', desc: true };
    sortResultTable('rank');

    contentDiv.style.display = 'block';
}

async function renderResultPageHeader(evt, myReg) {
    const headerDiv = document.getElementById('resultPageHeader');

    headerDiv.innerHTML = `
        <div>
            <h1 class="text-3xl font-bold m-0" style="color: var(--text-dark); margin-bottom: 0.5rem;">${evt.title}</h1>
            <p class="text-gray m-0 text-sm flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                ${new Date(evt.date).toLocaleDateString()}
            </p>
        </div>
    `;
}

async function renderResultStatCards(evt, myReg, allRegs) {
    const statsDiv = document.getElementById('resultStatCards');

    const rankText = myReg && myReg.calculatedRank ? `#${myReg.calculatedRank}` : '-';
    let iconHTML = rankText;
    if (myReg && myReg.calculatedRank === 1) iconHTML = '🥇 1st';
    else if (myReg && myReg.calculatedRank === 2) iconHTML = '🥈 2nd';
    else if (myReg && myReg.calculatedRank === 3) iconHTML = '🥉 3rd';

    const participantsCount = allRegs.length;
    const scoreText = myReg && myReg.score !== null ? myReg.score : '-';
    let statusBadge = myReg ? '<span style="color: var(--success); font-weight: bold;">Participated</span>' : '<span style="color: var(--text-gray); font-weight: bold;">Not Participated</span>';

    statsDiv.innerHTML = `
        <div class="card" style="padding: 1.5rem; border-radius: 1rem; display: flex; flex-direction: column; justify-content: center;">
            <div class="text-xs text-gray font-bold uppercase tracking-wider mb-2">Total Participants</div>
            <div class="text-2xl font-black" style="color: var(--text-dark); line-height: 1;">${participantsCount}</div>
        </div>
        <div class="card" style="padding: 1.5rem; border-radius: 1rem; display: flex; flex-direction: column; justify-content: center;">
            <div class="text-xs text-gray font-bold uppercase tracking-wider mb-2">Your Score</div>
            <div class="text-2xl font-black" style="color: var(--primary-blue); line-height: 1;">${scoreText}</div>
        </div>
        <div class="card" style="padding: 1.5rem; border-radius: 1rem; display: flex; flex-direction: column; justify-content: center;">
            <div class="text-xs text-gray font-bold uppercase tracking-wider mb-2">Your Rank</div>
            <div class="text-2xl font-black" style="color: var(--text-dark); line-height: 1;">${iconHTML}</div>
        </div>
        <div class="card" style="padding: 1.5rem; border-radius: 1rem; display: flex; flex-direction: column; justify-content: center;">
            <div class="text-xs text-gray font-bold uppercase tracking-wider mb-2">Event Status</div>
            <div class="text-lg" style="line-height: 1;">${statusBadge}</div>
        </div>
    `;
}

async function renderRankHighlightCard(myReg, evt) {
    const highlightDiv = document.getElementById('resultSectionHighlight');

    if (!myReg || !myReg.calculatedRank) {
        highlightDiv.style.display = 'none';
        return;
    }

    // Ensure display is block/flex if it was hidden
    highlightDiv.style.display = 'flex';

    const rank = myReg.calculatedRank;
    let icon = '🎯';
    let title = 'Participant';
    let color = 'var(--primary-blue)';
    let bgGradient = 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.02) 100%)';

    if (rank === 1) { icon = '🥇'; title = 'First Place'; color = '#fbbf24'; bgGradient = 'linear-gradient(135deg, rgba(251,191,36,0.1) 0%, rgba(251,191,36,0.02) 100%)'; }
    else if (rank === 2) { icon = '🥈'; title = 'Second Place'; color = '#94a3b8'; bgGradient = 'linear-gradient(135deg, rgba(148,163,184,0.1) 0%, rgba(148,163,184,0.02) 100%)'; }
    else if (rank === 3) { icon = '🥉'; title = 'Third Place'; color = '#b45309'; bgGradient = 'linear-gradient(135deg, rgba(180,83,9,0.1) 0%, rgba(180,83,9,0.02) 100%)'; }

    highlightDiv.style.background = bgGradient;

    let rankStr = rank + (['st', 'nd', 'rd'][((rank + 90) % 100 - 10) % 10 - 1] || 'th');
    let remarks = myReg.result && !myReg.result.includes('Place') ? myReg.result : 'No additional remarks provided by the event coordinator.';

    let medalSizing = rank <= 3 ? '6rem' : '4rem';

    highlightDiv.innerHTML = `
        <!-- Left Side: Detail Card -->
        <div class="card" style="background: white; border: 2px solid var(--border-color); border-radius: 12px; padding: 2rem; width: 48%; box-shadow: 0 10px 25px rgba(0,0,0,0.05); z-index: 1;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; border-bottom: 1px dashed var(--border-color); padding-bottom: 1rem;">
                <span style="font-size: 2rem;">${icon}</span>
                <span style="font-size: 1.5rem; font-weight: bold; color: var(--text-dark);">Rank: ${rankStr}</span>
            </div>
            <div style="font-size: 1.1rem; color: var(--text-dark); margin-bottom: 0.75rem;">
                <span style="color: var(--text-gray); font-weight: 600;">Student:</span> ${currentUser.name}
            </div>
            <div style="font-size: 1.1rem; color: var(--text-dark); margin-bottom: 1.5rem;">
                <span style="color: var(--text-gray); font-weight: 600;">ID:</span> ${currentUser.uid}
            </div>
            
            <div style="background: var(--bg-light); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem;">
                <div style="font-weight: bold; color: var(--text-dark); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                    💡 Remarks:
                </div>
                <div style="color: var(--text-gray); font-size: 0.95rem; line-height: 1.5;">
                    ${remarks}
                </div>
            </div>
        </div>

        <!-- Right Side: Big Medal & Title -->
        <div style="width: 48%; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; z-index: 1;">
            <div style="font-size: ${medalSizing}; line-height: 1; filter: drop-shadow(0 10px 15px rgba(0,0,0,0.1)); margin-bottom: 0.5rem;">${icon}</div>
            <div class="text-3xl font-bold" style="color: ${color}; line-height: 1.2; margin-bottom: 1rem;">
                ${rank <= 3 ? rankStr + ' Place' : title}
            </div>
            <div class="text-gray mt-2 font-medium" style="font-size: 1.15rem; max-width: 90%;">${evt.title}</div>
        </div>
        
        <!-- Background watermark -->
        <div style="position: absolute; top: -40px; right: -40px; font-size: 24rem; opacity: 0.03; line-height: 1; pointer-events: none;">${icon}</div>
    `;
}

async function renderResultTableRows(regs) {
    const tbody = document.getElementById('resultSectionTableBody');
    tbody.innerHTML = '';

    if (regs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray">No records found.</td></tr>';
        return;
    }

    // We want to show all results that the admin actually posted for this event.
    // The admin explicitly adds results one-by-one, so any result here is an "official ranking/score"
    // that the admin wanted published. We do not filter by rank <= 3 anymore.
    const winners = regs; // Rename kept minimally invasive for existing logic

    winners.forEach(async r => {

        let rankDisplay = r.calculatedRank;
        if (r.calculatedRank === 1) rankDisplay = '🥇 1';
        if (r.calculatedRank === 2) rankDisplay = '🥈 2';
        if (r.calculatedRank === 3) rankDisplay = '🥉 3';

        const isMe = r.studentId === currentUser.uid;
        const rowBg = isMe ? 'background-color: rgba(139, 92, 246, 0.05);' : '';

        const tr = document.createElement('tr');
        tr.style.cssText = `border-bottom: 1px solid var(--border-color); ${rowBg}`;
        if (isMe) tr.style.fontWeight = '500';

        let deptName = r.studentDept || 'Unknown';

        tr.innerHTML = `
            <td style="padding: 1rem; color: var(--text-dark); font-weight: bold;">${rankDisplay}</td>
            <td style="padding: 1rem; color: var(--text-dark);">
                ${r.studentName}
                ${isMe ? '<span class="badge" style="background-color: var(--primary-blue); color: white; padding: 0.1rem 0.3rem; margin-left: 0.5rem; font-size: 0.6rem;">YOU</span>' : ''}
            </td>
            <td style="padding: 1rem; color: var(--text-gray);">${deptName}</td>
            <td style="padding: 1rem; color: var(--primary-blue); font-weight: bold;">${r.score !== null ? r.score : '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function filterResultTable() {
    const search = document.getElementById('resultTableSearch').value.toLowerCase();

    // We show all results posted by the admin
    const winners = currentEventResults;

    const filtered = winners.filter(r => {
        const deptName = r.studentDept || 'Unknown';
        const studentName = r.studentName || 'Unknown Student';
        return studentName.toLowerCase().includes(search) ||
            deptName.toLowerCase().includes(search);
    });
    renderResultTableRows(filtered);
}

async function sortResultTable(key) {
    if (currentResultSort.key === key) {
        currentResultSort.desc = !currentResultSort.desc;
    } else {
        currentResultSort.key = key;
        currentResultSort.desc = key === 'score' ? true : false; // Default desc for score, asc for rank
    }

    const search = document.getElementById('resultTableSearch').value.toLowerCase();

    // Only sort and search among all posted results
    const winners = currentEventResults;

    let displayRegs = winners.filter(r => {
        const deptName = r.studentDept || 'Unknown';
        const studentName = r.studentName || 'Unknown Student';
        return studentName.toLowerCase().includes(search) ||
            deptName.toLowerCase().includes(search);
    });

    displayRegs.sort((a, b) => {
        let valA, valB;
        if (key === 'score') {
            valA = a.score || 0;
            valB = b.score || 0;
        } else if (key === 'rank') {
            valA = a.calculatedRank || 9999;
            valB = b.calculatedRank || 9999;
        }

        if (valA < valB) return currentResultSort.desc ? 1 : -1;
        if (valA > valB) return currentResultSort.desc ? -1 : 1;
        return 0;
    });

    renderResultTableRows(displayRegs);
}

// Notifications
async function checkNotifications() {
    const notifs = await Store.getStudentNotifications(currentUser.id);
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

// Calendar Logic
let currentDate = new Date();
let selectedDate = new Date();

async function renderCalendar() {
    const monthYearDisplay = document.getElementById('calendarMonthYear');
    const calendarGrid = document.getElementById('calendarGrid');

    const events = await Store.getEvents(); // Fetch data early to prevent UI flash clearing

    calendarGrid.innerHTML = '';

    // Set Header
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    monthYearDisplay.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

    // Add Day Headers
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        calendarGrid.appendChild(header);
    });

    const firstDayIndex = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

    // Fill empty days before 1st
    for (let i = 0; i < firstDayIndex; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        calendarGrid.appendChild(emptyDay);
    }

    // Fill days
    for (let i = 1; i <= lastDay; i++) {
        const dayCell = document.createElement('div');
        const loopDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);

        let className = 'calendar-day';
        if (loopDate.toDateString() === selectedDate.toDateString()) {
            className += ' active';
        }

        dayCell.className = className;

        // Find events for this day
        const dayEvents = events.filter(e => new Date(e.date).toDateString() === loopDate.toDateString());

        let eventsHTML = '';
        if (dayEvents.length > 0) {
            eventsHTML = '<div class="calendar-events-container">';
            // Show up to 3 events as chips
            dayEvents.slice(0, 3).forEach(e => {
                let chipColor = 'var(--primary-blue)';
                if (e.type === 'Competition') chipColor = 'var(--tag-orange)';
                else if (e.type === 'Cultural') chipColor = 'var(--tag-teal)';

                eventsHTML += `<div class="calendar-event-chip" style="background-color: ${chipColor};" title="${e.title}">${e.title}</div>`;
            });
            if (dayEvents.length > 3) {
                eventsHTML += `<div class="calendar-event-more">+${dayEvents.length - 3} More</div>`;
            }
            eventsHTML += '</div>';
        }

        dayCell.innerHTML = `
            <span class="calendar-date">${i}</span>
            ${eventsHTML}
        `;

        dayCell.onclick = () => {
            selectedDate = loopDate;
            renderCalendar(); // Re-render to update active state
            renderCalendarEvents(loopDate);
        };

        calendarGrid.appendChild(dayCell);
    }
}

async function changeMonth(delta) {
    currentDate.setMonth(currentDate.getMonth() + delta);
    renderCalendar();
}

async function renderCalendarEvents(date) {
    const grid = document.getElementById('calendarEventsGrid');
    const title = document.getElementById('calendarEventsTitle');
    const events = (await Store.getEvents()).filter(e => new Date(e.date).toDateString() === date.toDateString());
    const depts = await Store.getDepartments();
    const allRegs = await Store.getRegistrations();
    const myRegs = allRegs.filter(r => r.studentId === currentUser.uid);

    grid.innerHTML = '';

    if (events.length === 0) {
        title.innerHTML = `Events on ${date.toLocaleDateString()}`;
        grid.innerHTML = '<div style="grid-column: 1/-1;" class="text-center text-gray py-8">No events on this date.</div>';
        return;
    }

    title.innerHTML = `${events.length} Event(s) on ${date.toLocaleDateString()}`;

    // Reuse event card logic
    events.forEach(evt => {
        const deptId = evt.department ? (evt.department.id || evt.department._id || evt.department) : null;
        const dept = depts.find(d => String(d.id) === String(deptId));
        const isRegistered = myRegs.find(r => String(r.eventId) === String(evt.id));

        const currentRegs = allRegs.filter(r => String(r.eventId) === String(evt.id) && r.status !== 'Rejected');
        const isFull = evt.maxParticipants && currentRegs.length >= evt.maxParticipants;

        const status = Store.getEventDynamicStatus(evt);
        let badgeStyle = 'background-color: var(--tag-teal-bg); color: var(--tag-teal);';
        if (status === 'Ongoing') badgeStyle = 'background-color: var(--tag-orange-bg); color: var(--tag-orange);';
        if (status === 'Completed') badgeStyle = 'background-color: var(--border-color); color: var(--text-gray);';

        const card = document.createElement('div');
        card.className = 'event-card';

        const desc = evt.description || 'Join us for this exciting event!';
        const isLong = desc.length > 100;
        const descHTML = isLong ? `
            <div class="mb-4">
                <p class="text-sm text-gray flex-grow clamp-2" id="desc-${evt.id}" style="transition: all 0.2s ease;">${desc}</p>
                <a href="javascript:void(0)" onclick="toggleDesc('${evt.id}')" id="btn-desc-${evt.id}" style="font-size: 13px; color: var(--primary-blue); font-weight: 500;">Read More</a>
            </div>
        ` : `
            <p class="text-sm text-gray mb-4 flex-grow">${desc}</p>
        `;

        let actionHTML = '';
        if (isRegistered) {
            actionHTML = `<button class="btn w-full" style="width:100%; pointer-events:none; border: 1px solid var(--success); color: var(--success); background-color: var(--success-bg); font-weight: 600;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-2" style="margin-right: 4px; display:inline-block; vertical-align:text-bottom;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Registered</button>`;
        } else if (status === 'Completed') {
            actionHTML = `<button class="btn w-full" style="width:100%; pointer-events:none; border: 1px solid var(--border-color); color: var(--text-gray); background-color: var(--sidebar-bg); font-weight: 600;">
                        Event Completed</button>`;
        } else if (isFull) {
            actionHTML = `<button class="btn btn-secondary w-full" style="width:100%; pointer-events:none; border-color: var(--danger); color: var(--danger);">Registration Closed</button>`;
        } else {
            actionHTML = `<button class="btn btn-primary" style="width:100%" onclick="openRegistrationModal('${evt.id}')">Register</button>`;
        }

        const bannerHTML = evt.bannerImage ? `<img src="${evt.bannerImage}" alt="Event Banner" class="event-banner">` : '';

        card.innerHTML = `
            ${bannerHTML}
            <div class="flex flex-col gap-2 mb-4">
                <div class="flex flex-wrap gap-2">
                    <span class="badge" style="background-color: var(--tag-blue-bg); color: var(--tag-blue);">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                        ${dept ? dept.name : 'College Event'}
                    </span>
                    <span class="badge" style="background-color: var(--tag-orange-bg); color: var(--tag-orange);">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 21h8"></path><path d="M12 17v4"></path><path d="M7 4h10v6c0 3-4 7-4 7s-4-4-4-7V4z"></path></svg>
                        ${evt.type}
                    </span>
                    <span class="badge" style="${badgeStyle}">${status}</span>
                </div>
            </div>
            
            <h3 class="text-xl font-bold mb-2">${evt.title}</h3>
            ${descHTML}
            
            <div class="text-sm text-gray flex flex-col gap-2 mb-4 flex-grow">
                <div class="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    ${new Date(evt.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
                <div class="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    ${evt.time}
                </div>
                <div class="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    ${evt.venue}
                </div>
                ${evt.maxParticipants ? `<div class="flex items-center gap-2" style="color: ${isFull ? 'var(--danger)' : 'var(--text-gray)'}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    ${currentRegs.length}/${evt.maxParticipants} Spots Filled
                </div>` : ''}
            </div>
            
            <div class="mt-auto pt-4 border-t" style="border-top: 1px solid var(--border-color);">
                ${actionHTML}
            </div>
        `;
        grid.appendChild(card);
    });
}

// Profile View
async function renderProfile() {
    const dashboard = document.getElementById('studentProfileDashboard');
    if (!dashboard) return;

    const fullStudent = await Store.getMyProfile();
    const myRegs = (await Store.getRegistrations()).filter(r => r.studentId === currentUser.uid);
    const allResults = await Store.getResults();

    const myResults = allResults.filter(r => r.userid && r.userid.uid === fullStudent.uid);
    const wins = myResults.filter(r => {
        if (!r.position) return false;
        const num = parseInt(r.position);
        return [1, 2, 3].includes(num) || ['1st Place', '2nd Place', '3rd Place'].includes(r.position);
    });

    // Fallback: anyone who placed securely gets a cert flag (can configure custom logic later)
    const certs = myResults.filter(r => {
        if (!r.position) return false;
        const num = parseInt(r.position);
        return r.position.includes('Place') || num > 0;
    });
    const attended = myResults.length;

    // User preferences (if any apply outside of dark mode)
    const isDark = false; // obsolete

    const joinedDateStr = fullStudent.joinedDate ? new Date(fullStudent.joinedDate).toLocaleDateString() : 'N/A';

    // Build Recent Activity by combining Registrations and Results into a unified timeline
    let activityHTML = '';
    const timeline = [];

    myRegs.forEach(r => {
        timeline.push({ type: 'Registration', eventId: r.eventId, date: new Date(r.createdAt) });
    });

    myResults.forEach(r => {
        timeline.push({ type: 'Result', eventId: r.eventid ? r.eventid._id || r.eventid.id : null, position: r.position, date: new Date(r.publishedat || Date.now()) });
    });

    const recentActivity = timeline.sort((a, b) => b.date - a.date).slice(0, 3);

    if (recentActivity.length === 0) {
        activityHTML = '<div class="text-gray text-sm py-4 text-center">No recent activity</div>';
    } else {
        recentActivity.forEach(async item => {
            const ev = (await Store.getEvents()).find(e => String(e.id) === String(item.eventId));
            if (!ev) return;
            const icon = item.type === 'Result' ? '🏆' : '📅';
            const action = item.type === 'Result' ? `Secured ${item.position || 'Participation'} in` : 'Registered for';
            activityHTML += `
                <div class="activity-item">
                    <div class="activity-icon">${icon}</div>
                    <div class="activity-content">
                        <div class="activity-title">${action} ${ev.title}</div>
                        <div class="activity-time">${item.date.toLocaleDateString()}</div>
                    </div>
                </div>
            `;
        });
    }

    // Build Dashboard Inner HTML
    dashboard.innerHTML = `
        <div class="profile-col-left">
            <!-- Profile Card -->
            <div class="card profile-card" style="margin-bottom: 1.5rem; text-align: center;">
                <div class="mb-4" onclick="updateProfilePicture()" title="Change Profile Picture" style="width:100px; height:100px; font-size: 2.5rem; border-radius:50%; background:var(--primary-blue); color:white; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 6px rgba(0,0,0,0.1); margin: 0 auto ${fullStudent.profilePicture ? '0.5rem' : '1.5rem'} auto; overflow: hidden; cursor: pointer;">
                    ${fullStudent.profilePicture
            ? `<img src="${fullStudent.profilePicture}" alt="Profile Picture" style="width:100%; height:100%; object-fit:cover;">`
            : currentUser.name.charAt(0).toUpperCase()
        }
                </div>
                ${fullStudent.profilePicture ? `<button onclick="removeProfilePicture()" style="color: var(--danger); font-size: 0.8rem; background: transparent; border: none; cursor: pointer; margin-bottom: 1rem; text-decoration: underline;">Remove Picture</button>` : ''}
                <h2 class="text-2xl font-bold mb-1">${currentUser.name}</h2>
                <div class="badge mb-4" style="background-color: var(--tag-blue-bg); color: var(--tag-blue);">${fullStudent.department || 'B.Tech Student'}</div>
                
                <div style="text-align: left; margin-top: 1rem;">
                    <div class="profile-info-row">
                        <div class="profile-info-label">Admission No</div>
                        <div class="profile-info-value">${fullStudent.uid || currentUser.uid}</div>
                    </div>
                    <div class="profile-info-row">
                        <div class="profile-info-label">Email</div>
                        <div class="profile-info-value">${fullStudent.email || currentUser.email || 'Not provided'}</div>
                    </div>
                    <div class="profile-info-row">
                        <div class="profile-info-label">Year of Study</div>
                        <div class="profile-info-value">${fullStudent.yearOfStudy || 'Not provided'}</div>
                    </div>
                </div>
            </div>

        </div>

        <div class="profile-col-right" style="display: flex; flex-direction: column; gap: 1.5rem;">
            <!-- Stats Grid -->
            <div class="profile-stats-grid">
                <div class="profile-stat-box">
                    <div class="stat-box-icon">📅</div>
                    <div class="stat-box-value">${myRegs.length}</div>
                    <div class="stat-box-label">Registered</div>
                </div>
                <div class="profile-stat-box">
                    <div class="stat-box-icon">✅</div>
                    <div class="stat-box-value">${attended}</div>
                    <div class="stat-box-label">Attended</div>
                </div>
                <div class="profile-stat-box" style="background: linear-gradient(135deg, var(--tag-orange-bg), var(--white)); border-color: var(--tag-orange);">
                    <div class="stat-box-icon">🏆</div>
                    <div class="stat-box-value" style="color: var(--tag-orange);">${wins.length}</div>
                    <div class="stat-box-label" style="color: var(--tag-orange);">Wins</div>
                </div>
            </div>

            <!-- Account Settings Card -->
            <div class="card" style="flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <h3 class="text-xl font-bold mb-4">Account Settings</h3>
                </div>
                
                <div class="mt-4" style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <button class="btn btn-primary w-full" style="width: 100%; justify-content: center;" onclick="openEditProfileModal()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; margin-right:4px;"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                        Edit Profile
                    </button>
                    <button class="btn btn-secondary w-full" style="color: var(--danger); border-color: var(--danger); width: 100%; justify-content: center;" onclick="confirmDeleteAccount()">
                        Delete Account
                    </button>
                </div>
            </div>

        </div>
    `;
}

// Global context functions
window.downloadCertificate = async function (regId) {
    const regs = await Store.getRegistrations();
    const reg = regs.find(r => r.id === regId);
    if (!reg || !reg.certificate) {
        alert('Certificate not found.');
        return;
    }

    const a = document.createElement('a');
    a.href = reg.certificate;
    a.download = `Certificate_${reg.eventId}_${reg.studentId}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

// Profile Modal Actions
async function openEditProfileModal() {
    // We intentionally leave email and yearOfStudy blank so the user sees the "Leave blank to keep current" placeholder
    document.getElementById('editProfileEmail').value = '';
    document.getElementById('editProfileYear').value = '';
    document.getElementById('editProfilePassword').value = '';
    openModal('editProfileModal');
}

document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('editProfileEmail').value;
    const yearOfStudy = document.getElementById('editProfileYear').value;
    const pass = document.getElementById('editProfilePassword').value;

    const updates = {};
    if (email.trim() !== '') {
        updates.email = email;
    }
    if (yearOfStudy !== '') {
        updates.yearOfStudy = yearOfStudy;
    }
    if (pass.trim() !== '') {
        updates.password = pass;
    }

    if (Object.keys(updates).length === 0) {
        closeModal('editProfileModal');
        return; // Nothing to update
    }

    try {
        const updateId = currentUser.id || currentUser._id || currentUser.uid;
        await Store.updateStudentProfile(updateId, updates);
        closeModal('editProfileModal');
        renderProfile();
        alert('Profile updated successfully!');
    } catch (err) {
        alert('Error updating profile: ' + err.message + '\n\nPlease ensure your backend server has been restarted to load the new route.');
    }
});

async function updateProfilePicture() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Check file size (e.g. max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                alert('Image is too large. Please select an image under 2MB.');
                return;
            }
            const reader = new FileReader();
            reader.onload = async (event) => {
                await Store.updateStudentProfile(currentUser.id, { profilePicture: event.target.result });
                updateHeaderAvatar();
                renderProfile();
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
}

async function removeProfilePicture() {
    if (confirm('Are you sure you want to remove your profile picture?')) {
        await Store.updateStudentProfile(currentUser.id, { profilePicture: null });
        updateHeaderAvatar();
        renderProfile();
    }
}

async function toggleSetting(key, value) {
    await Store.updateStudentProfile(currentUser.id, {
        settings: { [key]: value }
    });
    /* Dark mode toggle logic removed */
}

async function confirmDeleteAccount() {
    if (confirm("Are you sure you want to completely delete your account? This cannot be undone.")) {
        const id = currentUser.uid;

        // Ensure student actually calls the server endpoint when they delete to cascade deletion
        try {
            await Store.deleteStudent(id);
            Store.logout();
        } catch (err) {
            alert('Failed to delete account: ' + err.message);
        }
    }
}

// Initialization Pipeline
document.addEventListener('DOMContentLoaded', async () => {
    initFilters();
    switchTab('eventsTab');
    checkNotifications();
    renderCalendar();
    renderCalendarEvents(selectedDate);
});

// Helper for expanding/collapsing event descriptions
window.toggleDesc = function (id) {
    const p = document.getElementById('desc-' + id);
    const btn = document.getElementById('btn-desc-' + id);

    p.classList.toggle('clamp-2');
    if (p.classList.contains('clamp-2')) {
        btn.innerText = 'Read More';
    } else {
        btn.innerText = 'Read Less';
    }
};
