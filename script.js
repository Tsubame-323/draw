
// State
let rooms = JSON.parse(localStorage.getItem('insane_rooms')) || [];
let currentRoomId = localStorage.getItem('insane_current_room_id') || null;
let currentCharacterId = localStorage.getItem('insane_current_char_id') || null;
let isLibraryExpanded = false; // Default to Compact Mode
let isBigFormat = localStorage.getItem('insane_big_format') === 'true'; // New state

// DOM Elements
const madnessContainer = document.getElementById('madness-container');
const librarySection = document.getElementById('library-section');
const activeRoomContent = document.getElementById('active-room-content');
const noRoomMsg = document.getElementById('no-room-msg');
const currentRoomName = document.getElementById('current-room-name');
const createRoomBtn = document.getElementById('create-room-btn');
const roomNameInput = document.getElementById('room-name-input');
const roomSelectDropdown = document.getElementById('room-select-dropdown');
const deleteRoomBtn = document.getElementById('delete-room-btn');
const bigFormatToggle = document.getElementById('big-format-toggle'); // New Toggle

const clearDeckBtn = document.getElementById('clear-deck-btn');
const shuffleDeckBtn = document.getElementById('shuffle-deck-btn');
const drawResultOverlay = document.getElementById('draw-result-overlay');
const drawnCardsDisplay = document.getElementById('drawn-cards-display');
const closeDrawBtn = document.getElementById('close-draw-btn');

const deckCountSpan = document.getElementById('deck-count');
const deckList = document.getElementById('deck-list');
const deck3dStack = document.getElementById('deck-3d-stack');
const categoryFilter = document.getElementById('category-filter');
const toggleLibraryViewBtn = document.getElementById('toggle-library-view-btn');
const libraryModeLabel = document.getElementById('library-mode-label');

// Random Add Controls
const addRandomBtn = document.getElementById('add-random-btn');
// Dialog Elements
const randomDialog = document.getElementById('random-dialog');
const dialogRandomCount = document.getElementById('dialog-random-count');
const dialogRandomCategory = document.getElementById('dialog-random-category');
const dialogConfirmBtn = document.getElementById('dialog-confirm-btn');
const dialogCancelBtn = document.getElementById('dialog-cancel-btn');

// Character Elements
const addCharBtn = document.getElementById('add-char-btn');
const characterListDiv = document.getElementById('character-list');

// Resizer
const libraryResizer = document.getElementById('library-resizer');

// Modal Elements
const charModal = document.getElementById('char-modal');
const modalTitle = document.getElementById('modal-title');
const modalInput = document.getElementById('modal-char-name');
const modalConfirm = document.getElementById('modal-confirm-btn');
const modalCancel = document.getElementById('modal-cancel-btn');
let editingCharId = null;

// Constants
const CHARACTER_COLORS = [
    '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c', 
    '#3498db', '#9b59b6', '#34495e', '#7f8c8d'
];

// Initialization
function init() {
    // Init Toggle State
    if (bigFormatToggle) {
        bigFormatToggle.checked = isBigFormat;
        bigFormatToggle.addEventListener('change', (e) => {
            isBigFormat = e.target.checked;
            localStorage.setItem('insane_big_format', isBigFormat);
            // Refresh Library and Filter
            renderCategoryFilter();
            renderMadnessCards();
            // Refresh Deck Visuals (Stack) to update back image
            const room = getCurrentRoom();
            if (room) updateDeckVisuals(room);
            // Refresh Random Dialog Categories
            populateRandomDialogCategories();
        });
    }

    renderCategoryFilter();
    renderMadnessCards();
    updateRoomDropdown();
    
    // Populate Random Range Select (Dialog)
    // NOTE: This needs to be dynamic based on current data source
    populateRandomDialogCategories();

    if (currentRoomId) {
        if (rooms.find(r => r.id === currentRoomId)) {
            selectRoom(currentRoomId);
        } else {
            currentRoomId = null;
            updateRoomUI();
        }
    } else if (rooms.length > 0) {
        selectRoom(rooms[0].id);
    } else {
        updateRoomUI();
    }
}

// Helper to get current data source
function getCurrentData() {
    return isBigFormat ? cardsData : oldCardsData;
}

// Populate Random Dialog Categories
function populateRandomDialogCategories() {
    dialogRandomCategory.innerHTML = '<option value="all">全部分组</option>';
    const data = getCurrentData();
    const categories = [...new Set(data.map(c => c.category))];
    categories.forEach(cat => {
        const catGroup = data.find(c => c.category === cat);
        const count = catGroup ? catGroup.cards.length : 0;
        
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = `${cat} (${count}张)`;
        dialogRandomCategory.appendChild(option);
    });
}

