// Game constants
const IS_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const GRID_SIZE = 8; // Keep 8x8x8 grid
const UNIT_SIZE = IS_MOBILE ? 1.2 : 1.25; // Increased unit size on mobile for bigger grid
const GRID_UNITS = GRID_SIZE / UNIT_SIZE;
const MOVE_INTERVAL = 400; // Slowed down from 300ms to 400ms for slower snake movement
const QUICK_RESPONSE_DELAY = 150; // delay for immediate moves (slower than instant but faster than interval)
const COLORS = {
    snake: 0x00ff00, // bright green
    food: 0xff3333,  // brighter red
    gridLines: 0xffffff, // white grid lines
    gridBox: 0x888888,
    xAxis: 0xff0000, // red for X axis (Left/Right arrows)
    yAxis: 0x00ff00, // green for Y axis (W/S keys)
    zAxis: 0x0088ff  // blue for Z axis (Up/Down arrows)
};

// Game variables
let scene, camera, renderer;
let snake = [];
let food;
let direction = { x: 1, y: 0, z: 0 };
let nextDirection = { x: 1, y: 0, z: 0 };
let directionQueue = []; // Queue to store rapid direction changes
let score = 0;
let isGameOver = false;
let moveTimer;
let gameGroup;
let lastMoveTime = 0; // Track the last time the snake moved
let touchStartX, touchStartY, touchStartTime;
let lastSwipeTime = 0; // Track last swipe time to prevent too rapid swipes
const MIN_SWIPE_INTERVAL = 100; // Minimum time between swipes (ms)

// DOM elements
const scoreBoard = document.getElementById('scoreBoard');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScore = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');

// Initialize the game
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111); // subtle dark background

    // Create camera looking at the grid from a rotated position
    camera = new THREE.PerspectiveCamera(
        IS_MOBILE ? 70 : 50, // Increased field of view on mobile even more for better visibility
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    
    // Position camera to see the larger physical cube
    // Calculate actual physical size of the cube: GRID_SIZE * UNIT_SIZE
    const totalSize = GRID_SIZE * UNIT_SIZE; // Physical size of the cube
    
    // Adjust camera position based on physical size and device
    if (IS_MOBILE) {
        // Position farther back on mobile so the whole grid is visible
        // Move the camera up higher to make room for controls below
        camera.position.set(totalSize * 1.8, totalSize * 2.2, totalSize * 2.8);
    } else {
        camera.position.set(totalSize * 1.0, totalSize * 1.0, totalSize * 2.0);
    }
    camera.lookAt(totalSize * 0.5, totalSize * 0.5, totalSize * 0.5);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Create a group to hold everything - grid, axes, floor
    gameGroup = new THREE.Group();
    
    // Set the pivot point at the origin (0,0,0) where the colored vectors meet
    gameGroup.position.set(0, 0, 0);
    
    scene.add(gameGroup);

    // Add grid for reference
    createGrid();

    // Initialize snake
    createSnake();

    // Create first food
    createFood();

    // Add event listeners
    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('resize', handleResize);
    restartButton.addEventListener('click', restartGame);
    
    // Add mobile controls
    if (IS_MOBILE) {
        createMobileControls();
    } else {
        // Only add touch event listeners for non-mobile devices
        renderer.domElement.addEventListener('touchstart', handleTouchStart, false);
        renderer.domElement.addEventListener('touchmove', handleTouchMove, false);
        renderer.domElement.addEventListener('touchend', handleTouchEnd, false);
    }

    // Start game loop
    moveTimer = setInterval(moveSnake, MOVE_INTERVAL);
    animate();
}

