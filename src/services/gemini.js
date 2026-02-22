const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const logger = require('../utils/logger');

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'fake-key');
const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-2.0-flash" });

async function generateProfessionalContent(topic, relatedKeywords = []) {
    const today = new Date();
    const dateStr = today.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

    const prompt = `
당신은 현재 ${dateStr} 시점에 글을 쓰고 있는 전문적인 지식을 전달하는 검색 엔진 최적화(SEO) 전문가이자 블로거입니다. 
지금은 2026년입니다. 과거(2023~2024년)의 지식에만 의존하지 말고, 현재 시점의 경제 흐름과 기술 트렌드를 반영하여 미래지향적으로 작성해 주세요.

주제: "${topic}"

다음 지침에 따라 구글 애드센스 승인 및 상단 노출에 최적화된 블로그 포스팅을 한국어로 작성해 주세요:

1. **제목**: 독자의 호기심을 자극하면서도 핵심 키워드가 포함된 제목 (H1)
2. **서론**: 독자가 이 글을 읽어야 하는 이유와 전문적인 배경 설명
3. **본론**: 
    - 3개 이상의 소제목(H2, H3)으로 구조화
    - 전문 용어가 나올 경우 친절하고 쉽게 풀어서 설명
    - 비교표나 리스트 형식을 적극 활용
    - 관련 키워드 반영: ${relatedKeywords.join(', ')}
4. **결론**: 요약 및 독자의 다음 행동(생각해볼 점) 제시
5. **SEO 메타 데이터**: 150자 내외의 메타 디스크립션 포함
6. **태그 추출**: 본문과 관련된 고품질 검색 키워드 5개를 쉼표로 구분하여 맨 마지막에 [TAGS: 키워드1, 키워드2...] 형식으로 포함해 주세요.

**형식**: HTML 태그를 포함하여 출력해 주세요. (h1, h2, h3, p, ul, li, table, strong 등 사용)

**주의사항**:
- AI가 쓴 것 같지 않게 자연스럽고 권위 있는 말투를 사용하세요.
- 충분히 깊이 있는 내용을 담아 2,000자 이상으로 길게 작성해 주세요.
`;

    try {
        logger.info(`Gemini를 사용하여 "${topic}" 주제의 콘텐츠 생성을 시작합니다...`);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();
        return text.replace(/```html/gi, '').replace(/```/g, '').trim();
    } catch (err) {
        logger.error('Gemini 콘텐츠 생성 중 에러 발생:', err);
        throw err;
    }
}

/**
 * 생성된 콘텐츠에서 태그만 추출
 */
function extractTags(content) {
    const tagMatch = content.match(/\[TAGS:\s*(.*?)\]/i);
    if (tagMatch && tagMatch[1]) {
        return tagMatch[1].split(',').map(t => t.trim());
    }
    return ["IT", "비즈니스", "트렌드"];
}

/**
 * 텍스트 내에서 JSON 객체를 찾아 파싱
 */
function extractJSON(text) {
    try {
        // 먼저 백틱 제거
        const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        // 가장 바깥쪽 { } 찾기
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start === -1 || end === -1) return null;

        const jsonStr = cleaned.substring(start, end + 1);
        return JSON.parse(jsonStr);
    } catch (e) {
        logger.error('JSON 추출 실패:', e);
        return null;
    }
}

async function extractKeyFactsForInfographic(content) {
    const prompt = `
다음 블로그 포스팅에서 핵심 데이터(수치, 기업, 기술 등)를 3-5가지 추출하여 JSON으로만 답변하세요.

포스팅 내용:
${content.substring(0, 3000)}

출력 형식: 반드시 아래 형식을 지키고 다른 말은 절대 하지 마세요.
{
  "제목": "요약 제목",
  "데이터": [
    {"항목": "항목명", "내용": "설명 내용"}
  ]
}
`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        return extractJSON(text);
    } catch (err) {
        logger.error('인포그래픽 데이터 추출 중 에러 발생:', err);
        return null;
    }
}

async function isTopicSimilar(newTopic, existingTopics) {
    if (existingTopics.length === 0) return false;

    const prompt = `
당신은 블로그 운영 전문가입니다. 다음 새 주제가 기존에 작성된 주제들과 내용상으로 크게 겹치는지 판단해 주세요.
완전히 똑같지 않더라도 다루는 핵심 내용이나 대상이 동일하면 중복으로 간주합니다.

기존 주제들:
${existingTopics.slice(-15).map((t, i) => `${i + 1}. ${t}`).join('\n')}

새 주제: "${newTopic}"

중복 여부를 "중복" 또는 "새로운주제" 중 하나로 답변하고, 그 뒤에 짧은 이유를 적어주세요. 
형식: [결과] 이유
`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();
        logger.info(`유사도 체크 결과: ${text}`);
        return text.includes('[중복]');
    } catch (err) {
        logger.error('유사도 체크 중 에러 발생:', err);
        return false; // 에러 시에는 진행 허용
    }
}

async function generateAIFallbackTopic() {
    try {
        const today = new Date();
        const year = today.getFullYear();

        logger.info(`${year}년 기준 창의적인 블로그 주제를 생성합니다...`);
        const prompt = `당신은 ${year}년을 살고 있는 트렌드 분석가입니다. 현재 시점에서 화제가 될 법한 기술, 재테크, 미래 전략 중 흥미로운 블로그 주제 1개와 관련 키워드 3개를 JSON으로 제안해줘. 
참고로 단순히 '2026년 반도체 전망' 같은 뻔한 주제 말고, 구체적이고 흥미로운 각도에서 접근해줘.
인사말 없이 반드시 JSON 형식으로만 응답해줘.
형식: {"title": "주제", "relatedQueries": ["키워드1", "키워드2", "키워드3"]}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const topic = extractJSON(text);
        if (topic && topic.title && Array.isArray(topic.relatedQueries)) {
            return topic;
        }
        throw new Error('올바른 JSON 형식이 아닙니다.');
    } catch (e) {
        logger.error('Gemini 대체 주제 생성 중 에러 발생:', e);
        return null;
    }
}

module.exports = {
    generateProfessionalContent,
    extractKeyFactsForInfographic,
    extractTags,
    isTopicSimilar,
    generateAIFallbackTopic
};
