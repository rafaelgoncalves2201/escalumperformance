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

// Distância em km entre dois pontos (Haversine)
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

type ViaCepResp = {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

// ViaCEP -> gera query de endereço (fallback)
async function getAddressFromCep(cep: string): Promise<string | null> {
  const normalized = cep.replace(/\D/g, '').slice(0, 8);
  if (normalized.length !== 8) return null;

  const res = await fetch(`https://viacep.com.br/ws/${normalized}/json/`);
  if (!res.ok) return null;

  const data = (await res.json()) as ViaCepResp;
  if (data.erro) return null;

  const parts = [data.logradouro, data.bairro, data.localidade, data.uf, 'Brasil'].filter(Boolean);
  const q = parts.join(', ').trim();
  return q ? q : null;
}

async function geocodeWithNominatim(query: string): Promise<{ lat: number; lon: number } | null> {
  // countrycodes=br ajuda a não devolver coisa errada fora do Brasil
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`;

  const res = await fetch(url, {
    headers: {
      // coloque um nome real do seu app aqui
      'User-Agent': 'escalum/1.0 (delivery calculator)'
    }
  });

  if (!res.ok) return null;

  const data = (await res.json()) as any[];
  if (!data?.length) return null;

  const lat = Number(data[0]?.lat);
  const lon = Number(data[0]?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return { lat, lon };
}

async function getCepCoordinates(cep: string): Promise<{ lat: number; lon: number } | null> {
  const normalized = cep.replace(/\D/g, '').slice(0, 8);
  if (normalized.length !== 8) return null;

  // 1) BrasilAPI (se tiver coords reais)
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${normalized}`);
    if (res.ok) {
      const data: any = await res.json();
      const coords = data?.location?.coordinates;
      if (coords) {
        const lat = Number(coords.latitude);
        const lon = Number(coords.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
      }
    }
  } catch {}

  // 2) Nominatim tentando pelo CEP direto (muitas vezes resolve melhor que logradouro)
  const byPostal = await geocodeWithNominatim(`${normalized}, Brasil`);
  if (byPostal) return byPostal;

  // 3) Fallback ViaCEP + endereço
  const addressQuery = await getAddressFromCep(normalized);
  if (!addressQuery) return null;

  return geocodeWithNominatim(addressQuery);
}

// Calcular taxa e tempo de entrega por CEP (POR KM)
router.get('/:slug/calculate-delivery', async (req, res) => {
  try {
    const slugNorm = String(req.params.slug || '').trim().toLowerCase();
    const cep = String(req.query.cep || '').replace(/\D/g, '').slice(0, 8);

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

    const businessCepNorm = business.businessCep?.replace(/\D/g, '').slice(0, 8) || '';
    const perKm = Number(business.deliveryFeePerKm);

    if (businessCepNorm.length !== 8) {
      return res.status(400).json({ error: 'CEP do estabelecimento inválido/ausente. Configure no admin.' });
    }

    if (!Number.isFinite(perKm) || perKm <= 0) {
      return res.status(400).json({ error: 'Valor por KM inválido. Configure um valor maior que 0 no admin.' });
    }

    // DEBUG (remova depois)
    console.log('[DELIVERY CONFIG]', { slugNorm, businessCepNorm, perKm, customerCep: cep });

    const [businessCoords, customerCoords] = await Promise.all([
      getCepCoordinates(businessCepNorm),
      getCepCoordinates(cep),
    ]);

    console.log('[COORDS]', { businessCoords, customerCoords });

    if (!businessCoords) {
      return res.status(422).json({ error: 'Não foi possível obter coordenadas do CEP do estabelecimento.' });
    }
    if (!customerCoords) {
      return res.status(422).json({ error: 'Não foi possível obter coordenadas do CEP informado.' });
    }

    const distanceKm = haversineKm(
      businessCoords.lat,
      businessCoords.lon,
      customerCoords.lat,
      customerCoords.lon
    );

    console.log('[DIST]', { distanceKm });

    // Taxa final
    const rawFee = distanceKm * perKm;
    const fee = Math.round(rawFee * 100) / 100;

    const estimatedMinutes = business.avgPrepTime || 30;

    return res.json({
      fee,
      estimatedMinutes,
      cep: `${cep.slice(0, 5)}-${cep.slice(5)}`,
      distanceKm: Math.round(distanceKm * 100) / 100,
      perKm, // ajuda debug no front
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao calcular entrega' });
  }
});
