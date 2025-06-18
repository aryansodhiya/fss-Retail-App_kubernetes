document.addEventListener('DOMContentLoaded', () => {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
  
  
    // Function to handle adding items to cart
    const addToCartForms = document.querySelectorAll('.product-card form');
    
    addToCartForms.forEach(form => {
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const productCard = form.closest('.product-card');
            const productName = productCard.querySelector('h3').textContent;
            const productPrice = parseFloat(productCard.querySelector('.price').textContent.replace('$', ''));
            const quantity = parseInt(form.querySelector('input[name="quantity"]').value);
            const productImage = productCard.querySelector('img').src; // Get the image URL
  
            const item = {
                name: productName,
                price: productPrice,
                quantity: quantity,
                image: productImage // Store the image URL
            };
  
            cart.push(item);
            localStorage.setItem('cart', JSON.stringify(cart));
  
            // Alert the user that the item has been added
            alert(`${productName} added to cart.`);
        });
    });
  });
  
  