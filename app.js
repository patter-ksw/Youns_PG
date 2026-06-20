// Global App State
let supabaseClient = null;
let categories = [];
let services = [];
let isEditMode = false;
let searchQuery = "";

// --- Supabase 설정 ---
// sb_publishable_ 키는 공개용(클라이언트 전용) 키로, 코드에 포함해도 안전합니다.
// 로컬 server.py의 /config 엔드포인트 또는 이 기본값을 사용합니다.
const DEFAULT_SUPABASE_URL = 'https://elfgvesstuizdapwcpxx.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_RBvpOxgHiau8BfxNuwzUGA_uMYROtgS';

// Initialize App
async function initApp() {
    let supabaseUrl = DEFAULT_SUPABASE_URL;
    let supabaseKey = DEFAULT_SUPABASE_KEY;

    try {
        // 로컬 서버(server.py)에서 설정을 가져오되, 실패 시 기본값 사용
        const response = await fetch('/config');
        if (response.ok) {
            const config = await response.json();
            if (config.SUPABASE_URL) supabaseUrl = config.SUPABASE_URL;
            if (config.SUPABASE_KEY) supabaseKey = config.SUPABASE_KEY;
        }
    } catch (e) {
        // /config 엔드포인트 없을 시 기본값으로 계속 진행 (정적 배포 환경)
        console.info('/config 엔드포인트 없음, 기본값 사용:', e.message);
    }

    try {
        // Initialize Supabase Client
        const { createClient } = window.supabase;
        supabaseClient = createClient(supabaseUrl, supabaseKey);

        // Load Data
        await loadData();
        setupEventListeners();
        renderDashboard();
    } catch (error) {
        console.error(error);
        renderError('Supabase 초기화 중 오류 발생: ' + error.message);
    }
}

// Load Categories and Services from Supabase
async function loadData() {
    if (!supabaseClient) return;
    
    try {
        const [catResponse, servResponse] = await Promise.all([
            supabaseClient.from('categories').select('*').order('name'),
            supabaseClient.from('services').select('*').order('title')
        ]);

        if (catResponse.error) throw catResponse.error;
        if (servResponse.error) throw servResponse.error;

        categories = catResponse.data || [];
        services = servResponse.data || [];
    } catch (error) {
        console.error('데이터 로드 실패:', error);
        alert('Supabase로부터 데이터를 가져오는 중 오류가 발생했습니다.\n테이블 생성 여부를 확인해 주세요.');
    }
}

// Set up UI Event Listeners
function setupEventListeners() {
    // Search
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderDashboard();
    });

    // Toggle Edit Mode
    const btnToggleEdit = document.getElementById('btn-toggle-edit');
    btnToggleEdit.addEventListener('click', () => {
        isEditMode = !isEditMode;
        
        // Update button UI
        btnToggleEdit.innerHTML = isEditMode ? '<span>✔️</span> 편집 모드 끄기' : '<span>⚙️</span> 편집 모드 켜기';
        if (isEditMode) {
            btnToggleEdit.classList.add('btn-primary');
        } else {
            btnToggleEdit.classList.remove('btn-primary');
        }

        // Toggle visibility of add category section
        document.getElementById('add-category-section').style.display = isEditMode ? 'flex' : 'none';
        
        // Re-render
        renderDashboard();
    });

    // Add Category Button
    document.getElementById('btn-show-add-category').addEventListener('click', () => {
        showCategoryModal();
    });

    // Category Form Submit
    document.getElementById('category-form').addEventListener('submit', handleCategorySubmit);

    // Service Form Submit
    document.getElementById('service-form').addEventListener('submit', handleServiceSubmit);
}

// Render Error Message
function renderError(message) {
    const container = document.getElementById('categories-container');
    container.innerHTML = `
        <div class="empty-state" style="color: var(--danger-color); padding: 30px; border: 1px dashed var(--danger-color); border-radius: 12px;">
            <p style="font-weight: 600; margin-bottom: 8px;">🚨 구성 실패</p>
            <p style="font-size: 0.9rem;">${message}</p>
        </div>
    `;
}

