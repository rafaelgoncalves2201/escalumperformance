import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';

export interface AuthRequest extends Request {
  businessId?: string;
  business?: any;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { businessId: string };
    
    const business = await prisma.business.findUnique({
      where: { id: decoded.businessId },
      select: {
        id: true,
        name: true,
        email: true,
        slug: true,
        active: true
      }
    });

    if (!business || !business.active) {
      return res.status(401).json({ error: 'Negócio não encontrado ou inativo' });
    }

    req.businessId = business.id;
    req.business = business;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};
