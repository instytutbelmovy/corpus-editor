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

# git патрэбны для GenerateVersionFile (git rev-parse) калі build-arg SOURCE_COMMIT не перададзены
RUN apk add --no-cache git

# .git не заўсёды даступны ў build-кантэксце (напр. Coolify); у такім выпадку хэш каміта
# перадаецца праз build-arg SOURCE_COMMIT (Coolify: Advanced -> "Include Source Commit in
# Build"). Пакінуты пустым тут - GenerateVersionFile сам упадзе назад на git rev-parse.
ARG SOURCE_COMMIT=

WORKDIR /app
COPY . ./
COPY --from=fe-build /app/Editor.UI/out/ ./Editor.Api/wwwroot/

WORKDIR /app/Editor.Api
RUN dotnet restore Editor.Api.csproj
RUN dotnet publish Editor.Api.csproj -c Release -r linux-musl-x64 -o out --no-restore -p:GitCommitHash=$SOURCE_COMMIT


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
