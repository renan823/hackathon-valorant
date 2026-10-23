.PHONY: up down build logs ps restart clean

up:
	docker compose up -d

build:
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f

ps:
	docker compose ps

restart:
	docker compose down && docker compose up --build -d

clean:
	docker compose down --volumes --rmi local
