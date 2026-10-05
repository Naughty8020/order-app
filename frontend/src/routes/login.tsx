import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { createSession } from '../api/login'

export const Route = createFileRoute('/login')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    try {
      setLoading(true)
      setError('')

      const data = await createSession({
        username,
        password,
      })

      localStorage.setItem('token', data.token)

      console.log('ログイン成功', data)

      await navigate({
        to: '/staff',
      })
    } catch (error) {
      console.error(error)
      setError('ユーザーネームまたはパスワードが違います')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1>ログイン</h1>

      <div>
        <label htmlFor="username">ユーザーネーム</label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="ユーザーネームを入力"
        />
      </div>

      <div>
        <label htmlFor="password">パスワード</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="パスワードを入力"
        />
      </div>

      <button 
        type="button"
        onClick={handleLogin}  
        disabled={loading}
    >
        {loading ? 'ログイン中...' : 'ログイン'}
      </button>

      {error && <p>{error}</p>}
    </div>
  )
}