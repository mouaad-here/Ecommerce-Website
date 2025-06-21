// Global Variables
let allProducts = [];
let displayedProducts = [];
let cart = [];
let currentUser = null;
let searchQuery = '';
let currentCategory = 'all';
let categories = [];
let currentPage = 1;
const productsPerPage = 12;
let debounceTimer;

// DOM Elements
const elements = {
    // Desktop search elements
    desktopSearchInput: document.getElementById('desktopSearchInput'),
    desktopSearchBtn: document.getElementById('desktopSearchBtn'),
    desktopSearchSuggestions: document.getElementById('desktopSearchSuggestions'),
    desktopSearchContainer: document.getElementById('desktopSearchContainer'),

    // Other elements
    productsGrid: document.getElementById('productsGrid'),
    categoriesGrid: document.getElementById('categoriesGrid'),
    loadingContainer: document.getElementById('loadingContainer'),
    noProducts: document.getElementById('noProducts'),
    loadMoreContainer: document.getElementById('loadMoreContainer'),
    loadMoreBtn: document.getElementById('loadMoreBtn'),
    cartCount: document.getElementById('cartCount'),
    checkoutBtn: document.getElementById('checkoutBtn'),
    clearCartBtn: document.getElementById('clearCartBtn'),
    authBtn: document.getElementById('authBtn'),

    // Mobile elements
    mobileMenuToggle: document.getElementById('mobileMenuToggle'),
    mobileMenuOverlay: document.getElementById('mobileMenuOverlay'),
    mobileMenuClose: document.getElementById('mobileMenuClose'),
    mobileSearchToggle: document.getElementById('mobileSearchToggle'),
    mobileSearchOverlay: document.getElementById('mobileSearchOverlay'),
    mobileSearchClose: document.getElementById('mobileSearchClose'),
    mobileSearchInput: document.getElementById('mobileSearchInput'),
    mobileSearchBtn: document.getElementById('mobileSearchBtn'),
    mobileSearchSuggestions: document.getElementById('mobileSearchSuggestions'),
    mobileThemeToggle: document.getElementById('mobileThemeToggle'),
    mobileAuthBtn: document.getElementById('mobileAuthBtn'),
    mobileCartBtn: document.getElementById('mobileCartBtn'),
    mobileCartCount: document.getElementById('mobileCartCount'),
};

// Initialize GSAP
gsap.registerPlugin(ScrollTrigger);

// Theme Management
function initializeTheme() {
    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-mode');
        document.getElementById('theme-toggle').innerHTML = '<i class="fas fa-sun"></i>';
    }
}

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const themeToggle = document.getElementById('theme-toggle');
    if (document.body.classList.contains('light-mode')) {
        localStorage.setItem('theme', 'light');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        localStorage.setItem('theme', 'dark');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

// Initialize App
// (removed old initializeApp function)

// Cart Functions
function addToCart(productId, quantity = 1) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    const cartItem = cart.find(item => item.id === productId);
    if (cartItem) {
        cartItem.quantity += quantity;
    } else {
        cart.push({ ...product, quantity: quantity });
    }
    
    saveCartToStorage();
    updateCart();
    createToast(`${quantity} x ${product.title} added to cart!`);
}

function updateCart() {
    updateCartCount();
    updateCartTotal();
    renderCartItems();
}

function renderCartItems() {
    const cartItemsContainer = document.getElementById('cartItems');
    const cartTotalElement = document.getElementById('cartTotal');
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-shopping-cart text-muted" style="font-size: 3rem;"></i>
                <h4 class="mt-3">Your cart is empty</h4>
                <p class="text-muted">Start shopping to add items to your cart</p>
            </div>
        `;
        cartTotalElement.textContent = '0.00';
        return;
    }
    
    const cartItemsHTML = cart.map(item => {
        const originalPrice = item.price;
        const discountPercentage = item.discountPercentage || 0;
        const discountedPrice = originalPrice - (originalPrice * discountPercentage / 100);
        const totalPrice = discountedPrice * item.quantity;
        
        return `
            <div class="cart-item" data-product-id="${item.id}">
                <div class="cart-item-image">
                    <img src="${item.thumbnail}" alt="${item.title}">
                </div>
                <div class="cart-item-details">
                    <h6 class="cart-item-title">${item.title}</h6>
                    <p class="cart-item-price">$${discountedPrice.toFixed(2)}</p>
                </div>
                <div class="cart-item-quantity">
                    <button class="quantity-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                    <span class="quantity-value">${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                </div>
                <div class="cart-item-total">
                    $${totalPrice.toFixed(2)}
                </div>
                <button class="remove-item-btn" onclick="removeFromCart(${item.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }).join('');
    
    cartItemsContainer.innerHTML = cartItemsHTML;
    
    // Update total
    const total = cart.reduce((sum, item) => {
        const originalPrice = item.price;
        const discountPercentage = item.discountPercentage || 0;
        const discountedPrice = originalPrice - (originalPrice * discountPercentage / 100);
        return sum + (discountedPrice * item.quantity);
    }, 0);
    
    cartTotalElement.textContent = total.toFixed(2);
}

