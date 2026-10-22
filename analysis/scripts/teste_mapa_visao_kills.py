import os
import glob
import json
import requests
from io import BytesIO
from PIL import Image
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.widgets import Slider, Button
from matplotlib.patches import Wedge
from pathlib import Path

# Raiz do repositório (este script fica em scripts/).
RAIZ = Path(__file__).resolve().parents[2]

# ==========================================
# 1. PARÂMETROS DE ENTRADA E CONFIGURAÇÃO
# ==========================================
BASE_DIR = RAIZ / 'data'
FILE_NAME = 'UNIVAVA_C1_117_28-06-26_octacore_python_7_x_13_ufu_saints_lotus.json'
TARGET_ROUND_NUM = 1  # Número do round que deseja analisar (1, 2, 3...)

# --- AJUSTES VISUAIS DOS CONES DE VISÃO ---
CONE_RADIUS = 90      # Raio do cone em pixels
CONE_FOV = 60         # Abertura do campo de visão (graus)
CONE_ALPHA = 0.35     # Opacidade (0.0 a 1.0)

# Busca o arquivo recursivamente
found_files = glob.glob(os.path.join(BASE_DIR, '**', FILE_NAME), recursive=True)
if not found_files:
    raise FileNotFoundError(f"Não foi possível encontrar o arquivo '{FILE_NAME}' dentro de '{BASE_DIR}'.")

JSON_PATH = found_files[0]
print(f"Arquivo carregado com sucesso: {JSON_PATH}")

# ==========================================
# 2. CARREGAR DADOS E METADADOS DA API
# ==========================================
with open(JSON_PATH, 'r', encoding='utf-8') as f:
    match_data = json.load(f)

# Mapeamento de jogadores (PUUID -> Nome e Equipa)
players_info = {}
for p in match_data.get('players', []):
    players_info[p['puuid']] = {
        'name': f"{p.get('gameName', 'Player')}#{p.get('tagLine', '')}",
        'team': p.get('teamId')  # 'Blue' ou 'Red'
    }

# Buscar metadados do mapa na Valorant-API
map_path = match_data.get('matchInfo', {}).get('mapId')
api_maps = requests.get("https://valorant-api.com/v1/maps").json().get('data', [])

map_info = next((m for m in api_maps if m.get('mapUrl') == map_path), None)
if not map_info:
    raise ValueError(f"Não foi possível obter dados para o mapa: {map_path}")

map_name = map_info['displayName']
x_multiplier = map_info['xMultiplier']
y_multiplier = map_info['yMultiplier']
x_scalar_to_add = map_info['xScalarToAdd']
y_scalar_to_add = map_info['yScalarToAdd']

# Baixar imagem do minimapa
map_img = Image.open(BytesIO(requests.get(map_info['displayIcon']).content))
img_w, img_h = map_img.size

# ==========================================
# 3. ORDENAR ROUNDS E EXTRAIR KILLS
# ==========================================
round_results = match_data.get('roundResults', [])

# ORDENAÇÃO EXPLÍCITA DOS ROUNDS PELO NÚMERO DO ROUND
round_results.sort(key=lambda r: r.get('roundNum', 0))

# Selecionar o round desejado pelo campo 'roundNum' ou pelo índice ordenado
round_data = None
for r in round_results:
    if r.get('roundNum') == TARGET_ROUND_NUM - 1:
        round_data = r
        break

if not round_data and 0 <= (TARGET_ROUND_NUM - 1) < len(round_results):
    round_data = round_results[TARGET_ROUND_NUM - 1]

if not round_data:
    raise ValueError(f"Round {TARGET_ROUND_NUM} não encontrado na partida.")

def get_kill_time_ms(kill_obj):
    """Busca o tempo da kill tentando diferentes chaves possíveis no JSON."""
    for key in ['roundTime', 'timeSinceRoundStartMillis', 'gameTime', 'killTime']:
        val = kill_obj.get(key)
        if val is not None and val > 0:
            return val
    return 0

all_kills = []
for p_stat in round_data.get('playerStats', []):
    for k in p_stat.get('kills', []):
        all_kills.append(k)

# Ordenar as kills cronologicamente dentro do round
all_kills.sort(key=get_kill_time_ms)

if not all_kills:
    print(f"Não foram encontrados abates registrados no Round {TARGET_ROUND_NUM}.")
    exit()

print(f"Round {TARGET_ROUND_NUM} ({map_name}): {len(all_kills)} abates ordenados.")

# ==========================================
# 4. FUNÇÕES DE CONVERSÃO ESPACIAL E ÂNGULO
# ==========================================
def world_to_map(x_world, y_world):
    """Converte coordenadas 3D do jogo para pixels 2D da imagem do minimapa."""
    map_x = ((y_world * x_multiplier) + x_scalar_to_add) * img_w
    map_y = ((x_world * y_multiplier) + y_scalar_to_add) * img_h
    return map_x, map_y

def extract_view_angle(p_loc):
    """Extrai o valor de rotação do jogador independente da chave usada."""
    for key in ['viewSlope', 'viewRadians', 'view_radians', 'viewDegrees', 'view_degrees']:
        if key in p_loc and p_loc[key] is not None:
            return float(p_loc[key])
    return 0.0

