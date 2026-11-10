// Run from Back. Creates/activates ONLY evento.alta@seal.test; sends no mail.
require('dotenv').config({quiet:true});
const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path');
const {request}=require('../../../qa/node_modules/@playwright/test');
const users=require('../../src/services/users.service');
const tokens=require('../../src/services/passwordTokens.service');
const out=path.resolve('../.release/evento');
const {origin}=JSON.parse(fs.readFileSync(path.join(out,'conexion.json')));
const manifest=JSON.parse(fs.readFileSync(path.join(out,'cuentas.json')));
const checks=[],contexts=[];
async function call(ctx,method,route,data,status=200){
 const res=await ctx[method](`${origin}/api${route}`,{data,timeout:60000});
 const body=await res.json();assert.equal(res.status(),status,`${route}: ${body.message||res.status()}`);assert.equal(body.ok,true);return body.data;
}
async function login(email){const ctx=await request.newContext();contexts.push(ctx);await call(ctx,'post','/auth/login',{email,password:process.env.DEMO_PASSWORD});return ctx;}
function pass(name,details={}){checks.push({name,ok:true,...details});console.log(JSON.stringify(checks.at(-1)));}
(async()=>{
 const admin=await login(manifest.adminEmail);
 const email='evento.alta@seal.test';
 let user=await users.getByEmail(email);
 if(!user){
  const created=await call(admin,'post','/admin/users',{name:'Alta Técnica Ficticia Demo',email,role:'CLIENT',position:'Prueba de alta de cuentas'},201);
  assert.equal(created.invitationSent,false);user=created.user;
  pass('Alta por API del administrador, sin enviar correos a direcciones ficticias');
 }
 assert.equal(user.name,'Alta Técnica Ficticia Demo');
 if(user.status==='PENDING_ACTIVATION'){
  const {rawToken}=await tokens.createForUser(user.id,tokens.PURPOSES.ACCOUNT_ACTIVATION);
  const verified=await call(admin,'post','/auth/password/verify',{token:rawToken});
  assert.equal(verified.purpose,'ACCOUNT_ACTIVATION');
  const activated=await call(admin,'post','/auth/password/confirm',{token:rawToken,newPassword:process.env.DEMO_PASSWORD,acceptsPrivacyNotice:true,acceptsDataProtection:true,privacyNoticeVersion:verified.legal_versions.privacy_notice,dataProtectionVersion:verified.legal_versions.data_protection});
  assert.equal(activated.activated,true);
  pass('Activación con contraseña y flujo de consentimiento usando una identidad ficticia');
 }
 const client=await login(email);
 const profile=await call(client,'patch','/client/profile',{rfc:'DEMO900101001',curp:'DEMO900101HQTXXX01',phone:'5550000000',address_line1:'Domicilio ficticio de demostración 1',address_city:'Querétaro',address_state:'Querétaro',address_zip:'76000',address_country:'MX'});
 assert.equal(profile.profile_completed,true);
 pass('Cuenta recién creada: inicio de sesión y perfil completo');
 const technical=await login(manifest.technical.email);
 for(const [role,ctx] of [['admin',admin],['client',technical]]){
  const answer=await call(ctx,'post',`/${role}/assignments/${manifest.technical.assignmentIds[0]}/ai/ask`,{question:'¿Qué puesto y pago de ejemplo indica este documento ficticio? Responde brevemente.'});
  assert.equal(answer.mode,'openrouter-contract-assistant','Debe responder OpenRouter, no el respaldo local');
  assert.ok(/26[,. ]?000/.test(answer.answer));
  pass(`OpenRouter real mediante endpoint autenticado ${role}`,{mode:answer.mode,model:answer.model});
 }
 fs.writeFileSync(path.join(out,'alta-e-ia.json'),JSON.stringify({checkedAt:new Date().toISOString(),checks},null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(async()=>{await Promise.allSettled(contexts.map(c=>c.dispose()));});
