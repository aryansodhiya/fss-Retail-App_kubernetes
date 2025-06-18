document.getElementById('logout-button').addEventListener('click', () => {
    fetch('/logout')
        .then(() => {
            window.location.href = '/login.html'; // Redirect to login page after logout
        })
        .catch((error) => {
            console.error('Logout error:', error);
        });
});

