import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {readFileSync,mkdirSync,existsSync,copyFileSync,writeFileSync,chmodSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {synchronizeStudentCourse,COURSE_SYNC_VERSION} from './courses.mjs';
import {ATTENDANCE_TYPES,attendanceSummary,validateAttendanceImport} from './attendance.mjs';
import {buildLeadDirectory} from './public/lead-list.mjs';
import {applyHandover,HANDOVER_STATES} from './handover.mjs';
import {isPayrollLocked} from './payroll-state.mjs';
import {SCHOOL,FIRST_AMOUNTS,SECOND_AMOUNTS,validDate,tuitionPlan,schoolDebt,nextSchoolDue,schoolSummary,historicalSchoolLead,financialOverview,verifyTuitionSource,calculateFund,examTuitionEligibility,TUITION_RULE_VERSION,tuitionReminderDue,operatingCostsByMonth,paymentPhaseHistory,tuitionAdvanceReminderDue,firstInstallmentPaidDate,schoolThreeLedgers,matchesSourceReceipt,profitOverview} from './finance.mjs';
import {readWorkbook,mappedRow,columns,normalizeText,importDate} from './importer.mjs';
import {networkInterfaces} from 'node:os';
import {payroll,defaults,effectiveDate} from './kpi.mjs';
const lan=process.argv.includes('--lan');
let localIPs=[];if(lan){try{localIPs=Object.values(networkInterfaces()).flat().filter(n=>n&&n.family==='IPv4'&&!n.internal).map(n=>n.address)}catch{if(process.env.LOCAL_IP)localIPs=[process.env.LOCAL_IP]}}
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const DATA=process.env.DATA_DIR||path.join(ROOT,'data');mkdirSync(DATA,{recursive:true,mode:0o700});
const db=new DatabaseSync(path.join(DATA,'center.sqlite'));db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS records(kind TEXT,id TEXT,json TEXT,PRIMARY KEY(kind,id)); CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,json TEXT); CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user TEXT,expires INTEGER);');
const all=k=>db.prepare('SELECT json FROM records WHERE kind=?').all(k).map(r=>JSON.parse(r.json));
const get=(k,id)=>all(k).find(r=>r.id===id);
const put=(k,r)=>db.prepare('INSERT OR REPLACE INTO records VALUES(?,?,?)').run(k,r.id,JSON.stringify(r));
const setting=(k,fallback)=>{let r=db.prepare('SELECT json FROM settings WHERE key=?').get(k);return r?JSON.parse(r.json):fallback};
const set=(k,v)=>db.prepare('INSERT OR REPLACE INTO settings VALUES(?,?)').run(k,JSON.stringify(v));
const id=()=>randomBytes(12).toString('hex');const now=()=>new Date().toISOString();
const date=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const profitAccess=new Map();
const profitAttempts=new Map();
const profitPasswordKey=userId=>'profitPassword:'+userId;
const telegramPath=path.join(DATA,'telegram-config.json');
function telegramConfig(){let c={};try{if(existsSync(telegramPath))c=JSON.parse(readFileSync(telegramPath,'utf8'))}catch{}return {token:c.token||process.env.TELEGRAM_BOT_TOKEN||'',chatId:c.chatId||process.env.TELEGRAM_CHAT_ID||''}}
async function telegramCall(method,body,token=telegramConfig().token){
 if(!token)fail('Chưa nhập token Telegram');
 try{const response=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body||{}),signal:AbortSignal.timeout(12000)});const data=await response.json();if(!data.ok){const code=Number(data.error_code)||0;fail(code===401||code===404?'Token Telegram không hợp lệ':code===409?'Bot đang dùng webhook hoặc có chương trình khác lấy tin. Chọn bot riêng hoặc kiểm tra kết nối cũ.':code===403?'Bot bị chặn hoặc chưa có quyền gửi vào nhóm':'Telegram chưa thực hiện được yêu cầu. Kiểm tra Chat ID và quyền của bot.')}return data.result}catch(e){if(e.status)throw e;fail('Không kết nối được Telegram. Kiểm tra Internet và thử lại.')}
}
function storeTelegram(c){writeFileSync(telegramPath,JSON.stringify(c),{mode:0o600});try{chmodSync(telegramPath,0o600)}catch{}}
const hash=(p,s=randomBytes(16).toString('hex'))=>s+':'+scryptSync(p,s,64).toString('hex');
const verify=(p,h)=>{try{let [s,v]=h.split(':');return timingSafeEqual(Buffer.from(v,'hex'),scryptSync(p,s,64))}catch{return false}};
const safe=u=>{const {password,...v}=u;return v};
const fail=(m,status=400)=>{throw Object.assign(new Error(m),{status})};
const audit=(u,action,detail)=>put('audit',{id:id(),at:now(),actor:u?.name||'Thiết lập',action,detail});
const finance=u=>['admin','accountant'].includes(u.role);
const admins=u=>u.role==='admin';
const visible=(u,k,r)=>{
 if(admins(u))return true;
 if(k==='attendance')return ['manager','accountant'].includes(u.role)||r.staff===u.staffId;
 if(k==='staff')return finance(u)||u.role==='manager'||r.id===u.staffId;
 if(['payruns','audit','policies'].includes(k))return finance(u);
 if(k==='importDrafts')return ['manager','records','training','accountant'].includes(u.role)||(!!r.lead?.owner&&r.lead.owner===u.staffId);
 if(k==='leads')return ['manager','records','training','accountant'].includes(u.role)||r.owner===u.staffId;
 if(['payments','installments'].includes(k)){const lead=tuitionRecord(r.lead);return finance(u)||!!lead&&visible(u,'leads',lead)}
 if(k==='tasks')return u.role==='manager'||r.assignee===u.staffId;
 if(['notifications','settlements'].includes(k))return finance(u);
 return false;
};
const canWrite=(u,k,r)=>{
 if(admins(u))return true;
 if(k==='staff')return finance(u)||(u.role==='manager'&&['sale','collaborator'].includes(r.role));
 if(k==='payruns')return finance(u);
 if(['payments','installments','settlements'].includes(k))return finance(u);
 if(k==='importDrafts')return ['manager','records','training','accountant'].includes(u.role)||(!!r.lead?.owner&&r.lead.owner===u.staffId);
 if(k==='leads')return visible(u,k,r)&&['sale','manager','collaborator','records','training'].includes(u.role);
 if(k==='tasks')return visible(u,k,r);
 return false;
};
function normalize(k,b,old,u,{correctPayment=false}={}){
 if(k==='leads'&&old&&['records','training'].includes(u.role)){
 const allowed=u.role==='records'?['cccd','documents','handover','handoverDate','receiptCode','documentHolder','note']:['theory','simulation','datHours','datKm','datVerified','cabin','certificate','exam','nextSchedule','trainingHistory','evidence'];
 b={...old,...Object.fromEntries(Object.entries(b).filter(([key])=>allowed.includes(key)))};
 }
 let r={...b,id:old?.id||id(),updatedAt:now()};
 if(['payments','settlements'].includes(k)&&b.paymentPhase!==undefined&&b.paymentPhase!==''){if(!(k==='payments'?[1,2,3,4]:[1,2,3]).includes(Number(b.paymentPhase)))fail('Chọn đợt thanh toán hợp lệ');r.paymentPhase=Number(b.paymentPhase)}
 const money=n=>{n=Number(n||0);if(!Number.isSafeInteger(n)||n<0)fail('Số tiền phải là số nguyên không âm');return n};
 if(k==='staff'){
 if(!r.name?.trim()||!['sale','manager','collaborator','records','training','accountant'].includes(r.role))fail('Kiểm tra tên và vai trò');
 for(const f of ['base','allowance','deduction','advance'])r[f]=money(r[f]);
 r.joinDate=String(r.joinDate||'');if(r.joinDate&&!validDate(r.joinDate))fail('Ngày vào làm không hợp lệ');
 if(r.joinDate&&all('attendance').some(e=>e.staff===r.id&&e.date<r.joinDate))fail('Có chấm công trước ngày vào làm mới; đối soát chấm công trước');
 if(old&&old.role!==r.role&&all('leads').some(l=>l.owner===old.id))fail('Nhân sự đã có hồ sơ: giữ vai trò để bảo toàn lịch sử KPI');
 }
 if(k==='leads'){
 if(!r.name?.trim()||!r.phone?.trim())fail('Cần họ tên và số điện thoại (bắt buộc)');
 r.phone=r.phone.trim();
 r.cccd=String(r.cccd??'').trim();
 if(!r.cccd)fail('Số CCCD là thông tin bắt buộc');
 if(!/^\d{12}$/.test(r.cccd))fail('Số CCCD phải gồm đúng 12 chữ số');
 if(!get('staff',r.owner)||!['sale','manager','collaborator'].includes(get('staff',r.owner).role))fail('Chọn nhân sự tuyển sinh');
 if(!['B1','B2','C1'].includes(r.schoolCategory))fail('Chọn gói phí trường B1/B2/C1');
 if(!['personal','company'].includes(r.source)||!['new','consulting','won','cancelled','finished'].includes(r.status))fail('Nguồn hoặc trạng thái không hợp lệ');
 if(!['B tự động','B số cơ khí','C1','B1/B2 lịch sử'].includes(r.license))fail('Chọn hạng đào tạo');
 if(!admins(u)&&['sale','collaborator'].includes(u.role)&&r.owner!==u.staffId)fail('Chỉ tạo hồ sơ của mình',403);
 r.schoolFee=money(old?.schoolFee??r.schoolFee??({'B1':6500000,'B2':7000000,'C1':8500000}[r.schoolCategory]||0));
 if(old&&finance(u)&&r.schoolFee!==old.schoolFee)r.schoolFee=old.schoolFee;
 r.tuition=money(r.tuition);
 r.school=SCHOOL;
 r.openingDate=String(r.openingDate||'');if(r.openingDate&&!validDate(r.openingDate))fail('Ngày khai giảng không hợp lệ');
 r.firstInstallment=2500000;
 if(r.firstInstallment&&!FIRST_AMOUNTS.includes(r.firstInstallment))fail('Đợt 1 phải chọn một trong bốn mức mặc định');
 if(r.firstInstallment&&r.firstInstallment+(SECOND_AMOUNTS[r.schoolCategory]||0)>r.tuition)fail('Học phí phải đủ tổng đợt 1 và đợt 2');
 for(const key of ['phase3ConfirmedAt','phase3ConfirmedBy','firstPaidAt','phase2ConfirmedAt','phase2ConfirmedBy','datCompletedAt','datCompletedBy','examRegistrations'])r[key]=old?.[key]||'';
 r.depositConfirmed=old?.depositConfirmed||0;
 r.kpiDate=r.kpiDate||date();
 if(['won','finished'].includes(r.status))r.wonDate=old?.wonDate||r.kpiDate;else r.wonDate=old?.wonDate||'';if(!/^\d{4}-\d{2}-\d{2}$/.test(r.kpiDate))fail('Ngày KPI không hợp lệ');
 if(all('leads').some(l=>l.id!==r.id&&l.phone.replace(/\D/g,'')===r.phone.replace(/\D/g,'')))fail('Số điện thoại đã tồn tại. Mở hồ sơ cũ để kiểm tra.');
 if(old&&!['admin','manager'].includes(u.role)){
 for(const f of ['owner','source','kpiDate'])r[f]=old[f];
 if(['records','training'].includes(u.role)){for(const f of ['name','phone','tuition','status','license'])r[f]=old[f]}
 }
 if(old&&r.status==='cancelled'&&old.status!=='cancelled'&&!r.cancelReason?.trim())fail('Nhập lý do hủy hồ sơ trong ghi chú hủy');
 }
 if(k==='payments'){
 if(old&&!correctPayment)fail('Phiếu thu/chi không được sửa. Tạo phiếu đảo có tham chiếu để giữ lịch sử.');
 r.amount=money(r.amount);if(!r.amount)fail('Số tiền phải lớn hơn 0');
 if(!['receipt','expense','refund'].includes(r.type))fail('Loại giao dịch không hợp lệ');
 if(r.type!=='expense'&&!tuitionRecord(r.lead))fail('Chọn học viên');
 if(!r.reference?.trim())fail('Nhập mã giao dịch/chứng từ');
 if([...all('payments'),...all('archivedExpenses')].some(p=>p.id!==old?.id&&p.reference===r.reference))fail('Mã chứng từ đã được dùng');
 r.confirmedBy=old?.confirmedBy||u.name;r.createdAt=old?.createdAt||now();r.date=r.date||date();if(!validDate(r.date))fail('Ngày giao dịch không hợp lệ');r.deposit=r.deposit===true;
 if(r.type==='expense'){
 r.reason=String(r.reason||r.note||'').trim();if(!r.reason||!r.spender?.trim())fail('Chi phí vận hành cần lý do chi và người chi');
 }

 if(r.type==='refund'){
 const student=tuitionRecord(r.lead),net=student?tuitionReceived(student):0;
 if(r.amount>net+(old?.type==='refund'&&old.lead===r.lead?old.amount:old?.type==='receipt'&&old.lead===r.lead?-old.amount:0))fail('Hoàn tiền vượt số đã thu');
 }
 }
 if(k==='settlements'){
 if(old)fail('Thanh toán trường không được sửa; tạo giao dịch hoàn/đảo để giữ lịch sử');
 r.school=SCHOOL;
 if(!r.reference?.trim())fail('Nhập mã chứng từ');
 if(!['transfer','cash'].includes(r.method))fail('Chọn chuyển khoản hoặc tiền mặt');
 if(!validDate(r.date))fail('Ngày nộp tiền là bắt buộc và phải hợp lệ');
 if([...all('settlements'),...all('archivedSettlements')].some(x=>x.reference===r.reference))fail('Mã chứng từ đã tồn tại');
 if(!['pay','return'].includes(r.type))fail('Loại giao dịch không hợp lệ');
 const aggregate=r.lead==='__all__',l=aggregate?null:tuitionRecord(r.lead);if(!aggregate&&!l)fail('Chọn hồ sơ thanh toán cho trường');
 if(aggregate){r.scope='all';r.profileCount=tuitionRecords().filter(l=>!l.archived).length;r.profileIds=tuitionRecords().filter(l=>!l.archived).map(l=>l.id)}
 r.amount=money(r.amount);if(!r.amount)fail('Số tiền phải lớn hơn 0');
 const paid=all('settlements').filter(x=>x.lead===r.lead).reduce((a,x)=>a+(x.type==='pay'?x.amount:-x.amount),0);
 if(r.type==='pay'&&r.amount>currentSchoolSummary().remaining)fail('Vượt tổng công nợ trường đã đối soát');
 if(!aggregate&&r.type==='pay'&&paid+r.amount>l.schoolFee)fail('Vượt phí trường của hồ sơ');
 if(r.type==='return'&&r.amount>paid)fail('Tiền trường hoàn vượt số đã trả');
 r.date=r.date||date();r.confirmedBy=u.name;r.createdAt=now();
 }
 if(k==='installments'){
 if(!get('leads',r.lead))fail('Chọn học viên');r.amount=money(r.amount);if(!r.due)fail('Chọn hạn thanh toán');
 }
 if(k==='tasks'){if(!r.title?.trim()||!get('staff',r.assignee))fail('Nhập công việc và người phụ trách');if(!['open','doing','done'].includes(r.status))fail('Trạng thái công việc không hợp lệ')}
 if(k==='leads')r=synchronizeStudentCourse(r);
 return r;
}
function locked(month){return /^\d{4}-\d{2}$/.test(String(month||''))&&isPayrollLocked(get('payruns',month))}
function attendanceContext(month){return {entries:all('attendance'),standardDays:setting('attendanceStandard-'+month,26)}}
function validateHistoricalAttendance(job,staff){
 return validateAttendanceImport(job.rows,staff,all('attendance'),date(),month=>month>'2026-09'&&locked(month),{historical:true});
}
function sourceKpiForMonth(month){
 const staff=all('staff');
 return all('attendanceSourceKpi').filter(row=>row.month===month).map(row=>{
  const matches=staff.filter(person=>normalizeText(person.name)===normalizeText(row.employee));
  return {...row,staff:matches.length===1?matches[0].id:''};
 });
}
function payrollRecords(){return all('leads').map(l=>{
 const first=all('payments').filter(p=>p.lead===l.id&&p.type==='receipt'&&p.deposit).map(p=>p.date).filter(Boolean).sort()[0];
 return {...l,firstDepositDate:first||'',ownerRole:get('staff',l.owner)?.role};
})}
function payrollDiagnostics(month){return payrollRecords().map(l=>{
 const isCTV=l.ownerRole==='collaborator',qualified=isCTV||(['won','finished'].includes(l.status)&&l.depositConfirmed>0);
 const earned=effectiveDate(l);let reason=!get('staff',l.owner)?'Chưa gán đúng nhân sự':!qualified?(!['won','finished'].includes(l.status)?'Chưa chốt thành công':'Chưa có phiếu cọc xác nhận'):earned.slice(0,7)!==month?`Thuộc kỳ ${earned.slice(0,7)||'chưa xác định'}`:'Được tính trong kỳ';
 return {id:l.id,name:l.name,owner:l.owner,source:l.source,status:l.status,deposit:l.depositConfirmed||0,earnedDate:earned,included:qualified&&earned.slice(0,7)===month,reason};
})}
function refreshDeposit(leadId){const l=tuitionRecord(leadId);if(!l)return;l.depositConfirmed=Math.max(0,all('payments').filter(p=>p.lead===leadId&&p.deposit).reduce((s,p)=>s+(p.type==='receipt'?p.amount:p.type==='refund'?-p.amount:0),0));saveTuitionRecord(l)}
function checkImport(candidate,config={}){
 const keys=Object.keys(columns),mapping=Object.fromEntries(keys.map((key,index)=>[key,index]));
 const base=mappedRow(keys.map(key=>candidate.raw?.[key]??''),mapping,config);
 const r={...structuredClone(candidate),...base},l=r.lead;r.errors=[...new Set(base.errors||[])];
 const staff=config.owner?get('staff',config.owner):all('staff').filter(s=>normalizeText(s.name)===normalizeText(r.raw.ownerName)&&['sale','manager','collaborator'].includes(s.role));
 const owner=Array.isArray(staff)?staff.length===1?staff[0]:null:staff;
 if(!owner||!['sale','manager','collaborator'].includes(owner.role))r.errors.push('Chưa xác định người phụ trách');else l.owner=owner.id;
 if(!l.kpiDate)r.errors.push('Thiếu ngày ghi nhận hồ sơ');
 if(all('leads').some(x=>x.id===r.id))r.errors.push('Dòng này đã được nhập');
 for(const [key,label]of [['externalCode','mã học viên'],['cccd','CCCD'],['phone','điện thoại']])if(l[key]&&all('leads').some(x=>key==='phone'?String(x.phone||'').replace(/\D/g,'')===l.phone.replace(/\D/g,''):x[key]===l[key]))r.errors.push('Đã tồn tại '+label+' trong hệ thống');
 const kpiMonth=String(effectiveDate({...l,firstDepositDate:r.payments.find(p=>p.deposit)?.date||'',ownerRole:owner?.role})).slice(0,7);
 if(locked(kpiMonth))r.errors.push(`Kỳ lương ${kpiMonth} đã chốt hoặc đã trả lương; cần Admin đối soát trước khi thêm hồ sơ ảnh hưởng KPI kỳ này`);
 r.errors=[...new Set(r.errors)];r.lead=synchronizeStudentCourse(r.lead);return r;
}
function saveImported(row,u){
 const carried=get('importDrafts',row.id)?.lead||{};
 const handover=Object.fromEntries(['phase3ConfirmedAt','phase3ConfirmedBy','firstPaidAt','tuitionTerms','tuitionOpeningOverride','openingSync','courseSchedule','handover','handoverDate','handoverUpdatedAt','handoverUpdatedBy','handoverHistory','openingDate','course','phase2ConfirmedAt','phase2ConfirmedBy','datCompletedAt','datCompletedBy','examRegistrations'].filter(k=>carried[k]!==undefined).map(k=>[k,carried[k]]));
 const sourceProfile=get('tuitionSourceEdits',row.lead.externalCode);
 const record={...row.lead,...(sourceProfile?{name:sourceProfile.name,tuition:sourceProfile.tuition,tuitionTerms:sourceProfile.tuitionTerms}:{}),...(carried.tuitionTerms?{name:carried.name,tuition:carried.tuition}:{}),...handover,schoolFee:setting('schoolFees',{B1:6500000,B2:7000000,C1:8500000})[row.lead.schoolCategory]||0};
 if(row.raw.stage==='DAT')record.datVerified='Chưa đối soát';
 if(row.raw.stage==='Lý Thuyết')record.theory='Đang học';
 if(row.raw.stage==='Thi chứng chỉ')record.certificate='Chờ thi';
 const l=normalize('leads',record,null,u);Object.assign(l,handover);l.id=row.id;l.importedAt=now();put('leads',l);
 const source=financialSource().students.find(student=>student.code===l.externalCode||!!l.cccd&&student.cccd===l.cccd);
 for(const p of row.payments){
  const corrected=source?.receipts.find(receipt=>receipt.index===p.index&&matchesSourceReceipt(receipt,{...p,type:'receipt',sourcePaymentIndex:p.index}));
  const ref=`EXCEL-${row.id}-${p.index}`;
  const payment=normalize('payments',{lead:l.id,type:'receipt',amount:corrected?.amount??p.amount,date:corrected?.date||p.date,deposit:p.deposit,reference:ref,origin:'excel',sourcePaymentIndex:p.index,...(corrected?{sourceReceiptCode:source.code}:{}),note:'Lịch sử thu học phí nhập từ Excel'},null,u);
  put('payments',payment);
 }
 refreshDeposit(l.id);
}
function financialSource(){
 const pathStudents=path.join(ROOT,'imports','hungthinh-source.json'),pathExpenses=path.join(ROOT,'imports','financial-source.json');
 if(!existsSync(pathStudents))return {students:[],expenses:[]};
 const source=JSON.parse(readFileSync(pathStudents,'utf8')),expenseSource=existsSync(pathExpenses)?JSON.parse(readFileSync(pathExpenses,'utf8')):{expenses:[]};
 const number=v=>Number(String(v||0).replace(/[^\d-]/g,''));
 const students=source.rows.map(row=>({code:row[0],name:row[1],cccd:row[2]||'',phone:row[4]||'',ownerName:row[18]||'',category:row[3],tuition:number(row[8]),receipts:[9,11,13,15].map((col,index)=>({index:index+1,amount:number(row[col]),date:importDate(row[col+1],2026)||''})).filter(p=>p.amount>0)}));
 const sourceEdits=new Map(all('tuitionSourceEdits').map(row=>[row.id,row]));
 const effectiveStudents=students.map(student=>{
  const profile=sourceEdits.get(student.code);
  return {...student,...(profile?{name:profile.name,tuition:profile.tuition,tuitionTerms:profile.tuitionTerms}:{}),receipts:student.receipts.map(receipt=>{
   const correction=sourceEdits.get(student.code+':'+receipt.index);
   return {...receipt,code:student.code,...(correction?{amount:correction.amount,date:correction.date,originalAmount:receipt.amount,originalDate:receipt.date}:{})};
  })};
 });
 const details=all('sourceExpenseDetails');return {students:effectiveStudents,capitalContributions:expenseSource.capitalContributions||[],capitalTotal:Number(expenseSource.capitalTotal||0),expenses:expenseSource.expenses.map(e=>{const detail=details.find(d=>d.id===e.id);return {...e,...detail,originalMonth:e.month,month:detail?.date?detail.date.slice(0,7):e.month}}).filter(e=>!e.deleted)};
}
function studentCodeKey(student,sourceStudents){
 const source=sourceStudents.find(row=>row.code===(student.externalCode||student.code)||!!student.cccd&&row.cccd===student.cccd);
 return source?'source:'+source.code:student.id?'id:'+student.id:'';
}
function syncStudentCodes(){
 const registry=setting('studentCodes',{}), candidates=new Map(),sourceStudents=financialSource().students;
 for(const student of sourceStudents){
  const firstReceipt=student.receipts.find(receipt=>receipt.index===1);
  candidates.set('source:'+student.code,firstReceipt?.date||'');
 }
 const students=[...all('importDrafts').filter(draft=>draft.status==='pending').map(draft=>({...draft.lead,id:draft.id})),...all('leads')];
 for(const student of students){
  const key=studentCodeKey(student,sourceStudents);
  const closed=[student.wonDate,student.kpiDate,candidates.get(key)].find(validDate)||'';
  candidates.set(key,closed);
 }
 const pending=[...candidates].filter(([key])=>key&&!registry[key]);
 pending.sort(([a,ad],[b,bd])=>(ad||'9999-12-31').localeCompare(bd||'9999-12-31')||a.localeCompare(b));
 let sequence=Math.max(0,...Object.values(registry).map(code=>Number(code.slice(2))||0));
 for(const [key] of pending)registry[key]='HT'+String(++sequence).padStart(4,'0');
 if(pending.length)set('studentCodes',registry);
}
function addStudentCodes(data){
 const registry=setting('studentCodes',{}),sourceStudents=financialSource().students;
 const decorate=student=>({...student,studentCode:registry[studentCodeKey(student,sourceStudents)]||''});
 data.leads=data.leads.map(decorate);
 data.importDrafts=data.importDrafts.map(draft=>({...draft,lead:decorate({...draft.lead,id:draft.id})}));
 data.courseSync=data.courseSync.map(decorate);
 data.tuitionVerification=data.tuitionVerification.map(decorate);
 data.archivedStudents=data.archivedStudents.map(row=>({...row,studentCode:registry[studentCodeKey({id:row.studentId,code:row.code},sourceStudents)]||''}));
 if(data.financialSummary)data.financialSummary.students=data.financialSummary.students.map(decorate);
}
function currentFinancialOverview(){const s=financialSource(),ledger=currentSchoolLedgers(),vietPaid=ledger.viet.reduce((sum,r)=>sum+Number(r.amount),0),hungPaid=ledger.hung.reduce((sum,r)=>sum+Number(r.amount),0),overview=financialOverview(s.students,s.expenses,tuitionRecords(),all('payments'),currentSchoolSummary());return {...overview,vietPaid,hungPaid,totalSpent:overview.totalSpent+vietPaid+hungPaid,operatingByMonth:operatingCostsByMonth(s.expenses,all('payments'))}}

