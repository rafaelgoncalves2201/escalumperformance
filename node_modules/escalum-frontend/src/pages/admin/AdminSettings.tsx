import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Upload, Save, Trash2 } from 'lucide-react';

interface Business {
  id: string;
  name: string;
  logo: string | null;
  menuBannerImage: string | null;
  menuWallpaperImage: string | null;
  menuPrimaryColor: string | null;
  menuBackgroundColor: string | null;
  menuTextColor: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  active: boolean;
  openingHours: any;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  deliveryFee: number;
  avgPrepTime: number;
  mercadoPagoToken: string | null;
}

export default function AdminSettings() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    active: true,
    deliveryEnabled: true,
    pickupEnabled: true,
    deliveryFee: '',
    avgPrepTime: '',
    mercadoPagoToken: '',
    menuPrimaryColor: '#1323FD',
    menuBackgroundColor: '#0a0a1a',
    menuTextColor: '#FFFFFF',
  });

  useEffect(() => {
    loadBusiness();
  }, []);

  const loadBusiness = async () => {
    try {
      const response = await api.get('/business');
      const data = response.data;
      setBusiness(data);
      setFormData({
        name: data.name || '',
        phone: data.phone || '',
        address: data.address || '',
        active: data.active,
        deliveryEnabled: data.deliveryEnabled,
        pickupEnabled: data.pickupEnabled,
        deliveryFee: data.deliveryFee?.toString() || '',
        avgPrepTime: data.avgPrepTime?.toString() || '',
        mercadoPagoToken: data.mercadoPagoToken || '',
        menuPrimaryColor: data.menuPrimaryColor || '#1323FD',
        menuBackgroundColor: data.menuBackgroundColor || '#0a0a1a',
        menuTextColor: data.menuTextColor || '#FFFFFF',
      });
      setLoading(false);
    } catch (error) {
      toast.error('Erro ao carregar configurações');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/business', {
        ...formData,
        deliveryFee: parseFloat(formData.deliveryFee) || 0,
        avgPrepTime: parseInt(formData.avgPrepTime) || 30,
      });
      toast.success('Configurações salvas!');
      loadBusiness();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveWallpaper = async () => {
    try {
      await api.delete('/business/menu/wallpaper');
      toast.success('Wallpaper removido!');
      loadBusiness();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao remover wallpaper');
    }
  };


  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('logo', file);
      await api.post('/business/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Logo atualizada!');
      loadBusiness();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao fazer upload');
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('banner', file);
      await api.post('/business/menu/banner', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Banner atualizado!');
      loadBusiness();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao fazer upload do banner');
    }
  };

  const handleWallpaperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('wallpaper', file);
      await api.post('/business/menu/wallpaper', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Wallpaper atualizado!');
      loadBusiness();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao fazer upload do wallpaper');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/admin" className="text-primary hover:text-primary-light">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-3xl font-bold">Configurações</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo */}
          <div className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Logo</h2>
            <div className="flex items-center gap-6">
              {business?.logo && (
                <img
                  src={`http://localhost:3001${business.logo}`}
                  alt="Logo"
                  className="w-24 h-24 rounded-lg object-cover object-center ring-2 ring-primary/50"
                  loading="eager"
                  decoding="async"
                />
              )}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <span className="bg-primary hover:bg-primary-light px-6 py-3 rounded-lg transition inline-flex items-center gap-2">
                  <Upload size={18} />
                  {business?.logo ? 'Trocar Logo' : 'Enviar Logo'}
                </span>
              </label>
            </div>
          </div>

          {/* Informações Básicas */}
          <div className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Informações Básicas</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nome do Negócio *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Telefone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Endereço</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-primary bg-gray-800 border-gray-700 rounded focus:ring-primary"
                />
                <label htmlFor="active" className="text-sm">Negócio Ativo</label>
              </div>
            </div>
          </div>

          {/* Configurações de Pedido */}
          <div className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Configurações de Pedido</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="deliveryEnabled"
                  checked={formData.deliveryEnabled}
                  onChange={(e) => setFormData({ ...formData, deliveryEnabled: e.target.checked })}
                  className="w-4 h-4 text-primary bg-gray-800 border-gray-700 rounded focus:ring-primary"
                />
                <label htmlFor="deliveryEnabled" className="text-sm">Habilitar Delivery</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pickupEnabled"
                  checked={formData.pickupEnabled}
                  onChange={(e) => setFormData({ ...formData, pickupEnabled: e.target.checked })}
                  className="w-4 h-4 text-primary bg-gray-800 border-gray-700 rounded focus:ring-primary"
                />
                <label htmlFor="pickupEnabled" className="text-sm">Habilitar Retirada</label>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Taxa de Entrega (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.deliveryFee}
                  onChange={(e) => setFormData({ ...formData, deliveryFee: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tempo Médio de Preparação (minutos)</label>
                <input
                  type="number"
                  min="1"
                  value={formData.avgPrepTime}
                  onChange={(e) => setFormData({ ...formData, avgPrepTime: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Personalização do Menu */}
          <div className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Personalização do Menu</h2>

            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Cor primária</label>
                  <input
                    type="color"
                    value={formData.menuPrimaryColor}
                    onChange={(e) => setFormData({ ...formData, menuPrimaryColor: e.target.value })}
                    className="h-10 w-full bg-gray-800 border border-gray-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Fundo</label>
                  <input
                    type="color"
                    value={formData.menuBackgroundColor}
                    onChange={(e) => setFormData({ ...formData, menuBackgroundColor: e.target.value })}
                    className="h-10 w-full bg-gray-800 border border-gray-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Texto</label>
                  <input
                    type="color"
                    value={formData.menuTextColor}
                    onChange={(e) => setFormData({ ...formData, menuTextColor: e.target.value })}
                    className="h-10 w-full bg-gray-800 border border-gray-700 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Banner do Menu</h3>
                  {business?.menuBannerImage && (
                    <img
                      src={`http://localhost:3001${business.menuBannerImage}`}
                      alt="Banner"
                      className="w-full h-32 rounded-lg object-cover mb-3"
                    />
                  )}
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
                    <span className="bg-primary hover:bg-primary-light px-6 py-3 rounded-lg transition inline-flex items-center gap-2">
                      <Upload size={18} />
                      {business?.menuBannerImage ? 'Trocar banner' : 'Enviar banner'}
                    </span>
                  </label>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Wallpaper (fundo)</h3>
                  {business?.menuWallpaperImage && (
                    <>
                      <img
                        src={`http://localhost:3001${business.menuWallpaperImage}`}
                        alt="Wallpaper"
                        className="w-full h-32 rounded-lg object-cover object-center mb-3 ring-2 ring-white/10"
                        loading="lazy"
                        decoding="async"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveWallpaper}
                        className="mb-3 w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-700/50 transition"
                      >
                        <Trash2 size={18} />
                        Remover wallpaper
                      </button>
                    </>
                  )}
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={handleWallpaperUpload} />
                    <span className="bg-primary hover:bg-primary-light px-6 py-3 rounded-lg transition inline-flex items-center gap-2">
                      <Upload size={18} />
                      {business?.menuWallpaperImage ? 'Trocar wallpaper' : 'Enviar wallpaper'}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Mercado Pago */}
          <div className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Integração Mercado Pago</h2>
            <div>
              <label className="block text-sm font-medium mb-2">Access Token do Estabelecimento</label>
              <input
                type="text"
                value={formData.mercadoPagoToken}
                onChange={(e) => setFormData({ ...formData, mercadoPagoToken: e.target.value })}
                placeholder="Seu Access Token do Mercado Pago"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
              />
              <div className="mt-3 space-y-2 text-sm text-gray-400">
                <p>
                  <strong className="text-white">Importante:</strong> Cada estabelecimento deve usar seu próprio Access Token do Mercado Pago.
                </p>
                <p>
                  Os pagamentos serão creditados diretamente na conta do Mercado Pago associada a este token.
                </p>
                <p>
                  Obtenha seu Access Token em:{' '}
                  <a
                    href="https://www.mercadopago.com.br/developers/panel"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary-light underline"
                  >
                    https://www.mercadopago.com.br/developers/panel
                  </a>
                </p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-primary hover:bg-primary-light py-3 rounded-lg font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save size={20} />
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </form>
      </div>
    </div>
  );
}