// Create mobile control buttons
function createMobileControls() {
    // Create plus-shaped control layout
    const controlsContainer = document.createElement('div');
    controlsContainer.id = 'mobile-controls';
    controlsContainer.style.position = 'fixed';
    controlsContainer.style.bottom = '30px';
    controlsContainer.style.left = '0';
    controlsContainer.style.width = '100%';
    controlsContainer.style.zIndex = '1000';
    
    // Create a div for the plus shape layout
    const plusLayout = document.createElement('div');
    plusLayout.style.position = 'relative';
    plusLayout.style.width = '240px';
    plusLayout.style.height = '240px';
    plusLayout.style.margin = '0 auto';
    
    // Create buttons
    // Green buttons (Y-axis)
    const upButton = createDirectionButton('↑', COLORS.yAxis, () => queueDirectionChange({ x: 0, y: 1, z: 0 }));
    const downButton = createDirectionButton('↓', COLORS.yAxis, () => queueDirectionChange({ x: 0, y: -1, z: 0 }));
    
    // Red buttons (X-axis)
    const leftButton = createDirectionButton('←', COLORS.xAxis, () => queueDirectionChange({ x: -1, y: 0, z: 0 }));
    const rightButton = createDirectionButton('→', COLORS.xAxis, () => queueDirectionChange({ x: 1, y: 0, z: 0 }));
    
    // Blue buttons (Z-axis)
    const inButton = createDirectionButton('↗', COLORS.zAxis, () => queueDirectionChange({ x: 0, y: 0, z: -1 }));
    const outButton = createDirectionButton('↙', COLORS.zAxis, () => queueDirectionChange({ x: 0, y: 0, z: 1 }));
    
    // Position the buttons in a plus shape
    // Top (Green Up)
    upButton.style.position = 'absolute';
    upButton.style.top = '0';
    upButton.style.left = '90px';
    
    // Right (Red Right)
    rightButton.style.position = 'absolute';
    rightButton.style.top = '90px';
    rightButton.style.right = '0';
    
    // Bottom (Green Down)
    downButton.style.position = 'absolute';
    downButton.style.bottom = '0';
    downButton.style.left = '90px';
    
    // Left (Red Left)
    leftButton.style.position = 'absolute';
    leftButton.style.top = '90px';
    leftButton.style.left = '0';
    
    // Top-right corner (Blue In)
    inButton.style.position = 'absolute';
    inButton.style.top = '0';
    inButton.style.right = '0';
    
    // Bottom-left corner (Blue Out)
    outButton.style.position = 'absolute';
    outButton.style.bottom = '0';
    outButton.style.left = '0';
    
    // Add buttons to the plus layout
    plusLayout.appendChild(upButton);
    plusLayout.appendChild(rightButton);
    plusLayout.appendChild(downButton);
    plusLayout.appendChild(leftButton);
    plusLayout.appendChild(inButton);
    plusLayout.appendChild(outButton);
    
    // Add the plus layout to the container
    controlsContainer.appendChild(plusLayout);
    
    // Add container to the document
    document.body.appendChild(controlsContainer);
}

// Helper function to create direction buttons
function createDirectionButton(arrowSymbol, color, clickHandler) {
    const button = document.createElement('button');
    button.innerHTML = arrowSymbol;
    
    // Convert hex color to RGB
    const hexToRgb = hex => {
        const r = (hex >> 16) & 255;
        const g = (hex >> 8) & 255;
        const b = hex & 255;
        return `rgb(${r}, ${g}, ${b})`;
    };
    
    // Style the button
    button.style.width = '60px';
    button.style.height = '60px';
    button.style.fontSize = '30px';
    button.style.borderRadius = '15px';
    button.style.background = hexToRgb(color);
    button.style.color = 'white';
    button.style.fontWeight = 'bold';
    button.style.border = 'none';
    button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.5)';
    button.style.outline = 'none';
    button.style.cursor = 'pointer';
    button.style.display = 'flex';
    button.style.justifyContent = 'center';
    button.style.alignItems = 'center';
    
    // Add active feedback
    button.addEventListener('touchstart', (e) => {
        button.style.transform = 'scale(0.95)';
        button.style.boxShadow = '0 2px 4px rgba(0,0,0,0.5)';
        e.preventDefault(); // Prevent default to avoid double-tap zooming
    });
    
    button.addEventListener('touchend', (e) => {
        button.style.transform = 'scale(1)';
        button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.5)';
        clickHandler();
        e.preventDefault(); // Prevent default behavior
    });
    
    return button;
}

