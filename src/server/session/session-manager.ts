import { ROLES, Role, PresenceState } from "../../lib/types";

export type JoinRequest = {
  deviceId: string;
  socketId: string;
  desiredRole?: Role;
  now?: number;
};

export type JoinResult = {
  ok: boolean;
  meRole?: Role;
  requiresChoice: boolean;
  availableRoles: Role[];
  roomFull: boolean;
};

type ActiveSession = {
  role: Role;
  deviceId: string;
  socketId: string;
  lastSeen: number;
  connected: boolean;
};

export class SessionManager {
  private readonly roleSessions = new Map<Role, ActiveSession>();
  private readonly socketToRole = new Map<string, Role>();
  private presenceRevision = 0;

  constructor(private readonly ttlMs: number) {}

  getPresenceRevision(): number {
    return this.presenceRevision;
  }

  join(input: JoinRequest): JoinResult {
    const now = input.now ?? Date.now();
    this.cleanupExpired(now);
    const before = this.createPresenceKey();

    const existingRole = this.findRoleByDevice(input.deviceId);
    if (existingRole) {
      this.attachSocket(existingRole, input.socketId, now);
      this.bumpPresenceRevisionIfChanged(before);
      return {
        ok: true,
        meRole: existingRole,
        requiresChoice: false,
        availableRoles: this.getAvailableRoles(now),
        roomFull: false
      };
    }

    const availableRoles = this.getAvailableRoles(now);
    if (availableRoles.length === 0) {
      this.bumpPresenceRevisionIfChanged(before);
      return {
        ok: false,
        requiresChoice: false,
        availableRoles: [],
        roomFull: true
      };
    }

    if (availableRoles.length === 2 && !input.desiredRole) {
      this.bumpPresenceRevisionIfChanged(before);
      return {
        ok: true,
        requiresChoice: true,
        availableRoles,
        roomFull: false
      };
    }

    const targetRole =
      input.desiredRole && availableRoles.includes(input.desiredRole)
        ? input.desiredRole
        : availableRoles[0];

    this.roleSessions.set(targetRole, {
      role: targetRole,
      deviceId: input.deviceId,
      socketId: input.socketId,
      lastSeen: now,
      connected: true
    });
    this.socketToRole.set(input.socketId, targetRole);
    this.bumpPresenceRevisionIfChanged(before);

    return {
      ok: true,
      meRole: targetRole,
      requiresChoice: false,
      availableRoles: this.getAvailableRoles(now),
      roomFull: false
    };
  }

  ping(socketId: string, now = Date.now()): void {
    this.cleanupExpired(now);
    const before = this.createPresenceKey();
    const role = this.socketToRole.get(socketId);
    if (!role) {
      return;
    }

    const session = this.roleSessions.get(role);
    if (!session) {
      return;
    }

    session.lastSeen = now;
    session.connected = true;
    session.socketId = socketId;
    this.socketToRole.set(socketId, role);
    this.bumpPresenceRevisionIfChanged(before);
  }

  disconnect(socketId: string, now = Date.now()): void {
    this.cleanupExpired(now);
    const before = this.createPresenceKey();
    const role = this.socketToRole.get(socketId);
    if (!role) {
      return;
    }

    this.socketToRole.delete(socketId);
    const session = this.roleSessions.get(role);
    if (!session) {
      return;
    }

    if (session.socketId === socketId) {
      session.connected = false;
      session.lastSeen = now;
    }
    this.bumpPresenceRevisionIfChanged(before);
  }

  cleanupExpired(now = Date.now()): void {
    const before = this.createPresenceKey();
    let changed = false;

    for (const role of ROLES) {
      const session = this.roleSessions.get(role);
      if (!session) {
        continue;
      }

      if (now - session.lastSeen <= this.ttlMs) {
        continue;
      }

      this.socketToRole.delete(session.socketId);
      this.roleSessions.delete(role);
      changed = true;
    }

    if (changed) {
      this.bumpPresenceRevisionIfChanged(before);
    }
  }

  getPresence(now = Date.now()): PresenceState {
    this.cleanupExpired(now);

    const online = {
      Sami: false,
      Patryk: false
    } as Record<Role, boolean>;

    const occupiedRoles: Role[] = [];

    for (const role of ROLES) {
      const session = this.roleSessions.get(role);
      if (!session) {
        continue;
      }

      occupiedRoles.push(role);
      online[role] = session.connected;
    }

    return {
      online,
      occupiedRoles
    };
  }

  getAvailableRoles(now = Date.now()): Role[] {
    this.cleanupExpired(now);
    return ROLES.filter((role) => !this.roleSessions.has(role));
  }

  private findRoleByDevice(deviceId: string): Role | null {
    for (const role of ROLES) {
      const session = this.roleSessions.get(role);
      if (session?.deviceId === deviceId) {
        return role;
      }
    }

    return null;
  }

  private attachSocket(role: Role, socketId: string, now: number): void {
    const session = this.roleSessions.get(role);
    if (!session) {
      return;
    }

    this.socketToRole.delete(session.socketId);
    session.socketId = socketId;
    session.lastSeen = now;
    session.connected = true;
    this.socketToRole.set(socketId, role);
  }

  private bumpPresenceRevisionIfChanged(before: string): void {
    if (before === this.createPresenceKey()) {
      return;
    }

    this.presenceRevision += 1;
  }

  private createPresenceKey(): string {
    const sami = this.roleSessions.get("Sami");
    const patryk = this.roleSessions.get("Patryk");

    return [
      sami ? 1 : 0,
      sami?.connected ? 1 : 0,
      patryk ? 1 : 0,
      patryk?.connected ? 1 : 0
    ].join(":");
  }
}
