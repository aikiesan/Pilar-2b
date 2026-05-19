'use client';

export default function TestPage() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial' }}>
      <h1>✅ Test Page - Routing Works!</h1>
      <p>If you can see this page, routing is working correctly.</p>
      <p>No redirect loops detected.</p>
      <a href="/en">Go to English home</a><br />
      <a href="/pt-BR">Go to Portuguese home</a>
    </div>
  );
}