// Create reference grid
function createGrid() {
    // Create a box that exactly matches the game boundaries
    // Using totalSize to ensure the grid's physical size matches our game world
    const totalSize = GRID_SIZE * UNIT_SIZE;
    const gridGeometry = new THREE.BoxGeometry(totalSize, totalSize, totalSize);
    
    // Create a more visible grid with thicker lines
    const gridMaterial = new THREE.LineBasicMaterial({ 
        color: COLORS.gridLines,
        transparent: false,
        linewidth: IS_MOBILE ? 2 : 3 // Slightly thinner lines on mobile for cleaner appearance
    });
    
    // Create the grid box as a wireframe
    const gridBox = new THREE.LineSegments(
        new THREE.EdgesGeometry(gridGeometry),
        gridMaterial
    );
    
    // Position the grid at the center of the game area
    gridBox.position.set(totalSize / 2, totalSize / 2, totalSize / 2);
    
    // Add the grid to the game group
    gameGroup.add(gridBox);
    
    // Add a floor grid for better orientation - simple gray grid, no colors
    const floorGridSize = totalSize;
    const floorGridDivisions = GRID_SIZE;
    const floorGrid = new THREE.GridHelper(floorGridSize, floorGridDivisions, 0x444444, 0x444444);
    floorGrid.position.set(totalSize / 2, 0, totalSize / 2);
    gameGroup.add(floorGrid);
    
    // Add colored axes at the proper corner of the grid
    addAxesAtCorner();
    
    // Rotate the entire game group around the origin (where the vectors meet)
    // For better visibility on mobile, rotate slightly more
    gameGroup.rotation.y = Math.PI * (IS_MOBILE ? 0.1 : 0.005); // ~18 degrees clockwise for mobile
}

// Add axes at the proper corner of the grid
function addAxesAtCorner() {
    const totalSize = GRID_SIZE * UNIT_SIZE;
    const axisLength = totalSize;
    const axisWidth = IS_MOBILE ? 4 : 3; // Thicker lines for mobile
    
    // Position axes at the (0,0,0) corner of the grid
    // Since the grid is centered at (totalSize/2, totalSize/2, totalSize/2)
    // We need to place the axes at (0, 0, 0) for proper alignment
    
    // Create the X-axis (red, left/right)
    const xAxisGeo = new THREE.BufferGeometry();
    xAxisGeo.setAttribute('position', new THREE.Float32BufferAttribute([
        0, 0, 0,
        axisLength, 0, 0
    ], 3));
    const xAxisMat = new THREE.LineBasicMaterial({ color: COLORS.xAxis, linewidth: axisWidth });
    const xAxis = new THREE.Line(xAxisGeo, xAxisMat);
    gameGroup.add(xAxis);
    
    // Add red arrow for X-axis - bigger for mobile
    const xArrowGeo = new THREE.ConeGeometry(IS_MOBILE ? 0.6 : 0.3, IS_MOBILE ? 1.2 : 0.6, 12);
    const xArrowMat = new THREE.MeshBasicMaterial({ color: COLORS.xAxis });
    const xArrow = new THREE.Mesh(xArrowGeo, xArrowMat);
    xArrow.position.set(axisLength, 0, 0);
    xArrow.rotation.z = -Math.PI / 2;
    gameGroup.add(xArrow);
    
    // Create the Y-axis (green, W/S keys)
    const yAxisGeo = new THREE.BufferGeometry();
    yAxisGeo.setAttribute('position', new THREE.Float32BufferAttribute([
        0, 0, 0,
        0, axisLength, 0
    ], 3));
    const yAxisMat = new THREE.LineBasicMaterial({ color: COLORS.yAxis, linewidth: axisWidth });
    const yAxis = new THREE.Line(yAxisGeo, yAxisMat);
    gameGroup.add(yAxis);
    
    // Add green arrow for Y-axis - bigger for mobile
    const yArrowGeo = new THREE.ConeGeometry(IS_MOBILE ? 0.6 : 0.3, IS_MOBILE ? 1.2 : 0.6, 12);
    const yArrowMat = new THREE.MeshBasicMaterial({ color: COLORS.yAxis });
    const yArrow = new THREE.Mesh(yArrowGeo, yArrowMat);
    yArrow.position.set(0, axisLength, 0);
    gameGroup.add(yArrow);
    
    // Create the Z-axis (blue, up/down arrows)
    const zAxisGeo = new THREE.BufferGeometry();
    zAxisGeo.setAttribute('position', new THREE.Float32BufferAttribute([
        0, 0, 0,
        0, 0, axisLength
    ], 3));
    const zAxisMat = new THREE.LineBasicMaterial({ color: COLORS.zAxis, linewidth: axisWidth });
    const zAxis = new THREE.Line(zAxisGeo, zAxisMat);
    gameGroup.add(zAxis);
    
    // Add blue arrow for Z-axis - bigger for mobile
    const zArrowGeo = new THREE.ConeGeometry(IS_MOBILE ? 0.6 : 0.3, IS_MOBILE ? 1.2 : 0.6, 12);
    const zArrowMat = new THREE.MeshBasicMaterial({ color: COLORS.zAxis });
    const zArrow = new THREE.Mesh(zArrowGeo, zArrowMat);
    zArrow.position.set(0, 0, axisLength);
    zArrow.rotation.x = Math.PI / 2;
    gameGroup.add(zArrow);
    
    // Removed colored spheres for mobile
}

