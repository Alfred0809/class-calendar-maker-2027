(() => {
  const $ = id => document.getElementById(id);
  let worker = null;
  let currentFile = null;
  let sourceUrl = null;
  let rows = [];
  let busy = false;
  const status = (text, error=false) => { $('ocrStatus').textContent=text; $('ocrStatus').classList.toggle('error',error); };
  const escapeHtml = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const iso = (y,m,d) => `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const campusNames=['宝安碧海湾教学区','南山后海电力花园教学区','福田景田教学区','福田香蜜湖教学区'];
  const roomNames=['碧海湾','后海','景田','香蜜湖'];
  const knownTeachers=['罗文鹏','何克勤','彭婕','包晨'];
  function distance(a,b){const dp=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let old=dp[0];dp[0]=i;for(let j=1;j<=b.length;j++){const v=dp[j];dp[j]=Math.min(dp[j]+1,dp[j-1]+1,old+(a[i-1]===b[j-1]?0:1));old=v;}}return dp[b.length];}
  function closest(value,choices,maxDistance=2){if(!value)return value;const ranked=choices.map(name=>({name,d:distance(value,name)})).sort((a,b)=>a.d-b.d);return ranked[0].d<=maxDistance?ranked[0].name:value;}
  function asDate(value){
    const match=String(value||'').match(/(20\d{2})[\/\.年-](\d{1,2})[\/\.月-](\d{1,2})/);
    if(!match)return '';
    const y=+match[1],m=+match[2],d=+match[3],check=new Date(y,m-1,d);
    return check.getFullYear()===y&&check.getMonth()===m-1&&check.getDate()===d?iso(y,m,d):'';
  }
  function gradeFromCode(code){return code.match(/^POO([1-6])/)?.[1]||'';}
  function rowIssues(row){
    const problems=[];
    if(!/^POO[1-6]E[A-Z]{5}\d{3}$/.test(row.code))problems.push('班级编码格式');
    const grade=row.title.match(/^L([1-6])/)?.[1];
    if(grade&&gradeFromCode(row.code)&&grade!==gradeFromCode(row.code))problems.push('班级编码与课型年级不一致');
    if(!row.startDate||!row.endDate)problems.push('日期');
    if(!/^\d{1,2}:\d{2}—\d{1,2}:\d{2}$/.test(row.weeklyTime))problems.push('上课时间');
    if(!/[-－—]\d{3}$/.test(row.room))problems.push('教室');
    return problems;
  }
  function courseFromLine(line,code){
    const compact=line.replace(/\s+/g,'').replace(/[|｜，,。;；:“”"']/g,'');
    const level=compact.match(/L[1-6]/i);
    const grade=level?.[0].slice(1)||gradeFromCode(code);
    if(!grade)return '';
    const firstDate=compact.search(/20\d{2}[\/.年-]\d/);
    const beforeDate=firstDate<0?compact:compact.slice(0,firstDate);
    const context=level?beforeDate.slice(level.index+2,level.index+12):beforeDate;
    if(/精.{0,2}[Bb8８]/i.test(context))return `L${grade} 精进B`;
    if(/志.{0,2}[高商]|[忠忘].{0,1}高/.test(context))return `L${grade} 志高`;
    return '';
  }
  function loadScript(src){return new Promise((resolve,reject)=>{if(window.Tesseract){resolve();return;}const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('识别程序加载失败，请检查网络后重试。'));document.head.append(s);});}
  async function getWorker(){
    if(worker)return worker;
    await loadScript('ocr/tesseract.min.js');
    const root=new URL('./',location.href);
    worker=await Tesseract.createWorker(['chi_sim','eng'],1,{
      workerPath:new URL('ocr/worker.min.js',root).href,
      corePath:new URL('ocr/core/',root).href,
      langPath:new URL('ocr/lang',root).href,
      workerBlobURL:false,
      logger:msg=>{
        if(!busy)return;
        const label=msg.status==='recognizing text'?'正在识别文字':'正在准备中文识别模型';
        status(`${label}… ${Math.round((msg.progress||0)*100)}%`);
      }
    });
    await worker.setParameters({tessedit_pageseg_mode:'6',preserve_interword_spaces:'1'});
    return worker;
  }
  async function prepareImage(file){
    const bitmap=await createImageBitmap(file);
    const factor=Math.min(bitmap.width<2400?3:2,8000/bitmap.width,6000/bitmap.height);
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(bitmap.width*factor));
    canvas.height=Math.max(1,Math.round(bitmap.height*factor));
    const c=canvas.getContext('2d',{willReadFrequently:true});
    c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
    c.drawImage(bitmap,0,0,canvas.width,canvas.height);
    bitmap.close();
    return canvas;
  }
  function parseRow(raw){
    const line=raw.replace(/L\[(\d)/gi,'L$1');
    const compact=line.replace(/\s+/g,'').replace(/[“”"'|｜，,。]/g,'');
    const codeCandidates=[...line.matchAll(/P[O0]{2}[0-9ISZ]?[A-Z0-9]{7,}/gi)].map(m=>m[0].toUpperCase());
    let code=codeCandidates.find(v=>v.includes('EHSY'))||codeCandidates.at(-1)||'';
    const rawCode=code;
    code=code.replace(/^P[O0]{2}/,'POO');
    const title=courseFromLine(line,code);
    const grade=title.match(/^L([1-6])/)?.[1]||'';
    if(grade)code=code.replace(/^POO(?:[ISZ])?E/,`POO${grade}E`);
    code=code.replace(/^POO[O0]([1-6])E/,'POO$1E').replace(/^POOIE/,'POO1E').replace(/^POOZE/,'POO2E').replace(/^(POO[1-6])[ZS](E[A-Z0-9]+)$/,'$1$2');
    code=code.replace(/^(POO[1-6]E[A-Z]{5})([0-9ZIO]{3})$/,(_,prefix,digits)=>prefix+digits.replace(/[ZIO]/g,char=>({Z:'2',I:'1',O:'0'}[char])));
    const dateTokens=[...line.matchAll(/20\d{2}[\/\.年-]\d{1,2}[\/\.月-]\d{1,2}/g)].map(m=>m[0]);
    const startDate=asDate(dateTokens[0]);
    const endDate=asDate(dateTokens[1]);
    const timeTokens=[...compact.matchAll(/(\d{1,2}[:：]\d{2})\s*[-—–~～至]\s*(\d{1,2}[:：]\d{2})/g)].map(m=>`${m[1].replace('：',':')}—${m[2].replace('：',':')}`);
    const weeklyTime=timeTokens[0]||'';
    const intensiveTime=timeTokens[1]||weeklyTime;
    const afterDates=dateTokens[1]?compact.slice(compact.indexOf(dateTokens[1])+dateTokens[1].length):compact;
    const term=afterDates.match(/[12]期/)?.[0]||(endDate.endsWith('-20')?'2期':'1期');
    const day=(compact.match(/周[一二三四五六日天]/)||[])[0]?.replace('天','日')||(startDate?['周日','周一','周二','周三','周四','周五','周六'][new Date(startDate+'T00:00:00').getDay()]:'');
    const hour=Number(weeklyTime.match(/^\d{1,2}/)?.[0]||12);
    const label=day?`${day}${day==='周五'?'班':hour<12?'上午班':'下午班'}`:'';
    const firstDateIndex=dateTokens[0]?line.indexOf(dateTokens[0]):-1;
    const titleMark=line.match(/L\s*[1-6]\s*(?:精\s*[^\s]{0,2}\s*[B8]|志\s*[高商])?/i);
    const titleEnd=titleMark?titleMark.index+titleMark[0].length:-1;
    const campusText=firstDateIndex>titleEnd&&titleEnd>=0?line.slice(titleEnd,firstDateIndex).replace(/[\s|，,。"“”]/g,''):'';
    const campus=campusText.includes('教学区')?closest(campusText.slice(0,campusText.lastIndexOf('教学区')+3),campusNames,3):'';
    const roomMatches=[...line.matchAll(/([\u4e00-\u9fff]{1,6})\s*[-－—]\s*(\d{3})/g)];
    const roomMatch=roomMatches.at(-1);
    const room=roomMatch?`${closest(roomMatch[1],roomNames,2)}-${roomMatch[2]}`:'';
    const tail=roomMatch?line.slice(roomMatch.index+roomMatch[0].length):'';
    const teacherCandidates=[...tail.matchAll(/[\u4e00-\u9fff]{2,4}/g)].map(m=>m[0]).filter(v=>!['预设','双语','小低','小高'].includes(v)&&!v.includes('教学')&&!v.includes('上课'));
    const teacher=closest(teacherCandidates[0]||'',knownTeachers,1);
    return {raw,rawCode,title,code,startDate,endDate,term,weeklyTime,intensiveTime,label,campus,room,teacher,selected:false};
  }
  function parseText(text){
    const lines=String(text||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    const merged=[];
    const hasCode=line=>/P[O0]{2}[0-9ISZ]?[A-Z0-9]{7,}/i.test(line);
    for(let i=0;i<lines.length;i++){
      let line=lines[i];
      if(hasCode(line)&&!/(20\d{2}[\/.-]\d)/.test(line)&&i+1<lines.length&&!hasCode(lines[i+1]))line+=' '+lines[++i];
      merged.push(line);
    }
    const result=merged.map(parseRow).filter(r=>(r.startDate&&(r.weeklyTime||r.code))||r.code||r.title);
    const campusByCodeZone=new Map();
    for(const r of result){const zone=r.code.match(/([A-Z]{2})\d{3}$/)?.[1];if(zone&&r.campus)campusByCodeZone.set(zone,r.campus);}
    for(const r of result){const zone=r.code.match(/([A-Z]{2})\d{3}$/)?.[1];if(zone&&!r.campus&&campusByCodeZone.has(zone))r.campus=campusByCodeZone.get(zone);}
    const names=[...new Set(result.map(r=>r.teacher).filter(Boolean))];
    if(names.length===1)result.forEach(r=>{if(!r.teacher)r.teacher=names[0];});
    for(const title of new Set(result.map(r=>r.title))){
      const sameCourse=result.filter(r=>r.title===title);
      if(new Set(sameCourse.map(r=>r.teacher).filter(Boolean)).size>1)sameCourse.forEach(r=>r.teacher='');
    }
    return result;
  }
  function rowField(index,label,field,value,type='text',wide=false){return `<label class="${wide?'wide':''}">${label}<input data-ocr-index="${index}" data-ocr-field="${field}" type="${type}" value="${escapeHtml(value)}"></label>`;}
  function renderUnresolved(){
    const unresolved=rows.map((r,index)=>({...r,index})).filter(r=>!r.title);
    const target=$('ocrUnresolved');target.hidden=!unresolved.length;
    target.innerHTML=unresolved.length?`<strong>有 ${unresolved.length} 行未读出课型，请先对照截图补全</strong><p>填写后会出现在下方课型列表中。</p>`+unresolved.map(r=>{
      const grade=gradeFromCode(r.code);
      const grades=grade?[grade]:['1','2','3','4','5','6'];
      const options=grades.flatMap(g=>[`L${g} 志高`,`L${g} 精进B`]);
      return `<label class="ocr-unresolved-row"><span>${escapeHtml(r.code||r.raw.slice(0,35))}</span><select data-unresolved-index="${r.index}"><option value="">选择这行的课型</option>${options.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('')}</select><small>识别文字：${escapeHtml(r.raw)}</small></label>`;
    }).join(''):'';
  }
  function renderRows(){
    const course=$('ocrCourseSelect').value;
    const target=$('ocrRows');
    $('applyOcrBtn').hidden=!course;
    if(!course){target.innerHTML='';$('ocrTeacherAll').value='';return;}
    const subset=rows.map((r,i)=>({...r,index:i})).filter(r=>(r.title||'未识别课型')===course);
    const teachers=[...new Set(subset.map(r=>r.teacher).filter(Boolean))];
    $('ocrTeacherAll').value=teachers.length===1?teachers[0]:'';
    target.innerHTML=subset.map(r=>{const issues=rowIssues(r);const corrected=r.rawCode&&r.code!==r.rawCode;return `<details class="ocr-row" open><summary><input type="checkbox" data-ocr-check="${r.index}" ${r.selected?'checked':''} aria-label="选择 ${escapeHtml(r.title||'未识别课型')} ${escapeHtml(r.code)}"><strong>${escapeHtml(r.title||'未识别课型')} · ${escapeHtml(r.code||'待核对编码')}</strong><small>${escapeHtml(r.term)}</small></summary><div class="ocr-row-fields">${issues.length?`<p class="ocr-issue">请核对：${escapeHtml(issues.join('、'))}</p>`:''}${corrected?`<p class="ocr-correction">编码识别原文：${escapeHtml(r.rawCode)}；当前编码：${escapeHtml(r.code)}。请对照截图确认。</p>`:''}${rowField(r.index,'课型','title',r.title)}${rowField(r.index,'老师','teacher',r.teacher)}${rowField(r.index,'班级编码','code',r.code,'text',true)}${rowField(r.index,'班次名称','label',r.label)}<label>期数<select data-ocr-index="${r.index}" data-ocr-field="term"><option ${r.term==='1期'?'selected':''}>1期</option><option ${r.term==='2期'?'selected':''}>2期</option></select></label>${rowField(r.index,'校区','campus',r.campus,'text',true)}${rowField(r.index,'教室','room',r.room)}${rowField(r.index,'开课日期','startDate',r.startDate,'date')}${rowField(r.index,'结课日期','endDate',r.endDate,'date')}${rowField(r.index,'开班日期上课时间','weeklyTime',r.weeklyTime)}${rowField(r.index,'集训期上课时间','intensiveTime',r.intensiveTime)}<p class="ocr-raw">原始识别：${escapeHtml(r.raw)}</p></div></details>`;}).join('');
  }
  function syncRowVisual(input,index){
    const card=input.closest('.ocr-row');if(!card)return;
    const row=rows[index],fields=card.querySelector('.ocr-row-fields');
    card.querySelector('summary strong').textContent=`${row.title||'未识别课型'} · ${row.code||'待核对编码'}`;
    const issues=rowIssues(row);
    let problem=fields.querySelector('.ocr-issue');
    if(issues.length&&!problem){problem=document.createElement('p');problem.className='ocr-issue';fields.prepend(problem);}
    if(problem){problem.textContent=`请核对：${issues.join('、')}`;problem.hidden=!issues.length;}
    let correction=fields.querySelector('.ocr-correction');
    if(row.rawCode&&row.code!==row.rawCode&&!correction){correction=document.createElement('p');correction.className='ocr-correction';fields.prepend(correction);}
    if(correction){correction.textContent=`编码识别原文：${row.rawCode}；当前编码：${row.code}。请对照截图确认。`;correction.hidden=!row.rawCode||row.code===row.rawCode;}
  }
  function renderCourses(preferred=''){
    const select=$('ocrCourseSelect');
    const courses=[...new Set(rows.map(r=>r.title).filter(Boolean))];
    select.innerHTML='<option value="">请选择课型</option>'+courses.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}（${rows.filter(r=>(r.title||'未识别课型')===c).length} 个班次）</option>`).join('');
    select.value=courses.includes(preferred)?preferred:'';
    renderUnresolved();renderRows();
  }
  async function recognize(file){
    if(busy)return;
    busy=true;currentFile=file;rows=[];$('ocrResult').hidden=true;
    $('ocrConfirm').checked=false;
    if(sourceUrl)URL.revokeObjectURL(sourceUrl);
    sourceUrl=URL.createObjectURL(file);
    $('ocrSourceImage').src=sourceUrl;$('ocrSourceLink').href=sourceUrl;
    status('正在准备识别…首次使用需要加载中文模型。');
    try{
      const image=await prepareImage(file);
      const ocr=await getWorker();
      status('正在识别表格文字…');
      const result=await ocr.recognize(image,{}, {text:true});
      rows=parseText(result.data.text);
      if(!rows.length){status('未找到可用的班级行。请上传包含班级编码、日期和时间的清晰截图。',true);return;}
      renderCourses();$('ocrResult').hidden=false;
      const unresolved=rows.filter(r=>!r.title).length;
      status(`识别出 ${rows.length} 条排课行${unresolved?`，其中 ${unresolved} 条待指定课型`:''}。请先选择课型，再核对对应班次。`);
    }catch(error){console.error(error);status(`识别未完成：${error.message||'请重试'}`,true);}finally{busy=false;}
  }
  $('screenshotInput').addEventListener('change',event=>{
    const file=event.target.files?.[0];if(!file)return;
    if(!file.type.startsWith('image/')){status('请上传 PNG、JPG 或 WebP 截图。',true);return;}
    if(file.size>15*1024*1024){status('截图请小于 15 MB。',true);return;}
    recognize(file);
  });
  $('ocrCourseSelect').addEventListener('change',event=>{
    rows.forEach(r=>r.selected=false);
    $('ocrConfirm').checked=false;
    const course=event.target.value;
    const visible=rows.filter(r=>(r.title||'未识别课型')===course);
    if(visible.length<=4)visible.forEach(r=>r.selected=true);
    renderRows();
    if(course)status(`已选择 ${course}。请核对 ${visible.length} 个班次的识别结果。`);
  });
  $('ocrUnresolved').addEventListener('change',event=>{
    const index=event.target.dataset.unresolvedIndex;
    if(index===undefined)return;
    rows[+index].title=event.target.value;
    $('ocrConfirm').checked=false;
    renderCourses($('ocrCourseSelect').value);
    status('已补全一行课型。请继续补全其余行，然后从列表选择课型。');
  });
  $('ocrTeacherAll').addEventListener('input',event=>{
    const course=$('ocrCourseSelect').value;
    if(!course)return;
    for(const r of rows)if((r.title||'未识别课型')===course)r.teacher=event.target.value;
    for(const input of $('ocrRows').querySelectorAll('[data-ocr-field="teacher"]'))input.value=event.target.value;
    $('ocrConfirm').checked=false;
  });
  $('ocrRows').addEventListener('change',event=>{
    if(event.target.dataset.ocrCheck!==undefined){rows[+event.target.dataset.ocrCheck].selected=event.target.checked;return;}
    const i=event.target.dataset.ocrIndex,field=event.target.dataset.ocrField;
    if(i===undefined||!field)return;
    rows[+i][field]=event.target.value;
    $('ocrConfirm').checked=false;
    if(field==='title'){
      const preferred=$('ocrCourseSelect').value;
      renderCourses(rows.some(r=>r.title===preferred)?preferred:rows[+i].title);
      status('课型已修改，请在列表中确认并重新选择对应班次。');
    }else syncRowVisual(event.target,+i);
  });
  $('ocrRows').addEventListener('input',event=>{
    const i=event.target.dataset.ocrIndex,field=event.target.dataset.ocrField;
    if(i===undefined||!field)return;
    rows[+i][field]=event.target.value;
    $('ocrConfirm').checked=false;
    if(field!=='title')syncRowVisual(event.target,+i);
  });
  $('applyOcrBtn').addEventListener('click',()=>{
    const course=$('ocrCourseSelect').value;
    if(!course){status('请先选择课型。',true);return;}
    if(!$('ocrConfirm').checked){status('请先对照原截图核对所选班次，再勾选确认。',true);return;}
    const selected=rows.filter(r=>r.selected&&(r.title||'未识别课型')===course);
    if(!selected.length||selected.length>4){status('请勾选 1–4 个班次。',true);return;}
    const missing=selected.find(r=>!r.title||!r.code||!r.teacher||!r.startDate||!r.weeklyTime||!r.room);
    if(missing){status('所选班次仍缺少课型、编码、老师、开课日期、时间或教室，请先核对。',true);return;}
    const invalid=selected.find(r=>rowIssues(r).length);
    if(invalid){status(`${invalid.code||'所选班次'} 有待核对字段：${rowIssues(invalid).join('、')}。请修正后再填入日历。`,true);return;}
    if(selected.some(r=>!/^\d{4}-01-/.test(r.startDate)||!/^\d{4}-02-(?:0[1-9]|1\d|20)$/.test(r.endDate))){status('这张截图不是当前寒假排期。课型可核对，但此日历只支持 1–2 月的寒假班，请勿用春季截图生成寒假日历。',true);return;}
    try{window.CalendarMaker.applyScreenshotRows(selected);status(`已将 ${selected.length} 个 ${course} 班次填入日历。请在左侧再次核对后下载。`);}catch(error){status(error.message||'填入失败，请重试。',true);}
  });
  status('识图已就绪 · 2026-10-29 修订版');
})();
