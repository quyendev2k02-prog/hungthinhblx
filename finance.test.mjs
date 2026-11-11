import test from'node:test';import assert from'node:assert/strict';import {tuitionPlan,schoolDebt,nextSchoolDue,addDays,SCHOOL,schoolSummary,financialOverview,verifyTuitionSource,calculateFund,examTuitionEligibility,tuitionReminderDue,operatingCostsByMonth,tuitionAdvanceReminderDue,firstInstallmentPaidDate}from'../finance.mjs';
const b={id:'b',name:'Học viên',schoolCategory:'B1',tuition:17000000,firstInstallment:2500000,openingDate:'2026-11-01',kpiDate:'2026-10-10',status:'won'};
test('Đợt2 từ ngày đóng đầu +7; đợt3 khai giảng+25; tất toán xác minh3+15',()=>{for(const cat of ['B1','B2','C1']){const p=tuitionPlan({...b,schoolCategory:cat,tuition:22000000,firstPaidAt:'2026-10-10',phase3ConfirmedAt:'2026-12-10'},7500000);assert.equal(p.phases[1].due,'2026-10-17');assert.equal(p.phases[2].due,'2026-11-26');assert.equal(p.phases[2].amount,cat==='C1'?7000000:5000000);assert.equal(p.phases[3].due,'2026-12-25');assert.ok(p.phases[3].active);assert.equal(p.phases.reduce((s,p)=>s+p.amount,0),22000000)}});
test('Mức đóng cao bỏ qua đợt2, không thêm khoản trùng; thiếu ngày không đoán',()=>{for(const first of [7500000,8500000,9500000]){const p=tuitionPlan({...b,firstInstallment:first,tuition:22000000},first);assert.equal(p.phases[1].amount,0);assert.equal(p.phases[1].active,false);assert.equal(p.phases[2].amount,5000000);assert.equal(p.phases[3].amount,22000000-first-5000000);assert.equal(p.phases[3].active,false)}assert.equal(tuitionPlan(b,7499999).phase2CanConfirm,false);assert.equal(tuitionPlan(b,7500000).phase2CanConfirm,true);assert.equal(tuitionPlan(b,0).phases[1].due,'');assert.equal(tuitionPlan({...b,openingDate:''},0).phases[2].due,'');assert.equal(tuitionPlan({...b,tuition:2000000},0).configured,false);assert.equal(tuitionPlan({...b,historicalFirstInstallment:8000000},0).configured,false)});
test('Kỳ trường ngày1/25 và nợ sau các lần trả, hoàn; trường mặc định',()=>{assert.equal(nextSchoolDue('2026-11-01'),'2026-11-01');assert.equal(nextSchoolDue('2026-11-02'),'2026-11-25');assert.equal(nextSchoolDue('2026-11-25'),'2026-11-25');assert.equal(nextSchoolDue('2026-12-26'),'2027-01-01');const r=schoolDebt([{...b,schoolFee:6500000}],[{lead:'b',type:'pay',amount:3000000},{lead:'b',type:'return',amount:500000}]);assert.equal(r[0].remaining,4000000);assert.equal(SCHOOL,'Sát Hạch Lái Xe Hưng Thịnh')});

test('HTBLXV01: 228tr nghĩa vụ, 175.4tr đã trả, 52.6tr còn nợ; không cộng trùng nguồn và giao dịch có sẵn',()=>{
 const opening={payable:228000000,paid:175400000,codes:['HV-2026-001'],cccds:['001234567890'],coveredSettlementIds:['covered']};
 const leads=[{id:'a',externalCode:'HV-2026-001',schoolFee:7000000},{id:'b',cccd:'001234567890',schoolFee:7000000}];
 const moves=[{id:'covered',lead:'a',type:'pay',amount:20000000}];
 let summary=schoolSummary(leads,moves,opening);assert.equal(summary.payable,228000000);assert.equal(summary.paid,175400000);assert.equal(summary.remaining,52600000);
 summary=schoolSummary([...leads,{id:'new',schoolFee:6500000}],[...moves,{id:'new-pay',type:'pay',amount:1000000}],opening);
 assert.equal(summary.payable,234500000);assert.equal(summary.paid,176400000);assert.equal(summary.remaining,58100000);
 assert.deepEqual(schoolSummary(leads,moves,opening),schoolSummary(leads,moves,opening));
});

test('Đồng bộ tiền nguồn dù chưa có học viên chính thức; không cộng trùng khi bổ sung hồ sơ',()=>{
 const students=[{code:'HV-1',name:'A',cccd:'000000000001',tuition:17000000,receipts:[{index:1,amount:2500000,date:'2026-08-10'},{index:2,amount:5000000,date:''}]}],expenses=[{id:'e1',reason:'Thuê nhà',amount:1000000,month:'2026-08'}],school={paid:175400000,remaining:52600000};
 const baseline=financialOverview(students,expenses,[],[],school);assert.equal(baseline.received,7500000);assert.equal(baseline.studentDebt,9500000);assert.equal(baseline.operatingPaid,1000000);
 const leads=[{id:'a',externalCode:'HV-1',cccd:'000000000001',tuition:17000000,name:'A'}];
 const payments=[{lead:'a',type:'receipt',amount:2500000,date:'2026-08-10'},{lead:'a',type:'receipt',amount:5000000,date:'2026-09-01',reference:'EXCEL-old-import-2'},{type:'expense',reason:'Thuê nhà',date:'2026-08-15',amount:1000000}];
 const synced=financialOverview(students,expenses,leads,payments,school);assert.equal(synced.received,baseline.received);assert.equal(synced.studentDebt,baseline.studentDebt);assert.equal(synced.operatingPaid,baseline.operatingPaid);assert.equal(synced.matchedReceipts,2);assert.equal(synced.matchedExpenses,1);
 const next=financialOverview(students,expenses,leads,[...payments,{lead:'a',type:'receipt',amount:1000000,date:'2026-11-07'},{lead:'a',type:'refund',amount:500000,date:'2026-11-07'},{type:'expense',reason:'Điện',amount:200000,date:'2026-11-07'}],school);assert.equal(next.received,8500000);assert.equal(next.studentDebt,9000000);assert.equal(next.operatingPaid,1200000);assert.equal(next.totalSpent,177100000);
});

