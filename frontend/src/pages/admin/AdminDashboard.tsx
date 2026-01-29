import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import { Package, DollarSign, Clock, CheckCircle, LogOut, Settings, ShoppingBag, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

interface DashboardStats {
  ordersToday: number;
  revenueToday: number;
  pendingOrders: number;
  completedOrders: number;
}

export default function AdminDashboard() {
  const { business, logout } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000); // Atualizar a cada 30s
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const response = await api.get('/business/dashboard');
      setStats(response.data);
      setLoading(false);
    } catch (error) {
      toast.error('Erro ao carregar estatísticas');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/admin/login';
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
      {/* Header */}
      <header className="bg-primary sticky top-0 z-40 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Escalum</h1>
              <p className="text-sm text-gray-300">{business?.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/admin/settings"
                className="px-4 py-2 bg-primary-light hover:bg-primary-dark rounded-lg transition"
              >
                <Settings className="inline mr-2" size={18} />
                Configurações
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
              >
                <LogOut className="inline mr-2" size={18} />
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-900 border-b border-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex gap-1">
            <Link
              to="/admin"
              className="px-6 py-4 border-b-2 border-primary text-primary font-semibold"
            >
              Dashboard
            </Link>
            <Link
              to="/admin/orders"
              className="px-6 py-4 border-b-2 border-transparent hover:border-gray-700 transition"
            >
              Pedidos
            </Link>
            <Link
              to="/admin/categories"
              className="px-6 py-4 border-b-2 border-transparent hover:border-gray-700 transition"
            >
              Categorias
            </Link>
            <Link
              to="/admin/products"
              className="px-6 py-4 border-b-2 border-transparent hover:border-gray-700 transition"
            >
              Produtos
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-900 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <Package className="text-primary-light" size={32} />
              <span className="text-3xl font-bold">{stats?.ordersToday || 0}</span>
            </div>
            <p className="text-gray-400">Pedidos Hoje</p>
          </div>

          <div className="bg-gray-900 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="text-green-500" size={32} />
              <span className="text-3xl font-bold">
                R$ {stats?.revenueToday ? Number(stats.revenueToday).toFixed(2).replace('.', ',') : '0,00'}
              </span>
            </div>
            <p className="text-gray-400">Receita Hoje</p>
          </div>

          <div className="bg-gray-900 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <Clock className="text-yellow-500" size={32} />
              <span className="text-3xl font-bold">{stats?.pendingOrders || 0}</span>
            </div>
            <p className="text-gray-400">Pedidos Pendentes</p>
          </div>

          <div className="bg-gray-900 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <CheckCircle className="text-green-500" size={32} />
              <span className="text-3xl font-bold">{stats?.completedOrders || 0}</span>
            </div>
            <p className="text-gray-400">Pedidos Concluídos</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-900 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-6">Ações Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/admin/orders"
              className="bg-primary hover:bg-primary-light p-6 rounded-lg transition text-center"
            >
              <ShoppingBag className="mx-auto mb-2" size={32} />
              <p className="font-semibold">Gerenciar Pedidos</p>
            </Link>
            <Link
              to="/admin/categories"
              className="bg-primary hover:bg-primary-light p-6 rounded-lg transition text-center"
            >
              <Tag className="mx-auto mb-2" size={32} />
              <p className="font-semibold">Gerenciar Categorias</p>
            </Link>
            <Link
              to="/admin/products"
              className="bg-primary hover:bg-primary-light p-6 rounded-lg transition text-center"
            >
              <Package className="mx-auto mb-2" size={32} />
              <p className="font-semibold">Gerenciar Produtos</p>
            </Link>
          </div>
        </div>

        {/* Menu Link */}
        <div className="bg-gray-900 rounded-lg p-6 mt-6">
          <h2 className="text-xl font-bold mb-4">Link do Menu</h2>
          <div className="flex items-center gap-4">
            <input
              type="text"
              readOnly
              value={`${window.location.origin}/menu/${business?.slug}`}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/menu/${business?.slug}`);
                toast.success('Link copiado!');
              }}
              className="bg-primary hover:bg-primary-light px-6 py-2 rounded-lg transition"
            >
              Copiar
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
