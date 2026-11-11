export const COURSE_SYNC_VERSION='courses-2026-09-11-v127';
const rows=[];
function add(openingDate,cutoffDate,studyDate,studyTime,groups){for(const [category,numbers]of Object.entries(groups))for(const number of numbers)rows.push({category,number,key:(category==='B1'?'B.01':category==='B2'?'B':'C1')+'K'+number,openingDate,cutoffDate,studyDate,studyTime,source:'Ảnh lịch khai giảng tháng '+openingDate.slice(5,7)+'/2026 do người dùng cung cấp'})}
add('2026-09-07','2026-09-07','2026-09-12','13:00–17:00',{B1:[47,48],B2:[25,26],C1:[16,17]});
add('2026-09-15','2026-09-15','2026-09-19','13:00–17:00',{B1:[49,50,51],B2:[27,28],C1:[18,19]});
add('2026-09-26','2026-09-25','2026-09-26','13:00–17:00',{B1:[52,53,54],B2:[29,30],C1:[20,21]});
add('2026-10-09','2026-10-09','2026-10-10','13:00–17:00',{B1:[55,56,57,58,59],B2:[29,30],C1:[20,21]});
add('2026-10-20','2026-10-22','2026-10-24','13:00–17:00',{B1:[60,61,62],B2:[31,32],C1:[22,23,24]});
add('2026-10-30','2026-10-29','2026-10-31','13:00–17:00',{B1:[63],B2:[33,34],C1:[25]});
add('2026-11-10','2026-11-10','2026-11-14','13:00–17:00',{B1:[70,71,72],B2:[36,37],C1:[26,27]});
add('2026-11-20','2026-11-20','2026-11-21','13:00–17:00',{B1:[73,74,75],B2:[38,39],C1:[28]});
add('2026-11-28','2026-11-28','2026-11-29','07:30–11:30',{B1:[76,77,78,79],B2:[40],C1:[29,30]});
export const COURSE_SCHEDULE=rows;
export function resolveCourseOpening(lead){
 const text=String(lead.course||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toUpperCase().trim();
 if(!text||text.includes('CHO KHAI GIANG'))return {status:'waiting',needsReview:true,message:'Chưa có mã khóa; giữ chờ khai giảng',candidates:[]};
 const normalized=text.replace(/[.\s_-]/g,''),match=normalized.match(/^(B01|B|C1)?K0*(\d+)$/);
 if(!match)return {status:'not_found',needsReview:true,message:'Mã khóa chưa đối chiếu được trong ba ảnh',candidates:[]};
 const explicit=match[1]?{B01:'B1',B:'B2',C1:'C1'}[match[1]]:'',category=lead.schoolCategory;
 if(explicit&&explicit!==category)return {status:'category_conflict',needsReview:true,message:'Tiền tố khóa không khớp hạng/gói của học viên',candidates:[]};
 const candidates=rows.filter(r=>r.category===category&&r.number===Number(match[2]));
 if(!candidates.length)return {status:'not_found',needsReview:true,message:'Không có khóa này cho đúng hạng trong ảnh; không tự gán ngày',candidates:[]};
 const selected=candidates.length===1?candidates[0]:candidates.find(r=>r.openingDate===lead.openingDate);
 if(!selected)return {status:'ambiguous',needsReview:true,message:'Khóa lặp trong lịch tháng9 và10; cần xác định đúng đợt khai giảng',candidates};
 return {status:'matched',needsReview:false,message:'Khớp lịch '+selected.key,selected,candidates};
}
export function synchronizeStudentCourse(lead){
 const result=resolveCourseOpening(lead),next={...lead,firstInstallment:2500000,openingSync:{version:COURSE_SYNC_VERSION,status:result.status,needsReview:result.needsReview,message:result.message,candidates:result.candidates.map(r=>r.openingDate)}};
 if(result.selected){next.openingDate=result.selected.openingDate;next.openingSync.matchedCourse=result.selected.key;next.openingSync.source=result.selected.source;next.courseSchedule={cutoffDate:result.selected.cutoffDate,cutoffTime:'10:00',studyDate:result.selected.studyDate,studyTime:result.selected.studyTime}}
 if(lead.tuitionOpeningOverride&&lead.tuitionOpeningOverride.course===lead.course){
  next.openingDate=lead.tuitionOpeningOverride.date;
  next.openingSync={...next.openingSync,status:'manual',message:'Ngày khai giảng do người dùng xác nhận'};
 }
 return next;
}
