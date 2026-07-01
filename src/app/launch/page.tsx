'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LaunchPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    ventureName: '',
    sector: '',
    stage: 'validation',
    monthlyRevenue: '',
    mainNeed: '',
    interestedInBeta: false,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setMessage({
          type: 'success',
          text: '¡Gracias! Te hemos agregado a la lista de espera. Pronto nos contactaremos.',
        });
        setFormData({
          name: '',
          email: '',
          phone: '',
          city: '',
          ventureName: '',
          sector: '',
          stage: 'validation',
          monthlyRevenue: '',
          mainNeed: '',
          interestedInBeta: false,
        });
      } else {
        setMessage({
          type: 'error',
          text: 'Hubo un error. Por favor intenta de nuevo.',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Error de conexión. Por favor intenta de nuevo.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--bg) 0%, var(--bg-2) 100%)',
      padding: '2rem',
    }}>
      {/* Header */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        marginBottom: '4rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <span style={{ fontSize: '1.2rem' }}>◈</span> VELA
        </div>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <Link href="/login" style={{
            color: 'var(--ink-2)',
            textDecoration: 'none',
            fontSize: '0.875rem',
            transition: 'color 0.2s',
          }}>
            Inicia sesión
          </Link>
          <Link href="/signup" style={{
            color: 'var(--accent)',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}>
            Crea una cuenta
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <div style={{
        maxWidth: '900px',
        margin: '0 auto 5rem',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontSize: 'clamp(2rem, 8vw, 3.5rem)',
          fontWeight: 900,
          letterSpacing: '-0.04em',
          color: 'var(--ink)',
          lineHeight: 1.1,
          marginBottom: '1.5rem',
        }}>
          Conoce el estado real de tu emprendimiento
        </h1>
        
        <p style={{
          fontSize: '1.125rem',
          color: 'var(--ink-2)',
          lineHeight: 1.8,
          marginBottom: '2rem',
          maxWidth: '600px',
          margin: '0 auto 2rem',
        }}>
          VELA analiza tu negocio con inteligencia artificial, identifica fortalezas, riesgos y oportunidades, y te entrega un plan de acción adaptado a tu realidad.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1rem',
          maxWidth: '600px',
          margin: '2rem auto',
          fontSize: '0.875rem',
          color: 'var(--ink-2)',
        }}>
          <div>✓ Diagnóstico en 6 dimensiones</div>
          <div>✓ Análisis con IA</div>
          <div>✓ Ruta de crecimiento personalizada</div>
          <div>✓ Seguimiento de objetivos</div>
        </div>
      </div>

      {/* Form Section */}
      <div style={{
        maxWidth: '500px',
        margin: '0 auto',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '2.5rem',
      }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: 'var(--ink)',
          marginBottom: '2rem',
        }}>
          Únete a la lista de espera
        </h2>

        {message && (
          <div style={{
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            backgroundColor: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            borderLeft: `4px solid ${message.type === 'success' ? '#22c55e' : '#ef4444'}`,
            color: message.type === 'success' ? '#16a34a' : '#dc2626',
            fontSize: '0.875rem',
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.25rem' }}>
          {/* Row 1: Name & Email */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)' }}>
                Nombre
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Tu nombre"
                style={{
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--ink)',
                  fontSize: '0.875rem',
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)' }}>
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="tu@email.com"
                style={{
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--ink)',
                  fontSize: '0.875rem',
                }}
              />
            </div>
          </div>

          {/* Phone & City */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)' }}>
                Teléfono
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+57..."
                style={{
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--ink)',
                  fontSize: '0.875rem',
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)' }}>
                Ciudad
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="Tu ciudad"
                style={{
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--ink)',
                  fontSize: '0.875rem',
                }}
              />
            </div>
          </div>

          {/* Venture & Sector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)' }}>
                Nombre del emprendimiento
              </label>
              <input
                type="text"
                name="ventureName"
                value={formData.ventureName}
                onChange={handleChange}
                required
                placeholder="Nombre del negocio"
                style={{
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--ink)',
                  fontSize: '0.875rem',
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)' }}>
                Sector
              </label>
              <input
                type="text"
                name="sector"
                value={formData.sector}
                onChange={handleChange}
                placeholder="Ej: Tecnología"
                style={{
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--ink)',
                  fontSize: '0.875rem',
                }}
              />
            </div>
          </div>

          {/* Stage & Revenue */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)' }}>
                Etapa del negocio
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
                  fontSize: '0.875rem',
                }}
              >
                <option value="idea">Idea</option>
                <option value="validation">Validación</option>
                <option value="traction">Tracción</option>
                <option value="growth">Crecimiento</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)' }}>
                Ingresos mensuales aprox.
              </label>
              <input
                type="number"
                name="monthlyRevenue"
                value={formData.monthlyRevenue}
                onChange={handleChange}
                placeholder="0"
                style={{
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--ink)',
                  fontSize: '0.875rem',
                }}
              />
            </div>
          </div>

          {/* Main Need */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)' }}>
              ¿Cuál es tu principal necesidad?
            </label>
            <textarea
              name="mainNeed"
              value={formData.mainNeed}
              onChange={handleChange}
              placeholder="Ej: Necesito claridad sobre mi modelo de negocio"
              rows={3}
              style={{
                padding: '0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--ink)',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Checkbox */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.875rem',
            color: 'var(--ink-2)',
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              name="interestedInBeta"
              checked={formData.interestedInBeta}
              onChange={handleChange}
              style={{
                width: '1rem',
                height: '1rem',
                cursor: 'pointer',
              }}
            />
            Quiero participar en el programa beta
          </label>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '1rem',
              borderRadius: '8px',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? 'Registrando...' : 'Únete a la lista de espera'}
          </button>

          {/* Footer text */}
          <p style={{
            fontSize: '0.75rem',
            color: 'var(--ink-3)',
            textAlign: 'center',
            marginTop: '1rem',
          }}>
            Al registrarte, aceptas recibir actualizaciones de VELA sobre el programa beta.
          </p>
        </form>
      </div>

      {/* Benefits Section */}
      <div style={{
        maxWidth: '1200px',
        margin: '6rem auto 0',
        paddingTop: '4rem',
        borderTop: '1px solid var(--border)',
      }}>
        <h2 style={{
          fontSize: '1.75rem',
          fontWeight: 700,
          color: 'var(--ink)',
          marginBottom: '3rem',
          textAlign: 'center',
        }}>
          ¿Cómo funciona VELA?
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '2rem',
        }}>
          {[
            {
              num: '1',
              title: 'Diagnóstico',
              desc: 'Responde un cuestionario sobre tu negocio en 6 dimensiones clave.',
            },
            {
              num: '2',
              title: 'Análisis con IA',
              desc: 'Nuestro sistema analiza tu información y genera recomendaciones personalizadas.',
            },
            {
              num: '3',
              title: 'Plan de Acción',
              desc: 'Recibe una ruta clara de 30, 60 y 90 días para crecer.',
            },
            {
              num: '4',
              title: 'Seguimiento',
              desc: 'Crea objetivos, registra avances y recibe recomendaciones periódicas.',
            },
          ].map(item => (
            <div key={item.num} style={{
              padding: '2rem',
              background: 'var(--bg-surface)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
            }}>
              <div style={{
                fontSize: '2rem',
                fontWeight: 900,
                color: 'var(--accent)',
                marginBottom: '1rem',
              }}>
                {item.num}
              </div>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: 'var(--ink)',
                marginBottom: '0.75rem',
              }}>
                {item.title}
              </h3>
              <p style={{
                color: 'var(--ink-2)',
                lineHeight: 1.6,
                fontSize: '0.95rem',
              }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
