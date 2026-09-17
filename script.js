// 1. DOCK ANIMATION MODULE
const dockShell = document.querySelector(".dock-shell");
let dockItems = [];

// Load saved dock size
let BASE_WIDTH = parseFloat(localStorage.getItem('tahoe-dock-size')) || 50;

const itemStates = new Map();
const DISTANCE_LIMIT = BASE_WIDTH * 6;
const DISTANCE_INPUT = [
    -DISTANCE_LIMIT, -DISTANCE_LIMIT / 1.25, -DISTANCE_LIMIT / 2, 0,
    DISTANCE_LIMIT / 2, DISTANCE_LIMIT / 1.25, DISTANCE_LIMIT
];

// Scale configuration
let SCALE_OUTPUT = [1, 1.1, 1.414, 2, 1.414, 1.1, 1];
const savedHover = localStorage.getItem('tahoe-dock-hover');
if (savedHover && !isNaN(parseFloat(savedHover))) {
    const scale = parseFloat(savedHover);
    const p1 = 1 + (scale - 1) * 0.1;
    const p2 = 1 + (scale - 1) * 0.414;
    SCALE_OUTPUT = [1, p1, p2, scale, p2, p1, 1];
}

// Utility: Linear interpolation
const interpolate = (x, input, output) => {
    if (x <= input[0]) return output[0];
    if (x >= input[input.length - 1]) return output[output.length - 1];
    for (let i = 0; i < input.length - 1; i++) {
        if (x >= input[i] && x <= input[i + 1]) {
            return output[i] + ((x - input[i]) / (input[i + 1] - input[i])) * (output[i + 1] - output[i]);
        }
    }
    return output[0];
};

let animationFrameId = null;
let pointerX = 0;
let isActive = false;

const refreshDockItems = () => {
    dockItems = dockShell ? Array.from(dockShell.querySelectorAll(".dock-item")) : [];
    dockItems.forEach(item => {
        if (!itemStates.has(item)) {
            itemStates.set(item, { currentWidth: BASE_WIDTH, targetWidth: BASE_WIDTH });
        }
    });
};

const resetDock = () => {
    if (dockShell) {
        dockShell.style.setProperty('--dock-size', `${BASE_WIDTH}px`);
    }
    dockItems.forEach(item => {
        const icon = item.querySelector(".dock-icon, .dock-icon2");
        if (!icon) return;
        item.style.zIndex = "1";
        item.style.width = `${BASE_WIDTH}px`;
        item.style.height = `${BASE_WIDTH}px`;
        icon.style.width = `${BASE_WIDTH}px`;
        icon.style.height = `${BASE_WIDTH}px`;
        const label = item.querySelector(".dock-label");
        if (label) {
            label.style.transform = "";
            label.style.opacity = "0";
        }
    });
};

const animateDock = (currentX) => {
    if (!dockShell) return false;
    let isMoving = false;
    let nearestItem = null;
    let nearestDistance = Infinity;

    // Find nearest item
    if (isActive) {
        dockItems.forEach(item => {
            const icon = item.querySelector(".dock-icon, .dock-icon2");
            if (!icon) return;
            const state = itemStates.get(item);
            const rect = icon.getBoundingClientRect();
            state.iconCenter = rect.left + rect.width / 2;
            const dist = Math.abs(currentX - state.iconCenter);
            if (dist < nearestDistance) {
                nearestDistance = dist;
                nearestItem = item;
            }
        });
    }

    const lerpFactor = isActive ? 0.35 : 0.2;

    dockItems.forEach(item => {
        const icon = item.querySelector(".dock-icon, .dock-icon2");
        if (!icon) return;
        const state = itemStates.get(item);

        state.targetWidth = isActive
            ? BASE_WIDTH * interpolate(currentX - state.iconCenter, DISTANCE_INPUT, SCALE_OUTPUT)
            : BASE_WIDTH;

        const diff = state.targetWidth - state.currentWidth;
        state.currentWidth += diff * lerpFactor;

        if (Math.abs(diff) > 0.1) isMoving = true;

        item.style.width = `${state.currentWidth}px`;
        item.style.height = `${BASE_WIDTH}px`;
        icon.style.width = `${state.currentWidth}px`;
        icon.style.height = `${state.currentWidth}px`;
        item.style.zIndex = Math.round(state.currentWidth / BASE_WIDTH * 100);

        const label = item.querySelector(".dock-label");
        if (label) {
            label.style.transform = `translateX(-50%) translateY(-${(state.currentWidth - BASE_WIDTH) + 15}px)`;
            label.style.opacity = (isActive && item === nearestItem && nearestDistance < BASE_WIDTH * 0.8) ? "1" : "0";
        }
    });

    return isMoving;
};

const queueAnimation = () => {
    if (animationFrameId !== null) return;
    const run = () => {
        if (animateDock(pointerX) || isActive) {
            animationFrameId = requestAnimationFrame(run);
        } else {
            animationFrameId = null;
            resetDock();
        }
    };
    animationFrameId = requestAnimationFrame(run);
};

// Dock event listeners
if (dockShell) {
    dockShell.addEventListener("pointermove", (e) => {
        isActive = true;
        pointerX = e.clientX;
        queueAnimation();
    });
    dockShell.addEventListener("pointerleave", () => {
        isActive = false;
        queueAnimation();
    });
    dockShell.addEventListener("touchmove", (e) => {
        if (!e.touches.length) return;
        isActive = true;
        pointerX = e.touches[0].clientX;
        queueAnimation();
    }, { passive: true });
    dockShell.addEventListener("touchend", () => {
        isActive = false;
        queueAnimation();
    });
}

