import { MAP_IMAGES, MAP_NAMES } from '../constants'
import { toTitleCase, formatDate } from '../utils'

function MatchCard({ match, teamName, onClick }) {
  const img = MAP_IMAGES[match.map]
  const mapLabel = MAP_NAMES[match.map] || toTitleCase(match.map)
  const isTeam1 = match.team1 === teamName
  const myScore = isTeam1 ? match.score1 : match.score2
  const oppScore = isTeam1 ? match.score2 : match.score1
  const opponent = isTeam1 ? match.team2 : match.team1
  const won = myScore > oppScore

  return (
    <button
      className={`match-card ${won ? 'match-card--win' : 'match-card--loss'}`}
      onClick={onClick}
      title="Ver mapa de calor"
    >
      {img && (
        <div
          className="match-card__bg"
          style={{ backgroundImage: `url(${img})` }}
        />
      )}
      <div className="match-card__overlay" />
      <div className="match-card__body">
        <span className="match-card__map">{mapLabel}</span>
        <div className="match-card__score">
          {myScore} <span className="match-card__score-sep">:</span> {oppScore}
        </div>
        <div className="match-card__badge">{won ? 'VITÓRIA' : 'DERROTA'}</div>
        <p className="match-card__opponent">vs {toTitleCase(opponent)}</p>
        <p className="match-card__date">{formatDate(match.date)}</p>
        <span className="match-card__hint">ver heatmap →</span>
      </div>
    </button>
  )
}

export default MatchCard
