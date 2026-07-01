'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function NewVenturePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    sector: '',
    stage: 'validation',
    description: '',
    yearsOperating: 0,
    teamSize: 1,
    customers: '',
    monthlyRevenue: '',
    monthlyCosts: '',
  });

  // Check auth
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Verify auth by fetching ventures
        const response = await fetch(`/api/ventures`);
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        if (response.ok) {
          setUser({ authenticated: true });
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  if (loading) return <div>Cargando...</div>;
  if (!user) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/ventures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          monthlyRevenue: formData.monthlyRevenue ? parseFloat(formData.monthlyRevenue) : 0,
          monthlyCosts: formData.monthlyCosts ? parseFloat(formData.monthlyCosts) : 0,
        }),
      });

      if (response.ok) {
        const { ventureId } = await response.json();
        router.push(`/app/ventures/${ventureId}/diagnostic`);
      } else {
        alert('Error al crear emprendimiento');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      padding: '2rem',
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 700,
          color: 'var(--ink)',
          marginBottom: '2rem',
        }}>
          Registra tu emprendimiento
        </h1>

        <form onSubmit={handleSubmit} style={{
          display: 'grid',
          gap: '1.5rem',
          background: 'var(--bg-surface)',
          padding: '2rem',
          borderRadius: '12px',
          border: '1px solid var(--border)',
        }}>
          {/* Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)' }}>
              Nombre del emprendimiento *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Nombre del negocio"
              style={{
                padding: '0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--ink)',
              }}
            />
          </div>

          {/* Sector & Stage */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)' }}>
                Sector *
              </label>
              <input
                type="text"
                name="sector"
                value={formData.sector}
                onChange={handleChange}
                required
                placeholder="Ej: Tecnología, Retail"
                style={{
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--ink)',
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)' }}>
                Etapa del negocio *
              </label>
              <select
                name="stage"
                value={formData.stage}
                onChange={handleChange}
                style={{
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--ink)',
                }}
              >
                <option value="idea">Idea</option>
                <option value="validation">Validación</option>
                <option value="traction">Tracción</option>
                <option value="growth">Crecimiento</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)' }}>
              Descripción del negocio
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="¿Qué hace tu emprendimiento? ¿A quién le sirve?"
              rows={4}
              style={{
                padding: '0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--ink)',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Years & Team Size */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)' }}>
                Años en operación
              </label>
              <input
                type="number"
                name="yearsOperating"
                value={formData.yearsOperating}
                onChange={handleChange}
                min="0"
                style={{
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--ink)',
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)' }}>
                Tamaño del equipo
              </label>
              <input
                type="number"
                name="teamSize"
                value={formData.teamSize}
                onChange={handleChange}
                min="1"
                style={{
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--ink)',
                }}
              />
            </div>
          </div>

          {/* Customers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)' }}>
              Descripción de clientes
            </label>
            <textarea
              name="customers"
              value={formData.customers}
              onChange={handleChange}
              placeholder="¿Quiénes son tus clientes? ¿Cuántos tienes?"
              rows={2}
              style={{
                padding: '0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--ink)',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Revenue & Costs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)' }}>
                Ingresos mensuales aprox. (COP)
              </label>
              <input
                type="number"
                name="monthlyRevenue"
                value={formData.monthlyRevenue}
                onChange={handleChange}
                min="0"
                placeholder="0"
                style={{
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--ink)',
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)' }}>
                Costos mensuales aprox. (COP)
              </label>
              <input
                type="number"
                name="monthlyCosts"
                value={formData.monthlyCosts}
                onChange={handleChange}
                min="0"
                placeholder="0"
                style={{
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--ink)',
                }}
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '1rem',
              borderRadius: '8px',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              marginTop: '1rem',
            }}
          >
            {submitting ? 'Creando...' : 'Crear emprendimiento y continuar'}
          </button>
        </form>
      </div>
    </div>
  );
}
