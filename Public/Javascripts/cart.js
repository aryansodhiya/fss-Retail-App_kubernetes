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
                <p>${item.name} - ${item.quantity} x $${item.price.toFixed(2)}</p>
                <button class="remove-button" data-index="${index}">Remove</button>
            `;
            cartItemsContainer.appendChild(itemElement);
            total += item.quantity * item.price;
        });
        totalPriceElement.textContent = `$${total.toFixed(2)}`;

        document.querySelectorAll('.remove-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = e.target.dataset.index;
                cart.splice(index, 1);
                localStorage.setItem('cart', JSON.stringify(cart));
                updateCartDisplay();
            });
        });
    }

    checkoutButton.addEventListener('click', async () => {
        if (cart.length === 0) return alert('Cart is empty.');

        try {
            // Trigger the purchase on the server
            const response = await fetch('/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();
            if (data.success) {
                localStorage.removeItem('cart');
                alert('Success! Check your email for confirmation.');
                window.location.href = 'home.html';
            } else {
                alert('Checkout failed. Make sure you are logged in.');
            }
        } catch (error) {
            console.error('Checkout error:', error);
        }
    });

    updateCartDisplay();
});
