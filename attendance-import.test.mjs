import test from 'node:test';
import assert from 'node:assert/strict';
import {validateAttendanceImport} from '../attendance.mjs';
const staff=[{id:'s1',name:'Nguyễn An',joinDate:'2026-08-01'}];
const row={row:2,date:'2026-08-10',employee:'Nguyễn An',status:'Đủ ngày'};
const check=(rows,existing=[],locked=()=>false)=>validateAttendanceImport(rows,staff,existing,'2026-11-07',locked);
test('Import matches employee, allows half day and skips duplicates',()=>{
 const rows=check([row,{...row,status:'0.5'}]);assert.equal(rows[0].days,1);assert.equal(rows[1].days,.5);assert.match(rows[1].errors.join(),/Trùng/);
 assert.match(check([row],[{id:'s1-2026-08-10'}])[0].errors.join(),/Đã có/);
});
test('Import rejects unknown codes, future dates, before start and locked months',()=>{
 for(const r of [{...row,status:'0.05'},{...row,date:'2026-07-01'},{...row,date:'2027-01-01'},{...row,employee:'Unknown'}])assert.ok(check([r])[0].errors.length);
 assert.match(check([row],[],()=>true)[0].errors.join(),/đã chốt/);
});
