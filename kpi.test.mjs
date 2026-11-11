import test from 'node:test';import assert from 'node:assert/strict';import {payroll,defaults} from '../kpi.mjs';
const staff=[{id:'a',name:'Sale A',role:'sale'},{id:'b',name:'Sale B',role:'sale'},{id:'m',name:'Quản lý',role:'manager'},{id:'c',name:'CTV',role:'collaborator'}];
const lead=(owner,source='company',extra={})=>({owner,source,status:'won',depositConfirmed:100000,kpiDate:'2026-11-07',...extra});
const calc=rs=>payroll(staff,rs,'2026-11');
test('Sale A 20 HS thưởng 2 triệu, sale B 19 HS không thưởng; quản lý cộng 100k',()=>{const r=calc([...Array.from({length:20},()=>lead('a')),...Array.from({length:19},()=>lead('b'))]);assert.equal(r[0].unit,4000000);assert.equal(r[0].target,2000000);assert.equal(r[1].unit,3800000);assert.equal(r[1].target,0);assert.equal(r[2].override,3900000);assert.equal(r[2].target,0)});
test('Mốc công ty 50 không thưởng, 51 thêm 1 triệu; không nhân đôi mốc sale',()=>{for(const count of [50,51]){const r=calc(Array.from({length:count},()=>lead('a')));assert.equal(r[2].target,count===51?1000000:0);assert.equal(r[2].override,count*100000);assert.equal(r[0].target,2000000)}});
test('Sale và quản lý cần chốt và cọc; CTV cá nhân 1.5 triệu không thêm điều kiện',()=>{const r=calc([lead('a','personal'),lead('a','company',{depositConfirmed:0}),lead('a','company',{status:'new'}),lead('m','personal'),lead('c','personal',{status:'new',depositConfirmed:0}),lead('c')]);assert.equal(r[0].unit,500000);assert.equal(r[2].unit,1000000);assert.equal(r[2].override,100000);assert.equal(r[3].unit,1500000);assert.equal(r[3].target,0)});
test('Tách kỳ, hồ sơ hoàn tất vẫn giữ KPI, chính sách null % không tính',()=>{const r=calc([lead('a','personal',{status:'finished'}),lead('a','personal',{kpiDate:'2026-10-31'})]);assert.equal(r[0].unit,500000);assert.equal(defaults.sale.percent,null)});

test('Đồng bộ kỳ theo ngày chốt và ngày nhận cọc muộn hơn; trả lương bộ phận hỗ trợ',()=>{
 const rs=[lead('a','company',{kpiDate:'2026-10-20',wonDate:'2026-10-20',firstDepositDate:'2026-11-02'})];
 assert.equal(payroll(staff,rs,'2026-10')[0].unit,0);
 assert.equal(payroll(staff,rs,'2026-11')[0].unit,200000);
 const support=payroll([{id:'support',name:'Hồ sơ',role:'records',base:7000000,joinDate:'2026-11-01',allowance:500000}],rs,'2026-11',defaults,{standardDays:26,entries:Array.from({length:26},(_,i)=>({staff:'support',date:'2026-11-'+String(i+1).padStart(2,'0'),status:'full'}))});
 assert.equal(support[0].total,7500000);assert.equal(support[0].unit,0);
});
