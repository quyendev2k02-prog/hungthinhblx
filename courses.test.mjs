import test from 'node:test';import assert from 'node:assert/strict';
import {resolveCourseOpening,synchronizeStudentCourse} from '../courses.mjs';
import {tuitionPlan} from '../finance.mjs';
test('Khớp mã khóa theo đúng hạng, lấy ngày mở lớp thay vì ngày chốt/học tập trung',()=>{
 for(const [category,course,date]of [['B1','K53','2026-09-26'],['B1','B.01K55','2026-10-09'],['B1','K60','2026-10-20'],['B2','BK33','2026-10-30'],['B2','K37','2026-11-10'],['C1','C1K26','2026-11-10'],['C1','K30','2026-11-28']])assert.equal(synchronizeStudentCourse({schoolCategory:category,course}).openingDate,date);
 const opening=resolveCourseOpening({schoolCategory:'B1',course:'K60'}).selected;assert.equal(opening.cutoffDate,'2026-10-22');assert.equal(opening.studyDate,'2026-10-24');assert.equal(opening.openingDate,'2026-10-20');
});
test('Không chọn bừa khóa trùng, sai hạng, khóa69 hoặc học viên chưa có khóa',()=>{
 assert.equal(resolveCourseOpening({schoolCategory:'B2',course:'K29'}).status,'ambiguous');
 assert.equal(resolveCourseOpening({schoolCategory:'B2',course:'K29',openingDate:'2026-10-09'}).selected.openingDate,'2026-10-09');
 assert.equal(resolveCourseOpening({schoolCategory:'B1',course:'BK37'}).status,'category_conflict');
 for(const [category,course]of [['B2','K60'],['B1','K69']])assert.equal(resolveCourseOpening({schoolCategory:category,course}).status,'not_found');
 assert.equal(resolveCourseOpening({schoolCategory:'C1',course:'Chờ khai giảng'}).status,'waiting');
});
test('Đồng bộ lặp lại không đổi dữ liệu, đợt1 chuẩn2500 dù phiếu lịch sử lớn hơn',()=>{
 const input={schoolCategory:'B1',course:'K55',openingDate:'2026-08-01',firstInstallment:7500000,tuition:17000000,depositConfirmed:7500000,phase3ConfirmedAt:'2026-10-20'};
 const next=synchronizeStudentCourse(input);assert.equal(next.firstInstallment,2500000);assert.equal(next.openingDate,'2026-10-09');assert.equal(next.tuition,input.tuition);assert.equal(next.depositConfirmed,input.depositConfirmed);assert.deepEqual(synchronizeStudentCourse(next),next);
 const p=tuitionPlan({...next,standardFirstInstallment:2500000,historicalFirstInstallment:8500000,firstPaidAt:'2026-08-10'},8500000);assert.equal(p.phases[0].amount,2500000);assert.equal(p.phases[1].active,true);assert.equal(p.phases[1].due,'2026-08-17');assert.equal(p.phases[2].due,'2026-11-03');
});
