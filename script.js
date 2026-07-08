const dockShell = document.querySelector(".dock-shell");
let dockItems = [];
let BASE_WIDTH = 50;
const itemStates = new Map();
const DISTANCE_LIMIT = BASE_WIDTH * 6;
const DISTANCE_INPUT = [
    -DISTANCE_LIMIT, -DISTANCE_LIMIT / 1.25, -DISTANCE_LIMIT / 2, 0,
    DISTANCE_LIMIT / 2, DISTANCE_LIMIT / 1.25, DISTANCE_LIMIT
];
let SCALE_OUTPUT = [1, 1.1, 1.414, 2, 1.414, 1.1, 1];

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
const DEFAULT_SHORTCUTS = [
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

function loadShortcuts() {
    const container = document.getElementById("custom-shortcuts-container");
    if (!container) return;
    container.innerHTML = "";
    DEFAULT_SHORTCUTS.forEach(s => {
        const a = document.createElement("a");
        a.href = s.url;
        a.target = "_self";
        a.className = "dock-item";
        a.innerHTML = `<span class="dock-label">${s.name}</span><img src="${s.icon}" alt="${s.name}" class="dock-icon2" /><div class="dock-dot"></div>`;
        container.appendChild(a);
    });
    refreshDockItems();
    resetDock();
}

loadShortcuts();

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
const initialSizePercent = Math.max(0, Math.min(100, ((BASE_WIDTH - 30) / (80 - 30)) * 100));
setupCustomSlider('size-slider', 'size-progress', 'size-thumb', initialSizePercent, (percent) => {
    BASE_WIDTH = 30 + (percent / 100) * 50;
    resetDock();
});

// 2. Hover Slider (Map 0-100% to max scale 1.2 to 3.0)
let currentMaxScale = 2.0;
const initialHoverPercent = Math.max(0, Math.min(100, ((currentMaxScale - 1.2) / (3.0 - 1.2)) * 100));
setupCustomSlider('hover-slider', 'hover-progress', 'hover-thumb', initialHoverPercent, (percent) => {
    currentMaxScale = 1.2 + (percent / 100) * 1.8;
    const p1 = 1 + (currentMaxScale - 1) * 0.1;
    const p2 = 1 + (currentMaxScale - 1) * 0.414;
    SCALE_OUTPUT = [1, p1, p2, currentMaxScale, p2, p1, 1];
});

/* developed © Maxuiux */

// --- WALLPAPER SELECTION LOGIC ---
document.querySelectorAll('.wallpaper .w-1 > div:not(.custom-upload-card)').forEach(item => {
    item.addEventListener('click', () => {
        const img = item.querySelector('img');
        if (img) {
            const imgSrc = img.getAttribute('src');
            document.body.style.backgroundImage = `url('${imgSrc}')`;
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

