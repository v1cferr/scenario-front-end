// Configuração da API
const API_BASE_URL = 'http://localhost:8080/api';
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

// Estado da aplicação
let environments = [];
let luminaires = [];
let editingEnvironmentId = null;
let editingLuminaireId = null;

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
    
    // Campo de brilho removido na simplificação
    // const brightnessRange = document.getElementById('lumBrightness');
    // const brightnessValue = document.getElementById('brightnessValue');
    
    // if (brightnessRange && brightnessValue) {
    //     brightnessRange.addEventListener('input', function() {
    //         brightnessValue.textContent = this.value;
    //     });
    // }
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
    
    // Image file input preview
    const envImageInput = document.getElementById('envImage');
    if (envImageInput) {
        envImageInput.addEventListener('change', handleImagePreview);
    }
    
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
        
        // Corrigir: healthData.database é um objeto, não string
        let dbInfo = 'H2 Memory';
        if (healthData.database && typeof healthData.database === 'object') {
            dbInfo = healthData.database.product || healthData.database.driver || 'Database';
        } else if (typeof healthData.database === 'string') {
            dbInfo = healthData.database;
        }
        
        document.getElementById('dbStatus').textContent = dbInfo;
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
        const response = await apiRequest('/environments');
        // Corrigir: API retorna paginação {content: [...]} 
        environments = Array.isArray(response) ? response : (response.content || response.environments || []);
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
        const response = await apiRequest('/luminaires');
        // Corrigir: API retorna paginação {content: [...]}
        luminaires = Array.isArray(response) ? response : (response.content || response.luminaires || []);
        renderLuminaires();
    } catch (error) {
        console.error('Erro carregando luminárias:', error);
        luminaires = [];
        renderLuminaires();
    }
}

