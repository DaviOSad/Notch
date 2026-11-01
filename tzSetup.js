// Fuso do Brasil para toda a suíte: bugs de data só aparecem fora do UTC (que é o fuso do CI).
export default function setup() {
  process.env.TZ = 'America/Sao_Paulo'
}