function updateQuantity(productId, change) {
    const cartItem = cart.find(item => item.id === productId);
    if (cartItem) {
        cartItem.quantity += change;
        if (cartItem.quantity <= 0) {
            removeFromCart(productId);
        } else {
            saveCartToStorage();
            updateCart();
        }
    }
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCartToStorage();
    updateCart();
}

function updateCartCount() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    // Update desktop cart count
    if (elements.cartCount) {
    elements.cartCount.textContent = totalItems;
    }
    
    // Update mobile cart count
    if (elements.mobileCartCount) {
        elements.mobileCartCount.textContent = totalItems;
    }
}

function updateCartTotal() {
    const total = cart.reduce((sum, item) => {
        const originalPrice = item.price;
        const discountPercentage = item.discountPercentage || 0;
        const discountedPrice = originalPrice - (originalPrice * discountPercentage / 100);
        return sum + (discountedPrice * item.quantity);
    }, 0);
    
    const cartTotalElement = document.getElementById('cartTotal');
    if (cartTotalElement) {
        cartTotalElement.textContent = total.toFixed(2);
    }
}

function saveCartToStorage() {
    localStorage.setItem('shophub_cart', JSON.stringify(cart));
}

function loadCartFromStorage() {
    cart = JSON.parse(localStorage.getItem('shophub_cart')) || [];
}

function clearCart() {
    cart = [];
    saveCartToStorage();
    updateCart();
    
    // Close modal
    const cartModal = bootstrap.Modal.getInstance(document.getElementById('cartModal'));
    if (cartModal) {
        cartModal.hide();
    }
}

