const cron = require('node-cron');
const dotenv = require('dotenv');
const logger = require('./utils/logger');
const topicEngine = require('./services/topicEngine');
const gemini = require('./services/gemini');
const infographic = require('./services/infographic');
const schemaMarkup = require('./services/schemaMarkup');
const blogger = require('./services/blogger');
const imageService = require('./services/imageService');

dotenv.config();

/**
 * 전 과정 자동화 파이프라인
 */
async function runAutomationPipeline(isDryRun = false) {
    try {
        logger.info('--- 자동화 파이프라인 시작 ---');

        // 1. 주제 선정 (Trends 기반)
        const trends = await topicEngine.getTrendingTopics();
        const historyData = topicEngine.loadClusters();
        const postedTopics = historyData.history.map(h => h.topic);

        let selectedTopic;

        // 이미 포스팅한 주제는 제외하고 선택
        selectedTopic = trends.find(t => !postedTopics.includes(t.title));

        if (!selectedTopic) {
            logger.warn('새로운 트렌드 주제가 없습니다. AI 대체 주제 생성을 시도합니다.');
            const aiTopic = await generateAIFallbackTopic();
            if (aiTopic) {
                selectedTopic = aiTopic;
            } else {
                // 정말 최후의 수단: 비상용 리스트에서 아직 안 쓴 것 선택
                const fallbackTopics = [
                    { title: "2026년 반도체 시장 전망과 투자 전략", relatedQueries: ["엔비디아", "삼성전자", "HBM 반도체"] },
                    { title: "비트코인 ETF 이후의 암호화폐 시장 변화", relatedQueries: ["이더리움", "알트코인", "자산 배분"] },
                    { title: "생성형 AI 기술이 바꾸는 미래의 직업 지형도", relatedQueries: ["LLM", "자동화", "업무 생산성"] },
                    { title: "글로벌 금리 인하 사이클과 부동산 시장", relatedQueries: ["금리 정책", "주택 담보 대출", "글로벌 경제"] }
                ];
                selectedTopic = fallbackTopics.find(t => !postedTopics.includes(t.title)) || fallbackTopics[0];
            }
        }

        logger.info(`선정된 주제: ${selectedTopic.title} (기존 포스팅 여부: ${postedTopics.includes(selectedTopic.title)})`);

        // 2. 콘텐츠 생성 (Gemini)
        const rawContent = await gemini.generateProfessionalContent(selectedTopic.title, selectedTopic.relatedQueries);

        // 3. 인포그래픽용 데이터 추출 및 시각화 요소 생성
        const infoData = await gemini.extractKeyFactsForInfographic(rawContent);
        const visualHtml = await infographic.generateVisualComponent(infoData || "핵심 요약 데이터를 준비 중입니다.");

        // 4. Schema Markup 생성
        const schema = schemaMarkup.generateArticleSchema(selectedTopic.title, "전문 지식 심층 분석 포스팅", new Date().toISOString());

        // 5. 대표 이미지 생성
        const featuredImageHtml = await imageService.generateFeaturedImageHtml(selectedTopic.title);

        // 6. 최종 HTML 조립
        const finalHtml = `
      <style>
        .blog-content h1 { margin-bottom: 30px; line-height: 1.4; color: #1a1e21; }
        .blog-content h2 { margin-top: 40px; margin-bottom: 20px; color: #343a40; border-bottom: 2px solid #f1f3f5; padding-bottom: 10px; }
        .blog-content h3 { margin-top: 30px; margin-bottom: 15px; color: #495057; }
        .blog-content p { line-height: 1.8; margin-bottom: 20px; color: #212529; font-size: 1.05em; }
        .blog-content ul, .blog-content ol { margin-bottom: 20px; padding-left: 20px; }
        .blog-content li { margin-bottom: 10px; line-height: 1.6; }
      </style>
      <div class="blog-content">
        ${schema}
        ${featuredImageHtml}
        ${rawContent}
        <hr style="margin: 50px 0; border: 0; border-top: 1px solid #eee;"/>
        ${visualHtml}
        <p style="color: gray; font-size: 0.8em; margin-top: 30px; text-align: center;">
            본 포스팅은 실시간 정보를 바탕으로 전문 분석을 통해 작성되었습니다.
        </p>
      </div>
    `;

        // 6. 결과 처리 (Dry-run vs 실제 게시)
        if (isDryRun || process.env.DRY_RUN === 'true') {
            logger.info('--- DRY RUN 결과 ---');
            console.log(`제목: ${selectedTopic.title}`);
            const tags = gemini.extractTags(rawContent);
            console.log(`추출된 태그: ${tags.join(', ')}`);
            logger.info('Dry-run 모드이므로 실제로 게시하지 않았습니다.');
        } else {
            const tags = gemini.extractTags(rawContent);
            // 본문에서 [TAGS: ...] 부분 제거하여 깔끔하게 전송
            const cleanHtml = finalHtml.replace(/\[TAGS:.*?\]/gi, '').trim();

            await blogger.postToBlogger(selectedTopic.title, cleanHtml, [...tags, "전문지식", selectedTopic.title.substring(0, 15)]);
            topicEngine.saveTopicToHistory(selectedTopic.title, "일반", "트렌드");
            logger.info('모든 프로세스가 성공적으로 완료되었습니다.');
        }

    } catch (err) {
        logger.error('자동화 파이프라인 중 치명적 에러 발생:', err);
    }
}

