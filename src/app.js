// Global state
let clients = [];
let currentEditingClient = null;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    loadClients();
    setupEventListeners();
    loadClientsForSMS();
});

// Event listeners
function setupEventListeners() {
    // Search clients
    document.getElementById('search-clients').addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        filterClients(searchTerm);
    });

    // Client form submission
    document.getElementById('client-form').addEventListener('submit', handleClientSubmit);

    // SMS form submission
    document.getElementById('sms-form').addEventListener('submit', handleSMSSubmit);

    // Character counter for SMS
    document.getElementById('message-text').addEventListener('input', function(e) {
        document.getElementById('char-count').textContent = e.target.value.length;
    });

    // Recipient selection
    document.getElementById('recipient-select').addEventListener('change', function(e) {
        if (e.target.value) {
            document.getElementById('manual-phone').value = '';
        }
    });

    document.getElementById('manual-phone').addEventListener('input', function(e) {
        if (e.target.value) {
            document.getElementById('recipient-select').value = '';
        }
    });
}

// Tab switching
function switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // Remove active state from all tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('border-blue-500', 'text-blue-600');
        btn.classList.add('border-transparent', 'text-gray-500');
    });

    // Show selected tab content
    document.getElementById(`${tabName}-content`).classList.add('active');

    // Add active state to selected tab
    const activeTab = document.getElementById(`${tabName}-tab`);
    activeTab.classList.remove('border-transparent', 'text-gray-500');
    activeTab.classList.add('border-blue-500', 'text-blue-600');

    // Load data if needed
    if (tabName === 'send-sms') {
        loadClientsForSMS();
    }
}

// Client management functions
async function loadClients() {
    try {
        const response = await fetch('/api/clients');
        clients = await response.json();
        renderClients(clients);
    } catch (error) {
        showNotification('Failed to load clients', 'error');
        console.error('Error loading clients:', error);
    }
}

