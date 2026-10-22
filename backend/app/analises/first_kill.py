import pandas as pd

from app.analises import TIMES_ROUND, analise, kpi, pct, vazio


@analise(
    id="first-kill",
    titulo="Quanto vale abrir o round com um abate?",
    descricao="Taxa de vitória do time que faz o primeiro abate do round, por lado. Só rounds com abate.",
    categoria="momentos",
    grafico={"tipo": "barras", "x": "quem_abriu", "y": "win_pct_quem_abriu",
             "rotulo_y": "% rounds vencidos por quem abriu", "referencia": 50},
)
def first_kill(base, filtros):
    r = filtros.aplicar(base.rounds, col_time=TIMES_ROUND)
    r = r[r["n_abates"] > 0]
    if r.empty:
        return vazio()
    atk = r["lado_vencedor"].eq("Attacker")
    com_fk = 100 * atk[r["first_kill_atacante"]].mean()
    sem_fk = 100 * atk[~r["first_kill_atacante"]].mean()
    dados = pd.DataFrame([
        {"quem_abriu": "Ataque", "rounds": int(r["first_kill_atacante"].sum()),
         "win_pct_quem_abriu": com_fk, "atk_win_pct": com_fk},
        {"quem_abriu": "Defesa", "rounds": int((~r["first_kill_atacante"]).sum()),
         "win_pct_quem_abriu": 100 - sem_fk, "atk_win_pct": sem_fk},
    ])
    return {
        "dados": dados,
        "insight": (f"O ataque vence {pct(com_fk)} dos rounds em que faz o primeiro abate e só {pct(sem_fk)} "
                    "quando sofre o primeiro abate: abrir o round em 5×4 é decisivo."),
        "kpi": kpi("Ataque vence após o first kill", com_fk, f"Sem o first kill, cai para {pct(sem_fk)}."),
    }