// Toast Notifications
function createToast(message, type = 'success') {
    const toastBgColor = type === 'danger' ? 'danger' : type === 'warning' ? 'warning' : 'success';

    const toastId = 'toast-' + Date.now();
    const toastHTML = `
        <div id="${toastId}" class="toast align-items-center text-white bg-${toastBgColor} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    
    const toastContainer = document.querySelector('.toast-container') || createToastContainer();
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
    toast.show();
    
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
        if (!toastContainer.hasChildNodes()) {
            toastContainer.remove();
        }
    });
}

function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    container.style.zIndex = '1081';
    document.body.appendChild(container);
    return container;
}

function showError(message) {
    createToast(message, 'danger');
}

function showLoading() {
    elements.loadingContainer.style.display = 'flex';
    elements.productsGrid.style.display = 'none';
    elements.noProducts.style.display = 'none';
    elements.loadMoreContainer.style.display = 'none';
}

function hideLoading() {
    elements.loadingContainer.style.display = 'none';
}

// Load Products from API
async function loadProducts() {
    try {
        showLoading();
        const response = await fetch('https://dummyjson.com/products?limit=100');
        if (!response.ok) throw new Error('Failed to fetch products');
        
        const data = await response.json();
        allProducts = data.products;
        
        console.log(`Loaded ${allProducts.length} products from API`);
        
        // Extract unique categories
        categories = [...new Set(allProducts.map(product => product.category))].sort();
        console.log(`Found ${categories.length} categories:`, categories);
        
        // Show all products as featured products initially
        displayedProducts = [...allProducts];
        renderCategories();
        renderProducts();
        hideLoading();
        
    } catch (error) {
        console.error('Error loading products:', error);
        hideLoading();
        showError('Failed to load products. Please try again.');
        throw error;
    }
}

// Render Categories
function renderCategories() {
    const categoryIcons = {
        'smartphones': 'fas fa-mobile-alt',
        'laptops': 'fas fa-laptop',
        'fragrances': 'fas fa-spray-can',
        'skincare': 'fas fa-pump-soap',
        'groceries': 'fas fa-shopping-basket',
        'home-decoration': 'fas fa-home',
        'furniture': 'fas fa-couch',
        'tops': 'fas fa-tshirt',
        'womens-dresses': 'fas fa-female',
        'womens-shoes': 'fas fa-shoe-prints',
        'mens-shirts': 'fas fa-male',
        'mens-shoes': 'fas fa-shoe-prints',
        'mens-watches': 'fas fa-clock',
        'womens-watches': 'fas fa-clock',
        'womens-bags': 'fas fa-shopping-bag',
        'womens-jewellery': 'fas fa-gem',
        'sunglasses': 'fas fa-sun',
        'automotive': 'fas fa-car',
        'motorcycle': 'fas fa-motorcycle',
        'lighting': 'fas fa-lightbulb'
    };

    // Render category cards
    const categoryCardsHTML = categories.map(category => {
        const icon = categoryIcons[category] || 'fas fa-tag';
        const productCount = allProducts.filter(p => p.category === category).length;
        return `
            <div class="category-card" data-category="${category}" onclick="selectCategory('${category}')">
                <div class="category-card-content">
                    <i class="${icon}"></i>
                    <h3>${formatCategoryName(category)}</h3>
                    <p>${productCount} products</p>
                </div>
            </div>
        `;
    }).join('');
    
    elements.categoriesGrid.innerHTML = categoryCardsHTML;
}

// Select category from card
function selectCategory(category) {
    currentCategory = category;
    const categoryProducts = allProducts.filter(p => p.category === category);
    displayedProducts = categoryProducts;
    currentPage = 1;
    renderProducts();
    
    // Scroll to products section
    document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
}

// Format Category Name
function formatCategoryName(category) {
    return category.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

// Render Products
function renderProducts() {
    elements.productsGrid.innerHTML = '';
    currentPage = 1;
    
    console.log(`Rendering ${displayedProducts.length} products`);
    
    if (displayedProducts.length === 0) {
        elements.productsGrid.style.display = 'none';
        elements.noProducts.style.display = 'block';
        elements.loadMoreContainer.style.display = 'none';
        return;
    }

    elements.productsGrid.style.display = 'grid';
    elements.noProducts.style.display = 'none';
    
    // Load first page of products
    loadProductPage();
}

function loadProductPage() {
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    const productsToRender = displayedProducts.slice(startIndex, endIndex);

    console.log(`Loading page ${currentPage}: products ${startIndex + 1} to ${endIndex} (${productsToRender.length} products)`);

    const productsHTML = productsToRender.map(product => {
        const originalPrice = product.price;
        const discountPercentage = product.discountPercentage || 0;
        const discountedPrice = originalPrice - (originalPrice * discountPercentage / 100);
        const rating = product.rating || 0;
        
        let starsHTML = '';
        for(let i = 1; i <= 5; i++) {
            if (i <= Math.round(rating)) {
                starsHTML += '<i class="fas fa-star"></i>';
            } else {
                starsHTML += '<i class="far fa-star"></i>';
            }
        }

        return `
        <div class="product-card" data-product-id="${product.id}">
            <div class="product-image" onclick="showProductDetails(${product.id})">
                <img src="${product.thumbnail}" alt="${product.title}">
                ${discountPercentage > 0 ? `<div class="product-badge">${Math.round(discountPercentage)}% OFF</div>` : ''}
            </div>
            <div class="product-info">
                <p class="product-category">${formatCategoryName(product.category)}</p>
                <h3 class="product-title" onclick="showProductDetails(${product.id})">${product.title}</h3>
                <div class="product-rating">
                    <div class="stars">${starsHTML}</div>
                    <span class="rating-text">${rating.toFixed(1)}</span>
                </div>
                <div class="product-price">
                    <span class="current-price">$${discountedPrice.toFixed(2)}</span>
                    ${discountPercentage > 0 ? `<span class="original-price">$${originalPrice.toFixed(2)}</span>` : ''}
                </div>
                <button class="add-to-cart-btn" onclick="addToCart(${product.id}, 1);">Add to Cart</button>
            </div>
        </div>
        `;
    }).join('');
    
    elements.productsGrid.insertAdjacentHTML('beforeend', productsHTML);
    
    // Animate the newly added products
    animateProductCards();
    
    // Update page counter
    currentPage++;

    // Show/hide load more button
    if (endIndex >= displayedProducts.length) {
        elements.loadMoreContainer.style.display = 'none';
        console.log('No more products to load');
    } else {
        elements.loadMoreContainer.style.display = 'block';
        elements.loadMoreBtn.style.display = 'inline-block';
        console.log(`${displayedProducts.length - endIndex} more products available`);
    }
}

// Load more products (append to existing)
function appendProductCards() {
    loadProductPage();
}

// Product Details Modal
function showProductDetails(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    const originalPrice = product.price;
    const discountPercentage = product.discountPercentage || 0;
    const discountedPrice = originalPrice - (originalPrice * discountPercentage / 100);
    const rating = product.rating || 0;
    
    let starsHTML = '';
    for(let i = 1; i <= 5; i++) {
        if (i <= Math.round(rating)) {
            starsHTML += '<i class="fas fa-star"></i>';
        } else {
            starsHTML += '<i class="far fa-star"></i>';
        }
    }

    const modalTitle = document.getElementById('productDetailTitle');
    const modalBody = document.getElementById('productDetailBody');
    
    modalTitle.textContent = product.title;
    modalBody.innerHTML = `
        <div class="row g-4">
            <div class="col-md-6">
                <div class="product-detail-image">
                    <img src="${product.thumbnail}" alt="${product.title}" class="img-fluid rounded shadow">
                </div>
            </div>
            <div class="col-md-6">
                <div class="product-detail-info">
                <h4>${product.title}</h4>
                <p class="text-muted">${product.brand}</p>
                <div class="mb-3">
                    <div class="stars">${starsHTML}</div>
                    <span class="rating-text">${rating.toFixed(1)}</span>
                </div>
                <div class="mb-3">
                    <span class="current-price fs-4">$${discountedPrice.toFixed(2)}</span>
                    ${discountPercentage > 0 ? `<span class="original-price ms-2">$${originalPrice.toFixed(2)}</span>` : ''}
                    ${discountPercentage > 0 ? `<span class="badge bg-danger ms-2">${Math.round(discountPercentage)}% OFF</span>` : ''}
                </div>
                <p>${product.description}</p>
                <div class="mb-3">
                    <strong>Category:</strong> ${formatCategoryName(product.category)}
                </div>
                <div class="mb-3">
                    <strong>Stock:</strong> ${product.stock} units available
                </div>

                    <div class="add-to-cart-section">
                        <div class="add-to-cart-controls">
                            <div class="quantity-selector">
                                <button class="quantity-btn" onclick="updateProductQuantity(-1)">-</button>
                                <input type="number" class="quantity-input" id="productQuantity" value="1" min="1" max="${product.stock}">
                                <button class="quantity-btn" onclick="updateProductQuantity(1)">+</button>
                            </div>
                            <button class="btn btn-primary btn-lg" onclick="addToCart(${product.id}, document.getElementById('productQuantity').valueAsNumber)">
                                <i class="fas fa-shopping-cart me-2"></i>Add to Cart
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    new bootstrap.Modal(document.getElementById('productDetailModal')).show();
}