// Rendering
function renderEnvironments() {
    console.log('🏠 Renderizando ambientes...', environments.length, 'ambientes encontrados');
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
    
    grid.innerHTML = environments.map(env => {
        return `
            <div class="environment-card" data-environment-id="${env.id}">
                <div class="environment-image">
                    <img alt="${env.name}" 
                         style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 15px; display: none;"
                         onerror="this.style.display='none'">
                    <div class="image-count" style="display: none; position: absolute; top: 5px; right: 5px; background: rgba(0,0,0,0.7); color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;"></div>
                </div>
                <h4><i class="fas fa-home"></i> ${env.name}</h4>
                <p>${env.description || 'Sem descrição'}</p>
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
        `;
    }).join('');

    console.log('📋 HTML dos ambientes gerado, chamando loadEnvironmentImages()...');
    // Carregar as imagens dos ambientes após renderizar
    setTimeout(() => {
        loadEnvironmentImages();
    }, 100); // Pequeno delay para garantir que o DOM foi atualizado
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
            <div class="luminaire-card">
                <h4><i class="fas fa-lightbulb"></i> ${lum.name}</h4>
                <div class="luminaire-info">
                    <span><strong>ID:</strong> ${lum.id}</span>
                    <span><strong>Ambiente:</strong> ${envName}</span>
                </div>
                <div class="actions">
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
    
    // Se estamos editando, delegar para a função de atualização
    if (editingEnvironmentId !== null) {
        await updateEnvironment(editingEnvironmentId);
        return;
    }
    
    const name = document.getElementById('envName').value.trim();
    const description = document.getElementById('envDescription').value.trim();
    const imageFile = document.getElementById('envImage').files[0];
    
    // Validações
    if (!name) {
        showNotification('Nome do ambiente é obrigatório', 'error');
        return;
    }
    
    if (name.length < 2) {
        showNotification('Nome deve ter pelo menos 2 caracteres', 'error');
        return;
    }
    
    // VALIDAÇÃO OBRIGATÓRIA DA IMAGEM
    if (!imageFile) {
        showNotification('Imagem do ambiente é obrigatória', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        // Primeiro, criar o ambiente
        const formData = {
            name,
            description: description || null
        };
        
        const environment = await apiRequest('/environments', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        // Upload da imagem é obrigatório - se falhar, deve deletar o ambiente
        try {
            await uploadEnvironmentImage(environment.id, imageFile);
        } catch (uploadError) {
            // Se upload falhar, deletar o ambiente criado
            try {
                await apiRequest(`/environments/${environment.id}`, { method: 'DELETE' });
            } catch (deleteError) {
                console.error('Erro ao deletar ambiente após falha no upload:', deleteError);
            }
            throw new Error(`Upload da imagem falhou: ${uploadError.message}`);
        }
        
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
    
    // Se estamos editando, delegar para a função de atualização
    if (editingLuminaireId !== null) {
        await updateLuminaire(editingLuminaireId);
        return;
    }
    
    const name = document.getElementById('lumName').value.trim();
    const environmentId = parseInt(document.getElementById('lumEnvironment').value);
    
    // Validações
    if (!name) {
        showNotification('Nome da luminária é obrigatório', 'error');
        return;
    }
    
    if (!environmentId || isNaN(environmentId)) {
        showNotification('Ambiente é obrigatório', 'error');
        return;
    }
    
    const formData = {
        name,
        environmentId
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
    } catch (error) {
        showNotification('Erro ao criar luminária: ' + error.message, 'error');
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
    // Limpar preview de imagem ao abrir modal para novo ambiente
    clearImagePreview('envImage');
    document.getElementById('createEnvironmentModal').style.display = 'block';
}

function showCreateLuminaireModal() {
    if (environments.length === 0) {
        showNotification('Crie um ambiente primeiro!', 'warning');
        return;
    }
    
    // Resetar flag de edição e título do modal para criar nova luminária
    editingLuminaireId = null;
    document.querySelector('#createLuminaireModal h3').textContent = 'Criar Luminária';
    
    // Carregar ambientes no select
    updateEnvironmentSelect();
    
    document.getElementById('createLuminaireModal').style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    
    // Resetar flags de edição e títulos dos modais
    if (modalId === 'createEnvironmentModal') {
        editingEnvironmentId = null;
        document.querySelector('#createEnvironmentModal h3').textContent = 'Criar Ambiente';
        document.getElementById('createEnvironmentForm').reset();
        // Limpar preview de imagem
        clearImagePreview('envImage');
    } else if (modalId === 'createLuminaireModal') {
        editingLuminaireId = null;
        document.querySelector('#createLuminaireModal h3').textContent = 'Criar Luminária';
        document.getElementById('createLuminaireForm').reset();
    }
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

// Implementar edição de ambientes
function editEnvironment(id) {
    const environment = environments.find(env => env.id === id);
    if (!environment) {
        showNotification('Ambiente não encontrado', 'error');
        return;
    }
    
    // Definir o ID de edição
    editingEnvironmentId = id;
    
    // Preencher o modal com dados existentes
    document.getElementById('envName').value = environment.name;
    document.getElementById('envDescription').value = environment.description || '';
    
    // Limpar upload de imagem (não tentamos preencher arquivo existente)
    clearImagePreview('envImage');
    
    // Mudar título do modal
    document.querySelector('#createEnvironmentModal h3').textContent = 'Editar Ambiente';
    
    // Abrir modal
    document.getElementById('createEnvironmentModal').style.display = 'flex';
}

async function updateEnvironment(id) {
    const name = document.getElementById('envName').value;
    const description = document.getElementById('envDescription').value;
    const imageFile = document.getElementById('envImage').files[0];
    
    const formData = {
        name,
        description: description || null
    };
    
    try {
        showLoading(true);
        
        // Atualizar dados do ambiente
        await apiRequest(`/environments/${id}`, {
            method: 'PUT',
            body: JSON.stringify(formData)
        });
        
        // Se há uma nova imagem, fazer upload
        if (imageFile) {
            await uploadEnvironmentImage(id, imageFile);
        }
        
        closeModal('createEnvironmentModal');
        await loadEnvironments();
        showNotification('Ambiente atualizado com sucesso!', 'success');
        
        // Resetar flag de edição e restaurar título do modal
        editingEnvironmentId = null;
        document.querySelector('#createEnvironmentModal h3').textContent = 'Criar Ambiente';
    } catch (error) {
        showNotification('Erro ao atualizar ambiente: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Implementar edição de luminárias
function editLuminaire(id) {
    const luminaire = luminaires.find(lum => lum.id === id);
    if (!luminaire) {
        showNotification('Luminária não encontrada', 'error');
        return;
    }
    
    // Definir o ID de edição
    editingLuminaireId = id;
    
    // Carregar ambientes no select primeiro
    updateEnvironmentSelect();
    
    // Preencher o modal com dados existentes (apenas campos que existem)
    document.getElementById('lumName').value = luminaire.name || '';
    document.getElementById('lumEnvironment').value = luminaire.environmentId || '';
    
    // Mudar título do modal
    document.querySelector('#createLuminaireModal h3').textContent = 'Editar Luminária';
    
    // Abrir modal
    document.getElementById('createLuminaireModal').style.display = 'flex';
}

async function updateLuminaire(id) {
    const formData = {
        name: document.getElementById('lumName').value,
        environmentId: parseInt(document.getElementById('lumEnvironment').value)
    };
    
    try {
        showLoading(true);
        await apiRequest(`/luminaires/${id}`, {
            method: 'PUT',
            body: JSON.stringify(formData)
        });
        
        closeModal('createLuminaireModal');
        await loadLuminaires();
        showNotification('Luminária atualizada com sucesso!', 'success');
        
        // Resetar flag de edição e restaurar título do modal
        editingLuminaireId = null;
        document.querySelector('#createLuminaireModal h3').textContent = 'Criar Luminária';
    } catch (error) {
        showNotification('Erro ao atualizar luminária: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Image Upload Functions
function handleImagePreview(event) {
    const file = event.target.files[0];
    const inputId = event.target.id;
    const previewId = inputId + 'Preview';
    const imgId = inputId + 'PreviewImg';
    
    const preview = document.getElementById(previewId);
    const img = document.getElementById(imgId);
    
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            img.src = e.target.result;
            preview.style.display = 'flex';
        };
        reader.readAsDataURL(file);
    } else if (file) {
        showNotification('Por favor, selecione apenas arquivos de imagem', 'error');
        event.target.value = '';
    }
}

function clearImagePreview(inputId) {
    const input = document.getElementById(inputId);
    const previewId = inputId + 'Preview';
    const preview = document.getElementById(previewId);
    
    input.value = '';
    preview.style.display = 'none';
}

async function uploadEnvironmentImage(environmentId, imageFile) {
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('imageName', `Imagem do ambiente ${environmentId}`);
    
    try {
        const response = await fetch(`${API_BASE_URL}/environments/${environmentId}/images/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Erro no upload: ${response.status} - ${errorData}`);
        }

        const result = await response.json();
        console.log('Upload realizado com sucesso:', result);
        return result;
    } catch (error) {
        console.error('Erro no upload da imagem:', error);
        showNotification('Erro ao fazer upload da imagem: ' + error.message, 'error');
        throw error;
    }
}

// Função para carregar as imagens dos ambientes
async function loadEnvironmentImages() {
    console.log('🖼️ Iniciando carregamento de imagens dos ambientes...');
    
    if (!authToken) {
        console.log('❌ Token de autenticação não encontrado');
        return;
    }

    const environments = document.querySelectorAll('.environment-card');
    console.log(`📋 Encontrados ${environments.length} ambientes para carregar imagens`);
    
    for (const envCard of environments) {
        const envId = envCard.dataset.environmentId;
        console.log(`🔍 Carregando imagens para ambiente ${envId}...`);
        
        try {
            const response = await fetch(`${API_BASE_URL}/environments/${envId}/images-urls`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`✅ Dados de imagens recebidos para ambiente ${envId}:`, data);
                
                if (data.images && data.images.length > 0) {
                    // Usar a primeira imagem como principal
                    const firstImage = data.images[0];
                    const img = envCard.querySelector('.environment-image img');
                    
                    if (img && firstImage.url) {
                        console.log(`🖼️ Configurando imagem para ambiente ${envId}: ${firstImage.url}`);
                        
                        img.onload = function() {
                            console.log(`✅ Imagem carregada com sucesso para ambiente ${envId}`);
                            img.style.display = 'block';
                        };
                        
                        img.onerror = function() {
                            console.log(`❌ Erro ao carregar imagem para ambiente ${envId}: ${firstImage.url}`);
                            img.style.display = 'none';
                        };
                        
                        img.src = firstImage.url;
                        
                        // Adicionar informações extras se existirem múltiplas imagens
                        if (data.images.length > 1) {
                            const imageCount = envCard.querySelector('.image-count');
                            if (imageCount) {
                                imageCount.textContent = `+${data.images.length - 1} imagens`;
                                imageCount.style.display = 'block';
                            }
                        }
                    }
                } else {
                    console.log(`⚠️ Nenhuma imagem encontrada para ambiente ${envId}`);
                    const img = envCard.querySelector('.environment-image img');
                    if (img) {
                        img.style.display = 'none';
                    }
                }
            } else {
                console.log(`❌ Erro ao buscar imagens para ambiente ${envId}: ${response.status}`);
            }
        } catch (error) {
            console.error(`❌ Erro de rede ao carregar imagens para ambiente ${envId}:`, error);
        }
    }
    
    console.log('🏁 Carregamento de imagens concluído');
}