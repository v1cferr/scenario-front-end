// Configuração da API
const API_BASE_URL = 'http://localhost:8080/api';
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

// Estado da aplicação
let environments = [];
let luminaires = [];

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

function initializeApp() {
    if (authToken && currentUser) {
        showMainApp();
        loadData();
    } else {
        showLoginSection();
    }
    
    // Atualizar range de brilho
    const brightnessRange = document.getElementById('lumBrightness');
    const brightnessValue = document.getElementById('brightnessValue');
    
    if (brightnessRange && brightnessValue) {
        brightnessRange.addEventListener('input', function() {
            brightnessValue.textContent = this.value;
        });
    }
}

function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', handleLogin);
    
    // Create environment form
    const createEnvForm = document.getElementById('createEnvironmentForm');
    createEnvForm.addEventListener('submit', handleCreateEnvironment);
    
    // Create luminaire form
    const createLumForm = document.getElementById('createLuminaireForm');
    createLumForm.addEventListener('submit', handleCreateLuminaire);
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
}

// Authentication
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });
        
        if (response.ok) {
            const data = await response.json();
            authToken = data.token;  // Corrigido: era data.accessToken
            currentUser = { username, role: data.role || 'USER' };
            
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            showMainApp();
            loadData();
            showNotification('Login realizado com sucesso!', 'success');
        } else {
            const error = await response.json();
            showNotification(error.message || 'Erro no login', 'error');
        }
    } catch (error) {
        console.error('Erro no login:', error);
        showNotification('Erro de conexão com a API', 'error');
    } finally {
        showLoading(false);
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    showLoginSection();
    showNotification('Logout realizado com sucesso!', 'success');
}

// UI Navigation
function showLoginSection() {
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('mainApp').style.display = 'none';
    document.getElementById('authInfo').style.display = 'none';
}

function showMainApp() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    document.getElementById('authInfo').style.display = 'flex';
    document.getElementById('userInfo').textContent = `Olá, ${currentUser.username}!`;
}

// API Helpers
function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
    };
}

async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
        ...options,
        headers: {
            ...getAuthHeaders(),
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(url, config);
        
        if (response.status === 401) {
            // Token expirado
            logout();
            throw new Error('Sessão expirada. Faça login novamente.');
        }
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erro na requisição');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Erro na API:', error);
        throw error;
    }
}

