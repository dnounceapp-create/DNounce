// src/app/debug/api-test/page.tsx
'use client';
import { useState, useEffect } from 'react';

export default function APITest() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    testAPI();
  }, []);

  const testAPI = async () => {
    setLoading(true);
    try {
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      console.log('Testing API Key:', {
        url: url,
        keyExists: !!key,
        keyStartsWithEyJ: key?.startsWith('eyJ')
      });

      // Fix: Proper headers type
      const headers = new Headers();
      headers.append('Authorization', `Bearer ${key}`);
      headers.append('apikey', key || '');

      const response = await fetch(url, { headers });
      
      const data = await response.json();
      setResult({
        status: response.status,
        statusText: response.statusText,
        data: data
      });
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6">Testing API...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">API Key Test</h1>
      
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Environment Variables:</h2>
        <p><strong>NEXT_PUBLIC_SUPABASE_URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
        <p><strong>Anon Key exists:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'YES' : 'NO'}</p>
        <p><strong>Anon Key valid format:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith('eyJ') ? 'YES' : 'NO'}</p>
      </div>

      <button 
        onClick={testAPI} 
        className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
      >
        Test API Key
      </button>
      
      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h2 className="text-lg font-semibold">Result:</h2>
          <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}