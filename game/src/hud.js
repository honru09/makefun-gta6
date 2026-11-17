// Solaria City - Professional AAA Open-World HUD & Live Minimap System

import { CONFIG } from './config.js';

export class HUD {
  constructor(domRoot) {
    this.root = domRoot;
    this.minimapCanvas = null;
    this.minimapCtx = null;
    this.minimapRadius = 75; // Pixels radius

    this.buildDOMElements();
  }

  buildDOMElements() {
    this.root.innerHTML = `
      <div id="hud-overlay">
        <!-- Top Left: Mission Tracker & Clock -->
        <div class="hud-panel top-left">
          <div class="hud-clock" id="hud-clock">16:45 PM</div>
          <div class="mission-box" id="hud-mission-box">
            <div class="mission-tag">MISSION OBJECTIVE</div>
            <div class="mission-text" id="hud-mission-text">Explore Solaria Bay or visit Palma Marina</div>
          </div>
        </div>

        <!-- Top Right: Wanted Stars & Cash -->
        <div class="hud-panel top-right">
          <div class="wanted-container" id="hud-wanted-stars">
            <span class="star" data-idx="1">★</span>
            <span class="star" data-idx="2">★</span>
            <span class="star" data-idx="3">★</span>
            <span class="star" data-idx="4">★</span>
            <span class="star" data-idx="5">★</span>
          </div>
          <div class="cash-display" id="hud-cash">$003,500</div>
          <div class="weapon-display" id="hud-weapon">
            <span class="weapon-name" id="hud-weapon-name">9mm Solaria Pistol</span>
            <span class="ammo-count" id="hud-ammo">12 / 48</span>
          </div>
        </div>

        <!-- Crosshair in screen center -->
        <div id="hud-crosshair" class="crosshair hidden"></div>

        <!-- Center Screen: Big Banners & Interaction Prompt -->
        <div id="hud-banner" class="hud-banner hidden">
          <h1 id="banner-title">MISSION PASSED</h1>
          <p id="banner-subtitle">+ $2,500 REWARD</p>
        </div>

        <div id="hud-prompt" class="hud-prompt hidden">
          <span class="key-badge">[E]</span> <span id="prompt-text">Enter Vehicle</span>
        </div>

        <!-- Bottom Left: Circular Minimap & Health/Armor -->
        <div class="hud-panel bottom-left">
          <div class="minimap-wrapper">
            <canvas id="minimap-canvas" width="160" height="160"></canvas>
            <div class="minimap-bezel"></div>
            <div class="compass-n">N</div>
          </div>
          <div class="status-bars">
            <div class="bar-row health-row">
              <span class="bar-label">HP</span>
              <div class="bar-track"><div class="bar-fill health" id="bar-health" style="width: 100%"></div></div>
            </div>
            <div class="bar-row armor-row">
              <span class="bar-label">ARM</span>
              <div class="bar-track"><div class="bar-fill armor" id="bar-armor" style="width: 50%"></div></div>
            </div>
          </div>
        </div>

        <!-- Bottom Right: Speedometer (when driving) -->
        <div class="hud-panel bottom-right hidden" id="hud-speedometer">
          <div class="speed-dial">
            <div class="speed-val" id="hud-speed-val">0</div>
            <div class="speed-unit">MPH</div>
          </div>
          <div class="vehicle-name" id="hud-vehicle-name">Solaria Venom GT</div>
        </div>

        <!-- Bottom Center: Subtitles & Dialogue -->
        <div id="hud-dialogue" class="hud-dialogue hidden">
          <div class="dialogue-speaker" id="dialogue-speaker">LEO "FIN" CASTILLO</div>
          <div class="dialogue-body" id="dialogue-body">The shipment just docked at Palma Bay. Get there before the precinct locks it down!</div>
        </div>

        <!-- Wasted / Busted Screen Overlay -->
        <div id="screen-wasted" class="screen-overlay hidden">
          <div class="wasted-banner" id="wasted-banner-text">WASTED</div>
          <div class="wasted-sub">Respawning at Solaria General Hospital...</div>
        </div>
      </div>
    `;

    this.minimapCanvas = document.getElementById('minimap-canvas');
    if (this.minimapCanvas) {
      this.minimapCtx = this.minimapCanvas.getContext('2d');
    }
  }