// 2. SHORTCUTS MANAGEMENT MODULE
const SHORTCUTS_KEY = "tahoe-shortcuts";
const ORIGINAL_DEFAULT_SHORTCUTS = [
    { name: "YouTube", url: "https://www.youtube.com", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/46/67/98/4667988f-73ca-0c8d-e0ef-f405629bf27b/Placeholder.mill/400x400bb-75.webp" },
    { name: "Gmail", url: "https://mail.google.com", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/a5/f4/92/a5f492ef-0a00-36ae-9f64-b7ea39edaf4b/Placeholder.mill/400x400bb-75.webp" },
    { name: "WhatsApp", url: "https://web.whatsapp.com", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/76/79/be/7679bedc-15f9-666b-2e46-7e13c492ff58/Placeholder.mill/400x400bb-75.webp" },
    { name: "Map", url: "https://maps.google.com", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/c2/5e/45/c25e45e8-e439-346c-8c26-b23ecfedb478/Placeholder.mill/400x400bb-75.webp" },
    { name: "Apple TV", url: "https://tv.apple.com", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/bf/ab/2e/bfab2eb5-9e44-7e8c-1a52-faaf2a0b3ca3/Placeholder.mill/400x400bb-75.webp" },
    { name: "Music", url: "https://music.apple.com", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/4f/e5/16/4fe516ac-9e72-6cbe-f302-3ccc6360fc86/Placeholder.mill/400x400bb-75.webp" },
    { name: "Meet", url: "https://meet.google.com", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/b0/ef/3a/b0ef3a56-6ee8-155d-15a2-e9f190e7e0ef/Placeholder.mill/96x96bb-75.webp" },
    { name: "Insta", url: "https://www.instagram.com", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/a2/e1/2c/a2e12c05-aaaf-557d-f2ff-7b4e79c419ee/Placeholder.mill/96x96bb-75.webp" },
    { name: "Amazon", url: "https://www.amazon.com", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/a4/70/13/a4701325-8c13-19c6-b6c9-17a3d517bb0c/Placeholder.mill/400x400bb-75.webp" },
    { name: "Linkdin", url: "https://www.linkedin.com", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/68/e2/70/68e2701d-036e-3bea-dcc7-deb82129b8c0/Placeholder.mill/128x128bb-75.webp" },
    { name: "Figma", url: "https://www.figma.com", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/ae/30/64/ae306406-a733-b2f1-31e6-149920e56518/Placeholder.mill/400x400bb-75.webp" },
    { name: "TradingView", url: "https://www.tradingview.com", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/c5/02/28/c50228b8-d344-54a8-ce2d-e1850dab9647/Placeholder.mill/400x400bb-75.webp" },
    { name: "GitHub", url: "https://github.com", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/a4/c2/c2/a4c2c270-71fa-e985-d3ad-18bd675d2b58/Placeholder.mill/400x400bb-75.webp" },
    { name: "ChatGPT", url: "https://chatgpt.com", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/d7/11/5d/d7115dd0-e180-5f2c-fedd-bdd3a38f822b/Placeholder.mill/96x96bb-75.webp", location: "AI tool" },
    { name: "Gemini", url: "https://gemini.google.com", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/95/32/19/9532191c-ff01-f0d6-290a-14947dd08717/Placeholder.mill/96x96bb-75.webp", location: "AI tool" },
    { name: "Grok AI", url: "https://grok.x.ai", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/f5/17/fd/f517fdd9-c125-6f02-a6fd-4916790199c7/Placeholder.mill/96x96bb-75.webp", location: "AI tool" },
    { name: "DeepSeek", url: "https://chat.deepseek.com", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/26/52/cd/2652cd94-f211-c8d5-3156-f9948fdee4bf/Placeholder.mill/96x96bb-75.webp", location: "AI tool" },
    { name: "Claude", url: "https://claude.ai", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/55/89/d0/5589d067-07aa-bcdb-0d38-51f71e9a4ce6/Placeholder.mill/96x96bb-75.webp", location: "AI tool" },
    { name: "Perplexity", url: "https://perplexity.ai", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/ce/bf/1e/cebf1e82-b109-235b-5a30-31fb48cdaddd/Placeholder.mill/96x96bb-75.webp", location: "AI tool" },
    { name: "Copilot", url: "https://copilot.microsoft.com", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/f0/55/0e/f0550e41-aa1c-9ee7-dba3-c3c8fbaabe3d/Placeholder.mill/400x400bb-75.webp", location: "AI tool" },
    { name: "Meta AI", url: "https://meta.ai", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/4b/91/22/4b91227f-ce78-b42f-33d3-deb56894aabd/Placeholder.mill/200x200bb-75.webp", location: "AI tool" },
    { name: "Replit", url: "https://replit.com/", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/c8/8d/0d/c88d0d3e-d181-e038-c505-358f76b7f364/Placeholder.mill/96x96bb-75.webp", location: "AI tool" },
    { name: "Lovable", url: "https://lovable.dev/", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/29/07/7d/29077ded-76b9-27f9-f5d0-bbd62f9a1356/Placeholder.mill/96x96bb-75.webp", location: "AI tool" },
    { name: "Grammarly ", url: "https://www.grammarly.com/", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/ef/c8/7f/efc87ffd-fe72-1661-816f-e1c086dcf5d8/Placeholder.mill/96x96bb-75.webp", location: "AI tool" },
    { name: "Notion", url: "https://www.notion.so/", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/2d/86/9d/2d869d74-f4ae-62c5-39d3-bfa4bf6bc904/Placeholder.mill/400x400bb-75.webp", location: "AI tool" }
];

let DEFAULT_SHORTCUTS;
try {
    const stored = localStorage.getItem(SHORTCUTS_KEY);
    DEFAULT_SHORTCUTS = stored ? JSON.parse(stored) : null;
    if (!Array.isArray(DEFAULT_SHORTCUTS)) throw new Error("Not array");

    // Auto-add AI tools migration
    ORIGINAL_DEFAULT_SHORTCUTS.filter(s => s.location === 'AI tool').forEach(aiTool => {
        if (!DEFAULT_SHORTCUTS.find(s => s.name === aiTool.name)) {
            DEFAULT_SHORTCUTS.push(aiTool);
        }
    });
} catch (e) {
    DEFAULT_SHORTCUTS = JSON.parse(JSON.stringify(ORIGINAL_DEFAULT_SHORTCUTS));
}

const saveShortcuts = () => localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(DEFAULT_SHORTCUTS));

// DOM refs
const scNameInput = document.getElementById('sc-name');
const scUrlInput = document.getElementById('sc-url');
const scLocationSelect = document.getElementById('sc-location');
const scIconInput = document.getElementById('sc-icon');
const scAddBtn = document.getElementById('sc-add-btn');
const shortcutsList = document.getElementById('shortcuts-list');
const customShortcutsContainer = document.getElementById('custom-shortcuts-container');
const launchpadGrid = document.getElementById('launchpad-grid');
const aiLaunchpadGrid = document.getElementById('ai-launchpad-grid');

// Initialize IDs and locations
DEFAULT_SHORTCUTS.forEach((sc, i) => {
    if (!sc.id) sc.id = Date.now() + i;
    if (!sc.location) sc.location = "Dock";
});

const loadShortcuts = () => {
    const containers = [
        customShortcutsContainer,
        shortcutsList,
        launchpadGrid,
        aiLaunchpadGrid
    ];
    containers.forEach(el => { if (el) el.innerHTML = ''; });

    DEFAULT_SHORTCUTS.forEach(sc => {
        // Dock
        if (customShortcutsContainer && ['Dock', 'Both', 'Dock + AI tool'].includes(sc.location)) {
            const a = document.createElement("a");
            a.href = sc.url;
            a.target = "_self";
            a.className = "dock-item";
            a.innerHTML = `<span class="dock-label">${sc.name}</span><img src="${sc.icon}" alt="${sc.name}" class="dock-icon2" /><div class="dock-dot"></div>`;
            customShortcutsContainer.appendChild(a);
        }

        // Launchpad Apps
        if (launchpadGrid && ['Apps', 'Both'].includes(sc.location)) {
            const a = document.createElement("a");
            a.href = sc.url;
            a.target = "_self";
            a.className = "launchpad-app";
            a.dataset.name = sc.name.toLowerCase();
            a.innerHTML = `<img src="${sc.icon}" alt="${sc.name}" /><span>${sc.name}</span>`;
            launchpadGrid.appendChild(a);
        }

        // AI Launchpad
        if (aiLaunchpadGrid && ['AI tool', 'Dock + AI tool'].includes(sc.location)) {
            const a = document.createElement("a");
            a.href = sc.url;
            a.target = "_self";
            a.className = "launchpad-app";
            a.dataset.name = sc.name.toLowerCase();
            a.innerHTML = `<img src="${sc.icon}" alt="${sc.name}" /><span>${sc.name}</span>`;
            aiLaunchpadGrid.appendChild(a);
        }

        // UI List
        if (shortcutsList) {
            const listItem = document.createElement('div');
            listItem.className = 'shortcut-item';
            listItem.innerHTML = `
                <div class="shortcut-item-info">
                    <h4 title="${sc.name || ''}">${sc.name}</h4>
                    <p title="${sc.url || ''}">${sc.url}</p>
                </div>
                <div class="shortcut-item-actions">
                    <select class="sc-loc-dropdown">
                        <option value="Dock" ${sc.location === 'Dock' ? 'selected' : ''}>LOCATION: Dock only</option>
                        <option value="Apps" ${sc.location === 'Apps' ? 'selected' : ''}>LOCATION: App's</option>
                        <option value="Both" ${sc.location === 'Both' ? 'selected' : ''}>LOCATION: Dock + App</option>
                        <option value="AI tool" ${sc.location === 'AI tool' ? 'selected' : ''}>LOCATION: AI tool</option>
                        <option value="Dock + AI tool" ${sc.location === 'Dock + AI tool' ? 'selected' : ''}>LOCATION: Dock + Ai tool</option>
                    </select>
                    <button class="sc-delete-btn">
                        <img src="https://img.icons8.com/?size=100&id=ccbXpS1mBiXf&format=png&color=000000" style="width: 20px; height: 20px;" alt="Delete">
                    </button>
                </div>
            `;

            const locDropdown = listItem.querySelector('.sc-loc-dropdown');
            if (locDropdown) {
                locDropdown.addEventListener('change', (e) => updateShortcutLoc(sc.id, e.target.value));
            }

            const deleteBtn = listItem.querySelector('.sc-delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => deleteShortcut(sc.id));
            }
            shortcutsList.appendChild(listItem);
        }
    });

    if (typeof refreshDockItems === 'function') refreshDockItems();
    if (typeof resetDock === 'function') resetDock();
};

const updateShortcutLoc = (id, newLoc) => {
    const sc = DEFAULT_SHORTCUTS.find(s => s.id === id);
    if (sc) {
        sc.location = newLoc;
        saveShortcuts();
        loadShortcuts();
    }
};

const deleteShortcut = (id) => {
    const idx = DEFAULT_SHORTCUTS.findIndex(s => s.id === id);
    if (idx !== -1) {
        DEFAULT_SHORTCUTS.splice(idx, 1);
        saveShortcuts();
        loadShortcuts();
    }
};

// Add shortcut
if (scAddBtn) {
    scAddBtn.addEventListener('click', () => {
        const name = scNameInput.value.trim();
        const url = scUrlInput.value.trim();
        let locationVal = scLocationSelect.value;
        let icon = scIconInput.value.trim();

        if (!name || !url) return alert("Name and URL are required.");

        if (!icon) {
            try {
                const urlObj = new URL(url.startsWith('http') ? url : 'https://' + url);
                icon = `https://www.google.com/s2/favicons?sz=128&domain_url=${urlObj.hostname}`;
            } catch (e) {
                icon = `https://www.google.com/s2/favicons?sz=128&domain_url=${url}`;
            }
        }

        const newUrl = url.startsWith('http') ? url : 'https://' + url;

        DEFAULT_SHORTCUTS.push({
            id: Date.now(),
            name,
            url: newUrl,
            location: locationVal,
            icon
        });
        saveShortcuts();

        scNameInput.value = '';
        scUrlInput.value = '';
        scIconInput.value = '';

        loadShortcuts();
    });
}

// ============================================================
// 3. LAUNCHPAD MODULE
// ============================================================
const setupLaunchpad = (openBtnId, overlayId, searchInputId, gridId) => {
    const openBtn = document.getElementById(openBtnId);
    const overlay = document.getElementById(overlayId);
    const searchInput = document.getElementById(searchInputId);
    const grid = document.getElementById(gridId);

    if (openBtn && overlay) {
        openBtn.addEventListener('click', () => {
            overlay.classList.toggle('active');
            if (overlay.classList.contains('active') && searchInput) {
                searchInput.focus();
            }
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('active');
        });
    }

    if (searchInput && grid) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const apps = grid.querySelectorAll('.launchpad-app');
            apps.forEach(app => {
                const name = app.dataset.name || '';
                app.style.display = name.includes(query) ? 'flex' : 'none';
            });
        });
    }
};

setupLaunchpad('open-launchpad', 'launchpad-overlay', 'launchpad-search-input', 'launchpad-grid');
setupLaunchpad('open-ai-tools', 'ai-launchpad-overlay', 'ai-launchpad-search-input', 'ai-launchpad-grid');

// ============================================================
// 4. SETTINGS UI MODULE
// ============================================================
const settingsMain = document.querySelector(".Settings-main");
const openSettingsIcon = document.getElementById("open-settings");
const closeSettingsDot = document.getElementById("close-settings-dot");
const maximizeSettingsDot = document.querySelector(".control-dot.maximize");
const minimizeSettingsDot = document.querySelector(".control-dot.minimize");

if (openSettingsIcon && settingsMain) {
    openSettingsIcon.addEventListener("click", () => {
        settingsMain.classList.toggle("active");
        if (settingsMain.classList.contains("active")) {
            // Reset to General tab
            const gMenu = document.querySelector("#General-right-meun");
            const dMenu = document.querySelector(".main-dock");
            const wMenu = document.querySelector(".wallpaper");
            const gBtn = document.getElementById("settingsBtn");
            const dBtn = document.getElementById("desktopDockBtn");
            const wBtn = document.getElementById("wallpaperBtn");

            if (gMenu) gMenu.style.display = "block";
            if (dMenu) dMenu.style.display = "none";
            if (wMenu) wMenu.style.display = "none";
            if (gBtn) gBtn.classList.add("active-tab");
            if (dBtn) dBtn.classList.remove("active-tab");
            if (wBtn) wBtn.classList.remove("active-tab");
        }
    });
}

if (closeSettingsDot && settingsMain) {
    closeSettingsDot.addEventListener("click", () => {
        settingsMain.classList.remove("active", "maximized");
    });
}

if (maximizeSettingsDot && settingsMain) {
    maximizeSettingsDot.addEventListener("click", () => settingsMain.classList.add("maximized"));
}

if (minimizeSettingsDot && settingsMain) {
    minimizeSettingsDot.addEventListener("click", () => settingsMain.classList.remove("maximized"));
}

// ============================================================
// 5. CUSTOM SLIDER UTILITY
// ============================================================
const setupCustomSlider = (sliderId, progressId, thumbId, initialPercent, onChange) => {
    const slider = document.getElementById(sliderId);
    const progress = document.getElementById(progressId);
    const thumb = document.getElementById(thumbId);

    if (!slider || !progress || !thumb) return;

    let isDragging = false;
    let sliderRect = slider.getBoundingClientRect();

    const updateThumbAndProgress = (percent) => {
        percent = Math.max(0, Math.min(100, percent));
        const px = (percent / 100) * sliderRect.width;
        progress.style.width = `${percent}%`;
        thumb.style.left = `${px}px`;
        if (onChange) onChange(percent);
    };

    const getPercentFromClientX = (clientX) => {
        const offsetX = clientX - sliderRect.left;
        return (offsetX / sliderRect.width) * 100;
    };

    const onMove = (clientX) => {
        const percent = getPercentFromClientX(clientX);
        updateThumbAndProgress(percent);
    };

    const onMouseDown = (e) => {
        isDragging = true;
        sliderRect = slider.getBoundingClientRect();
        onMove(e.clientX);
        thumb.classList.add('active');
    };

    const onTouchStart = (e) => {
        isDragging = true;
        sliderRect = slider.getBoundingClientRect();
        onMove(e.touches[0].clientX);
        thumb.classList.add('active');
    };

    const onMouseMove = (e) => {
        if (isDragging) onMove(e.clientX);
    };

    const onTouchMove = (e) => {
        if (isDragging) onMove(e.touches[0].clientX);
    };

    const stopDrag = () => {
        isDragging = false;
        thumb.classList.remove('active');
    };

    thumb.addEventListener('mousedown', onMouseDown);
    thumb.addEventListener('touchstart', onTouchStart, { passive: true });

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', stopDrag);

    slider.addEventListener('mousedown', (e) => {
        sliderRect = slider.getBoundingClientRect();
        onMove(e.clientX);
    });

    slider.addEventListener('touchstart', (e) => {
        sliderRect = slider.getBoundingClientRect();
        onMove(e.touches[0].clientX);
    }, { passive: true });

    setTimeout(() => updateThumbAndProgress(initialPercent), 50);
};

// Size Slider (30px-80px)
const savedSize = parseFloat(localStorage.getItem('tahoe-dock-size')) || 50;
BASE_WIDTH = savedSize;
const initialSizePercent = Math.max(0, Math.min(100, ((BASE_WIDTH - 30) / (80 - 30)) * 100));
setupCustomSlider('size-slider', 'size-progress', 'size-thumb', initialSizePercent, (percent) => {
    BASE_WIDTH = 30 + (percent / 100) * 50;
    localStorage.setItem('tahoe-dock-size', BASE_WIDTH);
    resetDock();
});

// Hover Slider (1.2-3.0)
let currentMaxScale = parseFloat(localStorage.getItem('tahoe-dock-hover')) || 2.0;
const initialHoverPercent = Math.max(0, Math.min(100, ((currentMaxScale - 1.2) / (3.0 - 1.2)) * 100));
setupCustomSlider('hover-slider', 'hover-progress', 'hover-thumb', initialHoverPercent, (percent) => {
    currentMaxScale = 1.2 + (percent / 100) * 1.8;
    const p1 = 1 + (currentMaxScale - 1) * 0.1;
    const p2 = 1 + (currentMaxScale - 1) * 0.414;
    SCALE_OUTPUT = [1, p1, p2, currentMaxScale, p2, p1, 1];
    localStorage.setItem('tahoe-dock-hover', currentMaxScale);
});

// ============================================================
// 6. WALLPAPER MODULE (IndexedDB)
// ============================================================
const DB_NAME = 'TahoeWallpaperDB';
const STORE_NAME = 'wallpapers';
const KEY = 'active-wallpaper';
let dbInstance = null;

const requestDB = (mode, callback) => {
    if (dbInstance) {
        return callback(dbInstance.transaction([STORE_NAME], mode).objectStore(STORE_NAME));
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => e.target.result.createObjectStore(STORE_NAME);
    req.onsuccess = (e) => {
        dbInstance = e.target.result;
        callback(dbInstance.transaction([STORE_NAME], mode).objectStore(STORE_NAME));
    };
};

const videoBg = document.getElementById('video-bg');
let activeObjectURL = null;

const setWallpaper = (src, type = 'image', saveToDB = false, file = null) => {
    if (activeObjectURL && activeObjectURL !== src) {
        URL.revokeObjectURL(activeObjectURL);
        activeObjectURL = null;
    }
    if (src && src.startsWith('blob:')) {
        activeObjectURL = src;
    }

    const isVideo = type === 'video';
    if (videoBg) {
        videoBg.style.display = isVideo ? 'block' : 'none';
        if (isVideo) {
            if (src && videoBg.src !== src) videoBg.src = src;
            videoBg.play().catch(() => { });
        } else {
            videoBg.pause();
            videoBg.src = '';
        }
    }
    document.body.style.backgroundImage = isVideo ? 'none' : `url('${src}')`;

    if (saveToDB) {
        if (file) {
            requestDB('readwrite', store => store.put({ blob: file, type: type }, KEY));
            localStorage.setItem('tahoe-wallpaper-type', type);
        } else {
            localStorage.setItem('tahoe-wallpaper', src);
            localStorage.setItem('tahoe-wallpaper-type', 'stock');
            requestDB('readwrite', store => store.delete(KEY));
        }
    }
};

const loadStockWallpaper = () => {
    const saved = localStorage.getItem('tahoe-wallpaper') || 'assets/8z3jfEOqjrpCUxVsODP05JhlKOk.webp';
    setWallpaper(saved, 'image');
};

// Load saved wallpaper
const savedWallpaperType = localStorage.getItem('tahoe-wallpaper-type');
if (savedWallpaperType && savedWallpaperType !== 'stock') {
    requestDB('readonly', store => {
        store.get(KEY).onsuccess = (e) => {
            const data = e.target.result;
            if (data && data.blob) {
                setWallpaper(URL.createObjectURL(data.blob), data.type);
            } else {
                loadStockWallpaper();
            }
        };
    });
} else {
    loadStockWallpaper();
}

// Stock wallpaper selection
document.querySelectorAll('.wallpaper .w-1 > div:not(.custom-upload-card):not(#custom-video-upload-card)').forEach(item => {
    item.addEventListener('click', () => {
        const img = item.querySelector('img');
        if (img) setWallpaper(img.getAttribute('src'), 'image', true);
    });
});

// Custom uploads
const setupUpload = (inputId, divId, type) => {
    const input = document.getElementById(inputId);
    const div = document.getElementById(divId) || document.querySelector('.' + divId);
    if (input) {
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) setWallpaper(URL.createObjectURL(file), type, true, file);
        });
        if (div) div.addEventListener('click', () => input.click());
        input.addEventListener('click', (e) => e.stopPropagation());
    }
};
setupUpload('custom-wall-upload', 'custom-upload-card', 'image');
setupUpload('custom-video-upload', 'custom-video-upload-card', 'video');

// Reset settings
const resetAllBtn = document.getElementById('resetAllBtn');
if (resetAllBtn) {
    resetAllBtn.addEventListener('click', () => {
        ['tahoe-shortcuts', 'tahoe-dock-size', 'tahoe-dock-hover', 'tahoe-wallpaper', 'tahoe-wallpaper-type', 'tahoe-search-visible', 'tahoe-topbar-font-size'].forEach(k => localStorage.removeItem(k));
        requestDB('readwrite', store => {
            store.delete(KEY).onsuccess = () => location.reload();
        });
        setTimeout(() => location.reload(), 300);
    });
}

// ============================================================
// 7. TOP BAR CLOCK & BATTERY
// ============================================================
let isComingSoonActive = false;

const updateClock = () => {
    const now = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const dayName = days[now.getDay()];
    const monthName = months[now.getMonth()];
    const date = now.getDate();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    const timeString = `${dayName} ${monthName} ${date} ${hours}:${minutes} ${ampm}`;

    const timeEl = document.getElementById('top-menu-time');
    if (timeEl) timeEl.textContent = timeString;

    const glassClockDateEl = document.getElementById('glassClockDate');
    const glassClockTimeEl = document.getElementById('glassClockTime');
    if (glassClockDateEl && !isComingSoonActive) {
        glassClockDateEl.textContent = `${dayName} ${monthName} ${date}`;
    }
    if (glassClockTimeEl) {
        glassClockTimeEl.innerHTML = `${hours}<span class="colon">:</span>${minutes}`;
    }
};
setInterval(updateClock, 1000);
updateClock();

const updateBatteryUI = (battery) => {
    const levelEl = document.getElementById('battery-level');
    const fillEl = document.getElementById('battery-fill');
    const thunderEl = document.getElementById('top-thunder');

    if (levelEl) levelEl.textContent = Math.round(battery.level * 100) + '%';
    if (fillEl) fillEl.setAttribute('width', Math.round(battery.level * 16));
    if (thunderEl) thunderEl.style.display = battery.charging ? 'block' : 'none';
};

if ('getBattery' in navigator) {
    navigator.getBattery().then(battery => {
        updateBatteryUI(battery);
        battery.addEventListener('levelchange', () => updateBatteryUI(battery));
        battery.addEventListener('chargingchange', () => updateBatteryUI(battery));
    });
}

// ============================================================
// 8. NOTEPAD MODULE
// ============================================================
const openFolderBtn = document.getElementById('open-folder');
const notepadWindow = document.getElementById('notepad-window');
const closeNotepadBtn = document.getElementById('close-notepad');
const minimizeNotepadBtn = document.getElementById('minimize-notepad');
const maximizeNotepadBtn = document.getElementById('maximize-notepad');

if (openFolderBtn && notepadWindow) {
    openFolderBtn.addEventListener('click', () => notepadWindow.classList.toggle('active'));
}
if (closeNotepadBtn && notepadWindow) {
    closeNotepadBtn.addEventListener('click', () => {
        notepadWindow.classList.remove('active', 'maximized');
    });
}
if (minimizeNotepadBtn && notepadWindow) {
    minimizeNotepadBtn.addEventListener('click', () => notepadWindow.classList.remove('maximized'));
}
if (maximizeNotepadBtn && notepadWindow) {
    maximizeNotepadBtn.addEventListener('click', () => notepadWindow.classList.toggle('maximized'));
}

// ============================================================
// 9. PROFILE, SEARCH, SETTINGS TABS (DOMContentLoaded)
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    // Profile image
    const savedProfileImg = localStorage.getItem('tahoe-profile-img');
    const profileImgEl = document.getElementById('profile-img');
    if (savedProfileImg && profileImgEl) profileImgEl.src = savedProfileImg;

    // Save text fields
    document.querySelectorAll('.save-text').forEach(el => {
        const id = el.id;
        if (!id) return;
        const savedText = localStorage.getItem('tahoe-text-' + id);
        if (savedText) el.textContent = savedText;
        el.addEventListener('input', () => localStorage.setItem('tahoe-text-' + id, el.textContent));
    });

    // Notepad text
    const notepadTextarea = document.getElementById('notepad-textarea');
    if (notepadTextarea) {
        const savedNotepadText = localStorage.getItem('tahoe-notepad-text');
        if (savedNotepadText) notepadTextarea.value = savedNotepadText;
        notepadTextarea.addEventListener('input', () => localStorage.setItem('tahoe-notepad-text', notepadTextarea.value));
    }

    // ===== DESKTOP SEARCH =====
    const mainSearch = document.getElementById('mainSearch');
    const searchSuggestions = document.getElementById('searchSuggestions');
    const micBtn = document.getElementById('micBtn');

    if (mainSearch && searchSuggestions) {
        let currentSuggestions = [];
        let selectedIndex = -1;
        let originalQuery = '';
        let debounceTimer;
        const HIDE_ANIM_MS = 200;

        const hideSuggestions = () => {
            searchSuggestions.classList.remove('open');
            setTimeout(() => {
                if (!searchSuggestions.classList.contains('open')) {
                    searchSuggestions.innerHTML = '';
                    currentSuggestions = [];
                    selectedIndex = -1;
                }
            }, HIDE_ANIM_MS);
        };

        const executeSearch = (query) => {
            if (query?.trim()) {
                window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query.trim())}`;
            }
        };

        const updateSelection = () => {
            const items = searchSuggestions.querySelectorAll('.suggestion-item');
            items.forEach((item, idx) => {
                if (idx === selectedIndex) {
                    item.classList.add('selected');
                    item.scrollIntoView({ block: 'nearest' });
                    mainSearch.value = currentSuggestions[idx];
                } else {
                    item.classList.remove('selected');
                }
            });
        };

        const showSuggestions = (suggestions) => {
            currentSuggestions = suggestions;
            selectedIndex = -1;

            if (!suggestions.length) {
                hideSuggestions();
                return;
            }

            searchSuggestions.innerHTML = suggestions.map((sug, idx) => `
                <div class="suggestion-item" data-index="${idx}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <span class="suggestion-text">${sug}</span>
                </div>
            `).join('');

            searchSuggestions.classList.add('open');

            searchSuggestions.querySelectorAll('.suggestion-item').forEach(item => {
                item.addEventListener('click', () => {
                    executeSearch(currentSuggestions[parseInt(item.dataset.index)]);
                });
            });
        };

        const fetchSuggestions = async (query) => {
            if (!query.trim()) {
                hideSuggestions();
                return;
            }
            try {
                const res = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`);
                if (res.ok) {
                    const data = await res.json();
                    showSuggestions(data[1] || []);
                } else {
                    throw new Error("Google suggest API failed");
                }
            } catch (err) {
                // Fallback to Wikipedia
                try {
                    const res = await fetch(`https://en.wikipedia.org/w/api.php?action=opensearch&format=json&origin=*&search=${encodeURIComponent(query)}`);
                    if (res.ok) {
                        const data = await res.json();
                        showSuggestions(data[1] || []);
                    }
                } catch (fallbackErr) {
                    console.error("Suggestions fallback failed:", fallbackErr);
                }
            }
        };

        mainSearch.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => fetchSuggestions(e.target.value), 150);
        });

        mainSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                executeSearch(mainSearch.value);
            } else if (e.key === 'Escape') {
                hideSuggestions();
                mainSearch.blur();
            } else if (e.key === 'ArrowDown' && currentSuggestions.length) {
                e.preventDefault();
                if (selectedIndex === -1) originalQuery = mainSearch.value;
                selectedIndex = (selectedIndex + 1) % currentSuggestions.length;
                updateSelection();
            } else if (e.key === 'ArrowUp' && currentSuggestions.length) {
                e.preventDefault();
                if (selectedIndex === -1) originalQuery = mainSearch.value;
                selectedIndex--;
                if (selectedIndex < -1) selectedIndex = currentSuggestions.length - 1;
                if (selectedIndex === -1) {
                    mainSearch.value = originalQuery;
                    searchSuggestions.querySelectorAll('.suggestion-item').forEach(item => item.classList.remove('selected'));
                } else {
                    updateSelection();
                }
            }
        });

        document.addEventListener('click', (e) => {
            if (!mainSearch.contains(e.target) && !searchSuggestions.contains(e.target)) {
                hideSuggestions();
            }
        });

        mainSearch.addEventListener('focus', () => {
            if (mainSearch.value.trim()) fetchSuggestions(mainSearch.value);
        });

        // Voice dictation
        if (micBtn) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = false;
                recognition.lang = 'en-US';
                recognition.interimResults = false;

                let isListening = false;

                micBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    isListening ? recognition.stop() : recognition.start();
                });

                recognition.onstart = () => {
                    isListening = true;
                    micBtn.style.animation = 'pulse 1.2s infinite';
                    mainSearch.placeholder = 'Listening...';
                };

                recognition.onend = () => {
                    isListening = false;
                    micBtn.style.animation = 'none';
                    mainSearch.placeholder = 'Search or Ask';
                };

                recognition.onerror = () => {
                    isListening = false;
                    micBtn.style.animation = 'none';
                    mainSearch.placeholder = 'Search or Ask';
                };

                recognition.onresult = (event) => {
                    const transcript = event.results[0][0].transcript;
                    mainSearch.value = transcript;
                    mainSearch.dispatchEvent(new Event('input'));
                    mainSearch.focus();
                };
            } else {
                micBtn.style.display = 'none';
            }
        }
    }

    // ===== DESKTOP SETTINGS =====
    const searchBarToggle = document.getElementById('search-bar-toggle');
    const topBarFontSelect = document.getElementById('topbar-font-size');
    const searchWrapper = document.querySelector('.search-wrapper');
    const topMenu = document.querySelector('.top-menu');

    // Search bar visibility
    const isSearchVisible = localStorage.getItem('tahoe-search-visible') !== 'false';
    if (searchBarToggle) {
        searchBarToggle.checked = isSearchVisible;
        searchBarToggle.addEventListener('change', (e) => {
            const visible = e.target.checked;
            localStorage.setItem('tahoe-search-visible', visible);
            if (searchWrapper) searchWrapper.classList.toggle('hidden', !visible);
        });
    }
    if (searchWrapper && !isSearchVisible) searchWrapper.classList.add('hidden');

    // Clock visibility
    const clockToggle = document.getElementById('clock-toggle');
    const glassClock = document.getElementById('glassClock');
    const setClockVisible = (visible) => {
        glassClock?.classList.toggle('hidden', !visible);
        if (clockToggle) clockToggle.checked = visible;
        localStorage.setItem('tahoe-clock-visible', visible);
    };
    setClockVisible(localStorage.getItem('tahoe-clock-visible') !== 'false');
    clockToggle?.addEventListener('change', (e) => setClockVisible(e.target.checked));

    // Top bar font size
    const savedFontSize = localStorage.getItem('tahoe-topbar-font-size') || 'medium';
    const applyTopBarFontSize = (size) => {
        const sizeMap = { small: '12px', medium: '16px', large: '20px' };
        if (topMenu) topMenu.style.setProperty('--topbar-font-size', sizeMap[size] || '16px');
    };
    if (topBarFontSelect) {
        topBarFontSelect.value = savedFontSize;
        topBarFontSelect.addEventListener('change', (e) => {
            localStorage.setItem('tahoe-topbar-font-size', e.target.value);
            applyTopBarFontSize(e.target.value);
        });
    }
    applyTopBarFontSize(savedFontSize);

    // ===== SETTINGS TAB SWITCHING =====
    const settingsBtn = document.getElementById("settingsBtn");
    const desktopDockBtn = document.getElementById("desktopDockBtn");
    const wallpaperBtn = document.getElementById("wallpaperBtn");
    const shortcutBtn = document.getElementById("shortcutBtn");
    const widgetsBtn = document.getElementById("widgetsBtn");

    const generalMenu = document.querySelector("#General-right-meun");
    const mainDockMenu = document.querySelector(".main-dock");
    const wallpaperMenu = document.querySelector(".wallpaper");
    const shortcutMenu = document.querySelector(".shortcut-menu");
    const topBarTitle = document.getElementById("top-bar-title");

    const switchTab = (activeBtn, activeMenu) => {
        [generalMenu, mainDockMenu, wallpaperMenu, shortcutMenu].forEach(el => {
            if (el) el.style.display = "none";
        });
        [settingsBtn, desktopDockBtn, wallpaperBtn, shortcutBtn].forEach(el => {
            if (el) el.classList.remove("active-tab");
        });
        if (activeMenu) activeMenu.style.display = "block";
        if (activeBtn) {
            activeBtn.classList.add("active-tab");
            if (topBarTitle) {
                const titleText = activeBtn.querySelector('p');
                if (titleText) topBarTitle.textContent = titleText.textContent;
            }
        }
    };

    if (settingsBtn && generalMenu) settingsBtn.addEventListener("click", () => switchTab(settingsBtn, generalMenu));
    if (desktopDockBtn && mainDockMenu) desktopDockBtn.addEventListener("click", () => switchTab(desktopDockBtn, mainDockMenu));
    if (wallpaperBtn && wallpaperMenu) wallpaperBtn.addEventListener("click", () => switchTab(wallpaperBtn, wallpaperMenu));
    if (shortcutBtn && shortcutMenu) shortcutBtn.addEventListener("click", () => switchTab(shortcutBtn, shortcutMenu));
    if (widgetsBtn) widgetsBtn.addEventListener("click", () => alert("Coming Soon"));

    // ===== PROFILE IMAGE UPLOAD =====
    const profilePicContainer = document.querySelector('.profile .pp');
    const profileUploadInput = document.getElementById('profile-upload');
    if (profilePicContainer && profileUploadInput) {
        profilePicContainer.addEventListener('click', () => profileUploadInput.click());
        profileUploadInput.addEventListener('click', (e) => e.stopPropagation());
        profileUploadInput.addEventListener('change', () => {
            const file = profileUploadInput.files[0];
            if (file) {
                const r = new FileReader();
                r.onload = (e) => {
                    if (profileImgEl) profileImgEl.src = e.target.result;
                    localStorage.setItem('tahoe-profile-img', e.target.result);
                };
                r.readAsDataURL(file);
            }
        });
    }

    // Specs tip
    document.getElementById('specsEditableTipBtn')?.addEventListener('click', () => {
        alert('Just click on any text above to edit it directly!');
    });
});

// Initial load
document.addEventListener('DOMContentLoaded', loadShortcuts);
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    loadShortcuts();
}