function updateProductQuantity(change) {
    const quantityInput = document.getElementById('productQuantity');
    if (!quantityInput) return;
    
    let currentValue = parseInt(quantityInput.value);
    if (isNaN(currentValue)) currentValue = 1;

    const newValue = Math.max(1, currentValue + change);
    quantityInput.value = newValue;
}

// Desktop Search Functions
function setupDesktopSearch() {
    if (elements.desktopSearchInput) {
        elements.desktopSearchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
            debounceTimer = setTimeout(updateDesktopSearchSuggestions, 300);
        });
        elements.desktopSearchInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                performDesktopSearch();
            }
        });
    }
    if (elements.desktopSearchBtn) {
        elements.desktopSearchBtn.addEventListener('click', performDesktopSearch);
    }
}

function performDesktopSearch() {
    searchQuery = elements.desktopSearchInput.value.trim().toLowerCase();
    
        const filtered = allProducts.filter(p =>
            (p.title && p.title.toLowerCase().includes(searchQuery)) ||
            (p.description && p.description.toLowerCase().includes(searchQuery)) ||
            (p.brand && p.brand.toLowerCase().includes(searchQuery))
        );
    displayedProducts = searchQuery ? filtered : [...allProducts];
        renderProducts();

    if (elements.desktopSearchSuggestions) {
        elements.desktopSearchSuggestions.style.display = 'none';
    }
    
    if(searchQuery) {
        document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
    }
}

