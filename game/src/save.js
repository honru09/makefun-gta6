// Solaria City - Save & Progression Persistence System

const STORAGE_KEY = 'solaria_save_v1';

export class SaveSystem {
  static save(player, missionManager, policeManager) {
    if (!player) return false;
    try {
      const data = {
        cash: player.cash,
        health: player.health,
        armor: player.armor,
        ammo: player.ammo,
        position: {
          x: player.position.x,
          y: player.position.y,
          z: player.position.z,
        },
        completedMissions: missionManager ? missionManager.completedMissions : [],
        activeMissionId: missionManager && missionManager.activeMission ? missionManager.activeMission.id : null,
        wantedStars: policeManager ? policeManager.wantedStars : 0,
        savedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  static hasSave() {
    try {
      return localStorage.getItem(STORAGE_KEY) !== null;
    } catch {
      return false;
    }
  }

  static load(player, missionManager, policeManager) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);

      if (player) {
        player.cash = data.cash ?? player.cash;
        player.health = data.health ?? player.health;
        player.armor = data.armor ?? player.armor;
        if (data.ammo) player.ammo = data.ammo;
        if (data.position) {
          player.position.x = data.position.x;
          player.position.y = data.position.y;
          player.position.z = data.position.z;
        }
      }

      if (missionManager && data.completedMissions) {
        missionManager.completedMissions = data.completedMissions;
        if (data.activeMissionId) {
          missionManager.startMission(data.activeMissionId);
        }
      }

      if (policeManager && typeof data.wantedStars === 'number') {
        policeManager.wantedStars = data.wantedStars;
      }

      return true;
    } catch {
      return false;
    }
  }

  static reset() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch {
      return false;
    }
  }
}
