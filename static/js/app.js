// State management
let state = {
    releases: [],
    filteredReleases: [],
    filters: {
        search: '',
        type: 'all', // 'all', 'Feature', 'Announcement', 'Issue', 'Deprecated', 'Fixed', 'Changed'
        sort: 'newest' // 'newest', 'oldest'
    },
    syncStatus: 'idle' // 'idle', 'syncing', 'error'
};

// UI Elements
const els = {
    refreshBtn: document.getElementById('refresh-btn'),
    refreshIcon: document.getElementById('refresh-icon'),
    statusBadge: document.getElementById('status-badge'),
    statusText: document.querySelector('.status-text'),
    
    // Stats
    statTotal: document.getElementById('stat-total'),
    statFeatures: document.getElementById('stat-features'),
    statIssues: document.getElementById('stat-issues'),
    statDeprecated: document.getElementById('stat-deprecated'),
    statCards: document.querySelectorAll('.stat-card'),

    // Controls
    searchInput: document.getElementById('search-input'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    sortSelect: document.getElementById('sort-select'),
    filterTags: document.querySelectorAll('.filter-tag'),
    resetFiltersBtn: document.getElementById('reset-filters-btn'),

    // Feed States
    loadingState: document.getElementById('loading-state'),
    errorState: document.getElementById('error-state'),
    errorMessage: document.getElementById('error-message'),
    emptyState: document.getElementById('empty-state'),
    timeline: document.getElementById('releases-timeline'),
    retryBtn: document.getElementById('retry-btn'),
    
    // Toasts
    toastContainer: document.getElementById('toast-container')
};

// Icon Mapping for Release Types
const typeIcons = {
    'Feature': 'fa-solid fa-wand-magic-sparkles',
    'Announcement': 'fa-solid fa-bullhorn',
    'Issue': 'fa-solid fa-triangle-exclamation',
    'Deprecated': 'fa-solid fa-ban',
    'Fixed': 'fa-solid fa-bug-slash',
    'Changed': 'fa-solid fa-arrows-rotate',
    'General': 'fa-solid fa-circle-info'
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    fetchReleases(false); // Load cached version first
});

// Event Listeners
function setupEventListeners() {
    // Refresh button
    els.refreshBtn.addEventListener('click', () => fetchReleases(true));
    els.retryBtn.addEventListener('click', () => fetchReleases(true));

    // Search input (with debouncing)
    let searchDebounce;
    els.searchInput.addEventListener('input', (e) => {
        const query = e.target.value;
        toggleClearSearchButton(query);
        
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => {
            state.filters.search = query.trim().toLowerCase();
            applyFilters();
        }, 250);
    });

    // Clear search
    els.clearSearchBtn.addEventListener('click', () => {
        els.searchInput.value = '';
        state.filters.search = '';
        toggleClearSearchButton('');
        els.searchInput.focus();
        applyFilters();
    });

    // Sorting
    els.sortSelect.addEventListener('change', (e) => {
        state.filters.sort = e.target.value;
        applyFilters();
    });

    // Filter pills
    els.filterTags.forEach(tag => {
        tag.addEventListener('click', () => {
            els.filterTags.forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
            state.filters.type = tag.dataset.filter;
            applyFilters();
        });
    });

    // Stat cards triggers filtering
    els.statCards.forEach(card => {
        card.addEventListener('click', () => {
            const filterVal = card.dataset.stat;
            let targetType = 'all';
            
            if (filterVal === 'feature') targetType = 'Feature';
            else if (filterVal === 'issue') targetType = 'Issue';
            else if (filterVal === 'deprecated') targetType = 'Deprecated';

            // Find corresponding tag pill and click it
            const targetTag = Array.from(els.filterTags).find(t => t.dataset.filter === targetType);
            if (targetTag) {
                targetTag.click();
            }
        });
    });

    // Reset filters button
    els.resetFiltersBtn.addEventListener('click', () => {
        resetFilters();
    });
}

// Helper to show/hide search clear button
function toggleClearSearchButton(query) {
    els.clearSearchBtn.style.display = query.length > 0 ? 'block' : 'none';
}

// Reset filters to defaults
function resetFilters() {
    els.searchInput.value = '';
    state.filters.search = '';
    toggleClearSearchButton('');
    
    state.filters.type = 'all';
    els.filterTags.forEach(tag => {
        if (tag.dataset.filter === 'all') tag.classList.add('active');
        else tag.classList.remove('active');
    });

    state.filters.sort = 'newest';
    els.sortSelect.value = 'newest';
    
    applyFilters();
}

