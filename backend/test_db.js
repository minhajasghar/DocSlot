const m = require('mysql2/promise');
require('dotenv').config();
m.createConnection({host:'127.0.0.1',user:'root',password:'',database:'doctor_appointment',connectTimeout:10000}).then(async c => {
  try {
    const [r] = await c.query('SHOW FULL PROCESSLIST');
    r.forEach(row => console.log(row.Id, row.Command, row.State, row.Info));
  } finally { await c.end(); }
}).catch(e => console.error(e.message));
