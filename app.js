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
        initAuth();
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
        if (!currentUser || currentUser.username !== 'patter') {
            alert("관리자 권한이 필요합니다. 'patter' 계정으로 로그인해주세요.");
            return;
        }

        if (!isEditMode) {
            isEditMode = true;
            btnToggleEdit.classList.add('active');
        } else {
            isEditMode = false;
            btnToggleEdit.classList.remove('active');
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

// Utilities for Icon
function renderIconHtml(iconStr, defaultIcon) {
    const icon = iconStr || defaultIcon;
    if (icon.startsWith('data:image/') || icon.startsWith('http')) {
        return `<img src="${icon}" alt="icon" class="rendered-icon">`;
    }
    return icon;
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
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
                        <span class="category-icon">${renderIconHtml(category.icon, '📁')}</span>
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
                        ${renderIconHtml(service.icon, '⚙️')}
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
    document.getElementById('category-icon-file').value = '';
    openModal('category-modal');
}

async function handleCategorySubmit(e) {
    e.preventDefault();
    if (!supabaseClient) return;

    const id = document.getElementById('category-id').value;
    const name = document.getElementById('category-name').value.trim();
    let icon = document.getElementById('category-icon-input').value.trim();
    const fileInput = document.getElementById('category-icon-file');

    try {
        if (fileInput.files && fileInput.files.length > 0) {
            icon = await readFileAsDataURL(fileInput.files[0]);
        }

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
    document.getElementById('service-icon-file').value = '';
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
    document.getElementById('service-icon-file').value = '';
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
    let icon = document.getElementById('service-icon-input').value.trim();
    const fileInput = document.getElementById('service-icon-file');

    try {
        if (fileInput.files && fileInput.files.length > 0) {
            icon = await readFileAsDataURL(fileInput.files[0]);
        }

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

// --- Auth Logic ---
let currentUser = null;
let authTab = 'login'; // 'login' or 'signup'

function initAuth() {
    // Check localStorage for session (mock simple session)
    const savedUser = localStorage.getItem('youns_tr_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateAuthUI();
    }

    document.getElementById('btn-login-modal').addEventListener('click', () => {
        openModal('auth-modal');
    });

    document.getElementById('btn-logout').addEventListener('click', () => {
        currentUser = null;
        localStorage.removeItem('youns_tr_user');
        updateAuthUI();
    });

    document.getElementById('auth-form').addEventListener('submit', handleAuthSubmit);
    
    // Board init
    document.getElementById('btn-board').addEventListener('click', () => {
        if (!currentUser) {
            openModal('auth-modal');
        } else {
            openModal('board-modal');
            loadBoardPosts();
        }
    });

    document.getElementById('btn-board-write').addEventListener('click', () => {
        document.getElementById('board-write-form').reset();
        document.getElementById('board-post-id').value = '';
        document.getElementById('board-write-title').innerText = '글쓰기';
        openModal('board-write-modal');
    });

    document.getElementById('board-write-form').addEventListener('submit', handleBoardSubmit);
    document.getElementById('reply-form').addEventListener('submit', handleReplySubmit);
    
    document.getElementById('btn-edit-post').addEventListener('click', () => {
        openModal('board-write-modal');
        document.getElementById('board-write-title').innerText = '글 수정';
    });

    document.getElementById('btn-delete-post').addEventListener('click', deleteCurrentPost);
}

window.switchAuthTab = function(tab) {
    authTab = tab;
    document.querySelectorAll('.auth-tab').forEach(el => el.classList.remove('active'));
    document.querySelector(`.auth-tab[onclick*="${tab}"]`).classList.add('active');
    
    if (tab === 'signup') {
        document.getElementById('auth-nickname-group').style.display = 'block';
        document.getElementById('auth-nickname').required = true;
        document.getElementById('btn-auth-submit').innerText = '회원가입';
    } else {
        document.getElementById('auth-nickname-group').style.display = 'none';
        document.getElementById('auth-nickname').required = false;
        document.getElementById('btn-auth-submit').innerText = '로그인';
    }
};

function disableEditMode() {
    if (isEditMode) {
        isEditMode = false;
        const btnToggleEdit = document.getElementById('btn-toggle-edit');
        btnToggleEdit.classList.remove('active');
        document.getElementById('add-category-section').style.display = 'none';
        renderDashboard();
    }
}

function updateAuthUI() {
    const btnToggleEdit = document.getElementById('btn-toggle-edit');
    
    if (currentUser) {
        document.getElementById('btn-login-modal').style.display = 'none';
        document.getElementById('user-info').style.display = 'flex';
        document.getElementById('user-nickname').innerText = currentUser.nickname;
        
        if (currentUser.username === 'patter') {
            btnToggleEdit.style.display = 'block';
        } else {
            btnToggleEdit.style.display = 'none';
            disableEditMode();
        }
    } else {
        document.getElementById('btn-login-modal').style.display = 'block';
        document.getElementById('user-info').style.display = 'none';
        btnToggleEdit.style.display = 'none';
        
        disableEditMode();
    }
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    if (!supabaseClient) return;

    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value.trim();

    try {
        if (authTab === 'login') {
            const { data, error } = await supabaseClient
                .from('tr_users')
                .select('*')
                .eq('username', username)
                .eq('password', password)
                .single();
                
            if (error || !data) {
                alert('로그인 실패: 아이디와 비밀번호를 확인하세요.');
                return;
            }
            currentUser = data;
        } else {
            const nickname = document.getElementById('auth-nickname').value.trim();
            const { data: existing } = await supabaseClient.from('tr_users').select('id').eq('username', username).single();
            if (existing) {
                alert('이미 존재하는 아이디입니다.');
                return;
            }

            const { data, error } = await supabaseClient
                .from('tr_users')
                .insert([{ username, password, nickname }])
                .select()
                .single();
                
            if (error) throw error;
            currentUser = data;
        }

        localStorage.setItem('youns_tr_user', JSON.stringify(currentUser));
        updateAuthUI();
        closeModal('auth-modal');
        document.getElementById('auth-form').reset();
    } catch (error) {
        console.error('Auth error:', error);
        alert('인증 처리 중 오류가 발생했습니다: ' + error.message);
    }
}

// --- Board Logic ---
let currentBoardPosts = [];
let currentPostDetail = null;

async function loadBoardPosts() {
    if (!supabaseClient) return;
    try {
        const { data, error } = await supabaseClient
            .from('board_posts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        currentBoardPosts = data || [];
        renderBoardList();
    } catch (error) {
        console.error('Error loading board:', error);
    }
}

function renderBoardList() {
    const list = document.getElementById('board-list');
    if (currentBoardPosts.length === 0) {
        list.innerHTML = '<li style="text-align: center; color: var(--text-muted);">등록된 게시글이 없습니다.</li>';
        return;
    }
    list.innerHTML = currentBoardPosts.map(post => `
        <li onclick="openPostDetail(${post.id})">
            <div class="post-title">${escapeHtml(post.title)}</div>
            <div class="post-meta">
                <span>👤 ${escapeHtml(post.nickname)}</span>
                <span>${new Date(post.created_at).toLocaleString()}</span>
            </div>
        </li>
    `).join('');
}

async function handleBoardSubmit(e) {
    e.preventDefault();
    if (!supabaseClient || !currentUser) return;

    const id = document.getElementById('board-post-id').value;
    const title = document.getElementById('board-title').value.trim();
    const content = document.getElementById('board-content').value.trim();

    try {
        let error = null;
        if (id) {
            const { error: err } = await supabaseClient
                .from('board_posts')
                .update({ title, content })
                .eq('id', id);
            error = err;
        } else {
            const { error: err } = await supabaseClient
                .from('board_posts')
                .insert([{ 
                    user_id: currentUser.id, 
                    nickname: currentUser.nickname, 
                    title, 
                    content 
                }]);
            error = err;
        }

        if (error) throw error;
        closeModal('board-write-modal');
        loadBoardPosts();
        
        // If editing, also update the detail modal
        if (id && currentPostDetail && currentPostDetail.id == id) {
            currentPostDetail.title = title;
            currentPostDetail.content = content;
            renderPostDetail();
        }
    } catch (error) {
        alert('게시글 저장 오류: ' + error.message);
    }
}

window.openPostDetail = async function(postId) {
    const post = currentBoardPosts.find(p => p.id == postId);
    if (!post) return;
    
    currentPostDetail = post;
    renderPostDetail();
    openModal('board-detail-modal');
    loadReplies(postId);
};

function renderPostDetail() {
    if (!currentPostDetail) return;
    document.getElementById('detail-title').innerText = currentPostDetail.title;
    document.getElementById('detail-nickname').innerText = currentPostDetail.nickname;
    document.getElementById('detail-date').innerText = new Date(currentPostDetail.created_at).toLocaleString();
    document.getElementById('detail-content').innerText = currentPostDetail.content;
    
    // Setup Edit form if user owns it
    document.getElementById('board-post-id').value = currentPostDetail.id;
    document.getElementById('board-title').value = currentPostDetail.title;
    document.getElementById('board-content').value = currentPostDetail.content;

    const isOwner = currentUser && currentUser.id === currentPostDetail.user_id;
    const isAdmin = currentUser && currentUser.username === 'patter';
    
    const actionsEl = document.getElementById('detail-actions');
    const editBtn = document.getElementById('btn-edit-post');
    
    if (isOwner || isAdmin) {
        actionsEl.style.display = 'flex';
        // Only owner can edit (or admin if you want, but usually owner edits)
        editBtn.style.display = isOwner ? 'block' : 'none';
    } else {
        actionsEl.style.display = 'none';
    }
}

async function deleteCurrentPost() {
    if (!currentPostDetail || !supabaseClient) return;
    if (!confirm('게시글을 삭제하시겠습니까?')) return;

    try {
        const { error } = await supabaseClient.from('board_posts').delete().eq('id', currentPostDetail.id);
        if (error) throw error;
        
        closeModal('board-detail-modal');
        loadBoardPosts();
    } catch (error) {
        alert('삭제 오류: ' + error.message);
    }
}

// --- Replies Logic ---
let currentReplies = [];

async function loadReplies(postId) {
    document.getElementById('replies-list').innerHTML = '<div style="text-align:center;color:gray;">로딩중...</div>';
    try {
        const { data, error } = await supabaseClient
            .from('board_replies')
            .select('*')
            .eq('post_id', postId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        currentReplies = data || [];
        renderReplies();
    } catch (error) {
        console.error('Replies load error:', error);
    }
}

function renderReplies() {
    const list = document.getElementById('replies-list');
    if (currentReplies.length === 0) {
        list.innerHTML = '<div style="color:var(--text-muted);font-size:0.9rem;">첫 번째 댓글을 남겨보세요.</div>';
        return;
    }

    // Build tree (1-depth visually, parent-child logic)
    const rootReplies = currentReplies.filter(r => !r.parent_id);
    const repliesByParent = {};
    currentReplies.forEach(r => {
        if (r.parent_id) {
            if (!repliesByParent[r.parent_id]) repliesByParent[r.parent_id] = [];
            repliesByParent[r.parent_id].push(r);
        }
    });

    let html = '';
    rootReplies.forEach(root => {
        html += renderReplyHTML(root, false);
        if (repliesByParent[root.id]) {
            repliesByParent[root.id].forEach(child => {
                html += renderReplyHTML(child, true);
            });
        }
    });

    list.innerHTML = html;
}

function renderReplyHTML(reply, isNested) {
    const isAdmin = currentUser && currentUser.username === 'patter';
    const isOwner = currentUser && currentUser.id === reply.user_id;
    const canDelete = isOwner || isAdmin;
    
    return `
        <div class="reply-item ${isNested ? 'nested' : ''}">
            <div class="reply-meta">
                <span style="font-weight:600;font-size:0.85rem;color:#311b92;">${escapeHtml(reply.nickname)}</span>
                <span style="font-size:0.75rem;color:var(--text-muted);">${new Date(reply.created_at).toLocaleString()}</span>
            </div>
            <div class="reply-content">${escapeHtml(reply.content)}</div>
            <div style="margin-top:5px; text-align:right;">
                ${!isNested ? `<button type="button" class="btn-text" style="font-size:0.75rem;" onclick="replyTo(${reply.id}, '${escapeHtml(reply.nickname)}')">답글</button>` : ''}
                ${canDelete ? `<button type="button" class="btn-text" style="font-size:0.75rem; color:var(--danger-color); margin-left:8px;" onclick="deleteReply(${reply.id})">삭제</button>` : ''}
            </div>
        </div>
    `;
}

window.replyTo = function(parentId, nickname) {
    document.getElementById('reply-parent-id').value = parentId;
    document.getElementById('replying-to-indicator').style.display = 'block';
    document.getElementById('replying-to-name').innerText = nickname;
    document.getElementById('reply-content').focus();
};

window.cancelReplyTo = function() {
    document.getElementById('reply-parent-id').value = '';
    document.getElementById('replying-to-indicator').style.display = 'none';
};

async function handleReplySubmit(e) {
    e.preventDefault();
    if (!supabaseClient || !currentUser || !currentPostDetail) return;

    const content = document.getElementById('reply-content').value.trim();
    const parentId = document.getElementById('reply-parent-id').value;

    try {
        const { error } = await supabaseClient.from('board_replies').insert([{
            post_id: currentPostDetail.id,
            parent_id: parentId ? parseInt(parentId) : null,
            user_id: currentUser.id,
            nickname: currentUser.nickname,
            content
        }]);

        if (error) throw error;
        
        document.getElementById('reply-content').value = '';
        cancelReplyTo();
        loadReplies(currentPostDetail.id);
    } catch (error) {
        alert('댓글 등록 오류: ' + error.message);
    }
}

window.deleteReply = async function(id) {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;
    try {
        const { error } = await supabaseClient.from('board_replies').delete().eq('id', id);
        if (error) throw error;
        loadReplies(currentPostDetail.id);
    } catch (error) {
        alert('삭제 오류: ' + error.message);
    }
};

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// Start App when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
