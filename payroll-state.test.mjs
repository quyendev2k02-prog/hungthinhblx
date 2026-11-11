import test from 'node:test';import assert from 'node:assert/strict';import {isPayrollLocked} from '../payroll-state.mjs';
test('Kỳ chưa tồn tại hoặc bản nháp không bị coi là đã chốt',()=>{for(const run of [undefined,null,{}, {locked:false,paid:false},{locked:false,rows:[]},{locked:'false',paid:'false'}])assert.equal(isPayrollLocked(run),false)});
test('Kỳ thực sự đã chốt hoặc đã trả vẫn được bảo vệ',()=>{for(const run of [{locked:true},{locked:true,paid:true},{locked:false,paid:true}])assert.equal(isPayrollLocked(run),true)});
