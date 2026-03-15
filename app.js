/**
 * HieliPOS - Main Application Logic
 * Utilizes LocalStorage for offline persistence without a backend.
 */

// =========================================================
// Data Models & Initialization
// =========================================================

let products = [];
let clients = [];
let sales = [];
let cart = [];

// Initialize or load data from LocalStorage
function initData() {
    const storedProducts = localStorage.getItem('hielipos_products');
    const storedClients = localStorage.getItem('hielipos_clients');
    const storedSales = localStorage.getItem('hielipos_sales');

    if (storedProducts) {
        products = JSON.parse(storedProducts);
    } else {
        // Defaults
        products = [
            { id: generateId(), name: "Fresa de Leche", price: 15, iconClass: "alt-1" },
            { id: generateId(), name: "Vainilla", price: 15, iconClass: "alt-3" },
            { id: generateId(), name: "Rompope", price: 20, iconClass: "alt-3" },
            { id: generateId(), name: "Nuez con Leche", price: 20, iconClass: "alt-2" },
            { id: generateId(), name: "Limón (Agua)", price: 10, iconClass: "alt-2" }
        ];
        saveData('hielipos_products', products);
    }

    if (storedClients) {
        clients = JSON.parse(storedClients);
    } else {
        clients = [
            { id: generateId(), name: "Público General", info: "" }
        ];
        saveData('hielipos_clients', clients);
    }

    if (storedSales) {
        sales = JSON.parse(storedSales);
    } else {
        sales = [];
        saveData('hielipos_sales', sales);
    }
}

function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-MX', { 
        year: 'numeric', month: 'short', day: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
    });
}

// =========================================================
// DOM Elements & Navigation
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    initData();
    setupNavigation();
    setupModals();
    
    // Initial Render
    renderPOSProducts();
    renderPOSClients();
    renderProductsTable();
    renderClientsTable();
    renderHistory();
});

function setupNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view');
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.getElementById('menu-btn');

    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Update active button
            navBtns.forEach(b => b.classList.remove('active'));
            const targetBtn = e.target.closest('.nav-btn');
            targetBtn.classList.add('active');

            // Show target view
            const targetId = targetBtn.getAttribute('data-target');
            views.forEach(v => v.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');

            // Close sidebar on mobile
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
            }
        });
    });

    // Mobile Menu Toggle
    menuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
}

function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-msg').textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// =========================================================
// Modal Logic
// =========================================================

function setupModals() {
    const overlay = document.getElementById('modal-overlay');
    const modals = document.querySelectorAll('.modal');
    const closeBtns = document.querySelectorAll('.close-modal');

    // Close Modals
    const closeModalFn = () => {
        overlay.classList.add('hidden');
        modals.forEach(m => m.classList.add('hidden'));
    };

    closeBtns.forEach(btn => btn.addEventListener('click', closeModalFn));
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModalFn();
    });

    window.openModal = function(modalId) {
        overlay.classList.remove('hidden');
        document.getElementById(modalId).classList.remove('hidden');
    }
    
    window.closeModals = closeModalFn;
}

// =========================================================
// POS Logic
// =========================================================

function renderPOSProducts() {
    const grid = document.getElementById('pos-products-grid');
    grid.innerHTML = '';
    
    products.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-item-card';
        card.innerHTML = `
            <i class="fa-solid fa-popsicle product-icon ${p.iconClass || ''}"></i>
            <div class="product-name">${p.name}</div>
            <div class="product-price">${formatCurrency(p.price)}</div>
        `;
        card.addEventListener('click', () => addToCart(p));
        grid.appendChild(card);
    });
}

function renderPOSClients() {
    const select = document.getElementById('pos-client-select');
    select.innerHTML = '';
    clients.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        select.appendChild(opt);
    });
}

