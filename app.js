const DEFAULT_QR = 'assets/new-oriental-qr.png';
const COLORS = ['#2459C6', '#C75B16', '#7A43A2', '#087F76'];
const SAMPLES = {
  luo: {year:2027,title:'L2 志高',teacher:'罗文鹏',campusSummary:'福田景田教学区',classes:[
    {term:'1期',label:'周五班',code:'POO2EHSYJT701',campus:'福田景田教学区',room:'景田-317',color:COLORS[0],weeklyDates:'2027-01-15, 2027-01-22',weeklyTime:'18:30—20:30',intensiveStart:'2027-01-25',intensiveEnd:'2027-02-01',intensiveTime:'08:00—10:00'},
    {term:'1期',label:'周六班',code:'POO2EHSYJT704',campus:'福田景田教学区',room:'景田-317',color:COLORS[1],weeklyDates:'2027-01-16, 2027-01-23',weeklyTime:'15:45—17:45',intensiveStart:'2027-01-25',intensiveEnd:'2027-02-01',intensiveTime:'15:45—17:45'},
    {term:'2期',label:'周日班',code:'POO2EHSYJT703',campus:'福田景田教学区',room:'景田-319',color:COLORS[2],weeklyDates:'2027-01-17, 2027-01-24',weeklyTime:'08:00—10:00',intensiveStart:'2027-02-13',intensiveEnd:'2027-02-20',intensiveTime:'08:00—10:00'}]},
  he: {year:2027,title:'L5 志高',teacher:'何克勤',campusSummary:'景田教学区 / 香蜜湖教学区',classes:[
    {term:'1期',label:'周六上午班',code:'POO5EHSYJT702',campus:'福田景田教学区',room:'景田-321',color:COLORS[0],weeklyDates:'2027-01-16, 2027-01-23',weeklyTime:'08:00—10:00',intensiveStart:'2027-01-25',intensiveEnd:'2027-02-01',intensiveTime:'08:00—10:00'},
    {term:'1期',label:'周六下午班',code:'POO5EHSYJT701',campus:'福田景田教学区',room:'景田-321',color:COLORS[1],weeklyDates:'2027-01-16, 2027-01-23',weeklyTime:'15:45—17:45',intensiveStart:'2027-01-25',intensiveEnd:'2027-02-01',intensiveTime:'15:45—17:45'},
    {term:'2期',label:'周五班',code:'POO5EHSYXM703',campus:'福田香蜜湖教学区',room:'香蜜湖-306',color:COLORS[2],weeklyDates:'2027-01-15, 2027-01-22',weeklyTime:'18:30—20:30',intensiveStart:'2027-02-13',intensiveEnd:'2027-02-20',intensiveTime:'08:00—10:00'}]},
  peng: {year:2027,title:'L5 志高',teacher:'彭婕',campusSummary:'宝安碧海湾教学区',classes:[
    {term:'1期',label:'周六班',code:'POO5EHSYHW702',campus:'宝安碧海湾教学区',room:'碧海湾-301',color:COLORS[0],weeklyDates:'2027-01-16, 2027-01-23',weeklyTime:'15:45—17:45',intensiveStart:'2027-01-25',intensiveEnd:'2027-02-01',intensiveTime:'15:45—17:45'},
    {term:'2期',label:'周日上午班',code:'POO5EHSYHW704',campus:'宝安碧海湾教学区',room:'碧海湾-301',color:COLORS[1],weeklyDates:'2027-01-17, 2027-01-24',weeklyTime:'10:15—12:15',intensiveStart:'2027-02-13',intensiveEnd:'2027-02-20',intensiveTime:'10:15—12:15'},
    {term:'2期',label:'周日下午班',code:'POO5EHSYHW703',campus:'宝安碧海湾教学区',room:'碧海湾-301',color:COLORS[2],weeklyDates:'2027-01-17, 2027-01-24',weeklyTime:'13:30—15:30',intensiveStart:'2027-02-13',intensiveEnd:'2027-02-20',intensiveTime:'13:30—15:30'}]},
  bao: {year:2027,title:'L2 精进B',teacher:'包晨',campusSummary:'宝安碧海湾教学区 / 南山后海电力花园教学区',classes:[
    {term:'1期',label:'周六班',code:'POO2EHSYHW731',campus:'宝安碧海湾教学区',room:'碧海湾-302',color:COLORS[0],weeklyDates:'2027-01-16, 2027-01-23',weeklyTime:'10:15—12:15',intensiveStart:'2027-01-25',intensiveEnd:'2027-02-01',intensiveTime:'10:15—12:15'},
    {term:'2期',label:'周日班',code:'POO2EHSYDL731',campus:'南山后海电力花园教学区',room:'后海-205',color:COLORS[2],weeklyDates:'2027-01-17, 2027-01-24',weeklyTime:'08:00—10:00',intensiveStart:'2027-02-13',intensiveEnd:'2027-02-20',intensiveTime:'08:00—10:00'}]}
};
const $ = id => document.getElementById(id);
const canvas = $('calendarCanvas');
const ctx = canvas.getContext('2d');
let state;
let qrImage = null;
let qrLoadId = 0;
const clone = value => JSON.parse(JSON.stringify(value));
function newSample(key='luo'){return {...clone(SAMPLES[key]),showQr:true,qrData:DEFAULT_QR,qrName:'示例二维码'};}
try { state = JSON.parse(localStorage.getItem('calendar-maker-draft')) || newSample(); } catch { state = newSample(); }
if (!state || !Array.isArray(state.classes)) state = newSample();
function save(){try{localStorage.setItem('calendar-maker-draft',JSON.stringify(state));}catch{}}
function message(text,error=false){$('message').textContent=text;$('message').classList.toggle('error',error);}
function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function input(label,field,value,type='text',wide=false){return `<label class="${wide?'wide':''}">${label}<input data-class-field="${field}" type="${type}" value="${esc(value)}"></label>`;}
function cardHtml(c,i){return `<article class="class-card" data-index="${i}"><div class="class-card-head"><span class="class-color" style="background:${esc(c.color)}"></span><strong>班次 ${i+1} · ${esc(c.label||'未命名')}</strong><button type="button" class="icon-button" data-remove="${i}" aria-label="删除班次 ${i+1}">×</button></div><div class="class-fields"><label>排期<select data-class-field="term"><option ${c.term==='1期'?'selected':''}>1期</option><option ${c.term==='2期'?'selected':''}>2期</option></select></label><label>快速填入日期<select data-preset="${i}"><option value="">选择排期模板</option><option value="oneSat">1期 · 周六</option><option value="oneFri">1期 · 周五</option><option value="twoSun">2期 · 周日</option><option value="twoFri">2期 · 周五</option></select></label>${input('班次名称','label',c.label)}${input('班级编码','code',c.code)}${input('校区','campus',c.campus)}${input('教室','room',c.room)}${input('开班日期（逗号分隔）','weeklyDates',c.weeklyDates,'text',true)}${input('开班日期上课时间','weeklyTime',c.weeklyTime)}${input('集训期上课时间','intensiveTime',c.intensiveTime)}${input('集训开始','intensiveStart',c.intensiveStart,'date')}${input('集训结束','intensiveEnd',c.intensiveEnd,'date')}<label>班次颜色<input data-class-field="color" type="color" value="${esc(c.color)}"></label></div><p class="class-hint">例：先上 1/16、1/23 两次周末课，再从 1/25 到 2/1 连续上课。</p></article>`;}
function renderControls(){for(const el of document.querySelectorAll('[data-meta]'))el.value=state[el.dataset.meta]??'';$('showQrInput').checked=!!state.showQr;$('qrName').textContent=state.qrName||'当前使用示例二维码';$('classes').innerHTML=state.classes.map(cardHtml).join('');$('classCount').textContent=`${state.classes.length} 个班次`;$('addClassBtn').disabled=state.classes.length>=4;}
function iso(y,m,d){return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;}
function parseIso(s){const m=String(s||'').match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);if(!m)return null;const y=+m[1],mo=+m[2],d=+m[3];const value=new Date(y,mo-1,d);return value.getFullYear()===y&&value.getMonth()===mo-1&&value.getDate()===d?value:null;}
function addDays(s,n){const d=parseIso(s);if(!d)return '';d.setDate(d.getDate()+n);return iso(d.getFullYear(),d.getMonth()+1,d.getDate());}
function fmtDate(s){const d=parseIso(s);return d?`${d.getMonth()+1}/${d.getDate()}`:s;}
function shortTime(s){const match=String(s||'').match(/\d{1,2}:\d{2}/);return match?match[0]:'';}
function normalizeTime(s){return String(s||'').replace(/[－—–~～至]/g,'—').replace(/\s+/g,'');}
function summary(c){const days=String(c.weeklyDates||'').split(/[,，、\s]+/).filter(Boolean).map(fmtDate).join('、');const span=c.intensiveStart&&c.intensiveEnd?`${fmtDate(c.intensiveStart)}—${fmtDate(c.intensiveEnd)}`:'';const same=normalizeTime(c.weeklyTime)===normalizeTime(c.intensiveTime);return `${days}${days&&span?'、':''}${span}  ${same?c.weeklyTime:`${c.weeklyTime}；${c.intensiveTime}`}`.trim();}
function loadQr(){const id=++qrLoadId;qrImage=null;if(!state.qrData){drawCalendar();return;}const img=new Image();img.onload=()=>{if(id===qrLoadId){qrImage=img;drawCalendar();}};img.onerror=()=>{if(id===qrLoadId){qrImage=null;drawCalendar();message('二维码图片加载失败，请重新上传。',true);}};img.src=state.qrData;}
function update(){message('');save();drawCalendar();}
function preset(c,key){const y=Number(state.year)||2027;const map={oneSat:{term:'1期',dates:[iso(y,1,16),iso(y,1,23)],start:iso(y,1,25),end:iso(y,2,1)},oneFri:{term:'1期',dates:[iso(y,1,15),iso(y,1,22)],start:iso(y,1,25),end:iso(y,2,1)},twoSun:{term:'2期',dates:[iso(y,1,17),iso(y,1,24)],start:iso(y,2,13),end:iso(y,2,20)},twoFri:{term:'2期',dates:[iso(y,1,15),iso(y,1,22)],start:iso(y,2,13),end:iso(y,2,20)}};const p=map[key];if(!p)return;Object.assign(c,{term:p.term,weeklyDates:p.dates.join(', '),intensiveStart:p.start,intensiveEnd:p.end});}
function parseExcel(){const raw=$('pasteInput').value.trim();if(!raw){message('先粘贴从 Excel 复制的表头和班级行。',true);return;}const rows=raw.split(/\r?\n/).map(line=>line.split('\t').map(v=>v.trim())).filter(row=>row.some(Boolean));const hi=rows.findIndex(row=>row.some(v=>v.includes('班级名称'))&&row.some(v=>v.includes('开课日期')));if(hi<0){message('没找到表头。请把“班级名称（外）”“开课日期”等列的表头一起复制。',true);return;}const h=rows[hi];const col=(row,...names)=>{let i=-1;for(const n of names){i=h.findIndex(v=>v===n||v.includes(n));if(i>=0)break;}return i<0?'':(row[i]||'');};const parsed=[];let teacher='',title='',campuses=[];for(const row of rows.slice(hi+1)){const name=col(row,'班级名称');const startRaw=col(row,'开课日期');if(!name||!startRaw)continue;const dateParts=startRaw.match(/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);const startDate=dateParts?iso(+dateParts[1],+dateParts[2],+dateParts[3]):'';if(!parseIso(startDate))continue;const termRaw=col(row,'期数');const term=termRaw.includes('2')?'2期':'1期';const time=col(row,'上课时间');const pairs=[...time.replace(/[：]/g,':').matchAll(/(\d{1,2}:\d{2})\s*[-—–~～至]\s*(\d{1,2}:\d{2})/g)];const weeklyTime=pairs[0]?`${pairs[0][1]}—${pairs[0][2]}`:'';const intensiveTime=pairs[1]?`${pairs[1][1]}—${pairs[1][2]}`:weeklyTime;const day=(time.match(/周[一二三四五六日天]/)||['班'])[0].replace('天','日');const hour=+(weeklyTime.match(/^\d+/)||[12])[0];const label=`${day}${day==='周五'?'班':hour<12?'上午班':'下午班'}`;const campus=col(row,'校区名称');const room=col(row,'上课教室');const code=col(row,'寒假班级编码','班级编码');const classTitle=(name.match(/L\d+\s*[^\s]*/i)||[name.replace('双语寒假','')])[0].replace(/^(L\d+)/i,'$1 ');const t=col(row,'实际教师');if(!teacher)teacher=t;if(!title)title=classTitle;if(campus&&!campuses.includes(campus))campuses.push(campus);const y=parseIso(startDate).getFullYear();const intensiveStart=term==='1期'?iso(y,1,25):iso(y,2,13);const intensiveEnd=term==='1期'?iso(y,2,1):iso(y,2,20);parsed.push({term,label,code,campus,room,color:COLORS[parsed.length%COLORS.length],weeklyDates:`${startDate}, ${addDays(startDate,7)}`,weeklyTime,intensiveStart,intensiveEnd,intensiveTime});}
  if(!parsed.length){message('没有识别到有效班级行，请检查日期格式与表头。',true);return;}if(parsed.length>4){message('一次最多导入四个班次，请在 Excel 中先筛选。',true);return;}state.year=parseIso(parsed[0].weeklyDates.split(',')[0].trim()).getFullYear();state.title=title;state.teacher=teacher;state.campusSummary=campuses.join(' / ');state.classes=parsed;renderControls();update();message(`已导入 ${parsed.length} 个班次。请核对日期、时间和班级编码后下载。`);document.querySelector('.paste-box').open=false;}
