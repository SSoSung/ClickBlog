const { google } = require('googleapis');
const readline = require('readline');
const dotenv = require('dotenv');
const logger = require('./logger');

dotenv.config();

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3000/oauth2callback' // Redirect URI
);

const SCOPES = ['https://www.googleapis.com/auth/blogger'];

async function getNewToken() {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent' // Refresh token을 받기 위해 강제 동의 요청
    });

    console.log('---------------------------------------------------------');
    console.log('이 링크를 브라우저에서 열어 인증을 완료해 주세요:');
    console.log(authUrl);
    console.log('---------------------------------------------------------');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve, reject) => {
        rl.question('페이지에서 받은 "code" 값을 여기에 입력하고 엔터를 누르세요: ', async (code) => {
            rl.close();
            try {
                const { tokens } = await oauth2Client.getToken(code);
                logger.info('인증 성공! 토큰을 발급받았습니다.');
                console.log('\n--- .env 파일에 아래의 REFRESH_TOKEN을 복사해 넣으세요 ---');
                console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
                console.log('-----------------------------------------------------\n');
                resolve(tokens);
            } catch (err) {
                logger.error('인증 코드가 잘못되었거나 토큰 발급에 실패했습니다.', err);
                reject(err);
            }
        });
    });
}

// 직접 실행될 때만 작동
if (require.main === module) {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        logger.error('.env 파일에 GOOGLE_CLIENT_ID와 GOOGLE_CLIENT_SECRET을 먼저 설정해 주세요.');
        process.exit(1);
    }
    getNewToken();
}

module.exports = { oauth2Client, getNewToken };