/**
 * 트렌드 수집 실패 시 Gemini를 통해 주제 생성
 */
async function generateAIFallbackTopic() {
    try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        logger.info('Gemini를 사용하여 창의적인 블로그 주제를 생성합니다...');
        const prompt = "기술, 재테크, 미래 전략 중 사람들이 열광할 만한 흥미로운 블로그 주제 1개와 관련 키워드 3개를 JSON으로 제안해줘. 형식: {title: '', relatedQueries: []}";
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        try {
            const topic = JSON.parse(text);
            if (topic.title && topic.relatedQueries && Array.isArray(topic.relatedQueries)) {
                return topic;
            }
        } catch (parseError) {
            logger.error('Gemini 응답 파싱 실패:', parseError);
        }
        return null;
    } catch (e) {
        logger.error('Gemini 대체 주제 생성 중 에러 발생:', e);
        return null;
    }
}

// 스케줄 설정 (쉼표로 구분된 여러 시간대 지원)
const postingHours = (process.env.POSTING_HOUR || "8").split(',').map(h => h.trim());

postingHours.forEach(hour => {
    cron.schedule(`0 ${hour} * * *`, () => {
        logger.info(`정기 포스팅 스케줄 실행 (매일 ${hour}시)`);
        runAutomationPipeline(false);
    });
    logger.info(`예약 완료: 매일 ${hour}시`);
});

/**
 * 트렌드 수집 실패 시 Gemini를 통해 주제 생성
 */
async function generateAIFallbackTopic() {
    try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        logger.info('Gemini를 사용하여 창의적인 블로그 주제를 생성합니다...');
        const prompt = "기술, 재테크, 미래 전략 중 사람들이 열광할 만한 흥미로운 블로그 주제 1개와 관련 키워드 3개를 JSON으로 제안해줘. 형식: {\"title\": \"주제\", \"relatedQueries\": [\"키워드1\", \"키워드2\", \"키워드3\"]}";

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().replace(/```json/gi, '').replace(/```/g, '').trim();

        const topic = JSON.parse(text);
        return topic;
    } catch (e) {
        logger.error('Gemini 대체 주제 생성 중 에러 발생:', e);
        return null;
    }
}

// 즉시 실행 (테스트용)
if (process.argv.includes('--now')) {
    const dryRun = process.argv.includes('--dry-run');
    runAutomationPipeline(dryRun).then(() => {
        logger.info('작업이 완료되었습니다. 프로세스를 종료합니다.');
        process.exit(0);
    }).catch(err => {
        logger.error('작업 중 오류 발생:', err);
        process.exit(1);
    });
}

logger.info(`자동 포스팅 시스템이 가동되었습니다. (설정된 시간: 매일 ${postingHours.join(', ')}시)`);
