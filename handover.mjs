export const HANDOVER_STATES=['Đã bàn giao','Đã hoàn thành'];
export function applyHandover(record,{status,date,note='',actor,at}){
 if(!HANDOVER_STATES.includes(status))throw Error('Chọn Đã bàn giao hoặc Đã hoàn thành');
 const value=String(date||''),parsed=new Date(value+'T00:00:00Z');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||isNaN(parsed)||parsed.toISOString().slice(0,10)!==value)throw Error('Chọn ngày bàn giao hợp lệ');
 const history=[...(record.handoverHistory||[]),{from:record.handover||'Chưa bàn giao',to:status,date:value,note:String(note).trim(),actor,at}];
 return {...record,handover:status,handoverDate:value,handoverUpdatedAt:at,handoverUpdatedBy:actor,handoverHistory:history};
}
