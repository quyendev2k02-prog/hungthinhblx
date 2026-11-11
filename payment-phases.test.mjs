import test from 'node:test';import assert from 'node:assert/strict';
import {paymentPhaseHistory} from '../finance.mjs';
test('Đợt thu giữ ngày thực tế, đối soát phiếu nhập không cộng trùng',()=>{
 const result=paymentPhaseHistory([{type:'receipt',amount:2500000,date:'2026-08-01',sourcePaymentIndex:1},{type:'receipt',amount:5000000,date:'2026-09-01',paymentPhase:2},{type:'refund',amount:100000,date:'2026-09-02',paymentPhase:2}],[{index:1,amount:2500000,date:'2026-08-01'}]);
 assert.equal(result.phases[0].amount,2500000);assert.equal(result.phases[0].entries.length,1);assert.equal(result.phases[1].amount,4900000);assert.equal(result.phases[1].entries[1].date,'2026-09-02');
});
test('Không đoán ngày hoặc đợt, giữ khoản ngoài ba đợt riêng',()=>{
 const result=paymentPhaseHistory([{type:'pay',amount:100000,date:'2026-11-07'}],[{index:1,amount:2500000,date:''},{index:4,amount:200000,date:''}]);assert.equal(result.phases[0].entries[0].date,'');assert.equal(result.unassigned,100000);assert.equal(result.phases[2].entries.length,0);assert.equal(result.phases[3].amount,200000);
});
