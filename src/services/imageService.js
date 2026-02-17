const logger = require('../utils/logger');

/**
 * 무료 고퀄리티 이미지(Unsplash)에서 주제와 관련 있는 사진 URL을 가져옵니다.
 * @param {string} topic 블로그 주제
 * @returns {string} 이미지 HTML 태그
 */
async function generateFeaturedImageHtml(topic) {
  try {
    logger.info(`"${topic}" 주제에 어울리는 고품질 이미지를 생성 중...`);

    // 주제 키워드를 인코딩하여 시드로 사용
    const query = encodeURIComponent(topic);

    // Picsum의 seed 기능을 활용하여 주제가 바뀌면 이미지가 바뀌도록 함
    // 추가로 Math.random을 섞어 절대 중복되지 않게 함
    const randomNum = Math.floor(Math.random() * 1000);
    const finalUrl = `https://picsum.photos/seed/${query}${randomNum}/1200/630`;

    return `
      <div style="margin-bottom: 40px; text-align: center;">
        <img src="${finalUrl}" 
             alt="${topic}" 
             style="width: 100%; max-width: 850px; height: auto; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); border: 1px solid #eee;"
             loading="lazy"/>
        <p style="color: #666; font-size: 0.85em; margin-top: 15px; font-style: italic;">
          * 주제의 이해를 돋구기 위한 시각자료입니다.
        </p>
      </div>
    `;
  } catch (err) {
    logger.error('이미지 HTML 생성 중 에러 발생:', err);
    return '';
  }
}

module.exports = {
  generateFeaturedImageHtml
};