// Create initial snake
function createSnake() {
    // Starting with a length of 3
    const snakeGeometry = new THREE.BoxGeometry(UNIT_SIZE * 0.9, UNIT_SIZE * 0.9, UNIT_SIZE * 0.9);
    const snakeMaterial = new THREE.MeshBasicMaterial({ 
        color: COLORS.snake,
        emissive: COLORS.snake,
        emissiveIntensity: 0.3
    });
    
    // Start at the center of the grid - using UNIT_SIZE for scaling
    const startX = Math.floor(GRID_SIZE / 2) * UNIT_SIZE;
    const startY = Math.floor(GRID_SIZE / 2) * UNIT_SIZE;
    const startZ = Math.floor(GRID_SIZE / 2) * UNIT_SIZE;
    
    // Create 3 segments
    for (let i = 0; i < 3; i++) {
        const segment = new THREE.Mesh(snakeGeometry, snakeMaterial);
        segment.position.set(startX - i * UNIT_SIZE, startY, startZ);
        snake.push({
            mesh: segment,
            position: { x: startX - i * UNIT_SIZE, y: startY, z: startZ }
        });
        gameGroup.add(segment);
    }
    
    // Set the initial direction to move right (along red X axis)
    direction = { x: 1, y: 0, z: 0 };
    nextDirection = { x: 1, y: 0, z: 0 };
}

// Create food at random position
function createFood() {
    if (food) {
        gameGroup.remove(food.mesh);
    }
    
    // Create a more visible food with larger size
    const foodGeometry = new THREE.SphereGeometry(UNIT_SIZE * 0.6, 16, 16);
    const foodMaterial = new THREE.MeshBasicMaterial({ 
        color: COLORS.food,
        emissive: COLORS.food,
        emissiveIntensity: 0.5
    });
    const foodMesh = new THREE.Mesh(foodGeometry, foodMaterial);
    
    // Find a position that's not occupied by the snake
    let validPosition = false;
    let foodX, foodY, foodZ;
    
    while (!validPosition) {
        // Generate position using the same grid cells the snake can move through
        // Using 0 to GRID_SIZE-1 ensures we're in valid grid cells
        foodX = Math.floor(Math.random() * GRID_SIZE) * UNIT_SIZE;
        foodY = Math.floor(Math.random() * GRID_SIZE) * UNIT_SIZE;
        foodZ = Math.floor(Math.random() * GRID_SIZE) * UNIT_SIZE;
        
        validPosition = true;
        // Check if position overlaps with snake
        for (let segment of snake) {
            if (
                segment.position.x === foodX &&
                segment.position.y === foodY &&
                segment.position.z === foodZ
            ) {
                validPosition = false;
                break;
            }
        }
    }
    
    foodMesh.position.set(foodX, foodY, foodZ);
    food = {
        mesh: foodMesh,
        position: { x: foodX, y: foodY, z: foodZ }
    };
    gameGroup.add(foodMesh);
}

// Handle touch start (for non-mobile devices)
function handleTouchStart(event) {
    if (isGameOver) return;
    
    const touch = event.touches[0];
    const touchX = touch.clientX;
    const touchY = touch.clientY;
    const touchTime = Date.now();
    
    // Store touch start data
    this.touchStartX = touchX;
    this.touchStartY = touchY;
    this.touchStartTime = touchTime;
    
    // Prevent default to avoid scrolling
    event.preventDefault();
}

// Handle touch move (for non-mobile devices)
function handleTouchMove(event) {
    // Prevent default to avoid scrolling
    event.preventDefault();
}

