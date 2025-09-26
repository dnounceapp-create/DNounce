// src/app/debug/api-test/page.tsx
'use client';
import { useState } from 'react';

export default function APITest() {
  const [result, setResult] = useState<any>(null);

  const testAPI = async () => {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${key}`,
          'apikey': key
        }
      });
      
      const data = await response.json();
      setResult({
        status: response.status,
        statusText: response.statusText,
        data: data
      });
    } catch (error) {
      setResult({ error: error.message });
    }
  };

  return (
    <div className="p-6">
      <h1>API Key Test</h1>
      <button onClick={testAPI} className="bg-blue-500 text-white p-2 rounded">
        Test API Key
      </button>
      <pre className="mt-4">{JSON.stringify(result, null, 2)}</pre>
    </div>
  );
}