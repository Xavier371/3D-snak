// Game constants
const IS_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const GRID_SIZE = 8; // Keep 8x8x8 grid
const UNIT_SIZE = IS_MOBILE ? 0.8 : 1.25; // Even smaller unit size on mobile
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
    // Create scene, camera, and renderer
    scene = new THREE.Scene();
    
    // Set up camera
    camera = new THREE.PerspectiveCamera(
        isMobile() ? 65 : 45, 
        window.innerWidth / window.innerHeight, 
        0.1, 
        1000
    );
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000);
    document.body.appendChild(renderer.domElement);
    
    // Add orbit controls for desktop
    if (!isMobile()) {
        orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
        orbitControls.enableDamping = true;
        orbitControls.dampingFactor = 0.05;
        orbitControls.screenSpacePanning = false;
        orbitControls.enableZoom = true;
        orbitControls.enablePan = false;
    } else {
        // Setup touch controls for mobile
        setupTouchControls();
        
        // Add mobile instruction overlay
        createMobileInstructions();
    }
    
    // Initialize the game
    resetGame();
    
    // Create the grid
    createGrid();
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);
    
    // Add window resize listener
    window.addEventListener('resize', onWindowResize, false);
    
    // Set up keyboard controls
    document.addEventListener('keydown', handleKeyDown);
    
    // Add score display
    createScoreDisplay();
    
    // Start the animation loop
    animate();
}

// Helper function to detect mobile devices
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
}

// Create mobile instruction overlay
function createMobileInstructions() {
    const instructionsDiv = document.createElement('div');
    instructionsDiv.id = 'mobile-instructions';
    instructionsDiv.innerHTML = `
        <div class="instruction-box">
            <h2>3D Snake</h2>
            <p>Swipe to change direction.</p>
            <p>Red = X axis, Green = Y axis, Blue = Z axis</p>
            <div class="axis-indicators">
                <span class="axis-dot x-axis">X</span>
                <span class="axis-dot y-axis">Y</span>
                <span class="axis-dot z-axis">Z</span>
            </div>
            <button id="start-game">Start Game</button>
        </div>
    `;
    document.body.appendChild(instructionsDiv);
    
    // Add styles for the instructions
    const style = document.createElement('style');
    style.textContent = `
        #mobile-instructions {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        .instruction-box {
            background-color: #222;
            border-radius: 10px;
            padding: 20px;
            max-width: 80%;
            text-align: center;
            color: white;
            box-shadow: 0 0 20px rgba(255,255,255,0.2);
        }
        .instruction-box h2 {
            margin-top: 0;
            color: #ddd;
        }
        .axis-indicators {
            display: flex;
            justify-content: space-around;
            margin: 20px 0;
        }
        .axis-dot {
            display: inline-block;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            line-height: 30px;
            font-weight: bold;
            color: white;
        }
        .x-axis { background-color: rgba(255, 0, 0, 0.8); }
        .y-axis { background-color: rgba(0, 255, 0, 0.8); }
        .z-axis { background-color: rgba(0, 136, 255, 0.8); }
        #start-game {
            background-color: #4CAF50;
            border: none;
            color: white;
            padding: 10px 20px;
            text-align: center;
            text-decoration: none;
            display: inline-block;
            font-size: 16px;
            margin: 4px 2px;
            cursor: pointer;
            border-radius: 5px;
        }
    `;
    document.head.appendChild(style);
    
    // Add start game button event
    document.getElementById('start-game').addEventListener('click', function() {
        document.getElementById('mobile-instructions').style.display = 'none';
        gameActive = true;
    });
    
    // Pause game until instructions are closed
    gameActive = false;
}