// Render Category Filter
function renderCategoryFilter() {
    categoryFilter.innerHTML = '<option value="all">全部狂气</option>';
    const data = getCurrentData();
    const categories = [...new Set(data.map(c => c.category))];
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        categoryFilter.appendChild(option);
    });
}

categoryFilter.addEventListener('change', () => {
    renderMadnessCards(categoryFilter.value);
});

// Library View Toggle
toggleLibraryViewBtn.addEventListener('click', () => {
    setLibraryMode(!isLibraryExpanded);
});

// Resizer Logic (Refined for auto-switch)
let isResizing = false;
let resizeRaf = null;

const MIN_LIB_WIDTH = 200;
const MAX_LIB_WIDTH = 600;

libraryResizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none'; // Prevent text selection
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', stopResize);
});

function onMouseMove(e) {
    if (!isResizing) return;
    const clientX = e.clientX;
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => handleResize(clientX));
}

function handleResize(clientX) {
    const containerWidth = document.body.clientWidth;
    // Right section width = Container Width - Mouse X
    let newWidth = containerWidth - clientX;
    
    // Constraints
    if (newWidth < MIN_LIB_WIDTH) newWidth = MIN_LIB_WIDTH;
    if (newWidth > MAX_LIB_WIDTH) newWidth = MAX_LIB_WIDTH;
    
    librarySection.style.flexBasis = `${newWidth}px`;
    
    // Auto-switch mode logic
    if (newWidth < 450) { 
        if (isLibraryExpanded) {
            setLibraryMode(false); // Switch to compact
        }
    } else {
        if (!isLibraryExpanded) {
            setLibraryMode(true); // Switch to expanded
        }
    }
}

function stopResize() {
    isResizing = false;
    document.body.style.cursor = 'default';
    document.body.style.userSelect = ''; // Restore text selection
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', stopResize);
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
}

function setLibraryMode(expanded) {
    isLibraryExpanded = expanded;
    if (isLibraryExpanded) {
        librarySection.classList.remove('compact');
        madnessContainer.classList.remove('compact-view');
        madnessContainer.classList.add('expanded-view');
        if(libraryModeLabel) libraryModeLabel.textContent = '平铺模式';
        if (librarySection.offsetWidth < 360) {
            librarySection.style.flexBasis = '360px';
        }
    } else {
        librarySection.classList.add('compact');
        madnessContainer.classList.remove('expanded-view');
        madnessContainer.classList.add('compact-view');
        if(libraryModeLabel) libraryModeLabel.textContent = '堆叠模式';
        if (librarySection.offsetWidth > 250 || librarySection.offsetWidth < 100) {
            librarySection.style.flexBasis = '220px';
        }
    }
}

// Initial mode check (on load)
function checkLibraryMode() {
    setLibraryMode(isLibraryExpanded);
}

// Render Madness Cards (Library)
function renderMadnessCards(filterCategory = 'all') {
    madnessContainer.innerHTML = '';
    const data = getCurrentData();
    const room = getCurrentRoom();
    
    // Count occurrences of each card name in the deck
    // FIX: Differentiate by format (Old vs New)
    // Key format: "CardName_Format"
    const deckCounts = {};
    if (room && room.deck) {
        room.deck.forEach(c => {
            const key = `${c.name}_${!!c.isNewFormat}`;
            deckCounts[key] = (deckCounts[key] || 0) + 1;
        });
    }

    data.forEach(categoryGroup => {
        if (filterCategory !== 'all' && categoryGroup.category !== filterCategory) return;

        categoryGroup.cards.forEach(card => {
            const cardWithCategory = { ...card, category: categoryGroup.category };
            cardWithCategory.isNewFormat = isBigFormat;
            
            const cardEl = createCardElement(cardWithCategory);
            
            // Check if in deck (using precise key matching)
            // Current card format is determined by global 'isBigFormat' here
            const key = `${card.name}_${isBigFormat}`;
            const count = deckCounts[key] || 0;
            
            if (count > 0) {
                cardEl.classList.add('in-deck');
                const titleEl = cardEl.querySelector('.card-title');
                if (titleEl) {
                    titleEl.textContent = `${card.name} (x${count})`;
                }
            }

            cardEl.onclick = () => addToDeck(cardWithCategory);
            madnessContainer.appendChild(cardEl);
        });
    });
}

