import json
import requests
from io import BytesIO
from PIL import Image
import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path

# Raiz do repositório (este script fica em scripts/).
RAIZ = Path(__file__).resolve().parents[1]
FIGURAS = RAIZ / 'outputs' / 'figures'

# 1. Carregar o JSON da partida
json_file_path = RAIZ / 'data' / 'Classificatória 1' / 'UNIVAVA_C1_117_28-06-26_octacore_python_7_x_13_ufu_saints_lotus.json'

with open(json_file_path, 'r', encoding='utf-8') as f:
    match_data = json.load(f)

# 2. Identificar o mapa através do matchInfo
map_path = match_data.get('matchInfo', {}).get('mapId')  # Exemplo: "/Game/Maps/Jam/Jam"

# 3. Buscar dados de todos os mapas na Valorant-API
api_url = "https://valorant-api.com/v1/maps"
response = requests.get(api_url).json()

map_info = None
for m in response.get('data', []):
    if m.get('mapUrl') == map_path:
        map_info = m
        break

if not map_info:
    raise ValueError(f"Não foi possível encontrar metadados para o mapa: {map_path}")

# Extrair metadados, URL da imagem e escalonadores
map_name = map_info['displayName']
image_url = map_info['displayIcon']
x_multiplier = map_info['xMultiplier']
y_multiplier = map_info['yMultiplier']
x_scalar_to_add = map_info['xScalarToAdd']
y_scalar_to_add = map_info['yScalarToAdd']

# 4. Baixar o minimapa diretamente para a memória
img_response = requests.get(image_url)
map_img = Image.open(BytesIO(img_response.content))
img_w, img_h = map_img.size

# 5. Extrair as posições EXATAS de quem plantou a Spike
plant_coords = []

for round_result in match_data.get('roundResults', []):
    planter_puuid = round_result.get('bombPlanter')
    plant_locations = round_result.get('plantPlayerLocations')
    
    if planter_puuid and plant_locations:
        for player_loc in plant_locations:
            if player_loc.get('puuid') == planter_puuid:
                loc = player_loc.get('location', {})
                x, y = loc.get('x'), loc.get('y')
                if x is not None and y is not None:
                    plant_coords.append((x, y))

print(f"Mapa detetado: {map_name}")
print(f"Total de plants encontrados: {len(plant_coords)}")

# 6. Plotar o mapa de calor/pontos
fig, ax = plt.subplots(figsize=(10, 10))
ax.imshow(map_img)

if plant_coords:
    raw_x, raw_y = zip(*plant_coords)
    raw_x = np.array(raw_x)
    raw_y = np.array(raw_y)
    
    # Conversão de coordenadas com os parâmetros retornados pela API
    map_x = ((raw_y * x_multiplier) + x_scalar_to_add) * img_w
    map_y = ((raw_x * y_multiplier) + y_scalar_to_add) * img_h
    
    ax.scatter(map_x, map_y, c='red', s=90, marker='o', edgecolors='white', linewidth=1.5, label='Plant da Spike')

plt.title(f'Locais de Plant da Spike — {map_name}')
plt.legend(loc='upper right')
plt.axis('off')

plt.savefig(FIGURAS / f'plants_{map_name.lower()}.png', bbox_inches='tight', dpi=300)
plt.show()