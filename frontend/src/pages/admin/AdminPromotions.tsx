import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, ArrowLeft, Percent } from 'lucide-react';

interface Promotion {
  id: string;
  name: string;
  description: string | null;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minOrderValue: number | null;
  validFrom: string | null;
  validUntil: string | null;
  active: boolean;
  order: number;
  createdAt: string;
}

export default function AdminPromotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
    discountValue: '',
    minOrderValue: '',
    validFrom: '',
    validUntil: '',
    active: true,
    order: 0,
  });

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    try {
      const response = await api.get('/promotions');
      setPromotions(response.data);
      setLoading(false);
    } catch (error) {
      toast.error('Erro ao carregar promoções');
      setLoading(false);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('pt-BR');
  };

  const formatDiscount = (p: Promotion) => {
    if (p.discountType === 'PERCENTAGE') {
      return `${Number(p.discountValue)}%`;
    }
    return `R$ ${Number(p.discountValue).toFixed(2).replace('.', ',')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      description: formData.description || undefined,
      discountType: formData.discountType,
      discountValue: parseFloat(formData.discountValue) || 0,
      minOrderValue: formData.minOrderValue ? parseFloat(formData.minOrderValue) : null,
      validFrom: formData.validFrom ? new Date(formData.validFrom).toISOString() : null,
      validUntil: formData.validUntil ? new Date(formData.validUntil).toISOString() : null,
      active: formData.active,
      order: formData.order,
    };
    try {
      if (editingPromotion) {
        await api.put(`/promotions/${editingPromotion.id}`, payload);
        toast.success('Promoção atualizada!');
      } else {
        await api.post('/promotions', payload);
        toast.success('Promoção criada!');
      }
      setShowModal(false);
      resetForm();
      loadPromotions();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar promoção');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta promoção?')) return;
    try {
      await api.delete(`/promotions/${id}`);
      toast.success('Promoção excluída!');
      loadPromotions();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao excluir promoção');
    }
  };

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      name: promotion.name,
      description: promotion.description || '',
      discountType: promotion.discountType,
      discountValue: String(promotion.discountValue),
      minOrderValue: promotion.minOrderValue != null ? String(promotion.minOrderValue) : '',
      validFrom: promotion.validFrom ? promotion.validFrom.slice(0, 10) : '',
      validUntil: promotion.validUntil ? promotion.validUntil.slice(0, 10) : '',
      active: promotion.active,
      order: promotion.order,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingPromotion(null);
    setFormData({
      name: '',
      description: '',
      discountType: 'PERCENTAGE',
      discountValue: '',
      minOrderValue: '',
      validFrom: '',
      validUntil: '',
      active: true,
      order: 0,
    });
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
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-primary hover:text-primary-light">
              <ArrowLeft size={24} />
            </Link>
            <h1 className="text-3xl font-bold">Promoções</h1>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-primary hover:bg-primary-light px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2"
          >
            <Plus size={20} />
            Nova Promoção
          </button>
        </div>

        <div className="bg-gray-900 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-4 text-left">Nome</th>
                <th className="px-6 py-4 text-left">Desconto</th>
                <th className="px-6 py-4 text-left">Pedido mín.</th>
                <th className="px-6 py-4 text-left">Válida de</th>
                <th className="px-6 py-4 text-left">Válida até</th>
                <th className="px-6 py-4 text-left">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {promotions.map((promotion) => (
                <tr key={promotion.id} className="border-t border-gray-800 hover:bg-gray-800">
                  <td className="px-6 py-4">
                    <div className="font-semibold">{promotion.name}</div>
                    {promotion.description && (
                      <div className="text-sm text-gray-400 line-clamp-1">{promotion.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">{formatDiscount(promotion)}</td>
                  <td className="px-6 py-4">
                    {promotion.minOrderValue != null
                      ? `R$ ${Number(promotion.minOrderValue).toFixed(2).replace('.', ',')}`
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-400">{formatDate(promotion.validFrom)}</td>
                  <td className="px-6 py-4 text-gray-400">{formatDate(promotion.validUntil)}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs ${
                        promotion.active ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    >
                      {promotion.active ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(promotion)}
                        className="p-2 bg-primary hover:bg-primary-light rounded transition"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(promotion.id)}
                        className="p-2 bg-red-600 hover:bg-red-700 rounded transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {promotions.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              Nenhuma promoção cadastrada. Clique em &quot;Nova Promoção&quot; para criar.
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Percent size={28} />
              {editingPromotion ? 'Editar Promoção' : 'Nova Promoção'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nome *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Ex: 10% no segundo item"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Texto que aparece para o cliente"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tipo de desconto *</label>
                <select
                  value={formData.discountType}
                  onChange={(e) =>
                    setFormData({ ...formData, discountType: e.target.value as 'PERCENTAGE' | 'FIXED' })
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                >
                  <option value="PERCENTAGE">Porcentagem (%)</option>
                  <option value="FIXED">Valor fixo (R$)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Valor do desconto * {formData.discountType === 'PERCENTAGE' ? '(ex: 10)' : '(ex: 5,00)'}
                </label>
                <input
                  type="number"
                  step={formData.discountType === 'PERCENTAGE' ? 1 : 0.01}
                  min={0}
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Pedido mínimo (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={formData.minOrderValue}
                  onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
                  placeholder="Opcional"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                />
                <p className="text-xs text-gray-400 mt-1">Deixe vazio se não houver valor mínimo.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Válida de</label>
                  <input
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Válida até</label>
                  <input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Ordem (exibição)</label>
                <input
                  type="number"
                  min={0}
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
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
                <label htmlFor="active" className="text-sm">
                  Promoção ativa
                </label>
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 py-2 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button type="submit" className="flex-1 bg-primary hover:bg-primary-light py-2 rounded-lg transition">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
