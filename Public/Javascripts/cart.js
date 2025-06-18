document.addEventListener('DOMContentLoaded', () => {
    const cartItemsContainer = document.getElementById('cart-items');
    const totalPriceElement = document.getElementById('total-price');
    const checkoutButton = document.getElementById('checkout-button');
    let cart = JSON.parse(localStorage.getItem('cart')) || [];

    function updateCartDisplay() {
        cartItemsContainer.innerHTML = '';
        let total = 0;

        cart.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'cart-item';
            itemElement.innerHTML = `
                <div class="cart-item-details">
                    <img src="${item.image}" alt="${item.name}" class="cart-item-image" />
                    <div>
                        <p>${item.name} - ${item.quantity} x $${item.price.toFixed(2)}</p>
                        <p>Total: $${(item.quantity * item.price).toFixed(2)}</p>
                        <button class="remove-button" data-index="${index}">Remove</button>
                    </div>
                </div>
            `;
            cartItemsContainer.appendChild(itemElement);
            total += item.quantity * item.price;
        });

        totalPriceElement.textContent = `$${total.toFixed(2)}`;

        // Add event listeners to each remove button
        const removeButtons = document.querySelectorAll('.remove-button');
        removeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const index = button.getAttribute('data-index');
                cart.splice(index, 1);
                localStorage.setItem('cart', JSON.stringify(cart));
                updateCartDisplay();
            });
        });
    }

    checkoutButton.addEventListener('click', async () => {
        if (cart.length === 0) {
            alert('Your cart is empty.');
        } else {
            try {
                const response = await fetch('/purchase', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cartItems: cart })
                });

                const data = await response.json();
                if (data.success) {
                    localStorage.removeItem('cart'); // Clear cart from local storage
                    cart = []; // Clear the cart array
                    updateCartDisplay(); // Update the cart display
                    alert('Thank you for your purchase!');
                    window.location.href = 'home.html'; // Redirect to home page
                } else {
                    alert('Failed to complete purchase.');
                }
            } catch (error) {
                console.error('Error during checkout:', error);
                alert('An error occurred during checkout.');
            }
        }
    });

    updateCartDisplay(); // Initial display update
});
