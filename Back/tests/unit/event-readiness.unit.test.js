describe('Comportamiento de correo para demostraciones', () => {
 afterEach(() => { jest.resetModules(); jest.clearAllMocks(); });
 test('las cuentas .test no intentan enviar un correo', async()=>{
  const sendMail=jest.fn(); const createTransport=jest.fn(()=>({sendMail}));
  jest.doMock('nodemailer',()=>({createTransport}));
  jest.doMock('../../src/config/env',()=>({SMTP_USER:'configured',SMTP_PASS:'configured'}));
  const email=require('../../src/services/email.service');
  const result=await email.sendApprovedNotificationEmail({to:'evento.qa.01@seal.test',name:'Demo'});
  expect(result).toEqual({skipped:true,reason:'DEMO_ADDRESS'});
  expect(createTransport).not.toHaveBeenCalled();
 });
 test('una aprobación confirmada no se reporta como fallida por un error de correo',async()=>{
  const assignment={id:'demo',status:'SIGNED',client_email:'example@example.com',resolved_html_snapshot:'<p>Demo</p>'};
  jest.doMock('../../src/services/assignments.service',()=>({getAssignmentById:jest.fn().mockResolvedValue(assignment)}));
  jest.doMock('../../src/services/assignmentWorkflow.service',()=>({approveAssignment:jest.fn().mockResolvedValue({...assignment,status:'APPROVED'})}));
  jest.doMock('../../src/services/storage.service',()=>({uploadBuffer:jest.fn().mockResolvedValue({})}));
  jest.doMock('../../src/services/pdf.service',()=>({buildSignedHtml:()=>'<p>Demo</p>',htmlToPdfBuffer:async()=>({buffer:Buffer.from('pdf'),hash:'hash'}),PDF_RENDERER_VERSION:'test'}));
  jest.doMock('../../src/services/email.service',()=>({sendApprovedNotificationEmail:jest.fn().mockRejectedValue(new Error('SMTP unavailable'))}));
  jest.doMock('../../src/services/contractAssistant.service',()=>({}));
  jest.doMock('../../src/services/users.service',()=>({}));
  jest.doMock('../../src/services/assignmentMessages.service',()=>({}));
  const controller=require('../../src/controllers/adminAssignments.controller');
  const res={status:jest.fn().mockReturnThis(),json:jest.fn()};
  const log=jest.spyOn(console,'error').mockImplementation(()=>{});
  await controller.approve({params:{id:'demo'},user:{userId:'admin'},headers:{},ip:'127.0.0.1'},res);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ok:true,data:expect.objectContaining({status:'APPROVED'})}));
  log.mockRestore();
 });
});
