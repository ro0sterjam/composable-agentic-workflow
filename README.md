# Composable Search

TypeScript project using Vercel AI SDK to connect to OpenAI.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up your API key:
   - Copy `.env.example` to `.env` (already created)
   - Add your OpenAI API key to `.env`:
     ```
     OPENAI_API_KEY=sk-your-actual-api-key-here
     ```

## Usage

Run in development mode:
```bash
npm run dev
```

Build the project:
```bash
npm run build
```

Run the built project:
```bash
npm start
```

## Notes

- The project uses GPT-4o (the latest OpenAI model). You can change the model in `src/index.ts` if needed.
- Make sure to never commit your `.env` file (it's already in `.gitignore`).

