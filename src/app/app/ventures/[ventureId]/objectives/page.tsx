'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function ObjectivesPage() {
  const router = useRouter();
  const params = useParams();
  const ventureId = params.ventureId as string;
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 1,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Verify auth by fetching objectives
        const response = await fetch(`/api/objectives?ventureId=${ventureId}`);
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        if (response.ok) {
          setUser({ authenticated: true });
          const data = await response.json();
          setObjectives(data);
        }
      } catch (error) {
        console.error('Error during auth check:', error);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router, ventureId]);

  if (loading) return <div>Cargando...</div>;
  if (!user) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'priority' ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/objectives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ventureId,
        }),
      });

      if (response.ok) {
        // Reload objectives
        const reloadResponse = await fetch(`/api/objectives?ventureId=${ventureId}`);
        if (reloadResponse.ok) {
          const data = await reloadResponse.json();
          setObjectives(data);
        }
        setFormData({
          title: '',
          description: '',
          dueDate: '',
          priority: 1,
        });
        setShowForm(false);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear objetivo');
    } finally {
      setSubmitting(false);
    }
  };

  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    'on_track': { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e', label: 'En camino' },
    'at_risk': { bg: 'rgba(251, 191, 36, 0.1)', text: '#fbbf24', label: 'En riesgo' },
    'blocked': { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', label: 'Bloqueado' },
    'completed': { bg: 'rgba(100, 116, 139, 0.1)', text: '#64748b', label: 'Completado' },
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      padding: '2rem',
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
        }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 700,
            color: 'var(--ink)',
          }}>
            Objetivos
          </h1>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {showForm ? '✕ Cancelar' : '+ Nuevo Objetivo'}
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <form onSubmit={handleSubmit} style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '2rem',
            marginBottom: '2rem',
            display: 'grid',
            gap: '1.5rem',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)' }}>
                Título del objetivo *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="Ej: Validar con 10 clientes"
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
                Descripción
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Detalles del objetivo"
                rows={3}
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)' }}>
                  Fecha límite
                </label>
                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleChange}
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
                  Prioridad
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--ink)',
                  }}
                >
                  <option value={1}>Alta</option>
                  <option value={2}>Media</option>
                  <option value={3}>Baja</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Creando...' : 'Crear Objetivo'}
            </button>
          </form>
        )}

        {/* Objectives List */}
        {objectives.length === 0 ? (
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '3rem',
            textAlign: 'center',
          }}>
            <p style={{ color: 'var(--ink-2)' }}>
              Sin objetivos aún. {!showForm && <span onClick={() => setShowForm(true)} style={{ cursor: 'pointer', color: 'var(--accent)', fontWeight: 600 }}>Crea uno →</span>}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {objectives.map(obj => {
              const statusInfo = statusColors[obj.status] || statusColors['on_track'];
              return (
                <div
                  key={obj.id}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <h3 style={{
                      fontSize: '1.125rem',
                      fontWeight: 700,
                      color: 'var(--ink)',
                      marginBottom: '0.5rem',
                    }}>
                      {obj.title}
                    </h3>
                    {obj.description && (
                      <p style={{
                        color: 'var(--ink-2)',
                        fontSize: '0.95rem',
                        lineHeight: '1.5',
                        marginBottom: '0.75rem',
                      }}>
                        {obj.description}
                      </p>
                    )}
                    {obj.dueDate && (
                      <p style={{
                        color: 'var(--ink-3)',
                        fontSize: '0.875rem',
                      }}>
                        Vence: {new Date(obj.dueDate).toLocaleDateString('es')}
                      </p>
                    )}
                  </div>

                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '0.75rem',
                  }}>
                    <div style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      background: statusInfo.bg,
                      color: statusInfo.text,
                      fontSize: '0.875rem',
                      fontWeight: 600,
                    }}>
                      {statusInfo.label}
                    </div>
                    {obj._count?.signals > 0 && (
                      <div style={{
                        fontSize: '0.875rem',
                        color: 'var(--ink-2)',
                      }}>
                        {obj._count.signals} señal{obj._count.signals !== 1 ? 'es' : ''}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
