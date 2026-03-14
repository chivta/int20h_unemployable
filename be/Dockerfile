# ---- build stage ----
FROM golang:1.21-alpine AS build

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /api ./cmd/server

# ---- prod stage ----
FROM alpine:3.20 AS prod

# RUN apk add --no-cache ca-certificates tzdata

COPY --from=build /api /api

EXPOSE 8080
CMD ["/api"]