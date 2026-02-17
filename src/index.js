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

        if (trends.length === 0) {
            logger.warn('수집된 인기 주제가 없습니다. 종료합니다.');
            return;
        }

        // 이미 포스팅한 주제는 제외하고 선택
        const selectedTopic = trends.find(t => !postedTopics.includes(t.title)) || trends[0];

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
            console.log('--- HTML 내용 생략 (로그 파일 확인 권장) ---');
            logger.info('Dry-run 모드이므로 실제로 게시하지 않았습니다.');
        } else {
            await blogger.postToBlogger(selectedTopic.title, finalHtml, ["전문지식", "트렌드분석", selectedTopic.title]);
            topicEngine.saveTopicToHistory(selectedTopic.title, "일반", "트렌드");
            logger.info('모든 프로세스가 성공적으로 완료되었습니다.');
        }

    } catch (err) {
        logger.error('자동화 파이프라인 중 치명적 에러 발생:', err);
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
