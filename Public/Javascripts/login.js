let storedEmail = ''; // Variable to hold the email

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Check if the OTP field is visible
    if (document.getElementById('otp').style.display === 'block') {
        const otp = document.getElementById('otp').value;

        try {
            const response = await fetch('/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: storedEmail, otp })
            });

            const data = await response.json();

            if (data.success) {
                document.getElementById('login-status').textContent = 'OTP verified successfully! Redirecting...';
                setTimeout(() => {
                    window.location.href = '/home.html';
                }, 2000);
            } else {
                document.getElementById('login-status').textContent = 'Invalid OTP. Please try again.';
            }
        } catch (error) {
            console.error('Error:', error);
            document.getElementById('login-status').textContent = 'An error occurred. Please try again.';
        }
    } else {
        // Perform the login without OTP
        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                storedEmail = email; // Store email for OTP verification
                document.getElementById('otp-label').style.display = 'block';
                document.getElementById('otp').style.display = 'block'; 
                document.getElementById('verify-otp').style.display = 'block'; 
                document.getElementById('login-status').textContent = 'OTP has been sent to your email';
            } else {
                document.getElementById('login-status').textContent = 'Login failed: ' + data.message;
            }
        } catch (error) {
            console.error('Error:', error);
            document.getElementById('login-status').textContent = 'An error occurred. Please try again.';
        }
    }
});

// Event listener for Verify OTP button
document.getElementById('verify-otp').addEventListener('click', async (e) => {
    e.preventDefault();

    const otp = document.getElementById('otp').value;

    try {
        const response = await fetch('/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: storedEmail, otp })
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('login-status').textContent = 'OTP verified successfully! Redirecting...';
            setTimeout(() => {
                window.location.href = '/home.html'; 
            }, 2000);
        } else {
            document.getElementById('login-status').textContent = 'Invalid OTP. Please try again.';
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('login-status').textContent = 'An error occurred. Please try again.';
    }
});
