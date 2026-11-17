// Solaria City - Procedural 3D Modern Coastal City Generator

import { CONFIG } from './config.js';

export class City {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];     // { minX, maxX, minZ, maxZ, height, type }
    this.roads = [];         // List of road segments { x1, z1, x2, z2, dir, lanes }
    this.intersections = []; // Intersections for traffic routing
    this.palmTrees = [];
    this.streetLights = [];
    this.trafficLights = [];
    this.props = [];
    this.buildings = [];
    this.waterMesh = null;
    this.waterTime = 0;

    // Common materials for performance & style
    this.initMaterials();
    this.buildWorld();
  }

  initMaterials() {
    const THREE = window.THREE;
    this.matAsphalt = new THREE.MeshLambertMaterial({ color: 0x212529 });
    this.matSidewalk = new THREE.MeshLambertMaterial({ color: 0xbcc3c9 });
    this.matGrass = new THREE.MeshLambertMaterial({ color: 0x3b8536 });
    this.matSand = new THREE.MeshLambertMaterial({ color: 0xe0c58a });
    this.matWater = new THREE.MeshStandardMaterial({
      color: 0x0984e3,
      roughness: 0.1,
      metalness: 0.4,
      transparent: true,
      opacity: 0.88,
    });
    this.matWood = new THREE.MeshLambertMaterial({ color: 0x7a4b24 });
    this.matRoadLineWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.matRoadLineYellow = new THREE.MeshBasicMaterial({ color: 0xffb703 });

    // Building materials - Miami / Solaria Coastal Art-Deco & Modern palette
    this.buildingMaterials = [
      new THREE.MeshLambertMaterial({ color: 0x1e3799 }), // Glass Blue
      new THREE.MeshLambertMaterial({ color: 0xff6b81 }), // Pastel Coral
      new THREE.MeshLambertMaterial({ color: 0x2f3542 }), // Sleek Graphite
      new THREE.MeshLambertMaterial({ color: 0x00d2d3 }), // Cyan Modern
      new THREE.MeshLambertMaterial({ color: 0xffa502 }), // Warm Ochre
      new THREE.MeshLambertMaterial({ color: 0xf1f2f6 }), // Pure Ivory
      new THREE.MeshLambertMaterial({ color: 0x7bed9f }), // Mint Coastal
    ];

    this.matWindowLit = new THREE.MeshBasicMaterial({ color: 0xfffa65 });
    this.matWindowDark = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.2, metalness: 0.8 });
    this.matNeonPink = new THREE.MeshBasicMaterial({ color: 0xff3f80 });
    this.matNeonCyan = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
  }

  buildWorld() {
    this.buildTerrainAndOcean();
    this.buildRoadNetwork();
    this.buildDistrictsAndBuildings();
    this.buildMarinaAndBeach();
    this.buildFoliageAndStreetFurniture();
  }

  buildTerrainAndOcean() {
    const THREE = window.THREE;
    // Main terrain base
    const groundGeom = new THREE.PlaneGeometry(600, 600);
    const groundMesh = new THREE.Mesh(groundGeom, this.matGrass);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.05;
    groundMesh.receiveShadow = true;
    this.scene.add(groundMesh);

    // Ocean plane on east and south
    const oceanGeom = new THREE.PlaneGeometry(700, 700, 32, 32);
    this.waterMesh = new THREE.Mesh(oceanGeom, this.matWater);
    this.waterMesh.rotation.x = -Math.PI / 2;
    this.waterMesh.position.set(160, -0.6, -140);
    this.scene.add(this.waterMesh);

    // Beach Sand Strip on the East
    const beachGeom = new THREE.PlaneGeometry(120, 480);
    const beachMesh = new THREE.Mesh(beachGeom, this.matSand);
    beachMesh.rotation.x = -Math.PI / 2;
    beachMesh.position.set(220, 0.02, 0);
    beachMesh.receiveShadow = true;
    this.scene.add(beachMesh);

    // Water collider / invisible boundary
    this.colliders.push({ minX: 280, maxX: 450, minZ: -350, maxZ: 350, height: 10, type: 'water' });
    this.colliders.push({ minX: -300, maxX: 300, minZ: -320, maxZ: -210, height: 10, type: 'water' });
  }

  buildRoadNetwork() {
    const THREE = window.THREE;
    const { BLOCK_SIZE, GRID_COLS, GRID_ROWS, ROAD_WIDTH } = CONFIG.CITY;
    const halfWidth = (GRID_COLS * BLOCK_SIZE) / 2;
    const halfHeight = (GRID_ROWS * BLOCK_SIZE) / 2;

    // Grid streets (North-South & East-West)
    const xCoords = [];
    const zCoords = [];

    for (let c = 0; c <= GRID_COLS; c++) {
      xCoords.push(-halfWidth + c * BLOCK_SIZE);
    }
    for (let r = 0; r <= GRID_ROWS; r++) {
      zCoords.push(-halfHeight + r * BLOCK_SIZE);
    }

    // North-South Roads
    xCoords.forEach((x, colIdx) => {
      const roadLength = GRID_ROWS * BLOCK_SIZE + ROAD_WIDTH;
      const roadGeom = new THREE.PlaneGeometry(ROAD_WIDTH, roadLength);
      const roadMesh = new THREE.Mesh(roadGeom, this.matAsphalt);
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.position.set(x, 0.01, 0);
      roadMesh.receiveShadow = true;
      this.scene.add(roadMesh);

      // Lane markings
      this.addRoadMarkings(x, 0, ROAD_WIDTH, roadLength, true);

      this.roads.push({
        axis: 'z',
        x: x,
        zStart: -halfHeight - ROAD_WIDTH / 2,
        zEnd: halfHeight + ROAD_WIDTH / 2,
        width: ROAD_WIDTH,
        isOceanDrive: colIdx === GRID_COLS,
      });
    });

    // East-West Roads
    zCoords.forEach((z) => {
      const roadLength = GRID_COLS * BLOCK_SIZE + ROAD_WIDTH;
      const roadGeom = new THREE.PlaneGeometry(roadLength, ROAD_WIDTH);
      const roadMesh = new THREE.Mesh(roadGeom, this.matAsphalt);
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.position.set(0, 0.015, z);
      roadMesh.receiveShadow = true;
      this.scene.add(roadMesh);

      // Lane markings
      this.addRoadMarkings(0, z, roadLength, ROAD_WIDTH, false);

      this.roads.push({
        axis: 'x',
        z: z,
        xStart: -halfWidth - ROAD_WIDTH / 2,
        xEnd: halfWidth + ROAD_WIDTH / 2,
        width: ROAD_WIDTH,
      });
    });

    // Register intersections for traffic
    xCoords.forEach((x) => {
      zCoords.forEach((z) => {
        this.intersections.push({ x, z, radius: ROAD_WIDTH * 0.75 });
      });
    });
  }

  addRoadMarkings(cx, cz, width, length, isVertical) {
    const THREE = window.THREE;
    const group = new THREE.Group();

    if (isVertical) {
      // Double yellow center line
      const yellowGeom = new THREE.PlaneGeometry(0.35, length);
      const y1 = new THREE.Mesh(yellowGeom, this.matRoadLineYellow);
      y1.rotation.x = -Math.PI / 2;
      y1.position.set(cx - 0.25, 0.03, cz);
      const y2 = new THREE.Mesh(yellowGeom, this.matRoadLineYellow);
      y2.rotation.x = -Math.PI / 2;
      y2.position.set(cx + 0.25, 0.03, cz);
      group.add(y1, y2);

      // White dashed outer lane lines
      const dashLength = 3.5;
      const dashGap = 3.5;
      const count = Math.floor(length / (dashLength + dashGap));
      for (let i = -count / 2; i < count / 2; i++) {
        const dGeom = new THREE.PlaneGeometry(0.25, dashLength);
        const d1 = new THREE.Mesh(dGeom, this.matRoadLineWhite);
        d1.rotation.x = -Math.PI / 2;
        d1.position.set(cx - width * 0.25, 0.03, cz + i * (dashLength + dashGap));
        const d2 = new THREE.Mesh(dGeom, this.matRoadLineWhite);
        d2.rotation.x = -Math.PI / 2;
        d2.position.set(cx + width * 0.25, 0.03, cz + i * (dashLength + dashGap));
        group.add(d1, d2);
      }
    } else {
      // Horizontal road markings
      const yellowGeom = new THREE.PlaneGeometry(width, 0.35);
      const y1 = new THREE.Mesh(yellowGeom, this.matRoadLineYellow);
      y1.rotation.x = -Math.PI / 2;
      y1.position.set(cx, 0.03, cz - 0.25);
      const y2 = new THREE.Mesh(yellowGeom, this.matRoadLineYellow);
      y2.rotation.x = -Math.PI / 2;
      y2.position.set(cx, 0.03, cz + 0.25);
      group.add(y1, y2);
    }
    this.scene.add(group);
  }

  buildDistrictsAndBuildings() {
    const THREE = window.THREE;
    const { BLOCK_SIZE, GRID_COLS, GRID_ROWS, ROAD_WIDTH, SIDEWALK_WIDTH } = CONFIG.CITY;
    const halfWidth = (GRID_COLS * BLOCK_SIZE) / 2;
    const halfHeight = (GRID_ROWS * BLOCK_SIZE) / 2;

    for (let c = 0; c < GRID_COLS; c++) {
      for (let r = 0; r < GRID_ROWS; r++) {
        const blockCenterX = -halfWidth + c * BLOCK_SIZE + BLOCK_SIZE / 2;
        const blockCenterZ = -halfHeight + r * BLOCK_SIZE + BLOCK_SIZE / 2;
        const blockInnerSize = BLOCK_SIZE - ROAD_WIDTH;

        // Sidewalk base for the block
        const swGeom = new THREE.BoxGeometry(blockInnerSize, 0.35, blockInnerSize);
        const swMesh = new THREE.Mesh(swGeom, this.matSidewalk);
        swMesh.position.set(blockCenterX, 0.17, blockCenterZ);
        swMesh.receiveShadow = true;
        this.scene.add(swMesh);

        // Determine District style
        const isEastCoast = c >= GRID_COLS - 2;
        const isDowntown = c < GRID_COLS - 2 && r < GRID_ROWS - 1;
        const isMarinaSide = r === 0;

        // Populate block with buildings
        this.populateBlock(blockCenterX, blockCenterZ, blockInnerSize - SIDEWALK_WIDTH * 2, {
          isEastCoast,
          isDowntown,
          isMarinaSide,
          blockX: c,
          blockZ: r,
        });
      }
    }
  }

  populateBlock(bx, bz, usableSize, flags) {
    const THREE = window.THREE;
    // 2x2 or 1x1 buildings per block
    const subCount = flags.isDowntown && Math.random() > 0.4 ? 1 : 2;
    const subSize = usableSize / subCount;

    for (let sx = 0; sx < subCount; sx++) {
      for (let sz = 0; sz < subCount; sz++) {
        const posX = bx - usableSize / 2 + subSize / 2 + sx * subSize;
        const posZ = bz - usableSize / 2 + subSize / 2 + sz * subSize;
        const bWidth = subSize * (0.78 + Math.random() * 0.18);
        const bDepth = subSize * (0.78 + Math.random() * 0.18);

        let height = 22 + Math.random() * 25;
        let matIndex = Math.floor(Math.random() * this.buildingMaterials.length);

        if (flags.isDowntown) {
          height = subCount === 1 ? 65 + Math.random() * 45 : 40 + Math.random() * 35;
          matIndex = Math.random() > 0.5 ? 0 : 3; // Glass towers
        } else if (flags.isEastCoast) {
          height = 14 + Math.random() * 22; // Art Deco beachfront hotels
          matIndex = Math.random() > 0.5 ? 1 : 4; // Pastel coral/terracotta
        } else if (flags.isMarinaSide) {
          height = 12 + Math.random() * 18;
          matIndex = 6; // Mint coastal villas
        }

        this.createBuilding(posX, posZ, bWidth, bDepth, height, this.buildingMaterials[matIndex], flags);
      }
    }
  }

  createBuilding(x, z, width, depth, height, material, flags) {
    const THREE = window.THREE;
    const buildingGroup = new THREE.Group();

    // Main tower
    const geom = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geom, material);
    mesh.position.set(0, height / 2, 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    buildingGroup.add(mesh);

    // Add rooftop structures (AC units, helipads, neon signs)
    if (height > 40) {
      // Rooftop helipad or top tier
      const topGeom = new THREE.BoxGeometry(width * 0.6, 3, depth * 0.6);
      const topMesh = new THREE.Mesh(topGeom, this.matSidewalk);
      topMesh.position.set(0, height + 1.5, 0);
      buildingGroup.add(topMesh);

      // Helipad H ring
      const hGeom = new THREE.RingGeometry(2, 4, 16);
      const hMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, side: THREE.DoubleSide });
      const hMesh = new THREE.Mesh(hGeom, hMat);
      hMesh.rotation.x = -Math.PI / 2;
      hMesh.position.set(0, height + 3.05, 0);
      buildingGroup.add(hMesh);
    }

    // Windows facade details
    const rows = Math.floor(height / 4);
    const cols = Math.floor(width / 3.5);
    const winGeom = new THREE.PlaneGeometry(1.6, 2.2);

    for (let r = 1; r < rows - 1; r += 2) {
      for (let c = -cols / 2 + 0.5; c < cols / 2; c += 1.5) {
        const isLit = Math.random() > 0.4;
        const wMat = isLit ? this.matWindowLit : this.matWindowDark;
        const wMesh = new THREE.Mesh(winGeom, wMat);
        wMesh.position.set(c * 2.8, r * 4, depth / 2 + 0.05);
        buildingGroup.add(wMesh);
      }
    }

    // Neon Signs on Ocean Drive & Downtown
    if (flags.isEastCoast && height < 30 && Math.random() > 0.4) {
      const signMesh = this.createNeonSign('HOTEL PALMA');
      signMesh.position.set(0, height - 2, depth / 2 + 0.6);
      buildingGroup.add(signMesh);
    } else if (flags.isDowntown && height > 60 && Math.random() > 0.5) {
      const signMesh = this.createNeonSign('SOLARIA TOWER');
      signMesh.position.set(0, height - 3, depth / 2 + 0.6);
      buildingGroup.add(signMesh);
    }

    buildingGroup.position.set(x, 0, z);
    this.scene.add(buildingGroup);

    // Register collider
    this.colliders.push({
      minX: x - width / 2 - 0.5,
      maxX: x + width / 2 + 0.5,
      minZ: z - depth / 2 - 0.5,
      maxZ: z + depth / 2 + 0.5,
      height: height,
      type: 'building',
    });

    this.buildings.push({ x, z, width, depth, height });
  }

  createNeonSign(text) {
    const THREE = window.THREE;
    const signGroup = new THREE.Group();
    const bgGeom = new THREE.BoxGeometry(14, 2.6, 0.4);
    const bgMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const bgMesh = new THREE.Mesh(bgGeom, bgMat);
    signGroup.add(bgMesh);

    // Stylized glowing letter blocks
    const neonBar = new THREE.Mesh(
      new THREE.BoxGeometry(13, 0.4, 0.6),
      text.includes('PALMA') ? this.matNeonPink : this.matNeonCyan
    );
    neonBar.position.y = 0.9;
    signGroup.add(neonBar);

    const neonBarBot = new THREE.Mesh(
      new THREE.BoxGeometry(13, 0.4, 0.6),
      text.includes('PALMA') ? this.matNeonPink : this.matNeonCyan
    );
    neonBarBot.position.y = -0.9;
    signGroup.add(neonBarBot);

    return signGroup;
  }

  buildMarinaAndBeach() {
    const THREE = window.THREE;
    // Wooden Boardwalk along beach (x = 165)
    const bwGeom = new THREE.BoxGeometry(12, 0.6, 380);
    const bwMesh = new THREE.Mesh(bwGeom, this.matWood);
    bwMesh.position.set(168, 0.3, 0);
    bwMesh.receiveShadow = true;
    this.scene.add(bwMesh);

    // Pier extending into ocean
    const pierGeom = new THREE.BoxGeometry(14, 0.8, 110);
    const pierMesh = new THREE.Mesh(pierGeom, this.matWood);
    pierMesh.position.set(230, 0.4, -60);
    pierMesh.receiveShadow = true;
    this.scene.add(pierMesh);

    // Marina Docks on South Side (z = -170)
    for (let d = 0; d < 3; d++) {
      const dockGeom = new THREE.BoxGeometry(8, 0.6, 60);
      const dockMesh = new THREE.Mesh(dockGeom, this.matWood);
      dockMesh.position.set(-60 + d * 50, 0.3, -170);
      dockMesh.receiveShadow = true;
      this.scene.add(dockMesh);

      // Moored luxury yachts at each dock
      this.createYacht(-50 + d * 50, 0.1, -175, Math.PI / 2);
    }
  }

  createYacht(x, y, z, rotation) {
    const THREE = window.THREE;
    const yachtGroup = new THREE.Group();
    // Hull
    const hullMat = new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.2, metalness: 0.3 });
    const hullGeom = new THREE.BoxGeometry(6, 2.5, 18);
    const hullMesh = new THREE.Mesh(hullGeom, hullMat);
    hullMesh.position.y = 1.25;
    yachtGroup.add(hullMesh);

    // Cabin / Bridge
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x222f3e, roughness: 0.1, metalness: 0.7 });
    const cabinGeom = new THREE.BoxGeometry(4.5, 2.2, 9);
    const cabinMesh = new THREE.Mesh(cabinGeom, cabinMat);
    cabinMesh.position.set(0, 3.2, -1);
    yachtGroup.add(cabinMesh);

    // Radar arch
    const archMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const archGeom = new THREE.BoxGeometry(4.8, 1.2, 0.6);
    const archMesh = new THREE.Mesh(archGeom, archMat);
    archMesh.position.set(0, 4.8, -3);
    yachtGroup.add(archMesh);

    yachtGroup.position.set(x, y, z);
    yachtGroup.rotation.y = rotation;
    this.scene.add(yachtGroup);

    // Yacht collider
    this.colliders.push({ minX: x - 4, maxX: x + 4, minZ: z - 10, maxZ: z + 10, height: 6, type: 'yacht' });
  }

  buildFoliageAndStreetFurniture() {
    const THREE = window.THREE;
    const { BLOCK_SIZE, GRID_COLS, GRID_ROWS } = CONFIG.CITY;
    const halfWidth = (GRID_COLS * BLOCK_SIZE) / 2;
    const halfHeight = (GRID_ROWS * BLOCK_SIZE) / 2;

    // Palm trees along Ocean Drive (East avenue) and Marina Boulevard
    for (let z = -halfHeight + 10; z < halfHeight; z += 18) {
      this.createPalmTree(halfWidth - 6, 0.3, z);
      this.createPalmTree(halfWidth + 6, 0.3, z + 9);
    }

    // Streetlights at road intersections
    this.intersections.forEach((inter) => {
      this.createStreetLight(inter.x - 7, inter.z - 7);
      this.createStreetLight(inter.x + 7, inter.z + 7);
      this.createTrafficLight(inter.x + 6, inter.z - 6);
    });

    // Parked props: benches & hydrants
    for (let i = 0; i < 20; i++) {
      const rx = (Math.random() - 0.5) * (GRID_COLS * BLOCK_SIZE - 20);
      const rz = (Math.random() - 0.5) * (GRID_ROWS * BLOCK_SIZE - 20);
      this.createFireHydrant(rx, rz);
    }
  }

  createPalmTree(x, y, z) {
    const THREE = window.THREE;
    const palmGroup = new THREE.Group();

    // Trunk with slight natural curve
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x795548, roughness: 0.9 });
    const trunkGeom = new THREE.CylinderGeometry(0.35, 0.55, 9, 7);
    const trunkMesh = new THREE.Mesh(trunkGeom, trunkMat);
    trunkMesh.position.y = 4.5;
    trunkMesh.rotation.z = (Math.random() - 0.5) * 0.14;
    palmGroup.add(trunkMesh);

    // Palm fronds
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.6, side: THREE.DoubleSide });
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2;
      const leafGeom = new THREE.PlaneGeometry(1.6, 4.8);
      const leafMesh = new THREE.Mesh(leafGeom, leafMat);
      leafMesh.position.set(Math.cos(angle) * 1.5, 9.2, Math.sin(angle) * 1.5);
      leafMesh.rotation.x = Math.PI / 3;
      leafMesh.rotation.y = angle;
      palmGroup.add(leafMesh);
    }

    palmGroup.position.set(x, y, z);
    this.scene.add(palmGroup);
    this.palmTrees.push(palmGroup);
    this.colliders.push({ minX: x - 0.6, maxX: x + 0.6, minZ: z - 0.6, maxZ: z + 0.6, height: 10, type: 'tree' });
  }

  createStreetLight(x, z) {
    const THREE = window.THREE;
    const lightGroup = new THREE.Group();
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x47535e, metalness: 0.8, roughness: 0.3 });
    const poleGeom = new THREE.CylinderGeometry(0.12, 0.16, 7.5);
    const pole = new THREE.Mesh(poleGeom, poleMat);
    pole.position.y = 3.75;
    lightGroup.add(pole);

    // Arm and bulb
    const armGeom = new THREE.BoxGeometry(1.4, 0.12, 0.12);
    const arm = new THREE.Mesh(armGeom, poleMat);
    arm.position.set(0.6, 7.4, 0);
    lightGroup.add(arm);

    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfffae6 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), bulbMat);
    bulb.position.set(1.2, 7.2, 0);
    lightGroup.add(bulb);

    lightGroup.position.set(x, 0, z);
    this.scene.add(lightGroup);
    this.streetLights.push(lightGroup);
  }

  createTrafficLight(x, z) {
    const THREE = window.THREE;
    const group = new THREE.Group();
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x2d3436 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 6.5), poleMat);
    pole.position.y = 3.25;
    group.add(pole);

    const box = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.8, 0.6), poleMat);
    box.position.set(0, 5.5, 0);
    group.add(box);

    const red = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff3838 }));
    red.position.set(0, 6.0, 0.32);
    const yellow = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffb142 }));
    yellow.position.set(0, 5.5, 0.32);
    const green = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0x2ed573 }));
    green.position.set(0, 5.0, 0.32);
    group.add(red, yellow, green);

    group.position.set(x, 0, z);
    this.scene.add(group);
    this.trafficLights.push(group);
  }

  createFireHydrant(x, z) {
    const THREE = window.THREE;
    const hydMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.4 });
    const geom = new THREE.CylinderGeometry(0.22, 0.28, 0.9, 8);
    const mesh = new THREE.Mesh(geom, hydMat);
    mesh.position.set(x, 0.45, z);
    this.scene.add(mesh);
    this.props.push(mesh);
    this.colliders.push({ minX: x - 0.4, maxX: x + 0.4, minZ: z - 0.4, maxZ: z + 0.4, height: 1, type: 'prop' });
  }

  // --- Collision & Query APIs ---

  checkCollision(x, z, radius = 0.8) {
    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      if (
        x + radius > c.minX &&
        x - radius < c.maxX &&
        z + radius > c.minZ &&
        z - radius < c.maxZ
      ) {
        return c;
      }
    }
    return null;
  }

  resolveCollision(pos, radius = 0.8) {
    const col = this.checkCollision(pos.x, pos.z, radius);
    if (!col) return pos;

    // Push out along shortest penetration axis
    const overlapLeft = (pos.x + radius) - col.minX;
    const overlapRight = col.maxX - (pos.x - radius);
    const overlapTop = (pos.z + radius) - col.minZ;
    const overlapBottom = col.maxZ - (pos.z - radius);

    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
    if (minOverlap === overlapLeft) pos.x = col.minX - radius;
    else if (minOverlap === overlapRight) pos.x = col.maxX + radius;
    else if (minOverlap === overlapTop) pos.z = col.minZ - radius;
    else pos.z = col.maxZ + radius;

    return pos;
  }

  getRandomRoadPosition() {
    const road = this.roads[Math.floor(Math.random() * this.roads.length)];
    if (road.axis === 'z') {
      const laneOffset = (Math.random() > 0.5 ? 1 : -1) * (road.width * 0.25);
      const z = road.zStart + Math.random() * (road.zEnd - road.zStart);
      return { x: road.x + laneOffset, y: 0.3, z, dir: laneOffset > 0 ? 0 : Math.PI };
    } else {
      const laneOffset = (Math.random() > 0.5 ? 1 : -1) * (road.width * 0.25);
      const x = road.xStart + Math.random() * (road.xEnd - road.xStart);
      return { x, y: 0.3, z: road.z + laneOffset, dir: laneOffset > 0 ? Math.PI / 2 : -Math.PI / 2 };
    }
  }

  getRandomSidewalkPosition() {
    const { BLOCK_SIZE, GRID_COLS, GRID_ROWS, ROAD_WIDTH } = CONFIG.CITY;
    const halfWidth = (GRID_COLS * BLOCK_SIZE) / 2;
    const halfHeight = (GRID_ROWS * BLOCK_SIZE) / 2;
    const c = Math.floor(Math.random() * GRID_COLS);
    const r = Math.floor(Math.random() * GRID_ROWS);
    const bx = -halfWidth + c * BLOCK_SIZE + BLOCK_SIZE / 2;
    const bz = -halfHeight + r * BLOCK_SIZE + BLOCK_SIZE / 2;
    const edge = Math.floor(Math.random() * 4);
    const offset = (BLOCK_SIZE - ROAD_WIDTH) / 2 - 1.5;

    switch (edge) {
      case 0: return { x: bx + (Math.random() - 0.5) * offset * 2, y: 0.35, z: bz - offset };
      case 1: return { x: bx + (Math.random() - 0.5) * offset * 2, y: 0.35, z: bz + offset };
      case 2: return { x: bx - offset, y: 0.35, z: bz + (Math.random() - 0.5) * offset * 2 };
      default: return { x: bx + offset, y: 0.35, z: bz + (Math.random() - 0.5) * offset * 2 };
    }
  }

  update(delta) {
    // Water wave animation
    if (this.waterMesh) {
      this.waterTime += delta * 1.5;
      this.waterMesh.position.y = -0.6 + Math.sin(this.waterTime) * 0.08;
    }
  }
}
