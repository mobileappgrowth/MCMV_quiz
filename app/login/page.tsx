import { LoginForm } from './login-form'

// Login unico: corretor e admin entram pela mesma porta. Quem e quem se decide
// depois, por email (Dia 2/3).
export default function Login() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <h1 className="mb-2 text-2xl font-bold">Entrar</h1>
      <p className="mb-6 text-gray-600">
        Digite seu email. Enviamos um link de acesso, sem senha.
      </p>
      <LoginForm />
    </main>
  )
}
