const dockShell = document.querySelector(".dock-shell");
let dockItems = [];

let storedSize = parseFloat(localStorage.getItem('tahoe-dock-size'));
let BASE_WIDTH = !isNaN(storedSize) ? storedSize : 50;

const itemStates = new Map();
const DISTANCE_LIMIT = BASE_WIDTH * 6;
const DISTANCE_INPUT = [
    -DISTANCE_LIMIT, -DISTANCE_LIMIT / 1.25, -DISTANCE_LIMIT / 2, 0,
    DISTANCE_LIMIT / 2, DISTANCE_LIMIT / 1.25, DISTANCE_LIMIT
];
let SCALE_OUTPUT = [1, 1.1, 1.414, 2, 1.414, 1.1, 1];
let savedHoverInit = localStorage.getItem('tahoe-dock-hover');
if (savedHoverInit && !isNaN(parseFloat(savedHoverInit))) {
    let scale = parseFloat(savedHoverInit);
    const p1 = 1 + (scale - 1) * 0.1;
    const p2 = 1 + (scale - 1) * 0.414;
    SCALE_OUTPUT = [1, p1, p2, scale, p2, p1, 1];
}

function interpolate(x, input, output) {
    if (x <= input[0]) return output[0];
    if (x >= input[input.length - 1]) return output[output.length - 1];
    for (let i = 0; i < input.length - 1; i++) {
        if (x >= input[i] && x <= input[i + 1]) {
            return output[i] + ((x - input[i]) / (input[i + 1] - input[i])) * (output[i + 1] - output[i]);
        }
    }
    return output[0];
}

let animationFrameId = null;
let pointerX = 0;
let isActive = false;

function refreshDockItems() {
    dockItems = dockShell ? Array.from(dockShell.querySelectorAll(".dock-item")) : [];
    dockItems.forEach(item => {
        if (!itemStates.has(item)) itemStates.set(item, { currentWidth: BASE_WIDTH, targetWidth: BASE_WIDTH });
    });
}