// Auto-scale removed in favor of scrollbar
function adjustCardFontSize(cardEl) {
    // Deprecated
}

function createCardElement(card, isDeckItem = false) {
    const el = document.createElement('div');
    el.className = 'card';
    
    // REMOVED inner wrapper <div class="flex flex-col h-full"> 
    // because .card itself is now the flex column container.
    // This removes the redundant layer that was breaking flex-grow logic.

    // Card Back Logic
    const isNewFormat = card.isNewFormat !== undefined ? card.isNewFormat : isBigFormat;
    // Note: When adding to deck, we capture current 'isBigFormat'. 
    // But when rendering library, 'card.isNewFormat' might be just set.
    
    // For library display, we want to show the BACK of the card if it was unrevealed? 
    // No, library always shows face up.
    // But wait, the prompt says "Current madness uses card back...". 
    // This usually applies to the deck view (unrevealed state). 
    
    // However, if we want to support 3D flip effect in library (if implemented later), we need the back image.
    // Currently, createCardElement creates face-up cards.
    
    // Let's ensure the card element has data-back-img if needed.
    const backImg = isNewFormat ? 'img/【新ins】狂气卡背.png' : 'img/卡背.png';
    el.setAttribute('data-back-img', backImg);

    el.innerHTML = `
            <h3 class="card-title">${card.name}</h3>
            <p class="card-eng">${card.nameEn || ''}</p>
            <div class="card-text">
                <div class="card-trigger-section">
                    <p class="card-label">触发条件</p>
                    <p class="card-content-text">${card.trigger}</p>
                </div>
                <div class="card-effect-section">
                    <p class="card-label">效果</p>
                    <p class="card-content-text">${card.effect}</p>
                </div>
                ${card.remarks ? `<div class="card-remark" style="margin-top:auto">${card.remarks}</div>` : ''}
            </div>
    `;

    if (isDeckItem) {
        // Drag Handle
        const dragHandle = document.createElement('div');
        dragHandle.className = 'drag-handle';
        dragHandle.innerHTML = '⋮⋮';
        el.appendChild(dragHandle);

        // Overlay for delete (Now an X button)
        const closeBtn = document.createElement('div');
        closeBtn.className = 'card-close-btn';
        closeBtn.innerHTML = '×';
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            removeFromDeck(card);
        };
        el.appendChild(closeBtn);
    } else {
        el.title = "点击加入牌堆";
    }

    return el;
}

// Room Management
createRoomBtn.addEventListener('click', () => {
    const roomName = roomNameInput.value.trim();
    if (roomName) {
        const newRoom = {
            id: Date.now().toString(),
            name: roomName,
            deck: [],
            characters: [] 
        };
        rooms.push(newRoom);
        saveData();
        updateRoomDropdown();
        selectRoom(newRoom.id);
        roomNameInput.value = '';
    } else {
        alert("请输入房间名");
    }
});

roomSelectDropdown.addEventListener('change', (e) => {
    if (e.target.value) {
        selectRoom(e.target.value);
    }
});

deleteRoomBtn.addEventListener('click', () => {
    if (!currentRoomId) return;
    const room = getCurrentRoom();
    if(confirm(`确定要删除房间 "${room.name}" 吗?`)) {
        deleteRoom(currentRoomId);
    }
});

function updateRoomDropdown() {
    roomSelectDropdown.innerHTML = '<option value="">-- 切换房间 --</option>';
    rooms.forEach(room => {
        const option = document.createElement('option');
        option.value = room.id;
        option.textContent = room.name;
        if (room.id === currentRoomId) option.selected = true;
        roomSelectDropdown.appendChild(option);
    });
}

function selectRoom(id) {
    currentRoomId = id;
    localStorage.setItem('insane_current_room_id', id);
    
    updateRoomDropdown();
    updateRoomUI();
}

function deleteRoom(id) {
    rooms = rooms.filter(r => r.id !== id);
    if (currentRoomId === id) {
        currentRoomId = rooms.length > 0 ? rooms[0].id : null;
    }
    saveData();
    updateRoomDropdown();
    updateRoomUI();
}

function getCurrentRoom() {
    return rooms.find(r => r.id === currentRoomId);
}

function updateRoomUI() {
    const room = getCurrentRoom();
    
    if (!room) {
        activeRoomContent.classList.add('hidden');
        noRoomMsg.classList.remove('hidden');
        currentRoomName.textContent = "未选择";
        return;
    }

    activeRoomContent.classList.remove('hidden');
    noRoomMsg.classList.add('hidden');
    currentRoomName.textContent = room.name;
    
    updateDeckVisuals(room);
    renderCharacters(room);
}

