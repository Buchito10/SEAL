require('dotenv').config({ quiet: true });
const fs = require('node:fs');
const path = require('node:path');
const { initFirebase, db } = require('../../src/config/firebase');
const nativeFetch = global.fetch;
global.fetch = (url, init = {}) => nativeFetch(url, { ...init, signal: init.signal || AbortSignal.timeout(45000) });
const report = { checkedAt: new Date().toISOString(), checks: [] };
async function check(name, fn) {
 const start = Date.now();
 try { const data = await fn(); report.checks.push({ name, ok: true, ms: Date.now()-start, ...data }); }
 catch(e) { report.checks.push({ name, ok: false, ms: Date.now()-start, error: e.name, message: e.message }); }
 console.log(JSON.stringify(report.checks.at(-1)));
}
(async()=>{
 await check('Firebase', async()=>{initFirebase();const s=await db().collection('users').limit(1).get();return {connected:!s.empty};});
 await check('SMTP autenticación (sin enviar correo)', async()=>{const e=require('../../src/config/env');const t=require('nodemailer').createTransport({host:e.SMTP_HOST,port:e.SMTP_PORT,secure:e.SMTP_PORT===465,auth:{user:e.SMTP_USER,pass:e.SMTP_PASS},connectionTimeout:15000,socketTimeout:15000});try{await t.verify();return {authenticated:true};}finally{t.close();}});
 const {askAboutAssignment}=require('../../src/services/contractAssistant.service');
 for(const role of ['ADMIN','CLIENT']) await check(`OpenRouter consulta ${role}`, async()=>{
 const r=await askAboutAssignment({assignment:{contract_title:'Documento ficticio de prueba',status:'VIEWED',resolved_html_snapshot:'<h1>DEMO SIN VALIDEZ</h1><p>El puesto de prueba es Diseño. El pago ficticio es de 18000 pesos mensuales. La jornada de ejemplo es de lunes a viernes.</p>'},question:'¿Cuál es el puesto y cuál es el pago indicado? Responde en una oración.',role});
 if(r.mode!=='openrouter-contract-assistant')throw new Error('El proveedor no respondió; se usó respaldo local.');
 return {mode:r.mode,model:r.model,hasExpectedAmount:/18[,. ]?000/.test(r.answer),answer:r.answer};});
 await check('OpenRouter genera plantilla', async()=>{
 const r=await require('../../src/services/openrouter.service').generateContractTemplate({history:[],userText:'Genera una plantilla MUY breve de demostración para el puesto de diseñador: título, nombre con placeholder employee.name, puesto con company.position y una cláusula de jornada con company.work_schedule. Máximo 250 palabras. Indica que es un ejemplo ficticio para demostración.',currentTemplateHtml:'',chatContext:{title_hint:'Ejemplo de demostración',area:'Diseño',position:'Diseñador'}});
 if(r.mode!=='openrouter'||!r.template_html)throw new Error('No se generó HTML real desde OpenRouter.');
 require('../../src/utils/placeholders').validatePlaceholdersOrThrow(r.template_html);
 return {mode:r.mode,model:r.model,htmlLength:r.template_html.length};});
 const dest=path.resolve('../.release/evento');fs.mkdirSync(dest,{recursive:true});fs.writeFileSync(path.join(dest,'preflight.json'),JSON.stringify(report,null,2));
 if(report.checks.some(x=>!x.ok))process.exitCode=1;
})().catch(e=>{console.error(e.message);process.exitCode=1;});