  update(player, city, vehicleManager, trafficManager, policeManager, missionManager) {
    if (!player) return;

    // 1. Health & Armor Bars
    const hpEl = document.getElementById('bar-health');
    const armEl = document.getElementById('bar-armor');
    if (hpEl) hpEl.style.width = `${Math.max(0, Math.min(100, player.health))}%`;
    if (armEl) armEl.style.width = `${Math.max(0, Math.min(100, player.armor))}%`;

    // 2. Cash & Clock
    const cashEl = document.getElementById('hud-cash');
    if (cashEl) {
      const formatted = player.cash.toLocaleString('en-US');
      cashEl.textContent = `$${formatted.padStart(6, '0')}`;
    }

    // 3. Wanted Stars
    const starsContainer = document.getElementById('hud-wanted-stars');
    if (starsContainer) {
      const stars = starsContainer.querySelectorAll('.star');
      const isBlinking = policeManager.isFlashing && Math.floor(policeManager.flashTimer * 3) % 2 === 0;

      stars.forEach((s, idx) => {
        const starNum = idx + 1;
        if (starNum <= policeManager.wantedStars) {
          s.classList.add('active');
          if (isBlinking) s.classList.add('blink');
          else s.classList.remove('blink');
        } else {
          s.classList.remove('active', 'blink');
        }
      });
    }

    // 4. Weapon & Ammo
    const wepNameEl = document.getElementById('hud-weapon-name');
    const ammoEl = document.getElementById('hud-ammo');
    const curWep = player.getCurrentWeapon();
    if (wepNameEl) wepNameEl.textContent = curWep.name;
    if (ammoEl) {
      ammoEl.textContent = curWep.id === 'fists' ? '∞' : `${player.ammo.pistol} / 120`;
    }

    // Crosshair visibility
    const crossEl = document.getElementById('hud-crosshair');
    if (crossEl) {
      if (player.isAiming) crossEl.classList.remove('hidden');
      else crossEl.classList.add('hidden');
    }

    // 5. Speedometer (when driving)
    const speedoEl = document.getElementById('hud-speedometer');
    if (speedoEl) {
      if (player.inVehicle && player.currentVehicle) {
        speedoEl.classList.remove('hidden');
        const mph = Math.floor(Math.abs(player.currentVehicle.velocity) * 2.3);
        const speedValEl = document.getElementById('hud-speed-val');
        const vehNameEl = document.getElementById('hud-vehicle-name');
        if (speedValEl) speedValEl.textContent = mph.toString();
        if (vehNameEl) vehNameEl.textContent = player.currentVehicle.config.name;
      } else {
        speedoEl.classList.add('hidden');
      }
    }

    // 6. Mission Objective Text
    const missionTextEl = document.getElementById('hud-mission-text');
    if (missionTextEl && missionManager) {
      missionTextEl.textContent = missionManager.getCurrentObjectiveText();
    }

    // 7. Dialogue Subtitles
    const diagEl = document.getElementById('hud-dialogue');
    if (diagEl && missionManager) {
      if (missionManager.dialogueTimer > 0) {
        diagEl.classList.remove('hidden');
        document.getElementById('dialogue-speaker').textContent = missionManager.dialogueSpeaker;
        document.getElementById('dialogue-body').textContent = missionManager.dialogueText;
      } else {
        diagEl.classList.add('hidden');
      }
    }

    // 8. Large Banner
    const bannerEl = document.getElementById('hud-banner');
    if (bannerEl && missionManager) {
      if (missionManager.bannerTimer > 0) {
        bannerEl.classList.remove('hidden');
        document.getElementById('banner-title').textContent = missionManager.bannerText;
        document.getElementById('banner-subtitle').textContent = missionManager.bannerSubtitle;
      } else {
        bannerEl.classList.add('hidden');
      }
    }

    // 9. Interaction Prompt
    const promptEl = document.getElementById('hud-prompt');
    if (promptEl) {
      if (!player.inVehicle) {
        const nearVeh = vehicleManager.getNearestVehicle(player.position, 4.0);
        if (nearVeh) {
          promptEl.classList.remove('hidden');
          document.getElementById('prompt-text').textContent = `Enter ${nearVeh.config.name}`;
        } else {
          promptEl.classList.add('hidden');
        }
      } else {
        promptEl.classList.remove('hidden');
        document.getElementById('prompt-text').textContent = 'Exit Vehicle';
      }
    }

    // 10. Wasted / Busted Screen
    const wastedEl = document.getElementById('screen-wasted');
    if (wastedEl) {
      if (player.isWasted) {
        wastedEl.classList.remove('hidden');
        const bannerTxt = policeManager.isBusted ? 'BUSTED' : 'WASTED';
        document.getElementById('wasted-banner-text').textContent = bannerTxt;
      } else {
        wastedEl.classList.add('hidden');
      }
    }

    // 11. Render Live Circular Minimap
    this.renderMinimap(player, city, vehicleManager, policeManager, missionManager);
  }