// --- Character Management ---

// Modal Logic
addCharBtn.addEventListener('click', () => {
    editingCharId = null;
    modalTitle.textContent = "新建角色";
    modalInput.value = "";
    charModal.classList.remove('hidden');
    modalInput.focus();
});

modalCancel.addEventListener('click', () => {
    charModal.classList.add('hidden');
});

const AVATAR_EMOJIS = [
    '🧙‍♂️', '🧝‍♀️', '🧛‍♂️', '🧚‍♂️', '🧜‍♀️', '🧞‍♂️', '🧟‍♀️', '🦹‍♂️', '🕵️‍♀️', 
    '💂‍♂️', '👷‍♀️', '👮‍♂️', '👩‍🚀', '👨‍🎤', '👩‍🎤', '👨‍🏫', '👩‍🏫', '👨‍🏭', 
    '👸', '🤴', '🦸‍♀️', '🦹‍♀️', '🧙‍♀️', '🧝‍♂️', '🧛‍♀️', '🧟‍♂️', '🧞‍♀️'
];

modalConfirm.addEventListener('click', () => {
    const name = modalInput.value.trim();
    if (!name) return;

    if (editingCharId) {
        // Edit existing
        const room = getCurrentRoom();
        const char = room.characters.find(c => c.id === editingCharId);
        if (char) {
            char.name = name;
            saveData();
            renderCharacters(room);
        }
    } else {
        // Create new
        const room = getCurrentRoom();
        if (room) {
             if (!room.characters) room.characters = [];
             const color = CHARACTER_COLORS[Math.floor(Math.random() * CHARACTER_COLORS.length)];
             const emoji = AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];
             const newChar = {
                id: Date.now().toString(),
                name: name,
                color: color,
                emoji: emoji,
                cards: []
            };
            room.characters.push(newChar);
            saveData();
            selectCharacter(newChar.id);
            renderCharacters(room);
        }
    }
    charModal.classList.add('hidden');
});

function openRenameModal(char) {
    editingCharId = char.id;
    modalTitle.textContent = "修改角色名";
    modalInput.value = char.name;
    charModal.classList.remove('hidden');
    modalInput.focus();
}


