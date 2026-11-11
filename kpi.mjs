import {attendanceSummary} from './attendance.mjs';
export const defaults={sale:{personal:500000,company:200000,percent:null,threshold:20,bonus:2000000},manager:{personal:1000000,company:200000,percent:null,perSale:100000,threshold:51,bonus:1000000},collaborator:{personal:1500000,company:0,percent:null}};
export function effectiveDate(r){
 if(r.ownerRole==='collaborator')return r.kpiDate||'';
 const closed=r.wonDate||r.kpiDate||'';
 return r.firstDepositDate&&closed?[closed,r.firstDepositDate].sort().at(-1):closed;
}
export function payroll(staff,records,month,policy=defaults,attendance={entries:[],standardDays:26}){
 const inMonth=r=>String(effectiveDate({...r,ownerRole:staff.find(s=>s.id===r.owner)?.role})).slice(0,7)===month;
 const qualified=r=>['won','finished'].includes(r.status)&&Number(r.depositConfirmed)>0;
 const eligible=records.filter(r=>inMonth(r)&&qualified(r));
 const sales=eligible.filter(r=>staff.find(s=>s.id===r.owner)?.role==='sale');
 return staff.map(s=>{
 const p=policy[s.role]||{personal:0,company:0},own=records.filter(r=>['sale','manager','collaborator'].includes(s.role)&&r.owner===s.id&&inMonth(r)&&(s.role==='collaborator'||qualified(r)));
 const personal=own.filter(r=>r.source==='personal').length,company=own.filter(r=>r.source==='company').length;
 const unit=personal*p.personal+company*p.company;
 const target=s.role==='sale'?(own.length>=p.threshold?p.bonus:0):s.role==='manager'?(eligible.length>=p.threshold?p.bonus:0):0;
 const override=s.role==='manager'?sales.length*p.perSale:0;
 const time=attendanceSummary(s,attendance.entries||[],month,attendance.standardDays||26);
 const base=time.earned,allowance=Number(s.allowance||0),deduction=Number(s.deduction||0),advance=Number(s.advance||0);
 return {id:s.id,name:s.name,role:s.role,personal,company,count:own.length,unit,target,override,base,baseSalary:time.baseSalary,standardDays:time.standardDays,workdays:time.workdays,attendanceCount:time.recordedDays,attendanceWarning:time.warning,attendanceReady:time.ready,joinDate:time.joinDate,allowance,deduction,advance,total:base+allowance+unit+target+override-deduction-advance};
 });
}
