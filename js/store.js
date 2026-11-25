// store.js - API Wrapper for Node.js Backend

const API_URL = 'http://localhost:5000/api';

const Store = {
    // Auth Helpers
    async login(email, password) {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('cems_token', data.token);
            localStorage.setItem('cems_current_user', JSON.stringify(data));
            return data;
        } else {
            throw new Error(data.message);
        }
    },

    async registerUser(userData) {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        return data;
    },

    logout() {
        localStorage.removeItem('cems_token');
        localStorage.removeItem('cems_current_user');
        window.location.href = 'index.html';
    },

    getCurrentUser() {
        return JSON.parse(localStorage.getItem('cems_current_user'));
    },

    getToken() {
        return localStorage.getItem('cems_token');
    },

    // Auth Header Helper
    getHeaders() {
        const token = this.getToken();
        return {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` })
        };
    },

    // Entity Specific Helpers
    async getEvents() {
        const res = await fetch(`${API_URL}/events`);
        const data = await res.json();
        return data.map(e => {
            if (e._id) e.id = e._id;
            return e;
        });
    },

    async getDepartments() {
        const res = await fetch(`${API_URL}/departments`);
        return await res.json();
    },

    async addDepartment(name) {
        const res = await fetch(`${API_URL}/departments`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ deptname: name })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to create department');
        return data;
    },

    async updateDepartment(id, name) {
        const res = await fetch(`${API_URL}/departments/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify({ deptname: name })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to update department');
        return data;
    },

    async deleteDepartment(id) {
        const res = await fetch(`${API_URL}/departments/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        if (!res.ok) throw new Error('Failed to delete department');
        return await res.json();
    },

    // Note: getStudents is used for some client-side filters in admin.js
    // We would ideally have an endpoint like GET /api/users
    // For now, let's assume we can fetch all users if admin
    async getStudents() {
        const res = await fetch(`${API_URL}/users`, { headers: this.getHeaders() });
        return await res.json();
    },

    async getMyProfile() {
        const res = await fetch(`${API_URL}/users/me`, { headers: this.getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to fetch profile');
        return data;
    },

    async deleteStudent(id) {
        // Here id is the uid (admission number). Our backend route looks for uid.
        const res = await fetch(`${API_URL}/users/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        if (!res.ok) throw new Error('Failed to delete student');
        return await res.json();
    },

    async getRegistrations() {
        const res = await fetch(`${API_URL}/registrations`, { headers: this.getHeaders() });
        const data = await res.json();
        return data.map(r => {
            if (r._id) r.id = r._id;
            if (r.eventid) r.eventId = r.eventid._id || r.eventid.id || r.eventid;
            if (r.userid) r.userId = r.userid._id || r.userid.id || r.userid;
            if (r.admissionNumber) r.studentId = r.admissionNumber;
            return r;
        });
    },

    async getResults() {
        const res = await fetch(`${API_URL}/results`, { headers: this.getHeaders() });
        const data = await res.json();
        return data.map(r => {
            if (r._id) r.id = r._id;
            if (r.eventid) r.eventId = r.eventid._id || r.eventid.id || r.eventid;
            if (r.userid) r.userId = r.userid._id || r.userid.id || r.userid;
            return r;
        });
    },

    async addResult(eventid, userid, score, position, remarks) {
        const res = await fetch(`${API_URL}/results`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ eventid, userid, score, position, remarks })
        });
        if (!res.ok) throw new Error('Failed to post result');
        return await res.json();
    },

    async addEvent(eventData) {
        const res = await fetch(`${API_URL}/events`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(eventData)
        });
        if (!res.ok) throw new Error('Failed to create event');
        return await res.json();
    },

    async updateEvent(id, updatedData) {
        const res = await fetch(`${API_URL}/events/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(updatedData)
        });
        if (!res.ok) throw new Error('Failed to update event');
        return await res.json();
    },

    async deleteEvent(id) {
        const res = await fetch(`${API_URL}/events/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        if (!res.ok) throw new Error('Failed to delete event');
        return await res.json();
    },

    async updateStudentProfile(id, data) {
        const res = await fetch(`${API_URL}/users/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        });
        const updated = await res.json();
        if (res.ok) {
            // Update local storage reflection
            const current = this.getCurrentUser();
            if (current && current._id === id) {
                localStorage.setItem('cems_current_user', JSON.stringify({ ...current, ...updated }));
            }
        } else {
            throw new Error(updated.message);
        }
    },

    async registerForEvent(registrationData) {
        const res = await fetch(`${API_URL}/registrations`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ eventId: registrationData.eventId })
        });
        const data = await res.json();
        if (!res.ok) return { success: false, message: data.message };
        return { success: true, data };
    },

    async updateRegistrationStatus(id, status) {
        const body = { status };

        const res = await fetch(`${API_URL}/registrations/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error('Failed to update registration');
        return await res.json();
    },

    // Notifications
    async addNotification(user, message, title = 'Notification', type = 'info', eventId = null) {
        const body = {
            message, title, type, eventId,
            user: user === 'ALL' || user === 'ADMIN' ? null : user,
            forAdmin: user === 'ADMIN'
        };
        const res = await fetch(`${API_URL}/notifications`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error('Failed to create notification');
        return await res.json();
    },

    async getStudentNotifications(studentId) {
        const res = await fetch(`${API_URL}/notifications`, { headers: this.getHeaders() });
        return await res.json();
    },

    async getAdminNotifications() {
        const res = await fetch(`${API_URL}/notifications`, { headers: this.getHeaders() });
        return await res.json();
    },

    async markNotificationsRead() {
        await fetch(`${API_URL}/notifications/read`, {
            method: 'PUT',
            headers: this.getHeaders()
        });
    },

    // Dynamic Event Logic (Can remain synchronous as it just does date math)
    getEventDynamicStatus(evt) {
        if (!evt.date || !evt.time) return evt.status || 'Published'; // Fallback

        // evt.date is often an ISO string like "2026-03-05T00:00:00.000Z", extract just the YYYY-MM-DD
        const datePart = evt.date.split('T')[0];

        // parse evt.time (e.g., "02:30 PM" or "14:30") safely into 24hr
        let timeStr = evt.time;
        if (timeStr.toUpperCase().includes('AM') || timeStr.toUpperCase().includes('PM')) {
            const timeParts = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (timeParts) {
                let [_, hours, mins, ampm] = timeParts;
                hours = parseInt(hours, 10);
                if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
                if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
                timeStr = `${hours.toString().padStart(2, '0')}:${mins}`;
            }
        }

        // Construct a safe local date object using YYYY-MM-DDTHH:mm
        const eventStart = new Date(`${datePart}T${timeStr}:00`);
        const now = new Date();
        const eventEnd = new Date(eventStart.getTime() + (3 * 60 * 60 * 1000)); // 3 hour duration

        if (isNaN(eventStart.getTime())) return evt.status || 'Published';

        if (now < eventStart) {
            return 'Upcoming';
        } else if (now >= eventStart && now <= eventEnd) {
            return 'Ongoing';
        } else {
            return 'Completed';
        }
    }
};

window.Store = Store;