// Handle touch end (for non-mobile devices)
function handleTouchEnd(event) {
    if (isGameOver) return;
    
    // Prevent default action
    event.preventDefault();
    
    // If no start touch registered, exit
    if (!this.touchStartX || !this.touchStartY) return;
    
    // Get touch end position
    const touch = event.changedTouches[0];
    const touchEndX = touch.clientX;
    const touchEndY = touch.clientY;
    const touchEndTime = Date.now();
    
    // Calculate swipe distance and time
    const deltaX = touchEndX - this.touchStartX;
    const deltaY = touchEndY - this.touchStartY;
    const deltaTime = touchEndTime - this.touchStartTime;
    
    // Minimum swipe distance and maximum time for a swipe
    const minSwipeDistance = 20; // Lower threshold to make swipes more responsive
    const maxSwipeTime = 600; // Longer time window for swipe detection
    
    // If swipe was too slow or too short, ignore it
    if (deltaTime > maxSwipeTime || 
        (Math.abs(deltaX) < minSwipeDistance && Math.abs(deltaY) < minSwipeDistance)) {
        return;
    }
    
    // Determine primary swipe direction
    if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        // Clear horizontal swipe (X-axis/red)
        if (deltaX > 0) {
            // Right swipe - positive X
            queueDirectionChange({ x: 1, y: 0, z: 0 });
        } else {
            // Left swipe - negative X
            queueDirectionChange({ x: -1, y: 0, z: 0 });
        }
    } 
    else if (Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
        // Clear vertical swipe - Y-axis/green
        if (deltaY < 0) {
            // Up swipe - positive Y
            queueDirectionChange({ x: 0, y: 1, z: 0 });
        } else {
            // Down swipe - negative Y
            queueDirectionChange({ x: 0, y: -1, z: 0 });
        }
    }
    else {
        // Diagonal swipe - Z-axis/blue (45 degree swipe)
        if (deltaY < 0 && deltaX > 0 || deltaY > 0 && deltaX < 0) {
            // Up-right or down-left = into screen (negative Z)
            queueDirectionChange({ x: 0, y: 0, z: -1 });
        } else {
            // Up-left or down-right = out of screen (positive Z)
            queueDirectionChange({ x: 0, y: 0, z: 1 });
        }
    }
}

// Queue a direction change - used by both keyboard and touch
function queueDirectionChange(newDirection) {
    // First validate this is a legal move (can't reverse direction)
    if ((direction.x !== 0 && newDirection.x === -direction.x) || 
        (direction.y !== 0 && newDirection.y === -direction.y) || 
        (direction.z !== 0 && newDirection.z === -direction.z)) {
        return false; // Can't go directly backwards
    }
    
    // Check if this direction is different from the last queued direction
    const lastQueuedDir = directionQueue.length > 0 ? 
        directionQueue[directionQueue.length - 1] : nextDirection;
        
    // Only queue if it's a different direction than the last one
    if (lastQueuedDir.x !== newDirection.x || 
        lastQueuedDir.y !== newDirection.y || 
        lastQueuedDir.z !== newDirection.z) {
        
        // Add to direction queue
        directionQueue.push(newDirection);
        
        // Immediately set next direction to first queued direction
        if (directionQueue.length === 1) {
            nextDirection = directionQueue[0];
        }
        
        return true; // Direction change was queued
    }
    
    return false; // No change (already going this direction)
}

// Handle key presses for snake direction
function handleKeyPress(event) {
    // Prevent default action
    event.preventDefault();
    
    // If Enter key is pressed, restart the game
    if (event.key === 'Enter') {
        if (isGameOver) {
            restartGame();
        }
        return;
    }
    
    // If game is over, don't process movement keys
    if (isGameOver) return;
    
    let newDirection = null;
    
    // Updated control scheme as requested:
    // Red X-axis: Left/Right arrows
    // Green Y-axis: W/S keys
    // Blue Z-axis: Up/Down arrows
    switch (event.key) {
        // X-axis controls (LEFT/RIGHT) - RED
        case 'ArrowLeft':
            newDirection = { x: -1, y: 0, z: 0 };
            break;
        case 'ArrowRight':
            newDirection = { x: 1, y: 0, z: 0 };
            break;
            
        // Y-axis controls (W/S) - GREEN
        case 'w':
        case 'W':
            newDirection = { x: 0, y: 1, z: 0 };
            break;
        case 's':
        case 'S':
            newDirection = { x: 0, y: -1, z: 0 };
            break;
            
        // Z-axis controls (UP/DOWN) - BLUE
        case 'ArrowUp':
            newDirection = { x: 0, y: 0, z: -1 };
            break;
        case 'ArrowDown':
            newDirection = { x: 0, y: 0, z: 1 };
            break;
    }
    
    // If a valid new direction is determined
    if (newDirection) {
        queueDirectionChange(newDirection);
    }
}

