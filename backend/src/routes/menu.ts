import { Router } from 'express';
import prisma from '../config/database.js';

export const router = Router();

// Obter menu público por slug
router.get('/:slug', async (req, res) => {
  try {
    const slugNorm = String(req.params.slug || '').trim();

    const business = await prisma.business.findFirst({
      where: { slug: slugNorm },
      select: {
        id: true,
        name: true,
        logo: true,
        menuBannerImage: true,
        menuWallpaperImage: true,
        menuPrimaryColor: true,
        menuBackgroundColor: true,
        menuTextColor: true,
        menuSubtitle: true,
        menuOpeningText: true,
        menuMoreInfoLabel: true,
        slug: true,
        phone: true,
        address: true,
        openingHours: true,
        deliveryEnabled: true,
        pickupEnabled: true,
        deliveryFee: true,
        avgPrepTime: true,
      }
    });

    if (!business) {
      return res.status(404).json({ error: 'Menu não encontrado' });
    }

    const categories = await prisma.category.findMany({
      where: {
        businessId: business.id,
        active: true
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: {
        products: {
          where: { active: true },
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            image: true,
          }
        }
      }
    });

    res.json({
      business,
      categories,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar menu' });
  }
});

// Distância em km entre dois pontos (fórmula de Haversine)
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Buscar coordenadas de um CEP via BrasilAPI (v2 retorna location.coordinates)
type BrasilApiCepV2 = {
  location?: {
    coordinates?: {
      latitude: string | number;
      longitude: string | number;
    };
  };
};

async function getCepCoordinates(cep: string): Promise<{ lat: number; lon: number } | null> {
  const normalized = cep.replace(/\D/g, '').slice(0, 8);
  if (normalized.length !== 8) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${normalized}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = (await res.json()) as BrasilApiCepV2;
    const coords = data.location?.coordinates;
    if (!coords) return null;
    const lat = Number(coords.latitude);
    const lon = Number(coords.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon };
  } catch {
    return null;
  }
}

// Calcular taxa e tempo de entrega por CEP
router.get('/:slug/calculate-delivery', async (req, res) => {
  try {
    const slugNorm = String(req.params.slug || '').trim().toLowerCase();
    const cep = String(req.query.cep || '').replace(/\D/g, '');

    if (cep.length !== 8) {
      return res.status(400).json({ error: 'CEP inválido. Informe 8 dígitos.' });
    }

    const business = await prisma.business.findFirst({
      where: { slug: slugNorm, active: true },
      select: {
        deliveryFeePerKm: true,
        businessCep: true,
        avgPrepTime: true,
        deliveryEnabled: true,
      },
    });

    if (!business || !business.deliveryEnabled) {
      return res.status(404).json({ error: 'Delivery não disponível para este estabelecimento.' });
    }

    const businessCepNorm = business.businessCep?.replace(/\D/g, '').slice(0, 8);
    const perKm = business.deliveryFeePerKm;

    const hasPerKm =
      businessCepNorm?.length === 8 &&
      perKm != null &&
      Number(perKm) > 0;

    if (!hasPerKm) {
      return res.status(400).json({
        error: 'Cálculo por KM não configurado. Preencha CEP do estabelecimento (8 dígitos) e Valor por KM (> 0).',
      });
    }

    // ✅ AQUI é o que faltava no seu trecho:
    const [businessCoords, customerCoords] = await Promise.all([
      getCepCoordinates(businessCepNorm!),
      getCepCoordinates(cep),
    ]);

    if (!businessCoords) {
      return res.status(422).json({
        error: 'Não foi possível obter coordenadas do CEP do estabelecimento.'
      });
    }

    if (!customerCoords) {
      return res.status(422).json({
        error: 'Não foi possível obter coordenadas do CEP informado.'
      });
    }

    const distanceKm = haversineKm(
      businessCoords.lat,
      businessCoords.lon,
      customerCoords.lat,
      customerCoords.lon
    );

    const fee = Math.round(distanceKm * Number(perKm) * 100) / 100;
    const estimatedMinutes = business.avgPrepTime || 30;

    return res.json({
      fee,
      estimatedMinutes,
      cep: `${cep.slice(0, 5)}-${cep.slice(5)}`,
      distanceKm: Math.round(distanceKm * 100) / 100,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao calcular entrega' });
  }
});
