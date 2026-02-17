const logger = require('../utils/logger');

/**
 * 인포그래픽 생성 서비스
 * 현재는 Gemini의 텍스트 기반 차트(Markdown Table 등) 또는 
 * HTML로 렌더링 가능한 시각적 요소를 생성하는 역할로 시작합니다.
 * (추후 외부 이미지 생성 API 연동 가능)
 */
async function generateVisualComponent(data) {
  try {
    logger.info('인포그래픽 시각적 요소를 구성합니다...');

    let contentHtml = '';
    try {
      // Gemini가 준 데이터가 JSON 형식이라면 파싱해서 표로 만듭니다.
      // 마크다운 백틱(```json ... ```)이 포함되어 있을 수 있으므로 정규식으로 추출합니다.
      const jsonMatch = data.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      const rawJson = jsonMatch ? jsonMatch[0] : data;
      const parsed = JSON.parse(rawJson);

      // 필드명 유연하게 처리 (데이터, 데이터 리스트, data 등)
      const rows = parsed.데이터 || parsed["데이터 리스트"] || parsed.data || [];

      if (rows && Array.isArray(rows)) {
        contentHtml = `
                    <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 0.95em;">
                        <thead>
                            <tr style="background-color: #007bff; color: white;">
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">구분</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">핵심 내용</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows.map((item, idx) => `
                                <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
                                    <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold; color: #495057; width: 30%;">${item.항목 || item.항목명 || "정보"}</td>
                                    <td style="padding: 12px; border: 1px solid #dee2e6; line-height: 1.6;">${(item.내용 || item.설명 || item.내용명 || "").replace(/\n/g, '<br/>')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <p style="margin-top: 15px; font-weight: bold; color: #007bff;">💡 한줄 결론: ${parsed.제목 || "핵심 분석 완료"}</p>
                `;
      } else {
        contentHtml = `<p style="line-height: 1.6;">${data.replace(/\n/g, '<br/>')}</p>`;
      }
    } catch (e) {
      // JSON 파싱 실패 시 일반 텍스트로 노출
      contentHtml = `<p style="line-height: 1.6;">${data.replace(/\n/g, '<br/>')}</p>`;
    }

    const visualHtml = `
      <div style="background-color: #ffffff; border-radius: 12px; padding: 25px; margin: 30px 0; border: 1px solid #e1e4e8; box-shadow: 0 4px 6px rgba(0,0,0,0.05); font-family: 'Noto Sans KR', sans-serif;">
        <div style="display: flex; align-items: center; margin-bottom: 15px;">
            <span style="font-size: 24px; margin-right: 10px;">📊</span>
            <h3 style="margin: 0; color: #1a1e21; font-size: 1.3em;">한눈에 보는 핵심 요약</h3>
        </div>
        <p style="color: #6c757d; font-size: 0.9em; margin-bottom: 20px;">글의 핵심 데이터를 심층 분석하여 시각적으로 정리했습니다.</p>
        <div class="infographic-content" style="color: #333 text-align: left;">
          ${contentHtml}
        </div>
      </div>
    `;

    return visualHtml;
  } catch (err) {
    logger.error('인포그래픽 생성 중 에러 발생:', err);
    return '';
  }
}

module.exports = {
  generateVisualComponent
};
