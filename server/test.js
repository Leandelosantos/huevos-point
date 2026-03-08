async function test() {
  try {
    const loginRes = await fetch('http://localhost:3002/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.data?.token;
    console.log('Login status:', loginRes.status);
    if (!token) return console.log('No token', loginData);
    
    // Hit dashboard
    const dashRes = await fetch('http://localhost:3002/api/dashboard/summary', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Dashboard response:', dashRes.status, await dashRes.json());
    
    // Hit sales
    const salesRes = await fetch('http://localhost:3002/api/sales', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Sales response:', salesRes.status, await salesRes.json());
    
    // Hit metrics
    const metricsRes = await fetch('http://localhost:3002/api/metrics', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Metrics response:', metricsRes.status, await metricsRes.json());
    
  } catch (err) {
    console.log('Error:', err.message);
  }
}
test();
