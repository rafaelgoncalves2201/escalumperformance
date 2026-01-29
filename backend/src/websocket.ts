import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import prisma from './config/database.js';

export function setupWebSocket(io: Server) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Token não fornecido'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { businessId: string };
      
      const business = await prisma.business.findUnique({
        where: { id: decoded.businessId },
      });

      if (!business || !business.active) {
        return next(new Error('Negócio não encontrado ou inativo'));
      }

      socket.data.businessId = business.id;
      next();
    } catch (error) {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    const businessId = socket.data.businessId;

    // Entrar na sala do negócio
    socket.join(`business:${businessId}`);

    console.log(`Cliente conectado: ${businessId}`);

    // Entrar na sala de um pedido específico (para clientes acompanharem)
    socket.on('join-order', (orderId: string) => {
      socket.join(`order:${orderId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Cliente desconectado: ${businessId}`);
    });
  });
}
