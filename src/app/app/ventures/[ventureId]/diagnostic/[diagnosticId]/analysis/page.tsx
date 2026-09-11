'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

type DiagnosticAnalysis = {
  maturityScore: number;
  strengths: string[];
  risks: string[];
  validations?: string[];
  recommendations?: string[];
  days30Plan?: string | null;
  days60Plan?: string | null;
  days90Plan?: string | null;
};

type AnalysisPayload = {
  diagnostic: {
    id: string;
    status: string;
    venture?: { name?: string };
    analysis: DiagnosticAnalysis | null;
  };
  analysis: DiagnosticAnalysis | null;
};

export default function AnalysisPage() {
  const router = useRouter();
  const params = useParams();
  const ventureId = params.ventureId as string;
  const diagnosticId = params.diagnosticId as string;
  const [user, setUser] = useState<{ authenticated: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<AnalysisPayload | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Verificar si el usuario está autenticado intentando obtener el análisis
        const response = await fetch(`/api/ventures/${ventureId}/diagnostics/${diagnosticId}`);
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        if (response.ok) {
          const data = await response.json();
          setAnalysis(data);
          setUser({ authenticated: true });
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router, ventureId, diagnosticId]);

  if (loading) return <div>Cargando...</div>;
  if (!user || !analysis?.diagnostic) return <div>No encontrado</div>;

  const a = analysis.analysis;

  if (!a) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '2rem' }}>
        <div style={{
          maxWidth: '720px', margin: '4rem auto', background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: '12px', padding: '2rem',
        }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.75rem' }}>
            Análisis en proceso
          </h1>
          <p style={{ color: 'var(--ink-2)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Tu diagnóstico fue registrado, pero el análisis de IA todavía no está disponible.
            VELA no genera resultados simulados: cuando el servicio de IA responda, verás aquí tu análisis real.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.6rem 1.25rem', borderRadius: '8px', background: 'var(--accent)',
              color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

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
          marginBottom: '3rem',
        }}>
          <div>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: 'var(--ink)',
              marginBottom: '0.5rem',
            }}>
              Tu Análisis Empresarial
            </h1>
            <p style={{ color: 'var(--ink-2)' }}>
              {analysis.diagnostic?.venture?.name}
            </p>
          </div>
          <button
            disabled
            title="La exportación PDF estará disponible próximamente"
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              background: 'var(--surface)',
              color: 'var(--ink-3)',
              border: '1px solid var(--border)',
              fontWeight: 600,
              cursor: 'not-allowed',
              opacity: 0.75,
            }}
          >
            ⬇ PDF · próximamente
          </button>
        </div>

        {/* Maturity Score */}
        <div style={{
          background: 'linear-gradient(135deg, var(--accent) 0%, rgba(59, 130, 246, 0.8) 100%)',
          borderRadius: '12px',
          padding: '2rem',
          color: 'white',
          marginBottom: '2rem',
        }}>
          <p style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>
            Puntuación de Madurez
          </p>
          <div style={{
            fontSize: '3.5rem',
            fontWeight: 900,
            marginBottom: '0.5rem',
          }}>
            {a?.maturityScore || 0}/100
          </div>
          <p style={{ fontSize: '0.95rem', opacity: 0.9 }}>
            {a?.maturityScore >= 70
              ? 'Tu emprendimiento está bien estructurado'
              : a?.maturityScore >= 50
              ? 'Hay espacio significativo para mejorar'
              : 'Necesita fortalecimiento en múltiples áreas'}
          </p>
        </div>

        {/* Strengths */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '2rem',
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--ink)',
            marginBottom: '1.5rem',
          }}>
            ✓ Fortalezas
          </h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {a?.strengths?.map((strength: string, i: number) => (
              <div
                key={i}
                style={{
                  padding: '1rem',
                  background: 'rgba(34, 197, 94, 0.1)',
                  borderLeft: '4px solid #22c55e',
                  borderRadius: '6px',
                }}
              >
                <p style={{ color: 'var(--ink)' }}>{strength}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Risks */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '2rem',
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--ink)',
            marginBottom: '1.5rem',
          }}>
            ⚠ Riesgos
          </h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {a?.risks?.map((risk: string, i: number) => (
              <div
                key={i}
                style={{
                  padding: '1rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  borderLeft: '4px solid #ef4444',
                  borderRadius: '6px',
                }}
              >
                <p style={{ color: 'var(--ink)' }}>{risk}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Validations */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '2rem',
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--ink)',
            marginBottom: '1.5rem',
          }}>
            ? Necesita Validación
          </h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {a?.validations?.map((validation: string, i: number) => (
              <div
                key={i}
                style={{
                  padding: '1rem',
                  background: 'rgba(251, 191, 36, 0.1)',
                  borderLeft: '4px solid #fbbf24',
                  borderRadius: '6px',
                }}
              >
                <p style={{ color: 'var(--ink)' }}>{validation}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '2rem',
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--ink)',
            marginBottom: '1.5rem',
          }}>
            🎯 Recomendaciones Prioritarias
          </h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {a?.recommendations?.map((rec: string, i: number) => (
              <div key={i} style={{
                padding: '1rem',
                background: 'var(--bg)',
                borderRadius: '6px',
                borderLeft: '4px solid var(--accent)',
              }}>
                <p style={{ color: 'var(--ink)', lineHeight: '1.6' }}>{rec}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Roadmaps */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {[
            { title: 'Próximos 30 días', content: a?.days30Plan },
            { title: 'Próximos 60 días', content: a?.days60Plan },
            { title: 'Próximos 90 días', content: a?.days90Plan },
          ].map((roadmap, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '1.5rem',
              }}
            >
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: 'var(--ink)',
                marginBottom: '1rem',
              }}>
                {roadmap.title}
              </h3>
              <p style={{
                color: 'var(--ink-2)',
                lineHeight: '1.7',
                whiteSpace: 'pre-wrap',
                fontSize: '0.925rem',
              }}>
                {roadmap.content}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{
          background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg) 100%)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--ink)',
            marginBottom: '1rem',
          }}>
            ¿Listo para pasar a la acción?
          </h3>
          <p style={{
            color: 'var(--ink-2)',
            marginBottom: '1.5rem',
          }}>
            Crea objetivos y tareas para implementar estas recomendaciones
          </p>
          <button
            onClick={() => router.push(`/app/ventures/${ventureId}/objectives`)}
            style={{
              padding: '0.75rem 2rem',
              borderRadius: '8px',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Crear Objetivos →
          </button>
        </div>
      </div>
    </div>
  );
}
