import test from 'node:test';import assert from 'node:assert/strict';import {buildLeadDirectory} from '../public/lead-list.mjs';
const draft=(id,lead)=>({id,status:'pending',lead,raw:{ownerName:'Người phụ trách gốc'},errors:['Thiếu điện thoại']});
test('Hồ sơ thiếu thông tin hiển thị ngay; giữ tên, khóa, mã và nhãn chờ bổ sung',()=>{const leads=[],drafts=[draft('d1',{name:'Học viên',externalCode:'HV-2026-001',course:'K53',phone:'',cccd:''})];const rows=buildLeadDirectory(leads,drafts);assert.equal(rows.length,1);assert.equal(rows[0].status,'pending');assert.equal(rows[0].course,'K53');assert.equal(rows[0]._draftId,'d1');assert.equal(rows[0]._ownerName,'Người phụ trách gốc');assert.equal(leads.length,0);assert.equal(drafts[0].status,'pending')});
test('Không tạo dòng trùng theo mã/CCCD/điện thoại; chuyển chính thức còn một dòng',()=>{const actual={id:'a',externalCode:'HV-1',cccd:'001234567890',phone:'0901234567',name:'A'};const rows=buildLeadDirectory([actual],[draft('d1',{externalCode:'HV-1'}),draft('d2',{cccd:actual.cccd}),draft('d3',{phone:'090 123 4567'})]);assert.equal(rows.length,1);assert.equal(rows[0]._pending,false);assert.equal(buildLeadDirectory([actual],[{...draft('d1',actual),status:'imported'}]).length,1)});
test('Không gộp người chỉ vì trùng tên, không biến dòng chờ thành tiền/cọc đã xác nhận',()=>{const rows=buildLeadDirectory([],[draft('d1',{name:'Trần Tiến Mạnh',cccd:'000000000001'}),draft('d2',{name:'Trần Tiến Mạnh',cccd:'000000000002'})]);assert.equal(rows.length,2);assert.ok(rows.every(r=>r._pending));assert.ok(rows.every(r=>r.depositConfirmed===undefined))});

test('Kết hợp bộ lọc học viên không làm thay đổi dữ liệu gốc',async()=>{
 const {filterLeadDirectory}=await import('../public/lead-list.mjs');const rows=[{id:'a',name:'Đặng Ánh',status:'pending',schoolCategory:'B1',course:'K53',owner:'q',source:'company',documents:'Đủ',handover:'Đã bàn giao',cccd:'000000000001',phone:''},{id:'b',name:'B',status:'won',schoolCategory:'C1',course:'K60',source:'personal',phone:'0901111111',cccd:'000000000002'}];
 assert.equal(filterLeadDirectory(rows,{query:'dang anh',category:'B1',course:'K53',owner:'q',source:'company',documents:'complete',handover:'Đã bàn giao',missing:'phone'}).length,1);
 assert.equal(filterLeadDirectory(rows,{category:'B1',source:'personal'}).length,0);assert.equal(filterLeadDirectory(rows,{owner:'__empty'}).length,1);assert.equal(rows.length,2);
});

test('Cảnh báo chờ khai giảng và đến/quá hạn chỉ khi còn thiếu tiền',async()=>{
 const {waitingForOpening,paymentDueState}=await import('../public/lead-list.mjs');assert.equal(waitingForOpening({course:'Chờ khai giảng'}),true);assert.equal(waitingForOpening({course:'K69'}),false);
 const p=[{lead:'a',phases:[{phase:2,active:true,due:'2026-11-07',remaining:1000000},{phase:3,active:false,due:'2026-11-01',remaining:5000000}]}];assert.equal(paymentDueState('a',p,'2026-11-07').due,true);assert.equal(paymentDueState('a',p,'2026-11-07').overdue,false);assert.equal(paymentDueState('a',p,'2026-11-08').overdue,true);p[0].phases[0].remaining=0;assert.equal(paymentDueState('a',p,'2026-11-08').due,false);
});

test('Hồ sơ xóa lưu trữ ẩn vận hành, giữ bản ghi khi lập sổ tiền',()=>{
 const leads=[{id:'a',name:'A',archived:true}],drafts=[{id:'b',status:'pending',lead:{name:'B',archived:true}}];
 assert.equal(buildLeadDirectory(leads,drafts).length,0);assert.equal(buildLeadDirectory(leads,drafts,true).length,2);
});
