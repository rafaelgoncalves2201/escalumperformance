import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import prisma from '../config/database.js';

export const router = Router();
router.use(authenticate);

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  order: z.number().int().optional(),
  active: z.boolean().optional(),
});

const updateSchema = createSchema.partial();

// Listar categorias
router.get('/', async (req: AuthRequest, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { businessId: req.businessId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar categorias' });
  }
});

// Criar categoria
router.post('/', async (req: AuthRequest, res) => {
  try {
    const data = createSchema.parse(req.body);

    const category = await prisma.category.create({
      data: {
        ...data,
        businessId: req.businessId!,
        active: data.active ?? true,
      }
    });

    res.status(201).json(category);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
});

// Atualizar categoria
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const data = updateSchema.parse(req.body);

    // Verificar se a categoria pertence ao negócio
    const existing = await prisma.category.findFirst({
      where: {
        id,
        businessId: req.businessId
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    const category = await prisma.category.update({
      where: { id },
      data
    });

    res.json(category);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    res.status(500).json({ error: 'Erro ao atualizar categoria' });
  }
});

// Deletar categoria
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.category.findFirst({
      where: {
        id,
        businessId: req.businessId
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    await prisma.category.delete({
      where: { id }
    });

    res.json({ message: 'Categoria deletada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar categoria' });
  }
});
