import { useState } from 'react';

export default function TestApp() {
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testAPI = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test');
      const data = await response.json();
      setTestResult({ success: true, data });
    } catch (error) {
      setTestResult({ success: false, error: error.message });
    }
    setLoading(false);
  };

  const testLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          badgeCode: 'TEST123'
        })
      });
      const data = await response.json();
      setTestResult({ success: true, data, status: response.status });
    } catch (error) {
      setTestResult({ success: false, error: error.message });
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🧪 Test de l'Application CNOL</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testAPI}
          disabled={loading}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Test en cours...' : 'Test API Simple'}
        </button>
        
        <button 
          onClick={testLogin}
          disabled={loading}
          style={{ 
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Test en cours...' : 'Test API Login'}
        </button>
      </div>

      {testResult && (
        <div style={{ 
          padding: '15px', 
          border: '1px solid #ddd', 
          borderRadius: '5px',
          backgroundColor: testResult.success ? '#d4edda' : '#f8d7da',
          color: testResult.success ? '#155724' : '#721c24'
        }}>
          <h3>{testResult.success ? '✅ Succès' : '❌ Erreur'}</h3>
          <pre style={{ whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
        <h3>📋 Informations de débogage</h3>
        <p><strong>URL de l'API test:</strong> <code>/api/test</code></p>
        <p><strong>URL de l'API login:</strong> <code>/api/login</code></p>
        <p><strong>Environnement:</strong> {process.env.NODE_ENV}</p>
        <p><strong>Base URL:</strong> {process.env.NEXT_PUBLIC_BASE_URL || 'Non définie'}</p>
      </div>
    </div>
  );
} 