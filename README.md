# 3D Snake Game

A 3D version of the classic Snake game built with Three.js.

## How to Play

1. Open `index.html` in a web browser to start the game.
2. The 3D space uses a simple coordinate system with these controls:
   - Red X-axis: Left/Right arrow keys move horizontally
   - Green Y-axis: W/S keys move vertically
   - Blue Z-axis: Up/Down arrow keys control depth movement
3. Colored arrows show the positive direction along each axis
4. The grid and axes are aligned perfectly for better visual understanding
5. Eat the red food to grow and increase your score
6. Avoid hitting the walls or yourself
7. Press Enter to restart the game when game over

## Controls

- **Left Arrow**: Move left along the red X-axis (negative X direction)
- **Right Arrow**: Move right along the red X-axis (positive X direction)
- **W Key**: Move up along the green Y-axis (positive Y direction)
- **S Key**: Move down along the green Y-axis (negative Y direction)
- **Up Arrow**: Move forward along the blue Z-axis (negative Z direction)
- **Down Arrow**: Move backward along the blue Z-axis (positive Z direction)
- **Enter Key**: Restart the game after game over

## Features

- Compact 3D grid with colored axis vectors properly aligned at the corner
- Clean gray floor grid for easy orientation
- All game elements (grid, snake, food) organized in a unified coordinate system
- Color-coded axis vectors for intuitive movement:
  - Red X-axis: Left/Right arrows
  - Green Y-axis: W/S keys (green points up as requested)
  - Blue Z-axis: Up/Down arrows
- Score tracking
- Game over screen with restart button

## Setup

No build process is required. Simply open `index.html` in a modern web browser to play the game.

## Technologies Used

- HTML5
- CSS3
- JavaScript
- Three.js for 3D rendering

Enjoy the game! 