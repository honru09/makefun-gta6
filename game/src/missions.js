// Solaria City - Story Missions, Cutscenes & Objective Waypoints System

import { CONFIG } from './config.js';

export class MissionManager {
  constructor(scene, audio) {
    this.scene = scene;
    this.audio = audio;

    this.activeMission = null;
    this.currentStageIndex = 0;
    this.completedMissions = [];
    this.activeMarker = null;
    this.markerMesh = null;
    this.markerAnim = 0;

    // Dialogue State
    this.dialogueText = '';
    this.dialogueSpeaker = '';
    this.dialogueTimer = 0;

    // Mission Notification
    this.bannerText = '';
    this.bannerSubtitle = '';
    this.bannerTimer = 0;

    // Syndicate Goons (Enemies for Mission 2 & 3)
    this.enemies = [];

    this.build3DMarker();
  }

  build3DMarker() {
    const THREE = window.THREE;
    this.markerMesh = new THREE.Group();

    // Floating gold diamond
    const diamondMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, wireframe: false });
    const diamondGeom = new THREE.OctahedronGeometry(1.4, 0);
    this.diamond = new THREE.Mesh(diamondGeom, diamondMat);
    this.diamond.position.y = 2.4;
    this.markerMesh.add(this.diamond);

    // Ground glowing ring
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, side: THREE.DoubleSide });
    const ringGeom = new THREE.RingGeometry(2.2, 2.6, 24);
    this.ring = new THREE.Mesh(ringGeom, ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.1;
    this.markerMesh.add(this.ring);

    this.markerMesh.visible = false;
    this.scene.add(this.markerMesh);
  }

  startMission(missionId) {
    const mission = CONFIG.MISSIONS.find((m) => m.id === missionId);
    if (!mission) return;

    this.activeMission = mission;
    this.currentStageIndex = 0;
    this.setupCurrentStage();

    this.showBanner(`MISSION: ${mission.title.toUpperCase()}`, mission.description);
    this.showDialogue(mission.contact, `Let's get this done, Jax. Follow the GPS coordinates!`);
    if (this.audio) this.audio.playMissionPass();
  }

  setupCurrentStage() {
    if (!this.activeMission) return;
    const stage = this.activeMission.stages[this.currentStageIndex];
    if (!stage) {
      this.completeActiveMission();
      return;
    }

    if (stage.target) {
      this.activeMarker = stage.target;
      this.markerMesh.position.set(stage.target.x, stage.target.y || 0.35, stage.target.z);
      this.markerMesh.visible = true;
    } else {
      this.activeMarker = null;
      this.markerMesh.visible = false;
    }

    // Spawn Enemies if combat stage
    if (stage.type === 'combat') {
      this.spawnSyndicateEnemies(stage.enemyCount || 4);
    }
  }

  spawnSyndicateEnemies(count) {
    const THREE = window.THREE;
    const suitMat = new THREE.MeshStandardMaterial({ color: 0x800020, roughness: 0.6 }); // Crimson syndicate suits
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdf9e76, roughness: 0.8 });

    for (let i = 0; i < count; i++) {
      const group = new THREE.Group();
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.85, 0.35), suitMat);
      torso.position.y = 1.15;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), skinMat);
      head.position.y = 1.75;
      group.add(torso, head);

      const x = -135 + (i - 2) * 5;
      const z = 145 + (Math.random() - 0.5) * 8;
      group.position.set(x, 0.35, z);
      this.scene.add(group);

      this.enemies.push({
        group,
        position: { x, y: 0.35, z },
        health: 60,
        isDead: false,
        shootTimer: 1.0 + Math.random(),
      });
    }
  }

  advanceStage() {
    this.currentStageIndex++;
    if (this.currentStageIndex >= this.activeMission.stages.length) {
      this.completeActiveMission();
    } else {
      this.setupCurrentStage();
      if (this.audio) this.audio.playUIClick();
    }
  }

  completeActiveMission() {
    if (!this.activeMission) return;
    const mission = this.activeMission;
    this.completedMissions.push(mission.id);

    this.showBanner('MISSION PASSED!', `+ $${mission.rewardCash} REWARD`);
    this.showDialogue(mission.contact, `Incredible work, Jax. The city is taking notice of you.`);
    if (this.audio) this.audio.playMissionPass();

    this.markerMesh.visible = false;
    this.activeMarker = null;
    this.activeMission = null;

    // Despawn syndicate enemies
    this.enemies.forEach((e) => this.scene.remove(e.group));
    this.enemies = [];
  }

  showDialogue(speaker, text, duration = 6.0) {
    this.dialogueSpeaker = speaker;
    this.dialogueText = text;
    this.dialogueTimer = duration;
  }

  showBanner(title, subtitle, duration = 4.0) {
    this.bannerText = title;
    this.bannerSubtitle = subtitle;
    this.bannerTimer = duration;
  }

  getCurrentObjectiveText() {
    if (!this.activeMission) return 'Explore Solaria Bay or visit Palma Marina [M] for missions.';
    const stage = this.activeMission.stages[this.currentStageIndex];
    return stage ? stage.text : 'Mission Completed';
  }

  update(delta, player, policeManager) {
    // 1. Update 3D Marker Animation
    if (this.markerMesh && this.markerMesh.visible) {
      this.markerAnim += delta * 2.5;
      this.diamond.rotation.y = this.markerAnim;
      this.diamond.position.y = 2.2 + Math.sin(this.markerAnim * 2) * 0.3;
      const ringScale = 1.0 + Math.sin(this.markerAnim * 3) * 0.15;
      this.ring.scale.set(ringScale, ringScale, ringScale);

      // Check distance to player
      if (this.activeMarker && player) {
        const dx = player.position.x - this.activeMarker.x;
        const dz = player.position.z - this.activeMarker.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 4.8) {
          this.advanceStage();
        }
      }
    }

    // 2. Check Evade Stage in Mission
    if (this.activeMission) {
      const stage = this.activeMission.stages[this.currentStageIndex];
      if (stage && stage.type === 'evade') {
        if (policeManager.wantedStars === 0) {
          this.advanceStage();
        }
      }
    }

    // 3. Update Syndicate Enemies Combat
    this.enemies.forEach((en) => {
      if (en.isDead || !player) return;
      const dx = player.position.x - en.position.x;
      const dz = player.position.z - en.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      // Aim & shoot at player
      if (dist < 35) {
        en.shootTimer -= delta;
        if (en.shootTimer <= 0) {
          en.shootTimer = 1.5 + Math.random() * 0.8;
          if (this.audio) this.audio.playGunshot();
          player.takeDamage(12);
        }
      }
    });

    // 4. Update Timers
    if (this.dialogueTimer > 0) this.dialogueTimer -= delta;
    if (this.bannerTimer > 0) this.bannerTimer -= delta;
  }
}