function resetDock() {
    if (dockShell) {
        dockShell.style.setProperty('--dock-size', `${BASE_WIDTH}px`);
    }
    dockItems.forEach((item) => {
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
}

function animateDock(currentX) {
    if (!dockShell) return false;
    let isMoving = false, nearestItem = null, nearestDistance = Infinity;

    if (isActive) {
        dockItems.forEach((item) => {
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

    dockItems.forEach((item) => {
        const icon = item.querySelector(".dock-icon, .dock-icon2");
        if (!icon) return;
        const state = itemStates.get(item);

        state.targetWidth = isActive ? BASE_WIDTH * interpolate(currentX - state.iconCenter, DISTANCE_INPUT, SCALE_OUTPUT) : BASE_WIDTH;
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
}

function queueAnimation() {
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
}

if (dockShell) {
    dockShell.addEventListener("pointermove", (e) => { isActive = true; pointerX = e.clientX; queueAnimation(); });
    dockShell.addEventListener("pointerleave", () => { isActive = false; queueAnimation(); });
    dockShell.addEventListener("touchmove", (e) => {
        if (!e.touches.length) return;
        isActive = true; pointerX = e.touches[0].clientX; queueAnimation();
    }, { passive: true });
    dockShell.addEventListener("touchend", () => { isActive = false; queueAnimation(); });
}

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
    { name: "GitHub", url: "https://github.com", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/a4/c2/c2/a4c2c270-71fa-e985-d3ad-18bd675d2b58/Placeholder.mill/400x400bb-75.webp" }
];

let DEFAULT_SHORTCUTS;
try {
    const stored = localStorage.getItem(SHORTCUTS_KEY);
    DEFAULT_SHORTCUTS = stored ? JSON.parse(stored) : null;
    if (!Array.isArray(DEFAULT_SHORTCUTS)) throw new Error("Not array");
} catch (e) {
    DEFAULT_SHORTCUTS = JSON.parse(JSON.stringify(ORIGINAL_DEFAULT_SHORTCUTS));
}

function saveShortcuts() {
    localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(DEFAULT_SHORTCUTS));
}

// --- SHORTCUT MANAGEMENT LOGIC ---
const scNameInput = document.getElementById('sc-name');
const scUrlInput = document.getElementById('sc-url');
const scLocationSelect = document.getElementById('sc-location');
const scIconInput = document.getElementById('sc-icon');
const scAddBtn = document.getElementById('sc-add-btn');
const shortcutsList = document.getElementById('shortcuts-list');
const customShortcutsContainer = document.getElementById('custom-shortcuts-container');

// Give IDs and Default Location to DEFAULT_SHORTCUTS if they don't have them
DEFAULT_SHORTCUTS.forEach((sc, i) => {
    if (!sc.id) sc.id = Date.now() + i;
    if (!sc.location) sc.location = "Dock";
});

function loadShortcuts() {
    if (customShortcutsContainer) customShortcutsContainer.innerHTML = '';
    if (shortcutsList) shortcutsList.innerHTML = '';

    DEFAULT_SHORTCUTS.forEach(sc => {
        // Add to Dock
        if (customShortcutsContainer && (sc.location === 'Dock' || sc.location === 'Both')) {
            const a = document.createElement("a");
            a.href = sc.url;
            a.target = "_self";
            a.className = "dock-item";
            a.innerHTML = `<span class="dock-label">${sc.name}</span><img src="${sc.icon}" alt="${sc.name}" class="dock-icon2" /><div class="dock-dot"></div>`;
            customShortcutsContainer.appendChild(a);
        }

        // Add to UI List
        if (shortcutsList) {
            const listItem = document.createElement('div');
            listItem.className = 'shortcut-item';
            listItem.innerHTML = `
                <div class="shortcut-item-info">
                    <h4>${sc.name}</h4>
                    <p>${sc.url}</p>
                </div>
                <div class="shortcut-item-actions">
                    <select class="sc-loc-dropdown" onchange="updateShortcutLoc(${sc.id}, this.value)">
                        <option value="Dock" ${sc.location === 'Dock' ? 'selected' : ''}>LOCATION: Dock</option>
                        <option value="Apps" ${sc.location === 'Apps' ? 'selected' : ''}>LOCATION: Apps</option>
                        <option value="Both" ${sc.location === 'Both' ? 'selected' : ''}>LOCATION: Both</option>
                    </select>
                    <button class="sc-delete-btn" onclick="deleteShortcut(${sc.id})">
                        <img src="https://img.icons8.com/?size=100&id=ccbXpS1mBiXf&format=png&color=000000" style="width: 20px; height: 20px;" alt="Delete">
                    </button>
                </div>
            `;
            shortcutsList.appendChild(listItem);
        }
    });

    if (typeof refreshDockItems === 'function') refreshDockItems();
    if (typeof resetDock === 'function') resetDock();
}

window.updateShortcutLoc = function (id, newLoc) {
    const sc = DEFAULT_SHORTCUTS.find(s => s.id === id);
    if (sc) {
        sc.location = newLoc;
        saveShortcuts();
        loadShortcuts();
    }
};

window.deleteShortcut = function (id) {
    const idx = DEFAULT_SHORTCUTS.findIndex(s => s.id === id);
    if (idx !== -1) {
        DEFAULT_SHORTCUTS.splice(idx, 1);
        saveShortcuts();
        loadShortcuts();
    }
};

if (scAddBtn) {
    scAddBtn.addEventListener('click', () => {
        const name = scNameInput.value.trim();
        const url = scUrlInput.value.trim();
        let locationVal = scLocationSelect.value;
        if (locationVal.includes("Dock")) locationVal = "Dock";
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

// Initial render
document.addEventListener('DOMContentLoaded', () => {
    loadShortcuts();
});
// in case DOM is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    loadShortcuts();
}

// --- Settings Menu Toggle Logic ---
const openSettingsIcon = document.getElementById("open-settings");
const closeSettingsDot = document.getElementById("close-settings-dot");
const settingsMain = document.querySelector(".Settings-main");

if (openSettingsIcon && settingsMain) {
    openSettingsIcon.addEventListener("click", () => {
        settingsMain.classList.toggle("active");

        // Reset to General tab on open
        if (settingsMain.classList.contains("active")) {
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
        settingsMain.classList.remove("active");
    });
}



function setupCustomSlider(sliderId, progressId, thumbId, initialPercent, onChange) {
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

    const init = (initialValue) => {
        sliderRect = slider.getBoundingClientRect();
        updateThumbAndProgress(initialValue);
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

    // Small delay to ensure styles are computed
    setTimeout(() => init(initialPercent), 50);
}

// 1. Size Slider (Map 0-100% to 30px-80px)
let savedSize = localStorage.getItem('tahoe-dock-size');
if (savedSize && !isNaN(parseFloat(savedSize))) {
    BASE_WIDTH = parseFloat(savedSize);
}
const initialSizePercent = Math.max(0, Math.min(100, ((BASE_WIDTH - 30) / (80 - 30)) * 100));
setupCustomSlider('size-slider', 'size-progress', 'size-thumb', initialSizePercent, (percent) => {
    BASE_WIDTH = 30 + (percent / 100) * 50;
    localStorage.setItem('tahoe-dock-size', BASE_WIDTH);
    resetDock();
});

// 2. Hover Slider (Map 0-100% to max scale 1.2 to 3.0)
let currentMaxScale = 2.0;
let savedHover = localStorage.getItem('tahoe-dock-hover');
if (savedHover && !isNaN(parseFloat(savedHover))) {
    currentMaxScale = parseFloat(savedHover);
    const p1 = 1 + (currentMaxScale - 1) * 0.1;
    const p2 = 1 + (currentMaxScale - 1) * 0.414;
    SCALE_OUTPUT = [1, p1, p2, currentMaxScale, p2, p1, 1];
}
const initialHoverPercent = Math.max(0, Math.min(100, ((currentMaxScale - 1.2) / (3.0 - 1.2)) * 100));
setupCustomSlider('hover-slider', 'hover-progress', 'hover-thumb', initialHoverPercent, (percent) => {
    currentMaxScale = 1.2 + (percent / 100) * 1.8;
    const p1 = 1 + (currentMaxScale - 1) * 0.1;
    const p2 = 1 + (currentMaxScale - 1) * 0.414;
    SCALE_OUTPUT = [1, p1, p2, currentMaxScale, p2, p1, 1];
    localStorage.setItem('tahoe-dock-hover', currentMaxScale);
});

/* developed © Maxuiux */

// --- WALLPAPER SELECTION LOGIC ---
const savedWallpaper = localStorage.getItem('tahoe-wallpaper');
if (savedWallpaper) {
    document.body.style.backgroundImage = `url('${savedWallpaper}')`;
}

document.querySelectorAll('.wallpaper .w-1 > div:not(.custom-upload-card)').forEach(item => {
    item.addEventListener('click', () => {
        const img = item.querySelector('img');
        if (img) {
            const imgSrc = img.getAttribute('src');
            document.body.style.backgroundImage = `url('${imgSrc}')`;
            localStorage.setItem('tahoe-wallpaper', imgSrc);
        }
    });
});

// --- CUSTOM WALLPAPER UPLOAD LOGIC ---
const customWallpaperInput = document.getElementById('custom-wall-upload');
const customWallpaperDiv = document.querySelector('.custom-upload-card');

if (customWallpaperInput) {
    customWallpaperInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                document.body.style.backgroundImage = `url('${event.target.result}')`;
                localStorage.setItem('tahoe-wallpaper', event.target.result);
            };
            reader.readAsDataURL(file);
        }
    });

    if (customWallpaperDiv) {
        customWallpaperDiv.addEventListener('click', () => {
            customWallpaperInput.click();
        });
    }

    customWallpaperInput.addEventListener('click', (e) => {
        e.stopPropagation(); // prevent triggering the general w-1 div click
    });
}

// --- RESET SETTINGS LOGIC ---
const resetAllBtn = document.getElementById('resetAllBtn');
if (resetAllBtn) {
    resetAllBtn.addEventListener('click', () => {
        localStorage.removeItem('tahoe-shortcuts');
        localStorage.removeItem('tahoe-dock-size');
        localStorage.removeItem('tahoe-dock-hover');
        localStorage.removeItem('tahoe-wallpaper');
        location.reload();
    });
}
