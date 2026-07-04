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

# git патрэбны для GenerateVersionFile (git rev-parse) у Editor.csproj
RUN apk add --no-cache git

WORKDIR /app
COPY . ./
COPY --from=fe-build /app/Editor.UI/out/ ./Editor/wwwroot/

WORKDIR /app/Editor
RUN dotnet restore Editor.csproj
RUN dotnet publish Editor.csproj -c Release -r linux-musl-x64 -o out --no-restore


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
COPY --from=be-build /app/Editor/out ./
COPY Editor/files/grammar.db ./files/grammar.db
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 80

# Запускаем праграму
ENTRYPOINT ["/app/Editor"]
