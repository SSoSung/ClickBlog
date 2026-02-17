const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const logger = require('../utils/logger');

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'fake-key');
const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-2.0-flash" });

async function generateProfessionalContent(topic, relatedKeywords = []) {
    const prompt = `
당신은 전문적인 지식을 전달하는 검색 엔진 최적화(SEO) 전문가이자 블로거입니다. 
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
        let text = response.text();
        // 정화 작업 (백틱 등 제거)
        return text.replace(/```json/gi, '').replace(/```html/gi, '').replace(/```/g, '').trim();
    } catch (err) {
        logger.error('인포그래픽 데이터 추출 중 에러 발생:', err);
        return null;
    }
}

module.exports = {
    generateProfessionalContent,
    extractKeyFactsForInfographic,
    extractTags
};