// Data Loading
async function loadData() {
    try {
        showLoading(true);
        await Promise.all([
            loadEnvironments(),
            loadLuminaires(),
            checkHealth()
        ]);
    } catch (error) {
        console.error('Erro carregando dados:', error);
        showNotification('Erro ao carregar dados: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function checkHealth() {
    try {
        const health = await fetch(`${API_BASE_URL}/health`);
        const healthData = await health.json();
        
        document.getElementById('apiStatus').textContent = healthData.status || 'Online';
        document.getElementById('dbStatus').textContent = healthData.database || 'H2 Memory';
        document.getElementById('envStatus').textContent = 'Ativo';
        
        // Aplicar cores baseadas no status
        const apiStatusEl = document.getElementById('apiStatus');
        const dbStatusEl = document.getElementById('dbStatus');
        
        apiStatusEl.style.color = healthData.status === 'UP' ? '#10b981' : '#ef4444';
        dbStatusEl.style.color = '#10b981';
        
    } catch (error) {
        document.getElementById('apiStatus').textContent = 'Offline';
        document.getElementById('dbStatus').textContent = 'Erro';
        document.getElementById('apiStatus').style.color = '#ef4444';
        document.getElementById('dbStatus').style.color = '#ef4444';
    }
}

async function loadEnvironments() {
    try {
        environments = await apiRequest('/environments');
        renderEnvironments();
        updateEnvironmentSelect();
    } catch (error) {
        console.error('Erro carregando ambientes:', error);
        environments = [];
        renderEnvironments();
    }
}

async function loadLuminaires() {
    try {
        luminaires = await apiRequest('/luminaires');
        renderLuminaires();
    } catch (error) {
        console.error('Erro carregando luminárias:', error);
        luminaires = [];
        renderLuminaires();
    }
}

// Rendering
function renderEnvironments() {
    const grid = document.getElementById('environmentsGrid');
    
    if (environments.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-home" style="font-size: 3rem; color: #d1d5db; margin-bottom: 10px;"></i>
                <p>Nenhum ambiente encontrado</p>
                <p style="font-size: 12px; color: #6b7280;">Clique em "Novo Ambiente" para começar</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = environments.map(env => `
        <div class="environment-card">
            <h4><i class="fas fa-home"></i> ${env.name}</h4>
            <p>${env.description || 'Sem descrição'}</p>
            ${env.imageUrl ? `<img src="${env.imageUrl}" alt="${env.name}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 15px;">` : ''}
            <div class="environment-info">
                <small style="color: #6b7280;">ID: ${env.id}</small>
                <small style="color: #6b7280;">Criado: ${new Date(env.createdAt).toLocaleDateString()}</small>
            </div>
            <div class="actions">
                <button class="btn btn-secondary" onclick="editEnvironment(${env.id})">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-danger" onclick="deleteEnvironment(${env.id})">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            </div>
        </div>
    `).join('');
}

function renderLuminaires() {
    const grid = document.getElementById('luminairesGrid');
    
    if (luminaires.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-lightbulb" style="font-size: 3rem; color: #d1d5db; margin-bottom: 10px;"></i>
                <p>Nenhuma luminária encontrada</p>
                <p style="font-size: 12px; color: #6b7280;">Clique em "Nova Luminária" para começar</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = luminaires.map(lum => {
        const env = environments.find(e => e.id === lum.environmentId);
        const envName = env ? env.name : 'Ambiente não encontrado';
        
        return `
            <div class="luminaire-card ${lum.status ? 'active' : ''}">
                <div class="luminaire-status ${lum.status ? 'active' : ''}"></div>
                <h4><i class="fas fa-lightbulb"></i> ${lum.name}</h4>
                <div class="luminaire-info">
                    <span><strong>Tipo:</strong> ${lum.type}</span>
                    <span><strong>Brilho:</strong> ${lum.brightness}%</span>
                    <span><strong>Ambiente:</strong> ${envName}</span>
                    <span><strong>Posição:</strong> (${lum.positionX}, ${lum.positionY})</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                    <span style="font-size: 12px; margin-right: 10px;"><strong>Cor:</strong></span>
                    <div class="color-indicator" style="background-color: ${lum.color}"></div>
                    <span style="font-size: 12px; margin-left: 5px;">${lum.color}</span>
                </div>
                <div class="actions">
                    <button class="btn ${lum.status ? 'btn-danger' : 'btn-success'}" onclick="toggleLuminaire(${lum.id})">
                        <i class="fas fa-power-off"></i> ${lum.status ? 'Desligar' : 'Ligar'}
                    </button>
                    <button class="btn btn-secondary" onclick="editLuminaire(${lum.id})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-danger" onclick="deleteLuminaire(${lum.id})">
                        <i class="fas fa-trash"></i> Excluir
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function updateEnvironmentSelect() {
    const select = document.getElementById('lumEnvironment');
    select.innerHTML = '<option value="">Selecione um ambiente</option>' +
        environments.map(env => `<option value="${env.id}">${env.name}</option>`).join('');
}

// Environment Operations
async function handleCreateEnvironment(event) {
    event.preventDefault();
    
    const formData = {
        name: document.getElementById('envName').value,
        description: document.getElementById('envDescription').value,
        imageUrl: document.getElementById('envImageUrl').value || null
    };
    
    try {
        showLoading(true);
        await apiRequest('/environments', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        closeModal('createEnvironmentModal');
        await loadEnvironments();
        showNotification('Ambiente criado com sucesso!', 'success');
        
        // Reset form
        document.getElementById('createEnvironmentForm').reset();
    } catch (error) {
        showNotification('Erro ao criar ambiente: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function deleteEnvironment(id) {
    if (!confirm('Tem certeza que deseja excluir este ambiente?')) {
        return;
    }
    
    try {
        showLoading(true);
        await apiRequest(`/environments/${id}`, { method: 'DELETE' });
        await loadEnvironments();
        await loadLuminaires(); // Reload luminaires as they might be affected
        showNotification('Ambiente excluído com sucesso!', 'success');
    } catch (error) {
        showNotification('Erro ao excluir ambiente: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Luminaire Operations
async function handleCreateLuminaire(event) {
    event.preventDefault();
    
    const formData = {
        name: document.getElementById('lumName').value,
        type: document.getElementById('lumType').value,
        brightness: parseInt(document.getElementById('lumBrightness').value),
        color: document.getElementById('lumColor').value,
        status: document.getElementById('lumStatus').checked,
        positionX: parseFloat(document.getElementById('lumPositionX').value),
        positionY: parseFloat(document.getElementById('lumPositionY').value),
        environmentId: parseInt(document.getElementById('lumEnvironment').value)
    };
    
    try {
        showLoading(true);
        await apiRequest('/luminaires', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        closeModal('createLuminaireModal');
        await loadLuminaires();
        showNotification('Luminária criada com sucesso!', 'success');
        
        // Reset form
        document.getElementById('createLuminaireForm').reset();
        document.getElementById('lumBrightness').value = 80;
        document.getElementById('brightnessValue').textContent = '80';
    } catch (error) {
        showNotification('Erro ao criar luminária: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function toggleLuminaire(id) {
    const luminaire = luminaires.find(l => l.id === id);
    if (!luminaire) return;
    
    const updatedData = {
        ...luminaire,
        status: !luminaire.status
    };
    
    try {
        showLoading(true);
        await apiRequest(`/luminaires/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updatedData)
        });
        
        await loadLuminaires();
        showNotification(`Luminária ${updatedData.status ? 'ligada' : 'desligada'} com sucesso!`, 'success');
    } catch (error) {
        showNotification('Erro ao alterar luminária: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function deleteLuminaire(id) {
    if (!confirm('Tem certeza que deseja excluir esta luminária?')) {
        return;
    }
    
    try {
        showLoading(true);
        await apiRequest(`/luminaires/${id}`, { method: 'DELETE' });
        await loadLuminaires();
        showNotification('Luminária excluída com sucesso!', 'success');
    } catch (error) {
        showNotification('Erro ao excluir luminária: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Modal Operations
function showCreateEnvironmentModal() {
    document.getElementById('createEnvironmentModal').style.display = 'block';
}

function showCreateLuminaireModal() {
    if (environments.length === 0) {
        showNotification('Crie um ambiente primeiro!', 'warning');
        return;
    }
    document.getElementById('createLuminaireModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Utility Functions
function showLoading(show) {
    document.getElementById('loadingOverlay').style.display = show ? 'block' : 'none';
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${getNotificationIcon(type)}"></i>
        <span>${message}</span>
    `;
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 3000;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: slideInRight 0.3s ease;
        background: ${getNotificationColor(type)};
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-triangle',
        warning: 'exclamation-circle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

function getNotificationColor(type) {
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    return colors[type] || '#3b82f6';
}

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .empty-state {
        grid-column: 1 / -1;
        text-align: center;
        padding: 40px;
        color: #6b7280;
    }
`;
document.head.appendChild(style);

// Placeholder functions for edit operations
function editEnvironment(id) {
    showNotification('Funcionalidade de edição em desenvolvimento', 'info');
}

function editLuminaire(id) {
    showNotification('Funcionalidade de edição em desenvolvimento', 'info');
}