document.querySelectorAll('[data-meta]').forEach(el=>el.addEventListener('input',()=>{state[el.dataset.meta]=el.dataset.meta==='year'?Number(el.value):el.value;update();}));
$('classes').addEventListener('input',event=>{const field=event.target.dataset.classField;if(!field)return;const article=event.target.closest('[data-index]');const c=state.classes[+article.dataset.index];c[field]=event.target.value;article.querySelector('.class-color').style.background=c.color;update();});
$('classes').addEventListener('change',event=>{if(event.target.dataset.preset!==undefined){const i=+event.target.dataset.preset;preset(state.classes[i],event.target.value);renderControls();update();message('已填入排期日期，请继续检查上课时间。');return;}if(event.target.dataset.classField){renderControls();update();}});
$('classes').addEventListener('click',event=>{const button=event.target.closest('[data-remove]');if(!button)return;if(state.classes.length===1){message('至少保留一个班次。',true);return;}state.classes.splice(+button.dataset.remove,1);renderControls();update();});
$('addClassBtn').addEventListener('click',()=>{if(state.classes.length>=4)return;const y=Number(state.year)||2027;state.classes.push({term:'1期',label:'新班次',code:'',campus:state.campusSummary.split('/')[0].trim(),room:'',color:COLORS[state.classes.length%COLORS.length],weeklyDates:`${iso(y,1,16)}, ${iso(y,1,23)}`,weeklyTime:'10:15—12:15',intensiveStart:iso(y,1,25),intensiveEnd:iso(y,2,1),intensiveTime:'10:15—12:15'});renderControls();update();});
$('templateSelect').addEventListener('change',event=>{if(!event.target.value)return;state=newSample(event.target.value);renderControls();loadQr();save();message('示例已载入，可以直接修改。');event.target.value='';});
$('showQrInput').addEventListener('change',event=>{state.showQr=event.target.checked;update();});
$('qrInput').addEventListener('change',event=>{const file=event.target.files?.[0];if(!file)return;if(!file.type.startsWith('image/')){message('请上传图片文件。',true);return;}if(file.size>5*1024*1024){message('二维码图片请小于 5 MB。',true);return;}const reader=new FileReader();reader.onload=()=>{state.qrData=reader.result;state.qrName=file.name;state.showQr=true;renderControls();loadQr();save();message('二维码已更新。');};reader.readAsDataURL(file);});
$('parseBtn').addEventListener('click',parseExcel);
function validate(){
  const year=Number(state.year);
  if(!Number.isInteger(year)||year<2026||year>2100)return '请填写有效年份。';
  if(!String(state.title||'').trim()||!String(state.teacher||'').trim())return '请填写课程名称和老师姓名。';
  for(let i=0;i<state.classes.length;i++){
    const c=state.classes[i],name=`班次 ${i+1}`;
    if(!c.label?.trim()||!c.code?.trim()||!c.room?.trim())return `${name}缺少班次名称、班级编码或教室。`;
    if(!/\d{1,2}:\d{2}\s*[-—–~～至]\s*\d{1,2}:\d{2}/.test(c.weeklyTime)||!/\d{1,2}:\d{2}\s*[-—–~～至]\s*\d{1,2}:\d{2}/.test(c.intensiveTime))return `${name}的上课时间请写成 08:00—10:00。`;
    const weekly=String(c.weeklyDates||'').split(/[,，、\s]+/).filter(Boolean);
    if(!weekly.length||weekly.some(d=>!parseIso(d)||!d.startsWith(`${year}-`)||![1,2].includes(parseIso(d).getMonth()+1)))return `${name}的开班日期需填写本年 1–2 月的有效日期。`;
    const first=parseIso(c.intensiveStart),last=parseIso(c.intensiveEnd);
    if(!first||!last||first>last||first.getFullYear()!==year||last.getFullYear()!==year||![1,2].includes(first.getMonth()+1)||![1,2].includes(last.getMonth()+1))return `${name}的集训日期需在本年 1–2 月，且结束日期不早于开始日期。`;
  }
  if(state.showQr&&!qrImage)return '二维码尚未加载完成，请稍后再下载或重新上传。';
  return '';
}
async function download(){
  const error=validate();
  if(error){message(error,true);$('message').scrollIntoView({behavior:'smooth',block:'center'});return;}
  drawCalendar();
  const filename=`${state.year}寒假_${(state.title||'课表').replace(/[\\/:*?"<>|]/g,'')}_${(state.teacher||'老师').replace(/[\\/:*?"<>|]/g,'')}.png`;
  canvas.toBlob(blob=>{if(!blob){message('图片生成失败，请重试。',true);return;}const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);message('图片已下载。');},'image/png');
}
$('downloadBtn').addEventListener('click',download);$('downloadBottomBtn').addEventListener('click',download);

