async function test() {
  try {
    const loginRes = await fetch('http://localhost:3002/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.data?.token;
    
    const metricsRes = await fetch('http://localhost:3002/api/metrics', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(JSON.stringify(await metricsRes.json(), null, 2));
  } catch (err) {}
}
test();
