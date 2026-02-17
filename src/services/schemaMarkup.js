const logger = require('../utils/logger');

function generateArticleSchema(title, description, date, author = "지식 봇") {
    const schema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": title,
        "description": description,
        "datePublished": date,
        "author": {
            "@type": "Person",
            "name": author
        }
    };

    return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}

function generateFAQSchema(faqs) {
    if (!faqs || faqs.length === 0) return '';

    const schema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map(faq => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
            }
        }))
    };

    return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}

module.exports = {
    generateArticleSchema,
    generateFAQSchema
};
