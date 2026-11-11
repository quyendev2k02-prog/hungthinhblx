export const ATTENDANCE_TYPES={full:{label:'Đủ ngày',days:1},half:{label:'Nửa ngày',days:0.5},absent:{label:'Nghỉ',days:0}};
export function attendanceSummary(staff,entries,month,standardDays=26){
 const records=entries.filter(e=>e.staff===staff.id&&e.date?.slice(0,7)===month&&(!staff.joinDate||e.date>=staff.joinDate));
 const workdays=records.reduce((sum,e)=>sum+(e.status==='hours'?Number(e.hours||0)/8:(ATTENDANCE_TYPES[e.status]?.days||0)),0);
 const salary=Number(staff.base||0),started=!staff.joinDate||staff.joinDate.slice(0,7)<=month;
 const missingJoin=salary>0&&!staff.joinDate,missingAttendance=salary>0&&started&&records.length===0;
 return {id:staff.id,name:staff.name,joinDate:staff.joinDate||'',standardDays,workdays,recordedDays:records.length,baseSalary:salary,earned:Math.round(salary/standardDays*workdays),warning:missingJoin?'Chưa có ngày vào làm':missingAttendance?'Chưa có chấm công':workdays>standardDays?'Công thực tế vượt công chuẩn; kiểm tra lại':'',ready:!missingJoin&&!missingAttendance};
}

// Long-form attendance: one employee per date. Unknown codes remain errors.
export function validateAttendanceImport(rows,staff,existing,today,isLocked,{historical=false}={}){
 const seen=new Set(),norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/[^a-z0-9]/g,'');
 return rows.map(row=>{
 const errors=[],matches=staff.filter(s=>s.id===row.employee||norm(s.name)===norm(row.employee));const person=matches.length===1?matches[0]:null;
 if(!person)errors.push('Không xác định duy nhất nhân sự');
 const date=row.date;const d=new Date(date+'T00:00:00Z');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||isNaN(d)||d.toISOString().slice(0,10)!==date||date>today)errors.push('Ngày sai hoặc ở tương lai');
 if(person&&!person.joinDate&&!historical)errors.push('Chưa có ngày vào làm');
 if(person?.joinDate&&date<person.joinDate)errors.push('Trước ngày vào làm');
 if(isLocked(date.slice(0,7)))errors.push('Kỳ lương đã chốt');
 const rawCode=String(row.status).trim().toLowerCase(),code=/^[0-9.,]+$/.test(rawCode)?rawCode.replace(',','.'):norm(rawCode),status=historical&&rawCode==='hours'&&Number(row.hours)===5?'hours':['full','dungay','dilam','1','x'].includes(code)?'full':['half','nuangay','0.5'].includes(code)?'half':['absent','nghi','0'].includes(code)?'absent':'';
 if(!status)errors.push('Trạng thái chỉ nhận Đủ ngày, Nửa ngày, Nghỉ, full, half, absent, 1, 0.5, 0');
 const key=(person?.id||row.employee)+'-'+date;
 if(seen.has(key))errors.push('Trùng nhân sự/ngày trong file');seen.add(key);
 if(existing.some(e=>e.id===key||e.staff===person?.id&&e.date===date))errors.push('Đã có chấm công; bỏ qua, không ghi đè');
 return {...row,id:key,staff:person?.id||'',name:person?.name||row.employee,status,days:status==='hours'?Number(row.hours)/8:ATTENDANCE_TYPES[status]?.days,errors};
 });
}
