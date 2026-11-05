# Объявления в вагоне

Записи объявлений (`voice.json`) синтезированы заранее нейросетевым синтезатором
[Piper](https://github.com/rhasspy/piper) голосами `ru_RU-denis-medium` и `ru_RU-dmitri-medium`
(модели из rhasspy/piper-voices, обучены на наборах данных OHF-Voice с лицензией CC0).
Формат — Opus в контейнере Ogg (12 кбит/с). Пересоздать: `tools/voice.mjs` (список текстов) и `tools/voice.py` (синтез и упаковка в MP3).
