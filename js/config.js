export const config = {
    openai: {
        apiKey: process.env.OPENAI_API_KEY,
        assistantId: process.env.OPENAI_ASSISTANT_ID,
        vectorStoreId: process.env.OPENAI_VECTORSTORE_ID,
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 1000,
        apiVersion: 'v1'
    }
};