import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  // Check if API key is set
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in .env file');
  }

  try {
    const { text } = await generateText({
      model: openai.chat('gpt-5'), // Using GPT-5
      prompt: 'Hello! Can you tell me a fun fact?',
    });

    console.log('Response:', text);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main().then(() => {
  // Exit cleanly when not in watch mode
  if (!process.env.TSX_WATCH) {
    process.exit(0);
  }
});

