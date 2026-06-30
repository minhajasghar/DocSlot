const m = require('mysql2/promise');
(async () => {
  try {
    const c = await m.createConnection({host:'127.0.0.1',user:'root',password:'',database:'doctor_appointment',connectTimeout:5000});
    const [r] = await c.query('SHOW COLUMNS FROM doctors');
    r.forEach(c2 => console.log(c2.Field, c2.Type));
    await c.end();
  } catch(e) { console.log(typeof e, e.code, e.message); }
  process.exit(0);
})();