function renderClients(clientsToRender) {
    const tbody = document.getElementById('clients-table');
    
    if (clientsToRender.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-8 text-center text-gray-500">
                    <i class="fas fa-users text-4xl mb-4"></i>
                    <p>No clients found</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = clientsToRender.map(client => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${escapeHtml(client.name)}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${escapeHtml(client.phone)}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500">${formatDate(client.created_at)}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex justify-end space-x-2">
                    <button onclick="sendSMSToClient(${client.id}, '${escapeHtml(client.phone)}')" 
                            class="text-green-600 hover:text-green-900 p-1" title="Send SMS">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                    <button onclick="editClient(${client.id})" 
                            class="text-blue-600 hover:text-blue-900 p-1" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteClient(${client.id})" 
                            class="text-red-600 hover:text-red-900 p-1" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function filterClients(searchTerm) {
    const filtered = clients.filter(client => 
        client.name.toLowerCase().includes(searchTerm) || 
        client.phone.includes(searchTerm)
    );
    renderClients(filtered);
}

// Modal functions
function openAddClientModal() {
    currentEditingClient = null;
    document.getElementById('modal-title').textContent = 'Add New Client';
    document.getElementById('client-form').reset();
    document.getElementById('client-id').value = '';
    document.getElementById('client-modal').classList.remove('hidden');
    document.getElementById('client-modal').classList.add('flex');
}

function editClient(clientId) {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    currentEditingClient = client;
    document.getElementById('modal-title').textContent = 'Edit Client';
    document.getElementById('client-id').value = client.id;
    document.getElementById('client-name').value = client.name;
    document.getElementById('client-phone').value = client.phone;
    document.getElementById('client-modal').classList.remove('hidden');
    document.getElementById('client-modal').classList.add('flex');
}

function closeClientModal() {
    document.getElementById('client-modal').classList.add('hidden');
    document.getElementById('client-modal').classList.remove('flex');
    currentEditingClient = null;
}

async function handleClientSubmit(e) {
    e.preventDefault();
    
    const clientId = document.getElementById('client-id').value;
    const name = document.getElementById('client-name').value.trim();
    const phone = document.getElementById('client-phone').value.trim();

    if (!name || !phone) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    try {
        let response;
        if (clientId) {
            // Update existing client
            response = await fetch(`/api/clients?id=${clientId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone })
            });
        } else {
            // Add new client
            response = await fetch('/api/clients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone })
            });
        }

        if (response.ok) {
            showNotification(
                clientId ? 'Client updated successfully' : 'Client added successfully', 
                'success'
            );
            closeClientModal();
            loadClients();
            loadClientsForSMS();
        } else {
            const error = await response.json();
            showNotification(error.error || 'Failed to save client', 'error');
        }
    } catch (error) {
        showNotification('Failed to save client', 'error');
        console.error('Error saving client:', error);
    }
}

async function deleteClient(clientId) {
    if (!confirm('Are you sure you want to delete this client?')) {
        return;
    }

    try {
        const response = await fetch(`/api/clients?id=${clientId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showNotification('Client deleted successfully', 'success');
            loadClients();
            loadClientsForSMS();
        } else {
            showNotification('Failed to delete client', 'error');
        }
    } catch (error) {
        showNotification('Failed to delete client', 'error');
        console.error('Error deleting client:', error);
    }
}

// SMS functions
async function loadClientsForSMS() {
    const select = document.getElementById('recipient-select');
    const currentValue = select.value;
    
    select.innerHTML = '<option value="">Select from clients or enter manually</option>';
    
    clients.forEach(client => {
        const option = document.createElement('option');
        option.value = JSON.stringify({ id: client.id, phone: client.phone });
        option.textContent = `${client.name} (${client.phone})`;
        select.appendChild(option);
    });
    
    // Restore previous selection if it still exists
    if (currentValue) {
        select.value = currentValue;
    }
}

function sendSMSToClient(clientId, phone) {
    switchTab('send-sms');
    
    // Find and select the client in the dropdown
    const select = document.getElementById('recipient-select');
    const clientOption = Array.from(select.options).find(option => {
        if (option.value) {
            const data = JSON.parse(option.value);
            return data.id === clientId;
        }
        return false;
    });
    
    if (clientOption) {
        select.value = clientOption.value;
        document.getElementById('manual-phone').value = '';
    }
}

async function handleSMSSubmit(e) {
    e.preventDefault();
    
    const apiKey = document.getElementById('api-key').value.trim();
    const senderName = document.getElementById('sender-name').value.trim();
    const message = document.getElementById('message-text').value.trim();
    const recipientSelect = document.getElementById('recipient-select').value;
    const manualPhone = document.getElementById('manual-phone').value.trim();

    // Determine recipient
    let phone, clientId = null;
    if (recipientSelect) {
        const recipientData = JSON.parse(recipientSelect);
        phone = recipientData.phone;
        clientId = recipientData.id;
    } else if (manualPhone) {
        phone = manualPhone;
    } else {
        showNotification('Please select a recipient or enter a phone number', 'error');
        return;
    }

    if (!apiKey || !senderName || !message) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    const sendBtn = document.getElementById('send-btn');
    const originalText = sendBtn.innerHTML;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Sending...';
    sendBtn.disabled = true;

    try {
        const response = await fetch('/api/send-sms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                apiKey,
                phone,
                message,
                senderName,
                clientId
            })
        });

        const result = await response.json();
        
        if (response.ok && result.status === 'sent') {
            showNotification('SMS sent successfully!', 'success');
            document.getElementById('sms-form').reset();
            document.getElementById('char-count').textContent = '0';
        } else {
            showNotification(result.error || 'Failed to send SMS', 'error');
        }
    } catch (error) {
        showNotification('Failed to send SMS', 'error');
        console.error('Error sending SMS:', error);
    } finally {
        sendBtn.innerHTML = originalText;
        sendBtn.disabled = false;
    }
}

// Utility functions
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const icon = document.getElementById('notification-icon');
    const messageEl = document.getElementById('notification-message');

    // Set icon and colors based on type
    let iconClass, bgColor;
    switch (type) {
        case 'success':
            iconClass = 'fas fa-check-circle text-green-500';
            bgColor = 'bg-green-50 border-green-200';
            break;
        case 'error':
            iconClass = 'fas fa-exclamation-circle text-red-500';
            bgColor = 'bg-red-50 border-red-200';
            break;
        default:
            iconClass = 'fas fa-info-circle text-blue-500';
            bgColor = 'bg-blue-50 border-blue-200';
    }

    icon.className = iconClass;
    notification.className = `notification fixed top-4 right-4 ${bgColor} rounded-lg shadow-lg p-4 max-w-sm z-50`;
    messageEl.textContent = message;

    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    // Auto hide after 5 seconds
    setTimeout(() => {
        hideNotification();
    }, 5000);
}

function hideNotification() {
    const notification = document.getElementById('notification');
    notification.classList.remove('show');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}