test('Xác minh cột thu riêng với đóng đủ: C1 thiếu đợt2, B2 đóng vượt đợt2 phân bổ hết đợt3',()=>{
 const c1=verifyTuitionSource({code:'C1',category:'C1',tuition:21200000,receipts:[{index:1,amount:9500000,date:'2026-08-18'},{index:2,amount:5000000,date:'2026-10-15'}]},14500000);assert.equal(c1.phases[1].remaining,0);assert.equal(c1.phases[1].status,'Bỏ qua đợt 2');assert.equal(c1.phases[2].remaining,2000000);assert.equal(c1.remaining,6700000);
 const b2=verifyTuitionSource({code:'B2',category:'B2',tuition:17700000,receipts:[{index:1,amount:8500000,date:'2026-08-18'},{index:2,amount:9200000,date:''}]},17700000);assert.equal(b2.phases[2].sourceAmount,0);assert.equal(b2.phases[2].status,'Đã đóng đủ');assert.equal(b2.allPaid,true);assert.equal(b2.warnings.length,1);
});
test('Quỹ = vốn100tr + thu301.4tr - trả trường175.4tr - vận hành187.796tr',()=>{const fund=calculateFund(100000000,{received:301400000,schoolPaid:175400000,operatingPaid:187796000,refunds:0,totalSpent:363196000});assert.equal(fund.remaining,38204000);assert.equal(examTuitionEligibility({tuition:17000000},16999999).eligible,false);assert.equal(examTuitionEligibility({tuition:17000000},17000000).eligible,true);assert.equal(examTuitionEligibility({tuition:0},0).eligible,false)});
test('Hạn mới qua năm, đợt cuối độc lập đủ km DAT; nhắc chỉ khoản đang có nợ',()=>{const plan=tuitionPlan({...b,firstPaidAt:'2026-12-28',openingDate:'2026-12-20',phase3ConfirmedAt:'2026-12-20',datCompletedAt:'2026-01-01'},12500000);assert.equal(plan.phases[1].due,'2027-01-04');assert.equal(plan.phases[2].due,'2027-01-14');assert.equal(plan.phases[3].due,'2027-01-04');assert.equal(tuitionReminderDue(plan.phases[3],'2027-01-03'),false);assert.equal(tuitionReminderDue(plan.phases[3],'2027-01-04'),true);assert.equal(tuitionAdvanceReminderDue(plan.phases[3],'2027-01-01'),true);assert.equal(tuitionReminderDue({...plan.phases[3],remaining:0},'2027-01-04'),false)});

test('Chi vận hành tách tháng, không cộng trùng nguồn/giao dịch và không tính tiền trường vào vận hành',()=>{
 const expenses=[{id:'a',month:'2026-08',reason:'Thuê nhà',amount:32000000},{id:'b',month:'2026-09',reason:'Lương',amount:24484000}];const rows=operatingCostsByMonth(expenses,[{type:'expense',date:'2026-08-15',reason:'Thuê nhà',amount:32000000},{type:'expense',date:'2026-10-01',reason:'Điện',amount:3300000},{type:'receipt',date:'2026-10-01',amount:5000000}]);assert.deepEqual(rows,[{month:'2026-08',total:32000000},{month:'2026-09',total:24484000},{month:'2026-10',total:3300000}]);
});

test('Nhắc học phí trước đúng 3 ngày, qua tháng/năm và dừng khi đóng đủ',()=>{
 const phase={phase:2,active:true,due:'2027-01-02',remaining:5000000};
 assert.equal(tuitionAdvanceReminderDue(phase,'2026-12-30'),true);
 for(const day of ['2026-12-29','2026-12-31','2027-01-02'])assert.equal(tuitionAdvanceReminderDue(phase,day),false);
 assert.equal(tuitionAdvanceReminderDue({...phase,remaining:0},'2026-12-30'),false);
 assert.equal(tuitionAdvanceReminderDue({...phase,phase:3,active:false},'2026-12-30'),false);
});

test('Ngày đóng đợt1 lấy mốc thu đủ, không lấy ngày chốt hoặc khoản thu thiếu',()=>{
 assert.equal(firstInstallmentPaidDate([{date:'2026-11-01',amount:2000000},{date:'2026-11-05',amount:500000}],2500000),'2026-11-05');
 assert.equal(firstInstallmentPaidDate([{date:'',amount:2500000}],2500000),'');
 assert.equal(tuitionPlan({...b,firstPaidAt:'2026-11-01'},2000000).phases[1].active,false);
});
