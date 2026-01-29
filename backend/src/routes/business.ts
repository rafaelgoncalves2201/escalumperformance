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

// Configurar upload - logos
const uploadDir = app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));
const menuUploadDir = path.join(__dirname, '../../uploads/menu');
[uploadDir, menuUploadDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${(req as AuthRequest).businessId}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const menuStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, menuUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${(req as AuthRequest).businessId}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) cb(null, true);
  else cb(new Error('Apenas imagens são permitidas'));
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter,
});

const menuUpload = multer({
  storage: menuStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

// Obter dados do negócio
router.get('/', async (req: AuthRequest, res) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.businessId },
      select: {
        id: true,
        name: true,
        logo: true,
        slug: true,
        email: true,
        phone: true,
        address: true,
        active: true,
        openingHours: true,
        deliveryEnabled: true,
        pickupEnabled: true,
        deliveryFee: true,
        avgPrepTime: true,
        mercadoPagoToken: true,
        menuBannerImage: true,
        menuWallpaperImage: true,
        menuPrimaryColor: true,
        menuBackgroundColor: true,
        menuTextColor: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    res.json(business);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar dados do negócio' });
  }
});

// Atualizar dados do negócio
const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  active: z.boolean().optional(),
  openingHours: z.any().optional(),
  deliveryEnabled: z.boolean().optional(),
  pickupEnabled: z.boolean().optional(),
  deliveryFee: z.number().min(0).optional(),
  avgPrepTime: z.number().min(1).optional(),
  mercadoPagoToken: z.string().optional(),
  menuPrimaryColor: z.string().optional(),
  menuBackgroundColor: z.string().optional(),
  menuTextColor: z.string().optional(),
});

router.put('/', async (req: AuthRequest, res) => {
  try {
    const data = updateSchema.parse(req.body);

    const business = await prisma.business.update({
      where: { id: req.businessId },
      data: {
        ...data,
        deliveryFee: data.deliveryFee !== undefined ? data.deliveryFee : undefined,
      },
      select: {
        id: true,
        name: true,
        logo: true,
        slug: true,
        email: true,
        phone: true,
        address: true,
        active: true,
        openingHours: true,
        deliveryEnabled: true,
        pickupEnabled: true,
        deliveryFee: true,
        avgPrepTime: true,
        mercadoPagoToken: true,
        menuBannerImage: true,
        menuWallpaperImage: true,
        menuPrimaryColor: true,
        menuBackgroundColor: true,
        menuTextColor: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    res.json(business);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    res.status(500).json({ error: 'Erro ao atualizar negócio' });
  }
});

// Upload de logo
router.post('/logo', upload.single('logo'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    }

    const business = await prisma.business.findUnique({
      where: { id: req.businessId },
    });

    // Deletar logo antiga se existir
    if (business?.logo) {
      const relativePath = business.logo.replace(/^\/uploads\//, ''); // "logos/xxx.jpg"
      const oldLogoPath = path.join(__dirname, '../../uploads', relativePath);
      if (fs.existsSync(oldLogoPath)) fs.unlinkSync(oldLogoPath);
      }
    }

    const logoPath = `/uploads/logos/${req.file.filename}`;

    const updated = await prisma.business.update({
      where: { id: req.businessId },
      data: { logo: logoPath },
      select: {
        id: true,
        logo: true,
      }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao fazer upload da logo' });
  }
});

// --- Menu: banner e wallpaper ---
router.post('/menu/banner', menuUpload.single('banner'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    }
    const business = await prisma.business.findUnique({ where: { id: req.businessId } });
    if (business?.menuBannerImage) {
      const oldPath = path.join(__dirname, '../..', business.menuBannerImage);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    const filePath = `/uploads/menu/${req.file.filename}`;
    await prisma.business.update({
      where: { id: req.businessId },
      data: { menuBannerImage: filePath },
    });
    res.json({ menuBannerImage: filePath });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao fazer upload do banner' });
  }
});

router.delete('/menu/banner', async (req: AuthRequest, res) => {
  try {
    const business = await prisma.business.findUnique({ where: { id: req.businessId } });
    if (business?.menuBannerImage) {
      const oldPath = path.join(__dirname, '../..', business.menuBannerImage);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    await prisma.business.update({
      where: { id: req.businessId },
      data: { menuBannerImage: null },
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover banner' });
  }
});

router.post('/menu/wallpaper', menuUpload.single('wallpaper'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    }
    const business = await prisma.business.findUnique({ where: { id: req.businessId } });
    if (business?.menuWallpaperImage) {
      const oldPath = path.join(__dirname, '../..', business.menuWallpaperImage);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    const filePath = `/uploads/menu/${req.file.filename}`;
    await prisma.business.update({
      where: { id: req.businessId },
      data: { menuWallpaperImage: filePath },
    });
    res.json({ menuWallpaperImage: filePath });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao fazer upload do wallpaper' });
  }
});

router.delete('/menu/wallpaper', async (req: AuthRequest, res) => {
  try {
    const business = await prisma.business.findUnique({ where: { id: req.businessId } });
    if (business?.menuWallpaperImage) {
      const oldPath = path.join(__dirname, '../..', business.menuWallpaperImage);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    await prisma.business.update({
      where: { id: req.businessId },
      data: { menuWallpaperImage: null },
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover wallpaper' });
  }
});

// Dashboard - estatísticas
router.get('/dashboard', async (req: AuthRequest, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [ordersToday, revenueToday, pendingOrders, completedOrders] = await Promise.all([
      prisma.order.count({
        where: {
          businessId: req.businessId,
          createdAt: { gte: today }
        }
      }),
      prisma.order.aggregate({
        where: {
          businessId: req.businessId,
          createdAt: { gte: today },
          paymentStatus: 'APPROVED'
        },
        _sum: { total: true }
      }),
      prisma.order.count({
        where: {
          businessId: req.businessId,
          status: { in: ['NEW', 'PREPARING'] }
        }
      }),
      prisma.order.count({
        where: {
          businessId: req.businessId,
          status: 'COMPLETED'
        }
      })
    ]);

    res.json({
      ordersToday,
      revenueToday: revenueToday._sum.total || 0,
      pendingOrders,
      completedOrders,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});
