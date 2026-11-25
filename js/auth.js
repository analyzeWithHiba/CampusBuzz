// auth.js - Handles Authentication flows

// Modal logic
function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    // Clear forms
    const forms = document.getElementById(id).querySelectorAll('form');
    forms.forEach(f => f.reset());

    // Hide errors
    const errors = document.getElementById(id).querySelectorAll('[id$="Error"]');
    errors.forEach(e => e.style.display = 'none');
}

// Check session on load
document.addEventListener('DOMContentLoaded', () => {
    const user = Store.getCurrentUser();
    if (user) {
        if (user.role === 'admin') window.location.href = 'admin.html';
        else if (user.role === 'student') window.location.href = 'student.html';
    }
});

// Unified Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('loginId').value;
    const pass = document.getElementById('loginPass').value;
    const errorDiv = document.getElementById('loginError');

    try {
        errorDiv.style.display = 'none';

        // Pass the id (which could be 'admin' or admission number) as the email
        // We assume the backend is set up to accept this as email or find by uid
        // For our API, if user enters 'admin', let's just make it the email or what the backend expects
        // Here we just pass it as email, as the backend `findOne({ email })` might actually need an email, 
        // wait, backend `User` schema has `uid` and `email`. Backend `/login` expects `email`.
        // If the user inputs admission number, it's the `uid`.
        // Let's modify the backend or the frontend. 
        // Actually, let's login using Store.login(id, pass) and see if the backend handles it.
        // Wait, Store.login(username, password) -> sends {email: username, password: password}
        // Let's stick to what Store.login expects.

        const user = await Store.login(id, pass);

        if (user.role === 'admin') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'student.html';
        }
    } catch (err) {
        errorDiv.textContent = err.message || 'Invalid login credentials';
        errorDiv.style.display = 'block';
    }
});

// Student Sign Up
document.getElementById('studentSignupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signupName').value;
    const id = document.getElementById('signupId').value;
    const email = document.getElementById('signupEmail').value;
    const pass = document.getElementById('signupPass').value;
    const departmentName = document.getElementById('signupDept').value;
    const yearOfStudy = document.getElementById('signupYear').value;
    const errorDiv = document.getElementById('studentSignupError');

    try {
        errorDiv.style.display = 'none';

        await Store.registerUser({
            uid: id,
            name,
            email,
            password: pass,
            role: 'student',
            department: departmentName,
            yearOfStudy: yearOfStudy
        });

        // Auto login
        await Store.login(id, pass);
        window.location.href = 'student.html';

    } catch (err) {
        errorDiv.textContent = err.message || 'Registration failed';
        errorDiv.style.display = 'block';
    }
});



// Close modals when clicking outside
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeModal(overlay.id);
        }
    });
});