function addToCart(product) {
    const existingPos = cart.findIndex(i => i.id === product.id);
    if (existingPos !== -1) {
        cart[existingPos].qty += 1;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    updateCartUI();
    
    // Add small feedback
    if (navigator.vibrate) navigator.vibrate(50);
}

function removeFromCart(id) {
    cart = cart.filter(i => i.id !== id);
    updateCartUI();
}

function updateCartQty(id, delta) {
    const item = cart.find(i => i.id === id);
    if (item) {
        item.qty += delta;
        if (item.qty <= 0) removeFromCart(id);
        else updateCartUI();
    }
}

function updateCartUI() {
    const list = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    const payBtn = document.getElementById('btn-pay');
    
    list.innerHTML = '';
    let total = 0;

    cart.forEach(item => {
        const itemTotal = item.qty * item.price;
        total += itemTotal;
        
        const li = document.createElement('li');
        li.className = 'cart-item';
        li.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">${formatCurrency(item.price)} cada uno</div>
            </div>
            <div class="cart-item-actions">
                <div class="qty-controls">
                    <button class="qty-btn" onclick="updateCartQty('${item.id}', -1)"><i class="fa-solid fa-minus"></i></button>
                    <div class="qty-display">${item.qty}</div>
                    <button class="qty-btn" onclick="updateCartQty('${item.id}', 1)"><i class="fa-solid fa-plus"></i></button>
                </div>
                <div class="cart-item-total">${formatCurrency(itemTotal)}</div>
                <button class="btn-danger" style="padding: 6px 8px;" onclick="removeFromCart('${item.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        list.appendChild(li);
    });

    totalEl.textContent = formatCurrency(total);
    payBtn.disabled = cart.length === 0;

    // Mobile: if cart has items, show a subtle indicator or expand (not implemented fully to keep it simple)
}

// =========================================================
// Payment / Checkout Flow
// =========================================================

let checkoutTotal = 0;

document.getElementById('btn-pay').addEventListener('click', () => {
    if (cart.length === 0) return;
    
    checkoutTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    document.getElementById('checkout-total').textContent = formatCurrency(checkoutTotal);
    document.getElementById('checkout-paid').value = '';
    document.getElementById('checkout-change').textContent = formatCurrency(0);
    document.querySelector('.change-display').classList.remove('visible');
    
    document.getElementById('btn-confirm-sale').disabled = true;
    window.openModal('modal-checkout');
    
    setTimeout(() => document.getElementById('checkout-paid').focus(), 100);
});

document.getElementById('checkout-paid').addEventListener('input', (e) => {
    const paid = parseFloat(e.target.value) || 0;
    const changeDisplay = document.querySelector('.change-display');
    const changeEl = document.getElementById('checkout-change');
    const confirmBtn = document.getElementById('btn-confirm-sale');

    if (paid >= checkoutTotal) {
        changeDisplay.classList.add('visible');
        changeEl.textContent = formatCurrency(paid - checkoutTotal);
        confirmBtn.disabled = false;
    } else {
        changeDisplay.classList.remove('visible');
        confirmBtn.disabled = true;
    }
});

document.getElementById('btn-confirm-sale').addEventListener('click', () => {
    const clientId = document.getElementById('pos-client-select').value;
    const client = clients.find(c => c.id === clientId) || clients[0];
    
    const paidAmount = parseFloat(document.getElementById('checkout-paid').value);

    const sale = {
        id: generateId(),
        date: new Date().toISOString(),
        client: client.name,
        items: [...cart],
        total: checkoutTotal,
        paid: paidAmount,
        change: paidAmount - checkoutTotal
    };

    sales.unshift(sale); // Add to beginning (latest first)
    saveData('hielipos_sales', sales);
    
    closeModals();
    showToast(`Venta exitosa a ${client.name}!`);
    
    // Reset Cart
    cart = [];
    updateCartUI();
    renderHistory(); // Refresh history tab
});


// =========================================================
// Products Management
// =========================================================

document.getElementById('btn-add-product').addEventListener('click', () => {
    document.getElementById('modal-product-title').textContent = "Nuevo Hielito";
    document.getElementById('product-id').value = "";
    document.getElementById('product-name').value = "";
    document.getElementById('product-price').value = "";
    window.openModal('modal-product');
});

document.getElementById('btn-save-product').addEventListener('click', () => {
    const id = document.getElementById('product-id').value;
    const name = document.getElementById('product-name').value.trim();
    const price = parseFloat(document.getElementById('product-price').value);

    if (!name || isNaN(price) || price <= 0) {
        alert("Por favor ingrese un nombre y precio válido.");
        return;
    }

    if (id) {
        // Edit
        const pIndex = products.findIndex(p => p.id === id);
        if (pIndex !== -1) {
            products[pIndex].name = name;
            products[pIndex].price = price;
        }
    } else {
        // Create
        const icons = ["alt-1", "alt-2", "alt-3", ""];
        products.push({
            id: generateId(),
            name,
            price,
            iconClass: icons[Math.floor(Math.random() * icons.length)]
        });
    }

    saveData('hielipos_products', products);
    renderProductsTable();
    renderPOSProducts();
    closeModals();
    showToast("Producto guardado exitosamente");
});

window.editProduct = function(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    document.getElementById('modal-product-title').textContent = "Editar Hielito";
    document.getElementById('product-id').value = p.id;
    document.getElementById('product-name').value = p.name;
    document.getElementById('product-price').value = p.price;
    window.openModal('modal-product');
};

window.deleteProduct = function(id) {
    if (confirm("¿Estás seguro de eliminar este producto?")) {
        products = products.filter(p => p.id !== id);
        saveData('hielipos_products', products);
        renderProductsTable();
        renderPOSProducts();
        showToast("Producto eliminado");
    }
};

function renderProductsTable() {
    const tbody = document.getElementById('products-tbody');
    tbody.innerHTML = '';
    
    products.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${p.name}</strong></td>
            <td style="color: var(--primary); font-weight: bold;">${formatCurrency(p.price)}</td>
            <td>
                <button class="btn-secondary" style="display:inline-flex; padding: 6px 12px; margin-right:5px;" onclick="editProduct('${p.id}')"><i class="fa-solid fa-edit"></i></button>
                <button class="btn-danger" style="display:inline-flex; padding: 6px 12px;" onclick="deleteProduct('${p.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}


// =========================================================
// Clients Management
// =========================================================

document.getElementById('btn-add-client').addEventListener('click', () => {
    document.getElementById('modal-client-title').textContent = "Nuevo Cliente";
    document.getElementById('client-id').value = "";
    document.getElementById('client-name').value = "";
    document.getElementById('client-info').value = "";
    window.openModal('modal-client');
});

document.getElementById('btn-save-client').addEventListener('click', () => {
    const id = document.getElementById('client-id').value;
    const name = document.getElementById('client-name').value.trim();
    const info = document.getElementById('client-info').value.trim();

    if (!name) {
        alert("Por favor ingrese un nombre de cliente.");
        return;
    }

    if (id) {
        // Edit
        const cIndex = clients.findIndex(c => c.id === id);
        if (cIndex !== -1) {
            clients[cIndex].name = name;
            clients[cIndex].info = info;
        }
    } else {
        // Create
        clients.push({ id: generateId(), name, info });
    }

    saveData('hielipos_clients', clients);
    renderClientsTable();
    renderPOSClients();
    closeModals();
    showToast("Cliente guardado exitosamente");
});

window.editClient = function(id) {
    const c = clients.find(x => x.id === id);
    if (!c) return;
    document.getElementById('modal-client-title').textContent = "Editar Cliente";
    document.getElementById('client-id').value = c.id;
    document.getElementById('client-name').value = c.name;
    document.getElementById('client-info').value = c.info;
    window.openModal('modal-client');
};

window.deleteClient = function(id) {
    if (clients.length <= 1) {
        alert("Debes tener al menos un cliente ('Público General').");
        return;
    }
    if (confirm("¿Estás seguro de eliminar este cliente?")) {
        clients = clients.filter(c => c.id !== id);
        saveData('hielipos_clients', clients);
        renderClientsTable();
        renderPOSClients();
        showToast("Cliente eliminado");
    }
};

function renderClientsTable() {
    const tbody = document.getElementById('clients-tbody');
    tbody.innerHTML = '';
    
    clients.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${c.name}</strong></td>
            <td>${c.info || '-'}</td>
            <td>
                <button class="btn-secondary" style="display:inline-flex; padding: 6px 12px; margin-right:5px;" onclick="editClient('${c.id}')"><i class="fa-solid fa-edit"></i></button>
                <button class="btn-danger" style="display:inline-flex; padding: 6px 12px;" onclick="deleteClient('${c.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}


// =========================================================
// Sales & History
// =========================================================

function renderHistory() {
    // 1. Calculate Today's Stats
    const today = new Date().setHours(0,0,0,0);
    
    let todayTotal = 0;
    let todayQty = 0;

    sales.forEach(sale => {
        const saleDate = new Date(sale.date).setHours(0,0,0,0);
        if (saleDate === today) {
            todayTotal += sale.total;
            sale.items.forEach(item => {
                todayQty += item.qty;
            });
        }
    });

    document.getElementById('stat-today-total').textContent = formatCurrency(todayTotal);
    document.getElementById('stat-today-qty').textContent = todayQty;

    // 2. Render Sales Table
    const tbody = document.getElementById('sales-tbody');
    tbody.innerHTML = '';
    
    // Only show last 50 sales for performance in UI
    const recentSales = sales.slice(0, 50);

    recentSales.forEach(s => {
        const tr = document.createElement('tr');
        const itemsSummary = s.items.map(i => `${i.qty}x ${i.name}`).join(', ');
        tr.innerHTML = `
            <td>
                <div style="font-weight: 600;">${formatDate(s.date)}</div>
                <div style="font-size: 0.8rem; color: #666;">${itemsSummary}</div>
            </td>
            <td>${s.client}</td>
            <td style="color: var(--primary); font-weight: bold; font-size: 1.1rem;">
                ${formatCurrency(s.total)}
            </td>
        `;
        tbody.appendChild(tr);
    });
}
