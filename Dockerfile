FROM node:20-slim AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY tsconfig.base.json tsconfig.json ./

COPY lib/ ./lib/
COPY artifacts/newsletter-report/ ./artifacts/newsletter-report/
COPY attached_assets/ ./attached_assets/

RUN pnpm install --frozen-lockfile

ENV PORT=3000
ENV BASE_PATH=/
ENV NODE_ENV=production

RUN pnpm --filter @workspace/newsletter-report build

FROM node:20-alpine AS runner

RUN npm install -g serve

WORKDIR /app

COPY --from=builder /app/artifacts/newsletter-report/dist/public ./public

EXPOSE 3000

CMD sh -c "serve -s public -l ${PORT:-3000}"
