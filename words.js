const VOCAB_DATA = [
  // Day 1 (1 ~ 10)
  {
    id: 1,
    day: 1,
    word: "ubiquitous",
    phonetic: "/juːˈbɪk.wɪ.təs/",
    pos: "adj.",
    meaning: "어디에나 있는, 아주 흔한",
    example:
      "Smartphones have become ubiquitous in modern classrooms and workplaces.",
    exampleKo: "스마트폰은 현대의 교실과 직장에서 어디에나 있는 존재가 되었다.",
  },
  {
    id: 2,
    day: 1,
    word: "mitigate",
    phonetic: "/ˈmɪt.ɪ.ɡeɪt/",
    pos: "v.",
    meaning: "완화하다, 경감시키다",
    example:
      "Urban planners planted more trees to mitigate the heat island effect.",
    exampleKo:
      "도시 계획가들은 열섬 현상을 완화하기 위해 더 많은 나무를 심었다.",
  },
  {
    id: 3,
    day: 1,
    word: "corroborate",
    phonetic: "/kəˈrɑː.bə.reɪt/",
    pos: "v.",
    meaning: "(증거로) 확증하다, 뒷받침하다",
    example:
      "Recent archaeological findings corroborate the historian's early theory.",
    exampleKo: "최근의 고고학적 발견은 그 역사학자의 초기 이론을 뒷받침한다.",
  },
  {
    id: 4,
    day: 1,
    word: "ephemeral",
    phonetic: "/ɪˈfem.ər.əl/",
    pos: "adj.",
    meaning: "수명이 짧은, 덧없는",
    example: "Viral trends on social media are often intense yet ephemeral.",
    exampleKo: "소셜 미디어의 바이럴 유행은 종종 강렬하지만 금방 사라진다.",
  },
  {
    id: 5,
    day: 1,
    word: "pragmatic",
    phonetic: "/præɡˈmæt.ɪk/",
    pos: "adj.",
    meaning: "실용적인, 현실적인",
    example:
      "The committee adopted a pragmatic approach to resolve the budget deficit.",
    exampleKo:
      "위원회는 예산 적자를 해결하기 위해 실용적인 접근 방식을 채택했다.",
  },
  {
    id: 6,
    day: 1,
    word: "exacerbate",
    phonetic: "/ɪɡˈzæs.ər.beɪt/",
    pos: "v.",
    meaning: "악화시키다",
    example:
      "Prolonged drought will further exacerbate food shortages in the region.",
    exampleKo: "장기적인 가뭄은 그 지역의 식량 부족을 더욱 악화시킬 것이다.",
  },
  {
    id: 7,
    day: 1,
    word: "discrepancy",
    phonetic: "/dɪˈskrep.ən.si/",
    pos: "n.",
    meaning: "불일치, 차이",
    example:
      "Auditors noticed a significant discrepancy between the two financial reports.",
    exampleKo: "감사관들은 두 재무 보고서 사이에서 중대한 불일치를 발견했다.",
  },
  {
    id: 8,
    day: 1,
    word: "resilient",
    phonetic: "/rɪˈzɪl.jənt/",
    pos: "adj.",
    meaning: "회복력이 있는, 탄력적인",
    example:
      "Coastal ecosystems are surprisingly resilient after severe tropical storms.",
    exampleKo:
      "해안 생태계는 극심한 열대 폭풍 이후에도 놀라울 정도로 회복력이 뛰어나다.",
  },
  {
    id: 9,
    day: 1,
    word: "ambiguous",
    phonetic: "/æmˈbɪɡ.ju.əs/",
    pos: "adj.",
    meaning: "애매모호한, 다의적인",
    example:
      "The contract contained ambiguous wording that led to a legal dispute.",
    exampleKo:
      "그 계약서에는 법적 분쟁으로 이어진 애매모호한 문구가 포함되어 있었다.",
  },
  {
    id: 10,
    day: 1,
    word: "advocate",
    phonetic: "/ˈæd.və.keɪt/",
    pos: "v.",
    meaning: "지지하다, 옹호하다",
    example:
      "Many economists advocate investing heavily in renewable energy infrastructure.",
    exampleKo:
      "많은 경제학자들은 재생 에너지 인프라에 대대적으로 투자할 것을 지지한다.",
  },

  // Day 2 (11 ~ 20)
  {
    id: 11,
    day: 2,
    word: "proliferate",
    phonetic: "/prəˈlɪf.ər.eɪt/",
    pos: "v.",
    meaning: "급증하다, 확산되다",
    example:
      "Independent coffee shops began to proliferate across the neighborhood.",
    exampleKo: "개인 커피숍들이 그 동네 전역에 급증하기 시작했다.",
  },
  {
    id: 12,
    day: 2,
    word: "scrutinize",
    phonetic: "/ˈskruː.tə.naɪz/",
    pos: "v.",
    meaning: "면밀히 조사하다, 세심히 살피다",
    example:
      "Peer reviewers must scrutinize the methodology before publishing a study.",
    exampleKo:
      "동료 심사위원들은 연구를 출판하기 전에 방법론을 면밀히 조사해야 한다.",
  },
  {
    id: 13,
    day: 2,
    word: "plausible",
    phonetic: "/ˈplɔː.zə.bəl/",
    pos: "adj.",
    meaning: "그럴듯한, 타당한",
    example:
      "She offered a plausible explanation for the sudden drop in temperature.",
    exampleKo: "그녀는 갑작스러운 기온 하락에 대해 그럴듯한 설명을 제시했다.",
  },
  {
    id: 14,
    day: 2,
    word: "supersede",
    phonetic: "/ˌsuː.pərˈsiːd/",
    pos: "v.",
    meaning: "대신하다, 대체하다",
    example:
      "Digital streaming services have largely superseded physical media.",
    exampleKo: "디지털 스트리밍 서비스가 물리적 매체를 상당 부분 대체했다.",
  },
  {
    id: 15,
    day: 2,
    word: "unprecedented",
    phonetic: "/ʌnˈpres.ɪ.den.tɪd/",
    pos: "adj.",
    meaning: "전례 없는, 유례없는",
    example:
      "Global collaboration during the crisis reached an unprecedented scale.",
    exampleKo: "위기 동안의 국제 협력은 전례 없는 규모에 도달했다.",
  },
  {
    id: 16,
    day: 2,
    word: "arbitrary",
    phonetic: "/ˈɑːr.bɪ.trer.i/",
    pos: "adj.",
    meaning: "임의적인, 자의적인",
    example: "Grading criteria should be transparent rather than arbitrary.",
    exampleKo: "평가 기준은 자의적이기보다는 투명해야 한다.",
  },
  {
    id: 17,
    day: 2,
    word: "alleviate",
    phonetic: "/əˈliː.vi.eɪt/",
    pos: "v.",
    meaning: "(고통·문제를) 완화하다, 덜어주다",
    example:
      "Expanding subway lines helped alleviate congestion during rush hour.",
    exampleKo:
      "지하철 노선 연장은 출퇴근 시간대 혼잡을 완화하는 데 도움이 되었다.",
  },
  {
    id: 18,
    day: 2,
    word: "coherent",
    phonetic: "/koʊˈhɪr.ənt/",
    pos: "adj.",
    meaning: "일관성 있는, 논리 정연한",
    example:
      "A strong essay presents a coherent argument backed by clear evidence.",
    exampleKo:
      "좋은 에세이는 명확한 근거로 뒷받침된 논리 정연한 주장을 제시한다.",
  },
  {
    id: 19,
    day: 2,
    word: "catalyst",
    phonetic: "/ˈkæt.əl.ɪst/",
    pos: "n.",
    meaning: "촉매, 기폭제",
    example:
      "The invention of the printing press acted as a catalyst for mass literacy.",
    exampleKo: "인쇄술의 발명은 대중 문해력 확산의 기폭제 역할을 했다.",
  },
  {
    id: 20,
    day: 2,
    word: "intrinsic",
    phonetic: "/ɪnˈtrɪn.zɪk/",
    pos: "adj.",
    meaning: "고유한, 본질적인",
    example: "Curiosity is an intrinsic part of scientific inquiry.",
    exampleKo: "호기심은 과학적 탐구의 본질적인 부분이다.",
  },

  // Day 3 (21 ~ 30)
  {
    id: 21,
    day: 3,
    word: "fluctuate",
    phonetic: "/ˈflʌk.tʃu.eɪt/",
    pos: "v.",
    meaning: "변동하다, 오르내리다",
    example:
      "Commodity prices tend to fluctuate sharply in response to geopolitical events.",
    exampleKo:
      "원자재 가격은 지정학적 사건에 반응하여 급격히 변동하는 경향이 있다.",
  },
  {
    id: 22,
    day: 3,
    word: "empirical",
    phonetic: "/ɪmˈpɪr.ɪ.kəl/",
    pos: "adj.",
    meaning: "경험적인, 실증적인",
    example:
      "Their hypothesis still lacks sufficient empirical evidence from field trials.",
    exampleKo:
      "그들의 가설은 여전히 현장 실험에서 나온 충분한 실증적 증거가 부족하다.",
  },
  {
    id: 23,
    day: 3,
    word: "undermine",
    phonetic: "/ˌʌn.dərˈmaɪn/",
    pos: "v.",
    meaning: "약화시키다, 훼손하다",
    example:
      "Spreading misinformation can severely undermine public trust in institutions.",
    exampleKo:
      "허위 정보의 유포는 기관에 대한 대중의 신뢰를 심각하게 훼손할 수 있다.",
  },
  {
    id: 24,
    day: 3,
    word: "pervasive",
    phonetic: "/pərˈveɪ.sɪv/",
    pos: "adj.",
    meaning: "만연한, 널리 퍼진",
    example:
      "Algorithmic recommendations have a pervasive influence on consumer choices.",
    exampleKo: "알고리즘 추천은 소비자의 선택에 널리 퍼진 영향력을 행사한다.",
  },
  {
    id: 25,
    day: 3,
    word: "feasible",
    phonetic: "/ˈfiː.zə.bəl/",
    pos: "adj.",
    meaning: "실현 가능한, 실행할 수 있는",
    example:
      "Engineers determined that constructing an undersea tunnel was technically feasible.",
    exampleKo:
      "엔지니어들은 해저 터널 건설이 기술적으로 실현 가능하다고 판단했다.",
  },
  {
    id: 26,
    day: 3,
    word: "reconcile",
    phonetic: "/ˈrek.ən.saɪl/",
    pos: "v.",
    meaning: "조화시키다, 양립시키다",
    example:
      "Policymakers struggle to reconcile rapid industrial growth with environmental protection.",
    exampleKo:
      "정책 입안자들은 급속한 산업 성장과 환경 보호를 조화시키는 데 어려움을 겪는다.",
  },
  {
    id: 27,
    day: 3,
    word: "rudimentary",
    phonetic: "/ˌruː.dɪˈmen.tər.i/",
    pos: "adj.",
    meaning: "기초적인, 초보적인",
    example:
      "Early microscopes offered only a rudimentary glimpse into cellular structures.",
    exampleKo: "초기 현미경은 세포 구조에 대한 기초적인 모습만을 보여주었다.",
  },
  {
    id: 28,
    day: 3,
    word: "substantiate",
    phonetic: "/səbˈstæn.ʃi.eɪt/",
    pos: "v.",
    meaning: "입증하다, 실증하다",
    example:
      "The researcher collected longitudinal data to substantiate her claims.",
    exampleKo:
      "그 연구자는 자신의 주장을 입증하기 위해 종단 데이터를 수집했다.",
  },
  {
    id: 29,
    day: 3,
    word: "stagnant",
    phonetic: "/ˈstæɡ.nənt/",
    pos: "adj.",
    meaning: "침체된, 정체된",
    example:
      "Real wages remained stagnant despite steady gains in corporate productivity.",
    exampleKo:
      "기업 생산성의 꾸준한 향상에도 불구하고 실질 임금은 정체된 상태로 남았다.",
  },
  {
    id: 30,
    day: 3,
    word: "paradigm",
    phonetic: "/ˈpær.ə.daɪm/",
    pos: "n.",
    meaning: "패러다임, 인식의 틀",
    example:
      "Quantum mechanics introduced a new paradigm in twentieth-century physics.",
    exampleKo: "양자역학은 20세기 물리학에 새로운 패러다임을 도입했다.",
  },
];
