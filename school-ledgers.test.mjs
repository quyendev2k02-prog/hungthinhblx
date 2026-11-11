import test from 'node:test';import assert from 'node:assert/strict';import {schoolThreeLedgers} from '../finance.mjs';
test('Anh Việt đối chiếu đúng tháng8, đợt1+2; nhập lại nguồn không nhân đôi khoản chi',()=>{
 const students=[{code:'HV1',name:'A',receipts:[{index:1,date:'2026-08-01',amount:2500000},{index:2,date:'2026-08-08',amount:5000000},{index:3,date:'2026-08-20',amount:5000000},{index:2,date:'',amount:1}]}];
 const result=schoolThreeLedgers(students,[{id:'p',lead:'a',type:'receipt',date:'2026-08-01',amount:2500000,sourcePaymentIndex:1}],[{id:'a',externalCode:'HV1'}],[],null);
 assert.equal(result.viet.reduce((s,r)=>s+r.amount,0),7500000);assert.equal(result.viet.length,2);assert.equal(result.unknownDateCount,1);
 const hidden=schoolThreeLedgers(students,[],[],[],null,[],[{key:'source:HV1:0'}]);assert.equal(hidden.viet.reduce((s,r)=>s+r.amount,0),5000000);
});
test('Ba nhóm chi tách riêng, trường không cộng lại chi tiết thuộc tổng lịch sử',()=>{
 const ledger=schoolThreeLedgers([],[],[],[{id:'old',amount:2000000,type:'pay'},{id:'new',amount:500000,type:'pay'}],{paid:175400000,coveredSettlementIds:['old']},[{id:'v',group:'viet',amount:100000},{id:'h',group:'hung',amount:200000}]);
 assert.equal(ledger.viet[0].amount,100000);assert.equal(ledger.hung[0].amount,200000);assert.equal(ledger.school.reduce((s,r)=>s+r.amount,0),175900000);
});