def calculate_screen_angle(x_w, y_w, view_angle_val):
    """Calcula o ângulo de visão mapeado para os eixos de pixels da imagem 2D."""
    if abs(view_angle_val) <= 2 * np.pi:
        rad = view_angle_val
    else:
        rad = np.radians(view_angle_val)
    
    # Projeta um vetor à frente no espaço do jogo (1000 unidades)
    x_ahead = x_w + 1000.0 * np.cos(rad)
    y_ahead = y_w + 1000.0 * np.sin(rad)
    
    p0_x, p0_y = world_to_map(x_w, y_w)
    p1_x, p1_y = world_to_map(x_ahead, y_ahead)
    
    dx = p1_x - p0_x
    dy = p1_y - p0_y
    
    return np.degrees(np.arctan2(dy, dx))

# ==========================================
# 5. CONSTRUÇÃO DA INTERFACE INTERATIVA
# ==========================================
fig, ax = plt.subplots(figsize=(10, 10))
plt.subplots_adjust(bottom=0.15)
fig.patch.set_facecolor('#1a1a1a')

def render_kill_snapshot(kill_idx):
    ax.clear()
    ax.imshow(map_img)
    ax.set_aspect('equal', adjustable='box')
    ax.set_xlim(0, img_w)
    ax.set_ylim(img_h, 0)
    ax.axis('off')
    
    kill = all_kills[kill_idx]
    kill_time_ms = get_kill_time_ms(kill)
    round_time_sec = kill_time_ms / 1000.0
    
    killer_puuid = kill.get('killer')
    victim_puuid = kill.get('victim')
    
    killer_info = players_info.get(killer_puuid, {})
    victim_info = players_info.get(victim_puuid, {})
    
    killer_name = killer_info.get('name', 'Desconhecido')
    victim_name = victim_info.get('name', 'Desconhecido')
    
    player_locs = kill.get('playerLocations', [])
    killer_pos = None
    victim_pos = None
    
    # Renderizar todos os jogadores no momento da kill
    for p_loc in player_locs:
        p_puuid = p_loc.get('puuid')
        loc = p_loc.get('location', {})
        x_w, y_w = loc.get('x'), loc.get('y')
        
        if x_w is None or y_w is None:
            continue
            
        px, py = world_to_map(x_w, y_w)
        
        team = players_info.get(p_puuid, {}).get('team', 'Blue')
        color = '#00a8ff' if team == 'Blue' else '#ff4757'
        
        if p_puuid == killer_puuid:
            killer_pos = (px, py)
        elif p_puuid == victim_puuid:
            victim_pos = (px, py)
            
        # Calcular ângulo do cone
        raw_angle = extract_view_angle(p_loc)
        angle_deg = calculate_screen_angle(x_w, y_w, raw_angle)
        
        # Desenhar Cone de Visão
        half_fov = CONE_FOV / 2.0
        wedge = Wedge(
            center=(px, py), 
            r=CONE_RADIUS, 
            theta1=angle_deg - half_fov, 
            theta2=angle_deg + half_fov, 
            color=color, 
            alpha=CONE_ALPHA, 
            zorder=3
        )
        ax.add_patch(wedge)
        
        # Marcadores dos Jogadores
        marker = 'o'
        edge_c = 'white'
        size = 80
        
        if p_puuid == killer_puuid:
            marker = 'P'  # Cruz para o Killer
            size = 140
        elif p_puuid == victim_puuid:
            marker = 'X'  # X para a Vítima
            size = 140
            edge_c = 'black'
            
        ax.scatter(px, py, c=color, s=size, marker=marker, edgecolors=edge_c, linewidth=1.5, zorder=5)

    if not victim_pos and kill.get('victimLocation'):
        v_loc = kill['victimLocation']
        victim_pos = world_to_map(v_loc['x'], v_loc['y'])
        ax.scatter(victim_pos[0], victim_pos[1], c='#ff4757', s=140, marker='X', edgecolors='black', zorder=5)

    # Linha entre Killer e Vítima
    if killer_pos and victim_pos:
        ax.plot(
            [killer_pos[0], victim_pos[0]], 
            [killer_pos[1], victim_pos[1]], 
            color='black', 
            linestyle='--', 
            linewidth=2, 
            zorder=4, 
            label='Linha do Abate'
        )

    ax.set_title(
        f"Round {TARGET_ROUND_NUM} — Abate {kill_idx + 1}/{len(all_kills)} ({round_time_sec:.1f}s)\n"
        f" Killer: {killer_name} ➔  Vítima: {victim_name}",
        fontsize=13, color='white', pad=12
    )
    fig.canvas.draw_idle()

render_kill_snapshot(0)

# ==========================================
# 6. SLIDER E BOTÕES DE NAVEGAÇÃO
# ==========================================
ax_slider = plt.axes([0.20, 0.05, 0.60, 0.03], facecolor='#2f3542')
slider = Slider(
    ax=ax_slider,
    label='Linha do Tempo ',
    valmin=1,
    valmax=len(all_kills),
    valinit=1,
    valstep=1,
    color='#70a1ff'
)

ax_prev = plt.axes([0.08, 0.05, 0.08, 0.03])
btn_prev = Button(ax_prev, '◀ Anter.', color='#2f3542', hovercolor='#57606f')
btn_prev.label.set_color('white')

ax_next = plt.axes([0.84, 0.05, 0.08, 0.03])
btn_next = Button(ax_next, 'Próx. ▶', color='#2f3542', hovercolor='#57606f')
btn_next.label.set_color('white')

def update(val):
    kill_idx = int(slider.val) - 1
    render_kill_snapshot(kill_idx)

def go_prev(event):
    if slider.val > slider.valmin:
        slider.set_val(slider.val - 1)

def go_next(event):
    if slider.val < slider.valmax:
        slider.set_val(slider.val + 1)

slider.on_changed(update)
btn_prev.on_clicked(go_prev)
btn_next.on_clicked(go_next)

plt.show()