document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const status = document.getElementById('login-status');

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (result.success) {
            status.style.color = "green";
            status.innerText = "Login successful! Redirecting...";
            // Redirect to home.html after a successful login
            setTimeout(() => {
                window.location.href = '/home.html';
            }, 1000);
        } else {
            status.style.color = "red";
            status.innerText = result.message || "Invalid credentials";
        }
    } catch (error) {
        status.innerText = "Error connecting to server.";
    }
});
