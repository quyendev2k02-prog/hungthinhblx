import {inflateRawSync} from 'node:zlib';
const decode=s=>String(s??'').replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
const text=xml=>[...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(m=>decode(m[1])).join('');
const attr=(s,k)=>decode(s.match(new RegExp('(?:^|\\s)'+k+'="([^"]*)"'))?.[1]||'');
function unzip(buffer){
 let end=-1;for(let i=buffer.length-22;i>=Math.max(0,buffer.length-65557);i--)if(buffer.readUInt32LE(i)===0x06054b50){end=i;break}
 if(end<0)throw Error('File XLSX không hợp lệ');let pos=buffer.readUInt32LE(end+16),count=buffer.readUInt16LE(end+10),size=0;const files={};
 if(count>2000)throw Error('File có quá nhiều thành phần');
 for(let i=0;i<count;i++){
 if(pos+46>buffer.length||buffer.readUInt32LE(pos)!==0x02014b50)throw Error('Mục lục ZIP không hợp lệ');
 const flags=buffer.readUInt16LE(pos+8),method=buffer.readUInt16LE(pos+10),compressed=buffer.readUInt32LE(pos+20),uncompressed=buffer.readUInt32LE(pos+24),nl=buffer.readUInt16LE(pos+28),extra=buffer.readUInt16LE(pos+30),comment=buffer.readUInt16LE(pos+32),offset=buffer.readUInt32LE(pos+42),name=buffer.subarray(pos+46,pos+46+nl).toString();
 size+=uncompressed;if(size>25000000||uncompressed>12000000||flags&1)throw Error('File quá lớn hoặc được mã hóa');
 if(offset+30>buffer.length||buffer.readUInt32LE(offset)!==0x04034b50)throw Error('ZIP lỗi');
 const start=offset+30+buffer.readUInt16LE(offset+26)+buffer.readUInt16LE(offset+28);if(start+compressed>buffer.length)throw Error('ZIP bị cắt ngắn');
 if(name.endsWith('.xml')||name.endsWith('.rels')){const bytes=buffer.subarray(start,start+compressed);const out=method===0?bytes:method===8?inflateRawSync(bytes,{maxOutputLength:12000000}):null;if(!out)throw Error('Định dạng nén chưa hỗ trợ');files[name]=out.toString('utf8');if(/<!DOCTYPE|<!ENTITY/i.test(files[name]))throw Error('XML không được phép dùng DTD/entity');}
 pos+=46+nl+extra+comment;
 }return files;
}
export function parseCsv(input){
 const first=input.split(/\r?\n/)[0]||'',delimiter=first.includes('\t')?'\t':first.split(';').length>first.split(',').length?';':',';let rows=[],row=[],v='',quoted=false;
 for(let i=0;i<input.length;i++){const c=input[i];if(c==='"'){if(quoted&&input[i+1]==='"'){v+='"';i++}else quoted=!quoted}else if(c===delimiter&&!quoted){row.push(v);v=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&input[i+1]==='\n')i++;row.push(v);if(row.some(x=>x.trim()))rows.push(row);row=[];v=''}else v+=c}
 if(quoted)throw Error('CSV có dấu nháy chưa đóng');row.push(v);if(row.some(x=>x.trim()))rows.push(row);return rows;
}
export function readWorkbook(bytes,filename){
 if(bytes.length>6000000)throw Error('Tối đa 6 MB/file');
 if(/\.(csv|tsv)$/i.test(filename))return [{name:'Dữ liệu',rows:parseCsv(bytes.toString('utf8').replace(/^\uFEFF/,''))}];
 if(!/\.xlsx$/i.test(filename))throw Error('Hỗ trợ .xlsx, .csv, .tsv. File .xls cần lưu lại thành .xlsx');
 const files=unzip(bytes),strings=[...(files['xl/sharedStrings.xml']||'').matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)].map(m=>text(m[1]));
 const rels={};for(const m of (files['xl/_rels/workbook.xml.rels']||'').matchAll(/<Relationship\s([^>]+)\/?\s*>/g)){const target=attr(m[1],'Target');rels[attr(m[1],'Id')]=target.startsWith('/')?target.slice(1):'xl/'+target.replace(/^\.\//,'')}
 const formats={};for(const m of (files['xl/styles.xml']||'').matchAll(/<numFmt\s([^>]+)\/?\s*>/g))formats[attr(m[1],'numFmtId')]=attr(m[1],'formatCode');
 const styles=[...((files['xl/styles.xml']||'').match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/)?.[1]||'').matchAll(/<xf\s([^>]+)>|<xf\s([^>]+)\/>/g)].map(m=>+attr(m[1]||m[2],'numFmtId'));
 const sheets=[];
 for(const sheet of (files['xl/workbook.xml']||'').matchAll(/<sheet\s([^>]+)\/?\s*>/g)){
 const xml=files[rels[attr(sheet[1],'r:id')]];if(!xml)continue;let rows=[];
 for(const row of xml.matchAll(/<row\s([^>]*)>([\s\S]*?)<\/row>/g)){
 const index=Number(attr(row[1],'r'))-1;if(index>10000)throw Error('Tối đa 10.000 dòng/sheet');const cells=[];
 for(const cell of row[2].matchAll(/<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)){
 const a=cell[1],body=cell[2]||'',ref=attr(a,'r'),letters=ref.match(/^[A-Z]+/)?.[0];if(!letters)continue;let col=0;for(const ch of letters)col=col*26+ch.charCodeAt(0)-64;col--;if(col>150)throw Error('Tối đa 151 cột');
 const type=attr(a,'t'),value=decode(body.match(/<v[^>]*>([\s\S]*?)<\/v>/)?.[1]||'');
 if(/<f[\s>]/.test(body))cells[col]={value:'',error:'Ô công thức: đổi thành giá trị trước khi nhập'};
 else if(type==='s')cells[col]=strings[+value]||'';else if(type==='inlineStr')cells[col]=text(body);else if(type==='e')cells[col]={value:'',error:'Ô Excel có lỗi'};
 else {const f=styles[Number(attr(a,'s')||0)],format=formats[f]||'';if(value&&type!=='str'&&type!=='b'&&(f>=14&&f<=22||/[dy]/i.test(format.replace(/"[^"]*"|\[[^\]]*\]|\\./g,'')))){const n=Number(value);cells[col]=Number.isFinite(n)?new Date(Date.UTC(1899,11,30)+n*86400000).toISOString().slice(0,10):value}else cells[col]=/^0+$/.test(format)&&/^\d+$/.test(value)?value.padStart(format.length,'0'):value}
 }rows[index>=0?index:rows.length]=cells;
 }sheets.push({name:attr(sheet[1],'name'),rows:Array.from({length:rows.length},(_,i)=>rows[i]||[])});
 }
 if(!sheets.length)throw Error('Không đọc được sheet');return sheets;
}
export const columns={notes:'Ghi chú học vụ',code:'Mã học viên',name:'Họ tên',cccd:'Số CCCD',license:'Hạng / gói B1, B2, C1',phone:'Số điện thoại',documents:'Tình trạng hồ sơ',course:'Khóa',stage:'Tiến độ học',tuition:'Học phí',ownerName:'Người phụ trách',source:'Nguồn data',school:'Trường',balance:'Còn phải thu',amount1:'Thu lần 1',date1:'Ngày thu lần 1',amount2:'Thu lần 2',date2:'Ngày thu lần 2',amount3:'Thu lần 3',date3:'Ngày thu lần 3',amount4:'Thu lần 4',date4:'Ngày thu lần 4'};
export const normalizeText=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/[^a-z0-9]/g,'');
export function importDate(v,year){const s=String(v||'').trim();if(!s)return '';if(/^\d{4}-\d{2}-\d{2}$/.test(s)){const d=new Date(s+'T00:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===s?s:null}const m=s.match(/^(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{4}))?$/);if(!m)return null;return importDate(`${m[3]||year}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`,year)}
export function mappedRow(row,mapping,config){
 const errors=[],raw={};for(const k of Object.keys(columns)){const c=mapping[k];const value=c!==''&&c!==undefined?row[Number(c)]:'';if(value&&typeof value==='object'){errors.push(columns[k]+': '+value.error);raw[k]=value.value}else raw[k]=String(value??'').trim()}
 const number=(s,label)=>{if(!s)return 0;const n=Number(String(s).replace(/[,.\s₫đ]/g,''));if(!Number.isSafeInteger(n)||n<0){errors.push(label+' không hợp lệ');return 0}return n};
 const payments=[];for(let i=1;i<=4;i++){const amount=number(raw['amount'+i],'Thu lần '+i);if(amount){const date=importDate(raw['date'+i],config.year);if(!date)errors.push('Thiếu/sai ngày thu lần '+i);payments.push({amount,date:date||'',deposit:i===1,index:i})}}
 if(payments.length)payments[0].deposit=true;
 const tuition=number(raw.tuition,'Học phí'),paid=payments.reduce((s,p)=>s+p.amount,0);if(paid>tuition)errors.push('Đã thu vượt học phí');if(raw.balance&&number(raw.balance,'Còn phải thu')!==tuition-paid)errors.push('Công nợ không khớp học phí trừ đã thu');
 const cat=raw.license.replace(/\s/g,'').toUpperCase();if(!['B1','B2','C1'].includes(cat))errors.push('Chưa hỗ trợ hạng '+(raw.license||'(trống)'));
 if(!raw.name)errors.push('Thiếu họ tên');if(!raw.phone)errors.push('Thiếu điện thoại');if(!/^\d{12}$/.test(raw.cccd))errors.push('Thiếu/sai CCCD 12 chữ số');
 const source=normalizeText(raw.source),dataSource=source?(['canhan','personal'].includes(source)?'personal':['congty','company'].includes(source)?'company':''):config.source||'';if(!dataSource)errors.push('Chưa xác định nguồn data');
 return {raw,payments,errors,lead:{externalCode:raw.code,name:raw.name,phone:raw.phone,cccd:raw.cccd,schoolCategory:cat,license:cat==='B1'?'B tự động':cat==='B2'?'B số cơ khí':cat,tuition,source:dataSource,school:raw.school||config.school||'',course:raw.course,documents:raw.documents,importStage:raw.stage,status:payments.length?'won':'new',kpiDate:payments[0]?.date||config.defaultDate||'',wonDate:payments[0]?.date||'',note:'Nhập từ Excel; tiến độ gốc: '+raw.stage+(raw.notes?' | Ghi chú gốc: '+raw.notes:'')}};
}
