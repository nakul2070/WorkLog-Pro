const db = require('./config/database');

(async () => {
  await db.initializeDatabase();
  
  const logs = await db.executeQuery('SELECT * FROM sync_logs ORDER BY started_at DESC LIMIT 3');
  
  console.log('\n📊 Recent Sync Logs:\n');
  logs.forEach((log, i) => {
    console.log(`${i+1}. ${log.sync_type} from ${log.source}`);
    console.log(`   Status: ${log.status}`);
    console.log(`   Fetched: ${log.records_fetched} | Created: ${log.records_created} | Updated: ${log.records_updated}`);
    console.log(`   Duration: ${log.duration_seconds} seconds`);
    console.log(`   Timestamp: ${log.started_at}`);
    console.log('');
  });
  
  await db.closePool();
})();