// Fetch releases from Flask backend API
async function fetchReleases(force = false) {
    if (state.syncStatus === 'syncing') return;

    setSyncStatus('syncing');
    showSection('loading');
    
    try {
        const url = `/api/releases${force ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            state.releases = data.releases;
            setSyncStatus('idle');
            
            // Render view
            applyFilters();
            
            // Update stats
            calculateStats();
            
            // Show toast feedback
            if (force) {
                showToast(`Synced ${data.count} updates from Google Cloud Feed!`, 'success');
            } else if (data.source === 'cache') {
                showToast(`Loaded ${data.count} updates from cache.`, 'info');
            } else if (data.source === 'fallback') {
                showToast("Offline mode. Loaded from cache.", "error");
            }
        } else {
            throw new Error(data.error || 'Failed to fetch release notes.');
        }
    } catch (error) {
        console.error(error);
        setSyncStatus('error');
        els.errorMessage.textContent = error.message || 'Could not connect to release notes server.';
        showSection('error');
        showToast("Error updating release notes feed.", 'error');
    }
}

// Manage synchronization state UX
function setSyncStatus(status) {
    state.syncStatus = status;
    
    if (status === 'syncing') {
        els.refreshIcon.classList.add('spin');
        els.refreshBtn.disabled = true;
        els.statusBadge.className = 'status-badge state-syncing';
        els.statusText.textContent = 'Syncing...';
    } else if (status === 'idle') {
        els.refreshIcon.classList.remove('spin');
        els.refreshBtn.disabled = false;
        els.statusBadge.className = 'status-badge state-idle';
        els.statusText.textContent = 'Synced';
    } else {
        els.refreshIcon.classList.remove('spin');
        els.refreshBtn.disabled = false;
        els.statusBadge.className = 'status-badge state-error';
        els.statusText.textContent = 'Error';
    }
}

// Manage visible state view switcher
function showSection(section) {
    els.loadingState.style.display = section === 'loading' ? 'flex' : 'none';
    els.errorState.style.display = section === 'error' ? 'flex' : 'none';
    els.emptyState.style.display = section === 'empty' ? 'flex' : 'none';
    els.timeline.style.display = section === 'feed' ? 'flex' : 'none';
}

// Core filter and sorting logic
function applyFilters() {
    let result = [...state.releases];

    // 1. Filter by Search Query
    if (state.filters.search) {
        const query = state.filters.search;
        result = result.filter(item => {
            const inText = item.description.toLowerCase().includes(query);
            const inType = item.type.toLowerCase().includes(query);
            const inDate = item.date.toLowerCase().includes(query);
            return inText || inType || inDate;
        });
    }

    // 2. Filter by Type tag
    if (state.filters.type !== 'all') {
        result = result.filter(item => item.type === state.filters.type);
    }

    // 3. Sort Results
    result.sort((a, b) => {
        // Date parsing support: Format in feed is "June 16, 2026"
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        
        if (state.filters.sort === 'newest') {
            return dateB - dateA;
        } else {
            return dateA - dateB;
        }
    });

    state.filteredReleases = result;
    renderFeed();
}

// Generate the timeline HTML elements inside container
function renderFeed() {
    if (state.filteredReleases.length === 0) {
        showSection('empty');
        return;
    }

    showSection('feed');
    els.timeline.innerHTML = '';
    
    state.filteredReleases.forEach((item, index) => {
        const card = document.createElement('article');
        
        // Match tag types with lower-case classes
        const typeClass = `type-${(item.type || 'general').toLowerCase()}`;
        card.className = `release-card ${typeClass}`;
        
        // Add subtle staggered fade-in animations for first 15 items
        if (index < 15) {
            card.style.animationDelay = `${index * 0.05}s`;
        } else {
            card.style.animationDelay = '0s';
        }

        const iconClass = typeIcons[item.type] || typeIcons['General'];

        card.innerHTML = `
            <div class="card-meta">
                <div class="card-meta-left">
                    <span class="card-badge">
                        <i class="${iconClass}"></i> ${item.type}
                    </span>
                    <span class="card-date">
                        <i class="fa-regular fa-calendar-days"></i> ${item.date}
                    </span>
                </div>
                ${item.link ? `
                    <a href="${item.link}" target="_blank" rel="noopener" class="card-action-link" title="Open official GCP documentation entry">
                        <i class="fa-solid fa-up-right-from-square"></i> Source
                    </a>
                ` : ''}
            </div>
            <div class="card-content">
                ${item.description}
            </div>
        `;

        els.timeline.appendChild(card);
    });
}

// Stats counter calculations and animations
function calculateStats() {
    const total = state.releases.length;
    const features = state.releases.filter(r => r.type === 'Feature').length;
    const issues = state.releases.filter(r => r.type === 'Issue').length;
    const deprecated = state.releases.filter(r => r.type === 'Deprecated').length;

    animateValue(els.statTotal, total, 1000);
    animateValue(els.statFeatures, features, 1000);
    animateValue(els.statIssues, issues, 1000);
    animateValue(els.statDeprecated, deprecated, 1000);
}

// Custom JS animation for count up counters
function animateValue(obj, end, duration) {
    let startTimestamp = null;
    const start = parseInt(obj.textContent) || 0;
    
    if (start === end) {
        obj.textContent = end;
        return;
    }

    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.textContent = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.textContent = end;
        }
    };
    window.requestAnimationFrame(step);
}

// Custom beautiful Toast alert system
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${message}</span>
    `;

    els.toastContainer.appendChild(toast);

    // Fade out after 4 seconds
    setTimeout(() => {
        toast.style.transform = 'translateY(20px)';
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.remove();
        }, 350);
    }, 4000);
}
