// 1. DOCK ANIMATION MODULE
const dockShell = document.querySelector(".dock-shell");
let dockItems = [];

// Load saved dock size
let BASE_WIDTH = parseFloat(localStorage.getItem('tahoe-dock-size')) || 50;

const itemStates = new Map();
const DISTANCE_LIMIT = BASE_WIDTH * 7;
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

    const lerpFactor = isActive ? 0.15 : 0.1;

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
            label.style.transform = `translateX(-50%) translateY(-${state.currentWidth - BASE_WIDTH}px)`;
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
    { name: "Map", url: "https://maps.google.com", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/a2/f7/55/a2f75542-46f6-57a4-0d53-d8c117745c51/Placeholder.mill/400x400bb-75.webp" },
    { name: "Netflix", url: "https://www.netflix.com", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/33/ed/5d/33ed5d82-b5d7-95e3-bd09-3fa6a7cd4c96/Placeholder.mill/400x400bb-75.webp" },
    { name: "Meet", url: "https://meet.google.com", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/39/a8/1b/39a81bb8-7fad-e4be-cf29-13ab0f86ed60/Placeholder.mill/400x400bb-75.webp" },
    { name: "Insta", url: "https://www.instagram.com", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/95/4d/56/954d560b-42de-e5eb-9838-e687e764acce/Placeholder.mill/400x400bb-75.webp" },
    { name: "Amazon", url: "https://www.amazon.com", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/a4/70/13/a4701325-8c13-19c6-b6c9-17a3d517bb0c/Placeholder.mill/400x400bb-75.webp" },
    { name: "Linkdin", url: "https://www.linkedin.com", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/ee/36/f5/ee36f5f8-3af5-c8a5-dc67-704625cd2515/Placeholder.mill/400x400bb-75.webp" },
    { name: "Figma", url: "https://www.figma.com", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/ae/30/64/ae306406-a733-b2f1-31e6-149920e56518/Placeholder.mill/400x400bb-75.webp" },
    { name: "TradingView", url: "https://www.tradingview.com", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/c5/02/28/c50228b8-d344-54a8-ce2d-e1850dab9647/Placeholder.mill/400x400bb-75.webp" },
    { name: "GitHub", url: "https://github.com", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/a4/c2/c2/a4c2c270-71fa-e985-d3ad-18bd675d2b58/Placeholder.mill/400x400bb-75.webp" },
    
    { name: "Google", url: "", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/ca/10/53/ca105375-b161-cf23-acb9-aa3cbf4b0a29/Placeholder.mill/400x400bb-75.webp", location: "Apps" },
    { name: "Gmail", url: "", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/30/c0/1b/30c01b99-1a95-f7f4-4287-f906b23f9250/Placeholder.mill/400x400bb-75.webp", location: "Apps" },
    { name: "Photos", url: "", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/3c/f8/ac/3cf8ac3e-94d6-4ba6-1c5f-bafcfcecc35c/Placeholder.mill/400x400bb-75.webp", location: "Apps" },
    { name: "YT", url: "", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/75/3f/b9/753fb91a-6e37-5d2a-a4c5-7f54bb38f7f6/Placeholder.mill/400x400bb-75.webp", location: "Apps" },
    { name: "Docs", url: "", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/9b/23/af/9b23afd6-726a-64ef-7030-5b0d2b5d96e8/Placeholder.mill/400x400bb-75.webp", location: "Apps" },
    { name: "Drive", url: "", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/53/65/d9/5365d980-9641-6597-6764-b5fd1f841595/Placeholder.mill/400x400bb-75.webp", location: "Apps" },
    { name: "Celander", url: "", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/5c/03/c5/5c03c5c9-6263-0c0d-daea-12740a82f4f6/Placeholder.mill/400x400bb-75.webp", location: "Apps" },
    { name: "meet" , url: "", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/d5/b6/84/d5b684d9-2196-1dad-9b32-51238e5066dc/Placeholder.mill/400x400bb-75.webp", location: "Apps" },
    { name: "NoteBook" , url: "", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/5d/be/cf/5dbecf03-e056-ccd8-c502-1b935be704eb/Placeholder.mill/400x400bb-75.webp", location: "Apps" },
    { name: "Maps" , url: "", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/da/56/c7/da56c7da-32b5-3cdd-41d4-f49c8c391050/Placeholder.mill/400x400bb-75.webp", location: "Apps" },
   
    { name: "ChatGPT", url: "https://chatgpt.com", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/2c/38/19/2c381978-0d18-b345-432a-fde4338f786b/Placeholder.mill/400x400bb-75.webp", location: "AI tool" },
    { name: "Gemini", url: "https://gemini.google.com", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/54/24/4b/54244bc9-83d1-ff01-5424-a34f112e86da/Placeholder.mill/400x400bb-75.webp", location: "AI tool" },
    { name: "Grok AI", url: "https://grok.x.ai", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/83/db/09/83db098c-6eab-384e-303b-6a083db14330/Placeholder.mill/400x400bb-75.webp", location: "AI tool" },
    { name: "DeepSeek", url: "https://chat.deepseek.com", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/68/b2/d3/68b2d30b-4f7d-441b-c4d7-26e765cd2c2b/Placeholder.mill/400x400bb-75.webp", location: "AI tool" },
    { name: "Claude", url: "https://claude.ai", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/af/0e/e4/af0ee435-003b-cb19-b467-63856d7f1c8e/Placeholder.mill/400x400bb-75.webp", location: "AI tool" },
    { name: "Perplexity", url: "https://perplexity.ai", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/ad/8b/e3/ad8be3e1-305e-d878-7156-34e2bc520af9/Placeholder.mill/400x400bb-75.webp", location: "AI tool" },
    { name: "Copilot", url: "https://copilot.microsoft.com", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/84/aa/2f/84aa2ffd-d302-1e9c-4db4-b059e3544e17/Placeholder.mill/400x400bb-75.webp", location: "AI tool" },
    { name: "Meta AI", url: "https://meta.ai", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/b2/d1/8e/b2d18e66-dda3-8232-8d5a-63da95938018/Placeholder.mill/400x400bb-75.webp", location: "AI tool" },
    { name: "Replit", url: "https://replit.com/", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/92/f4/b4/92f4b4ad-929d-a2f0-bb9d-e42c9161bf4d/Placeholder.mill/400x400bb-75.webp", location: "AI tool" },
    { name: "Lovable", url: "https://lovable.dev/", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/33/37/22/33372279-2ea5-a27f-9cdd-c53d2b97485c/Placeholder.mill/400x400bb-75.webp", location: "AI tool" },
    { name: "Grammarly ", url: "https://www.grammarly.com/", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/d2/74/e9/d274e9ab-6e1c-17a3-05f7-3f3beaa2c9cd/Placeholder.mill/400x400bb-75.webp", location: "AI tool" },
    { name: "Notion", url: "https://www.notion.so/", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/41/3c/55/413c5574-dfa8-6210-5dd4-22fc35dd760d/Placeholder.mill/400x400bb-75.webp", location: "AI tool" },
    { name: "Menus", url: "", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/95/95/a4/9595a45e-cfc1-fef5-c4d7-6a5cba7b9201/Placeholder.mill/400x400bb-75.webp", location: "AI tool" },
    { name: "Kimi", url: "", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/4b/38/7a/4b387a52-9bfe-6bf4-456b-f9f965e69c74/Placeholder.mill/400x400bb-75.webp", location: "AI tool" },
    
    { name: "Word", url: "https://www.microsoft365.com/launch/word", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/18/e4/37/18e43763-0c04-fc23-414c-62bf927c14fa/Placeholder.mill/400x400bb-75.webp", location: "Microsoft" },
    { name: "Excel", url: "https://www.microsoft365.com/launch/excel", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/c0/ad/f0/c0adf058-8729-9492-8ed1-8fb5c7c3e37b/Placeholder.mill/400x400bb-75.webp", location: "Microsoft" },
    { name: "PowerPoint", url: "https://www.microsoft365.com/launch/powerpoint", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/13/7a/57/137a57a7-e3ec-147b-20a4-976fe19f9d27/Placeholder.mill/400x400bb-75.webp", location: "Microsoft" },
    { name: "OneNote", url: "https://www.onenote.com/", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/6c/f9/5b/6cf95b5f-4062-fd8a-5b20-03a23d473971/Placeholder.mill/400x400bb-75.webp", location: "Microsoft" },
    { name: "Copilot", url: "https://copilot.microsoft.com", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/84/aa/2f/84aa2ffd-d302-1e9c-4db4-b059e3544e17/Placeholder.mill/400x400bb-75.webp", location: "Microsoft" },
    { name: "Outlook", url: "https://outlook.live.com/mail/", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/c6/f3/bc/c6f3bca5-de8a-dc0a-3f92-e5907bb03431/Placeholder.mill/400x400bb-75.webp", location: "Microsoft" },
    { name: "Teams", url: "https://teams.microsoft.com/", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/81/a5/7b/81a57b69-f618-fbe7-48d3-8645b8f6815d/Placeholder.mill/400x400bb-75.webp", location: "Microsoft" },
    { name: "OneDrive", url: "https://onedrive.live.com/", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/bc/9c/e8/bc9ce8fe-556b-f0da-4628-70ec4ea7e840/Placeholder.mill/400x400bb-75.webp", location: "Microsoft" },
    { name: " SharePoint", url: "https://www.microsoft365.com/launch/sharepoint", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/17/f9/c5/17f9c50e-ceed-b8f7-36f8-6d4a75a4a769/Placeholder.mill/400x400bb-75.webp", location: "Microsoft" },
    { name: "Xbox", url: "https://www.microsoft365.com/launch/sharepoint", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/e5/9f/9a/e59f9a06-d445-5bbf-f47d-d5516fb35c06/Placeholder.mill/400x400bb-75.webp", location: "Microsoft" },
    { name: " Edge", url: "https://www.microsoft365.com/launch/sharepoint", icon: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/af/dc/5a/afdc5aa7-6111-3bbd-1d29-3632451edbd6/Placeholder.mill/400x400bb-75.webp", location: "Microsoft" }
];

const LEGACY_MICROSOFT_ICONS = new Set([
    "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/e3/1b/5d/e31b5d58-55d5-4ab9-8b9d-6c38ad9f9842/Placeholder.mill/400x400bb-75.webp",
    "https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/17/49/8e/17498e22-559b-1dbc-089d-6203026abc38/AppIcon-0-0-1x_U007epad-0-1-0-85-220.png/128x128ia-75.webp"
]);

let DEFAULT_SHORTCUTS;
try {
    const stored = localStorage.getItem(SHORTCUTS_KEY);
    DEFAULT_SHORTCUTS = stored ? JSON.parse(stored) : null;
    if (!Array.isArray(DEFAULT_SHORTCUTS)) throw new Error("Not array");

    // Migrate built-in launchpad shortcuts into saved lists.
    ORIGINAL_DEFAULT_SHORTCUTS.filter(s => ['AI tool', 'Microsoft'].includes(s.location)).forEach(defaultShortcut => {
        if (!DEFAULT_SHORTCUTS.find(s => s.name === defaultShortcut.name)) {
            DEFAULT_SHORTCUTS.push(defaultShortcut);
        } else {
            const savedShortcut = DEFAULT_SHORTCUTS.find(s => s.name === defaultShortcut.name);
            if (!savedShortcut.url) savedShortcut.url = defaultShortcut.url;
            if (LEGACY_MICROSOFT_ICONS.has(savedShortcut.icon)) savedShortcut.icon = defaultShortcut.icon;
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
const microsoftLaunchpadGrid = document.getElementById('microsoft-launchpad-grid');

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
        aiLaunchpadGrid,
        microsoftLaunchpadGrid
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

        // Microsoft Launchpad
        if (microsoftLaunchpadGrid && sc.location === 'Microsoft') {
            const a = document.createElement("a");
            a.href = sc.url;
            a.target = "_self";
            a.className = "launchpad-app";
            a.dataset.name = sc.name.toLowerCase();
            a.innerHTML = `<img src="${sc.icon}" alt="${sc.name}" /><span>${sc.name}</span>`;
            microsoftLaunchpadGrid.appendChild(a);
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
                        <option value="Microsoft" ${sc.location === 'Microsoft' ? 'selected' : ''}>LOCATION: Microsoft</option>
                    </select>
                    <button class="sc-delete-btn">
                        <img src="https://img.icons8.com/?size=100&id=2i5n7zNvArOt&format=png&color=FF0000" style="width: 20px; height: 20px;" alt="Delete">
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
setupLaunchpad('open-microsoft-tools', 'microsoft-launchpad-overlay', 'microsoft-launchpad-search-input', 'microsoft-launchpad-grid');

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
        if (settingsMain.classList.contains("minimized")) {
            settingsMain.classList.remove("minimized");
            return;
        }

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
        settingsMain.classList.remove("active", "maximized", "minimized");
    });
}

if (maximizeSettingsDot && settingsMain) {
    maximizeSettingsDot.addEventListener("click", () => settingsMain.classList.toggle("maximized"));
}

if (minimizeSettingsDot && settingsMain) {
    minimizeSettingsDot.addEventListener("click", () => settingsMain.classList.add("minimized"));
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
        ['tahoe-shortcuts', 'tahoe-dock-size', 'tahoe-dock-hover', 'tahoe-wallpaper', 'tahoe-wallpaper-type', 'tahoe-search-visible', 'tahoe-topbar-font-size', 'tahoe-todo-tasks', 'tahoe-todo-size'].forEach(k => localStorage.removeItem(k));
        requestDB('readwrite', store => {
            store.delete(KEY).onsuccess = () => location.reload();
        });
        setTimeout(() => location.reload(), 300);
    });
}

// ============================================================
// 7. TOP BAR CLOCK & BATTERY
// ============================================================
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
    if (glassClockDateEl) glassClockDateEl.textContent = `${dayName} ${monthName} ${date}`;
    if (glassClockTimeEl) {
        glassClockTimeEl.innerHTML = `${hours}<span class="colon">:</span>${minutes}`;
    }
};
setInterval(updateClock, 1000);
updateClock();

const updateBatteryUI = (battery) => {
    const levelEl = document.getElementById('battery-level');
    const fillEl = document.getElementById('battery-fill');
    const thunderElements = [
        document.getElementById('top-thunder-outline'),
        document.getElementById('top-thunder')
    ];

    if (levelEl) levelEl.textContent = Math.round(battery.level * 100) + '%';
    if (fillEl) fillEl.setAttribute('width', Math.round(battery.level * 16));
    thunderElements.forEach(element => {
        if (element) element.style.display = battery.charging ? 'block' : 'none';
    });
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
    openFolderBtn.addEventListener('click', () => {
        if (notepadWindow.classList.contains('minimized')) {
            notepadWindow.classList.remove('minimized');
            return;
        }
        notepadWindow.classList.toggle('active');
    });
}
if (closeNotepadBtn && notepadWindow) {
    closeNotepadBtn.addEventListener('click', () => {
        notepadWindow.classList.remove('active', 'maximized', 'minimized');
    });
}
if (minimizeNotepadBtn && notepadWindow) {
    minimizeNotepadBtn.addEventListener('click', () => notepadWindow.classList.add('minimized'));
}
if (maximizeNotepadBtn && notepadWindow) {
    maximizeNotepadBtn.addEventListener('click', () => notepadWindow.classList.toggle('maximized'));
}

const todoForm = document.getElementById('todo-form');
const todoInput = document.getElementById('todo-input');
const todoList = document.getElementById('todo-list');
const todoView = document.getElementById('todo-view');
const noteTextarea = document.getElementById('notepad-textarea');
const todoKey = 'tahoe-todo-tasks';
let todoTasks = [];
try { todoTasks = JSON.parse(localStorage.getItem(todoKey) || '[]'); } catch {}
if (!Array.isArray(todoTasks)) todoTasks = [];

const saveTodoTasks = () => localStorage.setItem(todoKey, JSON.stringify(todoTasks));
const renderTodoTasks = () => {
    todoList.replaceChildren();
    todoTasks.forEach((task, index) => {
        const row = document.createElement('li');
        const checkbox = document.createElement('input');
        const text = document.createElement('span');
        const remove = document.createElement('button');
        checkbox.type = 'checkbox';
        checkbox.checked = task.done;
        checkbox.onchange = () => { task.done = checkbox.checked; row.classList.toggle('done', task.done); saveTodoTasks(); };
        text.textContent = task.text;
        remove.type = 'button';
        remove.innerHTML = '<img src="https://img.icons8.com/?size=100&id=EYnXuvqJDgzX&format=png&color=ff0000" alt="Delete task" />';
        remove.setAttribute('aria-label', `Delete ${task.text}`);
        remove.onclick = () => { todoTasks.splice(index, 1); saveTodoTasks(); renderTodoTasks(); };
        row.classList.toggle('done', task.done);
        row.append(checkbox, text, remove);
        todoList.append(row);
    });
};

todoForm?.addEventListener('submit', event => {
    event.preventDefault();
    const text = todoInput.value.trim();
    if (!text) return;
    todoTasks.push({ text, done: false });
    todoInput.value = '';
    saveTodoTasks();
    renderTodoTasks();
});
document.querySelectorAll('input[name="notepad-view"]').forEach(input => {
    input.addEventListener('change', () => {
        const showTodo = input.value === 'todo';
        noteTextarea.hidden = showTodo;
        todoView.hidden = !showTodo;
    });
});
renderTodoTasks();

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
                    <img src="https://img.icons8.com/?size=100&id=nwcgrgC6UCmI&format=png&color=ffffff" class="suggestion-icon" alt="Suggestion">    
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
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadShortcuts, { once: true });
} else {
    loadShortcuts();
}