function updateDesktopSearchSuggestions() {
    const query = elements.desktopSearchInput.value.trim().toLowerCase();
    if (query.length < 2) {
        if (elements.desktopSearchSuggestions) {
            elements.desktopSearchSuggestions.style.display = 'none';
        }
        return;
    }
    
    const suggestions = allProducts.filter(p =>
        (p.title && p.title.toLowerCase().includes(query)) ||
        (p.brand && p.brand.toLowerCase().includes(query))
    ).slice(0, 5);
    
    if (suggestions.length > 0 && elements.desktopSearchSuggestions) {
        elements.desktopSearchSuggestions.innerHTML = suggestions.map(product => `
            <div class="suggestion-item" onclick="selectDesktopSuggestion('${product.title}')">
            <img src="${product.thumbnail}" alt="${product.title}" class="suggestion-image">
            <div>
                <div>${product.title}</div>
                <small class="text-muted">${product.brand}</small>
            </div>
        </div>
    `).join('');
        elements.desktopSearchSuggestions.style.display = 'block';
    } else if (elements.desktopSearchSuggestions) {
        elements.desktopSearchSuggestions.style.display = 'none';
    }
}

function selectDesktopSuggestion(title) {
    if (elements.desktopSearchInput) {
        elements.desktopSearchInput.value = title;
    }
    performDesktopSearch();
}

function setupGeneralEventListeners() {
    // Theme toggle, auth, checkout, clear cart etc.
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('signinForm').addEventListener('submit', handleSignIn);
    document.getElementById('signupForm').addEventListener('submit', handleSignUp);
    elements.checkoutBtn.addEventListener('click', handleCheckout);
    elements.clearCartBtn.addEventListener('click', clearCart);
    elements.authBtn.addEventListener('click', e => {
        if (currentUser) {
            e.preventDefault();
            e.stopPropagation();
            handleSignOut();
        }
    }, true);
    elements.loadMoreBtn.addEventListener('click', appendProductCards);
}

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', init);

function init() {
    console.log('Initializing app...');
    
    // Setup event listeners immediately for a responsive UI
    setupGeneralEventListeners();
    setupDesktopSearch();
    setupMobileMenu();
    
    // Load data from local storage
    loadUserFromStorage();
    loadCartFromStorage();
    
    // Initial UI setup
    initializeTheme();
    updateCart();

    // Fetch products and then render
    loadProducts()
        .then(() => {
            console.log('Product loading and initial render complete.');
            animateOnLoad();
        })
        .catch(error => {
            console.error('Failed to initialize app due to product loading error:', error);
        });
}

// Animations
function animateProductCards() {
    const cards = document.querySelectorAll('.product-card');
    const cardsArray = Array.from(cards); // Convert NodeList to Array
    const newCards = cardsArray.slice(-productsPerPage); // Only animate the newly added cards
    
    console.log(`Animating ${newCards.length} product cards`);
    
    // Animate new cards into view with a stagger effect
    gsap.fromTo(newCards, 
        { y: 30, opacity: 0 },
        { 
            duration: 0.8, 
            y: 0, 
            opacity: 1, 
            ease: 'power3.out', 
            stagger: 0.1,
            overwrite: 'auto'
        }
    );
}

function animateOnLoad() {
    gsap.from('.main-header', { duration: 0.8, y: -100, opacity: 0, ease: 'power3.out' });
    gsap.from('.hero-title', { duration: 1, y: 50, opacity: 0, delay: 0.5, ease: 'power3.out' });
    gsap.from('.hero-subtitle', { duration: 1, y: 50, opacity: 0, delay: 0.7, ease: 'power3.out' });
    gsap.fromTo('.hero-btn', 
        { y: 50, opacity: 0 }, 
        { duration: 1, y: 0, opacity: 1, delay: 0.9, ease: 'power3.out', clearProps: 'all' }
    );
}

