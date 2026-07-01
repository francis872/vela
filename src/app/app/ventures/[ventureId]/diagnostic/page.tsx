'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

const dimensions = [
  {
    id: 'problem',
    title: '1. Problema y Propuesta de Valor',
    questions: [
      '¿Cuál es el problema específico que resuelve tu emprendimiento?',
      '¿Quiénes son los afectados por este problema?',
      '¿Cuál es tu propuesta de valor diferenciadora?',
      '¿Por qué tu solución es mejor que las alternativas existentes?',
    ],
  },
  {
    id: 'customers',
    title: '2. Clientes y Validación',
    questions: [
      '¿Quiénes son tus clientes ideales?',
      '¿Cuántos clientes tienes actualmente?',
      '¿Has hablado directamente con potenciales clientes?',
      '¿Cuáles fueron sus comentarios más importantes?',
      '¿Cómo sabes que realmente quieren tu producto?',
    ],
  },
  {
    id: 'businessModel',
    title: '3. Modelo de Negocio',
    questions: [
      '¿Cómo ganas dinero? (ej: venta directa, suscripción, comisiones)',
      '¿Cuál es tu precio o tarifa?',
      '¿Cómo se comparas en precio con la competencia?',
      '¿Quiénes son tus principales competidores?',
      '¿Cuáles son tus ventajas competitivas?',
    ],
  },
  {
    id: 'marketing',
    title: '4. Marketing y Ventas',
    questions: [
      '¿Cómo llegan los clientes a ti? (canales)',
      '¿Cuál es tu costo de adquisición de clientes?',
      '¿Cuál es tu estrategia de marketing?',
      '¿Qué funciona mejor para adquirir clientes?',
      '¿Cómo mides tu progreso en ventas?',
    ],
  },
  {
    id: 'financials',
    title: '5. Finanzas',
    questions: [
      '¿Cuáles son tus principales costos?',
      '¿Cuál es tu margen bruto aproximado?',
      '¿Necesitas capital adicional para crecer?',
      '¿En cuánto tiempo esperas ser rentable?',
      '¿Cuáles son tus principales desafíos financieros?',
    ],
  },
  {
    id: 'organization',
    title: '6. Organización y Equipo',
    questions: [
      '¿Quiénes son los cofundadores o socios?',
      '¿Qué experiencia tienen?',
      '¿Qué roles faltan en tu equipo?',
      '¿Cómo toman decisiones?',
      '¿Cómo se distribuyen las responsabilidades?',
    ],
  },
];

export default function DiagnosticPage() {
  const router = useRouter();
  const params = useParams();
  const ventureId = params.ventureId as string;
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentDimension, setCurrentDimension] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});

  // Check auth
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Verify auth by fetching venture data
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

  const handleResponseChange = (question: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [question]: value,
    }));
  };

  const handleNext = () => {
    if (currentDimension < dimensions.length - 1) {
      setCurrentDimension(currentDimension + 1);
    }
  };

  const handlePrev = () => {
    if (currentDimension > 0) {
      setCurrentDimension(currentDimension - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    try {
      // Format responses by dimension
      const formattedResponses: Record<string, string> = {};
      dimensions.forEach(dim => {
        const dimResponses = dim.questions
          .map((q, i) => `${i + 1}. ${q}\n${responses[q] || '(sin respuesta)'}`)
          .join('\n\n');
        formattedResponses[dim.id] = dimResponses;
      });

      const response = await fetch(`/api/ventures/${ventureId}/diagnostics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: formattedResponses.problem,
          targetCustomers: formattedResponses.customers,
          businessModel: formattedResponses.businessModel,
          marketing: formattedResponses.marketing,
          financials: formattedResponses.financials,
          organization: formattedResponses.organization,
        }),
      });

      if (response.ok) {
        const { diagnosticId } = await response.json();
        router.push(`/app/ventures/${ventureId}/diagnostic/${diagnosticId}/analysis`);
      } else {
        alert('Error al guardar diagnóstico');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  const dim = dimensions[currentDimension];
  const progress = ((currentDimension + 1) / dimensions.length) * 100;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      padding: '2rem',
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            color: 'var(--ink)',
            marginBottom: '1rem',
          }}>
            Diagnóstico Empresarial
          </h1>
          <div style={{
            height: '8px',
            background: 'var(--border)',
            borderRadius: '4px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              background: 'var(--accent)',
              width: `${progress}%`,
              transition: 'width 0.3s',
            }} />
          </div>
          <p style={{
            fontSize: '0.875rem',
            color: 'var(--ink-2)',
            marginTop: '0.5rem',
          }}>
            Dimensión {currentDimension + 1} de {dimensions.length}
          </p>
        </div>

        {/* Dimension Card */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '2.5rem',
          marginBottom: '2rem',
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--ink)',
            marginBottom: '2rem',
          }}>
            {dim.title}
          </h2>

          <div style={{ display: 'grid', gap: '2rem' }}>
            {dim.questions.map((question, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label style={{
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: 'var(--ink)',
                }}>
                  {idx + 1}. {question}
                </label>
                <textarea
                  value={responses[question] || ''}
                  onChange={(e) => handleResponseChange(question, e.target.value)}
                  placeholder="Tu respuesta aquí..."
                  rows={3}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--ink)',
                    fontFamily: 'inherit',
                    fontSize: '0.95rem',
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'space-between',
        }}>
          <button
            onClick={handlePrev}
            disabled={currentDimension === 0}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--ink)',
              fontWeight: 600,
              cursor: currentDimension === 0 ? 'not-allowed' : 'pointer',
              opacity: currentDimension === 0 ? 0.5 : 1,
            }}
          >
            ← Atrás
          </button>

          <div style={{
            display: 'flex',
            gap: '1rem',
          }}>
            {currentDimension < dimensions.length - 1 ? (
              <button
                onClick={handleNext}
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
                Siguiente →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
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
                {submitting ? 'Analizando...' : 'Enviar y Analizar'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
