const key=value=>String(value??'').trim();
const phone=value=>key(value).replace(/\D/g,'');
export function buildLeadDirectory(leads=[],drafts=[],includeArchived=false){
 const result=leads.filter(l=>includeArchived||!l.archived).map(l=>({...l,_pending:false}));
 const ids=new Set(leads.map(l=>key(l.id)).filter(Boolean));
 const codes=new Set(leads.map(l=>key(l.externalCode)).filter(Boolean));
 const cccds=new Set(leads.map(l=>key(l.cccd)).filter(Boolean));
 const phones=new Set(leads.map(l=>phone(l.phone)).filter(Boolean));
 for(const d of drafts.filter(d=>d.status==='pending'&&(includeArchived||!d.lead?.archived))){
 const l=d.lead||{},code=key(l.externalCode),cccd=key(l.cccd),tel=phone(l.phone);
 if(ids.has(key(d.id))||code&&codes.has(code)||cccd&&cccds.has(cccd)||tel&&phones.has(tel))continue;
 result.push({...l,id:d.id,_draftId:d.id,_pending:true,_originalStatus:l.status,status:'pending',_ownerName:d.raw?.ownerName||'',_errors:d.errors||[]});
 ids.add(key(d.id));if(code)codes.add(code);if(cccd)cccds.add(cccd);if(tel)phones.add(tel);
 }
 return result;
}

const normalizeSearch=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase();
export function filterLeadDirectory(rows,filters={},ownerLabel=()=> ''){
 const missing=(l,key)=>key==='phone'?!String(l.phone||'').trim():key==='cccd'?!/^\d{12}$/.test(String(l.cccd||'')):key==='openingDate'?!l.openingDate:key==='owner'?!l.owner:key==='source'?!['company','personal'].includes(l.source):false;
 return rows.filter(l=>{
 if(filters.query&&!normalizeSearch([l.studentCode,l.externalCode,l.name,l.phone,l._ownerName,ownerLabel(l.owner)].join(' ')).includes(normalizeSearch(filters.query)))return false;
 if(filters.status&&l.status!==filters.status)return false;
 if(filters.category&&l.schoolCategory!==filters.category)return false;
 if(filters.course&&(filters.course==='__empty'?!!l.course:l.course!==filters.course))return false;
 if(filters.owner&&(filters.owner==='__empty'?!!l.owner:l.owner!==filters.owner))return false;
 if(filters.source&&(filters.source==='__empty'?!!l.source:l.source!==filters.source))return false;
 if(filters.handover&&(l.handover||'Chưa bàn giao')!==filters.handover)return false;
 if(filters.stage&&(l.importStage||l.theory||'Chưa cập nhật')!==filters.stage)return false;
 const docs=normalizeSearch(l.documents).trim(),docState=docs==='du'||docs==='du ho so'?'complete':docs.includes('thieu')||docs.includes('chua du')?'incomplete':'unknown';
 if(filters.documents&&docState!==filters.documents)return false;
 if(filters.missing==='any'&&!['phone','cccd','openingDate','owner','source'].some(k=>missing(l,k)))return false;
 if(filters.missing&&filters.missing!=='any'&&!missing(l,filters.missing))return false;
 return true;
 });
}

export function waitingForOpening(lead){return normalizeSearch([lead.course,lead.importStage].join(' ')).includes('cho khai giang')}
export function paymentDueState(id,plans=[],today){const plan=plans.find(p=>p.lead===id);const phases=(plan?.phases||[]).filter(p=>[2,3,4].includes(p.phase)&&p.active&&p.due&&p.due<=today&&p.remaining>0).sort((a,b)=>a.due.localeCompare(b.due));return {due:phases.length>0,overdue:phases.some(p=>p.due<today),phases}}
export function searchMatches(text,query){return normalizeSearch(text).includes(normalizeSearch(query))}
