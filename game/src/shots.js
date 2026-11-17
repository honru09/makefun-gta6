// Solaria City - Deterministic Staged Scene Generator for Screenshots & Testing

import { CONFIG } from './config.js';

export class ShotsManager {
  static checkAndApplyStagedShot(game) {
    const params = new URLSearchParams(window.location.search);
    const shot = params.get('shot');
    if (!shot) return false;

    console.log(`[ShotsManager] Applying staged scene for shot: ${shot}`);

    if (shot === 'cover' || shot === '1-cover' || shot === 'start') {
      game.isStaged = true;
      ShotsManager.stageCoverScene(game);
      return true;
    } else if (shot === 'skyline' || shot === '2-skyline' || shot === 'play') {
      game.isStaged = true;
      ShotsManager.stageSkylineScene(game);
      return true;
    } else if (shot === 'action' || shot === '3-action' || shot === 'end') {
      game.isStaged = true;
      ShotsManager.stageActionScene(game);
      return true;
    } else if (shot === 'mission' || shot === '4-mission') {
      game.isStaged = true;
      ShotsManager.stageMissionScene(game);
      return true;
    }

    return false;
  }

  static stageCoverScene(game) {
    const { player, vehicleManager, policeManager, missionManager, camera } = game;

    // 1. Position Player in Solaria Venom GT on Ocean Drive
    const venomCfg = CONFIG.VEHICLES.venom;
    const venom = new (vehicleManager.vehicles[0].constructor)(game.scene, venomCfg, 174.2, 48, 0.08);
    venom.velocity = 35.0; // 80 MPH
    vehicleManager.vehicles.push(venom);
    vehicleManager.playerVehicle = venom;
    player.enterVehicle(venom);

    // 2. Spawn 2 Police Interceptors in hot pursuit
    const police1 = policeManager.vehicleManager.spawnPoliceCruiser(176.8, 38, 0.04);
    police1.velocity = 34.0;
    police1.sirenActive = true;
    policeManager.policeCars.push(police1);

    const police2 = policeManager.vehicleManager.spawnPoliceCruiser(171.5, 30, -0.02);
    police2.velocity = 34.5;
    police2.sirenActive = true;
    policeManager.policeCars.push(police2);

    // 3. Set 3 Wanted Stars
    policeManager.wantedStars = 3;

    // 4. Mission state & Dialogue
    missionManager.startMission('mission_1');
    missionManager.activeMission.stages[1].text = 'LOSE THE METRO PD PURSUIT & DELIVER CONTRABAND';
    missionManager.currentStageIndex = 1;
    missionManager.showDialogue(
      'LEO "FIN" CASTILLO',
      'Lose the cruisers on Ocean Drive! Take the alleys before they set up a roadblock!'
    );

    // 5. Cinematic Action Camera: Low angle behind police cruisers looking forward
    camera.position.set(180.5, 3.4, 23.5);
    camera.lookAt(173.8, 2.0, 48.0);

    // Update HUD
    game.hud.update(player, game.city, vehicleManager, game.trafficManager, policeManager, missionManager);
    game.renderer.render(game.scene, game.camera);
  }

  static stageSkylineScene(game) {
    const { player, vehicleManager, camera, trafficManager, policeManager, missionManager } = game;

    // Position player vehicle at coastal promenade
    const titanCfg = CONFIG.VEHICLES.titan;
    const suv = new (vehicleManager.vehicles[0].constructor)(game.scene, titanCfg, 175, -40, 0);
    suv.velocity = 18.0;
    vehicleManager.vehicles.push(suv);
    vehicleManager.playerVehicle = suv;
    player.enterVehicle(suv);

    // Camera high vantage showing coastline, palm trees, ocean, yachts and city skyline
    camera.position.set(205, 20.0, -90);
    camera.lookAt(120, 8.0, 10);

    // Update HUD
    game.hud.update(player, game.city, vehicleManager, trafficManager, policeManager, missionManager);
    game.renderer.render(game.scene, game.camera);
  }

  static stageActionScene(game) {
    const { player, missionManager, policeManager, camera, trafficManager, vehicleManager } = game;

    // On foot player aiming pistol outside Downtown Neon Club
    player.position = { x: 31.5, y: 0.35, z: 23.0 };
    player.heading = 0.25; // Aiming towards targets
    player.currentWeaponIndex = 1; // 9mm Pistol
    player.isAiming = true;
    player.rightArm.rotation.x = Math.PI / 2.1; // Outstretched aiming arm
    player.ammo.pistol = 9;
    player.health = 85;
    player.armor = 40;

    // Spawn syndicate combatants directly in line of sight
    missionManager.spawnSyndicateEnemies(3);
    if (missionManager.enemies.length >= 3) {
      missionManager.enemies[0].group.position.set(34.5, 0.35, 32.0);
      missionManager.enemies[1].group.position.set(37.5, 0.35, 34.0);
      missionManager.enemies[2].group.position.set(31.0, 0.35, 36.0);
    }

    // Pedestrians fleeing in terror
    trafficManager.alertPedestriansNearby(player.position, 40);

    // 2 Wanted Stars
    policeManager.wantedStars = 2;

    // Over-The-Shoulder Camera: Framed with player on left, targets in center
    camera.position.set(29.8, 1.85, 19.5);
    camera.lookAt(34.5, 1.55, 32.0);

    // Trigger visual muzzle flash at gun tip
    player.muzzleGroup.position.set(32.4, 1.5, 24.2);
    player.muzzleGroup.visible = true;
    player.muzzleLight.intensity = 5.0;

    // Crosshair active
    const crossEl = document.getElementById('hud-crosshair');
    if (crossEl) crossEl.classList.remove('hidden');

    // Update HUD
    game.hud.update(player, game.city, vehicleManager, trafficManager, policeManager, missionManager);
    game.renderer.render(game.scene, game.camera);
  }

  static stageMissionScene(game) {
    const { player, missionManager, camera, vehicleManager, policeManager, trafficManager } = game;

    // Player standing at Marina docks facing Fin and luxury yachts
    player.position = { x: 10, y: 0.35, z: -155 };
    player.heading = Math.PI;

    // Start Mission 2 & show glowing waypoint
    missionManager.startMission('mission_2');
    missionManager.markerMesh.visible = true;
    missionManager.markerMesh.position.set(9.5, 0.4, -162.0);

    missionManager.showDialogue(
      'LEO "FIN" CASTILLO',
      'The contraband just docked at Palma Marina. Secure it before the precinct locks down the perimeter!'
    );

    // Cinematic dialogue camera angle framing player, 3D waypoint, and Marina yachts
    camera.position.set(13.8, 2.3, -151.0);
    camera.lookAt(9.0, 1.5, -162.0);

    // Update HUD
    game.hud.update(player, game.city, vehicleManager, trafficManager, policeManager, missionManager);
    game.renderer.render(game.scene, game.camera);
  }
}
