# Multi-stage build для Editor праекту

# Stage 1: Зборка
FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine AS build

WORKDIR /app
COPY . ./

WORKDIR /app/src
RUN apk add nodejs npm clang build-base zlib-dev
RUN npm ci
RUN npm run build

WORKDIR /app
RUN dotnet restore Editor.sln
RUN dotnet publish Editor.csproj -c Release -r linux-musl-x64 -o out --no-restore


# Stage 2: Фінальны вобраз
FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine AS final

RUN apk add --no-cache icu-libs

ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:80

# Ствараем карыстальніка для бяспекі
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

# Капіруем збудаваны праект
COPY --from=build /app/out ./
COPY files/grammar.db ./files/grammar.db
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 80

# Запускаем праграму
ENTRYPOINT ["/app/Editor"] 