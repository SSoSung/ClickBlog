const googleTrends = require('google-trends-api');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const CLUSTERS_PATH = path.join(__dirname, '../../data/clusters.json');

// 초기 클러스터 데이터 로드
function loadClusters() {
    if (!fs.existsSync(CLUSTERS_PATH)) {
        const initialData = {
            categories: [
                { name: "경제/재테크", pillars: [] },
                { name: "IT/기술", pillars: [] },
                { name: "암호화폐/블록체인", pillars: [] }
            ],
            history: []
        };
        fs.writeFileSync(CLUSTERS_PATH, JSON.stringify(initialData, null, 2));
        return initialData;
    }
    return JSON.parse(fs.readFileSync(CLUSTERS_PATH, 'utf-8'));
}

async function getTrendingTopics() {
    try {
        logger.info('Google Trends에서 실시간인기 키워드를 수집합니다...');
        const results = await googleTrends.dailyTrends({
            geo: 'KR',
        });

        // JSON 파싱 시도
        let data;
        try {
            data = JSON.parse(results);
        } catch (parseErr) {
            throw new Error('Google Trends 응답이 JSON 형식이 아닙니다. (차단된 가능성)');
        }

        const topics = data.default.trendingSearchesDays[0].trendingSearches.map(item => ({
            title: item.title.query,
            traffic: item.formattedTraffic,
            relatedQueries: item.relatedQueries.map(q => q.query)
        }));

        return topics;
    } catch (err) {
        logger.error('Google Trends 수집 중 에러 발생, 비상용 전문 주제를 사용합니다.');

        // 비상용 전문 지식 주제 리스트
        const fallbackTopics = [
            { title: "2026년 반도체 시장 전망과 투자 전략", relatedQueries: ["엔비디아", "삼성전자", "HBM 반도체"] },
            { title: "비트코인 ETF 승인 이후의 암호화폐 시장 변화", relatedQueries: ["이더리움", "알트코인", "자산 배분"] },
            { title: "생성형 AI 기술이 바꾸는 미래의 직업 지형도", relatedQueries: ["LLM", "자동화", "업무 생산성"] },
            { title: "미국 연준의 금리 정책과 글로벌 경제 영향", relatedQueries: ["인플레이션", "환율", "경기 침체"] }
        ];

        // 랜덤으로 하나 선택
        const randomTopic = fallbackTopics[Math.floor(Math.random() * fallbackTopics.length)];
        return [randomTopic];
    }
}

function saveTopicToHistory(topic, category, pillar) {
    const data = loadClusters();
    data.history.push({
        date: new Date().toISOString(),
        topic,
        category,
        pillar
    });
    fs.writeFileSync(CLUSTERS_PATH, JSON.stringify(data, null, 2));
}

module.exports = {
    loadClusters,
    getTrendingTopics,
    saveTopicToHistory
};