  renderMinimap(player, city, vehicleManager, policeManager, missionManager) {
    if (!this.minimapCtx) return;
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = 0.55; // World units to minimap pixels

    ctx.clearRect(0, 0, w, h);

    // Circular clip path for radar
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, this.minimapRadius, 0, Math.PI * 2);
    ctx.clip();

    // Map background: Asphalt dark
    ctx.fillStyle = '#1e242b';
    ctx.fillRect(0, 0, w, h);

    // World transform relative to player
    ctx.save();
    ctx.translate(cx, cy);
    // Rotate with camera yaw
    ctx.rotate(-player.camYaw);
    ctx.translate(-player.position.x * scale, -player.position.z * scale);

    // Draw Ocean on East
    ctx.fillStyle = '#0984e3';
    ctx.fillRect(160 * scale, -300 * scale, 300 * scale, 600 * scale);

    // Draw Beach
    ctx.fillStyle = '#e5c07b';
    ctx.fillRect(140 * scale, -240 * scale, 35 * scale, 480 * scale);

    // Draw City Roads
    ctx.fillStyle = '#343a40';
    city.roads.forEach((r) => {
      if (r.axis === 'z') {
        ctx.fillRect((r.x - r.width / 2) * scale, r.zStart * scale, r.width * scale, (r.zEnd - r.zStart) * scale);
      } else {
        ctx.fillRect(r.xStart * scale, (r.z - r.width / 2) * scale, (r.xEnd - r.xStart) * scale, r.width * scale);
      }
    });

    // Draw Buildings
    ctx.fillStyle = '#495057';
    city.buildings.forEach((b) => {
      ctx.fillRect((b.x - b.width / 2) * scale, (b.z - b.depth / 2) * scale, b.width * scale, b.depth * scale);
    });

    // Draw GPS line to active mission target
    if (missionManager && missionManager.activeMarker) {
      const tx = missionManager.activeMarker.x * scale;
      const tz = missionManager.activeMarker.z * scale;
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(player.position.x * scale, player.position.z * scale);
      ctx.lineTo(tx, tz);
      ctx.stroke();
      ctx.setLineDash([]);

      // Mission Blip (Gold Star)
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.arc(tx, tz, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Vehicles
    vehicleManager.vehicles.forEach((veh) => {
      if (veh === player.currentVehicle) return;
      const vx = veh.position.x * scale;
      const vz = veh.position.z * scale;
      ctx.fillStyle = veh.isPolice ? '#e74c3c' : '#a4b0be';
      ctx.fillRect(vx - 2, vz - 2, 4, 4);
    });

    // Draw Police Pursuit Blips (Flashing Red/Blue)
    if (policeManager && policeManager.policeCars.length > 0) {
      const flash = Math.sin(performance.now() * 0.015) > 0;
      ctx.fillStyle = flash ? '#ff0000' : '#0055ff';
      policeManager.policeCars.forEach((c) => {
        const px = c.position.x * scale;
        const pz = c.position.z * scale;
        ctx.beginPath();
        ctx.arc(px, pz, 5, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore(); // Restore player transform

    // Draw Player Triangle in center (pointing UP)
    ctx.fillStyle = '#00ff88';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 7);
    ctx.lineTo(cx - 5, cy + 6);
    ctx.lineTo(cx + 5, cy + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore(); // Restore circular clip

    // Radar circular border ring
    ctx.strokeStyle = '#2ed573';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, this.minimapRadius - 1, 0, Math.PI * 2);
    ctx.stroke();
  }
}
