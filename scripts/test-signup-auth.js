const { PrismaClient } = require("@prisma/client");
const assert = require("assert");

const db = new PrismaClient();

async function runTests() {
  console.log("=== STARTING AUTH SIGNUP SELF-CHECKS ===");

  const testEmailShipper = "test.shipper@reanzly.test";
  const testEmailBroker = "test.broker@reanzly.test";

  // Cleanup pre-existing test records in case of previous crashes
  console.log("0. Cleaning up legacy test records...");
  const oldUsers = await db.user.findMany({ where: { email: { in: [testEmailShipper, testEmailBroker] } } });
  for (const u of oldUsers) {
    await db.customer.deleteMany({ where: { userId: u.id } }).catch(() => {});
    await db.brokerProfile.deleteMany({ where: { userId: u.id } }).catch(() => {});
    await db.user.delete({ where: { id: u.id } }).catch(() => {});
  }
  await db.company.deleteMany({ where: { email: { in: [testEmailShipper, testEmailBroker] } } }).catch(() => {});

  console.log("1. Testing Shipper Signup DB operations...");
  // Company
  const companyShipper = await db.company.create({
    data: {
      legalName: "Test Shipper Corp",
      tradeName: "Test Shipper Corp",
      gstin: `GST-SHIP-${Date.now().toString(36).toUpperCase()}`,
      phone: "9876543210",
      email: testEmailShipper,
      status: "Active",
    },
  });
  assert.ok(companyShipper.id, "Company ID should be generated");

  // User
  const userShipper = await db.user.create({
    data: {
      companyId: companyShipper.id,
      email: testEmailShipper,
      name: "Test Shipper User",
      role: "customer",
      status: "Active",
      phone: "9876543210",
      passwordHash: "dummyhash",
      salt: "dummysalt",
    },
  });
  assert.ok(userShipper.id, "User ID should be generated");
  assert.strictEqual(userShipper.role, "customer", "User role should be customer");

  // Customer profile
  const customerProfile = await db.customer.create({
    data: {
      companyId: companyShipper.id,
      companyName: "Test Shipper Corp",
      contactPerson: "Test Shipper User",
      phone: "9876543210",
      email: testEmailShipper,
      userId: userShipper.id,
      status: "Active",
    },
  });
  assert.ok(customerProfile.id, "Customer Profile ID should be generated");
  assert.strictEqual(customerProfile.userId, userShipper.id, "Customer userId relation should match");

  console.log("✓ Shipper signup DB operations verified!");

  console.log("2. Testing Broker Signup DB operations...");
  // Company
  const companyBroker = await db.company.create({
    data: {
      legalName: "Test Brokerage Corp",
      tradeName: "Test Brokerage Corp",
      gstin: `GST-BROK-${Date.now().toString(36).toUpperCase()}`,
      phone: "9876543211",
      email: testEmailBroker,
      status: "Active",
    },
  });
  assert.ok(companyBroker.id, "Broker Company ID should be generated");

  // User
  const userBroker = await db.user.create({
    data: {
      companyId: companyBroker.id,
      email: testEmailBroker,
      name: "Test Broker User",
      role: "broker",
      status: "Active",
      phone: "9876543211",
      passwordHash: "dummyhash",
      salt: "dummysalt",
    },
  });
  assert.ok(userBroker.id, "Broker User ID should be generated");
  assert.strictEqual(userBroker.role, "broker", "User role should be broker");

  // Broker profile
  const brokerProfile = await db.brokerProfile.create({
    data: {
      userId: userBroker.id,
      brokerCode: `RZB-TEST-${Math.floor(1000 + Math.random() * 9000)}`,
      companyName: "Test Brokerage Corp",
      contactName: "Test Broker User",
      email: testEmailBroker,
      phone: "9876543211",
      gstin: companyBroker.gstin,
      status: "Active",
    },
  });
  assert.ok(brokerProfile.id, "Broker Profile ID should be generated");
  assert.strictEqual(brokerProfile.userId, userBroker.id, "BrokerProfile userId relation should match");

  console.log("✓ Broker signup DB operations verified!");

  // Cleanup
  console.log("3. Cleaning up test database records...");
  await db.customer.delete({ where: { id: customerProfile.id } });
  await db.user.delete({ where: { id: userShipper.id } });
  await db.company.delete({ where: { id: companyShipper.id } });

  await db.brokerProfile.delete({ where: { id: brokerProfile.id } });
  await db.user.delete({ where: { id: userBroker.id } });
  await db.company.delete({ where: { id: companyBroker.id } });

  console.log("=== ALL AUTH SIGNUP SELF-CHECKS PASSED SUCCESSFULLY ===");
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