function renderCharacters(room) {
    characterListDiv.innerHTML = '';
    if (!room.characters) room.characters = [];
    
    room.characters.forEach((char, index) => {
        if (!char.color) char.color = CHARACTER_COLORS[index % CHARACTER_COLORS.length];
        if (!char.emoji) char.emoji = AVATAR_EMOJIS[index % AVATAR_EMOJIS.length];

        const charEl = document.createElement('div');
        charEl.className = 'character-card-container';
        if (char.id === currentCharacterId) {
            charEl.classList.add('selected');
        }
        
        charEl.onclick = () => selectCharacter(char.id);
        
        // --- 1. Header Section (Avatar + Info + Delete) ---
        const headerSection = document.createElement('div');
        headerSection.className = 'char-header-section';

        // Avatar Wrapper for positioning
        const avatarWrapper = document.createElement('div');
        avatarWrapper.style.position = 'relative';
        avatarWrapper.style.width = '64px';
        avatarWrapper.style.height = '64px';

        // Avatar Container (Circle with Emoji)
        const avatarContainer = document.createElement('div');
        avatarContainer.className = 'char-avatar-container';
        avatarContainer.style.width = '100%';
        avatarContainer.style.height = '100%';
        avatarContainer.style.backgroundColor = char.color;
        avatarContainer.onclick = (e) => {
             e.stopPropagation();
             selectCharacter(char.id);
        };
        
        // Emoji
        const emojiSpan = document.createElement('span');
        emojiSpan.className = 'avatar-emoji';
        emojiSpan.textContent = char.emoji;
        avatarContainer.appendChild(emojiSpan);
        
        avatarWrapper.appendChild(avatarContainer);
        headerSection.appendChild(avatarWrapper);

        // Delete Button (Moved to top-right of the whole card)
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'delete-char-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = "删除角色";
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm(`删除角色 "${char.name}"?`)) {
                deleteCharacter(char.id);
            }
        };
        charEl.appendChild(deleteBtn);

        // Info Section
        const infoSection = document.createElement('div');
        infoSection.className = 'char-info-section';

        const nameSpan = document.createElement('h4');
        nameSpan.className = 'char-name';
        nameSpan.textContent = char.name;
        nameSpan.title = "双击修改名称";
        nameSpan.ondblclick = (e) => {
            e.stopPropagation();
            openRenameModal(char);
        };
        infoSection.appendChild(nameSpan);
        
        // Meta Row: Total Cards + Revealed
        const revealedCount = char.cards.filter(c => c.isRevealed).length;
        const metaRow = document.createElement('div');
        metaRow.className = 'char-meta-row';
        
        const totalSpan = document.createElement('span');
        totalSpan.textContent = `${char.cards.length} 张狂气`;
        metaRow.appendChild(totalSpan);
        
        if (revealedCount > 0) {
            const revealedSpan = document.createElement('span');
            revealedSpan.className = 'revealed-count';
            revealedSpan.textContent = `已公开: ${revealedCount}`;
            metaRow.appendChild(revealedSpan);
        }
        
        infoSection.appendChild(metaRow);

        headerSection.appendChild(infoSection);
        charEl.appendChild(headerSection);

        // --- 2. Hand Section (Cards) ---
        const handSection = document.createElement('div');
        handSection.className = 'char-hand-section';
        
        if (char.cards.length === 0) {
            handSection.innerHTML = '<div style="width:100%;text-align:center;font-size:12px;color:#9ca3af;padding:10px;">暂无狂气卡</div>';
        } else {
            char.cards.forEach(card => {
                const miniCard = document.createElement('div');
                miniCard.className = `char-mini-card ${card.isRevealed ? 'revealed' : ''}`;
                
                if (card.isRevealed) {
            miniCard.textContent = card.name;
            miniCard.style.fontSize = '10px';
        } else {
            // Card Back visual
            const backImg = card.isNewFormat ? 'img/【新ins】狂气卡背.png' : 'img/卡背.png';
            miniCard.innerHTML = `<div class="unrevealed-text" style="background-image: url('${backImg}')"></div>`;
        }
        
        // Tooltip (Global Portal Logic)
        const tooltipPortal = document.getElementById('tooltip-portal');
        
        miniCard.onmouseenter = (e) => {
            const rect = miniCard.getBoundingClientRect();
            
            // Create tooltip element
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.innerHTML = `<strong>${card.name}</strong><br>${card.effect}<br><em>${card.trigger}</em>`;
            
            tooltipPortal.appendChild(tooltip);
            
            // Calculate position
            // Center horizontally above the card
            // We need to render first to get width, but max-width is known.
            // Let's approximate or use requestAnimationFrame.
            // Actually, appendChild makes it part of DOM, so we can measure.
            
            const tipRect = tooltip.getBoundingClientRect();
            
            let top = rect.top - tipRect.height - 8; // 8px spacing
            let left = rect.left + (rect.width / 2) - (tipRect.width / 2);
            
            // Prevent going off screen
            if (left < 10) left = 10;
            if (left + tipRect.width > window.innerWidth - 10) left = window.innerWidth - tipRect.width - 10;
            if (top < 10) {
                // Flip to bottom if top is clipped
                top = rect.bottom + 8;
                // Update arrow direction? CSS arrow is fixed to bottom currently.
                // For now, let's just ensure it's visible.
                tooltip.classList.add('flipped'); // Optional: Add class to flip arrow style
            }
            
            tooltip.style.top = `${top}px`;
            tooltip.style.left = `${left}px`;
            
            // Show
            requestAnimationFrame(() => tooltip.classList.add('visible'));
            
            // Store ref for removal
            miniCard._tooltipEl = tooltip;
        };
        
        miniCard.onmouseleave = (e) => {
            if (miniCard._tooltipEl) {
                miniCard._tooltipEl.remove();
                miniCard._tooltipEl = null;
            }
        };
        
        // Click to flip
                miniCard.onclick = (e) => {
                    e.stopPropagation();
                    
                    // Remove tooltip immediately on click to prevent persistence
                    if (miniCard._tooltipEl) {
                        miniCard._tooltipEl.remove();
                        miniCard._tooltipEl = null;
                    }

                    card.isRevealed = !card.isRevealed;
                    saveData();
                    renderCharacters(getCurrentRoom());
                };
                
                // Right click context menu
                miniCard.oncontextmenu = (e) => {
                    e.preventDefault();
                    showContextMenu(e.clientX, e.clientY, card, char.id);
                };
                
                handSection.appendChild(miniCard);
            });
        }
        
        charEl.appendChild(handSection);
        characterListDiv.appendChild(charEl);
    });
}

