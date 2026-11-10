// Additive fixtures: no deletion, no resets, no outgoing mail.
require('dotenv').config({quiet:true});
const fs=require('node:fs'),path=require('node:path');
const {db}=require('../config/firebase');
const users=require('../services/users.service'),contracts=require('../services/contracts.service'),assignments=require('../services/assignments.service');
const {hashPassword}=require('../utils/password');
const {validatePlaceholdersOrThrow}=require('../utils/placeholders');
const BATCH='detona-2026-09-09';
const roles=[
 ['frontend','Desarrollo Frontend','Tecnología','32000','Construir interfaces accesibles y adaptar pantallas a celulares.'],
 ['backend','Desarrollo Backend','Tecnología','34000','Mantener servicios e integración de datos.'],
 ['qa','Pruebas de software','Calidad','26000','Preparar pruebas y documentar resultados.'],
 ['diseno','Diseño gráfico','Diseño','22000','Preparar piezas visuales e identidad del proyecto.'],
 ['marketing','Marketing digital','Comunicación','23000','Planear contenido y revisar campañas.'],
 ['ventas','Asesoría de ventas','Comercial','20000','Dar seguimiento a prospectos y solicitudes.'],
 ['rrhh','Recursos humanos','Administración','24000','Coordinar expedientes y consultas internas.'],
 ['contabilidad','Auxiliar contable','Finanzas','21000','Organizar comprobantes y conciliaciones.'],
 ['soporte','Soporte técnico','Atención','19000','Atender incidencias y registrar soluciones.'],
 ['logistica','Coordinación logística','Operaciones','25000','Organizar entregas y dar seguimiento a pedidos.']
];
(async()=>{
 if(!process.argv.includes('--apply')){console.log('Añade 20 clientes, 10 plantillas, 40 expedientes y una cuenta técnica. No borra ni reinicia datos. Ejecutar con --apply.');return;}
 if(!process.env.DEMO_PASSWORD)throw new Error('Falta DEMO_PASSWORD.');
 const admin=await users.getByEmail('admin.demo@seal.test');if(!admin||admin.role!=='ADMIN')throw new Error('Falta el administrador demo.');
 const password_hash=await hashPassword(process.env.DEMO_PASSWORD);
 const templates=await contracts.listContracts();
 const existing=(await db().collection('assignments').where('demo_batch','==',BATCH).get()).docs.map(d=>d.data());
 const manifest={batch:BATCH,adminEmail:admin.email,clients:[],technical:null,createdAt:new Date().toISOString()};
 async function provision(role,index,template,technical=false){
  const [slug,position,area,salary]=role;
  const email=technical?'evento.prueba@seal.test':`evento.${slug}.${String(index).padStart(2,'0')}@seal.test`;
  let user=await users.getByEmail(email);
  if(user&&user.demo_batch!==BATCH)throw new Error(`Se conserva ${email}: ya existe fuera de este lote.`);
  if(!user)user=await users.create({name:technical?'Prueba Técnica Demo':`${position} Demo ${index}`,email,role:'CLIENT',position,password_hash,status:'ACTIVE',must_change_password:false,profile_completed:true,activated_at:new Date().toISOString(),last_login_at:null,consent_record:null,demo_batch:BATCH,rfc:'DEMO900101001',curp:'DEMO900101HQTXXX01',phone:'5550000000',address_line1:'Domicilio ficticio de demostración 1',address_line2:'Datos de ejemplo',address_city:'Querétaro',address_state:'Querétaro',address_zip:'76000',address_country:'MX'});
  const ids=[];
  for(let round=1;round<=(technical?1:2);round++){
   const key=`${email}:recorrido-${round}`;
   let a=existing.find(x=>x.demo_key===key);
   if(!a){a=await assignments.createAssignment({created_by:admin.id,created_by_name:admin.name,client_id:user.id,contract_id:template.id,contract_version:1,initial_message:`Bienvenido a SEAL. Este expediente ficticio está preparado para el recorrido de demostración ${round}. Consulta la IA y prueba la firma.`,company_values:{'company.position':position,'company.area':area,'company.salary':`${salary} pesos mensuales (importe ficticio)`,'company.work_schedule':'Lunes a viernes, 09:00 a 18:00; condiciones de ejemplo','company.start_date':'09/09/2026','company.duration':'Ejemplo para demostración'}});await db().collection('assignments').doc(a.id).update({demo_batch:BATCH,demo_key:key});existing.push({...a,demo_key:key});}
   ids.push(a.id);
  }
  return{email,name:user.name,userId:user.id,position,area,templateId:template.id,assignmentIds:ids};
 }
 for(const role of roles){
  const [slug,position,area,salary,task]=role;const title=`DEMO Evento · ${position}`;let t=templates.find(x=>x.title===title);
  if(!t){const html=`<h1>Documento de demostración · ${position}</h1><p><strong>EJEMPLO FICTICIO. No representa una contratación real.</strong></p><h2>Participantes</h2><p>SEAL Demo y {{ employee.name }}, correo {{ employee.email }}, participan en este ejemplo del proceso digital.</p><h2>Puesto y actividades</h2><p>Puesto: {{ company.position }}. Área: {{ company.area }}.</p><p>${task}</p><h2>Condiciones de ejemplo</h2><p>Pago: {{ company.salary }}.</p><p>Jornada: {{ company.work_schedule }}.</p><p>Inicio: {{ company.start_date }}. Duración: {{ company.duration }}.</p><h2>Revisión y comunicación</h2><p>La persona revisa sus datos y condiciones. Puede preguntar a administración y consultar el asistente antes de continuar.</p><h2>Uso de información</h2><p>Este ejemplo solo contiene datos ficticios. Las dudas se comunican dentro del expediente.</p><h2>Firma y aprobación</h2><p>La firma de demostración indica que se probó el recorrido. Administración revisa la evidencia y genera un PDF de ejemplo. Este documento no crea obligaciones laborales reales.</p>`;
   t=await contracts.createContract({created_by:admin.id,created_by_name:admin.name,title,area,position,base_template_html:html,initial_commit_message:'Documento ficticio para DETONA 2026'});
   t=await contracts.updateContract(t.id,{demo_batch:BATCH,base_placeholders_used:validatePlaceholdersOrThrow(html).used_placeholders,salary:`${salary} pesos mensuales (ficticio)`,work_schedule:'Lunes a viernes de 09:00 a 18:00',start_date:'09/09/2026',duration:'Demostración',legal_representative_name:'Representante Demo'});templates.push(t);
  }
  for(const i of [1,2]){const row=await provision(role,i,t);manifest.clients.push(row);console.log(`Lista: ${row.email} · ${position}`);}
 }
 manifest.technical=await provision(roles[2],1,templates.find(t=>t.title==='DEMO Evento · Pruebas de software'),true);
 const out=path.resolve('../.release/evento');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'cuentas.json'),JSON.stringify(manifest,null,2),{mode:0o600});
 const lines=['# Cuentas demo para el evento','',`Administrador: ${admin.email}`,'',`Contraseña compartida de las cuentas creadas: ${process.env.DEMO_PASSWORD}`,'','Hoja privada del equipo. Cada cliente tiene dos expedientes ficticios pendientes.','', '| Correo | Puesto |','|---|---|',...manifest.clients.map(r=>`| ${r.email} | ${r.position} |`),'','Cuenta técnica reservada: evento.prueba@seal.test. Se usa para verificar firma y PDF.'];
 fs.writeFileSync(path.join(out,'CUENTAS_DEMO_PRIVADO.md'),lines.join('\n'),{mode:0o600});
 console.log('20 cuentas, 40 expedientes y una cuenta técnica preparados. Credenciales en .release/evento/CUENTAS_DEMO_PRIVADO.md.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