// Authentication Functions
function handleSignIn(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email') || e.target.querySelector('input[type="email"]').value;
    const password = formData.get('password') || e.target.querySelector('input[type="password"]').value;
    
    const users = JSON.parse(localStorage.getItem('shophub_users')) || [];
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        currentUser = user;
        localStorage.setItem('shophub_currentUser', JSON.stringify(currentUser));
        updateAuthUI();
        createToast('Successfully signed in!');
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('authModal'));
        modal.hide();
    } else {
        showError('Invalid email or password');
    }
}

function handleSignUp(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name') || e.target.querySelector('input[type="text"]').value;
    const email = formData.get('email') || e.target.querySelector('input[type="email"]').value;
    const password = formData.get('password') || e.target.querySelector('input[type="password"]').value;
    
    let users = JSON.parse(localStorage.getItem('shophub_users')) || [];
    
    if (users.find(u => u.email === email)) {
        showError('User with this email already exists');
        return;
    }
    
    const newUser = { name, email, password };
    users.push(newUser);
    localStorage.setItem('shophub_users', JSON.stringify(users));
    
    currentUser = newUser;
    localStorage.setItem('shophub_currentUser', JSON.stringify(currentUser));
    updateAuthUI();
    createToast('Account created successfully!');
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('authModal'));
    modal.hide();
}

function handleSignOut() {
    currentUser = null;
    localStorage.removeItem('shophub_currentUser');
    updateAuthUI();
    createToast('Successfully signed out');
}

function loadUserFromStorage() {
    currentUser = JSON.parse(localStorage.getItem('shophub_currentUser'));
    updateAuthUI();
}

function updateAuthUI() {
    if (currentUser) {
        elements.authBtn.innerHTML = `<i class="fas fa-sign-out-alt"></i><span class="d-none d-sm-inline">Sign Out</span>`;
        elements.authBtn.setAttribute('title', `Signed in as ${currentUser.name}. Click to sign out.`);
        elements.authBtn.removeAttribute('data-bs-toggle');
        elements.authBtn.removeAttribute('data-bs-target');
    } else {
        elements.authBtn.innerHTML = `<i class="fas fa-user"></i><span class="d-none d-sm-inline">Sign In</span>`;
        elements.authBtn.setAttribute('title', 'Sign In or Create Account');
        elements.authBtn.setAttribute('data-bs-toggle', 'modal');
        elements.authBtn.setAttribute('data-bs-target', '#authModal');
    }
}

function handleCheckout() {
    if (cart.length === 0) {
        showError('Your cart is empty');
        return;
    }
    if (!currentUser) {
        showError('Please sign in to checkout');
        const authModal = new bootstrap.Modal(document.getElementById('authModal'));
        authModal.show();
        return;
    }
    createToast('Checkout functionality coming soon!');
}

// --- Mobile Menu & Search Functions ---

function setupMobileMenu() {
    // Mobile menu toggle
    if (elements.mobileMenuToggle) {
        elements.mobileMenuToggle.addEventListener('click', toggleMobileMenu);
    }
    
    // Mobile menu close
    if (elements.mobileMenuClose) {
        elements.mobileMenuClose.addEventListener('click', closeMobileMenu);
    }
    
    // Close mobile menu when clicking overlay
    if (elements.mobileMenuOverlay) {
        elements.mobileMenuOverlay.addEventListener('click', (e) => {
            if (e.target === elements.mobileMenuOverlay) {
                closeMobileMenu();
            }
        });
    }
    
    // Mobile search toggle
    if (elements.mobileSearchToggle) {
        elements.mobileSearchToggle.addEventListener('click', toggleMobileSearch);
    }
    
    // Mobile search close
    if (elements.mobileSearchClose) {
        elements.mobileSearchClose.addEventListener('click', closeMobileSearch);
    }
    
    // Close mobile search when clicking overlay
    if (elements.mobileSearchOverlay) {
        elements.mobileSearchOverlay.addEventListener('click', (e) => {
            // Close only if clicking the backdrop, not the modal content
            if (e.target === elements.mobileSearchOverlay) {
                closeMobileSearch();
            }
        });
    }
    
    // Mobile theme toggle in menu
    if (elements.mobileThemeToggle) {
        elements.mobileThemeToggle.addEventListener('click', () => {
            toggleTheme();
            closeMobileMenu();
        });
    }
    
    // Mobile auth button in menu
    if (elements.mobileAuthBtn) {
        elements.mobileAuthBtn.addEventListener('click', e => {
            if (currentUser) {
                e.preventDefault();
                e.stopPropagation();
                handleSignOut();
                closeMobileMenu();
            }
        }, true);
    }
    
    // Setup real-time search inside the modal
    setupMobileSearchRealTime();
}