const C={ink:'#17283C',muted:'#586B7F',grid:'#DDE5E9',bg:'#F4F7F7',white:'#FFFFFF'};
function font(size,weight=400){return `${weight} ${size}px "Microsoft YaHei","PingFang SC","Noto Sans CJK SC",Arial,sans-serif`;}
function rr(x,y,w,h,r,fill,stroke=null,line=1){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}}
function text(value,x,y,size,color=C.ink,weight=400){ctx.font=font(size,weight);ctx.fillStyle=color;ctx.textBaseline='top';ctx.fillText(String(value??''),x,y);}
function centered(value,cx,y,size,color=C.ink,weight=400){ctx.font=font(size,weight);const w=ctx.measureText(String(value)).width;text(value,cx-w/2,y,size,color,weight);}
function fitText(value,x,y,maxWidth,baseSize,color=C.ink,weight=400){let size=baseSize;ctx.font=font(size,weight);while(ctx.measureText(String(value)).width>maxWidth&&size>25){size-=2;ctx.font=font(size,weight);}text(value,x,y,size,color,weight);}
function line(x1,y1,x2,y2,color=C.grid,width=3){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function scheduleMap(){const map=new Map();for(const c of state.classes){const put=(key,time)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(key)||!shortTime(time))return;if(!map.has(key))map.set(key,[]);const hits=map.get(key);const old=hits.findIndex(hit=>hit.c===c);if(old>=0)hits.splice(old,1);hits.push({c,time:shortTime(time)});};for(const s of String(c.weeklyDates||'').split(/[,，、\s]+/).filter(Boolean))put(s,c.weeklyTime);const start=parseIso(c.intensiveStart),end=parseIso(c.intensiveEnd);if(start&&end&&end>=start){let d=new Date(start);for(let i=0;i<45&&d<=end;i++,d.setDate(d.getDate()+1))put(iso(d.getFullYear(),d.getMonth()+1,d.getDate()),c.intensiveTime);}}return map;}
function drawMonth(year,month,x,y,map){const pw=1480,ph=1080;rr(x,y,pw,ph,32,C.white,C.grid,3);text(`${year}年 ${month}月`,x+45,y+24,58);line(x+45,y+108,x+pw-45,y+108);const gx=x+33,gy=y+214,cw=202;for(let wd=0;wd<7;wd++)centered('一二三四五六日'[wd],gx+wd*cw+cw/2,y+137,31,C.muted);const first=(new Date(year,month-1,1).getDay()+6)%7;const count=new Date(year,month,0).getDate();const rows=Math.ceil((first+count)/7);const ch=Math.min(160,Math.floor(840/rows));for(let row=0;row<rows;row++)for(let col=0;col<7;col++){const day=row*7+col-first+1;const left=gx+col*cw,top=gy+row*ch;const box=[left+5,top+5,cw-10,ch-12];if(day<1||day>count){rr(...box,19,'#EFF2F3');continue;}const hits=map.get(iso(year,month,day))||[];rr(...box,19,hits.length?C.white:'#FAFBFB',C.grid,2);text(day,left+22,top+8,38,hits.length?C.ink:'#9AA8B2');if(hits.length){const n=hits.length;const phit=n<=1?44:n===2?36:n===3?28:22;const gap=n<=2?7:4;const start=n===1?top+96:n===2?top+74:n===3?top+67:top+57;hits.forEach((hit,j)=>{const py=start+j*(phit+gap);rr(left+17,py,cw-35,phit,Math.min(12,phit/3),hit.c.color||COLORS[j]);centered(hit.time,left+cw/2,py+(n===4?0:1),n<=1?30:n===2?27:n===3?22:18,C.white);});}}}
function drawLegendCard(c,x,y,h,n){rr(x,y,1480,h,25,C.white,C.grid,2);rr(x+19,y+19,16,h-38,8,c.color||COLORS[0]);const title=`${c.term||''} · ${c.label||'班次'} · ${c.room||'待填教室'}`;let ty,dy,cy;if(n===1){ty=y+92;dy=y+175;cy=y+92;}else if(n===2){ty=y+45;dy=y+125;cy=y+48;}else if(n===3){ty=y+25;dy=y+102;cy=y+28;}else{ty=y+13;dy=y+72;cy=y+13;}fitText(title,x+63,ty,930,n===4?34:40,C.ink);fitText(summary(c),x+63,dy,1360,n===4?27:31,C.muted);if(c.code){rr(x+1030,cy,425,52,14,'#EEF3FA');centered(`班级编码  ${c.code}`,x+1242,cy+6,29,c.color||COLORS[0]);}if(n<=2&&c.campus)fitText(`校区：${c.campus}`,x+63,y+h-74,1300,31,C.muted);}
function cart(x,y,color){ctx.strokeStyle=color;ctx.lineWidth=5;ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(x+2,y+7);ctx.lineTo(x+12,y+7);ctx.lineTo(x+21,y+48);ctx.lineTo(x+54,y+48);ctx.stroke();ctx.beginPath();ctx.moveTo(x+15,y+18);ctx.lineTo(x+62,y+18);ctx.lineTo(x+55,y+40);ctx.lineTo(x+20,y+40);ctx.closePath();ctx.stroke();ctx.fillStyle=color;ctx.beginPath();ctx.arc(x+29,y+58,5,0,Math.PI*2);ctx.arc(x+52,y+58,5,0,Math.PI*2);ctx.fill();}
function drawQr(){rr(1630,1425,1480,590,25,'#174EAD','#F8C834',6);rr(1649,1490,460,460,18,C.white);if(qrImage){const scale=Math.min(430/qrImage.width,430/qrImage.height);const w=qrImage.width*scale,h=qrImage.height*scale;ctx.drawImage(qrImage,1664+(430-w)/2,1505+(430-h)/2,w,h);}else{centered('上传二维码',1879,1695,40,C.muted);}rr(2160,1570,740,85,20,'#F8C834');const label='扫码加入购物车';ctx.font=font(55);const width=ctx.measureText(label).width;const lx=2530-(width+78)/2;text(label,lx,1580,55,C.ink);cart(lx+width+15,1580,C.ink);text('微信扫一扫',2165,1700,60,C.white);text('查看相关信息',2168,1790,40,'#DFEAFF');}
function drawCalendar(){const withQr=!!state.showQr;const H=withQr?2130:1800;canvas.height=H;ctx.fillStyle=C.bg;ctx.fillRect(0,0,3200,H);ctx.fillStyle='#087F76';ctx.fillRect(0,0,3200,18);const year=Number(state.year)||2027;fitText(`${year} 寒假双语班  ·  ${state.title||'课程名称'}`,90,53,2940,94,C.ink);fitText(`${state.campusSummary||'校区'}  ·  ${state.teacher||'老师'}老师`,93,192,2940,38,C.muted);line(90,274,3110,274);const map=scheduleMap();drawMonth(year,1,90,307,map);drawMonth(year,2,1630,307,map);const n=state.classes.length;if(withQr){const h=n===1?590:n===2?280:n===3?180:134;const gap=n===1?0:n===2?25:n===3?25:18;state.classes.forEach((c,i)=>drawLegendCard(c,90,1425+i*(h+gap),h,n));drawQr();}else{state.classes.forEach((c,i)=>drawLegendCard(c,90+(i%2)*1540,1425+Math.floor(i/2)*145,130,4));}text('上课日期已按输入的排期逐日标注',90,H-62,27,C.muted);document.querySelector('.preview-meta span:last-child').textContent=`3200 × ${H} px`;}
window.CalendarMaker = {
  applyScreenshotRows(rows){
    if(!Array.isArray(rows)||!rows.length||rows.length>4)throw new Error('请选择 1–4 个班次。');
    const weekdayOrder={'五':0,'六':1,'日':2};
    rows=[...rows].sort((a,b)=>(a.term==='2期')-(b.term==='2期')||(weekdayOrder[a.label?.[1]]??9)-(weekdayOrder[b.label?.[1]]??9)||String(a.weeklyTime).localeCompare(String(b.weeklyTime)));
    const first=rows[0];
    const firstDate=parseIso(first.startDate);
    state.year=firstDate?firstDate.getFullYear():2027;
    state.title=first.title||'';
    state.teacher=first.teacher||'';
    state.campusSummary=[...new Set(rows.map(r=>r.campus).filter(Boolean))].join(' / ');
    state.classes=rows.map((r,i)=>{
      const y=Number(state.year),term=r.term==='2期'?'2期':'1期';
      return {term,label:r.label||'班次',code:r.code||'',campus:r.campus||'',room:r.room||'',color:COLORS[i%COLORS.length],weeklyDates:r.startDate?`${r.startDate}, ${addDays(r.startDate,7)}`:'',weeklyTime:r.weeklyTime||'',intensiveStart:term==='1期'?iso(y,1,25):iso(y,2,13),intensiveEnd:r.endDate|| (term==='1期'?iso(y,2,1):iso(y,2,20)),intensiveTime:r.intensiveTime||r.weeklyTime||''};
    });
    renderControls();update();message(`已填入 ${rows.length} 个班次。请逐项核对后下载。`);
  }
};
renderControls();loadQr();save();
