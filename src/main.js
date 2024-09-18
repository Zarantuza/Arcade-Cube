import * as THREE from 'three';

// Custom shader for stylized look
const customShaderMaterial = (color) => {
  return new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color(color) },
      lightDirection: { value: new THREE.Vector3(1, 1, 1).normalize() }
    },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      uniform vec3 lightDirection;
      varying vec3 vNormal;
      void main() {
        float intensity = 0.5 + 0.5 * dot(vNormal, lightDirection);
        vec3 shaded = color * intensity;
        gl_FragColor = vec4(shaded, 1.0);
      }
    `
  });
};

// Initialize Scene, Camera, and Renderer
function initScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x333333);  // Dark gray background

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 210, 200);
  camera.lookAt(0, -100, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  return { scene, camera, renderer };
}

// Set up lighting
function addLighting(scene) {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(1, 1, 1).normalize();
  scene.add(directionalLight);
}

// Create materials using custom shader
function createMaterials() {
  return {
    playerMaterial: customShaderMaterial(0x3498db),  // Blue
    collectibleMaterial: customShaderMaterial(0x2ecc71),  // Green
    obstacleMaterial: customShaderMaterial(0x8e44ad),  // Purple for falling obstacles
    hazardMaterial: customShaderMaterial(0xf1c40f),  // Yellow for hazard obstacles
    wallMaterial: customShaderMaterial(0x95a5a6),    // Light gray for the boundary wall
    floorMaterial: new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.8 }) // Dark gray for floor
  };
}

// Create floor with grid
function createFloor(scene, mazeSize) {
  const floorGeometry = new THREE.PlaneGeometry(mazeSize * 2, mazeSize * 2);
  const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.8 });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  // Create grid
  const gridSize = mazeSize * 2;
  const divisions = gridSize / 10;
  const gridHelper = new THREE.GridHelper(gridSize, divisions, 0x444444, 0x444444);
  gridHelper.position.y = 0.1; // Slightly above the floor to prevent z-fighting
  scene.add(gridHelper);
}

// Create player cube
function createPlayer(scene, material) {
  const cubeSize = 10;
  const playerGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
  const player = new THREE.Mesh(playerGeometry, material);
  player.position.set(0, cubeSize / 2, 0);  // Ensure the player is on the ground
  scene.add(player);
  return player;
}

// Create boundary walls
function createBoundary(scene, wallMaterial) {
  const mazeSize = 200;
  const wallThickness = 5;
  const wallHeight = 15;
  const wallGeometry = new THREE.BoxGeometry(mazeSize * 2, wallHeight, wallThickness);
  const wallMaterialWithTransparency = wallMaterial.clone();
  wallMaterialWithTransparency.transparent = true;
  wallMaterialWithTransparency.opacity = 0.5;

  const walls = [];

  const createWall = (x, y, z, rotationY = 0) => {
    const wall = new THREE.Mesh(wallGeometry, wallMaterialWithTransparency);
    wall.position.set(x, y, z);
    wall.rotation.y = rotationY;
    scene.add(wall);
    walls.push(wall);
  };

  // Create four walls
  createWall(0, wallHeight / 2, mazeSize);
  createWall(0, wallHeight / 2, -mazeSize);
  createWall(mazeSize, wallHeight / 2, 0, Math.PI / 2);
  createWall(-mazeSize, wallHeight / 2, 0, Math.PI / 2);

  return walls;
}

// Create collectible cube
function createCollectible(scene, material) {
  const cubeSize = 10;
  const collectible = new THREE.Mesh(new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize), material);
  collectible.position.y = cubeSize / 2;  // Ensure the collectible is on the ground
  scene.add(collectible);
  return collectible;
}

// Create obstacle cube
function createObstacle(scene, material, isHazard = false) {
  const cubeSize = 10;
  const obstacle = new THREE.Mesh(new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize), material);
  obstacle.position.y = isHazard ? cubeSize / 2 : 1000; // Hazards start on the ground, others high in the air
  obstacle.isHazard = isHazard;
  scene.add(obstacle);
  return obstacle;
}

// Animate obstacle landing and rotating


// Easing function for a bouncy effect
function easeOutBounce(t) {
  const n1 = 7.5625;
  const d1 = 2.75;

  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
}
// Player movement control
function setupControls() {
  const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    w: false,
    a: false,
    s: false,
    d: false,
    z: false,
    q: false,
  };

  document.addEventListener('keydown', (e) => {
    if (keys[e.key.toLowerCase()] !== undefined) keys[e.key.toLowerCase()] = true;
  });

  document.addEventListener('keyup', (e) => {
    if (keys[e.key.toLowerCase()] !== undefined) keys[e.key.toLowerCase()] = false;
  });

  return keys;
}

// Update player movement
function updateMovement(player, keys, moveSpeed = 2, mazeSize = 200, walls) {
  const velocity = new THREE.Vector3(0, 0, 0);

  // Arrow keys
  if (keys.ArrowUp) velocity.z -= moveSpeed;
  if (keys.ArrowDown) velocity.z += moveSpeed;
  if (keys.ArrowLeft) velocity.x -= moveSpeed;
  if (keys.ArrowRight) velocity.x += moveSpeed;

  // WASD keys
  if (keys.w) velocity.z -= moveSpeed;
  if (keys.s) velocity.z += moveSpeed;
  if (keys.a) velocity.x -= moveSpeed;
  if (keys.d) velocity.x += moveSpeed;

  // ZQSD keys (for AZERTY keyboards)
  if (keys.z) velocity.z -= moveSpeed;
  if (keys.s) velocity.z += moveSpeed;
  if (keys.q) velocity.x -= moveSpeed;
  if (keys.d) velocity.x += moveSpeed;

  const newPosition = player.position.clone().add(velocity);

  // Check collision with walls
  const playerBox = new THREE.Box3().setFromObject(player);
  playerBox.min.add(velocity);
  playerBox.max.add(velocity);

  let collision = false;
  for (const wall of walls) {
    const wallBox = new THREE.Box3().setFromObject(wall);
    if (playerBox.intersectsBox(wallBox)) {
      collision = true;
      break;
    }
  }

  if (!collision) {
    player.position.copy(newPosition);
  }

  return velocity;
}

// Check collision between two objects
function checkCollision(obj1, obj2) {
  const box1 = new THREE.Box3().setFromObject(obj1);
  const box2 = new THREE.Box3().setFromObject(obj2);
  
  // Expand the boxes slightly to account for any floating-point imprecision
  box1.min.y -= 0.1;
  box1.max.y += 0.1;
  box2.min.y -= 0.1;
  box2.max.y += 0.1;
  
  return box1.intersectsBox(box2);
}

// Check if a position is valid (not occupied by an obstacle)
function isValidPosition(position, obstacles, player, collectible, mazeSize) {
  // Check if position is within maze boundaries
  if (Math.abs(position.x) >= mazeSize || Math.abs(position.z) >= mazeSize) {
    return false;
  }

  // Check if position overlaps with any obstacle
  const tempBox = new THREE.Box3().setFromCenterAndSize(position, new THREE.Vector3(10, 10, 10));
  for (let obstacle of obstacles) {
    const obstacleBox = new THREE.Box3().setFromObject(obstacle);
    if (tempBox.intersectsBox(obstacleBox)) {
      return false;
    }
  }

  // Check if position overlaps with player or collectible
  const playerBox = new THREE.Box3().setFromObject(player);
  const collectibleBox = new THREE.Box3().setFromObject(collectible);
  if (tempBox.intersectsBox(playerBox) || tempBox.intersectsBox(collectibleBox)) {
    return false;
  }

  return true;
}

// Reposition object within maze boundaries
function repositionObject(object, mazeSize = 200) {
  const cubeSize = 10;
  const halfCubeSize = cubeSize / 2;
  const effectiveMazeSize = mazeSize - halfCubeSize;

  object.position.set(
    Math.floor(Math.random() * (effectiveMazeSize * 2) - effectiveMazeSize) / 10 * 10,
    cubeSize / 2,  // Ensure the object is on the ground
    Math.floor(Math.random() * (effectiveMazeSize * 2) - effectiveMazeSize) / 10 * 10
  );

  // Ensure the object is fully within the maze
  object.position.x = Math.max(Math.min(object.position.x, mazeSize - halfCubeSize), -mazeSize + halfCubeSize);
  object.position.z = Math.max(Math.min(object.position.z, mazeSize - halfCubeSize), -mazeSize + halfCubeSize);
}

// Find a valid position for the new obstacle
function findValidObstaclePosition(player, collectible, obstacles, mazeSize) {
  const maxAttempts = 100;
  const cubeSize = 10;
  const halfCubeSize = cubeSize / 2;
  const effectiveMazeSize = mazeSize - halfCubeSize;

  for (let i = 0; i < maxAttempts; i++) {
    const position = new THREE.Vector3(
      Math.floor(Math.random() * (effectiveMazeSize * 2) - effectiveMazeSize) / 10 * 10,
      cubeSize / 2,
      Math.floor(Math.random() * (effectiveMazeSize * 2) - effectiveMazeSize) / 10 * 10
    );

    // Ensure the position is fully within the maze
    position.x = Math.max(Math.min(position.x, mazeSize - halfCubeSize), -mazeSize + halfCubeSize);
    position.z = Math.max(Math.min(position.z, mazeSize - halfCubeSize), -mazeSize + halfCubeSize);

    if (isValidPosition(position, obstacles, player, collectible, mazeSize)) {
      return position;
    }
  }
  return null; // Couldn't find a valid position
}

// Create UI
function createUI() {
  const ui = document.createElement('div');
  ui.style.position = 'absolute';
  ui.style.top = '10px';
  ui.style.left = '10px';
  ui.style.color = 'white';
  ui.style.fontFamily = 'Arial, sans-serif';
  ui.style.fontSize = '20px';
  document.body.appendChild(ui);

  // Add controls information
  const controlsInfo = document.createElement('div');
  controlsInfo.style.position = 'absolute';
  controlsInfo.style.bottom = '10px';
  controlsInfo.style.left = '10px';
  controlsInfo.style.color = 'white';
  controlsInfo.style.fontFamily = 'Arial, sans-serif';
  controlsInfo.style.fontSize = '16px';
  controlsInfo.innerHTML = 'Controls: Arrow keys, WASD, or ZQSD';
  document.body.appendChild(controlsInfo);

  return ui;
}

// Update UI
function updateUI(ui, score, timeRemaining, lives, obstacleCount) {
  ui.innerHTML = `Score: ${score} | Time: ${timeRemaining.toFixed(1)} | Lives: ${lives} | Obstacles: ${obstacleCount}`;
}

// Main update loop
function update(player, keys, collectible, obstacles, gameState, difficulty, scene, obstacleMaterial, hazardMaterial, walls, mazeSize) {
  const cubeSize = 10;
  updateMovement(player, keys, 2 + difficulty * 0.5, mazeSize, walls);
  player.position.y = cubeSize / 2;  // Ensure the player stays on the ground
  
  // Check collision with collectible
  if (checkCollision(player, collectible)) {
    gameState.score++;
    const oldPosition = collectible.position.clone();
    gameState.timeRemaining += Math.max(5 - difficulty * 0.5, 1);
    difficulty++;

    // Create a new falling obstacle at the old collectible position
    const newObstacle = createObstacle(scene, obstacleMaterial);
    newObstacle.position.copy(oldPosition);
    newObstacle.position.y = 1000; // Start high in the air
    obstacles.push(newObstacle);

    // Animate the obstacle landing and rotating
    animateObstacleLanding(newObstacle, cubeSize / 2);

    // Reposition the collectible after creating the obstacle
    repositionObject(collectible, mazeSize);

    // Spawn new hazard obstacle
    if (Math.random() < 0.5) { // 50% chance to spawn a hazard
      const hazardPosition = findValidObstaclePosition(player, collectible, obstacles, mazeSize);
      if (hazardPosition) {
        const hazardObstacle = createObstacle(scene, hazardMaterial, true);
        hazardObstacle.position.copy(hazardPosition);
        obstacles.push(hazardObstacle);
      }
    }
  }

  // Check collision with obstacles
  for (let obstacle of obstacles) {
    if (checkCollision(player, obstacle)) {
      if (obstacle.isHazard) {
        gameState.lives--;
        if (gameState.lives <= 0) {
          return false; // Game over
        }
        // Remove the hazard obstacle
        scene.remove(obstacle);
        obstacles.splice(obstacles.indexOf(obstacle), 1);
      } else {
        // Push the player away from the obstacle
        const pushDirection = player.position.clone().sub(obstacle.position).normalize();
        player.position.add(pushDirection.multiplyScalar(2));
      }
    }
  }

  gameState.timeRemaining -= 1 / 60; // Assuming 60 FPS

  return gameState.timeRemaining > 0 && gameState.lives > 0;
}

// Modify the animateObstacleLanding function to ensure it completes
function animateObstacleLanding(obstacle, targetY, duration = 1000) {
  const startY = obstacle.position.y;
  const startTime = Date.now();
  const rotationSpeed = Math.random() * 0.1 + 0.05; // Random rotation speed

  function animate() {
    const now = Date.now();
    const progress = (now - startTime) / duration;

    if (progress < 1) {
      obstacle.position.y = startY + (targetY - startY) * easeOutBounce(progress);
      obstacle.rotation.x += rotationSpeed;
      obstacle.rotation.y += rotationSpeed;
      obstacle.rotation.z += rotationSpeed;
      requestAnimationFrame(animate);
    } else {
      obstacle.position.y = targetY;
      obstacle.rotation.set(0, 0, 0);  // Reset rotation when landing is complete
    }
  }

  animate();
}

// Main render loop
function animate(renderer, scene, camera, player, keys, collectible, obstacles, ui, gameState, difficulty, obstacleMaterial, hazardMaterial) {
  if (update(player, keys, collectible, obstacles, gameState, difficulty, scene, obstacleMaterial, hazardMaterial)) {
    requestAnimationFrame(() => animate(renderer, scene, camera, player, keys, collectible, obstacles, ui, gameState, difficulty, obstacleMaterial, hazardMaterial));
    updateUI(ui, gameState.score, gameState.timeRemaining, gameState.lives, obstacles.length);
    renderer.render(scene, camera);
  } else {
    alert(`Game Over! Your score: ${gameState.score}`);
  }
}

// Window resize handler
function onWindowResize(camera, renderer) {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Main initialization
function init() {
  const mazeSize = 200;
  const { scene, camera, renderer } = initScene();
  addLighting(scene);
  const { playerMaterial, collectibleMaterial, obstacleMaterial, hazardMaterial, wallMaterial } = createMaterials();
  createFloor(scene, mazeSize);
  const player = createPlayer(scene, playerMaterial);
  const walls = createBoundary(scene, wallMaterial);
  const collectible = createCollectible(scene, collectibleMaterial);
  repositionObject(collectible, mazeSize);
  const keys = setupControls();
  const ui = createUI();

  const gameState = {
    score: 0,
    timeRemaining: 30,
    lives: 3
  };

  let difficulty = 0;

  // No initial obstacles
  const obstacles = [];

  window.addEventListener('resize', () => onWindowResize(camera, renderer));

  function gameLoop() {
    if (update(player, keys, collectible, obstacles, gameState, difficulty, scene, obstacleMaterial, hazardMaterial, walls, mazeSize)) {
      requestAnimationFrame(gameLoop);
      updateUI(ui, gameState.score, gameState.timeRemaining, gameState.lives, obstacles.length);
      renderer.render(scene, camera);
    } else {
      alert(`Game Over! Your score: ${gameState.score}`);
    }
  }

  gameLoop();
}

// Start the game
init();