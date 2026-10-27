// 교직백서 1000 — 앱 동작 코드 (index.html에서 분리). js/data.js 다음에 불러옵니다.
        function escapeHTML(str) { return String(str ?? '').replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)); }
        function debounce(func, wait) { let timeout; return function(...args) { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), wait); }; }
        function hashCode(str) { let hash = 0; for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0; } return hash; }
        // 편향 없는 셔플 (Fisher-Yates)
        function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

        const CHO_LIST = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
        function getChosung(str) { let r=""; for(let i=0; i<str.length; i++){ const c=str.charCodeAt(i)-44032; if(c>-1&&c<11172) r+=CHO_LIST[Math.floor(c/588)]; else r+=str.charAt(i); } return r; }
        function highlightText(text, query) { if(!query||!text) return escapeHTML(text); const sT=escapeHTML(text); const sQ=escapeHTML(query); try{ const r=new RegExp(`(${sQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'); return sT.replace(r, '<span class="bg-amber-200 dark:bg-amber-800 text-slate-900 dark:text-white px-0.5 rounded">$1</span>'); } catch(e){ return sT; } }
        function showToast(msg, type='success') { const c=document.getElementById('toast-container'); if(!c)return; const t=document.createElement('div'); const bgs={success:'bg-slate-900 dark:bg-white text-white dark:text-slate-900', error:'bg-rose-600 text-white', info:'bg-blue-600 text-white'}; t.className=`${bgs[type]||bgs.success} px-4 py-3 rounded-2xl shadow-xl text-xs font-bold pointer-events-auto transform translate-y-2 opacity-0 transition-all duration-300 flex items-center gap-2`; t.innerHTML=`<i class="fa-solid fa-${type==='error'?'circle-exclamation':'circle-check'}"></i> ${escapeHTML(msg)}`; c.appendChild(t); setTimeout(()=>t.classList.remove('translate-y-2','opacity-0'),10); setTimeout(()=>{t.classList.add('translate-y-2','opacity-0'); setTimeout(()=>t.remove(),300);},2500); }

        // 클립보드 복사 (카카오톡 인앱 브라우저 등 Clipboard API가 막힌 환경용 대체 경로 포함)
        function copyText(text, msg = '클립보드에 복사되었습니다.') {
            if (!text) return;
            const fallback = () => {
                const ta = document.createElement('textarea');
                ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '0'; ta.style.opacity = '0';
                document.body.appendChild(ta); ta.select();
                let ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
                ta.remove();
                showToast(ok ? msg : '복사에 실패했습니다. 직접 선택해서 복사해 주세요.', ok ? 'success' : 'error');
            };
            if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(() => showToast(msg)).catch(fallback);
            else fallback();
        }
        // 일반 텍스트(메신저용)와 HTML 표(한글·워드·엑셀 붙여넣기용)를 동시에 클립보드에 복사
        function copyRichTable(plainText, htmlTable, msg = '클립보드에 복사되었습니다.') {
            if (!plainText) return;
            if (navigator.clipboard && window.isSecureContext && typeof ClipboardItem !== 'undefined' && htmlTable) {
                try {
                    const item = new ClipboardItem({
                        'text/plain': new Blob([plainText], { type: 'text/plain' }),
                        'text/html': new Blob([htmlTable], { type: 'text/html' })
                    });
                    navigator.clipboard.write([item]).then(() => showToast(msg)).catch(() => copyText(plainText, msg));
                    return;
                } catch (_) {}
            }
            copyText(plainText, msg);
        }

        const Storage = {
            PREFIX: 'eb_1000_final_', LEGACY: 'eb_1000_v7_',
            error: null,
            warned: false,
            warnReadError() {
                if (!this.warned) { this.warned = true; showToast('일부 저장 자료를 읽지 못했습니다. 기존 자료는 보존했습니다.', 'error'); }
            },
            get(k, def) {
                if (typeof Vault !== 'undefined' && Vault && Vault.protects(k)) return Vault.get(k, def);
                try {
                    const current = localStorage.getItem(this.PREFIX+k);
                    const legacy = localStorage.getItem(this.LEGACY+k);
                    if (current !== null) {
                        try { return JSON.parse(current); } catch (_) {
                            this.error = { key: k, kind: 'damaged' };
                            this.warnReadError();
                            if (legacy !== null) { try { return JSON.parse(legacy); } catch (_) {} }
                            return def;
                        }
                    }
                    if (legacy !== null) { try { return JSON.parse(legacy); } catch (_) { this.error = { key: k, kind: 'damaged' }; this.warnReadError(); } }
                } catch (_) { this.error = { key: k, kind: 'unavailable' }; this.warnReadError(); }
                return def;
            },
            set(k, v) {
                if (typeof Vault !== 'undefined' && Vault && Vault.protects(k)) return Vault.set(k, v);
                try {
                    // A damaged current value is kept intact for recovery instead of being overwritten.
                    const raw = localStorage.getItem(this.PREFIX+k);
                    if (raw !== null) { try { JSON.parse(raw); } catch (_) { throw new Error('damaged'); } }
                    const serialized = JSON.stringify(v);
                    if (typeof serialized !== 'string') throw new Error('invalid');
                    localStorage.setItem(this.PREFIX+k, serialized);
                    this.error = null;
                    return true;
                } catch (_) {
                    this.error = { key: k, kind: 'write-failed' };
                    showToast('저장하지 못했습니다. 입력을 복사하거나 다시 시도해 주세요.', 'error');
                    return false;
                }
            },
            ownKeys() {
                const out = new Set();
                try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!k) continue; if (k.startsWith(this.PREFIX)) out.add(k.slice(this.PREFIX.length)); else if (k.startsWith(this.LEGACY)) out.add(k.slice(this.LEGACY.length)); } } catch(e) { this.error = { kind: 'unavailable' }; this.warnReadError(); }
                if (typeof Vault !== 'undefined' && Vault) Vault.presentKeys().forEach(k => out.add(k));
                return [...out];
            },
            // github.io 도메인은 같은 계정의 다른 앱과 localStorage를 공유하므로 이 앱의 키만 삭제
            clearAll() {
                try { const ks = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && (k.startsWith(this.PREFIX) || k.startsWith(this.LEGACY))) ks.push(k); } ks.forEach(k => localStorage.removeItem(k)); return true; }
                catch (_) { showToast('일부 자료를 지우지 못했습니다. 새로고침 후 확인해 주세요.', 'error'); return false; }
            }
        };

        const FOOTER_HTML = `<div class="w-full text-center mt-12 mb-4"><span class="inline-flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/80 px-4 py-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700"><span class="whitespace-nowrap">© 2026 엽쌤. All rights reserved.</span><span>·</span><a href="https://gmlduqzhd123-lab.github.io/YScode/" class="whitespace-nowrap" style="color:inherit;text-decoration:underline;text-underline-offset:3px">엽쌤의 다른 앱 보기 →</a><span class="qr-btn whitespace-nowrap">· <button type="button" data-qr class="whitespace-nowrap">📱 QR로 접속</button></span></span></div>`;

        const STRICT_CATEGORY_MAP = {
            "인사·발령": ["전보", "파견", "복직", "퇴직", "면직", "해임", "파면", "인사내신", "승진", "전출", "전입", "호봉", "경력", "근평", "근무성적", "다면평가", "상훈", "모범공무원"],
            "승진·전직": ["교장", "교감", "장학", "교육연구관", "수석교사", "교육전문직"],
            "복무·휴가": ["휴직", "휴가", "연가", "병가", "공가", "조퇴", "지각", "결근", "외출", "출장", "근무", "유연근무", "겸직"],
            "학교회계·예산": ["품의", "결의", "결산", "예산", "회계", "세입", "세출", "계약", "검수", "수당", "에듀파인", "물품구입", "조달청"],
            "급여·수당·연금": ["급여", "본봉", "연금", "퇴직금", "기여금", "보험료", "복지포인트"],
            "학교조직·행정": ["나이스", "NEIS", "교무", "기안", "결재", "행정", "공문", "위원회"],
            "교육과정": ["교육과정", "시수", "수업일수", "창체", "동아리", "자율활동"],
            "수업": ["수업", "학습", "지도안", "플립러닝", "프로젝트", "하브루타", "블렌디드"],
            "평가": ["평가", "성취도", "성적"],
            "학적·출결": ["학적", "출결", "출석", "결석", "입학", "졸업", "진급", "유예", "면제", "전학", "자퇴", "퇴학", "취학", "수료", "생활기록부", "생기부", "세특", "행특"],
            "학생생활": ["생활지도", "규정", "자치회", "인성교육", "안전지도", "교통안전"],
            "학교폭력": ["학교폭력", "학폭", "사안조사", "심의위원회", "접촉금지", "가해학생", "피해학생"],
            "교육활동보호": ["교권", "침해", "보호위원회"],
            "학부모": ["학부모", "상담주간", "총회"],
            "상담": ["상담", "위클래스", "위센터", "심리검사"],
            "기초학력": ["기초학력", "부진", "두드림", "진단평가"],
            "특수교육": ["특수교육", "통합교육", "개별화", "특수학급", "장애"],
            "연구·연수": ["연수", "연구", "학습공동체", "전학공"],
            "연구대회": ["대회", "자료전", "실천사례"],
            "체육": ["체육", "팝스", "PAPS", "운동부", "소년체전", "수영", "스포츠클럽"],
            "보건·안전": ["보건", "응급처치", "심폐소생술", "재해", "공제회", "소방", "지진", "미세먼지", "감염병"],
            "급식": ["급식", "식단", "조리", "위생", "식중독"],
            "늘봄·방과후": ["늘봄", "돌봄", "방과후"],
            "현장체험학습": ["체험학습", "수학여행", "수련활동"],
            "시설·물품": ["시설", "물품", "기자재", "비품", "당직", "보수"],
            "AI·에듀테크": ["에듀테크", "디지털", "스마트", "AI", "패블릿", "코딩", "메타버스", "소프트웨어"],
            "교직생활": ["신규", "멘토링", "교무실", "스승의날"]
        };
        // 띄어쓰기 차이("다면 평가" vs "다면평가")로 분류가 틀어지지 않도록 공백 제거 후 비교
        function assignCategory(kw) {
            const n = String(kw).replace(/\s/g, '');
            for (const [c, ks] of Object.entries(STRICT_CATEGORY_MAP)) { if (ks.some(k => n.includes(k.replace(/\s/g, '')))) return c; }
            return "학교조직·행정";
        }
        const CATEGORIES = Object.keys(STRICT_CATEGORY_MAP);

        const QUOTES = ["선생님의 오늘 하루도 아이들에게는 우주입니다.", "완벽하지 않아도 괜찮아요, 매일 성장하고 있으니까요.", "퇴근 후에는 온전히 나를 위한 시간을 보내세요.", "힘들 땐 동학년 선생님과 커피 한 잔 어때요?", "아이들의 긍정적인 변화는 느리지만 반드시 일어납니다.", "선생님의 따뜻한 눈빛 하나가 아이의 하루를 구합니다.", "오늘도 무사히 하루를 마친 선생님, 정말 고생 많으셨습니다."];
        const DOC_TEMPLATES = [
            { id: 't1', title: '학폭 발생 초기 학부모 안내', content: '학부모님 안녕하십니까. [학교명] [학년반] 담임교사 [담임]입니다. 오늘 교내에서 [학생이름] 학생 관련 다툼 사안이 접수되었습니다. 학교에서는 관련 법령과 절차에 따라 공정하게 사실관계를 확인 중이며, 학생의 심리적 안정과 보호를 최우선으로 조치하고 있습니다. 추가로 확인이 필요하신 사항은 [연락가능시간]에 교무실로 연락 주시기 바랍니다.' },
            { id: 't2', title: '현장체험학습 품의서', content: '1. 관련: [학교명] [학년/반] 현장체험학습 운영 계획\n2. 위와 관련하여 현장체험학습 예산을 다음과 같이 집행하고자 합니다.\n 가. 일시: [일시]\n 나. 장소: [장소]\n 다. 대상: [학년/반] 학생 [인원]명 및 인솔교사\n 라. 소요예산: 금 [예산액]원\n 마. 예산과목: [예산과목]\n끝.' },
            { id: 't3', title: '보건실 응급처치 안내', content: '[학생이름] 학부모님 안녕하십니까. [학교명] [학년반] 담임교사 [담임]입니다. 오늘 [발생시간]경 [장소]에서 [학생이름] 학생이 [부상내용]으로 보건실에서 소독 및 응급처치를 받았습니다. 현재 상태는 안정적이나 귀가 후에도 통증이 지속될 경우 병원 진료를 권장드리며, 학교안전공제회 보상 절차가 필요하신 경우 언제든 말씀해 주세요.' },
            { id: 't4', title: '운동부 출전 품의서', content: '1. 대회명: [대회명]\n2. 일시/장소: [일시] / [장소]\n3. 출전인원: [참가인원]명\n4. 소요예산: 금 [예산액]원 (출전비, 식비, 간식비 등)\n5. 예산과목: [예산과목]\n끝.' },
            { id: 't5', title: 'PAPS 측정 결과 안내장', content: '학부모님 안녕하십니까. 학생들의 건강 체력 향상을 위한 학생건강체력평가(PAPS) 측정 결과를 안내해 드립니다.\n\n- 대상 학생: [학년반] [학생이름]\n- 심폐지구력: [심폐지구력기록]\n- 유연성: [유연성기록]\n- 근력·근지구력: [근력기록]\n\n가정에서도 규칙적인 운동과 건강한 생활 습관을 기를 수 있도록 격려 부탁드립니다.' },
            { id: 't6', title: '학부모 상담주간 안내 및 신청서', content: '학부모님 안녕하십니까. [학교명] [학년반] 담임교사 [담임]입니다.\n새 학기 아이들의 학교 적응과 성장을 함께 나누기 위해 아래와 같이 학부모 상담주간을 운영합니다.\n\n1. 상담 기간: [상담기간]\n2. 상담 가능 시간: [상담시간] (1인당 약 15~20분)\n3. 상담 방법: 대면 상담 또는 전화 상담 중 선택\n4. 신청 방법: [신청방법]으로 희망 일시 1·2순위를 회신해 주세요.\n\n항상 따뜻한 관심과 협조에 감사드립니다.' },
            { id: 't7', title: '교외체험학습 신청·보고서 안내', content: '학부모님 안녕하십니까. 가족 동반 교외체험학습 출석인정 절차를 안내해 드립니다.\n\n1. 신청서 제출: 체험학습 시작 [신청기한]일 전까지 담임교사에게 제출 후 학교장 사전 승인 확인\n2. 결과보고서 제출: 체험학습 종료 후 [보고기한]일 이내에 보고서 및 증빙자료 제출\n3. 연간 인정 일수: 본교 학칙 기준 연간 [인정일수]일 이내\n\n※ 사전 승인 없이 실시하거나 기한 내 보고서를 제출하지 않을 경우 미인정 결석으로 처리되오니 유의해 주시기 바랍니다.' },
            { id: 't8', title: '감염병(독감·수두 등) 등교중지 및 출석인정 안내', content: '[학생이름] 학부모님 안녕하십니까. [학년반] 담임교사 [담임]입니다.\n학교 내 감염병 확산 예방을 위해 법정 감염병([감염병명]) 진단 시 전염 기간 동안 등교중지(출석인정 결석)가 적용됩니다.\n\n- 등교중지 기간: 의사 소견서상 격리 권고 기간\n- 등교 시 제출 서류: 진료확인서, 의사소견서, 진단서 중 1부 ([감염병명] 및 격리기간 명시)\n\n학생이 충분히 쉬고 건강하게 쾌유하기를 바랍니다.' },
            { id: 't9', title: '미등교·결석 학생 보호자 확인 및 결석계 안내', content: '[학생이름] 학부모님 안녕하십니까. [학교명] [학년반] 담임교사 [담임]입니다.\n오늘([오늘]) [학생이름] 학생이 등교 시각까지 등교하지 않아 안전 확인차 연락드립니다. 현재 학생의 소재와 건강 상태를 회신해 주시기 바랍니다.\n\n아울러 질병 등으로 인한 결석 시 등교 후 5일 이내에 결석계와 증빙서류(진료확인서·처방전 등)를 보내주시면 출석처리 절차를 도와드리겠습니다.' },
            { id: 't10', title: '식품 알레르기 및 건강 상태 사전 조사 안내', content: '학부모님 안녕하십니까. 안전한 학교 급식 및 요리·체험 활동을 위해 학생별 식품 알레르기 및 특이 건강 상태를 조사합니다.\n\n- 조사 항목: 알레르기 유발 식품 번호, 증상 정도, 에피펜 소지 여부, 체육 활동 시 유의사항\n- 회신 기한: [회신기한]까지\n\n변동 사항이 생기면 언제든 담임교사([담임])에게 알려주시기 바랍니다.' },
            { id: 't11', title: '민원 면담 사전 예약 및 소통 창구 안내', content: '학부모님 안녕하십니까. [학교명] [학년반] 담임교사 [담임]입니다.\n학생들의 수업권 보호와 깊이 있는 상담을 위해 교사 면담 및 유선 상담은 사전 예약제로 운영되고 있습니다.\n\n- 연락 가능 시간: 평일 [연락가능시간] (수업 시간 중에는 통화가 어렵습니다)\n- 방문 면담 신청: 방문 전 하이톡/학교 대표번호로 일시 사전 협의\n\n학생 지도에 최선을 다하겠습니다. 감사합니다.' },
            { id: 't12', title: '학급 교육활동 물품 구입 품의서', content: '1. 관련: [학교명] 교육과정 운영 계획\n2. [학년/반] 원활한 수업 및 학급 운영을 위하여 다음과 같이 교육활동 물품을 구입하고자 합니다.\n 가. 품목 및 수량: [품목명] 외 [수량]종 (붙임 내역서 참조)\n 나. 소요예산: 금 [예산액]원\n 다. 예산과목: [예산과목]\n 라. 구입방법: 학교장터(S2B) 또는 신용카드 구입\n붙임  물품 구입 내역서 1부.  끝.' },
            { id: 't13', title: '개인정보 수집·이용 및 제3자 제공 동의 안내', content: '학부모님 안녕하십니까. [학교명]에서는 [사업또는행사명] 운영을 위하여 「개인정보 보호법」에 따라 아래와 같이 개인정보 수집·이용 및 제3자 제공 동의를 받고자 합니다.\n\n1. 수집·제공받는 자: [제공기관명]\n2. 목적: [수집목적]\n3. 항목: 학년, 반, 성명, [추가항목]\n4. 보유 및 이용 기간: [보유기간]\n\n동의서를 확인하신 후 [제출기한]까지 회신해 주시기 바랍니다.' },
            { id: 't14', title: '통합학급 교육활동 안내 및 협력 지도 협조문', content: '학부모님 안녕하십니까. [학교명] [학년반] 담임교사 [담임]입니다.\n우리 반은 서로의 다름을 이해하고 함께 성장하는 통합교육 학급으로 운영됩니다. 특수교사 선생님과 긴밀히 협력하여 모든 학생이 배려와 존중을 배우고 안전하게 수업에 참여할 수 있도록 세심히 지도하겠습니다. 가정에서도 따뜻한 격려와 응원을 부탁드립니다.' },
            { id: 't15', title: '복무(출장·연가·병가)에 따른 보결 및 합반 협조 요청', content: '[동학년선생님] 선생님, 안녕하십니까. [학년반] [담임]입니다.\n[일시] [복무사유]로 인하여 부득이하게 자리를 비우게 되어 보결(자습 감독) 협조를 부탁드립니다.\n\n- 대상 교시: [대상교시]\n- 학생 활동 안내: [자습과제내용]\n- 특이사항: [주의할학생및전달사항]\n\n교탁 위에 학습지와 안내 자료를 준비해 두었습니다. 늘 배려해 주셔서 진심으로 감사합니다.' },
            { id: 't16', title: '복직 교원 부임 및 학급 운영 안내장', content: '학부모님 안녕하십니까. [오늘]자로 복직하여 [학교명] [학년반] 학생들과 함께하게 된 교사 [담임]입니다.\n아이들이 학기 중 변화에도 안정감을 느끼고 즐겁게 학교생활을 이어갈 수 있도록 기존 학급 규칙과 일과를 존중하며 정성껏 지도하겠습니다. 궁금하신 점이나 전달하실 사항은 편히 연락 주시기 바랍니다.' },
            { id: 't17', title: '학기말 학교생활기록부 마감 전 출결·기록 확인 안내', content: '학부모님 안녕하십니까. [학년반] 담임교사 [담임]입니다.\n학기말 학교생활기록부 마감을 앞두고 출결 증빙서류(결석계, 교외체험학습 보고서 등) 미제출 건이 있는지 최종 확인하고 있습니다.\n\n- 마감 기한: [마감기한]까지\n- 확인 사항: 미제출 결석계·진료확인서, 체험학습 보고서, 개명·주민번호 정정 사항 등\n\n기한 이후에는 정정이 어려우니 기한 내 제출을 부탁드립니다.' },
            { id: 't18', title: '학부모 공개수업 참관 안내장', content: '학부모님 안녕하십니까. 자녀의 학교생활과 수업 모습을 살펴보실 수 있도록 학부모 공개수업을 다음과 같이 실시합니다.\n\n1. 일시: [공개수업일시]\n2. 장소: [학년반] 교실\n3. 과목 및 주제: [과목명] — [수업주제]\n4. 유의사항: 수업 중 사진·동영상 촬영 및 녹음은 학생 초상권과 교육활동 보호를 위해 금지되어 있습니다.\n\n바쁘시더라도 참석하시어 아이들에게 큰 격려를 보내주시기 바랍니다.' },
            { id: 't19', title: '기초학력 맞춤형 지도(두드림·보충지도) 참여 동의 안내', content: '[학생이름] 학부모님 안녕하십니까. [학교명] [학년반] 담임교사 [담임]입니다.\n학생의 기초 학습 자신감을 높이고 맞춤형 성장을 돕기 위해 아래와 같이 보충 학습 지원 프로그램을 운영하고자 합니다.\n\n1. 운영 기간 및 요일: [운영기간] ([운영요일및시간])\n2. 지도 영역: [지도영역]\n3. 참가비: 무료 (학교 예산 전액 지원)\n\n동봉된 참여 동의서를 작성하시어 [제출기한]까지 보내주시기 바랍니다.' },
            { id: 't20', title: '수업 집중 및 생활지도 가정 연계 협조 안내', content: '[학생이름] 학부모님 안녕하십니까. [학년반] 담임교사 [담임]입니다.\n평소 밝게 생활하는 [학생이름] 학생이 최근 수업 중 [관찰행동] 모습을 보여, 학교에서도 바른 학습 습관을 기를 수 있도록 격려하며 지도하고 있습니다.\n가정에서도 학생이 규칙을 지키고 친구들과 배려하며 지낼 수 있도록 따뜻한 대화와 관심 부탁드립니다. 통화 가능하신 시간을 알려주시면 자세히 말씀 나누겠습니다.' }
        ];
        // 15개 상황 가이드 전체에 대한 맞춤형 문서 양식(doc) 및 업무 플로우(course) 매핑
        const SITUATION_ACTION_MAP = {
            1: { doc: 't3', course: 1, docLabel: '보건실 응급처치 알림장' },
            2: { doc: 't11', course: 9, docLabel: '민원 면담 사전예약 안내문' },
            3: { doc: 't1', course: 5, docLabel: '학폭 초기 학부모 안내문' },
            4: { doc: 't12', course: 6, docLabel: '물품 구입 품의서 양식' },
            5: { doc: 't15', course: null, docLabel: '보결 수업 협조 요청문' },
            6: { doc: 't9', course: null, docLabel: '미등교 확인 및 결석계 안내' },
            7: { doc: 't20', course: 9, docLabel: '생활지도 가정 연계 안내' },
            8: { doc: 't11', course: 9, docLabel: '교육활동 보호 안내문' },
            9: { doc: 't2', course: 1, docLabel: '현장체험학습 품의서' },
            10: { doc: 't8', course: null, docLabel: '감염병 등교중지 안내문' },
            11: { doc: 't10', course: null, docLabel: '알레르기 사전 조사 안내' },
            12: { doc: 't16', course: 4, docLabel: '복직 인사 및 학급 안내장' },
            13: { doc: 't14', course: 8, docLabel: '통합학급 협력 안내문' },
            14: { doc: 't13', course: null, docLabel: '개인정보 제공 동의 안내' },
            15: { doc: 't17', course: 7, docLabel: '생기부 마감 전 확인 안내' }
        };
        const EDUCATION_OFFICES = [
            { code: 'seoul', name: '서울특별시교육청', url: 'https://www.sen.go.kr' },
            { code: 'gyeonggi', name: '경기도교육청', url: 'https://www.goe.go.kr' },
            { code: 'incheon', name: '인천광역시교육청', url: 'https://www.ice.go.kr' },
            { code: 'busan', name: '부산광역시교육청', url: 'https://www.pen.go.kr' },
            { code: 'daegu', name: '대구광역시교육청', url: 'https://www.dge.go.kr' },
            { code: 'gwangju', name: '광주광역시교육청', url: 'https://www.gen.go.kr' },
            { code: 'daejeon', name: '대전광역시교육청', url: 'https://www.dje.go.kr' },
            { code: 'ulsan', name: '울산광역시교육청', url: 'https://www.use.go.kr' },
            { code: 'sejong', name: '세종특별자치시교육청', url: 'https://www.sje.go.kr' },
            { code: 'gangwon', name: '강원특별자치도교육청', url: 'https://www.gwe.go.kr' },
            { code: 'chungbuk', name: '충청북도교육청', url: 'https://www.cbe.go.kr' },
            { code: 'chungnam', name: '충청남도교육청', url: 'https://www.cne.go.kr' },
            { code: 'jeonbuk', name: '전북특별자치도교육청', url: 'https://www.jbe.go.kr' },
            { code: 'jeonnam', name: '전라남도교육청', url: 'https://www.jne.go.kr' },
            { code: 'gyeongbuk', name: '경상북도교육청', url: 'https://www.gbe.kr' },
            { code: 'gyeongnam', name: '경상남도교육청', url: 'https://www.gne.go.kr' },
            { code: 'jeju', name: '제주특별자치도교육청', url: 'https://www.jje.go.kr' }
        ];
        const EDUTECH_TOOLS = [
            { name: "Canva (캔바)", desc: "수업 PPT · 학급 게시물 디자인 끝판왕", url: "https://www.canva.com", prompt: "초등 3학년 체육 수업 안전규칙 포스터 양식 찾아줘" },
            { name: "Suno", desc: "학급송 · 계기교육 창작곡 AI", url: "https://suno.com", prompt: "초등학생이 부르기 쉬운 밝은 학급 규칙 동요 만들어줘" },
            { name: "Cursor AI", desc: "교실 미니 웹앱 코딩 AI 에디터", url: "https://cursor.sh", prompt: "바닐라 JS로 전자칠판에서 쓸 1분 구구단 퀴즈 웹앱 짜줘" },
            { name: "ChatGPT", desc: "가정통신문 초안 · 수업 아이디어 자동화", url: "https://chatgpt.com", prompt: "초등 운동회 학년군별 협동 릴레이 게임 아이디어 5가지 추천해줘" },
            { name: "Padlet (패들릿)", desc: "모둠 활동 결과물 실시간 공유 보드", url: "https://padlet.com", prompt: "독서 토론 후 모둠별 한 줄 감상평과 질문을 포스트잇으로 붙여보세요" },
            { name: "Kahoot! / 띵커벨", desc: "실시간 참여형 형성평가 퀴즈", url: "https://www.tkbell.co.kr", prompt: "오늘 배운 사회 단원 핵심 개념 OX 및 4지선다 퀴즈 10문항 출제" }
        ];

        // ----------------------------------------------------
        // 2. 데이터 (terms.json에서 불러오고, 실패하면 아래 내장 데이터 사용)
        //    ※ 용어·상황 가이드·내비게이터·연간 업무를 고치려면 terms.json만 수정하면 됩니다.
        // ----------------------------------------------------
        // 아래 내장 데이터는 terms.json과 같은 내용입니다 (terms.json을 못 불러올 때 사용)

        let DB = [];
        let LEGACY_TERM_MAP = {};
        let PUBLIC_LINKS = { situations: [], courses: [] };
        let CONTENT_META = null;
        const SEARCH_LINKS = [
            { words: ['현장체험학습 준비'], terms: [120], situations: [9], courses: [1] },
            { words: ['학생이 다쳤어요', '다침'], terms: [10, 1002], situations: [1], courses: [] },
            { words: ['학폭'], terms: [4], situations: [3], courses: [5] },
            { words: ['물건 살 때'], terms: [3], situations: [4], courses: [6] },
            { words: ['출석인정결석'], terms: [80], situations: [], courses: [] },
            { words: ['애가 다쳤어요', '피가 나요', '응급처치', '병원 치료비', '공제회 청구', '보건실'], terms: [10, 50, 1002], situations: [1], courses: [] },
            { words: ['아파서 못가요', '출근 못해요', '몸살', '병가 내기', '진단서 기준', '조퇴할래요', '병원 다녀올게요'], terms: [1001, 82, 5], situations: [5], courses: [] },
            { words: ['내일 쉬고 싶어요', '연차 쓰기', '휴가 신청', '나이스 복무', '반차', '지참'], terms: [5, 35, 82, 1001], situations: [5], courses: [] },
            { words: ['부모님 전화', '엄마가 화났어요', '학부모 항의', '악성 민원', '폭언', '교권 침해', '밤에 전화'], terms: [2003], situations: [2, 8], courses: [9] },
            { words: ['아이들이 싸웠어요', '다툼', '괴롭힘', '단톡방 욕설', '사이버폭력', '학폭 신고'], terms: [4], situations: [3], courses: [5] },
            { words: ['애가 안 왔어요', '연락두절', '무단결석', '미등교', '결석계 서류', '아파서 결석'], terms: [80, 5], situations: [6], courses: [] },
            { words: ['가족여행', '교외체험학습 신청', '체험학습 보고서', '국내외 체험학습'], terms: [120, 80], situations: [9], courses: [1] },
            { words: ['독감 걸렸어요', '코로나', '수두', '전염병', '법정감염병', '등교중지'], terms: [80, 50], situations: [10], courses: [] },
            { words: ['전학 왔어요', '전학 가요', '전입생', '전출생', '반 배정'], terms: [85, 5, 80], situations: [11], courses: [] },
            { words: ['생기부 뭐 써요', '행특 예시', '세특 작성', '바이트 계산', '생기부 금지어'], terms: [5, 68, 73], situations: [], courses: [3] },
            { words: ['돈 어떻게 써요', '예산 집행', '법인카드 결제', '견적서', '물건 도착', '검수하기'], terms: [3, 6, 53, 55, 56], situations: [4], courses: [6] },
            { words: ['공문 어떻게 써요', '기안 올리기', '결재 취소', '문서 반려', '공람 처리'], terms: [6, 60, 61, 62, 63, 64, 65], situations: [15], courses: [] },
            { words: ['수업 방해해요', '돌아다니는 아이', '말 안 듣는 학생', '훈육 방법', '분리 조치'], terms: [51, 260], situations: [7], courses: [] },
            { words: ['상담주간 준비', '학부모 상담 신청', '학부모 총회'], terms: [40, 51], situations: [], courses: [7] },
            { words: ['월급 명세서', '수당 신청', '출산 수당', '결혼 수당', '복지포인트', '호봉 언제 올라요'], terms: [30, 31, 32, 33, 34, 35], situations: [], courses: [] },
            { words: ['이사 가요', '다른 학교 가고 싶어요', '전보 내신', '만기 언제예요', '타시도 교류'], terms: [1, 11, 12, 13, 14, 20], situations: [], courses: [4] },
            { words: ['육아휴직 복직', '복직 신청', '휴직 끝나가요'], terms: [16], situations: [12], courses: [] },
            { words: ['급식 알레르기', '우유 급식', '배탈 났어요'], terms: [44, 49], situations: [], courses: [] },
            { words: ['통합학급', '특수학급 아이', '개별화교육', 'IEP'], terms: [52], situations: [13], courses: [] },
            { words: ['기초학력 부진', '한글 못 읽어요', '진단검사', '두드림'], terms: [73, 74], situations: [], courses: [8] },
            { words: ['공개수업 준비', '수업 지도안', '동료장학'], terms: [7, 74], situations: [], courses: [] },
            { words: ['교실 고장났어요', '에어컨 고장', '문 고장', '수리 요청'], terms: [42, 43, 57], situations: [], courses: [] },
            { words: ['개인정보 파일', '명단 암호', '정보공개 청구'], terms: [58, 59], situations: [14], courses: [] }
        ];
        const QUICK_CONVERSATIONAL_CHIPS = [
            { label: '🩹 학생이 다쳤어요', query: '학생이 다쳤어요' },
            { label: '🛒 물건 살 때(품의)', query: '물건 살 때' },
            { label: '🤒 아파서 못가요(병가)', query: '아파서 못가요' },
            { label: '📞 학부모 강한 항의', query: '학부모 항의' },
            { label: '🚨 아이들이 싸웠어요(학폭)', query: '학폭' },
            { label: '🏫 애가 안 왔어요(미등교)', query: '애가 안 왔어요' },
            { label: '🚌 현장체험학습 준비', query: '현장체험학습 준비' },
            { label: '✍️ 생기부 뭐 써요', query: '생기부 뭐 써요' },
            { label: '📄 공문 어떻게 써요', query: '공문 어떻게 써요' }
        ];
        const ROLE_PRESETS = {
            'role:newbie': {
                label: '🌱 신규·저경력 필수',
                ids: [1, 3, 4, 5, 6, 10, 20, 31, 32, 33, 50, 56, 59, 60, 61, 62, 63, 65, 68, 74, 80, 120, 226, 260, 1002],
                categories: ['교직생활', '복무·휴가']
            },
            'role:homeroom': {
                label: '🏫 학급담임 핵심',
                ids: [4, 5, 10, 50, 51, 52, 68, 73, 74, 80, 120, 260],
                categories: ['학적·출결', '학생생활', '학교폭력', '학부모', '상담', '수업', '평가', '현장체험학습', '기초학력']
            },
            'role:admin': {
                label: '📂 부장·업무담당',
                ids: [1, 3, 6, 9, 11, 20, 21, 22, 23, 28, 29, 39, 53, 54, 55, 56, 58, 59, 60, 61, 65, 66, 67],
                categories: ['학교조직·행정', '학교회계·예산', '교육과정', '인사·발령', '승진·전직', '시설·물품', '연구·연수', '연구대회']
            },
            'role:specialist': {
                label: '🩺 비교과·특수·전담',
                ids: [10, 44, 45, 46, 47, 48, 49, 50, 51, 52],
                categories: ['보건·안전', '급식', '상담', '특수교육', '체육', '늘봄·방과후', 'AI·에듀테크']
            }
        };
        function normalizeSearch(value) { return String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('ko'); }
        function compactSearch(value) { return normalizeSearch(value).replace(/\s/g, ''); }
        function canonicalTermId(id) { const mapped = LEGACY_TERM_MAP[String(id)]; return mapped ? Number(mapped.split(':')[1]) : Number(id); }
        function canonicalTerm(item) { return DB.find(term => term.id === canonicalTermId(item.id)) || item; }
        function searchLinks(query) {
            const q = compactSearch(query);
            if (!q) return undefined;
            const exact = SEARCH_LINKS.find(link => link.words.some(word => compactSearch(word) === q));
            if (exact) return exact;
            if (q.length < 2) return undefined;
            const partial = SEARCH_LINKS.filter(link => link.words.some(word => {
                const w = compactSearch(word);
                return w.length >= 2 && (q.includes(w) || (q.length >= 3 && w.includes(q)));
            }));
            if (!partial.length) return undefined;
            return {
                words: [...new Set(partial.flatMap(p => p.words))],
                terms: [...new Set(partial.flatMap(p => p.terms))],
                situations: [...new Set(partial.flatMap(p => p.situations))],
                courses: [...new Set(partial.flatMap(p => p.courses))]
            };
        }
        function matchesCategoryOrRole(item, category) {
            if (!category || category === '전체') return true;
            const preset = ROLE_PRESETS[category];
            if (preset) {
                const cid = canonicalTermId(item.id);
                return (preset.ids && preset.ids.some(id => canonicalTermId(id) === cid)) || (preset.categories && preset.categories.includes(item.category));
            }
            return item.category === category;
        }
        let FILTER_CATEGORIES = [];
        let SITUATIONS = [];
        let NAVIGATOR_COURSES = [];
        let YEAR_TASKS = {};
        const DATA_META = { source: '내장 데이터', updatedAt: DEFAULT_DATA.updatedAt, curated: 0 };

        // 자동 생성 항목(주제어 × 접두어)은 id 11~1000을 고정으로 사용 → 기존 즐겨찾기 번호 유지
        const GEN_START_ID = 11, GEN_COUNT = 990;
        const GEN_PREFIXES = ["", "초등 ", "학교 ", "실무 ", "교육 ", "기본 ", "현장 ", "행정 ", "운영 ", "지원 "];

        // ---------- 10대 교직어 상세 보강 데이터 (실무 팁 100% · 시스템 경로 · 3단계 절차 · VS 비교 · 핵심 수치 · Q&A · 법령 · 도구 직결 · 협의 파트너 · 학교별 메모) ----------

        // 휴대폰 폭(640px 미만)에서는 잘리지 않게 짧은 안내 문구를 씀
        function narrowScreen() { return !!window.matchMedia?.('(max-width: 639.98px)').matches; }

        function applyTermEnrichment(item) {
            if (!item) return item;
            const cid = item._baseId || canonicalTermId(item.id);
            const enrich = TERM_ENRICH_MAP[cid] || {};
            const playbook = CATEGORY_PLAYBOOKS[item.category] || CATEGORY_PLAYBOOKS["학교조직·행정"];
            const vsGroup = TERM_VS_GROUPS.find(g => g.ids.includes(cid)) || null;
            if (!item._shortDesc) item._shortDesc = item.description;
            if (enrich.descAdd) {
                // descMode 'replace': 보강 설명이 기본 설명을 다시 풀어 쓴 경우 → 상세 설명은 보강본만 (목록 카드는 _shortDesc)
                item.description = enrich.descMode === 'replace' ? enrich.descAdd : `${item._shortDesc} ${enrich.descAdd}`;
            }
            if (item._origTip === undefined) item._origTip = item.tip || '';
            if (enrich.tip) {
                if (item._origTip && !enrich.tip.includes(item._origTip.slice(0, 12))) item.tip = `${item._origTip} ${enrich.tip}`;
                else item.tip = enrich.tip;
            } else if (!item.tip && playbook.tip) {
                item.tip = playbook.tip;
            }
            item.metrics = enrich.metrics || playbook.metrics || [];
            item.systemPath = enrich.systemPath || playbook.systemPath || '';
            item.steps = enrich.steps || playbook.steps || [];
            item.docs = enrich.docs || playbook.docs || [];
            item.vsGroup = vsGroup;
            item.faq = enrich.faq || playbook.faq || [];
            item.legalBasis = enrich.legalBasis || playbook.legalBasis || { law: '초·중등교육법', guide: '시도교육청 지침', query: '초중등교육법' };
            item.toolLinks = enrich.toolLinks || playbook.toolLinks || [];
            item.partner = enrich.partner || playbook.partner || { school: '교무기획부 · 행정실', external: '관할 교육지원청' };
            return item;
        }

        function getTermNote(id) {
            const cid = canonicalTermId(id);
            const val = getSettings()[`termNote_${cid}`];
            return typeof val === 'string' ? val : '';
        }
        function saveTermNote(id, rawValue) {
            const cid = canonicalTermId(id);
            const s = getSettings();
            const val = String(rawValue ?? '').trim().slice(0, 1000);
            if (val) s[`termNote_${cid}`] = val;
            else delete s[`termNote_${cid}`];
            const ok = Storage.set('settings', s);
            if (ok) {
                showToast(val ? '우리 학교 기준 메모를 저장했습니다.' : '메모를 지웠습니다.', val ? 'success' : 'info');
                if (isModalOpen() && currentDetailId === cid) openDetail(cid, false);
                if (router.current === 'search') handleSearch();
                else if (router.current === 'mybox') router.render();
            }
            return ok;
        }
        function getAllTermNotes() {
            const s = getSettings();
            const out = [];
            for (const [k, v] of Object.entries(s)) {
                if (k.startsWith('termNote_') && typeof v === 'string' && v.trim()) {
                    const id = canonicalTermId(Number(k.slice(9)));
                    const item = DB.find(d => d.id === id);
                    if (item) out.push({ id: item.id, item, note: v.trim() });
                }
            }
            return out;
        }

        // ---------- 직관적 온보딩 & 빠른 접근 도우미 (핀 고정 · SOS 모달 · 미니 계산기 · 이달의 브리핑 · TTS/음성검색 · 요약 인쇄) ----------
        const DEFAULT_PINNED_TERMS = [3, 4, 10, 80, 120];
        function getPinnedTermIds() {
            const raw = getSettings().pinnedTerms;
            if (typeof raw !== 'string') return [...DEFAULT_PINNED_TERMS];
            if (raw === 'none') return [];
            const ids = raw.split(',').map(x => canonicalTermId(Number(x.trim()))).filter(n => Number.isFinite(n) && n > 0);
            return [...new Set(ids)];
        }
        function isTermPinned(id) {
            return getPinnedTermIds().includes(canonicalTermId(id));
        }
        function togglePinTerm(id) {
            const cid = canonicalTermId(id);
            const current = getPinnedTermIds();
            let next;
            let added = false;
            if (current.includes(cid)) {
                next = current.filter(x => x !== cid);
            } else {
                if (current.length >= 10) {
                    showToast('홈 고정핀은 최대 10개까지 등록할 수 있어요.', 'info');
                    return false;
                }
                next = [...current, cid];
                added = true;
            }
            const serialized = next.length ? next.join(',') : 'none';
            const ok = saveSetting('pinnedTerms', serialized);
            if (ok) {
                const item = DB.find(d => d.id === cid);
                showToast(added ? `📌 '${item?.keyword || '용어'}' 항목을 홈 화면 고정핀에 추가했습니다.` : '고정핀에서 해제했습니다.', added ? 'success' : 'info');
                if (isModalOpen() && currentDetailId === cid) openDetail(cid, false);
                if (router.current === 'home') renderHome(document.getElementById('app-view'));
            }
            return ok;
        }

        function copyTermSummary(id) {
            const item = DB.find(d => d.id === canonicalTermId(id));
            if (!item) return;
            applyTermEnrichment(item);
            const lines = [
                `📌 [교직백서 핵심요약] ${item.keyword} (${item.category})`,
                `💡 쉽게 말하면: ${item.simple}`
            ];
            if (item.metrics && item.metrics.length) lines.push(`📊 핵심 기준: ${item.metrics.join(' · ')}`);
            if (item.systemPath) lines.push(`🖥️ 시스템 경로: ${item.systemPath}`);
            if (item.steps && item.steps.length) {
                lines.push('✅ 처리 3단계:');
                item.steps.forEach((st, idx) => lines.push(`  ${idx + 1}) ${st}`));
            }
            if (item.docs && item.docs.length) lines.push(`📂 필수 서류: ${item.docs.join(', ')}`);
            if (item.tip) lines.push(`🍯 실무 팁: ${item.tip}`);
            const note = getTermNote(item.id);
            if (note) lines.push(`📝 우리 학교 메모: ${note}`);
            copyText(lines.join('\n'), `'${item.keyword}' 1장 요약 카드를 복사했습니다! 메신저에 바로 붙여넣으세요.`);
        }

        let ttsSpeakingId = null;
        function speakTermDetail(id) {
            const item = DB.find(d => d.id === canonicalTermId(id));
            if (!item) return;
            applyTermEnrichment(item);
            if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
                showToast('현재 브라우저에서는 음성 읽어주기(TTS)를 지원하지 않습니다.', 'info');
                return false;
            }
            try {
                if (window.speechSynthesis.speaking && ttsSpeakingId === item.id) {
                    window.speechSynthesis.cancel();
                    ttsSpeakingId = null;
                    showToast('음성 듣기를 중지했습니다.', 'info');
                    const btn = document.getElementById('tts-detail-btn');
                    if (btn) btn.innerHTML = '<i class="fa-solid fa-volume-high text-sm"></i><span class="text-xs font-bold ml-1 hidden sm:inline">듣기</span>';
                    return true;
                }
                window.speechSynthesis.cancel();
                const text = `${item.keyword}. 쉽게 말하면, ${item.simple}. ${item.description}. ${item.tip ? '실무 팁. ' + item.tip : ''}`;
                const utter = new SpeechSynthesisUtterance(text);
                utter.lang = 'ko-KR';
                utter.rate = 1.02;
                ttsSpeakingId = item.id;
                utter.onend = () => {
                    ttsSpeakingId = null;
                    const btn = document.getElementById('tts-detail-btn');
                    if (btn) btn.innerHTML = '<i class="fa-solid fa-volume-high text-sm"></i><span class="text-xs font-bold ml-1 hidden sm:inline">듣기</span>';
                };
                window.speechSynthesis.speak(utter);
                const btn = document.getElementById('tts-detail-btn');
                if (btn) btn.innerHTML = '<i class="fa-solid fa-stop text-rose-500 text-sm"></i><span class="text-xs font-bold ml-1 hidden sm:inline text-rose-500">중지</span>';
                showToast(`🔊 '${item.keyword}' 설명을 음성으로 읽어 드립니다.`, 'info');
                return true;
            } catch (_) {
                showToast('음성 재생 중 오류가 발생했습니다.', 'error');
                return false;
            }
        }

        function startVoiceSearch(targetInputId = 'main-search-input') {
            const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
            if (!SR) {
                showToast('이 브라우저는 음성 인식을 지원하지 않습니다. 검색창에 일상어로 바로 입력해 보세요!', 'info');
                const el = document.getElementById(targetInputId);
                if (el) el.focus();
                return false;
            }
            try {
                const rec = new SR();
                rec.lang = 'ko-KR';
                rec.interimResults = false;
                rec.maxAlternatives = 1;
                showToast('🎙️ 말씀해 주세요 (예: "학생이 다쳤어요", "물건 살 때")...', 'info');
                rec.onresult = (event) => {
                    const transcript = event.results?.[0]?.[0]?.transcript?.trim() || '';
                    if (!transcript) return;
                    if (router.current !== 'search') {
                        router.navigate('search', transcript);
                    } else {
                        const input = document.getElementById('main-search-input');
                        if (input) {
                            input.value = transcript;
                            searchDisplayLimit = 60;
                            handleSearch();
                        }
                    }
                    showToast(`🎙️ "${transcript}" 검색 결과입니다.`);
                };
                rec.onerror = () => showToast('음성을 인식하지 못했습니다. 다시 시도하거나 텍스트로 입력해 주세요.', 'info');
                rec.start();
                return true;
            } catch (_) {
                showToast('음성 인식을 시작할 수 없습니다.', 'info');
                return false;
            }
        }

        // 교무실 미니 계산기 3종 순수 계산 함수
        function calcAttendance23(totalDays = 190, currentAbsent = 0) {
            const total = Math.max(1, Math.min(365, Number(totalDays) || 190));
            const absent = Math.max(0, Number(currentAbsent) || 0);
            const requiredDays = Math.ceil((total * 2) / 3);
            const maxAbsentDays = Math.max(0, total - requiredDays);
            const remainAllowance = maxAbsentDays - absent;
            return { totalDays: total, requiredDays, maxAbsentDays, currentAbsent: absent, remainAllowance };
        }
        function calcSickLeave6(usedDays = 0, usedHours = 0, usedMins = 0) {
            const d = Math.max(0, Number(usedDays) || 0);
            const h = Math.max(0, Number(usedHours) || 0);
            const m = Math.max(0, Number(usedMins) || 0);
            const totalMins = d * 480 + h * 60 + m;
            const limitMins = 6 * 480; // 6일 = 48시간 = 2,880분
            const remainMins = Math.max(0, limitMins - totalMins);
            const eqDays = Math.floor(totalMins / 480);
            const eqHours = Math.floor((totalMins % 480) / 60);
            const eqMins = totalMins % 60;
            const remDays = Math.floor(remainMins / 480);
            const remHours = Math.floor((remainMins % 480) / 60);
            const remMins = remainMins % 60;
            return {
                totalMins,
                limitMins,
                needsDoctorNote: totalMins > limitMins,
                usedLabel: `${eqDays}일 ${eqHours}시간 ${eqMins}분 (총 ${(totalMins / 60).toFixed(1)}시간)`,
                remainLabel: totalMins > limitMins ? '진단서 면제 한도(6일·48시간) 초과 — 추가 병가 시 진단서 첨부 필수' : `진단서 없이 사용 가능한 잔여 병가: ${remDays}일 ${remHours}시간 ${remMins}분`
            };
        }
        function calcWeekdaysBetween(startYmd, endYmd) {
            const s = parseYMD(startYmd);
            const e = parseYMD(endYmd);
            if (!s || !e || isNaN(s) || isNaN(e) || e < s) return { weekdays: 0, totalDays: 0, weekendDays: 0 };
            let weekdays = 0, totalDays = 0, weekendDays = 0;
            const cur = new Date(s.getTime());
            while (cur <= e && totalDays < 3700) {
                totalDays++;
                const dow = cur.getDay();
                if (dow === 0 || dow === 6) weekendDays++;
                else weekdays++;
                cur.setDate(cur.getDate() + 1);
            }
            return { weekdays, totalDays, weekendDays };
        }
        function parseSmartCalcQuery(rawQuery) {
            const q = String(rawQuery || '').trim();
            if (q.length < 2) return null;
            // 1. 병가 6일(48시간) 누계 계산
            if (/병가|진단서\s*기준|48\s*시간/.test(q) && (/\d/.test(q) || /병가\s*계산|진단서\s*기준/.test(q))) {
                const dm = q.match(/(\d+)\s*일/);
                const hm = q.match(/(\d+)\s*시간/);
                const mm = q.match(/(\d+)\s*분/);
                const hasExplicitTime = !!(dm || hm || mm);
                const d = dm ? Number(dm[1]) : (hasExplicitTime ? 0 : 4);
                const h = hm ? Number(hm[1]) : (hasExplicitTime ? 0 : 5);
                const m = mm ? Number(mm[1]) : (hasExplicitTime ? 0 : 30);
                const r = calcSickLeave6(d, h, m);
                return {
                    tab: 'sick',
                    title: `${hasExplicitTime ? '' : '(예시) '}병가 누계 ${r.usedLabel}`,
                    sub: r.remainLabel,
                    warn: r.needsDoctorNote
                };
            }
            // 2. 수업일수 2/3 출석·결석 계산
            if (/수업\s*일수|출석\s*일수|결석\s*\d+|\d+\s*일?\s*결석|2\/3|유급\s*기준|수료\s*기준/.test(q)) {
                const nums = [...q.matchAll(/\d+/g)].map(m => Number(m[0])).filter(n => n !== 2 && n !== 3);
                const total = nums.find(n => n >= 150 && n <= 240) || 190;
                const absMatch = q.match(/결석\s*(\d+)|(\d+)\s*일?\s*결석/);
                const absent = absMatch ? Number(absMatch[1] || absMatch[2]) : (nums.find(n => n > 0 && n < 150) || 0);
                const r = calcAttendance23(total, absent);
                return {
                    tab: 'att',
                    title: `연간 ${r.totalDays}일 기준 수료 최소 출석 ${r.requiredDays}일 (최대 결석 허용 ${r.maxAbsentDays}일)`,
                    sub: r.currentAbsent > 0 ? (r.remainAllowance >= 0 ? `현재 결석 ${r.currentAbsent}일 반영 시 수료 마지노선까지 ${r.remainAllowance}일 여유` : `수료 기준보다 ${Math.abs(r.remainAllowance)}일 부족 (유급·미수료 주의)`) : '초·중등교육법 시행령 기준 수업일수의 2/3 이상 출석 시 수료 인정',
                    warn: r.remainAllowance < 0
                };
            }
            // 3. 날짜 기간 평일 일수 계산 (YYYY-MM-DD~YYYY-MM-DD 또는 M/D~M/D)
            const ymdRange = q.match(/(\d{4}-\d{2}-\d{2})\s*(?:~|∼|-|부터)\s*(\d{4}-\d{2}-\d{2})/);
            const mdRange = !ymdRange && q.match(/(\d{1,2})\s*[./월]\s*(\d{1,2})\s*일?\s*(?:~|∼|-|부터)\s*(\d{1,2})\s*[./월]\s*(\d{1,2})\s*일?/);
            if (ymdRange || mdRange) {
                const yr = new Date().getFullYear();
                const sYmd = ymdRange ? ymdRange[1] : `${yr}-${pad2(mdRange[1])}-${pad2(mdRange[2])}`;
                const eYmd = ymdRange ? ymdRange[2] : `${yr}-${pad2(mdRange[3])}-${pad2(mdRange[4])}`;
                const r = calcWeekdaysBetween(sYmd, eYmd);
                if (r.totalDays > 0) {
                    return {
                        tab: 'trip',
                        title: `${sYmd} ~ ${eYmd} 주말 제외 평일 ${r.weekdays}일`,
                        sub: `전체 ${r.totalDays}일 중 주말(토·일) ${r.weekendDays}일 제외 (공휴일·재량휴업일은 별도 제외)`,
                        warn: false
                    };
                }
            }
            return null;
        }
        function buildSmartSearchAnswerHTML(rawQuery) {
            const res = parseSmartCalcQuery(rawQuery);
            if (!res) return '';
            return `<div class="p-3.5 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div class="flex flex-wrap items-center gap-2 min-w-0">
                    <span class="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-extrabold shrink-0">🧮 즉시 계산</span>
                    <span class="font-extrabold text-slate-900 dark:text-white">${escapeHTML(res.title)}</span>
                    <span class="${res.warn ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-indigo-700 dark:text-indigo-300 font-semibold'}">· ${escapeHTML(res.sub)}</span>
                </div>
                <button type="button" onclick="openCalcModal('${res.tab}')" class="shrink-0 px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-bold hover:bg-indigo-100">계산기 열기 →</button>
            </div>`;
        }

        const SOS_CASES = [
            {
                id: 'injury',
                badge: '🚑 응급·안전',
                title: '학생 부상 · 응급상황 발생',
                goldenTime: '즉시 보건실·119 호출 → 관리자 보고 → 보호자 안심 통화',
                steps: [
                    '학생을 임의로 이동시키지 말고 보건교사 호출 (의식·호흡 이상·골절 의심 시 즉시 119 신고)',
                    '교감 선생님께 발생 시각·장소·현재 상태 구두 보고 및 주변 학생 안정 조치',
                    '보호자에게 현재 상태·응급처치 결과·병원 이송 및 학교안전공제회 보상 절차 안내'
                ],
                script: '학부모님, 놀라게 해드려 죄송합니다. 오늘 [시각]경 [장소]에서 학생이 활동 중 다쳐 즉시 보건실에서 응급처치를 받았습니다. 현재 의식과 상태는 안정적이나 정확한 확인을 위해 병원 진료가 필요해 연락드렸습니다. 치료비는 학교안전공제회로 청구하실 수 있도록 안내해 드리겠습니다.',
                termId: 10,
                situationId: 'situation:01',
                docId: 't3'
            },
            {
                id: 'bullying',
                badge: '🛑 학폭 초기',
                title: '학교폭력 신고 · 학생 간 다툼 인지',
                goldenTime: '즉시 분리 의사 확인(최대 7일) → 48시간 내 교육지원청 보고',
                steps: [
                    '가해·피해 관련 학생 분리 및 즉시분리(최대 7일, 주말 포함) 의사 확인 후 학폭책임교사·학교장 보고',
                    '초기 사실관계 확인서(누가·언제·어디서·무엇을) 확보 — 단정적 발언이나 성급한 화해·합의 종용 절대 금지',
                    '양측 보호자에게 사안 접수 사실과 교육지원청 전담조사관 조사 절차를 객관적으로 안내'
                ],
                script: '학부모님, 오늘 교내에서 학생 간 다툼(학교폭력 관련) 사안이 접수되어 연락드립니다. 현재 관련 학생들의 심리적 안정과 보호 조치를 우선 시행 중이며, 관련 법령과 절차에 따라 공정하게 사실관계를 확인하고 있습니다. 진행 절차를 자세히 안내해 드리겠습니다.',
                termId: 4,
                situationId: 'situation:03',
                docId: 't1'
            },
            {
                id: 'complaint',
                badge: '📞 특이민원',
                title: '학부모 강한 항의 · 폭언 민원',
                goldenTime: '감정 대립 중단 → 녹음·증거 확보 → 사전예약·민원대응팀 이관',
                steps: [
                    '폭언·고성·반복 항의 시 "원활한 상담을 위해 통화가 녹음될 수 있으며, 지금 상태로는 상담이 어렵습니다" 고지 후 종료',
                    '통화 일시·발언 요지·문자 캡처 등 객관적 기록을 남기고 즉시 교감·교장(학교 민원대응팀)에 공유',
                    '개별 재연락 대신 공식 사전예약 면담 또는 관리자 동석 상담으로 전환'
                ],
                script: '학부모님, 말씀하신 우려 사항은 잘 메모하였습니다. 다만 현재 수업 및 학생 지도 중이거나 감정적인 표현이 이어져 정확한 안내가 어렵습니다. 관련 사실을 면밀히 확인한 뒤 공식 상담 가능 시간에 교무실을 통해 다시 연락드리겠습니다.',
                termId: 260,
                situationId: 'situation:02',
                docId: 't11'
            },
            {
                id: 'absent',
                badge: '🔍 미등교 확인',
                title: '연락 없는 미등교 · 소재 미확인',
                goldenTime: '1교시 시작 직후 보호자 연락 → 학생 직접 통화·안전 확인',
                steps: [
                    '등교 시각까지 연락 없이 결석한 경우 1교시 직후 보호자에게 전화·문자로 학생 소재와 건강 상태 확인',
                    '보호자와도 연락이 닿지 않거나 학대·안전 우려가 있으면 즉시 교감·학적담당에게 보고',
                    '질병·경조사 등 사유 확인 시 등교 후 5일 이내 결석계 및 증빙서류(진료확인서·약봉투 등) 제출 안내'
                ],
                script: '학부모님 안녕하십니까. 오늘 등교 시각까지 학생이 등교하지 않아 안전 확인차 연락드립니다. 현재 학생의 소재와 건강 상태를 회신해 주시기 바랍니다. 질병 결석의 경우 등교 후 5일 이내에 결석계와 진료확인서(처방전·약봉투)를 보내주시면 됩니다.',
                termId: 80,
                situationId: 'situation:06',
                docId: 't9'
            },
            {
                id: 'sickleave',
                badge: '🏥 긴급 복무',
                title: '교사 당일 긴급 병가 · 조퇴',
                goldenTime: '교감·학년부장 유선 보고 우선 → 보결 배정 → 나이스 복무 상신',
                steps: [
                    '출근 전 급병 발생 시 나이스보다 먼저 교감 선생님과 동학년 부장님께 전화로 상황을 보고',
                    '오늘 시간표와 자습·보결 학습지 위치를 동학년 선생님께 공유해 수업 공백 최소화',
                    '출근 후(또는 대리 신청으로) 4세대 나이스 [개인근무상황신청] 상신 (연 누계 6일 초과 시 진단서 첨부)'
                ],
                script: '교감 선생님(부장님), 죄송합니다. 제가 오늘 아침 갑작스러운 고열(급병)로 출근이 어려운 상태입니다. 오늘 저희 반 시간표와 차시별 활동 자료는 동학년 메신저에 공유해 두겠습니다. 병원 진료 후 나이스 병가 상신하겠습니다.',
                termId: 226,
                situationId: 'situation:05',
                docId: 't15'
            }
        ];

        const MONTHLY_BRIEFING = {
            1: [
                { icon: 'fa-coins text-amber-600', title: '1월 정근수당 · 연말정산 확인', sub: '나이스 급여명세서 & 연말정산 간소화 서류 제출', action: "openDetail(30)" },
                { icon: 'fa-calendar-check text-blue-600', title: '1월 학사 마무리 체크리스트', sub: '겨울방학 중 연수 · 새 학년 교육과정 구상', action: "router.navigate('year')" }
            ],
            2: [
                { icon: 'fa-truck-moving text-indigo-600', title: '전입·복직 · 업무분장 인수인계', sub: '새 학교 부임 인사 · 학년 및 부서 업무 파악', action: "openDetail(1)" },
                { icon: 'fa-wand-magic-sparkles text-emerald-600', title: '신학기 우리 반 1분 초기 세팅', sub: '학교·학반·명렬표 미리 등록하기', action: "openSetupWizard()" }
            ],
            3: [
                { icon: 'fa-list-check text-emerald-600', title: '3월 신학기 첫 주 체크리스트', sub: '응급연락망·알레르기 조사 · 시간표 세팅', action: "router.navigate('tools-board')" },
                { icon: 'fa-comments text-blue-600', title: '1학기 학부모 상담주간 준비', sub: '상담 신청 안내장 발송 & 시간표 자동 배정', action: "router.navigate('counsel')" }
            ],
            4: [
                { icon: 'fa-bus text-emerald-600', title: '봄 현장체험학습 사전답사·품의', sub: '안전계획 내부결재 · 차량 계약 · 동의서', action: "openDetail(120)" },
                { icon: 'fa-chalkboard-user text-blue-600', title: '학부모 공개수업 안내장 발송', sub: '무단 촬영·녹음 금지 안내 포함 양식', action: "router.navigate('tools-doc', 't18')" }
            ],
            5: [
                { icon: 'fa-heart-pulse text-rose-600', title: '학생건강체력평가(PAPS) · 체육행사', sub: '측정 결과 통지표 양식 & 야외 안전점검', action: "router.navigate('tools-doc', 't5')" },
                { icon: 'fa-plane-departure text-amber-600', title: '교외체험학습 신청·보고서 안내', sub: '사전 승인 원칙 및 연간 인정 일수 안내', action: "openDetail(120)" }
            ],
            6: [
                { icon: 'fa-pen-nib text-purple-600', title: '1학기 교과 세특·행특 사전 작성', sub: '나이스 바이트 계산 & 기재금지어 자동 점검', action: "router.navigate('tools-record')" },
                { icon: 'fa-file-circle-check text-blue-600', title: '1학기 출결 증빙서류 중간 점검', sub: '결석계·체험학습 보고서 누락 확인', action: "openDetail(80)" }
            ],
            7: [
                { icon: 'fa-check-double text-emerald-600', title: '1학기말 생기부·출결 마감 보드', sub: '동학년 상호 점검 체크리스트 바로 열기', action: "router.navigate('tools-board')" },
                { icon: 'fa-graduation-cap text-indigo-600', title: '여름방학 직무연수 · 정근수당 확인', sub: '교육연수원 학점 등재 & 7월 급여 확인', action: "openDetail(30)" }
            ],
            8: [
                { icon: 'fa-school text-blue-600', title: '2학기 개학 준비 · 전입생 학적 처리', sub: '교실 시설 점검 · 교과서 배부 · 시간표', action: "router.navigate('timetable')" },
                { icon: 'fa-chair text-emerald-600', title: '2학기 새 자리 배치표 생성', sub: '앞자리·분리 조건 반영해 1초 배치', action: "router.navigate('tools-class')" }
            ],
            9: [
                { icon: 'fa-comments text-emerald-600', title: '2학기 학부모 상담주간 운영', sub: '상담 안내문 양식 & 암호화 상담 기록장', action: "router.navigate('counsel')" },
                { icon: 'fa-shield-halved text-rose-600', title: '학교폭력 예방 · 학급 분위기 다지기', sub: '사안 처리 절차 및 생활지도 기준 확인', action: "openDetail(4)" }
            ],
            10: [
                { icon: 'fa-medal text-amber-600', title: '가을 체육대회 · 현장체험학습 운영', sub: '물품 품의서 & 현장 안전사고 예방 점검', action: "openDetail(3)" },
                { icon: 'fa-calculator text-indigo-600', title: '교무실 미니 계산기 (출석·병가·평일수)', sub: '수업일수 2/3 및 체험학습 일수 즉시 계산', action: "openCalcModal()" }
            ],
            11: [
                { icon: 'fa-file-invoice-dollar text-blue-600', title: '차년도 예산 요구 · 복지포인트 소진', sub: '산출기초 작성법 & 맞춤형 복지 마감 확인', action: "openDetail(53)" },
                { icon: 'fa-paper-plane text-purple-600', title: '전보 인사내신 · 다면평가 사전 준비', sub: '시도교육청 전보관리원칙 및 제출 기한 점검', action: "openDetail(20)" }
            ],
            12: [
                { icon: 'fa-award text-indigo-600', title: '다면평가 · 근무성적평정(근평) 제출', sub: '자기실적평가서 정량·정성 항목 누락 점검', action: "openDetail(22)" },
                { icon: 'fa-pen-nib text-emerald-600', title: '학년말 생기부 종합의견 · 통합 백업', sub: '생기부 마감 점검 및 내 교직함 암호화 백업', action: "router.navigate('tools-record')" }
            ]
        };

        function buildData(src) {
            const data = src || DEFAULT_DATA;
            const pick = (k, fallback) => (Array.isArray(data[k]) && data[k].length ? data[k] : fallback);

            const terms = pick('terms', DEFAULT_DATA.terms)
                .filter(t => t && t.id != null && t.keyword && t.description && t.simple)
                .map(t => ({ aliases: [], tags: [], situations: [], difficulty: 1, ...t, related: Array.isArray(t.related) ? t.related : [], category: t.category || assignCategory(t.keyword) }));
            const usedIds = new Set(terms.map(t => t.id));
            const db = [...terms];

            const topics = pick('topics', DEFAULT_DATA.topics).map(s => String(s).trim()).filter(Boolean);
            const byKeyword = new Map(terms.map(t => [t.keyword, t]));
            const useVariants = data.variants !== false;
            for (let tIdx = 0; tIdx < GEN_COUNT && topics.length; tIdx++) {
                const id = GEN_START_ID + tIdx;
                if (usedIds.has(id)) continue;
                const baseTopic = topics[tIdx % topics.length];
                const cycle = Math.floor(tIdx / topics.length);
                if (cycle > 0 && !useVariants) continue;
                let finalKw = (cycle === 0) ? baseTopic : `${GEN_PREFIXES[cycle % GEN_PREFIXES.length]}${baseTopic}`;
                if (db.some(d => d.keyword === finalKw)) finalKw += " 관련 지침";
                const base = byKeyword.get(baseTopic);
                if (base) {
                    // 직접 작성한 주제어가 있으면 변형 항목("초등 ○○" 등)은 그 설명을 그대로 이어받음
                    db.push({
                        id, keyword: finalKw, aliases: [baseTopic], category: base.category, _generated: true, _baseId: base.id,
                        description: base.description, simple: base.simple, tags: base.tags || [], tip: base.tip,
                        related: [base.keyword], situations: base.situations || [], difficulty: base.difficulty || 1
                    });
                    continue;
                }
                // 접두어("교육 ", "행정 " 등)에 분류가 끌려가지 않도록 원래 주제어로 분류
                const cat = assignCategory(baseTopic);
                db.push({
                    id, keyword: finalKw, aliases: [baseTopic], category: cat, _generated: true,
                    description: `실무에서 다루어지는 [${finalKw}] 관련 세부 개념입니다.`,
                    simple: `${cat} 업무 처리에 참고할 핵심 사항`, tags: [cat, "실무"],
                    related: [], situations: [`${finalKw} 처리 시`], difficulty: (id % 3) + 1
                });
            }
            db.sort((a, b) => a.id - b.id);

            db.forEach(item => {
                if (item.related.length > 0 && !item._baseId) return;
                // 자동 생성 변형 항목('실무 ○○' 등)은 실제 용어가 아니므로 관련어로 추천하지 않음
                if (item._baseId) { const more = shuffle(db.filter(d => d.category === item.category && !d._generated && d.id !== item._baseId && d.id !== item.id)).slice(0, 2).map(d => d.keyword); item.related = [...item.related, ...more]; return; }
                const sameCat = db.filter(d => d.category === item.category && d.id !== item.id && !d._generated);
                item.related = sameCat.length > 0 ? shuffle(sameCat).slice(0, 3).map(d => d.keyword) : [db[0].keyword];
            });

            db.forEach(item => applyTermEnrichment(item));
            DB = db.map(item => ({ ...item, _keywordLower: item.keyword.toLowerCase(), _searchText: `${item.keyword} ${(item.aliases||[]).join(' ')} ${item.category} ${item.description} ${item.simple} ${(item.tags||[]).join(' ')} ${item.tip || ''} ${item.systemPath || ''} ${item.legalBasis?.law || ''}`.toLowerCase(), _chosung: getChosung(item.keyword) }));

            // 필터에는 실제 항목이 있는 분류만 노출 (terms.json에서 새 분류를 써도 자동 추가)
            const allCats = [...new Set([...CATEGORIES, ...DB.map(d => d.category)])];
            FILTER_CATEGORIES = allCats.filter(c => DB.some(d => d.category === c));

            SITUATIONS = pick('situations', DEFAULT_DATA.situations).filter(s => s && s.title).map((s, i) => ({ id: i + 1, publicId: PUBLIC_LINKS.situations.find(link => link.title === s.title)?.id || `situation:${String(i + 1).padStart(2, '0')}`, category: '기타', summary: '', firstCheck: [], steps: [], caution: [], relatedKeywords: [], ...s }));
            NAVIGATOR_COURSES = pick('courses', DEFAULT_DATA.courses).filter(c => c && c.title).map((c, i) => ({ id: i + 1, publicId: PUBLIC_LINKS.courses.find(link => link.title === c.title)?.id || `workflow:${String(i + 1).padStart(2, '0')}`, category: '기타', steps: [], targetKeyword: '', ...c }));

            const yt = (data.yearTasks && typeof data.yearTasks === 'object') ? data.yearTasks : DEFAULT_DATA.yearTasks;
            YEAR_TASKS = {};
            for (let m = 1; m <= 12; m++) YEAR_TASKS[m] = Array.isArray(yt[m]) ? yt[m].filter(t => t && t.title).map(t => ({ role: 'all', ...t })) : [];

            DATA_META.updatedAt = data.updatedAt || '';
            DATA_META.version = data.version;
            DATA_META.curated = terms.length; DATA_META.variants = useVariants;
        }

        async function loadData() {
            try {
                const mapResponse = await fetch('data/legacy-map.json', { cache: 'no-cache' });
                if (mapResponse.ok) LEGACY_TERM_MAP = (await mapResponse.json()).termIdMap || {};
            } catch (_) { /* Older offline caches can still show the ungrouped search. */ }
            try {
                const linkResponse = await fetch('data/public-links.json', { cache: 'no-cache' });
                if (linkResponse.ok) PUBLIC_LINKS = await linkResponse.json();
            } catch (_) { /* Existing numeric links remain usable offline. */ }
            try {
                const res = await fetch('terms.json', { cache: 'no-cache' });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                if (!json || !Array.isArray(json.terms) || json.terms.length === 0) throw new Error('terms 항목이 없습니다');
                buildData(json);
                DATA_META.source = 'terms.json';
            } catch (e) {
                console.warn('[교직백서] terms.json을 불러오지 못해 내장 데이터를 사용합니다:', e && e.message);
                buildData(DEFAULT_DATA);
                DATA_META.source = '내장 데이터';
            }
            try {
                const metaResponse = await fetch('data/content-meta.json', { cache: 'no-cache' });
                if (!metaResponse.ok) throw new Error('metadata unavailable');
                const metadata = await metaResponse.json();
                const expected = `${DATA_META.version}-${DATA_META.updatedAt}`;
                if (metadata.metadataSchemaVersion === 1 && metadata.contentVersion === expected) CONTENT_META = metadata;
            } catch (_) { CONTENT_META = null; }
            // 일반 학교 업무 예시: 기준 연간 업무 뒤에만 이어 붙여 기존 체크 위치(checklist_월의 순번)를 유지
            try {
                const extraResponse = await fetch('data/year-tasks-extra.json', { cache: 'no-cache' });
                if (!extraResponse.ok) throw new Error('extra tasks unavailable');
                const extra = await extraResponse.json();
                for (let m = 1; m <= 12; m++) {
                    const list = Array.isArray(extra?.tasks?.[m]) ? extra.tasks[m] : [];
                    const seen = new Set((YEAR_TASKS[m] || []).map(t => t.title));
                    list.filter(t => t && typeof t.title === 'string' && !seen.has(t.title)).forEach(t => YEAR_TASKS[m].push({ role: ['homeroom', 'manager'].includes(t.role) ? t.role : 'all', title: t.title, common: true }));
                }
            } catch (_) { /* 예시 업무 없이 기준 업무만 표시 */ }
        }

        function curatedTerms() {
            const list = DB.filter(item => !item._generated);
            return list.length ? list : DB;
        }
        function currentOffice() {
            const code = (typeof getSettings === 'function' ? getSettings().office : '') || '';
            return EDUCATION_OFFICES.find(o => o.code === code || o.name === code) || null;
        }
        function encodeSharePayload(obj) {
            try { return btoa( Array.from(new TextEncoder().encode(JSON.stringify(obj)), b => String.fromCharCode(b)).join('') ); }
            catch (_) { return ''; }
        }
        function decodeSharePayload(str) {
            try {
                let raw = String(str || '').trim();
                if (raw.includes('#')) {
                    const hashPart = raw.slice(raw.indexOf('#') + 1);
                    const p = new URLSearchParams(hashPart).get('param');
                    if (p) raw = p;
                }
                try { if (raw.includes('%')) raw = decodeURIComponent(raw); } catch (_) {}
                const clean = raw.replace(/^.*#view=[^&]+&param=share:/, '').replace(/^share:/, '').trim();
                const bin = atob(clean);
                const bytes = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
                return JSON.parse(new TextDecoder().decode(bytes));
            } catch (_) { return null; }
        }

        const REVIEW_STATUS = {
            reviewed: { icon: '✅', label: '공식 근거와 대조 완료', tone: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/60' },
            'needs-update': { icon: '⚠️', label: '지침 변경 확인 중', tone: 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800/60' },
            'needs-review': { icon: '📝', label: '검수 전 · 실무 경험 기반 정리', tone: 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50' }
        };
        // 검수 기록: data/content-meta.json (콘텐츠 버전이 맞을 때만 사용). 'reviewed'는 근거와 확인일이 모두 있어야 인정
        function reviewInfo(publicId) {
            const record = CONTENT_META?.items?.[publicId] || null;
            const sources = (record?.sourceIds || []).map(id => (CONTENT_META.sources || []).find(src => src.id === id)).filter(Boolean);
            let status = record?.reviewStatus || 'needs-review';
            if (!REVIEW_STATUS[status] || (status === 'reviewed' && !(record.checkedAt && sources.length))) status = 'needs-review';
            return { status, checkedAt: status === 'needs-review' ? null : (record?.checkedAt || null), scope: record?.scope || null, sources, dataDate: DATA_META.updatedAt || '' };
        }
        function reviewLabel(publicId) {
            const info = reviewInfo(publicId); const st = REVIEW_STATUS[info.status];
            const office = currentOffice();
            const when = info.checkedAt ? `최종 확인 ${info.checkedAt}` : (info.dataDate ? `내용 기준일 ${info.dataDate}` : '확인일 없음');
            return `${st.icon} ${st.label} · ${when} · ${office ? `${office.name} 지침 대조 권장` : '시도교육청별 지침 확인 권장'}`;
        }
        function reviewPanelHTML(publicId) {
            const info = reviewInfo(publicId); const st = REVIEW_STATUS[info.status];
            const office = currentOffice();
            // 검수 전 항목은 한 줄 안내만 (모든 용어에 큰 경고 상자가 뜨지 않게)
            if (info.status === 'needs-review') return `
                    <p role="note" aria-label="내용 확인 정보" class="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400"><span class="font-bold text-amber-700 dark:text-amber-300">${st.icon} ${st.label}</span>${info.dataDate ? ` · 내용 기준일 ${escapeHTML(info.dataDate)}` : ''} · 실제 처리 전 아래 근거 법령과 ${office ? `${escapeHTML(office.name)} 지침` : '소속 교육청 지침'}을 확인하세요.</p>`;
            return `
                    <section aria-label="내용 확인 정보" class="p-3.5 rounded-2xl border ${st.tone} text-xs space-y-2">
                        <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span class="font-extrabold whitespace-nowrap">${st.icon} ${st.label}</span>
                            <span class="whitespace-nowrap">최종 확인일 <b>${escapeHTML(info.checkedAt || '아직 없음')}</b></span>
                            ${info.dataDate ? `<span class="whitespace-nowrap">내용 기준일 <b>${escapeHTML(info.dataDate)}</b></span>` : ''}
                            ${info.scope ? `<span class="whitespace-nowrap">적용 범위 <b>${escapeHTML(info.scope)}</b></span>` : ''}
                        </div>
                        ${info.sources.length ? `<div class="flex flex-wrap items-center gap-1.5"><span class="font-bold">대조한 근거</span>${info.sources.map(src => `<a href="${escapeHTML(src.url)}" target="_blank" rel="noopener noreferrer" class="px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-800 border border-current/20 font-semibold hover:underline">${escapeHTML(src.title)} ↗</a>`).join('')}</div>` : ''}
                        <p class="leading-relaxed opacity-90">${info.status === 'reviewed' ? '위 근거와 대조한 날짜 기준입니다. 이후 개정 여부는 근거 링크에서 확인하세요.' : '아직 공식 근거와 한 줄씩 대조하지 않은 내용입니다. 실제 처리 전 아래 근거 법령과 소속 교육청 지침을 확인하세요.'} ${office ? `${escapeHTML(office.name)} 기준 확인 권장.` : '시도교육청별로 다를 수 있습니다.'}</p>
                    </section>`;
        }
        function reviewSummary() {
            const items = Object.keys(CONTENT_META?.items || {});
            const counts = { reviewed: 0, 'needs-update': 0, 'needs-review': 0 };
            items.forEach(id => { counts[reviewInfo(id).status]++; });
            return { total: items.length, ...counts };
        }

        function findItemByKeyword(kw) {
            if (!kw) return null;
            const q = String(kw).toLowerCase();
            return DB.find(d => d._keywordLower === q)
                || DB.find(d => (d.aliases || []).some(a => a.toLowerCase() === q))
                || DB.find(d => d._keywordLower.includes(q))
                || null;
        }


        // 3. 라우터
        // ----------------------------------------------------
        let globalTimerInterval = null; let timerSeconds = 300; let currentDocTemplate = null; let randomLeaveInterval = null; let pickRandomInterval = null;
        let currentDetailId = null;

        function stopIntervals() {
            if (globalTimerInterval) { clearInterval(globalTimerInterval); globalTimerInterval = null; }
            if (randomLeaveInterval) { clearInterval(randomLeaveInterval); randomLeaveInterval = null; }
            if (pickRandomInterval) { clearInterval(pickRandomInterval); pickRandomInterval = null; }
            if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
        }
        function buildHash(view, param) { return param ? `#view=${view}&param=${encodeURIComponent(param)}` : `#view=${view}`; }
        function parseHash() {
            const hash = window.location.hash || '';
            if (hash.startsWith('#keyword=')) { const raw = hash.slice(9); try { return { keyword: decodeURIComponent(raw) }; } catch (e) { return { keyword: raw }; } }
            // URLSearchParams가 이미 디코딩하므로 decodeURIComponent를 한 번 더 하지 않음 (% 포함 검색어 오류 방지)
            const params = new URLSearchParams(hash.replace(/^#/, ''));
            const term = params.get('term');
            if (term && /^term:\d+$/.test(term)) return { termId: Number(term.slice(5)) };
            let param = params.get('param'); if (!param || param === 'null') param = null;
            return { view: params.get('view') || 'home', param };
        }
        function isModalOpen() { const m = document.getElementById('detail-modal'); return !!m && !m.classList.contains('hidden'); }
        function scrollViewTop() { const v = document.getElementById('app-view'); if (v) v.scrollTop = 0; }
        function updateBookmarkBadge() { const badge = document.getElementById('bookmark-badge'); if (badge) badge.classList.toggle('hidden', Storage.get('bookmarks', []).length === 0); }

        const router = {
            current: 'home', param: null,
            navigate(view, param = null) {
                if (this.current === 'tools-record' && !saveRecordDraftNow()) return;
                stopIntervals(); closePresent();
                if (isModalOpen()) closeModal(false);
                if (typeof closeCommandPalette === 'function') closeCommandPalette();
                if (typeof closeSetupWizard === 'function') closeSetupWizard();
                if (typeof closeMobileMenu === 'function') closeMobileMenu();
                this.current = view; this.param = param || null;
                Usage.view(view);
                const h = buildHash(view, this.param);
                if (window.location.hash !== h) window.location.hash = h; // hashchange에서는 상태가 같으므로 재렌더링 생략
                this.render(); scrollViewTop();
            },
            init() {
                try {
                    const s = parseHash();
                    if (s.keyword !== undefined) {
                        const item = findItemByKeyword(s.keyword);
                        this.current = 'search'; this.param = null; this.render();
                        if (item) setTimeout(() => openDetail(item.id, false), 50);
                        return;
                    }
                    if (s.termId !== undefined) {
                        this.current = 'search'; this.param = null; this.render();
                        if (DB.some(item => item.id === canonicalTermId(s.termId))) setTimeout(() => openDetail(s.termId, false), 50);
                        return;
                    }
                    this.current = s.view; this.param = s.param;
                    Usage.view(s.view);
                    this.render();
                } catch(e) { this.renderError(e); }
            },
            render() {
                try {
                    if (this.current === 'tools-record' && pendingRecordDraft && !saveRecordDraftNow()) return;
                     const navGroup = { start: 'quiz', situations: 'search', navigator: 'search', map: 'search', 'tools-board': 'year', 'tools-doc': 'year', career: 'year', timetable: 'tools-class', 'tools-record': 'tools-class', counsel: 'tools-class', card: 'quiz', 'tools-edutech': 'quiz' };
                     const mobGroup = { home: 'home', search: 'search', navigator: 'search', map: 'search', situations: 'situations', 'tools-class': 'tools-class', timetable: 'tools-class', 'tools-record': 'tools-class', counsel: 'tools-class', 'tools-doc': 'tools-class', 'tools-board': 'tools-class', year: 'menu', career: 'menu', quiz: 'menu', card: 'menu', 'tools-edutech': 'menu', mybox: 'menu', start: 'menu' };
                     const activeNav = navGroup[this.current] || this.current;
                     document.querySelectorAll('[data-primary-nav]').forEach(el => { const active = el.dataset.primaryNav === activeNav; el.classList.toggle('active', active); if (active) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current'); });
                    document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('bg-blue-50', 'dark:bg-slate-700', 'text-blue-600', 'dark:text-blue-400'));
                    document.querySelectorAll('.mob-item').forEach(el => el.classList.remove('text-blue-600', 'dark:text-blue-400', 'font-bold'));
                    const activeSidebar = document.getElementById(`nav-${this.current}`); if (activeSidebar) activeSidebar.classList.add('bg-blue-50', 'dark:bg-slate-700', 'text-blue-600', 'dark:text-blue-400');
                    const activeMob = document.getElementById(`mob-${mobGroup[this.current] || this.current}`); if (activeMob) activeMob.classList.add('text-blue-600', 'dark:text-blue-400', 'font-bold');

                    updateBookmarkBadge();

                    const viewContainer = document.getElementById('app-view'); if (!viewContainer) return;
                    const pageTitles = { start:'역할별 시작 코스', home:'홈', search:'교직어 검색', situations:'상황 가이드', navigator:'교직 내비게이터', year:'교사의 1년', 'tools-doc':'문서 양식', 'tools-record':'생기부 문장 도우미', counsel:'상담 기록장', mybox:'나의 교직함' };
                    document.title = `${pageTitles[this.current] || '교직 도구'} | 교직백서 1000`;

                    switch(this.current) {
                        case 'home': renderHome(viewContainer); break;
                        case 'search': renderSearch(viewContainer, this.param); break;
                        case 'situations': renderSituations(viewContainer); break;
                        case 'navigator': renderNavigator(viewContainer); break;
                        case 'map': renderMap(viewContainer); break;
                        case 'year': renderYear(viewContainer); break;
                        case 'career': renderCareer(viewContainer); break;
                        case 'quiz': renderQuiz(viewContainer); break;
                        case 'card': renderCard(viewContainer); break;
                        case 'mybox': renderMyBox(viewContainer); break;
                        case 'tools-doc': renderToolsDoc(viewContainer, this.param); break;
                        case 'tools-class': renderToolsClass(viewContainer); break;
                        case 'tools-board': renderToolsBoard(viewContainer, this.param); break;
                        case 'tools-edutech': renderToolsEdutech(viewContainer); break;
                        case 'timetable': renderTimetable(viewContainer); break;
                        case 'tools-record': renderToolsRecord(viewContainer); break;
                        case 'counsel': renderCounsel(viewContainer); break;
                        case 'start': renderStartCourses(viewContainer); break;
                        default: this.current = 'home'; renderHome(viewContainer); break;
                    }
                } catch (error) { this.renderError(error); }
            },
            renderError(error) {
                const viewContainer = document.getElementById('app-view');
                if (viewContainer) viewContainer.innerHTML = `<div class="flex flex-col items-center justify-center h-full py-20 text-center animate-fade-in"><div class="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-900/40 text-rose-500 flex items-center justify-center text-2xl mb-4"><i class="fa-solid fa-triangle-exclamation"></i></div><h2 class="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">화면 로딩 오류</h2><p class="text-sm text-slate-500 mb-6 font-mono">${escapeHTML(error && error.message)}</p><button onclick="window.location.hash=''; window.location.reload();" class="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow">다시 시도</button></div>`;
            }
        };

        window.addEventListener('hashchange', () => {
            if (!DB.length) return; // 데이터 로딩 전
            const s = parseHash();
            if (s.keyword !== undefined) {
                const item = findItemByKeyword(s.keyword);
                if (item && currentDetailId !== item.id) openDetail(item.id, false);
                return;
            }
            if (s.termId !== undefined) {
                if (DB.some(item => item.id === canonicalTermId(s.termId))) openDetail(s.termId, false);
                return;
            }
            if (isModalOpen()) closeModal(false);
            if (s.view === router.current && s.param === router.param) return; // navigate()가 이미 렌더링함 (이중 렌더링 방지)
            if (router.current === 'tools-record' && !saveRecordDraftNow()) {
                history.replaceState(null, '', buildHash(router.current, router.param));
                return;
            }
            stopIntervals(); closePresent();
            if (typeof closeCommandPalette === 'function') closeCommandPalette();
            if (typeof closeSetupWizard === 'function') closeSetupWizard();
            if (typeof closeMobileMenu === 'function') closeMobileMenu();
            router.current = s.view; router.param = s.param;
            Usage.view(s.view);
            router.render(); scrollViewTop();
        });

        // ----------------------------------------------------
        // 4. 화면 렌더링 세부 함수들
        // ----------------------------------------------------
        function saveRecentSearch(q) {
            q = String(q || '').trim();
            if (q.length < 2 || q === 'null') return;
            const recents = Storage.get('recent_searches', []).filter(x => x && String(x).trim() !== 'null' && x !== q);
            Storage.set('recent_searches', [q, ...recents].slice(0, 20));
        }

        let homeDockTab = 'class';
        function switchHomeDock(tab) { homeDockTab = tab; renderHome(document.getElementById('app-view')); }
        function getActiveSituationRun() {
            const candidates = SITUATIONS.map(sit => {
                const pr = situationProgress(sit);
                if (!pr || pr.done <= 0 || pr.done >= pr.total) return null;
                const ts = Date.parse(pr.run.updatedAt || pr.run.startedAt || '') || 0;
                return { sit, pr, ts };
            }).filter(Boolean).sort((a, b) => b.ts - a.ts);
            return candidates[0] || null;
        }

        function renderHome(container) {
            const month = new Date().getMonth() + 1;
            const monthlyTasks = YEAR_TASKS[month] || [];
            const feature = SITUATIONS.find(s => s.title.includes('체험학습')) || SITUATIONS[0];
            const s = getSettings();
            const office = currentOffice();
            const studentCount = parseNameList(Storage.get('class_names', '')).length;
            const hasSetup = !!(s.schoolName || s.className || s.teacherName);
            const nowSt = getNowStatus();
            const activeRun = getActiveSituationRun();

            const classDockItems = [
                { icon: 'fa-stopwatch text-blue-600', title: '스마트 타이머', sub: '전자칠판 전체화면', action: "openPresent('timer')" },
                { icon: 'fa-wand-magic-sparkles text-rose-600', title: '발표자 랜덤 뽑기', sub: studentCount ? `명단 ${studentCount}명 연동` : '학급 명단을 넣으면 바로 연동', action: "openPresent('pick')" },
                { icon: 'fa-chair text-emerald-600', title: '자리 배치기', sub: '짝·앞자리·분리 조건', action: "router.navigate('tools-class')" },
                { icon: 'fa-chalkboard text-amber-600', title: '수업 칠판 메모', sub: '오늘 활동 안내 띄우기', action: "openPresent('memo')" },
                { icon: 'fa-bell text-indigo-600', title: '시간표 · 종 알림', sub: `${nowSt.title}`, action: "router.navigate('timetable')" }
            ];
            const adminDockItems = [
                { icon: 'fa-file-signature text-blue-600', title: '기안·알림장 생성기', sub: '실전 양식 20종 자동완성', action: "router.navigate('tools-doc')" },
                { icon: 'fa-pen-nib text-purple-600', title: '학생별 생기부 도우미', sub: '금지어 점검 · 엑셀 저장', action: "router.navigate('tools-record')" },
                { icon: 'fa-comments text-emerald-600', title: '학부모 상담 기록장', sub: '상담주간 일정표 · 암호화', action: "router.navigate('counsel')" },
                { icon: 'fa-triangle-exclamation text-amber-600', title: '이럴 땐 어떻게?', sub: '15대 돌발 상황별 대처', action: "router.navigate('situations')" },
                { icon: 'fa-list-check text-teal-600', title: '실전 태스크 보드', sub: '동학년 체크리스트 공유', action: "router.navigate('tools-board')" }
            ];
            const monthlyBriefItems = [
                ...(MONTHLY_BRIEFING[month] || []),
                ...monthlyTasks.slice(0, 3).map(t => ({ icon: 'fa-calendar-day text-emerald-600', title: t.title, sub: `${month}월 연간 주요 학사·행정 일정`, action: "router.navigate('year')" }))
            ].slice(0, 5);
            const pinnedIds = getPinnedTermIds();
            const pinnedDockItems = pinnedIds.map(id => {
                const t = DB.find(d => d.id === id);
                return t ? { icon: 'fa-thumbtack text-amber-500', title: t.keyword, sub: t.simple, action: `openDetail(${t.id})` } : null;
            }).filter(Boolean).slice(0, 5);
            const dockItems = homeDockTab === 'class' ? classDockItems : homeDockTab === 'admin' ? adminDockItems : homeDockTab === 'monthly' ? monthlyBriefItems : pinnedDockItems;
            const dockCaption = homeDockTab === 'class'
                ? '전자칠판·TV에 바로 띄우는 수업 진행 도구'
                : homeDockTab === 'admin'
                ? '기안문·생기부·상담·체크리스트 실무 도구'
                : homeDockTab === 'monthly'
                ? `${month}월에 꼭 챙겨야 할 핵심 실무 & 양식 바로가기`
                : '자주 찾는 용어를 상세창에서 📌 핀으로 고정해 두세요';
            const shortcuts = [
                ['tools-doc', '기안·알림장 20종', '빈칸만 채워 바로 복사·인쇄'],
                ['tools-record', '학생별 생기부 도우미', '바이트 계산 · 기재금지 점검'],
                ['counsel', '학부모 상담 기록장', '상담주간 시간표 자동 배정'],
                ['mybox', '나의 교직함 · 백업', '즐겨찾기와 통합 암호화 백업']
            ];
            container.innerHTML = `
                <div class="editorial-home animate-fade-in">
                    <!-- 1분 학급 세팅 온보딩 배너 / 내 학급 상태 바 -->
                    <div class="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                        ${hasSetup ? `
                            <div class="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                                <span class="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"><i class="fa-solid fa-school mr-1"></i>${escapeHTML(s.schoolName || '학교 미설정')} ${escapeHTML(s.className || '')} ${escapeHTML(s.teacherName ? s.teacherName + ' 선생님' : '')}</span>
                                <span class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">학생 ${studentCount}명</span>
                                <button type="button" onclick="router.navigate('timetable')" class="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300"><i class="fa-regular fa-clock mr-1"></i><span class="now-status-title">${escapeHTML(nowSt.title)}</span> · <span class="now-status-sub">${escapeHTML(nowSt.sub)}</span></button>
                                ${office ? `<a href="${escapeHTML(office.url)}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:underline">${escapeHTML(office.name)} ↗</a>` : ''}
                                ${(() => { const ev = nextSchoolEvent(); return ev ? `<button type="button" onclick="router.navigate('mybox', 'calendar')" class="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300" title="우리 학교 학사일정"><i class="fa-regular fa-calendar mr-1"></i>${escapeHTML(ev.label)} ${ev.days === 0 ? '오늘' : `D-${ev.days}`}</button>` : `<button type="button" onclick="router.navigate('mybox', 'calendar')" class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600"><i class="fa-regular fa-calendar mr-1"></i>학사일정 입력하고 방학 D-day 보기</button>`; })()}
                                ${activeRun ? `<button type="button" onclick="openSituationRun('${escapeHTML(activeRun.sit.publicId)}')" class="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-extrabold shadow-sm"><i class="fa-solid fa-bolt mr-1"></i>진행 중: ${escapeHTML(activeRun.sit.title)} (${activeRun.pr.done}/${activeRun.pr.total}) 이어하기 →</button>` : ''}
                            </div>
                            <div class="flex flex-wrap items-center gap-1.5 shrink-0">
                                <button type="button" onclick="openCalcModal()" class="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100"><i class="fa-solid fa-calculator mr-1"></i>실무 계산기</button>
                                <button type="button" onclick="openSetupWizard()" class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200"><i class="fa-solid fa-sliders mr-1"></i>학급 설정</button>
                                <button type="button" onclick="openGuideModal()" class="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200" aria-label="30초 사용법 안내">❓ 사용법</button>
                            </div>
                        ` : `
                            <div class="flex items-start md:items-center gap-3">
                                <span class="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-extrabold shrink-0"><i class="fa-solid fa-wand-magic-sparkles"></i></span>
                                <div>
                                    <p class="text-sm font-extrabold text-slate-900 dark:text-white">처음 오셨나요? 1분 학급 세팅으로 우리 반 맞춤형 OS를 시작하세요</p>
                                    <p class="text-xs text-slate-500 dark:text-slate-400">학교명·학년반·학생 명단만 한 번 입력하면 문서 생성기, 자리 배치, 생기부, 상담 기록장에 모두 자동 연동됩니다.</p>
                                </div>
                            </div>
                            <div class="flex flex-wrap items-center gap-2 shrink-0">
                                ${activeRun ? `<button type="button" onclick="openSituationRun('${escapeHTML(activeRun.sit.publicId)}')" class="px-3 py-2 rounded-xl bg-rose-600 text-white text-xs font-extrabold shadow-sm"><i class="fa-solid fa-bolt mr-1"></i>진행 중: ${escapeHTML(activeRun.sit.title)} (${activeRun.pr.done}/${activeRun.pr.total}) 이어하기 →</button>` : ''}
                                <button type="button" onclick="router.navigate('start')" class="px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold">🚩 역할별 시작 코스</button>
                                <button type="button" onclick="openGuideModal()" class="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold">❓ 30초 사용법</button>
                                <button type="button" onclick="openSetupWizard()" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow">🪄 1분 학급 세팅</button>
                            </div>
                        `}
                    </div>

                    <section class="editorial-hero" aria-label="교직백서 소개와 검색">
                        <div>
                            <span class="editorial-eyebrow">THE TEACHER'S DESK</span>
                            <h2>필요한 근거는 빠르게,<br><em>오늘 할 일은 분명하게</em></h2>
                            <p>정확한 공문 용어를 몰라도 일상 대화어로 검색하고, 상황별 대본과 양식을 바로 여세요</p>
                            <div class="flex flex-wrap gap-2 mt-5 text-sm"><button type="button" onclick="openSosModal()" class="px-3 py-2 rounded-lg bg-rose-600 text-white font-bold shadow-sm">🚨 긴급 상황 SOS</button><button type="button" onclick="router.navigate('navigator')" class="px-3 py-2 rounded-lg bg-white/90 text-slate-900 font-bold">처음 맡은 업무 알아보기</button><button type="button" onclick="router.navigate('tools-doc')" class="px-3 py-2 rounded-lg bg-white/90 text-slate-900 font-bold">양식 20종 바로 쓰기</button></div>
                        </div>
                        <div class="space-y-2">
                            <div class="editorial-search">
                                <label for="home-search-input" class="sr-only">교직 업무 검색</label>
                                <input type="search" id="home-search-input" enterkeyhint="search" placeholder="${narrowScreen() ? '예: 학생이 다쳤어요' : '예: 학생이 다쳤어요 · 물건 살 때 · 아파서 못가요'}" autocomplete="off">
                                <button type="button" onclick="triggerHomeSearch()">검색</button>
                            </div>
                            <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 px-1">
                                <span class="flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <button type="button" onclick="openCommandPalette()" class="text-left hover:underline"><i class="fa-solid fa-bolt text-amber-600 mr-1"></i><b>빠른 이동</b> <kbd class="kbd-hint px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[11px]">Ctrl+K</kbd></button>
                                    <button type="button" onclick="openCalcModal()" class="font-bold hover:underline"><i class="fa-solid fa-calculator text-indigo-600 dark:text-indigo-400 mr-1"></i>출석·병가 계산기</button>
                                </span>
                                <button type="button" onclick="startVoiceSearch('home-search-input')" class="font-bold text-blue-600 dark:text-blue-400 hover:underline"><i class="fa-solid fa-microphone mr-1"></i>음성 검색</button>
                            </div>
                        </div>
                    </section>

                    <!-- 빠른 실행 도구 (교실 수업 도구 | 행정 칼퇴 도구 | 이달의 브리핑 | 내 고정핀) -->
                    <section class="mt-6 p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4" aria-label="빠른 실행 도구">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <div class="flex flex-wrap items-center gap-1.5">
                                <button type="button" onclick="switchHomeDock('class')" class="px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${homeDockTab === 'class' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}"><i class="fa-solid fa-chalkboard-user mr-1"></i>교실 수업 도구</button>
                                <button type="button" onclick="switchHomeDock('admin')" class="px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${homeDockTab === 'admin' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}"><i class="fa-solid fa-briefcase mr-1"></i>행정 · 기록 도구</button>
                                <button type="button" onclick="switchHomeDock('monthly')" class="px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${homeDockTab === 'monthly' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}"><i class="fa-regular fa-calendar-check mr-1"></i>${month}월 브리핑</button>
                                <button type="button" onclick="switchHomeDock('pins')" class="px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${homeDockTab === 'pins' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}"><i class="fa-solid fa-thumbtack mr-1"></i>내 고정핀 (${pinnedDockItems.length})</button>
                            </div>
                            <span class="text-[11px] font-semibold text-slate-400">${escapeHTML(dockCaption)}</span>
                        </div>
                        ${dockItems.length ? `
                        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            ${dockItems.map((item, idx) => `
                                <button type="button" onclick="${item.action}" class="${idx === 4 ? 'col-span-2 sm:col-span-1 ' : ''}p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-blue-50/70 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700 text-left transition group">
                                    <div class="text-base mb-1.5"><i class="fa-solid ${item.icon}"></i></div>
                                    <strong class="block text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">${escapeHTML(item.title)}</strong>
                                    <small class="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">${escapeHTML(item.sub)}</small>
                                </button>
                            `).join('')}
                        </div>` : `<div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 text-center text-xs text-slate-500">고정된 교직어가 없습니다. 자주 보는 용어 상세창 상단의 📌 핀 아이콘을 눌러 추가해 보세요.</div>`}
                    </section>

                    <div class="editorial-content-grid">
                        <section aria-label="오늘의 안내">
                            <div class="editorial-section-head"><h3>오늘의 안내</h3><button type="button" onclick="router.navigate('situations')">상황 가이드 15선 전체 →</button></div>
                            <button type="button" class="editorial-story" onclick="openFeaturedSituation()">
                                <small>상황별 처리 순서 · 관련 양식 원클릭 연결</small>
                                <strong>${escapeHTML(feature?.title || '상황별 안내')}</strong>
                                <span>${escapeHTML(feature?.summary || '기존 가이드에서 처리 단계와 확인할 사항을 살펴보세요.')} &nbsp; 읽어보기 →</span>
                            </button>
                            <div class="editorial-shortcuts">
                                ${shortcuts.map(([route, title, desc]) => `<button type="button" class="editorial-shortcut" onclick="router.navigate('${route}')"><strong>${title}</strong><small>${desc}</small></button>`).join('')}
                            </div>
                        </section>
                        <section aria-label="이번 주 할 일">
                            <div class="editorial-section-head"><h3>이번 주 할 일</h3><button type="button" onclick="router.navigate('year')">교사의 1년 →</button></div>
${weeklyAgendaHTML()}
                        </section>
                    </div>
                    <div class="editorial-recent"><span>자주 찾는 주제</span>${['관외 전보', '학교폭력', '품의', '안전사고', '출석인정결석', '생기부'].map(kw => `<button type="button" data-kw="${escapeHTML(kw)}" onclick="router.navigate('search', this.dataset.kw)">${escapeHTML(kw)}</button>`).join('')}</div>
                </div>
            ` + FOOTER_HTML;
            const searchInput = document.getElementById('home-search-input');
            if (searchInput) searchInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) triggerHomeSearch(); });
            startClock();
        }

        function openFeaturedSituation() {
            const feature = SITUATIONS.find(s => s.title.includes('체험학습')) || SITUATIONS[0];
            router.navigate('situations');
            const input = document.getElementById('situation-search-input');
            if (input && feature) { input.value = feature.title; updateSituationsGrid(feature.title); }
        }

        function triggerHomeSearch() {
            const input = document.getElementById('home-search-input');
            if (input && input.value.trim()) router.navigate('search', input.value.trim());
            else router.navigate('search');
        }

        function renderHomeChecklistPreview(month) {
            const container = document.getElementById('home-checklist-preview');
            if (!container) return;
            const tasks = YEAR_TASKS[month] || YEAR_TASKS[3];
            const checkedState = Storage.get(`checklist_${month}`, {});
            container.innerHTML = tasks.slice(0, 4).map((task, idx) => `
                <li><label class="flex items-center gap-3 min-h-[44px] text-base cursor-pointer text-slate-800 dark:text-slate-200">
                    <input type="checkbox" ${checkedState[idx] ? 'checked' : ''} onchange="toggleHomeChecklist(${month}, ${idx})" class="w-5 h-5 shrink-0 rounded accent-blue-700 cursor-pointer">
                    <span class="truncate ${checkedState[idx] ? 'line-through text-slate-400 dark:text-slate-500' : ''}">${escapeHTML(task.title)}</span>
                </label></li>
            `).join('');
            // 체크 시 달성률도 즉시 갱신
            const done = tasks.filter((_, i) => checkedState[i]).length;
            const rate = tasks.length ? Math.round(done / tasks.length * 100) : 0;
            const rateEl = document.getElementById('home-completion-rate'); if (rateEl) rateEl.innerText = `${rate}%`;
            const barEl = document.getElementById('home-completion-bar'); if (barEl) barEl.style.width = `${rate}%`;
        }

        function toggleHomeChecklist(month, idx) {
            const state = Storage.get(`checklist_${month}`, {});
            state[idx] = !state[idx]; Storage.set(`checklist_${month}`, state); renderHomeChecklistPreview(month);
        }

        // ---------- 6. 문서/알림장 생성기 (내 양식 · 자동 입력 · 동료 공유 · 글자 수 · 인쇄) ----------
        function getCustomTemplates() { const t = Storage.get('custom_templates', []); return Array.isArray(t) ? t : []; }
        function getAllTemplates() { return [...DOC_TEMPLATES, ...getCustomTemplates().map(t => ({ ...t, custom: true }))]; }
        // 이름이 이렇게 된 빈칸은 자동으로 채워 둠 (직접 수정 가능)
        function todayTimetableSummary() {
            const tt = getTimetable();
            const dow = new Date().getDay();
            const di = (dow >= 1 && dow <= 5) ? dow - 1 : 0;
            const daySubjs = (tt.grid[di] || []).map((subj, idx) => subj ? `${idx + 1}교시(${subj})` : '').filter(Boolean);
            return daySubjs.length ? daySubjs.join(', ') : '';
        }
        function todayFirstSubject() {
            const tt = getTimetable();
            const dow = new Date().getDay();
            const di = (dow >= 1 && dow <= 5) ? dow - 1 : 0;
            return (tt.grid[di] || []).find(Boolean) || '';
        }
        const AUTO_VARS = {
            '오늘': () => koreanDate(), '오늘날짜': () => koreanDate(), '날짜': () => koreanDate(), '작성일': () => koreanDate(),
            '학교명': () => getSettings().schoolName, '학교': () => getSettings().schoolName,
            '담임': () => getSettings().teacherName, '담임교사': () => getSettings().teacherName, '교사명': () => getSettings().teacherName,
            '학년반': () => getSettings().className, '학년/반': () => getSettings().className,
            '대상교시': () => todayTimetableSummary(),
            '과목명': () => todayFirstSubject(),
            '상담기간': () => { const o = counselScheduleOpts(); return o && o.from && o.to && !isNaN(parseYMD(o.from)) && !isNaN(parseYMD(o.to)) ? `${koreanDate(parseYMD(o.from))} ~ ${koreanDate(parseYMD(o.to))}` : ''; },
            '상담시간': () => { const o = counselScheduleOpts(); return o && o.start && o.end ? `${o.start} ~ ${o.end}` : ''; }
        };
        let tplEditorMode = null;
        let docOutputStyle = 'full';

        function renderToolsDoc(container, initialTemplateId = null) {
            let sharedNotice = '';
            if (initialTemplateId && String(initialTemplateId).startsWith('share:')) {
                const decoded = decodeSharePayload(initialTemplateId);
                if (decoded && decoded.title && decoded.content) {
                    const list = getCustomTemplates();
                    const existing = list.find(t => t.title === decoded.title && t.content === decoded.content);
                    if (existing) {
                        initialTemplateId = existing.id;
                        sharedNotice = `<div class="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300"><i class="fa-solid fa-circle-check mr-1"></i>이미 내 양식함에 있는 '${escapeHTML(decoded.title)}' 양식을 열었습니다!</div>`;
                    } else if (list.length >= 50) {
                        sharedNotice = '<div class="p-3 rounded-2xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-300">내 양식이 50개로 가득 차서 공유받은 양식을 추가하지 못했어요. 쓰지 않는 양식을 지운 뒤 링크를 다시 열어 주세요.</div>';
                    } else {
                        const newId = 'c_' + Date.now();
                        list.push({ id: newId, title: String(decoded.title).slice(0, 40), content: String(decoded.content).slice(0, 5000) });
                        if (Storage.set('custom_templates', list)) {
                            initialTemplateId = newId;
                            sharedNotice = `<div class="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300"><i class="fa-solid fa-circle-check mr-1"></i>동료 선생님이 공유한 '${escapeHTML(decoded.title)}' 양식을 내 양식함에 추가하고 열었습니다!</div>`;
                        }
                    }
                    router.param = initialTemplateId;
                    try { history.replaceState(null, '', buildHash('tools-doc', router.param)); } catch (_) {}
                }
            }
            const custom = getCustomTemplates();
            container.innerHTML = `
                <div class="space-y-6 animate-fade-in">
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div><h2 class="text-2xl font-bold tracking-tight mb-1 text-slate-900 dark:text-white">기안/알림장 생성기</h2><p class="text-sm text-slate-500 dark:text-slate-400">실전 양식 20종과 내 양식을 빈칸만 채워 완성하고 동료 선생님과 링크로 공유하세요.</p></div>
                        <div class="flex flex-wrap gap-2">
                            <button type="button" onclick="promptImportSharedTemplate()" class="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 transition"><i class="fa-solid fa-file-import mr-1"></i>공유받은 양식 코드 붙여넣기</button>
                            <button type="button" onclick="openSetupWizard()" class="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold"><i class="fa-solid fa-school mr-1"></i>학교·담임 자동입력 설정</button>
                        </div>
                    </div>
                    ${sharedNotice}
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div class="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4">
                            <label for="doc-template-select" class="block text-sm font-bold text-slate-900 dark:text-white">템플릿 선택 (${DOC_TEMPLATES.length + custom.length}종)</label>
                            <select id="doc-template-select" onchange="loadDocTemplate()" class="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-200 outline-none">
                                <option value="">템플릿을 선택하세요</option>
                                <optgroup label="기본 실전 양식 (${DOC_TEMPLATES.length}종)">${DOC_TEMPLATES.map(t => `<option value="${t.id}">${escapeHTML(t.title)}</option>`).join('')}</optgroup>
                                ${custom.length ? `<optgroup label="내 양식 (${custom.length}종)">${custom.map(t => `<option value="${escapeHTML(t.id)}">${escapeHTML(t.title)}</option>`).join('')}</optgroup>` : ''}
                            </select>
                            <div class="flex flex-wrap gap-2">
                                <button onclick="openTplEditor('new')" class="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 text-xs font-bold rounded-lg"><i class="fa-solid fa-plus"></i> 새 양식</button>
                                <button id="tpl-copy-btn" onclick="openTplEditor('copy')" class="hidden px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg"><i class="fa-regular fa-clone"></i> 내 양식으로 복제</button>
                                <button id="tpl-edit-btn" onclick="openTplEditor('edit')" class="hidden px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg"><i class="fa-solid fa-pen"></i> 수정</button>
                                <button id="tpl-share-btn" onclick="shareCurrentDocTemplate()" class="hidden px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-lg"><i class="fa-solid fa-share-nodes"></i> 동료 공유</button>
                                <button id="tpl-del-btn" onclick="deleteTpl()" class="hidden px-3 py-1.5 bg-rose-50 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-lg"><i class="fa-solid fa-trash"></i> 삭제</button>
                            </div>
                            <div id="tpl-editor" class="hidden space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                <p id="tpl-editor-title" class="text-xs font-bold text-slate-700 dark:text-slate-200">새 양식 만들기</p>
                                <input id="tpl-title" type="text" maxlength="40" placeholder="양식 이름 (예: 우유 급식 신청 안내)" class="w-full p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-200 outline-none">
                                <textarea id="tpl-content" rows="8" placeholder="내용을 입력하세요. 바꿔 넣을 부분은 [학생이름] 처럼 대괄호로 감싸세요." class="w-full p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-200 outline-none resize-y"></textarea>
                                <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">자동 입력되는 빈칸: <b>[오늘]</b> [학교명] [담임] [학년반] — 학교명·담임·학년반은 '학급 세팅'에서 설정해요.</p>
                                <div class="flex gap-2"><button onclick="saveTpl()" class="flex-1 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg">저장</button><button onclick="closeTplEditor()" class="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg">취소</button></div>
                            </div>
                            <div id="doc-inputs-container" class="space-y-3"></div>
                        </div>
                        <div class="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-sm flex flex-col">
                            <div class="flex flex-wrap justify-between items-center gap-2 mb-4">
                                <div class="flex flex-wrap items-center gap-2">
                                    <span class="text-sm font-bold text-slate-900 dark:text-white">완성된 텍스트</span>
                                    <div class="inline-flex rounded-lg bg-slate-100 dark:bg-slate-700 p-0.5 text-[11px] font-bold">
                                        <button type="button" id="doc-style-full" onclick="setDocOutputStyle('full')" class="px-2.5 py-1 rounded-md ${docOutputStyle === 'full' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-300'}">문서 원문</button>
                                        <button type="button" id="doc-style-short" onclick="setDocOutputStyle('short')" class="px-2.5 py-1 rounded-md ${docOutputStyle === 'short' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-300'}">📱 하이톡·문자 요약</button>
                                    </div>
                                </div>
                                <div class="flex gap-2">
                                    ${aiButtonHTML('doc-output', 'letter')}
                                    <button onclick="printDoc()" class="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition"><i class="fa-solid fa-print"></i> 가정통신문 인쇄</button>
                                    <button onclick="copyDocText()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition"><i class="fa-regular fa-copy"></i> 복사하기</button>
                                </div>
                            </div>
                            <textarea id="doc-output" oninput="updateDocCounter()" class="w-full h-72 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-200 focus:outline-none resize-y" placeholder="템플릿을 선택하고 빈칸을 채우세요."></textarea>
                            <p id="doc-counter" class="mt-2 text-xs text-slate-500 dark:text-slate-400 text-right">0자</p>
                        </div>
                    </div>
                </div>
            ` + FOOTER_HTML;
            currentDocTemplate = null;
            if (initialTemplateId) { const select = document.getElementById('doc-template-select'); if (select) { select.value = initialTemplateId; loadDocTemplate(); } }
        }

        function shareCurrentDocTemplate() {
            if (!currentDocTemplate) return;
            const code = encodeSharePayload({ type: 'tpl', title: currentDocTemplate.title, content: currentDocTemplate.content });
            if (!code) { showToast('공유 링크를 만들지 못했습니다.', 'error'); return; }
            const shareUrl = `${location.href.split('#')[0]}#view=tools-doc&param=${encodeURIComponent('share:' + code)}`;
            copyText(shareUrl, `'${currentDocTemplate.title}' 양식 공유 링크를 복사했습니다! 동학년 메신저에 붙여넣으세요.`);
        }
        function promptImportSharedTemplate() {
            const raw = prompt('동료 선생님께 받은 양식 공유 링크나 코드를 붙여넣어 주세요:');
            if (!raw || !raw.trim()) return;
            const decoded = decodeSharePayload(raw.trim());
            if (!decoded || !decoded.title || !decoded.content) { showToast('유효한 양식 공유 코드가 아닙니다.', 'error'); return; }
            router.navigate('tools-doc', 'share:' + encodeSharePayload({ type: 'tpl', title: decoded.title, content: decoded.content }));
        }

        function loadDocTemplate() {
            const id = document.getElementById('doc-template-select').value;
            currentDocTemplate = getAllTemplates().find(t => t.id === id) || null;
            const container = document.getElementById('doc-inputs-container'); const output = document.getElementById('doc-output');
            document.getElementById('tpl-copy-btn')?.classList.toggle('hidden', !currentDocTemplate || !!currentDocTemplate.custom);
            document.getElementById('tpl-edit-btn')?.classList.toggle('hidden', !currentDocTemplate || !currentDocTemplate.custom);
            document.getElementById('tpl-share-btn')?.classList.toggle('hidden', !currentDocTemplate);
            document.getElementById('tpl-del-btn')?.classList.toggle('hidden', !currentDocTemplate || !currentDocTemplate.custom);
            if (!currentDocTemplate) { container.innerHTML = ''; output.value = ''; updateDocCounter(); return; }

            const regex = /\[(.*?)\]/g; let match; const vars = new Set();
            while ((match = regex.exec(currentDocTemplate.content)) !== null) if (match[1].trim()) vars.add(match[1]);

            if (vars.size === 0) {
                container.innerHTML = '<p class="text-xs text-slate-400 dark:text-slate-500">빈칸이 없는 템플릿입니다.</p>'; output.value = currentDocTemplate.content; updateDocCounter();
            } else {
                container.innerHTML = Array.from(vars).map(v => {
                    const auto = AUTO_VARS[v.replace(/\s/g, '')]; const val = auto ? (auto() || '') : '';
                    return `<div><label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">${escapeHTML(v)}${auto ? ' <span class="text-[10px] text-blue-500">자동</span>' : ''}</label><input type="text" data-var="${escapeHTML(v)}" value="${escapeHTML(val)}" oninput="updateDocOutput()" class="doc-var-input w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm outline-none" placeholder="${escapeHTML(v)} 입력"></div>`;
                }).join('');
                updateDocOutput();
            }
        }

        function setDocOutputStyle(style) {
            docOutputStyle = style === 'short' ? 'short' : 'full';
            const fullBtn = document.getElementById('doc-style-full');
            const shortBtn = document.getElementById('doc-style-short');
            if (fullBtn && shortBtn) {
                fullBtn.className = `px-2.5 py-1 rounded-md ${docOutputStyle === 'full' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-300'}`;
                shortBtn.className = `px-2.5 py-1 rounded-md ${docOutputStyle === 'short' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-300'}`;
            }
            if (currentDocTemplate) updateDocOutput();
        }
        function buildShortDocSummary(tpl, fullText, values) {
            const s = getSettings();
            const cls = values['학년반'] || values['학년/반'] || s.className || '';
            const tch = values['담임'] || values['담임교사'] || s.teacherName || '';
            const head = `[${cls ? cls + ' ' : ''}알림] ${tpl.title}`;
            const entries = Object.entries(values).filter(([k, v]) => v && !['학교명', '학교', '학년반', '학년/반', '담임', '담임교사', '교사명', '오늘', '오늘날짜', '날짜', '작성일'].includes(k.replace(/\s/g, '')));
            const lines = fullText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            const coreLines = entries.length
                ? entries.map(([k, v]) => `• ${k}: ${v}`)
                : lines.slice(0, 3).map(l => l.startsWith('-') || l.startsWith('•') ? l : `• ${l}`);
            const firstSentence = lines[0] ? lines[0].replace(/^학부모님\s*안녕하십니까\.?\s*/, '').trim() : '';
            return [
                head,
                ...(firstSentence && !entries.length ? [firstSentence] : []),
                ...coreLines.slice(0, 5),
                `감사합니다.${tch ? ` (${cls ? cls + ' ' : ''}담임 ${tch} 드림)` : ''}`
            ].filter(Boolean).join('\n');
        }
        function updateDocOutput() {
            if (!currentDocTemplate) return;
            // 원본 템플릿 기준으로 한 번에 치환 (입력값 안의 [..]가 다시 치환되지 않도록)
            const values = {};
            document.querySelectorAll('.doc-var-input').forEach(input => { values[input.getAttribute('data-var')] = input.value; });
            const fullText = currentDocTemplate.content.replace(/\[(.*?)\]/g, (m, v) => (values[v] ? values[v] : m));
            document.getElementById('doc-output').value = docOutputStyle === 'short' ? buildShortDocSummary(currentDocTemplate, fullText, values) : fullText;
            updateDocCounter();
        }
        function updateDocCounter() {
            const el = document.getElementById('doc-output'); const out = document.getElementById('doc-counter'); if (!el || !out) return;
            const t = el.value; const noSpace = t.replace(/\s/g, '').length;
            const left = (t.match(/\[[^\]]+\]/g) || []).length;
            out.innerHTML = `${t.length.toLocaleString()}자 (공백 제외 ${noSpace.toLocaleString()}자) · 나이스 기준 ${neisBytes(t).toLocaleString()}바이트${left ? ` · <span class="text-rose-500 font-bold whitespace-nowrap inline-block">채우지 않은 빈칸 ${left}개</span>` : ''}`;
        }
        function copyDocText() { const el = document.getElementById('doc-output'); if (el && el.value) copyText(el.value); else showToast('먼저 템플릿을 선택해 주세요.', 'error'); }

        function printDoc() {
            const el = document.getElementById('doc-output'); if (!el || !el.value.trim()) { showToast('인쇄할 내용이 없습니다.', 'error'); return; }
            const s = getSettings(); const title = currentDocTemplate ? currentDocTemplate.title : '가정통신문';
            printHTML(`<div class="pl-letter"><div class="pl-top"><span>가정통신문</span><span>${escapeHTML(s.schoolName || '')}</span></div><h1>${escapeHTML(title)}</h1><div class="pl-body">${escapeHTML(el.value)}</div><div class="pl-date">${escapeHTML(koreanDate())}</div><div class="pl-sign">${escapeHTML(s.schoolName ? `${s.schoolName}장` : '학교장')}</div></div>`);
        }

        function openTplEditor(mode) {
            tplEditorMode = mode;
            const ed = document.getElementById('tpl-editor'); if (!ed) return;
            const title = document.getElementById('tpl-title'); const content = document.getElementById('tpl-content');
            const head = document.getElementById('tpl-editor-title');
            if (mode === 'new') { title.value = ''; content.value = ''; head.textContent = '새 양식 만들기'; }
            else if (currentDocTemplate) {
                title.value = mode === 'copy' ? `${currentDocTemplate.title} (내 양식)` : currentDocTemplate.title;
                content.value = currentDocTemplate.content;
                head.textContent = mode === 'copy' ? '기본 양식을 복제해 내 양식 만들기' : '내 양식 수정';
            }
            ed.classList.remove('hidden'); title.focus();
        }
        function closeTplEditor() { document.getElementById('tpl-editor')?.classList.add('hidden'); tplEditorMode = null; }
        function saveTpl() {
            const title = document.getElementById('tpl-title').value.trim(); const content = document.getElementById('tpl-content').value;
            if (!title || !content.trim()) { showToast('양식 이름과 내용을 입력해 주세요.', 'error'); return; }
            const list = getCustomTemplates(); let id;
            if (tplEditorMode === 'edit' && currentDocTemplate && currentDocTemplate.custom) {
                id = currentDocTemplate.id; const t = list.find(x => x.id === id); if (t) { t.title = title; t.content = content; }
            } else {
                if (list.length >= 50) { showToast('내 양식은 50개까지 저장할 수 있어요.', 'error'); return; }
                id = 'c_' + Date.now(); list.push({ id, title, content });
            }
            if (!Storage.set('custom_templates', list)) return;
            showToast('내 양식을 저장했습니다.');
            renderToolsDoc(document.getElementById('app-view'), id);
        }
        function deleteTpl() {
            if (!currentDocTemplate || !currentDocTemplate.custom) return;
            if (!confirm(`'${currentDocTemplate.title}' 양식을 삭제할까요?`)) return;
            if (!Storage.set('custom_templates', getCustomTemplates().filter(t => t.id !== currentDocTemplate.id))) return;
            showToast('삭제했습니다.', 'info'); renderToolsDoc(document.getElementById('app-view'));
        }


        // ---------- 4·5. 학급 경영 도구 (전체 화면 모드 · 중복 없는 뽑기 · 자리 배치 고급) ----------
        const pickedNames = new Set();

        function renderToolsClass(container) {
            const savedNames = Storage.get('class_names', '');
            const o = getSeatOpts(); const noRepeat = !!Storage.get('pick_norepeat', false);
            const btn2 = 'px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition';
            const field = 'w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm outline-none';
            container.innerHTML = `
                <div class="space-y-6 animate-fade-in">
                    <div><h2 class="text-2xl font-bold tracking-tight mb-1 text-slate-900 dark:text-white">학급 경영 도구</h2><p class="text-sm text-slate-500 dark:text-slate-400">타이머·랜덤 뽑기·자리 배치를 TV나 전자칠판에 <b>전체 화면</b>으로 띄울 수 있어요.</p></div>
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div class="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-sm text-center flex flex-col items-center justify-center relative">
                            <button onclick="openPresent('timer')" class="absolute top-4 right-4 ${btn2}" aria-label="타이머 전체 화면"><i class="fa-solid fa-expand"></i> 크게 보기</button>
                            <h3 class="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4">스마트 타이머</h3>
                            <div id="timer-display" class="timer-display-text text-7xl md:text-8xl font-black text-slate-800 dark:text-white tracking-tighter tabular-nums mb-8">05:00</div>
                            <div class="flex flex-wrap justify-center gap-3">
                                <button onclick="addTimer(-60)" class="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold">-1분</button>
                                <button onclick="addTimer(60)" class="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold">+1분</button>
                                <button onclick="startTimer()" class="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow"><i class="fa-solid fa-play"></i> 시작</button>
                                <button onclick="pauseTimer()" class="px-6 py-2 bg-amber-500 text-white rounded-xl text-sm font-bold shadow"><i class="fa-solid fa-pause"></i> 정지</button>
                                <button onclick="resetTimer()" class="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"><i class="fa-solid fa-rotate-right"></i> 리셋</button>
                            </div>
                            <p class="text-[11px] text-slate-400 mt-4">끝나면 알림음이 울려요 (기기 소리를 켜 두세요)</p>
                        </div>
                        <div class="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-sm flex flex-col">
                            <div class="flex flex-wrap justify-between items-center gap-2 mb-2">
                                <h3 class="text-sm font-bold text-slate-500 dark:text-slate-400">우리 반 명단 · 랜덤 뽑기</h3>
                                <div class="flex gap-2">
                                    <button onclick="openPresent('pick')" class="${btn2}"><i class="fa-solid fa-expand"></i> 크게</button>
                                    <button onclick="pickRandom()" class="px-4 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg shadow"><i class="fa-solid fa-wand-magic-sparkles"></i> 1명 뽑기</button>
                                </div>
                            </div>
                            <textarea id="class-names-input" oninput="Storage.set('class_names', this.value); pickedNames.clear(); updatePickRemain();" class="w-full h-24 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm mb-3 resize-none" placeholder="예: 김하늘, 이바다, 박구름 (쉼표나 줄바꿈으로 구분)">${escapeHTML(savedNames)}</textarea>
                            <div class="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs">
                                <label class="flex items-center gap-2 font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"><input type="checkbox" ${noRepeat ? 'checked' : ''} onchange="Storage.set('pick_norepeat', this.checked); pickedNames.clear(); updatePickRemain();" class="w-4 h-4 rounded"> 한 번 뽑힌 학생은 제외</label>
                                <span class="flex items-center gap-2"><span class="pick-remain text-slate-400"></span><button onclick="resetPicked()" class="text-blue-600 dark:text-blue-400 font-bold hover:underline">뽑기 기록 초기화</button></span>
                            </div>
                            <div class="flex-1 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/50 rounded-2xl flex flex-col items-center justify-center p-4 min-h-[110px]">
                                <p class="text-xs text-rose-400 dark:text-rose-500 font-bold mb-1">발표자는?</p>
                                <p id="random-name" class="text-3xl font-extrabold text-rose-600 dark:text-rose-400 text-center break-all">?</p>
                            </div>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div class="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4">
                            <div class="flex flex-wrap justify-between items-center gap-2">
                                <h3 class="text-sm font-bold text-slate-900 dark:text-white">랜덤 자리 배치기</h3>
                                <div class="flex flex-wrap gap-2">
                                    <button onclick="openPresent('seats')" class="${btn2}"><i class="fa-solid fa-expand"></i> 크게</button>
                                    <button onclick="exportSeatsImage()" class="${btn2}"><i class="fa-regular fa-image"></i> 이미지 저장</button>
                                    <button onclick="printSeats()" class="${btn2}"><i class="fa-solid fa-print"></i> 인쇄</button>
                                    <button onclick="generateSeats()" class="px-5 py-2 bg-emerald-600 text-white font-bold text-sm rounded-xl shadow"><i class="fa-solid fa-border-all"></i> 배치 생성</button>
                                </div>
                            </div>
                            <details class="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50/60 dark:bg-slate-900/40" ${o.separate || o.front ? 'open' : ''}>
                                <summary class="text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer select-none whitespace-nowrap"><i class="fa-solid fa-sliders"></i> 배치 옵션 (분단·짝·분리·앞자리 고정)</summary>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <div class="space-y-3">
                                        <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400">한 줄에 앉는 인원
                                            <select onchange="setSeatOpt('cols', Number(this.value))" class="${field} mt-1">${[2,3,4,5,6,7,8,9,10].map(n => `<option value="${n}" ${Number(o.cols) === n ? 'selected' : ''}>${n}명</option>`).join('')}</select>
                                        </label>
                                        <label class="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"><input type="checkbox" ${o.pairMode ? 'checked' : ''} onchange="setSeatOpt('pairMode', this.checked)" class="w-4 h-4 rounded"> 짝 배치 (2명씩 붙이고 사이에 통로)</label>
                                        <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400">앞자리 고정 학생 <span class="font-normal whitespace-nowrap">(시력·집중 등, 쉼표로 구분)</span>
                                            <input type="text" value="${escapeHTML(o.front)}" onchange="setSeatOpt('front', this.value)" placeholder="예: 김학생, 박학생" class="${field} mt-1">
                                        </label>
                                    </div>
                                    <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400">떨어뜨려 앉힐 학생 <span class="font-normal whitespace-nowrap">(한 줄에 한 묶음, '-'로 연결)</span>
                                        <textarea rows="5" onchange="setSeatOpt('separate', this.value)" placeholder="김학생-이학생&#10;박학생-최학생-정학생" class="${field} mt-1 resize-none">${escapeHTML(o.separate)}</textarea>
                                        <span class="block mt-1 font-normal text-[11px] text-slate-400">앞뒤·옆·대각선으로 붙지 않게 배치해요.</span>
                                    </label>
                                </div>
                            </details>
                            <div class="bg-slate-50 dark:bg-slate-900 p-4 sm:p-6 rounded-2xl overflow-x-auto">
                                <div class="text-center mb-6"><span class="px-12 py-2 bg-slate-300 dark:bg-slate-700 rounded text-sm font-bold text-slate-700 dark:text-slate-200">교 탁</span></div>
                                <div id="seats-grid" class="min-h-[100px] flex items-center"></div>
                            </div>
                        </div>
                        <!-- 재미용 기능: 업무 도구 사이에서 눈에 덜 띄도록 접어 둠 -->
                        <details class="self-start bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 text-sm">
                            <summary class="cursor-pointer select-none px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400">🤫 쉬어 가기 · 엽쌤의 조퇴 사유 뽑기</summary>
                            <div class="px-4 pb-4 text-center">
                                <p class="text-xs text-slate-500 dark:text-slate-400 mb-3">"금요일 오후, 완벽한 변명거리" (농담용)</p>
                                <div id="leave-reason-display" class="w-full bg-slate-50 dark:bg-slate-900 p-3 rounded-xl mb-3 font-bold text-base h-14 flex items-center justify-center overflow-hidden text-slate-700 dark:text-slate-200"><span>?</span></div>
                                <button onclick="pickLeaveReason()" class="w-full py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-200 transition">사유 뽑기</button>
                            </div>
                        </details>
                    </div>
                </div>
            ` + FOOTER_HTML;
            updateTimerDisplay(); updatePickRemain();
            document.getElementById('seats-grid').innerHTML = seatsHTML(Storage.get('seat_result', null));
        }

        function getClassNames() {
            const el = document.getElementById('class-names-input');
            return parseNameList(el ? el.value : Storage.get('class_names', ''));
        }

        // ---- 타이머 ----
        function updateTimerDisplay() {
            const m = String(Math.floor(timerSeconds / 60)).padStart(2, '0'); const s = String(timerSeconds % 60).padStart(2, '0');
            document.querySelectorAll('.timer-display-text').forEach(el => { el.textContent = `${m}:${s}`; el.classList.toggle('timer-blink', timerSeconds === 0); });
            document.querySelectorAll('.timer-toggle-label').forEach(el => { el.textContent = globalTimerInterval ? '정지' : '시작'; });
        }
        function startTimer() {
            unlockAudio();
            if (globalTimerInterval || timerSeconds === 0) return;
            globalTimerInterval = setInterval(() => {
                if (timerSeconds > 0) { timerSeconds--; updateTimerDisplay(); }
                if (timerSeconds === 0) { clearInterval(globalTimerInterval); globalTimerInterval = null; updateTimerDisplay(); beep(3); showToast('타이머가 종료되었습니다.', 'error'); }
            }, 1000);
            updateTimerDisplay();
        }
        function pauseTimer() { clearInterval(globalTimerInterval); globalTimerInterval = null; updateTimerDisplay(); }
        function toggleTimer() { if (globalTimerInterval) pauseTimer(); else startTimer(); }
        function resetTimer() { pauseTimer(); timerSeconds = 300; updateTimerDisplay(); }
        function addTimer(sec) { timerSeconds = Math.max(0, Math.min(timerSeconds + sec, 99 * 60 + 59)); updateTimerDisplay(); }

        // ---- 랜덤 뽑기 ----
        function updatePickRemain() {
            const all = getClassNames(); const on = !!Storage.get('pick_norepeat', false);
            const left = all.filter(n => !pickedNames.has(n)).length;
            document.querySelectorAll('.pick-remain').forEach(el => { el.textContent = on ? `남은 인원 ${left} / ${all.length}` : ''; });
        }
        function resetPicked() { pickedNames.clear(); updatePickRemain(); document.querySelectorAll('#random-name, #present-pick').forEach(el => el.textContent = '?'); showToast('뽑기 기록을 초기화했습니다.', 'info'); }
        function pickRandom() {
            if (pickRandomInterval) return; // 연타 시 애니메이션 중복 방지
            const all = getClassNames();
            if (all.length === 0) { showToast('이름을 입력해주세요.', 'error'); return; }
            const noRepeat = !!Storage.get('pick_norepeat', false);
            let pool = noRepeat ? all.filter(n => !pickedNames.has(n)) : all;
            if (pool.length === 0) { pickedNames.clear(); pool = all; showToast('모두 한 번씩 뽑혔어요. 처음부터 다시 뽑습니다.', 'info'); }
            const winner = pool[Math.floor(Math.random() * pool.length)];
            const targets = () => ['random-name', 'present-pick'].map(id => document.getElementById(id)).filter(Boolean);
            unlockAudio(); let count = 0;
            pickRandomInterval = setInterval(() => {
                const ts = targets();
                if (!ts.length) { clearInterval(pickRandomInterval); pickRandomInterval = null; return; }
                ts.forEach(t => t.textContent = all[Math.floor(Math.random() * all.length)]);
                if (count++ > 15) {
                    clearInterval(pickRandomInterval); pickRandomInterval = null;
                    if (noRepeat) pickedNames.add(winner);
                    ts.forEach(t => t.textContent = `🎉 ${winner} 🎉`);
                    updatePickRemain(); beep(1, 990);
                }
            }, 50);
        }

        // ---- 자리 배치 ----
        let selectedSeatIdx = null;
        function getSeatOpts() { return { cols: 6, pairMode: true, separate: '', front: '', ...Storage.get('seat_opts', {}) }; }
        function setSeatOpt(k, v) { const o = getSeatOpts(); o[k] = v; Storage.set('seat_opts', o); }
        function parseNameList(s) { return String(s || '').split(/[,\n]/).map(x => x.trim()).filter(Boolean); }
        function parseSeparateGroups(s) { return String(s || '').split(/\n/).map(line => line.split(/[-–~,\/]/).map(x => x.trim()).filter(Boolean)).filter(g => g.length >= 2); }

        function generateSeats() {
            const names = getClassNames();
            if (names.length === 0) { showToast('이름을 입력해주세요.', 'error'); return; }
            selectedSeatIdx = null;
            const o = getSeatOpts(); const C = Math.max(2, Math.min(10, parseInt(o.cols) || 6));
            const stripNum = s => String(s || '').replace(/^\d+[\s.)번-]*/, '').trim();
            const resolveSeatName = q => {
                const raw = String(q || '').trim();
                if (!raw) return null;
                if (names.includes(raw)) return raw;
                const clean = stripNum(raw);
                return names.find(n => stripNum(n) === clean) || null;
            };
            const frontRaw = parseNameList(o.front), groupsRaw = parseSeparateGroups(o.separate);
            const front = [...new Set(frontRaw.map(resolveSeatName).filter(Boolean))];
            const groups = groupsRaw.map(g => [...new Set(g.map(resolveSeatName).filter(Boolean))]).filter(g => g.length >= 2);
            const unknown = [...new Set([...frontRaw, ...groupsRaw.flat()].filter(n => !resolveSeatName(n)))];

            // 직전 배치의 짝꿍 조합 기억 (짝 중복 최소화)
            const prevPairs = new Set();
            const prevRes = Storage.get('seat_result', null);
            if (prevRes && Array.isArray(prevRes.names) && prevRes.cols) {
                for (let i = 0; i < prevRes.names.length; i++) {
                    const ci = i % prevRes.cols;
                    if (ci % 2 === 0 && ci + 1 < prevRes.cols && i + 1 < prevRes.names.length) {
                        const a = stripNum(prevRes.names[i]), b = stripNum(prevRes.names[i + 1]);
                        if (a && b) prevPairs.add([a, b].sort().join('||'));
                    }
                }
            }

            const near = (a, b) => Math.abs(Math.floor(a / C) - Math.floor(b / C)) <= 1 && Math.abs(a % C - b % C) <= 1;
            const frontSlots = Math.min(names.length, Math.ceil(front.length / C) * C);
            const others = names.filter(n => !front.includes(n));
            let best = null, bestV = Infinity, bestScore = Infinity;
            for (let attempt = 0; attempt < 3000 && bestScore > 0; attempt++) {
                const slots = Array(names.length).fill(null);
                const fPos = shuffle([...Array(frontSlots).keys()]).slice(0, front.length);
                shuffle(front).forEach((n, i) => { slots[fPos[i]] = n; });
                const rest = shuffle(others); let k = 0;
                for (let i = 0; i < slots.length; i++) if (slots[i] === null) slots[i] = rest[k++];
                const pos = new Map(); slots.forEach((n, i) => { if (!pos.has(n)) pos.set(n, i); });
                let v = 0;
                groups.forEach(g => { for (let a = 0; a < g.length; a++) for (let b = a + 1; b < g.length; b++) if (near(pos.get(g[a]), pos.get(g[b]))) v++; });
                let pairRepeats = 0;
                if (o.pairMode && prevPairs.size > 0) {
                    for (let i = 0; i < slots.length; i++) {
                        const ci = i % C;
                        if (ci % 2 === 0 && ci + 1 < C && i + 1 < slots.length) {
                            const key = [stripNum(slots[i]), stripNum(slots[i + 1])].sort().join('||');
                            if (prevPairs.has(key)) pairRepeats++;
                        }
                    }
                }
                const score = v * 100 + pairRepeats;
                if (score < bestScore) { bestScore = score; bestV = v; best = slots; }
            }
            Storage.set('seat_result', { names: best, cols: C, pairMode: !!o.pairMode, date: ymd(new Date()) });
            const grid = document.getElementById('seats-grid'); if (grid) grid.innerHTML = seatsHTML(Storage.get('seat_result', null));
            if (unknown.length) showToast(`명단에 없는 이름은 제외했어요: ${unknown.slice(0, 3).join(', ')}${unknown.length > 3 ? ' 외' : ''}`, 'info');
            else if (bestV > 0) showToast(`떨어뜨리기 조건을 모두 만족하는 배치를 찾지 못했어요 (붙은 곳 ${bestV}군데). 한 줄 인원을 늘려 보세요.`, 'error');
            else showToast('자리 배치 완료! (직전 짝 중복 방지 적용)');
        }

        function swapSeatSelect(idx) {
            const res = Storage.get('seat_result', null);
            if (!res || !Array.isArray(res.names) || idx < 0 || idx >= res.names.length) return;
            if (selectedSeatIdx === null) {
                selectedSeatIdx = idx;
            } else if (selectedSeatIdx === idx) {
                selectedSeatIdx = null;
            } else {
                const a = res.names[selectedSeatIdx], b = res.names[idx];
                res.names[selectedSeatIdx] = b;
                res.names[idx] = a;
                selectedSeatIdx = null;
                Storage.set('seat_result', res);
                showToast(`'${a}' ↔ '${b}' 자리를 맞바꾸었습니다.`);
            }
            const updated = Storage.get('seat_result', null);
            const grid = document.getElementById('seats-grid'); if (grid) grid.innerHTML = seatsHTML(updated, false);
            const pGrid = document.getElementById('present-seats-grid'); if (pGrid) pGrid.innerHTML = seatsHTML(updated, true);
        }

        function seatRows(res) { const rows = []; for (let i = 0; i < res.names.length; i += res.cols) rows.push(res.names.slice(i, i + res.cols)); return rows; }
        function seatsHTML(res, big = false) {
            if (!res || !Array.isArray(res.names) || !res.names.length) return '<p class="text-slate-400 dark:text-slate-500 text-sm font-medium mx-auto">배치 생성 버튼을 눌러주세요.</p>';
            const boxStyle = big ? `width:min(${Math.floor(80 / res.cols)}vw,150px);height:min(9vh,90px);font-size:clamp(11px,2.6vw,26px)` : '';
            const baseBoxCls = big ? 'bg-white/10 border border-white/25 text-white hover:bg-white/20' : 'w-16 h-14 sm:w-20 sm:h-16 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 shadow-sm hover:border-emerald-400';
            return `<div class="w-max mx-auto flex flex-col gap-2 items-center">${seatRows(res).map((r, ri) => `<div class="flex gap-1.5">${r.map((n, ci) => {
                const flatIdx = ri * res.cols + ci;
                const isSel = selectedSeatIdx === flatIdx;
                const selCls = isSel ? (big ? 'ring-4 ring-amber-300 bg-amber-500/30 border-amber-300 scale-105' : 'ring-2 ring-amber-400 bg-amber-50 dark:bg-amber-900/40 border-amber-400 scale-105') : '';
                return `<button type="button" onclick="swapSeatSelect(${flatIdx})" title="클릭하여 다른 자리와 1:1 맞바꾸기" aria-pressed="${isSel}" class="${baseBoxCls} ${selCls} cursor-pointer select-none transition rounded-xl flex items-center justify-center font-bold text-center break-all p-1 ${res.pairMode && ci % 2 === 1 && ci < res.cols - 1 ? (big ? 'mr-3 sm:mr-8' : 'mr-4') : ''}" style="${boxStyle}">${escapeHTML(n)}</button>`;
            }).join('')}</div>`).join('')}<p class="text-[11px] ${big ? 'text-slate-400' : 'text-slate-400 dark:text-slate-500'} mt-1">💡 두 자리를 차례로 클릭하면 1:1로 자리를 맞바꿀 수 있어요.</p></div>`;
        }

        function exportSeatsImage() {
            const res = Storage.get('seat_result', null); if (!res || !res.names?.length) { showToast('먼저 배치를 생성해 주세요.', 'error'); return; }
            const C = res.cols, R = Math.ceil(res.names.length / C), W = 120, H = 70, G = 10, AISLE = res.pairMode ? 28 : 0, PAD = 40;
            const aisles = res.pairMode ? Math.floor((C - 1) / 2) : 0;
            const width = PAD * 2 + C * W + (C - 1) * G + aisles * AISLE, height = PAD * 2 + 110 + R * H + (R - 1) * G;
            const cv = document.createElement('canvas'), scale = 2; cv.width = width * scale; cv.height = height * scale;
            const ctx = cv.getContext('2d'); ctx.scale(scale, scale);
            const rr = (x, y, w, h, r) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); };
            const font = (px, bold) => `${bold ? 'bold ' : ''}${px}px 'Maru Buri', 'Apple SD Gothic Neo', 'Malgun Gothic', serif`;
            ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            const s = getSettings();
            ctx.fillStyle = '#0f172a'; ctx.font = font(22, true); ctx.fillText(`${s.className ? s.className + ' ' : ''}자리 배치표`, width / 2, PAD + 6);
            ctx.fillStyle = '#64748b'; ctx.font = font(13); ctx.fillText(koreanDate(parseYMD(res.date || ymd(new Date()))), width / 2, PAD + 32);
            ctx.fillStyle = '#cbd5e1'; rr(width / 2 - 80, PAD + 52, 160, 34, 6); ctx.fill();
            ctx.fillStyle = '#334155'; ctx.font = font(15, true); ctx.fillText('교  탁', width / 2, PAD + 69);
            res.names.forEach((n, i) => {
                const r = Math.floor(i / C), c = i % C;
                const x = PAD + c * (W + G) + (res.pairMode ? Math.floor(c / 2) * AISLE : 0), y = PAD + 110 + r * (H + G);
                ctx.fillStyle = '#f8fafc'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; rr(x, y, W, H, 10); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#0f172a'; ctx.font = font(n.length > 5 ? 13 : 18, true); ctx.fillText(n, x + W / 2, y + H / 2, W - 10);
            });
            cv.toBlob(b => { if (b) { downloadFile(`자리배치_${res.date || ymd(new Date())}.png`, b); showToast('이미지를 저장했습니다.'); } }, 'image/png');
        }

        function printSeats() {
            const res = Storage.get('seat_result', null); if (!res || !res.names?.length) { showToast('먼저 배치를 생성해 주세요.', 'error'); return; }
            const s = getSettings();
            printHTML(`<div class="pl-seats"><h1>${escapeHTML(s.className ? s.className + ' ' : '')}자리 배치표</h1><p class="pl-sub">${escapeHTML(koreanDate(parseYMD(res.date || ymd(new Date()))))}</p><div class="pl-desk">교 탁</div>${seatRows(res).map(r => `<div class="pl-row">${r.map((n, ci) => `<div class="pl-seat${res.pairMode && ci % 2 === 1 && ci < res.cols - 1 ? ' pl-aisle' : ''}">${escapeHTML(n)}</div>`).join('')}</div>`).join('')}</div>`);
        }


        function pickLeaveReason() {
            if(randomLeaveInterval) return;
            const reasons = ["은행 업무(대출 연장)", "치과 신경치료", "갑작스러운 자녀 돌봄", "이사 견적 확인", "부모님 병원 동행", "차량 긴급 정비", "집 수도관 파열", "건강검진 재검사"];
            const display = document.getElementById('leave-reason-display'); let count = 0; display.innerHTML = `<span class="slot-machine-spin">돌아가는 중...</span>`;
            randomLeaveInterval = setInterval(() => {
                display.innerHTML = `<span class="slot-machine-spin">${reasons[Math.floor(Math.random() * reasons.length)]}</span>`;
                if(count++ > 15) { clearInterval(randomLeaveInterval); randomLeaveInterval = null; display.innerHTML = `<span class="text-indigo-600 dark:text-indigo-300 font-extrabold text-lg animate-fade-in">${reasons[Math.floor(Math.random() * reasons.length)]}</span>`; showToast('사유가 결정되었습니다! 결재를 올려볼까요? 😉'); }
            }, 50);
        }

        // 저장된 값이 없을 때 기본 할 일로 시작 (이전엔 기본 항목 체크/삭제 시 목록이 통째로 사라지던 버그)
        function getBoardTasks() { const t = Storage.get('board_tasks', null); return t && typeof t === 'object' && !Array.isArray(t) ? t : {}; }

        function renderToolsBoard(container, initialParam = null) {
            let sharedNotice = '';
            if (initialParam && String(initialParam).startsWith('share:')) {
                const decoded = decodeSharePayload(initialParam);
                const ownTasks = Storage.get('board_tasks', null);
                const hasOwn = ownTasks && typeof ownTasks === 'object' && !Array.isArray(ownTasks) && Object.values(ownTasks).some(t => t && String(t.title || '').trim());
                const keepOwn = decoded && hasOwn && !confirm(`공유받은 보드 '${String(decoded.title || '').slice(0, 60)}'(${(decoded.items || []).length}개)를 불러오면 지금 저장된 내 보드(${Object.keys(ownTasks).length}개)가 바뀝니다. 불러올까요?\n(취소하면 내 보드를 그대로 둡니다. 먼저 '메신저용 복사'로 내 보드를 보관해 둘 수 있어요.)`);
                if (keepOwn) {
                    router.param = null;
                    try { history.replaceState(null, '', buildHash('tools-board', null)); } catch (_) {}
                    sharedNotice = '<div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300">공유받은 보드를 불러오지 않고 내 보드를 그대로 두었습니다.</div>';
                } else if (decoded && decoded.title && Array.isArray(decoded.items) && decoded.items.length) {
                    const importedTasks = {};
                    decoded.items.slice(0, 50).forEach((it, idx) => {
                        if (it && typeof it.title === 'string') importedTasks['s_' + idx] = { title: it.title.slice(0, 120), done: !!it.done };
                    });
                    if (Storage.set('board_title', String(decoded.title).slice(0, 60)) && Storage.set('board_tasks', importedTasks)) {
                        sharedNotice = `<div class="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300"><i class="fa-solid fa-circle-check mr-1"></i>동료 선생님이 공유한 '${escapeHTML(decoded.title)}' 태스크 보드를 불러왔습니다!</div>`;
                        router.param = null;
                        try { history.replaceState(null, '', buildHash('tools-board', null)); } catch (_) {}
                    }
                }
            }
            const tasks = getBoardTasks();
            container.innerHTML = `
                <div class="space-y-6 animate-fade-in">
                    <div class="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                        <div><h2 class="text-2xl font-bold mb-1 text-slate-900 dark:text-white">실전 태스크 보드</h2><p class="text-sm text-slate-500 dark:text-slate-400">굵직한 행사의 세부 업무를 관리하고 동학년 선생님들과 링크·텍스트로 공유하세요.</p></div>
                        <div class="flex flex-wrap gap-2 shrink-0">
                            <button onclick="copyBoardAsText()" class="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl hover:bg-slate-200 transition"><i class="fa-regular fa-copy mr-1"></i>메신저용 복사</button>
                            <button onclick="shareBoardTasks()" class="px-3.5 py-2.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 text-xs font-bold rounded-xl hover:bg-blue-100 transition"><i class="fa-solid fa-share-nodes mr-1"></i>동학년 링크 공유</button>
                            <button onclick="promptImportSharedBoard()" class="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl hover:bg-slate-200 transition"><i class="fa-solid fa-file-import mr-1"></i>공유 코드 입력</button>
                            <button onclick="addBoardTask()" class="px-4 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow transition">+ 새 할 일 추가</button>
                        </div>
                    </div>
                    ${sharedNotice}

                    <div class="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-2xl flex flex-col md:flex-row items-center gap-3 w-full">
                        <span class="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0"><i class="fa-solid fa-download"></i> 템플릿 불러오기</span>
                        <div class="flex flex-nowrap gap-2 overflow-x-auto w-full hide-scrollbar pr-4">
                            <button onclick="loadBoardPreset('newSemester')" class="shrink-0 whitespace-nowrap px-3 py-1.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg shadow-sm border border-slate-200 dark:border-slate-600 hover:text-emerald-600 dark:hover:text-emerald-400 transition">3월 신학기 첫 주</button>
                            <button onclick="loadBoardPreset('openClass')" class="shrink-0 whitespace-nowrap px-3 py-1.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg shadow-sm border border-slate-200 dark:border-slate-600 hover:text-emerald-600 dark:hover:text-emerald-400 transition">공개 수업 세팅</button>
                            <button onclick="loadBoardPreset('fieldTrip')" class="shrink-0 whitespace-nowrap px-3 py-1.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg shadow-sm border border-slate-200 dark:border-slate-600 hover:text-emerald-600 dark:hover:text-emerald-400 transition">현장체험학습 인솔</button>
                            <button onclick="loadBoardPreset('sportsDay')" class="shrink-0 whitespace-nowrap px-3 py-1.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg shadow-sm border border-slate-200 dark:border-slate-600 hover:text-emerald-600 dark:hover:text-emerald-400 transition">가을 체육대회</button>
                            <button onclick="loadBoardPreset('recordsEnd')" class="shrink-0 whitespace-nowrap px-3 py-1.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg shadow-sm border border-slate-200 dark:border-slate-600 hover:text-emerald-600 dark:hover:text-emerald-400 transition">학기말 생기부 마감</button>
                            <div class="shrink-0 w-2"></div>
                        </div>
                    </div>

                    <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm">
                        <div class="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
                            <i class="fa-solid fa-thumbtack text-emerald-500"></i>
                            <input type="text" id="board-title" value="${escapeHTML(Storage.get('board_title', ''))}" onchange="Storage.set('board_title', this.value)" placeholder="보드 이름 (예: 운동부 대회 출전 준비)" aria-label="보드 이름" class="text-lg font-bold bg-transparent border-none outline-none w-full text-slate-900 dark:text-white" placeholder="프로젝트 이름">
                        </div>
                        <div id="board-list" class="space-y-3"></div>
                    </div>
                </div>
            ` + FOOTER_HTML;
            renderBoardTasks(tasks);
        }

        function shareBoardTasks() {
            const title = String(Storage.get('board_title', '') || '').trim() || '태스크 보드';
            const tasks = getBoardTasks();
            const items = Object.values(tasks).map(t => ({ title: t.title || '', done: !!t.done }));
            if (!items.some(t => t.title.trim())) { showToast('공유할 할 일을 먼저 적어 주세요.', 'error'); return; }
            const code = encodeSharePayload({ type: 'board', title, items });
            if (!code) { showToast('공유 링크를 만들지 못했습니다.', 'error'); return; }
            const shareUrl = `${location.href.split('#')[0]}#view=tools-board&param=${encodeURIComponent('share:' + code)}`;
            copyText(shareUrl, `'${title}' 태스크 보드 공유 링크를 복사했습니다! 동학년 메신저에 공유하세요.`);
        }
        function promptImportSharedBoard() {
            const raw = prompt('동료 선생님께 받은 태스크 보드 공유 링크나 코드를 붙여넣어 주세요:');
            if (!raw || !raw.trim()) return;
            const decoded = decodeSharePayload(raw.trim());
            if (!decoded || !decoded.title || !Array.isArray(decoded.items)) { showToast('유효한 태스크 보드 공유 코드가 아닙니다.', 'error'); return; }
            router.navigate('tools-board', 'share:' + encodeSharePayload({ type: 'board', title: decoded.title, items: decoded.items }));
        }
        function copyBoardAsText() {
            const title = String(Storage.get('board_title', '') || '').trim() || '태스크 보드';
            const tasks = getBoardTasks();
            const items = Object.values(tasks);
            const lines = items.map(t => `${t.done ? '☑' : '☐'} ${t.title || '(내용 없음)'}`);
            const htmlTable = `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:'Malgun Gothic',sans-serif;font-size:11pt"><thead><tr style="background:#f1f5f9"><th>완료</th><th>[${escapeHTML(title)}] 할 일 항목</th></tr></thead><tbody>${items.map(t => `<tr><td align="center">${t.done ? '☑' : '☐'}</td><td>${escapeHTML(t.title || '(내용 없음)')}</td></tr>`).join('')}</tbody></table>`;
            copyRichTable(`[${title}]\n${lines.join('\n')}`, htmlTable, '메신저·문서 붙여넣기용 체크리스트(표 서식 포함)를 복사했습니다.');
        }

        function loadBoardPreset(type) {
            if(!confirm('현재 작성된 목록이 지워지고 템플릿이 불러와집니다. 진행할까요?')) return;
            let presetTitle = ''; let presetTasks = {};
            if(type === 'newSemester') { presetTitle = '3월 신학기 첫 주 체크리스트'; presetTasks = { 'p1': {title:'나이스 학급 편성 및 출석부 명렬표 출력', done:false}, 'p2': {title:'학생 응급연락망·알레르기·특이사항 조사서 배부', done:false}, 'p3': {title:'학급 규칙·1인 1역 정하기 및 사물함 번호표 부착', done:false}, 'p4': {title:'주간 시간표 입력 및 전담 시간표 확인', done:false}, 'p5': {title:'교과서 배부 및 학부모 총회 안내장 발송', done:false} }; }
            else if(type === 'openClass') { presetTitle = '동료장학 및 학부모 공개수업 준비'; presetTasks = { 'p1': {title:'수업 지도안 작성 및 내부 결재', done:false}, 'p2': {title:'학부모 안내장(참관 희망서) 발송', done:false}, 'p3': {title:'교실 환경 미화 및 게시물 정비', done:false}, 'p4': {title:'당일 다과 및 참관록 준비', done:false} }; }
            else if(type === 'fieldTrip') { presetTitle = '현장체험학습 인솔 사전·사후 점검'; presetTasks = { 'p1': {title:'사전답사 실시 및 내부결재(안전대책 포함)', done:false}, 'p2': {title:'차량·장소 계약 의뢰 및 학부모 동의서 취합', done:false}, 'p3': {title:'사전 안전교육 실시 및 구급낭·비상연락망 점검', done:false}, 'p4': {title:'다녀온 후 결과보고 및 정산 서류 제출', done:false} }; }
            else if(type === 'sportsDay') { presetTitle = '가을 체육대회(운동회) 세팅'; presetTasks = { 'p1': {title:'학년군별 경기 종목 확정', done:false}, 'p2': {title:'필요 체육 물품 에듀파인 품의', done:false}, 'p3': {title:'학부모회 도우미 협조 요청 공문', done:false}, 'p4': {title:'당일 우천 시 플랜B 및 동선 계획', done:false} }; }
            else if(type === 'recordsEnd') { presetTitle = '학기말 생활기록부 마감 점검'; presetTasks = { 'p1': {title:'출결 마감 및 증빙 서류 확인', done:false}, 'p2': {title:'교과 세특 및 창체 특기사항 입력', done:false}, 'p3': {title:'행동특성 및 종합의견 기재', done:false}, 'p4': {title:'동학년 선생님들과 상호 크로스체크', done:false} }; }
            if (!Storage.set('board_title', presetTitle) || !Storage.set('board_tasks', presetTasks)) return;
            showToast('템플릿을 성공적으로 불러왔습니다.'); router.render();
        }

        function renderBoardTasks(tasks) {
            const list = document.getElementById('board-list'); if(!list) return;
            const keys = Object.keys(tasks);
            if(keys.length === 0) { list.innerHTML = `<p class="text-sm text-slate-400 dark:text-slate-500 text-center py-6 leading-relaxed">아직 할 일이 없어요.<br>위에서 템플릿을 고르거나 <b>+ 새 할 일 추가</b>를 눌러 시작하세요.</p>`; return; }
            list.innerHTML = keys.map(k => `
                <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 group transition hover:border-emerald-300 dark:hover:border-emerald-500">
                    <div class="flex items-center gap-3 w-full">
                        <input type="checkbox" data-id="${escapeHTML(k)}" ${tasks[k].done ? 'checked' : ''} onchange="toggleBoardTask(this.dataset.id)" class="w-5 h-5 rounded text-emerald-600 border-slate-300 dark:border-slate-600 cursor-pointer">
                        <input type="text" data-id="${escapeHTML(k)}" value="${escapeHTML(tasks[k].title)}" onchange="updateBoardTaskTitle(this.dataset.id, this.value)" placeholder="할 일을 입력하세요" class="bg-transparent border-none outline-none w-full text-sm font-medium ${tasks[k].done ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200'}">
                    </div>
                    <button data-id="${escapeHTML(k)}" onclick="deleteBoardTask(this.dataset.id)" class="text-slate-400 hover:text-rose-500 opacity-50 hover:opacity-100 transition" aria-label="삭제"><i class="fa-solid fa-trash"></i></button>
                </div>
            `).join('');
        }

        function toggleBoardTask(id) { const tasks = getBoardTasks(); if(tasks[id]) tasks[id].done = !tasks[id].done; Storage.set('board_tasks', tasks); renderBoardTasks(tasks); }
        function updateBoardTaskTitle(id, title) { const tasks = getBoardTasks(); if(tasks[id]) tasks[id].title = title; Storage.set('board_tasks', tasks); }
        function deleteBoardTask(id) { const tasks = getBoardTasks(); delete tasks[id]; Storage.set('board_tasks', tasks); renderBoardTasks(tasks); }
        function addBoardTask() {
            const tasks = getBoardTasks();
            tasks['t_' + Date.now()] = { title: '', done: false };
            Storage.set('board_tasks', tasks);
            renderBoardTasks(tasks);
            setTimeout(() => {
                const inputs = document.querySelectorAll('#board-list input[type="text"]');
                if(inputs.length > 0) inputs[inputs.length - 1].focus();
            }, 50);
        }

        function renderToolsEdutech(container) {
            container.innerHTML = `
                <div class="space-y-6 animate-fade-in">
                    <div><h2 class="text-2xl font-bold mb-1 text-slate-900 dark:text-white">에듀테크 큐레이션</h2><p class="text-sm text-slate-500 dark:text-slate-400">수업 적용 AI 및 프롬프트 추천</p></div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${EDUTECH_TOOLS.map((tool, i) => `
                            <div class="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                                <div class="mb-4">
                                    <div class="flex justify-between items-start mb-2"><h3 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><i class="fa-solid fa-cube text-blue-500"></i> ${tool.name}</h3><a href="${tool.url}" target="_blank" rel="noopener noreferrer" class="text-xs bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-1 rounded font-bold">바로가기</a></div>
                                    <p class="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-4">${tool.desc}</p>
                                    <div class="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 relative group">
                                        <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-1">추천 프롬프트 예시</span>
                                        <p class="text-sm italic pr-8 text-slate-700 dark:text-slate-300">"${tool.prompt}"</p>
                                        <button onclick="copyText(EDUTECH_TOOLS[${i}].prompt, '복사되었습니다.')" class="absolute top-2 right-2 p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-500 hover:text-blue-500 shadow-sm transition" aria-label="프롬프트 복사"><i class="fa-solid fa-copy"></i></button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` + FOOTER_HTML;
        }

        let searchDisplayLimit = 60; let currentCategoryFilter = '전체'; let selectedAutocompleteIdx = -1;

        function renderSearch(container, initialQuery = '') {
            const queryStr = (initialQuery && initialQuery !== 'null') ? initialQuery : '';
            currentCategoryFilter = '전체'; searchDisplayLimit = 60;
            if (queryStr) saveRecentSearch(queryStr);

            container.innerHTML = `
                <div class="space-y-6 animate-fade-in">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <div><h2 class="text-2xl font-bold mb-1 text-slate-900 dark:text-white">교직어 검색</h2><p class="text-sm text-slate-500 dark:text-slate-400">${new Set(DB.map(item => canonicalTermId(item.id))).size}개 대표 교직어 · 일상 대화어 &amp; 초성 검색 지원</p></div>
                        <button type="button" onclick="openCalcModal()" class="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 text-xs font-extrabold hover:bg-indigo-100"><i class="fa-solid fa-calculator mr-1"></i>출석·병가·평일 계산기</button>
                    </div>
                    <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-3 relative w-full">
                        <div class="relative">
                            <input type="text" id="main-search-input" enterkeyhint="search" value="${escapeHTML(queryStr)}" placeholder="${narrowScreen() ? '용어·초성·일상어 검색' : "용어, 초성, 일상어('학생이 다쳤어요', '물건 살 때') 검색..."}" class="w-full pl-12 pr-20 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-blue-500" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="autocomplete-box">
                            <i class="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                            <div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                <button type="button" onclick="clearSearch()" id="clear-search-btn" class="text-slate-400 hover:text-slate-600 hidden" aria-label="검색어 지우기"><i class="fa-solid fa-circle-xmark"></i></button>
                                <button type="button" onclick="startVoiceSearch('main-search-input')" class="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition" title="음성으로 검색" aria-label="음성으로 검색"><i class="fa-solid fa-microphone"></i></button>
                            </div>
                            <div id="autocomplete-box" class="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 hidden z-30 overflow-y-auto max-h-60 hide-scrollbar"></div>
                        </div>

                        <!-- 일상 대화형 검색어 예시 칩 (1줄 스크롤) -->
                        <div class="flex flex-nowrap items-center gap-1.5 overflow-x-auto hide-scrollbar text-[11px]">
                            <span class="shrink-0 font-extrabold text-slate-400 dark:text-slate-500 mr-1">🗣️ 일상어 바로찾기:</span>
                            ${QUICK_CONVERSATIONAL_CHIPS.map(chip => `<button type="button" data-q="${escapeHTML(chip.query)}" onclick="applyQuickSearchChip(this.dataset.q)" class="shrink-0 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold transition">${escapeHTML(chip.label)}</button>`).join('')}
                        </div>

                        <div class="flex flex-nowrap gap-2 overflow-x-auto pb-1 hide-scrollbar w-full">
                            <button onclick="filterCategory('전체')" class="cat-btn shrink-0 whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 text-white" data-cat="전체">전체 (${new Set(DB.map(item => canonicalTermId(item.id))).size})</button>
                            ${Object.entries(ROLE_PRESETS).map(([rk, rv]) => `<button onclick="filterCategory('${rk}')" class="cat-btn shrink-0 whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition" data-cat="${rk}">${escapeHTML(rv.label)}</button>`).join('')}
                            ${FILTER_CATEGORIES.map(cat => `<button onclick="filterCategory('${cat}')" class="cat-btn shrink-0 whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition" data-cat="${cat}">${cat}</button>`).join('')}
                            <div class="shrink-0 w-2 md:w-4"></div>
                        </div>
                    </div>
                    <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 px-1">
                        <span id="result-count" class="whitespace-nowrap shrink-0">검색 결과: ${new Set(DB.map(item => canonicalTermId(item.id))).size}개</span>
                        <div class="flex items-center gap-1.5 sm:gap-2">
                            <button type="button" onclick="printTermCheatSheet('search')" class="whitespace-nowrap shrink-0 px-2.5 sm:px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-bold hover:bg-slate-200 transition" title="현재 목록을 A4 1장 요약표로 인쇄"><i class="fa-solid fa-print mr-1"></i>요약표 인쇄</button>
                            <button onclick="const c=curatedTerms(); openDetail(c[Math.floor(Math.random()*c.length)].id)" class="whitespace-nowrap shrink-0 px-2.5 sm:px-3 py-1 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg font-bold transition"><i class="fa-solid fa-dice"></i> 랜덤</button>
                            <select id="sort-select" onchange="handleSearch()" class="whitespace-nowrap shrink-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg px-2 sm:px-2.5 py-1 focus:outline-none"><option value="accuracy">관련도순</option><option value="name">가나다순</option></select>
                        </div>
                    </div>
                    <div id="search-smart-answer" class="hidden"></div>
                    <div id="search-results-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"></div>
                    <div id="search-related-results" class="space-y-4"></div>
                    <div id="load-more-container" class="text-center pt-4 hidden"><button onclick="searchDisplayLimit+=60;handleSearch();" class="px-6 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl">더 보기</button></div>
                </div>
            ` + FOOTER_HTML;
            const input = document.getElementById('main-search-input');
            if(input) {
                input.value = queryStr;
                input.addEventListener('input', debounce(() => { searchDisplayLimit = 60; handleSearch(); updateAutocomplete(input.value.trim()); }, 100));
                input.addEventListener('keydown', handleAcKeydown);
                input.addEventListener('blur', () => setTimeout(() => document.getElementById('autocomplete-box')?.classList.add('hidden'), 150));
            }
            handleSearch();
        }

        function filterCategory(cat) {
            currentCategoryFilter = cat; searchDisplayLimit = 60;
            document.querySelectorAll('.cat-btn').forEach(btn => {
                if (btn.getAttribute('data-cat') === cat) btn.className = "cat-btn shrink-0 whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 text-white";
                else btn.className = "cat-btn shrink-0 whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition";
            });
            handleSearch();
        }

        function clearSearch() { const input = document.getElementById('main-search-input'); if(input) { input.value = ''; searchDisplayLimit = 60; handleSearch(); document.getElementById('autocomplete-box')?.classList.add('hidden'); input.focus(); } }
        function applyQuickSearchChip(q) {
            const input = document.getElementById('main-search-input');
            if (input) {
                input.value = q;
                searchDisplayLimit = 60;
                handleSearch();
                document.getElementById('autocomplete-box')?.classList.add('hidden');
            }
        }

        function updateAutocomplete(query) {
            const acBox = document.getElementById('autocomplete-box');
            if(!acBox) return;
            if(!query) { acBox.classList.add('hidden'); return; }
            const qLower = normalizeSearch(query), qCompact = compactSearch(query);
            const seen = new Set();
            const matches = DB.filter(item => {
                const id = canonicalTermId(item.id);
                if (seen.has(id) || !(normalizeSearch(item._searchText).includes(qLower) || compactSearch(item._searchText).includes(qCompact) || compactSearch(item._chosung).includes(qCompact))) return false;
                seen.add(id); return true;
            }).map(canonicalTerm).slice(0, 8);
            selectedAutocompleteIdx = -1;
            if (matches.length === 0) { acBox.classList.add('hidden'); return; }
            acBox.innerHTML = matches.map((item, idx) => `<div onmousedown="selectAutocomplete(${item.id})" onclick="selectAutocomplete(${item.id})" class="ac-item px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-slate-700 text-xs font-medium cursor-pointer flex justify-between text-slate-800 dark:text-slate-200" data-index="${idx}"><span>${highlightText(item.keyword, query)}</span><span class="text-slate-400">${item.category}</span></div>`).join('');
            acBox.classList.remove('hidden');
        }

        function handleAcKeydown(e) {
            if (e.isComposing) return; // 한글 조합 중 Enter 중복 처리 방지
            const acBox = document.getElementById('autocomplete-box');
            const isOpen = acBox && !acBox.classList.contains('hidden');
            const items = isOpen ? acBox.querySelectorAll('.ac-item') : [];
            if(e.key === 'ArrowDown' && items.length) { e.preventDefault(); selectedAutocompleteIdx = Math.min(selectedAutocompleteIdx + 1, items.length - 1); updateAcHighlight(items); }
            else if(e.key === 'ArrowUp' && items.length) { e.preventDefault(); selectedAutocompleteIdx = Math.max(selectedAutocompleteIdx - 1, 0); updateAcHighlight(items); }
            else if(e.key === 'Enter') {
                if(items.length > 0 && selectedAutocompleteIdx >= 0 && selectedAutocompleteIdx < items.length) { e.preventDefault(); items[selectedAutocompleteIdx].dispatchEvent(new Event('mousedown')); }
                else { if(acBox) acBox.classList.add('hidden'); saveRecentSearch(e.target.value); }
            }
            else if(e.key === 'Escape') { if(acBox) acBox.classList.add('hidden'); }
        }

        function updateAcHighlight(items) { items.forEach((item, idx) => { if(idx === selectedAutocompleteIdx) { item.classList.add('bg-blue-50', 'dark:bg-slate-700'); item.scrollIntoView({ block: 'nearest' }); } else item.classList.remove('bg-blue-50', 'dark:bg-slate-700'); }); }
        function selectAutocomplete(id) {
            const item = DB.find(d => d.id === id); if (!item) return;
            const input = document.getElementById('main-search-input'); if(input) input.value = item.keyword;
            document.getElementById('autocomplete-box')?.classList.add('hidden');
            saveRecentSearch(item.keyword); searchDisplayLimit = 60; handleSearch();
        }

        function rankTerms(query, category = '전체', sort = 'accuracy') {
            query = normalizeSearch(query);
            let scoredResults = DB.map(item => {
                if (!matchesCategoryOrRole(item, category)) return { item, score: -1 };
                if (!query) return { item, score: 0 };
                let score = 0; const qLower = query; const kwLower = normalizeSearch(item.keyword);
                if (kwLower === qLower) score += 200; if (kwLower.startsWith(qLower)) score += 100; if (kwLower.includes(qLower)) score += 70;
                if (compactSearch(item.keyword) === compactSearch(query)) score += 180;
                if (compactSearch(item._chosung).includes(compactSearch(query))) score += 60; if ((item.aliases||[]).some(a => a.toLowerCase().includes(qLower))) score += 50;
                if ((item.tags||[]).some(t => t.toLowerCase().includes(qLower))) score += 40; if (item.simple.toLowerCase().includes(qLower)) score += 30;
                if (item.description.toLowerCase().includes(qLower)) score += 15; if ((item.situations||[]).some(s => s.toLowerCase().includes(qLower))) score += 10;
                if (compactSearch(item._searchText).includes(compactSearch(query))) score += 25;
                if (searchLinks(query)?.terms.some(tid => canonicalTermId(tid) === canonicalTermId(item.id))) score += 400;
                if (score > 0 && item._baseId) score -= 40; // 변형 항목은 기본 용어보다 뒤에
                return { item, score: score > 0 ? score : -1 };
            }).filter(res => res.score >= 0);
            const uniqueResults = new Map();
            for (const result of scoredResults) {
                const canonical = canonicalTerm(result.item);
                const previous = uniqueResults.get(canonical.id);
                if (!previous || result.score > previous.score) uniqueResults.set(canonical.id, { item: canonical, score: result.score });
            }
            scoredResults = [...uniqueResults.values()];

            if(sort === 'accuracy') scoredResults.sort((a, b) => b.score - a.score);
            else scoredResults.sort((a, b) => a.item.keyword.localeCompare(b.item.keyword, 'ko'));
            return scoredResults.map(result => result.item);
        }

        function handleSearch() {
            const input = document.getElementById('main-search-input');
            const rawQuery = input ? input.value : '';
            const query = normalizeSearch(rawQuery);
            const smartBox = document.getElementById('search-smart-answer');
            if (smartBox) {
                const smartHTML = buildSmartSearchAnswerHTML(rawQuery);
                smartBox.innerHTML = smartHTML;
                smartBox.classList.toggle('hidden', !smartHTML);
            }
            const sort = (document.getElementById('sort-select') && document.getElementById('sort-select').value) || 'accuracy';
            const clearBtn = document.getElementById('clear-search-btn');
            if (clearBtn) { if (query) clearBtn.classList.remove('hidden'); else clearBtn.classList.add('hidden'); }
            const results = rankTerms(query, currentCategoryFilter, sort);
            const countEl = document.getElementById('result-count'); if(countEl) countEl.innerText = `검색 결과: ${results.length}개`;
            const grid = document.getElementById('search-results-grid'); const loadMoreBtn = document.getElementById('load-more-container');
            if(!grid) return;
            const relatedBox = document.getElementById('search-related-results');
            if (relatedBox) {
                const linked = searchLinks(query);
                const matches = (item, fields) => fields.some(value => compactSearch(value).includes(compactSearch(query)));
                const situations = query ? SITUATIONS.filter(item => linked?.situations.includes(item.id) || matches(item, [item.title, item.summary, ...(item.relatedKeywords || [])])) : [];
                const courses = query ? NAVIGATOR_COURSES.filter(item => linked?.courses.includes(item.id) || matches(item, [item.title, item.targetKeyword, ...(item.steps || [])])) : [];
                const section = (title, items, view) => items.length ? `<section><h3 class="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">${title} ${items.length}개</h3><div class="grid grid-cols-1 md:grid-cols-2 gap-2">${items.map(item => `<button type="button" data-public-id="${escapeHTML(item.publicId)}" onclick="router.navigate('${view}', this.dataset.publicId)" class="text-left p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"><span class="block font-bold text-sm text-slate-900 dark:text-white">${escapeHTML(item.title)}</span><span class="block text-xs mt-1 text-slate-500 dark:text-slate-400">${escapeHTML(item.summary || item.targetKeyword || '')}</span></button>`).join('')}</div></section>` : '';
                relatedBox.innerHTML = section('상황별 안내', situations, 'situations') + section('업무 순서', courses, 'navigator');
            }

            if(results.length === 0) {
                if (query && !(relatedBox && relatedBox.textContent.trim())) Usage.noteZero(query);
                grid.innerHTML = `<div class="col-span-full py-8 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700"><h3 class="text-base font-bold text-slate-800 dark:text-slate-200">일치하는 교직어가 없어요</h3><div class="mt-4 flex justify-center gap-3"><button type="button" onclick="clearSearch()" class="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700">검색어 지우기</button><button type="button" onclick="router.navigate('situations')" class="px-3 py-2 rounded-lg bg-blue-600 text-white">상황 안내 보기</button></div><button type="button" onclick="openFeedback('request', document.getElementById('main-search-input')?.value || '')" class="mt-4 text-sm font-bold text-blue-600 dark:text-blue-400 underline">이 용어 추가 요청하기</button></div>`;
                loadMoreBtn?.classList.add('hidden'); return;
            }

            const bookmarks = (Storage.get('bookmarks', []) || []).map(canonicalTermId);
            grid.innerHTML = results.slice(0, searchDisplayLimit).map(item => {
                const hasNote = !!getTermNote(item.id);
                const topMetric = (item.metrics && item.metrics[0]) || '';
                return `
                <div onclick="openDetail(${item.id})" class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm hover:border-blue-500 dark:hover:border-blue-500 transition cursor-pointer flex flex-col justify-between group">
                    <div>
                        <div class="flex items-center justify-between gap-1.5 mb-2">
                            <div class="flex flex-wrap items-center gap-1.5">
                                <span class="text-xs font-semibold px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">${escapeHTML(item.category)}</span>
                                ${hasNote ? '<span class="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-md">📝 내 메모</span>' : ''}
                            </div>
                            <button onclick="event.stopPropagation(); toggleBookmark(${item.id})" class="text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 shrink-0" aria-label="즐겨찾기"><i class="fa-${bookmarks.includes(item.id) ? 'solid text-amber-500 dark:text-amber-400' : 'regular'} fa-bookmark"></i></button>
                        </div>
                        <h3 class="font-bold group-hover:text-blue-600 dark:group-hover:text-blue-400 mb-1 text-slate-800 dark:text-white">${highlightText(item.keyword, query)}</h3>
                        <p class="text-xs text-blue-600 dark:text-blue-400 mb-2">${highlightText(item.simple, query)}</p>
                        <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-2.5">${highlightText(item._shortDesc || item.description, query)}</p>
                    </div>
                    ${topMetric ? `<div class="pt-2 border-t border-slate-100 dark:border-slate-700/70 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400"><span class="truncate font-semibold">${escapeHTML(topMetric)}</span><span class="shrink-0 text-blue-600 dark:text-blue-400 font-bold">상세 →</span></div>` : ''}
                </div>`;
            }).join('');
            loadMoreBtn?.classList.toggle('hidden', results.length <= searchDisplayLimit);
        }

        let lastFocusedElement = null;

        // 정확히 일치하는 항목이 없으면 별칭/부분 일치로 찾고, 그래도 없으면 검색 화면으로 이동
        function openDetailByKeyword(kw) {
            const found = findItemByKeyword(kw);
            if(found) openDetail(found.id);
            else { showToast('정확한 항목이 없어 검색 결과로 이동합니다.', 'info'); router.navigate('search', kw); }
        }

        function openCareerInfo(type) {
            const modal = document.getElementById('detail-modal'); const content = document.getElementById('modal-content');
            if (!isModalOpen()) lastFocusedElement = document.activeElement;
            currentDetailId = null;
            let html = '';
            if (type === '수석교사') {
                html = `<div class="flex justify-between gap-2 mb-4 pb-4 border-b border-slate-100 dark:border-slate-700"><div><span class="text-xs font-bold px-3 py-1 bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 rounded-lg mb-2 inline-block whitespace-nowrap">수업 전문성 경로</span><h2 id="modal-title" class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">수업전문가 및 수석교사 제도</h2></div><button onclick="closeModal(false)" class="p-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition shrink-0 self-start" aria-label="닫기"><i class="fa-solid fa-xmark text-lg"></i></button></div><div class="space-y-6 text-sm text-slate-700 dark:text-slate-300"><p class="leading-relaxed">관리직(교감·교장)으로 진출하지 않고, 학생 가르치는 업무를 계속하면서 수업 전문성을 인정받는 경로입니다.</p><div class="bg-blue-50/50 dark:bg-slate-900/50 p-4 rounded-xl border border-blue-100 dark:border-slate-800"><h3 class="font-bold text-blue-700 dark:text-blue-400 mb-2"><i class="fa-solid fa-check"></i> 자격 요건 및 선발</h3><ul class="list-disc pl-5 space-y-1"><li><strong>지원 자격:</strong> 교육경력 15년 이상인 1급 정교사</li><li><strong>선발 절차:</strong> 서류 평가, 역량 평가, 동료 다면평가 등을 종합하여 교육청에서 선발</li></ul></div><div class="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700"><h3 class="font-bold text-slate-800 dark:text-white mb-2"><i class="fa-solid fa-chalkboard-user"></i> 주요 역할 및 혜택</h3><ul class="list-disc pl-5 space-y-1"><li>수업 시수 50% 경감</li><li>동료 교사 수업 컨설팅 지원</li><li>연구 활동비 매월 지급</li></ul></div><button onclick="openDetailByKeyword('수석교사')" class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow">관련 교직어 '수석교사' 상세보기 →</button></div>`;
            } else if (type === '장학사') {
                html = `<div class="flex justify-between gap-2 mb-4 pb-4 border-b border-slate-100 dark:border-slate-700"><div><span class="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400 rounded-lg mb-2 inline-block whitespace-nowrap">교육행정 경로</span><h2 id="modal-title" class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">교육전문직원 (장학사)</h2></div><button onclick="closeModal(false)" class="p-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition shrink-0 self-start" aria-label="닫기"><i class="fa-solid fa-xmark text-lg"></i></button></div><div class="space-y-6 text-sm text-slate-700 dark:text-slate-300"><p class="leading-relaxed">학교 현장이 아닌 시·도교육청 등에서 교육 정책을 기획하고 장학 업무를 수행하는 행정 전문가 경로입니다.</p><div class="bg-indigo-50/50 dark:bg-slate-900/50 p-4 rounded-xl border border-indigo-100 dark:border-slate-800"><h3 class="font-bold text-indigo-700 dark:text-indigo-400 mb-2"><i class="fa-solid fa-check"></i> 자격 요건 및 선발</h3><ul class="list-disc pl-5 space-y-1"><li><strong>지원 자격:</strong> 교육경력 10~15년 이상 충족</li><li><strong>선발 과정:</strong> 서류/기획안/논술 평가, 면접/토의 평가 등 엄격한 전형 진행</li></ul></div><div class="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700"><h3 class="font-bold text-slate-800 dark:text-white mb-2"><i class="fa-solid fa-building-columns"></i> 직무 특성</h3><ul class="list-disc pl-5 space-y-1"><li>관할 구역 단위의 거시적 업무 수행</li><li>방학 없이 일반 공무원과 동일한 복무 적용</li></ul></div><button onclick="openDetailByKeyword('장학사')" class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow">관련 교직어 '장학사' 상세보기 →</button></div>`;
            } else if (type === '교감') {
                html = `<div class="flex justify-between gap-2 mb-4 pb-4 border-b border-slate-100 dark:border-slate-700"><div><span class="text-xs font-bold px-3 py-1 bg-purple-50 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400 rounded-lg mb-2 inline-block whitespace-nowrap">학교 경영 경로</span><h2 id="modal-title" class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">교감 및 교장 승진</h2></div><button onclick="closeModal(false)" class="p-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition shrink-0 self-start" aria-label="닫기"><i class="fa-solid fa-xmark text-lg"></i></button></div><div class="space-y-6 text-sm text-slate-700 dark:text-slate-300"><p class="leading-relaxed">학교 조직의 교무를 통할하고 단위 학교의 최고 책임자로 나아가는 정통 관리자 경로입니다.</p><div class="bg-purple-50/50 dark:bg-slate-900/50 p-4 rounded-xl border border-purple-100 dark:border-slate-800"><h3 class="font-bold text-purple-700 dark:text-purple-400 mb-2"><i class="fa-solid fa-check"></i> 자격 연수 대상자 지명 (승진 점수)</h3><ul class="list-disc pl-5 space-y-1"><li><strong>경력평정:</strong> 교육경력 점수화</li><li><strong>근무성적평정(근평):</strong> 다면평가 및 관리자 평가 합산</li><li><strong>가산점:</strong> 도서벽지 근무, 보직교사(부장) 경력, 연구대회 입상 실적 등</li></ul></div><div class="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700"><h3 class="font-bold text-slate-800 dark:text-white mb-2"><i class="fa-solid fa-crown"></i> 임용 단계</h3><ul class="list-disc pl-5 space-y-1"><li>명부 순위에 따라 교감 자격 연수 대상자로 지명 후 승진</li><li>이후 교장 자격 연수 이수 혹은 공모제를 통해 학교장 취임</li></ul></div><div class="flex gap-2"><button onclick="openDetailByKeyword('교감')" class="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition shadow">교감 상세보기</button><button onclick="openDetailByKeyword('교장')" class="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition shadow">교장 상세보기</button></div></div>`;
            }
            content.innerHTML = html; modal.classList.remove('hidden'); document.body.style.overflow = 'hidden'; window.addEventListener('keydown', handleModalKeyDown); content.querySelector('button')?.focus();
        }

        function openDetail(id, pushHash = true) {
            const item = DB.find(d => d.id === canonicalTermId(id)); if(!item) return;
            if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking && ttsSpeakingId !== item.id) {
                try { window.speechSynthesis.cancel(); ttsSpeakingId = null; } catch (_) {}
            }
            applyTermEnrichment(item);
            if (currentDetailId !== item.id) Usage.event('detail_open');
            if (!isModalOpen()) lastFocusedElement = document.activeElement; // 연관어로 연쇄 이동해도 처음 위치로 포커스 복귀
            const modal = document.getElementById('detail-modal'); const content = document.getElementById('modal-content');
            const isBookmarked = Storage.get('bookmarks', []).some(saved => canonicalTermId(saved) === item.id);
            const recents = Storage.get('recent_views', []); Storage.set('recent_views', [item.id, ...recents.filter(i => i !== item.id)].slice(0, 15));
            currentDetailId = item.id;
            document.title = `${item.keyword} | 교직백서 1000`;

            if(pushHash) { const h = `#term=${encodeURIComponent(`term:${item.id}`)}`; if (window.location.hash !== h) window.location.hash = h; }
            const office = currentOffice();
            const customNote = getTermNote(item.id);
            const stars = '★'.repeat(Math.max(1, Math.min(3, item.difficulty || 1))) + '☆'.repeat(3 - Math.max(1, Math.min(3, item.difficulty || 1)));
            const lawUrl = `https://www.law.go.kr/lsSc.do?menuId=1&query=${encodeURIComponent(item.legalBasis?.query || item.keyword)}`;

            content.innerHTML = `
                <div class="mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                    <div class="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                        <div class="flex flex-wrap items-center gap-1.5">
                            <span class="whitespace-nowrap text-xs font-bold px-3 py-1 bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 rounded-lg">${escapeHTML(item.category)}</span>
                            <span class="whitespace-nowrap text-[11px] font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg" title="실무 난이도">난이도 ${stars}</span>
                            ${customNote ? '<span class="whitespace-nowrap text-[11px] font-bold px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-lg">📝 내 메모</span>' : ''}
                        </div>
                        <div class="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 shrink-0">
                            <button type="button" id="tts-detail-btn" onclick="speakTermDetail(${item.id})" class="whitespace-nowrap shrink-0 px-2.5 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl hover:text-blue-600 dark:hover:text-blue-400 transition flex items-center" title="설명 음성으로 듣기" aria-label="설명 음성으로 듣기"><i class="fa-solid fa-volume-high text-sm"></i><span class="text-xs font-bold ml-1 hidden sm:inline">듣기</span></button>
                            <button type="button" onclick="copyTermSummary(${item.id})" class="whitespace-nowrap shrink-0 px-2.5 py-2 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 rounded-xl hover:bg-blue-100 transition flex items-center" title="카톡·메신저 전달용 1장 요약 복사" aria-label="메신저용 요약 복사"><i class="fa-regular fa-copy text-sm"></i><span class="text-xs font-bold ml-1">요약복사</span></button>
                            <button type="button" onclick="togglePinTerm(${item.id})" class="shrink-0 p-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl hover:text-amber-500 dark:hover:text-amber-400 transition" title="홈 화면 고정핀에 추가/해제" aria-label="홈 화면 핀 고정"><i class="fa-solid fa-thumbtack text-sm ${isTermPinned(item.id) ? 'text-amber-500 dark:text-amber-400' : ' opacity-50'}"></i></button>
                            <button onclick="shareKeyword(${item.id})" class="shrink-0 p-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl hover:text-blue-500 dark:hover:text-blue-400 transition" aria-label="공유"><i class="fa-solid fa-share-nodes text-base"></i></button>
                            <button onclick="toggleBookmark(${item.id})" class="shrink-0 p-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl hover:text-amber-500 dark:hover:text-amber-400 transition" aria-label="즐겨찾기"><i class="fa-${isBookmarked ? 'solid text-amber-500 dark:text-amber-400' : 'regular'} fa-bookmark text-base"></i></button>
                            <button onclick="closeModal(true)" class="shrink-0 p-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition" aria-label="닫기"><i class="fa-solid fa-xmark text-base"></i></button>
                        </div>
                    </div>
                    <h2 id="modal-title" class="text-2xl font-extrabold text-slate-900 dark:text-white">${escapeHTML(item.keyword)}</h2>
                    ${item.aliases && item.aliases.length ? `<p class="text-xs text-slate-400 dark:text-slate-500 mt-1">별칭·유의어: ${item.aliases.map(escapeHTML).join(', ')}</p>` : ''}
                </div>
                <div class="space-y-5 text-sm text-slate-700 dark:text-slate-300">
                    ${item._baseId ? `<button onclick="openDetail(${item._baseId})" class="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition"><i class="fa-solid fa-link"></i> '${escapeHTML((DB.find(d => d.id === item._baseId) || {}).keyword || '')}' 항목과 같은 내용이에요. 기본 항목 보기 →</button>` : ''}

                    ${item.metrics && item.metrics.length ? `
                    <div class="flex flex-wrap gap-2" aria-label="핵심 기준 요약">
                        ${item.metrics.map(m => `<span class="px-3 py-1.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200/70 dark:border-indigo-800/60 text-indigo-800 dark:text-indigo-200 text-xs font-extrabold">${escapeHTML(m)}</span>`).join('')}
                    </div>` : ''}

                    <div class="p-4 bg-blue-50/60 dark:bg-slate-900/60 rounded-2xl border border-blue-100 dark:border-slate-800">
                        <span class="text-xs font-bold text-blue-600 dark:text-blue-400 block mb-1">💡 쉽게 말하면</span>
                        <p class="font-semibold text-slate-900 dark:text-slate-100">${escapeHTML(item.simple)}</p>
                    </div>
                    ${reviewPanelHTML(`term:${item.id}`)}

                    <div>
                        <span class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase block mb-1.5">📖 상세 실무 설명</span>
                        <p class="leading-relaxed text-slate-800 dark:text-slate-200">${escapeHTML(item.description)}</p>
                    </div>

                    ${item.tip ? `
                    <div class="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200">
                        <h4 class="font-extrabold text-xs mb-1.5 flex items-center gap-1.5 text-amber-800 dark:text-amber-300"><i class="fa-solid fa-lightbulb"></i> 엽쌤의 실무 팁</h4>
                        <p class="font-medium leading-relaxed text-xs sm:text-sm">${escapeHTML(item.tip)}</p>
                    </div>` : ''}

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        ${item.systemPath ? `
                        <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between gap-2">
                            <div>
                                <div class="flex items-center justify-between gap-2 mb-1">
                                    <span class="text-[11px] font-extrabold text-blue-600 dark:text-blue-400"><i class="fa-solid fa-desktop mr-1"></i>나이스 · K-에듀파인 경로</span>
                                    <button type="button" data-sys-path="${escapeHTML(item.systemPath)}" onclick="copyText(this.dataset.sysPath, '시스템 경로를 복사했습니다.')" class="text-[11px] font-bold text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 underline">복사</button>
                                </div>
                                <p class="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug break-keep">${escapeHTML(item.systemPath)}</p>
                            </div>
                        </div>` : ''}
                        ${item.partner ? `
                        <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 space-y-1">
                            <span class="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 block"><i class="fa-solid fa-handshake-angle mr-1"></i>교내외 협의 파트너</span>
                            <p class="text-xs text-slate-700 dark:text-slate-200"><b>교내:</b> ${escapeHTML(item.partner.school)}</p>
                            <p class="text-xs text-slate-500 dark:text-slate-400"><b>교육청·외부:</b> ${escapeHTML(item.partner.external)}</p>
                        </div>` : ''}
                    </div>

                    ${(item.steps && item.steps.length) ? `
                    <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 space-y-3">
                        <span class="text-xs font-extrabold text-slate-800 dark:text-slate-100 block"><i class="fa-solid fa-list-ol text-blue-500 mr-1.5"></i>실무 처리 3단계 순서</span>
                        <div class="space-y-2.5">
                            ${item.steps.map((st, idx) => `
                                <div class="flex items-start gap-2.5 text-xs">
                                    <span class="w-5 h-5 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center shrink-0 mt-0.5">${idx + 1}</span>
                                    <span class="text-slate-700 dark:text-slate-200 leading-relaxed">${escapeHTML(st)}</span>
                                </div>
                            `).join('')}
                        </div>
                        ${(item.docs && item.docs.length) ? `
                        <div class="pt-2.5 border-t border-slate-200/70 dark:border-slate-700/70">
                            <span class="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1.5"><i class="fa-regular fa-folder-open mr-1"></i>필수 구비 · 증빙 서류</span>
                            <div class="flex flex-wrap gap-1.5">
                                ${item.docs.map(doc => `<span class="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300">${escapeHTML(doc)}</span>`).join('')}
                            </div>
                        </div>` : ''}
                    </div>` : ''}

                    ${(item.toolLinks && item.toolLinks.length) ? `
                    <div>
                        <span class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase block mb-2">🔗 관련 실무 도구 · 양식 바로가기</span>
                        <div class="flex flex-wrap gap-2">
                            ${item.toolLinks.map(tl => `
                                <button type="button" data-view="${escapeHTML(tl.view)}" data-param="${escapeHTML(tl.param || '')}" onclick="const v=this.dataset.view, p=this.dataset.param||null; closeModal(false); router.navigate(v, p);" class="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5">
                                    <i class="fa-solid ${escapeHTML(tl.icon || 'fa-arrow-up-right-from-square')}"></i>
                                    <span>${escapeHTML(tl.label)} →</span>
                                </button>
                            `).join('')}
                            ${['학적·출결', '복무·휴가', '현장체험학습'].includes(item.category) ? `<button type="button" onclick="const cat='${escapeHTML(item.category)}'; closeModal(true); openCalcModal(cat==='복무·휴가'?'sick':cat==='현장체험학습'?'trip':'att');" class="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5"><i class="fa-solid fa-calculator"></i><span>실무 일수·병가 계산기 열기 →</span></button>` : ''}
                        </div>
                    </div>` : ''}

                    ${['학적·출결', '복무·휴가', '현장체험학습'].includes(item.category) ? `
                    <details class="p-3.5 rounded-2xl bg-indigo-50/40 dark:bg-slate-900 border border-indigo-200/70 dark:border-slate-700 text-xs">
                        <summary class="font-extrabold text-indigo-800 dark:text-indigo-300 cursor-pointer select-none whitespace-nowrap"><i class="fa-solid fa-calculator mr-1.5"></i>이 창에서 바로 일수·시간 계산하기</summary>
                        <div class="pt-3 mt-2.5 border-t border-indigo-200/60 dark:border-slate-700 space-y-2.5">
                            ${item.category === '복무·휴가' ? `
                                <div class="grid grid-cols-3 gap-2">
                                    <label class="font-bold text-slate-600 dark:text-slate-300">병가 일수<input id="inl-sick-d" type="number" min="0" value="4" oninput="const r=calcSickLeave6(this.value,document.getElementById('inl-sick-h').value,document.getElementById('inl-sick-m').value); document.getElementById('inl-calc-out').textContent=r.usedLabel+' · '+r.remainLabel;" class="mt-1 w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"></label>
                                    <label class="font-bold text-slate-600 dark:text-slate-300">시간<input id="inl-sick-h" type="number" min="0" value="5" oninput="const r=calcSickLeave6(document.getElementById('inl-sick-d').value,this.value,document.getElementById('inl-sick-m').value); document.getElementById('inl-calc-out').textContent=r.usedLabel+' · '+r.remainLabel;" class="mt-1 w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"></label>
                                    <label class="font-bold text-slate-600 dark:text-slate-300">분<input id="inl-sick-m" type="number" min="0" value="30" oninput="const r=calcSickLeave6(document.getElementById('inl-sick-d').value,document.getElementById('inl-sick-h').value,this.value); document.getElementById('inl-calc-out').textContent=r.usedLabel+' · '+r.remainLabel;" class="mt-1 w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"></label>
                                </div>
                                <p id="inl-calc-out" class="font-extrabold text-indigo-700 dark:text-indigo-300">${escapeHTML(calcSickLeave6(4,5,30).usedLabel + ' · ' + calcSickLeave6(4,5,30).remainLabel)}</p>
                            ` : `
                                <div class="grid grid-cols-2 gap-2">
                                    <label class="font-bold text-slate-600 dark:text-slate-300">연간 수업일수<input id="inl-att-t" type="number" min="1" value="190" oninput="const r=calcAttendance23(this.value,document.getElementById('inl-att-a').value); document.getElementById('inl-calc-out').textContent='수료 기준 출석 '+r.requiredDays+'일 이상 (결석 허용 최대 '+r.maxAbsentDays+'일 · 잔여 여유 '+r.remainAllowance+'일)';" class="mt-1 w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"></label>
                                    <label class="font-bold text-slate-600 dark:text-slate-300">현재 결석일수<input id="inl-att-a" type="number" min="0" value="0" oninput="const r=calcAttendance23(document.getElementById('inl-att-t').value,this.value); document.getElementById('inl-calc-out').textContent='수료 기준 출석 '+r.requiredDays+'일 이상 (결석 허용 최대 '+r.maxAbsentDays+'일 · 잔여 여유 '+r.remainAllowance+'일)';" class="mt-1 w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"></label>
                                </div>
                                <p id="inl-calc-out" class="font-extrabold text-indigo-700 dark:text-indigo-300">수료 기준 출석 127일 이상 (결석 허용 최대 63일 · 잔여 여유 63일)</p>
                            `}
                        </div>
                    </details>` : ''}

                    ${item.vsGroup ? `
                    <div class="p-4 rounded-2xl bg-purple-50/50 dark:bg-slate-900 border border-purple-200/70 dark:border-slate-700 space-y-2.5">
                        <div class="flex items-center justify-between gap-2">
                            <span class="text-xs font-extrabold text-purple-800 dark:text-purple-300"><i class="fa-solid fa-scale-balanced mr-1.5"></i>${escapeHTML(item.vsGroup.title)}</span>
                            <span class="text-[10px] font-bold text-purple-600 dark:text-purple-400 shrink-0 whitespace-nowrap">클릭 시 이동</span>
                        </div>
                        <div class="space-y-2">
                            ${item.vsGroup.rows.map(row => {
                                const isCurrent = row.id === item.id;
                                return `
                                <div onclick="${isCurrent ? '' : `openDetail(${row.id})`}" class="p-3 rounded-xl border ${isCurrent ? 'bg-white dark:bg-slate-800 border-purple-400 dark:border-purple-500 ring-1 ring-purple-400/30' : 'bg-white/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-purple-400 cursor-pointer'} transition">
                                    <div class="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                                        <span class="text-xs font-extrabold whitespace-nowrap ${isCurrent ? 'text-purple-700 dark:text-purple-300' : 'text-slate-800 dark:text-slate-100'}">${escapeHTML(row.kw)} ${isCurrent ? '<span class="ml-1 px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-[10px] text-purple-700 dark:text-purple-300 whitespace-nowrap">현재 용어</span>' : ''}</span>
                                        <span class="text-[10px] font-semibold text-slate-400 dark:text-slate-500 whitespace-nowrap">${escapeHTML(row.timing)}</span>
                                    </div>
                                    <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">${escapeHTML(row.point)}</p>
                                </div>`;
                            }).join('')}
                        </div>
                    </div>` : ''}

                    ${(item.faq && item.faq.length) ? `
                    <div class="space-y-2">
                        <span class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase block">❓ 선생님 단골 질문 Q&amp;A</span>
                        ${item.faq.map(f => `
                            <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 space-y-1.5">
                                <p class="text-xs font-extrabold text-slate-800 dark:text-slate-100"><span class="text-rose-500 mr-1">Q.</span>${escapeHTML(f.q)}</p>
                                <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed"><span class="font-extrabold text-blue-600 dark:text-blue-400 mr-1">A.</span>${escapeHTML(f.a)}</p>
                            </div>
                        `).join('')}
                    </div>` : ''}

                    ${item.legalBasis ? `
                    <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div class="space-y-0.5">
                            <span class="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 block"><i class="fa-solid fa-gavel mr-1"></i>근거 법령 및 공식 지침</span>
                            <p class="text-xs font-bold text-slate-800 dark:text-slate-200">${escapeHTML(item.legalBasis.law)}</p>
                            <p class="text-[11px] text-slate-500 dark:text-slate-400">${escapeHTML(item.legalBasis.guide)}</p>
                        </div>
                        <a href="${escapeHTML(lawUrl)}" target="_blank" rel="noopener noreferrer" class="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0 text-center">국가법령정보센터 원문 ↗</a>
                    </div>` : ''}

                    ${item.situations && item.situations.length > 0 ? `<div><span class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase block mb-2">🏫 언제 쓰나요?</span><div class="space-y-2">${item.situations.map(sit => `<div class="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-2"><i class="fa-solid fa-circle-check text-blue-500 dark:text-blue-400 text-xs"></i> <span class="font-medium text-slate-800 dark:text-slate-200">${escapeHTML(sit)}</span></div>`).join('')}</div></div>` : ''}
                    ${item.related && item.related.length > 0 ? `<div><span class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase block mb-2">🔗 관련 교직어</span><div class="flex flex-wrap gap-2">${item.related.map(rel => { const found = DB.find(d => d.keyword === rel); return found ? `<button onclick="openDetail(${found.id})" class="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-xl text-xs font-semibold hover:text-blue-600 dark:hover:text-blue-400 text-slate-800 dark:text-slate-200 transition">${escapeHTML(rel)}</button>` : ''; }).join('')}</div></div>` : ''}
                    ${item.tags && item.tags.length > 0 ? `<div><span class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase block mb-2">🏷 관련 태그</span><div class="flex flex-wrap gap-1.5">${item.tags.map(t => `<span class="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-600">#${escapeHTML(t)}</span>`).join('')}</div></div>` : ''}

                    <div class="p-4 rounded-2xl bg-emerald-50/50 dark:bg-slate-900 border border-emerald-200/80 dark:border-slate-700 space-y-2.5">
                        <div class="flex flex-wrap items-center justify-between gap-1.5">
                            <label for="term-custom-note" class="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 whitespace-nowrap"><i class="fa-solid fa-pen-to-square mr-1"></i>우리 학교 기준 메모장</label>
                            <span class="text-[10px] font-semibold text-slate-400 whitespace-nowrap">이 기기에 저장 · 백업 포함</span>
                        </div>
                        <textarea id="term-custom-note" rows="2" maxlength="1000" placeholder="예: 우리 학교 교외체험학습은 연 20일 한도(3일 전 신청) / 행정실 품의는 매월 20일 마감 등 학교별 특이사항을 적어 두세요." class="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 resize-y">${escapeHTML(customNote)}</textarea>
                        <div class="flex justify-end gap-2">
                            ${customNote ? `<button type="button" onclick="saveTermNote(${item.id}, '')" class="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold">메모 지우기</button>` : ''}
                            <button type="button" onclick="saveTermNote(${item.id}, document.getElementById('term-custom-note')?.value)" class="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition">메모 저장</button>
                        </div>
                    </div>

                    <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2">
                        <div><i class="fa-solid fa-triangle-exclamation mr-1"></i> 지침은 시도교육청별로 다를 수 있습니다. <button type="button" onclick="openFeedback('error', DB.find(d => d.id === ${item.id})?.keyword || '', 'term:${item.id}')" class="ml-1 font-bold text-rose-600 dark:text-rose-400 underline">내용이 틀렸나요?</button></div>
                        <div class="flex items-center gap-3 shrink-0">
                            ${office ? `<a href="${escapeHTML(office.url)}" target="_blank" rel="noopener noreferrer" class="font-bold text-amber-700 dark:text-amber-300 hover:underline">${escapeHTML(office.name)} 바로가기 ↗</a>` : `<button type="button" onclick="closeModal(true); openSetupWizard()" class="font-bold text-emerald-600 dark:text-emerald-400 hover:underline">소속 교육청 설정</button>`}
                            <button onclick="router.navigate('search', DB.find(d => d.id === ${item.id}).keyword)" class="font-bold underline hover:text-blue-600 transition">탐험 시작</button>
                        </div>
                    </div>
                </div>
            `;
            modal.classList.remove('hidden'); document.body.style.overflow = 'hidden';
            content.scrollTop = 0;
            window.addEventListener('keydown', handleModalKeyDown);
            content.querySelector('button')?.focus();
        }

        function handleModalKeyDown(e) {
            const cp = document.getElementById('command-palette-modal');
            const sw = document.getElementById('setup-wizard-modal');
            const mm = document.getElementById('mobile-menu-modal');
            if ((cp && !cp.classList.contains('hidden')) || (sw && !sw.classList.contains('hidden')) || (mm && !mm.classList.contains('hidden')) || document.querySelector('.yq-back, .ysi-back')) return;
            if(e.key === 'Escape') { closeModal(true); return; }
            if (e.key !== 'Tab') return;
            const modal = document.getElementById('detail-modal');
            const controls = [...modal.querySelectorAll('button, a[href], input, textarea, select, [tabindex]:not([tabindex="-1"])')].filter(el => el.getClientRects().length);
            if (!controls.length) return;
            if (e.shiftKey && document.activeElement === controls[0]) { e.preventDefault(); controls.at(-1).focus(); }
            else if (!e.shiftKey && document.activeElement === controls.at(-1)) { e.preventDefault(); controls[0].focus(); }
        }
        function closeModal(popHash = true) {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
                try { window.speechSynthesis.cancel(); ttsSpeakingId = null; } catch (_) {}
            }
            const modal = document.getElementById('detail-modal'); if(modal) modal.classList.add('hidden');
            currentDetailId = null;
            // body는 원래 overflow-hidden 클래스이므로 'auto'로 덮어쓰지 않고 인라인 스타일만 제거
            document.body.style.overflow = ''; window.removeEventListener('keydown', handleModalKeyDown);
            document.title = `${({start:'역할별 시작 코스',home:'홈',search:'교직어 검색',situations:'상황 가이드',navigator:'교직 내비게이터',year:'교사의 1년','tools-doc':'문서 양식','tools-record':'생기부 문장 도우미',counsel:'상담 기록장',mybox:'나의 교직함'})[router.current] || '교직 도구'} | 교직백서 1000`;
            if(lastFocusedElement && document.body.contains(lastFocusedElement)) { try { lastFocusedElement.focus(); } catch(e) {} }
            lastFocusedElement = null;
            // 검색어(param)를 유지한 채 주소만 되돌림 → 닫을 때 검색 화면이 초기화되던 문제 해결
            if(popHash && (window.location.hash.startsWith('#keyword=') || window.location.hash.startsWith('#term='))) history.replaceState(null, '', buildHash(router.current, router.param));
        }

        function shareKeyword(id) {
            const item = DB.find(d => d.id === id); if (!item) return;
            const shareUrl = window.location.href.split('#')[0] + `#term=${encodeURIComponent(`term:${canonicalTermId(item.id)}`)}`;
            if(navigator.share) navigator.share({ title: `교직백서 - ${item.keyword}`, url: shareUrl }).catch(()=>{});
            else copyText(shareUrl, '링크 복사 완료');
        }

        function toggleBookmark(id) {
            let b = Storage.get('bookmarks', []);
            const canonical = canonicalTermId(id);
            const exists = b.some(saved => canonicalTermId(saved) === canonical);
            if(exists) b = b.filter(saved => canonicalTermId(saved) !== canonical);
            else b.push(canonical);
            if (!Storage.set('bookmarks', b)) return;
            showToast(exists ? '즐겨찾기 해제' : '즐겨찾기 저장', exists ? 'info' : 'success');
            updateBookmarkBadge();
            if (isModalOpen() && currentDetailId === canonical) openDetail(canonical, false);
            // 검색 화면은 전체 재렌더링 대신 결과만 갱신 (입력한 검색어·필터 유지)
            if (router.current === 'search') handleSearch();
            else if (router.current === 'mybox') router.render();
        }

        function renderSituations(container) {
            container.innerHTML = `
                <div class="space-y-6 animate-fade-in">
                    <div><h2 class="text-2xl font-bold tracking-tight mb-1 text-slate-900 dark:text-white">이럴 땐 어떻게?</h2><p class="text-sm text-slate-500 dark:text-slate-400">학교 현장의 당황스러운 순간, 실전 대응 가이드와 양식·업무 순서를 바로 연결해 드립니다.</p></div>
                    <div class="relative max-w-md"><input type="text" id="situation-search-input" enterkeyhint="search" placeholder="다침, 학폭, 예산 검색" class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-blue-500"><i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i></div>
                    <div id="situations-grid" class="grid grid-cols-1 lg:grid-cols-2 gap-4"></div>
                </div>
            ` + FOOTER_HTML;
            const sitInput = document.getElementById('situation-search-input');
            if (sitInput) sitInput.addEventListener('input', debounce(() => updateSituationsGrid(sitInput.value.trim()), 150));
            updateSituationsGrid('');
        }

        function updateSituationsGrid(filterQuery) {
            const grid = document.getElementById('situations-grid'); if(!grid) return;
            const q = filterQuery.toLowerCase();
            const has = v => String(v || '').toLowerCase().includes(q);
            const filtered = SITUATIONS.filter(sit => !q || has(sit.title) || has(sit.category) || has(sit.summary) || sit.steps.some(has) || sit.firstCheck.some(has) || sit.caution.some(has));
            if(filtered.length === 0) { grid.innerHTML = `<div class="col-span-full text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700"><p class="text-slate-400 text-sm">검색 결과가 없습니다.</p></div>`; return; }
            const chips = (arr, cls) => arr.map(x => `<span class="px-2 py-1 rounded-lg text-[11px] font-semibold ${cls}">${escapeHTML(x)}</span>`).join('');

            grid.innerHTML = filtered.map(sit => {
                const kw = sit.relatedKeywords[0];
                const act = SITUATION_ACTION_MAP[sit.id] || {};
                const courseIdx = act.course || act.nav;
                const navPublicId = courseIdx ? NAVIGATOR_COURSES[courseIdx - 1]?.publicId : '';
                return `
                <div id="situation-${escapeHTML(sit.publicId)}" class="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl border ${router.param && (sit.publicId === router.param || String(sit.id) === router.param) ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200/80 dark:border-slate-700'} shadow-sm flex flex-col justify-between hover:border-blue-300 transition group">
                    <div>
                        <span class="text-xs font-bold px-3 py-1 bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-lg mb-3 inline-block">${escapeHTML(sit.category)}</span>
                        <h3 class="text-base sm:text-lg font-bold tracking-tight mb-2 text-slate-900 dark:text-white">${escapeHTML(sit.title)}</h3>
                        <p class="text-[11px] text-amber-700 dark:text-amber-300 mb-2">${reviewLabel(sit.publicId)}</p>
                        ${sit.summary ? `<p class="text-xs text-slate-500 dark:text-slate-400 mb-4">${escapeHTML(sit.summary)}</p>` : ''}
                        ${sit.firstCheck.length ? `<div class="flex flex-wrap items-center gap-1.5 mb-3"><span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mr-1">먼저 확인</span>${chips(sit.firstCheck, 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300')}</div>` : ''}
                        ${sit.script ? `
                        <div class="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 mb-4 relative">
                            <div class="flex items-center justify-between mb-1">
                                <span class="text-[10px] font-bold text-slate-400 uppercase"><i class="fa-solid fa-phone"></i> 실전 통화 스크립트</span>
                                <button type="button" data-script="${escapeHTML(sit.script)}" onclick="copyText(this.dataset.script, '통화 스크립트를 복사했습니다.')" class="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"><i class="fa-regular fa-copy"></i> 스크립트 복사</button>
                            </div>
                            <p class="text-sm font-medium text-slate-700 dark:text-slate-300 italic">"${escapeHTML(sit.script)}"</p>
                        </div>` : ''}
                        <div class="space-y-2 mb-4">${sit.steps.map((st, i) => `<div class="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300"><span class="w-5 h-5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-bold shrink-0">${i+1}</span><span class="pt-0.5">${escapeHTML(st)}</span></div>`).join('')}</div>
                        ${sit.caution.length ? `<div class="flex flex-wrap items-center gap-1.5 mb-4"><span class="text-[10px] font-bold text-rose-500 mr-1"><i class="fa-solid fa-triangle-exclamation"></i> 주의</span>${chips(sit.caution, 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300')}</div>` : ''}
                    </div>
                    <div>
                        ${(() => { const pr = situationProgress(sit); return `<button type="button" data-public-id="${escapeHTML(sit.publicId)}" onclick="openSituationRun(this.dataset.publicId)" class="w-full mb-3 min-h-[44px] px-4 rounded-xl ${pr ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'} text-white text-sm font-bold flex items-center justify-between gap-2"><span><i class="fa-solid fa-list-check mr-1.5"></i>${pr ? '이어서 처리하기' : '단계별로 처리하기'}</span>${pr ? `<span class="text-xs font-extrabold bg-white/20 px-2 py-0.5 rounded-lg">${pr.done}/${pr.total}</span>` : ''}</button>`; })()}
                        ${kw ? `<div class="pt-4 border-t border-slate-100 dark:border-slate-700">
                            <button data-kw="${escapeHTML(kw)}" onclick="openDetailByKeyword(this.dataset.kw)" class="text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:underline w-full text-left">핵심 교직어 '${escapeHTML(kw)}' 상세보기 →</button>
                        </div>` : ''}
                        ${(navPublicId || act.doc) ? `<div class="mt-2.5 flex flex-wrap gap-2">${navPublicId ? `<button type="button" data-public-id="${escapeHTML(navPublicId)}" onclick="router.navigate('navigator', this.dataset.publicId)" class="text-xs font-bold px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition"><i class="fa-solid fa-route mr-1"></i>업무 순서 보기 →</button>` : ''}${act.doc ? `<button type="button" onclick="router.navigate('tools-doc', '${act.doc}')" class="text-xs font-bold px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition"><i class="fa-solid fa-file-signature mr-1"></i>${escapeHTML(act.docLabel || '관련 양식 바로 쓰기')} →</button>` : ''}</div>` : ''}
                    </div>
                </div>`;
            }).join('');
            if (router.param) requestAnimationFrame(() => document.getElementById(`situation-${SITUATIONS.find(item => item.publicId === router.param || String(item.id) === router.param)?.publicId}`)?.scrollIntoView({ block: 'start' }));
        }

        // 상황 가이드 단계별 처리: 체크한 시각만 이 기기에 저장 (메모·이름 등 자유 입력 없음)
        function situationRuns() { const r = Storage.get('situation_runs', {}); return r && typeof r === 'object' && !Array.isArray(r) ? r : {}; }
        function situationRunItems(sit) {
            return [
                ...sit.firstCheck.map((text, i) => ({ key: `f${i}`, group: '먼저 확인', text })),
                ...sit.steps.map((text, i) => ({ key: `s${i}`, group: '처리 단계', text, n: i + 1 }))
            ];
        }
        function situationProgress(sit) {
            const run = situationRuns()[sit.publicId]; if (!run) return null;
            const items = situationRunItems(sit);
            const done = items.filter(it => run.checks?.[it.key]).length;
            return { run, done, total: items.length };
        }
        function hhmm(iso) { const d = new Date(iso); return isNaN(d) ? '' : `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }
        function openSituationRun(publicId) {
            const sit = SITUATIONS.find(item => item.publicId === publicId); if (!sit) return;
            const m = document.getElementById('setup-wizard-modal'); const c = document.getElementById('setup-wizard-content'); if (!m || !c) return;
            const runs = situationRuns();
            if (!runs[publicId]) { runs[publicId] = { startedAt: new Date().toISOString(), checks: {} }; Storage.set('situation_runs', runs); Usage.event('situation_run'); }
            const run = runs[publicId];
            const items = situationRunItems(sit);
            const done = items.filter(it => run.checks[it.key]).length;
            const pct = Math.round(done / items.length * 100);
            const act = SITUATION_ACTION_MAP[sit.id] || {};
            const row = it => `
                        <label class="flex items-start gap-3 min-h-[48px] p-3 rounded-xl border cursor-pointer ${run.checks[it.key] ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}">
                            <input type="checkbox" ${run.checks[it.key] ? 'checked' : ''} onchange="toggleSituationStep('${escapeHTML(publicId)}', '${it.key}')" class="w-5 h-5 mt-0.5 shrink-0 accent-emerald-600">
                            <span class="flex-1 text-sm ${run.checks[it.key] ? 'text-slate-500 dark:text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100 font-semibold'}">${it.n ? `<b class="mr-1">${it.n}.</b>` : ''}${escapeHTML(it.text)}</span>
                            ${run.checks[it.key] ? `<span class="shrink-0 text-xs font-bold text-emerald-700 dark:text-emerald-300">${hhmm(run.checks[it.key])}</span>` : ''}
                        </label>`;
            c.innerHTML = `
                <div class="space-y-4">
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <span class="text-xs font-bold px-2.5 py-1 bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-lg">${escapeHTML(sit.category)}</span>
                            <h3 id="setup-wizard-title" class="text-xl font-black text-slate-900 dark:text-white mt-2">${escapeHTML(sit.title)}</h3>
                            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">시작 ${hhmm(run.startedAt)} · 체크하면 시각이 기록돼요</p>
                        </div>
                        <button type="button" onclick="closeSetupWizard(); if (router.current === 'situations') updateSituationsGrid(document.getElementById('situation-search-input')?.value.trim() || '')" class="shrink-0 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700" aria-label="닫기"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="flex items-center gap-3"><div class="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden" aria-hidden="true"><div class="h-full bg-emerald-500" style="width:${pct}%"></div></div><span class="text-sm font-extrabold text-emerald-700 dark:text-emerald-300">${done}/${items.length}</span></div>
                    ${sit.firstCheck.length ? `<div class="space-y-2"><h4 class="text-xs font-extrabold text-emerald-700 dark:text-emerald-300">먼저 확인</h4>${items.filter(it => it.group === '먼저 확인').map(row).join('')}</div>` : ''}
                    <div class="space-y-2"><h4 class="text-xs font-extrabold text-blue-700 dark:text-blue-300">처리 단계</h4>${items.filter(it => it.group === '처리 단계').map(row).join('')}</div>
                    ${sit.caution.length ? `<div class="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 text-xs text-rose-800 dark:text-rose-200"><b>주의</b> · ${sit.caution.map(escapeHTML).join(' · ')}</div>` : ''}
                    <div class="flex flex-wrap gap-2">
                        ${sit.script ? `<button type="button" data-script="${escapeHTML(sit.script)}" onclick="copyText(this.dataset.script, '통화 스크립트를 복사했습니다.')" class="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200">통화 스크립트 복사</button>` : ''}
                        ${act.doc ? `<button type="button" onclick="closeSetupWizard(); router.navigate('tools-doc', '${escapeHTML(act.doc)}')" class="px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-xs font-bold text-blue-700 dark:text-blue-300">관련 서식 열기</button>` : ''}
                        ${sit.relatedKeywords[0] ? `<button type="button" data-kw="${escapeHTML(sit.relatedKeywords[0])}" onclick="closeSetupWizard(); openDetailByKeyword(this.dataset.kw)" class="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200">'${escapeHTML(sit.relatedKeywords[0])}' 설명</button>` : ''}
                    </div>
                    <div class="flex flex-wrap justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                        <button type="button" onclick="resetSituationRun('${escapeHTML(publicId)}')" class="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-rose-600">처음부터 다시</button>
                        <button type="button" onclick="copySituationLog('${escapeHTML(publicId)}')" class="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold">처리 경과 복사</button>
                    </div>
                    <p class="text-[11px] text-slate-400 dark:text-slate-500">체크한 시각만 이 기기에 저장됩니다. 경과를 복사해 보고서·기록에 붙여 넣을 때 학생 이름은 직접 채워 주세요.</p>
                </div>`;
            m.classList.remove('hidden');
        }
        function toggleSituationStep(publicId, key) {
            const runs = situationRuns(); const run = runs[publicId]; if (!run) return;
            if (run.checks[key]) delete run.checks[key]; else run.checks[key] = new Date().toISOString();
            run.updatedAt = new Date().toISOString();
            Storage.set('situation_runs', runs);
            openSituationRun(publicId);
        }
        function resetSituationRun(publicId) {
            if (!confirm('체크한 기록을 지우고 처음부터 다시 할까요?')) return;
            const runs = situationRuns(); delete runs[publicId]; Storage.set('situation_runs', runs);
            closeSetupWizard();
            if (router.current === 'situations') updateSituationsGrid(document.getElementById('situation-search-input')?.value.trim() || '');
            showToast('기록을 지웠습니다.');
        }
        function copySituationLog(publicId) {
            const sit = SITUATIONS.find(item => item.publicId === publicId); const run = situationRuns()[publicId]; if (!sit || !run) return;
            const day = new Date(run.startedAt);
            const items = situationRunItems(sit);
            const lines = [`[${sit.title}] 처리 경과`, `시작: ${koreanDate(day)} ${hhmm(run.startedAt)}`, ''];
            items.forEach(it => lines.push(`${run.checks[it.key] ? `✔ ${hhmm(run.checks[it.key])}` : '☐ --:--'}  ${it.group === '먼저 확인' ? '(확인) ' : `${it.n}. `}${it.text}`));
            const htmlTable = `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:'Malgun Gothic',sans-serif;font-size:11pt"><thead><tr style="background:#f1f5f9"><th>완료 시각</th><th>단계 구분</th><th>[${escapeHTML(sit.title)}] 조치 항목</th></tr></thead><tbody>${items.map(it => `<tr><td align="center">${run.checks[it.key] ? `✔ ${escapeHTML(hhmm(run.checks[it.key]))}` : '☐ --:--'}</td><td align="center">${escapeHTML(it.group)}</td><td>${escapeHTML(it.text)}</td></tr>`).join('')}</tbody></table>`;
            copyRichTable(lines.join('\n'), htmlTable, '처리 경과(한글·엑셀 표 서식 포함)를 복사했습니다.');
        }

        // 역할별 시작 코스: 앱에 있는 용어·상황 가이드·업무 순서·도구를 역할에 맞는 순서로 묶음
        const START_COURSES = [
            { id: 'newbie', label: '신규 교사 첫 달', icon: 'fa-seedling', who: '첫 발령 · 저경력', items: [
                { t: 'term', id: 147, why: '신규 교사가 처음 마주치는 일의 큰 그림' },
                { t: 'term', id: 152, why: '교무실에서 서로 기대하는 기본 예절' },
                { t: 'view', view: 'mybox', param: null, label: '내 학교·학급 기본 정보 입력', why: '서식 자동 입력과 교육청 지침 바로가기의 출발점' },
                { t: 'term', id: 5, why: '출결·성적·복무를 처리하는 시스템' },
                { t: 'term', id: 6, why: '공문과 예산을 처리하는 시스템' },
                { t: 'term', id: 60, why: '모든 업무 처리의 기본 단위' },
                { t: 'term', id: 65, why: '공문 문장의 기본 형식' },
                { t: 'term', id: 3, why: '돈을 쓰기 전에 먼저 받는 결재' },
                { t: 'situation', id: 'situation:05', why: '아파서 출근이 어려울 때 처리 순서' },
                { t: 'term', id: 31, why: '해마다 챙기는 복지 제도' },
                { t: 'term', id: 148, why: '물어볼 선배를 정식으로 두는 방법' }
            ] },
            { id: 'homeroom', label: '담임 한 학기', icon: 'fa-people-roof', who: '처음 담임 · 학년 변경', items: [
                { t: 'term', id: 151, why: '새 학기 첫 주에 몰리는 일' },
                { t: 'term', id: 149, why: '1년 학급 운영의 뼈대' },
                { t: 'view', view: 'tools-class', param: null, label: '학급 경영 도구 둘러보기', why: '자리 배치·발표자 뽑기·타이머' },
                { t: 'view', view: 'timetable', param: null, label: '우리 반 시간표 입력', why: '홈에 지금 몇 교시인지와 종 알림 표시' },
                { t: 'term', id: 83, why: '매일 하는 출결 처리' },
                { t: 'situation', id: 'situation:06', why: '학생이 연락 없이 안 왔을 때' },
                { t: 'situation', id: 'situation:01', why: '수업 중 다쳤을 때 처리 순서' },
                { t: 'situation', id: 'situation:03', why: '학교폭력 신고를 받았을 때' },
                { t: 'situation', id: 'situation:02', why: '학부모 항의가 들어왔을 때' },
                { t: 'workflow', id: 'workflow:07', why: '상담주간 준비부터 마무리까지' },
                { t: 'situation', id: 'situation:15', why: '학기말 생활기록부 마감' }
            ] },
            { id: 'transfer', label: '새 학교 전입', icon: 'fa-school-flag', who: '전보 · 복직 후 새 학교', items: [
                { t: 'view', view: 'mybox', param: 'calendar', label: '새 학교 학사일정 입력', why: '방학·개학 D-day와 이번 주 할 일의 기준' },
                { t: 'view', view: 'timetable', param: null, label: '새 시간표 입력', why: '학교마다 다른 교시 시각 반영' },
                { t: 'term', id: 42, why: '예산·물품·시설을 함께 처리할 부서' },
                { t: 'term', id: 50, why: '안전사고·감염병 때 먼저 찾을 사람' },
                { t: 'term', id: 51, why: '학생 상담을 함께 할 사람' },
                { t: 'term', id: 39, why: '학교 주요 결정이 이뤄지는 곳' },
                { t: 'term', id: 62, why: '새 학교 공문 흐름 익히기' },
                { t: 'situation', id: 'situation:11', why: '알레르기 학생 확인' },
                { t: 'situation', id: 'situation:14', why: '학생 정보를 보낼 때 주의할 점' },
                { t: 'situation', id: 'situation:12', why: '복직 후 전입이라면' }
            ] },
            { id: 'manager', label: '처음 맡은 부장·업무담당', icon: 'fa-briefcase', who: '부장 · 업무담당자', items: [
                { t: 'term', id: 53, why: '내년 예산을 미리 요구하는 절차' },
                { t: 'workflow', id: 'workflow:06', why: '물품 구입 전 과정 한 번에' },
                { t: 'term', id: 56, why: '물건이 도착했을 때 할 일' },
                { t: 'term', id: 55, why: '업체에 일을 맡길 때' },
                { t: 'term', id: 54, why: '한 해 예산 마무리' },
                { t: 'term', id: 66, why: '행사·사업이 끝나면 쓰는 문서' },
                { t: 'workflow', id: 'workflow:01', why: '체험학습 기획부터 정산까지' },
                { t: 'view', view: 'tools-board', param: null, label: '업무 체크리스트 보드 만들기', why: '행사 준비를 동학년과 나눠 관리' },
                { t: 'term', id: 58, why: '외부 정보 요청에 답할 때' },
                { t: 'term', id: 59, why: '명단·자료를 다룰 때 지킬 것' }
            ] }
        ];
        function startCourseItemKey(it) { return it.t === 'view' ? `view:${it.view}:${it.param || ''}` : it.t === 'term' ? `term:${it.id}` : it.id; }
        function startCourseItemInfo(it) {
            if (it.t === 'term') { const term = DB.find(d => d.id === it.id); return term ? { title: term.keyword, kind: '용어', icon: 'fa-book-open' } : null; }
            if (it.t === 'situation') { const sit = SITUATIONS.find(x => x.publicId === it.id); return sit ? { title: sit.title, kind: '상황 가이드', icon: 'fa-triangle-exclamation' } : null; }
            if (it.t === 'workflow') { const course = NAVIGATOR_COURSES.find(x => x.publicId === it.id); return course ? { title: course.title, kind: '업무 순서', icon: 'fa-route' } : null; }
            return { title: it.label, kind: '도구', icon: 'fa-screwdriver-wrench' };
        }
        function startCourseState() {
            const st = Storage.get('start_courses', {});
            return st && typeof st === 'object' && !Array.isArray(st) ? { active: typeof st.active === 'string' ? st.active : '', done: st.done && typeof st.done === 'object' ? st.done : {} } : { active: '', done: {} };
        }
        function startCourseProgress(course) {
            const done = startCourseState().done[course.id] || {};
            const items = course.items.filter(startCourseItemInfo);
            return { done: items.filter(it => done[startCourseItemKey(it)]).length, total: items.length };
        }
        function setStartCourseDone(courseId, key, value) {
            const st = startCourseState(); st.done[courseId] = st.done[courseId] || {};
            if (value) st.done[courseId][key] = true; else delete st.done[courseId][key];
            Storage.set('start_courses', st);
        }
        function chooseStartCourse(courseId) {
            const st = startCourseState(); st.active = START_COURSES.some(c => c.id === courseId) ? courseId : '';
            Storage.set('start_courses', st);
            router.navigate('start', st.active || null);
        }
        function openStartCourseItem(courseId, index) {
            const course = START_COURSES.find(c => c.id === courseId); const it = course?.items[index]; if (!it) return;
            setStartCourseDone(courseId, startCourseItemKey(it), true);
            Usage.event('start_course_open');
            if (it.t === 'term') { router.render(); openDetail(it.id); }
            else if (it.t === 'situation') router.navigate('situations', it.id);
            else if (it.t === 'workflow') router.navigate('navigator', it.id);
            else router.navigate(it.view, it.param);
        }
        function toggleStartCourseItem(courseId, index) {
            const course = START_COURSES.find(c => c.id === courseId); const it = course?.items[index]; if (!it) return;
            const key = startCourseItemKey(it);
            setStartCourseDone(courseId, key, !(startCourseState().done[courseId] || {})[key]);
            router.render();
        }
        function renderStartCourses(container) {
            const st = startCourseState();
            const active = START_COURSES.find(c => c.id === (router.param || st.active)) || null;
            const cards = START_COURSES.map(c => {
                const pr = startCourseProgress(c); const pct = pr.total ? Math.round(pr.done / pr.total * 100) : 0;
                const on = active && active.id === c.id;
                return `<button type="button" onclick="chooseStartCourse('${c.id}')" aria-pressed="${!!on}" class="text-left p-3 sm:p-4 rounded-2xl border ${on ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/60 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-400'} transition">
                    <span class="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white whitespace-nowrap"><i class="fa-solid ${c.icon} text-blue-600 dark:text-blue-400"></i>${c.label}</span>
                    <span class="block text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1">${c.who}</span>
                    <span class="mt-3 flex items-center gap-2"><span class="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden"><span class="block h-full bg-blue-600" style="width:${pct}%"></span></span><span class="text-xs font-bold text-slate-600 dark:text-slate-300">${pr.done}/${pr.total}</span></span>
                </button>`;
            }).join('');
            const doneMap = active ? (st.done[active.id] || {}) : {};
            const list = active ? active.items.map((it, i) => ({ it, i, info: startCourseItemInfo(it) })).filter(x => x.info).map(({ it, i, info }, n) => {
                const done = !!doneMap[startCourseItemKey(it)];
                return `<li class="flex items-center gap-3 p-3 rounded-2xl border ${done ? 'bg-emerald-50/60 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/40' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}">
                    <input type="checkbox" ${done ? 'checked' : ''} onchange="toggleStartCourseItem('${active.id}', ${i})" aria-label="${escapeHTML(info.title)} 완료" class="w-5 h-5 shrink-0 accent-emerald-600 cursor-pointer">
                    <span class="w-7 text-xs font-extrabold text-slate-400 shrink-0">${String(n + 1).padStart(2, '0')}</span>
                    <button type="button" onclick="openStartCourseItem('${active.id}', ${i})" class="flex-1 min-w-0 text-left group">
                        <span class="flex flex-wrap items-center gap-x-2"><span class="text-sm font-bold ${done ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'} group-hover:text-blue-600">${escapeHTML(info.title)}</span><span class="text-[11px] font-semibold text-slate-400 whitespace-nowrap"><i class="fa-solid ${info.icon} mr-0.5"></i>${info.kind}</span></span>
                        <span class="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">${escapeHTML(it.why)}</span>
                    </button>
                    <span class="text-slate-300 dark:text-slate-600 shrink-0" aria-hidden="true">›</span>
                </li>`;
            }).join('') : '';
            container.innerHTML = `
                <div class="space-y-6 animate-fade-in">
                    <div><h2 class="text-2xl font-bold tracking-tight mb-1 text-slate-900 dark:text-white">역할별 시작 코스</h2><p class="text-sm text-slate-500 dark:text-slate-400">지금 내 상황에 맞는 코스를 고르면, 먼저 알아 둘 용어·상황 가이드·도구를 순서대로 안내합니다. 열어 본 항목은 자동으로 체크돼요.</p></div>
                    <div class="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">${cards}</div>
                    ${active ? `
                    <section class="space-y-3" aria-label="${active.label} 코스">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <h3 class="text-lg font-bold text-slate-900 dark:text-white">${active.label}</h3>
                            <button type="button" onclick="copyText(location.origin + location.pathname + '#view=start&param=${active.id}', '코스 주소를 복사했습니다. 동료에게 보내 보세요.')" class="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"><i class="fa-solid fa-link mr-1"></i>코스 링크 복사</button>
                        </div>
                        <ol class="space-y-2">${list}</ol>
                        <p class="text-xs text-slate-400 dark:text-slate-500">각 항목의 내용은 시도교육청·학교마다 다를 수 있으니 상세 화면의 근거와 학교 안내를 함께 확인하세요.</p>
                    </section>` : `<p class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 text-sm text-slate-500 dark:text-slate-400 text-center">위에서 코스를 하나 골라 주세요.</p>`}
                </div>
            ` + FOOTER_HTML;
        }

        // AI 문장 도우미 (선택): 선생님 본인의 Anthropic API 키로 이 기기에서 직접 요청. 키는 백업에 포함되지 않음
        const AI_CONFIG = { model: 'claude-opus-5-5', sdkUrl: 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@1.3.0/+esm', keyName: 'gb1000_ai_key' };
        const AI_RULES = '대괄호 표시([학생1], [학교명], [전화번호] 등)는 개인정보를 가린 자리이므로 글자 그대로 두세요. 초안에 없는 사실은 지어내지 마세요. 설명이나 머리말 없이 고친 글만 출력하세요.';
        const AI_MODES = {
            record: { label: '생기부 문장 다듬기', system: `초등학교 교사의 학교생활기록부 문장 작성을 돕습니다. 초안을 학교생활기록부 기재 문체로 다듬으세요: 관찰한 사실과 성장 중심, 객관적 서술, '~함', '~임'처럼 명사형으로 끝맺음. 분량은 초안과 비슷하게 유지하세요. ${AI_RULES}` },
            letter: { label: '가정통신문·알림장 정중하게', system: `초등학교 교사가 학부모에게 보낼 글을 다듬습니다. 정중하고 읽기 쉬운 문장으로 고치되 날짜·시간·장소·준비물 같은 정보는 바꾸지 마세요. ${AI_RULES}` },
            spell: { label: '맞춤법·띄어쓰기만', system: `한국어 맞춤법·띄어쓰기와 명백한 문법 오류만 고치세요. 표현과 내용, 문체는 바꾸지 마세요. ${AI_RULES}` }
        };
        let aiCtx = { targetId: '', mode: 'record', masked: '', map: [], result: '' };
        function aiGetKey() { try { return sessionStorage.getItem(AI_CONFIG.keyName) || localStorage.getItem(AI_CONFIG.keyName) || ''; } catch (_) { return ''; } }
        function aiSetKey(key, remember) {
            try {
                sessionStorage.removeItem(AI_CONFIG.keyName); localStorage.removeItem(AI_CONFIG.keyName);
                if (key) (remember ? localStorage : sessionStorage).setItem(AI_CONFIG.keyName, key);
                return true;
            } catch (_) { return false; }
        }
        function aiKeyRemembered() { try { return !!localStorage.getItem(AI_CONFIG.keyName); } catch (_) { return false; } }
        // 개인정보 가리기: 학급 명단·학생 이름, 학교/교사 이름, 전화번호·이메일·주민번호. 보낸 뒤 결과에서 이 기기 안에서만 되돌림
        function aiMask(text) {
            const map = []; let out = String(text || '');
            const swap = (value, label) => {
                if (!value || value.length < 2 || !out.includes(value)) return;
                let entry = map.find(m => m.value === value);
                if (!entry) { entry = { token: `[${label}]`, value }; map.push(entry); }
                out = out.split(value).join(entry.token);
            };
            const s = getSettings();
            const names = [...new Set([...parseNameList(Storage.get('class_names', '')), typeof recordStudent === 'string' ? recordStudent : ''].map(n => String(n || '').trim()).filter(n => n.length >= 2))].sort((a, b) => b.length - a.length);
            names.forEach((name, i) => swap(name, `학생${i + 1}`));
            swap(String(s.schoolName || '').trim(), '학교명');
            swap(String(s.teacherName || '').trim(), '교사');
            const patterns = [[/\d{6}-?[1-4]\d{6}/g, '주민번호'], [/01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/g, '전화번호'], [/0\d{1,2}-\d{3,4}-\d{4}/g, '전화번호'], [/[\w.+-]+@[\w-]+\.[\w.-]+/g, '이메일']];
            patterns.forEach(([re, label]) => { out = out.replace(re, m => { const n = map.filter(x => x.token.startsWith(`[${label}`)).length + 1; const token = `[${label}${n}]`; map.push({ token, value: m }); return token; }); });
            return { masked: out, map };
        }
        function aiUnmask(text, map) { let out = String(text || ''); map.forEach(m => { out = out.split(m.token).join(m.value); }); return out; }
        function openAiAssist(targetId, mode = 'record') {
            const el = document.getElementById(targetId);
            const m = document.getElementById('setup-wizard-modal'); const c = document.getElementById('setup-wizard-content'); if (!m || !c) return;
            const text = (el?.value || '').trim();
            aiCtx = { targetId, mode: AI_MODES[mode] ? mode : 'record', masked: '', map: [], result: '' };
            const { masked, map } = aiMask(text); aiCtx.masked = masked; aiCtx.map = map;
            const hasKey = !!aiGetKey();
            const field = 'w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-100 outline-none';
            c.innerHTML = `
                <div class="space-y-4">
                    <div class="flex items-start justify-between gap-3">
                        <div><h3 id="setup-wizard-title" class="text-xl font-black text-slate-900 dark:text-white">AI 문장 도우미 <span class="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 align-middle">선택 기능</span></h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">개인정보를 가린 글만 Anthropic(Claude)으로 보내고, 결과는 이 기기에서 이름을 되돌려 보여 줍니다.</p></div>
                        <button type="button" onclick="closeSetupWizard()" class="shrink-0 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700" aria-label="닫기"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    ${hasKey ? '' : aiKeyFormHTML()}
                    <div class="flex flex-wrap gap-2" role="radiogroup" aria-label="다듬는 방식">${Object.entries(AI_MODES).map(([key, v]) => `<button type="button" role="radio" aria-checked="${key === aiCtx.mode}" onclick="aiCtx.mode='${key}'; this.parentNode.querySelectorAll('button').forEach(b => { const on = b === this; b.setAttribute('aria-checked', on); b.className = on ? '${AI_BTN_ON}' : '${AI_BTN_OFF}'; })" class="${key === aiCtx.mode ? AI_BTN_ON : AI_BTN_OFF}">${v.label}</button>`).join('')}</div>
                    <div>
                        <p class="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">보낼 내용 (개인정보 가림 ${map.length}곳)</p>
                        <pre id="ai-masked" class="${field} whitespace-pre-wrap break-words max-h-40 overflow-y-auto font-sans">${escapeHTML(masked || '(글이 비어 있어요. 먼저 초안을 써 주세요.)')}</pre>
                        <p class="text-[11px] text-amber-700 dark:text-amber-300 mt-1">학급 명단에 없는 이름·별명, 주소 등은 자동으로 가려지지 않아요. 보내기 전에 위 내용을 꼭 확인하세요.</p>
                    </div>
                    <div id="ai-result-box" class="hidden">
                        <p class="text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-1">다듬은 글</p>
                        <textarea id="ai-result" rows="6" class="${field}"></textarea>
                        <div class="flex flex-wrap justify-end gap-2 mt-2">
                            <button type="button" onclick="copyText(document.getElementById('ai-result').value, '다듬은 글을 복사했습니다.')" class="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200">복사</button>
                            <button type="button" onclick="applyAiResult()" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold">원래 글을 이걸로 바꾸기</button>
                        </div>
                    </div>
                    <p id="ai-status" class="text-sm text-slate-500 dark:text-slate-400" aria-live="polite"></p>
                    <div class="flex flex-wrap justify-between items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                        <button type="button" onclick="router.navigate('mybox', 'ai')" class="text-xs font-bold text-slate-500 hover:underline">API 키 관리</button>
                        <button type="button" id="ai-run-btn" onclick="runAiAssist()" ${masked ? '' : 'disabled'} class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-bold">다듬기 요청</button>
                    </div>
                </div>`;
            m.classList.remove('hidden');
        }
        const AI_BTN_ON = 'px-3 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white';
        const AI_BTN_OFF = 'px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200';
        function aiKeyFormHTML() {
            return `
                    <div class="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 space-y-2">
                        <label for="ai-key-input" class="block text-xs font-bold text-blue-900 dark:text-blue-200">내 Anthropic API 키</label>
                        <input id="ai-key-input" type="password" autocomplete="off" placeholder="sk-ant-..." class="w-full p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm">
                        <label class="flex items-center gap-2 text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap"><input id="ai-key-remember" type="checkbox" class="w-4 h-4 shrink-0"> 이 기기에 기억하기 (끄면 창 닫을 때 삭제)</label>
                        <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">키는 <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" class="underline font-bold">Anthropic 콘솔</a>에서 만들 수 있고 사용량만큼 요금이 청구됩니다. 키는 이 기기에만 저장되며 백업 파일에 들어가지 않습니다. 공용 컴퓨터에서는 기억하기를 켜지 마세요.</p>
                        <button type="button" onclick="saveAiKeyFromForm()" class="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold">키 저장</button>
                    </div>`;
        }
        function saveAiKeyFromForm() {
            const key = (document.getElementById('ai-key-input')?.value || '').trim();
            if (!/^sk-ant-[\w-]{10,}$/.test(key)) { showToast('키 형식을 확인해 주세요. sk-ant- 로 시작합니다.', 'error'); return; }
            if (!aiSetKey(key, !!document.getElementById('ai-key-remember')?.checked)) { showToast('이 브라우저에서는 키를 저장할 수 없어요.', 'error'); return; }
            showToast('API 키를 저장했습니다.');
            if (router.current === 'mybox') router.render();
            if (aiCtx.targetId && !document.getElementById('setup-wizard-modal')?.classList.contains('hidden')) openAiAssist(aiCtx.targetId, aiCtx.mode);
        }
        function forgetAiKey() { aiSetKey('', false); showToast('API 키를 이 기기에서 지웠습니다.'); if (router.current === 'mybox') router.render(); }
        let aiSdkPromise = null;
        function loadAiSdk() { if (!aiSdkPromise) aiSdkPromise = import(AI_CONFIG.sdkUrl).catch(err => { aiSdkPromise = null; throw err; }); return aiSdkPromise; }
        async function runAiAssist() {
            const status = document.getElementById('ai-status'); const btn = document.getElementById('ai-run-btn');
            const say = (msg, tone = '') => { if (status) { status.textContent = msg; status.className = `text-sm ${tone || 'text-slate-500 dark:text-slate-400'}`; } };
            const apiKey = aiGetKey();
            if (!apiKey) { say('먼저 API 키를 저장해 주세요.', 'text-rose-600'); return; }
            if (!aiCtx.masked) return;
            if (!navigator.onLine) { say('인터넷에 연결된 상태에서만 쓸 수 있어요.', 'text-rose-600'); return; }
            if (btn) btn.disabled = true; say('다듬는 중… (보통 몇 초~십여 초)'); Usage.event('ai_run');
            let sdk;
            try { sdk = await loadAiSdk(); } catch (_) { say('AI 도구를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.', 'text-rose-600'); if (btn) btn.disabled = false; return; }
            const Anthropic = sdk.default;
            try {
                const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
                const response = await client.beta.messages.create({
                    model: AI_CONFIG.model,
                    max_tokens: 16000,
                    output_config: { effort: 'low' },
                    betas: ['server-side-fallback-2026-07-01'],
                    fallbacks: 'default',
                    system: AI_MODES[aiCtx.mode].system,
                    messages: [{ role: 'user', content: aiCtx.masked }]
                });
                if (response.stop_reason === 'refusal') { say('이 글은 AI가 처리하지 않았습니다. 내용을 확인하고 다시 시도해 주세요.', 'text-rose-600'); return; }
                const text = response.content.filter(block => block.type === 'text').map(block => block.text).join('').trim();
                if (!text) { say('결과가 비어 있습니다. 다시 시도해 주세요.', 'text-rose-600'); return; }
                aiCtx.result = aiUnmask(text, aiCtx.map);
                document.getElementById('ai-result-box')?.classList.remove('hidden');
                const out = document.getElementById('ai-result'); if (out) { out.value = aiCtx.result; out.focus(); }
                say(response.stop_reason === 'max_tokens' ? '글이 길어 끝까지 다듬지 못했어요. 나눠서 요청해 주세요.' : '완료! 고친 내용을 확인한 뒤 적용하세요. AI 결과는 틀릴 수 있어요.', response.stop_reason === 'max_tokens' ? 'text-amber-700' : 'text-emerald-700 dark:text-emerald-300');
            } catch (err) {
                if (err instanceof sdk.AuthenticationError || err instanceof sdk.PermissionDeniedError) say('API 키가 올바르지 않거나 권한이 없습니다. 키를 다시 확인해 주세요.', 'text-rose-600');
                else if (err instanceof sdk.RateLimitError) say('요청이 많아 잠시 막혔어요. 1분쯤 뒤에 다시 시도해 주세요.', 'text-rose-600');
                else if (err instanceof sdk.BadRequestError) say(`요청을 처리할 수 없습니다: ${err.message}`.slice(0, 200), 'text-rose-600');
                else if (err instanceof sdk.APIConnectionError) say('AI 서버에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.', 'text-rose-600');
                else if (err instanceof sdk.APIError) say(`AI 서버 오류(${err.status ?? '알 수 없음'})입니다. 잠시 뒤 다시 시도해 주세요.`, 'text-rose-600');
                else say('알 수 없는 오류가 났습니다. 다시 시도해 주세요.', 'text-rose-600');
            } finally { if (btn) btn.disabled = false; }
        }
        function applyAiResult() {
            const el = document.getElementById(aiCtx.targetId); const out = document.getElementById('ai-result');
            if (!el || !out) return;
            el.value = out.value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            closeSetupWizard(); showToast('다듬은 글로 바꿨습니다.');
        }
        function aiButtonHTML(targetId, mode) {
            return aiGetKey() ? `<button type="button" onclick="openAiAssist('${targetId}', '${mode}')" class="px-3 py-2 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-bold rounded-xl"><i class="fa-solid fa-wand-magic-sparkles mr-1"></i>AI로 다듬기</button>` : '';
        }

        // 사용 통계: 이 기기 안에서만 집계(서버 전송 없음). 끌 수 있고, 원하면 요약만 직접 보내기
        const Usage = {
            KEY: 'usage_stats', MAX_QUERIES: 50, zeroTimer: null,
            enabled() { return getSettings().usageStats !== false; },
            load() {
                const st = Storage.get(this.KEY, null);
                return st && typeof st === 'object' && !Array.isArray(st) && st.v === 1 ? st : { v: 1, since: ymd(new Date()), views: {}, events: {}, zero: {} };
            },
            save(st) { try { localStorage.setItem(Storage.PREFIX + this.KEY, JSON.stringify(st)); } catch (_) {} }, // 통계 저장 실패는 알리지 않음
            view(name) { if (!this.enabled() || !name) return; const st = this.load(); st.views[name] = (st.views[name] || 0) + 1; this.save(st); },
            event(name) { if (!this.enabled()) return; const st = this.load(); st.events[name] = (st.events[name] || 0) + 1; this.save(st); },
            // 결과 0건 검색어: 입력을 멈춘 뒤에만 기록. 숫자·이메일·학급 명단 이름이 들어간 말, 긴 문장은 기록하지 않음
            noteZero(query) {
                clearTimeout(this.zeroTimer);
                const q = normalizeSearch(query);
                if (!this.enabled() || q.length < 2 || q.length > 30 || /\d|@/.test(q)) return;
                const names = parseNameList(Storage.get('class_names', '')).map(n => normalizeSearch(n)).filter(n => n.length >= 2);
                if (names.some(n => q.includes(n))) return;
                this.zeroTimer = setTimeout(() => {
                    const current = normalizeSearch(document.getElementById('main-search-input')?.value || '');
                    if (current !== q) return;
                    const st = this.load(); const rec = st.zero[q] || { n: 0, last: '' };
                    st.zero[q] = { n: rec.n + 1, last: ymd(new Date()) };
                    const keys = Object.keys(st.zero);
                    if (keys.length > this.MAX_QUERIES) keys.sort((a, b) => st.zero[a].last.localeCompare(st.zero[b].last) || st.zero[a].n - st.zero[b].n).slice(0, keys.length - this.MAX_QUERIES).forEach(k => delete st.zero[k]);
                    this.save(st);
                }, 2500);
            },
            clear() { try { localStorage.removeItem(Storage.PREFIX + this.KEY); localStorage.removeItem(Storage.LEGACY + this.KEY); } catch (_) {} }
        };
        const USAGE_EVENT_LABELS = { detail_open: '용어 상세 열기', situation_run: '상황 단계별 처리 시작', start_course_open: '시작 코스 항목 열기', ai_run: 'AI로 다듬기', feedback_send: '의견 보내기' };
        function usageCardHTML(card) {
            const on = Usage.enabled(); const st = Usage.load();
            const viewNames = Object.fromEntries(MENU_PAGES.map(([id, title]) => [id, title.replace(/\s*\(.*\)$/, '')]));
            const views = Object.entries(st.views).sort((a, b) => b[1] - a[1]).slice(0, 6);
            const max = views[0]?.[1] || 1;
            const zero = Object.entries(st.zero).sort((a, b) => b[1].n - a[1].n || b[1].last.localeCompare(a[1].last)).slice(0, 10);
            const events = Object.entries(st.events).filter(([k]) => USAGE_EVENT_LABELS[k]);
            return `
                    <div id="usage-card" class="${card}">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2"><i class="fa-solid fa-chart-simple text-teal-500"></i> 내 사용 통계 <span class="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">이 기기에만 저장</span></h3>
                            <div class="flex flex-wrap gap-2">
                                <button type="button" onclick="toggleUsageStats()" aria-pressed="${on}" class="px-3 py-1.5 rounded-lg text-xs font-bold ${on ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}">${on ? '집계 켜짐' : '집계 꺼짐'}</button>
                                <button type="button" onclick="if (confirm('사용 통계를 지울까요?')) { Usage.clear(); router.render(); }" class="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200">지우기</button>
                            </div>
                        </div>
                        <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">어느 화면을 자주 쓰는지, 검색했는데 결과가 없던 말은 무엇인지 <b>이 기기 안에서만</b> 셉니다. 어디로도 자동 전송하지 않고 백업에도 넣지 않습니다. 숫자·이메일이 들어간 검색어와 학급 명단의 이름이 들어간 검색어는 기록하지 않습니다.</p>
                        ${views.length || zero.length || events.length ? `
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <h4 class="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">많이 연 화면 (${escapeHTML(st.since)}부터)</h4>
                                <ul class="space-y-1.5">${views.map(([v, n]) => `<li class="text-xs"><div class="flex justify-between gap-2 mb-0.5"><span class="font-semibold text-slate-700 dark:text-slate-200 truncate">${escapeHTML(viewNames[v] || v)}</span><span class="text-slate-500">${n}회</span></div><div class="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden"><div class="h-full bg-teal-500" style="width:${Math.round(n / max * 100)}%"></div></div></li>`).join('') || '<li class="text-xs text-slate-400">아직 없음</li>'}</ul>
                                ${events.length ? `<p class="mt-3 text-[11px] text-slate-500 dark:text-slate-400">${events.map(([k, n]) => `${USAGE_EVENT_LABELS[k]} ${n}회`).join(' · ')}</p>` : ''}
                            </div>
                            <div>
                                <h4 class="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">찾았지만 결과가 없던 말</h4>
                                ${zero.length ? `<ul class="flex flex-wrap gap-1.5">${zero.map(([q, r]) => `<li><button type="button" data-q="${escapeHTML(q)}" onclick="openFeedback('request', this.dataset.q)" title="이 용어 추가 요청하기" class="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-xs font-semibold hover:underline">${escapeHTML(q)} <span class="opacity-60">${r.n}</span></button></li>`).join('')}</ul><p class="mt-2 text-[11px] text-slate-400">누르면 그 말을 넣어 용어 추가 요청 창이 열려요.</p>` : '<p class="text-xs text-slate-400">아직 없음</p>'}
                            </div>
                        </div>
                        <div class="flex justify-end"><button type="button" onclick="shareUsageSummary()" class="px-3 py-2 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200 text-xs font-bold">요약을 개발자에게 보내기 (선택)</button></div>` : `<p class="text-xs text-slate-400">${on ? '앱을 쓰면 여기에 쌓입니다.' : '집계가 꺼져 있습니다.'}</p>`}
                    </div>

`;
        }
        function toggleUsageStats() {
            const on = !Usage.enabled();
            saveSetting('usageStats', on);
            if (!on && confirm('집계를 껐습니다. 지금까지 모은 통계도 지울까요?')) Usage.clear();
            router.render();
        }
        // 화면별 횟수와 결과 없는 검색어만 담은 요약을 의견 창에 채워 보여 줌. 보내기 전에 직접 확인·수정
        function shareUsageSummary() {
            const st = Usage.load();
            const views = Object.entries(st.views).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([v, n]) => `${v} ${n}`).join(', ');
            const zero = Object.entries(st.zero).sort((a, b) => b[1].n - a[1].n).slice(0, 15).map(([q, r]) => `${q}(${r.n})`).join(', ');
            openFeedback('request', '사용 통계 요약');
            const body = document.getElementById('fb-body');
            if (body) body.value = `집계 시작: ${st.since}\n많이 연 화면: ${views || '-'}\n결과 없던 검색어: ${zero || '-'}\n\n(보내기 전에 빼고 싶은 내용은 지워 주세요.)`;
            const reason = document.getElementById('fb-reason'); if (reason) reason.value = '기타';
        }

        function renderNavigator(container) {
            container.innerHTML = `
                <div class="space-y-6 animate-fade-in">
                    <div><h2 class="text-2xl font-bold tracking-tight mb-1 text-slate-900 dark:text-white">교직 내비게이터</h2><p class="text-sm text-slate-500 dark:text-slate-400">목적에 따른 굵직한 교직 업무 플로우차트를 안내합니다.</p></div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        ${NAVIGATOR_COURSES.map(course => `
                            <div id="course-${escapeHTML(course.publicId)}" class="bg-white dark:bg-slate-800 p-6 rounded-3xl border ${router.param && (course.publicId === router.param || String(course.id) === router.param) ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200/80 dark:border-slate-700'} shadow-sm flex flex-col justify-between">
                                <div>
                                    <span class="text-xs font-bold px-3 py-1 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-lg mb-3 inline-block">${escapeHTML(course.category)}</span>
                                    <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-4">${escapeHTML(course.title)}</h3>
                                    <p class="text-[11px] text-amber-700 dark:text-amber-300">${reviewLabel(course.publicId)}</p>
                                    <div class="space-y-3 relative pl-4 border-l-2 border-emerald-500/30 my-4">
                                        ${course.steps.map((st, i) => `<div><span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-0.5">STEP ${i+1}</span><p class="font-bold text-sm text-slate-800 dark:text-slate-200">${escapeHTML(st)}</p></div>`).join('')}
                                    </div>
                                </div>
                                ${course.targetKeyword ? `<button data-kw="${escapeHTML(course.targetKeyword)}" onclick="openDetailByKeyword(this.dataset.kw)" class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow">관련 핵심 키워드 확인 →</button>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` + FOOTER_HTML;
            if (router.param) requestAnimationFrame(() => document.getElementById(`course-${NAVIGATOR_COURSES.find(item => item.publicId === router.param || String(item.id) === router.param)?.publicId}`)?.scrollIntoView({ block: 'start' }));
        }


        let mapCenterKeyword = "장학사";
        function setMapCenter(id) { const it = DB.find(d => d.id === id); if (it) { mapCenterKeyword = it.keyword; renderMap(document.getElementById('app-view')); } }
        function renderMap(container) {
            const pool = curatedTerms();
            const centerItem = pool.find(d => d.keyword === mapCenterKeyword) || DB.find(d => d.keyword === mapCenterKeyword) || pool[0];
            const rels = centerItem.related || [];
            // 연관어를 먼저, 이후 같은 분류 항목으로 채움 (중심 노드 자신은 제외)
            const relItems = rels.map(k => DB.find(d => d.keyword === k)).filter(it => it && it.id !== centerItem.id);
            const sameCat = shuffle(pool.filter(d => d.category === centerItem.category && d.id !== centerItem.id && !rels.includes(d.keyword)));
            const surround = [...relItems, ...sameCat].slice(0, 8);
            container.innerHTML = `
                <div class="space-y-6 animate-fade-in">
                    <div><h2 class="text-2xl font-bold tracking-tight mb-1 text-slate-900 dark:text-white">교직 지식맵</h2><p class="text-sm text-slate-500 dark:text-slate-400">중심 노드와 연결된 교직 개념을 네트워크 형태로 탐색합니다.</p></div>
                    <div class="bg-white dark:bg-slate-800 p-8 pt-16 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-sm text-center relative min-h-[460px] flex flex-col items-center justify-center overflow-hidden">
                        <div class="absolute top-4 left-4 flex gap-2">
                            <button onclick="mapCenterKeyword='장학사'; renderMap(document.getElementById('app-view'));" class="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition">기본 중심</button>
                            <button onclick="const c=curatedTerms(); setMapCenter(c[Math.floor(Math.random()*c.length)].id)" class="px-3 py-1 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xs rounded-xl font-bold transition">랜덤 중심</button>
                        </div>
                        <div onclick="openDetail(${centerItem.id})" class="mb-12 p-6 rounded-3xl bg-blue-600 text-white shadow-xl cursor-pointer hover:scale-105 transition max-w-xs mx-auto z-10">
                            <span class="text-[10px] font-bold uppercase block mb-1 opacity-80">${centerItem.category}</span>
                            <h3 class="text-xl font-bold">${escapeHTML(centerItem.keyword)}</h3>
                        </div>
                        <div class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-4">연결된 연관 개념 (클릭하여 이동)</div>
                        <div class="flex flex-wrap justify-center gap-3 z-10">
                            ${surround.map(item => `<button onclick="setMapCenter(${item.id})" class="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:text-blue-600 dark:hover:text-blue-400 shadow-sm transition">${escapeHTML(item.keyword)}</button>`).join('')}
                        </div>
                    </div>
                </div>
            ` + FOOTER_HTML;
        }

        let yearFilterRole = 'all';
        let icsPanelOpen = false;
        const YEAR_MONTHS = [3,4,5,6,7,8,9,10,11,12,1,2];
        const ROLE_LABEL = { all: '공통', homeroom: '담임', manager: '부장·담당' };
        const roleMatch = task => yearFilterRole === 'all' || task.role === yearFilterRole || task.role === 'all';

        function renderYear(container) {
            const currentMonth = new Date().getMonth() + 1;
            const sy = getIcsYear();
            const tabBtn = (role, label) => `<button onclick="yearFilterRole='${role}'; rerenderKeepScroll()" class="px-3 py-1.5 rounded-xl text-xs font-bold transition ${yearFilterRole===role?'bg-blue-600 text-white':'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}">${label}</button>`;
            container.innerHTML = `
                <div class="space-y-6 animate-fade-in">
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div><h2 class="text-2xl font-bold tracking-tight mb-1 text-slate-900 dark:text-white">교사의 1년 타임라인</h2><p class="text-sm text-slate-500 dark:text-slate-400">월별 주요 학사 및 행정 업무를 체크하세요. ‘예시’ 표시는 학교마다 시기가 다를 수 있는 일반 업무예요.</p></div>
                        <div class="flex flex-wrap gap-2">${tabBtn('all','전체 보기')}${tabBtn('homeroom','담임 업무')}${tabBtn('manager','부장·담당')}<button type="button" onclick="document.getElementById('year-month-${currentMonth}')?.scrollIntoView({ behavior: 'smooth', block: 'start' })" class="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition"><i class="fa-solid fa-location-dot"></i> 이번 달(${currentMonth}월)로</button></div>
                    </div>

                    <div class="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4">
                        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div><h3 class="text-sm font-bold text-slate-900 dark:text-white"><i class="fa-regular fa-calendar-plus text-blue-500"></i> 내 달력에 한 번에 넣기</h3><p class="text-xs text-slate-500 dark:text-slate-400 mt-1">구글 캘린더·휴대폰 달력용 .ics 파일을 만들어요. 위에서 고른 역할 필터가 적용됩니다.</p></div>
                            <div class="flex flex-wrap gap-2 items-center">
                                <select onchange="Storage.set('ics_year', Number(this.value)); rerenderKeepScroll()" class="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200" aria-label="학년도">${[sy - 1, sy, sy + 1].map(y => `<option value="${y}" ${y === sy ? 'selected' : ''}>${y}학년도</option>`).join('')}</select>
                                <button onclick="icsPanelOpen=!icsPanelOpen; rerenderKeepScroll()" class="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"><i class="fa-solid fa-calendar-day"></i> 날짜 조정 ${icsPanelOpen ? '닫기' : ''}</button>
                                <button onclick="exportYearICS()" class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow"><i class="fa-solid fa-download"></i> 달력 파일 받기</button>
                            </div>
                        </div>
                        ${icsPanelOpen ? `
                        <div class="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                            <table class="w-full text-xs min-w-[420px]">
                                <thead class="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400"><tr><th class="p-2 text-left">월</th><th class="p-2 text-left">업무</th><th class="p-2 text-left">날짜</th></tr></thead>
                                <tbody>${YEAR_MONTHS.flatMap(m => (YEAR_TASKS[m] || []).map((task, idx) => ({ m, task, idx }))).filter(({ task }) => roleMatch(task)).map(({ m, task, idx }) => `
                                    <tr class="border-t border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300"><td class="p-2 font-bold">${m}월</td><td class="p-2">${escapeHTML(task.title)}</td><td class="p-2"><input type="date" value="${getTaskDate(sy, m, idx)}" onchange="setTaskDate(${sy}, ${m}, ${idx}, this.value)" class="px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"></td></tr>`).join('')}</tbody>
                            </table>
                        </div>
                        <p class="text-[11px] text-slate-500 dark:text-slate-400">기본값은 각 달 1일이에요. 우리 학교·교육청 학사일정에 맞춰 바꾸면 기기에 저장돼요.</p>` : ''}
                        <p class="text-[11px] text-slate-400 dark:text-slate-500">가져오는 방법 — 구글 캘린더(PC): 설정 → 가져오기/내보내기 → 파일 선택 · 아이폰: 받은 파일을 열고 '모두 추가' · 갤럭시: 파일을 열어 삼성 캘린더에 추가</p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        ${YEAR_MONTHS.map(m => {
                            const isCurrent = m === currentMonth;
                            const allTasks = YEAR_TASKS[m] || [];
                            // 필터링해도 원래 인덱스를 유지해야 체크 상태가 다른 업무에 적용되지 않음
                            const filteredTasks = allTasks.map((task, idx) => ({ task, idx })).filter(({ task }) => roleMatch(task));
                            const checkedState = Storage.get(`checklist_${m}`, {});

                            return `
                                <div id="year-month-${m}" class="scroll-mt-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border ${isCurrent ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200/80 dark:border-slate-700'} shadow-sm flex flex-col justify-between">
                                    <div>
                                        <div class="flex items-center justify-between mb-4">
                                            <span class="text-xs font-extrabold px-3 py-1 rounded-full ${isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}">${m}월</span>
                                            ${isCurrent ? '<span class="text-xs font-bold text-blue-600 dark:text-blue-400">현재 달 ✨</span>' : ''}
                                        </div>
                                        <h3 class="text-base font-bold text-slate-900 dark:text-white mb-4">${m}월 주요 업무</h3>
                                        <div class="space-y-3 max-h-60 overflow-y-auto pr-1 hide-scrollbar">
                                            ${filteredTasks.length === 0 ? '<p class="text-xs text-slate-400 dark:text-slate-500">해당 역할의 업무가 없습니다.</p>' : ''}
                                            ${filteredTasks.map(({ task, idx }) => `
                                                <div class="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 group">
                                                    <input type="checkbox" ${checkedState[idx] ? 'checked' : ''} onchange="toggleYearChecklist(${m}, ${idx})" class="w-4 h-4 mt-0.5 rounded text-blue-600 border-slate-300 dark:border-slate-600 focus:ring-blue-500 cursor-pointer shrink-0" aria-label="${escapeHTML(task.title)}">
                                                    <div class="flex flex-col">
                                                        <span class="font-medium cursor-pointer ${checkedState[idx] ? 'line-through text-slate-400 dark:text-slate-500' : 'group-hover:text-blue-600 dark:group-hover:text-blue-400 transition'}" onclick="toggleYearChecklist(${m}, ${idx})">${escapeHTML(task.title)} ${task.common ? '<span class="ml-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-1.5 py-0.5 rounded text-[9px] font-bold" title="학교마다 시기가 다를 수 있는 일반 예시">예시</span>' : ''}${task.isPeak ? '<span class="ml-1 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded text-[9px] font-black">집중</span>' : ''}</span>
                                                        ${task.linkToDoc && !checkedState[idx] ? `<button data-doc="${escapeHTML(task.linkToDoc)}" onclick="router.navigate('tools-doc', this.dataset.doc)" class="text-left text-[10px] text-blue-500 hover:underline mt-1">양식 바로가기</button>` : ''}
                                                    </div>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            ` + FOOTER_HTML;
        }

        function rerenderKeepScroll() {
            const v = document.getElementById('app-view'); const top = v ? v.scrollTop : 0;
            router.render(); if (v) v.scrollTop = top;
        }

        // 이번 주 할 일: 연간 업무(직접 정한 날짜 또는 해당 월) + 우리 학교 학사일정을 오늘 기준으로 모음
        function weeklyAgenda(now = new Date()) {
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const month = today.getMonth() + 1; const sy = getIcsYear();
            const savedDates = Storage.get('year_task_dates', {});
            const items = [];
            [month === 1 ? 12 : month - 1, month, month === 12 ? 1 : month + 1].forEach(m => {
                const done = Storage.get(`checklist_${m}`, {});
                const yearOf = month === 3 && m === 2 ? sy - 1 : month === 2 && m === 3 ? sy + 1 : sy; // 학년도는 3월에 바뀜
                (YEAR_TASKS[m] || []).forEach((task, idx) => {
                    if (done[idx]) return;
                    const custom = savedDates && savedDates[`${yearOf}_${m}_${idx}`];
                    if (custom) {
                        const date = parseYMD(custom); if (isNaN(date)) return;
                        const days = Math.round((date - today) / 86400000);
                        if (days < -14 || days > 13) return;
                        items.push({ type: 'task', m, idx, title: task.title, role: task.role, days, when: days < 0 ? `${-days}일 지남` : days === 0 ? '오늘' : days <= 6 ? `이번 주 · D-${days}` : `다음 주 · D-${days}` });
                    } else if (m === month) {
                        items.push({ type: 'task', m, idx, title: task.title, role: task.role, days: 30, when: `${m}월 중` });
                    } else if (m === (month === 12 ? 1 : month + 1) && today.getDate() >= 22) {
                        items.push({ type: 'task', m, idx, title: task.title, role: task.role, days: 40, when: `${m}월 준비` });
                    }
                });
            });
            const cal = schoolCalendar();
            SCHOOL_EVENTS.forEach(ev => {
                const date = parseYMD(cal[ev.key] || ''); if (isNaN(date)) return;
                const days = Math.round((date - today) / 86400000);
                if (days >= 0 && days <= 13) items.push({ type: 'event', title: ev.label, days, when: days === 0 ? '오늘' : `D-${days}` });
            });
            const runs = situationRuns();
            SITUATIONS.forEach(sit => {
                const pr = runs[sit.publicId] && situationProgress(sit);
                if (pr && pr.done < pr.total) items.push({ type: 'run', publicId: sit.publicId, title: sit.title, days: -999, when: `처리 중 ${pr.done}/${pr.total}` });
            });
            return items.sort((a, b) => a.days - b.days);
        }
        function weeklyAgendaHTML() {
            const items = weeklyAgenda().slice(0, 6);
            const reminder = !!getSettings().weeklyReminder;
            const tone = it => it.days < 0 ? 'text-rose-600 dark:text-rose-400' : it.days <= 6 ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400';
            return `
                            <div class="space-y-1.5" id="weekly-agenda">
                                ${items.length ? items.map(it => it.type === 'task' ? `
                                <div class="flex items-center gap-3 min-h-[44px] px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                                    <input type="checkbox" id="wa-${it.m}-${it.idx}" onchange="toggleAgendaTask(${it.m}, ${it.idx})" class="w-5 h-5 shrink-0 accent-blue-600 cursor-pointer">
                                    <label for="wa-${it.m}-${it.idx}" class="flex-1 min-w-0 text-sm font-semibold text-slate-800 dark:text-slate-100 cursor-pointer truncate">${escapeHTML(it.title)}</label>
                                    <span class="shrink-0 text-xs font-bold ${tone(it)}">${it.when}</span>
                                </div>` : it.type === 'run' ? `
                                <button type="button" data-public-id="${escapeHTML(it.publicId)}" onclick="openSituationRun(this.dataset.publicId)" class="w-full flex items-center gap-3 min-h-[44px] px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200/70 dark:border-emerald-800/50 text-left">
                                    <i class="fa-solid fa-list-check text-emerald-600 dark:text-emerald-300 w-5 text-center"></i>
                                    <span class="flex-1 min-w-0 truncate text-sm font-bold text-emerald-900 dark:text-emerald-100">${escapeHTML(it.title)}</span>
                                    <span class="shrink-0 text-xs font-bold text-emerald-700 dark:text-emerald-300">${it.when}</span>
                                </button>` : `
                                <button type="button" onclick="router.navigate('mybox', 'calendar')" class="w-full flex items-center gap-3 min-h-[44px] px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200/70 dark:border-indigo-800/50 text-left">
                                    <i class="fa-regular fa-calendar text-indigo-600 dark:text-indigo-300 w-5 text-center"></i>
                                    <span class="flex-1 text-sm font-bold text-indigo-900 dark:text-indigo-100">${escapeHTML(it.title)}</span>
                                    <span class="shrink-0 text-xs font-bold text-indigo-700 dark:text-indigo-300">${it.when}</span>
                                </button>`).join('') : `<p class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm text-slate-500 dark:text-slate-400">이번 주에 남은 연간 업무가 없어요. 교사의 1년에서 업무별 날짜를 정하면 마감이 다가올 때 여기에 먼저 보여요.</p>`}
                            </div>
                            <div class="flex flex-wrap items-center justify-between gap-2 mt-2">
                                <p class="editorial-note !mt-0">업무 날짜는 교사의 1년 › 내 달력에 넣기에서 바꿀 수 있어요.</p>
                                <button type="button" onclick="toggleWeeklyReminder()" aria-pressed="${reminder}" class="px-3 py-1.5 rounded-lg text-xs font-bold ${reminder ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}"><i class="fa-regular fa-bell mr-1"></i>${reminder ? '마감 알림 켜짐' : '마감 알림 받기'}</button>
                            </div>`;
        }
        function toggleAgendaTask(month, idx) {
            const state = Storage.get(`checklist_${month}`, {});
            state[idx] = true;
            if (Storage.set(`checklist_${month}`, state)) showToast('완료로 표시했어요. 교사의 1년에서 되돌릴 수 있어요.', 'success');
            if (router.current === 'home') router.render();
        }
        async function toggleWeeklyReminder() {
            const on = !getSettings().weeklyReminder;
            if (on && 'Notification' in window && Notification.permission === 'default') { try { await Notification.requestPermission(); } catch (_) {} }
            saveSetting('weeklyReminder', on);
            showToast(on ? '앱을 열 때 하루 한 번, 3일 안에 마감인 업무를 알려 드려요.' : '마감 알림을 껐어요.');
            if (on) { const s = getSettings(); delete s.lastAgendaNotice; Storage.set('settings', s); remindWeeklyAgenda(); }
            if (router.current === 'home') router.render();
        }
        // 앱을 열 때 하루 한 번: 지났거나 3일 안에 다가온 업무·학사일정 알림
        function remindWeeklyAgenda() {
            const s = getSettings(); if (!s.weeklyReminder) return;
            const day = ymd(new Date()); if (s.lastAgendaNotice === day) return;
            const due = weeklyAgenda().filter(it => it.days <= 3);
            saveSetting('lastAgendaNotice', day);
            if (!due.length) return;
            const title = `마감이 다가온 일 ${due.length}개`;
            const body = due.slice(0, 3).map(it => `${it.title}(${it.when})`).join(', ');
            showToast(`🗓 ${title} · ${body}`, 'info');
            if ('Notification' in window && Notification.permission === 'granted') {
                const opts = { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: `agenda-${day}` };
                const plain = () => { try { new Notification(title, opts); } catch (_) {} };
                if ('serviceWorker' in navigator && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then(r => r.showNotification(title, opts)).catch(plain);
                else plain();
            }
        }

        function toggleYearChecklist(month, idx) {
            const state = Storage.get(`checklist_${month}`, {});
            state[idx] = !state[idx]; Storage.set(`checklist_${month}`, state);
            showToast('체크리스트가 반영되었습니다.', 'success'); rerenderKeepScroll(); // 체크 후 스크롤 위치 유지
        }

        // ---------- 9. 달력(.ics) 내보내기 ----------
        function getIcsYear() { const d = new Date(); const def = d.getMonth() + 1 >= 3 ? d.getFullYear() : d.getFullYear() - 1; const y = Number(Storage.get('ics_year', def)); return Number.isFinite(y) && y > 2000 ? y : def; }
        function getTaskDate(sy, m, idx) { const saved = Storage.get('year_task_dates', {})[`${sy}_${m}_${idx}`]; return saved || `${m >= 3 ? sy : sy + 1}-${pad2(m)}-01`; }
        function setTaskDate(sy, m, idx, v) { const all = Storage.get('year_task_dates', {}); if (v && !isNaN(parseYMD(v))) all[`${sy}_${m}_${idx}`] = v; else delete all[`${sy}_${m}_${idx}`]; Storage.set('year_task_dates', all); }
        function icsEscape(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
        // RFC 5545: 한 줄은 75바이트 이하, 넘으면 줄바꿈 + 공백으로 이어 씀
        function foldIcsLine(line) {
            const enc = new TextEncoder(); const parts = []; let cur = '', bytes = 0;
            for (const ch of line) { const b = enc.encode(ch).length; const limit = parts.length === 0 ? 75 : 74; if (bytes + b > limit) { parts.push(cur); cur = ''; bytes = 0; } cur += ch; bytes += b; }
            parts.push(cur); return parts.join('\r\n ');
        }
        function exportYearICS() {
            const sy = getIcsYear(); const f = x => `${x.getFullYear()}${pad2(x.getMonth() + 1)}${pad2(x.getDate())}`;
            const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
            const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Gyojik Baekseo 1000//KO', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${icsEscape(`교사의 1년 (${sy}학년도)`)}`, 'X-WR-TIMEZONE:Asia/Seoul'];
            let n = 0;
            YEAR_MONTHS.forEach(m => (YEAR_TASKS[m] || []).forEach((task, idx) => {
                if (!roleMatch(task)) return;
                const d = parseYMD(getTaskDate(sy, m, idx)); if (isNaN(d)) return;
                const next = new Date(d); next.setDate(d.getDate() + 1);
                lines.push('BEGIN:VEVENT', `UID:${sy}-${m}-${idx}@gyojik-baekseo-1000`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${f(d)}`, `DTEND;VALUE=DATE:${f(next)}`,
                    `SUMMARY:${icsEscape((task.isPeak ? '[집중] ' : '') + task.title)}`, `DESCRIPTION:${icsEscape(`교직백서 1000 · ${ROLE_LABEL[task.role] || '공통'} 업무`)}`, 'TRANSP:TRANSPARENT', 'END:VEVENT');
                n++;
            }));
            lines.push('END:VCALENDAR');
            if (!n) { showToast('내보낼 업무가 없습니다.', 'error'); return; }
            downloadFile(`교사의1년_${sy}학년도.ics`, lines.map(foldIcsLine).join('\r\n') + '\r\n', 'text/calendar;charset=utf-8');
            showToast(`${n}개 일정을 달력 파일로 저장했습니다.`);
        }


        function renderCareer(container) {
            container.innerHTML = `
                <div class="space-y-6 animate-fade-in">
                    <div><h2 class="text-2xl font-bold tracking-tight mb-1 text-slate-900 dark:text-white">교직 커리어맵</h2><p class="text-sm text-slate-500 dark:text-slate-400">교사의 다양한 성장 경로와 직위별 발전 방향을 확인하세요.</p></div>
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div class="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between">
                            <div><span class="text-[10px] font-bold px-3 py-1 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg mb-3 inline-block">수업 전문성</span><h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">수업전문가 / 수석교사</h3><p class="text-xs text-slate-500 dark:text-slate-400 mb-6">교실 수업 개선을 주도하고 후배 교사의 멘토가 되는 현장 전문가 경로</p></div>
                            <button onclick="openCareerInfo('수석교사')" class="w-full py-3 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold transition hover:bg-blue-100 dark:hover:bg-blue-900/60">제도 상세 안내 보기 →</button>
                        </div>
                        <div class="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between">
                            <div><span class="text-[10px] font-bold px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg mb-3 inline-block">교육행정 및 지원</span><h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">교육전문직 (장학사)</h3><p class="text-xs text-slate-500 dark:text-slate-400 mb-6">교육청 및 직속기관에서 교육 정책 기획 및 학교 지원 업무 수행</p></div>
                            <button onclick="openCareerInfo('장학사')" class="w-full py-3 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold transition hover:bg-indigo-100 dark:hover:bg-indigo-900/60">제도 상세 안내 보기 →</button>
                        </div>
                        <div class="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between">
                            <div><span class="text-[10px] font-bold px-3 py-1 bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-lg mb-3 inline-block">학교 경영</span><h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">교감 / 교장</h3><p class="text-xs text-slate-500 dark:text-slate-400 mb-6">학교 행정의 총괄 관리자로서 교육 비전을 실현하는 리더십 경로</p></div>
                            <button onclick="openCareerInfo('교감')" class="w-full py-3 bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-xl text-xs font-bold transition hover:bg-purple-100 dark:hover:bg-purple-900/60">제도 상세 안내 보기 →</button>
                        </div>
                    </div>
                </div>
            ` + FOOTER_HTML;
        }

        // ---------- 10. 교직력 테스트 + 오답 노트 ----------
        let quizState = { active: false, mode: 'normal', count: 10, index: 0, correct: 0, score: 0, items: [], answers: [], level: "" };
        function getWrongs() { const w = Storage.get('quiz_wrongs', []); return Array.isArray(w) ? w.filter(id => DB.some(d => d.id === id)) : []; }
        function removeWrong(id) { const w = Storage.get('quiz_wrongs', []); if (w.includes(id)) return Storage.set('quiz_wrongs', w.filter(x => x !== id)) ? true : null; return false; }
        function clearWrongs() { if (!confirm('오답 노트를 비울까요?')) return; if (!Storage.set('quiz_wrongs', [])) return; showToast('오답 노트를 비웠습니다.', 'info'); router.render(); }

        function renderQuiz(container) {
            if (quizState.active) { renderQuizActive(container); return; }
            const wrongs = getWrongs(); const wrongItems = wrongs.map(id => DB.find(d => d.id === id)).filter(Boolean);
            container.innerHTML = `
                <div class="space-y-6 max-w-2xl mx-auto text-center animate-fade-in">
                    <div><h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-1">교직력 테스트</h2>
                    <p class="text-sm text-slate-500 dark:text-slate-400">현장 상황 판단형 퀴즈로 나의 실무 역량을 검증하세요.</p></div>
                    <div class="bg-white dark:bg-slate-800 p-5 sm:p-8 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-700">
                        <div class="w-16 h-16 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-900/40 text-rose-500 dark:text-rose-400 flex items-center justify-center text-2xl mb-4"><i class="fa-solid fa-gamepad"></i></div>
                        <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-6">문항 수를 선택하세요</h3>
                        <div class="flex justify-center gap-2.5 sm:gap-3">
                            <button onclick="startQuiz(10)" class="whitespace-nowrap shrink-0 px-4 sm:px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow transition">10문제</button>
                            <button onclick="startQuiz(20)" class="whitespace-nowrap shrink-0 px-4 sm:px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 font-bold rounded-xl transition">20문제</button>
                            <button onclick="startQuiz(50)" class="whitespace-nowrap shrink-0 px-4 sm:px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 font-bold rounded-xl transition">50문제</button>
                        </div>
                    </div>
                    <div class="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-700 text-left space-y-4">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <h3 class="text-base font-bold text-slate-900 dark:text-white"><i class="fa-solid fa-book-bookmark text-amber-500"></i> 오답 노트 <span class="text-amber-600 dark:text-amber-400">${wrongItems.length}개</span></h3>
                            ${wrongItems.length ? `<div class="flex gap-2"><button onclick="clearWrongs()" class="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">비우기</button><button onclick="startQuiz(20, 'review')" class="px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow"><i class="fa-solid fa-rotate"></i> 틀린 문제만 다시 풀기</button></div>` : ''}
                        </div>
                        ${wrongItems.length ? `<div class="flex flex-wrap gap-2">${wrongItems.slice(0, 40).map(it => `<button onclick="openDetail(${it.id})" class="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-xs font-semibold hover:underline">${escapeHTML(it.keyword)}</button>`).join('')}${wrongItems.length > 40 ? `<span class="text-xs text-slate-400 self-center">외 ${wrongItems.length - 40}개</span>` : ''}</div>
                        <p class="text-[11px] text-slate-500 dark:text-slate-400">다시 풀어서 맞히면 오답 노트에서 빠져요. 틀린 용어는 '오늘의 교직카드'에도 먼저 나와요.</p>` : `<p class="text-xs text-slate-400 dark:text-slate-500">아직 틀린 문제가 없어요. 퀴즈를 풀면 틀린 용어가 여기에 모입니다.</p>`}
                    </div>
                </div>
            ` + FOOTER_HTML;
        }

        function startQuiz(count, mode = 'normal') {
            let items;
            if (mode === 'review') {
                const w = getWrongs(); items = shuffle(DB.filter(d => w.includes(d.id))).slice(0, count);
                if (!items.length) { showToast('오답 노트가 비어 있어요.', 'info'); return; }
            } else items = shuffle(curatedTerms()).slice(0, count);
            quizState = { active: true, mode, count: items.length, index: 0, correct: 0, score: 0, items, answers: [], level: "", options: null };
            router.render();
        }

        // 문제 설명에 정답 단어가 그대로 노출되지 않도록 가림
        function maskAnswer(text, item) {
            let out = String(text);
            const words = [item.keyword, ...(item.aliases || [])].filter(w => w && w.length >= 2).sort((a, b) => b.length - a.length);
            words.forEach(w => { out = out.split(w).join('○○○'); });
            return out;
        }

        function renderQuizActive(container) {
            if (quizState.index >= quizState.items.length) { renderQuizResult(container); return; }
            const q = quizState.items[quizState.index];
            // 자동 생성 항목은 설명이 템플릿 문장뿐이라 설명형 문제로는 풀 수 없음 → 분류 맞히기 문제로 출제
            const quizQuestionText = q.quizQuestion || (q._generated
                ? `다음 중 '${q.category}' 분야에 속하는 교직 용어는 무엇인가요?`
                : `다음 설명에 해당하는 교직 용어는 무엇인가요?\n\n"${maskAnswer(q._shortDesc || q.description, q)}"`);

            // 보기는 문항당 한 번만 생성 (다크모드 전환 등으로 재렌더링돼도 순서 유지)
            if (!quizState.options || quizState.options.qid !== q.id) {
                // "만기 전보"/"초등 만기 전보"처럼 같은 주제어에서 나온 항목은 오답 보기에서 제외 (정답이 둘이 되는 문제 방지)
                const base = (q.aliases || [])[0];
                const pool = curatedTerms().filter(d => d.id !== q.id && !(base && (d.aliases || [])[0] === base) && !d.keyword.includes(q.keyword) && !q.keyword.includes(d.keyword));
                const seen = new Set();
                const uniq = arr => arr.filter(d => { const k = (d.aliases || [])[0] || d.keyword; if (seen.has(k)) return false; seen.add(k); return true; });
                let wrong = q._generated ? uniq(shuffle(pool.filter(d => d.category !== q.category))) : uniq(shuffle(pool.filter(d => d.category === q.category)));
                if (wrong.length < 3) wrong = [...wrong, ...uniq(shuffle(pool.filter(d => d.category !== q.category)))];
                quizState.options = { qid: q.id, list: shuffle([...wrong.slice(0, 3).map(d => d.keyword), q.keyword]) };
            }
            const options = quizState.options.list;

            container.innerHTML = `
                <div class="space-y-6 max-w-2xl mx-auto animate-fade-in">
                    <div class="flex items-center justify-between text-xs font-bold text-slate-400 dark:text-slate-500"><span>${quizState.mode === 'review' ? '<span class="text-amber-500">오답 복습</span> · ' : ''}QUESTION ${quizState.index + 1} / ${quizState.count}</span><span>${escapeHTML(q.category)}</span></div>
                    <div class="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-700">
                        <div class="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl mb-6">
                            <p class="text-xs font-semibold text-rose-600 dark:text-rose-400 mb-2"><i class="fa-solid fa-q"></i> 상황 및 설명</p>
                            <p class="text-base font-bold text-slate-900 dark:text-white leading-relaxed whitespace-pre-wrap">${escapeHTML(quizQuestionText)}</p>
                        </div>
                        <div class="space-y-3">
                            ${options.map((opt, i) => `<button onclick="answerQuiz(${i})" class="w-full text-left p-4 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-900/40 border border-slate-200 dark:border-slate-700 font-medium text-sm text-slate-800 dark:text-slate-200 transition">${escapeHTML(opt)}</button>`).join('')}
                        </div>
                    </div>
                    <div class="text-center"><button onclick="if(confirm('퀴즈를 그만둘까요?')){ quizState.active=false; router.render(); }" class="text-xs text-slate-400 hover:underline">그만두기</button></div>
                </div>
            ` + FOOTER_HTML;
        }

        function answerQuiz(optIndex) {
            const q = quizState.items[quizState.index]; if (!q || !quizState.options) return;
            const selected = quizState.options.list[optIndex];
            const isCorrect = selected === q.keyword;
            if (isCorrect) quizState.correct++;
            quizState.answers.push({ id: q.id, q: q.keyword, isCorrect });
            if (!isCorrect) {
                const wrongs = Storage.get('quiz_wrongs', []);
                wrongs.push(q.id);
                Storage.set('quiz_wrongs', [...new Set(wrongs)]);
                showToast(`오답! 정답은 '${q.keyword}' · 오답 노트에 담았어요`, 'error');
            } else if (removeWrong(q.id)) showToast('정답! 오답 노트에서 뺐어요 🎉');
            else showToast('정답입니다!');
            quizState.index++; quizState.options = null; router.render();
        }

        function renderQuizResult(container) {
            quizState.active = false;
            quizState.score = quizState.count ? Math.round(quizState.correct / quizState.count * 100) : 0;
            let level = "Lv.1 교직 탐험가";
            if (quizState.score >= 90) level = "Lv.5 교직 백과사전";
            else if (quizState.score >= 70) level = "Lv.4 교직 고수";
            else if (quizState.score >= 50) level = "Lv.3 업무 해결사";
            else if (quizState.score >= 30) level = "Lv.2 학교 적응 완료";
            quizState.level = level;

            if (quizState.mode !== 'review') {
                const hist = Storage.get('quiz_history', []);
                hist.push({ date: new Date().toLocaleDateString(), score: quizState.score, level });
                Storage.set('quiz_history', hist.slice(-50));
            }
            const missed = quizState.answers.filter(a => !a.isCorrect);
            const wrongCount = getWrongs().length;

            container.innerHTML = `
                <div class="space-y-6 max-w-2xl mx-auto text-center animate-fade-in">
                    <div class="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-700">
                        <div class="w-16 h-16 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-900/40 text-amber-500 dark:text-amber-400 flex items-center justify-center text-2xl mb-4"><i class="fa-solid fa-trophy"></i></div>
                        <span class="text-xs font-bold px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 mb-2 inline-block">${quizState.mode === 'review' ? '오답 복습' : level}</span>
                        <h3 class="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">${quizState.mode === 'review' ? '복습 완료!' : '퀴즈 완료!'}</h3>
                        <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">${quizState.count}문제 중 ${quizState.correct}개 정답 · 총점: <strong class="text-rose-600 dark:text-rose-500 text-xl">${quizState.score}점</strong></p>
                        ${missed.length ? `<div class="text-left bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 mb-6"><p class="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">이번에 틀린 용어</p><div class="flex flex-wrap gap-2">${missed.map(a => `<button onclick="openDetail(${a.id})" class="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600">${escapeHTML(a.q)}</button>`).join('')}</div></div>` : ''}
                        <div class="flex flex-wrap justify-center gap-3">
                            ${quizState.mode !== 'review' ? `<button onclick="shareQuizResult()" class="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition"><i class="fa-solid fa-share-nodes"></i> 점수 공유</button>` : ''}
                            ${wrongCount ? `<button onclick="startQuiz(20, 'review')" class="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow transition"><i class="fa-solid fa-rotate"></i> 오답 복습 (${wrongCount})</button>` : ''}
                            <button onclick="router.render()" class="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition">처음으로</button>
                        </div>
                    </div>
                </div>
            ` + FOOTER_HTML;
        }

        function shareQuizResult() {
            const text = `나는 교직백서 실무력 테스트 [${quizState.level}] 달성!\n총점: ${quizState.score}점\n선생님도 도전해보세요!\n${location.href.split('#')[0]}`;
            copyText(text, '결과가 클립보드에 복사되었습니다. 메신저에 공유해보세요!');
        }

        // 오늘의 카드: 퀴즈에서 틀리고 아직 학습 완료하지 않은 용어를 우선 보여줌 (기본 풀은 직접 작성된 대표 용어)
        function getTodaysCard() {
            const h = Math.abs(hashCode(ymd(new Date())));
            const learned = Storage.get('learned_cards', []);
            const pending = getWrongs().filter(id => !learned.includes(id));
            if (pending.length) { const item = DB.find(d => d.id === pending[h % pending.length]); if (item) return { item, review: true, pending: pending.length }; }
            const pool = curatedTerms();
            return { item: pool[h % pool.length] || DB[0], review: false, pending: 0 };
        }

        function renderCard(container) {
            const d = new Date();
            const todayStr = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
            const { item, review, pending } = getTodaysCard();
            const pool = curatedTerms();
            const learnedCards = Storage.get('learned_cards', []);
            const isLearned = learnedCards.includes(item.id);
            const rate = Math.min(100, Math.round((learnedCards.length / pool.length) * 100));

            container.innerHTML = `
                <div class="space-y-6 max-w-xl mx-auto animate-fade-in">
                    <div>
                        <h2 class="text-2xl font-bold tracking-tight mb-1 text-slate-900 dark:text-white">오늘의 교직카드</h2>
                        <p class="text-sm text-slate-500 dark:text-slate-400">매일 하나의 대표 교직 키워드로 지식을 넓히세요. 퀴즈에서 틀린 용어가 있으면 먼저 복습해요.</p>
                    </div>
                    ${review ? `<div class="p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 text-xs font-semibold text-amber-800 dark:text-amber-300"><i class="fa-solid fa-rotate"></i> 복습 카드 · 퀴즈에서 틀렸던 용어예요 (남은 복습 ${pending}개)</div>` : ''}
                    <div class="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-lg space-y-6">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold px-3 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">${escapeHTML(item.category)}</span>
                            <span class="text-xs font-semibold text-slate-400">${todayStr}</span>
                        </div>
                        <div>
                            <h3 class="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">${escapeHTML(item.keyword)}</h3>
                            <p class="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-4">${escapeHTML(item.simple)}</p>
                            <p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">${escapeHTML(item.description)}</p>
                        </div>
                        <div class="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div class="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                               <span>발견한 대표 교직어 (${learnedCards.length} / ${pool.length})</span>
                               <span class="font-bold text-blue-600 dark:text-blue-400">${rate}%</span>
                            </div>
                            <div class="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                <div class="bg-blue-600 dark:bg-blue-500 h-full transition-all duration-300" style="width: ${rate}%"></div>
                            </div>
                        </div>
                        <div class="pt-4 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                            <button onclick="markCardLearned(${item.id})" class="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-sm">${review ? '이제 알아요 ✨' : (isLearned ? '✨ 이미 학습 완료' : '알고 있었어요 ✨')}</button>
                            <button onclick="openDetail(${item.id})" class="px-5 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition">상세보기</button>
                        </div>
                    </div>
                </div>
            ` + FOOTER_HTML;
        }

        function markCardLearned(id) {
            const learnedCards = Storage.get('learned_cards', []);
            const wasWrong = removeWrong(id);
            if (wasWrong === null) return;
            if (!learnedCards.includes(id)) { learnedCards.push(id); if (!Storage.set('learned_cards', learnedCards)) return; }
            else if (!wasWrong) { showToast('이미 학습 완료된 카드입니다.', 'info'); return; }
            showToast(wasWrong ? '복습 완료! 오답 노트에서 뺐어요.' : '학습 완료 기록이 저장되었습니다!', 'success'); router.render();
        }


        function renderMyBox(container) {
            const bookmarks = Storage.get('bookmarks', []);
            const canonicalBookmarks = new Set(bookmarks.map(canonicalTermId));
            const bookmarkedItems = DB.filter(d => canonicalBookmarks.has(d.id) && canonicalTermId(d.id) === d.id);
            const recentViews = [...new Set(Storage.get('recent_views', []).map(canonicalTermId))].map(id => DB.find(d => d.id === id)).filter(Boolean).slice(0, 10);
            const currentThemeMode = Storage.get('theme_mode', 'light');
            const s = getSettings();
            const fontScale = s.fontScale || '100';
            const office = currentOffice();
            const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
            const field = 'w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm outline-none mt-1';
            const card = 'bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-700 space-y-4';

            container.innerHTML = `
                <div class="space-y-6 animate-fade-in">
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div><h2 class="text-2xl font-bold tracking-tight mb-1 text-slate-900 dark:text-white">나의 교직함</h2><p class="text-sm text-slate-500 dark:text-slate-400">즐겨찾기, 학급·교육청 설정, 가독성(글자 크기) 및 통합 암호화 백업을 관리합니다.</p></div>
                        <button type="button" onclick="openSetupWizard()" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow self-start"><i class="fa-solid fa-wand-magic-sparkles mr-1"></i>1분 학급·명단 통합 세팅 열기</button>
                    </div>

                    <div class="${card}">
                        <div class="flex flex-wrap items-center justify-between gap-2"><h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2"><i class="fa-solid fa-bookmark text-amber-500"></i> 즐겨찾기한 교직어 (${bookmarkedItems.length}개)</h3><button type="button" onclick="printTermCheatSheet('bookmarks')" class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 transition"><i class="fa-solid fa-print mr-1"></i>내 즐겨찾기 요약표 인쇄</button></div>
                        ${bookmarkedItems.length > 0 ? `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">${bookmarkedItems.map(item => `<div onclick="openDetail(${item.id})" class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 hover:border-blue-500 dark:hover:border-blue-500 border border-slate-200 dark:border-slate-700 cursor-pointer flex justify-between transition group"><div><span class="text-xs font-bold text-blue-600 dark:text-blue-400">${escapeHTML(item.category)}</span><h4 class="font-bold text-sm text-slate-800 dark:text-slate-200 mt-1">${escapeHTML(item.keyword)}</h4></div><button onclick="event.stopPropagation(); toggleBookmark(${item.id});" class="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition" aria-label="즐겨찾기 삭제"><i class="fa-solid fa-trash"></i></button></div>`).join('')}</div>` : `<p class="text-xs text-slate-400 dark:text-slate-500 py-4 text-center">저장된 즐겨찾기가 없습니다.</p>`}
                    </div>

                    <div class="${card}">
                        <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2"><i class="fa-solid fa-pen-to-square text-emerald-500"></i> 우리 학교 기준 메모한 교직어 (${getAllTermNotes().length}개)</h3>
                        ${getAllTermNotes().length > 0 ? `<div class="grid grid-cols-1 md:grid-cols-2 gap-3">${getAllTermNotes().map(({ item, note }) => `<div onclick="openDetail(${item.id})" class="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-slate-900 border border-emerald-200/80 dark:border-slate-700 cursor-pointer hover:border-emerald-500 transition"><div class="flex items-center justify-between mb-1"><span class="text-xs font-extrabold text-slate-900 dark:text-white">${escapeHTML(item.keyword)}</span><span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">${escapeHTML(item.category)}</span></div><p class="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">${escapeHTML(note)}</p></div>`).join('')}</div>` : `<p class="text-xs text-slate-400 dark:text-slate-500 py-3 text-center">용어 상세창 하단 '우리 학교 기준 메모장'에 기록한 메모가 여기에 모입니다.</p>`}
                    </div>

                    <div class="${card}">
                        <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2"><i class="fa-solid fa-clock-rotate-left text-slate-500"></i> 최근 본 교직어</h3>
                        ${recentViews.length > 0 ? `<div class="flex flex-wrap gap-2">${recentViews.map(item => `<button onclick="openDetail(${item.id})" class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-medium hover:text-blue-600 dark:hover:text-blue-400 text-slate-800 dark:text-slate-200 transition">${escapeHTML(item.keyword)}</button>`).join('')}</div>` : `<p class="text-xs text-slate-400 dark:text-slate-500 py-4 text-center">최근 본 기록이 없습니다.</p>`}
                    </div>

                    <div class="${card}">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2"><i class="fa-solid fa-school text-emerald-500"></i> 기본 정보 · 소속 시·도교육청</h3>
                            ${office ? `<a href="${escapeHTML(office.url)}" target="_blank" rel="noopener noreferrer" class="text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline">${escapeHTML(office.name)} 누리집 ↗</a>` : ''}
                        </div>
                        <p class="text-xs text-slate-500 dark:text-slate-400">문서 생성기의 [학교명]·[담임]·[학년반] 자동 입력, 가정통신문·자리 배치표 인쇄 머리글, 시도교육청 지침 바로가기에 쓰여요.</p>
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <label class="text-xs font-semibold text-slate-500 dark:text-slate-400">소속 교육청<select onchange="if(saveSetting('office', this.value)) { showToast('소속 교육청을 저장했습니다.'); router.render(); }" class="${field}"><option value="">선택 안 함 (전국 공통)</option>${EDUCATION_OFFICES.map(o => `<option value="${escapeHTML(o.code)}" ${s.office === o.code ? 'selected' : ''}>${escapeHTML(o.name)}</option>`).join('')}</select></label>
                            <label class="text-xs font-semibold text-slate-500 dark:text-slate-400">학교명<input type="text" value="${escapeHTML(s.schoolName)}" onchange="if(saveSetting('schoolName', this.value.trim())) showToast('저장했습니다.')" placeholder="예: 한빛초등학교" class="${field}"></label>
                            <label class="text-xs font-semibold text-slate-500 dark:text-slate-400">담임 이름<input type="text" value="${escapeHTML(s.teacherName)}" onchange="if(saveSetting('teacherName', this.value.trim())) showToast('저장했습니다.')" placeholder="예: 김엽" class="${field}"></label>
                            <label class="text-xs font-semibold text-slate-500 dark:text-slate-400">학년·반<input type="text" value="${escapeHTML(s.className)}" onchange="if(saveSetting('className', this.value.trim())) showToast('저장했습니다.')" placeholder="예: 3학년 2반" class="${field}"></label>
                        </div>
                    </div>

                    <div id="school-calendar-card" class="${card}">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2"><i class="fa-regular fa-calendar text-indigo-500"></i> 우리 학교 학사일정</h3>
                            ${(() => { const ev = nextSchoolEvent(); return ev ? `<span class="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">다음 일정 · ${escapeHTML(ev.label)} ${ev.days === 0 ? '오늘' : `D-${ev.days}`}</span>` : ''; })()}
                        </div>
                        <p class="text-xs text-slate-500 dark:text-slate-400">방학·개학 날짜는 학교마다 다릅니다. 학교 학사일정표를 보고 입력하면 홈 화면에 다음 일정까지 남은 날이 표시돼요. ${office ? `${escapeHTML(office.name)} 학사 운영 지침은 <a href="${escapeHTML(office.url)}" target="_blank" rel="noopener noreferrer" class="font-bold text-amber-700 dark:text-amber-300 hover:underline">교육청 누리집 ↗</a>에서 확인하세요.` : ''}</p>
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                            ${SCHOOL_EVENTS.map(ev => `<label class="text-xs font-semibold text-slate-500 dark:text-slate-400">${ev.label}<input type="date" value="${escapeHTML(schoolCalendar()[ev.key] || '')}" onchange="saveSchoolCalendar('${ev.key}', this.value); router.render();" class="${field}"></label>`).join('')}
                        </div>
                    </div>

${usageCardHTML(card)}${vaultCardHTML(card)}                    <div id="ai-settings-card" class="${card}">
                        <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2"><i class="fa-solid fa-wand-magic-sparkles text-violet-500"></i> AI 문장 도우미 <span class="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">선택 기능 · 기본 꺼짐</span></h3>
                        <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">본인의 Anthropic API 키를 넣으면 생기부 문장 도우미와 기안·알림장 생성기에 <b>AI로 다듬기</b> 버튼이 생깁니다. 학급 명단의 이름, 학교·교사 이름, 전화번호·이메일·주민번호는 가린 뒤 보내고, 보내기 전에 보낼 내용을 보여 줍니다. 키는 이 기기에만 저장되고 백업 파일에는 들어가지 않습니다.</p>
                        ${aiGetKey() ? `<div class="flex flex-wrap items-center gap-2"><span class="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">켜짐 · ${aiKeyRemembered() ? '이 기기에 기억 중' : '브라우저를 닫으면 지워짐'}</span><button type="button" onclick="forgetAiKey()" class="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-xs font-bold">키 지우고 끄기</button></div>` : aiKeyFormHTML()}
                    </div>

                    <div class="${card}">
                        <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2"><i class="fa-solid fa-scale-balanced text-amber-500"></i> 내용 검수 현황</h3>
                        <div class="flex flex-wrap gap-2"><button type="button" onclick="openFeedback('error')" class="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-xs font-bold">틀린 내용 신고</button><button type="button" onclick="openFeedback('request')" class="px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold">용어·가이드 추가 요청</button></div>
                        ${(() => { const r = reviewSummary(); const pct = r.total ? Math.round(r.reviewed / r.total * 100) : 0; return r.total ? `
                        <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">용어·상황 가이드·업무 순서 ${r.total}개 중 공식 근거와 대조를 마친 항목은 <b>${r.reviewed}개(${pct}%)</b>입니다. 검수 전 항목은 실무 경험을 바탕으로 정리한 내용이라, 처리 전에 상세 화면의 근거 법령과 소속 교육청 지침을 꼭 확인해 주세요.</p>
                        <div class="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden" aria-hidden="true"><div class="bg-emerald-500 h-full" style="width:${pct}%"></div></div>
                        <div class="flex flex-wrap gap-2 text-xs font-bold"><span class="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">✅ 대조 완료 ${r.reviewed}</span><span class="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300">⚠️ 변경 확인 중 ${r['needs-update']}</span><span class="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300">📝 검수 전 ${r['needs-review']}</span></div>` : `<p class="text-xs text-slate-500 dark:text-slate-400">검수 기록을 불러오지 못했습니다. 인터넷에 연결된 상태에서 다시 열어 주세요.</p>`; })()}
                    </div>

                    <div class="${card}">
                        <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2"><i class="fa-solid fa-mobile-screen-button text-blue-500"></i> 앱으로 설치하기</h3>
                        ${standalone ? `<p class="text-sm text-emerald-600 dark:text-emerald-400 font-semibold"><i class="fa-solid fa-circle-check"></i> 지금 앱으로 실행 중이에요.</p>`
                        : `<p class="text-xs text-slate-500 dark:text-slate-400">설치하면 홈 화면(바탕화면)에 아이콘이 생깁니다.</p><button type="button" data-ys-install class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow"><i class="fa-solid fa-download"></i> 앱 설치</button>`}
                        <p id="offline-status" class="text-xs text-slate-500 dark:text-slate-400">오프라인 준비 상태 확인 중…</p>
                    </div>

                    <div class="${card}">
                        <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2"><i class="fa-solid fa-circle-half-stroke text-purple-500"></i> 화면 테마 및 글자 크기</h3>
                        <div class="space-y-3">
                            <div>
                                <p class="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">색상 테마</p>
                                <div class="flex flex-wrap gap-2">
                                    <button onclick="setThemeMode('light')" class="px-4 py-2 rounded-xl text-xs font-bold transition ${currentThemeMode==='light'?'bg-blue-600 text-white shadow-md':'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}">라이트 모드</button>
                                    <button onclick="setThemeMode('dark')" class="px-4 py-2 rounded-xl text-xs font-bold transition ${currentThemeMode==='dark'?'bg-blue-600 text-white shadow-md':'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}">다크 모드</button>
                                    <button onclick="setThemeMode('system')" class="px-4 py-2 rounded-xl text-xs font-bold transition ${currentThemeMode==='system'?'bg-blue-600 text-white shadow-md':'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}">시스템 설정 따르기</button>
                                </div>
                            </div>
                            <div>
                                <p class="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">글자 크기 배율 (시니어·저시력 친화 모드)</p>
                                <div class="flex flex-wrap gap-2">
                                    ${[['100','기본 (100%)'],['110','크게 (110%)'],['120','아주 크게 (120%)']].map(([val, label]) => `<button onclick="setFontScale('${val}')" class="px-4 py-2 rounded-xl text-xs font-bold transition ${fontScale===val?'bg-emerald-600 text-white shadow-md':'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'}">${label}</button>`).join('')}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="${card}">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2"><i class="fa-solid fa-database text-blue-500 dark:text-blue-400"></i> 저장과 백업</h3>
                            <span class="text-xs font-bold px-2.5 py-1 rounded-lg ${s.lastBackupAt ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'}"><i class="fa-regular fa-clock mr-1"></i>마지막 백업: ${escapeHTML(s.lastBackupAt || '아직 백업 기록 없음')}</span>
                        </div>
                        <p class="text-xs leading-relaxed text-slate-600 dark:text-slate-300">기록은 현재 이 기기의 이 브라우저에 저장됩니다. 학기말이나 컴퓨터 교체 시 <b>통합 암호화 백업</b>으로 모든 자료를 한 번에 안전하게 보관하세요.</p>

                        <div class="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                            <div class="flex items-center justify-between">
                                <h4 class="text-sm font-extrabold text-emerald-900 dark:text-emerald-200"><i class="fa-solid fa-shield-halved mr-1"></i> 원클릭 통합 암호화 백업 (추천)</h4>
                            </div>
                            <p class="text-xs text-emerald-800 dark:text-emerald-300">학급 명단, 생기부 초안, 내 양식, 체크리스트, <b>학부모 상담 기록</b>까지 단 하나의 AES-256 암호화 파일로 묶어 내보내거나 복원합니다.</p>
                            <div class="flex flex-wrap gap-2 items-center">
                                <input id="full-backup-pw" type="password" autocomplete="new-password" placeholder="백업 비밀번호 (8자 이상)" class="w-full sm:w-64 min-w-0 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-xs text-slate-800 dark:text-slate-200 outline-none">
                                <button type="button" onclick="exportFullEncryptedBackup()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm transition"><i class="fa-solid fa-lock mr-1"></i>통합 암호화 백업 받기</button>
                                <label class="px-4 py-2 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 font-bold rounded-xl text-xs cursor-pointer hover:bg-emerald-100 transition shadow-sm"><i class="fa-solid fa-unlock mr-1"></i>통합 백업 복원하기<input type="file" accept=".json,application/json" onchange="importFullEncryptedBackup(event)" class="hidden"></label>
                            </div>
                        </div>

                        <div class="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-2">
                            <p class="text-xs font-bold text-slate-600 dark:text-slate-300">일반 백업 (암호화 없음 · 상담 기록 제외)</p>
                            <div class="flex flex-wrap gap-3">
                                <button onclick="backupData()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm"><i class="fa-solid fa-download mr-1"></i> 일반 데이터 백업</button>
                                <label class="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition shadow-sm"><i class="fa-solid fa-upload mr-1"></i> 일반 백업 파일 불러오기<input type="file" accept=".json,application/json" onchange="restoreData(event)" class="hidden"></label>
                            </div>
                            <p class="text-[11px] text-slate-500 dark:text-slate-400">일반 백업에는 개인정보 보호를 위해 상담 기록이 포함되지 않습니다.</p>
                        </div>
                        <p class="text-[11px] text-slate-400 dark:text-slate-500">교직어 데이터: ${escapeHTML(DATA_META.source)}${DATA_META.updatedAt ? ` · ${escapeHTML(DATA_META.updatedAt)} 기준` : ''} · 직접 작성 ${DATA_META.curated}개 / 전체 ${DB.length}개</p>
                    </div>

                    <div class="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-700 flex flex-col md:flex-row gap-4 md:items-center justify-between">
                        <div><h4 class="font-bold text-sm text-slate-900 dark:text-white mb-1">개인 기록 전체 초기화</h4><p class="text-xs text-slate-500 dark:text-slate-400">이 앱에 저장된 즐겨찾기, 진행률, 상담 기록 등 모든 기록을 삭제합니다.</p></div>
                        <button onclick="resetAllData()" class="px-5 py-2.5 bg-rose-50 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 font-bold rounded-xl text-sm hover:bg-rose-100 dark:hover:bg-rose-900/60 transition">전체 초기화</button>
                    </div>
                </div>
            ` + FOOTER_HTML;
            updateOfflineStatus();
            if (router.param === 'calendar') requestAnimationFrame(() => document.getElementById('school-calendar-card')?.scrollIntoView({ block: 'center' }));
            if (router.param === 'ai') requestAnimationFrame(() => document.getElementById('ai-settings-card')?.scrollIntoView({ block: 'center' }));
            if (router.param === 'vault') requestAnimationFrame(() => document.getElementById('vault-card')?.scrollIntoView({ block: 'center' }));
        }

        async function updateOfflineStatus() {
            const label = document.getElementById('offline-status'); if (!label) return;
            if (!('caches' in window)) { label.textContent = '이 브라우저에서는 오프라인 상태를 확인할 수 없습니다.'; return; }
            try {
                const keys = (await caches.keys()).filter(k => k.startsWith('gb1000-v'));
                if (!keys.length) {
                    label.textContent = '오프라인 열람 자료를 아직 모두 저장하지 못했습니다. 온라인에서 다시 열어 주세요.';
                    return;
                }
                const cacheName = keys.sort((a, b) => (parseInt(b.slice(8), 10) || 0) - (parseInt(a.slice(8), 10) || 0))[0];
                const cache = await caches.open(cacheName);
                const required = ['./index.html', './css/app.css', './js/data.js', './js/app.js', './terms.json', './data/legacy-map.json', './data/public-links.json', './data/content-meta.json'];
                const found = await Promise.all(required.map(path => cache.match(new URL(path, location.href))));
                label.textContent = found.every(Boolean) ? '이 기기에 핵심 자료가 저장되어 오프라인 열람을 준비했습니다.' : '오프라인 열람 자료를 아직 모두 저장하지 못했습니다. 온라인에서 다시 열어 주세요.';
            } catch (_) { label.textContent = '오프라인 상태를 확인하지 못했습니다.'; }
        }

        // --- 공통 및 시스템 기능 ---
        function setThemeMode(mode, silent = false) {
            Storage.set('theme_mode', mode); applyThemeMode();
            if (!silent) showToast('테마 변경 완료', 'info');
            // 교직함 화면일 때만 버튼 상태 갱신 (다른 화면의 입력·퀴즈 진행 상태가 초기화되지 않도록)
            if (router.current === 'mybox') router.render();
        }
        function toggleQuickDarkMode() { setThemeMode(document.documentElement.classList.contains('dark') ? 'light' : 'dark', true); }
        function updateThemeToggleLabels() {
            const label = document.documentElement.classList.contains('dark') ? '라이트 모드' : '다크 모드';
            document.querySelectorAll('[data-theme-toggle]').forEach(button => {
                button.textContent = label;
                button.setAttribute('aria-label', `${label}로 전환`);
            });
        }
        function applyThemeMode() {
            const mode = Storage.get('theme_mode', 'light');
            if(mode==='dark' || (mode==='system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) document.documentElement.classList.add('dark');
            else document.documentElement.classList.remove('dark');
            updateThemeToggleLabels();
        }
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if(Storage.get('theme_mode')==='system') applyThemeMode(); });

        // 이 앱의 저장 데이터를 백업 (상담 기록은 개인정보라 제외 → 상담 기록장의 암호화 백업 이용)
        const BACKUP_EXCLUDE = ['counsel_records'];
        const BACKUP_TYPES = {
            bookmarks:'array', recent_views:'array', quiz_wrongs:'array', learned_cards:'array', quiz_history:'array', recent_searches:'array',
            year_task_dates:'object', board_title:'string', board_tasks:'object', custom_templates:'array', settings:'object',
            class_names:'string', seat_opts:'object', seat_result:'object', pick_norepeat:'boolean', timetable:'object',
            record_drafts:'object', record_limits:'object', record_my_phrases:'array', counsel_schedule_opts:'object',
            theme_mode:'string', ics_year:'number', situation_runs:'object', start_courses:'object'
        };
        for (let month = 1; month <= 12; month++) BACKUP_TYPES[`checklist_${month}`] = 'object';
        const BACKUP_MAX_BYTES = 20 * 1024 * 1024;
        function validBackupDate(value) {
            if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
            const [year, month, day] = value.split('-').map(Number);
            const date = new Date(Date.UTC(year, month - 1, day));
            return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
        }
        function validBackupValue(key, value) {
            const type = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
            if (type !== BACKUP_TYPES[key]) return false;
            if (key === 'theme_mode' && !['light','dark','system'].includes(value)) return false;
            if (key === 'ics_year' && (!Number.isInteger(value) || value < 1900 || value > 2200)) return false;
            if (['bookmarks','recent_views','quiz_wrongs','learned_cards'].includes(key) && !value.every(id => Number.isInteger(id) && id > 0 && id <= 1000000)) return false;
            if (key.startsWith('checklist_') && !Object.entries(value).every(([index, done]) => /^\d+$/.test(index) && typeof done === 'boolean')) return false;
            if (key === 'recent_searches' && !value.every(query => typeof query === 'string')) return false;
            if (key === 'custom_templates' && !value.every(item => item && typeof item === 'object' && !Array.isArray(item) && ['id','title','content'].every(field => typeof item[field] === 'string'))) return false;
            if (key === 'settings' && !Object.entries(value).every(([name, field]) => typeof field === 'string'
                || (['weeklyReminder', 'usageStats'].includes(name) && typeof field === 'boolean')
                || (name === 'calendar' && field && typeof field === 'object' && !Array.isArray(field) && Object.values(field).every(validBackupDate)))) return false;
            if (key === 'start_courses' && !(Object.keys(value).every(k => ['active', 'done'].includes(k)) && (value.active === undefined || typeof value.active === 'string') && (value.done === undefined || (value.done && typeof value.done === 'object' && !Array.isArray(value.done) && Object.values(value.done).every(m => m && typeof m === 'object' && !Array.isArray(m) && Object.values(m).every(v => v === true)))))) return false;
            if (key === 'situation_runs' && !Object.values(value).every(run => run && typeof run === 'object' && !Array.isArray(run) && typeof run.startedAt === 'string' && run.checks && typeof run.checks === 'object' && Object.values(run.checks).every(t => typeof t === 'string'))) return false;
            if (key === 'record_limits' && !Object.values(value).every(limit => Number.isInteger(limit) && limit > 0)) return false;
            if (key === 'year_task_dates' && !Object.values(value).every(validBackupDate)) return false;
            if (key === 'seat_result' && value.date !== undefined && !validBackupDate(value.date)) return false;
            if (key === 'counsel_schedule_opts' && (value.from && !validBackupDate(value.from) || value.to && !validBackupDate(value.to))) return false;
            if (key === 'record_drafts' && !Object.values(value).every(text => typeof text === 'string')) return false;
            if (key === 'record_my_phrases' && !value.every(text => typeof text === 'string')) return false;
            return true;
        }
        function validateBackup(data) {
            if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('자료 형식이 올바르지 않습니다.');
            const entries = Object.entries(data);
            if (!entries.length) throw new Error('가져올 자료가 없습니다.');
            let count = 0;
            const visit = (value, depth) => {
                if (depth > 20) throw new Error('자료 구조가 너무 깊습니다.');
                if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) {
                    if (['__proto__','prototype','constructor'].includes(key)) throw new Error('안전하지 않은 자료 이름이 있습니다.');
                    if (++count > 20000) throw new Error('자료 항목이 20,000개를 넘습니다.');
                    visit(child, depth + 1);
                }
            };
            for (const [key, value] of entries) {
                if (!Object.prototype.hasOwnProperty.call(BACKUP_TYPES, key)) throw new Error(`지원하지 않는 자료 항목: ${key.slice(0, 60)}`);
                if (!validBackupValue(key, value)) throw new Error(`자료 형식 오류: ${key}`);
                visit(value, 0);
            }
            return entries;
        }
        function parseBackup(raw) {
            if (new TextEncoder().encode(raw).length > BACKUP_MAX_BYTES) throw new Error('백업 자료가 20 MiB를 넘습니다.');
            const payload = JSON.parse(raw);
            if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('백업 형식이 올바르지 않습니다.');
            const wrapped = Object.prototype.hasOwnProperty.call(payload, 'data');
            if (wrapped && (payload.app !== 'gyojik-baekseo-1000' || payload.version !== 3)) throw new Error('앱 또는 백업 버전이 다릅니다.');
            return validateBackup(wrapped ? payload.data : payload);
        }
        function backupData() {
            const data = {};
            Storage.error = null;
            const keys = Storage.ownKeys().filter(key => !BACKUP_EXCLUDE.includes(key) && !Vault.protects(key));
            if (Storage.error) { showToast('저장소 목록을 읽지 못해 백업을 중지했습니다.', 'error'); return; }
            for (const k of keys) {
                if (!Object.prototype.hasOwnProperty.call(BACKUP_TYPES, k)) continue;
                Storage.error = null;
                const val = Storage.get(k, null);
                if (Storage.error) { showToast('읽을 수 없는 자료가 있어 백업을 중지했습니다.', 'error'); return; }
                if (val !== null && val !== undefined) data[k] = val;
            }
            const today = ymd(new Date());
            data.settings = { ...(data.settings && typeof data.settings === 'object' && !Array.isArray(data.settings) ? data.settings : getSettings()), lastBackupAt: today };
            const payload = { app: 'gyojik-baekseo-1000', version: 3, exportedAt: new Date().toISOString(), data };
            try {
                validateBackup(data);
                const json = JSON.stringify(payload);
                if (new TextEncoder().encode(json).length > BACKUP_MAX_BYTES) throw new Error('백업 크기가 20 MiB를 넘습니다.');
                saveSetting('lastBackupAt', today);
                downloadFile(`baekseo_backup_${today}.json`, json, 'application/json');
                showToast('백업 파일을 만들었습니다. 다운로드 위치를 확인해 주세요.', 'success');
                if (router.current === 'mybox') router.render();
            } catch (err) { showToast(err.message, 'error'); }
        }

        function restoreData(e) {
            const f = e.target.files[0]; if(!f) return;
            e.target.value = '';
            if (f.size > BACKUP_MAX_BYTES) { showToast('백업 파일은 20 MiB 이하여야 합니다.', 'error'); return; }
            const r = new FileReader();
            r.onload = ev => {
                try {
                    const entries = parseBackup(String(ev.target.result));
                    if (Vault.isLocked() && entries.some(([key]) => Vault.KEYS.includes(key))) { showToast('개인 기록 잠금을 먼저 풀고 다시 가져와 주세요.', 'error'); return; }
                    const existing = new Set(Storage.ownKeys());
                    const conflicts = entries.filter(([key]) => existing.has(key)).length;
                    if (!confirm(`${entries.length}종류의 자료를 가져옵니다. 기존 자료 ${conflicts}종류는 교체됩니다. 계속할까요?`)) return;
                    const applied = [], failed = [];
                    for (const [key, value] of entries) (Storage.set(key, value) ? applied : failed).push(key);
                    if (failed.length) {
                        showToast(`일부만 적용됐습니다. 적용 ${applied.length}종류, 실패 ${failed.length}종류. 파일을 보관하고 다시 시도해 주세요.`, 'error');
                        return;
                    }
                    showToast('복원했습니다. 화면을 새로고침합니다.'); setTimeout(()=>window.location.reload(), 1000);
                } catch(err) { showToast(err.message || '올바른 백업 파일이 아닙니다.', 'error'); }
            };
            r.onerror = () => showToast('백업 파일을 읽지 못했습니다.', 'error');
            r.readAsText(f);
        }

        async function exportFullEncryptedBackup() {
            const pwEl = document.getElementById('full-backup-pw');
            const pw = pwEl ? pwEl.value : '';
            if (pw.length < 8) { showToast('비밀번호를 8자 이상 입력해 주세요.', 'error'); return; }
            if (!cryptoReady()) return;
            if (Vault.isLocked()) { showToast('개인 기록 잠금을 먼저 풀어야 상담 기록까지 백업할 수 있어요.', 'error'); router.navigate('counsel'); return; }
            const general = {};
            Storage.error = null;
            const keys = Storage.ownKeys().filter(key => !BACKUP_EXCLUDE.includes(key));
            if (Storage.error) { showToast('저장소 목록을 읽지 못해 백업을 중지했습니다.', 'error'); return; }
            for (const k of keys) {
                if (Object.prototype.hasOwnProperty.call(BACKUP_TYPES, k)) {
                    Storage.error = null;
                    const val = Storage.get(k, null);
                    if (Storage.error) { showToast('읽을 수 없는 자료가 있어 백업을 중지했습니다.', 'error'); return; }
                    if (val !== null && val !== undefined) general[k] = val;
                }
            }
            const today = ymd(new Date());
            general.settings = { ...(general.settings && typeof general.settings === 'object' && !Array.isArray(general.settings) ? general.settings : getSettings()), lastBackupAt: today };
            const counsel = getCounsel();
            try {
                validateBackup(general);
                const iterations = 250000; const salt = crypto.getRandomValues(new Uint8Array(16)); const iv = crypto.getRandomValues(new Uint8Array(12));
                const key = await deriveKey(pw, salt, iterations);
                const plain = new TextEncoder().encode(JSON.stringify({ general, counsel, exportedAt: new Date().toISOString() }));
                const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain);
                saveSetting('lastBackupAt', today);
                downloadFile(`교직백서_통합암호화백업_${today}.json`, JSON.stringify({ app: 'gyojik-baekseo-1000', type: 'full-encrypted', v: 1, kdf: 'PBKDF2-SHA256', iterations, salt: bufToB64(salt), iv: bufToB64(iv), data: bufToB64(ct) }), 'application/json');
                showToast('모든 데이터와 상담 기록을 통합 암호화 백업했습니다!', 'success');
                if (router.current === 'mybox') router.render();
            } catch (err) { showToast(err.message || '통합 암호화 백업 중 오류가 발생했습니다.', 'error'); }
        }

        async function importFullEncryptedBackup(e) {
            const f = e.target.files[0]; e.target.value = ''; if (!f) return;
            const pw = document.getElementById('full-backup-pw')?.value || '';
            if (!pw) { showToast('백업할 때 설정한 비밀번호를 먼저 입력해 주세요.', 'error'); return; }
            if (!cryptoReady()) return;
            try {
                const env = JSON.parse(await f.text());
                if (!env || env.type !== 'full-encrypted') { showToast('통합 암호화 백업 파일이 아닙니다.', 'error'); return; }
                let plain;
                try {
                    const key = await deriveKey(pw, b64ToBuf(env.salt), env.iterations || 250000);
                    plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBuf(env.iv) }, key, b64ToBuf(env.data));
                } catch (_) { showToast('비밀번호가 틀렸거나 파일이 손상되었습니다.', 'error'); return; }
                const payload = JSON.parse(new TextDecoder().decode(plain));
                if (Vault.isLocked()) { showToast('개인 기록 잠금을 먼저 풀고 다시 가져와 주세요.', 'error'); return; }
                const generalEntries = payload.general && Object.keys(payload.general).length ? validateBackup(payload.general) : [];
                const counselList = Array.isArray(payload.counsel) ? payload.counsel : [];
                if (!confirm(`일반 자료 ${generalEntries.length}종류와 상담 기록 ${counselList.length}건을 복원할까요?`)) return;
                const failed = [];
                for (const [k, v] of generalEntries) if (!Storage.set(k, v)) failed.push(k);
                if (counselList.length) {
                    const map = new Map(getCounsel().map(r => [r.id, r]));
                    counselList.forEach(r => { if (r && r.id) map.set(r.id, r); });
                    if (!saveCounsel([...map.values()])) failed.push('counsel_records');
                }
                if (failed.length) {
                    showToast(`일부 자료를 저장하지 못했습니다(${failed.length}종류). 다시 시도해 주세요.`, 'error');
                    return;
                }
                showToast('통합 백업을 복원했습니다. 화면을 새로고침합니다.');
                setTimeout(() => window.location.reload(), 900);
            } catch (err) { showToast(err.message || '백업 파일을 읽지 못했습니다.', 'error'); }
        }

        // ====================================================
        // 개인 기록 잠금 (보호 저장소): 상담 기록·상담 일정·생기부 초안을 비밀번호로 암호화해 IndexedDB에 저장
        // docs/DATA_CONTRACT.md M01–M05: 암호화 사본을 다시 읽어 검증한 뒤에만 평문을 지우고, 단계를 저장해 중단돼도 이어서 진행
        // ====================================================
        var Vault = {
            KEYS: ['counsel_records', 'counsel_schedule_opts', 'record_drafts'],
            DB_NAME: 'gb1000-vault', ITERATIONS: 250000, IDLE_MS: 15 * 60 * 1000,
            state: 'off', // off | locked | unlocked | unavailable
            stage: null, db: null, key: null, cache: {}, pending: Promise.resolve(), failed: false,
            lockHandle: null, channel: null, idleTimer: null,
            protects(k) { return (this.state === 'locked' || this.state === 'unlocked') && this.KEYS.includes(k); },
            isLocked() { return this.state === 'locked'; },
            get(k, def) {
                if (this.state !== 'unlocked' || !Object.prototype.hasOwnProperty.call(this.cache, k)) return def;
                return JSON.parse(JSON.stringify(this.cache[k]));
            },
            set(k, v) {
                if (this.state !== 'unlocked') { showToast('개인 기록 잠금을 먼저 풀어 주세요.', 'error'); return false; }
                const serialized = JSON.stringify(v);
                if (typeof serialized !== 'string') return false;
                this.cache[k] = JSON.parse(serialized);
                this.touch();
                this.pending = this.pending.then(() => this.writeItem(k, serialized)).then(() => { if (this.failed) { this.failed = false; showToast('개인 기록을 다시 저장했습니다.'); } }).catch(() => {
                    this.failed = true;
                    showToast('개인 기록을 암호화해 저장하지 못했습니다. 화면을 닫지 말고 다시 시도해 주세요.', 'error');
                });
                return true;
            },
            presentKeys() { return this.state === 'unlocked' ? this.KEYS.filter(k => Object.prototype.hasOwnProperty.call(this.cache, k)) : []; },
            // ---- IndexedDB ----
            open() {
                return new Promise((resolve, reject) => {
                    if (!('indexedDB' in window)) { reject(new Error('no-idb')); return; }
                    const req = indexedDB.open(this.DB_NAME, 1);
                    req.onupgradeneeded = () => { const db = req.result; ['meta', 'items', 'snapshots'].forEach(name => { if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' }); }); };
                    req.onsuccess = () => {
                        const db = req.result;
                        // 다른 탭이 보호를 끄거나 초기화하면 연결을 닫아 삭제가 막히지 않게 함
                        db.onversionchange = () => {
                            db.close(); if (this.db === db) this.db = null;
                            this.key = null; this.cache = {}; clearTimeout(this.idleTimer); this.releaseEditLock();
                            this.state = 'off'; this.stage = null;
                            setTimeout(() => this.open().then(fresh => { this.db = fresh; }).catch(() => { this.state = 'unavailable'; }), 300);
                            if (['counsel', 'tools-record', 'mybox'].includes(router.current)) router.render();
                        };
                        resolve(db);
                    };
                    req.onerror = () => reject(req.error);
                });
            },
            tx(store, mode, fn) {
                return new Promise((resolve, reject) => {
                    const t = this.db.transaction(store, mode); const os = t.objectStore(store); let result;
                    const r = fn(os); if (r) r.onsuccess = () => { result = r.result; };
                    t.oncomplete = () => resolve(result); t.onerror = () => reject(t.error); t.onabort = () => reject(t.error || new Error('abort'));
                });
            },
            getRec(store, id) { return this.tx(store, 'readonly', os => os.get(id)); },
            putRec(store, rec) { return this.tx(store, 'readwrite', os => os.put(rec)); },
            async encrypt(text) {
                const iv = crypto.getRandomValues(new Uint8Array(12));
                const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, this.key, new TextEncoder().encode(text));
                return { iv: bufToB64(iv), data: bufToB64(data) };
            },
            async decrypt(env, key = this.key) { return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBuf(env.iv) }, key, b64ToBuf(env.data))); },
            async writeItem(k, serialized) {
                const prev = await this.getRec('items', k);
                const env = await this.encrypt(serialized);
                await this.putRec('items', { id: k, ...env, revision: (prev?.revision || 0) + 1, updatedAt: new Date().toISOString() });
            },
            async setStage(stage) { const meta = await this.getRec('meta', 'meta'); meta.stage = stage; meta.stageAt = new Date().toISOString(); await this.putRec('meta', meta); this.stage = stage; },
            // ---- 시작 ----
            async init() {
                try {
                    if (!window.crypto?.subtle) throw new Error('no-crypto');
                    this.db = await this.open();
                    const meta = await this.getRec('meta', 'meta');
                    this.state = meta ? 'locked' : 'off'; this.stage = meta?.stage || null;
                } catch (_) { this.state = 'unavailable'; }
                try {
                    this.channel = new BroadcastChannel('gb1000-vault');
                    this.channel.onmessage = ev => { if (ev.data === 'release' && this.state === 'unlocked') this.lock('다른 탭에서 개인 기록을 열어 이 탭은 잠갔습니다.'); };
                } catch (_) {}
                ['pointerdown', 'keydown'].forEach(type => window.addEventListener(type, () => this.touch(), { passive: true }));
                window.addEventListener('beforeunload', e => { if (this.failed) { e.preventDefault(); e.returnValue = ''; } });
            },
            touch() {
                if (this.state !== 'unlocked') return;
                clearTimeout(this.idleTimer);
                this.idleTimer = setTimeout(() => this.lock('15분 동안 사용하지 않아 개인 기록을 잠갔습니다.'), this.IDLE_MS);
            },
            // 한 번에 한 탭만 편집: Web Locks로 잡고, 다른 탭이 잡고 있으면 그 탭에 잠금 요청
            async acquireEditLock() {
                if (!navigator.locks) { this.channel?.postMessage('release'); return true; }
                const tryOnce = () => new Promise(resolve => {
                    navigator.locks.request('gb1000-vault-edit', { ifAvailable: true }, lock => {
                        if (!lock) { resolve(false); return; }
                        resolve(true);
                        return new Promise(release => { this.lockHandle = release; });
                    });
                });
                if (await tryOnce()) return true;
                this.channel?.postMessage('release');
                for (let i = 0; i < 10; i++) { await new Promise(r => setTimeout(r, 300)); if (await tryOnce()) return true; }
                return false;
            },
            releaseEditLock() { if (this.lockHandle) { this.lockHandle(); this.lockHandle = null; } },
            async unlock(pw) {
                if (this.state !== 'locked') return false;
                const meta = await this.getRec('meta', 'meta');
                let key;
                try { key = await deriveKey(pw, b64ToBuf(meta.salt), meta.iterations); if (await this.decrypt(meta.check, key) !== 'gb1000-vault') throw new Error('bad'); }
                catch (_) { return 'wrong'; }
                if (!(await this.acquireEditLock())) return 'busy';
                this.key = key; this.cache = {};
                for (const k of this.KEYS) { const rec = await this.getRec('items', k); if (rec) this.cache[k] = JSON.parse(await this.decrypt(rec)); }
                this.state = 'unlocked'; this.touch();
                if (meta.stage !== 'complete') { // 중단된 보호 작업 이어서
                    try { await this.migrate(); } catch (_) { showToast('남은 보호 작업을 마치지 못했습니다. 기록은 그대로 있으며 다음에 잠금을 풀 때 다시 시도합니다.', 'error'); }
                }
                return true;
            },
            async lock(message) {
                if (this.state !== 'unlocked') return;
                if (typeof saveRecordDraftNow === 'function' && router.current === 'tools-record') saveRecordDraftNow();
                let settled; do { settled = this.pending; await settled.catch(() => {}); } while (settled !== this.pending); // 기다리는 동안 들어온 저장까지 마친 뒤 잠금
                if (this.state !== 'unlocked') return;
                this.key = null; this.cache = {}; this.state = 'locked'; clearTimeout(this.idleTimer);
                this.releaseEditLock();
                if (message) showToast(message, 'info');
                if (['counsel', 'tools-record', 'mybox'].includes(router.current)) router.render();
            },
            // ---- 켜기 / 이전 (M01–M05) ----
            rawLocal(k) { const out = {}; [Storage.PREFIX, Storage.LEGACY].forEach(p => { const v = localStorage.getItem(p + k); if (v !== null) out[p + k] = v; }); return out; },
            readPlain(k) {
                const pick = raw => { try { return { ok: true, value: JSON.parse(raw) }; } catch (_) { return { ok: false }; } };
                const cur = localStorage.getItem(Storage.PREFIX + k), leg = localStorage.getItem(Storage.LEGACY + k);
                if (cur !== null) { const r = pick(cur); if (r.ok) return r; }
                if (leg !== null) { const r = pick(leg); if (r.ok) return r; }
                return { ok: false, missing: cur === null && leg === null };
            },
            async enable(pw) {
                if (this.state !== 'off') return false;
                const salt = crypto.getRandomValues(new Uint8Array(16));
                this.key = await deriveKey(pw, salt, this.ITERATIONS);
                if (!(await this.acquireEditLock())) { this.key = null; return 'busy'; }
                const check = await this.encrypt('gb1000-vault');
                await this.putRec('meta', { id: 'meta', v: 1, kdf: 'PBKDF2-SHA256', iterations: this.ITERATIONS, salt: bufToB64(salt), check, stage: 'detected', createdAt: new Date().toISOString() });
                this.cache = {}; this.state = 'unlocked'; this.touch();
                await this.migrate();
                return true;
            },
            // 평문 원본(손상된 값 포함)을 암호화 스냅숏에 더하고 다시 읽어 확인. 같은 키의 다른 값은 시각을 붙여 함께 보관
            async snapshotRaw() {
                const raw = {}; this.KEYS.forEach(k => Object.assign(raw, this.rawLocal(k)));
                const prev = await this.getRec('snapshots', 'legacy-raw');
                const merged = prev ? JSON.parse(await this.decrypt(prev)) : {};
                const stamp = new Date().toISOString();
                for (const [full, value] of Object.entries(raw)) {
                    if (merged[full] === undefined) merged[full] = value;
                    else if (merged[full] !== value && !Object.values(merged).includes(value)) merged[`${full}@${stamp}`] = value;
                }
                if (prev && !Object.keys(raw).length) return raw;
                await this.putRec('snapshots', { id: 'legacy-raw', ...(await this.encrypt(JSON.stringify(merged))), takenAt: stamp });
                const check = JSON.parse(await this.decrypt(await this.getRec('snapshots', 'legacy-raw')));
                for (const value of Object.values(raw)) if (!Object.values(check).includes(value)) throw new Error('verify snapshot');
                return raw;
            },
            async migrate() {
                const meta = await this.getRec('meta', 'meta'); let stage = meta.stage;
                if (stage === 'detected' || stage === 'snapshotted' || stage === 'converted' || stage === 'verified') {
                    // 1) 원본(두 접두어, 손상된 값 포함) 암호화 스냅숏
                    await this.snapshotRaw();
                    await this.setStage('snapshotted');
                    // 2) 변환: 평문이 남아 있는 키만 (보호 저장소에 이미 있는 값은 그대로)
                    const plain = {};
                    for (const k of this.KEYS) { const r = this.readPlain(k); if (r.ok && !Object.prototype.hasOwnProperty.call(this.cache, k)) plain[k] = r.value; }
                    for (const [k, v] of Object.entries(plain)) { this.cache[k] = v; await this.writeItem(k, JSON.stringify(v)); }
                    await this.setStage('converted');
                    // 3) 검증: 다시 읽어 복호화한 값과 스냅숏 바이트 비교
                    for (const [k, v] of Object.entries(plain)) {
                        const rec = await this.getRec('items', k);
                        if (!rec || await this.decrypt(rec) !== JSON.stringify(v)) throw new Error(`verify ${k}`);
                    }
                    await this.setStage('verified');
                    stage = 'verified';
                }
                if (stage === 'verified' || stage === 'cleanupPending') {
                    // 4) 정리: 검증된 키의 평문만 두 접두어에서 삭제하고 삭제를 확인 (지우기 직전 남은 평문도 스냅숏에 보관)
                    await this.setStage('cleanupPending');
                    await this.snapshotRaw();
                    const leftover = [];
                    for (const k of this.KEYS) {
                        const r = this.readPlain(k);
                        if (r.missing) continue;
                        if (r.ok && !Object.prototype.hasOwnProperty.call(this.cache, k)) { leftover.push(k); continue; } // 검증 전 값은 지우지 않음
                        [Storage.PREFIX, Storage.LEGACY].forEach(p => { try { localStorage.removeItem(p + k); } catch (_) {} });
                        if (Object.keys(this.rawLocal(k)).length) leftover.push(k);
                    }
                    if (leftover.length) { showToast('일부 평문 기록을 지우지 못했습니다. 다음에 잠금을 풀 때 다시 시도합니다.', 'error'); return false; }
                    await this.setStage('complete');
                }
                return true;
            },
            // 끄기: 복호화한 기록을 원래 위치로 되돌리고 확인한 뒤 보호 저장소 삭제
            async disable() {
                if (this.state !== 'unlocked') return false;
                await this.pending.catch(() => {});
                for (const k of this.KEYS) if (Object.prototype.hasOwnProperty.call(this.cache, k)) localStorage.setItem(Storage.PREFIX + k, JSON.stringify(this.cache[k]));
                for (const k of this.KEYS) if (Object.prototype.hasOwnProperty.call(this.cache, k) && localStorage.getItem(Storage.PREFIX + k) !== JSON.stringify(this.cache[k])) throw new Error('restore');
                // 변환하지 못한(손상된) 원본은 스냅숏에서 원래 키로 되돌려 보존
                const snap = await this.getRec('snapshots', 'legacy-raw');
                if (snap) {
                    const raw = JSON.parse(await this.decrypt(snap));
                    for (const [full, value] of Object.entries(raw)) {
                        if (full.includes('@')) continue;
                        const k = full.startsWith(Storage.PREFIX) ? full.slice(Storage.PREFIX.length) : full.slice(Storage.LEGACY.length);
                        if (!Object.prototype.hasOwnProperty.call(this.cache, k) && localStorage.getItem(full) === null) localStorage.setItem(full, value);
                    }
                }
                await this.destroy();
                return true;
            },
            async destroy() {
                this.key = null; this.cache = {}; clearTimeout(this.idleTimer); this.releaseEditLock();
                try { this.db?.close(); } catch (_) {}
                await new Promise(resolve => { const req = indexedDB.deleteDatabase(this.DB_NAME); req.onsuccess = req.onerror = req.onblocked = () => resolve(); });
                this.db = null; this.state = 'off'; this.stage = null;
                try { this.db = await this.open(); } catch (_) { this.state = 'unavailable'; }
            }
        };
        function vaultLockHTML(where) {
            return `
                <div class="max-w-md mx-auto mt-6 p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 animate-fade-in">
                    <div class="flex items-center gap-3"><span class="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-lg"><i class="fa-solid fa-lock"></i></span>
                    <div><h2 class="text-lg font-black text-slate-900 dark:text-white">개인 기록이 잠겨 있어요</h2><p class="text-xs text-slate-500 dark:text-slate-400">${where}은(는) 암호화되어 이 기기에 저장되어 있습니다.</p></div></div>
                    <label class="block text-xs font-bold text-slate-600 dark:text-slate-300">잠금 비밀번호<input id="vault-pw" type="password" autocomplete="current-password" class="mt-1 w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm" onkeydown="if (event.key === 'Enter') unlockVaultFromForm()"></label>
                    <p id="vault-msg" class="text-xs text-rose-600 min-h-[1rem]" aria-live="polite"></p>
                    <button type="button" onclick="unlockVaultFromForm()" class="w-full min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold">잠금 풀기</button>
                    <p class="text-[11px] text-slate-400 dark:text-slate-500">15분 동안 쓰지 않거나 화면을 새로 열면 다시 잠깁니다. 비밀번호를 잊으면 나의 교직함 › 개인 기록 잠금에서 보호 저장소를 초기화할 수 있지만, 잠긴 기록은 되살릴 수 없습니다.</p>
                </div>`;
        }
        async function unlockVaultFromForm() {
            const pw = document.getElementById('vault-pw')?.value || ''; const msg = document.getElementById('vault-msg');
            if (!pw) { if (msg) msg.textContent = '비밀번호를 입력해 주세요.'; return; }
            if (msg) { msg.className = 'text-xs text-slate-500 min-h-[1rem]'; msg.textContent = '확인 중…'; }
            const r = await Vault.unlock(pw).catch(() => 'error');
            if (r === true) { showToast('개인 기록 잠금을 풀었습니다.'); router.render(); return; }
            if (msg) { msg.className = 'text-xs text-rose-600 min-h-[1rem]'; msg.textContent = r === 'wrong' ? '비밀번호가 맞지 않습니다.' : r === 'busy' ? '다른 탭에서 쓰는 중입니다. 그 탭을 닫거나 잠근 뒤 다시 시도해 주세요.' : '잠금을 풀지 못했습니다. 다시 시도해 주세요.'; }
        }
        async function enableVaultFromForm() {
            const pw = document.getElementById('vault-new-pw')?.value || ''; const pw2 = document.getElementById('vault-new-pw2')?.value || '';
            if (pw.length < 8) { showToast('비밀번호를 8자 이상으로 정해 주세요.', 'error'); return; }
            if (pw !== pw2) { showToast('두 비밀번호가 다릅니다.', 'error'); return; }
            if (!confirm('비밀번호를 잊으면 잠긴 기록을 되살릴 수 없습니다. 먼저 통합 암호화 백업을 받아 두셨나요? 계속할까요?')) return;
            try {
                const r = await Vault.enable(pw);
                if (r === 'busy') { showToast('다른 탭에서 쓰는 중입니다. 다른 탭을 닫고 다시 시도해 주세요.', 'error'); return; }
                showToast(Vault.stage === 'complete' ? '개인 기록을 암호화해 보호했습니다.' : '암호화는 끝났지만 일부 정리가 남았습니다. 다음에 잠금을 풀 때 이어서 합니다.', Vault.stage === 'complete' ? 'success' : 'error');
            } catch (_) { showToast('보호 작업을 마치지 못했습니다. 기존 기록은 그대로 있습니다. 다시 시도해 주세요.', 'error'); }
            router.render();
        }
        async function disableVaultFromUi() {
            if (!confirm('보호를 끄면 상담 기록·생기부 초안이 다시 암호화 없이 이 브라우저에 저장됩니다. 계속할까요?')) return;
            try { await Vault.disable(); showToast('보호를 껐습니다. 기록은 그대로 남아 있습니다.'); } catch (_) { showToast('보호를 끄지 못했습니다. 기록은 보호 저장소에 그대로 있습니다.', 'error'); }
            router.render();
        }
        async function resetVaultFromUi() {
            if (!confirm('비밀번호를 잊은 경우에만 쓰세요. 잠긴 상담 기록과 생기부 초안이 모두 영구 삭제됩니다. 정말 초기화할까요?')) return;
            if (prompt('확인을 위해 "초기화"라고 입력해 주세요.') !== '초기화') return;
            await Vault.destroy(); showToast('보호 저장소를 초기화했습니다.'); router.render();
        }
        function vaultCardHTML(card) {
            const st = Vault.state;
            const field = 'w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm mt-1';
            return `
                    <div id="vault-card" class="${card}">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2"><i class="fa-solid fa-lock text-indigo-500"></i> 개인 기록 잠금</h3>
                            <span class="text-xs font-bold px-2.5 py-1 rounded-lg ${st === 'unlocked' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : st === 'locked' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}">${st === 'unlocked' ? '보호 중 · 열림' : st === 'locked' ? '보호 중 · 잠김' : st === 'unavailable' ? '이 브라우저에서 사용 불가' : '꺼짐'}</span>
                        </div>
                        <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">상담 기록, 상담주간 일정(학생·학부모 이름), 생기부 초안을 비밀번호로 암호화해 저장합니다. 암호화 사본을 다시 읽어 확인한 다음에만 암호화되지 않은 원래 기록을 지웁니다. 잠긴 동안에는 두 도구를 열 때 비밀번호가 필요하고, 일반 백업에는 이 기록이 들어가지 않습니다(통합 암호화 백업에는 포함).</p>
                        ${st === 'off' ? `
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label class="text-xs font-semibold text-slate-500 dark:text-slate-400">새 비밀번호 (8자 이상)<input id="vault-new-pw" type="password" autocomplete="new-password" class="${field}"></label>
                            <label class="text-xs font-semibold text-slate-500 dark:text-slate-400">비밀번호 확인<input id="vault-new-pw2" type="password" autocomplete="new-password" class="${field}"></label>
                        </div>
                        <button type="button" onclick="enableVaultFromForm()" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold">잠금 켜기</button>` : ''}
                        ${st === 'unlocked' ? `<div class="flex flex-wrap gap-2"><button type="button" onclick="Vault.lock('개인 기록을 잠갔습니다.')" class="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold">지금 잠그기</button><button type="button" onclick="disableVaultFromUi()" class="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200">보호 끄기</button></div>` : ''}
                        ${st === 'locked' ? `<div class="flex flex-wrap gap-2"><button type="button" onclick="router.navigate('counsel')" class="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold">잠금 풀러 가기</button><button type="button" onclick="resetVaultFromUi()" class="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:underline">비밀번호를 잊었어요 (초기화)</button></div>` : ''}
                    </div>

`;
        }

        async function resetAllData() {
            if (!confirm('정말로 모든 기록을 지우시겠습니까? 복구할 수 없습니다.')) return;
            if (!Storage.clearAll()) return; // 같은 github.io 도메인의 다른 앱 자료는 건드리지 않음
            await Vault.destroy();
            aiSetKey('', false); // AI 문장 도우미 키도 함께 삭제
            window.location.hash = ''; window.location.reload();
        }

        // ====================================================
        // 공통 유틸 (날짜 · 파일 · 인쇄 · 소리 · 기본 정보)
        // ====================================================
        const WEEKDAYS = ['일','월','화','수','목','금','토'];
        function pad2(n) { return String(n).padStart(2, '0'); }
        function ymd(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
        function parseYMD(s) {
            if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(NaN);
            const [y, m, d] = s.split('-').map(Number);
            const dt = new Date(y, m - 1, d);
            return dt.getFullYear() === y && dt.getMonth() + 1 === m && dt.getDate() === d ? dt : new Date(NaN);
        }
        // 우리 학교 학사일정 (설정 > calendar). 입력한 날짜만 쓰고, 비어 있으면 표시하지 않음
        const SCHOOL_EVENTS = [
            { key: 'sem1Start', label: '1학기 개학' },
            { key: 'summerStart', label: '여름방학' },
            { key: 'sem2Start', label: '2학기 개학' },
            { key: 'winterStart', label: '겨울방학' },
            { key: 'yearEnd', label: '종업식' }
        ];
        function schoolCalendar() { const c = getSettings().calendar; return c && typeof c === 'object' ? c : {}; }
        function nextSchoolEvent(now = new Date()) {
            const cal = schoolCalendar();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            return SCHOOL_EVENTS
                .map(ev => ({ ...ev, date: parseYMD(cal[ev.key] || '') }))
                .filter(ev => !isNaN(ev.date) && ev.date >= today)
                .map(ev => ({ ...ev, days: Math.round((ev.date - today) / 86400000) }))
                .sort((a, b) => a.days - b.days)[0] || null;
        }
        function saveSchoolCalendar(key, value) {
            if (!SCHOOL_EVENTS.some(ev => ev.key === key)) return;
            const cal = { ...schoolCalendar() };
            if (value && !isNaN(parseYMD(value))) cal[key] = value; else delete cal[key];
            if (saveSetting('calendar', cal)) showToast('학사일정을 저장했습니다.');
        }
        function koreanDate(d = new Date()) { return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.(${WEEKDAYS[d.getDay()]})`; }
        // 나이스 글자 수 기준: 한글 3바이트, 영문·숫자·공백 1바이트, 줄바꿈 2바이트
        function neisBytes(str) { let b = 0; for (const ch of String(str || '')) { if (ch === '\n') b += 2; else if (ch === '\r') continue; else b += ch.charCodeAt(0) > 127 ? 3 : 1; } return b; }

        function downloadFile(filename, content, mime) {
            const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1500);
        }
        function printHTML(html) {
            const root = document.getElementById('print-root'); if (!root) return;
            root.innerHTML = html;
            const cleanup = () => { root.innerHTML = ''; window.removeEventListener('afterprint', cleanup); };
            window.addEventListener('afterprint', cleanup);
            setTimeout(() => window.print(), 80);
        }

        function getSettings() { return { schoolName: '', teacherName: '', className: '', ...Storage.get('settings', {}) }; }
        function saveSetting(k, v) { const s = getSettings(); s[k] = v; return Storage.set('settings', s); }

        let audioCtx = null;
        function unlockAudio() { try { if (!audioCtx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) audioCtx = new AC(); } if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); } catch (e) {} }
        function beep(times = 3, freq = 880) {
            unlockAudio(); if (!audioCtx) return;
            try {
                for (let i = 0; i < times; i++) {
                    const t = audioCtx.currentTime + i * 0.45; const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
                    o.type = 'sine'; o.frequency.value = freq;
                    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.4, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
                    o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + 0.4);
                }
            } catch (e) {}
        }
        document.addEventListener('pointerdown', unlockAudio, { once: true });

        // ====================================================
        // 3. 시간표 · 종 알림
        // ====================================================
        const TT_DAYS = ['월','화','수','목','금'];
        const DEFAULT_PERIODS = [['09:00','09:40'], ['09:50','10:30'], ['10:50','11:30'], ['11:40','12:20'], ['13:20','14:00'], ['14:10','14:50']];
        let clockInterval = null, bellInterval = null;
        const firedBells = new Set();

        function getTimetable() {
            const t = Storage.get('timetable', null) || {};
            const periods = Array.isArray(t.periods) && t.periods.length ? t.periods : DEFAULT_PERIODS.map(([start, end]) => ({ start, end }));
            const grid = (t.grid && typeof t.grid === 'object') ? t.grid : {};
            TT_DAYS.forEach((_, di) => { if (!Array.isArray(grid[di])) grid[di] = []; });
            return { periods, grid, alertEnd: Number(t.alertEnd) || 0, alertStart: Number(t.alertStart) || 0, sound: t.sound !== false, notify: !!t.notify };
        }
        function saveTimetable(t) { return Storage.set('timetable', t); }
        function toMin(hhmm) { const [h, m] = String(hhmm || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); }

        function getNowStatus(date = new Date()) {
            const tt = getTimetable(); const dow = date.getDay();
            if (dow === 0 || dow === 6) return { kind: 'off', title: '주말', sub: '푹 쉬세요, 선생님!' };
            const di = dow - 1; const now = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
            const ps = tt.periods.map((p, i) => ({ i, s: toMin(p.start), e: toMin(p.end), subj: (tt.grid[di] || [])[i] || '' })).filter(p => p.e > p.s).sort((a, b) => a.s - b.s);
            if (!ps.length) return { kind: 'off', title: '시간표 없음', sub: '시간표를 입력해 주세요' };
            const fmt = m => { m = Math.max(1, Math.ceil(m)); return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`; };
            const name = p => `${p.i + 1}교시${p.subj ? `(${p.subj})` : ''}`;
            const cur = ps.find(p => now >= p.s && now < p.e);
            if (cur) return { kind: 'class', title: `${cur.i + 1}교시${cur.subj ? ` · ${cur.subj}` : ''}`, sub: `끝나기까지 ${fmt(cur.e - now)}`, progress: (now - cur.s) / (cur.e - cur.s) };
            const next = ps.find(p => p.s > now);
            if (!next) return { kind: 'done', title: '오늘 수업 끝', sub: '오늘도 고생 많으셨어요' };
            const prev = [...ps].reverse().find(p => p.e <= now);
            if (!prev) return { kind: 'before', title: '수업 시작 전', sub: `${name(next)} 시작까지 ${fmt(next.s - now)}` };
            const gap = next.s - prev.e;
            return { kind: 'break', title: gap >= 40 ? '점심시간' : (gap >= 20 ? '중간놀이 시간' : '쉬는 시간'), sub: `${name(next)} 시작까지 ${fmt(next.s - now)}` };
        }
        function refreshNowStatus() {
            const st = getNowStatus();
            document.querySelectorAll('.now-status-title').forEach(el => el.textContent = st.title);
            document.querySelectorAll('.now-status-sub').forEach(el => el.textContent = st.sub);
            document.querySelectorAll('.now-status-bar').forEach(el => { el.style.width = st.kind === 'class' ? `${Math.round(st.progress * 100)}%` : '0%'; });
            const d = new Date(); document.querySelectorAll('.now-clock').forEach(el => el.textContent = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`);
        }
        function startClock() {
            if (clockInterval) clearInterval(clockInterval);
            refreshNowStatus();
            clockInterval = setInterval(() => { if (!document.querySelector('.now-status-title, .now-clock')) { clearInterval(clockInterval); clockInterval = null; return; } refreshNowStatus(); }, 10000);
        }

        // 종 알림: 앱(탭)이 열려 있는 동안 20초마다 확인. 백그라운드 탭은 브라우저가 1분 단위로 늦출 수 있어 2분 창으로 검사
        function checkBells() {
            const tt = getTimetable(); if (!(tt.alertEnd > 0 || tt.alertStart > 0)) return;
            const d = new Date(); const dow = d.getDay(); if (dow === 0 || dow === 6) return;
            const nowMin = d.getHours() * 60 + d.getMinutes(); const di = dow - 1; const day = ymd(d);
            const inWindow = target => nowMin >= target && nowMin < target + 2;
            tt.periods.forEach((p, i) => {
                const subj = (tt.grid[di] || [])[i] || '';
                if (toMin(p.end) <= toMin(p.start)) return;
                if (tt.alertEnd > 0 && inWindow(toMin(p.end) - tt.alertEnd)) fireBell(`${day}-e${i}`, `${i + 1}교시 끝나기 ${tt.alertEnd}분 전`, subj ? `${subj} 수업을 마무리할 시간이에요.` : '수업을 마무리할 시간이에요.', tt);
                if (tt.alertStart > 0 && inWindow(toMin(p.start) - tt.alertStart)) fireBell(`${day}-s${i}`, `${i + 1}교시 시작 ${tt.alertStart}분 전`, subj ? `다음 시간은 ${subj}입니다.` : '다음 수업을 준비하세요.', tt);
            });
        }
        function fireBell(key, title, body, tt, force = false) {
            if (!force) { if (firedBells.has(key)) return; firedBells.add(key); }
            showToast(`🔔 ${title} · ${body}`, 'info');
            if (tt.sound) beep(2, 660);
            if (tt.notify && 'Notification' in window && Notification.permission === 'granted') {
                const opts = { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: key };
                const plain = () => { try { new Notification(title, opts); } catch (e) {} };
                if ('serviceWorker' in navigator && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then(r => r.showNotification(title, opts)).catch(plain);
                else plain();
            }
        }
        function startBellWatcher() { if (bellInterval) return; checkBells(); bellInterval = setInterval(checkBells, 20000); }

        let ttEditRow = -1; // 휴대폰: 시간을 고칠 교시 (그 줄만 시간 입력칸을 펼침)
        function renderTimetable(container) {
            const tt = getTimetable(); const todayIdx = new Date().getDay() - 1;
            const inp = 'w-full min-w-[36px] sm:min-w-[64px] px-1 sm:px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm text-center outline-none focus:ring-2 focus:ring-blue-500';
            const sel = (key, val) => `<select onchange="setTTOption('${key}', Number(this.value))" class="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200">${[0,1,2,3,5,10].map(n => `<option value="${n}" ${val === n ? 'selected' : ''}>${n ? `${n}분 전` : '끄기'}</option>`).join('')}</select>`;
            container.innerHTML = `
                <div class="space-y-6 animate-fade-in">
                    <div><h2 class="text-2xl font-bold tracking-tight mb-1 text-slate-900 dark:text-white">시간표 · 종 알림</h2><p class="text-sm text-slate-500 dark:text-slate-400">우리 반 시간표를 입력하면 홈 화면에 '지금 몇 교시인지'가 보이고, 수업 끝나기 전에 알려 드려요.</p></div>

                    <div class="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <p class="text-xs font-bold text-blue-100 mb-1"><span class="now-clock">--:--</span> · 지금은</p>
                            <p class="now-status-title text-3xl font-extrabold">-</p>
                            <p class="now-status-sub text-sm text-blue-100 mt-1">-</p>
                            <div class="w-full md:w-72 bg-white/20 h-1.5 rounded-full overflow-hidden mt-3"><div class="now-status-bar bg-white h-full transition-all" style="width:0%"></div></div>
                        </div>
                        <button onclick="openPresent('clock')" class="self-start md:self-center px-4 py-2.5 bg-white/15 hover:bg-white/25 rounded-xl text-sm font-bold"><i class="fa-solid fa-expand"></i> 교실 화면에 띄우기</button>
                    </div>

                    <div class="bg-white dark:bg-slate-800 p-2 sm:p-4 md:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <h3 class="text-sm font-bold text-slate-900 dark:text-white">주간 시간표 <span class="text-[11px] font-medium text-slate-400 whitespace-nowrap">(칸을 눌러 바로 입력 · 자동 저장)</span></h3>
                            <div class="flex flex-wrap gap-2">
                                <button onclick="addPeriod()" class="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg">+ 교시 추가</button>
                                <button onclick="resetPeriods()" class="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg">기본 시간 복원</button>
                                <button onclick="printTimetable()" class="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg"><i class="fa-solid fa-print"></i> 인쇄</button>
                            </div>
                        </div>
                        <div class="overflow-x-auto -mx-1 px-1">
                            <table class="w-full text-sm sm:min-w-[520px] md:min-w-[640px] border-separate" style="border-spacing:2px">
                                <thead><tr class="text-xs text-slate-500 dark:text-slate-400"><th class="w-5 sm:w-10 whitespace-nowrap text-[11px] sm:text-xs">교시</th><th class="w-[52px] sm:w-48 whitespace-nowrap">시간</th>${TT_DAYS.map((d, di) => `<th class="${di === todayIdx ? 'text-blue-600 dark:text-blue-400' : ''}">${d}${di === todayIdx ? '<span class="hidden sm:inline"> (오늘)</span>' : ''}</th>`).join('')}<th class="w-8"></th></tr></thead>
                                <tbody>${tt.periods.map((p, i) => `
                                    <tr>
                                        <td class="text-center font-bold text-slate-700 dark:text-slate-200">${i + 1}</td>
                                        <td><button type="button" onclick="ttEditRow = ${i}; rerenderKeepScroll()" class="${ttEditRow === i ? 'hidden' : 'block'} sm:hidden w-full py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] leading-tight font-semibold tabular-nums text-slate-700 dark:text-slate-200" aria-label="${i + 1}교시 시간 ${escapeHTML(p.start)}부터 ${escapeHTML(p.end)}까지, 눌러서 고치기">${escapeHTML(p.start)}<br><span class="text-slate-400">~</span>${escapeHTML(p.end)}</button><div class="${ttEditRow === i ? 'flex' : 'hidden'} sm:flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-1 whitespace-nowrap"><input type="time" value="${escapeHTML(p.start)}" onchange="updatePeriod(${i}, 'start', this.value)" class="${inp} !px-1 tt-time" aria-label="${i + 1}교시 시작"><span class="hidden sm:inline text-slate-400">~</span><input type="time" value="${escapeHTML(p.end)}" onchange="updatePeriod(${i}, 'end', this.value)" class="${inp} !px-1 tt-time" aria-label="${i + 1}교시 끝"></div></td>
                                        ${TT_DAYS.map((d, di) => `<td><input type="text" maxlength="12" value="${escapeHTML((tt.grid[di] || [])[i] || '')}" oninput="updateSubject(${di}, ${i}, this.value)" placeholder="-" class="${inp} ${di === todayIdx ? 'ring-1 ring-blue-300 dark:ring-blue-700' : ''}" aria-label="${d}요일 ${i + 1}교시 과목"></td>`).join('')}
                                        <td class="w-4 sm:w-8"><button onclick="removePeriod(${i})" class="text-slate-400 hover:text-rose-500 p-0 sm:p-1 text-xs sm:text-sm" aria-label="${i + 1}교시 삭제"><i class="fa-solid fa-xmark"></i></button></td>
                                    </tr>`).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4">
                        <h3 class="text-sm font-bold text-slate-900 dark:text-white"><i class="fa-solid fa-bell text-amber-500"></i> 종 알림</h3>
                        <div class="flex flex-wrap gap-6 items-center text-xs font-semibold text-slate-600 dark:text-slate-300">
                            <label class="flex items-center gap-2">수업 끝나기 ${sel('alertEnd', tt.alertEnd)}</label>
                            <label class="flex items-center gap-2">수업 시작 ${sel('alertStart', tt.alertStart)}</label>
                            <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" ${tt.sound ? 'checked' : ''} onchange="setTTOption('sound', this.checked)" class="w-4 h-4 rounded"> 알림음</label>
                            <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" ${tt.notify ? 'checked' : ''} onchange="toggleTTNotify(this)" class="w-4 h-4 rounded"> 기기 알림(팝업)</label>
                            <button onclick="fireBell('test', '알림 테스트', '이렇게 알려 드려요.', getTimetable(), true)" class="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg font-bold">테스트</button>
                        </div>
                        <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">※ 알림은 이 앱(탭)이 열려 있을 때 울려요. 창을 최소화해도 되지만, 탭을 닫거나 휴대폰 화면이 꺼지면 울리지 않을 수 있어요. (서버 없는 앱이라 백그라운드 푸시는 지원하지 않아요)</p>
                    </div>
                </div>
            ` + FOOTER_HTML;
            startClock();
        }
        function updatePeriod(i, key, value) { const tt = getTimetable(); if (!tt.periods[i] || !/^\d{2}:\d{2}$/.test(value)) { rerenderKeepScroll(); return; } tt.periods[i][key] = value; saveTimetable(tt); refreshNowStatus(); }
        function updateSubject(di, i, value) { const tt = getTimetable(); tt.grid[di][i] = value.trim(); saveTimetable(tt); refreshNowStatus(); }
        function addPeriod() {
            const tt = getTimetable(); if (tt.periods.length >= 10) { showToast('교시는 10개까지 만들 수 있어요.', 'error'); return; }
            const last = tt.periods[tt.periods.length - 1]; const s = last ? toMin(last.end) + 10 : 540; const f = m => `${pad2(Math.floor(m / 60) % 24)}:${pad2(m % 60)}`;
            tt.periods.push({ start: f(s), end: f(s + 40) }); saveTimetable(tt); rerenderKeepScroll();
        }
        function removePeriod(i) {
            if (!confirm(`${i + 1}교시를 삭제할까요? (요일별 과목도 함께 지워져요)`)) return;
            const tt = getTimetable(); tt.periods.splice(i, 1); TT_DAYS.forEach((_, di) => tt.grid[di].splice(i, 1)); saveTimetable(tt); rerenderKeepScroll();
        }
        function resetPeriods() {
            if (!confirm('교시 시간을 기본값(40분 수업 · 6교시)으로 되돌릴까요? 과목은 그대로 둡니다.')) return;
            const tt = getTimetable(); tt.periods = DEFAULT_PERIODS.map(([start, end]) => ({ start, end })); saveTimetable(tt); rerenderKeepScroll();
        }
        function setTTOption(k, v) { const tt = getTimetable(); tt[k] = v; if (!saveTimetable(tt)) return; firedBells.clear(); showToast('알림 설정을 저장했습니다.', 'info'); }
        async function toggleTTNotify(el) {
            if (el.checked) {
                if (!('Notification' in window)) { showToast('이 브라우저는 기기 알림을 지원하지 않아요. 알림음과 화면 알림만 사용돼요.', 'error'); el.checked = false; return; }
                let perm = Notification.permission;
                if (perm === 'default') { try { perm = await Notification.requestPermission(); } catch (e) { perm = 'denied'; } }
                if (perm !== 'granted') { showToast('알림 권한이 허용되지 않았어요. 브라우저 설정에서 허용해 주세요.', 'error'); el.checked = false; return; }
            }
            setTTOption('notify', el.checked);
        }
        function printTimetable() {
            const tt = getTimetable(); const s = getSettings();
            printHTML(`<div class="pl-table"><h1>${escapeHTML(s.className ? s.className + ' ' : '')}시간표</h1><table><thead><tr><th>교시</th><th>시간</th>${TT_DAYS.map(d => `<th>${d}</th>`).join('')}</tr></thead><tbody>${tt.periods.map((p, i) => `<tr><td>${i + 1}</td><td>${escapeHTML(p.start)}~${escapeHTML(p.end)}</td>${TT_DAYS.map((_, di) => `<td>${escapeHTML((tt.grid[di] || [])[i] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
        }

        // ====================================================
        // 4. 전체 화면(교실 TV·전자칠판) 모드
        // ====================================================
        let presentKind = null, presentIsFullscreen = false, presentWakeLock = null;
        async function requestPresentWakeLock() {
            try {
                if ('wakeLock' in navigator && navigator.wakeLock?.request && !presentWakeLock) {
                    presentWakeLock = await navigator.wakeLock.request('screen');
                    presentWakeLock.addEventListener?.('release', () => { presentWakeLock = null; });
                }
            } catch (_) {}
        }
        function releasePresentWakeLock() {
            try { if (presentWakeLock) { presentWakeLock.release(); presentWakeLock = null; } } catch (_) { presentWakeLock = null; }
        }
        function setTimerPreset(sec) { pauseTimer(); timerSeconds = sec; updateTimerDisplay(); }
        function openPresent(kind) {
            if (kind === 'seat') kind = 'seats';
            const ov = document.getElementById('present-overlay'); if (!ov) return;
            presentKind = kind; unlockAudio(); requestPresentWakeLock();
            const bigBtn = 'px-6 py-3 rounded-2xl text-lg font-bold transition';
            const tabs = [
                ['timer', 'fa-stopwatch', '타이머'],
                ['pick', 'fa-wand-magic-sparkles', '발표자 뽑기'],
                ['seats', 'fa-chair', '자리 배치표'],
                ['clock', 'fa-clock', '현재 교시·시계'],
                ['memo', 'fa-chalkboard', '칠판 알림 메모']
            ];
            const navBar = `<div class="absolute top-3 sm:top-4 left-3 sm:left-4 right-16 flex flex-nowrap sm:flex-wrap overflow-x-auto hide-scrollbar items-center gap-1.5 sm:gap-2 pr-2 z-10">${tabs.map(([k, ic, label]) => `<button type="button" onclick="openPresent('${k}')" class="px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${presentKind === k ? 'bg-white text-slate-900 shadow-lg' : 'bg-white/10 hover:bg-white/20 text-slate-200'}"><i class="fa-solid ${ic}"></i><span>${label}</span></button>`).join('')}</div>`;
            let body = '';
            if (kind === 'timer') {
                body = `<div class="timer-display-text font-black tabular-nums leading-none tracking-tighter" style="font-size:min(26vw,44vh)">00:00</div>
                    <div class="flex flex-wrap gap-2 justify-center mt-6">
                        ${[[60,'1분'],[180,'3분'],[300,'5분'],[600,'10분']].map(([sec, lbl]) => `<button onclick="setTimerPreset(${sec})" class="px-4 py-1.5 rounded-xl text-sm font-bold bg-white/10 hover:bg-white/20 text-slate-200">${lbl}</button>`).join('')}
                    </div>
                    <div class="flex flex-wrap gap-3 justify-center mt-6">
                        <button onclick="addTimer(-60)" class="${bigBtn} bg-white/10 hover:bg-white/20">-1분</button>
                        <button onclick="toggleTimer()" class="${bigBtn} bg-blue-600 hover:bg-blue-500 min-w-[140px]"><span class="timer-toggle-label">시작</span></button>
                        <button onclick="addTimer(60)" class="${bigBtn} bg-white/10 hover:bg-white/20">+1분</button>
                        <button onclick="resetTimer()" class="${bigBtn} bg-white/10 hover:bg-white/20">리셋</button>
                    </div>
                    <p class="text-slate-400 text-sm mt-6">스페이스: 시작/정지 · ↑↓: 1분 더하기/빼기 · R: 리셋 · Esc: 닫기</p>`;
            } else if (kind === 'pick') {
                const hasNames = getClassNames().length > 0;
                body = `<p class="text-2xl md:text-3xl text-slate-400 font-bold mb-6">오늘의 발표자는?</p>
                    <div id="present-pick" class="font-black text-amber-300 break-all" style="font-size:min(14vw,26vh)">?</div>
                    <div class="flex flex-wrap gap-3 justify-center mt-10">
                        <button onclick="pickRandom()" class="${bigBtn} bg-rose-600 hover:bg-rose-500"><i class="fa-solid fa-wand-magic-sparkles"></i> 1명 뽑기</button>
                        <button onclick="resetPicked()" class="${bigBtn} bg-white/10 hover:bg-white/20 text-base">기록 초기화</button>
                        ${!hasNames ? `<button onclick="closePresent(); openSetupWizard();" class="${bigBtn} bg-emerald-600 hover:bg-emerald-500 text-base"><i class="fa-solid fa-users mr-1"></i>학급 명단 등록하기</button>` : ''}
                    </div>
                    <p class="pick-remain text-slate-400 text-base mt-4"></p>
                    <p class="text-slate-500 text-sm mt-4">스페이스·엔터: 뽑기 · Esc: 닫기</p>`;
            } else if (kind === 'seats') {
                if (!Storage.get('seat_result', null) && getClassNames().length > 0) generateSeats();
                const hasNames = getClassNames().length > 0;
                body = `<div class="mb-6 flex flex-wrap items-center gap-4 justify-center"><span class="px-10 sm:px-16 py-2.5 sm:py-3 bg-white/15 rounded-xl text-base sm:text-xl font-bold">교 탁</span><button onclick="generateSeats(); openPresent('seats');" class="px-4 py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs sm:text-sm font-bold shadow"><i class="fa-solid fa-shuffle mr-1"></i>다시 배치</button>${!hasNames ? `<button onclick="closePresent(); openSetupWizard();" class="px-4 py-2.5 sm:py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs sm:text-sm font-bold shadow"><i class="fa-solid fa-users mr-1"></i>학급 명단 등록하기</button>` : ''}</div><div id="present-seats-grid" class="w-full overflow-x-auto">${seatsHTML(Storage.get('seat_result', null), true)}</div>`;
            } else if (kind === 'clock') {
                body = `<div class="now-clock font-black tabular-nums leading-none" style="font-size:min(22vw,34vh)">--:--</div>
                    <p class="now-status-title font-extrabold mt-6" style="font-size:min(8vw,10vh)">-</p>
                    <p class="now-status-sub text-slate-300 mt-2" style="font-size:min(4vw,5vh)">-</p>
                    <div class="w-[min(70vw,720px)] bg-white/15 h-3 rounded-full overflow-hidden mt-8"><div class="now-status-bar bg-blue-400 h-full transition-all" style="width:0%"></div></div>`;
            } else if (kind === 'memo') {
                const note = getSettings().presentNote || '1. 교과서와 필기도구 준비하기\n2. 모둠별로 오늘의 탐구 주제 이야기 나누기\n3. 다 마친 모둠은 조용히 손들기 ✋';
                body = `<div class="w-[min(92vw,960px)] text-left space-y-4">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <span class="text-sm sm:text-lg font-extrabold text-amber-300"><i class="fa-solid fa-chalkboard mr-2"></i>오늘의 활동 · 칠판 안내판 (직접 클릭해 수정하세요)</span>
                        <div class="flex items-center gap-2">
                            <button type="button" onclick="toggleTimer()" class="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-amber-300 text-sm sm:text-base font-extrabold tabular-nums transition" title="클릭하여 타이머 시작/일시정지"><i class="fa-solid fa-stopwatch mr-1"></i><span class="timer-display-text">05:00</span></button>
                            <span class="now-clock text-xl sm:text-2xl font-black text-slate-300 tabular-nums">--:--</span>
                        </div>
                    </div>
                    <textarea id="present-memo-input" oninput="saveSetting('presentNote', this.value)" rows="6" class="w-full p-4 sm:p-6 rounded-3xl bg-white/10 border-2 border-white/20 text-white font-extrabold leading-relaxed outline-none focus:border-amber-300 resize-none" style="font-size:clamp(18px,4.2vw,42px)">${escapeHTML(note)}</textarea>
                </div>`;
            }
            ov.innerHTML = `${navBar}<button onclick="closePresent()" class="absolute top-3 sm:top-4 right-3 sm:right-4 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/20 text-xl sm:text-2xl z-10 flex items-center justify-center" aria-label="전체 화면 닫기"><i class="fa-solid fa-xmark"></i></button><div class="w-full h-full flex flex-col items-center justify-center p-4 sm:p-6 pt-16 sm:pt-20 text-center overflow-auto">${body}</div>`;
            ov.classList.remove('hidden'); ov.classList.add('flex');
            if (ov.requestFullscreen && document.fullscreenElement !== ov) ov.requestFullscreen().catch(() => {});
            document.removeEventListener('keydown', presentKeyHandler);
            document.addEventListener('keydown', presentKeyHandler);
            if (kind === 'timer' || kind === 'memo') updateTimerDisplay();
            if (kind === 'pick') updatePickRemain();
            if (kind === 'clock' || kind === 'memo') startClock();
        }
        function closePresent() {
            if (!presentKind) return;
            presentKind = null; presentIsFullscreen = false; releasePresentWakeLock();
            const ov = document.getElementById('present-overlay'); if (ov) { ov.classList.add('hidden'); ov.classList.remove('flex'); ov.innerHTML = ''; }
            document.removeEventListener('keydown', presentKeyHandler);
            if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
            if (router.current === 'home' || router.current === 'timetable') startClock();
        }
        function presentKeyHandler(e) {
            if (e.isComposing) return;
            if (e.key === 'Escape') { closePresent(); return; }
            if (e.target && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT')) return;
            if (presentKind === 'timer') {
                if (e.code === 'Space') { e.preventDefault(); toggleTimer(); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); addTimer(60); }
                else if (e.key === 'ArrowDown') { e.preventDefault(); addTimer(-60); }
                else if (e.key === 'r' || e.key === 'R') resetTimer();
            } else if (presentKind === 'pick' && (e.code === 'Space' || e.key === 'Enter')) { e.preventDefault(); pickRandom(); }
        }
        // 브라우저 Esc로 전체 화면이 풀리면 오버레이도 함께 닫기
        // (오버레이가 실제로 전체 화면이 된 뒤에 풀린 경우에만 닫음 → 이전 전체 화면 해제 이벤트가 새 화면을 닫는 경쟁 상태 방지)
        document.addEventListener('fullscreenchange', () => {
            const ov = document.getElementById('present-overlay');
            if (document.fullscreenElement && document.fullscreenElement === ov) { presentIsFullscreen = true; return; }
            if (!document.fullscreenElement && presentKind && presentIsFullscreen) closePresent();
        });

        // ====================================================
        // 7. 생기부 문장 도우미 (학생별 관리 · 엑셀 CSV 내보내기 · 문장 공유)
        // ====================================================
        const RECORD_AREAS = [
            { id: 'behavior', name: '행동특성 및 종합의견' },
            { id: 'subject', name: '교과 세부능력 및 특기사항' },
            { id: 'activity', name: '창의적 체험활동 특기사항' }
        ];
        const RECORD_LIMITS = [{ b: 1500, label: '500자 (1,500바이트)' }, { b: 2100, label: '700자 (2,100바이트)' }, { b: 3000, label: '1,000자 (3,000바이트)' }];
        const PHRASE_BANK = {
            '학습 태도': ['수업 시간에 바른 자세로 경청하며 궁금한 점을 적극적으로 질문함.', '배운 내용을 스스로 정리하는 습관이 있어 학습 내용을 오래 기억함.', '과제를 기한 내에 성실하게 완성하며 끝까지 해결하려는 끈기가 있음.', '어려운 문제도 포기하지 않고 여러 방법으로 해결하려고 노력함.', '모둠 학습에서 자신의 생각을 조리 있게 발표함.'],
            '책임감·성실': ['맡은 역할을 책임감 있게 수행하여 학급 운영에 도움을 줌.', '1인 1역 활동에서 자신의 역할을 빠짐없이 성실하게 수행함.', '약속과 규칙을 잘 지키며 친구들에게 모범이 됨.', '학급 물건을 소중히 다루고 주변을 깨끗하게 정리함.'],
            '배려·협력': ['친구의 어려움을 먼저 알아차리고 도움을 주는 따뜻한 마음을 지님.', '모둠 활동에서 친구들의 의견을 존중하며 협력하여 과제를 해결함.', '다른 사람의 입장을 헤아려 말과 행동을 조심하는 배려심이 돋보임.', '갈등 상황에서 차분하게 대화로 해결하려는 태도를 보임.'],
            '리더십': ['학급 회의에서 다양한 의견을 모아 합리적인 결론을 이끌어 냄.', '모둠장으로서 역할을 공평하게 나누고 친구들을 격려하며 활동을 이끎.', '새로운 활동을 제안하고 친구들의 참여를 이끌어 내는 적극성이 있음.'],
            '자기관리': ['자신의 감정을 적절하게 표현하고 조절할 줄 앎.', '스스로 계획을 세워 실천하고 결과를 되돌아보는 습관이 있음.', '실수를 인정하고 고치려는 자세가 바름.'],
            '창의·탐구': ['호기심이 많아 궁금한 것을 끝까지 탐구하는 자세가 돋보임.', '독창적인 아이디어로 문제를 새롭게 해결하는 능력이 있음.', '관찰한 내용을 꼼꼼하게 기록하고 그 까닭을 스스로 찾아봄.'],
            '교우관계': ['밝고 긍정적인 성격으로 친구들과 두루 원만하게 지냄.', '친구의 좋은 점을 찾아 칭찬하며 학급 분위기를 따뜻하게 만듦.', '새로 온 친구가 학급에 잘 적응하도록 먼저 다가가 도움을 줌.'],
            '성장·변화': ['학기 초에 비해 자신감이 크게 향상되어 발표에 적극적으로 참여함.', '꾸준한 노력으로 기초 학습 능력이 눈에 띄게 향상됨.', '친구와의 관계에서 자기 생각을 부드럽게 표현하는 방법을 익혀 가고 있음.'],
            '예술·체육': ['음악 활동에 즐겁게 참여하며 리듬감이 좋아 합주에서 중심 역할을 함.', '미술 활동에서 색채 감각이 뛰어나고 개성 있는 표현을 함.', '체육 활동에서 규칙을 잘 지키며 끝까지 최선을 다함.'],
            '진로': ['자신이 좋아하는 일과 잘하는 일을 탐색하며 꿈에 대해 구체적으로 생각해 봄.', '다양한 직업에 관심을 가지고 관련 정보를 스스로 찾아봄.']
        };
        // 학교생활기록부 기재요령의 대표적인 '기재 불가·주의' 항목을 단순 패턴으로 점검 (최종 판단은 당해 연도 기재요령 기준)
        const RECORD_RULES = [
            { re: /학원|과외|학습지|인강|사교육/g, level: '금지', msg: '사교육 관련 내용은 기재할 수 없어요.' },
            { re: /토익|TOEIC|토플|TOEFL|텝스|TEPS|HSK|JLPT|JPT|DELF|한자\s*능력|한국사\s*능력|인증\s*시험|급수\s*취득/gi, level: '금지', msg: '공인어학시험·각종 인증시험 성적은 기재할 수 없어요.' },
            { re: /교외|외부\s*대회|교외\s*대회|시\s*대회|도\s*대회|전국\s*대회/g, level: '금지', msg: '교외 대회·수상 실적은 기재할 수 없어요.' },
            { re: /논문|특허|발명\s*품?\s*등록|출판|저서/g, level: '금지', msg: '논문·특허·도서 출간 실적은 기재할 수 없어요.' },
            { re: /(아버지|어머니|아빠|엄마|부모님?|보호자)(의|는|은|가|께서)?\s*(직업|직장|회사|사업|의사|변호사|교수|판사|검사|사장|대표)/g, level: '금지', msg: '부모의 사회·경제적 지위를 짐작하게 하는 내용은 기재할 수 없어요.' },
            { re: /[가-힣]{2,}대학교|대학원|[가-힣]{2,}대학(?!생)/g, level: '금지', msg: '특정 대학명은 기재할 수 없어요.' },
            { re: /유튜브|YouTube|인스타그램|틱톡|네이버|카카오|구글|삼성|애플/gi, level: '주의', msg: '특정 상호·브랜드·플랫폼 이름은 가급적 쓰지 않아요.' },
            { re: /산만|문제아|폭력적|게으르|게으름|불성실|거짓말|말썽|이기적/g, level: '주의', msg: '부정적인 표현은 구체적 행동과 변화 가능성을 함께 긍정적으로 서술해요.' },
            { re: /[가-힣]다\.(?=\s|$)/g, level: '주의', msg: "'~다.' 대신 '~함.', '~임.'처럼 명사형으로 끝맺는 것이 일반적이에요." },
            { re: /[~!♡♥★☆^]|[\u{1F300}-\u{1FAFF}]/gu, level: '주의', msg: '특수문자·이모지는 쓰지 않아요.' },
            { re: / {2,}/g, level: '주의', msg: '공백이 두 칸 이상 연속으로 들어갔어요.' }
        ];
        let recordArea = 'behavior';

        function getRecordDrafts() { return Storage.get('record_drafts', {}); }
        function getRecordLimit(area) { return Number((Storage.get('record_limits', {}))[area]) || 1500; }
        function checkRecord(text) {
            const found = [];
            RECORD_RULES.forEach(rule => { rule.re.lastIndex = 0; let m; while ((m = rule.re.exec(text)) !== null) { found.push({ start: m.index, end: m.index + m[0].length, text: m[0], rule }); if (m[0].length === 0) rule.re.lastIndex++; } });
            found.sort((a, b) => a.start - b.start || (a.rule.level === '금지' ? -1 : 1));
            const out = []; let lastEnd = -1;
            found.forEach(f => { if (f.start >= lastEnd) { out.push(f); lastEnd = f.end; } });
            return out;
        }
        function getRecordStudents() {
            const fromClass = parseNameList(Storage.get('class_names', ''));
            const fromDrafts = Object.keys(getRecordDrafts()).filter(k => k.startsWith('student:')).map(k => k.split(':')[1]).filter(Boolean);
            return [...new Set([...fromClass, ...fromDrafts])];
        }

        function renderToolsRecord(container) {
            if (Vault.isLocked()) { container.innerHTML = vaultLockHTML('생기부 초안') + FOOTER_HTML; setTimeout(() => document.getElementById('vault-pw')?.focus(), 30); return; }
            const area = RECORD_AREAS.find(a => a.id === recordArea) || RECORD_AREAS[0];
            const allDrafts = getRecordDrafts();
            const draft = allDrafts[recordDraftKey(area.id, recordStudent)] || '';
            const students = getRecordStudents();
            const curIdx = recordStudent ? students.indexOf(recordStudent) : -1;
            const prevStudent = curIdx > 0 ? students[curIdx - 1] : '';
            const nextStudent = curIdx >= 0 && curIdx < students.length - 1 ? students[curIdx + 1] : (curIdx === -1 && students.length ? students[0] : '');
            const myPhrases = Storage.get('record_my_phrases', []);
            const bank = { ...PHRASE_BANK, ...(myPhrases.length ? { '내 문장': myPhrases } : {}) };
            const studentCounsel = recordStudent ? getCounsel().filter(r => r.student === recordStudent).sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5) : [];
            const counselBridgeHTML = studentCounsel.length ? `
                <details class="rounded-2xl bg-amber-50/70 dark:bg-amber-900/20 border border-amber-200/80 dark:border-amber-800/50 px-3.5 py-2.5 text-xs">
                    <summary class="cursor-pointer font-extrabold text-amber-800 dark:text-amber-300 flex items-center justify-between">
                        <span><i class="fa-solid fa-comments mr-1.5"></i>${escapeHTML(recordStudent)} 학생 상담·관찰 메모 (${studentCounsel.length}건) 참고하기</span>
                        <span class="text-[11px] font-semibold text-amber-600 dark:text-amber-400">펼치기 ▾</span>
                    </summary>
                    <div class="mt-2.5 pt-2 border-t border-amber-200/60 dark:border-amber-800/40 space-y-1.5 text-slate-700 dark:text-slate-200">
                        ${studentCounsel.map(c => `<div class="flex flex-wrap gap-1.5 items-baseline"><span class="font-bold text-amber-700 dark:text-amber-300 shrink-0">${escapeHTML(c.date || '')}</span>${c.topic ? `<span class="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-[10px] font-bold">${escapeHTML(c.topic)}</span>` : ''}<span class="text-slate-600 dark:text-slate-300">${escapeHTML(c.summary || '')}</span></div>`).join('')}
                    </div>
                </details>` : '';
            container.innerHTML = `
                <div class="space-y-6 animate-fade-in">
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div><h2 class="text-2xl font-bold tracking-tight mb-1 text-slate-900 dark:text-white">생기부 문장 도우미</h2><p class="text-sm text-slate-500 dark:text-slate-400">우리 반 학생별로 문장을 조합·저장하고, 나이스 바이트와 기재 금지어를 점검한 뒤 엑셀(CSV)로 한 번에 내보내세요.</p></div>
                        <div class="flex flex-wrap gap-2">
                            <button type="button" onclick="exportRecordsCSV()" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow"><i class="fa-solid fa-file-csv mr-1"></i>학급 전체 엑셀(CSV) 내보내기</button>
                            <button type="button" onclick="openSetupWizard()" class="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold"><i class="fa-solid fa-users mr-1"></i>학생 명단 편집</button>
                        </div>
                    </div>

                    <!-- 학생별 선택 바 -->
                    <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-3">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <div class="flex items-center gap-2">
                                <span class="text-xs font-extrabold text-slate-700 dark:text-slate-200"><i class="fa-solid fa-user-check text-blue-600 mr-1"></i>작성 대상:</span>
                                <button type="button" onclick="switchRecordStudent('')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition ${!recordStudent ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}">공통 연습장</button>
                                ${recordStudent ? `<span class="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-blue-600 text-white shadow">${escapeHTML(recordStudent)} (${curIdx + 1}/${students.length}번)</span>` : ''}
                            </div>
                            ${students.length ? `<div class="flex items-center gap-1.5">
                                <button type="button" ${prevStudent ? `data-st="${escapeHTML(prevStudent)}" onclick="switchRecordStudent(this.dataset.st)"` : 'disabled'} class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-40">← 이전 학생</button>
                                <button type="button" ${nextStudent ? `data-st="${escapeHTML(nextStudent)}" onclick="switchRecordStudent(this.dataset.st)"` : 'disabled'} class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-40">다음 학생 →</button>
                            </div>` : ''}
                        </div>
                        ${students.length ? `<div class="flex flex-wrap gap-1.5">${students.map((st, idx) => {
                            const hasDraft = RECORD_AREAS.some(a => (allDrafts[recordDraftKey(a.id, st)] || '').trim().length > 0);
                            const active = recordStudent === st;
                            return `<button type="button" data-st="${escapeHTML(st)}" onclick="switchRecordStudent(this.dataset.st)" class="px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${active ? 'bg-blue-600 text-white shadow' : hasDraft ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}"><span>${idx + 1}. ${escapeHTML(st)}</span>${hasDraft ? '<i class="fa-solid fa-check text-[10px]"></i>' : ''}</button>`;
                        }).join('')}</div>` : `<p class="text-xs text-slate-400">학급 세팅에서 학생 명단을 등록하면 번호순으로 한 명씩 클릭하며 생기부를 작성할 수 있어요.</p>`}
                    </div>

                    <div class="flex flex-wrap gap-2">${RECORD_AREAS.map(a => {
                        const hasAreaDraft = (allDrafts[recordDraftKey(a.id, recordStudent)] || '').trim().length > 0;
                        return `<button onclick="switchRecordArea('${a.id}')" class="px-4 py-2 rounded-xl text-xs font-bold transition ${a.id === area.id ? 'bg-blue-600 text-white shadow' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}">${a.name}${hasAreaDraft ? ' ●' : ''}</button>`;
                    }).join('')}</div>
                    <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        <div class="lg:col-span-3 space-y-4">
                            <div class="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-3">
                                <div class="flex flex-wrap items-center justify-between gap-2">
                                    <label for="record-editor" class="text-sm font-bold text-slate-900 dark:text-white">${recordStudent ? `[${escapeHTML(recordStudent)}] ` : ''}${area.name}</label>
                                    <select onchange="setRecordLimit(Number(this.value))" class="px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200" aria-label="글자 수 제한">${RECORD_LIMITS.map(l => `<option value="${l.b}" ${getRecordLimit(area.id) === l.b ? 'selected' : ''}>제한 ${l.label}</option>`).join('')}</select>
                                </div>
                                ${counselBridgeHTML}
                                <textarea id="record-editor" rows="9" oninput="onRecordInput()" oncompositionend="onRecordInput()" placeholder="“문장 조각”을 누르면 여기에 이어서 들어가요. 직접 써도 됩니다." class="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm leading-relaxed text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 resize-y">${escapeHTML(draft)}</textarea>
                                <p id="record-save-status" class="text-xs text-slate-500 dark:text-slate-400" aria-live="polite">입력하면 이 브라우저에 저장합니다.</p>
                                <div class="flex flex-wrap items-center justify-between gap-2">
                                    <div class="flex-1 min-w-[200px]">
                                        <div class="flex justify-between text-xs mb-1"><span id="record-count" class="font-semibold text-slate-600 dark:text-slate-300"></span><span id="record-bytes" class="font-bold"></span></div>
                                        <div class="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden"><div id="record-bar" class="h-full transition-all" style="width:0%"></div></div>
                                    </div>
                                    <div class="flex gap-2">
                                        <button onclick="clearRecord()" class="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl">지우기</button>
                                        ${aiButtonHTML('record-editor', 'record')}
                                        <button onclick="copyText(document.getElementById('record-editor').value, '복사했습니다. 나이스에 붙여 넣으세요.')" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow"><i class="fa-regular fa-copy"></i> 복사</button>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-3">
                                <h3 class="text-sm font-bold text-slate-900 dark:text-white"><i class="fa-solid fa-spell-check text-emerald-500"></i> 기재 점검</h3>
                                <div id="record-issues" class="space-y-2"></div>
                                <div id="record-preview" class="hidden p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 text-sm leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words"></div>
                                <p class="text-[11px] text-slate-400 dark:text-slate-500">학교생활기록부 기재요령의 대표 항목을 단순 패턴으로 점검해요. 잡아내지 못하는 표현도 있으니, 최종 판단은 당해 연도 교육부·교육청 기재요령을 따르세요.</p>
                            </div>
                        </div>
                        <div class="lg:col-span-2 bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4 lg:max-h-[80vh] lg:overflow-y-auto hide-scrollbar">
                            <div class="flex items-center justify-between gap-2">
                                <h3 class="text-sm font-bold text-slate-900 dark:text-white"><i class="fa-solid fa-puzzle-piece text-purple-500"></i> 문장 조각 <span class="text-[11px] font-medium text-slate-400">(누르면 추가)</span></h3>
                                ${myPhrases.length ? `<button type="button" onclick="shareMyPhrases()" class="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline"><i class="fa-solid fa-share-nodes"></i> 내 문장 공유</button>` : ''}
                            </div>
                            ${Object.entries(bank).map(([cat, list]) => `
                                <div><p class="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">${escapeHTML(cat)}</p>
                                <div class="space-y-1.5">${list.map((p, i) => `<div class="flex items-start gap-1"><button data-p="${escapeHTML(p)}" onclick="appendPhrase(this.dataset.p)" class="flex-1 text-left px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 transition">${escapeHTML(p)}</button>${cat === '내 문장' ? `<button onclick="removeMyPhrase(${i})" class="p-2 text-slate-400 hover:text-rose-500" aria-label="내 문장 삭제"><i class="fa-solid fa-xmark"></i></button>` : ''}</div>`).join('')}</div></div>`).join('')}
                            <div class="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2">
                                <div class="flex items-center justify-between">
                                    <p class="text-xs font-bold text-slate-500 dark:text-slate-400">내 문장 추가</p>
                                    <button type="button" onclick="promptImportSharedPhrases()" class="text-[11px] font-bold text-slate-500 hover:text-purple-600"><i class="fa-solid fa-file-import"></i> 동료 문장 가져오기</button>
                                </div>
                                <div class="flex gap-2"><input id="my-phrase-input" type="text" maxlength="200" placeholder="자주 쓰는 문장을 저장해 두세요" class="flex-1 min-w-0 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 outline-none"><button onclick="addMyPhrase()" class="shrink-0 whitespace-nowrap px-3 bg-purple-600 text-white text-xs font-bold rounded-lg">저장</button></div>
                            </div>
                        </div>
                    </div>
                </div>
            ` + FOOTER_HTML;
            updateRecordAnalysis();
        }
        let pendingRecordDraft = null, recordDraftTimer = null, recordStudent = '';
        function recordDraftKey(area = recordArea, student = recordStudent) { return student ? `student:${student}:${area}` : area; }
        function captureRecordDraft() {
            const el = document.getElementById('record-editor');
            if (!el) return;
            pendingRecordDraft = { key: recordDraftKey(recordArea, recordStudent), text: el.value };
            const status = document.getElementById('record-save-status'); if (status) status.textContent = '저장 중…';
            clearTimeout(recordDraftTimer);
            recordDraftTimer = setTimeout(saveRecordDraftNow, 400);
        }
        function saveRecordDraftNow() {
            clearTimeout(recordDraftTimer);
            if (!pendingRecordDraft) return true;
            const draft = pendingRecordDraft;
            const saved = getRecordDrafts();
            saved[draft.key] = draft.text;
            if (!Storage.set('record_drafts', saved)) {
                const status = document.getElementById('record-save-status');
                if (status) status.innerHTML = '저장하지 못했습니다. <button type="button" onclick="saveRecordDraftNow()" class="underline font-bold">다시 시도</button> · 아래 복사 버튼으로 내용을 보관할 수 있습니다.';
                return false;
            }
            if (pendingRecordDraft === draft) pendingRecordDraft = null;
            const status = document.getElementById('record-save-status'); if (status) status.textContent = '이 브라우저에 저장됨';
            return true;
        }
        function switchRecordArea(id) {
            captureRecordDraft();
            if (!saveRecordDraftNow()) return;
            recordArea = id; router.render();
        }
        function switchRecordStudent(student) {
            captureRecordDraft();
            if (!saveRecordDraftNow()) return;
            recordStudent = student || ''; router.render();
        }
        function onRecordInput() { updateRecordAnalysis(); captureRecordDraft(); }
        function updateRecordAnalysis() {
            const el = document.getElementById('record-editor'); if (!el) return;
            const text = el.value; const bytes = neisBytes(text); const limit = getRecordLimit(recordArea); const over = bytes > limit;
            document.getElementById('record-count').textContent = `${text.length.toLocaleString()}자 (공백 제외 ${text.replace(/\s/g, '').length.toLocaleString()}자)`;
            const bEl = document.getElementById('record-bytes'); bEl.textContent = `${bytes.toLocaleString()} / ${limit.toLocaleString()}바이트${over ? ` (${(bytes - limit).toLocaleString()} 초과)` : ''}`;
            bEl.className = `font-bold ${over ? 'text-rose-600' : 'text-blue-600 dark:text-blue-400'}`;
            const bar = document.getElementById('record-bar'); bar.style.width = `${Math.min(100, Math.round(bytes / limit * 100))}%`; bar.className = `h-full transition-all ${over ? 'bg-rose-500' : 'bg-blue-600'}`;
            const issues = checkRecord(text);
            const endCounts = {};
            (text.match(/[가-힣]{2,}(?:함|임|됨|보임|돋보임|있음|줌)\./g) || []).forEach(w => { endCounts[w] = (endCounts[w] || 0) + 1; });
            const repeatedEnds = Object.entries(endCounts).filter(([, c]) => c >= 3).map(([w, c]) => `${w}(${c}회)`);
            const canAutoFix = /[가-힣]다\.(?=\s|$)|[~!♡♥★☆^]|[\u{1F300}-\u{1FAFF}]| {2,}/u.test(text);
            const box = document.getElementById('record-issues'); const pv = document.getElementById('record-preview');
            if (!text.trim()) { box.innerHTML = '<p class="text-xs text-slate-400">내용을 입력하면 점검 결과가 나와요.</p>'; pv.classList.add('hidden'); return; }
            if (!issues.length && !repeatedEnds.length) { box.innerHTML = '<p class="text-xs font-semibold text-emerald-600 dark:text-emerald-400"><i class="fa-solid fa-circle-check"></i> 발견된 문제가 없어요.</p>'; pv.classList.add('hidden'); return; }
            const grouped = {}; issues.forEach(f => { const k = f.rule.msg; (grouped[k] = grouped[k] || { rule: f.rule, words: new Set() }).words.add(f.text.trim() || '(공백)'); });
            if (repeatedEnds.length) {
                grouped['__repeat__'] = { rule: { level: '주의', msg: '같은 서술어 맺음이 3회 이상 반복되었어요. 다양한 표현으로 바꾸어 보세요.' }, words: new Set(repeatedEnds) };
            }
            const fixBtnHTML = canAutoFix ? `<div class="pt-1"><button type="button" onclick="autoFixRecordText()" class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm transition"><i class="fa-solid fa-wand-magic-sparkles mr-1"></i>원클릭 자동 교정 (연속 공백·특수문자·'~다.' 어미 정리)</button></div>` : '';
            box.innerHTML = Object.values(grouped).map(g => `<div class="flex items-start gap-2 text-xs"><span class="shrink-0 px-2 py-0.5 rounded-md font-bold ${g.rule.level === '금지' ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'}">${g.rule.level}</span><span class="text-slate-700 dark:text-slate-200">${escapeHTML(g.rule.msg)} <span class="text-slate-400">— ${escapeHTML([...g.words].slice(0, 5).join(', '))}</span></span></div>`).join('') + fixBtnHTML;
            if (!issues.length) { pv.classList.add('hidden'); return; }
            let html = '', pos = 0;
            issues.forEach(f => { html += escapeHTML(text.slice(pos, f.start)) + `<mark class="${f.rule.level === '금지' ? 'bg-rose-200 dark:bg-rose-800' : 'bg-amber-200 dark:bg-amber-700'} text-inherit rounded px-0.5">${escapeHTML(f.text)}</mark>`; pos = f.end; });
            pv.innerHTML = html + escapeHTML(text.slice(pos)); pv.classList.remove('hidden');
        }
        function autoFixRecordText() {
            const el = document.getElementById('record-editor'); if (!el || !el.value) return;
            let t = el.value;
            t = t.replace(/[~!♡♥★☆^]|[\u{1F300}-\u{1FAFF}]/gu, '');
            t = t.replace(/했다\.(?=\s|$)/g, '함.')
                 .replace(/하였다\.(?=\s|$)/g, '함.')
                 .replace(/이다\.(?=\s|$)/g, '임.')
                 .replace(/있다\.(?=\s|$)/g, '있음.')
                 .replace(/없다\.(?=\s|$)/g, '없음.')
                 .replace(/보인다\.(?=\s|$)/g, '보임.')
                 .replace(/보였다\.(?=\s|$)/g, '보임.')
                 .replace(/돋보인다\.(?=\s|$)/g, '돋보임.')
                 .replace(/돋보였다\.(?=\s|$)/g, '돋보임.')
                 .replace(/되었다\.(?=\s|$)/g, '됨.')
                 .replace(/된다\.(?=\s|$)/g, '됨.')
                 .replace(/높다\.(?=\s|$)/g, '높음.')
                 .replace(/깊다\.(?=\s|$)/g, '깊음.')
                 .replace(/바르다\.(?=\s|$)/g, '바름.')
                 .replace(/뛰어나다\.(?=\s|$)/g, '뛰어남.')
                 .replace(/우수하다\.(?=\s|$)/g, '우수함.')
                 .replace(/성실하다\.(?=\s|$)/g, '성실함.');
            t = t.replace(/ {2,}/g, ' ').trim();
            el.value = t;
            onRecordInput();
            showToast('연속 공백·특수문자·명사형 어미를 자동으로 교정했습니다.');
        }
        function appendPhrase(p) {
            const el = document.getElementById('record-editor'); if (!el) return;
            el.value = el.value.trim() ? `${el.value.replace(/\s+$/, '')} ${p}` : p;
            onRecordInput(); el.focus(); el.scrollTop = el.scrollHeight;
        }
        function clearRecord() { if (!confirm('작성한 내용을 지울까요?')) return; const el = document.getElementById('record-editor'); el.value = ''; onRecordInput(); }
        function setRecordLimit(b) { const all = Storage.get('record_limits', {}); all[recordArea] = b; Storage.set('record_limits', all); updateRecordAnalysis(); }
        function addMyPhrase() {
            const el = document.getElementById('my-phrase-input'); const v = el ? el.value.trim() : ''; if (!v) return;
            const list = Storage.get('record_my_phrases', []); if (list.includes(v)) { showToast('이미 저장된 문장이에요.', 'info'); return; }
            list.push(v); if (!Storage.set('record_my_phrases', list.slice(-100))) return;
            showToast('내 문장을 저장했습니다.'); router.render();
        }
        function removeMyPhrase(i) { const list = Storage.get('record_my_phrases', []); list.splice(i, 1); Storage.set('record_my_phrases', list); router.render(); }
        function shareMyPhrases() {
            const list = Storage.get('record_my_phrases', []);
            if (!list.length) { showToast('공유할 내 문장이 없습니다.', 'info'); return; }
            const code = encodeSharePayload({ type: 'phrases', list });
            copyText('share:' + code, `내 문장 ${list.length}개 공유 코드를 복사했습니다! 동료 선생님께 전달하세요.`);
        }
        function promptImportSharedPhrases() {
            const raw = prompt('동료 선생님께 받은 문장 공유 코드를 붙여넣어 주세요:');
            if (!raw || !raw.trim()) return;
            const decoded = decodeSharePayload(raw.trim());
            if (!decoded || !Array.isArray(decoded.list)) { showToast('유효한 문장 공유 코드가 아닙니다.', 'error'); return; }
            const cur = Storage.get('record_my_phrases', []);
            const merged = [...new Set([...cur, ...decoded.list.filter(x => typeof x === 'string' && x.trim()).map(x => x.trim().slice(0, 200))])].slice(-100);
            if (Storage.set('record_my_phrases', merged)) { showToast(`문장 ${merged.length - cur.length}개를 추가했습니다!`); router.render(); }
        }
        function exportRecordsCSV() {
            captureRecordDraft(); saveRecordDraftNow();
            const drafts = getRecordDrafts();
            const students = getRecordStudents();
            // 엑셀이 =,+,-,@로 시작하는 칸을 수식으로 실행하지 않도록 앞에 '를 붙임
            const csvCell = v => { let t = String(v ?? ''); if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`; return `"${t.replace(/"/g, '""')}"`; };
            const rows = [['번호', '학생명', '행동특성 및 종합의견', '행발 바이트', '교과 세부능력 및 특기사항', '세특 바이트', '창의적 체험활동 특기사항', '창체 바이트']];
            if (RECORD_AREAS.some(a => (drafts[a.id] || '').trim())) {
                const b = drafts.behavior || '', s = drafts.subject || '', ac = drafts.activity || '';
                rows.push(['-', '(공통 연습장)', b, neisBytes(b), s, neisBytes(s), ac, neisBytes(ac)]);
            }
            students.forEach((st, idx) => {
                const b = drafts[recordDraftKey('behavior', st)] || '';
                const s = drafts[recordDraftKey('subject', st)] || '';
                const ac = drafts[recordDraftKey('activity', st)] || '';
                rows.push([String(idx + 1), st, b, neisBytes(b), s, neisBytes(s), ac, neisBytes(ac)]);
            });
            if (rows.length <= 1) { showToast('내보낼 학생 명단이나 작성된 생기부 초안이 없습니다.', 'error'); return; }
            const csv = '\uFEFF' + rows.map(r => r.map(csvCell).join(',')).join('\r\n');
            const s = getSettings();
            downloadFile(`생기부초안_${s.className ? s.className + '_' : ''}${ymd(new Date())}.csv`, csv, 'text/csv;charset=utf-8');
            showToast('엑셀(CSV) 파일을 저장했습니다. 나이스 업로드 참고용으로 활용하세요!', 'success');
        }

        // ====================================================
        // 8. 학부모 상담 기록장 (기기 안에만 저장 · 암호화 백업)
        // ====================================================
        const COUNSEL_WHO = ['학부모', '학생', '보호자(조부모 등)', '기타'];
        const COUNSEL_HOW = ['대면', '전화', '온라인(화상)', '문자·메시지'];
        let counselEditId = null;
        const counselFilter = { student: '', q: '', pending: false };
        let counselSchedule = null;

        function getCounsel() { const l = Storage.get('counsel_records', []); return Array.isArray(l) ? l : []; }
        function saveCounsel(list) { return Storage.set('counsel_records', list); }
        function counselStudents() { return [...new Set([...parseNameList(Storage.get('class_names', '')), ...getCounsel().map(r => r.student).filter(Boolean)])]; }

        function renderCounsel(container) {
            if (Vault.isLocked()) { container.innerHTML = vaultLockHTML('상담 기록') + FOOTER_HTML; setTimeout(() => document.getElementById('vault-pw')?.focus(), 30); return; }
            const list = getCounsel();
            const editing = counselEditId ? list.find(r => r.id === counselEditId) : null;
            const r = editing || { date: ymd(new Date()), student: '', who: '학부모', how: '대면', topic: '', summary: '', followup: '' };
            const students = counselStudents();
            const field = 'w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm outline-none mt-1';
            const sopt = counselScheduleOpts();
            container.innerHTML = `
                <div class="space-y-6 animate-fade-in">
                    <div><h2 class="text-2xl font-bold tracking-tight mb-1 text-slate-900 dark:text-white">상담 기록장</h2><p class="text-sm text-slate-500 dark:text-slate-400">학부모·학생 상담 내용을 기록하고, 상담주간 일정표를 만들어요.</p></div>
                    <div class="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                        <b><i class="fa-solid fa-lock"></i> 개인정보 안내</b> — 상담 기록은 서버로 전송되지 않고 <b>이 기기의 이 브라우저에만</b> 저장돼요. ${Vault.state === 'unlocked' ? '<b>개인 기록 잠금</b>으로 비밀번호 암호화되어 있어요. ' : `비밀번호로 잠가 두려면 <button type="button" onclick="router.navigate('mybox', 'vault')" class="underline font-bold">나의 교직함 › 개인 기록 잠금</button>을 켜세요. `}공용 PC에서는 쓰지 마시고, 기기를 바꿀 때는 아래 '암호화 백업'으로 옮기세요. 민감한 내용은 학교 공식 상담 기록(나이스 등) 지침을 우선 따르세요.
                    </div>
                    <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        <div class="lg:col-span-2 bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-3 self-start">
                            <h3 class="text-sm font-bold text-slate-900 dark:text-white">${editing ? '상담 기록 수정' : '새 상담 기록'}</h3>
                            <div class="grid grid-cols-2 gap-3">
                                <label class="text-xs font-semibold text-slate-500 dark:text-slate-400">날짜<input id="cs-date" type="date" value="${escapeHTML(r.date)}" class="${field}"></label>
                                <label class="text-xs font-semibold text-slate-500 dark:text-slate-400">학생<input id="cs-student" type="text" list="cs-students" value="${escapeHTML(r.student)}" placeholder="이름" class="${field}"></label>
                                <label class="text-xs font-semibold text-slate-500 dark:text-slate-400">상담 대상<select id="cs-who" class="${field}">${COUNSEL_WHO.map(w => `<option ${w === r.who ? 'selected' : ''}>${w}</option>`).join('')}</select></label>
                                <label class="text-xs font-semibold text-slate-500 dark:text-slate-400">방법<select id="cs-how" class="${field}">${COUNSEL_HOW.map(w => `<option ${w === r.how ? 'selected' : ''}>${w}</option>`).join('')}</select></label>
                            </div>
                            <datalist id="cs-students">${students.map(n => `<option value="${escapeHTML(n)}">`).join('')}</datalist>
                            <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400">주제<input id="cs-topic" type="text" maxlength="60" value="${escapeHTML(r.topic)}" placeholder="예: 교우관계, 학습 습관" class="${field}"></label>
                            <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400">상담 내용<textarea id="cs-summary" rows="5" class="${field} resize-y" placeholder="주요 내용을 간단히 적어 주세요">${escapeHTML(r.summary)}</textarea></label>
                            <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400">후속 조치<input id="cs-followup" type="text" maxlength="120" value="${escapeHTML(r.followup)}" placeholder="예: 2주 뒤 전화로 경과 확인" class="${field}"></label>
                            <div class="flex gap-2 pt-1">
                                <button onclick="saveCounselRecord()" class="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow">${editing ? '수정 저장' : '기록 저장'}</button>
                                ${editing ? `<button onclick="counselEditId=null; router.render()" class="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold rounded-xl">취소</button>` : ''}
                            </div>
                        </div>
                        <div class="lg:col-span-3 bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4">
                            <div class="flex flex-wrap gap-2 items-center">
                                <select onchange="counselFilter.student=this.value; updateCounselList()" class="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200" aria-label="학생 선택"><option value="">전체 학생</option>${students.map(n => `<option value="${escapeHTML(n)}" ${counselFilter.student === n ? 'selected' : ''}>${escapeHTML(n)}</option>`).join('')}</select>
                                <input type="search" value="${escapeHTML(counselFilter.q)}" oninput="counselFilter.q=this.value; updateCounselList()" placeholder="내용 검색" class="flex-1 min-w-[120px] px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 outline-none">
                                <label class="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"><input type="checkbox" ${counselFilter.pending ? 'checked' : ''} onchange="counselFilter.pending=this.checked; updateCounselList()" class="w-4 h-4 rounded"> 후속 조치 남은 것만</label>
                            </div>
                            <div id="counsel-list" class="space-y-3"></div>
                        </div>
                    </div>

                    <div class="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4">
                        <h3 class="text-sm font-bold text-slate-900 dark:text-white"><i class="fa-regular fa-calendar-check text-blue-500"></i> 상담주간 일정표 만들기</h3>
                        <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <label class="text-xs font-semibold text-slate-500 dark:text-slate-400">시작일<input id="sc-from" type="date" value="${sopt.from}" class="${field}"></label>
                            <label class="text-xs font-semibold text-slate-500 dark:text-slate-400">종료일<input id="sc-to" type="date" value="${sopt.to}" class="${field}"></label>
                            <label class="text-xs font-semibold text-slate-500 dark:text-slate-400">시작 시각<input id="sc-start" type="time" value="${sopt.start}" class="${field}"></label>
                            <label class="text-xs font-semibold text-slate-500 dark:text-slate-400">종료 시각<input id="sc-end" type="time" value="${sopt.end}" class="${field}"></label>
                            <label class="text-xs font-semibold text-slate-500 dark:text-slate-400">1인당<select id="sc-slot" class="${field}">${[10,15,20,25,30].map(n => `<option value="${n}" ${sopt.slot === n ? 'selected' : ''}>${n}분</option>`).join('')}</select></label>
                        </div>
                        <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400">상담 신청 학생 <span class="font-normal whitespace-nowrap">(신청순 배정 · 비우면 명단 전체)</span><textarea id="sc-names" rows="2" class="${field} resize-y" placeholder="예: 김학생, 이학생">${escapeHTML(sopt.names)}</textarea></label>
                        <div class="flex flex-wrap gap-2"><button onclick="makeCounselSchedule()" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow">일정표 만들기</button><span class="text-[11px] text-slate-400 self-center">주말은 자동으로 빠져요.</span></div>
                        <div id="counsel-schedule"></div>
                    </div>

                    <div class="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-3">
                        <h3 class="text-sm font-bold text-slate-900 dark:text-white"><i class="fa-solid fa-key text-emerald-500"></i> 상담 기록 암호화 백업</h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400">비밀번호로 잠근 파일(AES-256)로 저장해요. <b>비밀번호를 잊으면 누구도 복구할 수 없어요.</b></p>
                        <div class="flex flex-wrap gap-2 items-center">
                            <input id="cs-pw" type="password" autocomplete="new-password" placeholder="비밀번호 (8자 이상)" class="w-full sm:w-64 min-w-0 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-200 outline-none">
                            <button onclick="exportCounselEncrypted()" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"><i class="fa-solid fa-lock"></i> 암호화 백업 받기</button>
                            <label class="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl cursor-pointer"><i class="fa-solid fa-unlock"></i> 백업 불러오기<input type="file" accept=".json,application/json" onchange="importCounselEncrypted(event)" class="hidden"></label>
                        </div>
                    </div>
                </div>
            ` + FOOTER_HTML;
            updateCounselList();
            if (counselSchedule) renderCounselSchedule();
        }

        function updateCounselList() {
            const box = document.getElementById('counsel-list'); if (!box) return;
            const q = counselFilter.q.trim().toLowerCase();
            const list = getCounsel().filter(r => (!counselFilter.student || r.student === counselFilter.student) && (!counselFilter.pending || (r.followup && !r.done)) && (!q || `${r.student} ${r.topic} ${r.summary} ${r.followup}`.toLowerCase().includes(q)))
                .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.id || '').localeCompare(a.id || ''));
            if (!list.length) { box.innerHTML = `<p class="text-xs text-slate-400 dark:text-slate-500 py-8 text-center">${getCounsel().length ? '조건에 맞는 기록이 없어요.' : '아직 상담 기록이 없어요. “새 상담 기록”에서 첫 기록을 남겨 보세요.'}</p>`; return; }
            box.innerHTML = `<p class="text-xs text-slate-400">${list.length}건</p>` + list.map(r => `
                <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <div class="flex flex-wrap items-center gap-2 text-xs"><span class="font-bold text-slate-900 dark:text-white text-sm">${escapeHTML(r.student || '(이름 없음)')}</span><span class="text-slate-400">${escapeHTML(koreanDate(parseYMD(r.date)))}</span><span class="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 font-semibold">${escapeHTML(r.who)} · ${escapeHTML(r.how)}</span>${r.topic ? `<span class="px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">${escapeHTML(r.topic)}</span>` : ''}</div>
                        <div class="flex gap-1 text-slate-400"><button onclick="counselEditId='${r.id}'; router.render(); scrollViewTop()" class="p-1.5 hover:text-blue-500" aria-label="수정"><i class="fa-solid fa-pen"></i></button><button onclick="deleteCounselRecord('${r.id}')" class="p-1.5 hover:text-rose-500" aria-label="삭제"><i class="fa-solid fa-trash"></i></button></div>
                    </div>
                    ${r.summary ? `<p class="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">${escapeHTML(r.summary)}</p>` : ''}
                    ${r.followup ? `<label class="flex items-center gap-2 text-xs cursor-pointer ${r.done ? 'text-slate-400 line-through' : 'text-amber-700 dark:text-amber-300 font-semibold'}"><input type="checkbox" ${r.done ? 'checked' : ''} onchange="toggleCounselDone('${r.id}')" class="w-4 h-4 rounded"> 후속 조치: ${escapeHTML(r.followup)}</label>` : ''}
                </div>`).join('');
        }
        function saveCounselRecord() {
            const v = id => document.getElementById(id).value;
            const rawDate = v('cs-date');
            const rec = { date: rawDate && !isNaN(parseYMD(rawDate)) ? rawDate : ymd(new Date()), student: v('cs-student').trim(), who: v('cs-who'), how: v('cs-how'), topic: v('cs-topic').trim(), summary: v('cs-summary').trim(), followup: v('cs-followup').trim() };
            if (!rec.student) { showToast('학생 이름을 입력해 주세요.', 'error'); return; }
            if (!rec.summary && !rec.topic) { showToast('주제나 상담 내용을 입력해 주세요.', 'error'); return; }
            const list = getCounsel();
            if (counselEditId) { const i = list.findIndex(r => r.id === counselEditId); if (i >= 0) list[i] = { ...list[i], ...rec }; }
            else list.push({ id: 'cs_' + Date.now() + Math.random().toString(36).slice(2, 6), done: false, ...rec });
            if (!saveCounsel(list)) return;
            showToast(counselEditId ? '수정했습니다.' : '상담 기록을 저장했습니다.'); counselEditId = null; router.render();
        }
        function deleteCounselRecord(id) { if (!confirm('이 상담 기록을 삭제할까요?')) return; if (!saveCounsel(getCounsel().filter(r => r.id !== id))) return; if (counselEditId === id) counselEditId = null; router.render(); }
        function toggleCounselDone(id) { const list = getCounsel(); const r = list.find(x => x.id === id); if (r) { r.done = !r.done; if (!saveCounsel(list)) return; } updateCounselList(); }

        function counselScheduleOpts() {
            // 기본값: 다가오는 월요일부터 그 주 금요일까지 (오늘이 평일이면 오늘부터 그 주 금요일까지)
            const today = new Date(); const dow = today.getDay();
            const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (dow === 0 ? 1 : dow === 6 ? 2 : 0));
            const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + (5 - from.getDay()));
            const def = { from: ymd(from), to: ymd(to), start: '14:30', end: '16:30', slot: 20, names: '' };
            return { ...def, ...Storage.get('counsel_schedule_opts', {}) };
        }
        function makeCounselSchedule() {
            const v = id => document.getElementById(id).value;
            const o = { from: v('sc-from'), to: v('sc-to'), start: v('sc-start'), end: v('sc-end'), slot: Number(v('sc-slot')) || 20, names: v('sc-names') };
            const from = parseYMD(o.from), to = parseYMD(o.to); const s = toMin(o.start), e = toMin(o.end);
            if (isNaN(from) || isNaN(to) || !(to >= from) || !/^\d{2}:\d{2}$/.test(o.start) || !/^\d{2}:\d{2}$/.test(o.end) || !(e > s)) { showToast('날짜·시간 범위를 확인해 주세요.', 'error'); return; }
            Storage.set('counsel_schedule_opts', o);
            const names = parseNameList(o.names).length ? parseNameList(o.names) : parseNameList(Storage.get('class_names', ''));
            if (!names.length) { showToast('상담할 학생 이름을 입력해 주세요.', 'error'); return; }
            const slots = [];
            for (let d = new Date(from); d <= to && slots.length < 500; d.setDate(d.getDate() + 1)) {
                if (d.getDay() === 0 || d.getDay() === 6) continue;
                for (let t = s; t + o.slot <= e; t += o.slot) slots.push({ date: ymd(d), time: `${pad2(Math.floor(t / 60))}:${pad2(t % 60)}~${pad2(Math.floor((t + o.slot) / 60))}:${pad2((t + o.slot) % 60)}` });
            }
            counselSchedule = { rows: names.slice(0, slots.length).map((n, i) => ({ ...slots[i], name: n })), left: names.slice(slots.length), free: Math.max(0, slots.length - names.length) };
            renderCounselSchedule();
            if (counselSchedule.left.length) showToast(`시간이 부족해 ${counselSchedule.left.length}명을 배정하지 못했어요.`, 'error');
        }
        function renderCounselSchedule() {
            const box = document.getElementById('counsel-schedule'); if (!box || !counselSchedule) return;
            const { rows, left, free } = counselSchedule;
            box.innerHTML = `
                <div class="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                    <table class="w-full text-sm"><thead class="bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 dark:text-slate-400"><tr><th class="p-2 text-left">날짜</th><th class="p-2 text-left">시간</th><th class="p-2 text-left">학생</th></tr></thead>
                    <tbody>${rows.map(r => `<tr class="border-t border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200"><td class="p-2">${escapeHTML(koreanDate(parseYMD(r.date)))}</td><td class="p-2 tabular-nums">${r.time}</td><td class="p-2 font-semibold">${escapeHTML(r.name)}</td></tr>`).join('')}</tbody></table>
                </div>
                <p class="text-xs mt-2 ${left.length ? 'text-rose-500 font-bold' : 'text-slate-400'}">${left.length ? `배정 못 한 학생: ${escapeHTML(left.join(', '))}` : `모두 배정했어요${free ? ` (빈 시간 ${free}칸)` : ''}.`}</p>
                <div class="flex gap-2 mt-3"><button onclick="copyCounselSchedule()" class="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl"><i class="fa-regular fa-copy"></i> 알림장용 복사</button><button onclick="printCounselSchedule()" class="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl"><i class="fa-solid fa-print"></i> 인쇄</button></div>`;
        }
        function copyCounselSchedule() {
            if (!counselSchedule) return; const s = getSettings();
            const text = `[${s.className ? s.className + ' ' : ''}학부모 상담 일정 안내]\n` + counselSchedule.rows.map(r => `${koreanDate(parseYMD(r.date))} ${r.time} ${r.name}`).join('\n') + '\n\n시간 변경이 필요하시면 미리 연락 부탁드립니다.';
            const htmlTable = `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:'Malgun Gothic',sans-serif;font-size:11pt"><thead><tr style="background:#f1f5f9"><th>상담 일자</th><th>시간</th><th>학생명</th></tr></thead><tbody>${counselSchedule.rows.map(r => `<tr><td>${escapeHTML(koreanDate(parseYMD(r.date)))}</td><td align="center">${escapeHTML(r.time)}</td><td align="center"><b>${escapeHTML(r.name)}</b></td></tr>`).join('')}</tbody></table>`;
            copyRichTable(text, htmlTable, '일정표(한글·엑셀 표 서식 포함)를 복사했습니다.');
        }
        function printCounselSchedule() {
            if (!counselSchedule) return; const s = getSettings();
            printHTML(`<div class="pl-table"><h1>${escapeHTML(s.className ? s.className + ' ' : '')}학부모 상담 일정</h1><table><thead><tr><th>날짜</th><th>시간</th><th>학생</th></tr></thead><tbody>${counselSchedule.rows.map(r => `<tr><td>${escapeHTML(koreanDate(parseYMD(r.date)))}</td><td>${r.time}</td><td>${escapeHTML(r.name)}</td></tr>`).join('')}</tbody></table></div>`);
        }

        // --- 암호화 (Web Crypto: PBKDF2-SHA256 → AES-GCM 256) ---
        function bufToB64(buf) { const bytes = new Uint8Array(buf); let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); }
        function b64ToBuf(b64) { const s = atob(b64); const out = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i); return out; }
        async function deriveKey(pw, salt, iterations) {
            const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
            return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
        }
        function cryptoReady() { if (window.crypto && crypto.subtle) return true; showToast('이 환경에서는 암호화를 쓸 수 없어요. https 주소(깃허브 페이지)에서 열어 주세요.', 'error'); return false; }
        async function exportCounselEncrypted() {
            const pw = document.getElementById('cs-pw').value;
            if (pw.length < 8) { showToast('비밀번호를 8자 이상 입력해 주세요.', 'error'); return; }
            if (!getCounsel().length) { showToast('백업할 상담 기록이 없어요.', 'info'); return; }
            if (!cryptoReady()) return;
            try {
                const iterations = 250000; const salt = crypto.getRandomValues(new Uint8Array(16)); const iv = crypto.getRandomValues(new Uint8Array(12));
                const key = await deriveKey(pw, salt, iterations);
                const plain = new TextEncoder().encode(JSON.stringify({ records: getCounsel(), exportedAt: new Date().toISOString() }));
                const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain);
                downloadFile(`상담기록_암호화_${ymd(new Date())}.json`, JSON.stringify({ app: 'gyojik-baekseo-1000', type: 'counsel-encrypted', v: 1, kdf: 'PBKDF2-SHA256', iterations, salt: bufToB64(salt), iv: bufToB64(iv), data: bufToB64(ct) }), 'application/json');
                showToast('암호화 백업 파일을 저장했습니다.');
            } catch (e) { showToast('암호화 중 오류가 발생했습니다.', 'error'); }
        }
        async function importCounselEncrypted(e) {
            const f = e.target.files[0]; e.target.value = ''; if (!f) return;
            const pw = document.getElementById('cs-pw').value;
            if (!pw) { showToast('백업할 때 쓴 비밀번호를 먼저 입력해 주세요.', 'error'); return; }
            if (!cryptoReady()) return;
            try {
                const env = JSON.parse(await f.text());
                if (!env || env.type !== 'counsel-encrypted') { showToast('상담 기록 암호화 백업 파일이 아니에요.', 'error'); return; }
                let plain;
                try { const key = await deriveKey(pw, b64ToBuf(env.salt), env.iterations || 250000); plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBuf(env.iv) }, key, b64ToBuf(env.data)); }
                catch (err) { showToast('비밀번호가 틀렸거나 파일이 손상되었어요.', 'error'); return; }
                const payload = JSON.parse(new TextDecoder().decode(plain));
                const incoming = Array.isArray(payload.records) ? payload.records : [];
                const map = new Map(getCounsel().map(r => [r.id, r])); incoming.forEach(r => { if (r && r.id) map.set(r.id, r); });
                if (!saveCounsel([...map.values()])) return;
                showToast(`상담 기록 ${incoming.length}건을 불러왔습니다.`); router.render();
            } catch (err) { showToast('파일을 읽을 수 없어요.', 'error'); }
        }

        // ====================================================
        // 2. 앱 설치(PWA) · 오프라인
        // ====================================================
        // 📲 앱 설치 버튼([data-ys-install])은 ys-install.js가 맡는다: 바로 설치 또는 기기별 설치 방법 안내
        function registerSW() {
            if (!('serviceWorker' in navigator)) return;
            const ok = location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname);
            if (!ok) return;
            navigator.serviceWorker.register('sw.js').catch(err => console.warn('[교직백서] 오프라인 기능 등록 실패:', err));
        }

        let menuTrigger = null;
        function openMobileMenu() {
            const m = document.getElementById('mobile-menu-modal'); if (!m) return;
            menuTrigger = document.activeElement;
            m.classList.remove('hidden');
            m.querySelector('.editorial-menu-head button')?.focus();
        }
        document.addEventListener('keydown', e => {
            if (document.querySelector('.yq-back, .ysi-back')) return;
            const m = document.getElementById('mobile-menu-modal');
            if (!m || m.classList.contains('hidden')) return;
            if (e.key === 'Escape') { e.stopPropagation(); closeMobileMenu(); return; }
            if (e.key !== 'Tab') return;
            const buttons = [...m.querySelectorAll('button')].filter(el => getComputedStyle(el).display !== 'none');
            if (!buttons.length) return;
            if (e.shiftKey && document.activeElement === buttons[0]) { e.preventDefault(); buttons.at(-1).focus(); }
            else if (!e.shiftKey && document.activeElement === buttons.at(-1)) { e.preventDefault(); buttons[0].focus(); }
        });
        function closeMobileMenu() {
            const m = document.getElementById('mobile-menu-modal');
            if (!m || m.classList.contains('hidden')) return;
            m.classList.add('hidden');
            menuTrigger?.focus();
            menuTrigger = null;
        }
        function toggleMobileMenu() {
            const m = document.getElementById('mobile-menu-modal');
            if (m && !m.classList.contains('hidden')) closeMobileMenu();
            else openMobileMenu();
        }

        // ====================================================
        // 3. 글자 크기 배율 (100% / 110% / 120%) · 1분 학급 세팅 마법사 · 빠른 실행 팔레트 (Ctrl+K)
        // ====================================================
        function applyFontScale() {
            const scale = ['100', '110', '120'].includes(String(getSettings().fontScale)) ? String(getSettings().fontScale) : '100';
            document.documentElement.style.fontSize = scale + '%';
            const lbl = document.getElementById('font-scale-label');
            if (lbl) lbl.textContent = scale + '%';
            document.querySelectorAll('[data-font-toggle]').forEach(btn => {
                btn.textContent = `글자 크기 ${scale}%`;
                btn.setAttribute('aria-label', `글자 크기 조절 (현재 ${scale}%)`);
            });
        }
        function setFontScale(scale) {
            const valid = ['100', '110', '120'].includes(String(scale)) ? String(scale) : '100';
            saveSetting('fontScale', valid);
            applyFontScale();
            showToast(`글자 크기를 ${valid}%로 변경했습니다.`, 'info');
            if (router.current === 'mybox') router.render();
        }
        function cycleFontScale() {
            const cur = String(getSettings().fontScale || '100');
            const next = cur === '100' ? '110' : cur === '110' ? '120' : '100';
            setFontScale(next);
        }

        function openSetupWizard() {
            const m = document.getElementById('setup-wizard-modal');
            const c = document.getElementById('setup-wizard-content');
            if (!m || !c) return;
            const s = getSettings();
            const names = getClassNames();
            c.innerHTML = `
                <div>
                    <div class="flex items-start justify-between gap-4 mb-5">
                        <div>
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 text-xs font-extrabold mb-2 whitespace-nowrap">🪄 1분 학급 초기 세팅</span>
                            <h3 id="setup-wizard-title" class="text-lg sm:text-xl font-black text-slate-900 dark:text-white">우리 반 학급·명단 통합 세팅</h3>
                            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">입력한 내용은 서버로 전송되지 않고 선생님의 기기(브라우저)에만 안전하게 저장됩니다.</p>
                        </div>
                        <button type="button" onclick="closeSetupWizard()" aria-label="닫기" class="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 flex items-center justify-center shrink-0"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                        <label class="text-xs font-bold text-slate-600 dark:text-slate-300">학교명
                            <input id="wiz-school" value="${escapeHTML(s.schoolName || '')}" placeholder="예: 행복초등학교" class="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-white">
                        </label>
                        <label class="text-xs font-bold text-slate-600 dark:text-slate-300">학반명
                            <input id="wiz-class" value="${escapeHTML(s.className || '')}" placeholder="예: 3학년 2반" class="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-white">
                        </label>
                        <label class="text-xs font-bold text-slate-600 dark:text-slate-300">담임 교사 성함
                            <input id="wiz-teacher" value="${escapeHTML(s.teacherName || '')}" placeholder="예: 김교사" class="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-white">
                        </label>
                        <label class="text-xs font-bold text-slate-600 dark:text-slate-300">소속 시·도교육청 (지침·누리집 연동)
                            <select id="wiz-office" class="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-white">
                                <option value="">선택 안 함 (전국 공통)</option>
                                ${EDUCATION_OFFICES.map(o => `<option value="${escapeHTML(o.code)}" ${(s.office || '') === o.code ? 'selected' : ''}>${escapeHTML(o.name)}</option>`).join('')}
                            </select>
                        </label>
                    </div>
                    <div class="mb-5">
                        <div class="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                            <label for="wiz-names" class="text-xs font-bold text-slate-600 dark:text-slate-300">우리 반 학생 명렬표 <span class="font-normal text-slate-400 whitespace-nowrap">(뽑기·자리배치·생기부·상담 연동)</span></label>
                            <button type="button" onclick="fillSampleClassNamesInWizard()" class="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 whitespace-nowrap">✨ 예시 명렬표 채우기</button>
                        </div>
                        <textarea id="wiz-names" rows="4" placeholder="줄바꿈 또는 쉼표(,)로 구분해 입력해 주세요. (예: 1.강하늘, 2.김바다, 3.박별...)" class="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-white">${escapeHTML(names.join(', '))}</textarea>
                    </div>
                    <div class="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <span class="text-xs text-slate-400"><i class="fa-solid fa-wand-magic-sparkles text-indigo-500 mr-1"></i>가정통신문·알림장·상담표에 자동 입력됩니다.</span>
                        <div class="flex gap-2 shrink-0">
                            <button type="button" onclick="closeSetupWizard()" class="whitespace-nowrap px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 text-xs font-bold">나중에</button>
                            <button type="button" onclick="saveSetupWizard()" class="whitespace-nowrap px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-sm"><i class="fa-solid fa-check mr-1"></i>저장하고 시작하기</button>
                        </div>
                    </div>
                </div>`;
            m.classList.remove('hidden');
            if (window.innerWidth > 768) setTimeout(() => document.getElementById('wiz-school')?.focus(), 50);
        }
        function fillSampleClassNamesInWizard() {
            const sample = ['1.강하늘', '2.김바다', '3.김서연', '4.박도윤', '5.박지우', '6.서민준', '7.손예린', '8.신유찬', '9.안소율', '10.오시우', '11.윤채원', '12.이서준', '13.이지호', '14.임하은', '15.장현우', '16.정다은', '17.조은우', '18.최수아', '19.한지민', '20.홍준서'];
            const el = document.getElementById('wiz-names');
            if (el) el.value = sample.join(', ');
            const sch = document.getElementById('wiz-school'); if (sch && !sch.value.trim()) sch.value = '행복초등학교';
            const cls = document.getElementById('wiz-class'); if (cls && !cls.value.trim()) cls.value = '3학년 2반';
            const tch = document.getElementById('wiz-teacher'); if (tch && !tch.value.trim()) tch.value = '김교사';
            showToast('체험용 예시 학급 정보와 20명 명렬표를 채웠습니다.', 'info');
        }
        // 내용 오류 신고 · 용어 추가 요청. 깃허브 이슈(공개)로 보내거나 내용을 복사해 다른 경로로 전달
        const FEEDBACK_CONFIG = { repo: 'gmlduqzhd123-lab/For-Teacher', formUrl: '' };
        const FEEDBACK_KINDS = {
            error: { title: '내용 오류 신고', prefix: '[오류 신고]', reasons: ['내용이 틀렸어요', '지침·법령이 바뀌었어요', '우리 지역은 달라요', '설명이 어려워요', '기타'] },
            request: { title: '용어·가이드 추가 요청', prefix: '[추가 요청]', reasons: ['새 용어를 넣어 주세요', '상황 가이드가 필요해요', '서식이 필요해요', '기타'] }
        };
        let feedbackCtx = { kind: 'error', subject: '', ref: '' };
        function openFeedback(kind = 'error', subject = '', ref = '') {
            const m = document.getElementById('setup-wizard-modal'); const c = document.getElementById('setup-wizard-content');
            if (!m || !c) return;
            if (isModalOpen()) closeModal(true);
            feedbackCtx = { kind: FEEDBACK_KINDS[kind] ? kind : 'error', subject: String(subject || '').slice(0, 80), ref: String(ref || '') };
            const k = FEEDBACK_KINDS[feedbackCtx.kind];
            const field = 'w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 mt-1';
            c.innerHTML = `
                <div class="space-y-4">
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <h3 id="setup-wizard-title" class="text-xl font-black text-slate-900 dark:text-white">${k.title}</h3>
                            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">보내 주신 의견으로 내용을 고치고 새 항목을 만듭니다.</p>
                        </div>
                        <button type="button" onclick="closeSetupWizard()" class="shrink-0 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700" aria-label="닫기"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="flex flex-wrap gap-2" role="tablist" aria-label="의견 종류">
                        ${Object.entries(FEEDBACK_KINDS).map(([key, v]) => `<button type="button" role="tab" aria-selected="${key === feedbackCtx.kind}" onclick="openFeedback('${key}', document.getElementById('fb-subject')?.value || '', feedbackCtx.ref)" class="px-3 py-2 rounded-xl text-xs font-bold ${key === feedbackCtx.kind ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}">${v.title}</button>`).join('')}
                    </div>
                    <label class="block text-xs font-bold text-slate-600 dark:text-slate-300">${feedbackCtx.kind === 'error' ? '어느 항목인가요?' : '어떤 용어·상황인가요?'}<input id="fb-subject" type="text" maxlength="80" value="${escapeHTML(feedbackCtx.subject)}" placeholder="${feedbackCtx.kind === 'error' ? '예: 관외 전보' : '예: 교원능력개발평가'}" class="${field}"></label>
                    <label class="block text-xs font-bold text-slate-600 dark:text-slate-300">종류<select id="fb-reason" class="${field}">${k.reasons.map(r => `<option>${r}</option>`).join('')}</select></label>
                    <label class="block text-xs font-bold text-slate-600 dark:text-slate-300">자세한 내용<textarea id="fb-body" rows="4" maxlength="1500" placeholder="${feedbackCtx.kind === 'error' ? '어떤 부분이 어떻게 다른지 적어 주세요.' : '언제 필요했는지, 어떤 내용이 있으면 좋을지 적어 주세요.'}" class="${field}"></textarea></label>
                    <label class="block text-xs font-bold text-slate-600 dark:text-slate-300">근거 링크 (선택)<input id="fb-source" type="url" maxlength="300" placeholder="법령·공문·교육청 안내 주소" class="${field}"></label>
                    <p class="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-900 dark:text-amber-200 leading-relaxed"><b>학생·학부모 이름, 연락처 등 개인정보는 적지 마세요.</b> 깃허브로 보내면 누구나 볼 수 있는 공개 글로 등록됩니다(깃허브 계정 필요). 계정이 없으면 <b>내용 복사</b> 후 원하는 곳에 붙여 넣어 전달해 주세요.</p>
                    <div class="flex flex-wrap justify-end gap-2">
                        <button type="button" onclick="copyFeedback()" class="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold">내용 복사</button>
                        ${FEEDBACK_CONFIG.formUrl ? `<button type="button" onclick="sendFeedback('form')" class="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold">설문으로 보내기</button>` : ''}
                        <button type="button" onclick="sendFeedback('github')" class="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold">깃허브로 보내기 ↗</button>
                    </div>
                </div>`;
            m.classList.remove('hidden');
            setTimeout(() => document.getElementById(feedbackCtx.subject ? 'fb-body' : 'fb-subject')?.focus(), 30);
        }
        function feedbackDraft() {
            const k = FEEDBACK_KINDS[feedbackCtx.kind];
            const v = id => (document.getElementById(id)?.value || '').trim();
            const subject = v('fb-subject'), reason = v('fb-reason'), body = v('fb-body'), source = v('fb-source');
            const lines = [
                `- 종류: ${reason}`,
                `- 항목: ${subject || '(미입력)'}${feedbackCtx.ref ? ` (${feedbackCtx.ref})` : ''}`,
                `- 내용 기준일: ${DATA_META.updatedAt || '-'}`,
                ...(currentOffice() ? [`- 소속 교육청: ${currentOffice().name}`] : []),
                '', body || '(내용 없음)',
                ...(source ? ['', `근거: ${source}`] : [])
            ];
            return { title: `${k.prefix} ${subject || reason}`.slice(0, 120), body: lines.join('\n'), ok: !!(subject || body) };
        }
        function copyFeedback() {
            const d = feedbackDraft();
            if (!d.ok) { showToast('항목이나 내용을 적어 주세요.', 'error'); return; }
            copyText(`${d.title}\n\n${d.body}`, '의견 내용을 복사했습니다.');
        }
        function sendFeedback(target = 'github') {
            const d = feedbackDraft();
            if (!d.ok) { showToast('항목이나 내용을 적어 주세요.', 'error'); return; }
            let url = target === 'form' && FEEDBACK_CONFIG.formUrl
                ? FEEDBACK_CONFIG.formUrl
                : `https://github.com/${FEEDBACK_CONFIG.repo}/issues/new?title=${encodeURIComponent(d.title)}&body=${encodeURIComponent(d.body)}`;
            if (target !== 'form' && url.length > 7000) { // 주소가 너무 길면 열리지 않으므로 본문은 복사해 붙여 넣게 함
                copyText(`${d.title}\n\n${d.body}`, '내용이 길어 복사해 두었어요. 열리는 창의 본문에 붙여 넣어 주세요.');
                url = `https://github.com/${FEEDBACK_CONFIG.repo}/issues/new?title=${encodeURIComponent(d.title)}`;
            }
            if (target === 'form') copyText(`${d.title}\n\n${d.body}`, '내용을 복사했어요. 설문에 붙여 넣어 주세요.');
            window.open(url, '_blank', 'noopener');
            Usage.event('feedback_send');
            closeSetupWizard();
        }
        function closeSetupWizard() {
            const m = document.getElementById('setup-wizard-modal');
            if (m) m.classList.add('hidden');
        }
        function saveSetupWizard() {
            const schoolName = (document.getElementById('wiz-school')?.value || '').trim();
            const className = (document.getElementById('wiz-class')?.value || '').trim();
            const teacherName = (document.getElementById('wiz-teacher')?.value || '').trim();
            const office = (document.getElementById('wiz-office')?.value || '').trim();
            const rawNames = (document.getElementById('wiz-names')?.value || '');
            const names = parseNameList(rawNames);
            const cur = getSettings();
            if (!Storage.set('settings', { ...cur, schoolName, className, teacherName, office })) return;
            if (!Storage.set('class_names', names.join(', '))) return;
            const clsInput = document.getElementById('class-names-input');
            if (clsInput) clsInput.value = names.join(', ');
            pickedNames.clear();
            closeSetupWizard();
            showToast(`학급 세팅 완료! (${className || '우리 반'} · 학생 ${names.length}명)`);
            router.render();
        }

        let currentSosIdx = 0;
        function openSosModal(idx = 0) {
            const m = document.getElementById('setup-wizard-modal');
            const c = document.getElementById('setup-wizard-content');
            if (!m || !c) return;
            currentSosIdx = Math.max(0, Math.min(SOS_CASES.length - 1, Number(idx) || 0));
            const cur = SOS_CASES[currentSosIdx];
            c.innerHTML = `
                <div class="space-y-4">
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300 text-xs font-extrabold mb-1.5">🚨 당황하지 마세요 · 골든타임 1초 대응</span>
                            <h3 id="setup-wizard-title" class="text-xl font-black text-slate-900 dark:text-white">위급 상황 SOS 퀵 가이드</h3>
                        </div>
                        <button type="button" onclick="closeSetupWizard()" aria-label="닫기" class="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 flex items-center justify-center shrink-0"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="flex flex-nowrap gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
                        ${SOS_CASES.map((sc, i) => `<button type="button" onclick="openSosModal(${i})" class="shrink-0 px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${i === currentSosIdx ? 'bg-rose-600 text-white shadow' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}">${escapeHTML(sc.badge)}</button>`).join('')}
                    </div>
                    <div class="p-4 rounded-2xl bg-rose-50/70 dark:bg-slate-900 border border-rose-200 dark:border-slate-700 space-y-3">
                        <div>
                            <h4 class="text-base font-extrabold text-slate-900 dark:text-white">${escapeHTML(cur.title)}</h4>
                            <p class="text-xs font-bold text-rose-600 dark:text-rose-400 mt-0.5">⏱️ 핵심 원칙: ${escapeHTML(cur.goldenTime)}</p>
                        </div>
                        <div class="space-y-2">
                            ${cur.steps.map((st, si) => `
                                <div class="flex items-start gap-2.5 text-xs">
                                    <span class="w-5 h-5 rounded-full bg-rose-600 text-white font-extrabold flex items-center justify-center shrink-0 mt-0.5">${si + 1}</span>
                                    <span class="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">${escapeHTML(st)}</span>
                                </div>
                            `).join('')}
                        </div>
                        <div class="p-3 rounded-xl bg-white dark:bg-slate-800 border border-rose-200/70 dark:border-slate-700 space-y-2">
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-[11px] font-extrabold text-slate-600 dark:text-slate-300"><i class="fa-solid fa-phone-volume text-rose-500 mr-1"></i>학부모 · 관리자 첫 연락 대본</span>
                                <button type="button" onclick="copyText(SOS_CASES[${currentSosIdx}].script, '긴급 연락 대본을 복사했습니다.')" class="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold">대본 복사</button>
                            </div>
                            <p class="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">${escapeHTML(cur.script)}</p>
                        </div>
                        <div class="flex flex-wrap gap-2 pt-1">
                            <button type="button" onclick="closeSetupWizard(); router.navigate('situations', '${escapeHTML(cur.situationId)}')" class="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-extrabold">상세 상황 가이드 →</button>
                            <button type="button" onclick="closeSetupWizard(); router.navigate('tools-doc', '${escapeHTML(cur.docId)}')" class="px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-extrabold">관련 안내문·양식 열기 →</button>
                            <button type="button" onclick="closeSetupWizard(); openDetail(${cur.termId})" class="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold">관련 법령·용어 상세 →</button>
                        </div>
                    </div>
                </div>`;
            m.classList.remove('hidden');
        }

        let currentCalcTab = 'att';
        function openCalcModal(tab = 'att') {
            const m = document.getElementById('setup-wizard-modal');
            const c = document.getElementById('setup-wizard-content');
            if (!m || !c) return;
            currentCalcTab = ['att', 'sick', 'trip'].includes(tab) ? tab : 'att';
            const todayStr = ymd(new Date());
            c.innerHTML = `
                <div class="space-y-4">
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 text-xs font-extrabold mb-1.5">🧮 헷갈리는 일수·시간 1초 자동 계산</span>
                            <h3 id="setup-wizard-title" class="text-xl font-black text-slate-900 dark:text-white">교무실 실무 미니 계산기 3종</h3>
                        </div>
                        <button type="button" onclick="closeSetupWizard()" aria-label="닫기" class="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 flex items-center justify-center shrink-0"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="flex flex-nowrap gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
                        <button type="button" onclick="openCalcModal('att')" class="shrink-0 px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${currentCalcTab === 'att' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}">📅 수업일수 2/3 출석</button>
                        <button type="button" onclick="openCalcModal('sick')" class="shrink-0 px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${currentCalcTab === 'sick' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}">🏥 병가 6일(48시간) 누계</button>
                        <button type="button" onclick="openCalcModal('trip')" class="shrink-0 px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${currentCalcTab === 'trip' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}">🚌 체험학습 평일 일수</button>
                    </div>
                    ${currentCalcTab === 'att' ? `
                        <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3">
                            <p class="text-xs text-slate-500 dark:text-slate-400">초·중등교육법 시행령에 따라 각 학년 과정의 <b>수업일수의 3분의 2 이상</b> 출석해야 수료·졸업이 인정됩니다(소수점 올림).</p>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label class="text-xs font-bold text-slate-700 dark:text-slate-200">우리 학교 연간 수업일수 (일)
                                    <input id="calc-att-total" type="number" min="1" max="365" value="190" oninput="refreshCalcModalResult()" class="mt-1 w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold">
                                </label>
                                <label class="text-xs font-bold text-slate-700 dark:text-slate-200">현재까지 누적 결석일수 (일)
                                    <input id="calc-att-absent" type="number" min="0" max="365" value="0" oninput="refreshCalcModalResult()" class="mt-1 w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold">
                                </label>
                            </div>
                            <div id="calc-modal-result" class="p-3.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs space-y-1"></div>
                        </div>
                    ` : currentCalcTab === 'sick' ? `
                        <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3">
                            <p class="text-xs text-slate-500 dark:text-slate-400">연간 일반병가(지각·조퇴·외출 누계 포함, 8시간=1일)가 <b>6일(48시간)을 초과</b>하면 의료법상 진단서 첨부가 필수입니다.</p>
                            <div class="grid grid-cols-3 gap-2.5">
                                <label class="text-xs font-bold text-slate-700 dark:text-slate-200">사용한 일수
                                    <input id="calc-sick-d" type="number" min="0" max="60" value="4" oninput="refreshCalcModalResult()" class="mt-1 w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold">
                                </label>
                                <label class="text-xs font-bold text-slate-700 dark:text-slate-200">사용한 시간
                                    <input id="calc-sick-h" type="number" min="0" max="200" value="5" oninput="refreshCalcModalResult()" class="mt-1 w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold">
                                </label>
                                <label class="text-xs font-bold text-slate-700 dark:text-slate-200">사용한 분
                                    <input id="calc-sick-m" type="number" min="0" max="59" value="30" oninput="refreshCalcModalResult()" class="mt-1 w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold">
                                </label>
                            </div>
                            <div id="calc-modal-result" class="p-3.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs space-y-1"></div>
                        </div>
                    ` : `
                        <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3">
                            <p class="text-xs text-slate-500 dark:text-slate-400">시작일과 종료일 사이의 <b>주말(토·일)을 제외한 평일 일수</b>를 계산합니다(법정공휴일·재량휴업일은 별도 제외).</p>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label class="text-xs font-bold text-slate-700 dark:text-slate-200">시작일
                                    <input id="calc-trip-start" type="date" value="${todayStr}" onchange="refreshCalcModalResult()" class="mt-1 w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold">
                                </label>
                                <label class="text-xs font-bold text-slate-700 dark:text-slate-200">종료일
                                    <input id="calc-trip-end" type="date" value="${todayStr}" onchange="refreshCalcModalResult()" class="mt-1 w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold">
                                </label>
                            </div>
                            <div id="calc-modal-result" class="p-3.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs space-y-1"></div>
                        </div>
                    `}
                </div>`;
            m.classList.remove('hidden');
            refreshCalcModalResult();
        }

        function refreshCalcModalResult() {
            const box = document.getElementById('calc-modal-result');
            if (!box) return;
            if (currentCalcTab === 'att') {
                const res = calcAttendance23(document.getElementById('calc-att-total')?.value, document.getElementById('calc-att-absent')?.value);
                box.innerHTML = `
                    <p class="font-extrabold text-indigo-900 dark:text-indigo-200 text-sm">✅ 수료 최소 출석일수: <span class="underline">${res.requiredDays}일</span> 이상 (최대 결석 허용: ${res.maxAbsentDays}일)</p>
                    <p class="text-slate-700 dark:text-slate-300 font-semibold">${res.remainAllowance >= 0 ? `현재 결석 ${res.currentAbsent}일 반영 시 수료 마지노선까지 ${res.remainAllowance}일 여유가 있습니다.` : `⚠️ 수료 기준 출석일수보다 ${Math.abs(res.remainAllowance)}일 부족합니다(유급·미수료 주의).`}</p>
                `;
            } else if (currentCalcTab === 'sick') {
                const res = calcSickLeave6(document.getElementById('calc-sick-d')?.value, document.getElementById('calc-sick-h')?.value, document.getElementById('calc-sick-m')?.value);
                box.innerHTML = `
                    <p class="font-extrabold text-indigo-900 dark:text-indigo-200 text-sm">🏥 누적 사용량: ${escapeHTML(res.usedLabel)}</p>
                    <p class="${res.needsDoctorNote ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-slate-700 dark:text-slate-300 font-semibold'}">${escapeHTML(res.remainLabel)}</p>
                `;
            } else {
                const res = calcWeekdaysBetween(document.getElementById('calc-trip-start')?.value, document.getElementById('calc-trip-end')?.value);
                box.innerHTML = `
                    <p class="font-extrabold text-indigo-900 dark:text-indigo-200 text-sm">🚌 주말 제외 평일 일수: <span class="underline">${res.weekdays}일</span></p>
                    <p class="text-slate-700 dark:text-slate-300 font-semibold">전체 기간 ${res.totalDays}일 중 주말(토·일) ${res.weekendDays}일 제외 (기간 내 공휴일이 있다면 추가로 빼주세요)</p>
                `;
            }
        }

        function openGuideModal() {
            const m = document.getElementById('setup-wizard-modal');
            const c = document.getElementById('setup-wizard-content');
            if (!m || !c) return;
            c.innerHTML = `
                <div class="space-y-4">
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 text-xs font-extrabold mb-1.5 whitespace-nowrap">🧭 처음 오신 선생님을 위한 30초 안내</span>
                            <h3 id="setup-wizard-title" class="text-base sm:text-xl font-black text-slate-900 dark:text-white">교직백서 1000 핵심 활용 가이드</h3>
                        </div>
                        <button type="button" onclick="closeSetupWizard()" aria-label="닫기" class="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 flex items-center justify-center shrink-0"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1.5">
                            <span class="font-extrabold text-blue-600 dark:text-blue-400 block text-sm">1. 일상어로 검색 &amp; 역할별 필터</span>
                            <p class="text-slate-600 dark:text-slate-300 leading-relaxed">공문 용어가 기억나지 않아도 <b>"학생이 다쳤어요"</b>, <b>"물건 살 때"</b>처럼 검색하거나 <b>🌱 신규·저경력 필수</b> 탭만 눌러 모아보세요.</p>
                        </div>
                        <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1.5">
                            <span class="font-extrabold text-rose-600 dark:text-rose-400 block text-sm">2. 위급할 땐 🚨 긴급 SOS 모달</span>
                            <p class="text-slate-600 dark:text-slate-300 leading-relaxed">학생 부상, 학폭 초기, 강한 민원 전화, 미등교 발생 시 <b>골든타임 3단계 조치</b>와 <b>학부모 통화 대본</b>을 1초 만에 복사합니다.</p>
                        </div>
                        <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1.5">
                            <span class="font-extrabold text-emerald-600 dark:text-emerald-400 block text-sm">3. 교실 TV 전체화면 &amp; 칼퇴 도구</span>
                            <p class="text-slate-600 dark:text-slate-300 leading-relaxed">타이머·발표자 뽑기·자리배치를 <b>전자칠판 전체화면</b>으로 띄우고, 20종 기안문과 생기부 바이트·금지어 점검으로 퇴근을 앞당기세요.</p>
                        </div>
                        <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1.5">
                            <span class="font-extrabold text-indigo-600 dark:text-indigo-400 block text-sm">4. 기기 내 저장 &amp; 암호화 백업</span>
                            <p class="text-slate-600 dark:text-slate-300 leading-relaxed">학생 명단과 상담 일지는 외부 서버로 전송되지 않으며, <b>나의 교직함</b>에서 AES-256 암호화 파일 하나로 안전하게 백업·복원됩니다.</p>
                        </div>
                    </div>
                    <div class="flex flex-wrap justify-between items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                        <span class="text-xs text-slate-400 whitespace-nowrap">💡 <span class="kbd-hint"><kbd class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-mono">Ctrl+K</kbd> 또는 </span>상단 <b>⚡ 빠른 이동</b>으로 점프</span>
                        <div class="flex gap-2 shrink-0">
                            <button type="button" onclick="openSetupWizard()" class="whitespace-nowrap px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-extrabold">🪄 1분 학급 세팅 열기</button>
                            <button type="button" onclick="closeSetupWizard()" class="whitespace-nowrap px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-extrabold">확인했어요</button>
                        </div>
                    </div>
                </div>`;
            m.classList.remove('hidden');
        }

        function printTermCheatSheet(mode = 'search') {
            let items = [];
            let sheetTitle = '교직 실무 핵심 요약표 (치트시트)';
            if (mode === 'bookmarks') {
                const bms = new Set((Storage.get('bookmarks', []) || []).map(canonicalTermId));
                items = DB.filter(d => bms.has(d.id) && canonicalTermId(d.id) === d.id);
                sheetTitle = '나의 즐겨찾기 교직어 요약표';
                if (!items.length) {
                    items = DB.filter(d => (ROLE_PRESETS['role:newbie'].ids || []).includes(d.id) && canonicalTermId(d.id) === d.id);
                    sheetTitle = '신규·저경력 필수 교직어 요약표 (기본)';
                }
            } else {
                const input = document.getElementById('main-search-input');
                const q = input ? normalizeSearch(input.value) : '';
                const sort = (document.getElementById('sort-select') && document.getElementById('sort-select').value) || 'accuracy';
                items = rankTerms(q, currentCategoryFilter, sort).slice(0, 25);
                const roleLabel = ROLE_PRESETS[currentCategoryFilter]?.label || currentCategoryFilter;
                sheetTitle = `교직백서 요약표 (${roleLabel}${q ? ' · 검색: ' + q : ''})`;
            }
            if (!items.length) {
                showToast('인쇄할 교직어 항목이 없습니다.', 'info');
                return;
            }
            items.forEach(it => applyTermEnrichment(it));
            const s = getSettings();
            const sub = `${s.schoolName ? s.schoolName + ' · ' : ''}${koreanDate()} 출력 (${items.length}개 항목)`;
            printHTML(`
                <div class="pl-table">
                    <h1>${escapeHTML(sheetTitle)}</h1>
                    <p style="text-align:center;font-size:12px;color:#475569;margin-bottom:14px">${escapeHTML(sub)}</p>
                    <table>
                        <thead>
                            <tr>
                                <th style="width:18%">교직어 (분류)</th>
                                <th style="width:27%">한줄 정의 · 핵심 수치</th>
                                <th style="width:30%">나이스·에듀파인 경로</th>
                                <th style="width:25%">실무 팁 · 우리 학교 메모</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(it => {
                                const note = getTermNote(it.id);
                                const metricStr = (it.metrics && it.metrics.length) ? `<br><small>[${escapeHTML(it.metrics[0])}]</small>` : '';
                                return `<tr>
                                    <td><strong>${escapeHTML(it.keyword)}</strong><br><small>${escapeHTML(it.category)}</small></td>
                                    <td>${escapeHTML(it.simple)}${metricStr}</td>
                                    <td>${escapeHTML(it.systemPath || '-')}</td>
                                    <td>${escapeHTML(note ? '📝 ' + note : (it.tip || '-'))}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `);
        }

        const MENU_PAGES = [
            ['home', '홈 대시보드', '1초 실행 도구 · 오늘의 안내 · 주요 일정'],
            ['search', '교직어 검색', '대표 교직 용어 · 일상어·초성 검색 지원'],
            ['situations', '이럴 땐 어떻게? (상황 가이드 15선)', '돌발 상황별 대응 순서 · 통화 스크립트 · 양식 연결'],
            ['navigator', '교직 내비게이터', '업무 목적별 단계별 플로우차트'],
            ['map', '교직 지식맵', '연관 교직 개념 네트워크 탐색'],
            ['tools-doc', '기안·알림장 생성기 (20종)', '빈칸 채우기로 가정통신문·알림장·품의서 완성'],
            ['tools-class', '학급 경영 도구', '타이머 · 발표자 뽑기 · 자리 배치기'],
            ['tools-board', '실전 태스크 보드', '행사·신학기·생기부 체크리스트 및 동학년 공유'],
            ['tools-edutech', '에듀테크 큐레이션', '수업 활용 AI 도구 및 추천 프롬프트'],
            ['timetable', '시간표 · 종 알림', '주간 시간표 관리 및 수업 시작/종료 알림'],
            ['tools-record', '생기부 문장 도우미', '학생별 작성 · 나이스 바이트 · 금지어 점검 · 엑셀 저장'],
            ['counsel', '학부모 상담 기록장', '상담 기록 · 상담주간 시간표 자동 배정 · 암호화 백업'],
            ['start', '역할별 시작 코스', '신규·담임·전입·부장 맞춤 순서 안내'],
            ['year', '교사의 1년 타임라인', '월별 주요 학사·행정 업무 체크 및 달력(.ics) 내보내기'],
            ['career', '교직 커리어맵', '수석교사 · 장학사 · 교감/교장 성장 경로'],
            ['quiz', '교직력 테스트 & 오답 노트', '실무 상황 판단 퀴즈 및 틀린 문제 복습'],
            ['card', '오늘의 교직카드', '하루 1개 대표 교직 키워드 학습'],
            ['mybox', '나의 교직함 (설정 · 통합 백업)', '즐겨찾기 · 학급/교육청 설정 · 글자 크기 · 암호화 백업']
        ];
        let cmdPaletteItems = [];
        let cmdPaletteIdx = 0;
        function buildCommandPaletteItems(query) {
            const q = normalizeSearch(query);
            const qComp = compactSearch(query);
            const all = [
                { badge: '1초 실행', icon: 'fa-stopwatch', color: 'text-rose-500', title: '수업 타이머 (전체화면 바로 열기)', sub: '교실 TV용 큰 숫자 타이머 · 1/3/5/10분 프리셋', run: () => openPresent('timer') },
                { badge: '1초 실행', icon: 'fa-dice', color: 'text-amber-500', title: '발표자 뽑기 (전체화면 바로 열기)', sub: '우리 반 명렬표 연동 무작위 발표자 추첨', run: () => openPresent('pick') },
                { badge: '1초 실행', icon: 'fa-chair', color: 'text-emerald-500', title: '자리 배치표 (전체화면 바로 열기)', sub: '칠판 기준 자리표 확대 · 즉시 다시 섞기', run: () => openPresent('seats') },
                { badge: '1초 실행', icon: 'fa-chalkboard', color: 'text-amber-600', title: '칠판 알림 메모 (전체화면 바로 열기)', sub: '오늘의 준비물·과제·아침 자습 안내를 TV에 크게 표시', run: () => openPresent('memo') },
                { badge: '1초 실행', icon: 'fa-clock', color: 'text-indigo-500', title: '현재 교시·시계 (전체화면 바로 열기)', sub: '시종 시간표 연동 현재 교시와 남은 시간 표시', run: () => openPresent('clock') },
                { badge: '긴급 SOS', icon: 'fa-kit-medical', color: 'text-rose-600', title: '위급 상황 SOS 퀵 가이드 (부상·학폭·민원·미등교·병가)', sub: '골든타임 3단계 조치 및 학부모 첫 통화 대본 1초 복사', run: () => openSosModal() },
                { badge: '실무 계산기', icon: 'fa-calculator', color: 'text-indigo-600', title: '교무실 미니 계산기 3종 (출석일수 2/3 · 병가 6일 · 평일수)', sub: '수료 기준 출석일수와 진단서 기준 병가 누계를 즉시 계산', run: () => openCalcModal() },
                { badge: '사용법 안내', icon: 'fa-circle-question', color: 'text-blue-600', title: '처음 오신 선생님을 위한 30초 사용법 가이드', sub: '일상어 검색, SOS 대본, 전자칠판 모드, 암호화 백업 핵심 요약', run: () => openGuideModal() },
                { badge: '학급 설정', icon: 'fa-wand-magic-sparkles', color: 'text-indigo-600', title: '1분 학급 초기 세팅 마법사', sub: '학교·학반·교사명·교육청·학생 명렬표 한 번에 등록', run: () => openSetupWizard() },
                { badge: '백업/복원', icon: 'fa-shield-halved', color: 'text-indigo-600', title: '전체 데이터 통합 암호화 백업·복원', sub: '마이박스 > 일반 설정 + 생기부 초안 + 상담 기록 원클릭 백업', run: () => router.navigate('mybox') },
                { badge: '글자 크기', icon: 'fa-text-height', color: 'text-slate-600', title: '화면 글자 크기 배율 전환 (100% / 110% / 120%)', sub: '현재 배율을 다음 단계로 즉시 변경합니다', run: () => cycleFontScale() }
            ];
            MENU_PAGES.forEach(([id, title, desc]) => {
                all.push({ badge: '메뉴 이동', icon: 'fa-compass', color: 'text-indigo-500', title, sub: desc, run: () => router.navigate(id) });
            });
            DOC_TEMPLATES.forEach(t => {
                all.push({ badge: '통신문/알림장', icon: 'fa-file-signature', color: 'text-violet-500', title: `[문서 서식] ${t.title}`, sub: '기안·알림장 생성기 · 빈칸 채우기로 3초 완성', run: () => router.navigate('tools-doc', t.id) });
            });
            NAVIGATOR_COURSES.forEach(c => {
                all.push({ badge: '실무 코스', icon: 'fa-route', color: 'text-emerald-600', title: `[실무 내비게이터] ${c.title}`, sub: `${c.category || '실무'} · ${(c.steps || []).join(' → ')}`, run: () => router.navigate('navigator', c.publicId) });
            });
            SITUATIONS.forEach(s => {
                all.push({ badge: '상황별 대처', icon: 'fa-bolt', color: 'text-amber-500', title: `[상황 가이드] ${s.title}`, sub: `${s.category || ''} · ${(s.steps || []).join(' → ')}`, run: () => router.navigate('situations', s.publicId) });
                if (s.script) {
                    all.push({ badge: '학부모 통화 대본', icon: 'fa-phone-volume', color: 'text-emerald-600', title: `[통화 스크립트 복사] ${s.title}`, sub: s.script, run: () => copyText(s.script, '통화 스크립트를 복사했습니다.') });
                }
            });
            const matched = !q ? all.slice(0, 28) : all.filter(item => {
                const hay = `${item.title} ${item.sub} ${item.badge}`;
                return normalizeSearch(hay).includes(q) || compactSearch(hay).includes(qComp) || compactSearch(getChosung(item.title)).includes(qComp);
            });
            // 자연어 즉시 명령 실행 (타이머 N분 · 테마 전환 · 수식 계산 · 우리 반 학생 바로가기)
            const naturalCmds = [];
            if (q) {
                const tm = String(query || '').match(/(?:타이머\s*(\d{1,3})\s*분?|(\d{1,3})\s*분\s*타이머)/);
                if (tm) {
                    const mins = Math.max(1, Math.min(180, Number(tm[1] || tm[2])));
                    naturalCmds.push({
                        badge: '⚡ 즉시 실행', icon: 'fa-stopwatch', color: 'text-rose-500',
                        title: `${mins}분 타이머 즉시 시작 (전체화면)`,
                        sub: `교실 TV 전체화면 타이머를 ${mins}분(${mins * 60}초)으로 세팅하고 바로 시작합니다`,
                        run: () => { setTimerPreset(mins * 60); openPresent('timer'); startTimer(); }
                    });
                }
                if (/(다크\s*모드|라이트\s*모드|야간\s*모드|테마\s*변경|화면\s*모드)/.test(query)) {
                    naturalCmds.push({
                        badge: '⚡ 즉시 실행', icon: 'fa-circle-half-stroke', color: 'text-amber-500',
                        title: '다크 / 라이트 모드 즉시 전환',
                        sub: '현재 화면 테마를 즉시 반전합니다',
                        run: () => toggleQuickDarkMode()
                    });
                }
                const smartCalc = parseSmartCalcQuery(query);
                if (smartCalc) {
                    naturalCmds.push({
                        badge: '🧮 즉시 계산', icon: 'fa-calculator', color: 'text-indigo-600',
                        title: smartCalc.title,
                        sub: `${smartCalc.sub} (클릭하면 상세 계산기 열기)`,
                        run: () => openCalcModal(smartCalc.tab)
                    });
                }
                const students = [...new Set([...getRecordStudents(), ...counselStudents()])];
                students.filter(st => normalizeSearch(st).includes(q) || compactSearch(getChosung(st)).includes(qComp)).slice(0, 3).forEach(st => {
                    naturalCmds.push({
                        badge: '👩‍🎓 학생 생기부', icon: 'fa-pen-nib', color: 'text-blue-600',
                        title: `[${st}] 생기부 문장 도우미 바로 열기`,
                        sub: `${st} 학생의 행동특성·세특·창체 초안 작성 화면으로 이동`,
                        run: () => { recordStudent = st; router.navigate('tools-record'); }
                    });
                    naturalCmds.push({
                        badge: '💬 학생 상담', icon: 'fa-comments', color: 'text-emerald-600',
                        title: `[${st}] 학부모·학생 상담 기록 보기`,
                        sub: `${st} 학생으로 필터링된 상담 기록장을 엽니다`,
                        run: () => { counselFilter.student = st; router.navigate('counsel'); }
                    });
                });
            }
            if (naturalCmds.length) matched.unshift(...naturalCmds);
            if (DB && DB.length) {
                const termPool = q ? rankTerms(q, '전체', 'accuracy').slice(0, 25) : curatedTerms().slice(0, 12);
                termPool.forEach(t => {
                    matched.push({ badge: `백과 #${t.id}`, icon: 'fa-book-open', color: 'text-slate-500', title: t.keyword, sub: `${t.category} · ${t.simple}`, run: () => openDetail(t.id) });
                });
            }
            return matched.slice(0, 40);
        }
        function openCommandPalette() {
            const m = document.getElementById('command-palette-modal');
            const input = document.getElementById('command-palette-input');
            if (!m || !input) return;
            m.classList.remove('hidden');
            input.value = '';
            cmdPaletteIdx = 0;
            renderCommandPaletteList('');
            setTimeout(() => input.focus(), 30);
        }
        function closeCommandPalette() {
            const m = document.getElementById('command-palette-modal');
            if (m) m.classList.add('hidden');
        }
        function renderCommandPaletteList(q) {
            const box = document.getElementById('command-palette-list');
            if (!box) return;
            cmdPaletteItems = buildCommandPaletteItems(q);
            if (cmdPaletteIdx >= cmdPaletteItems.length) cmdPaletteIdx = 0;
            if (!cmdPaletteItems.length) {
                box.innerHTML = `<div class="p-8 text-center text-sm text-slate-400">일치하는 도구·문서 서식·백과 항목이 없습니다.</div>`;
                return;
            }
            box.innerHTML = cmdPaletteItems.map((it, idx) => `
                <button type="button" data-cmd-active="${idx === cmdPaletteIdx}" onclick="runCommandPaletteItem(${idx})" onmouseenter="cmdPaletteIdx=${idx}" class="w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-3 transition-colors ${idx === cmdPaletteIdx ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-900 dark:text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200'}">
                    <div class="flex items-center gap-3 min-w-0">
                        <i class="fa-solid ${it.icon} ${it.color} w-5 text-center shrink-0"></i>
                        <div class="min-w-0">
                            <div class="text-sm font-bold truncate">${escapeHTML(it.title)}</div>
                            <div class="text-xs text-slate-400 dark:text-slate-400 truncate">${escapeHTML(it.sub)}</div>
                        </div>
                    </div>
                    <span class="shrink-0 text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">${escapeHTML(it.badge)}</span>
                </button>
            `).join('');
            const activeEl = box.querySelector('[data-cmd-active="true"]');
            if (activeEl && typeof activeEl.scrollIntoView === 'function') activeEl.scrollIntoView({ block: 'nearest' });
        }
        function handleCommandPaletteKey(e) {
            if (e.isComposing) return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (cmdPaletteItems.length) { cmdPaletteIdx = (cmdPaletteIdx + 1) % cmdPaletteItems.length; renderCommandPaletteList(e.target.value); }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (cmdPaletteItems.length) { cmdPaletteIdx = (cmdPaletteIdx - 1 + cmdPaletteItems.length) % cmdPaletteItems.length; renderCommandPaletteList(e.target.value); }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                runCommandPaletteItem(cmdPaletteIdx);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                closeCommandPalette();
            }
        }
        function runCommandPaletteItem(idx) {
            const item = cmdPaletteItems[idx];
            if (!item) return;
            closeCommandPalette();
            item.run();
        }
        document.addEventListener('keydown', e => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                const m = document.getElementById('command-palette-modal');
                if (m && !m.classList.contains('hidden')) closeCommandPalette();
                else openCommandPalette();
                return;
            }
            if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                const tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
                if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || e.target?.isContentEditable) return;
                const cp = document.getElementById('command-palette-modal');
                const sw = document.getElementById('setup-wizard-modal');
                const mm = document.getElementById('mobile-menu-modal');
                if ((cp && !cp.classList.contains('hidden')) || (sw && !sw.classList.contains('hidden')) || (mm && !mm.classList.contains('hidden')) || isModalOpen() || presentKind) return;
                e.preventDefault();
                openCommandPalette();
                return;
            }
            if (e.key === 'Escape') {
                if (document.querySelector('.yq-back, .ysi-back')) return;
                const cp = document.getElementById('command-palette-modal');
                if (cp && !cp.classList.contains('hidden')) { e.stopPropagation(); closeCommandPalette(); return; }
                const sw = document.getElementById('setup-wizard-modal');
                if (sw && !sw.classList.contains('hidden')) { e.stopPropagation(); closeSetupWizard(); return; }
            }
        });

        // 안정적인 초기화 시작점: 테마 먼저 적용 → 데이터(terms.json) 로딩 → 화면 표시
        async function boot() {
            applyThemeMode();
            applyFontScale();
            await loadData();
            await Vault.init();
            router.init();
            startBellWatcher();
            registerSW();
            setTimeout(remindWeeklyAgenda, 1500);
        }
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
        else boot();


