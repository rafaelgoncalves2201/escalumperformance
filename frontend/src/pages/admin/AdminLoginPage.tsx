import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      toast.success('Login realizado com sucesso!');
      navigate('/admin');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer login');
    }
  };

  return (
    <div className="min-h-screen min-h-dvh bg-gradient-login bg-fixed bg-cover flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="/logo-desenvolvedor.png"
            alt="Escalum"
            className="h-16 w-auto mx-auto object-contain opacity-90 mb-4"
          />
          <p className="text-gray-400 text-sm">Área Administrativa</p>
        </div>
        <div className="bg-gradient-card-login rounded-xl p-8 shadow-xl border border-gray-700/30">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-gradient-input border border-gray-600/50 rounded-lg px-4 py-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-gradient-input border border-gray-600/50 rounded-lg px-4 py-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-btn-login hover:opacity-90 text-gray-200 py-3 rounded-lg font-semibold transition disabled:opacity-50 shadow-lg"
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
          <p className="text-center text-gray-400 mt-6 text-sm">
            Não tem uma conta?{' '}
            <Link to="/admin/register" className="text-gray-300 hover:text-gray-200 underline">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
