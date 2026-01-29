import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import prisma from '../config/database.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

export const router = Router();
router.use(authenticate);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar upload
const uploadDir = path.join(__dirname, '../../uploads/products');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${(req as AuthRequest).businessId}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas'));
    }
  }
});

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  categoryId: z.string().uuid(),
  active: z.boolean().optional(),
  order: z.number().int().optional(),
});

const updateSchema = createSchema.partial();

// Listar produtos
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { categoryId } = req.query;

    const products = await prisma.product.findMany({
      where: {
        businessId: req.businessId,
        ...(categoryId && { categoryId: categoryId as string })
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
    });

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar produtos' });
  }
});

// Criar produto
router.post('/', async (req: AuthRequest, res) => {
  try {
    const data = createSchema.parse(req.body);

    // Verificar se a categoria pertence ao negócio
    const category = await prisma.category.findFirst({
      where: {
        id: data.categoryId,
        businessId: req.businessId
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    const product = await prisma.product.create({
      data: {
        ...data,
        businessId: req.businessId!,
        price: data.price,
        active: data.active ?? true,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    res.status(201).json(product);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    res.status(500).json({ error: 'Erro ao criar produto' });
  }
});

// Atualizar produto
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const data = updateSchema.parse(req.body);

    // Verificar se o produto pertence ao negócio
    const existing = await prisma.product.findFirst({
      where: {
        id,
        businessId: req.businessId
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    // Se estiver atualizando categoria, verificar se pertence ao negócio
    if (data.categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: data.categoryId,
          businessId: req.businessId
        }
      });

      if (!category) {
        return res.status(404).json({ error: 'Categoria não encontrada' });
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...data,
        price: data.price !== undefined ? data.price : undefined,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    res.json(product);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
});

// Deletar produto
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.product.findFirst({
      where: {
        id,
        businessId: req.businessId
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    // Deletar imagem se existir
    if (existing.image) {
      const imagePath = path.join(__dirname, '../../uploads', existing.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await prisma.product.delete({
      where: { id }
    });

    res.json({ message: 'Produto deletado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar produto' });
  }
});

// Upload de imagem do produto
router.post('/:id/image', upload.single('image'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    }

    const product = await prisma.product.findFirst({
      where: {
        id,
        businessId: req.businessId
      }
    });

    if (!product) {
      // Deletar arquivo enviado
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    // Deletar imagem antiga se existir
    if (product.image) {
      const oldImagePath = path.join(__dirname, '../../uploads', product.image);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    const imagePath = `/uploads/products/${req.file.filename}`;

    const updated = await prisma.product.update({
      where: { id },
      data: { image: imagePath },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao fazer upload da imagem' });
  }
});