// --- Context Menu ---
function showContextMenu(x, y, card, charId) {
    // Remove existing
    removeContextMenu();
    
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.top = `${y}px`;
    menu.style.left = `${x}px`;
    
    const actions = [
        { label: '放回牌堆顶部', action: 'top' },
        { label: '放回牌堆底部', action: 'bottom' },
        { label: '放回牌堆随机', action: 'random' },
        { label: '丢弃 (删除)', action: 'delete', danger: true }
    ];
    
    actions.forEach(act => {
        const item = document.createElement('div');
        item.className = `context-menu-item ${act.danger ? 'danger' : ''}`;
        item.textContent = act.label;
        item.onclick = () => {
            handleCardAction(act.action, card, charId);
            removeContextMenu();
        };
        menu.appendChild(item);
    });
    
    document.body.appendChild(menu);
    
    // Click elsewhere to close
    document.addEventListener('click', removeContextMenu, { once: true });
}

function removeContextMenu() {
    const existing = document.querySelector('.context-menu');
    if (existing) existing.remove();
}

function handleCardAction(action, card, charId) {
    const room = getCurrentRoom();
    const char = room.characters.find(c => c.id === charId);
    if (!room || !char) return;
    
    // Remove from hand
    char.cards = char.cards.filter(c => c.uniqueId !== card.uniqueId);
    
    if (action === 'delete') {
        // Just remove (already done)
    } else {
        // Return to deck
        const cardToReturn = { ...card, isRevealed: false }; // Reset revealed state?
        
        if (action === 'top') {
            room.deck.push(cardToReturn);
        } else if (action === 'bottom') {
            room.deck.unshift(cardToReturn);
        } else if (action === 'random') {
            const randIndex = Math.floor(Math.random() * (room.deck.length + 1));
            room.deck.splice(randIndex, 0, cardToReturn);
        }
    }
    
    saveData();
    renderCharacters(room);
    updateDeckVisuals(room);
}

function selectCharacter(id) {
    currentCharacterId = id;
    localStorage.setItem('insane_current_char_id', id);
    const room = getCurrentRoom();
    if (room) renderCharacters(room);
}

function deleteCharacter(id) {
    const room = getCurrentRoom();
    if (!room) return;
    room.characters = room.characters.filter(c => c.id !== id);
    if (currentCharacterId === id) {
        currentCharacterId = null;
    }
    saveData();
    renderCharacters(room);
}


// Deck Management & Visuals
function addToDeck(card) {
    const room = getCurrentRoom();
    if (!room) {
        alert('请先新建或选择一个房间！');
        return;
    }
    const deckCard = { ...card, uniqueId: Date.now() + Math.random() };
    room.deck.push(deckCard);
    saveData();
    updateDeckVisuals(room);
    renderMadnessCards(categoryFilter.value); // Refresh Library UI
}

function removeFromDeck(cardToRemove) {
    const room = getCurrentRoom();
    if (!room) return;
    room.deck = room.deck.filter(c => c.uniqueId !== cardToRemove.uniqueId);
    saveData();
    updateDeckVisuals(room);
    renderMadnessCards(categoryFilter.value); // Refresh Library UI
}

function clearDeck() {
    const room = getCurrentRoom();
    if (!room) return;
    if(confirm('确定要清空当前房间的牌堆吗？')) {
        room.deck = [];
        saveData();
        updateDeckVisuals(room);
        renderMadnessCards(); // Refresh library to clear counts/gray state
    }
}

function shuffleDeck() {
    const room = getCurrentRoom();
    if (!room || room.deck.length === 0) return;
    
    // Fisher-Yates Shuffle
    for (let i = room.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [room.deck[i], room.deck[j]] = [room.deck[j], room.deck[i]];
    }
    
    saveData();
    updateDeckVisuals(room);
}

clearDeckBtn.addEventListener('click', clearDeck);
shuffleDeckBtn.addEventListener('click', shuffleDeck);

// Random Add Logic
addRandomBtn.addEventListener('click', () => {
    // Open Dialog
    randomDialog.classList.remove('hidden');
    dialogRandomCount.value = "5"; // Default
    dialogRandomCategory.value = "all";
});

dialogCancelBtn.addEventListener('click', () => {
    randomDialog.classList.add('hidden');
});

