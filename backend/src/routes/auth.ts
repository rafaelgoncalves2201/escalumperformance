import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../config/database.js';

export const router = Router();

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Registro de novo negócio
router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);

    // Verificar se email ou slug já existem
    const existing = await prisma.business.findFirst({
      where: {
        OR: [
          { email: data.email },
          { slug: data.slug }
        ]
      }
    });

    if (existing) {
      return res.status(400).json({ 
        error: existing.email === data.email 
          ? 'Email já cadastrado' 
          : 'Slug já está em uso' 
      });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const business = await prisma.business.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        slug: data.slug,
      },
      select: {
        id: true,
        name: true,
        email: true,
        slug: true,
        active: true,
      }
    });

    const token = jwt.sign(
      { businessId: business.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      business,
      token,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);

    const business = await prisma.business.findUnique({
      where: { email: data.email },
    });

    if (!business) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    const validPassword = await bcrypt.compare(data.password, business.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    const token = jwt.sign(
      { businessId: business.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      business: {
        id: business.id,
        name: business.name,
        email: business.email,
        slug: business.slug,
        active: business.active,
      },
      token,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// Verificar token
router.get('/me', async (req, res) => {
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
        active: true,
      }
    });

    if (!business) {
      return res.status(401).json({ error: 'Negócio não encontrado' });
    }

    res.json({ business });
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
});
