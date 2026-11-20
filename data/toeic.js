/* ==========================================================================
   [새 단어장 추가 가이드 — 2단계]
   1. 이 파일(data/toeic.js)을 복사해 data/새파일.js (예: data/gre.js) 를 만들고,
      아래 key(영문 고유 키), title(화면에 표시될 이름), words 배열을 수정합니다.
      ※ 각 단어장 내부의 id 는 다른 단어장과 겹쳐도 괜찮으므로 1, 2, 3... 으로
        편하게 작성하세요. app.js 가 `${key}_${id}` 로 고유 키를 자동 생성합니다.
      ※ 고정된 Day 구분 없이 원하는 만큼 단어를 자유롭게 넣으면
        무한 스마트 스트림이 숙련도(Lv.0~3)에 따라 자동으로 공급합니다.
   2. index.html 하단의 [단어장 데이터 플러그인] 영역에 <script> 한 줄만 추가합니다.
      예) <script src="./data/gre.js" defer></script>
      → app.js 코드를 수정하지 않아도 메뉴·통계·학습 스트림·오답노트에 자동 반영됩니다.

   [단어 객체 스키마]
   - id: 숫자 (단어장 내부에서 1부터 순차 번호)
   - word: 영단어
   - phonetic: 발음기호 (IPA)
   - pos: 품사 (n., v., adj., adv. 등)
   - meaning: 한국어 대표 뜻
   - example: 실전 영어 예문
   - exampleKo: 예문 한국어 해석
   ========================================================================== */

window.VOCAB_DECKS = window.VOCAB_DECKS || [];

window.VOCAB_DECKS.push({
  key: "toeic",
  title: "토익",
  words: [
    {
      id: 1,
      word: "reimburse",
      phonetic: "/ˌriː.ɪmˈbɜːrs/",
      pos: "v.",
      meaning: "변제하다, 환급하다",
      example:
        "The company will reimburse employees for all approved business travel expenses.",
      exampleKo:
        "회사는 승인된 모든 출장 경비를 직원들에게 환급해 줄 것이다.",
    },
    {
      id: 2,
      word: "mandatory",
      phonetic: "/ˈmæn.də.tɔːr.i/",
      pos: "adj.",
      meaning: "의무적인, 필수의",
      example:
        "Attendance at the annual workplace safety orientation is mandatory for all staff.",
      exampleKo:
        "연례 직장 안전 오리엔테이션 참석은 모든 직원에게 의무 사항이다.",
    },
    {
      id: 3,
      word: "streamline",
      phonetic: "/ˈstriːm.laɪn/",
      pos: "v.",
      meaning: "간소화하다, 효율화하다",
      example:
        "The new software was introduced to streamline the invoice approval workflow.",
      exampleKo:
        "새 소프트웨어는 송장 승인 절차를 간소화하기 위해 도입되었다.",
    },
    {
      id: 4,
      word: "contingency",
      phonetic: "/kənˈtɪn.dʒən.si/",
      pos: "n.",
      meaning: "비상사태, 만일의 사태",
      example:
        "Project managers prepared a contingency plan in case of supply chain delays.",
      exampleKo:
        "프로젝트 매니저들은 공급망 지연에 대비해 비상 계획을 수립했다.",
    },
    {
      id: 5,
      word: "complimentary",
      phonetic: "/ˌkɑːm.pləˈmen.tər.i/",
      pos: "adj.",
      meaning: "무료의, 칭찬하는",
      example:
        "Conference attendees receive complimentary parking at the convention center.",
      exampleKo:
        "컨퍼런스 참가자들은 컨벤션 센터에서 무료 주차 혜택을 받는다.",
    },
    {
      id: 6,
      word: "stipulate",
      phonetic: "/ˈstɪp.jə.leɪt/",
      pos: "v.",
      meaning: "(계약서에) 명시하다, 규정하다",
      example:
        "The lease agreement stipulates that rent must be paid by the fifth of each month.",
      exampleKo:
        "임대차 계약서에는 매월 5일까지 임대료를 납부해야 한다고 명시되어 있다.",
    },
    {
      id: 7,
      word: "lucrative",
      phonetic: "/ˈluː.krə.tɪv/",
      pos: "adj.",
      meaning: "수익성이 좋은, 돈이 되는",
      example:
        "Expanding into overseas e-commerce proved to be a lucrative strategy for the firm.",
      exampleKo:
        "해외 전자상거래 진출은 그 회사에 수익성 높은 전략으로 입증되었다.",
    },
    {
      id: 8,
      word: "disseminate",
      phonetic: "/dɪˈsem.ə.neɪt/",
      pos: "v.",
      meaning: "(정보·정책을) 전파하다, 배포하다",
      example:
        "Human resources will disseminate the updated remote work policy via email.",
      exampleKo:
        "인사팀은 개정된 원격 근무 정책을 이메일로 배포할 예정이다.",
    },
    {
      id: 9,
      word: "tentative",
      phonetic: "/ˈten.tə.tɪv/",
      pos: "adj.",
      meaning: "잠정적인, 임시의",
      example:
        "Please review the tentative schedule for next week's quarterly board meeting.",
      exampleKo:
        "다음 주 분기 이사회 회의의 잠정 일정을 검토해 주시기 바랍니다.",
    },
    {
      id: 10,
      word: "benchmark",
      phonetic: "/ˈbentʃ.mɑːrk/",
      pos: "n.",
      meaning: "기준점, 표준 지표",
      example:
        "Customer satisfaction scores set a new industry benchmark for the logistics sector.",
      exampleKo:
        "고객 만족도 점수는 물류 업계의 새로운 표준 지표를 세웠다.",
    },
  ],
});
