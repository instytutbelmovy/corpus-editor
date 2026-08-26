# Multi-stage build для Editor праекту

# Stage 1: Зборка франтэнду (статычны экспарт -> /app/Editor.UI/out)
FROM node:22-alpine AS fe-build

WORKDIR /app/Editor.UI
COPY Editor.UI/package*.json ./
RUN npm ci
COPY Editor.UI/ ./
RUN npm run build


# Stage 2: Зборка бэкэнду; вынік зборкі франтэнду капіруецца ў wwwroot
FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS be-build

WORKDIR /app
COPY . ./
COPY --from=fe-build /app/Editor.UI/out/ ./Editor.Api/wwwroot/

ARG SOURCE_COMMIT=
RUN apk add --no-cache git && \
    GIT_COMMIT=${SOURCE_COMMIT:-$(git rev-parse --short=8 HEAD 2>/dev/null || echo unknown)} && \
    BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ) && \
    printf '{"version": "%s", "buildDate": "%s"}' "$GIT_COMMIT" "$BUILD_DATE" \
        > Editor.Api/wwwroot/version.json && \
    apk del git

WORKDIR /app/Editor.Api
RUN dotnet restore Editor.Api.csproj
RUN dotnet publish Editor.Api.csproj -c Release -r linux-musl-x64 -o out --no-restore


# Stage 3: Фінальны вобраз
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS final

RUN apk add --no-cache icu-libs

ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:80

# Ствараем карыстальніка для бяспекі
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

# Капіруем збудаваны праект
COPY --from=be-build /app/Editor.Api/out ./
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 80

# Запускаем праграму
ENTRYPOINT ["/app/Editor.Api"]