// Move the snake
function moveSnake() {
    if (isGameOver) return;
    
    // Update the last move time
    lastMoveTime = Date.now();
    
    // Update direction from queue if available
    if (directionQueue.length > 0) {
        nextDirection = directionQueue.shift();
    }
    
    // Update direction
    direction = { ...nextDirection };
    
    // Calculate new head position
    const head = snake[0];
    const newHeadPosition = {
        x: head.position.x + direction.x * UNIT_SIZE,
        y: head.position.y + direction.y * UNIT_SIZE,
        z: head.position.z + direction.z * UNIT_SIZE
    };
    
    // Fixed boundary check - ensuring snake can access entire grid
    // The grid goes from 0 to (GRID_SIZE-1)*UNIT_SIZE
    const totalSize = GRID_SIZE * UNIT_SIZE;
    if (
        newHeadPosition.x < 0 || newHeadPosition.x >= totalSize ||
        newHeadPosition.y < 0 || newHeadPosition.y >= totalSize ||
        newHeadPosition.z < 0 || newHeadPosition.z >= totalSize
    ) {
        gameOver();
        return;
    }
    
    // Check if hitting itself
    for (let i = 0; i < snake.length; i++) {
        if (
            snake[i].position.x === newHeadPosition.x &&
            snake[i].position.y === newHeadPosition.y &&
            snake[i].position.z === newHeadPosition.z
        ) {
            gameOver();
            return;
        }
    }
    
    // Check if eating food
    const isEating = (
        newHeadPosition.x === food.position.x &&
        newHeadPosition.y === food.position.y &&
        newHeadPosition.z === food.position.z
    );
    
    // Create new head
    const snakeGeometry = new THREE.BoxGeometry(UNIT_SIZE * 0.9, UNIT_SIZE * 0.9, UNIT_SIZE * 0.9);
    const snakeMaterial = new THREE.MeshBasicMaterial({ 
        color: COLORS.snake,
        emissive: COLORS.snake,
        emissiveIntensity: 0.3
    });
    const newHead = new THREE.Mesh(snakeGeometry, snakeMaterial);
    newHead.position.set(newHeadPosition.x, newHeadPosition.y, newHeadPosition.z);
    
    // Add new head to scene and snake array
    gameGroup.add(newHead);
    snake.unshift({
        mesh: newHead,
        position: { ...newHeadPosition }
    });
    
    // If not eating, remove tail
    if (!isEating) {
        const tail = snake.pop();
        gameGroup.remove(tail.mesh);
    } else {
        // Increase score and create new food
        score += 10;
        scoreBoard.textContent = `Score: ${score}`;
        createFood();
    }
}

// Handle game over
function gameOver() {
    isGameOver = true;
    clearInterval(moveTimer);
    finalScore.textContent = `Your score: ${score}`;
    gameOverScreen.style.display = 'flex';
}

// Restart the game
function restartGame() {
    // Reset game state
    score = 0;
    isGameOver = false;
    
    // Set initial direction to move right
    direction = { x: 1, y: 0, z: 0 };
    nextDirection = { x: 1, y: 0, z: 0 };
    
    // Clear the scene of snake and food
    for (let segment of snake) {
        gameGroup.remove(segment.mesh);
    }
    if (food) {
        gameGroup.remove(food.mesh);
    }
    
    // Reset arrays
    snake = [];
    
    // Hide game over screen
    gameOverScreen.style.display = 'none';
    scoreBoard.textContent = 'Score: 0';
    
    // Reinitialize snake and food
    createSnake();
    createFood();
    
    // Restart game loop
    moveTimer = setInterval(moveSnake, MOVE_INTERVAL);
}

// Handle window resize
function handleResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// Start the game when the page loads
window.onload = init; 