// Create score display
function createScoreDisplay() {
    const scoreDiv = document.createElement('div');
    scoreDiv.id = 'score-display';
    scoreDiv.innerHTML = `Score: 0`;
    document.body.appendChild(scoreDiv);
    
    // Add styles for the score display
    const style = document.createElement('style');
    style.textContent = `
        #score-display {
            position: fixed;
            top: 20px;
            left: 20px;
            background-color: rgba(0,0,0,0.7);
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            font-size: 18px;
            font-family: Arial, sans-serif;
            z-index: 100;
        }
    `;
    document.head.appendChild(style);
    
    // Update score function
    updateScore = function(newScore) {
        score = newScore;
        document.getElementById('score-display').innerHTML = `Score: ${score}`;
    };
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
    gameGroup.rotation.y = Math.PI * (IS_MOBILE ? 0.05 : 0.005); // ~1-9 degrees clockwise
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
    const xArrowGeo = new THREE.ConeGeometry(IS_MOBILE ? 0.4 : 0.3, IS_MOBILE ? 0.8 : 0.6, 12);
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
    const yArrowGeo = new THREE.ConeGeometry(IS_MOBILE ? 0.4 : 0.3, IS_MOBILE ? 0.8 : 0.6, 12);
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
    const zArrowGeo = new THREE.ConeGeometry(IS_MOBILE ? 0.4 : 0.3, IS_MOBILE ? 0.8 : 0.6, 12);
    const zArrowMat = new THREE.MeshBasicMaterial({ color: COLORS.zAxis });
    const zArrow = new THREE.Mesh(zArrowGeo, zArrowMat);
    zArrow.position.set(0, 0, axisLength);
    zArrow.rotation.x = Math.PI / 2;
    gameGroup.add(zArrow);
    
    // Add small text labels to indicate colors for mobile users
    if (IS_MOBILE) {
        // Add small colored spheres at the end of each axis to reinforce colors
        const sphereSize = 0.35;
        
        // X-axis indicator (Red)
        const xSphere = new THREE.Mesh(
            new THREE.SphereGeometry(sphereSize, 16, 16),
            new THREE.MeshBasicMaterial({ color: COLORS.xAxis })
        );
        xSphere.position.set(axisLength * 0.7, 0, 0);
        gameGroup.add(xSphere);
        
        // Y-axis indicator (Green)
        const ySphere = new THREE.Mesh(
            new THREE.SphereGeometry(sphereSize, 16, 16),
            new THREE.MeshBasicMaterial({ color: COLORS.yAxis })
        );
        ySphere.position.set(0, axisLength * 0.7, 0);
        gameGroup.add(ySphere);
        
        // Z-axis indicator (Blue)
        const zSphere = new THREE.Mesh(
            new THREE.SphereGeometry(sphereSize, 16, 16),
            new THREE.MeshBasicMaterial({ color: COLORS.zAxis })
        );
        zSphere.position.set(0, 0, axisLength * 0.7);
        gameGroup.add(zSphere);
    }
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

// Handle touch start
function handleTouchStart(event) {
    if (isGameOver) return;
    
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartTime = Date.now();
    
    // Prevent default to avoid scrolling
    event.preventDefault();
}

// Handle touch move (for potential future use)
function handleTouchMove(event) {
    // Prevent default to avoid scrolling
    event.preventDefault();
}

// Handle touch end
function handleTouchEnd(event) {
    if (isGameOver) return;
    
    // Prevent default action
    event.preventDefault();
    
    // Get touch end position
    const touch = event.changedTouches[0];
    const touchEndX = touch.clientX;
    const touchEndY = touch.clientY;
    const touchEndTime = Date.now();
    
    // Check if we should process this swipe (not too soon after last one)
    if (touchEndTime - lastSwipeTime < MIN_SWIPE_INTERVAL) {
        return;
    }
    
    // Calculate swipe distance and time
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const deltaTime = touchEndTime - touchStartTime;
    
    // Minimum swipe distance and maximum time for a swipe to be recognized
    // Reduced min distance to make swipes easier to register
    const minSwipeDistance = 15; // Even lower for easier swipes
    const maxSwipeTime = 500; // Longer time window for recognizing swipes
    
    // Check if the touch was quick enough to be a swipe
    if (deltaTime <= maxSwipeTime) {
        // Get normalized vector of the swipe to compare with axis directions
        const swipeLength = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (swipeLength < minSwipeDistance) return; // Too small to be a valid swipe
        
        // Normalize the 2D swipe vector
        const normalizedDeltaX = deltaX / swipeLength;
        const normalizedDeltaY = deltaY / swipeLength;
        
        // Get the camera's viewing direction to determine swipe direction in 3D
        // We need to transform screen space swipes to world space directions
        
        // Get camera's right vector (X-axis in view space)
        const cameraRight = new THREE.Vector3(1, 0, 0);
        cameraRight.applyQuaternion(camera.quaternion);
        
        // Get camera's up vector (Y-axis in view space)
        const cameraUp = new THREE.Vector3(0, 1, 0);
        cameraUp.applyQuaternion(camera.quaternion);
        
        // Get camera's forward vector (Z-axis in view space, pointing into screen)
        const cameraForward = new THREE.Vector3(0, 0, -1);
        cameraForward.applyQuaternion(camera.quaternion);
        
        // Project swipe onto the 3 world axes using dot products
        // This will tell us how much the swipe aligns with each world axis
        // First calculate component in each direction
        const rightComponent = normalizedDeltaX * cameraRight.x + normalizedDeltaY * cameraRight.y;
        const upComponent = normalizedDeltaX * cameraUp.x + normalizedDeltaY * cameraUp.y;
        const forwardComponent = normalizedDeltaX * cameraForward.x + normalizedDeltaY * cameraForward.y;
        
        // Find which component is largest (this is the primary swipe direction)
        const absRightComp = Math.abs(rightComponent);
        const absUpComp = Math.abs(upComponent);
        const absForwardComp = Math.abs(forwardComponent);
        
        let swipeProcessed = false;
        
        // Determine which world axis the swipe is most aligned with
        if (absRightComp > absUpComp && absRightComp > absForwardComp) {
            // X-axis movement (Red axis)
            if (rightComponent > 0) {
                // Right swipe - X axis positive
                swipeProcessed = queueDirectionChange({ x: 1, y: 0, z: 0 });
            } else {
                // Left swipe - X axis negative
                swipeProcessed = queueDirectionChange({ x: -1, y: 0, z: 0 });
            }
        } 
        else if (absUpComp > absRightComp && absUpComp > absForwardComp) {
            // Y-axis movement (Green axis)
            if (upComponent > 0) {
                // Up swipe - Y axis positive
                swipeProcessed = queueDirectionChange({ x: 0, y: 1, z: 0 });
            } else {
                // Down swipe - Y axis negative
                swipeProcessed = queueDirectionChange({ x: 0, y: -1, z: 0 });
            }
        } 
        else {
            // Z-axis movement (Blue axis)
            if (forwardComponent > 0) {
                // Forward swipe (into screen) - Z axis positive
                swipeProcessed = queueDirectionChange({ x: 0, y: 0, z: 1 });
            } else {
                // Backward swipe (out of screen) - Z axis negative
                swipeProcessed = queueDirectionChange({ x: 0, y: 0, z: -1 });
            }
        }
        
        // If a swipe was processed, update the last swipe time
        if (swipeProcessed) {
            lastSwipeTime = touchEndTime;
        }
    }
}

// Z-axis swipe handler - dedicated double-tap or two-finger swipe function
function handleZAxisSwipe(direction) {
    queueDirectionChange({ x: 0, y: 0, z: direction });
}

// Queue a direction change - used by both keyboard and touch
// Returns true if direction was queued, false if it was invalid
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

// Handle key presses for snake direction - improved for responsiveness
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

// Handle touch events for mobile
function setupTouchControls() {
    const touchSurface = document.getElementById('gameCanvas');
    let startX, startY, startTime;
    let endX, endY, elapsedTime;

    const swipeThreshold = 50; // Minimum distance for swipe
    const swipeRestraint = 100; // Maximum perpendicular distance
    const maxSwipeTime = 300; // Maximum time for swipe

    touchSurface.addEventListener('touchstart', function(e) {
        const touchObj = e.changedTouches[0];
        startX = touchObj.pageX;
        startY = touchObj.pageY;
        startTime = new Date().getTime();
        e.preventDefault();
    }, false);

    touchSurface.addEventListener('touchend', function(e) {
        const touchObj = e.changedTouches[0];
        endX = touchObj.pageX;
        endY = touchObj.pageY;
        endTime = new Date().getTime();
        elapsedTime = endTime - startTime;

        // Calculate distances
        const distX = endX - startX;
        const distY = endY - startY;
        const distZ = Math.sqrt(distX * distX + distY * distY);

        if (elapsedTime <= maxSwipeTime) {
            // Determine if it's a legitimate swipe
            if (Math.abs(distX) >= swipeThreshold || Math.abs(distY) >= swipeThreshold) {
                
                // Determine swipe direction
                let direction;
                if (Math.abs(distX) > Math.abs(distY)) {
                    // Horizontal swipe
                    direction = distX > 0 ? 'right' : 'left';
                } else {
                    // Vertical swipe
                    if (Math.abs(distY) > Math.abs(distX) * 2) {
                        // Clear vertical swipe - forward/backward
                        direction = distY < 0 ? 'front' : 'back';
                    } else {
                        // Regular vertical swipe - up/down
                        direction = distY < 0 ? 'up' : 'down';
                    }
                }
                
                // Show visual feedback
                showSwipeIndicator(endX, endY, direction);
                
                // Change direction
                changeDirection(direction);
            }
        }
        
        e.preventDefault();
    }, false);
}

// Show visual feedback for swipe direction
function showSwipeIndicator(x, y, direction) {
    // Create or get existing indicator
    let indicator = document.getElementById('swipe-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'swipe-indicator';
        document.body.appendChild(indicator);
        
        // Style the indicator
        indicator.style.position = 'absolute';
        indicator.style.padding = '8px 12px';
        indicator.style.borderRadius = '5px';
        indicator.style.fontSize = '16px';
        indicator.style.fontWeight = 'bold';
        indicator.style.zIndex = '1000';
        indicator.style.pointerEvents = 'none';
        indicator.style.transition = 'opacity 0.5s';
    }
    
    // Set position near swipe end position
    indicator.style.left = (x - 50) + 'px';
    indicator.style.top = (y - 30) + 'px';
    
    // Set color based on axis
    let color, text;
    switch(direction) {
        case 'left':
        case 'right':
            color = 'rgba(255, 0, 0, 0.8)'; // Red for X axis
            text = direction.charAt(0).toUpperCase() + direction.slice(1);
            break;
        case 'up':
        case 'down':
            color = 'rgba(0, 255, 0, 0.8)'; // Green for Y axis
            text = direction.charAt(0).toUpperCase() + direction.slice(1);
            break;
        case 'front':
        case 'back':
            color = 'rgba(0, 136, 255, 0.8)'; // Blue for Z axis
            text = direction === 'front' ? 'Forward' : 'Back';
            break;
    }
    
    indicator.textContent = text;
    indicator.style.backgroundColor = color;
    indicator.style.color = 'white';
    indicator.style.opacity = '1';
    
    // Hide after a delay
    setTimeout(() => {
        indicator.style.opacity = '0';
    }, 800);
    
    // Remove after fade
    setTimeout(() => {
        if (indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
        }
    }, 1300);
}

// Change snake direction based on swipe direction
function changeDirection(swipeDirection) {
    // Convert swipe direction to actual vector change
    let newDirection;
    
    switch(swipeDirection) {
        case 'right':
            newDirection = { x: 1, y: 0, z: 0 };
            break;
        case 'left':
            newDirection = { x: -1, y: 0, z: 0 };
            break;
        case 'up':
            newDirection = { x: 0, y: 1, z: 0 };
            break;
        case 'down':
            newDirection = { x: 0, y: -1, z: 0 };
            break;
        case 'front':
            newDirection = { x: 0, y: 0, z: 1 };
            break;
        case 'back':
            newDirection = { x: 0, y: 0, z: -1 };
            break;
    }
    
    // Queue the direction change
    if (newDirection) {
        queueDirectionChange(newDirection);
    }
}

// ... existing code ... 
