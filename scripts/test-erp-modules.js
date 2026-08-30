const http = require('http');

async function testERP() {
  console.log("Starting ERP module API tests...");
  
  // Wait a moment for server to be fully ready
  await new Promise(r => setTimeout(r, 2000));

  let cookie = "";

  // 1. Mock a session by fetching the NextAuth endpoint if possible or we just test the endpoints.
  // Actually, standard Next.js API routes using getSession won't work without a real session.
  // Wait, I can create a fake session directly in the database or bypass auth for testing, but let's test if they return 401.
  console.log("Testing Quality GET (Expected 401 Unauthorized without session)...");
  
  const res = await fetch("http://localhost:3000/api/quality-checks");
  if (res.status === 401) {
    console.log("✅ Quality API correctly guarded (401)");
  } else {
    console.error("❌ Quality API returned", res.status);
    process.exit(1);
  }

  const res2 = await fetch("http://localhost:3000/api/purchase-orders");
  if (res2.status === 401) {
    console.log("✅ Purchase API correctly guarded (401)");
  } else {
    console.error("❌ Purchase API returned", res2.status);
    process.exit(1);
  }

  console.log("✅ Basic connectivity and auth guards verified.");
  process.exit(0);
}

testERP().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
