(function (root) {
  'use strict';
  const statuses = ['미착수', '진행 중', '완료', '보류', '취소', '확인 필요'];
  const feedbackStatuses = ['미전달', '전달 완료', '반영 중', '반영 확인', '조정 필요'];
  const taskFields = ['project','title','direction','department','owner','coordinator','decisionMaker','start','due','forecast','actual','status','criteria','evidence','next','blocker','decision','source','updated'];
  const feedbackFields = ['taskId','title','from','date','type','recipient','delivered','status','owner','due','criteria','evidence','next','source','updated'];
  const dates = new Set(['start','due','forecast','actual','date','delivered','updated']);
  function today() { return new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Seoul'}).format(new Date()); }
  function validDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s+'T00:00:00Z')) && new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s; }
  function day(s) { return validDate(s) ? Date.parse(s+'T00:00:00Z') / 86400000 : NaN; }
  function addDays(s, n) { return new Date((day(s)+n)*86400000).toISOString().slice(0,10); }
  function text(s) { return typeof s === 'string' ? s.trim() : ''; }
  function risk(t, asOf) {
    if (t.status==='취소') return {label:'해당 없음', tone:'neutral'};
    if (t.status==='완료') {
      if (t.actual && t.actual>asOf) return {label:'기준일 이후 완료',tone:'unknown'};
      if (!t.criteria || !t.evidence || !t.actual) return {label:'완료 근거 확인',tone:'unknown'};
      return {label:t.due && t.actual>t.due ? '지연 완료' : '완료',tone:'done'};
    }
    if (!t.due || !validDate(t.due) || !validDate(asOf)) return {label:'판단 불가',tone:'unknown'};
    if (t.due<asOf || (t.forecast && t.forecast>t.due)) return {label:'지연',tone:'late'};
    if (t.blocker || t.status==='보류') return {label:'위험',tone:'risk'};
    if (t.status==='확인 필요' || !t.forecast) return {label:'판단 불가',tone:'unknown'};
    return {label:'일정 정상',tone:'normal'};
  }
  function validateTask(t) {
    if (!text(t.project) || !text(t.title)) throw Error('전략 영역과 과제명을 입력해주세요.');
    if (!statuses.includes(t.status)) throw Error('진행 상태를 확인해주세요.');
    validateDates(t);
    if (t.start && t.due && t.start>t.due) throw Error('착수일은 합의 기한보다 늦을 수 없습니다.');
    if (t.forecast && t.start && t.forecast<t.start) throw Error('예상 완료일은 착수일보다 빠를 수 없습니다.');
    if (t.actual && t.actual>today()) throw Error('실제 완료일은 오늘 이후일 수 없습니다.');
    if (t.status==='완료' && (!text(t.criteria) || !text(t.evidence) || !t.actual)) throw Error('완료하려면 완료 기준, 완료 근거, 실제 완료일을 입력해주세요.');
    if (t.status!=='완료' && t.actual) throw Error('실제 완료일은 진행 상태가 완료일 때 입력해주세요.');
    if (t.actual && t.start && t.actual<t.start) throw Error('실제 완료일은 착수일보다 빠를 수 없습니다.');
    return t;
  }
  function validateDates(o) { for (const k of dates) if (o[k] && !validDate(o[k])) throw Error('날짜 형식을 확인해주세요: '+k); }
  function validateFeedback(f, tasks) {
    if (!text(f.title)) throw Error('상부 의견을 입력해주세요.');
    validateDates(f);
    if (!feedbackStatuses.includes(f.status)) throw Error('피드백 상태를 확인해주세요.');
    if (!['지시','질문','제안','확인 필요'].includes(f.type)) throw Error('의견 유형을 확인해주세요.');
    if (f.taskId && !tasks.some(t=>t.id===f.taskId)) throw Error('연결된 실행 과제를 찾을 수 없습니다.');
    if (['전달 완료','반영 중','반영 확인'].includes(f.status) && (!f.recipient || !f.delivered)) throw Error('전달 대상과 전달일을 입력해주세요.');
    if (f.status==='미전달' && f.delivered) throw Error('전달일이 있으면 전달 상태도 갱신해주세요.');
    if (f.date && f.delivered && f.date>f.delivered) throw Error('전달일은 의견 수신일보다 빠를 수 없습니다.');
    if (f.status==='반영 확인' && (!f.criteria || !f.evidence)) throw Error('반영 확인에는 개별 완료 기준과 반영 근거가 필요합니다.');
    return f;
  }
  function empty() { return {version:1,tasks:[],feedback:[],history:[]}; }
  function normalizeImport(input) {
    if (!input || input.version!==1 || !Array.isArray(input.tasks) || !Array.isArray(input.feedback) || !Array.isArray(input.history)) throw Error('이 대시보드에서 내보낸 버전 1 JSON 백업을 선택해주세요.');
    if (input.tasks.length>2000 || input.feedback.length>4000 || input.history.length>20000) throw Error('가져올 항목 수가 너무 많습니다.');
    const seen=new Set();
    function clean(row,fields) {
      if (!row || typeof row.id!=='string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(row.id) || seen.has(row.id)) throw Error('백업의 ID가 중복되거나 잘못되었습니다.');
      seen.add(row.id);
      const o={id:row.id};
      for(const key of fields) {
        if(row[key]!=null && typeof row[key]!=='string') throw Error('백업의 항목 형식을 확인해주세요: '+key);
        o[key]=text(row[key]);
        if(o[key].length>20000) throw Error('입력 내용이 너무 깁니다.');
      }
      return o;
    }
    const tasks=input.tasks.map(r=>validateTask(clean(r,taskFields)));
    const feedback=input.feedback.map(r=>validateFeedback(clean(r,feedbackFields),tasks));
    const history=input.history.map(h=> {
      if(!h || !['task','feedback'].includes(h.entity) || !seen.has(h.id) || !Array.isArray(h.changes)) throw Error('변경 이력을 확인해주세요.');
      const o={entity:h.entity,id:h.id,at:text(h.at),reason:text(h.reason),authority:text(h.authority),changes:[]};
      if(!o.at || o.reason.length>20000 || o.authority.length>20000 || h.changes.length>50) throw Error('변경 이력 형식이 잘못되었습니다.');
      const allowed=h.entity==='task'?taskFields:feedbackFields;
      o.changes=h.changes.map(c=>{
        if(!c || !allowed.includes(c.field) || typeof c.before!=='string' || typeof c.after!=='string' || c.before.length>20000 || c.after.length>20000) throw Error('변경 상세 형식을 확인해주세요.');
        return {field:c.field,before:c.before,after:c.after};
      });
      return o;
    });
    return {version:1,tasks,feedback,history};
  }
  function changes(before,after,fields) { return fields.filter(k=>text(before[k])!==text(after[k])).map(k=>({field:k,before:text(before[k]),after:text(after[k])})); }
  function report(tasks, feedback, asOf, audience) {
    const line=t=>`- [${t.id}] ${t.project} / ${t.title}\n  실행: ${t.department||'확인 필요'} · ${t.owner||'확인 필요'} | 합의 기한: ${t.due||'확인 필요'} | 예상: ${t.forecast||'확인 필요'}\n  진행: ${t.status} / 일정: ${risk(t,asOf).label}\n  다음 행동: ${t.next||'확인 필요'}\n  근거: ${t.source||'확인 필요'}`;
    const open=tasks.filter(t=>!['완료','취소'].includes(t.status));
    const flagged=open.filter(t=>['late','risk'].includes(risk(t,asOf).tone));
    const unresolved=feedback.filter(f=>f.status!=='반영 확인');
    const resolved=feedback.filter(f=>f.status==='반영 확인');
    const decisions=open.filter(t=>t.decision);
    return `${audience==='meeting'?'협의체 안건':'경영진 보고'} 초안\n기준일: ${asOf}\n범위: 현재 필터의 실행 과제 ${tasks.length}건 / 관련 상부 의견 ${feedback.length}건\n사용자 입력에 기반한 초안 · 발송 전 검토 필요\n\n1. 일정 및 위험 점검 (${flagged.length}건)\n${flagged.map(line).join('\n')||'- 해당 항목 없음'}\n\n2. 필요한 의사결정 (${decisions.length}건)\n${decisions.map(t=>`- [${t.id}] ${t.title}: ${t.decision}\n  결정 주체: ${t.decisionMaker||'확인 필요'} / 장애 요인: ${t.blocker||'미입력'}`).join('\n')||'- 등록된 결정 요청 없음'}\n\n3. 상부 피드백 후속 조치 (${unresolved.length}건)\n${unresolved.map(f=>`- [${f.id}] ${f.title}\n  상태: ${f.status} / 담당: ${f.owner||'확인 필요'} / 기한: ${f.due||'확인 필요'}\n  연결 과제: ${f.taskId||'연결 필요'} / 전달: ${f.recipient||'확인 필요'} · ${f.delivered||'미확인'}\n  반영 기준: ${f.criteria||'합의 필요'} / 다음 행동: ${f.next||'확인 필요'}\n  근거: ${f.source||'확인 필요'}`).join('\n')||'- 미해결 피드백 없음'}\n\n반영 확인 (${resolved.length}건)\n${resolved.map(f=>`- [${f.id}] ${f.title}\n  완료 기준: ${f.criteria}\n  반영 근거: ${f.evidence}`).join("\n")||"- 확인된 반영 결과 없음"}\n\n4. 과제별 진행 현황\n${tasks.map(line).join('\n')||'- 과제를 먼저 등록해주세요.'}\n\n※ 미입력 항목은 확인 필요 사항입니다. 과제 건수는 전략의 성과나 진행률을 뜻하지 않습니다.`;
  }
  function sample(asOf) {
    const d=n=>addDays(asOf,n);
    const make=(id,project,title,status,due,extra={})=>Object.assign(Object.fromEntries(taskFields.map(k=>[k,''])),{id,project,title,status,start:d(-14),due:d(due),forecast:d(due),department:'예시 실행부서',owner:'예시 담당자',coordinator:'전략팀 (예시)',criteria:'유관부서 검토 및 합의 내용 확인 (예시)',next:'담당 부서 진행 현황 확인 (예시)',source:'가상 시연 자료 · 실제 업무와 무관',updated:asOf},extra);
    const tasks=[
      make('T-DEMO-01','미국 자회사 전략','의사결정 권한·보고선 초안 협의','진행 중',-3,{forecast:d(5),blocker:'협의 부서 간 역할 조율 필요 (예시)',decision:'권한 위임 범위의 쟁점 상정 (예시)',decisionMaker:'예시 의사결정 주체'}),
      make('T-DEMO-02','포트폴리오 전략','전략 방향별 검토 기준 정리','진행 중',7,{blocker:'검토 기준에 대한 협의 진행 (예시)'}),
      make('T-DEMO-03','AX 전략','부서별 실행 계획 취합','진행 중',14),
      make('T-DEMO-04','AI 신사업 전략','전략 가설과 검증 범위 협의','미착수',30,{start:d(3)}),
      make('T-DEMO-05','R&D 전략','중장기 방향성 검토 의견 수렴','완료',-7,{actual:d(-8),evidence:'검토 결과 확인서 (가상 예시)'}),
      make('T-DEMO-06','사업개발 전략','전략 정합성 점검 협의체 준비','확인 필요',10,{forecast:'',owner:''})
    ];
    const feedback=[
      {id:'F-DEMO-01',taskId:tasks[0].id,title:'결정 주체와 보고 경로를 구분해 정리 요청 (예시)',from:'예시 경영진',date:d(-5),type:'지시',recipient:'예시 실행부서',delivered:d(-4),status:'반영 중',owner:'예시 담당자',due:d(2),criteria:'수정 초안의 권한·보고선 구분 확인 (예시)',evidence:'',next:'수정 초안 수령 후 기준 충족 확인 (예시)',source:'가상 회의록',updated:asOf},
      {id:'F-DEMO-02',taskId:tasks[1].id,title:'판단 기준의 적용 범위를 재확인해 주세요 (예시)',from:'예시 경영진',date:d(-1),type:'질문',recipient:'',delivered:'',status:'미전달',owner:'',due:d(4),criteria:'',evidence:'',next:'질문의 의도와 전달 대상 확인 (예시)',source:'가상 보고 피드백',updated:asOf}
    ];
    return {version:1,tasks,feedback,history:[]};
  }
  const api={statuses,feedbackStatuses,taskFields,feedbackFields,today,validDate,day,addDays,risk,validateTask,validateFeedback,empty,normalizeImport,changes,report,sample};
  if(typeof module==='object' && module.exports) module.exports=api; else root.StrategyCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