dialogConfirmBtn.addEventListener('click', () => {
    const room = getCurrentRoom();
    if (!room) {
        alert('请先新建或选择一个房间！');
        return;
    }
    
    let count = parseInt(dialogRandomCount.value) || 1;
    const range = dialogRandomCategory.value;
    const data = getCurrentData();
    
    let pool = [];
    if (range === 'all') {
        // Flatten all cards
        data.forEach(cat => {
            cat.cards.forEach(c => pool.push({...c, category: cat.category}));
        });
    } else {
        const catGroup = data.find(c => c.category === range);
        if (catGroup) {
            pool = catGroup.cards.map(c => ({...c, category: catGroup.category}));
        }
    }
    
    if (pool.length === 0) return;

    // Validate count against max
    if (count > pool.length) {
        alert(`该分组只有 ${pool.length} 张狂气，将全部加入。`);
        count = pool.length;
    }
    
    for(let i=0; i<count; i++) {
        // Random pick without replacement if user wants unique logic?
        // User said "抽取的狂气不能超过该分组的狂气数量上限" -> implies uniqueness or simply max cap.
        // Usually "random draw" implies taking from a finite deck.
        // Let's implement shuffle and take first N to ensure uniqueness within this draw batch.
        // But since this is "adding copies" to the deck, usually we just pick random.
        // However, "不能超过数量上限" suggests we treat the source as a finite pool for this operation.
        
        // Let's shuffle pool and take first N
        const randomIndex = Math.floor(Math.random() * pool.length);
        const randomCard = pool.splice(randomIndex, 1)[0]; // Remove to avoid duplicate in same batch
        
        // Add copy to room deck
        // FIX: Ensure randomly added cards have correct 'isNewFormat' flag
        // The pool already contains objects with 'category'. 
        // We need to inject 'isNewFormat' based on global toggle state at moment of addition.
        const deckCard = { 
            ...randomCard, 
            uniqueId: Date.now() + Math.random() + i,
            isNewFormat: isBigFormat // Inject current format state
        };
        
        room.deck.push(deckCard);
    }
    
    saveData();
    updateDeckVisuals(room);
    randomDialog.classList.add('hidden');
});

function updateDeckVisuals(room) {
    // 1. Update Count
    deckCountSpan.textContent = room.deck.length;

    // 2. Update Deck Contents List (Right Sub-area)
    deckList.innerHTML = '';
    if (room.deck.length === 0) {
        deckList.innerHTML = '<p class="empty-msg">牌堆为空</p>';
    } else {
        // Show newest first (which is the top of the deck)
        // Array order: [Bottom ... Top]
        // Display order: [Top ... Bottom]
        const reversedDeck = [...room.deck].reverse();
        
        reversedDeck.forEach((card, index) => {
            const cardEl = createCardElement(card, true);
            
            // Drag and Drop Attributes
            cardEl.setAttribute('draggable', 'true');
            // Store index in reversed array for visual purposes, but uniqueId is key
            cardEl.dataset.uniqueId = card.uniqueId;
            
            // Drag Events
            cardEl.addEventListener('dragstart', handleDragStart);
            cardEl.addEventListener('dragover', handleDragOver);
            cardEl.addEventListener('drop', handleDrop);
            cardEl.addEventListener('dragend', handleDragEnd);

            deckList.appendChild(cardEl);
        });
    }

    // 3. Update 3D Stack Visual (Left Sub-area)
    render3DStack(room.deck.length);
}

// --- Drag and Drop Logic ---
let draggedItem = null;

function handleDragStart(e) {
    draggedItem = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.uniqueId);
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDrop(e) {
    e.stopPropagation();
    
    if (draggedItem !== this) {
        const room = getCurrentRoom();
        const fromId = draggedItem.dataset.uniqueId;
        const toId = this.dataset.uniqueId;
        
        // Find actual indices in the main deck array
        const fromIndex = room.deck.findIndex(c => c.uniqueId.toString() === fromId);
        const toIndex = room.deck.findIndex(c => c.uniqueId.toString() === toId);
        
        if (fromIndex > -1 && toIndex > -1) {
            // Move item
            const [movedItem] = room.deck.splice(fromIndex, 1);
            room.deck.splice(toIndex, 0, movedItem);
            
            saveData();
            updateDeckVisuals(room);
        }
    }
    return false;
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    draggedItem = null;
}

