import os
import glob
import json
import requests
from io import BytesIO
from PIL import Image
import matplotlib.pyplot as plt
from scipy.ndimage import gaussian_filter
import matplotlib.colors as mcolors
import numpy as np
from pathlib import Path

# Raiz do repositório (este script fica em scripts/).
RAIZ = Path(__file__).resolve().parents[2]
FIGURAS = RAIZ / 'outputs' / 'figures'

# ==========================================
# 1. CONFIGURAÇÕES DA PESQUISA
# ==========================================
FOLDER_PATH = RAIZ / 'data' / 'Classificatória 1'
TARGET_MAP_NAME = 'Haven'  # Nome do mapa (ex: 'Lotus', 'Ascent', 'Bind')

PLOTAR_PONTOS = True

# Nicks (gameName) dos jogadores da equipa que quer analisar.
# Se deixar a lista vazia [], o código irá pegar os dados de TODOS os jogadores e equipas.
TEAM_PLAYERS = [] # Exemplo vazio para mapa global
# TEAM_PLAYERS = ["BRaim", "drs1 rei de itu", "goavyy", "makola", "É O TAL DO MV"] 

# ==========================================
# 2. OBTER DADOS DO MAPA NA API
# ==========================================
print(f"A buscar dados do mapa '{TARGET_MAP_NAME}' na Valorant-API...")
api_url = "https://valorant-api.com/v1/maps"
response = requests.get(api_url).json()

map_info = None
for m in response.get('data', []):
    if m.get('displayName', '').lower() == TARGET_MAP_NAME.lower():
        map_info = m
        break

if not map_info:
    raise ValueError(f"Mapa '{TARGET_MAP_NAME}' não encontrado na API.")

target_map_url = map_info['mapUrl']  # Caminho interno (ex: /Game/Maps/Jam/Jam)
x_multiplier = map_info['xMultiplier']
y_multiplier = map_info['yMultiplier']
x_scalar_to_add = map_info['xScalarToAdd']
y_scalar_to_add = map_info['yScalarToAdd']

# Baixar imagem do minimapa
img_response = requests.get(map_info['displayIcon'])
map_img = Image.open(BytesIO(img_response.content))
img_w, img_h = map_img.size

# ==========================================
# 3. PROCESSAR OS JSONs DA PASTA
# ==========================================
plant_coords = []
arquivos_lidos = 0
partidas_encontradas = 0

json_files = glob.glob(os.path.join(FOLDER_PATH, "*.json"))

for file_path in json_files:
    arquivos_lidos += 1
    with open(file_path, 'r', encoding='utf-8') as f:
        match_data = json.load(f)
    
    # 3.1 Verificar se a partida foi jogada no mapa alvo
    if match_data.get('matchInfo', {}).get('mapId') != target_map_url:
        continue  # Ignora se for noutro mapa
    
    # 3.2 Lógica Condicional: Filtrar por equipa APENAS se a lista não estiver vazia
    target_team_id = None
    puuid_to_team = {}
    
    if TEAM_PLAYERS:
        for player in match_data.get('players', []):
            p_name = player.get('gameName', '')
            p_team = player.get('teamId')
            p_puuid = player.get('puuid')
            
            puuid_to_team[p_puuid] = p_team
            
            # Identifica se algum jogador da lista está nesta partida
            if any(team_player.lower() in p_name.lower() for team_player in TEAM_PLAYERS):
                target_team_id = p_team
                
        # Se a lista não é vazia, mas nenhum jogador foi encontrado, ignora o ficheiro
        if not target_team_id:
            continue
            
    partidas_encontradas += 1

    # 3.3 Extrair os plants
    for round_result in match_data.get('roundResults', []):
        planter_puuid = round_result.get('bombPlanter')
        plant_locations = round_result.get('plantPlayerLocations')
        
        if planter_puuid and plant_locations:
            
            # Valida se o plantador é o alvo (ou se aceitamos todos)
            planter_is_valid = True
            if TEAM_PLAYERS:
                if puuid_to_team.get(planter_puuid) != target_team_id:
                    planter_is_valid = False
                    
            if planter_is_valid:
                for player_loc in plant_locations:
                    if player_loc.get('puuid') == planter_puuid:
                        loc = player_loc.get('location', {})
                        x, y = loc.get('x'), loc.get('y')
                        if x is not None and y is not None:
                            plant_coords.append((x, y))

print(f"Ficheiros JSON lidos: {arquivos_lidos}")
print(f"Partidas válidas no mapa {TARGET_MAP_NAME}: {partidas_encontradas}")
print(f"Total de plants registados: {len(plant_coords)}")

# ==========================================
# 4. PLOTAR O MAPA DE CALOR (TRANSPARÊNCIA DINÂMICA)
# ==========================================
fig, ax = plt.subplots(figsize=(10, 10))

# Renderizar minimapa como fundo
ax.imshow(map_img)

# Trancar proporção
ax.set_aspect('equal', adjustable='box')
ax.set_xlim(0, img_w)
ax.set_ylim(img_h, 0)

if plant_coords:
    # --- CONVERSÃO DE COORDENADAS ---
    raw_x, raw_y = zip(*plant_coords)
    map_x = ((np.array(raw_y) * x_multiplier) + x_scalar_to_add) * img_w
    map_y = ((np.array(raw_x) * y_multiplier) + y_scalar_to_add) * img_h

    # 1. Criar um histograma 2D
    heatmap, xedges, yedges = np.histogram2d(
        map_x, map_y, 
        bins=[img_w, img_h], 
        range=[[0, img_w], [0, img_h]]
    )
    heatmap = heatmap.T

    # 2. Aplicar um Desfoque Gaussiano 
    # REDUZIDO: de sigma=20 para sigma=10 para raios menores e mais focados
    heatmap_blurred = gaussian_filter(heatmap, sigma=10)

    # 3. CRIAR UMA PALETA DE CORES COM DEGRADÊ DE TRANSPARÊNCIA
    cmap_base = plt.get_cmap('magma')
    cmap_colors = cmap_base(np.arange(cmap_base.N))
    
    # AJUSTADO: alterado de ** 1.5 para ** 0.5 para tornar a cor base menos transparente
    cmap_colors[:, -1] = np.linspace(0, 1, cmap_base.N) ** 0.6
    cmap_transparente = mcolors.ListedColormap(cmap_colors)

    # 4. Desenhar a mancha de calor
    ax.imshow(
        heatmap_blurred, 
        extent=[0, img_w, img_h, 0], 
        cmap=cmap_transparente, 
        origin='upper'
    )
    
    # 5. Plotar os pontos individuais
    if PLOTAR_PONTOS:
        ax.scatter(map_x, map_y, c='cyan', s=8, alpha=1.0, edgecolors='black', label='Plant individual', zorder=5)

# Título dinâmico dependendo se está a analisar uma equipa ou global
tipo_analise = "da Equipa" if TEAM_PLAYERS else "Globais"
plt.title(f'Zonas de Plant {tipo_analise} — {TARGET_MAP_NAME}', fontsize=16, color='white', pad=20)
if PLOTAR_PONTOS:
    plt.legend(loc='upper right')
plt.axis('off')

fig.patch.set_facecolor('#1a1a1a')

# Guardar com nome dinâmico
nome_ficheiro = 'heatmap_plants_equipa.png' if TEAM_PLAYERS else 'heatmap_plants_globais.png'
plt.savefig(FIGURAS / nome_ficheiro, bbox_inches='tight', dpi=300, facecolor=fig.get_facecolor())
plt.show()