function toggleMobileMenu() {
    const isActive = elements.mobileMenuOverlay.classList.contains('active');
    if(isActive) closeMobileMenu();
    else openMobileMenu();
}

function openMobileMenu() {
    elements.mobileMenuOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeMobileMenu() {
    elements.mobileMenuOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

function toggleMobileSearch() {
    if (elements.mobileSearchOverlay) {
        const isActive = elements.mobileSearchOverlay.classList.contains('active');
        if (isActive) {
            closeMobileSearch();
        } else {
            elements.mobileSearchOverlay.style.display = 'flex';
    setTimeout(() => {
                elements.mobileSearchOverlay.classList.add('active');
                if (elements.mobileSearchInput) {
                    elements.mobileSearchInput.focus();
                }
            }, 10); // A tiny delay to allow display change before transition
        }
    }
}

function closeMobileSearch() {
    if (elements.mobileSearchOverlay) {
        elements.mobileSearchOverlay.classList.remove('active');
        setTimeout(() => {
            elements.mobileSearchOverlay.style.display = 'none';
        }, 300);
    }
    if (elements.mobileSearchInput) elements.mobileSearchInput.value = '';
    if (elements.mobileSearchSuggestions) {
        elements.mobileSearchSuggestions.style.display = 'none';
        elements.mobileSearchSuggestions.innerHTML = '';
    }
}

function setupMobileSearchRealTime() {
    if (elements.mobileSearchInput) {
        elements.mobileSearchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(updateMobileSearchSuggestions, 300);
        });
        elements.mobileSearchInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') performMobileSearch();
        });
    }
    if (elements.mobileSearchBtn) {
        elements.mobileSearchBtn.addEventListener('click', performMobileSearch);
    }
}

function performMobileSearch() {
    searchQuery = elements.mobileSearchInput.value.trim().toLowerCase();
    
    const filtered = allProducts.filter(p =>
        (p.title && p.title.toLowerCase().includes(searchQuery)) ||
        (p.description && p.description.toLowerCase().includes(searchQuery)) ||
        (p.brand && p.brand.toLowerCase().includes(searchQuery))
    );
    
    displayedProducts = searchQuery ? filtered : [...allProducts];
    renderProducts();
    closeMobileSearch();
    
    if(searchQuery) {
        // Scroll to the results after the modal has closed
        setTimeout(() => {
            const productsSection = document.getElementById('products');
            if (productsSection) {
                productsSection.scrollIntoView({ behavior: 'smooth' });
            }
        }, 350);
    }
}

function updateMobileSearchSuggestions() {
    const query = elements.mobileSearchInput.value.trim().toLowerCase();
    if (query.length < 2) {
        if (elements.mobileSearchSuggestions) elements.mobileSearchSuggestions.style.display = 'none';
        return;
    }
    const suggestions = allProducts.filter(p =>
        (p.title && p.title.toLowerCase().includes(query)) ||
        (p.brand && p.brand.toLowerCase().includes(query))
    ).slice(0, 5);
    
    if (suggestions.length > 0) {
        elements.mobileSearchSuggestions.innerHTML = suggestions.map(product => `
            <div class="suggestion-item" onclick="selectMobileSuggestion('${product.title}')">
                <img src="${product.thumbnail}" alt="${product.title}" class="suggestion-image">
                <div>
                    <div>${product.title}</div>
                    <small class="text-muted">${product.brand}</small>
                </div>
            </div>
        `).join('');
        elements.mobileSearchSuggestions.style.display = 'block';
    } else {
        elements.mobileSearchSuggestions.style.display = 'none';
    }
}

function selectMobileSuggestion(title) {
    if (elements.mobileSearchInput) elements.mobileSearchInput.value = title;
    if (elements.mobileSearchSuggestions) elements.mobileSearchSuggestions.style.display = 'none';
    performMobileSearch();
}