function render3DStack(count) {
    const topCard = deck3dStack.querySelector('.deck-top-card');
    const room = getCurrentRoom();
    
    // Keep top card, remove layers
    (deck3dStack.querySelectorAll('.deck-layer')).forEach(l => l.remove());
    
    if (count === 0 || !room || room.deck.length === 0) {
        const emptyPlaceholder = document.createElement('div');
        emptyPlaceholder.className = 'deck-layer';
        emptyPlaceholder.style.background = 'transparent';
        emptyPlaceholder.style.border = '2px dashed #999';
        emptyPlaceholder.style.display = 'flex';
        emptyPlaceholder.style.justifyContent = 'center';
        emptyPlaceholder.style.alignItems = 'center';
        emptyPlaceholder.textContent = 'Empty';
        emptyPlaceholder.style.color = '#999';
        deck3dStack.insertBefore(emptyPlaceholder, topCard);
        topCard.style.display = 'none'; // Hide top card if empty
        return;
    }
    
    topCard.style.display = 'flex';
    
    // Get actual top card from deck data (last element)
    const topCardData = room.deck[room.deck.length - 1];
    const topBackImg = (topCardData.isNewFormat) ? 'img/【新ins】狂气卡背.png' : 'img/卡背.png';
    topCard.style.backgroundImage = `url('${topBackImg}')`;

    const maxLayers = 30; 
    
    // Create layers from top down
    const layersUnderTop = Math.min(count - 1, maxLayers);
    
    for (let i = 0; i < layersUnderTop; i++) {
        const layer = document.createElement('div');
        layer.className = 'deck-layer';
        
        const deckIndex = room.deck.length - 2 - i;
        let layerBackImg = 'img/卡背.png'; 
        if (deckIndex >= 0) {
             const layerCardData = room.deck[deckIndex];
             layerBackImg = (layerCardData.isNewFormat) ? 'img/【新ins】狂气卡背.png' : 'img/卡背.png';
        }
        
        layer.style.backgroundImage = `url('${layerBackImg}')`;
        
        // Z-Index: Top card is highest. Layers underneath decrease.
        layer.style.zIndex = layersUnderTop - i;
        
        deck3dStack.insertBefore(layer, topCard);
    }
    
    // Top card should be highest.
    topCard.style.zIndex = layersUnderTop + 2;
    
    // Calculate transforms
    const totalShift = layersUnderTop * 1.5;
    topCard.style.transform = `translate(-${totalShift}px, -${totalShift}px)`;
   
   // Fix loop transforms.
   const layers = deck3dStack.querySelectorAll('.deck-layer');
   (deck3dStack.querySelectorAll('.deck-layer')).forEach((layer, i) => {
       // i=0 is just under top.
       // Dist from top = 1.5.
       // Top pos = totalShift.
       // Layer pos = totalShift - 1.5*(i+1).
       const pos = totalShift - (1.5 * (i + 1));
       layer.style.transform = `translate(-${pos}px, -${pos}px)`;
   });
}

// 3D Deck Click -> Draw for Character
deck3dStack.addEventListener('click', (e) => {
    // Only trigger if clicking on the deck itself (not empty space, though stack is usually tight)
    // Actually, let's allow clicking anywhere in the stack area to be safe
    const room = getCurrentRoom();
    if (!room || room.deck.length === 0) return;
    
    if (currentCharacterId) {
        // Draw to character
        drawToCharacter(1);
    } else {
        // Global draw
        drawCards(1);
    }
});

function drawToCharacter(count) {
    const room = getCurrentRoom();
    const char = room.characters.find(c => c.id === currentCharacterId);
    if (!room || !char || room.deck.length < count) return;
    
    for(let i=0; i<count; i++) {
        // Draw from Top (End of array)
        const card = room.deck.pop();
        
        // Add to character hand
        char.cards.push({
            ...card,
            isRevealed: false // Face down initially
        });
    }
    
    saveData();
    updateDeckVisuals(room);
    renderCharacters(room);
}

// Global Draw (No character selected or manual button click)
function drawCards(count) {
    const room = getCurrentRoom();
    if (!room || room.deck.length < count) return;
    
    if (currentCharacterId) {
        drawToCharacter(count);
        return;
    }

    const drawn = [];
    for(let i=0; i<count; i++) {
        if (room.deck.length === 0) break;
        // Draw from Top (End of array)
        const card = room.deck.pop();
        drawn.push(card);
    }
    
    saveData();
    updateDeckVisuals(room);
    
    // Show Overlay
    drawnCardsDisplay.innerHTML = '';
    drawn.forEach(card => {
        const cardEl = createCardElement(card);
        cardEl.querySelector('.card-text').style.display = 'block';
        drawnCardsDisplay.appendChild(cardEl);
    });
    drawResultOverlay.classList.remove('hidden');
}

closeDrawBtn.addEventListener('click', () => {
    drawResultOverlay.classList.add('hidden');
});

// Storage
function saveData() {
    localStorage.setItem('insane_rooms', JSON.stringify(rooms));
}

// Start
init();
// Check layout after init
setTimeout(checkLibraryMode, 100);
