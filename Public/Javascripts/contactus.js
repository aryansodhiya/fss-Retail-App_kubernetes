document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('contact-form').addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent the default form submission
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const message = document.getElementById('message').value;
        const issues = document.getElementById('issues').value;

        try {
            const response = await fetch('/contactus', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, message, issues })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            if (data.success) {
                alert('Your message has been sent successfully!');
                document.getElementById('contact-form').reset(); // Reset form
                window.location.href = 'home.html'; // Redirect to home.html after sending
            } else {
                alert('Failed to send message.');
            }
        } catch (error) {
            console.error('Error sending contact form:', error);
            alert('An error occurred while sending your message.');
        }
    });
});

