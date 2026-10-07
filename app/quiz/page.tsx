import { QuizForm } from './quiz-form'

// O quiz ganhou rota propria quando a landing passou a ocupar a raiz. Separar
// as duas telas e o que permite medir: quem chega em / e quem comeca a
// responder sao numeros diferentes, e a distancia entre eles e a conversao da
// landing.
export default function Quiz() {
  return <QuizForm />
}
