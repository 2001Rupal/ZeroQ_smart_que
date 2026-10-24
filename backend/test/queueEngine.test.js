const assert = require('assert');
const mongoose = require('mongoose');
const { connectDatabase, disconnectDatabase } = require('../src/config/database');
const Store = require('../src/models/Store');
const Counter = require('../src/models/Counter');
const Token = require('../src/models/Token');
const DailySequence = require('../src/models/DailySequence');
const {
  issueToken,
  callNextToken,
  snoozeToken,
  completeToken,
  skipToken,
  getQueueState
} = require('../src/services/queueEngine');

async function runTests() {
  console.log('🧪 Starting Virtual Queue Engine & Concurrency Verification Test...\n');

  await connectDatabase('mongodb://127.0.0.1:27017/virtual_queue_test');

  // Clean test database
  await Store.deleteMany({});
  await Counter.deleteMany({});
  await Token.deleteMany({});
  await DailySequence.deleteMany({});

  try {
    // 1. Create Test Store
    console.log('Test 1: Store & Counter Setup');
    const store = await Store.create({
      slug: 'test-store',
      name: 'Test Healthcare Center',
      ownerPhone: '+19998887777',
      settings: { snoozeOffset: 2, walletBalance: 10.0 }
    });

    const counter1 = await Counter.create({
      storeId: store._id,
      counterNumber: 1,
      counterName: 'Counter 1'
    });

    const counter2 = await Counter.create({
      storeId: store._id,
      counterNumber: 2,
      counterName: 'Counter 2'
    });

    assert.strictEqual(counter1.counterNumber, 1);
    assert.strictEqual(counter2.counterNumber, 2);
    console.log('✅ Store & 2 Counters created successfully.');

    // 2. Atomic Sequential Token Issuance
    console.log('\nTest 2: Atomic Sequential Token Issuance');
    const t1 = await issueToken(store._id, 'Alice', '+10000000001');
    const t2 = await issueToken(store._id, 'Bob', '+10000000002');
    const t3 = await issueToken(store._id, 'Charlie', '+10000000003');
    const t4 = await issueToken(store._id, 'David', '+10000000004');
    const t5 = await issueToken(store._id, 'Eve', '+10000000005');

    assert.strictEqual(t1.tokenNumber, 1);
    assert.strictEqual(t2.tokenNumber, 2);
    assert.strictEqual(t3.tokenNumber, 3);
    assert.strictEqual(t4.tokenNumber, 4);
    assert.strictEqual(t5.tokenNumber, 5);

    assert.strictEqual(t1.queuePosition, 100);
    assert.strictEqual(t2.queuePosition, 200);
    assert.strictEqual(t3.queuePosition, 300);
    assert.strictEqual(t4.queuePosition, 400);
    assert.strictEqual(t5.queuePosition, 500);
    console.log('✅ 5 Tokens issued sequentially with guaranteed positions 100, 200, 300, 400, 500.');

    // 3. Multi-Counter Mutual Exclusion Concurrency Lock
    console.log('\nTest 3: Multi-Counter Mutual Exclusion Concurrency Lock');
    console.log('Simulating Counter 1 and Counter 2 calling next simultaneously in parallel...');
    const [claimedByC1, claimedByC2] = await Promise.all([
      callNextToken(store._id, counter1._id),
      callNextToken(store._id, counter2._id)
    ]);

    assert(claimedByC1 !== null, 'Counter 1 should claim a token');
    assert(claimedByC2 !== null, 'Counter 2 should claim a token');
    assert.notStrictEqual(
      claimedByC1._id.toString(),
      claimedByC2._id.toString(),
      'Mutual exclusion lock failure: Both counters claimed the same token!'
    );

    const claimedTokens = [claimedByC1.tokenNumber, claimedByC2.tokenNumber].sort();
    assert.deepStrictEqual(claimedTokens, [1, 2]);
    console.log(`✅ Mutual Exclusion Verified! Counter 1 claimed Token #${claimedByC1.tokenNumber}, Counter 2 claimed Token #${claimedByC2.tokenNumber}. Distinct tokens claimed.`);

    // 4. Dynamic Snooze Memory Shifting Algorithm
    console.log('\nTest 4: Dynamic Snooze Memory Shifting (Shift exactly 2 slots behind)');
    // Claimed token 1 is currently in CALLED state by counter1.
    // Remaining in WAITING: Charlie (token 3, pos 300), David (token 4, pos 400), Eve (token 5, pos 500).
    // Snoozing Token 1 should place it behind Charlie (#3) and David (#4), between David (pos 400) and Eve (pos 500).
    // New pos = (400 + 500) / 2 = 450!
    const snoozedToken = await snoozeToken(claimedByC1._id, store._id);
    assert.strictEqual(snoozedToken.status, 'WAITING');
    assert.strictEqual(snoozedToken.snoozeCount, 1);
    assert.strictEqual(snoozedToken.queuePosition, 450);
    console.log(`✅ Snooze Math Verified! Token #${snoozedToken.tokenNumber} moved from CALLED to WAITING at queuePosition ${snoozedToken.queuePosition} (between 400 and 500).`);

    // Let's verify queue order now
    const waitingList = await Token.find({ storeId: store._id, status: 'WAITING' }).sort({ queuePosition: 1 });
    const orderNumbers = waitingList.map(t => t.tokenNumber);
    // Expected order: 3, 4, snoozedToken.tokenNumber, 5
    assert.deepStrictEqual(orderNumbers, [3, 4, snoozedToken.tokenNumber, 5]);
    console.log(`✅ Waiting Queue Order Verified: [${orderNumbers.join(', ')}] -> Token #${snoozedToken.tokenNumber} is precisely shifted 2 positions back!`);

    // 5. Complete and Free Counter
    console.log('\nTest 5: Complete Token & Free Counter');
    const completedToken = await completeToken(claimedByC2._id);
    assert.strictEqual(completedToken.status, 'COMPLETED');
    const c2Doc = await Counter.findById(counter2._id);
    assert.strictEqual(c2Doc.currentServingToken, null);
    console.log('✅ Token completed and Counter 2 freed successfully.');

    // 6. Test Queue State Summary
    console.log('\nTest 6: Queue State Aggregation');
    const queueState = await getQueueState(store._id);
    assert.strictEqual(queueState.totalWaiting, 4);
    assert.strictEqual(queueState.upcomingQueue.length, 4);
    console.log(`✅ Queue state verified: totalWaiting = ${queueState.totalWaiting}, upcoming count = ${queueState.upcomingQueue.length}`);

    console.log('\n🎉 ALL CORE ALGORITHMIC AND CONCURRENCY TESTS PASSED 100%!\n');
  } finally {
    // Clean up test database
    await Store.deleteMany({});
    await Counter.deleteMany({});
    await Token.deleteMany({});
    await DailySequence.deleteMany({});
    await disconnectDatabase();
  }
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