// Render Main Dashboard Content
function renderDashboard() {
    const container = document.getElementById('categories-container');
    
    if (categories.length === 0) {
        if (isEditMode) {
            container.innerHTML = `
                <div class="empty-state">
                    카테고리가 없습니다. 아래의 "새 카테고리 추가" 버튼을 클릭하여 생성하세요.
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    등록된 카테고리가 없습니다. 편집 모드를 켜서 등록하세요.
                </div>
            `;
        }
        return;
    }

    // Toggle body class for edit mode styling
    if (isEditMode) {
        container.classList.add('edit-mode');
    } else {
        container.classList.remove('edit-mode');
    }

    let html = '';

    categories.forEach(category => {
        // Filter services for this category
        const categoryServices = services.filter(service => service.category_id === category.id);
        const filteredServices = categoryServices.filter(service => {
            if (!searchQuery) return true;
            return (
                service.title.toLowerCase().includes(searchQuery) ||
                (service.description && service.description.toLowerCase().includes(searchQuery)) ||
                (service.badge && service.badge.toLowerCase().includes(searchQuery))
            );
        });

        // Hide category if searching and has no matching services
        if (searchQuery && filteredServices.length === 0 && !isEditMode) {
            return;
        }

        html += `
            <div class="category-card" data-category-id="${category.id}">
                <div class="category-header">
                    <h2 class="category-title">
                        <span class="category-icon">${category.icon || '📁'}</span>
                        <span>${category.name}</span>
                    </h2>
                    <div class="category-actions">
                        <button class="action-btn" onclick="showCategoryModal(${category.id}, '${category.name}', '${category.icon || ''}')">✏️ 수정</button>
                        <button class="action-btn delete" onclick="deleteCategory(${category.id})">🗑️ 삭제</button>
                    </div>
                </div>
                
                <div class="services-grid">
        `;

        filteredServices.forEach(service => {
            const linkUrl = service.url && service.url !== '#' ? service.url : 'javascript:void(0);';
            const targetAttr = service.url && service.url !== '#' && service.url.startsWith('http') ? 'target="_blank"' : '';
            
            html += `
                <a href="${linkUrl}" ${targetAttr} class="service-card">
                    <div class="service-icon-container">
                        ${service.icon || '⚙️'}
                    </div>
                    <div class="service-content">
                        <div>
                            <h3 class="service-title">${service.title}</h3>
                            <p class="service-desc" title="${service.description || ''}">${service.description || ''}</p>
                        </div>
                        <div class="service-bottom">
                            ${service.badge ? `<span class="service-badge">${service.badge}</span>` : '<span></span>'}
                        </div>
                    </div>
                    <span class="service-arrow">➔</span>
                    
                    <div class="service-actions" onclick="event.preventDefault(); event.stopPropagation();">
                        <button class="action-btn" onclick="showServiceModalForEdit(${JSON.stringify(service).replace(/"/g, '&quot;')})">✏️</button>
                        <button class="action-btn delete" onclick="deleteService(${service.id})">🗑️</button>
                    </div>
                </a>
            `;
        });

        // Show add card placeholder in edit mode
        if (isEditMode) {
            html += `
                <div class="add-service-card" onclick="showServiceModalForAdd(${category.id})">
                    <span>+</span>
                    <p style="font-size: 0.8rem;">새 서비스 추가</p>
                </div>
            `;
        }

        html += `
                </div>
            </div>
        `;
    });

    if (html === '') {
        container.innerHTML = `
            <div class="empty-state">
                검색 조건에 맞는 서비스가 없습니다.
            </div>
        `;
    } else {
        container.innerHTML = html;
    }
}

// Modal management utilities
window.openModal = function(modalId) {
    document.getElementById(modalId).classList.add('active');
};

window.closeModal = function(modalId) {
    document.getElementById(modalId).classList.remove('active');
};

// Category Modal Actions
function showCategoryModal(id = null, name = '', icon = '') {
    const isEdit = id !== null;
    document.getElementById('category-modal-title').innerText = isEdit ? '카테고리 수정' : '카테고리 추가';
    document.getElementById('category-id').value = id || '';
    document.getElementById('category-name').value = name;
    document.getElementById('category-icon-input').value = icon || '📁';
    openModal('category-modal');
}

