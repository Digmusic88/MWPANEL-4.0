import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

export interface RestoreProgressEvent {
  sessionId: string;
  progress: number;
  message: string;
  step: string;
  totalSteps: number;
  currentStep: number;
  estimatedTimeRemaining?: number;
  error?: string;
  completed?: boolean;
  cancelled?: boolean;
}

export interface RestoreStatusEvent {
  sessionId: string;
  status: 'starting' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  data?: any;
  error?: string;
}

@WebSocketGateway({
  cors: {
    origin: ['https://plataforma.mundoworld.school', 'http://localhost:5173', 'https://localhost:5173'],
    credentials: true,
  },
  namespace: '/restore-progress',
})
export class RestoreProgressGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RestoreProgressGateway.name);
  private activeRestoreSessions = new Map<string, string>(); // sessionId -> socketId
  private userSockets = new Map<string, string>(); // userId -> socketId

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      const userId = client.handshake.auth?.userId;
      
      // Basic validation - just check if token exists
      if (!token) {
        this.logger.warn('WebSocket connection attempted without token');
        client.disconnect();
        return;
      }
      
      if (userId) {
        this.userSockets.set(userId, client.id);
        this.logger.log(`User ${userId} connected for restore progress tracking`);
      } else {
        this.logger.log(`Anonymous user connected for restore progress tracking: ${client.id}`);
      }
    } catch (error) {
      this.logger.error('Error handling connection:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    try {
      // Remove user socket mapping
      for (const [userId, socketId] of this.userSockets.entries()) {
        if (socketId === client.id) {
          this.userSockets.delete(userId);
          this.logger.log(`User ${userId} disconnected from restore progress tracking`);
          break;
        }
      }

      // Remove active session mapping
      for (const [sessionId, socketId] of this.activeRestoreSessions.entries()) {
        if (socketId === client.id) {
          this.activeRestoreSessions.delete(sessionId);
          this.logger.log(`Restore session ${sessionId} disconnected`);
          break;
        }
      }
    } catch (error) {
      this.logger.error('Error handling disconnect:', error);
    }
  }

  @SubscribeMessage('join-restore-session')
  handleJoinSession(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { sessionId } = data;
      client.join(sessionId);
      this.activeRestoreSessions.set(sessionId, client.id);
      this.logger.log(`Client joined restore session: ${sessionId}`);
      
      client.emit('session-joined', { sessionId, status: 'connected' });
    } catch (error) {
      this.logger.error('Error joining restore session:', error);
      client.emit('session-error', { error: 'Failed to join session' });
    }
  }

  @SubscribeMessage('leave-restore-session')
  handleLeaveSession(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { sessionId } = data;
      client.leave(sessionId);
      this.activeRestoreSessions.delete(sessionId);
      this.logger.log(`Client left restore session: ${sessionId}`);
    } catch (error) {
      this.logger.error('Error leaving restore session:', error);
    }
  }

  // Public methods for emitting progress events

  emitProgress(sessionId: string, progressData: RestoreProgressEvent) {
    try {
      this.server.to(sessionId).emit('restore-progress', progressData);
      this.logger.debug(`Progress emitted for session ${sessionId}: ${progressData.progress}%`);
    } catch (error) {
      this.logger.error('Error emitting progress:', error);
    }
  }

  emitStatus(sessionId: string, statusData: RestoreStatusEvent) {
    try {
      this.server.to(sessionId).emit('restore-status', statusData);
      this.logger.log(`Status emitted for session ${sessionId}: ${statusData.status}`);
    } catch (error) {
      this.logger.error('Error emitting status:', error);
    }
  }

  emitError(sessionId: string, error: string, details?: any) {
    try {
      const errorData = {
        sessionId,
        error,
        details,
        timestamp: new Date().toISOString(),
      };
      this.server.to(sessionId).emit('restore-error', errorData);
      this.logger.error(`Error emitted for session ${sessionId}: ${error}`);
    } catch (err) {
      this.logger.error('Error emitting error:', err);
    }
  }

  emitCompletion(sessionId: string, result: any) {
    try {
      const completionData = {
        sessionId,
        result,
        completed: true,
        timestamp: new Date().toISOString(),
      };
      this.server.to(sessionId).emit('restore-completed', completionData);
      this.logger.log(`Completion emitted for session ${sessionId}`);
      
      // Clean up session
      this.activeRestoreSessions.delete(sessionId);
    } catch (error) {
      this.logger.error('Error emitting completion:', error);
    }
  }

  // Utility methods

  isSessionActive(sessionId: string): boolean {
    return this.activeRestoreSessions.has(sessionId);
  }

  getActiveSessionsCount(): number {
    return this.activeRestoreSessions.size;
  }

  getActiveSessions(): string[] {
    return Array.from(this.activeRestoreSessions.keys());
  }

  // Broadcast to all connected admin users
  broadcastToAdmins(event: string, data: any) {
    try {
      this.server.emit(event, data);
      this.logger.debug(`Broadcast to admins: ${event}`);
    } catch (error) {
      this.logger.error('Error broadcasting to admins:', error);
    }
  }

  // Send notification to specific user
  notifyUser(userId: string, event: string, data: any) {
    try {
      const socketId = this.userSockets.get(userId);
      if (socketId) {
        this.server.to(socketId).emit(event, data);
        this.logger.debug(`Notification sent to user ${userId}: ${event}`);
      }
    } catch (error) {
      this.logger.error('Error notifying user:', error);
    }
  }
}