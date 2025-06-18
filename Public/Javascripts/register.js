document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const address = document.getElementById('address').value; // New line
    const password = document.getElementById('password').value;

    // Validation functions
    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validatePassword = (password) => {
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return passwordRegex.test(password);
    };

    const validatePhone = (phone) => {
        const phoneRegex = /^\d{10}$/;
        return phoneRegex.test(phone);
    };

    // Display validation messages
    if (!validateEmail(email)) {
        document.getElementById('register-status').textContent = 'Invalid email format.';
        return;
    }
    
    if (!validatePassword(password)) {
        document.getElementById('register-status').textContent = 'Password must be at least 8 characters long, contain letters, numbers, and at least one special character.';
        return;
    }

    if (!validatePhone(phone)) {
        document.getElementById('register-status').textContent = 'Phone number must be exactly 10 digits long.';
        return;
    }

    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, address, password }) // Updated line
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('register-status').textContent = 'Registration successful! Please log in.';
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
        } else {
            document.getElementById('register-status').textContent = 'Registration failed: ' + data.message;
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('register-status').textContent = 'An error occurred. Please try again.';
    }
});