async function handleCategorySubmit(e) {
    e.preventDefault();
    if (!supabaseClient) return;

    const id = document.getElementById('category-id').value;
    const name = document.getElementById('category-name').value.trim();
    const icon = document.getElementById('category-icon-input').value.trim();

    try {
        let error = null;
        if (id) {
            // Update
            const { error: err } = await supabaseClient
                .from('categories')
                .update({ name, icon })
                .eq('id', id);
            error = err;
        } else {
            // Create
            const { error: err } = await supabaseClient
                .from('categories')
                .insert([{ name, icon }]);
            error = err;
        }

        if (error) throw error;

        closeModal('category-modal');
        await loadData();
        renderDashboard();
    } catch (error) {
        console.error('카테고리 저장 오류:', error);
        alert('카테고리를 저장하지 못했습니다: ' + error.message);
    }
}

window.deleteCategory = async function(id) {
    if (!confirm('정말 이 카테고리를 삭제하시겠습니까?\n해당 카테고리 내부의 모든 서비스도 함께 삭제됩니다.')) {
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('categories')
            .delete()
            .eq('id', id);

        if (error) throw error;

        await loadData();
        renderDashboard();
    } catch (error) {
        console.error('카테고리 삭제 오류:', error);
        alert('카테고리를 삭제하지 못했습니다: ' + error.message);
    }
};

// Service Modal Actions
window.showServiceModalForAdd = function(categoryId) {
    document.getElementById('service-modal-title').innerText = '서비스 추가';
    document.getElementById('service-id').value = '';
    document.getElementById('service-category-id').value = categoryId;
    document.getElementById('service-title-input').value = '';
    document.getElementById('service-desc-input').value = '';
    document.getElementById('service-url-input').value = '#';
    document.getElementById('service-badge-input').value = 'Plugin';
    document.getElementById('service-icon-input').value = '⚙️';
    openModal('service-modal');
};

window.showServiceModalForEdit = function(service) {
    document.getElementById('service-modal-title').innerText = '서비스 수정';
    document.getElementById('service-id').value = service.id;
    document.getElementById('service-category-id').value = service.category_id;
    document.getElementById('service-title-input').value = service.title;
    document.getElementById('service-desc-input').value = service.description || '';
    document.getElementById('service-url-input').value = service.url || '#';
    document.getElementById('service-badge-input').value = service.badge || '';
    document.getElementById('service-icon-input').value = service.icon || '⚙️';
    openModal('service-modal');
};

async function handleServiceSubmit(e) {
    e.preventDefault();
    if (!supabaseClient) return;

    const id = document.getElementById('service-id').value;
    const category_id = document.getElementById('service-category-id').value;
    const title = document.getElementById('service-title-input').value.trim();
    const description = document.getElementById('service-desc-input').value.trim();
    const url = document.getElementById('service-url-input').value.trim();
    const badge = document.getElementById('service-badge-input').value.trim();
    const icon = document.getElementById('service-icon-input').value.trim();

    try {
        let error = null;
        const payload = { category_id, title, description, url, badge, icon };
        
        if (id) {
            // Update
            const { error: err } = await supabaseClient
                .from('services')
                .update(payload)
                .eq('id', id);
            error = err;
        } else {
            // Create
            const { error: err } = await supabaseClient
                .from('services')
                .insert([payload]);
            error = err;
        }

        if (error) throw error;

        closeModal('service-modal');
        await loadData();
        renderDashboard();
    } catch (error) {
        console.error('서비스 저장 오류:', error);
        alert('서비스를 저장하지 못했습니다: ' + error.message);
    }
}

window.deleteService = async function(id) {
    if (!confirm('정말 이 서비스를 삭제하시겠습니까?')) {
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('services')
            .delete()
            .eq('id', id);

        if (error) throw error;

        await loadData();
        renderDashboard();
    } catch (error) {
        console.error('서비스 삭제 오류:', error);
        alert('서비스를 삭제하지 못했습니다: ' + error.message);
    }
};

// Start App when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
