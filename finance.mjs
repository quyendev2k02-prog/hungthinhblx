export const SCHOOL='Sát Hạch Lái Xe Hưng Thịnh';
export const FIRST_AMOUNTS=[2500000,7500000,8500000,9500000];
export const SECOND_AMOUNTS={B1:5000000,B2:5000000,C1:7000000};
export function validDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value)))return false;const d=new Date(value+'T00:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===value}
export function addDays(date,n){if(!validDate(date))return '';const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
export function tuitionPlan(l,paid){
 const first=Number(l.tuitionTerms?.amounts?.[0]??(l.standardFirstInstallment||l.historicalFirstInstallment||l.firstInstallment||0)),standard=SECOND_AMOUNTS[l.schoolCategory]||0,tuition=Number(l.tuition||0),low=!!l.tuitionTerms?.amounts||first===2500000;
 if(!l.tuitionTerms?.amounts&&!FIRST_AMOUNTS.includes(first))return {configured:false,reason:'Mức đợt 1 ngoài 2,5 / 7,5 / 8,5 / 9,5 triệu; cần đối soát trước khi nhắc',phases:[]};
 if(!standard&&!l.tuitionTerms?.amounts)return {configured:false,reason:'Chưa có định mức cho hạng này',phases:[]};
 if(first>tuition)return {configured:false,reason:'Học phí nhỏ hơn đợt 1; cần điều chỉnh',phases:[]};
 const second=l.tuitionTerms?.amounts?.[1]??(low?Math.min(standard,tuition-first):0),third=l.tuitionTerms?.amounts?.[2]??Math.min(standard,Math.max(0,tuition-first-second));
 const amounts=[first,second,third,Math.max(0,tuition-first-second-third)],dates=[l.firstPaidAt||'',low?addDays(l.firstPaidAt,7):'',addDays(l.openingDate,25),addDays(l.phase3ConfirmedAt,15)];let cumulative=0;
 const phases=amounts.map((amount,index)=>{const before=cumulative;cumulative+=amount;return {phase:index+1,label:index===3?'Đợt cuối — tất toán':'Đợt '+(index+1),amount,cumulative,received:Math.min(amount,Math.max(0,paid-before)),remaining:Math.min(amount,Math.max(0,cumulative-paid)),due:l.tuitionTerms?.dates?.[index]||dates[index],active:index===1?low&&paid>=first:index===3?!!(l.phase3ConfirmedAt||l.tuitionTerms?.dates?.[3]):true,skipped:index===1&&!low}});
 return {configured:true,phases,firstPaidAt:l.firstPaidAt||'',warning:low&&!l.firstPaidAt?'Thiếu ngày đóng đợt 1; chưa thể nhắc đợt 2':'',phase2CanConfirm:low&&paid>=first+second&&['won','finished'].includes(l.status),phase3CanConfirm:paid>=first+second+third&&['won','finished'].includes(l.status),phase2Confirmed:!!l.phase2ConfirmedAt,phase3Confirmed:!!l.phase3ConfirmedAt};
}
export function schoolDebt(leads,settlements){return leads.map(l=>{const paid=settlements.filter(p=>p.lead===l.id).reduce((s,p)=>s+(p.type==='pay'?Number(p.amount):-Number(p.amount)),0);return {id:l.id,name:l.name,category:l.schoolCategory,fee:Number(l.schoolFee||0),paid,remaining:Math.max(0,Number(l.schoolFee||0)-paid)}}).filter(r=>r.remaining>0)}
export function nextSchoolDue(today){const d=new Date(today+'T00:00:00Z'),day=d.getUTCDate();if(day<=1)d.setUTCDate(1);else if(day<=25)d.setUTCDate(25);else{d.setUTCMonth(d.getUTCMonth()+1,1)}return d.toISOString().slice(0,10)}

export function historicalSchoolLead(l,opening){return (opening?.codes||[]).includes(l.externalCode)||!!l.cccd&&(opening?.cccds||[]).includes(l.cccd)}

export function schoolSummary(leads,settlements,opening){
 const historical=opening||{payable:0,paid:0,codes:[],coveredSettlementIds:[]};
 const codes=new Set(historical.codes||[]),covered=new Set(historical.coveredSettlementIds||[]);
 const current=settlements.filter(p=>!covered.has(p.id));
 const movements=current.reduce((s,p)=>s+(p.type==='pay'?Number(p.amount):-Number(p.amount)),0);
 const extra=leads.filter(l=>!historicalSchoolLead(l,historical)).reduce((s,l)=>s+Number(l.schoolFee||0),0);
 const payable=Number(historical.payable||0)+extra,paid=Number(historical.paid||0)+movements;
 return {payable,paid,remaining:Math.max(0,payable-paid),historicalPayable:Number(historical.payable||0),historicalPaid:Number(historical.paid||0),currentPaid:movements,extraPayable:extra,unallocatedHistorical:Math.max(0,Number(historical.payable||0)-Number(historical.paid||0)),coveredTransactions:covered.size,openingConfirmed:!!opening,reference:historical.reference||''};
}

const normalizedLabel=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase().replace(/[^a-z0-9]/g,'');
export function matchesSourceReceipt(receipt,payment){
 if(payment.type!=='receipt')return false;
 if(payment.sourceReceiptCode)return payment.sourceReceiptCode===receipt.code&&Number(payment.sourcePaymentIndex)===receipt.index;
 const amount=receipt.originalAmount??receipt.amount,date=receipt.originalDate??receipt.date;
 if(amount!==Number(payment.amount))return false;
 if(date)return date===payment.date;
 return Number(payment.sourcePaymentIndex||(payment.origin==='excel'||String(payment.reference||'').startsWith('EXCEL-')?String(payment.reference||'').match(/-(\d+)$/)?.[1]:0))===receipt.index;
}
export function financialOverview(students,expenses,leads,payments,school){
 const identities=new Map();for(const s of students){identities.set('code:'+s.code,s);if(s.cccd)identities.set('cccd:'+s.cccd,s)}
 const match=l=>l&&(identities.get('code:'+l.externalCode)||identities.get('cccd:'+l.cccd));
 const studentsByKey=new Map(students.map(s=>[s.code,{...s,received:s.receipts.reduce((sum,p)=>sum+p.amount,0),source:true}]));
 const matchSlots=new Map(students.map(s=>[s.code,s.receipts.map(r=>({...r,used:false}))]));
 const leadMap=new Map(leads.map(l=>[l.id,l]));
 for(const l of leads){const original=match(l);if(original){const r=studentsByKey.get(original.code);r.id=l.id;r.tuition=Number(l.tuition||0);r.name=l.name;r.phone=l.phone;r.owner=l.owner}else studentsByKey.set('new:'+l.id,{id:l.id,code:l.externalCode||'',name:l.name,phone:l.phone,owner:l.owner,tuition:Number(l.tuition||0),received:0,source:false})}
 let refunds=0,extraReceipts=0,matchedReceipts=0,extraExpenses=0,matchedExpenses=0;
 const expenseSlots=expenses.map(e=>({...e,used:false}));
 for(const p of payments){
 if(p.type==='expense'){
 const slot=expenseSlots.find(e=>!e.used&&Number(p.amount)===e.amount&&(p.sourceExpenseId===e.id||String(p.date||'').slice(0,7)===e.month&&normalizedLabel(p.reason||p.note)===normalizedLabel(e.reason)));
 if(slot){slot.used=true;matchedExpenses++}else extraExpenses+=Number(p.amount||0);continue;
 }
 const l=leadMap.get(p.lead);if(!l)continue;const original=match(l),target=studentsByKey.get(original?original.code:'new:'+l.id);if(!target)continue;
 if(p.type==='receipt'){
 const slot=original&&matchSlots.get(original.code).find(r=>!r.used&&matchesSourceReceipt(r,p));
 if(slot){slot.used=true;matchedReceipts++}else{target.received+=Number(p.amount||0);extraReceipts+=Number(p.amount||0)}
 }else if(p.type==='refund'){target.received-=Number(p.amount||0);refunds+=Number(p.amount||0)}
 }
 const rows=[...studentsByKey.values()].map(s=>({...s,remaining:Math.max(0,s.tuition-s.received)}));
 const grossSource=students.reduce((s,r)=>s+r.receipts.reduce((a,p)=>a+p.amount,0),0),received=grossSource+extraReceipts;
 const operating=expenses.reduce((s,e)=>s+e.amount,0)+extraExpenses;
 return {students:rows,totalTuition:rows.reduce((s,r)=>s+r.tuition,0),received,netReceived:received-refunds,refunds,studentDebt:rows.reduce((s,r)=>s+r.remaining,0),operatingPaid:operating,schoolPaid:school.paid,schoolDebt:school.remaining,totalSpent:operating+school.paid+refunds,sourceReceived:grossSource,extraReceipts,extraExpenses,matchedReceipts,matchedExpenses};
}

export function verifyTuitionSource(student,received,standardFirstInstallment=0){
 const first=student.receipts.find(p=>p.index===1)?.amount||0,plan=tuitionPlan({standardFirstInstallment,schoolCategory:student.category,tuition:student.tuition,historicalFirstInstallment:first,tuitionTerms:student.tuitionTerms},received);
 const warnings=student.receipts.filter(p=>p.amount>0&&!p.date).map(p=>`Thu lần ${p.index} thiếu ngày trong file`);if(!plan.configured)warnings.push(plan.reason);
 const phases=[1,2,3,4].map(phase=>{const p=plan.phases.find(p=>p.phase===phase),sourceAmount=student.receipts.filter(r=>r.index===phase).reduce((s,r)=>s+r.amount,0);return {phase,sourceAmount,required:p?.amount??null,received:p?.received||0,remaining:p?.remaining??null,status:!p?'Chưa có định mức':p.skipped?'Bỏ qua đợt 2':p.amount===0?'Không phải đóng':p.remaining===0?'Đã đóng đủ':p.received>0?'Đóng một phần':'Chưa đóng'}});
 return {code:student.code,name:student.name,category:student.category,tuition:student.tuition,received,remaining:Math.max(0,student.tuition-received),phases,warnings,allPaid:received>=student.tuition};
}
export function calculateFund(capital,overview){return {capital,tuitionReceived:overview.received,schoolPaid:overview.schoolPaid,operatingPaid:overview.operatingPaid,refunds:overview.refunds,vietPaid:Number(overview.vietPaid||0),hungPaid:Number(overview.hungPaid||0),totalSpent:overview.totalSpent,remaining:capital+overview.received-overview.totalSpent}}

export function examTuitionEligibility(student,received){const required=Number(student.tuition||0),remaining=Math.max(0,required-Number(received||0));return {tuition:required,received:Number(received||0),remaining,eligible:required>0&&remaining===0}}
export const TUITION_RULE_VERSION='all2500-first7-opening25-confirm3plus15-v127';
export function tuitionReminderDue(phase,today){return [2,3,4].includes(phase.phase)&&phase.active&&!!phase.due&&phase.due<=today&&phase.remaining>0}
export function operatingCostsByMonth(expenses,payments){
 const months=[...new Set([...expenses.map(e=>e.month),...payments.filter(p=>p.type==='expense').map(p=>String(p.date||'').slice(0,7))].filter(Boolean))].sort();
 return months.map(month=>({month,total:financialOverview([],expenses.filter(e=>e.month===month),[],payments.filter(p=>p.type==='expense'&&String(p.date||'').slice(0,7)===month),{paid:0,remaining:0}).operatingPaid}));
}

// Keep actual receipt rows and dates; never infer a phase from a missing date.
export function paymentPhaseHistory(payments=[],sourceReceipts=[]){
 const rows=sourceReceipts.map(r=>({...r,phase:Number(r.index),amount:Number(r.amount),date:r.date||'',source:true,used:false}));
 for(const p of payments){
 const phase=Number(p.paymentPhase||p.sourcePaymentIndex||0),amount=Number(p.amount||0),receipt=p.type==='receipt'||p.type==='pay';
 const match=receipt&&rows.find(r=>!r.used&&matchesSourceReceipt(r,p));
 if(match){match.used=true;if(p.paymentPhase)match.phase=phase;continue}
 rows.push({phase,amount:receipt?amount:-amount,date:p.date||'',source:false,used:true});
 }
 return {phases:[1,2,3,4].map(phase=>({phase,amount:rows.filter(r=>r.phase===phase).reduce((s,r)=>s+r.amount,0),entries:rows.filter(r=>r.phase===phase).map(({date,amount})=>({date,amount}))})),unassigned:rows.filter(r=>![1,2,3,4].includes(r.phase)).reduce((s,r)=>s+r.amount,0)};
}

export function tuitionAdvanceReminderDue(phase,today){return [2,3,4].includes(phase.phase)&&phase.active&&!!phase.due&&phase.remaining>0&&addDays(today,3)===phase.due}

export function firstInstallmentPaidDate(receipts,required){let total=0;for(const r of receipts.filter(r=>validDate(r.date)&&Number(r.amount)>0).slice().sort((a,b)=>a.date.localeCompare(b.date))){total+=Number(r.amount);if(total>=required)return r.date}return ''}

export function schoolThreeLedgers(students,payments,leads,settlements,opening,transfers=[],hidden=[],month='2026-08'){
 const excluded=new Set(hidden.map(r=>r.key)),slots=students.flatMap(s=>s.receipts.map((r,i)=>({...r,key:`source:${s.code}:${i}`,name:s.name,code:s.code,cccd:s.cccd,used:false}))),viet=[];
 for(const r of slots)if(r.date?.slice(0,7)===month&&[1,2].includes(Number(r.index)))viet.push({key:r.key,name:r.name,date:r.date,amount:r.amount,phase:r.index,origin:'Chi Anh Việt — đối chiếu nguồn thu T8 (ngày thu, chưa xác định ngày chi)',reference:r.code});
 for(const p of payments.filter(p=>p.type!=='expense')){
 const l=leads.find(l=>l.id===p.lead),source=l&&students.find(s=>s.code===l.externalCode||!!l.cccd&&s.cccd===l.cccd),phase=Number(p.paymentPhase||p.sourcePaymentIndex||0);
 const slot=p.type==='receipt'&&source&&slots.find(r=>r.code===source.code&&!r.used&&matchesSourceReceipt(r,p));
 if(slot){slot.used=true;continue}
 if(p.date?.slice(0,7)===month&&[1,2].includes(phase))viet.push({key:'payment:'+p.id,name:l?.name||'Học viên',date:p.date,amount:p.type==='receipt'?p.amount:-p.amount,phase,reference:p.reference,origin:p.type==='refund'?'Đối chiếu hoàn học phí T8':'Chi Anh Việt — đối chiếu phiếu thu T8 (ngày thu)'});
 }
 const covered=new Set(opening?.coveredSettlementIds||[]),school=settlements.filter(p=>!covered.has(p.id)).map(p=>({key:'settlement:'+p.id,date:p.date,amount:p.type==='pay'?p.amount:-p.amount,reference:p.reference,method:p.method,phase:p.paymentPhase,origin:p.note||'Giao dịch nộp/hoàn trường'}));
 if(Number(opening?.paid)>0)school.unshift({key:'opening',date:'',amount:Number(opening.paid),reference:opening.reference,origin:'Số tổng lịch sử đã đối soát — chưa phân bổ ngày'});
 return {month,viet:[...viet.filter(r=>!excluded.has(r.key)),...transfers.filter(r=>r.group==='viet').map(r=>({...r,key:'transfer:'+r.id,origin:r.note||'Chi cho Anh Việt'}))],hung:transfers.filter(r=>!r.group||r.group==='hung').map(r=>({...r,key:'transfer:'+r.id,origin:r.note||'Chi cho Anh Hưng'})),school,excludedCount:viet.filter(r=>excluded.has(r.key)).length,unknownDateCount:slots.filter(r=>[1,2].includes(Number(r.index))&&!r.date).length,unassignedPhaseCount:payments.filter(p=>p.type==='receipt'&&p.date?.slice(0,7)===month&&!Number(p.paymentPhase||p.sourcePaymentIndex)).length};
}


export function profitOverview(financial,school){
 const netRevenue=financial.received-financial.refunds;
 const operating=financial.operatingPaid;
 const other=Number(financial.vietPaid||0)+Number(financial.hungPaid||0);
 const breakEven=school.payable+operating+other;
 const projectedRevenue=netRevenue+financial.studentDebt;
 return {
  students:financial.students.length,tuition:financial.totalTuition,received:financial.received,refunds:financial.refunds,
  netRevenue,schoolPaid:school.paid,schoolPayable:school.payable,operating,vietPaid:financial.vietPaid,hungPaid:financial.hungPaid,
  totalSpent:financial.totalSpent,grossProfit:netRevenue-school.paid,cashResult:netRevenue-school.paid-operating-other,
  studentDebt:financial.studentDebt,projectedRevenue,projectedProfit:projectedRevenue-breakEven,
  breakEven,breakEvenGap:Math.max(0,breakEven-netRevenue),breakEvenProgress:breakEven>0?netRevenue/breakEven:0
 };
}