function applyAdmissionsAssignment(){
 if(setting('admissionsAssignmentV114',null))return;
 const name='DƯƠNG XUÂN QUYỀN',matches=all('staff').filter(s=>normalizeText(s.name)===normalizeText(name));
 if(matches.length>1){audit(null,'Chưa áp dụng phân công tuyển sinh','Có nhiều nhân sự trùng tên DƯƠNG XUÂN QUYỀN; cần đối soát');return}
 let owner=matches[0];
 db.exec('BEGIN');try{
 if(!owner){owner={id:id(),name,role:'manager',base:0,allowance:0,deduction:0,advance:0};put('staff',owner)}
 if(!['sale','manager','collaborator'].includes(owner.role))throw Error('Nhân sự DƯƠNG XUÂN QUYỀN chưa có vai trò tuyển sinh phù hợp');
 let leadsCount=0,draftsCount=0;
 for(const l of all('leads')){if(l.owner!==owner.id||l.source!=='company'){l.assignmentHistory=[...(l.assignmentHistory||[]),{at:now(),owner:l.owner,source:l.source,reason:'Người dùng yêu cầu toàn bộ hồ sơ về DƯƠNG XUÂN QUYỀN / Data công ty'}];l.owner=owner.id;l.source='company';put('leads',l);leadsCount++}}
 for(const d of all('importDrafts').filter(d=>d.status==='pending')){
 d.previousAssignment=d.previousAssignment||{owner:d.lead?.owner,source:d.lead?.source,ownerName:d.raw?.ownerName};
 d.raw={...d.raw,ownerName:name,source:'company'};d.lead={...d.lead,owner:owner.id,source:'company'};
 const keys=Object.keys(columns),mapping=Object.fromEntries(keys.map((k,i)=>[k,i]));
 const config={owner:owner.id,source:'company',year:2026,defaultDate:d.lead.kpiDate||''};
 const parsed=mappedRow(keys.map(k=>d.raw[k]??''),mapping,config);const refreshed=checkImport({...parsed,id:d.id,row:d.row},config);d.errors=refreshed.errors;
 put('importDrafts',d);draftsCount++;
 }
 set('admissionsAssignmentV114',{owner:owner.id,name,source:'company',at:now(),leadsCount,draftsCount});
 audit(null,'Cập nhật phân công toàn bộ hồ sơ theo yêu cầu',`${leadsCount} hồ sơ chính thức, ${draftsCount} hồ sơ chờ; giữ nguyên bảng lương đã chốt`);db.exec('COMMIT');
 }catch(e){db.exec('ROLLBACK');throw e}
}
function applyCourseOpeningSync(){
 if(setting(COURSE_SYNC_VERSION,false))return;let matched=0,review=0,changed=0;
 db.exec('BEGIN');try{for(const l of tuitionRecords().filter(l=>!l.archived)){
 const next=synchronizeStudentCourse(l);if(next.openingSync.needsReview)review++;else matched++;
 if(next.firstInstallment!==l.firstInstallment||next.openingDate!==l.openingDate){put('studentCourseHistory',{id:id(),studentId:l.id,before:{course:l.course,openingDate:l.openingDate||'',firstInstallment:l.firstInstallment},after:{course:next.course,openingDate:next.openingDate||'',firstInstallment:2500000},at:now(),by:'Cập nhật lịch khai giảng1.2.7'});changed++}
 saveTuitionRecord(next);
 }set(COURSE_SYNC_VERSION,{matched,review,changed,at:now()});audit(null,'Đồng bộ khai giảng và đợt1 toàn bộ học viên',JSON.stringify({matched,review,changed,firstInstallment:2500000}));db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
}
function tuitionRecords(){return buildLeadDirectory(all('leads'),all('importDrafts'),true)}
function tuitionRecord(id){return tuitionRecords().find(l=>l.id===id&&!l.archived)}
function saveTuitionRecord(l){l=synchronizeStudentCourse(l);if(l._pending){const d=get('importDrafts',l.id),lead={...l,status:l._originalStatus||d.lead.status};for(const key of ['_pending','_originalStatus','_draftId','_ownerName','_errors'])delete lead[key];put('importDrafts',{...d,lead})}else put('leads',l)}
function tuitionReceived(l){const source=financialSource().students.find(s=>s.code===l.externalCode||!!l.cccd&&s.cccd===l.cccd);return currentFinancialOverview().students.find(s=>s.id===l.id||source&&s.code===source.code)?.received??balance(l)}
function examGate(l){return {...examTuitionEligibility(l,tuitionReceived(l)),registrations:Array.isArray(l.examRegistrations)?l.examRegistrations:[]}}
function currentTuitionPlan(l){
 if(!l)return {configured:false,reason:'Không tìm thấy học viên',phases:[]};
 const source=financialSource().students.find(s=>s.code===l.externalCode||!!l.cccd&&s.cccd===l.cccd);
 const total=currentFinancialOverview().students.find(s=>s.id===l.id||source&&s.code===source.code);
 const receipts=all('payments').filter(p=>p.lead===l.id&&p.type==='receipt'),explicit=receipts.filter(p=>Number(p.paymentPhase||p.sourcePaymentIndex)===1),firstSource=source?.receipts.find(p=>p.index===1);const firstPaidAt=l.firstPaidAt||firstSource?.date||(!firstSource?firstInstallmentPaidDate(explicit.length?explicit:receipts,Number(l.tuitionTerms?.amounts?.[0]??l.firstInstallment??0)):'')||'';
 return tuitionPlan({...l,standardFirstInstallment:2500000,firstPaidAt,status:l._pending?l._originalStatus||'new':l.status,historicalFirstInstallment:firstSource?.amount||0},total?.received??balance(l));
}
function sourceTuitionVerification(){
 const source=financialSource(),overview=currentFinancialOverview();
 return source.students.map(student=>{
  const current=overview.students.find(row=>row.code===student.code);
  const received=current?.received??student.receipts.reduce((sum,receipt)=>sum+receipt.amount,0);
  const linked=current?.id?tuitionRecord(current.id):null;
  return verifyTuitionSource({...student,tuition:current?.tuition??student.tuition,tuitionTerms:linked?.tuitionTerms||student.tuitionTerms},received,2500000);
 });
}
function currentSchoolLedgers(){return schoolThreeLedgers(financialSource().students,all('payments'),tuitionRecords(),all('settlements'),setting('schoolOpeningHTBLXV01',null),all('schoolTransfers'),all('schoolLedgerHidden'))}
function currentSchoolSummary(){return schoolSummary(tuitionRecords(),all('settlements'),setting('schoolOpeningHTBLXV01',null))}
function balance(l){return all('payments').filter(p=>p.lead===l.id).reduce((s,p)=>s+(p.type==='receipt'?p.amount:p.type==='refund'?-p.amount:0),0)}
function enqueue(n){const old=get('notifications',n.id);if(!old||n.kind==='dat'&&old.status==='cancelled')put('notifications',{at:now(),status:'pending',attempts:0,...n})}
function tuitionChange(u,action,student,before,after,fields,reason=''){
 const changed=Object.entries(fields).filter(([key])=>JSON.stringify(before?.[key]??'')!==JSON.stringify(after?.[key]??''));
 if(!changed.length)return false;
 const key=id();
 put('tuitionHistory',{id:key,at:now(),by:u.name,action,student:student?.id||student?.code||'',before,after,reason});
 const registry=setting('studentCodes',{}),code=student?registry[studentCodeKey(student,financialSource().students)]:'';
 const format=value=>{
  if(value==null||value==='')return '—';
  if(typeof value==='boolean')return value?'Có':'Không';
  if(value.amounts)return value.amounts.map((amount,index)=>'Đợt '+(index+1)+': '+amount.toLocaleString('vi-VN')+'đ').join(', ')+'; hạn: '+value.dates.slice(1).map(day=>day||'tự tính').join(', ');
  return String(value).slice(0,180);
 };
 const summary=changed.map(([field,label])=>['note','lead','reference'].includes(field)?label+': đã cập nhật':label+': '+format(before?.[field])+' → '+format(after?.[field])).join('\n');
 enqueue({id:'tuition-change-'+key,kind:'tuition-change',text:(`⚠️ THAY ĐỔI HỌC VIÊN THANH TOÁN\n${action}\n${code||student?.code||'Học viên'} · ${student?.name||''}\nNgười sửa: ${u.name}\n${summary}`).slice(0,3500)});
 audit(u,action,code||student?.code||student?.id||'');
 return true;
}
const receiptFields={lead:'Học viên',type:'Loại phiếu',amount:'Số tiền',date:'Ngày',paymentPhase:'Đợt',deposit:'Tiền cọc',reference:'Chứng từ',note:'Ghi chú'};
const installmentFields={lead:'Học viên',amount:'Số tiền',due:'Hạn đóng',note:'Ghi chú'};
const tuitionProfileFields={name:'Họ tên',tuition:'Học phí',course:'Khóa',openingDate:'Khai giảng',firstPaidAt:'Ngày đóng đợt 1',phase3ConfirmedAt:'Xác minh đợt 3',tuitionTerms:'Mức tiền và hạn từng đợt',note:'Ghi chú'};
function tuitionTransaction(work){
 db.exec('BEGIN');
 try{const result=work();db.exec('COMMIT');return result}catch(error){db.exec('ROLLBACK');throw error}
}
function queueTuitionDelivery(){
 // Reuse the outbox and its retry loop.
 const {token,chatId}=telegramConfig();
 if(token&&chatId)void tick().catch(()=>{});
}
function enforceDepositLock(leadId,paymentDate){
 const student=payrollRecords().find(row=>row.id===leadId);
 if(student&&[student.kpiDate,effectiveDate(student),effectiveDate({...student,firstDepositDate:paymentDate})].some(day=>day&&locked(day.slice(0,7))))fail('Kỳ KPI đã chốt. Mở lại kỳ trước khi sửa tiền cọc');
}
function sourcePaymentMatches(source,leadId){
 const used=new Set(),matches=new Map();
 for(const payment of all('payments').filter(row=>row.lead===leadId)){
  const slot=source?.receipts.find(row=>!used.has(row.index)&&matchesSourceReceipt(row,payment));
  if(slot){used.add(slot.index);matches.set(payment.id,{receipt:slot,payment})}
 }
 return matches;
}
function requireTuitionBalance(student){
 if(student&&tuitionReceived(student)<0)fail('Sửa phiếu sẽ làm tiền thu ròng âm');
}
function scheduleReminders(){
 const today=date();
 for(const l of tuitionRecords().filter(l=>!l.archived&&l.status!=='cancelled'&&l._originalStatus!=='cancelled')){
 const plan=currentTuitionPlan(l);if(!plan.configured)continue;
 for(const p of plan.phases.filter(p=>p.phase>1&&p.active&&p.due&&p.remaining>0)){
 const advance=tuitionAdvanceReminderDue(p,today);if(!advance&&!tuitionReminderDue(p,today))continue;
 enqueue({id:`tuition-${l.id}-${p.phase}-${p.due}-${TUITION_RULE_VERSION}${advance?'-before3':''}`,kind:'tuition',reminderType:advance?'before3':'due',ruleVersion:TUITION_RULE_VERSION,due:p.due,lead:l.id,phase:p.phase,text:`${advance?'NHẮC TRƯỚC 3 NGÀY — ':''}HỌC PHÍ ${p.phase===4?'ĐỢT CUỐI — TẤT TOÁN':'ĐỢT '+p.phase}\nHọc viên: ${l.name}\nKhóa: ${l.course||'Chưa có'} | Khai giảng: ${l.openingDate||'Chưa có'}\nHạn: ${p.due}\nCòn phải đóng đợt này: ${p.remaining.toLocaleString('vi-VN')}đ`});
 }
 if(l.phase3ConfirmedAt&&plan.phase3CanConfirm)enqueue({id:`dat-register-${l.id}`,kind:'dat',lead:l.id,text:`ĐỀ NGHỊ ĐĂNG KÝ DAT\nHọc viên: ${l.name}\nHạng: ${l.schoolCategory} | Khóa: ${l.course||'Chưa có'}\nĐã xác nhận đóng đủ đợt 3: ${l.phase3ConfirmedAt}\nTrường: ${SCHOOL}\nĐây là yêu cầu đăng ký; cần trường xác nhận tiếp nhận.`});
 }
 // Preserve legacy manual schedules only for students not yet using the three-phase plan.
 for(const i of all('installments')){
 const l=get('leads',i.lead);if(!l||l.status==='cancelled'||currentTuitionPlan(l).configured)continue;
 const due=all('installments').filter(t=>t.lead===l.id&&t.due<=i.due).reduce((s,t)=>s+t.amount,0),days=Math.round((new Date(i.due+'T00:00:00Z')-new Date(today+'T00:00:00Z'))/86400000);
 if(balance(l)>=due||![3,1,0,-3].includes(days))continue;
 enqueue({id:`reminder-${i.id}-${today}`,kind:'legacy',lead:l.id,installment:i.id,text:`Nhắc học phí: ${l.name} • hạn ${i.due} • còn đến kỳ: ${(due-balance(l)).toLocaleString('vi-VN')}đ`});
 }
 if([1,25].includes(Number(today.slice(8)))){
 const debts=schoolDebt(all('leads'),all('settlements')),summary=currentSchoolSummary();if(summary.remaining>0)enqueue({id:`school-due-${today}`,kind:'school',text:`ĐẾN KỲ THANH TOÁN TRƯỜNG ${today}\n${SCHOOL}\nTổng còn phải trả sau đối soát: ${summary.remaining.toLocaleString('vi-VN')}đ\nSố đã trả lịch sử đã xác nhận: ${summary.historicalPaid.toLocaleString('vi-VN')}đ\nNợ lịch sử chưa phân bổ theo từng hồ sơ; kiểm tra sổ trước khi nộp\nMở Thanh toán trường để đối soát và ghi nhận từng khoản nộp thực tế.`});
 }
}
function notificationActive(n){
 if(n.kind==='tuition-change')return true;
 const l=n.lead?tuitionRecord(n.lead):null;if(n.lead&&(!l||l.status==='cancelled'||l._originalStatus==='cancelled'))return false;
 if(n.kind==='tuition'){const p=currentTuitionPlan(l).phases.find(p=>p.phase===n.phase);return n.ruleVersion===TUITION_RULE_VERSION&&!!p&&p.active&&p.remaining>0&&p.due===n.due&&(n.reminderType==='before3'?tuitionAdvanceReminderDue(p,date()):tuitionReminderDue(p,date()))}
 if(n.kind==='dat')return !!l.phase3ConfirmedAt&&currentTuitionPlan(l).phase3CanConfirm;
 if(n.kind==='school')return currentSchoolSummary().remaining>0&&n.id===`school-due-${date()}`;
 if(n.installment&&l){const i=get('installments',n.installment);if(!i)return false;return !currentTuitionPlan(l).configured&&balance(l)<all('installments').filter(t=>t.lead===l.id&&t.due<=i.due).reduce((s,t)=>s+t.amount,0)}return true;
}
async function sendNotifications(){
 const c=telegramConfig();if(!c.token||!c.chatId)return;
 for(const n of all('notifications').filter(n=>n.status==='pending'&&n.attempts<3)){
 if(!notificationActive(n)){n.status='cancelled';put('notifications',n);continue}
 if(n.kind==='tuition'){const p=currentTuitionPlan(tuitionRecord(n.lead)).phases.find(p=>p.phase===n.phase);n.text=n.text.replace(/Còn phải đóng đợt này: .*/,`Còn phải đóng đợt này: ${p.remaining.toLocaleString('vi-VN')}đ`)}
 if(n.kind==='school')n.text=n.text.replace(/Tổng còn phải trả sau đối soát: .*/,`Tổng còn phải trả sau đối soát: ${currentSchoolSummary().remaining.toLocaleString('vi-VN')}đ`);
 n.attempts++;try{const result=await telegramCall('sendMessage',{chat_id:c.chatId,text:n.text});n.status='sent';n.sentAt=now();n.messageId=result.message_id;n.error=''}catch(e){n.error=e.message;if(n.attempts>=3)n.status='failed'}put('notifications',n);
 }
}
let working=false;async function tick(){if(working)return;working=true;try{scheduleReminders();await sendNotifications()}finally{working=false}};
const attempts=new Map();
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Cache-Control','no-store');res.setHeader('Content-Security-Policy',"default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; frame-ancestors 'none'");
 const json=(v,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(v))};
 try{
 const url=new URL(req.url,'http://localhost');
 const host=req.headers.host||'';if(!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)&&!(lan&&localIPs.includes(host.split(':')[0])))fail('Host không được phép',403);
 let b={};if(req.method==='POST'){
 if(req.headers.origin&&new URL(req.headers.origin).host!==host)fail('Nguồn yêu cầu không hợp lệ',403);
 if(!String(req.headers['content-type']).startsWith('application/json'))fail('Cần JSON',415);
 let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>(['/api/import/file','/api/attendance/import-file'].includes(url.pathname)?9000000:url.pathname==='/api/restore'?50000000:1500000))fail('Dữ liệu quá lớn',413)}try{b=JSON.parse(raw||'{}')}catch{fail('JSON không hợp lệ')}
 }
 if(url.pathname==='/api/status')return json({setup:!all('users').length});
 if(url.pathname==='/api/setup'&&req.method==='POST'){
 if(all('users').length)fail('Đã thiết lập',403);if(!b.name?.trim()||!b.username?.trim()||String(b.password).length<10)fail('Tên đăng nhập và mật khẩu tối thiểu 10 ký tự');
 put('users',{id:id(),name:b.name,username:b.username,password:hash(b.password),role:'admin'});set('policy',defaults);audit(null,'Khởi tạo quản trị','');return json({ok:true});
 }
 if(url.pathname==='/api/login'&&req.method==='POST'){
 const key=req.socket.remoteAddress,limit=attempts.get(key)||{count:0,until:0};if(limit.until>Date.now())fail('Thử lại sau 5 phút',429);
 const u=all('users').find(u=>u.username===b.username);if(!u||!verify(String(b.password),u.password)){limit.count++;if(limit.count>=10){limit.until=Date.now()+300000;limit.count=0}attempts.set(key,limit);fail('Sai tài khoản hoặc mật khẩu',401)}
 attempts.delete(key);const token=id()+id();db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(token,u.id,Date.now()+8*3600000);res.setHeader('Set-Cookie',`sid=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`);return json(safe(u));
 }
 if(!url.pathname.startsWith('/api/')){
 const files={'/':'index.html','/app.js':'app.js','/lead-list.mjs':'lead-list.mjs','/style.css':'style.css'};const f=files[url.pathname];if(!f)fail('Không tìm thấy',404);res.setHeader('Content-Type',(f.endsWith('.js')||f.endsWith('.mjs'))?'text/javascript':f.endsWith('.css')?'text/css':'text/html; charset=utf-8');return res.end(readFileSync(path.join(ROOT,'public',f)));
 }
 const token=(req.headers.cookie||'').match(/(?:^|; )sid=([a-f0-9]+)/)?.[1];const session=token&&db.prepare('SELECT * FROM sessions WHERE token=? AND expires>?').get(token,Date.now());const u=session&&get('users',session.user);if(!u)fail('Vui lòng đăng nhập',401);
 if(url.pathname==='/api/me')return json(safe(u));
 if(url.pathname==='/api/logout'&&req.method==='POST'){profitAccess.delete(token);db.prepare('DELETE FROM sessions WHERE token=?').run(token);res.setHeader('Set-Cookie','sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json({ok:true})}
 if(url.pathname==='/api/profit'||url.pathname.startsWith('/api/profit/')){
  if(!admins(u))fail('Bảng lợi nhuận chỉ dành cho Admin',403);
  const key=profitPasswordKey(u.id),passwordHash=setting(key,''),unlocked=(profitAccess.get(token)||0)>Date.now();
  if(url.pathname==='/api/profit/status'&&req.method==='GET')return json({configured:!!passwordHash,unlocked});
  if(url.pathname==='/api/profit'&&req.method==='GET'){
   if(!unlocked)fail('Nhập mật khẩu riêng để mở bảng lợi nhuận',403);
   return json(profitOverview(currentFinancialOverview(),currentSchoolSummary()));
  }
  if(url.pathname==='/api/profit/lock'&&req.method==='POST'){profitAccess.delete(token);return json({ok:true})}
  if(url.pathname==='/api/profit/password'&&req.method==='POST'){
   const password=String(b.password||'');
   if(password.length<10||password.length>128||password!==b.confirm)fail('Mật khẩu riêng cần 10–128 ký tự và xác nhận khớp');
   if(verify(password,u.password))fail('Chọn mật khẩu khác mật khẩu đăng nhập');
   if(passwordHash&&!unlocked)fail('Mở bảng lợi nhuận trước khi đổi mật khẩu',403);
   set(key,hash(password));
   for(const active of db.prepare('SELECT token FROM sessions WHERE user=?').all(u.id))profitAccess.delete(active.token);
   profitAttempts.delete(u.id);
   audit(u,'Thiết lập mật khẩu bảng lợi nhuận','');
   return json({ok:true});
  }
  if(url.pathname==='/api/profit/unlock'&&req.method==='POST'){
   const attempt=profitAttempts.get(u.id)||{count:0,until:0};
   if(attempt.until>Date.now())fail('Thử lại sau 5 phút',429);
   if(attempt.until)attempt.count=0;
   if(!passwordHash||String(b.password||'').length>128||!verify(String(b.password||''),passwordHash)){
    attempt.count++;
    attempt.until=attempt.count>=5?Date.now()+300000:0;
    profitAttempts.set(u.id,attempt);
    fail('Sai mật khẩu bảng lợi nhuận',403);
   }
   profitAttempts.delete(u.id);
   profitAccess.set(token,Math.min(session.expires,Date.now()+900000));
   return json({ok:true});
  }
  fail('Không tìm thấy thao tác',404);
 }
 if(url.pathname==='/api/state'){
 const data={};for(const k of ['leads','staff','payments','installments','tasks','payruns','notifications','audit','settlements','importDrafts'])data[k]=all(k).filter(r=>visible(u,k,r)&&!(k==='leads'&&r.archived)&&!(k==='importDrafts'&&r.lead?.archived));
 if(u.role==='manager')data.staff=data.staff.map(s=>({id:s.id,name:s.name,role:s.role,joinDate:s.joinDate||''}));
 data.users=admins(u)?all('users').map(safe):u.role==='manager'?all('users').filter(x=>['sale','collaborator'].includes(x.role)).map(safe):[];data.schoolFees=setting('schoolFees',{B1:6500000,B2:7000000,C1:8500000});data.policy=finance(u)?setting('policy',defaults):null;data.release='htblxv01';data.version='1.3.0';data.firstInstallmentDefault=2500000;data.tuitionReviews=finance(u)?all('tuitionReviews'):[];data.tuitionSourceReceipts=finance(u)?financialSource().students.map(({code,receipts})=>({code,receipts})):[];data.courseSync=buildLeadDirectory(data.leads,data.importDrafts).map(l=>({id:l.id,code:l.externalCode,name:l.name,category:l.schoolCategory,course:l.course,openingDate:l.openingDate||'',...l.openingSync}));data.schoolLedgers=finance(u)?currentSchoolLedgers():null;data.schoolLedgerHistory=finance(u)?all('schoolLedgerHistory').sort((a,b)=>a.at.localeCompare(b.at)):[];data.archivedStudents=admins(u)?all('studentArchive'):[];data.fund=finance(u)?calculateFund(financialSource().capitalTotal,currentFinancialOverview()):null;data.capitalContributions=finance(u)?financialSource().capitalContributions:[];data.tuitionVerification=finance(u)?sourceTuitionVerification():[];data.admissionsAssignment=setting('admissionsAssignmentV114',null);data.financialSummary=finance(u)?currentFinancialOverview():null;data.sourceExpenses=finance(u)?financialSource().expenses:[];data.expenseHistory=finance(u)?all('expenseHistory').sort((a,b)=>a.at.localeCompare(b.at)):[];data.schoolSummary=finance(u)?currentSchoolSummary():null;data.schoolOpening=finance(u)?setting('schoolOpeningHTBLXV01',null):null;data.hungthinhSource=admins(u)?setting('hungthinhSource',null):null;data.accountingStudents=finance(u)?tuitionRecords().map(l=>({id:l.id,name:l.name,externalCode:l.externalCode,archived:!!l.archived})):[];data.studentPaymentPhases=tuitionRecords().filter(l=>visible(u,l._pending?'importDrafts':'leads',l._pending?get('importDrafts',l.id):l)).map(l=>{const original=financialSource().students.find(s=>s.code===l.externalCode||!!l.cccd&&s.cccd===l.cccd);return {lead:l.id,code:l.externalCode,...paymentPhaseHistory(all('payments').filter(p=>p.lead===l.id&&p.type!=='expense'),original?.receipts||[])}});data.schoolName=SCHOOL;data.nextSchoolDue=nextSchoolDue(date());data.paymentPlans=buildLeadDirectory(data.leads,data.importDrafts).map(l=>({lead:l.id,...currentTuitionPlan(l)}));data.examEligibility=buildLeadDirectory(data.leads,data.importDrafts).map(l=>({lead:l.id,...examGate(l)}));data.schoolDebt=finance(u)?schoolDebt(all('leads').filter(l=>!historicalSchoolLead(l,setting('schoolOpeningHTBLXV01',null))),all('settlements')):[];const tg=telegramConfig();data.integrations={telegram:!!(tg.token&&tg.chatId),telegramChatId:admins(u)?tg.chatId:'',telegramTokenPresent:admins(u)?!!tg.token:false,zalo:false,ai:false};addStudentCodes(data);return json(data);
 }
 if(url.pathname==='/api/save'&&req.method==='POST'){
 const {kind,record}=b;if(!['leads','staff','payments','installments','tasks','settlements'].includes(kind))fail('Bảng không hợp lệ');
 const old=record.id?get(kind,record.id):null;
 if(kind==='staff'&&u.role==='manager'){if(old)fail('Quản lý chỉ được tạo mới nhân sự sale/CTV',403);for(const key of ['base','allowance','deduction','advance'])record[key]=0;}if(record.id&&!old)fail('Bản ghi không tồn tại');if(!canWrite(u,kind,old||record))fail('Không có quyền',403);
 if(kind==='leads')record.school=SCHOOL;
 if(kind==='leads'&&[old?.kpiDate,record.kpiDate].filter(Boolean).some(d=>locked(d.slice(0,7))))fail('Kỳ lương đã chốt; không sửa hồ sơ của kỳ đó');
 if(kind==='payments'&&record.lead&&record.deposit===true){const l=get('leads',record.lead);if(l&&locked(l.kpiDate.slice(0,7)))fail('Hồ sơ thuộc kỳ đã chốt. Mở lại kỳ trước khi điều chỉnh tài chính.')}
 if(kind==='leads'&&old?.archived)fail('Hồ sơ đã xóa lưu trữ');
 if(kind==='leads'&&old&&record.schoolCategory!==old.schoolCategory)fail('Gói trường đã lưu theo hồ sơ. Tạo đăng ký mới nếu đổi chương trình.');
 if(kind==='leads'&&!old)record.schoolFee=setting('schoolFees',{B1:6500000,B2:7000000,C1:8500000})[record.schoolCategory]||0;
 const r=normalize(kind,record,old,u);
 if(kind==='leads'){
 const enriched=payrollRecords().find(l=>l.id===r.id)||{};
 const effective=effectiveDate({...enriched,...r,ownerRole:get('staff',r.owner)?.role});
 if([effectiveDate(enriched),effective].some(d=>d&&locked(d.slice(0,7))))fail('Tháng ghi nhận KPI đã chốt; mở lại kỳ trước khi sửa');
 }
 if(kind==='payments'&&r.lead&&r.deposit===true){const enriched=payrollRecords().find(l=>l.id===r.lead);if(enriched){const candidate=effectiveDate({...enriched,firstDepositDate:enriched.firstDepositDate||r.date});if([effectiveDate(enriched),candidate].some(d=>d&&locked(d.slice(0,7))))fail('Tháng ghi nhận KPI đã chốt; mở lại kỳ trước khi ghi tiền')}}
 db.exec('BEGIN');try{if(kind==='leads'&&old)put('studentHistory',{id:id(),studentId:r.id,before:old,after:r,at:now(),by:u.name});put(kind,r);if(kind==='leads')syncStudentCodes();if(kind==='payments')refreshDeposit(r.lead);
 if(kind==='payments'&&r.type!=='expense')tuitionChange(u,'Ghi nhận phiếu học phí',tuitionRecord(r.lead),old,r,receiptFields);
 if(kind==='installments')tuitionChange(u,'Lưu lịch thanh toán',tuitionRecord(r.lead),old,r,installmentFields);
 if(kind==='leads'&&old)tuitionChange(u,'Cập nhật thông tin học phí',r,old,r,tuitionProfileFields);
 audit(u,`Lưu ${kind}`,`${r.id} ${r.name||r.title||r.reference||''}`);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}if(['leads','payments','installments'].includes(kind))queueTuitionDelivery();return json(r);
 }


 if(url.pathname==='/api/school-ledger/add'&&req.method==='POST'){
 if(!finance(u))fail('Chỉ Admin/Kế toán ghi nhận khoản tiền',403);if(!['viet','hung','school'].includes(b.group))fail('Chọn danh sách');
 if(!validDate(b.date)||b.date>date())fail('Nhập ngày thực tế hợp lệ, không ở tương lai');if(!['cash','transfer'].includes(b.method))fail('Chọn hình thức');const amount=Number(b.amount);if(!Number.isSafeInteger(amount)||amount<=0)fail('Số tiền phải là số nguyên lớn hơn0');if(!String(b.reference||'').trim())fail('Nhập mã chứng từ');
 b.reference=b.reference.trim();if([...all('schoolTransfers'),...all('archivedSchoolTransfers'),...all('settlements'),...all('archivedSettlements')].some(r=>r.reference===b.reference))fail('Mã chứng từ đã dùng ở một khoản chi khác');
 let record,kind;
 if(b.group==='school'){
 kind='settlements';record=normalize(kind,{lead:'__all__',type:'pay',amount,date:b.date,method:b.method,reference:b.reference,note:b.note||'',paymentPhase:b.paymentPhase||''},null,u);
 }else{
 kind='schoolTransfers';if([...all(kind),...all('archivedSchoolTransfers')].some(r=>r.reference===b.reference.trim()))fail('Mã chứng từ đã dùng');record={id:id(),group:b.group,amount,date:b.date,method:b.method,reference:b.reference.trim(),note:String(b.note||'').trim(),createdAt:now(),by:u.name};
 }
 db.exec('BEGIN');try{put(kind,record);put('schoolLedgerHistory',{id:id(),at:now(),by:u.name,group:b.group,action:'add',after:record});audit(u,'Bổ sung bảng thanh toán trường',JSON.stringify({group:b.group,id:record.id,amount}));db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}return json({ok:true});
 }
 if(url.pathname==='/api/school-ledger/delete'&&req.method==='POST'){
 if(!admins(u))fail('Chỉ Quản trị viên được xóa khoản tiền',403);if(!String(b.reason||'').trim())fail('Nhập lý do xóa');
 const ledgers=currentSchoolLedgers(),rows=b.group==='viet'?ledgers.viet:b.group==='hung'?ledgers.hung:b.group==='school'?ledgers.school:null,r=rows?.find(r=>r.key===b.key);if(!r)fail('Khoản tiền không còn trong danh sách');
 db.exec('BEGIN');try{
 if(b.group==='viet'&&!b.key.startsWith('transfer:'))put('schoolLedgerHidden',{id:id(),key:r.key,at:now(),by:u.name,reason:b.reason.trim()});
 else if(b.group==='hung'||b.group==='viet'){const old=get('schoolTransfers',r.id);put('archivedSchoolTransfers',{...old,deletedAt:now(),deletedBy:u.name});db.prepare('DELETE FROM records WHERE kind=? AND id=?').run('schoolTransfers',r.id)}
 else if(b.key==='opening'){const old=setting('schoolOpeningHTBLXV01',null);put('schoolOpeningHistory',{id:id(),before:old,at:now(),by:u.name,reason:b.reason.trim()});set('schoolOpeningHTBLXV01',{...old,paid:0,previousPaid:old.paid,updatedAt:now(),updatedBy:u.name})}
 else{const settlementId=b.key.slice('settlement:'.length),old=get('settlements',settlementId);if(!old)fail('Không tìm thấy giao dịch');put('archivedSettlements',{...old,deletedAt:now(),deletedBy:u.name});db.prepare('DELETE FROM records WHERE kind=? AND id=?').run('settlements',settlementId)}
 put('schoolLedgerHistory',{id:id(),at:now(),by:u.name,group:b.group,action:'delete',before:r,reason:b.reason.trim()});audit(u,'Xóa khoản trong bảng thanh toán trường',JSON.stringify({group:b.group,key:b.key,reason:b.reason.trim()}));db.exec('COMMIT');
 }catch(e){db.exec('ROLLBACK');throw e}return json({ok:true});
 }
 if(url.pathname==='/api/students/archive'&&req.method==='POST'){
 if(!admins(u))fail('Chỉ Quản trị viên được xóa hồ sơ học viên',403);
 if(!String(b.reason||'').trim())fail('Nhập lý do xóa hồ sơ');
 const l=tuitionRecord(b.id);if(!l)fail('Không tìm thấy hồ sơ hoặc hồ sơ đã xóa');
 const snapshot=l._pending?get('importDrafts',l.id):get('leads',l.id),archive={id:id(),studentId:l.id,kind:l._pending?'importDrafts':'leads',name:l.name,code:l.externalCode||'',at:now(),by:u.name,reason:b.reason.trim(),snapshot};
 db.exec('BEGIN');try{put('studentArchive',archive);const next={...l,archived:true,archivedAt:archive.at,archivedBy:u.name,archiveReason:archive.reason};saveTuitionRecord(next);for(const n of all('notifications').filter(n=>n.lead===l.id&&n.status==='pending'))put('notifications',{...n,status:'cancelled'});audit(u,'Xóa lưu trữ hồ sơ học viên',JSON.stringify({id:l.id,reason:archive.reason}));db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}return json({ok:true});
 }
 if(url.pathname==='/api/students/draft-update'&&req.method==='POST'){
 if(!admins(u))fail('Chỉ Quản trị viên được sửa hồ sơ chờ bổ sung',403);const old=get('importDrafts',b.id);if(!old||old.status!=='pending'||old.lead?.archived)fail('Không tìm thấy hồ sơ chờ');
 const raw={...old.raw};for(const key of ['name','phone','cccd','course','tuition','notes'])if(b[key]!==undefined)raw[key]=String(b[key]).trim();
 if(!raw.name)fail('Nhập họ tên');if(raw.cccd&&!/^\d{12}$/.test(raw.cccd))fail('CCCD cần12chữ số hoặc để trống chờ bổ sung');if(raw.phone&&!/^0\d{9}$/.test(raw.phone.replace(/\D/g,'')))fail('Điện thoại cần10chữ số hoặc để trống chờ bổ sung');if(!Number.isSafeInteger(Number(b.tuition))||Number(b.tuition)<0)fail('Học phí không hợp lệ');
 const checked=checkImport({...old,raw},{owner:old.lead.owner,source:old.lead.source,year:2026,defaultDate:old.lead.kpiDate||''});
 const next={...old,raw,lead:{...old.lead,name:raw.name,phone:raw.phone,cccd:raw.cccd,course:raw.course,tuition:Number(b.tuition),note:raw.notes},errors:checked.errors,updatedAt:now(),updatedBy:u.name};
 next.lead=synchronizeStudentCourse(next.lead);
 db.exec('BEGIN');try{put('studentHistory',{id:id(),studentId:old.id,before:old,after:next,at:now(),by:u.name});put('importDrafts',next);audit(u,'Sửa hồ sơ chờ bổ sung',old.id);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}return json({ok:true});
 }
 if(url.pathname==='/api/attendance'&&req.method==='GET'){
 const month=url.searchParams.get('month');if(!/^\d{4}-\d{2}$/.test(month))fail('Chọn tháng chấm công');const records=all('attendance').filter(e=>e.date.slice(0,7)===month&&visible(u,'attendance',e)),staff=all('staff').filter(s=>visible(u,'staff',s));const standardDays=setting('attendanceStandard-'+month,26);
 return json({month,standardDays,locked:locked(month),records,sourceKpi:finance(u)?sourceKpiForMonth(month):[],summary:staff.map(s=>{const r=attendanceSummary(s,records,month,standardDays);const {baseSalary,earned,...info}=r;return info})});
 }
 if(url.pathname.startsWith('/api/attendance/import-')&&req.method==='POST'){
 if(!['admin','manager','accountant'].includes(u.role))fail('Không có quyền nhập chấm công',403);
 const validate=(rows,historical=false)=>validateAttendanceImport(rows,all('staff'),all('attendance'),date(),locked,{historical});
 if(url.pathname==='/api/attendance/import-hungthinh'){
  const {rows,kpi}=JSON.parse(readFileSync(path.join(ROOT,'imports','attendance-2026-08-10.json'),'utf8'));
  const names=[...new Set([...rows.map(row=>row.employee),...kpi.map(row=>row.employee).filter(name=>!normalizeText(name).endsWith('honggiang'))])];
  const staffList=all('staff');
  const newStaff=admins(u)?names.filter(name=>{
   const key=normalizeText(name);
   return !staffList.some(staff=>{
    const existing=normalizeText(staff.name);
    return existing===key||key.endsWith('honggiang')&&existing.endsWith('honggiang');
   });
  }).map(name=>({id:id(),name,role:normalizeText(name)==='duongxuanquyen'?'manager':'sale',base:0,allowance:0,deduction:0,advance:0})): [];
  const job={id:id(),by:u.id,name:'Bảng chấm công và KPI Hưng Thịnh tháng 8–10/2026',rows,kpi,newStaff,at:now(),committed:false,historical:true};
  put('attendanceImports',job);
  return json({id:job.id,name:job.name,newStaff:newStaff.map(staff=>staff.name),kpi,rows:validateHistoricalAttendance(job,[...all('staff'),...newStaff])});
 }
 if(url.pathname==='/api/attendance/import-file'){
 if(typeof b.base64!=='string'||typeof b.name!=='string')fail('Chọn file');
 let sheets;try{sheets=readWorkbook(Buffer.from(b.base64,'base64'),b.name)}catch(e){fail(e.message)}
 if(!sheets.length||sheets.some(s=>s.rows.length>1001))fail('Tối đa 1.000 dòng dữ liệu mỗi sheet');
 const rows=[];for(const sheet of sheets){
 const header=sheet.rows[0]||[],find=names=>header.findIndex(v=>names.includes(normalizeText(v)));
 const cols={date:find(['ngay','ngaychamcong','date']),employee:find(['nhansu','hoten','hovaten','manhanvien','staff','employee']),status:find(['trangthai','socong','status','days']),note:find(['ghichu','note'])};
 if(cols.date<0||cols.employee<0||cols.status<0)fail('Sheet '+sheet.name+': dòng đầu cần các cột Ngày, Nhân sự, Trạng thái (hoặc Số công)');
 sheet.rows.slice(1).forEach((r,i)=>{if(r.some(v=>String(v??'').trim()))rows.push({row:i+2,sheet:sheet.name,date:importDate(r[cols.date],date().slice(0,4))||String(r[cols.date]||''),employee:String(r[cols.employee]??'').trim(),status:String(r[cols.status]??'').trim(),note:String(r[cols.note]??'').trim()})});
 }
 if(!rows.length||rows.length>1000)fail('File cần từ 1 đến 1.000 dòng chấm công');
 const job={id:id(),by:u.id,name:b.name.slice(0,200),rows,at:now(),committed:false};put('attendanceImports',job);return json({id:job.id,name:job.name,rows:validate(rows)});
 }
 if(url.pathname==='/api/attendance/import-commit'){
  const job=get('attendanceImports',b.id);
  if(!job||job.by!==u.id||job.committed)fail('Tệp chưa được tải hoặc đã nhập');
  let checked,valid;
  db.exec('BEGIN');try{
   if(job.historical&&admins(u))for(const staff of job.newStaff||[]){
    if(!all('staff').some(row=>normalizeText(row.name)===normalizeText(staff.name)))put('staff',staff);
   }
   checked=job.historical?validateHistoricalAttendance(job,all('staff')):validate(job.rows);
   valid=checked.filter(row=>!row.errors.length);
   for(const r of valid)put('attendance',{id:r.id,staff:r.staff,date:r.date,status:r.status,days:r.days,...(job.historical?{hours:r.hours}:{}),note:r.note,updatedBy:u.name,updatedAt:now(),importId:job.id});
   for(const row of job.kpi||[])put('attendanceSourceKpi',{...row,id:row.month+'-'+row.row});
   if(job.historical)for(const month of ['2026-08','2026-09']){
    const run=get('payruns',month);
    if(isPayrollLocked(run))put('payruns',{...run,attendance:{...run.attendance,standardDays:run.attendance?.standardDays||setting('attendanceStandard-'+month,26),records:all('attendance').filter(row=>row.date.startsWith(month)),sourceKpi:sourceKpiForMonth(month)}});
   }
   put('attendanceImports',{...job,committed:true,imported:valid.length});
   audit(u,'Nhập file chấm công',JSON.stringify({file:job.name,imported:valid.length,skipped:checked.length-valid.length,kpi:job.kpi?.length||0}));
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e}
  return json({imported:valid.length,skipped:checked.length-valid.length,kpi:job.kpi?.length||0,rows:checked});
 }
 fail('Không tìm thấy thao tác',404);
 }
 if(url.pathname==='/api/attendance/save'&&req.method==='POST'){
 if(!['admin','manager','accountant'].includes(u.role))fail('Chỉ Admin, Quản lý, Kế toán được chấm công',403);
 const staff=get('staff',b.staff);if(!staff)fail('Chọn nhân viên');if(!staff.joinDate)fail('Bổ sung ngày vào làm trong Nhân sự trước khi chấm công');
 if(!validDate(b.date)||b.date>date())fail('Ngày chấm công phải hợp lệ và không ở tương lai');if(b.date<staff.joinDate)fail('Không chấm công trước ngày vào làm');if(locked(b.date.slice(0,7)))fail('Kỳ lương đã chốt; không sửa chấm công kỳ này');
 const validHours=b.status==='hours'&&Number(b.hours)===5;
 if(!ATTENDANCE_TYPES[b.status]&&!validHours)fail('Chọn Đủ ngày, Nửa ngày hoặc Nghỉ');const key=staff.id+'-'+b.date;if(b.id&&b.id!==key)fail('Khi sửa chấm công, giữ nguyên ngày và nhân sự; chỉ sửa trạng thái hoặc ghi chú');const old=get('attendance',key);
 const r={id:key,staff:staff.id,date:b.date,status:b.status,days:validHours?5/8:ATTENDANCE_TYPES[b.status].days,...(validHours?{hours:5}:{}),note:String(b.note||'').trim(),updatedBy:u.name,updatedAt:now()};put('attendance',r);audit(u,old?'Sửa chấm công':'Chấm công',JSON.stringify({staff:staff.id,date:b.date,from:old?.status||'',to:b.status}));return json(r);
 }
 if(url.pathname==='/api/attendance/standard'&&req.method==='POST'){
 if(!finance(u))fail('Chỉ Admin/Kế toán điều chỉnh công chuẩn',403);if(!/^\d{4}-\d{2}$/.test(b.month))fail('Chọn tháng');if(locked(b.month))fail('Kỳ lương đã chốt');const n=Number(b.standardDays);if(!Number.isFinite(n)||n<1||n>31||n*2%1!==0)fail('Công chuẩn từ 1 đến 31, theo bước 0,5');set('attendanceStandard-'+b.month,n);audit(u,'Điều chỉnh công chuẩn',`${b.month}: ${n}`);return json({ok:true});
 }
 if(url.pathname==='/api/documents/bulk'&&req.method==='POST'){
 if(!['admin','manager','records'].includes(u.role))fail('Chỉ Admin, Quản lý hoặc bộ phận Hồ sơ được cập nhật bàn giao hàng loạt',403);
 if(!Array.isArray(b.keys)||!b.keys.length||b.keys.length>1000)fail('Chọn từ 1 đến 1.000 hồ sơ');
 if(!HANDOVER_STATES.includes(b.status)||!validDate(b.date))fail('Chọn trạng thái và ngày bàn giao hợp lệ');
 const keys=[...new Set(b.keys)],targets=keys.map(key=>{
 if(typeof key!=='string'||!key.includes(':'))fail('Mã chọn hồ sơ không hợp lệ');
 const position=key.indexOf(':'),type=key.slice(0,position),id=key.slice(position+1);const kind=type==='lead'?'leads':type==='draft'?'importDrafts':null;if(!kind)fail('Loại hồ sơ không hợp lệ');
 const record=get(kind,id);if(!record||record.archived||record.lead?.archived||kind==='importDrafts'&&record.status!=='pending')fail('Danh sách đã thay đổi. Làm mới rồi chọn lại.');
 if(!visible(u,kind,record))fail('Không có quyền cập nhật hồ sơ đã chọn',403);return {kind,record};
 });
 const at=now();db.exec('BEGIN');try{for(const {kind,record}of targets){
 const input={status:b.status,date:b.date,note:b.note||'',actor:u.name,at};
 if(kind==='leads')put(kind,applyHandover(record,input));else put(kind,{...record,lead:applyHandover(record.lead||{},input),updatedAt:at});
 }audit(u,'Cập nhật trạng thái bàn giao hàng loạt',JSON.stringify({status:b.status,date:b.date,count:targets.length,keys}));db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
 return json({updated:targets.length,status:b.status,date:b.date});
 }
 if(url.pathname==='/api/expense/manage'&&req.method==='POST'){
 if(!admins(u))fail('Chỉ Quản trị viên được sửa hoặc xóa chi phí',403);
 if(!['source','payment'].includes(b.kind)||!['update','delete'].includes(b.action))fail('Thao tác không hợp lệ');
 if(typeof b.changeReason!=='string'||!b.changeReason.trim())fail('Nhập lý do sửa/xóa');
 const old=b.kind==='source'?financialSource().expenses.find(e=>e.id===b.id):get('payments',b.id);
 if(!old||b.kind==='payment'&&old.type!=='expense')fail('Không tìm thấy chi phí vận hành');
 let next;
 if(b.action==='update'){
 const amount=Number(b.amount);if(!Number.isSafeInteger(amount)||amount<=0)fail('Số tiền phải là số nguyên lớn hơn 0');
 if(!validDate(b.date))fail('Ngày chi phải hợp lệ');
 if(!String(b.reason||'').trim()||!String(b.spender||'').trim())fail('Nhập lý do chi và người chi');
 next={...old,amount,date:b.date,reason:b.reason.trim(),spender:b.spender.trim(),updatedAt:now(),updatedBy:u.name};
 }else next={...old,deleted:true,deletedAt:now(),deletedBy:u.name};
 db.exec('BEGIN');try{
 if(b.kind==='source')put('sourceExpenseDetails',{...(get('sourceExpenseDetails',old.id)||{}),...next});
 else if(b.action==='delete'){put('archivedExpenses',next);db.prepare('DELETE FROM records WHERE kind=? AND id=?').run('payments',old.id)}else put('payments',next);
 put('expenseHistory',{id:id(),expenseId:old.id,kind:b.kind,action:b.action,at:now(),by:u.name,changeReason:b.changeReason.trim(),before:old,after:next});audit(u,b.action==='delete'?'Xóa chi phí vận hành':'Sửa chi phí vận hành',JSON.stringify({id:old.id,kind:b.kind,reason:b.changeReason.trim()}));db.exec('COMMIT');
 }catch(e){db.exec('ROLLBACK');throw e}return json({ok:true});
 }
 if(url.pathname==='/api/source-expense/details'&&req.method==='POST'){
 if(!finance(u))fail('Chỉ Admin/Kế toán bổ sung chi phí nguồn',403);
 if(!financialSource().expenses.some(e=>e.id===b.id))fail('Không tìm thấy khoản chi gốc');
 if(b.date&&!validDate(b.date))fail('Ngày chi không hợp lệ');
 const previous=get('sourceExpenseDetails',b.id)||null,record={id:b.id,date:String(b.date||''),spender:String(b.spender||'').trim(),updatedBy:u.name,updatedAt:now()};db.exec('BEGIN');try{put('expenseHistory',{id:id(),expenseId:b.id,at:now(),by:u.name,before:previous,after:record});put('sourceExpenseDetails',record);audit(u,'Bổ sung ngày/người chi nguồn',b.id);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}return json({ok:true});
 }
 if(url.pathname==='/api/tuition/review'&&req.method==='POST'){
  if(!finance(u))fail('Chỉ Admin/Kế toán lưu dấu đối chiếu',403);
  const key=String(b.key||'');
  const student=key.startsWith('id:')?tuitionRecord(key.slice(3)):key.startsWith('code:')?currentFinancialOverview().students.find(row=>row.code===key.slice(5)):null;
  if(!student||typeof b.checked!=='boolean')fail('Không tìm thấy học viên');
  tuitionTransaction(()=>{
   const old=get('tuitionReviews',key);
   if(!!old?.checked===b.checked)return;
   const next={id:key,checked:b.checked,at:now(),by:u.name};
   put('tuitionReviews',next);
   tuitionChange(u,'Cập nhật dấu đối chiếu',student,old||{checked:false},next,{checked:'Đã đối chiếu'});
  });
  queueTuitionDelivery();return json({ok:true});
 }
 if(url.pathname==='/api/tuition/edit'&&req.method==='POST'){
  if(!finance(u))fail('Chỉ Admin/Kế toán được chỉnh sửa học phí',403);
  const reason=String(b.reason||'').trim();
  if(!reason)fail('Nhập lý do sửa');
  tuitionTransaction(()=>{
   if(b.kind==='payment'){
    const old=get('payments',b.id);
    if(!old||!['receipt','refund'].includes(old.type))fail('Không tìm thấy phiếu học phí');
    const oldStudent=tuitionRecord(old.lead);
    const source=oldStudent&&financialSource().students.find(row=>row.code===oldStudent.externalCode||!!oldStudent.cccd&&row.cccd===oldStudent.cccd);
    const matched=sourcePaymentMatches(source,old.lead).get(old.id)?.receipt;
    const fields=Object.fromEntries(Object.keys(receiptFields).filter(key=>b[key]!==undefined).map(key=>[key,b[key]]));
    const next=normalize('payments',{...old,...fields},old,u,{correctPayment:true});
    if(old.deposit||next.deposit){enforceDepositLock(old.lead,old.date);enforceDepositLock(next.lead,next.date)}
    if(matched){
     if(next.lead!==old.lead||next.type!=='receipt')fail('Phiếu đối chiếu nguồn phải giữ học viên và loại phiếu thu');
     const correction={id:source.code+':'+matched.index,amount:next.amount,date:next.date};
     next.sourceReceiptCode=source.code;next.sourcePaymentIndex=matched.index;
     put('tuitionSourceEdits',correction);
    }
    const changed=tuitionChange(u,'Sửa phiếu học phí',tuitionRecord(next.lead),old,next,receiptFields,reason);
    if(changed){put('payments',next);for(const leadId of new Set([old.lead,next.lead])){requireTuitionBalance(tuitionRecord(leadId));refreshDeposit(leadId)}}
   }else if(b.kind==='installment'){
    const old=get('installments',b.id);
    if(!old||!validDate(b.due)||!Number.isSafeInteger(Number(b.amount))||Number(b.amount)<=0||!tuitionRecord(b.lead))fail('Kiểm tra học viên, hạn và số tiền');
    const next={...old,lead:b.lead,amount:Number(b.amount),due:b.due,note:String(b.note||''),updatedAt:now()};
    if(tuitionChange(u,'Sửa lịch thanh toán',tuitionRecord(next.lead),old,next,installmentFields,reason))put('installments',next);
   }else if(b.kind==='source-receipt'){
    const source=financialSource().students.find(row=>row.code===b.code),index=Number(b.phase);
    const old=source?.receipts.find(receipt=>receipt.index===index);
    const amount=Number(b.amount),day=String(b.date||'');
    if(!old||!Number.isSafeInteger(amount)||amount<=0||(day&&!validDate(day)))fail('Kiểm tra phiếu nguồn, số tiền và ngày');
    const linked=tuitionRecords().filter(row=>row.externalCode===source.code||!!row.cccd&&row.cccd===source.cccd);
    const next={id:source.code+':'+index,amount,date:day};
    if(!tuitionChange(u,'Sửa phiếu nguồn đợt '+index,linked[0]||source,old,next,{amount:'Số tiền',date:'Ngày thu'},reason))return;
    put('tuitionSourceEdits',next);
    for(const student of linked){
     const mirror=[...sourcePaymentMatches(source,student.id).values()].find(match=>match.receipt.index===index)?.payment;
     if(mirror){
      if(mirror.deposit){enforceDepositLock(student.id,mirror.date);enforceDepositLock(student.id,day)}
      put('payments',{...mirror,amount,date:day||mirror.date,sourceReceiptCode:source.code,sourcePaymentIndex:index,updatedAt:now()});
      refreshDeposit(student.id);
     }
     requireTuitionBalance(student);
    }
   }else if(b.kind==='profile'){
    const student=tuitionRecord(b.lead);
    const source=b.code&&financialSource().students.find(row=>row.code===b.code);
    const old=student||source;
    if(!old)fail('Không tìm thấy học viên');
    const tuition=Number(b.tuition),name=String(b.name||'').trim();
    const amounts=[b.amount1,b.amount2,b.amount3].map(Number);
    const dates=['',b.due2||'',b.due3||'',b.due4||''];
    if(!name||!Number.isSafeInteger(tuition)||tuition<=0||amounts.some(n=>!Number.isSafeInteger(n)||n<0)||amounts.reduce((a,n)=>a+n,0)>tuition||dates.some(day=>day&&!validDate(day)))fail('Kiểm tra họ tên, học phí, số tiền từng đợt và hạn đóng');
    const next={...old,name,tuition,tuitionTerms:{amounts,dates}};
    if(student){
     for(const key of ['openingDate','firstPaidAt','phase3ConfirmedAt']){
      const day=String(b[key]||'');
      if(day&&(!validDate(day)||key!=='openingDate'&&day>date()))fail('Ngày học phí không hợp lệ');
      next[key]=day;
     }
     next.course=String(b.course||'').trim();next.note=String(b.note||'').trim();
     if(next.phase3ConfirmedAt&&next.phase3ConfirmedAt!==old.phase3ConfirmedAt&&!currentTuitionPlan(next).phase3CanConfirm)fail('Học viên chưa đủ điều kiện xác minh đợt 3');
     if(next.openingDate!==old.openingDate||next.course!==old.course)next.tuitionOpeningOverride={course:next.course,date:next.openingDate};
     const synced=synchronizeStudentCourse(next);
     if(tuitionChange(u,'Sửa thông tin và lịch học phí',student,old,synced,tuitionProfileFields,reason))saveTuitionRecord(synced);
    }else if(tuitionChange(u,'Sửa học phí nguồn',source,old,next,tuitionProfileFields,reason)){
     put('tuitionSourceEdits',{id:source.code,name,tuition,tuitionTerms:next.tuitionTerms});
    }
   }else fail('Chọn nội dung cần sửa');
  });
  queueTuitionDelivery();
  return json({ok:true});
 }
 if(url.pathname==='/api/tuition/schedule'&&req.method==='POST'){
  if(!['admin','accountant','manager','records','training'].includes(u.role))fail('Không có quyền cập nhật lịch đào tạo',403);
  const old=tuitionRecord(b.lead);
  if(!old||!visible(u,old._pending?'importDrafts':'leads',old._pending?get('importDrafts',old.id):old))fail('Không tìm thấy hoặc không có quyền',403);
  if(b.openingDate&&!validDate(b.openingDate))fail('Ngày khai giảng không hợp lệ');
  const next={...old,openingDate:String(b.openingDate||''),course:String(b.course||'').trim()};
  delete next.tuitionOpeningOverride;
  if(b.firstPaidAt!==undefined){
   if(!finance(u))fail('Chỉ Admin/Kế toán bổ sung ngày đóng tiền',403);
   if(b.firstPaidAt&&(!validDate(b.firstPaidAt)||b.firstPaidAt>date()))fail('Ngày đóng đợt 1 không hợp lệ');
   next.firstPaidAt=String(b.firstPaidAt||'');
  }
  const synced=synchronizeStudentCourse(next);
  tuitionTransaction(()=>{if(tuitionChange(u,'Cập nhật khóa và lịch học phí',old,old,synced,tuitionProfileFields))saveTuitionRecord(synced)});
  scheduleReminders();queueTuitionDelivery();return json({ok:true});
 }
 if(url.pathname==='/api/exams/register'&&req.method==='POST'){
 if(!['admin','manager','records','training'].includes(u.role))fail('Không có quyền ghi nhận đăng ký thi',403);const l=tuitionRecord(b.lead);if(!l)fail('Không tìm thấy học viên');
 if(l.status==='cancelled'||l._originalStatus==='cancelled')fail('Hồ sơ đã hủy');
 if(!['course','licensing'].includes(b.type))fail('Chọn thi kết thúc môn hoặc sát hạch');
 const gate=examGate(l);if(!gate.eligible)fail(`Chưa tất toán học phí. Còn phải đóng ${gate.remaining.toLocaleString('vi-VN')}đ; không được ghi nhận đăng ký thi`);
 const registrations=Array.isArray(l.examRegistrations)?l.examRegistrations:[];if(!registrations.some(r=>r.type===b.type)){l.examRegistrations=[...registrations,{type:b.type,at:now(),by:u.name,note:'Ghi nhận nội bộ; chờ trường tiếp nhận và xác nhận các điều kiện đào tạo/hồ sơ'}];saveTuitionRecord(l);audit(u,'Ghi nhận yêu cầu đăng ký thi sau tất toán',`${l.id} / ${b.type}`)}return json({ok:true});
 }
 if(url.pathname==='/api/tuition/confirm-phase3'&&req.method==='POST'){
 if(!finance(u))fail('Chỉ Admin hoặc Kế toán xác minh thu đợt 3',403);const l=tuitionRecord(b.lead);if(!l)fail('Không tìm thấy học viên');
 const plan=currentTuitionPlan(l);if(!plan.phase3CanConfirm)fail('Chưa đủ tiền các đợt đến hết đợt 3 hoặc hồ sơ chưa chốt');
 const verifiedDate=b.date||date();if(!validDate(verifiedDate)||verifiedDate>date())fail('Ngày xác minh phải hợp lệ và không ở tương lai');
 if(!l.phase3ConfirmedAt)tuitionTransaction(()=>{
  const next={...l,phase3ConfirmedAt:verifiedDate,phase3ConfirmedBy:u.name};
  saveTuitionRecord(next);
  tuitionChange(u,'Xác minh đủ đợt 3',l,l,next,{phase3ConfirmedAt:'Ngày xác minh'});
 });
 scheduleReminders();queueTuitionDelivery();return json({ok:true});
 }
 if(url.pathname==='/api/tuition/confirm-phase2'&&req.method==='POST'){
 if(!finance(u))fail('Chỉ Admin hoặc Kế toán xác nhận thu tiền',403);const l=tuitionRecord(b.lead);if(!l)fail('Không tìm thấy học viên');
 const plan=currentTuitionPlan(l);if(!plan.phase2CanConfirm)fail('Chưa đủ tiền đợt 1 + đợt 2 hoặc hồ sơ chưa chốt');
 if(!l.phase2ConfirmedAt){l.phase2ConfirmedAt=date();l.phase2ConfirmedBy=u.name;saveTuitionRecord(l);audit(u,'Xác nhận đủ học phí đợt 2',l.id)}scheduleReminders();return json({ok:true});
 }
 if(url.pathname==='/api/tuition/complete-dat'&&req.method==='POST'){
 if(!['admin','training'].includes(u.role))fail('Chỉ Admin hoặc Đào tạo xác nhận hoàn thành DAT',403);const l=tuitionRecord(b.lead);if(!l)fail('Không tìm thấy học viên');
 if(!currentTuitionPlan(l).configured)fail('Cần chọn mức đóng đợt 1 trước');
 const completedDate=b.date||date();if(!validDate(completedDate)||completedDate>date())fail('Ngày hoàn thành DAT phải hợp lệ và không ở tương lai');
 if(!l.datCompletedAt){l.datCompletedAt=completedDate;l.datCompletedBy=u.name;saveTuitionRecord(l);audit(u,'Xác nhận đủ km DAT (không đổi hạn học phí)',l.id)}scheduleReminders();return json({ok:true});
 }
 if(url.pathname.startsWith('/api/telegram/')&&req.method==='POST'){
 if(!admins(u))fail('Chỉ Admin cấu hình Telegram',403);
 if(url.pathname==='/api/telegram/save'){
 if(!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host))fail('Nhập token tại localhost trên MacBook để tránh truyền token qua Wi-Fi',403);
 const c=telegramConfig(),token=String(b.token||c.token).trim(),chatId=String(b.chatId||c.chatId).trim();
 if(!/^\d+:[A-Za-z0-9_-]+$/.test(token))fail('Token chưa đúng định dạng');if(chatId&&!/^-?\d+$/.test(chatId))fail('Chat ID phải là số, giữ dấu âm của nhóm');
 const bot=await telegramCall('getMe',{},token);if(chatId)await telegramCall('getChat',{chat_id:chatId},token);
 storeTelegram({token,chatId});audit(u,'Lưu cấu hình Telegram',chatId?'Đã chọn nơi nhận':'Chưa chọn nơi nhận');return json({ok:true,username:bot.username,chatId});
 }
 if(url.pathname==='/api/telegram/chats'){
 const updates=await telegramCall('getUpdates',{limit:100,timeout:0});const chats=new Map();for(const update of updates){const c=update.message?.chat||update.my_chat_member?.chat||update.channel_post?.chat;if(c)chats.set(String(c.id),{id:String(c.id),name:c.title||[c.first_name,c.last_name].filter(Boolean).join(' ')||c.username||String(c.id)})}return json([...chats.values()]);
 }
 if(url.pathname==='/api/telegram/test'){
 const c=telegramConfig();if(!c.chatId)fail('Chưa chọn Chat ID');await telegramCall('sendMessage',{chat_id:c.chatId,text:'Kết nối thành công: hệ thống tuyển sinh Hưng Thịnh đã sẵn sàng gửi nhắc học phí, yêu cầu đăng ký DAT và lịch trả trường ngày 1/25.'});audit(u,'Gửi tin kiểm tra Telegram','');return json({ok:true});
 }
 fail('Không tìm thấy thao tác Telegram',404);
 }
 if(url.pathname.startsWith('/api/import/')&&req.method==='POST'){
 if(!admins(u))fail('Chỉ Admin được nhập hàng loạt kèm lịch sử thanh toán',403);

 if(url.pathname==='/api/import/hungthinh'){
 const sourcePath=path.join(ROOT,'imports','hungthinh-source.json');if(!existsSync(sourcePath))fail('Chép thêm thư mục imports từ bản cập nhật');
 const source=JSON.parse(readFileSync(sourcePath,'utf8'));const mapping={code:0,name:1,cccd:2,license:3,phone:4,documents:5,course:6,stage:7,tuition:8,amount1:9,date1:10,amount2:11,date2:12,amount3:13,date3:14,amount4:15,date4:16,balance:17,ownerName:18,notes:19};
 const assigned=setting('admissionsAssignmentV114',null);const config={year:2026,source:assigned?.source||'',owner:assigned?.owner||'',school:SCHOOL};let added=0,skipped=0;
 db.exec('BEGIN');try{for(let i=0;i<source.rows.length;i++){
 const raw=source.rows[i],key=`hungthinh-google-${raw[0]}`;
 if(get('importDrafts',key)||all('leads').some(l=>l.externalCode===raw[0])){skipped++;continue}
 const parsed=mappedRow(raw,mapping,config);if(assigned){parsed.raw.ownerName=assigned.name;parsed.raw.source='company';parsed.lead.owner=assigned.owner;parsed.lead.source='company'}const row=checkImport({...parsed,id:key,row:i+6},config);
 put('importDrafts',{...row,status:'pending',filename:'Google Sheets Hưng Thịnh — TỔNG',at:now(),sourceUrl:source.url,originalRow:raw});added++;
 }syncStudentCodes();set('hungthinhSource',{url:source.url,capturedAt:source.capturedAt,schoolJournal:source.schoolJournal,schoolControl:source.schoolControl,students:source.rows.length});audit(u,'Nạp toàn bộ hồ sơ Google Sheets Hưng Thịnh',`${added} dòng chờ, ${skipped} dòng đã có`);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}return json({added,skipped,total:source.rows.length});
 }
 if(url.pathname==='/api/import/file'){
 if(typeof b.base64!=='string'||!b.name)fail('Chọn file Excel');
 let sheets;try{sheets=readWorkbook(Buffer.from(b.base64,'base64'),b.name)}catch(e){fail(e.message)}
 if(sheets.some(s=>s.rows.length>10000))fail('Tối đa 10.000 dòng');
 const batch={id:id(),name:String(b.name).slice(0,200),at:now(),sheets};put('importFiles',batch);
 audit(u,'Tải file nhập học viên',batch.name);
 return json({id:batch.id,name:batch.name,sheets:sheets.map(s=>({name:s.name,count:s.rows.length,preview:s.rows.slice(0,40)}))});
 }
 if(url.pathname==='/api/import/preview'){
 const file=get('importFiles',b.fileId);if(!file)fail('Tải lại file');
 const sheet=file.sheets[Number(b.sheet)];if(!sheet)fail('Chọn sheet');
 const header=Number(b.header);if(!Number.isInteger(header)||header<0||header>=sheet.rows.length)fail('Chọn dòng tiêu đề');
 if(!Number.isInteger(Number(b.config?.year))||Number(b.config.year)<2000||Number(b.config.year)>2100)fail('Nhập năm áp dụng ngày thiếu năm');
 const rows=[];for(let i=header+1;i<sheet.rows.length;i++){if(!sheet.rows[i].some(v=>String(v||'').trim()))continue;
 const parsed=mappedRow(sheet.rows[i],b.mapping||{},b.config||{});rows.push(checkImport({...parsed,id:`${file.id}-${b.sheet}-${i}`,row:i+1},b.config||{}));}
 if(rows.length>1000)fail('Mỗi lần nhập tối đa 1.000 hồ sơ. Chia file nhỏ hơn.');
 const seen={phone:new Set(),cccd:new Set(),externalCode:new Set()};for(const row of rows){for(const key of Object.keys(seen)){const value=key==='phone'?row.lead[key].replace(/\D/g,''):row.lead[key];if(!value)continue;if(seen[key].has(value))row.errors.push('Trùng '+({phone:'điện thoại',cccd:'CCCD',externalCode:'mã học viên'}[key])+' trong file');seen[key].add(value)}}
 const job={id:id(),fileId:file.id,name:file.name,at:now(),config:b.config,rows};put('importJobs',job);
 return json({id:job.id,rows:rows.map(({raw,payments,...r})=>({...r,payments})),valid:rows.filter(r=>!r.errors.length).length,pending:rows.filter(r=>r.errors.length).length});
 }
 if(url.pathname==='/api/import/commit'){
 const job=get('importJobs',b.jobId);if(!job)fail('Xem trước lại file');if(job.committed)fail('Lần nhập này đã hoàn tất; không nhập lặp');
 let imported=0,pending=0;db.exec('BEGIN');try{for(const row of job.rows){const candidate=checkImport(row,job.config);if(candidate.errors.length){put('importDrafts',{...candidate,batch:job.id,filename:job.name,status:'pending',at:now()});pending++}else{saveImported(candidate,u);imported++}}syncStudentCodes();job.committed=true;job.completedAt=now();put('importJobs',job);audit(u,'Nhập Excel',`${job.name}: ${imported} hồ sơ, ${pending} chờ bổ sung`);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}return json({imported,pending});
 }
 if(url.pathname==='/api/import/promote'){
 const draft=get('importDrafts',b.id);if(!draft||draft.status!=='pending'||draft.lead?.archived)fail('Dòng chờ không tồn tại hoặc đã nhập');
 const raw={...draft.raw,...b.raw},keys=Object.keys(columns),mapping=Object.fromEntries(keys.map((k,i)=>[k,i]));const parsed=mappedRow(keys.map(k=>String(raw[k]??'')),mapping,b.config||{});
 const candidate=checkImport({...parsed,id:draft.id,row:draft.row},b.config||{});if(candidate.errors.length)fail(candidate.errors.join('; '));
 db.exec('BEGIN');try{saveImported(candidate,u);put('importDrafts',{...draft,status:'imported',importedAt:now()});syncStudentCodes();audit(u,'Bổ sung và nhập hồ sơ Excel',draft.id);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}return json({ok:true});
 }
 fail('Không tìm thấy chức năng nhập',404);
 }
 if(url.pathname==='/api/users'&&req.method==='POST'){
 if(!['admin','manager'].includes(u.role))fail('Chỉ Admin hoặc Quản lý được cấp tài khoản',403);
 if(u.role==='manager'&&!['sale','collaborator'].includes(b.role))fail('Quản lý chỉ được cấp tài khoản Sale hoặc CTV',403);
 if(!b.username?.trim()||!b.name?.trim()||String(b.password).length<10)fail('Cần tên, tài khoản và mật khẩu từ 10 ký tự');
 if(!['admin','manager','sale','collaborator','records','training','accountant'].includes(b.role))fail('Vai trò không hợp lệ');
 if(b.role!=='admin'&&(!get('staff',b.staffId)||get('staff',b.staffId).role!==b.role))fail('Chọn nhân sự đúng vai trò');
 if(b.staffId&&all('users').some(x=>x.staffId===b.staffId))fail('Nhân sự đã có tài khoản');
 if(all('users').some(x=>x.username===b.username))fail('Tài khoản đã tồn tại');const r={id:id(),username:b.username,name:b.name,role:b.role,staffId:b.staffId,password:hash(b.password)};put('users',r);audit(u,'Tạo tài khoản',r.username);return json(safe(r));
 }
 if(url.pathname==='/api/school-fees'&&req.method==='POST'){
 if(!admins(u))fail('Chỉ quản trị viên',403);for(const k of ['B1','B2','C1'])if(!Number.isSafeInteger(b[k])||b[k]<0)fail('Phí phải là số nguyên không âm');set('schoolFees',{B1:b.B1,B2:b.B2,C1:b.C1});audit(u,'Đổi phí trường','Áp dụng hồ sơ mới');return json({ok:true});
 }
 if(url.pathname==='/api/policy'&&req.method==='POST'){
 if(!admins(u))fail('Chỉ quản trị viên',403);
 for(const role of ['sale','manager','collaborator']){if(!b[role])fail('Thiếu cấu hình');for(const [k,v]of Object.entries(defaults[role])){const n=b[role][k];if(k==='percent'){if(n!==null&&n!=='')fail('Phần % đang để trống, chưa tham gia công thức')}else if(!Number.isSafeInteger(n)||n<0)fail('Chính sách phải là số nguyên không âm')}}
 set('policy',b);audit(u,'Cập nhật chính sách KPI','Chỉ tác động kỳ chưa chốt');return json({ok:true});
 }
 if(url.pathname==='/api/payroll'){
 if(!finance(u))fail('Không có quyền bảng lương',403);const month=url.searchParams.get('month');if(!/^\d{4}-\d{2}$/.test(month))fail('Chọn tháng');const saved=get('payruns',month);return json(isPayrollLocked(saved)?{...saved,locked:true,sourceKpi:sourceKpiForMonth(month)}:{id:month,locked:false,paid:false,sourceKpi:sourceKpiForMonth(month),diagnostics:payrollDiagnostics(month),rows:payroll(all('staff'),payrollRecords(),month,setting('policy',defaults),attendanceContext(month))});
 }
 if(url.pathname==='/api/payroll/lock'&&req.method==='POST'){
 if(!finance(u))fail('Không có quyền',403);if(!/^\d{4}-\d{2}$/.test(b.month))fail('Chọn tháng');if(locked(b.month))fail('Đã chốt kỳ');const computed=payroll(all('staff'),payrollRecords(),b.month,setting('policy',defaults),attendanceContext(b.month));const unfinished=computed.filter(r=>!r.attendanceReady);if(unfinished.length)fail('Cần bổ sung ngày vào làm/chấm công trước khi chốt: '+unfinished.map(r=>r.name).join(', '));const r={id:b.month,locked:true,at:now(),by:u.name,policy:setting('policy',defaults),diagnostics:payrollDiagnostics(b.month),attendance:{standardDays:attendanceContext(b.month).standardDays,records:all('attendance').filter(e=>e.date.slice(0,7)===b.month)},rows:computed,paid:false};put('payruns',r);audit(u,'Chốt lương',b.month);return json(r);
 }
 if(url.pathname==='/api/payroll/paid'&&req.method==='POST'){
 if(!finance(u))fail('Không có quyền',403);const r=get('payruns',b.month);if(!isPayrollLocked(r))fail('Chốt lương trước');r.paid=true;r.paidAt=now();put('payruns',r);audit(u,'Xác nhận trả lương',b.month);return json(r);
 }
 if(url.pathname==='/api/payroll/unlock'&&req.method==='POST'){
 if(!admins(u)||!b.reason?.trim())fail('Quản trị viên phải nhập lý do mở lại kỳ',403);const r=get('payruns',b.month);if(!r)fail('Không tìm thấy kỳ');if(r.paid)fail('Kỳ đã trả lương không được mở lại');db.prepare('DELETE FROM records WHERE kind=? AND id=?').run('payruns',b.month);audit(u,'Mở lại kỳ lương',`${b.month}: ${b.reason}`);return json({ok:true});
 }
 if(url.pathname==='/api/reminders'&&req.method==='POST'){if(!finance(u))fail('Không có quyền',403);await tick();return json({ok:true})}
 if(url.pathname==='/api/backup'){
 if(!admins(u))fail('Chỉ quản trị viên',403);const out={version:1,at:now(),records:db.prepare('SELECT * FROM records').all(),settings:db.prepare('SELECT * FROM settings').all()};audit(u,'Xuất sao lưu','');res.setHeader('Content-Type','application/json');res.setHeader('Content-Disposition',`attachment; filename="backup-${date()}.json"`);return res.end(JSON.stringify(out,null,2));
 }
 if(url.pathname==='/api/restore'&&req.method==='POST'){
 if(!admins(u)||b.confirm!=='KHOI PHUC')fail('Cần quản trị viên và xác nhận KHOI PHUC',403);const backup=b.backup;if(backup?.version!==1||!Array.isArray(backup.records)||!Array.isArray(backup.settings))fail('Sao lưu không hợp lệ');
 for(const r of backup.records){if(typeof r.kind!=='string'||typeof r.id!=='string')fail('Bản ghi không hợp lệ');JSON.parse(r.json)}for(const r of backup.settings)JSON.parse(r.json);
 if(!backup.records.some(r=>r.kind==='users'&&JSON.parse(r.json).role==='admin'))fail('Sao lưu thiếu quản trị viên');
 db.exec('PRAGMA wal_checkpoint(FULL)');copyFileSync(path.join(DATA,'center.sqlite'),path.join(DATA,`before-restore-${Date.now()}.sqlite`));db.exec('BEGIN');try{db.exec('DELETE FROM records;DELETE FROM settings;DELETE FROM sessions');for(const r of backup.records)db.prepare('INSERT INTO records VALUES(?,?,?)').run(r.kind,r.id,r.json);for(const r of backup.settings)db.prepare('INSERT INTO settings VALUES(?,?)').run(r.key,r.json);audit(u,'Khôi phục sao lưu','');db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}return json({ok:true});
 }
 fail('Không tìm thấy',404);
 }catch(e){if(!res.headersSent)json({error:e.status?e.message:'Lỗi hệ thống. Kiểm tra dữ liệu hoặc nhật ký máy chủ.'},e.status||500);else res.end()}
});
server.listen(Number(process.env.PORT||3000),lan?'0.0.0.0':'127.0.0.1',()=>console.log(`Trung tâm tuyển sinh: http://localhost:${process.env.PORT||3000}\nDữ liệu: ${DATA}\nNhấn Control+C để dừng.`)+(lan?console.log('Điện thoại cùng Wi-Fi: '+localIPs.map(ip=>`http://${ip}:${process.env.PORT||3000}`).join(' hoặc ')):0));
if(!setting('schoolOpeningHTBLXV01',null)){
 const sourcePath=path.join(ROOT,'imports','hungthinh-source.json');
 if(existsSync(sourcePath)){
 const source=JSON.parse(readFileSync(sourcePath,'utf8'));
 set('schoolOpeningHTBLXV01',{id:'HTBLXV01-OPENING-SCHOOL',reference:'Người dùng xác nhận tổng đã trả 175.400.000đ; nguồn TỔNG H3/N3/O3',payable:228000000,paid:175400000,codes:source.rows.map(r=>r[0]),cccds:source.rows.map(r=>r[2]).filter(Boolean),coveredSettlementIds:all('settlements').map(p=>p.id),at:now(),sourceUrl:source.url,note:'Số tổng lịch sử, không phải giao dịch chi mới; chưa phân bổ theo hồ sơ/ngày/hình thức. Các giao dịch đã có lúc nâng cấp nằm trong nhóm cần đối soát, không cộng lặp vào số tổng.'});
 audit(null,'Chuyển sang htblxv01: xác nhận công nợ trường','Phải trả228.000.000; đã trả175.400.000; còn52.600.000');
 }
}
if(!setting('fixedSchoolV105',false)){for(const l of all('leads')){if(l.school&&l.school!==SCHOOL)l.previousSchool=l.school;l.school=SCHOOL;put('leads',l)}set('fixedSchoolV105',true)}
applyAdmissionsAssignment();
applyCourseOpeningSync();
syncStudentCodes();
const interval=setInterval(()=>tick().catch(()=>{}),60000);interval.unref();
