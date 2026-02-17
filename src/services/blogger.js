const { google } = require('googleapis');
const { oauth2Client } = require('../utils/auth');
const logger = require('../utils/logger');
const dotenv = require('dotenv');

dotenv.config();

const blogger = google.blogger({
    version: 'v3',
    auth: oauth2Client
});

async function postToBlogger(title, content, labels = []) {
    try {
        // 토큰 설정
        oauth2Client.setCredentials({
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN
        });

        const blogId = process.env.BLOGGER_ID;

        logger.info(`Blogger로 포스팅을 전송합니다: ${title}`);

        const res = await blogger.posts.insert({
            blogId,
            requestBody: {
                title,
                content,
                labels,
            }
        });

        logger.info(`포스팅 성공! 포스트 ID: ${res.data.id}`);
        return res.data;
    } catch (err) {
        logger.error('Blogger 포스팅 중 에러 발생:', err);
        throw err;
    }
}

module.exports = {
    postToBlogger
};
